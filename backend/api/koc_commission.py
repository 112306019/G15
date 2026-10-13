"""
KOC 階梯式月結分潤（累進制）。

規則（級距設定在 constants.KOC_COMMISSION_TIERS）：
- 以「任務」為單位：每個任務（一位 KOC 接的一個廠商活動，對應一組優惠碼）每個月
  透過優惠碼售出的「活動商品件數」決定該任務當月的級距。
  同一位 KOC 的不同任務各自計算，不會合併件數。
- 累進制：每筆訂單分潤建立時，用「當下累計件數」決定級距並直接定案，
  之後不再回頭調整這一筆。同月後面件數跨級距，只影響之後新建立的分潤，
  不會動到已經成立（可能早就解凍、甚至已被提領）的舊分潤。
- 月份以訂單完成日（台灣時間）為準，每個月獨立計算，不會累計到下個月。
- 退貨只調整被退那一筆分潤自己的金額（用它當初鎖定的分潤率重算），
  不會因為件數減少就回頭調整同月其他訂單的級距。

舊資料（commission_month 為 null，固定 5% 時期建立）不參與級距計算。
"""

from datetime import date
from decimal import Decimal, ROUND_HALF_UP

from django.utils import timezone

from api.models import Earnings

COMMISSION_TIER_NAMES = ['一般', '中等量', '大量']


def _tiers():
    # 在函式內 import：api.views 套件初始化時會載入 platform，platform 又載入本模組，
    # 放在模組頂層會造成循環 import
    from api.views.constants import KOC_COMMISSION_TIERS
    return KOC_COMMISSION_TIERS


def get_tier_index(quantity):
    """當月件數對應的級距索引（0 = 一般）。"""
    KOC_COMMISSION_TIERS = _tiers()
    for index, (upper_limit, _rate) in enumerate(KOC_COMMISSION_TIERS):
        if upper_limit is None or quantity <= upper_limit:
            return index
    return len(KOC_COMMISSION_TIERS) - 1


def get_tier_rate(quantity):
    """當月件數對應的分潤率（%）。"""
    return Decimal(str(_tiers()[get_tier_index(quantity)][1]))


def format_commission_rate(rate):
    """10.00 → '10'、2.50 → '2.5'（Decimal.normalize 會把 10 變成 '1E+1'，不能直接用）。"""
    value = Decimal(str(rate))
    if value == value.to_integral_value():
        return str(int(value))
    return format(value.normalize(), 'f')


def commission_amount_for(base, rate):
    """分潤金額＝計算基礎 × 分潤率，四捨五入到整數元。"""
    raw = Decimal(str(base)) * Decimal(str(rate)) / Decimal('100')
    return int(raw.quantize(Decimal('1'), rounding=ROUND_HALF_UP))


def commission_month_of(moment=None):
    """時間點所屬的分潤月份（台灣時間該月 1 號）。"""
    local_day = timezone.localdate(moment) if moment else timezone.localdate()
    return date(local_day.year, local_day.month, 1)


def get_month_quantity(mission, month):
    """任務某月份目前的有效件數（已取消的分潤不算）。"""
    quantities = (
        Earnings.objects
        .filter(kocmission=mission, commission_month=month)
        .exclude(status='cancelled')
        .values_list('item_quantity', flat=True)
    )
    return sum(quantity or 0 for quantity in quantities)


def get_mission_tier_progress(mission, month=None):
    """
    任務當月的級距進度（KOC 任務頁顯示用）：
    {
      "month": "2026-10",
      "quantity": 本月已計入的件數,
      "tier_index": 0, "tier_name": "一般", "rate": "3",
      "next_tier": {"name": "中等量", "rate": "5", "min_quantity": 11, "remaining": 3} 或 None,
      "tiers": [{"name": "一般", "min_quantity": 1, "max_quantity": 10, "rate": "3"}, ...]
    }
    """
    month = month or commission_month_of()
    quantity = get_month_quantity(mission, month)
    tiers = _tiers()
    tier_index = get_tier_index(quantity)

    tier_list = []
    lower = 1
    for index, (upper_limit, rate) in enumerate(tiers):
        tier_list.append({
            "name": COMMISSION_TIER_NAMES[index] if index < len(COMMISSION_TIER_NAMES) else f"第 {index + 1} 級",
            "min_quantity": lower,
            "max_quantity": upper_limit,
            "rate": format_commission_rate(rate),
        })
        lower = (upper_limit or 0) + 1

    next_tier = None
    if tier_index + 1 < len(tier_list):
        upcoming = tier_list[tier_index + 1]
        next_tier = {
            "name": upcoming["name"],
            "rate": upcoming["rate"],
            "min_quantity": upcoming["min_quantity"],
            "remaining": max(0, upcoming["min_quantity"] - quantity),
        }

    return {
        "month": month.strftime("%Y-%m"),
        "quantity": quantity,
        "tier_index": tier_index,
        "tier_name": tier_list[tier_index]["name"],
        "rate": tier_list[tier_index]["rate"],
        "next_tier": next_tier,
        "tiers": tier_list,
    }

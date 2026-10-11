"""
KOC 階梯式月結分潤。

規則（級距設定在 constants.KOC_COMMISSION_TIERS）：
- 以「任務」為單位：每個任務（一位 KOC 接的一個廠商活動，對應一組優惠碼）每個月
  透過優惠碼售出的「活動商品件數」決定該任務當月的級距。
  同一位 KOC 的不同任務各自計算，不會合併件數。
- 整月全額套用：當月所有分潤都用同一個級距的分潤率，跨級時整月一起調高。
- 月份以訂單完成日（台灣時間）為準，每個月獨立計算，不會累計到下個月。
- 月份結束後該月級距鎖定：下個月才發生的退貨只會扣那一筆的分潤，
  不會回頭改動上個月其他訂單的級距。
- 只有還在 pending（待結算）的分潤會被調整；已轉成可提領／已撥款的不動。
  正常流程下，廠商月結算單在月底之後才產生，所以當月分潤在月底前都還是 pending。

舊資料（commission_month 為 null，固定 5% 時期建立）不參與級距計算。
"""

from datetime import date
from decimal import Decimal, ROUND_HALF_UP

from django.utils import timezone

from api.models import Earnings, KocWallet, Transactions, VendorSettlementItem

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


def is_month_open(month):
    """月份還沒結束才能重算級距；月底後鎖定。"""
    return month == commission_month_of()


def get_month_quantity(mission, month):
    """任務某月份目前的有效件數（已取消的分潤不算）。"""
    quantities = (
        Earnings.objects
        .filter(kocmission=mission, commission_month=month)
        .exclude(status='cancelled')
        .values_list('item_quantity', flat=True)
    )
    return sum(quantity or 0 for quantity in quantities)


def sync_settlement_item_koc_amount(earning):
    """
    廠商結算明細會存一份 KOC 分潤金額（koc_amount）與平台實拿（platform_amount），
    月結算單的金額由它加總。分潤被重算後同步更新，只動還沒被納入結算單的明細。
    """
    mission = earning.kocmission
    campaign = mission.application.campaign if mission and mission.application else None
    if not campaign or not earning.order_id:
        return

    items = VendorSettlementItem.objects.select_for_update().filter(
        order_id=earning.order_id,
        vendor_id=campaign.vendor_id,
        settlement__isnull=True,
    )
    for item in items:
        koc_amount = Decimal(str(earning.amount if earning.status != 'cancelled' else 0))
        item.koc_amount = koc_amount
        item.platform_amount = max(Decimal('0.00'), item.settlement_amount - koc_amount)
        item.save(update_fields=['koc_amount', 'platform_amount', 'updated_at'])


def recalculate_mission_month(mission, month):
    """
    依任務某月份目前的總件數，把該任務該月所有 pending 分潤調整到對應級距。
    必須在 transaction.atomic() 裡呼叫。月份已結束時不做任何事（級距鎖定）。
    回傳套用的分潤率；月份已鎖定時回傳 None。
    """
    if not mission or not month or not is_month_open(month):
        return None

    earnings = list(
        Earnings.objects
        .select_for_update()
        .select_related('kocmission__application__campaign')
        .filter(kocmission=mission, commission_month=month)
        .exclude(status='cancelled')
    )
    rate = get_tier_rate(sum(earning.item_quantity or 0 for earning in earnings))

    wallet = None
    for earning in earnings:
        if earning.status != 'pending' or earning.commission_base is None:
            continue
        old_rate = earning.commission_rate
        if old_rate is not None and Decimal(str(old_rate)) == rate:
            continue

        new_amount = commission_amount_for(earning.commission_base, rate)
        delta = new_amount - earning.amount

        # original_amount 是「部分退款前」的金額，跟著級距等比例調整
        if earning.original_amount is not None and old_rate:
            earning.original_amount = int(
                (Decimal(earning.original_amount) * rate / Decimal(str(old_rate)))
                .quantize(Decimal('1'), rounding=ROUND_HALF_UP)
            )
        earning.amount = new_amount
        earning.commission_rate = rate
        earning.save(update_fields=['amount', 'original_amount', 'commission_rate'])

        if delta:
            if wallet is None:
                wallet, _ = KocWallet.objects.select_for_update().get_or_create(koc=mission.koc)
            wallet.balance_frozen = max(0, wallet.balance_frozen + delta)
            Transactions.objects.create(
                koc_wallet=wallet,
                type='commission_tier_adjustment',
                amount=delta,
                reference_type='earning',
                reference_id=str(earning.earnings_id),
            )

        sync_settlement_item_koc_amount(earning)

    if wallet is not None:
        wallet.save(update_fields=['balance_frozen', 'updated_at'])

    return rate


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

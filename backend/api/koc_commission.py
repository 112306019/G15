"""
KOC 月結分潤。分潤方式是「活動」的設定（Campaigns.commission_mode）：

1. fixed（廠商自訂、固定）：每筆分潤都用同一個分潤率。
2. progressive（廠商自訂、階層式累進）：廠商自訂每一層到第幾件、幾 %。
   每一段件數各用各的分潤率，例如級距是「前 10 件 3%、第 11 件起 10%」、本月賣 18 件：
   前 10 件算 3%、後 8 件算 10%，前 10 件不會被回頭調高。
   - 哪幾件算前面：照分潤建立（＝訂單完成）的先後順序。
   - 一筆訂單跨過門檻就拆開算，例如已賣 8 件、下一筆買 4 件：2 件 3%、2 件 10%。
   - 當月內退貨讓件數減少時，後面的訂單往前遞補，當月還沒結算的分潤會重算。
3. platform_tier（舊活動）：平台統一級距（constants.KOC_COMMISSION_TIERS），
   整月全額套用同一個分潤率，跨級時整月一起調高。這個欄位加進來之前就存在的活動都是這種。

三種方式共用的規則：
- 以「任務」為單位：每個任務（一位 KOC 接的一個廠商活動，對應一組優惠碼）每個月
  透過優惠碼售出的「活動商品件數」各自計算，同一位 KOC 的不同任務不會合併件數。
- 月份以訂單完成日（台灣時間）為準，每個月獨立計算，不會累計到下個月。
- 月份結束後該月鎖定：下個月才發生的退貨只會扣那一筆的分潤，不會回頭改動上個月其他訂單。
- 只有還在 pending（待結算）的分潤會被調整；已轉成可提領／已撥款的不動。
  正常流程下，廠商月結算單在月底之後才產生，所以當月分潤在月底前都還是 pending。

舊資料（commission_month 為 null，固定 5% 時期建立）不參與計算。
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


MODE_PLATFORM_TIER = 'platform_tier'
MODE_FIXED = 'fixed'
MODE_PROGRESSIVE = 'progressive'


class CommissionSettingError(ValueError):
    """廠商填的分潤設定不合規定；訊息是可以直接顯示給廠商看的中文。"""


def _limits():
    from api.views.constants import (
        KOC_COMMISSION_MAX_PERCENT, KOC_COMMISSION_MAX_TIERS, KOC_COMMISSION_MIN_PERCENT,
    )
    return Decimal(str(KOC_COMMISSION_MIN_PERCENT)), Decimal(str(KOC_COMMISSION_MAX_PERCENT)), KOC_COMMISSION_MAX_TIERS


def _to_rate(value, label):
    """把廠商填的分潤率轉成 Decimal，並檢查上下限、最多兩位小數。"""
    minimum, maximum, _max_tiers = _limits()
    try:
        rate = Decimal(str(value).strip())
    except Exception:
        raise CommissionSettingError(f"{label}請填數字")
    if not rate.is_finite():
        raise CommissionSettingError(f"{label}請填數字")
    if rate != rate.quantize(Decimal('0.01')):
        raise CommissionSettingError(f"{label}最多填到小數點後兩位")
    if rate < minimum or rate > maximum:
        raise CommissionSettingError(
            f"{label}需介於 {format_commission_rate(minimum)}% 到 {format_commission_rate(maximum)}% 之間"
        )
    return rate


def normalize_commission_setting(mode, rate=None, tiers=None):
    """
    檢查廠商建立／編輯活動時填的分潤設定，回傳可以存進 Campaigns 的 (mode, tiers)：
    tiers 是 [[件數上限 或 None, "分潤率字串"], ...]，可以直接存成 JSON。
    不合規定時丟 CommissionSettingError。

    - fixed：固定就是平台基本分潤率（3%），不能自訂；rate 可以不帶，帶了也只接受這個數字。
    - progressive：tiers 是 [[件數上限, 分潤率], ...]，至少兩層、最多 KOC_COMMISSION_MAX_TIERS 層；
      件數上限一層比一層大，最後一層沒有上限（填什麼都當成沒有上限）；
      分潤率後面的層不能比前面低。
    """
    _minimum, _maximum, max_tiers = _limits()

    if mode == MODE_FIXED:
        # 固定制只有一個選項：平台負擔的基本分潤率（全部由平台出，廠商沒有加碼）。
        # 想給更高的分潤要選階層式。沒帶分潤率就直接用基本分潤率；帶了別的數字則擋下來。
        from api.views.constants import KOC_COMMISSION_PLATFORM_BASE_PERCENT
        base_rate = Decimal(str(KOC_COMMISSION_PLATFORM_BASE_PERCENT))
        if rate not in (None, "") and _to_rate(rate, "分潤比例") != base_rate:
            raise CommissionSettingError(
                f"固定分潤的比例為 {format_commission_rate(base_rate)}%，想提高分潤請選擇階層式"
            )
        return MODE_FIXED, [[None, format_commission_rate(base_rate)]]

    if mode != MODE_PROGRESSIVE:
        raise CommissionSettingError("請選擇分潤方式：固定或階層式")

    if not isinstance(tiers, (list, tuple)) or len(tiers) < 2:
        raise CommissionSettingError("階層式分潤至少要設定兩層")
    if len(tiers) > max_tiers:
        raise CommissionSettingError(f"階層式分潤最多設定 {max_tiers} 層")

    normalized = []
    previous_upper = 0
    previous_rate = None
    for index, tier in enumerate(tiers):
        label = f"第 {index + 1} 層"
        if isinstance(tier, dict):
            upper_raw, rate_raw = tier.get("max_quantity"), tier.get("rate")
        elif isinstance(tier, (list, tuple)) and len(tier) == 2:
            upper_raw, rate_raw = tier
        else:
            raise CommissionSettingError(f"{label}的設定格式不正確")

        tier_rate = _to_rate(rate_raw, f"{label}的分潤比例")
        if previous_rate is not None and tier_rate < previous_rate:
            raise CommissionSettingError(f"{label}的分潤比例不能比前一層低")

        is_last = index == len(tiers) - 1
        if is_last:
            upper = None
        else:
            try:
                upper = int(str(upper_raw).strip())
            except Exception:
                raise CommissionSettingError(f"{label}請填到第幾件（整數）")
            if upper <= previous_upper:
                raise CommissionSettingError(
                    f"{label}的件數要比前一層大" if index else f"{label}的件數至少要 1 件"
                )
            previous_upper = upper

        normalized.append([upper, format_commission_rate(tier_rate)])
        previous_rate = tier_rate

    return MODE_PROGRESSIVE, normalized


def get_commission_plan(campaign):
    """
    活動的分潤方式：{"mode": ..., "tiers": [(件數上限 或 None, Decimal 分潤率), ...]}。
    舊活動（platform_tier）或設定不完整時，用平台統一級距。
    """
    mode = getattr(campaign, 'commission_mode', None) or MODE_PLATFORM_TIER
    raw_tiers = getattr(campaign, 'commission_tiers', None) or []

    if mode in (MODE_FIXED, MODE_PROGRESSIVE) and raw_tiers:
        tiers = [
            (int(upper) if upper is not None else None, Decimal(str(rate)))
            for upper, rate in raw_tiers
        ]
        if mode == MODE_FIXED:
            tiers = [(None, tiers[0][1])]
        return {"mode": mode, "tiers": tiers}

    return {
        "mode": MODE_PLATFORM_TIER,
        "tiers": [(upper, Decimal(str(rate))) for upper, rate in _tiers()],
    }


def mission_commission_plan(mission):
    campaign = mission.application.campaign if mission and mission.application else None
    return get_commission_plan(campaign)


def tier_index_for(quantity, tiers):
    """件數落在第幾層（0 起算）。"""
    for index, (upper_limit, _rate) in enumerate(tiers):
        if upper_limit is None or quantity <= upper_limit:
            return index
    return len(tiers) - 1


def get_tier_index(quantity):
    """平台統一級距（舊活動）下，當月件數對應的級距索引（0 = 一般）。"""
    return tier_index_for(quantity, _tiers())


def get_tier_rate(quantity):
    """平台統一級距（舊活動）下，當月件數對應的分潤率（%）。"""
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


def progressive_amount(base, quantity, start_quantity, tiers):
    """
    累進制下一筆分潤的金額。
    base：這筆的計算基礎（活動商品小計）；quantity：這筆的件數；
    start_quantity：同任務同月排在這筆之前已經算過幾件。
    這筆佔第 start_quantity+1 到 start_quantity+quantity 件，每件的基礎＝base ÷ quantity，
    落在哪一層就用那一層的分潤率，加總後四捨五入到整數元。
    """
    base = Decimal(str(base))
    if quantity <= 0:
        # 理論上不會發生（沒有件數就不會有分潤）；保險起見用下一件所在的那一層
        rate = tiers[tier_index_for(start_quantity + 1, tiers)][1]
        return commission_amount_for(base, rate)

    per_unit = base / Decimal(quantity)
    first_unit = start_quantity + 1
    last_unit = start_quantity + quantity
    raw = Decimal('0')
    lower = 1
    for upper_limit, rate in tiers:
        upper = upper_limit if upper_limit is not None else last_unit
        units = min(last_unit, upper) - max(first_unit, lower) + 1
        if units > 0:
            raw += per_unit * Decimal(units) * rate / Decimal('100')
        if upper_limit is None or upper_limit >= last_unit:
            break
        lower = upper_limit + 1
    return int(raw.quantize(Decimal('1'), rounding=ROUND_HALF_UP))


def effective_rate(amount, base):
    """分潤金額換算回來的實際分潤率（%，兩位小數）。累進制跨層的訂單會是兩層之間的數字。"""
    base = Decimal(str(base))
    if base <= 0:
        return Decimal('0.00')
    return (Decimal(amount) * Decimal('100') / base).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)


def quote_new_earning(mission, month, base, quantity):
    """
    新訂單完成、要建立分潤時用：回傳 (分潤率, 分潤金額)。
    新的這筆排在同任務同月所有分潤的最後面。
    """
    plan = mission_commission_plan(mission)
    tiers = plan["tiers"]
    month_quantity = get_month_quantity(mission, month)

    if plan["mode"] == MODE_PROGRESSIVE:
        amount = progressive_amount(base, quantity, month_quantity, tiers)
        return effective_rate(amount, base), amount

    if plan["mode"] == MODE_FIXED:
        rate = tiers[0][1]
    else:
        # 平台統一級距：用「當月目前件數 + 這筆件數」決定整月的分潤率
        rate = tiers[tier_index_for(month_quantity + quantity, tiers)][1]
    return rate, commission_amount_for(base, rate)


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


def platform_base_amount(commission_base):
    """平台負擔的基本分潤：分潤計算基礎 × 平台基本額度（%），四捨五入到整數元。"""
    from api.views.constants import KOC_COMMISSION_PLATFORM_BASE_PERCENT
    return commission_amount_for(commission_base, KOC_COMMISSION_PLATFORM_BASE_PERCENT)


def vendor_bonus_for(earning):
    """
    這筆分潤裡「廠商加碼」的金額（Decimal 元）：KOC 分潤超過平台基本額度的部分，
    會併入廠商月結單（VendorSettlementItem.settlement_amount = 15% 服務費 + 加碼）。

        廠商加碼 = KOC 分潤 − 分潤計算基礎 × 平台基本額度

    階層式累進時，一筆分潤的金額已經是各層加總，所以這個式子等同於
    Σ 該層成交額 × (該層分潤率 − 平台基本額度)。
    只有廠商自訂分潤（固定／階層式）的活動有加碼；舊活動（平台統一級距）、
    舊資料（沒有記錄計算基礎）、已取消的分潤都是 0。
    """
    if not earning or earning.status == 'cancelled' or earning.commission_base is None:
        return Decimal('0.00')
    if mission_commission_plan(earning.kocmission)["mode"] == MODE_PLATFORM_TIER:
        return Decimal('0.00')
    bonus = int(earning.amount or 0) - platform_base_amount(earning.commission_base)
    return Decimal(max(0, bonus)).quantize(Decimal('0.01'))


def sync_settlement_item_koc_amount(earning):
    """
    廠商結算明細會存一份 KOC 分潤金額（koc_amount）、廠商加碼（koc_bonus_amount）
    與平台實拿（platform_amount），月結算單的金額由它加總。
    分潤被重算後同步更新，只動還沒被納入結算單的明細。
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
        bonus = vendor_bonus_for(earning)
        # settlement_amount = 15% 服務費 + 廠商加碼；服務費不變，只換掉加碼的部分
        service_fee = item.settlement_amount - (item.koc_bonus_amount or Decimal('0.00'))
        item.koc_amount = koc_amount
        item.koc_bonus_amount = bonus
        item.settlement_amount = service_fee + bonus
        item.platform_amount = max(Decimal('0.00'), item.settlement_amount - koc_amount)
        item.save(update_fields=[
            'koc_amount', 'koc_bonus_amount', 'settlement_amount', 'platform_amount', 'updated_at',
        ])


def recalculate_mission_month(mission, month):
    """
    依任務某月份目前的件數，重算該任務該月所有 pending 分潤：
    - 平台統一級距（舊活動）：整月調整到件數對應的級距。
    - 固定：全部用同一個分潤率（正常情況不會有變動）。
    - 階層式累進：照分潤建立的先後順序，每筆依自己佔到的件數區間重算。
    必須在 transaction.atomic() 裡呼叫。月份已結束時不做任何事（鎖定）。
    回傳套用的分潤率（累進制回傳目前件數所在那一層的分潤率）；月份已鎖定時回傳 None。
    """
    if not mission or not month or not is_month_open(month):
        return None

    earnings = list(
        Earnings.objects
        .select_for_update()
        .select_related('kocmission__application__campaign')
        .filter(kocmission=mission, commission_month=month)
        .exclude(status='cancelled')
        .order_by('earnings_id')
    )
    plan = mission_commission_plan(mission)
    tiers = plan["tiers"]
    total_quantity = sum(earning.item_quantity or 0 for earning in earnings)
    current_rate = tiers[tier_index_for(total_quantity, tiers)][1]

    # 先算出每筆應該是多少：{earnings_id: (分潤率, 金額)}
    targets = {}
    if plan["mode"] == MODE_PROGRESSIVE:
        running_quantity = 0
        for earning in earnings:
            quantity = earning.item_quantity or 0
            if earning.commission_base is not None:
                amount = progressive_amount(earning.commission_base, quantity, running_quantity, tiers)
                targets[earning.earnings_id] = (effective_rate(amount, earning.commission_base), amount)
            # 已經不是 pending 的分潤金額不會動，但它佔掉的件數還是要算進去
            running_quantity += quantity
    else:
        rate = tiers[0][1] if plan["mode"] == MODE_FIXED else current_rate
        for earning in earnings:
            if earning.commission_base is not None:
                targets[earning.earnings_id] = (rate, commission_amount_for(earning.commission_base, rate))

    wallet = None
    for earning in earnings:
        if earning.status != 'pending' or earning.earnings_id not in targets:
            continue
        rate, new_amount = targets[earning.earnings_id]
        old_rate = earning.commission_rate
        rate_unchanged = old_rate is not None and Decimal(str(old_rate)) == rate
        # 分潤率一樣時，固定／平台級距不用再動；累進制還要看金額（同樣的實際分潤率金額也一定一樣，
        # 這裡一併比對金額是保險）
        if rate_unchanged and (plan["mode"] != MODE_PROGRESSIVE or earning.amount == new_amount):
            continue

        delta = new_amount - earning.amount

        # original_amount 是「部分退款前」的金額，跟著分潤率等比例調整
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

    return current_rate


def describe_commission_plan(plan):
    """
    把分潤方式整理成畫面用的級距清單：
    [{"name": "第 1 層", "min_quantity": 1, "max_quantity": 10, "rate": "3"}, ...]
    """
    tiers = plan["tiers"]
    tier_list = []
    lower = 1
    for index, (upper_limit, rate) in enumerate(tiers):
        if plan["mode"] == MODE_FIXED:
            name = "固定分潤"
        elif plan["mode"] == MODE_PLATFORM_TIER and index < len(COMMISSION_TIER_NAMES):
            name = COMMISSION_TIER_NAMES[index]
        else:
            name = f"第 {index + 1} 層"
        tier_list.append({
            "name": name,
            "min_quantity": lower,
            "max_quantity": upper_limit,
            "rate": format_commission_rate(rate),
        })
        lower = (upper_limit or 0) + 1
    return tier_list


def commission_label(plan):
    """一句話說明分潤方式：「固定 5%」「階層式 3%–10%」「平台級距 3%–10%」。"""
    rates = [format_commission_rate(rate) for _upper, rate in plan["tiers"]]
    if plan["mode"] == MODE_FIXED:
        return f"固定 {rates[0]}%"
    prefix = "階層式" if plan["mode"] == MODE_PROGRESSIVE else "平台級距"
    if rates[0] == rates[-1]:
        return f"{prefix} {rates[0]}%"
    return f"{prefix} {rates[0]}%–{rates[-1]}%"


def campaign_commission_summary(campaign):
    """
    活動的分潤設定（廠商後台、KOC 接案頁顯示用）：
    {"mode": ..., "label": "階層式 3%–10%", "base_rate": "3", "tiers": [...]}
    base_rate 是第一層的分潤率（固定制就是那個分潤率）。
    """
    plan = get_commission_plan(campaign)
    return {
        "mode": plan["mode"],
        "label": commission_label(plan),
        "base_rate": format_commission_rate(plan["tiers"][0][1]),
        "tiers": describe_commission_plan(plan),
    }


def get_mission_tier_progress(mission, month=None):
    """
    任務當月的分潤進度（KOC 任務頁顯示用）：
    {
      "mode": "progressive",          # platform_tier（整月套用）、fixed（固定）、progressive（累進）
      "month": "2026-10",
      "quantity": 本月已計入的件數,
      "tier_index": 0, "tier_name": "第 1 層", "rate": "3",   # 目前件數所在的那一層
      "next_tier": {"name": "第 2 層", "rate": "5", "min_quantity": 11, "remaining": 3} 或 None,
      "tiers": [{"name": "第 1 層", "min_quantity": 1, "max_quantity": 10, "rate": "3"}, ...],
      "month_amount": 本月這個任務目前的分潤合計（元）,
    }
    rate 是目前件數所在那一層的分潤率：舊活動代表整月套用的分潤率，
    累進制代表最後售出那一件適用的分潤率。
    """
    month = month or commission_month_of()
    plan = mission_commission_plan(mission)
    tier_list = describe_commission_plan(plan)

    month_earnings = list(
        Earnings.objects
        .filter(kocmission=mission, commission_month=month)
        .exclude(status='cancelled')
        .values_list('item_quantity', 'amount')
    )
    quantity = sum(item_quantity or 0 for item_quantity, _amount in month_earnings)
    month_amount = sum(amount or 0 for _item_quantity, amount in month_earnings)
    tier_index = tier_index_for(quantity, plan["tiers"])

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
        "mode": plan["mode"],
        "month": month.strftime("%Y-%m"),
        "quantity": quantity,
        "tier_index": tier_index,
        "tier_name": tier_list[tier_index]["name"],
        "rate": tier_list[tier_index]["rate"],
        "next_tier": next_tier,
        "tiers": tier_list,
        "month_amount": month_amount,
    }

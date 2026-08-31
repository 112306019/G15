# Application.status: 資料庫字串 <-> API 對外 integer
APPLICATION_STATUS_CODE_MAP = {
    'pending': 0,
    'approved': 1,
    'rejected': 2,
}
APPLICATION_STATUS_REVERSE_MAP = {v: k for k, v in APPLICATION_STATUS_CODE_MAP.items()}

# KOCMissionNew.stage: 資料庫字串 <-> API 對外 integer
STAGE_CODE_MAP = {
    'writing': 0,
    'reviewing': 1,
    'publishing': 2,
    'promoting': 3,
    'completed': 4,
}


def sync_expired_promoting_missions():
    """
    Lazy-write：
    1. 把 stage='promoting' 且所屬 Campaign.end_date 已過期的任務，
       轉成 stage='completed'。
    2. 把所屬 Campaign.end_date 已過期、狀態仍是 'active' 的優惠碼，
       改成 'expired'。這一步跟任務目前的 stage 無關（不論任務是
       promoting 還是早已 completed，只要活動過期、優惠碼還 active
       就會被抓到），避免補不到「任務在這次修正上線前就已經轉成
       completed，但優惠碼當初沒被連動改掉」的舊資料。
    3. 把 end_date（申請截止日）已過、狀態仍是 'active' 的活動本身，
       改成 'closed'。這個原本漏掉了——Campaigns.status 全專案只有
       vendor_campaign_update 這一個地方會寫入（廠商自己手動改的時候），
       沒有任何地方會在報名截止後自動把它從 'active' 轉走，導致廠商
       後台的活動卡片在到期後仍然一直顯示「招募中」。用 'closed' 而不是
       'expired'，是因為 Campaigns.jsx 的 Badge 元件已經有 'closed' 這個
       key（顯示「已結案 (已失效)」），沒有 'expired' 這個 key——沒對上
       的話會直接落到預設分支，畫面顯示英文字 "expired"。跟上面兩項用
       同一個日期精度（只比較「日」，不比較時分秒），避免同一支函式對
       「過期」的定義不一致。

    冪等、無參數，可在任何會讀取/顯示 mission.stage、coupon.status 或
    campaign.status 的 view 最前面呼叫，重複呼叫是安全的（update 影響
    0 筆時是 no-op）。
    """
    from django.utils import timezone
    from api.models import KOCMissionNew, CouponNew, Campaigns

    today = timezone.localdate()

    updated_missions = KOCMissionNew.objects.filter(
        stage='promoting',
        application__campaign__end_date__date__lt=today
    ).update(stage='completed')

    updated_coupons = CouponNew.objects.filter(
        status='active',
        kocmission__application__campaign__end_date__date__lt=today
    ).update(status='expired')

    updated_campaigns = Campaigns.objects.filter(
        status='active',
        end_date__date__lt=today
    ).update(status='closed')

    return {
        'missions_completed': updated_missions,
        'coupons_expired': updated_coupons,
        'campaigns_closed': updated_campaigns
    }

def restore_order_stock(order):
    """
    訂單取消時（不論是消費者直接取消還是廠商核准取消申請）把商品庫存加回去，
    對稱於 consumer.create_order 下單當下扣庫存的邏輯。
    """
    from api.models import OrderItem

    items = OrderItem.objects.filter(order=order).select_related('product')

    for item in items:
        product = item.product
        if not product:
            continue
        product.stock = product.stock + item.quantity
        product.save(update_fields=['stock'])


# Submissions.status: 資料庫字串 <-> API 對外 integer
SUBMISSION_STATUS_CODE_MAP = {
    'pending': 0,
    'revising': 1,
    'approved': 2,
}

# Submissions.submission_type: API 傳入的 0/1 <-> 資料庫字串
SUBMISSION_TYPE_MAP = {
    '0': 'text',
    '1': 'link',
}

# CouponNew.status: 資料庫字串 <-> API 對外 integer
COUPON_STATUS_CODE_MAP = {
    'inactive': 0,   # 未啟用
    'active': 1,     # 啟用中
    'expired': 2,    # 已過期
}
STAGE_ALLOWED_SUBMISSION_TYPE = {
    'writing': 'text',   # 撰寫文案階段，只能交文案
    'publishing': 'link',  # 待發佈階段，只能交連結
}

EARNINGS_STATUS_CHOICES_MAP = {
    'pending': 'pending',
    'withdrawable': 'withdrawable',
    'transferred': 'transferred',  # 補上：原本漏掉，跟 STATUS_CODE_MAP 一樣少了這個 key
    'cancelled': 'cancelled',      # 新增：退貨退款收回分潤用
}

# Earnings.status: 資料庫字串 <-> API 對外 integer
# 原本這裡沒有 'pending' 對應的 code，是遺漏，不是刻意的——pending 是
# calculate_order_commission 建立分潤時的預設狀態，缺少對應碼會讓任何
# 依賴這個 map 轉 code 的地方在分潤剛建立、還沒結算前就出錯或回傳空值。
EARNINGS_STATUS_CODE_MAP = {
    'pending': 2,        # 補上：待確認（分潤剛建立，鑑賞期/活動效期都還沒過）
    'withdrawable': 0,   # 可提領(待轉帳)
    'transferred': 1,    # 已撥款(已轉帳)
    'cancelled': 3,       # 新增：因退貨退款被取消
}

# 廠商鑑賞期天數：訂單 delivered_at 之後要等這麼多天，凍結餘額才能結算成可提領餘額
VENDOR_SETTLEMENT_HOLD_DAYS = 7

# 消費者可以申請退貨退款的期限（天數，從 Order.delivered_at 起算，不是
# order_status 變成 completed 的時間——見 models.py Order.completed_at 的註解）。
#
# 這裡故意跟 VENDOR_SETTLEMENT_HOLD_DAYS 分開定義一個獨立常數，即使現在兩者
# 剛好都是 7 天：前者回答「消費者還能不能申請退貨」，後者回答「廠商的錢還
# 能不能從凍結轉可提領」，是兩個不同角色會問的不同問題。之後如果只想調整
# 退貨期限、不想動鑑賞期（或反過來），兩個常數分開才不會被迫綁在一起改。
RETURN_REQUEST_WINDOW_DAYS = 7

# ReturnRequest.status: 資料庫字串 <-> API 對外 integer
RETURN_REQUEST_STATUS_CODE_MAP = {
    'requested': 0,
    'approved': 1,
    'rejected': 2,
    'disputed': 3,
    'returning': 4,
    'received': 5,
    'refunding': 6,
    'refunded': 7,
    'cancelled': 8,
}

# ReturnRequest.reason: 資料庫字串 <-> API 對外 integer
RETURN_REQUEST_REASON_CODE_MAP = {
    'defective': 0,
    'mismatched': 1,
    'wrong_size': 2,
    'no_longer_needed': 3,
    'other': 4,
}


def is_return_window_open(order):
    """
    Order 是否還在可申請退貨的期限內。

    刻意不看 order.order_status（'completed' 在退貨期間內本來就會是
    'completed'，不能拿來判斷），只看 delivered_at 有沒有設、有沒有超過
    RETURN_REQUEST_WINDOW_DAYS。呼叫端另外還要自己檢查這張訂單是否已經
    有一筆非 rejected/cancelled 的 ReturnRequest 在處理中，避免重複申請
    ——這支只回答「時間上有沒有過期」，不管重複申請的問題。
    """
    from datetime import timedelta
    from django.utils import timezone

    if not order.delivered_at:
        return False

    deadline = order.delivered_at + timedelta(days=RETURN_REQUEST_WINDOW_DAYS)
    return timezone.now() <= deadline


# 退貨申請還沒走到「這件事已經有結論」的狀態集合。只要訂單還卡在這些狀態，
# 不管廠商鑑賞期或退貨期限的天數到了沒，KOC 分潤/廠商淨額都不能結算成
# 可提領——正在審核退貨的同時錢被領走，退貨核准後會沒有東西可扣回。
# 'rejected'（廠商拒絕退貨,沒有進一步爭議）、'refunded'（已經退款完成，
# 對應分潤應該已經在退款流程裡被收回/取消了）、'cancelled'（消費者自己
# 撤回申請）三個才算有結論，不在這個集合裡。
UNRESOLVED_RETURN_STATUSES = {
    'requested', 'approved', 'disputed', 'returning', 'received', 'refunding',
}


def has_unresolved_return_request(order):
    """
    這張訂單是否有還在處理中、尚未有結論的退貨申請。

    給 admin_settle_vendor_earnings / admin_settle_campaign_earnings 這類
    結算函式用，即使天數上的鑑賞期/退貨期已經過了，只要這張訂單還有一筆
    退貨申請卡在中間狀態，就不能放行結算。
    """
    from api.models import ReturnRequest

    return ReturnRequest.objects.filter(
        order=order,
        status__in=UNRESOLVED_RETURN_STATUSES
    ).exists()


def is_order_auto_completable(order):
    """
    訂單是否已符合「送達滿 RETURN_REQUEST_WINDOW_DAYS 後自動完成」條件。

    這支只負責判斷，不直接修改 Order，也不處理分潤；
    真正完成訂單時必須走跟手動完成相同的 KOC / Vendor 帳務流程。
    """
    from datetime import timedelta
    from django.utils import timezone

    if not order:
        return False

    if order.order_status in ('completed', 'cancelled'):
        return False

    if order.payment_status not in ('paid', 'completed'):
        return False

    if order.shipping_status != 'delivered' or not order.delivered_at:
        return False

    if has_unresolved_return_request(order):
        return False

    deadline = order.delivered_at + timedelta(days=RETURN_REQUEST_WINDOW_DAYS)
    return timezone.now() > deadline

# User.role: 資料庫字串 <-> API 對外 integer
ROLE_CODE_MAP = {
    'vendor': 0,
    'koc': 1,
    'consumer': 2,
}
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
}

# Earnings.status: 資料庫字串 <-> API 對外 integer
EARNINGS_STATUS_CODE_MAP = {
    'withdrawable': 0,   # 撥款中(待轉帳)
    'transferred': 1,    # 已撥款(已轉帳)
}

# 廠商鑑賞期天數：訂單 delivered_at 之後要等這麼多天，凍結餘額才能結算成可提領餘額
VENDOR_SETTLEMENT_HOLD_DAYS = 7

# User.role: 資料庫字串 <-> API 對外 integer
ROLE_CODE_MAP = {
    'vendor': 0,
    'koc': 1,
    'consumer': 2,
}
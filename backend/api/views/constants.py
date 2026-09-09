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

# 勞務報酬單「勞務內容」統一寫法：一張單現在可能同時涵蓋好幾個不同案件、甚至不同
# 廠商的分潤加總，不會再逐筆寫案件/廠商名稱。
REMUNERATION_SERVICE_CONTENT = '社群行銷推廣服務酬勞'

# KOC 提領：跨行轉帳銀行會收取的手續費，這筆錢不是平台賺的，只是告知用（實際扣款
# 是銀行端處理，平台這邊的錢包/撥款金額不會扣掉這 15 元）。
CROSS_BANK_TRANSFER_FEE = 15
# 最低提領金額：至少要比手續費多 1 元，確保扣完手續費後 KOC 還會實際收到錢。
MIN_PAYOUT_AMOUNT = CROSS_BANK_TRANSFER_FEE + 1

# KOC 違規（自己取消任務、或放著任務過期沒完成該做的事）：距離上次停權以來的
# 違規次數達到這個門檻就會被停權。是「距離上次停權以來」的次數，不是終身次數
# ——每次觸發停權會歸零重新算，見 record_koc_violation。
MAX_VIOLATION_COUNT = 5
# 停權天數，約 3 個月。
SUSPENSION_DURATION_DAYS = 90


def sync_expired_koc_suspensions():
    """
    Lazy-write：把已經過了 suspended_until 的 KOC 自動解除停權。
    跟 sync_expired_promoting_missions 一樣是冪等、無參數，可以在任何會讀取/
    檢查 KOC.is_suspended 的地方最前面呼叫。
    """
    from django.utils import timezone
    from api.models import KOC

    return KOC.objects.filter(
        is_suspended=True,
        suspended_until__lt=timezone.now(),
    ).update(is_suspended=False, suspended_until=None)


def record_koc_violation(koc):
    """
    記一次 KOC 違規：自己取消任務（見 koc.py 的 cancel_mission）、或任務被放到
    過期還沒完成該做的事（見下面 sync_expired_promoting_missions），都算一次。

    total_violation_count 終身累計、只加不減，給廠商審核接案申請時參考；
    violation_count_since_suspension 距離上次觸發停權以來的次數，達到
    MAX_VIOLATION_COUNT 就停權 SUSPENSION_DURATION_DAYS 天並歸零重新起算。

    回傳 (suspended: bool, suspended_until: datetime | None)。
    """
    from django.utils import timezone
    from datetime import timedelta

    koc.total_violation_count = koc.total_violation_count + 1
    koc.violation_count_since_suspension = koc.violation_count_since_suspension + 1

    suspended = False
    suspended_until = None
    update_fields = ['total_violation_count', 'violation_count_since_suspension']

    if koc.violation_count_since_suspension >= MAX_VIOLATION_COUNT:
        suspended_until = timezone.now() + timedelta(days=SUSPENSION_DURATION_DAYS)
        koc.is_suspended = True
        koc.suspended_until = suspended_until
        koc.violation_count_since_suspension = 0
        update_fields += ['is_suspended', 'suspended_until']
        suspended = True

    koc.save(update_fields=update_fields)
    return suspended, suspended_until


def sync_expired_promoting_missions():
    """
    Lazy-write：
    1. 把 stage='promoting' 且所屬 Campaign.end_date 已過期的任務，
       轉成 stage='completed'（正常跑完整個推廣期，算「已結案」，
       end_reason 留空）。
    1b. 把還卡在 writing/reviewing/publishing（還沒進入 promoting，
       代表任務根本沒能正式推廣）、但所屬 Campaign.end_date 已過期的
       任務，同樣轉成 stage='completed'，但標記 end_reason='expired'
       （算「已取消」，跟正常跑完整個推廣期的情況要分開），同時記一次
       KOC 違規（見 record_koc_violation）——沒交文案/連結、放到過期，
       跟 KOC 自己主動取消一樣，都算沒履行任務。
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

    # 這批要逐筆處理（不能像上面用 bulk update），因為每筆任務屬於不同 KOC，
    # 違規次數要分別累加到各自的 KOC 帳號上。
    stuck_missions = list(
        KOCMissionNew.objects.filter(
            stage__in=['writing', 'reviewing', 'publishing'],
            application__campaign__end_date__date__lt=today
        ).select_related('koc')
    )

    for mission in stuck_missions:
        mission.stage = 'completed'
        mission.end_reason = 'expired'
        mission.save(update_fields=['stage', 'end_reason'])

        if mission.koc:
            record_koc_violation(mission.koc)

    updated_stuck_missions = len(stuck_missions)

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
        'missions_expired': updated_stuck_missions,
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
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

# 已結束（stage='completed'）的任務，案件截止日超過這麼多天後，任務詳情跟聊天室
# 就不再顯示（軟隱藏，只是查詢時濾掉，不會真的刪除 KOCMissionNew/ChatRoom/Message
# 資料本身）。不分正常結案／過期／KOC 自己取消，一律套用同一個天數。
MISSION_HISTORY_VISIBLE_DAYS = 90


def exclude_hidden_missions(queryset):
    """
    套用在 KOCMissionNew 的 QuerySet 上，濾掉「已結束超過
    MISSION_HISTORY_VISIBLE_DAYS 天」的任務，用在任務列表這種一次抓多筆的地方。
    只影響 stage='completed' 的任務，其餘階段的任務不受影響、一律照樣顯示。
    """
    from django.utils import timezone
    from datetime import timedelta

    cutoff = timezone.now() - timedelta(days=MISSION_HISTORY_VISIBLE_DAYS)
    return queryset.exclude(
        stage='completed',
        application__campaign__end_date__lt=cutoff,
    )


def is_mission_hidden(mission):
    """
    套用在單一一筆 KOCMissionNew 物件上（例如任務詳情、聊天室），判斷這筆任務是否
    已經過了顯示期限。傳入的 mission 需要 select_related('application__campaign')
    過，否則這裡會多一次查詢。
    """
    if mission.stage != 'completed':
        return False

    campaign = mission.application.campaign
    if not campaign or not campaign.end_date:
        return False

    from django.utils import timezone
    from datetime import timedelta

    return timezone.now() > campaign.end_date + timedelta(days=MISSION_HISTORY_VISIBLE_DAYS)

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

# KOC 任務進入「待交文案」(writing) 或「待交作品連結」(publishing) 階段後，
# 超過這麼多天還沒交件，就發一次逾期提醒通知（見 sync_submission_deadline_reminders）。
SUBMISSION_REMINDER_DAYS = 7


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
    4. 任務因為過期被記違規／觸發停權時，發站內通知告知 KOC
       （見下面 record_koc_violation 呼叫處）。

    冪等、無參數，可在任何會讀取/顯示 mission.stage、coupon.status 或
    campaign.status 的 view 最前面呼叫，重複呼叫是安全的（update 影響
    0 筆時是 no-op）。
    """
    from django.utils import timezone
    from api.models import KOCMissionNew, CouponNew, Campaigns
    from api.notifications import create_notification

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
        ).select_related('koc__user', 'application__campaign')
    )

    for mission in stuck_missions:
        mission.stage = 'completed'
        mission.end_reason = 'expired'
        mission.save(update_fields=['stage', 'end_reason'])

        if mission.koc:
            suspended, suspended_until = record_koc_violation(mission.koc)

            campaign_name = (
                mission.application.campaign.name
                if mission.application and mission.application.campaign else ''
            )
            if suspended:
                create_notification(
                    user=mission.koc.user,
                    category='koc',
                    title='帳號已被停權',
                    body=(
                        f'案件「{campaign_name}」因逾期未完成任務被記一次違規，'
                        f'違規次數已達上限，帳號已被停權至 {suspended_until.strftime("%Y-%m-%d")}，'
                        '停權期間將無法申請新的接案。'
                    ),
                    reference_type='koc_home',
                )
            else:
                create_notification(
                    user=mission.koc.user,
                    category='koc',
                    title='任務逾期，已記一次違規',
                    body=f'案件「{campaign_name}」因逾期未完成任務（推廣期截止前未交件），已被記一次違規。',
                    reference_type='koc_home',
                )

    updated_stuck_missions = len(stuck_missions)

    updated_coupons = CouponNew.objects.filter(
        status='active',
        kocmission__application__campaign__end_date__date__lt=today
    ).update(status='expired')

    updated_campaigns = Campaigns.objects.filter(
        status='active',
        end_date__date__lt=today
    ).update(status='closed')

    sync_submission_deadline_reminders()

    return {
        'missions_completed': updated_missions,
        'missions_expired': updated_stuck_missions,
        'coupons_expired': updated_coupons,
        'campaigns_closed': updated_campaigns
    }


def sync_submission_deadline_reminders():
    """
    Lazy-write：任務進入 writing（待交文案）或 publishing（待交作品連結）階段
    時，會設定 submission_deadline_at = 進入當下 + SUBMISSION_REMINDER_DAYS 天
    （見 vendor.py 建立任務／審核退回／文案審核通過的地方）。這裡檢查有沒有
    任務已經過了這個時間點、卻還停在同一個階段沒交件，發一次逾期提醒通知。

    submission_reminder_sent 確保同一次停留期間只提醒一次；重新進入
    writing/publishing（例如審核退回）會把它歸零，所以下一輪逾期還是會再提醒。
    跟 sync_expired_promoting_missions 的「過期」是兩件事——那邊是整個推廣期
    已經結束，這裡只是同一階段內拖太久沒交件。

    冪等、無參數，目前掛在 sync_expired_promoting_missions 結尾一起呼叫。
    """
    from django.utils import timezone
    from api.models import KOCMissionNew
    from api.notifications import create_notification

    overdue_missions = list(
        KOCMissionNew.objects.filter(
            stage__in=['writing', 'publishing'],
            submission_deadline_at__lt=timezone.now(),
            submission_reminder_sent=False,
        ).select_related('koc__user', 'application__campaign')
    )

    for mission in overdue_missions:
        if not mission.koc:
            continue

        item_label = '文案' if mission.stage == 'writing' else '作品連結'
        campaign_name = (
            mission.application.campaign.name
            if mission.application and mission.application.campaign else ''
        )

        create_notification(
            user=mission.koc.user,
            category='koc',
            title=f'{item_label}逾期提醒',
            body=(
                f'案件「{campaign_name}」已超過 {SUBMISSION_REMINDER_DAYS} 天未提交'
                f'{item_label}，請盡快完成，以免任務過期被記違規。'
            ),
            reference_type='koc_home',
        )
        mission.submission_reminder_sent = True
        mission.save(update_fields=['submission_reminder_sent'])

    return len(overdue_missions)


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
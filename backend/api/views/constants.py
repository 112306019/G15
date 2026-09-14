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
    任務已經過了這個時間點、卻還停在同一個階段沒交件，發一次逾期提醒通知
    （publishing 階段額外寄一封提醒信，見 send_publishing_overdue_email）。

    submission_reminder_sent 確保同一次停留期間只提醒一次；重新進入
    writing/publishing（例如審核退回）會把它歸零，所以下一輪逾期還是會再提醒。
    跟 sync_expired_promoting_missions 的「過期」是兩件事——那邊是整個推廣期
    已經結束，這裡只是同一階段內拖太久沒交件。

    冪等、無參數，目前掛在 sync_expired_promoting_missions 結尾一起呼叫。
    """
    from django.utils import timezone
    from api.models import KOCMissionNew
    from api.notifications import create_notification
    from api.emails import send_publishing_overdue_email

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

        # publishing（待提交作品連結以開始推廣）階段逾期額外寄信提醒，
        # writing（待交文案）階段沿用站內通知即可，不寄信。
        if mission.stage == 'publishing':
            try:
                send_publishing_overdue_email(mission, SUBMISSION_REMINDER_DAYS)
            except Exception:
                pass

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

# KOC 分潤比例：固定抽「訂單總金額扣除運費」的這個百分比，不再依廠商在
# CampaignProduct 設定的 koc_commission_rate 逐項計算（那個欄位保留給廠商端
# 顯示/編輯用，但 calculate_order_commission 已經不會再讀它）。
KOC_COMMISSION_RATE_PERCENT = 5

# 平台服務費比例：KOC 申請撥款時，從撥款金額裡再抽這個百分比作為平台服務費，
# 實際匯入 KOC 銀行帳戶的金額 = 撥款金額 - 平台服務費（見 koc.py request_payout）。
PLATFORM_SERVICE_FEE_RATE_PERCENT = 20

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
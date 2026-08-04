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
    Lazy-write：把 stage='promoting' 且所屬 Campaign.end_date 已過期的任務，
    直接寫回 DB 轉成 stage='completed'。冪等、無參數，可在任何會讀取/顯示
    mission.stage 的 view 最前面呼叫，重複呼叫是安全的（update 影響 0 筆時是 no-op）。
    """
    from django.utils import timezone
    from api.models import KOCMissionNew

    today = timezone.localdate()
    return KOCMissionNew.objects.filter(
        stage='promoting',
        application__campaign__end_date__date__lt=today
    ).update(stage='completed')

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

# User.role: 資料庫字串 <-> API 對外 integer
ROLE_CODE_MAP = {
    'vendor': 0,
    'koc': 1,
    'consumer': 2,
}
from api.models import Notification


def create_notification(user=None, vendor=None, category=None, title='', body='', reference_type=None, reference_id=None):
    """
    建立一則站內通知。呼叫端（訂單/KOC 接案/廠商相關的各個 view）在事件發生的當下
    呼叫，不影響原本的回應：這裡故意不拋例外，通知寫入失敗不該讓原本的業務操作跟著失敗。

    收件人只能是 user 或 vendor 兩者之一：user 用於消費者/KOC（User model），
    vendor 用於廠商（Vendor model，跟 User 是各自獨立的帳號系統，沒有共用外鍵）。
    """
    if not user and not vendor:
        return None
    if user and vendor:
        # 呼叫端寫錯，同時給了兩個收件人——這裡選擇直接不建立，而不是猜一個，
        # 靜靜吃掉錯誤總比通知發給錯的人好。
        return None

    try:
        return Notification.objects.create(
            user=user,
            vendor=vendor,
            category=category,
            title=title,
            body=body,
            reference_type=reference_type,
            reference_id=str(reference_id) if reference_id is not None else None,
        )
    except Exception:
        return None


# ==============================================================================
# 聊天訊息的通知：不是一傳訊息就通知，而是「超過 24 小時還沒讀」才補一則提醒
# ==============================================================================
# 專案沒有排程，所以用 lazy 的方式：收件人載入通知列表時（見 views/notifications.py）
# 順便檢查有沒有放超過 24 小時還沒讀的訊息，有的話才建立通知。
CHAT_UNREAD_NOTIFY_AFTER_HOURS = 24
CHAT_NOTIFICATION_PREVIEW_LENGTH = 60


def _chat_preview(content):
    preview = (content or '').strip()
    if len(preview) > CHAT_NOTIFICATION_PREVIEW_LENGTH:
        preview = preview[:CHAT_NOTIFICATION_PREVIEW_LENGTH] + '…'
    return preview


def _display_name(user):
    return (getattr(user, 'display_name', '') or user.name) if user else ''


def _stale_chat_groups(user_id=None, vendor_id=None):
    """
    找出收件人「超過 24 小時還沒讀」的聊天訊息，依對話分組。
    回傳 {(reference_type, reference_id): {category, title, oldest, body}}，
    oldest 是該對話最早一則逾時未讀訊息的時間，body 是最新一則的內容。
    """
    from datetime import timedelta
    from django.utils import timezone
    from api.models import InquiryMessage, Message

    cutoff = timezone.now() - timedelta(hours=CHAT_UNREAD_NOTIFY_AFTER_HOURS)
    groups = {}

    def add(key, category, title, message):
        group = groups.setdefault(key, {
            'category': category, 'title': title, 'oldest': message.created_at,
        })
        group['body'] = message.content  # 訊息依時間由舊到新，最後留下的是最新一則

    if vendor_id:
        # 顧客訊息（商品詢問、訂單訊息都在同一個對話）
        for m in (
            InquiryMessage.objects
            .filter(room__vendor_id=vendor_id, sender_role='user', is_read=False, created_at__lte=cutoff)
            .select_related('room__user')
            .order_by('created_at', 'message_id')
        ):
            add(('vendor_inquiry', str(m.room_id)), 'order',
                f'{_display_name(m.room.user)} 的訊息已超過 {CHAT_UNREAD_NOTIFY_AFTER_HOURS} 小時未讀', m)
        # KOC 任務聊天
        for m in (
            Message.objects
            .filter(
                room__kocmission__application__campaign__vendor_id=vendor_id,
                sender_role='koc', is_read=False, created_at__lte=cutoff,
            )
            .select_related('room__kocmission__application__campaign')
            .order_by('created_at', 'message_id')
        ):
            campaign = m.room.kocmission.application.campaign
            add(('vendor_koc_chat', str(m.room_id)), 'koc',
                f'KOC 在「{campaign.name}」的訊息已超過 {CHAT_UNREAD_NOTIFY_AFTER_HOURS} 小時未讀', m)
    elif user_id:
        # 廠商回覆（商品詢問、訂單訊息都在同一個對話），點通知會打開跟這家廠商的對話
        for m in (
            InquiryMessage.objects
            .filter(room__user_id=user_id, sender_role='vendor', is_read=False, created_at__lte=cutoff)
            .select_related('room__vendor')
            .order_by('created_at', 'message_id')
        ):
            add(('inquiry', str(m.room.vendor_id)), 'order',
                f'{m.room.vendor.company_name} 的訊息已超過 {CHAT_UNREAD_NOTIFY_AFTER_HOURS} 小時未讀', m)
        # KOC 接案聊天：reference_id 帶 kocmission_id，前端點通知會打開該任務的對話
        for m in (
            Message.objects
            .filter(
                room__kocmission__koc__user_id=user_id,
                sender_role='vendor', is_read=False, created_at__lte=cutoff,
            )
            .select_related('room__kocmission__application__campaign__vendor')
            .order_by('created_at', 'message_id')
        ):
            campaign = m.room.kocmission.application.campaign
            vendor_name = campaign.vendor.company_name if campaign.vendor_id else '廠商'
            add(('koc_chat', str(m.room.kocmission_id)), 'koc',
                f'{vendor_name} 的訊息已超過 {CHAT_UNREAD_NOTIFY_AFTER_HOURS} 小時未讀', m)

    return groups


def sync_stale_chat_notifications(user_id=None, vendor_id=None):
    """
    幫收件人補上「聊天訊息超過 24 小時未讀」的通知，回傳這次新建立的通知數。

    同一個對話、同一批未讀訊息只通知一次：只要在最早那則逾時未讀訊息之後已經發過通知
    （不論通知本身讀了沒），就不再重複發；對方讀完訊息後，之後又有新訊息放超過 24 小時，
    才會再通知一次。故意不拋例外，通知寫入失敗不該讓通知列表跟著壞掉。
    """
    from django.db.models import Max

    if (not user_id and not vendor_id) or (user_id and vendor_id):
        return 0
    try:
        groups = _stale_chat_groups(user_id=user_id, vendor_id=vendor_id)
        if not groups:
            return 0

        recipient = {'vendor_id': vendor_id} if vendor_id else {'user_id': user_id}
        last_notified = {
            (row['reference_type'], row['reference_id']): row['latest']
            for row in (
                Notification.objects
                .filter(reference_type__in={key[0] for key in groups}, **recipient)
                .values('reference_type', 'reference_id')
                .annotate(latest=Max('created_at'))
            )
        }

        created = 0
        for (reference_type, reference_id), group in groups.items():
            latest = last_notified.get((reference_type, reference_id))
            if latest and latest >= group['oldest']:
                continue
            Notification.objects.create(
                category=group['category'],
                title=group['title'],
                body=_chat_preview(group['body']),
                reference_type=reference_type,
                reference_id=reference_id,
                **recipient,
            )
            created += 1
        return created
    except Exception:
        return 0

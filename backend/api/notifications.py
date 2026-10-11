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

def notify_new_chat_message(user=None, vendor=None, category=None, title='', body='', reference_type=None, reference_id=None):
    """
    聊天訊息用的通知：同一個對話（同一個收件人 + reference_type + reference_id）
    還有未讀通知時就不再新增，避免對方連傳十則就收到十則通知；
    收件人點開或讀過之後，下一則新訊息才會再通知一次。
    通知內文只取訊息開頭，太長的訊息不整段塞進通知。
    """
    if not user and not vendor:
        return None
    try:
        exists = Notification.objects.filter(
            user=user,
            vendor=vendor,
            reference_type=reference_type,
            reference_id=str(reference_id) if reference_id is not None else None,
            is_read=False,
        ).exists()
    except Exception:
        return None
    if exists:
        return None
    preview = (body or '').strip()
    if len(preview) > 60:
        preview = preview[:60] + '…'
    return create_notification(
        user=user,
        vendor=vendor,
        category=category,
        title=title,
        body=preview,
        reference_type=reference_type,
        reference_id=reference_id,
    )

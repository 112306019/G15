from api.models import Notification


def create_notification(user, category, title, body='', reference_type=None, reference_id=None):
    """
    建立一則站內通知。呼叫端（訂單/KOC 接案相關的各個 view）在事件發生的當下呼叫，
    不影響原本的回應：這裡故意不拋例外，通知寫入失敗不該讓原本的業務操作跟著失敗。
    """
    try:
        return Notification.objects.create(
            user=user,
            category=category,
            title=title,
            body=body,
            reference_type=reference_type,
            reference_id=str(reference_id) if reference_id is not None else None,
        )
    except Exception:
        return None

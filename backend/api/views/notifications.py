from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status

from api.models import Notification

# 下拉選單只需要看到最近幾筆，避免帳號用久了通知筆數無限增長拖慢查詢
NOTIFICATION_LIST_LIMIT = 20


def _serialize(notification):
    return {
        "notification_id": notification.notification_id,
        "category": notification.category,
        "title": notification.title,
        "body": notification.body,
        "reference_type": notification.reference_type,
        "reference_id": notification.reference_id,
        "is_read": notification.is_read,
        "created_at": notification.created_at,
    }


@api_view(["GET"])
@permission_classes([AllowAny])
def list_notifications(request):
    """
    取得使用者最近的站內通知，分成訂單／KOC接案兩個分類分開回傳，
    給 Header 的通知鈴鐺下拉選單用。
    URL: /notifications/list?user_id=xxx
    """
    user_id = request.GET.get("user_id")

    if not user_id:
        return Response({
            "success": False,
            "err": "user_id is required"
        }, status=status.HTTP_400_BAD_REQUEST)

    base_qs = Notification.objects.filter(user_id=user_id)

    order_notifications = base_qs.filter(category="order")[:NOTIFICATION_LIST_LIMIT]
    koc_notifications = base_qs.filter(category="koc")[:NOTIFICATION_LIST_LIMIT]

    order_unread_count = base_qs.filter(category="order", is_read=False).count()
    koc_unread_count = base_qs.filter(category="koc", is_read=False).count()

    return Response({
        "success": True,
        "err": "",
        "unread_count": order_unread_count + koc_unread_count,
        "order_unread_count": order_unread_count,
        "koc_unread_count": koc_unread_count,
        "order_notifications": [_serialize(n) for n in order_notifications],
        "koc_notifications": [_serialize(n) for n in koc_notifications],
    }, status=status.HTTP_200_OK)


@api_view(["POST"])
@permission_classes([AllowAny])
def mark_notification_read(request):
    """
    把單一則通知標記為已讀（點擊那則通知時呼叫）。
    URL: /notifications/markRead
    """
    user_id = request.data.get("user_id")
    notification_id = request.data.get("notification_id")

    if not user_id or not notification_id:
        return Response({
            "success": False,
            "err": "user_id and notification_id are required"
        }, status=status.HTTP_400_BAD_REQUEST)

    updated_count = Notification.objects.filter(
        notification_id=notification_id, user_id=user_id,
    ).update(is_read=True)

    if updated_count == 0:
        return Response({
            "success": False,
            "err": "找不到對應的通知"
        }, status=status.HTTP_404_NOT_FOUND)

    return Response({
        "success": True,
        "err": "",
    }, status=status.HTTP_200_OK)

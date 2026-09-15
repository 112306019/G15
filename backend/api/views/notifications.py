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
    取得使用者/廠商最近的站內通知，分類分開回傳，給 Header 的通知鈴鐺下拉選單用。
    帶 user_id 查消費者/KOC 的通知；帶 vendor_id 查廠商的通知（兩者互斥，
    User 跟 Vendor 是各自獨立的帳號系統，不會同時帶兩個）。
    URL: /notifications/list?user_id=xxx 或 /notifications/list?vendor_id=xxx
    """
    user_id = request.GET.get("user_id")
    vendor_id = request.GET.get("vendor_id")

    if not user_id and not vendor_id:
        return Response({
            "success": False,
            "err": "user_id or vendor_id is required"
        }, status=status.HTTP_400_BAD_REQUEST)

    if user_id:
        base_qs = Notification.objects.filter(user_id=user_id)
    else:
        base_qs = Notification.objects.filter(vendor_id=vendor_id)

    order_notifications = base_qs.filter(category="order")[:NOTIFICATION_LIST_LIMIT]
    koc_notifications = base_qs.filter(category="koc")[:NOTIFICATION_LIST_LIMIT]
    return_notifications = base_qs.filter(category="return")[:NOTIFICATION_LIST_LIMIT]
    payout_notifications = base_qs.filter(category="payout")[:NOTIFICATION_LIST_LIMIT]

    order_unread_count = base_qs.filter(category="order", is_read=False).count()
    koc_unread_count = base_qs.filter(category="koc", is_read=False).count()
    return_unread_count = base_qs.filter(category="return", is_read=False).count()
    payout_unread_count = base_qs.filter(category="payout", is_read=False).count()

    return Response({
        "success": True,
        "err": "",
        "unread_count": order_unread_count + koc_unread_count + return_unread_count + payout_unread_count,
        "order_unread_count": order_unread_count,
        "koc_unread_count": koc_unread_count,
        "return_unread_count": return_unread_count,
        "payout_unread_count": payout_unread_count,
        "order_notifications": [_serialize(n) for n in order_notifications],
        "koc_notifications": [_serialize(n) for n in koc_notifications],
        "return_notifications": [_serialize(n) for n in return_notifications],
        "payout_notifications": [_serialize(n) for n in payout_notifications],
    }, status=status.HTTP_200_OK)


@api_view(["POST"])
@permission_classes([AllowAny])
def mark_notification_read(request):
    """
    把單一則通知標記為已讀（點擊那則通知時呼叫）。
    帶 user_id 或 vendor_id 其中一個，要跟通知的收件人類型一致，
    否則會找不到對應的通知（避免消費者把廠商的通知標成已讀之類的錯用）。
    URL: /notifications/markRead
    """
    user_id = request.data.get("user_id")
    vendor_id = request.data.get("vendor_id")
    notification_id = request.data.get("notification_id")

    if not notification_id or (not user_id and not vendor_id):
        return Response({
            "success": False,
            "err": "notification_id and (user_id or vendor_id) are required"
        }, status=status.HTTP_400_BAD_REQUEST)

    filter_kwargs = {"notification_id": notification_id}
    if user_id:
        filter_kwargs["user_id"] = user_id
    else:
        filter_kwargs["vendor_id"] = vendor_id

    updated_count = Notification.objects.filter(**filter_kwargs).update(is_read=True)

    if updated_count == 0:
        return Response({
            "success": False,
            "err": "找不到對應的通知"
        }, status=status.HTTP_404_NOT_FOUND)

    return Response({
        "success": True,
        "err": "",
    }, status=status.HTTP_200_OK)
"""
消費者與廠商的聊天：每位消費者跟每家廠商只有一個對話（InquiryRoom，user + vendor 唯一）。
不用先下單，從廠商頁或商品頁就能發起；從訂單頁傳的訊息（見 order_chat.py）也存在同一個對話裡，
用訊息上的 order 標記是在講哪張訂單。

消費者端
GET  /consumer/inquiry/getMessages?user_id=&vendor_id=   開啟（沒有就建立）對話並讀訊息，廠商訊息標為已讀
POST /consumer/inquiry/sendMessage {user_id, vendor_id, content, product_id?}
GET  /consumer/inquiry/list?user_id=                     消費者所有詢問對話

廠商端
GET  /vendor/inquiry/list?vendor_id=                      廠商所有詢問對話（統一聊天室「商品詢問」分頁）
GET  /vendor/inquiry/getMessages?vendor_id=&room_id=      讀訊息，消費者訊息標為已讀
POST /vendor/inquiry/sendMessage {vendor_id, room_id, content}

傳訊息當下不發站內通知；對方超過 24 小時沒讀才會補一則通知（見 api/notifications.py 的
sync_stale_chat_notifications）。聊天圖示上的未讀數字則是即時的。
"""

from django.db.models import Count, Max, Q
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from api.models import InquiryMessage, InquiryRoom, Product, User, Vendor

MAX_MESSAGE_LENGTH = 2000


def _serialize_message(message):
    product = message.product
    return {
        "message_id": message.message_id,
        "room_id": message.room_id,
        "sender_role": message.sender_role,
        "sender_id": message.sender_id,
        "content": message.content,
        "is_read": message.is_read,
        "created_at": message.created_at,
        # 從商品頁發起的詢問會附上商品，前端在訊息上方顯示商品卡
        "product": {
            "product_id": product.product_id,
            "product_name": product.product_name,
            "image_url": product.image_url,
            "price": product.discounted_price or product.price,
        } if product else None,
        # 從訂單頁傳的訊息會標上訂單，前端在訊息上方顯示訂單標籤
        "order": {"order_id": str(message.order_id)} if message.order_id else None,
    }


def _user_display_name(user):
    return (getattr(user, "display_name", "") or user.name) if user else ""


def _bad_request(message):
    return Response({"success": False, "err": message}, status=status.HTTP_400_BAD_REQUEST)


def _not_found(message):
    return Response({"success": False, "err": message}, status=status.HTTP_404_NOT_FOUND)


def _clean_content(raw):
    content = (raw or "").strip()
    if not content:
        return None, "請輸入訊息內容"
    if len(content) > MAX_MESSAGE_LENGTH:
        return None, f"訊息請在 {MAX_MESSAGE_LENGTH} 字以內"
    return content, None


def _room_summaries(rooms, unread_role):
    """對話列表共用：最後一則訊息、時間、對方未讀數。只回傳有訊息的對話。"""
    rooms = (
        rooms
        .prefetch_related("messages")
        .annotate(
            message_count=Count("messages", distinct=True),
            last_message_at=Max("messages__created_at"),
            unread_count=Count(
                "messages",
                filter=Q(messages__sender_role=unread_role, messages__is_read=False),
                distinct=True,
            ),
        )
        .filter(message_count__gt=0)
        .order_by("-last_message_at")
    )
    result = []
    for room in rooms:
        last = max(room.messages.all(), key=lambda m: (m.created_at, m.pk), default=None)
        result.append({
            "room_id": room.room_id,
            "user_id": room.user_id,
            "user_name": _user_display_name(room.user),
            "vendor_id": room.vendor_id,
            "vendor_name": room.vendor.company_name,
            "last_message": last.content if last else "",
            "last_sender_role": last.sender_role if last else None,
            "last_message_at": last.created_at if last else None,
            "unread_count": room.unread_count,
        })
    return result


# ==============================================================================
# 消費者端
# ==============================================================================

@api_view(["GET"])
@permission_classes([AllowAny])
def consumer_inquiry_get_messages(request):
    user = User.objects.filter(pk=request.GET.get("user_id")).first()
    if not user:
        return _bad_request("請先登入")
    vendor = Vendor.objects.filter(vendor_id=request.GET.get("vendor_id"), status="approved").first()
    if not vendor:
        return _not_found("找不到這個廠商")

    room, _ = InquiryRoom.objects.get_or_create(user=user, vendor=vendor)
    room.messages.filter(sender_role="vendor", is_read=False).update(is_read=True)

    return Response({
        "success": True,
        "err": "",
        "room_id": room.room_id,
        "vendor": {"vendor_id": vendor.vendor_id, "vendor_name": vendor.company_name},
        "messages": [_serialize_message(m) for m in room.messages.select_related("product")],
    }, status=status.HTTP_200_OK)


@api_view(["POST"])
@permission_classes([AllowAny])
def consumer_inquiry_send_message(request):
    user = User.objects.filter(pk=request.data.get("user_id")).first()
    if not user:
        return _bad_request("請先登入")
    vendor = Vendor.objects.filter(vendor_id=request.data.get("vendor_id"), status="approved").first()
    if not vendor:
        return _not_found("找不到這個廠商")
    content, error = _clean_content(request.data.get("content"))
    if error:
        return _bad_request(error)

    # 只接受這家廠商自己的商品，避免附上別家的商品
    product = None
    if request.data.get("product_id"):
        product = Product.objects.filter(
            product_id=request.data.get("product_id"), vendor_id=vendor.vendor_id
        ).first()

    room, _ = InquiryRoom.objects.get_or_create(user=user, vendor=vendor)
    message = InquiryMessage.objects.create(
        room=room, sender_role="user", sender_id=str(user.pk), content=content, product=product,
    )
    return Response({
        "success": True,
        "err": "",
        "message": _serialize_message(message),
    }, status=status.HTTP_201_CREATED)


@api_view(["GET"])
@permission_classes([AllowAny])
def consumer_inquiry_list(request):
    user = User.objects.filter(pk=request.GET.get("user_id")).first()
    if not user:
        return _bad_request("請先登入")
    rooms = InquiryRoom.objects.filter(user=user).select_related("user", "vendor")
    return Response({
        "success": True,
        "err": "",
        "rooms": _room_summaries(rooms, unread_role="vendor"),
    }, status=status.HTTP_200_OK)


# ==============================================================================
# 廠商端
# ==============================================================================

def _vendor_room(vendor_id, room_id):
    return (
        InquiryRoom.objects
        .select_related("user", "vendor")
        .filter(room_id=room_id, vendor_id=vendor_id)
        .first()
    )


@api_view(["GET"])
@permission_classes([AllowAny])
def vendor_inquiry_list(request):
    vendor_id = request.GET.get("vendor_id")
    if not vendor_id:
        return _bad_request("缺少廠商資訊，請重新登入")
    rooms = InquiryRoom.objects.filter(vendor_id=vendor_id).select_related("user", "vendor")
    return Response({
        "success": True,
        "err": "",
        "rooms": _room_summaries(rooms, unread_role="user"),
    }, status=status.HTTP_200_OK)


@api_view(["GET"])
@permission_classes([AllowAny])
def vendor_inquiry_get_messages(request):
    room = _vendor_room(request.GET.get("vendor_id"), request.GET.get("room_id"))
    if not room:
        return _not_found("找不到這個詢問對話")
    room.messages.filter(sender_role="user", is_read=False).update(is_read=True)
    return Response({
        "success": True,
        "err": "",
        "room_id": room.room_id,
        "user_name": _user_display_name(room.user),
        "messages": [_serialize_message(m) for m in room.messages.select_related("product")],
    }, status=status.HTTP_200_OK)


@api_view(["POST"])
@permission_classes([AllowAny])
def vendor_inquiry_send_message(request):
    room = _vendor_room(request.data.get("vendor_id"), request.data.get("room_id"))
    if not room:
        return _not_found("找不到這個詢問對話")
    content, error = _clean_content(request.data.get("content"))
    if error:
        return _bad_request(error)

    message = InquiryMessage.objects.create(
        room=room, sender_role="vendor", sender_id=str(room.vendor_id), content=content,
    )
    return Response({
        "success": True,
        "err": "",
        "message": _serialize_message(message),
    }, status=status.HTTP_201_CREATED)

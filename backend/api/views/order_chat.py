from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status

from api.models import Order, OrderChatRoom, OrderMessage, OrderItem
from api.notifications import create_notification


def _serialize_message(message):
    return {
        "message_id": message.message_id,
        "room_id": message.room_id,
        "sender_role": message.sender_role,
        "sender_id": message.sender_id,
        "content": message.content,
        "is_read": message.is_read,
        "created_at": message.created_at,
    }


def _order_vendor_id(order):
    item = (
        OrderItem.objects
        .filter(order_id=order.order_id)
        .select_related("product")
        .first()
    )
    return item.product.vendor_id if item and item.product else None


# ==============================================================================
# 消費者端
# ==============================================================================

@api_view(["GET"])
@permission_classes([AllowAny])
def user_order_chat_get_messages(request):
    """
    取得消費者針對某張訂單跟廠商的聊天室訊息（沒有就自動建立），
    同時把廠商發的訊息標記為已讀。
    URL: /user/orderChat/getMessages?order_id=...&user_id=...
    """
    order_id = request.GET.get("order_id")
    user_id = request.GET.get("user_id")

    if not order_id or not user_id:
        return Response({
            "success": False,
            "err": "order_id and user_id are required"
        }, status=status.HTTP_400_BAD_REQUEST)

    try:
        order = Order.objects.get(order_id=order_id)
    except Order.DoesNotExist:
        return Response({
            "success": False,
            "err": "Order not found"
        }, status=status.HTTP_404_NOT_FOUND)

    if str(order.user_id) != str(user_id):
        return Response({
            "success": False,
            "err": "This order does not belong to this user"
        }, status=status.HTTP_403_FORBIDDEN)

    room, _ = OrderChatRoom.objects.get_or_create(order=order)

    room.messages.filter(sender_role="vendor", is_read=False).update(is_read=True)

    messages = [_serialize_message(m) for m in room.messages.all()]

    return Response({
        "success": True,
        "err": "",
        "room_id": room.room_id,
        "messages": messages,
    }, status=status.HTTP_200_OK)


@api_view(["POST"])
@permission_classes([AllowAny])
def user_order_chat_send_message(request):
    """
    消費者在訂單聊天室發送訊息給廠商。
    URL: /user/orderChat/sendMessage
    """
    order_id = request.data.get("order_id")
    user_id = request.data.get("user_id")
    content = request.data.get("content", "").strip()

    if not order_id or not user_id:
        return Response({
            "success": False,
            "err": "order_id and user_id are required"
        }, status=status.HTTP_400_BAD_REQUEST)

    if not content:
        return Response({
            "success": False,
            "err": "content is required"
        }, status=status.HTTP_400_BAD_REQUEST)

    try:
        order = Order.objects.get(order_id=order_id)
    except Order.DoesNotExist:
        return Response({
            "success": False,
            "err": "Order not found"
        }, status=status.HTTP_404_NOT_FOUND)

    if str(order.user_id) != str(user_id):
        return Response({
            "success": False,
            "err": "This order does not belong to this user"
        }, status=status.HTTP_403_FORBIDDEN)

    room, _ = OrderChatRoom.objects.get_or_create(order=order)

    message = OrderMessage.objects.create(
        room=room,
        sender_role="user",
        sender_id=str(user_id),
        content=content,
    )

    return Response({
        "success": True,
        "err": "",
        "message": _serialize_message(message),
    }, status=status.HTTP_201_CREATED)


# ==============================================================================
# 廠商端
# ==============================================================================

@api_view(["GET"])
@permission_classes([AllowAny])
def vendor_order_chat_get_messages(request):
    """
    取得廠商針對某張訂單跟消費者的聊天室訊息（沒有就自動建立），
    同時把消費者發的訊息標記為已讀。
    URL: /vendor/orderChat/getMessages?order_id=...&vendor_id=...
    """
    order_id = request.GET.get("order_id")
    vendor_id = request.GET.get("vendor_id")

    if not order_id or not vendor_id:
        return Response({
            "success": False,
            "err": "order_id and vendor_id are required"
        }, status=status.HTTP_400_BAD_REQUEST)

    try:
        order = Order.objects.get(order_id=order_id)
    except Order.DoesNotExist:
        return Response({
            "success": False,
            "err": "Order not found"
        }, status=status.HTTP_404_NOT_FOUND)

    if str(_order_vendor_id(order)) != str(vendor_id):
        return Response({
            "success": False,
            "err": "This order does not belong to this vendor"
        }, status=status.HTTP_403_FORBIDDEN)

    room, _ = OrderChatRoom.objects.get_or_create(order=order)

    room.messages.filter(sender_role="user", is_read=False).update(is_read=True)

    messages = [_serialize_message(m) for m in room.messages.all()]

    return Response({
        "success": True,
        "err": "",
        "room_id": room.room_id,
        "messages": messages,
    }, status=status.HTTP_200_OK)


@api_view(["POST"])
@permission_classes([AllowAny])
def vendor_order_chat_send_message(request):
    """
    廠商在訂單聊天室發送訊息給消費者。
    URL: /vendor/orderChat/sendMessage
    """
    order_id = request.data.get("order_id")
    vendor_id = request.data.get("vendor_id")
    content = request.data.get("content", "").strip()

    if not order_id or not vendor_id:
        return Response({
            "success": False,
            "err": "order_id and vendor_id are required"
        }, status=status.HTTP_400_BAD_REQUEST)

    if not content:
        return Response({
            "success": False,
            "err": "content is required"
        }, status=status.HTTP_400_BAD_REQUEST)

    try:
        order = Order.objects.get(order_id=order_id)
    except Order.DoesNotExist:
        return Response({
            "success": False,
            "err": "Order not found"
        }, status=status.HTTP_404_NOT_FOUND)

    if str(_order_vendor_id(order)) != str(vendor_id):
        return Response({
            "success": False,
            "err": "This order does not belong to this vendor"
        }, status=status.HTTP_403_FORBIDDEN)

    room, _ = OrderChatRoom.objects.get_or_create(order=order)

    message = OrderMessage.objects.create(
        room=room,
        sender_role="vendor",
        sender_id=str(vendor_id),
        content=content,
    )

    create_notification(
        user=order.user,
        category="order",
        title="廠商回覆了您的訂單訊息",
        body=content,
        reference_type="order_chat",
        reference_id=order.order_id,
    )

    return Response({
        "success": True,
        "err": "",
        "message": _serialize_message(message),
    }, status=status.HTTP_201_CREATED)

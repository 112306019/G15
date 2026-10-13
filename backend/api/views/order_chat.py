"""
訂單頁的「聯絡廠商／聯絡買家」聊天。

消費者跟同一家廠商只有一個對話（InquiryRoom，見 inquiry.py），不再依訂單拆成不同聊天室：
從訂單頁傳的訊息一樣存進那個對話，只是在訊息上標記是哪張訂單（InquiryMessage.order）。
所以這裡的 getMessages 回傳的是「這位消費者跟這家廠商的完整對話」，
sendMessage 則會把訊息標上這張訂單。網址與回傳格式維持原樣，前端訂單頁不用改呼叫方式。

消費者端
GET  /user/orderChat/getMessages?order_id=&user_id=
POST /user/orderChat/sendMessage {order_id, user_id, content}
GET  /user/orderChat/list?user_id=            有訂單訊息的訂單（依訂單彙總）

廠商端
GET  /vendor/orderChat/getMessages?order_id=&vendor_id=
POST /vendor/orderChat/sendMessage {order_id, vendor_id, content}
GET  /vendor/orderChat/list?vendor_id=        有訂單訊息的訂單（訂單列表的未讀紅點用）
"""

from django.core.exceptions import ValidationError
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status

from api.models import InquiryMessage, InquiryRoom, Order, OrderItem, Vendor
from api.views.inquiry import _serialize_message, _user_display_name


def _order_vendor_id(order):
    item = (
        OrderItem.objects
        .filter(order_id=order.order_id)
        .select_related("product")
        .first()
    )
    return item.product.vendor_id if item and item.product else None


def _error(message, http_status):
    return Response({"success": False, "err": message}, status=http_status)


def _resolve_order_room(order_id, user_id=None, vendor_id=None):
    """
    找出訂單，並確認呼叫的人是這張訂單的買家（user_id）或賣家（vendor_id），
    回傳 (order, vendor, room, error_response)。對話不存在會自動建立。
    """
    try:
        order = Order.objects.select_related("user").get(order_id=order_id)
    except (Order.DoesNotExist, ValidationError, ValueError, TypeError):
        # 查無訂單，或 order_id 不是合法的 UUID
        return None, None, None, _error("找不到這張訂單", status.HTTP_404_NOT_FOUND)

    order_vendor_id = _order_vendor_id(order)

    if user_id is not None and str(order.user_id) != str(user_id):
        return None, None, None, _error("這張訂單不屬於您的帳號", status.HTTP_403_FORBIDDEN)
    if vendor_id is not None and str(order_vendor_id) != str(vendor_id):
        return None, None, None, _error("這張訂單不屬於您的商店", status.HTTP_403_FORBIDDEN)

    vendor = Vendor.objects.filter(vendor_id=order_vendor_id).first()
    if not vendor:
        return None, None, None, _error("找不到這張訂單的廠商", status.HTTP_404_NOT_FOUND)

    room, _ = InquiryRoom.objects.get_or_create(user=order.user, vendor=vendor)
    return order, vendor, room, None


def _room_messages(room):
    return [
        _serialize_message(m)
        for m in room.messages.select_related("product").order_by("created_at", "message_id")
    ]


def _order_summaries(messages, unread_role):
    """
    把有標訂單的訊息依訂單彙總：最後一則訊息、時間、對方未讀數。
    messages 要先依時間由舊到新排好。回傳依最後訊息時間由新到舊排序的 list。
    """
    summaries = {}
    for message in messages:
        summary = summaries.setdefault(message.order_id, {
            "room_id": message.room_id,
            "order_id": str(message.order_id),
            "unread_count": 0,
        })
        summary["last_message"] = message.content
        summary["last_sender_role"] = message.sender_role
        summary["last_message_at"] = message.created_at
        if message.sender_role == unread_role and not message.is_read:
            summary["unread_count"] += 1
    return sorted(summaries.values(), key=lambda s: s["last_message_at"], reverse=True)


# ==============================================================================
# 消費者端
# ==============================================================================

@api_view(["GET"])
@permission_classes([AllowAny])
def user_order_chat_get_messages(request):
    """
    消費者從訂單頁打開跟廠商的對話（沒有就自動建立），同時把廠商發的訊息標記為已讀。
    回傳的是跟這家廠商的完整對話，不只這張訂單的訊息。
    """
    order_id = request.GET.get("order_id")
    user_id = request.GET.get("user_id")
    if not order_id or not user_id:
        return _error("缺少訂單資訊，請重新登入後再試", status.HTTP_400_BAD_REQUEST)

    order, vendor, room, error = _resolve_order_room(order_id, user_id=user_id)
    if error:
        return error

    room.messages.filter(sender_role="vendor", is_read=False).update(is_read=True)

    return Response({
        "success": True,
        "err": "",
        "room_id": room.room_id,
        "vendor": {"vendor_id": vendor.vendor_id, "vendor_name": vendor.company_name},
        "messages": _room_messages(room),
    }, status=status.HTTP_200_OK)


@api_view(["POST"])
@permission_classes([AllowAny])
def user_order_chat_send_message(request):
    """消費者從訂單頁傳訊息給廠商：存進跟這家廠商的對話，並標上這張訂單。"""
    order_id = request.data.get("order_id")
    user_id = request.data.get("user_id")
    content = (request.data.get("content") or "").strip()
    if not order_id or not user_id:
        return _error("缺少訂單資訊，請重新登入後再試", status.HTTP_400_BAD_REQUEST)
    if not content:
        return _error("請輸入訊息內容", status.HTTP_400_BAD_REQUEST)

    order, vendor, room, error = _resolve_order_room(order_id, user_id=user_id)
    if error:
        return error

    message = InquiryMessage.objects.create(
        room=room, order=order, sender_role="user", sender_id=str(user_id), content=content,
    )

    return Response({
        "success": True,
        "err": "",
        "message": _serialize_message(message),
    }, status=status.HTTP_201_CREATED)


@api_view(["GET"])
@permission_classes([AllowAny])
def user_order_chat_list(request):
    """消費者有訂單訊息的訂單（依訂單彙總），依最後一則訊息時間由新到舊。"""
    user_id = request.GET.get("user_id")
    if not user_id:
        return _error("請先登入", status.HTTP_400_BAD_REQUEST)

    messages = list(
        InquiryMessage.objects
        .filter(room__user_id=user_id, order__isnull=False)
        .select_related("room__vendor")
        .order_by("created_at", "message_id")
    )
    vendor_by_order = {str(m.order_id): m.room.vendor for m in messages}

    result = []
    for summary in _order_summaries(messages, unread_role="vendor"):
        vendor = vendor_by_order[summary["order_id"]]
        result.append({
            **summary,
            "vendor_id": vendor.vendor_id,
            "vendor_name": vendor.company_name,
        })

    return Response({"success": True, "err": "", "rooms": result}, status=status.HTTP_200_OK)


# ==============================================================================
# 廠商端
# ==============================================================================

@api_view(["GET"])
@permission_classes([AllowAny])
def vendor_order_chat_get_messages(request):
    """
    廠商從訂單打開跟買家的對話（沒有就自動建立），同時把買家發的訊息標記為已讀。
    回傳的是跟這位買家的完整對話，不只這張訂單的訊息。
    """
    order_id = request.GET.get("order_id")
    vendor_id = request.GET.get("vendor_id")
    if not order_id or not vendor_id:
        return _error("缺少訂單或廠商資訊，請重新登入後再試", status.HTTP_400_BAD_REQUEST)

    order, vendor, room, error = _resolve_order_room(order_id, vendor_id=vendor_id)
    if error:
        return error

    room.messages.filter(sender_role="user", is_read=False).update(is_read=True)

    return Response({
        "success": True,
        "err": "",
        "room_id": room.room_id,
        "user_name": _user_display_name(order.user),
        "messages": _room_messages(room),
    }, status=status.HTTP_200_OK)


@api_view(["POST"])
@permission_classes([AllowAny])
def vendor_order_chat_send_message(request):
    """廠商從訂單傳訊息給買家：存進跟這位買家的對話，並標上這張訂單。"""
    order_id = request.data.get("order_id")
    vendor_id = request.data.get("vendor_id")
    content = (request.data.get("content") or "").strip()
    if not order_id or not vendor_id:
        return _error("缺少訂單或廠商資訊，請重新登入後再試", status.HTTP_400_BAD_REQUEST)
    if not content:
        return _error("請輸入訊息內容", status.HTTP_400_BAD_REQUEST)

    order, vendor, room, error = _resolve_order_room(order_id, vendor_id=vendor_id)
    if error:
        return error

    message = InquiryMessage.objects.create(
        room=room, order=order, sender_role="vendor", sender_id=str(vendor_id), content=content,
    )

    return Response({
        "success": True,
        "err": "",
        "message": _serialize_message(message),
    }, status=status.HTTP_201_CREATED)


@api_view(["GET"])
@permission_classes([AllowAny])
def vendor_order_chat_list(request):
    """
    廠商有訂單訊息的訂單（依訂單彙總），訂單列表的未讀紅點用。
    依最後一則訊息時間由新到舊排序。
    """
    vendor_id = request.GET.get("vendor_id")
    if not vendor_id:
        return _error("缺少廠商資訊，請重新登入", status.HTTP_400_BAD_REQUEST)

    messages = list(
        InquiryMessage.objects
        .filter(room__vendor_id=vendor_id, order__isnull=False)
        .select_related("room__user")
        .order_by("created_at", "message_id")
    )
    buyer_by_order = {str(m.order_id): m.room.user for m in messages}

    result = [
        {**summary, "buyer_name": _user_display_name(buyer_by_order.get(summary["order_id"]))}
        for summary in _order_summaries(messages, unread_role="user")
    ]

    return Response({"success": True, "err": "", "rooms": result}, status=status.HTTP_200_OK)

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status

from api.models import SupportChatRoom, SupportMessage, Vendor, User


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


def _participant_display_name(participant_type, participant_id):
    if participant_type == "vendor":
        vendor = Vendor.objects.filter(vendor_id=participant_id).first()
        return vendor.company_name if vendor else ""

    user = User.objects.filter(user_id=participant_id).first()
    if not user:
        return ""
    return user.display_name or user.name


# ==============================================================================
# 廠商端
# ==============================================================================

@api_view(["POST"])
@permission_classes([AllowAny])
def vendor_support_get_or_create_room(request):
    """
    取得（或第一次諮詢時建立）廠商的客服聊天室，一個廠商只會有一間。
    URL: /vendor/support/getOrCreateRoom
    """
    vendor_id = request.data.get("vendor_id")

    if not vendor_id:
        return Response({
            "success": False,
            "err": "vendor_id is required"
        }, status=status.HTTP_400_BAD_REQUEST)

    room, created = SupportChatRoom.objects.get_or_create(
        participant_type="vendor",
        participant_id=str(vendor_id),
    )

    return Response({
        "success": True,
        "err": "",
        "created": created,
        "room_id": room.room_id,
        "created_at": room.created_at,
    }, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)


@api_view(["GET"])
@permission_classes([AllowAny])
def vendor_support_get_messages(request):
    """
    取得廠商客服聊天室的訊息，同時把客服（admin）發的訊息標記為已讀
    （廠商只有一間聊天室，開啟聊天頁面等於全部讀過了）。
    URL: /vendor/support/getMessages
    """
    vendor_id = request.GET.get("vendor_id")

    if not vendor_id:
        return Response({
            "success": False,
            "err": "vendor_id is required"
        }, status=status.HTTP_400_BAD_REQUEST)

    room, _ = SupportChatRoom.objects.get_or_create(
        participant_type="vendor",
        participant_id=str(vendor_id),
    )

    room.messages.filter(sender_role="admin", is_read=False).update(is_read=True)

    messages = [_serialize_message(m) for m in room.messages.all()]

    return Response({
        "success": True,
        "err": "",
        "room_id": room.room_id,
        "messages": messages,
    }, status=status.HTTP_200_OK)


@api_view(["POST"])
@permission_classes([AllowAny])
def vendor_support_send_message(request):
    """
    廠商在客服聊天室發送訊息。
    URL: /vendor/support/sendMessage
    """
    vendor_id = request.data.get("vendor_id")
    content = request.data.get("content", "").strip()

    if not vendor_id:
        return Response({
            "success": False,
            "err": "vendor_id is required"
        }, status=status.HTTP_400_BAD_REQUEST)

    if not content:
        return Response({
            "success": False,
            "err": "content is required"
        }, status=status.HTTP_400_BAD_REQUEST)

    room, _ = SupportChatRoom.objects.get_or_create(
        participant_type="vendor",
        participant_id=str(vendor_id),
    )

    message = SupportMessage.objects.create(
        room=room,
        sender_role="vendor",
        sender_id=str(vendor_id),
        content=content,
    )

    return Response({
        "success": True,
        "err": "",
        "message": _serialize_message(message),
    }, status=status.HTTP_201_CREATED)


@api_view(["GET"])
@permission_classes([AllowAny])
def vendor_support_unread_count(request):
    """
    廠商 header 客服圖示的未讀數字，還沒諮詢過（沒有聊天室）就是 0。
    URL: /vendor/support/unreadCount
    """
    vendor_id = request.GET.get("vendor_id")

    if not vendor_id:
        return Response({
            "success": False,
            "err": "vendor_id is required"
        }, status=status.HTTP_400_BAD_REQUEST)

    room = SupportChatRoom.objects.filter(
        participant_type="vendor", participant_id=str(vendor_id),
    ).first()

    unread_count = (
        room.messages.filter(sender_role="admin", is_read=False).count()
        if room else 0
    )

    return Response({
        "success": True,
        "err": "",
        "unread_count": unread_count,
    }, status=status.HTTP_200_OK)


# ==============================================================================
# 消費者 / KOC 端（都是 User，共用同一組端點）
# ==============================================================================

@api_view(["POST"])
@permission_classes([AllowAny])
def user_support_get_or_create_room(request):
    """
    取得（或第一次諮詢時建立）消費者/KOC 的客服聊天室，一個帳號只會有一間。
    URL: /user/support/getOrCreateRoom
    """
    user_id = request.data.get("user_id")

    if not user_id:
        return Response({
            "success": False,
            "err": "user_id is required"
        }, status=status.HTTP_400_BAD_REQUEST)

    room, created = SupportChatRoom.objects.get_or_create(
        participant_type="user",
        participant_id=str(user_id),
    )

    return Response({
        "success": True,
        "err": "",
        "created": created,
        "room_id": room.room_id,
        "created_at": room.created_at,
    }, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)


@api_view(["GET"])
@permission_classes([AllowAny])
def user_support_get_messages(request):
    """
    取得消費者/KOC 客服聊天室的訊息，同時把客服（admin）發的訊息標記為已讀。
    URL: /user/support/getMessages
    """
    user_id = request.GET.get("user_id")

    if not user_id:
        return Response({
            "success": False,
            "err": "user_id is required"
        }, status=status.HTTP_400_BAD_REQUEST)

    room, _ = SupportChatRoom.objects.get_or_create(
        participant_type="user",
        participant_id=str(user_id),
    )

    room.messages.filter(sender_role="admin", is_read=False).update(is_read=True)

    messages = [_serialize_message(m) for m in room.messages.all()]

    return Response({
        "success": True,
        "err": "",
        "room_id": room.room_id,
        "messages": messages,
    }, status=status.HTTP_200_OK)


@api_view(["POST"])
@permission_classes([AllowAny])
def user_support_send_message(request):
    """
    消費者/KOC 在客服聊天室發送訊息。
    URL: /user/support/sendMessage
    """
    user_id = request.data.get("user_id")
    content = request.data.get("content", "").strip()

    if not user_id:
        return Response({
            "success": False,
            "err": "user_id is required"
        }, status=status.HTTP_400_BAD_REQUEST)

    if not content:
        return Response({
            "success": False,
            "err": "content is required"
        }, status=status.HTTP_400_BAD_REQUEST)

    room, _ = SupportChatRoom.objects.get_or_create(
        participant_type="user",
        participant_id=str(user_id),
    )

    message = SupportMessage.objects.create(
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


@api_view(["GET"])
@permission_classes([AllowAny])
def user_support_unread_count(request):
    """
    消費者/KOC header 客服圖示的未讀數字，還沒諮詢過（沒有聊天室）就是 0。
    URL: /user/support/unreadCount
    """
    user_id = request.GET.get("user_id")

    if not user_id:
        return Response({
            "success": False,
            "err": "user_id is required"
        }, status=status.HTTP_400_BAD_REQUEST)

    room = SupportChatRoom.objects.filter(
        participant_type="user", participant_id=str(user_id),
    ).first()

    unread_count = (
        room.messages.filter(sender_role="admin", is_read=False).count()
        if room else 0
    )

    return Response({
        "success": True,
        "err": "",
        "unread_count": unread_count,
    }, status=status.HTTP_200_OK)


# ==============================================================================
# 平台客服端
# ==============================================================================

@api_view(["GET"])
@permission_classes([AllowAny])
def admin_support_get_rooms(request):
    """
    客服聊天室列表，依 participant_type 分成廠商端／消費者端兩側。
    URL: /platform/support/getRooms?participant_type=vendor|user
    """
    participant_type = request.GET.get("participant_type")

    if participant_type not in ("vendor", "user"):
        return Response({
            "success": False,
            "err": "participant_type must be 'vendor' or 'user'"
        }, status=status.HTTP_400_BAD_REQUEST)

    rooms = (
        SupportChatRoom.objects
        .filter(participant_type=participant_type)
        .prefetch_related("messages")
    )

    room_list = []

    for room in rooms:
        last_message = room.messages.order_by("-created_at").first()

        unread_count = room.messages.filter(
            sender_role=participant_type, is_read=False,
        ).count()

        room_list.append({
            "room_id": room.room_id,
            "participant_type": room.participant_type,
            "participant_id": room.participant_id,
            "participant_name": _participant_display_name(
                room.participant_type, room.participant_id
            ),
            "last_message": last_message.content if last_message else "",
            "last_message_time": (
                last_message.created_at if last_message else room.created_at
            ),
            "last_sender_role": last_message.sender_role if last_message else None,
            "unread_count": unread_count,
            "created_at": room.created_at,
        })

    room_list.sort(key=lambda room: room["last_message_time"], reverse=True)

    return Response({
        "success": True,
        "err": "",
        "rooms": room_list,
    }, status=status.HTTP_200_OK)


@api_view(["GET"])
@permission_classes([AllowAny])
def admin_support_get_messages(request):
    """
    取得指定客服聊天室的訊息（不會自動標記已讀，客服端開房間跟讀訊息是分開兩個動作，
    對齊廠商-KOC 聊天室既有的 markRead 模式）。
    URL: /platform/support/getMessages?room_id=1
    """
    room_id = request.GET.get("room_id")

    if not room_id:
        return Response({
            "success": False,
            "err": "room_id is required"
        }, status=status.HTTP_400_BAD_REQUEST)

    try:
        room = SupportChatRoom.objects.get(room_id=room_id)
    except SupportChatRoom.DoesNotExist:
        return Response({
            "success": False,
            "err": "Chat room not found"
        }, status=status.HTTP_404_NOT_FOUND)

    messages = [_serialize_message(m) for m in room.messages.all()]

    return Response({
        "success": True,
        "err": "",
        "room": {
            "room_id": room.room_id,
            "participant_type": room.participant_type,
            "participant_id": room.participant_id,
            "participant_name": _participant_display_name(
                room.participant_type, room.participant_id
            ),
        },
        "messages": messages,
    }, status=status.HTTP_200_OK)


@api_view(["POST"])
@permission_classes([AllowAny])
def admin_support_send_message(request):
    """
    客服在聊天室發送訊息。
    URL: /platform/support/sendMessage
    """
    room_id = request.data.get("room_id")
    admin_id = request.data.get("admin_id")
    content = request.data.get("content", "").strip()

    if not room_id:
        return Response({
            "success": False,
            "err": "room_id is required"
        }, status=status.HTTP_400_BAD_REQUEST)

    if not admin_id:
        return Response({
            "success": False,
            "err": "admin_id is required"
        }, status=status.HTTP_400_BAD_REQUEST)

    if not content:
        return Response({
            "success": False,
            "err": "content is required"
        }, status=status.HTTP_400_BAD_REQUEST)

    try:
        room = SupportChatRoom.objects.get(room_id=room_id)
    except SupportChatRoom.DoesNotExist:
        return Response({
            "success": False,
            "err": "Chat room not found"
        }, status=status.HTTP_404_NOT_FOUND)

    message = SupportMessage.objects.create(
        room=room,
        sender_role="admin",
        sender_id=str(admin_id),
        content=content,
    )

    return Response({
        "success": True,
        "err": "",
        "message": _serialize_message(message),
    }, status=status.HTTP_201_CREATED)


@api_view(["POST"])
@permission_classes([AllowAny])
def admin_support_mark_read(request):
    """
    客服開啟聊天室後，將廠商/消費者發的訊息標記為已讀。
    URL: /platform/support/markRead
    """
    room_id = request.data.get("room_id")

    if not room_id:
        return Response({
            "success": False,
            "err": "room_id is required"
        }, status=status.HTTP_400_BAD_REQUEST)

    try:
        room = SupportChatRoom.objects.get(room_id=room_id)
    except SupportChatRoom.DoesNotExist:
        return Response({
            "success": False,
            "err": "Chat room not found"
        }, status=status.HTTP_404_NOT_FOUND)

    updated_count = room.messages.filter(
        sender_role=room.participant_type, is_read=False,
    ).update(is_read=True)

    return Response({
        "success": True,
        "err": "",
        "room_id": room.room_id,
        "updated_count": updated_count,
    }, status=status.HTTP_200_OK)

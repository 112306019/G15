import django.db.models.deletion
from django.db import migrations, models


def copy_order_messages(apps, schema_editor):
    """
    把舊的訂單聊天（OrderChatRoom / OrderMessage）搬進「消費者 × 廠商」的統一對話
    （InquiryRoom / InquiryMessage），每則訊息標上原本的訂單。
    只複製、不刪除舊資料；時間、已讀狀態、發送者都照原樣保留。
    """
    OrderMessage = apps.get_model('api', 'OrderMessage')
    OrderItem = apps.get_model('api', 'OrderItem')
    Vendor = apps.get_model('api', 'Vendor')
    InquiryRoom = apps.get_model('api', 'InquiryRoom')
    InquiryMessage = apps.get_model('api', 'InquiryMessage')

    messages = list(
        OrderMessage.objects
        .select_related('room__order')
        .order_by('created_at', 'message_id')
    )
    if not messages:
        return

    # 訂單屬於哪家廠商：看訂單第一筆明細的商品
    vendor_by_order = {}
    for order_id, vendor_id in (
        OrderItem.objects
        .filter(order_id__in={m.room.order_id for m in messages})
        .order_by('pk')
        .values_list('order_id', 'product__vendor_id')
    ):
        vendor_by_order.setdefault(order_id, vendor_id)
    existing_vendor_ids = set(
        Vendor.objects
        .filter(vendor_id__in={v for v in vendor_by_order.values() if v})
        .values_list('vendor_id', flat=True)
    )

    room_cache = {}
    for message in messages:
        order = message.room.order
        vendor_id = vendor_by_order.get(order.order_id)
        if not vendor_id or vendor_id not in existing_vendor_ids or not order.user_id:
            continue
        key = (order.user_id, vendor_id)
        if key not in room_cache:
            room_cache[key], _ = InquiryRoom.objects.get_or_create(user_id=order.user_id, vendor_id=vendor_id)
        copied = InquiryMessage.objects.create(
            room=room_cache[key],
            order_id=order.order_id,
            sender_role=message.sender_role,
            sender_id=message.sender_id,
            content=message.content,
            is_read=message.is_read,
        )
        # created_at 是 auto_now_add，建立時會被蓋成現在時間，要另外改回原本的時間
        InquiryMessage.objects.filter(pk=copied.pk).update(created_at=message.created_at)


def remove_copied_messages(apps, schema_editor):
    """還原：把搬過來的訊息（有標訂單的）刪掉，舊資料表的原始訊息還在。"""
    InquiryMessage = apps.get_model('api', 'InquiryMessage')
    InquiryMessage.objects.filter(order__isnull=False).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0063_campaigns_promo_copy'),
    ]

    operations = [
        migrations.AddField(
            model_name='inquirymessage',
            name='order',
            field=models.ForeignKey(blank=True, db_column='order_id', null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='inquiry_messages', to='api.order'),
        ),
        migrations.RunPython(copy_order_messages, remove_copied_messages),
    ]

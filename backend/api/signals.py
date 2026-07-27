from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import Order


@receiver(post_save, sender=Order)
def order_completed_triggers_commission(sender, instance, **kwargs):
    """
    只要訂單被存成 order_status='completed'，不管是透過哪個管道
    （consumer/order/update API、Django admin、shell、後續的批次腳本…
    任何有經過 Django ORM save() 的路徑），都自動觸發分潤計算。

    calculate_order_commission 本身有防重複機制（同一張訂單已經算過
    就直接跳過），所以就算這裡跟呼叫端各自都觸發一次也不會重複入帳。

    注意：純粹繞過 ORM、直接對資料庫下 SQL 改欄位不會經過這裡，
    這是 Django signal 的限制，不是這支函式的問題。
    """
    if instance.order_status != 'completed':
        return

    from .views.platform import calculate_order_commission

    try:
        calculate_order_commission(instance)
    except ValueError:
        # 找不到 KOC / 找不到對應使用者等資料異常，不要讓存檔動作跟著失敗
        pass

from django.urls import path

from . import views

urlpatterns = [
    path("create/", views.create_payment, name="create_payment"),
    path("status/", views.get_payment_status, name="get_payment_status"),
    path("ecpay/notify/", views.ecpay_return, name="ecpay_return"),
    path("ecpay/result/", views.ecpay_order_result, name="ecpay_order_result"),
]

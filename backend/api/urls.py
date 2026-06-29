from django.urls import path
from .views import koc, vendor

# 之後在這裡加 API 路由
# 例如：
# from . import views
# from rest_framework.routers import DefaultRouter
# router = DefaultRouter()
# router.register(r"products", views.ProductViewSet)
# urlpatterns = router.urls

urlpatterns = [
    # 對齊你們規格書要求的路徑
    path('koc/profile/updateProfile', koc.update_koc_profile, name='update-koc-profile'),
    path('koc/application/getAvailableList', koc.get_available_campaign_list, name='get_available_campaign_list'),

    # Vendor 帳號 API
    path('vendor/auth/register', vendor.vendor_register, name='vendor-register'),
    path('vendor/auth/login', vendor.vendor_login, name='vendor-login'),
    path('vendor/profile/update', vendor.vendor_profile_update, name='vendor-profile-update'),

    # Vendor 商品 API
    path('vendor/product/create', vendor.vendor_product_create, name='vendor-product-create'),
    path('vendor/product/update', vendor.vendor_product_update, name='vendor-product-update'),
    path('vendor/product/updateStatus', vendor.vendor_product_update_status, name='vendor-product-update-status'),
    path('vendor/product/getlist', vendor.vendor_product_getlist, name='vendor-product-getlist'),

    # Vendor 任務 / Campaign API
    path('vendor/campaign/create', vendor.vendor_campaign_create, name='vendor-campaign-create'),
    path('vendor/campaign/update', vendor.vendor_campaign_update, name='vendor-campaign-update'),
    path('vendor/campaign/getlist', vendor.vendor_campaign_getlist, name='vendor-campaign-getlist'),

    # Vendor KOC 報名審核 API
    path('vendor/application/getlist', vendor.vendor_application_getlist, name='vendor-application-getlist'),
    path('vendor/application/review', vendor.vendor_application_review, name='vendor-application-review'),
]
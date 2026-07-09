from django.urls import path

from .views import koc, platform, vendor

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

    # Vendor 投稿 / 任務成果審核 API
    path('vendor/mission/getSubmissionDetail', vendor.vendor_mission_get_submission_detail, name='vendor-mission-get-submission-detail'),
    path('vendor/mission/reviewSubmission', vendor.vendor_mission_review_submission, name='vendor-mission-review-submission'),

    # Vendor 訂單 API
    path('vendor/order/getlist', vendor.vendor_order_getlist, name='vendor-order-getlist'),
    path('vendor/order/getDetail', vendor.vendor_order_get_detail, name='vendor-order-get-detail'),
    path('vendor/order/updateShipping', vendor.vendor_order_update_shipping, name='vendor-order-update-shipping'),

    # Vendor 優惠碼 API
    path('vendor/coupon/getUsageList', vendor.vendor_coupon_get_usage_list, name='vendor-coupon-get-usage-list'),
    path('vendor/coupon/updateStatus', vendor.vendor_coupon_update_status, name='vendor-coupon-update-status'),

    # Vendor 分析 API
    path('vendor/analytics/overview', vendor.vendor_analytics_overview, name='vendor-analytics-overview'),
    path('vendor/analytics/productPerformance', vendor.vendor_product_performance, name='vendor-product-performance'),

    # Admin API
    # Platform Admin 平台端 API
    path('platform/vendors', platform.admin_vendor_list, name='admin-vendor-list'),
    path('platform/vendor/detail', platform.admin_vendor_detail, name='admin-vendor-detail'),
    path('platform/vendor/audit', platform.admin_vendor_audit, name='admin-vendor-audit'),
    path('platform/vendor/review', platform.admin_vendor_review, name='admin-vendor-review'),
    path('platform/overview', platform.admin_overview, name='admin-overview'),
    path('platform/coupons', platform.admin_coupon_usage, name='admin-coupon-usage'),
    path('platform/performance', platform.admin_performance, name='admin-performance'),

]
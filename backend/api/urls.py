from django.urls import path

from . import views
from .views.auth import user_signup, user_login
from .views.platform import (
    admin_login,
    get_consumers,
    get_consumer_orders,
    get_payments,
    get_transactions,
    get_audit_logs,
)
from .views.consumer import (
    get_products,
    get_product_detail,
    create_cart,
    add_cart_item,
    view_cart,
    update_cart_item,
    delete_cart_item,
    add_wishlist,
    view_wishlist,
    delete_wishlist,
    verify_coupon,
    create_guest,
    create_order,
    view_order,
    create_transaction,
    update_payment,
    payment_result,
)

from .views import koc, platform, vendor

urlpatterns = [
    path('koc/profile/updateProfile', views.update_koc_profile, name='koc-update-profile'),
    path('koc/application/getAvailableList', views.get_available_campaign_list, name='get_available_campaign_list'),
    path('koc/application/applyMission', views.apply_mission, name='apply_mission'),
    path('koc/mission/submit', views.mission_submit, name='koc-mission-submit'),
    path('koc/application/getlist', views.get_application_list, name='get-application-list'),
    path('koc/mission/getDetail', views.mission_get_detail, name='koc-mission-get-detail'),
    path('koc/mission/getlist', views.get_mission_list, name='koc-mission-get-list'),
    path('koc/mission/getStageCounts', views.get_mission_stage_counts, name='koc-mission-get-stage-counts'),
    path('koc/application/remove/<int:application_id>', views.remove_application, name='koc-application-remove'),
    path('koc/revenue/getTotal', views.get_revenue_total, name='koc-revenue-get-total'),
    path('koc/revenue/getHistory', views.get_revenue_history, name='koc-revenue-get-history'),
    path('koc/revenue/getPendingDetail', views.get_pending_earnings_detail, name='koc-revenue-get-pending-detail'),
    path('koc/analytics/getList', views.get_analytics_list, name='koc-analytics-get-list'),
    path('koc/analytics/getDetail', views.get_analytics_detail, name='koc-analytics-get-detail'),
    path('koc/mission/saveDraft', views.save_draft, name='koc-mission-save-draft'),
    path('koc/apply', views.koc_apply, name='koc-apply'),

    path('platform/koc/approve', views.koc_approve, name='platform-koc-approve'),
    path('platform/koc/reject', views.koc_reject, name='platform-koc-reject'),
    path('platform/koc/getPendingList', views.koc_get_pending_list, name='platform-koc-get-pending-list'),
    path('platform/koc/getList', views.koc_get_list, name='platform-koc-get-list'),
    path('platform/koc/getDetail', views.koc_get_detail, name='platform-koc-get-detail'),

    path('koc/profile/updateProfile', views.update_koc_profile, name='update-koc-profile'),
    path('koc/application/getAvailableList', views.get_available_campaign_list, name='get_available_campaign_list'),
    # auth
    path('user/signUp', user_signup, name='user-signup'),
    path('user/login', user_login, name='user-login'),
    # platform
    path('platform/login', admin_login, name='platform-login'),
    path('platform/consumers', get_consumers, name='platform-consumers'),
    path('platform/consumer/orders', get_consumer_orders, name='platform-consumer-orders'),
    path('platform/payments', get_payments, name='platform-payments'),
    path('platform/transactions', get_transactions, name='platform-transactions'),
    path('platform/audit/logs', get_audit_logs, name='platform-audit-logs'),
    # consumer - 商品
    path('consumer/products', get_products, name='get-products'),
    path('consumer/product/detail', get_product_detail, name='get-product-detail'),
    # consumer - 購物車
    path('consumer/cart/create', create_cart, name='create-cart'),
    path('consumer/cart/item/add', add_cart_item, name='add-cart-item'),
    path('consumer/cart/view', view_cart, name='view-cart'),
    path('consumer/cart/item/update', update_cart_item, name='update-cart-item'),
    path('consumer/cart/item/delete', delete_cart_item, name='delete-cart-item'),
    # consumer - 收藏
    path('consumer/wishlist/add', add_wishlist, name='add-wishlist'),
    path('consumer/wishlist/view', view_wishlist, name='view-wishlist'),
    path('consumer/wishlist/delete', delete_wishlist, name='delete-wishlist'),
    # consumer - 優惠碼
    path('consumer/coupon/verify', verify_coupon, name='verify-coupon'),
    # consumer - 訪客
    path('consumer/guest/create', create_guest, name='create-guest'),
    # consumer - 訂單
    path('consumer/order/create', create_order, name='create-order'),
    path('consumer/order/view', view_order, name='view-order'),
    # consumer - 交易
    path('consumer/transaction/create', create_transaction, name='create-transaction'),
    # consumer - 付款
    path('consumer/payment/update', update_payment, name='update-payment'),
    path('consumer/payments/result', payment_result, name='payment-result'),

    # Vendor 帳號 API
    path('vendor/auth/register', vendor.vendor_register, name='vendor-register'),
    path('vendor/auth/login', vendor.vendor_login, name='vendor-login'),
    path('vendor/profile/update', vendor.vendor_profile_update, name='vendor-profile-update'),
    path('vendor/profile/get', vendor.vendor_profile_get, name='vendor-profile-get'),

    # Vendor 商品 API
    path('vendor/product/create', vendor.vendor_product_create, name='vendor-product-create'),
    path('vendor/product/update', vendor.vendor_product_update, name='vendor-product-update'),
    path('vendor/product/updateStatus', vendor.vendor_product_update_status, name='vendor-product-update-status'),
   path( 'vendor/product/delete', vendor.vendor_product_delete, name="vendor-product-delete"), 
    path('vendor/product/getlist', vendor.vendor_product_getlist, name='vendor-product-getlist'),

    # Vendor 任務 / Campaign API
    path('vendor/campaign/create', vendor.vendor_campaign_create, name='vendor-campaign-create'),
    path('vendor/campaign/update', vendor.vendor_campaign_update, name='vendor-campaign-update'),
    path('vendor/campaign/getlist', vendor.vendor_campaign_getlist, name='vendor-campaign-getlist'),
    path('vendor/campaign/delete', vendor.vendor_campaign_delete, name='vendor-campaign-delete'),

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

    # Vendor 聊天室 API
    path('vendor/chatroom/create', vendor.vendor_chatroom_create, name='vendor_chatroom_create'),
    path('vendor/chatroom/getlist', vendor.vendor_chatroom_getlist, name='vendor_chatroom_getlist'),
    path('vendor/chatroom/getMessages', vendor.vendor_chatroom_get_messages, name='vendor_chatroom_get_messages'),
    path('vendor/chatroom/sendMessage', vendor.vendor_chatroom_send_message, name='vendor_chatroom_send_message'),
    path('vendor/chatroom/markRead', vendor.vendor_chatroom_mark_read, name='vendor_chatroom_mark_read'),

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


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
]
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
]

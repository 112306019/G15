from django.urls import path

from . import views
from .views.auth import (
    user_signup, user_login, get_login_history, change_password,
    forgot_password, reset_password, verify_email, resend_verification_code,
)
from .views.platform import (
    admin_login,
    get_consumers,
    get_consumer_orders,
    get_payments,
    get_transactions,
    get_audit_logs,
    koc_approve,
    koc_reject,
    koc_get_pending_list,
    koc_get_list,
    koc_get_detail,
    koc_mission_stage_update,
    admin_vendor_list,
    admin_vendor_detail,
    admin_vendor_audit,
    admin_vendor_review,
    admin_overview,
    admin_coupon_usage,
    admin_performance,
    get_all_missions,
    get_earnings_tracking,
    admin_settle_campaign_earnings,
    admin_generate_vendor_settlement,
    admin_list_vendor_review_overdue,
    admin_notify_vendor_review_overdue,
    admin_list_vendor_invoices,
    admin_confirm_vendor_settlement_remittance,
    admin_list_settleable_vendors,
    admin_list_vendor_settlements,
    admin_confirm_vendor_settlement_payment,
    admin_list_vendor_receivables,
    admin_create_vendor_receivable_payout,
    admin_confirm_vendor_receivable_payout,
    admin_export_payout_transfers,
    admin_list_koc_payouts,
    admin_confirm_koc_payout,
    admin_get_earnings,
    admin_list_settleable_campaigns,
    admin_list_return_disputes,
    admin_resolve_return_dispute,
    admin_get_tax_forms,
    admin_review_tax_form,
)

from .views.consumer import (
    get_products,
    get_product_detail,
    get_product_categories,
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
    update_order_status,
    get_product_campaign,
    create_return_request,
    get_return_requests,
    dispute_return_request,
    upload_return_packing_proof,
    cancel_order,
    consumer_upload_image,
)

from .views import koc, vendor
from .views.vendor import vendor_upload_image
from .views import shipping
from .views import support
from .views import order_chat
from .views import notifications as notification_views


urlpatterns = [
    # ======================================================
    # KOC 帶貨短連結
    # ======================================================

    path('r/<str:promotion_code>/', views.koc_link_redirect, name='koc-link-redirect'),

    # ======================================================
    # KOC Profile / Application / Mission
    # ======================================================

    path('koc/profile/getProfile', views.get_koc_profile, name='koc-get-profile'),
    path('koc/profile/updateProfile', views.update_koc_profile, name='koc-update-profile'),
    path('koc/application/getAvailableList', views.get_available_campaign_list, name='get_available_campaign_list'),
    path('koc/application/getAppliedList', views.get_applied_campaign_list, name='koc-get-applied-campaign-list'),
    path('koc/application/applyMission', views.apply_mission, name='apply_mission'),
    path('koc/application/getlist', views.get_application_list, name='get-application-list'),
    path('koc/application/remove/<int:application_id>', views.remove_application, name='koc-application-remove'),

    path('koc/mission/submit', views.mission_submit, name='koc-mission-submit'),
    path('koc/mission/getDetail', views.mission_get_detail, name='koc-mission-get-detail'),
    path('koc/mission/getlist', views.get_mission_list, name='koc-mission-get-list'),
    path('koc/mission/cancel', views.cancel_mission, name='koc-mission-cancel'),
    path('koc/mission/getStageCounts', views.get_mission_stage_counts, name='koc-mission-get-stage-counts'),
    path('koc/mission/submitTaxFormLink', views.submit_tax_form_link, name='koc-mission-submit-tax-form-link'),
    path('koc/mission/taxFormData', views.get_tax_form_data, name='koc-mission-tax-form-data'),
    path('koc/mission/saveDraft', views.save_draft, name='koc-mission-save-draft'),

    path('koc/apply', views.koc_apply, name='koc-apply'),

    # ======================================================
    # KOC 收益
    # ======================================================

    path('koc/revenue/getTotal', views.get_revenue_total, name='koc-revenue-get-total'),
    path('koc/revenue/getHistory', views.get_revenue_history, name='koc-revenue-get-history'),
    path('koc/revenue/getPayoutRecords', views.get_payout_records, name='koc-revenue-get-payout-records'),
    path('koc/revenue/getMissingTaxForms', views.get_missing_tax_forms, name='koc-revenue-get-missing-tax-forms'),
    path('koc/revenue/getRemunerationForms', views.get_remuneration_forms, name='koc-revenue-get-remuneration-forms'),
    path('koc/revenue/requestPayout', views.request_payout, name='koc-revenue-request-payout'),

    # ======================================================
    # KOC Analytics
    # ======================================================

    path('koc/analytics/getList', views.get_analytics_list, name='koc-analytics-get-list'),
    path('koc/analytics/getDetail', views.get_analytics_detail, name='koc-analytics-get-detail'),
    path('koc/insights/topProducts', views.koc_top_products, name='koc-insights-top-products'),
    path('koc/insights/recommendations', views.koc_recommended_products, name='koc-insights-recommendations'),

    # ======================================================
    # KOC 聊天室
    # ======================================================

    path('koc/chat/getOrCreateRoom', views.get_or_create_chat_room, name='koc-chat-get-or-create-room'),
    path('koc/chat/getHistory', views.get_chat_history, name='koc-chat-get-history'),
    path('koc/chat/sendMessage', views.send_chat_message, name='koc-chat-send-message'),
    path('koc/chatroom/getlist', views.koc_chatroom_getlist, name='koc-chatroom-getlist'),
    path('koc/chatroom/markRead', views.koc_chatroom_mark_read, name='koc-chatroom-mark-read'),

    # ======================================================
    # Platform KOC
    # ======================================================

    path('platform/koc/approve', koc_approve, name='platform-koc-approve'),
    path('platform/koc/reject', koc_reject, name='platform-koc-reject'),
    path('platform/koc/getPendingList', koc_get_pending_list, name='platform-koc-get-pending-list'),
    path('platform/koc/getList', koc_get_list, name='platform-koc-get-list'),
    path('platform/koc/getDetail', koc_get_detail, name='platform-koc-get-detail'),
    path('platform/kocmission/stage/update', koc_mission_stage_update, name='platform-kocmission-stage-update'),

    # ======================================================
    # Platform Mission / Earnings
    # ======================================================

    path('platform/mission/getAll', get_all_missions, name='platform-mission-get-all'),
    path('platform/mission/getEarningsTracking', get_earnings_tracking, name='platform-mission-get-earnings-tracking'),
    path('platform/campaign/settle-earnings', admin_settle_campaign_earnings, name='platform-campaign-settle-earnings'),
    path('platform/earnings', admin_get_earnings, name='platform-earnings'),
    path('platform/campaigns/settleable', admin_list_settleable_campaigns, name='platform-campaigns-settleable'),

    # ======================================================
    # Vendor → ShareBuy
    # 15% 平台服務費
    # ======================================================

    path('platform/vendor/settlement/generate', admin_generate_vendor_settlement, name='platform-vendor-settlement-generate'),
    path('platform/vendor/settlements', admin_list_vendor_settlements, name='platform-vendor-settlements'),
    path('platform/vendor/settlement/confirm', admin_confirm_vendor_settlement_payment, name='platform-vendor-settlement-confirm'),
    path('platform/vendor/invoices', admin_list_vendor_invoices, name='platform-vendor-invoices'),
    path('platform/vendor/settlement/payment/confirm', admin_confirm_vendor_settlement_remittance, name='platform-vendor-settlement-payment-confirm'),
    path('platform/vendors/settleable', admin_list_settleable_vendors, name='platform-vendors-settleable'),

    # ======================================================
    # ShareBuy → Vendor
    # 商品款全額撥付
    # ======================================================

    path('platform/vendor/receivables', admin_list_vendor_receivables, name='platform-vendor-receivables'),
    path('platform/vendor/receivable/payout', admin_create_vendor_receivable_payout, name='platform-vendor-receivable-payout'),
    path('platform/vendor/receivable/payout/confirm', admin_confirm_vendor_receivable_payout, name='platform-vendor-receivable-payout-confirm'),

    # ======================================================
    # 舊 Vendor 財務 API
    # 暫時保留相容
    # ======================================================

    path('platform/vendor/settle-earnings', admin_generate_vendor_settlement, name='platform-vendor-settle-earnings-legacy'),
    path('platform/vendor/payouts', admin_list_vendor_settlements, name='platform-vendor-payouts-legacy'),
    path('platform/vendor/payout/confirm', admin_confirm_vendor_settlement_payment, name='platform-vendor-payout-confirm-legacy'),
    path('platform/vendor/run-monthly-payouts', admin_generate_vendor_settlement, name='platform-vendor-run-monthly-payouts-legacy'),

    # ======================================================
    # Platform Vendor Review
    # ======================================================

    path('platform/vendor/review-overdue', admin_list_vendor_review_overdue, name='platform-vendor-review-overdue'),
    path('platform/vendor/review-overdue/notify', admin_notify_vendor_review_overdue, name='platform-vendor-review-overdue-notify'),

    # ======================================================
    # Platform KOC Payout
    # ======================================================

    path('platform/koc/payouts', admin_list_koc_payouts, name='platform-koc-payouts'),
    path('platform/koc/payout/confirm', admin_confirm_koc_payout, name='platform-koc-payout-confirm'),
    path('platform/payouts/export', admin_export_payout_transfers, name='platform-payouts-export'),

    # ======================================================
    # Platform Returns
    # ======================================================

    path('platform/returns/disputes', admin_list_return_disputes, name='platform-returns-disputes'),
    path('platform/returns/disputes/resolve', admin_resolve_return_dispute, name='platform-returns-disputes-resolve'),

    # ======================================================
    # Auth
    # ======================================================

    path('user/signUp', user_signup, name='user-signup'),
    path('user/login', user_login, name='user-login'),
    path('user/password/forgot', forgot_password, name='user-password-forgot'),
    path('user/password/reset', reset_password, name='user-password-reset'),
    path('user/verifyEmail', verify_email, name='user-verify-email'),
    path('user/resendVerification', resend_verification_code, name='user-resend-verification'),
    path('user/loginHistory', get_login_history, name='get-login-history'),
    path('user/changePassword', change_password, name='change-password'),

    # ======================================================
    # Platform 基本管理
    # ======================================================

    path('platform/login', admin_login, name='platform-login'),
    path('platform/consumers', get_consumers, name='platform-consumers'),
    path('platform/consumer/orders', get_consumer_orders, name='platform-consumer-orders'),
    path('platform/payments', get_payments, name='platform-payments'),
    path('platform/transactions', get_transactions, name='platform-transactions'),
    path('platform/audit/logs', get_audit_logs, name='platform-audit-logs'),

    # ======================================================
    # 勞務報酬單
    # ======================================================

    path('platform/taxForms/getlist', admin_get_tax_forms, name='platform-tax-forms-get-list'),
    path('platform/taxForms/review', admin_review_tax_form, name='platform-tax-forms-review'),

    # ======================================================
    # Consumer 商品
    # ======================================================

    path('consumer/products', get_products, name='get-products'),
    path('consumer/product/categories', get_product_categories, name='get-product-categories'),
    path('consumer/product/detail', get_product_detail, name='get-product-detail'),
    path('consumer/product/campaign', get_product_campaign, name='get-product-campaign'),

    # ======================================================
    # Consumer 購物車
    # ======================================================

    path('consumer/cart/create', create_cart, name='create-cart'),
    path('consumer/cart/item/add', add_cart_item, name='add-cart-item'),
    path('consumer/cart/view', view_cart, name='view-cart'),
    path('consumer/cart/item/update', update_cart_item, name='update-cart-item'),
    path('consumer/cart/item/delete', delete_cart_item, name='delete-cart-item'),

    # ======================================================
    # Consumer Wishlist
    # ======================================================

    path('consumer/wishlist/add', add_wishlist, name='add-wishlist'),
    path('consumer/wishlist/view', view_wishlist, name='view-wishlist'),
    path('consumer/wishlist/delete', delete_wishlist, name='delete-wishlist'),

    # ======================================================
    # Consumer Coupon
    # ======================================================

    path('consumer/coupon/verify', verify_coupon, name='verify-coupon'),

    # ======================================================
    # Consumer Guest
    # ======================================================

    path('consumer/guest/create', create_guest, name='create-guest'),

    # ======================================================
    # Consumer Order
    # ======================================================

    path('consumer/order/create', create_order, name='create-order'),
    path('consumer/order/view', view_order, name='view-order'),
    path('consumer/order/update', update_order_status, name='update-order-status'),
    path('consumer/order/cancel', cancel_order, name='cancel-order'),

    # ======================================================
    # Consumer Transaction / Payment
    # ======================================================

    path('consumer/transaction/create', create_transaction, name='create-transaction'),
    path('consumer/payment/update', update_payment, name='update-payment'),
    path('consumer/payments/result', payment_result, name='payment-result'),

    # ======================================================
    # Consumer Return
    # ======================================================

    path('consumer/order/return/create', create_return_request, name='create-return-request'),
    path('consumer/order/return/list', get_return_requests, name='get-return-requests'),
    path('consumer/order/return/dispute', dispute_return_request, name='dispute-return-request'),
    path('consumer/order/return/uploadPackingProof', upload_return_packing_proof, name='upload-return-packing-proof'),
    path('consumer/upload-image', consumer_upload_image, name='consumer-upload-image'),

    # ======================================================
    # Vendor Auth / Profile
    # ======================================================

    path('vendor/auth/register', vendor.vendor_register, name='vendor-register'),
    path('vendor/auth/login', vendor.vendor_login, name='vendor-login'),
    path('vendor/auth/verifyEmail', vendor.vendor_verify_email, name='vendor-verify-email'),
    path('vendor/auth/resendVerification', vendor.vendor_resend_verification_code, name='vendor-resend-verification'),
    path('vendor/profile/update', vendor.vendor_profile_update, name='vendor-profile-update'),
    path('vendor/profile/get', vendor.vendor_profile_get, name='vendor-profile-get'),

    # ======================================================
    # Vendor Products
    # ======================================================

    path('vendor/product/create', vendor.vendor_product_create, name='vendor-product-create'),
    path('vendor/product/update', vendor.vendor_product_update, name='vendor-product-update'),
    path('vendor/product/updateStatus', vendor.vendor_product_update_status, name='vendor-product-update-status'),
    path('vendor/product/delete', vendor.vendor_product_delete, name='vendor-product-delete'),
    path('vendor/product/getlist', vendor.vendor_product_getlist, name='vendor-product-getlist'),
    path('vendor/product/upload-image', vendor_upload_image, name='vendor-upload-image'),

    # ======================================================
    # Vendor Campaign
    # ======================================================

    path('vendor/campaign/create', vendor.vendor_campaign_create, name='vendor-campaign-create'),
    path('vendor/campaign/update', vendor.vendor_campaign_update, name='vendor-campaign-update'),
    path('vendor/campaign/getlist', vendor.vendor_campaign_getlist, name='vendor-campaign-getlist'),
    path('vendor/campaign/delete', vendor.vendor_campaign_delete, name='vendor-campaign-delete'),

    # ======================================================
    # Vendor Application
    # ======================================================

    path('vendor/application/getlist', vendor.vendor_application_getlist, name='vendor-application-getlist'),
    path('vendor/application/review', vendor.vendor_application_review, name='vendor-application-review'),

    # ======================================================
    # Vendor Mission
    # ======================================================

    path('vendor/mission/getSubmissionDetail', vendor.vendor_mission_get_submission_detail, name='vendor-mission-get-submission-detail'),
    path('vendor/mission/reviewSubmission', vendor.vendor_mission_review_submission, name='vendor-mission-review-submission'),
    path('vendor/mission/submission/saveAiResult', vendor.vendor_submission_save_ai_result, name='vendor-submission-save-ai-result'),

    # ======================================================
    # Vendor Orders
    # ======================================================

    path('vendor/order/getlist', vendor.vendor_order_getlist, name='vendor-order-getlist'),
    path('vendor/order/getDetail', vendor.vendor_order_get_detail, name='vendor-order-get-detail'),
    path('vendor/order/updateShipping', vendor.vendor_order_update_shipping, name='vendor-order-update-shipping'),
    path('vendor/order/respondCancelRequest', vendor.vendor_order_respond_cancel_request, name='vendor-order-respond-cancel-request'),
    path('vendor/order/uploadInvoice', vendor.vendor_order_upload_invoice, name='vendor-order-upload-invoice'),

    # ======================================================
    # Vendor Return
    # ======================================================

    path('vendor/return/getlist', vendor.vendor_return_getlist, name='vendor-return-getlist'),
    path('vendor/return/review', vendor.vendor_return_review, name='vendor-return-review'),
    path('vendor/return/confirmReceived', vendor.vendor_return_confirm_received, name='vendor-return-confirm-received'),
    path('vendor/return/processRefund', vendor.vendor_return_process_refund, name='vendor-return-process-refund'),
    path('vendor/return/raiseDispute', vendor.vendor_return_raise_dispute, name='vendor-return-raise-dispute'),

    # ======================================================
    # Vendor Coupon
    # ======================================================

    path('vendor/coupon/getUsageList', vendor.vendor_coupon_get_usage_list, name='vendor-coupon-get-usage-list'),
    path('vendor/coupon/updateStatus', vendor.vendor_coupon_update_status, name='vendor-coupon-update-status'),

    # ======================================================
    # Vendor 商品款
    # ShareBuy → Vendor
    # ======================================================

    path('vendor/receivable/overview', vendor.get_vendor_receivable_overview, name='vendor-receivable-overview'),
    path('vendor/receivable/list', vendor.get_vendor_receivables, name='vendor-receivable-list'),

    # ======================================================
    # Vendor 15% 平台服務費
    # Vendor → ShareBuy
    # ======================================================

    path('vendor/settlement/overview', vendor.get_vendor_finance_overview, name='vendor-settlement-overview'),
    path('vendor/settlement/list', vendor.get_vendor_finance_transactions, name='vendor-settlement-list'),
    path('vendor/settlement/payment/report', vendor.vendor_report_settlement_payment, name='vendor-settlement-payment-report'),

    # 舊版 Finance API 暫時保留
    path('vendor/finance/getOverview', vendor.get_vendor_finance_overview, name='vendor-finance-get-overview-legacy'),
    path('vendor/finance/getTransactions', vendor.get_vendor_finance_transactions, name='vendor-finance-get-transactions-legacy'),
    path('vendor/finance/requestPayout', vendor.vendor_request_payout, name='vendor-finance-request-payout-legacy'),

    # ======================================================
    # Vendor Chat
    # ======================================================

    path('vendor/chatroom/create', vendor.vendor_chatroom_create, name='vendor_chatroom_create'),
    path('vendor/chatroom/getlist', vendor.vendor_chatroom_getlist, name='vendor_chatroom_getlist'),
    path('vendor/chatroom/getMessages', vendor.vendor_chatroom_get_messages, name='vendor_chatroom_get_messages'),
    path('vendor/chatroom/sendMessage', vendor.vendor_chatroom_send_message, name='vendor_chatroom_send_message'),
    path('vendor/chatroom/markRead', vendor.vendor_chatroom_mark_read, name='vendor_chatroom_mark_read'),

    # ======================================================
    # Vendor Analytics
    # ======================================================

    path('vendor/analytics/overview', vendor.vendor_analytics_overview, name='vendor-analytics-overview'),
    path('vendor/analytics/productPerformance', vendor.vendor_product_performance, name='vendor-product-performance'),
    path('vendor/analytics/funnel', vendor.vendor_analytics_funnel, name='vendor-analytics-funnel'),

    # ======================================================
    # Vendor Support
    # ======================================================

    path('vendor/support/getOrCreateRoom', support.vendor_support_get_or_create_room, name='vendor-support-get-or-create-room'),
    path('vendor/support/getMessages', support.vendor_support_get_messages, name='vendor-support-get-messages'),
    path('vendor/support/sendMessage', support.vendor_support_send_message, name='vendor-support-send-message'),
    path('vendor/support/unreadCount', support.vendor_support_unread_count, name='vendor-support-unread-count'),

    # ======================================================
    # User Support
    # ======================================================

    path('user/support/getOrCreateRoom', support.user_support_get_or_create_room, name='user-support-get-or-create-room'),
    path('user/support/getMessages', support.user_support_get_messages, name='user-support-get-messages'),
    path('user/support/sendMessage', support.user_support_send_message, name='user-support-send-message'),
    path('user/support/unreadCount', support.user_support_unread_count, name='user-support-unread-count'),

    # ======================================================
    # Platform Support
    # ======================================================

    path('platform/support/getRooms', support.admin_support_get_rooms, name='admin-support-get-rooms'),
    path('platform/support/getMessages', support.admin_support_get_messages, name='admin-support-get-messages'),
    path('platform/support/sendMessage', support.admin_support_send_message, name='admin-support-send-message'),
    path('platform/support/markRead', support.admin_support_mark_read, name='admin-support-mark-read'),

    # ======================================================
    # Notifications
    # ======================================================

    path('notifications/list', notification_views.list_notifications, name='notifications-list'),
    path('notifications/markRead', notification_views.mark_notification_read, name='notifications-mark-read'),

    # ======================================================
    # Order Chat
    # ======================================================

    path('user/orderChat/getMessages', order_chat.user_order_chat_get_messages, name='user-order-chat-get-messages'),
    path('user/orderChat/sendMessage', order_chat.user_order_chat_send_message, name='user-order-chat-send-message'),
    path('vendor/orderChat/getMessages', order_chat.vendor_order_chat_get_messages, name='vendor-order-chat-get-messages'),
    path('vendor/orderChat/sendMessage', order_chat.vendor_order_chat_send_message, name='vendor-order-chat-send-message'),

    # ======================================================
    # Platform Vendor / Overview
    # ======================================================

    path('platform/vendors', admin_vendor_list, name='admin-vendor-list'),
    path('platform/vendor/detail', admin_vendor_detail, name='admin-vendor-detail'),
    path('platform/vendor/audit', admin_vendor_audit, name='admin-vendor-audit'),
    path('platform/vendor/review', admin_vendor_review, name='admin-vendor-review'),
    path('platform/overview', admin_overview, name='admin-overview'),
    path('platform/coupons', admin_coupon_usage, name='admin-coupon-usage'),
    path('platform/performance', admin_performance, name='admin-performance'),

    # ======================================================
    # Shipping
    # ======================================================

    path('shipping/ecpay/map/', shipping.ecpay_store_map, name='ecpay_store_map'),
    path('shipping/ecpay/map/callback/', shipping.ecpay_store_map_callback, name='ecpay_store_map_callback'),
    path('shipping/ecpay/status/callback/', shipping.ecpay_logistics_status_callback),
    path('vendor/order/createLogistics', vendor.vendor_order_create_logistics),
    path('vendor/order/queryLogistics', vendor.vendor_order_query_logistics),
]
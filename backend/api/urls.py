from django.urls import path
from . import views

# 之後在這裡加 API 路由
# 例如：
# from . import views
# from rest_framework.routers import DefaultRouter
# router = DefaultRouter()
# router.register(r"products", views.ProductViewSet)
# urlpatterns = router.urls

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

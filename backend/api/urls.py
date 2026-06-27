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
]

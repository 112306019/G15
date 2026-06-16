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
    # 對齊你們規格書要求的路徑
    path('koc/profile/updateProfile', views.update_koc_profile, name='update-koc-profile'),
    path('koc/application/getAvailableList', views.get_available_campaign_list, name='get_available_campaign_list'),
]
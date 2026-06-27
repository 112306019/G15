from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import AllowAny   # 引入「允許任何人」
from rest_framework import status as http_status
from ..serializers import MissionSubmitSerializer, UpdateKOCProfileSerializer
from api.models import User, Order, OrderItem, Campaigns, CampaignProduct, Product, Application, KOC, KOCMissionNew, Submissions, CouponNew
from .constants import (
    APPLICATION_STATUS_REVERSE_MAP,
    APPLICATION_STATUS_CODE_MAP,
    STAGE_CODE_MAP,
    COUPON_STATUS_CODE_MAP,
)


# submission_type 對外(API文件: 0/1) <-> 對內(資料庫: 有意義字串)
SUBMISSION_TYPE_MAP = {
    '0': 'text',   # 文案
    '1': 'link',   # 作品連結
}

# status 對內(資料庫字串) <-> 對外(API文件: integer)
STATUS_CODE_MAP = {
    'pending': 0,    # 審核中
    'revising': 1,   # 修改中
    'approved': 2,   # 審核通過
}


# 修改KOC資料 
@api_view(['POST'])
@permission_classes([AllowAny])
def update_koc_profile(request):
    serializer = UpdateKOCProfileSerializer(data=request.data)
    if not serializer.is_valid():
        return Response({
            "success": False,
            "err": "; ".join(str(e) for e in serializer.errors.values())
        }, status=http_status.HTTP_400_BAD_REQUEST)

    data = serializer.validated_data

    try:
        user = User.objects.get(pk=data['user_id'])
    except User.DoesNotExist:
        return Response({
            "success": False,
            "err": "找不到對應的使用者"
        }, status=http_status.HTTP_404_NOT_FOUND)

    try:
        koc = user.koc_profile  # User model 裡 OneToOneField 的 related_name
    except KOC.DoesNotExist:
        return Response({
            "success": False,
            "err": "此使用者沒有對應的 KOC 資料"
        }, status=http_status.HTTP_404_NOT_FOUND)

    # 更新 User 表欄位
    user.name = data['user_name']
    user.phone = data['phone']
    user.email = data['email']
    user.save()

    # 更新 KOC 表欄位
    koc.bank_account = data['bank_account']
    koc.bank_number = data['bank_number']
    koc.address = data['address']
    koc.save()

    return Response({
        "success": True,
        "err": "",
        "user_id": user.user_id
    }, status=http_status.HTTP_200_OK)

# 獲取可申請代言列表    
@api_view(['GET'])
@permission_classes([AllowAny])
def get_available_campaign_list(request):
    # 1. 從網址後面取得 User_id (例如: ?User_id=test_koc_001)
    user_id = request.query_params.get('user_id')
    
    if not user_id:
        return Response({
            "success": False,
            "err": "缺少必要參數: user_id",
            "campaigns": []
        }, status=400)
        
    try:
        # 2. 直接去查 Order_Item (訂單明細)
        order_items = OrderItem.objects.filter(order__user_id=user_id)
        campaigns_data = []
        
        # 3. 跑迴圈，處理使用者購買的每個品項
        for item in order_items:
            # 💡 修改重點：透過中間表 campaign_product 查詢該商品對應的活動
            # 使用 select_related('campaign') 可以順便把活動內容撈出來，不用再查一次
            campaign_products = CampaignProduct.objects.filter(
                product_id=item.product_id
            ).select_related('campaign')
            
            # 因為一個商品可能會對應到多個代言活動（多對多關係）
            # 所以跑迴圈把該商品所有對應的活動都塞進去
            for cp in campaign_products:
                campaign = cp.campaign  # 取得關聯的 Campaigns 物件
                
                if campaign:
                    campaigns_data.append({
                        "order_id": str(item.order_id),              # 來自 Order_Item 的 Order_id
                        "campaign_id": str(campaign.campaign_id),    # 來自 Campaigns 的 Campaign_id
                        "campaign_name": str(campaign.name),         # 來自 Campaigns 的 Name
                        
                        # 代言申請狀態：先預設給 0 (尚未申請)
                        "apply_status": getattr(item, 'apply_status', 0) 
                    })
                
        # 4. 回傳符合規格書的 JSON 格式
        return Response({
            "success": True,
            "err": "",
            "campaigns": campaigns_data
        })
        
    except Exception as e:
        return Response({
            "success": False,
            "err": f"伺服器發生錯誤: {str(e)}",
            "campaigns": []
        }, status=500)
    
# 代言申請 
# api/views/koc.py
@api_view(['POST'])
@permission_classes([AllowAny])
def apply_mission(request):
    koc_id = request.data.get('koc_id')
    order_id = request.data.get('order_id')
    campaign_id = request.data.get('campaign_id')
    
    if not all([koc_id, order_id, campaign_id]):
        return Response({
            "success": False,
            "err": "缺少必要參數: koc_id, order_id 或 campaign_id",
            "application_id": "",
            "status": "pending" 
        }, status=400)
        
    try:
        koc_profile = KOC.objects.filter(koc_id=koc_id).first()
        if not koc_profile:
            return Response({
                "success": False,
                "err": "找不到該 KOC 帳號，請確認是否已轉換身份",
                "application_id": "",
                "status": "pending"
            }, status=400)
            
        order_items = OrderItem.objects.filter(order_id=order_id)
        if not order_items.exists():
            return Response({
                "success": False,
                "err": "找不到該筆訂單明細",
                "application_id": "",
                "status": "pending"
            }, status=400)
            
        purchased_products = [item.product for item in order_items]
        
        is_valid_campaign = CampaignProduct.objects.filter(
            campaign_id=campaign_id,
            product__in=purchased_products
        ).exists()
        
        if not is_valid_campaign:
            return Response({
                "success": False,
                "err": "該訂單商品並未參與此代言活動，無法申請",
                "application_id": "",
                "status": "pending"
            }, status=400)
            
        # 確保 filter 後面都加上 _id 精準比對外鍵值
        existing_app = Application.objects.filter(
            koc_id=koc_id,
            order_id=order_id,
            campaign_id=campaign_id
        ).first()
        
        if existing_app:
            return Response({
                "success": True,
                "err": "此訂單已申請過該活動",
                "application_id": str(existing_app.application_id),
                "status": str(existing_app.status)  
            })
            
        # 確保 create 後面也加上 _id
        new_application = Application.objects.create(
            koc_id=koc_id,          
            order_id=order_id,      
            campaign_id=campaign_id,
            status="pending"             
        )
        
        return Response({
            "success": True,
            "err": "",
            "application_id": str(new_application.application_id),
            "status": "pending"           
        })
        
    except Exception as e:
        return Response({
            "success": False,
            "err": f"伺服器發生錯誤: {str(e)}",
            "application_id": "",
            "status": "pending"
        }, status=500)
    
#繳交、修改文案/作品
@api_view(['POST'])
@permission_classes([AllowAny])
def mission_submit(request):
    serializer = MissionSubmitSerializer(data=request.data)
    if not serializer.is_valid():
        return Response({
            "success": False,
            "err": "; ".join(str(e) for e in serializer.errors.values())
        }, status=http_status.HTTP_400_BAD_REQUEST)

    data = serializer.validated_data

    try:
        mission = KOCMissionNew.objects.get(pk=data['KOCMission_id'])
    except KOCMissionNew.DoesNotExist:
        return Response({
            "success": False,
            "err": "找不到對應的 KOC 任務"
        }, status=http_status.HTTP_404_NOT_FOUND)

    # 防止重複提交：審核中或已通過時不可再次提交
    existing = Submissions.objects.filter(
        kocmission=mission,
        status__in=['pending', 'approved']
    ).exists()
    if existing:
        return Response({
            "success": False,
            "err": "請勿重複提交"
        }, status=http_status.HTTP_400_BAD_REQUEST)

    submission = Submissions.objects.create(
        kocmission=mission,
        submission_type=SUBMISSION_TYPE_MAP[data['submission_type']],
        text_content=data.get('text_content'),
        content_url=data.get('content_url'),
        status='pending',
        submitted_time=timezone.now(),
    )

    return Response({
        "success": True,
        "err": "",
        "submission_id": str(submission.submission_id),
        "status": STATUS_CODE_MAP[submission.status]
    }, status=http_status.HTTP_200_OK)



# TODO: 目前系統尚未接上登入驗證機制，以下 GET API 暫時不檢查請求者身份是否與資料歸屬一致。
# 等登入/Token 機制完成後，需要補上「只能查自己任務」的權限檢查。
#顯示審核狀態
@api_view(['GET'])
@permission_classes([AllowAny])
def get_application_list(request):
    user_id = request.query_params.get('User_id')
    status_param = request.query_params.get('status', '0')

    if not user_id:
        return Response({
            "success": False,
            "err": "User_id 為必填"
        }, status=http_status.HTTP_400_BAD_REQUEST)

    try:
        koc = KOC.objects.get(user_id=user_id)
    except KOC.DoesNotExist:
        return Response({
            "success": False,
            "err": "找不到對應的 KOC"
        }, status=http_status.HTTP_404_NOT_FOUND)

    try:
        db_status = APPLICATION_STATUS_REVERSE_MAP[int(status_param)]
    except (ValueError, KeyError):
        return Response({
            "success": False,
            "err": "status 參數不正確"
        }, status=http_status.HTTP_400_BAD_REQUEST)

    applications = Application.objects.filter(koc=koc, status=db_status).select_related('campaign')

    result = []
    for app in applications:
        # 取得活動關聯的第一個商品圖片
        campaign_product = CampaignProduct.objects.filter(campaign=app.campaign).select_related('product').first()
        campaign_image = campaign_product.product.image_url if campaign_product else None

        coupon = CouponNew.objects.filter(kocmission__application=app).order_by('-coupon_id').first()
        coupon_status = COUPON_STATUS_CODE_MAP[coupon.status] if coupon else None

        result.append({
            "application_id": str(app.application_id),
            "campaign_name": app.campaign.name,
            "campaign_image": campaign_image,
            "status": APPLICATION_STATUS_CODE_MAP[app.status],
            "promotion_code": coupon.promotion_code if coupon else None,
            "coupon_status": coupon_status,
        })

    return Response({
        "success": True,
        "err": "",
        "application": result
    }, status=http_status.HTTP_200_OK)

#獲取任務狀態
@api_view(['GET'])
@permission_classes([AllowAny])
def mission_get_detail(request):
    mission_id = request.query_params.get('KOCMission_id')

    if not mission_id:
        return Response({
            "success": False,
            "err": "KOCMission_id 為必填"
        }, status=http_status.HTTP_400_BAD_REQUEST)

    try:
        mission = KOCMissionNew.objects.select_related('application__campaign').get(pk=mission_id)
    except KOCMissionNew.DoesNotExist:
        return Response({
            "success": False,
            "err": "找不到對應的任務"
        }, status=http_status.HTTP_404_NOT_FOUND)

    latest_submission = Submissions.objects.filter(kocmission=mission).order_by('-submitted_time').first()

    return Response({
        "success": True,
        "err": "",
        "KOCMission_id": str(mission.kocmission_id),
        "campaign_name": mission.application.campaign.name,
        "campaign_description": mission.application.campaign.description,
        "stage": STAGE_CODE_MAP[mission.stage],
        "text_content": latest_submission.text_content if latest_submission else None,
        "file_url": latest_submission.content_url if latest_submission else None,
        "vendor_feedback": latest_submission.vendor_feedback if latest_submission else None,
    }, status=http_status.HTTP_200_OK)
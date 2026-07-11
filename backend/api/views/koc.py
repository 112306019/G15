from django.utils import timezone
from django.db.models import Count, Sum
from django.db.models.functions import TruncDate, TruncWeek, TruncMonth
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import AllowAny   # 引入「允許任何人」
from rest_framework import status as http_status
from ..serializers import (
    MissionSubmitSerializer,
    UpdateKOCProfileSerializer,
    MissionDetailSerializer,
    ApplicationListItemSerializer,
    MissionListItemSerializer,
    MissionStageCountsSerializer,
    RevenueTotalSerializer,
    RevenueHistoryItemSerializer,
    PendingEarningsItemSerializer,
    AnalyticsListItemSerializer,
    AnalyticsDetailSerializer,
    SaveDraftSerializer,  
    KOCApplySerializer,
)
from api.models import User, Order, OrderItem, Campaigns, CampaignProduct, Product, Application, KOC, KOCMissionNew, Submissions, CouponNew, KocWallet, Earnings
from .constants import (
    APPLICATION_STATUS_REVERSE_MAP,
    APPLICATION_STATUS_CODE_MAP,
    STAGE_CODE_MAP,
    COUPON_STATUS_CODE_MAP,
    SUBMISSION_TYPE_MAP,
    SUBMISSION_STATUS_CODE_MAP,
    STAGE_ALLOWED_SUBMISSION_TYPE,
    EARNINGS_STATUS_CHOICES_MAP,
    EARNINGS_STATUS_CODE_MAP
)
# 獲取koc個人資料
@api_view(['GET'])
@permission_classes([AllowAny])
def get_koc_profile(request):
    user_id = request.query_params.get('user_id')

    if not user_id:
        return Response({
            "success": False,
            "err": "user_id 為必填"
        }, status=http_status.HTTP_400_BAD_REQUEST)

    try:
        user = User.objects.get(pk=user_id)
    except User.DoesNotExist:
        return Response({
            "success": False,
            "err": "找不到對應的使用者"
        }, status=http_status.HTTP_404_NOT_FOUND)

    try:
        koc = user.koc_profile
    except KOC.DoesNotExist:
        return Response({
            "success": False,
            "err": "此使用者尚未成為 KOC"
        }, status=http_status.HTTP_404_NOT_FOUND)

    return Response({
        "success": True,
        "err": "",
        "display_name": user.display_name,
        "real_name": user.name,
        "phone": user.phone,
        "email": user.email,
        "address": koc.address,
        "bank_account": koc.bank_account,
        "bank_number": koc.bank_number,
        "ig_account": koc.ig_account,
        "fb_account": koc.fb_account,
        "threads_account": koc.threads_account,
    }, status=http_status.HTTP_200_OK)

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
    # 更新 User 表欄位
    if data.get('user_name'):
        user.name = data['user_name']
    if data.get('display_name') is not None:
        user.display_name = data['display_name']
    if data.get('phone'):
        user.phone = data['phone']
    if data.get('email'):
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
    user_id = request.query_params.get('user_id')
    
    if not user_id:
        return Response({
            "success": False,
            "err": "缺少必要參數: user_id",
            "campaigns": []
        }, status=400)
        
    try:
        # 找到這個 user 對應的 KOC
        koc = KOC.objects.filter(user__user_id=user_id).first()

        # 找出這個 KOC 已經申請過的 campaign_id 列表
        applied_campaign_ids = set()
        if koc:
            applied_campaign_ids = set(
                Application.objects.filter(koc=koc)
                .values_list('campaign_id', flat=True)
            )

        # 只撈「已完成」的訂單
        completed_orders = OrderItem.objects.filter(
            order__user_id=user_id,
            order__order_status='completed'  # 只取已完成的訂單
        ).select_related('order', 'product')

        campaigns_data = []
        seen_campaign_ids = set()  # 避免同一個活動重複出現

        for item in completed_orders:
            campaign_products = CampaignProduct.objects.filter(
                product_id=item.product_id
            ).select_related('campaign')

            for cp in campaign_products:
                campaign = cp.campaign

                if not campaign:
                    continue

                campaign_id_str = str(campaign.campaign_id)

                # 排除已申請過的活動
                if campaign.campaign_id in applied_campaign_ids:
                    continue

                # 排除重複出現的活動
                if campaign_id_str in seen_campaign_ids:
                    continue

                seen_campaign_ids.add(campaign_id_str)

                campaigns_data.append({
                    "order_id": str(item.order_id),
                    "campaign_id": campaign_id_str,
                    "campaign_name": campaign.name,
                    "apply_status": 0
                })

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

# 顯示已申請代言
@api_view(['GET'])
@permission_classes([AllowAny])
def get_applied_campaign_list(request):
    user_id = request.query_params.get('user_id')

    if not user_id:
        return Response({
            "success": False,
            "err": "缺少必要參數: user_id",
            "campaigns": []
        }, status=400)

    try:
        koc = KOC.objects.filter(user__user_id=user_id).first()
        if not koc:
            return Response({
                "success": False,
                "err": "找不到對應的 KOC",
                "campaigns": []
            }, status=404)

        applications = Application.objects.filter(
            koc=koc
        ).select_related('campaign')

        campaigns_data = []
        for app in applications:
            campaign_product = CampaignProduct.objects.filter(
                campaign=app.campaign
            ).select_related('product').first()
            campaign_image = campaign_product.product.image_url if campaign_product else None

            campaigns_data.append({
                "application_id": str(app.application_id),
                "campaign_id": str(app.campaign.campaign_id),
                "campaign_name": app.campaign.name,
                "campaign_image": campaign_image,
            })

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

    submission_type_db = SUBMISSION_TYPE_MAP[data['submission_type']]

    # 驗證目前 stage 是否允許這種提交類型
    allowed_type = STAGE_ALLOWED_SUBMISSION_TYPE.get(mission.stage)
    if allowed_type is None:
        return Response({
            "success": False,
            "err": "目前任務階段不允許提交"
        }, status=http_status.HTTP_400_BAD_REQUEST)
    if submission_type_db != allowed_type:
        return Response({
            "success": False,
            "err": "提交類型與目前任務階段不符"
        }, status=http_status.HTTP_400_BAD_REQUEST)

    # 防止重複提交：審核中或已通過時不可再次提交
    existing = Submissions.objects.filter(
        kocmission=mission,
        submission_type=submission_type_db,
        status__in=['pending', 'approved']
    ).exists()
    if existing:
        return Response({
            "success": False,
            "err": "請勿重複提交"
        }, status=http_status.HTTP_400_BAD_REQUEST)

    submission = Submissions.objects.create(
        kocmission=mission,
        submission_type=submission_type_db,
        text_content=data.get('text_content'),
        content_url=data.get('content_url'),
        status='pending',
        submitted_time=timezone.now(),
    )

    # 依提交類型，推進任務 stage
    if submission_type_db == 'text':
        # 文案提交後，立刻從 writing 推進到 reviewing
        mission.stage = 'reviewing'
        mission.save()
    elif submission_type_db == 'link':
        # 連結提交後，優惠碼立刻啟用(解法一：不等廠商審核)
        try:
            coupon = CouponNew.objects.get(kocmission=mission)
            if coupon.status == 'inactive':
                coupon.status = 'active'
                coupon.save()
        except CouponNew.DoesNotExist:
            # 這個任務沒有對應的優惠碼，跳過(不報錯，繼續正常回傳)
            pass
        # stage 維持 publishing，等 Campaigns.end_date 到期後由排程結案

    return Response({
        "success": True,
        "err": "",
        "submission_id": str(submission.submission_id),
        "status": SUBMISSION_STATUS_CODE_MAP[submission.status]
    }, status=http_status.HTTP_200_OK)

# 儲存草稿
@api_view(['POST'])
@permission_classes([AllowAny])
def save_draft(request):
    serializer = SaveDraftSerializer(data=request.data)
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

    submission_type_db = SUBMISSION_TYPE_MAP[data['submission_type']]

    # 驗證目前 stage 是否允許這種提交類型(跟 mission_submit 一樣的檢查)
    allowed_type = STAGE_ALLOWED_SUBMISSION_TYPE.get(mission.stage)
    if allowed_type is None:
        return Response({
            "success": False,
            "err": "目前任務階段不允許儲存草稿"
        }, status=http_status.HTTP_400_BAD_REQUEST)
    if submission_type_db != allowed_type:
        return Response({
            "success": False,
            "err": "提交類型與目前任務階段不符"
        }, status=http_status.HTTP_400_BAD_REQUEST)

    # 如果已經有草稿，直接更新；沒有就新建一筆
    # 注意：這裡只針對 draft 狀態，不會動到 pending/approved 的資料
    draft = Submissions.objects.filter(
        kocmission=mission,
        submission_type=submission_type_db,
        status='draft'
    ).first()

    if draft:
        # 更新既有草稿
        draft.text_content = data.get('text_content')
        draft.content_url = data.get('content_url')
        draft.save()
    else:
        # 新建草稿
        draft = Submissions.objects.create(
            kocmission=mission,
            submission_type=submission_type_db,
            text_content=data.get('text_content'),
            content_url=data.get('content_url'),
            status='draft',
        )

    return Response({
        "success": True,
        "err": "",
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

#獲取任務不同階段內容
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

    #latest_submission = Submissions.objects.filter(kocmission=mission).order_by('-submitted_time').first()
    latest_submission = Submissions.objects.filter(
        kocmission=mission,
        status__in=['pending', 'revising', 'approved']
    ).order_by('-submission_id').first()

    # 另外查草稿(只查 text 類型的草稿，因為文字框只對應文案草稿)
    draft = Submissions.objects.filter(
        kocmission=mission,
        submission_type='text',
        status='draft'
    ).first()

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
        "draft_content": draft.text_content if draft else None,  # 新增這個
    }, status=http_status.HTTP_200_OK)

#獲取任務完整狀態
@api_view(['GET'])
@permission_classes([AllowAny])
def get_mission_list(request):
    user_id = request.query_params.get('User_id')
    stage_param = request.query_params.get('stage')

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

    missions = KOCMissionNew.objects.filter(koc=koc).select_related('application__campaign')

    # stage 是可選參數：如果有帶，篩出特定階段；沒帶就回全部階段（給前端自己分組用）
    if stage_param is not None:
        stage_reverse_map = {v: k for k, v in STAGE_CODE_MAP.items()}
        try:
            db_stage = stage_reverse_map[int(stage_param)]
        except (ValueError, KeyError):
            return Response({
                "success": False,
                "err": "stage 參數不正確"
            }, status=http_status.HTTP_400_BAD_REQUEST)
        missions = missions.filter(stage=db_stage)

    result = []
    for mission in missions:
        campaign = mission.application.campaign
        campaign_product = CampaignProduct.objects.filter(campaign=campaign).select_related('product').first()
        campaign_image = campaign_product.product.image_url if campaign_product else None

        result.append({
            "KOCMission_id": str(mission.kocmission_id),
            "campaign_name": campaign.name,
            "campaign_image": campaign_image,
            "stage": STAGE_CODE_MAP[mission.stage],
        })

    return Response({
        "success": True,
        "err": "",
        "missions": result
    }, status=http_status.HTTP_200_OK)

#計算任務次數
@api_view(['GET'])
@permission_classes([AllowAny])
def get_mission_stage_counts(request):
    user_id = request.query_params.get('User_id')

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

    # 1. 查 Application，依 status 分組計算數量
    application_counts_qs = (
        Application.objects
        .filter(koc=koc)
        .values('status')
        .annotate(count=Count('application_id'))
    )
    application_result = {status_key: 0 for status_key in APPLICATION_STATUS_CODE_MAP.keys()}
    for row in application_counts_qs:
        application_result[row['status']] = row['count']

    # 2. 查 KOCMissionNew，依 stage 分組計算數量
    mission_counts_qs = (
        KOCMissionNew.objects
        .filter(koc=koc)
        .values('stage')
        .annotate(count=Count('kocmission_id'))
    )
    mission_result = {stage_key: 0 for stage_key in STAGE_CODE_MAP.keys()}
    for row in mission_counts_qs:
        mission_result[row['stage']] = row['count']

    # 「資格審核」徽章 = 審核中 + 已退件但尚未被使用者移除的申請
    qualification_count = application_result['pending'] + application_result['rejected']

    return Response({
        "success": True,
        "err": "",
        "qualification": qualification_count,
        "writing": mission_result['writing'],
        "reviewing": mission_result['reviewing'],
        "publishing": mission_result['publishing'],
        "completed": mission_result['completed'],
    }, status=http_status.HTTP_200_OK)

# 刪除未通過申請紀錄
@api_view(['DELETE'])
@permission_classes([AllowAny])
def remove_application(request, application_id):
    user_id = request.query_params.get('user_id')

    if not user_id:
        return Response({
            "success": False,
            "err": "user_id 為必填"
        }, status=http_status.HTTP_400_BAD_REQUEST)

    try:
        koc = KOC.objects.get(user_id=user_id)
    except KOC.DoesNotExist:
        return Response({
            "success": False,
            "err": "找不到對應的 KOC"
        }, status=http_status.HTTP_404_NOT_FOUND)

    try:
        application = Application.objects.get(application_id=application_id, koc=koc)
    except Application.DoesNotExist:
        return Response({
            "success": False,
            "err": "找不到對應的申請紀錄"
        }, status=http_status.HTTP_404_NOT_FOUND)

    if application.status != 'rejected':
        return Response({
            "success": False,
            "err": "只能移除已退件的申請紀錄"
        }, status=http_status.HTTP_400_BAD_REQUEST)

    application.delete()

    return Response({
        "success": True,
        "err": ""
    }, status=http_status.HTTP_200_OK)

#獲取我的收益統計
@api_view(['GET'])
@permission_classes([AllowAny])
def get_revenue_total(request):
    user_id = request.query_params.get('user_id')

    if not user_id:
        return Response({
            "success": False,
            "err": "user_id 為必填"
        }, status=http_status.HTTP_400_BAD_REQUEST)

    try:
        koc = KOC.objects.get(user_id=user_id)
    except KOC.DoesNotExist:
        return Response({
            "success": False,
            "err": "找不到對應的 KOC"
        }, status=http_status.HTTP_404_NOT_FOUND)

    # 待提領金額：直接讀 KocWallet 的可用餘額
    try:
        wallet = koc.wallet  # KocWallet 的 related_name='wallet'
        withdrawable_amount = wallet.balance_available
    except KocWallet.DoesNotExist:
        withdrawable_amount = 0

    # 待定收益：統計 Earnings 表 status='pending' 的總和
    pending_total = Earnings.objects.filter(
        user=koc.user, status='pending'
    ).aggregate(total=Sum('amount'))['total']
    pending_amount = pending_total or 0

    # 是否已綁定銀行帳戶：檢查 KOC 的 bank_account 欄位是否有值
    has_bank_account = bool(koc.bank_account)

    return Response({
        "success": True,
        "err": "",
        "withdrawable_amount": withdrawable_amount,
        "pending_amount": pending_amount,
        "hasBankAccount": has_bank_account,
    }, status=http_status.HTTP_200_OK)

# 獲取收益明細
@api_view(['GET'])
@permission_classes([AllowAny])
def get_revenue_history(request):
    user_id = request.query_params.get('user_id')

    if not user_id:
        return Response({
            "success": False,
            "err": "user_id 為必填"
        }, status=http_status.HTTP_400_BAD_REQUEST)

    try:
        user = User.objects.get(pk=user_id)
    except User.DoesNotExist:
        return Response({
            "success": False,
            "err": "找不到對應的使用者"
        }, status=http_status.HTTP_404_NOT_FOUND)

    # 只撈 withdrawable 跟 transferred，不包含 pending
    earnings = Earnings.objects.filter(
        user=user,
        status__in=['withdrawable', 'transferred']
    ).select_related('kocmission__application__campaign').order_by('-earnings_id')

    result = []
    for earning in earnings:
        # date: 目前先回 null，等轉帳 API 做好後再補上實際匯款日期
        result.append({
            "date": None,
            "amount": earning.amount,
            "KOCMission_id": str(earning.kocmission.kocmission_id) if earning.kocmission else None,
            "campaign_name": earning.kocmission.application.campaign.name if earning.kocmission else None,
            "status": EARNINGS_STATUS_CODE_MAP[earning.status],
        })

    return Response({
        "success": True,
        "err": "",
        "history": result
    }, status=http_status.HTTP_200_OK)

# 獲取待定收益明細
@api_view(['GET'])
@permission_classes([AllowAny])
def get_pending_earnings_detail(request):
    user_id = request.query_params.get('user_id')

    if not user_id:
        return Response({
            "success": False,
            "err": "user_id 為必填"
        }, status=http_status.HTTP_400_BAD_REQUEST)

    try:
        user = User.objects.get(pk=user_id)
    except User.DoesNotExist:
        return Response({
            "success": False,
            "err": "找不到對應的使用者"
        }, status=http_status.HTTP_404_NOT_FOUND)

    earnings = Earnings.objects.filter(
        user=user,
        status='pending'
    ).select_related('kocmission__application__campaign').order_by('-created_at')

    result = []
    for earning in earnings:
        campaign_name = None
        if earning.kocmission:
            try:
                campaign_name = earning.kocmission.application.campaign.name
            except Exception:
                campaign_name = None

        result.append({
            "earnings_no": str(earning.earnings_id).zfill(8),
            "amount": earning.amount,
            "campaign_name": campaign_name,
            "date": earning.created_at.strftime('%Y-%m-%d') if earning.created_at else None,
        })

    return Response({
        "success": True,
        "err": "",
        "pending_earnings": result
    }, status=http_status.HTTP_200_OK)

# 獲取成效分析總表
@api_view(['GET'])
@permission_classes([AllowAny])
def get_analytics_list(request):
    user_id = request.query_params.get('user_id')

    if not user_id:
        return Response({
            "success": False,
            "err": "user_id 為必填"
        }, status=http_status.HTTP_400_BAD_REQUEST)

    try:
        koc = KOC.objects.get(user_id=user_id)
    except KOC.DoesNotExist:
        return Response({
            "success": False,
            "err": "找不到對應的 KOC"
        }, status=http_status.HTTP_404_NOT_FOUND)

    # 只撈有優惠碼的任務(代表已經進到 publishing 以後的階段)
    missions = KOCMissionNew.objects.filter(
        koc=koc
    ).select_related('application__campaign')

    result = []
    for mission in missions:
        # 取得優惠碼(一個任務對應一個優惠碼)
        coupon = CouponNew.objects.filter(kocmission=mission).first()

        # 沒有優惠碼的任務不顯示在成效分析(還沒到 publishing 階段)
        if not coupon:
            continue

        # 取商品圖片
        campaign = mission.application.campaign
        campaign_product = CampaignProduct.objects.filter(
            campaign=campaign
        ).select_related('product').first()
        campaign_image = campaign_product.product.image_url if campaign_product else None

        result.append({
            "KOCMission_id": str(mission.kocmission_id),
            "campaign_image": campaign_image,
            "campaign_name": campaign.name,
            "usage_count": coupon.usage_count,
        })

    return Response({
        "success": True,
        "err": "",
        "analytics": result
    }, status=http_status.HTTP_200_OK)

# 獲取分析圖表
@api_view(['GET'])
@permission_classes([AllowAny])
def get_analytics_detail(request):
    mission_id = request.query_params.get('KOCMission_id')
    period = request.query_params.get('period')

    if not mission_id or not period:
        return Response({
            "success": False,
            "err": "KOCMission_id 與 period 為必填"
        }, status=http_status.HTTP_400_BAD_REQUEST)

    if period not in ['week', 'month']:
        return Response({
            "success": False,
            "err": "period 只能是 week 或 month"
        }, status=http_status.HTTP_400_BAD_REQUEST)

    try:
        mission = KOCMissionNew.objects.select_related(
            'application__campaign'
        ).get(pk=mission_id)
    except KOCMissionNew.DoesNotExist:
        return Response({
            "success": False,
            "err": "找不到對應的任務"
        }, status=http_status.HTTP_404_NOT_FOUND)

    # 取得這個任務的優惠碼
    coupon = CouponNew.objects.filter(kocmission=mission).first()
    if not coupon:
        return Response({
            "success": False,
            "err": "此任務尚未產生優惠碼"
        }, status=http_status.HTTP_404_NOT_FOUND)

    # 取得活動資訊
    campaign = mission.application.campaign
    campaign_product = CampaignProduct.objects.filter(
        campaign=campaign
    ).select_related('product').first()
    campaign_image = campaign_product.product.image_url if campaign_product else None

    # 依 period 決定分組方式
    if period == 'week':
        trunc_fn = TruncDate('created_at')  # 依日期分組(週視圖每天一個點)
        label_format = '%m/%d'
    else:
        trunc_fn = TruncDate('created_at')  # 依日期分組(月視圖每天一個點)
        label_format = '%m/%d'

    # 查詢使用這個優惠碼的訂單，依日期分組統計筆數
    from django.utils import timezone
    now = timezone.now()

    if period == 'week':
        # 最近 7 天
        start_date = now - timezone.timedelta(days=6)
    else:
        # 最近 30 天
        start_date = now - timezone.timedelta(days=29)

    orders_by_date = (
        Order.objects
        .filter(
            promotion_code=coupon.promotion_code,
            created_at__gte=start_date
        )
        .annotate(date=TruncDate('created_at'))
        .values('date')
        .annotate(count=Count('order_id'))
        .order_by('date')
    )

    # 把查詢結果轉成 dict 方便查找
    orders_dict = {
        row['date']: row['count']
        for row in orders_by_date
    }

    # 補齊每一天(沒有訂單的日期填 0)
    chart_data = []
    for i in range((now - start_date).days + 1):
        day = (start_date + timezone.timedelta(days=i)).date()
        chart_data.append({
            "x_label": day.strftime(label_format),
            "y_value": orders_dict.get(day, 0),
        })

    return Response({
        "success": True,
        "err": "",
        "campaign_image": campaign_image,
        "campaign_name": campaign.name,
        "usage_count": coupon.usage_count,
        "total_commision": coupon.total_commission,
        "chart_data": chart_data,
    }, status=http_status.HTTP_200_OK)


# 一般使用者申請成為koc
@api_view(['POST'])
@permission_classes([AllowAny])
def koc_apply(request):
    serializer = KOCApplySerializer(data=request.data)
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

    # 如果有填 name 或 email，直接更新 User 表
    user_updated = False
    if data.get('name'):
        user.display_name = data['name']
        user_updated = True
    if data.get('email'):
        # 檢查 email 是否被其他人用過
        if User.objects.filter(email=data['email']).exclude(pk=user.pk).exists():
            return Response({
                "success": False,
                "err": "此電子郵件已被使用"
            }, status=http_status.HTTP_400_BAD_REQUEST)
        user.email = data['email']
        user_updated = True
    if user_updated:
        user.save()

    existing_koc = KOC.objects.filter(user=user).first()

    if existing_koc:
        if existing_koc.approval_status in ['pending', 'approved']:
            status_display = '審核中' if existing_koc.approval_status == 'pending' else '已通過'
            return Response({
                "success": False,
                "err": f"您的申請目前狀態為「{status_display}」，無法重複申請"
            }, status=http_status.HTTP_400_BAD_REQUEST)

        elif existing_koc.approval_status == 'rejected':
            # 被拒絕過，允許重新申請
            existing_koc.fb_account = data.get('fb_account') or ''
            existing_koc.ig_account = data.get('ig_account') or ''
            existing_koc.threads_account = data.get('threads_account') or ''
            existing_koc.approval_status = 'pending'
            existing_koc.reject_reason = None
            existing_koc.save()

            return Response({
                "success": True,
                "err": "",
                "koc_id": existing_koc.koc_id,
                "message": "已重新提交申請，請等待審核"
            }, status=http_status.HTTP_200_OK)

    # 第一次申請
    koc = KOC.objects.create(
        user=user,
        fb_account=data.get('fb_account') or '',
        ig_account=data.get('ig_account') or '',
        threads_account=data.get('threads_account') or '',
        bank_number='',
        bank_account='',
        address=None,
        approval_status='pending',
    )

    return Response({
        "success": True,
        "err": "",
        "koc_id": koc.koc_id,
        "message": "申請已送出，請等待審核"
    }, status=http_status.HTTP_200_OK)
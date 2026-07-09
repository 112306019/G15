from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status as http_status

from ..models import KOC, Admins, User, AdminAuditLogs
from ..serializers import KOCApproveSerializer, KOCRejectSerializer
from .constants import ROLE_CODE_MAP

# 顯示待審核koc名單
@api_view(['GET'])
@permission_classes([AllowAny])
def koc_get_pending_list(request):
    # 查所有 approval_status='pending' 的 KOC
    pending_kocs = KOC.objects.filter(
        approval_status='pending'
    ).select_related('user').order_by('koc_id')

    result = []
    for koc in pending_kocs:
        result.append({
            "koc_id": koc.koc_id,
            "user_id": koc.user.user_id,
            "name": koc.user.name,
            "email": koc.user.email,
            "ig_account": koc.ig_account,
            "fb_account": koc.fb_account,
            "threads_account": koc.threads_account,
            "user_role": ROLE_CODE_MAP.get(koc.user.role, -1), 
            "applied_at": koc.user.created_at.strftime('%Y-%m-%d %H:%M') if koc.user.created_at else None,
        })

    return Response({
        "success": True,
        "err": "",
        "pending_list": result,
        "total": len(result)
    }, status=http_status.HTTP_200_OK)

# 同意koc申請
@api_view(['POST'])
@permission_classes([AllowAny])
def koc_approve(request):
    serializer = KOCApproveSerializer(data=request.data)
    if not serializer.is_valid():
        return Response({
            "success": False,
            "err": "; ".join(str(e) for e in serializer.errors.values())
        }, status=http_status.HTTP_400_BAD_REQUEST)

    data = serializer.validated_data

    try:
        admin = Admins.objects.get(pk=data['admin_id'])
    except Admins.DoesNotExist:
        return Response({
            "success": False,
            "err": "找不到對應的管理員"
        }, status=http_status.HTTP_404_NOT_FOUND)

    try:
        koc = KOC.objects.select_related('user').get(pk=data['koc_id'])
    except KOC.DoesNotExist:
        return Response({
            "success": False,
            "err": "找不到對應的 KOC 申請"
        }, status=http_status.HTTP_404_NOT_FOUND)

    if koc.approval_status != 'pending':
        return Response({
            "success": False,
            "err": f"此申請目前狀態為「{koc.get_approval_status_display()}」，無法審核"
        }, status=http_status.HTTP_400_BAD_REQUEST)

    # 更新 KOC 審核狀態
    koc.approval_status = 'approved'
    koc.reject_reason = None
    koc.save()

    # 同步更新 User.role
    user = koc.user
    user.role = 'koc'
    user.save()

    # 寫入 AdminAuditLogs
    AdminAuditLogs.objects.create(
        admin_id=admin,
        action_type='approve_koc',
        koc=koc,
        action_reason=None,
    )

    # TODO: 寄送審核通過通知(信件或簡訊)
    # send_approval_notification(user)

    return Response({
        "success": True,
        "err": "",
        "koc_id": koc.koc_id,
        "message": "審核已通過"
    }, status=http_status.HTTP_200_OK)

# 否決koc申請
@api_view(['POST'])
@permission_classes([AllowAny])
def koc_reject(request):
    serializer = KOCRejectSerializer(data=request.data)
    if not serializer.is_valid():
        return Response({
            "success": False,
            "err": "; ".join(str(e) for e in serializer.errors.values())
        }, status=http_status.HTTP_400_BAD_REQUEST)

    data = serializer.validated_data

    try:
        admin = Admins.objects.get(pk=data['admin_id'])
    except Admins.DoesNotExist:
        return Response({
            "success": False,
            "err": "找不到對應的管理員"
        }, status=http_status.HTTP_404_NOT_FOUND)

    try:
        koc = KOC.objects.select_related('user').get(pk=data['koc_id'])
    except KOC.DoesNotExist:
        return Response({
            "success": False,
            "err": "找不到對應的 KOC 申請"
        }, status=http_status.HTTP_404_NOT_FOUND)

    if koc.approval_status != 'pending':
        return Response({
            "success": False,
            "err": f"此申請目前狀態為「{koc.get_approval_status_display()}」，無法審核"
        }, status=http_status.HTTP_400_BAD_REQUEST)

    # 更新 KOC 審核狀態
    koc.approval_status = 'rejected'
    koc.reject_reason = data['reject_reason']
    koc.save()

    # 寫入 AdminAuditLogs
    AdminAuditLogs.objects.create(
        admin_id=admin,
        action_type='reject_koc',
        koc=koc,
        action_reason=data['reject_reason'],
    )

    # TODO: 寄送審核拒絕通知(信件或簡訊)，告知拒絕原因
    # send_rejection_notification(user, data['reject_reason'])

    return Response({
        "success": True,
        "err": "",
        "koc_id": koc.koc_id,
        "message": "已拒絕此申請"
    }, status=http_status.HTTP_200_OK)

# 顯示koc列表
@api_view(['GET'])
@permission_classes([AllowAny])
def koc_get_list(request):
    # 只列出審核通過的 KOC
    kocs = KOC.objects.filter(
        approval_status='approved'
    ).select_related('user').order_by('koc_id')

    result = []
    for koc in kocs:
        result.append({
            "koc_id": koc.koc_id,
            "name": koc.user.name,
            "ig_account": koc.ig_account,
            "fb_account": koc.fb_account,
            "threads_account": koc.threads_account,
            "status": 1 if koc.is_suspended else 0,  # 0:已啟用, 1:已停權
        })

    return Response({
        "success": True,
        "err": "",
        "koc_list": result,
        "total": len(result)
    }, status=http_status.HTTP_200_OK)

# 獲取koc任務詳情
@api_view(['GET'])
@permission_classes([AllowAny])
def koc_get_detail(request):
    koc_id = request.query_params.get('koc_id')
    user_id = request.query_params.get('User_id')
    application_id = request.query_params.get('Application_id')
    kocmission_id = request.query_params.get('KOCMisson_id')
    status_param = request.query_params.get('Status')

    # 至少要有一個參數
    if not any([koc_id, user_id, application_id, kocmission_id]):
        return Response({
            "success": False,
            "err": "請至少提供一個查詢參數"
        }, status=http_status.HTTP_400_BAD_REQUEST)

    # 先找到 KOC
    try:
        if koc_id:
            koc = KOC.objects.select_related('user').get(pk=koc_id)
        elif user_id:
            koc = KOC.objects.select_related('user').get(user_id=user_id)
        else:
            koc = None
    except KOC.DoesNotExist:
        return Response({
            "success": False,
            "err": "找不到對應的 KOC"
        }, status=http_status.HTTP_404_NOT_FOUND)

    # 查詢 Application
    applications = Application.objects.filter(
        koc=koc
    ).select_related('campaign__vendor') if koc else Application.objects.none()

    if application_id:
        applications = applications.filter(application_id=application_id)
    if status_param:
        applications = applications.filter(status=status_param)

    result = []
    for app in applications:
        campaign = app.campaign
        vendor = campaign.vendor

        # 取得商品
        campaign_product = CampaignProduct.objects.filter(
            campaign=campaign
        ).select_related('product').first()
        product_id = campaign_product.product.product_id if campaign_product else None

        # 取得對應的 KOCMission
        missions = KOCMissionNew.objects.filter(application=app)
        if kocmission_id:
            missions = missions.filter(kocmission_id=kocmission_id)

        for mission in missions:
            # 取得優惠碼
            coupon = CouponNew.objects.filter(kocmission=mission).first()

            result.append({
                # Application 層級
                "Application_id": str(app.application_id),
                "User_id": koc.user.user_id if koc else None,
                "Brand_id": str(vendor.vendor_id),
                "Mission_id": str(campaign.campaign_id),
                "Status": app.status,

                # KOCMission 層級
                "KOCMisson_id": str(mission.kocmission_id),
                "Product_id": str(product_id) if product_id else None,
                "Promotion_code": coupon.promotion_code if coupon else None,
                "Stage": STAGE_CODE_MAP.get(mission.stage),
                "Tasks_id": str(mission.kocmission_id),
                "Deadline": campaign.end_date.strftime('%Y-%m-%d %H:%M') if campaign.end_date else None,
            })

    return Response({
        "success": True,
        "err": "",
        "total": len(result),
        "data": result
    }, status=http_status.HTTP_200_OK)
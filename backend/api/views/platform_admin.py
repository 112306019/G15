from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status

from api.models import (
    User,
    Vendor,
    VendorWallet,
    Campaigns,
    Order,
    Payment,
    ServiceTickets,
    KOCMissionNew,
    CouponNew,
    CampaignParticipants,
    Admins,
    AdminAuditLogs,


)


# ==============================================================================
# Platform Admin - 平台總覽
# GET /platform_admin/overview
# ==============================================================================

@api_view(['GET'])
@permission_classes([AllowAny])
def admin_overview(request):
    user_count = User.objects.count()
    vendor_count = Vendor.objects.count()
    order_count = Order.objects.count()
    campaign_count = Campaigns.objects.count()
    payment_count = Payment.objects.count()
    ticket_count = ServiceTickets.objects.count()
    kocmission_count = KOCMissionNew.objects.count()

    return Response({
        "success": True,
        "overview": {
            "User_count": user_count,
            "Vendor_count": vendor_count,
            "Order_count": order_count,
            "Campaign_count": campaign_count,
            "KOCMission_count": kocmission_count,
            "Payment_count": payment_count,
            "Ticket_count": ticket_count,
        }
    }, status=status.HTTP_200_OK)



# ==============================================================================
# Platform Admin - 查看廠商列表
# GET /platform_admin/vendors
# ==============================================================================

@api_view(['GET'])
@permission_classes([AllowAny])
def admin_vendor_list(request):
    vendor_id = request.query_params.get('Vendor_id')
    company_name = request.query_params.get('Company_name')
    email = request.query_params.get('Email')

    vendors = Vendor.objects.all().order_by('-created_at')

    if vendor_id:
        vendors = vendors.filter(vendor_id=vendor_id)

    if company_name:
        vendors = vendors.filter(company_name__icontains=company_name)

    if email:
        vendors = vendors.filter(email__icontains=email)

    data = []

    for vendor in vendors:
        data.append({
            "Vendor_id": vendor.vendor_id,
            "Company_name": vendor.company_name,
            "Contact_name": vendor.contact_name,
            "Email": vendor.email,
            "Tax_ID": vendor.tax_id,
            "Status": vendor.status,
            "Created_at": vendor.created_at,
        })

    return Response({
        "success": True,
        "vendors": data
    }, status=status.HTTP_200_OK)


# ==============================================================================
# Platform Admin - 查看廠商詳細資料
# GET /platform_admin/vendor/detail?Vendor_id=1
# ==============================================================================

@api_view(['GET'])
@permission_classes([AllowAny])
def admin_vendor_detail(request):
    vendor_id = request.query_params.get('Vendor_id')

    if not vendor_id:
        return Response({
            "success": False,
            "err": "Vendor_id is required"
        }, status=status.HTTP_400_BAD_REQUEST)

    try:
        vendor = Vendor.objects.get(vendor_id=vendor_id)
    except Vendor.DoesNotExist:
        return Response({
            "success": False,
            "err": "Vendor not found"
        }, status=status.HTTP_404_NOT_FOUND)

    # 查廠商錢包
    wallet = None

    try:
        vendor_wallet = VendorWallet.objects.get(vendor=vendor)
        wallet = {
            "Wallet_id": vendor_wallet.id,
            "Vendor_id": vendor.vendor_id,
            "Balance_available": vendor_wallet.balance_available,
            "Balance_frozen": vendor_wallet.balance_frozen,
            "Updated_at": vendor_wallet.updated_at,
        }
    except VendorWallet.DoesNotExist:
        wallet = None

    # 查廠商活動
    # 注意：Campaigns.vendor_id 是 CharField，Vendor.vendor_id 是 AutoField
    campaigns = Campaigns.objects.filter(
        vendor_id=str(vendor.vendor_id)
    ).order_by('-start_date')

    campaign_data = []

    for campaign in campaigns:
        campaign_data.append({
            "Campaign_id": campaign.campaign_id,
            "Vendor_id": campaign.vendor_id,
            "Name": campaign.name,
            "Description": campaign.description,
            "Budget": campaign.budget,
            "Reward_type": campaign.reward_type,
            "Start_date": campaign.start_date,
            "End_date": campaign.end_date,
            "Status": campaign.status,
        })

    return Response({
        "success": True,
        "vendor": {
            "Vendor_id": vendor.vendor_id,
            "Company_name": vendor.company_name,
            "Contact_name": vendor.contact_name,
            "Email": vendor.email,
            "Tax_ID": vendor.tax_id,
            "Status": vendor.status,
            "Created_at": vendor.created_at,
        },
        "wallet": wallet,
        "campaigns": campaign_data
    }, status=status.HTTP_200_OK)


# ==============================================================================
# Platform Admin - 記錄廠商審核操作
# POST /platform_admin/vendor/audit
# ==============================================================================

@api_view(['POST'])
@permission_classes([AllowAny])
def admin_vendor_audit(request):
    admin_id = request.data.get('Admin_id')
    vendor_id = request.data.get('Vendor_id')
    action_type = request.data.get('Action_type')
    action_reason = request.data.get('Action_reason')

    if not admin_id:
        return Response({
            "success": False,
            "err": "Admin_id is required"
        }, status=status.HTTP_400_BAD_REQUEST)

    if not vendor_id:
        return Response({
            "success": False,
            "err": "Vendor_id is required"
        }, status=status.HTTP_400_BAD_REQUEST)

    if not action_type:
        return Response({
            "success": False,
            "err": "Action_type is required"
        }, status=status.HTTP_400_BAD_REQUEST)

    try:
        admin_obj = Admins.objects.get(admin_id=admin_id)
    except Admins.DoesNotExist:
        return Response({
            "success": False,
            "err": "Admin not found"
        }, status=status.HTTP_404_NOT_FOUND)

    try:
        vendor = Vendor.objects.get(vendor_id=vendor_id)
    except Vendor.DoesNotExist:
        return Response({
            "success": False,
            "err": "Vendor not found"
        }, status=status.HTTP_404_NOT_FOUND)

    audit_log = AdminAuditLogs.objects.create(
        admin_id=admin_obj,
        action_type=action_type,
        vendor_id=str(vendor.vendor_id),
        action_reason=action_reason
    )

    return Response({
        "success": True,
        "log": {
            "Log_id": audit_log.log_id,
            "Admin_id": audit_log.admin_id.admin_id,
            "Action_type": audit_log.action_type,
            "Submission_id": audit_log.submission_id,
            "Tasks_id": audit_log.tasks_id,
            "Influencer_id": audit_log.koc_id,
            "Vendor_id": audit_log.vendor_id,
            "Action_reason": audit_log.action_reason,
            "Created_at": audit_log.created_at,
        }
    }, status=status.HTTP_201_CREATED)


# ==============================================================================
# Platform Admin - 審核廠商申請
# PATCH /platform_admin/vendor/review
# ==============================================================================

@api_view(['PATCH'])
@permission_classes([AllowAny])
def admin_vendor_review(request):
    admin_id = request.data.get('Admin_id')
    vendor_id = request.data.get('Vendor_id')
    review_status = request.data.get('Status')
    action_reason = request.data.get('Action_reason')

    if not admin_id:
        return Response({
            "success": False,
            "err": "Admin_id is required"
        }, status=status.HTTP_400_BAD_REQUEST)

    if not vendor_id:
        return Response({
            "success": False,
            "err": "Vendor_id is required"
        }, status=status.HTTP_400_BAD_REQUEST)

    if not review_status:
        return Response({
            "success": False,
            "err": "Status is required"
        }, status=status.HTTP_400_BAD_REQUEST)

    allowed_status = ["pending", "approved", "rejected"]

    if review_status not in allowed_status:
        return Response({
            "success": False,
            "err": "Status must be pending, approved, or rejected"
        }, status=status.HTTP_400_BAD_REQUEST)

    try:
        admin_obj = Admins.objects.get(admin_id=admin_id)
    except Admins.DoesNotExist:
        return Response({
            "success": False,
            "err": "Admin not found"
        }, status=status.HTTP_404_NOT_FOUND)

    try:
        vendor = Vendor.objects.get(vendor_id=vendor_id)
    except Vendor.DoesNotExist:
        return Response({
            "success": False,
            "err": "Vendor not found"
        }, status=status.HTTP_404_NOT_FOUND)

    # 更新廠商審核狀態
    vendor.status = review_status
    vendor.save()

    # 自動新增管理員操作紀錄
    audit_log = AdminAuditLogs.objects.create(
        admin_id=admin_obj,
        action_type="review_vendor",
        vendor_id=str(vendor.vendor_id),
        action_reason=action_reason
    )

    return Response({
        "success": True,
        "vendor": {
            "Vendor_id": vendor.vendor_id,
            "Company_name": vendor.company_name,
            "Contact_name": vendor.contact_name,
            "Email": vendor.email,
            "Tax_ID": vendor.tax_id,
            "Status": vendor.status,
            "Created_at": vendor.created_at,
        },
        "audit_log": {
            "Log_id": audit_log.log_id,
            "Admin_id": audit_log.admin_id.admin_id,
            "Action_type": audit_log.action_type,
            "Vendor_id": audit_log.vendor_id,
            "Action_reason": audit_log.action_reason,
            "Created_at": audit_log.created_at,
        }
    }, status=status.HTTP_200_OK)


# ==============================================================================
# Platform Admin - 查看優惠碼使用狀況
# GET /platform_admin/coupons
# ==============================================================================

@api_view(['GET'])
@permission_classes([AllowAny])
def admin_coupon_usage(request):
    promotion_code = request.query_params.get('Promotion_code')
    campaign_id = request.query_params.get('Campaign_id')
    coupon_status = request.query_params.get('Status')

    coupons = CouponNew.objects.all()

    if promotion_code:
        coupons = coupons.filter(promotion_code__icontains=promotion_code)

    if coupon_status:
        coupons = coupons.filter(status=coupon_status)

    # CouponNew -> KOCMissionNew -> Application -> Campaigns
    if campaign_id:
        coupons = coupons.filter(kocmission__application__campaign_id=campaign_id)

    data = []

    for coupon in coupons:
        orders = Order.objects.filter(
            promotion_code=coupon.promotion_code
        ).order_by('-created_at')

        # 如果這個優惠碼有被訂單使用過，取最近一筆訂單當主要顯示
        latest_order = orders.first()

        campaign = None
        kocmission = coupon.kocmission

        if kocmission and kocmission.application:
            campaign = kocmission.application.campaign

        data.append({
            "Promotion_code": coupon.promotion_code,
            "Coupon_id": coupon.coupon_id,
            "Campaign_id": campaign.campaign_id if campaign else None,
            "Status": coupon.status,

            # 目前沒有 TrackingLog / ClickLog 表，所以先回傳 None
            "Tracking_id": None,
            "Click_id": None,

            # 訂單使用情況
            "Order_id": latest_order.order_id if latest_order else None,
            "User_id": latest_order.user_id if latest_order else None,
            "Created_at": latest_order.created_at if latest_order else None,

            # 額外補充統計
            "Usage_count": coupon.usage_count,
            "Actual_order_count": orders.count(),
            "Total_commission": coupon.total_commission,
        })

    return Response({
        "success": True,
        "coupons": data
    }, status=status.HTTP_200_OK)

# ==============================================================================
# Platform Admin - 查看成效追蹤資料
# GET /platform_admin/performance
# ==============================================================================

@api_view(['GET'])
@permission_classes([AllowAny])
def admin_performance(request):
    campaign_id = request.query_params.get('Campaign_id')
    promotion_code = request.query_params.get('Promotion_code')
    influencer_id = request.query_params.get('Influencer_id')

    coupons = CouponNew.objects.all()

    if promotion_code:
        coupons = coupons.filter(promotion_code__icontains=promotion_code)

    if campaign_id:
        coupons = coupons.filter(kocmission__application__campaign_id=campaign_id)

    if influencer_id:
        coupons = coupons.filter(kocmission__koc_id=influencer_id)

    data = []

    for coupon in coupons:
        kocmission = coupon.kocmission
        application = kocmission.application if kocmission else None
        campaign = application.campaign if application else None

        orders = Order.objects.filter(
            promotion_code=coupon.promotion_code
        ).order_by('-created_at')

        total_sales = 0
        for order in orders:
            total_sales += order.total_amount

        participant = None

        if campaign and kocmission and kocmission.koc_id:
            participant = CampaignParticipants.objects.filter(
                campaign=campaign,
                influencer_id=kocmission.koc_id
            ).first()

        # 如果有訂單，就一筆訂單一筆成效資料
        if orders.exists():
            for order in orders:
                data.append({
                    # 目前沒有 TrackingLog 表，所以先回傳 None
                    "Tracking_id": None,
                    "Click_id": None,

                    "Order_id": order.order_id,
                    "User_id": order.user_id,
                    "Promotion_code": coupon.promotion_code,
                    "Created_at": order.created_at,

                    # 分潤 / 成效
                    "Commission_id": None,
                    "Influencer_id": kocmission.koc_id if kocmission else None,
                    "Amount": coupon.total_commission,
                    "Status": coupon.status,

                    # 活動參與
                    "Participants_id": participant.participants_id if participant else None,
                    "Campaign_id": campaign.campaign_id if campaign else None,
                    "Assigned_coupon_id": participant.assigned_coupon_id if participant else None,

                    # 額外統計
                    "Order_total_amount": order.total_amount,
                    "Coupon_usage_count": coupon.usage_count,
                    "Total_sales": total_sales,
                    "Total_order_count": orders.count(),
                })

        # 如果沒有訂單，也回傳優惠碼本身的成效資料
        else:
            data.append({
                "Tracking_id": None,
                "Click_id": None,

                "Order_id": None,
                "User_id": None,
                "Promotion_code": coupon.promotion_code,
                "Created_at": None,

                "Commission_id": None,
                "Influencer_id": kocmission.koc_id if kocmission else None,
                "Amount": coupon.total_commission,
                "Status": coupon.status,

                "Participants_id": participant.participants_id if participant else None,
                "Campaign_id": campaign.campaign_id if campaign else None,
                "Assigned_coupon_id": participant.assigned_coupon_id if participant else None,

                "Order_total_amount": 0,
                "Coupon_usage_count": coupon.usage_count,
                "Total_sales": 0,
                "Total_order_count": 0,
            })

    return Response({
        "success": True,
        "performance": data
    }, status=status.HTTP_200_OK)
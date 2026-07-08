from django.contrib.auth.hashers import make_password, check_password
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status
from django.utils import timezone
from django.db.models import Sum, Count

from api.models import Vendor, Product, Campaigns, CampaignProduct, Application, KOCMissionNew, Submissions, Order, OrderItem, Payment, CouponNew
from api.vendor_serializers import (
    VendorRegisterSerializer,
    VendorLoginSerializer,
    VendorProfileUpdateSerializer,
    VendorProductCreateSerializer,
    VendorProductUpdateSerializer,
    VendorProductStatusSerializer,
    VendorCampaignCreateSerializer,
    VendorCampaignUpdateSerializer,
    VendorApplicationReviewSerializer,
    VendorSubmissionReviewSerializer,
)


@api_view(["POST"])
@permission_classes([AllowAny])
def vendor_register(request):
    """
    廠商註冊
    URL: /vendor/auth/register
    """
    serializer = VendorRegisterSerializer(data=request.data)

    if not serializer.is_valid():
        return Response({
            "success": False,
            "err": serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)

    email = serializer.validated_data.get("email")
    tax_id = serializer.validated_data.get("tax_id")

    if Vendor.objects.filter(email=email).exists():
        return Response({
            "success": False,
            "err": "Email already exists"
        }, status=status.HTTP_400_BAD_REQUEST)

    if Vendor.objects.filter(tax_id=tax_id).exists():
        return Response({
            "success": False,
            "err": "Tax ID already exists"
        }, status=status.HTTP_400_BAD_REQUEST)

    vendor = serializer.save(
        password=make_password(serializer.validated_data["password"])
    )

    return Response({
        "success": True,
        "err": "",
        "vendor_id": vendor.vendor_id
    }, status=status.HTTP_201_CREATED)


@api_view(["POST"])
@permission_classes([AllowAny])
def vendor_login(request):
    """
    廠商登入
    URL: /vendor/auth/login
    """
    serializer = VendorLoginSerializer(data=request.data)

    if not serializer.is_valid():
        return Response({
            "success": False,
            "err": serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)

    vendor_id = serializer.validated_data["vendor_id"]
    password = serializer.validated_data["password"]

    try:
        vendor = Vendor.objects.get(vendor_id=vendor_id)
    except Vendor.DoesNotExist:
        return Response({
            "success": False,
            "err": "Vendor not found"
        }, status=status.HTTP_404_NOT_FOUND)

    # 正式註冊的密碼會是 hash，所以用 check_password
    # 如果你資料庫裡原本有明文密碼，也暫時允許直接比對，方便測試
    password_correct = check_password(password, vendor.password) or password == vendor.password

    if not password_correct:
        return Response({
            "success": False,
            "err": "Invalid password"
        }, status=status.HTTP_400_BAD_REQUEST)

    return Response({
        "success": True,
        "err": "",
        "vendor_id": vendor.vendor_id
    }, status=status.HTTP_200_OK)


@api_view(["POST"])
@permission_classes([AllowAny])
def vendor_profile_update(request):
    """
    修改廠商資料
    URL: /vendor/profile/update
    """
    vendor_id = request.data.get("vendor_id")

    if not vendor_id:
        return Response({
            "success": False,
            "err": "vendor_id is required"
        }, status=status.HTTP_400_BAD_REQUEST)

    try:
        vendor = Vendor.objects.get(vendor_id=vendor_id)
    except Vendor.DoesNotExist:
        return Response({
            "success": False,
            "err": "Vendor not found"
        }, status=status.HTTP_404_NOT_FOUND)

    serializer = VendorProfileUpdateSerializer(
        vendor,
        data=request.data,
        partial=True
    )

    if not serializer.is_valid():
        return Response({
            "success": False,
            "err": serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)

    serializer.save()

    return Response({
        "success": True,
        "err": "",
        "vendor_id": vendor.vendor_id
    }, status=status.HTTP_200_OK)



@api_view(["POST"])
@permission_classes([AllowAny])
def vendor_product_create(request):
    """
    新增商品
    URL: /vendor/product/create
    """
    data = request.data.copy()

    if not data.get("status"):
        data["status"] = "active"

    serializer = VendorProductCreateSerializer(data=data)

    if not serializer.is_valid():
        return Response({
            "success": False,
            "err": serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)

    vendor_id = serializer.validated_data.get("vendor_id")

    if not Vendor.objects.filter(vendor_id=vendor_id).exists():
        return Response({
            "success": False,
            "err": "Vendor not found"
        }, status=status.HTTP_404_NOT_FOUND)

    product = serializer.save()

    return Response({
        "success": True,
        "err": "",
        "product_id": product.product_id,
        "status": product.status
    }, status=status.HTTP_201_CREATED)


@api_view(["POST"])
@permission_classes([AllowAny])
def vendor_product_update(request):
    """
    修改商品資料
    URL: /vendor/product/update
    """
    product_id = request.data.get("product_id")
    vendor_id = request.data.get("vendor_id")

    if not product_id:
        return Response({
            "success": False,
            "err": "product_id is required"
        }, status=status.HTTP_400_BAD_REQUEST)

    if not vendor_id:
        return Response({
            "success": False,
            "err": "vendor_id is required"
        }, status=status.HTTP_400_BAD_REQUEST)

    try:
        product = Product.objects.get(product_id=product_id, vendor_id=vendor_id)
    except Product.DoesNotExist:
        return Response({
            "success": False,
            "err": "Product not found"
        }, status=status.HTTP_404_NOT_FOUND)

    serializer = VendorProductUpdateSerializer(
        product,
        data=request.data,
        partial=True
    )

    if not serializer.is_valid():
        return Response({
            "success": False,
            "err": serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)

    serializer.save()

    return Response({
        "success": True,
        "err": "",
        "product_id": product.product_id
    }, status=status.HTTP_200_OK)


@api_view(["POST"])
@permission_classes([AllowAny])
def vendor_product_update_status(request):
    """
    商品上架 / 下架
    URL: /vendor/product/updateStatus
    """
    serializer = VendorProductStatusSerializer(data=request.data)

    if not serializer.is_valid():
        return Response({
            "success": False,
            "err": serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)

    product_id = serializer.validated_data["product_id"]
    vendor_id = serializer.validated_data["vendor_id"]
    new_status = serializer.validated_data["status"]

    if new_status not in ["active", "inactive"]:
        return Response({
            "success": False,
            "err": "Invalid status"
        }, status=status.HTTP_400_BAD_REQUEST)

    try:
        product = Product.objects.get(product_id=product_id, vendor_id=vendor_id)
    except Product.DoesNotExist:
        return Response({
            "success": False,
            "err": "Product not found"
        }, status=status.HTTP_404_NOT_FOUND)

    product.status = new_status
    product.save()

    return Response({
        "success": True,
        "err": "",
        "product_id": product.product_id,
        "status": product.status
    }, status=status.HTTP_200_OK)


@api_view(["GET"])
@permission_classes([AllowAny])
def vendor_product_getlist(request):
    """
    獲取商品清單
    URL: /vendor/product/getlist
    """
    vendor_id = request.GET.get("vendor_id")
    product_status = request.GET.get("status")

    if not vendor_id:
        return Response({
            "success": False,
            "err": "vendor_id is required"
        }, status=status.HTTP_400_BAD_REQUEST)

    products = Product.objects.filter(vendor_id=vendor_id)

    if product_status:
        products = products.filter(status=product_status)

    product_list = []

    for product in products:
        product_list.append({
            "product_id": product.product_id,
            "product_name": product.product_name,
            "description": product.description,
            "image_url": product.image_url,
            "price": product.price,
            "discounted_price": product.discounted_price,
            "stock": product.stock,
            "category": product.category,
            "status": product.status,
        })

    return Response({
        "success": True,
        "err": "",
        "products": product_list
    }, status=status.HTTP_200_OK)



# ──────────────────────────────────────────────
# Vendor 任務 / Campaign 管理
# ──────────────────────────────────────────────

@api_view(["POST"])
@permission_classes([AllowAny])
def vendor_campaign_create(request):
    serializer = VendorCampaignCreateSerializer(data=request.data)

    if not serializer.is_valid():
        return Response({
            "success": False,
            "err": serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)

    vendor_id = serializer.validated_data.get("vendor_id")
    product_id = serializer.validated_data.get("product_id")

    if not Vendor.objects.filter(vendor_id=vendor_id).exists():
        return Response({
            "success": False,
            "err": "Vendor not found"
        }, status=status.HTTP_404_NOT_FOUND)

    if not Product.objects.filter(product_id=product_id, vendor_id=vendor_id).exists():
        return Response({
            "success": False,
            "err": "Product not found or does not belong to this vendor"
        }, status=status.HTTP_404_NOT_FOUND)

    campaign_data = serializer.validated_data.copy()
    campaign_data.pop("product_id", None)

    campaign = Campaigns.objects.create(**campaign_data)

    product = Product.objects.get(product_id=product_id)

    CampaignProduct.objects.create(
        campaign=campaign,
        product=product
    )

    return Response({
        "success": True,
        "err": "",
        "campaign_id": campaign.campaign_id
    }, status=status.HTTP_201_CREATED)


@api_view(["POST"])
@permission_classes([AllowAny])
def vendor_campaign_update(request):
    campaign_id = request.data.get("campaign_id")
    vendor_id = request.data.get("vendor_id")

    if not campaign_id:
        return Response({
            "success": False,
            "err": "campaign_id is required"
        }, status=status.HTTP_400_BAD_REQUEST)

    if not vendor_id:
        return Response({
            "success": False,
            "err": "vendor_id is required"
        }, status=status.HTTP_400_BAD_REQUEST)

    try:
        campaign = Campaigns.objects.get(
            campaign_id=campaign_id,
            vendor_id=vendor_id
        )
    except Campaigns.DoesNotExist:
        return Response({
            "success": False,
            "err": "Campaign not found"
        }, status=status.HTTP_404_NOT_FOUND)

    serializer = VendorCampaignUpdateSerializer(
        campaign,
        data=request.data,
        partial=True
    )

    if not serializer.is_valid():
        return Response({
            "success": False,
            "err": serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)

    serializer.save()

    return Response({
        "success": True,
        "err": "",
        "campaign_id": campaign.campaign_id
    }, status=status.HTTP_200_OK)


@api_view(["GET"])
@permission_classes([AllowAny])
def vendor_campaign_getlist(request):
    vendor_id = request.GET.get("vendor_id")
    campaign_status = request.GET.get("status")

    if not vendor_id:
        return Response({
            "success": False,
            "err": "vendor_id is required"
        }, status=status.HTTP_400_BAD_REQUEST)

    campaigns = Campaigns.objects.filter(vendor_id=vendor_id)

    if campaign_status:
        campaigns = campaigns.filter(status=campaign_status)

    campaign_list = []

    for campaign in campaigns:
        campaign_products = CampaignProduct.objects.filter(
            campaign=campaign
        )

        products = []

        for campaign_product in campaign_products:
            product = campaign_product.product
            products.append({
                "product_id": product.product_id,
                "product_name": product.product_name,
                "price": product.price,
                "discounted_price": product.discounted_price,
                "image_url": product.image_url,
                "status": product.status,
            })

        campaign_list.append({
            "campaign_id": campaign.campaign_id,
            "vendor_id": campaign.vendor_id,
            "name": campaign.name,
            "description": campaign.description,
            "budget": campaign.budget,
            "reward_type": campaign.reward_type,
            "start_date": campaign.start_date,
            "end_date": campaign.end_date,
            "status": campaign.status,
            "products": products,
        })

    return Response({
        "success": True,
        "err": "",
        "campaigns": campaign_list
    }, status=status.HTTP_200_OK)



# ──────────────────────────────────────────────
# Vendor KOC 報名審核
# ──────────────────────────────────────────────

@api_view(["GET"])
@permission_classes([AllowAny])
def vendor_application_getlist(request):
    vendor_id = request.GET.get("vendor_id")
    campaign_id = request.GET.get("campaign_id")
    application_status = request.GET.get("status")

    if not vendor_id:
        return Response({
            "success": False,
            "err": "vendor_id is required"
        }, status=status.HTTP_400_BAD_REQUEST)

    campaigns = Campaigns.objects.filter(vendor_id=vendor_id)

    if campaign_id:
        campaigns = campaigns.filter(campaign_id=campaign_id)

    applications = Application.objects.filter(campaign__in=campaigns)

    if application_status:
        applications = applications.filter(status=application_status)

    application_list = []

    for application in applications:
        application_list.append({
            "application_id": application.application_id,
            "koc_id": application.koc_id,
            "koc_name": "",
            "campaign_id": application.campaign.campaign_id,
            "campaign_name": application.campaign.name,
            "status": application.status,
            "detail_status": application.status,
            "order_id": application.order_id,
        })

    return Response({
        "success": True,
        "err": "",
        "applications": application_list
    }, status=status.HTTP_200_OK)


@api_view(["POST"])
@permission_classes([AllowAny])
def vendor_application_review(request):
    serializer = VendorApplicationReviewSerializer(data=request.data)

    if not serializer.is_valid():
        return Response({
            "success": False,
            "err": serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)

    vendor_id = serializer.validated_data["vendor_id"]
    application_id = serializer.validated_data["application_id"]
    review_result = serializer.validated_data["status"]

    if review_result not in ["approved", "rejected"]:
        return Response({
            "success": False,
            "err": "Invalid review result"
        }, status=status.HTTP_400_BAD_REQUEST)

    try:
        application = Application.objects.get(application_id=application_id)
    except Application.DoesNotExist:
        return Response({
            "success": False,
            "err": "Application not found"
        }, status=status.HTTP_404_NOT_FOUND)

    if str(application.campaign.vendor_id) != str(vendor_id):
        return Response({
            "success": False,
            "err": "This application does not belong to this vendor"
        }, status=status.HTTP_403_FORBIDDEN)

    application.status = review_result
    application.save()

    return Response({
        "success": True,
        "err": "",
        "application_id": application.application_id,
        "status": application.status,
        "promotion_code": ""
    }, status=status.HTTP_200_OK)


# ──────────────────────────────────────────────
# Vendor 投稿 / 任務成果審核
# ──────────────────────────────────────────────

@api_view(["GET"])
@permission_classes([AllowAny])
def vendor_mission_get_submission_detail(request):
    vendor_id = request.GET.get("vendor_id")
    submission_id = request.GET.get("submission_id")
    kocmission_id = request.GET.get("kocmission_id")
    submission_status = request.GET.get("status")

    if not vendor_id:
        return Response({
            "success": False,
            "err": "vendor_id is required"
        }, status=status.HTTP_400_BAD_REQUEST)

    submissions = Submissions.objects.filter(
        kocmission__application__campaign__vendor_id=vendor_id
    )

    if submission_id:
        submissions = submissions.filter(submission_id=submission_id)

    if kocmission_id:
        submissions = submissions.filter(kocmission__kocmission_id=kocmission_id)

    if submission_status:
        submissions = submissions.filter(status=submission_status)

    submission_list = []

    for submission in submissions:
        mission = submission.kocmission
        application = mission.application
        campaign = application.campaign

        submission_list.append({
            "submission_id": submission.submission_id,
            "submission_type": submission.submission_type,
            "content_url": submission.content_url,
            "text_content": submission.text_content,
            "status": submission.status,
            "vendor_feedback": submission.vendor_feedback,
            "submitted_time": submission.submitted_time,
            "reviewed_time": submission.reviewed_time,

            "kocmission_id": mission.kocmission_id,
            "stage": mission.stage,
            "koc_id": mission.koc_id,

            "application_id": application.application_id,
            "campaign_id": campaign.campaign_id,
            "campaign_name": campaign.name,
        })

    return Response({
        "success": True,
        "err": "",
        "submissions": submission_list
    }, status=status.HTTP_200_OK)


@api_view(["POST"])
@permission_classes([AllowAny])
def vendor_mission_review_submission(request):
    serializer = VendorSubmissionReviewSerializer(data=request.data)

    if not serializer.is_valid():
        return Response({
            "success": False,
            "err": serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)

    vendor_id = serializer.validated_data["vendor_id"]
    submission_id = serializer.validated_data["submission_id"]
    review_result = serializer.validated_data["status"]
    vendor_feedback = serializer.validated_data.get("vendor_feedback", "")

    if review_result not in ["approved", "rejected"]:
        return Response({
            "success": False,
            "err": "Invalid review result"
        }, status=status.HTTP_400_BAD_REQUEST)

    try:
        submission = Submissions.objects.get(submission_id=submission_id)
    except Submissions.DoesNotExist:
        return Response({
            "success": False,
            "err": "Submission not found"
        }, status=status.HTTP_404_NOT_FOUND)

    campaign = submission.kocmission.application.campaign

    if str(campaign.vendor_id) != str(vendor_id):
        return Response({
            "success": False,
            "err": "This submission does not belong to this vendor"
        }, status=status.HTTP_403_FORBIDDEN)

    submission.status = review_result
    submission.vendor_feedback = vendor_feedback
    submission.reviewed_time = timezone.now()
    submission.save()

    return Response({
        "success": True,
        "err": "",
        "submission_id": submission.submission_id,
        "status": submission.status,
        "vendor_feedback": submission.vendor_feedback,
        "reviewed_time": submission.reviewed_time,
    }, status=status.HTTP_200_OK)


@api_view(["GET"])
@permission_classes([AllowAny])
def vendor_order_getlist(request):
    vendor_id = request.GET.get("vendor_id")

    if not vendor_id:
        return Response({
            "success": False,
            "err": "vendor_id is required"
        }, status=status.HTTP_400_BAD_REQUEST)

    order_items = OrderItem.objects.filter(
        product__vendor_id=vendor_id
    ).select_related("order", "product")

    order_map = {}

    for item in order_items:
        order = item.order

        if order.order_id not in order_map:
            order_map[order.order_id] = {
                "order_id": str(order.order_id),
                "user_id": order.user_id,
                "guest_id": order.guest_id,
                "promotion_code": order.promotion_code,
                "total_amount": str(order.total_amount),
                "order_status": order.order_status,
                "payment_status": order.payment_status,
                "shipping_status": order.shipping_status,
                "created_at": order.created_at.isoformat() if order.created_at else None,
                "items": []
            }

        order_map[order.order_id]["items"].append({
            "order_item_id": str(item.order_item_id),
            "product_id": item.product.product_id,
            "product_name": item.product.product_name,
            "quantity": item.quantity,
            "unit_price": str(item.unit_price),
            "subtotal": str(item.subtotal),
            "apply_status": item.apply_status
        })

    return Response({
        "success": True,
        "err": "",
        "orders": list(order_map.values())
    }, status=status.HTTP_200_OK)


@api_view(["GET"])
@permission_classes([AllowAny])
def vendor_order_get_detail(request):
    vendor_id = request.GET.get("vendor_id")
    order_id = request.GET.get("order_id")

    if not vendor_id:
        return Response({
            "success": False,
            "err": "vendor_id is required"
        }, status=status.HTTP_400_BAD_REQUEST)

    if not order_id:
        return Response({
            "success": False,
            "err": "order_id is required"
        }, status=status.HTTP_400_BAD_REQUEST)

    order_items = OrderItem.objects.filter(
        order_id=order_id,
        product__vendor_id=vendor_id
    ).select_related("order", "product")

    if not order_items.exists():
        return Response({
            "success": False,
            "err": "Order not found or does not belong to this vendor"
        }, status=status.HTTP_404_NOT_FOUND)

    order = order_items[0].order

    payment = Payment.objects.filter(order_id=order_id).first()

    items = []
    for item in order_items:
        items.append({
            "order_item_id": str(item.order_item_id),
            "product_id": item.product.product_id,
            "product_name": item.product.product_name,
            "quantity": item.quantity,
            "unit_price": str(item.unit_price),
            "subtotal": str(item.subtotal),
            "apply_status": item.apply_status
        })

    payment_data = None
    if payment:
        payment_data = {
            "payment_id": payment.payment_id,
            "payment_method": payment.payment_method,
            "payment_status": payment.payment_status,
            "transaction_id": payment.transaction_id,
            "promotion_code": payment.promotion_code
        }

    return Response({
        "success": True,
        "err": "",
        "order": {
            "order_id": str(order.order_id),
            "user_id": order.user_id,
            "guest_id": order.guest_id,
            "promotion_code": order.promotion_code,
            "total_amount": str(order.total_amount),
            "order_status": order.order_status,
            "payment_status": order.payment_status,
            "shipping_status": order.shipping_status,
            "address_id": order.address_id,
            "created_at": order.created_at.isoformat() if order.created_at else None,
            "items": items,
            "payment": payment_data
        }
    }, status=status.HTTP_200_OK)


@api_view(["POST"])
@permission_classes([AllowAny])
def vendor_order_update_shipping(request):
    vendor_id = request.data.get("vendor_id")
    order_id = request.data.get("order_id")
    shipping_status = request.data.get("shipping_status")

    if not vendor_id:
        return Response({
            "success": False,
            "err": "vendor_id is required"
        }, status=status.HTTP_400_BAD_REQUEST)

    if not order_id:
        return Response({
            "success": False,
            "err": "order_id is required"
        }, status=status.HTTP_400_BAD_REQUEST)

    if not shipping_status:
        return Response({
            "success": False,
            "err": "shipping_status is required"
        }, status=status.HTTP_400_BAD_REQUEST)

    valid_status = ["unshipped", "preparing", "shipped", "delivered", "cancelled"]

    if shipping_status not in valid_status:
        return Response({
            "success": False,
            "err": "Invalid shipping_status"
        }, status=status.HTTP_400_BAD_REQUEST)

    order_items = OrderItem.objects.filter(
        order_id=order_id,
        product__vendor_id=vendor_id
    ).select_related("order", "product")

    if not order_items.exists():
        return Response({
            "success": False,
            "err": "Order not found or does not belong to this vendor"
        }, status=status.HTTP_404_NOT_FOUND)

    order = order_items[0].order
    order.shipping_status = shipping_status
    order.save()

    return Response({
        "success": True,
        "err": "",
        "order_id": str(order.order_id),
        "shipping_status": order.shipping_status
    }, status=status.HTTP_200_OK)


@api_view(["GET"])
@permission_classes([AllowAny])
def vendor_coupon_get_usage_list(request):
    vendor_id = request.GET.get("vendor_id")
    campaign_id = request.GET.get("campaign_id")
    status_filter = request.GET.get("status")

    if not vendor_id:
        return Response({
            "success": False,
            "err": "vendor_id is required"
        }, status=status.HTTP_400_BAD_REQUEST)

    coupons = CouponNew.objects.filter(
        kocmission__application__campaign__vendor_id=vendor_id
    ).select_related(
        "kocmission",
        "kocmission__application",
        "kocmission__application__campaign"
    )

    if campaign_id:
        coupons = coupons.filter(
            kocmission__application__campaign__campaign_id=campaign_id
        )

    if status_filter:
        coupons = coupons.filter(status=status_filter)

    coupon_list = []

    for coupon in coupons:
        mission = coupon.kocmission
        application = mission.application
        campaign = application.campaign

        coupon_list.append({
            "coupon_id": coupon.coupon_id,
            "promotion_code": coupon.promotion_code,
            "discount_value": coupon.discount_value,
            "status": coupon.status,
            "usage_count": coupon.usage_count,
            "total_commission": coupon.total_commission,

            "kocmission_id": mission.kocmission_id,
            "koc_id": mission.koc_id,
            "stage": mission.stage,

            "application_id": application.application_id,
            "campaign_id": str(campaign.campaign_id),
            "campaign_name": campaign.name,
            "vendor_id": campaign.vendor_id
        })

    return Response({
        "success": True,
        "err": "",
        "coupons": coupon_list
    }, status=status.HTTP_200_OK)


@api_view(["POST"])
@permission_classes([AllowAny])
def vendor_coupon_update_status(request):
    vendor_id = request.data.get("vendor_id")
    coupon_id = request.data.get("coupon_id")
    coupon_status = request.data.get("status")

    if not vendor_id:
        return Response({
            "success": False,
            "err": "vendor_id is required"
        }, status=status.HTTP_400_BAD_REQUEST)

    if not coupon_id:
        return Response({
            "success": False,
            "err": "coupon_id is required"
        }, status=status.HTTP_400_BAD_REQUEST)

    if not coupon_status:
        return Response({
            "success": False,
            "err": "status is required"
        }, status=status.HTTP_400_BAD_REQUEST)

    valid_status = ["active", "inactive", "disabled"]

    if coupon_status not in valid_status:
        return Response({
            "success": False,
            "err": "Invalid status"
        }, status=status.HTTP_400_BAD_REQUEST)

    try:
        coupon = CouponNew.objects.select_related(
            "kocmission__application__campaign"
        ).get(coupon_id=coupon_id)
    except CouponNew.DoesNotExist:
        return Response({
            "success": False,
            "err": "Coupon not found"
        }, status=status.HTTP_404_NOT_FOUND)

    campaign = coupon.kocmission.application.campaign

    if str(campaign.vendor_id) != str(vendor_id):
        return Response({
            "success": False,
            "err": "This coupon does not belong to this vendor"
        }, status=status.HTTP_403_FORBIDDEN)

    coupon.status = coupon_status
    coupon.save()

    return Response({
        "success": True,
        "err": "",
        "coupon_id": coupon.coupon_id,
        "promotion_code": coupon.promotion_code,
        "status": coupon.status
    }, status=status.HTTP_200_OK)

@api_view(["GET"])
@permission_classes([AllowAny])
def vendor_analytics_overview(request):
    vendor_id = request.GET.get("vendor_id")

    if not vendor_id:
        return Response({
            "success": False,
            "err": "vendor_id is required"
        }, status=status.HTTP_400_BAD_REQUEST)

    # 1. 活動總數
    total_campaigns = Campaigns.objects.filter(
        vendor_id=vendor_id
    ).count()

    # 2. 這個廠商商品相關的訂單明細
    order_items = OrderItem.objects.filter(
        product__vendor_id=vendor_id
    ).select_related("order", "product")

    # 3. 訂單總數，不重複計算同一張訂單
    total_orders = order_items.values("order_id").distinct().count()

    # 4. 商品銷售金額：用 OrderItem subtotal 加總
    revenue_result = order_items.aggregate(
        total_revenue=Sum("subtotal")
    )
    total_revenue = revenue_result["total_revenue"] or 0

    # 5. 優惠碼資料
    coupons = CouponNew.objects.filter(
        kocmission__application__campaign__vendor_id=vendor_id
    )

    coupon_usage_result = coupons.aggregate(
        total_coupon_usage=Sum("usage_count"),
        total_commission=Sum("total_commission")
    )

    total_coupon_usage = coupon_usage_result["total_coupon_usage"] or 0
    total_commission = coupon_usage_result["total_commission"] or 0

    # 6. KOC 報名數
    total_applications = Application.objects.filter(
        campaign__vendor_id=vendor_id
    ).count()

    # 7. 投稿數
    total_submissions = Submissions.objects.filter(
        kocmission__application__campaign__vendor_id=vendor_id
    ).count()

    return Response({
        "success": True,
        "err": "",
        "analytics": {
            "vendor_id": vendor_id,
            "total_campaigns": total_campaigns,
            "total_applications": total_applications,
            "total_submissions": total_submissions,
            "total_orders": total_orders,
            "total_revenue": str(total_revenue),
            "total_coupon_usage": total_coupon_usage,
            "total_commission": total_commission
        }
    }, status=status.HTTP_200_OK)


@api_view(["GET"])
@permission_classes([AllowAny])
def vendor_product_performance(request):
    vendor_id = request.GET.get("vendor_id")
    campaign_id = request.GET.get("campaign_id")
    start_date = request.GET.get("start_date")
    end_date = request.GET.get("end_date")

    if not vendor_id:
        return Response({
            "success": False,
            "err": "vendor_id is required"
        }, status=status.HTTP_400_BAD_REQUEST)

    order_items = OrderItem.objects.filter(
        product__vendor_id=vendor_id
    ).select_related("order", "product")

    if start_date:
        order_items = order_items.filter(order__created_at__date__gte=start_date)

    if end_date:
        order_items = order_items.filter(order__created_at__date__lte=end_date)

    if campaign_id:
        campaign_product_ids = CampaignProduct.objects.filter(
            campaign_id=campaign_id
        ).values_list("product_id", flat=True)

        order_items = order_items.filter(
            product_id__in=campaign_product_ids
        )

    product_data = (
        order_items
        .values(
            "product__product_id",
            "product__product_name"
        )
        .annotate(
            quantity_sold=Sum("quantity"),
            total_sales=Sum("subtotal"),
            total_orders=Count("order", distinct=True),
        )
        .order_by("-total_sales")
    )

    products = []

    for item in product_data:
        product_id = item["product__product_id"]

        product_order_items = order_items.filter(
            product__product_id=product_id
        )

        coupon_codes = product_order_items.filter(
            order__promotion_code__isnull=False
        ).exclude(
            order__promotion_code=""
        ).values_list(
            "order__promotion_code",
            flat=True
        ).distinct()

        coupon_orders = product_order_items.filter(
            order__promotion_code__in=coupon_codes
        ).values(
            "order_id"
        ).distinct().count()

        coupon_result = CouponNew.objects.filter(
            promotion_code__in=coupon_codes
        ).aggregate(
            total_commission=Sum("total_commission")
        )

        products.append({
            "product_id": str(product_id),
            "product_name": item["product__product_name"],
            "quantity_sold": item["quantity_sold"] or 0,
            "total_sales": int(item["total_sales"] or 0),
            "total_orders": item["total_orders"] or 0,
            "coupon_orders": coupon_orders,
            "total_commission": coupon_result["total_commission"] or 0
        })

    return Response({
        "success": True,
        "err": "",
        "products": products
    }, status=status.HTTP_200_OK)
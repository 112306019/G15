from django.contrib.auth.hashers import make_password, check_password
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status

from api.models import Vendor, Product, Campaigns, CampaignProduct, Application
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
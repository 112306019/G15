import random, string
from django.contrib.auth.hashers import make_password, check_password
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status
from django.utils import timezone
from datetime import datetime, time, timedelta
from django.db import transaction
from django.db.models import Sum, Count
from decimal import Decimal, ROUND_HALF_UP
from api.r2_storage import upload_image_to_r2

from api.views.constants import STAGE_ALLOWED_SUBMISSION_TYPE, sync_expired_promoting_missions
from api.models import Vendor, Product, Campaigns, CampaignProduct, Application, KOCMissionNew, Submissions, Order, OrderItem, CouponNew, Earnings, ChatRoom, Message, Address, User, ShipmentInfo, VendorEmailVerificationCode, VendorWallet, VendorPayouts, Transactions
from api.emails import send_vendor_email_verification_email
from payments.services import get_order_payment_status
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

from api.views.shipping import (
    create_ecpay_logistics_order,
    query_ecpay_logistics_order
)


VENDOR_VERIFICATION_CODE_TTL_MINUTES = 10


def _generate_vendor_verification_code():
    return f"{random.randint(0, 999999):06d}"


@api_view(["POST"])
@permission_classes([AllowAny])
def vendor_register(request):
    """
    廠商註冊
    URL: /vendor/auth/register

    跟消費者/KOC 註冊（user_signup）一樣，要先寄驗證碼到信箱確認廠商真的收得到信，
    才能完成註冊；廠商在完成信箱驗證前無法登入。這跟 Vendor.status（平台審核廠商資格
    的 pending/approved/rejected）是兩件獨立的事，信箱驗證只是確認帳號本身能登入。
    """
    serializer = VendorRegisterSerializer(data=request.data)

    if not serializer.is_valid():
        return Response({
            "success": False,
            "err": serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)

    email = serializer.validated_data.get("email")
    tax_id = serializer.validated_data.get("tax_id")

    existing_vendor = Vendor.objects.filter(email=email).first()
    if existing_vendor:
        if existing_vendor.is_verified:
            return Response({
                "success": False,
                "err": "Email already exists"
            }, status=status.HTTP_400_BAD_REQUEST)
        else:
            # 之前註冊過但沒完成信箱驗證，視為未完成的舊紀錄，
            # 刪掉重來，讓廠商可以用同一個 email 重新走一次註冊流程
            VendorEmailVerificationCode.objects.filter(vendor=existing_vendor).delete()
            existing_vendor.delete()

    if Vendor.objects.filter(tax_id=tax_id).exists():
        return Response({
            "success": False,
            "err": "Tax ID already exists"
        }, status=status.HTTP_400_BAD_REQUEST)

    try:
        with transaction.atomic():
            vendor = serializer.save(
                password=make_password(serializer.validated_data["password"]),
                is_verified=False,
            )

            code = _generate_vendor_verification_code()
            VendorEmailVerificationCode.objects.create(
                vendor=vendor,
                code=code,
                expires_at=timezone.now() + timedelta(minutes=VENDOR_VERIFICATION_CODE_TTL_MINUTES),
            )
            # 寄信失敗要讓整筆註冊一起 rollback，不然這個 email 會卡在
            # 「已被註冊但帳號永遠拿不到驗證碼」的死狀態
            send_vendor_email_verification_email(vendor, code)
    except Exception as email_error:
        return Response({
            "success": False,
            "err": "驗證信寄送失敗，請稍後再試"
        }, status=status.HTTP_502_BAD_GATEWAY)

    return Response({
        "success": True,
        "err": "",
        "vendor_id": vendor.vendor_id,
        "requiresVerification": True,
    }, status=status.HTTP_201_CREATED)


## 廠商註冊信箱驗證：輸入驗證碼確認信箱真的存在
@api_view(["POST"])
@permission_classes([AllowAny])
def vendor_verify_email(request):
    """
    URL: /vendor/auth/verifyEmail
    """
    email = request.data.get("email")
    code = request.data.get("code")

    if not email or not code:
        return Response({
            "success": False,
            "err": "email、code 為必填"
        }, status=status.HTTP_400_BAD_REQUEST)

    try:
        vendor = Vendor.objects.get(email=email)
    except Vendor.DoesNotExist:
        return Response({
            "success": False,
            "err": "找不到使用這個 Email 的廠商帳號"
        }, status=status.HTTP_404_NOT_FOUND)

    if vendor.is_verified:
        return Response({"success": True, "err": ""}, status=status.HTTP_200_OK)

    verification = VendorEmailVerificationCode.objects.filter(
        vendor=vendor, code=code, is_used=False
    ).order_by("-created_at").first()

    if not verification:
        return Response({
            "success": False,
            "err": "驗證碼錯誤"
        }, status=status.HTTP_400_BAD_REQUEST)

    if verification.expires_at < timezone.now():
        return Response({
            "success": False,
            "err": "驗證碼已過期，請重新寄送"
        }, status=status.HTTP_400_BAD_REQUEST)

    vendor.is_verified = True
    vendor.save(update_fields=["is_verified"])

    verification.is_used = True
    verification.save(update_fields=["is_used"])

    return Response({"success": True, "err": ""}, status=status.HTTP_200_OK)


## 重新寄送廠商註冊驗證碼
@api_view(["POST"])
@permission_classes([AllowAny])
def vendor_resend_verification_code(request):
    """
    URL: /vendor/auth/resendVerification
    """
    email = request.data.get("email")

    if not email:
        return Response({
            "success": False,
            "err": "email 為必填"
        }, status=status.HTTP_400_BAD_REQUEST)

    try:
        vendor = Vendor.objects.get(email=email)
    except Vendor.DoesNotExist:
        return Response({
            "success": False,
            "err": "找不到使用這個 Email 的廠商帳號"
        }, status=status.HTTP_404_NOT_FOUND)

    if vendor.is_verified:
        return Response({
            "success": False,
            "err": "此帳號已經完成驗證"
        }, status=status.HTTP_400_BAD_REQUEST)

    code = _generate_vendor_verification_code()
    VendorEmailVerificationCode.objects.create(
        vendor=vendor,
        code=code,
        expires_at=timezone.now() + timedelta(minutes=VENDOR_VERIFICATION_CODE_TTL_MINUTES),
    )

    try:
        send_vendor_email_verification_email(vendor, code)
    except Exception as email_error:
        return Response({
            "success": False,
            "err": "驗證信寄送失敗，請稍後再試"
        }, status=status.HTTP_502_BAD_GATEWAY)

    return Response({"success": True, "err": ""}, status=status.HTTP_200_OK)


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

    # 信箱還沒驗證不能登入，前端要能分辨這種情況去導去驗證流程。
    # 廠商登入表單只收 vendor_id（不像消費者登入收 email），前端沒有信箱可以直接開驗證彈窗，
    # 所以這裡把 email 一併帶回去——這個時間點密碼已經驗證正確，不是洩漏帳號資訊給不相關的人。
    if not vendor.is_verified:
        return Response({
            "success": False,
            "err": "請先完成 Email 驗證",
            "needsVerification": True,
            "email": vendor.email,
        }, status=status.HTTP_403_FORBIDDEN)

    return Response({
        "success": True,
        "err": "",
        "vendor_id": vendor.vendor_id
    }, status=status.HTTP_200_OK)

@api_view(["GET"])
@permission_classes([AllowAny])
def vendor_profile_get(request):
    """
    取得廠商資料
    URL: /vendor/profile/get
    """
    vendor_id = request.GET.get("vendor_id")

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

    return Response({
        "success": True,
        "err": "",
        "vendor": {
            "vendor_id": vendor.vendor_id,
            "company_name": vendor.company_name,
            "contact_name": vendor.contact_name,
            "email": vendor.email,
            "tax_id": vendor.tax_id,
            "sender_name": vendor.sender_name,
            "sender_phone": vendor.sender_phone,
            "sender_postal_code": vendor.sender_postal_code,
            "sender_city": vendor.sender_city,
            "sender_district": vendor.sender_district,
            "sender_address": vendor.sender_address,
            "bank_code": vendor.bank_code,
            "bank_account": vendor.bank_account,
            "bank_account_name": vendor.bank_account_name,
            "platform_fee_rate": str(vendor.platform_fee_rate),
            "created_at": vendor.created_at,
        }
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


@api_view(["POST"])
@permission_classes([AllowAny])
def vendor_product_delete(request):
    """
    刪除商品
    URL: /vendor/product/delete

    只有未被活動綁定、且沒有訂單紀錄的商品可以刪除。
    """
    vendor_id = request.data.get("vendor_id")
    product_id = request.data.get("product_id")

    if not vendor_id:
        return Response({
            "success": False,
            "err": "vendor_id is required"
        }, status=status.HTTP_400_BAD_REQUEST)

    if not product_id:
        return Response({
            "success": False,
            "err": "product_id is required"
        }, status=status.HTTP_400_BAD_REQUEST)

    try:
        product = Product.objects.get(
            product_id=product_id,
            vendor_id=vendor_id
        )
    except Product.DoesNotExist:
        return Response({
            "success": False,
            "err": "Product not found"
        }, status=status.HTTP_404_NOT_FOUND)

    # 已綁定活動，不允許刪除
    if CampaignProduct.objects.filter(
        product=product
    ).exists():
        return Response({
            "success": False,
            "err": "此商品已綁定活動，無法刪除；請改為下架商品"
        }, status=status.HTTP_400_BAD_REQUEST)

    # 已有訂單紀錄，不允許刪除
    if OrderItem.objects.filter(
        product=product
    ).exists():
        return Response({
            "success": False,
            "err": "此商品已有訂單紀錄，無法刪除；請改為下架商品"
        }, status=status.HTTP_400_BAD_REQUEST)

    deleted_product_id = product.product_id
    product.delete()

    return Response({
        "success": True,
        "err": "",
        "product_id": deleted_product_id
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

    # 透過 OrderItem 加總每個商品「實際」賣出的數量與銷售額，
    # 而不是讓前端顯示寫死的 0。
    sold_data = (
        OrderItem.objects
        .filter(
            product__vendor_id=vendor_id,
            order__payment_status__in=["paid", "completed"]
        )
        .values("product_id")
        .annotate(
            quantity_sold=Sum("quantity"),
            total_sales=Sum("subtotal")
        )
    )

    sold_map = {
        row["product_id"]: {
            "quantity_sold": row["quantity_sold"] or 0,
            "total_sales": row["total_sales"] or 0
        }
        for row in sold_data
    }

    # 「推廣中」要看商品是否真的掛在一個「進行中」的活動上
    # （活動狀態為 active，且現在時間落在 start_date ~ end_date 之間），
    # 不是單純看商品自己的上架/下架狀態。
    now = timezone.now()

    promoting_product_ids = set(
        CampaignProduct.objects
        .filter(
            product__vendor_id=vendor_id,
            campaign__status="active",
            campaign__start_date__lte=now,
            campaign__end_date__gte=now
        )
        .values_list("product_id", flat=True)
    )

    product_list = []

    for product in products:
        sold_info = sold_map.get(
            product.product_id,
            {"quantity_sold": 0, "total_sales": 0}
        )

        product_list.append({
            "product_id": product.product_id,
            "product_name": product.product_name,
            "description": product.description,
            "image_url": product.image_url,
            "price": product.price,
            "discounted_price": product.discounted_price,
            "stock": product.stock,
            "quantity_sold": sold_info["quantity_sold"],
            "total_sales": int(sold_info["total_sales"]),
            "is_promoting": product.product_id in promoting_product_ids,
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
    """
    建立任務。

    商品來源二選一：
    1. 傳 product_id：綁定廠商既有商品
    2. 傳 product：建立新商品並綁定
    """
    serializer = VendorCampaignCreateSerializer(
        data=request.data
    )

    if not serializer.is_valid():
        return Response({
            "success": False,
            "err": serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)

    data = serializer.validated_data

    vendor_id = data["vendor_id"]
    product_id = data.get("product_id")
    product_data = data.get("product")

    try:
        vendor = Vendor.objects.get(
            vendor_id=vendor_id
        )
    except Vendor.DoesNotExist:
        return Response({
            "success": False,
            "err": "Vendor not found"
        }, status=status.HTTP_404_NOT_FOUND)

    start_datetime = timezone.make_aware(
        datetime.combine(
            data["start_date"],
            time.min
        )
    )

    end_datetime = timezone.make_aware(
        datetime.combine(
            data["end_date"],
            time.max
        )
    )

    # 先準備商品價格，還不寫入資料庫
    existing_product = None

    if product_id is not None:
        try:
            existing_product = Product.objects.get(
                product_id=product_id,
                vendor_id=vendor_id
            )
        except Product.DoesNotExist:
            return Response({
                "success": False,
                "err": "Product not found or does not belong to this vendor"
            }, status=status.HTTP_404_NOT_FOUND)

        product_price = existing_product.price

    else:
        if not product_data:
            return Response({
                "success": False,
                "err": "請選擇既有商品或提供新商品資料"
            }, status=status.HTTP_400_BAD_REQUEST)

        # 新商品還沒建立，可以直接從 request 資料取得價格
        product_price = product_data["price"]


    # 所有折扣驗證都在寫入資料庫前完成
    if (
        data["discount_type"] == "fixed"
        and data["discount_value"] > product_price
    ):
        return Response({
            "success": False,
            "err": {
                "discount_value": "直接折價金額不能高於商品原價"
            }
        }, status=status.HTTP_400_BAD_REQUEST)

    try:
        with transaction.atomic():

            # 既有商品直接使用前面查到的資料
            if existing_product is not None:
                product = existing_product

            # 新商品現在才寫入資料庫
            else:
                product = Product.objects.create(
                    vendor_id=vendor.vendor_id,
                    product_name=product_data["product_name"],
                    description=product_data.get(
                        "description",
                        ""
                    ),
                    price=product_data["price"],
                    discounted_price=product_data.get(
                        "discounted_price"
                    ),
                    stock=product_data["stock"],
                    category=product_data.get(
                        "category",
                        ""
                    ),
                    image_url=product_data.get(
                        "image_url",
                        ""
                    ),
                    status="active"
                )

            campaign = Campaigns.objects.create(
                vendor=vendor,
                name=data["name"],
                description=data.get("description", ""),
                budget=data["budget"],
                reward_type=data.get(
                    "reward_type",
                    "commission"
                ),
                promo_days=data["promo_days"],
                start_date=start_datetime,
                end_date=end_datetime,
                status=data["status"]
            )

            CampaignProduct.objects.create(
                campaign=campaign,
                product=product,
                discount_type=data["discount_type"],
                discount_value=data["discount_value"],
                koc_commission_rate=data[
                    "koc_commission_rate"
                ]
            )

    except Exception as error:
        return Response({
            "success": False,
            "err": str(error)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    return Response({
        "success": True,
        "err": "",
        "campaign_id": str(campaign.campaign_id),
        "product_id": product.product_id,
        "product_created": product_id is None,
        "status": campaign.status
    }, status=status.HTTP_201_CREATED)


@api_view(["POST"])
@permission_classes([AllowAny])
def vendor_campaign_update(request):
    """
    修改任務。

    商品來源二選一：
    1. product_id：綁定既有商品
    2. product：建立新商品並重新綁定
    """
    serializer = VendorCampaignUpdateSerializer(
        data=request.data
    )

    if not serializer.is_valid():
        return Response({
            "success": False,
            "err": serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)

    data = serializer.validated_data

    campaign_id = data["campaign_id"]
    vendor_id = data["vendor_id"]

    product_id = data.get("product_id")
    product_data = data.get("product")

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

    campaign_product = CampaignProduct.objects.filter(
        campaign=campaign
    ).first()

    # 該活動只要有任何優惠碼已被使用過，折扣、分潤比例與綁定商品就鎖定，
    # 避免事後更動讓已發生的訂單/分潤跟畫面顯示對不起來。
    coupon_used = CouponNew.objects.filter(
        kocmission__application__campaign=campaign,
        usage_count__gt=0
    ).exists()

    if coupon_used and campaign_product:
        locked_field_changed = (
            str(campaign_product.discount_type) != str(data["discount_type"])
            or Decimal(str(campaign_product.discount_value)) != Decimal(str(data["discount_value"]))
            or Decimal(str(campaign_product.koc_commission_rate)) != Decimal(str(data["koc_commission_rate"]))
            or (
                product_id is not None
                and str(campaign_product.product_id) != str(product_id)
            )
        )

        if locked_field_changed:
            return Response({
                "success": False,
                "err": "此活動已有優惠碼被使用，折扣、分潤比例與綁定商品無法再修改"
            }, status=status.HTTP_400_BAD_REQUEST)

    start_datetime = timezone.make_aware(
        datetime.combine(
            data["start_date"],
            time.min
        )
    )

    end_datetime = timezone.make_aware(
        datetime.combine(
            data["end_date"],
            time.max
        )
    )

    existing_product = None

    if product_id is not None:
        try:
            existing_product = Product.objects.get(
                product_id=product_id,
                vendor_id=vendor_id
            )
        except Product.DoesNotExist:
            return Response({
                "success": False,
                "err": "Product not found or does not belong to this vendor"
            }, status=status.HTTP_404_NOT_FOUND)

        product_price = existing_product.price

    else:
        if not product_data:
            return Response({
                "success": False,
                "err": "New product data is required"
            }, status=status.HTTP_400_BAD_REQUEST)

        product_price = product_data["price"]


    if (
        data["discount_type"] == "fixed"
        and data["discount_value"] > product_price
    ):
        return Response({
            "success": False,
            "err": {
                "discount_value": "直接折價金額不能高於商品原價"
            }
        }, status=status.HTTP_400_BAD_REQUEST)

    try:
        with transaction.atomic():

            if existing_product is not None:
                product = existing_product
            else:
                product = Product.objects.create(
                    vendor_id=vendor_id,
                    product_name=product_data["product_name"],
                    description=product_data.get(
                        "description",
                        ""
                    ),
                    price=product_data["price"],
                    discounted_price=product_data.get(
                        "discounted_price"
                    ),
                    stock=product_data["stock"],
                    category=product_data.get(
                        "category",
                        ""
                    ),
                    image_url=product_data.get(
                        "image_url",
                        ""
                    ),
                    status="active"
                )

            campaign.name = data["name"]
            campaign.description = data.get(
                "description",
                ""
            )
            campaign.budget = data["budget"]
            campaign.reward_type = data.get(
                "reward_type",
                "commission"
            )
            campaign.promo_days = data["promo_days"]
            campaign.start_date = start_datetime
            campaign.end_date = end_datetime
            campaign.status = data["status"]
            campaign.save()

            campaign_product = CampaignProduct.objects.filter(
                campaign=campaign
            ).first()

            if campaign_product:
                campaign_product.product = product
                campaign_product.discount_type = data[
                    "discount_type"
                ]
                campaign_product.discount_value = data[
                    "discount_value"
                ]
                campaign_product.koc_commission_rate = data[
                    "koc_commission_rate"
                ]

                campaign_product.save(
                    update_fields=[
                        "product",
                        "discount_type",
                        "discount_value",
                        "koc_commission_rate",
                    ]
                )
            else:
                CampaignProduct.objects.create(
                    campaign=campaign,
                    product=product,
                    discount_type=data["discount_type"],
                    discount_value=data["discount_value"],
                    koc_commission_rate=data[
                        "koc_commission_rate"
                    ]
                )

    except Exception as error:
        return Response({
            "success": False,
            "err": str(error)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    return Response({
        "success": True,
        "err": "",
        "campaign_id": str(campaign.campaign_id),
        "product_id": product.product_id,
        "product_created": product_id is None,
        "status": campaign.status
    }, status=status.HTTP_200_OK)

@api_view(["POST"])
@permission_classes([AllowAny])
def vendor_campaign_delete(request):
    """
    刪除任務草稿
    URL: /vendor/campaign/delete
    """
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

    if campaign.status != "draft":
        return Response({
            "success": False,
            "err": "Only draft campaigns can be deleted"
        }, status=status.HTTP_400_BAD_REQUEST)

    # 刪除 CampaignProduct 關聯，但不刪除原本商品庫中的商品
    CampaignProduct.objects.filter(
        campaign=campaign
    ).delete()

    campaign.delete()

    return Response({
        "success": True,
        "err": "",
        "campaign_id": str(campaign_id)
    }, status=status.HTTP_200_OK)

@api_view(["GET"])
@permission_classes([AllowAny])
def vendor_campaign_getlist(request):
    # 讀取活動列表前先跑一次過期同步，不然 end_date 已過的活動會一直卡在
    # status='active'（後台卡片顯示「招募中」），因為全專案沒有排程會自動
    # 更新這個欄位，只能靠讀取的當下 lazy-write 補上。
    sync_expired_promoting_missions()

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

        # 該活動只要有任何一張優惠碼被實際使用過（usage_count > 0），
        # 折扣與分潤條件就視為「鎖定」，避免事後更動讓已發生的訂單/分潤跟畫面對不起來。
        coupon_used = CouponNew.objects.filter(
            kocmission__application__campaign=campaign,
            usage_count__gt=0
        ).exists()

        products = []

        for campaign_product in campaign_products:
            product = campaign_product.product
            products.append({
                "product_id": product.product_id,
                "product_name": product.product_name,
                "description": product.description,
                "price": product.price,
                "discounted_price": product.discounted_price,
                "stock": product.stock,
                "category": product.category,
                "image_url": product.image_url,
                "status": product.status,

                "discount_type": campaign_product.discount_type,
                "discount_value": str(
                    campaign_product.discount_value
                ),
                "koc_commission_rate": str(
                    campaign_product.koc_commission_rate
                ),
            })

        campaign_list.append({
            "campaign_id": str(campaign.campaign_id),
            "vendor_id": campaign.vendor_id,
            "name": campaign.name,
            "description": campaign.description,
            "budget": str(campaign.budget),
            "reward_type": campaign.reward_type,
            "promo_days": campaign.promo_days,
            "start_date": (
                campaign.start_date.date().isoformat()
                if campaign.start_date
                else None
            ),
            "end_date": (
                campaign.end_date.date().isoformat()
                if campaign.end_date
                else None
            ),
            "status": campaign.status,
            "coupon_used": coupon_used,
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
        mission = (
            KOCMissionNew.objects
            .filter(application=application)
            .first()
        )

        coupon = None

        if mission:
            coupon = (
                CouponNew.objects
                .filter(kocmission=mission)
                .first()
            )

        # 折扣/分潤設定要看 CampaignProduct，不是 coupon 自己的欄位
        campaign_product = (
            CampaignProduct.objects
            .filter(campaign=application.campaign)
            .select_related("product")
            .first()
        )

        koc_name = ""
        if application.koc and application.koc.user:
            koc_name = (
                application.koc.user.display_name
                or application.koc.user.name
                or ""
            )

        application_list.append({
            "application_id": application.application_id,
            "koc_id": application.koc_id,
            "koc_name": koc_name,
            "campaign_id": str(
                application.campaign.campaign_id
            ),
            "campaign_name": application.campaign.name,
            "product_id": (
                campaign_product.product.product_id
                if campaign_product
                else None
            ),
            "product_name": (
                campaign_product.product.product_name
                if campaign_product
                else None
            ),
            "status": application.status,
            "detail_status": application.status,
            "created_at": (
                application.created_at.isoformat()
                if application.created_at
                else None
            ),
            "order_id": (
                str(application.order_id)
                if application.order_id
                else None
            ),

            "kocmission_id": (
                mission.kocmission_id
                if mission
                else None
            ),

            "promotion_code": (
                coupon.promotion_code
                if coupon
                else None
            ),

            "coupon_status": (
                coupon.status
                if coupon
                else None
            ),

            "discount_type": (
                campaign_product.discount_type
                if campaign_product
                else None
            ),

            "discount_value": (
                str(campaign_product.discount_value)
                if campaign_product
                else None
            ),

            "koc_commission_rate": (
                str(campaign_product.koc_commission_rate)
                if campaign_product
                else None
            ),
        })

    return Response({
        "success": True,
        "err": "",
        "applications": application_list
    }, status=status.HTTP_200_OK)

# 產生優惠碼
def generate_promotion_code(koc_id):
    while True:
        random_part = ''.join(
            random.choices(string.digits, k=3)
        )
        code = f"{koc_id}-{random_part}"

        if not CouponNew.objects.filter(promotion_code=code).exists():
            return code


SUBMISSION_TYPE_TO_STAGE = {
    submission_type: stage
    for stage, submission_type in STAGE_ALLOWED_SUBMISSION_TYPE.items()
}

@api_view(["POST"])
@permission_classes([AllowAny])
def vendor_application_review(request):
    """
    廠商審核 KOC 接案申請
    URL: /vendor/application/review

    通過時：
    1. Application 狀態改為 approved
    2. 建立 KOCMissionNew
    3. 建立未啟用優惠碼
    4. 自動建立聊天室

    拒絕時：
    1. Application 狀態改為 rejected
    """

    serializer = VendorApplicationReviewSerializer(
        data=request.data
    )

    if not serializer.is_valid():
        return Response({
            "success": False,
            "err": serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)

    vendor_id = serializer.validated_data["vendor_id"]
    application_id = serializer.validated_data["application_id"]
    review_result = serializer.validated_data["status"]
    reject_reason = serializer.validated_data.get("reject_reason", "")

    if review_result not in ["approved", "rejected"]:
        return Response({
            "success": False,
            "err": "Invalid review result"
        }, status=status.HTTP_400_BAD_REQUEST)

    try:
        application = (
            Application.objects
            .select_related(
                "campaign",
                "koc"
            )
            .get(
                application_id=application_id
            )
        )
    except Application.DoesNotExist:
        return Response({
            "success": False,
            "err": "Application not found"
        }, status=status.HTTP_404_NOT_FOUND)

    # 確認這筆申請屬於目前登入的廠商
    if str(application.campaign.vendor_id) != str(vendor_id):
        return Response({
            "success": False,
            "err": (
                "This application does not belong "
                "to this vendor"
            )
        }, status=status.HTTP_403_FORBIDDEN)

    # 目前新版 Model 中 application.koc 可以為空值
    if review_result == "approved" and not application.koc_id:
        return Response({
            "success": False,
            "err": "This application does not have a KOC"
        }, status=status.HTTP_400_BAD_REQUEST)

    created_mission = None
    created_coupon = None
    created_chatroom = None

    mission_created = False
    coupon_created = False
    chatroom_created = False

    try:
        with transaction.atomic():
            # 更新接案申請狀態
            application.status = review_result
            update_fields = ["status"]

            if review_result == "rejected":
                application.reject_reason = reject_reason or ""
                update_fields.append("reject_reason")

            application.save(update_fields=update_fields)

            if review_result == "approved":
                # 建立或取得 KOC 任務
                mission, mission_created = (
                    KOCMissionNew.objects.get_or_create(
                        application=application,
                        defaults={
                            # koc 是 ForeignKey，
                            # 使用 koc_id 指定實際主鍵值
                            "koc_id": application.koc_id,
                            # 任務建立時進入撰寫文案階段，
                            # 對齊 constants.STAGE_CODE_MAP 的 "writing"
                            "stage": "writing"
                        }
                    )
                )

                # 舊資料如果已經有任務，但沒有綁定 KOC，
                # 就補上 KOC 關聯
                mission_fields_to_update = []

                if not mission.koc_id:
                    mission.koc_id = application.koc_id
                    mission_fields_to_update.append("koc")

                if not mission.stage:
                    mission.stage = "writing"
                    mission_fields_to_update.append("stage")

                if mission_fields_to_update:
                    mission.save(
                        update_fields=mission_fields_to_update
                    )

                # 建立或取得優惠碼
                coupon = CouponNew.objects.filter(
                    kocmission=mission
                ).first()

                if not coupon:
                    # 取得這個任務所綁定商品的折扣與分潤設定
                    campaign_product = (
                        CampaignProduct.objects
                        .filter(campaign=application.campaign)
                        .first()
                    )

                    if not campaign_product:
                        raise ValueError(
                            "Campaign product configuration not found"
                        )

                    promotion_code = generate_promotion_code(
                        application.koc_id
                    )

                    coupon = CouponNew.objects.create(
                        kocmission=mission,
                        promotion_code=promotion_code,
                        status="inactive",
                        usage_count=0,
                    )

                    coupon_created = True

                # 一個 KOC 任務只能有一個聊天室
                chatroom, chatroom_created = (
                    ChatRoom.objects.get_or_create(
                        kocmission=mission
                    )
                )

                created_mission = mission
                created_coupon = coupon
                created_chatroom = chatroom

    except Exception as error:
        return Response({
            "success": False,
            "err": str(error)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    return Response({
        "success": True,
        "err": "",

        "application_id": application.application_id,
        "status": application.status,

        "kocmission_id": (
            created_mission.kocmission_id
            if created_mission
            else None
        ),
        "mission_created": mission_created,

        "coupon_id": (
            created_coupon.coupon_id
            if created_coupon
            else None
        ),
        "promotion_code": (
            created_coupon.promotion_code
            if created_coupon
            else None
        ),
        "coupon_status": (
            created_coupon.status
            if created_coupon
            else None
        ),
        "coupon_created": coupon_created,

        "room_id": (
            created_chatroom.room_id
            if created_chatroom
            else None
        ),
        "chatroom_created": chatroom_created,

    }, status=status.HTTP_200_OK)



# ──────────────────────────────────────────────
# Vendor 投稿 / 任務成果審核
# ──────────────────────────────────────────────

@api_view(["GET"])
@permission_classes([AllowAny])
def vendor_mission_get_submission_detail(request):
    sync_expired_promoting_missions()

    vendor_id = request.GET.get("vendor_id")
    submission_id = request.GET.get("submission_id")
    kocmission_id = request.GET.get("kocmission_id")
    submission_type = request.GET.get("submission_type")
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

    if submission_type:
        submissions = submissions.filter(submission_type=submission_type)

    submission_list = []

    for submission in submissions:
        mission = submission.kocmission
        application = mission.application
        campaign = application.campaign

        coupon = CouponNew.objects.filter(
            kocmission=mission
        ).first()

        submission_list.append({
            "submission_id": submission.submission_id,
            "submission_type": submission.submission_type,
            "content_url": submission.content_url,
            "text_content": submission.text_content,
            "status": submission.status,
            "vendor_feedback": submission.vendor_feedback,
            "submitted_time": submission.submitted_time,
            "reviewed_time": submission.reviewed_time,
            "ai_result": submission.ai_result,

            "kocmission_id": mission.kocmission_id,
            "stage": mission.stage,
            "koc_id": mission.koc_id,

            "application_id": application.application_id,
            "campaign_id": campaign.campaign_id,
            "campaign_name": campaign.name,

            "promotion_code": (
                coupon.promotion_code
                if coupon
                else None
            ),
            "coupon_status": (
                coupon.status
                if coupon
                else None
            ),
        })

    return Response({
        "success": True,
        "err": "",
        "submissions": submission_list
    }, status=status.HTTP_200_OK)


@api_view(["POST"])
@permission_classes([AllowAny])
def vendor_submission_save_ai_result(request):
    """
    廠商手動重新跑 AI 審核後，把最新結果存回 submission，
    覆蓋掉之前（不管是自動跑的還是之前手動跑的）舊結果。
    URL: /vendor/mission/submission/saveAiResult
    """
    submission_id = request.data.get("submission_id")
    ai_result = request.data.get("ai_result")

    if not submission_id or ai_result is None:
        return Response({
            "success": False,
            "err": "submission_id 與 ai_result 為必填"
        }, status=status.HTTP_400_BAD_REQUEST)

    try:
        submission = Submissions.objects.get(submission_id=submission_id)
    except Submissions.DoesNotExist:
        return Response({
            "success": False,
            "err": "找不到對應的投稿紀錄"
        }, status=status.HTTP_404_NOT_FOUND)

    submission.ai_result = ai_result
    submission.save()

    return Response({
        "success": True,
        "err": ""
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
    vendor_feedback = serializer.validated_data.get(
        "vendor_feedback",
        ""
    )

    # 對應 Submissions.STATUS_CHOICES
    if review_result not in ["approved", "revising"]:
        return Response({
            "success": False,
            "err": "Invalid review result"
        }, status=status.HTTP_400_BAD_REQUEST)

    try:
        submission = Submissions.objects.select_related(
            "kocmission__application__campaign"
        ).get(
            submission_id=submission_id
        )
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

    mission = submission.kocmission

    # 只有 KOC 提交、進入待審核（reviewing）的任務才能被廠商審核，
    # 避免在錯誤的 stage 下誤觸發 stage 轉移
    if mission.stage != "reviewing":
        return Response({
            "success": False,
            "err": (
                "This mission is not currently awaiting review "
                f"(current stage: {mission.stage})"
            )
        }, status=status.HTTP_400_BAD_REQUEST)

    coupon = CouponNew.objects.filter(
        kocmission=submission.kocmission
    ).first()

    # model 中 text 代表文案
    should_activate_coupon = (
        review_result == "approved"
        and submission.submission_type == "text"
    )

    # 文案審核通過前，先確認優惠碼存在
    if should_activate_coupon and not coupon:
        return Response({
            "success": False,
            "err": "Coupon not found for this KOC mission"
        }, status=status.HTTP_404_NOT_FOUND)

    submission.status = review_result
    submission.vendor_feedback = vendor_feedback
    submission.reviewed_time = timezone.now()
    submission.save(
        update_fields=[
            "status",
            "vendor_feedback",
            "reviewed_time"
        ]
    )

    if review_result == "approved":
        if submission.submission_type == "text":
            # 文案審核通過：進入待發佈
            mission.stage = "publishing"
            mission.save(update_fields=["stage"])
        # link 投稿不會經過這裡：連結提交後直接進 promoting（見 koc.py
        # mission_submit），不經廠商審核，mission.stage 到這裡一定不是
        # "reviewing"，會被上面的檢查擋掉。

    elif review_result == "revising":
        # 審核退回：依 submission 的類型回到對應的撰寫階段
        # ('text' -> 'writing'，'link' -> 'publishing')
        # 而不是不分類型都退回 "writing"
        mission.stage = SUBMISSION_TYPE_TO_STAGE.get(
            submission.submission_type,
            "writing"
        )
        mission.save(update_fields=["stage"])

    # 只有文案審核通過才啟用優惠碼
    if should_activate_coupon:
        coupon.status = "active"
        coupon.save(update_fields=["status"])

    return Response({
        "success": True,
        "err": "",
        "submission_id": submission.submission_id,
        "submission_type": submission.submission_type,
        "status": submission.status,
        "vendor_feedback": submission.vendor_feedback,
        "reviewed_time": submission.reviewed_time,
        "kocmission_id": mission.kocmission_id,
        "stage": mission.stage,
        "coupon_id": coupon.coupon_id if coupon else None,
        "promotion_code": coupon.promotion_code if coupon else None,
        "coupon_status": coupon.status if coupon else None,
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

    order_items = list(
        OrderItem.objects.filter(
            product__vendor_id=vendor_id
        ).select_related("order", "product")
    )

    order_ids = {
        item.order_id
        for item in order_items
    }

    shipment_by_order = {
        shipment.order_id: shipment
        for shipment in ShipmentInfo.objects.filter(
            order_id__in=order_ids
        )
    }

    order_map = {}

    for item in order_items:
        order = item.order
        shipment = shipment_by_order.get(order.order_id)

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

                # 宅配才需要實際地址。
                # CVS 即使 detail_address 是空字串，也不能被視為「缺少配送資訊」。
                "has_address": bool(order.address_id),
                "has_shipping_info": bool(
                    (shipment and shipment.logistics_type == "CVS" and shipment.store_id)
                    or order.address_id
                ),

                "logistics_type": (
                    shipment.logistics_type
                    if shipment
                    else None
                ),
                "logistics_sub_type": (
                    shipment.logistics_sub_type
                    if shipment
                    else None
                ),
                "store_name": (
                    shipment.store_name
                    if shipment
                    else None
                ),
                "shipment_status": (
                    shipment.shipping_status
                    if shipment
                    else None
                ),

                "created_at": (
                    order.created_at.isoformat()
                    if order.created_at
                    else None
                ),
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

@api_view(["POST"])
@permission_classes([AllowAny])
def vendor_order_create_logistics(request):
    vendor_id = request.data.get(
        "vendor_id"
    )

    order_id = request.data.get(
        "order_id"
    )

    if not vendor_id or not order_id:
        return Response(
            {
                "success": False,
                "err":
                    "vendor_id、order_id 為必填"
            },
            status=status.HTTP_400_BAD_REQUEST
        )

    order_items = (
        OrderItem.objects
        .filter(
            order_id=order_id,
            product__vendor_id=vendor_id
        )
        .select_related("order")
    )

    if not order_items.exists():
        return Response(
            {
                "success": False,
                "err":
                    "訂單不存在或不屬於此廠商"
            },
            status=status.HTTP_404_NOT_FOUND
        )

    order = order_items[0].order

    if order.payment_status not in (
        "paid",
        "completed"
    ):
        return Response(
            {
                "success": False,
                "err":
                    "訂單尚未付款，不能建立物流單"
            },
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        result = (
            create_ecpay_logistics_order(
                order
            )
        )

        shipment = result["shipment"]

        return Response(
            {
                "success": True,

                "already_created":
                    result["already_created"],

                "order_id":
                    str(order.order_id),

                "merchant_trade_no":
                    shipment.merchant_trade_no,

                "ecpay_logistics_id":
                    shipment.ecpay_logistics_id,

                "booking_note":
                    shipment.booking_note,

                "shipment_status":
                    shipment.shipping_status,
            },
            status=status.HTTP_200_OK
        )

    except ValueError as error:
        return Response(
            {
                "success": False,
                "err": str(error)
            },
            status=status.HTTP_400_BAD_REQUEST
        )

    except Exception as error:
        return Response(
            {
                "success": False,
                "err":
                    f"建立物流單失敗：{error}"
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )



@api_view(["POST"])
@permission_classes([AllowAny])
def vendor_order_query_logistics(request):
    vendor_id = request.data.get("vendor_id")
    order_id = request.data.get("order_id")

    if not vendor_id or not order_id:
        return Response(
            {
                "success": False,
                "err": "vendor_id、order_id 為必填"
            },
            status=status.HTTP_400_BAD_REQUEST
        )

    order_items = (
        OrderItem.objects
        .filter(
            order_id=order_id,
            product__vendor_id=vendor_id
        )
        .select_related("order")
    )

    if not order_items.exists():
        return Response(
            {
                "success": False,
                "err": "訂單不存在或不屬於此廠商"
            },
            status=status.HTTP_404_NOT_FOUND
        )

    order = order_items[0].order

    shipment = (
        ShipmentInfo.objects
        .filter(order=order)
        .first()
    )

    if not shipment:
        return Response(
            {
                "success": False,
                "err": "找不到物流資料"
            },
            status=status.HTTP_404_NOT_FOUND
        )

    if not shipment.ecpay_logistics_id:
        return Response(
            {
                "success": False,
                "err": "此訂單尚未建立綠界物流單"
            },
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        result = query_ecpay_logistics_order(
            shipment
        )

        return Response(
            {
                "success": True,
                "ecpay_logistics_id":
                    shipment.ecpay_logistics_id,

                "cvs_payment_no":
                    result["cvs_payment_no"],

                "cvs_validation_no":
                    result["cvs_validation_no"],

                "delivery_code":
                    result["delivery_code"],

                "booking_note":
                    result["booking_note"],

                "logistics_status":
                    result["logistics_status"],
            },
            status=status.HTTP_200_OK
        )

    except ValueError as error:
        return Response(
            {
                "success": False,
                "err": str(error)
            },
            status=status.HTTP_400_BAD_REQUEST
        )

    except Exception as error:
        return Response(
            {
                "success": False,
                "err": f"查詢物流失敗：{error}"
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )



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

    payment_tx = get_order_payment_status(order)

    shipment = ShipmentInfo.objects.filter(
        order_id=order_id
    ).first()

    # ── 收件資訊 ──
    recipient_name = None
    recipient_phone = None
    address_data = None

    if order.user_id:
        member = User.objects.filter(
            user_id=order.user_id
        ).first()

        if member:
            recipient_name = (
                member.display_name
                or member.name
            )
            recipient_phone = member.phone

    if order.address_id:
        address = Address.objects.filter(
            address_id=order.address_id
        ).first()

        if address:
            address_data = {
                "address_id": address.address_id,
                "phone": address.phone,
                "city": address.city,
                "district": address.district,
                "detail_address": address.detail_address,
                "postal_code": address.postal_code,
            }

            if address.phone:
                recipient_phone = address.phone

            if address.recipient_name:
                recipient_name = address.recipient_name

    shipping_info = {
        "recipient_name": recipient_name,
        "recipient_phone": recipient_phone,
        "address": address_data,
    }

    shipment_data = None

    if shipment:
        shipment_data = {
            "shipment_id": shipment.shipment_id,
            "provider": shipment.provider,
            "logistics_type": shipment.logistics_type,
            "logistics_sub_type": shipment.logistics_sub_type,
            "store_id": shipment.store_id,
            "store_name": shipment.store_name,
            "store_address": shipment.store_address,
            "merchant_trade_no": shipment.merchant_trade_no,
            "cvs_payment_no": shipment.cvs_payment_no,
            "cvs_validation_no": shipment.cvs_validation_no,
            "ecpay_logistics_id": shipment.ecpay_logistics_id,
            "booking_note": shipment.booking_note,
            "shipping_status": shipment.shipping_status,
        }

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

    # 舊版 Payment model 只有走過綠界前的模擬結帳流程才會有紀錄，改成一律從
    # Order + PaymentTransaction 組資料：有 PaymentTransaction（綠界訂單）就用那筆的資訊，
    # 沒有的話（轉帳/貨到付款走的是舊流程，只會寫 Order.payment_status，不會建立 PaymentTransaction）
    # 退回顯示 Order.payment_status，付款方式留空由前端顯示「—」。
    # 注意：轉帳/貨到付款曾經記錄在 Payment.payment_method 的方式名稱（"轉帳"/"貨到付款"）
    # 目前沒有其他地方存了，這裡拿不到、也顯示不出來。
    if payment_tx:
        payment_data = {
            "payment_id": payment_tx.payment_transaction_id,
            "payment_method": "信用卡",
            "payment_status": payment_tx.status,
            "transaction_id": payment_tx.ecpay_trade_no,
            "promotion_code": order.promotion_code,
        }
    else:
        payment_data = {
            "payment_id": None,
            "payment_method": None,
            "payment_status": order.payment_status,
            "transaction_id": None,
            "promotion_code": order.promotion_code,
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

            # 原本收件資料保留
            "shipping_info": shipping_info,

            # 新增：物流詳細資料
            "shipment": shipment_data,

            "created_at": (
                order.created_at.isoformat()
                if order.created_at
                else None
            ),
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

    valid_status = [
        "unshipped",
        "preparing",
        "shipped",
        "delivered",
        "cancelled"
    ]

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

    # Order 與 ShipmentInfo 使用不同的初始狀態名稱：
    # Order: unshipped
    # ShipmentInfo: pending
    shipment_status_map = {
        "unshipped": "pending",
        "preparing": "preparing",
        "shipped": "shipped",
        "delivered": "delivered",
        "cancelled": "cancelled",
    }

    with transaction.atomic():
        order.shipping_status = shipping_status

        update_fields = ["shipping_status"]

        # 第一次轉成 delivered 才寫入 delivered_at，這是廠商鑑賞期結算的起算點，
        # 不能因為之後又被重複呼叫同一個狀態而被覆蓋掉。
        if shipping_status == "delivered" and not order.delivered_at:
            order.delivered_at = timezone.now()
            update_fields.append("delivered_at")

        order.save(update_fields=update_fields)

        shipment = ShipmentInfo.objects.filter(
            order=order
        ).first()

        if shipment:
            shipment.shipping_status = shipment_status_map[
                shipping_status
            ]
            shipment.save(
                update_fields=[
                    "shipping_status",
                    "updated_at"
                ]
            )

    return Response({
        "success": True,
        "err": "",
        "order_id": str(order.order_id),
        "shipping_status": order.shipping_status,
        "shipment_status": (
            shipment.shipping_status
            if shipment
            else None
        )
    }, status=status.HTTP_200_OK)


@api_view(["GET"])
@permission_classes([AllowAny])
def vendor_coupon_get_usage_list(request):
    sync_expired_promoting_missions()

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

    coupons = list(coupons)

    # 折扣/分潤設定要看 CampaignProduct，不是 coupon 自己的欄位；
    # total_commission 也不用 coupon 上的快取欄位，直接從 Earnings 帳本算。
    campaign_ids = {
        coupon.kocmission.application.campaign_id for coupon in coupons
    }
    campaign_product_by_campaign_id = {}
    for cp in CampaignProduct.objects.filter(campaign_id__in=campaign_ids):
        campaign_product_by_campaign_id.setdefault(cp.campaign_id, cp)

    kocmission_ids = [coupon.kocmission_id for coupon in coupons]
    commission_by_kocmission_id = {
        row['kocmission']: row['total']
        for row in Earnings.objects.filter(kocmission_id__in=kocmission_ids)
        .values('kocmission')
        .annotate(total=Sum('amount'))
    }

    coupon_list = []

    for coupon in coupons:
        mission = coupon.kocmission
        application = mission.application
        campaign = application.campaign
        campaign_product = campaign_product_by_campaign_id.get(campaign.campaign_id)
        link_submission = (
            Submissions.objects
            .filter(
                kocmission=mission,
                submission_type="link"
            )
            .order_by("-submitted_time")
            .first()
        )

        coupon_list.append({
            "coupon_id": coupon.coupon_id,
            "promotion_code": coupon.promotion_code,
            "discount_type": (
                campaign_product.discount_type if campaign_product else None
            ),
            "discount_value": (
                str(campaign_product.discount_value) if campaign_product else None
            ),
            "koc_commission_rate": (
                str(campaign_product.koc_commission_rate) if campaign_product else None
            ),
            "status": coupon.status,
            "usage_count": coupon.usage_count,
            "total_commission": commission_by_kocmission_id.get(mission.kocmission_id, 0),

            "kocmission_id": mission.kocmission_id,
            "koc_id": mission.koc_id,
            "stage": mission.stage,

            "application_id": application.application_id,
            "campaign_id": str(campaign.campaign_id),
            "campaign_name": campaign.name,
            "campaign_end_date": campaign.end_date,
            "vendor_id": campaign.vendor_id,

            "content_url": (
                link_submission.content_url
                if link_submission
                else None
            ),

            "link_submission_status": (
                link_submission.status
                if link_submission
                else None
            ),

            "link_submitted_time": (
                link_submission.submitted_time
                if link_submission
                else None
            )
        })

    return Response({
        "success": True,
        "err": "",
        "coupons": coupon_list
    }, status=status.HTTP_200_OK)


# ──────────────────────────────────────────────
# 聊天室 api
# ──────────────────────────────────────────────

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

    valid_status = ["active", "inactive", "expired", "disabled"]

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

    # 只有「啟用中」的優惠碼才能被停用；尚未啟用/已過期/已停用
    # 都不該再被改成 disabled，避免狀態轉換不合理
    if coupon_status == "disabled" and coupon.status != "active":
        return Response({
            "success": False,
            "err": f"Cannot disable a coupon with status '{coupon.status}'"
        }, status=status.HTTP_400_BAD_REQUEST)

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

    # 2. 這個廠商商品相關的訂單明細（只計算已付款訂單，未付款/未完成付款不算實際銷售）
    order_items = OrderItem.objects.filter(
        product__vendor_id=vendor_id,
        order__payment_status__in=["paid", "completed"]
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
    )

    total_coupon_usage = coupon_usage_result["total_coupon_usage"] or 0

    # 不用 coupon.total_commission 這個快取欄位，直接從 Earnings 帳本算才準
    total_commission = Earnings.objects.filter(
        kocmission__application__campaign__vendor_id=vendor_id
    ).aggregate(total=Sum("amount"))["total"] or 0

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
        product__vendor_id=vendor_id,
        order__payment_status__in=["paid", "completed"]
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

        # 不用 coupon.total_commission 這個快取欄位，直接從 Earnings 帳本算才準
        kocmission_ids_for_coupons = CouponNew.objects.filter(
            promotion_code__in=coupon_codes
        ).values_list("kocmission_id", flat=True)

        commission_result = Earnings.objects.filter(
            kocmission_id__in=kocmission_ids_for_coupons
        ).aggregate(total=Sum("amount"))

        products.append({
            "product_id": str(product_id),
            "product_name": item["product__product_name"],
            "quantity_sold": item["quantity_sold"] or 0,
            "total_sales": int(item["total_sales"] or 0),
            "total_orders": item["total_orders"] or 0,
            "coupon_orders": coupon_orders,
            "total_commission": commission_result["total"] or 0
        })

    return Response({
        "success": True,
        "err": "",
        "products": products
    }, status=status.HTTP_200_OK)


@api_view(["POST"])
@permission_classes([AllowAny])
def vendor_chatroom_create(request):
    """
    建立聊天室
    URL: /vendor/chatroom/create

    Request:
    {
        "vendor_id": "V00001",
        "kocmission_id": 1
    }
    """
    vendor_id = request.data.get("vendor_id")
    kocmission_id = request.data.get("kocmission_id")

    if not vendor_id:
        return Response({
            "success": False,
            "err": "vendor_id is required"
        }, status=status.HTTP_400_BAD_REQUEST)

    if not kocmission_id:
        return Response({
            "success": False,
            "err": "kocmission_id is required"
        }, status=status.HTTP_400_BAD_REQUEST)

    try:
        mission = (
            KOCMissionNew.objects
            .select_related(
                "application__campaign",
                "koc__user"
            )
            .get(
                kocmission_id=kocmission_id
            )
        )
    except KOCMissionNew.DoesNotExist:
        return Response({
            "success": False,
            "err": "KOC mission not found"
        }, status=status.HTTP_404_NOT_FOUND)

    campaign = mission.application.campaign

    if str(campaign.vendor_id) != str(vendor_id):
        return Response({
            "success": False,
            "err": "This mission does not belong to this vendor"
        }, status=status.HTTP_403_FORBIDDEN)

    chatroom, created = ChatRoom.objects.get_or_create(
        kocmission=mission
    )

    return Response({
        "success": True,
        "err": "",
        "created": created,
        "room_id": chatroom.room_id,
        "kocmission_id": mission.kocmission_id,
        "koc_id": mission.koc_id,
        "campaign_id": str(campaign.campaign_id),
        "campaign_name": campaign.name,
        "created_at": chatroom.created_at,
    }, status=(
        status.HTTP_201_CREATED
        if created
        else status.HTTP_200_OK
    ))
    

@api_view(["GET"])
@permission_classes([AllowAny])
def vendor_chatroom_getlist(request):
    """
    取得廠商聊天室清單
    URL: /vendor/chatroom/getlist
    """
    sync_expired_promoting_missions()

    vendor_id = request.GET.get("vendor_id")

    if not vendor_id:
        return Response({
            "success": False,
            "err": "vendor_id is required"
        }, status=status.HTTP_400_BAD_REQUEST)

    chatrooms = (
        ChatRoom.objects
        .filter(
            kocmission__application__campaign__vendor_id=vendor_id
        )
        .select_related(
            "kocmission",
            "kocmission__koc",
            "kocmission__koc__user",
            "kocmission__application__campaign"
        )
        .prefetch_related("messages")
        .order_by("-created_at")
    )

    chatroom_list = []

    for chatroom in chatrooms:
        mission = chatroom.kocmission
        campaign = mission.application.campaign

        koc_name = ""
        if mission.koc and mission.koc.user:
            koc_name = (
                mission.koc.user.display_name
                or mission.koc.user.name
            )

        last_message = (
            chatroom.messages
            .order_by("-created_at")
            .first()
        )

        unread_count = chatroom.messages.filter(
            sender_role="koc",
            is_read=False
        ).count()

        chatroom_list.append({
            "room_id": chatroom.room_id,
            "kocmission_id": mission.kocmission_id,
            "koc_id": mission.koc_id,
            "koc_name": koc_name,
            "campaign_id": str(campaign.campaign_id),
            "campaign_name": campaign.name,
            "mission_stage": mission.stage,
            "last_message": (
                last_message.content
                if last_message
                else ""
            ),
            "last_message_time": (
                last_message.created_at
                if last_message
                else chatroom.created_at
            ),
            "last_sender_role": (
                last_message.sender_role
                if last_message
                else None
            ),
            "unread_count": unread_count,
            "created_at": chatroom.created_at,
        })

    chatroom_list.sort(
        key=lambda room: room["last_message_time"],
        reverse=True
    )

    return Response({
        "success": True,
        "err": "",
        "chatrooms": chatroom_list
    }, status=status.HTTP_200_OK)

@api_view(["GET"])
@permission_classes([AllowAny])
def vendor_chatroom_get_messages(request):
    """
    取得聊天室訊息
    URL: /vendor/chatroom/getMessages
    """
    sync_expired_promoting_missions()

    vendor_id = request.GET.get("vendor_id")
    room_id = request.GET.get("room_id")

    if not vendor_id:
        return Response({
            "success": False,
            "err": "vendor_id is required"
        }, status=status.HTTP_400_BAD_REQUEST)

    if not room_id:
        return Response({
            "success": False,
            "err": "room_id is required"
        }, status=status.HTTP_400_BAD_REQUEST)

    try:
        chatroom = (
            ChatRoom.objects
            .select_related(
                "kocmission__application__campaign",
                "kocmission__koc__user"
            )
            .get(room_id=room_id)
        )
    except ChatRoom.DoesNotExist:
        return Response({
            "success": False,
            "err": "Chat room not found"
        }, status=status.HTTP_404_NOT_FOUND)

    campaign = chatroom.kocmission.application.campaign

    if str(campaign.vendor_id) != str(vendor_id):
        return Response({
            "success": False,
            "err": "This chat room does not belong to this vendor"
        }, status=status.HTTP_403_FORBIDDEN)

    messages = chatroom.messages.all()

    message_list = []

    for message in messages:
        message_list.append({
            "message_id": message.message_id,
            "room_id": chatroom.room_id,
            "sender_role": message.sender_role,
            "sender_id": message.sender_id,
            "content": message.content,
            "is_read": message.is_read,
            "created_at": message.created_at,
        })

    mission = chatroom.kocmission

    koc_name = ""
    if mission.koc and mission.koc.user:
        koc_name = (
            mission.koc.user.display_name
            or mission.koc.user.name
        )

    return Response({
        "success": True,
        "err": "",
        "chatroom": {
            "room_id": chatroom.room_id,
            "kocmission_id": mission.kocmission_id,
            "koc_id": mission.koc_id,
            "koc_name": koc_name,
            "campaign_id": str(campaign.campaign_id),
            "campaign_name": campaign.name,
            "mission_stage": mission.stage,
        },
        "messages": message_list
    }, status=status.HTTP_200_OK)

@api_view(["POST"])
@permission_classes([AllowAny])
def vendor_chatroom_send_message(request):
    """
    廠商發送訊息
    URL: /vendor/chatroom/sendMessage

    Request:
    {
        "vendor_id": "V00001",
        "room_id": 1,
        "content": "您好，請修改文案內容"
    }
    """
    vendor_id = request.data.get("vendor_id")
    room_id = request.data.get("room_id")
    content = request.data.get("content", "").strip()

    if not vendor_id:
        return Response({
            "success": False,
            "err": "vendor_id is required"
        }, status=status.HTTP_400_BAD_REQUEST)

    if not room_id:
        return Response({
            "success": False,
            "err": "room_id is required"
        }, status=status.HTTP_400_BAD_REQUEST)

    if not content:
        return Response({
            "success": False,
            "err": "content is required"
        }, status=status.HTTP_400_BAD_REQUEST)

    try:
        chatroom = (
            ChatRoom.objects
            .select_related(
                "kocmission__application__campaign"
            )
            .get(room_id=room_id)
        )
    except ChatRoom.DoesNotExist:
        return Response({
            "success": False,
            "err": "Chat room not found"
        }, status=status.HTTP_404_NOT_FOUND)

    campaign = chatroom.kocmission.application.campaign

    if str(campaign.vendor_id) != str(vendor_id):
        return Response({
            "success": False,
            "err": "This chat room does not belong to this vendor"
        }, status=status.HTTP_403_FORBIDDEN)

    message = Message.objects.create(
        room=chatroom,
        sender_role="vendor",
        sender_id=str(vendor_id),
        content=content,
        is_read=False
    )

    return Response({
        "success": True,
        "err": "",
        "message": {
            "message_id": message.message_id,
            "room_id": chatroom.room_id,
            "sender_role": message.sender_role,
            "sender_id": message.sender_id,
            "content": message.content,
            "is_read": message.is_read,
            "created_at": message.created_at,
        }
    }, status=status.HTTP_201_CREATED)

@api_view(["POST"])
@permission_classes([AllowAny])
def vendor_chatroom_mark_read(request):
    """
    廠商開啟聊天室後，將 KOC 訊息標記為已讀
    URL: /vendor/chatroom/markRead
    """
    vendor_id = request.data.get("vendor_id")
    room_id = request.data.get("room_id")

    if not vendor_id:
        return Response({
            "success": False,
            "err": "vendor_id is required"
        }, status=status.HTTP_400_BAD_REQUEST)

    if not room_id:
        return Response({
            "success": False,
            "err": "room_id is required"
        }, status=status.HTTP_400_BAD_REQUEST)

    try:
        chatroom = (
            ChatRoom.objects
            .select_related(
                "kocmission__application__campaign"
            )
            .get(room_id=room_id)
        )
    except ChatRoom.DoesNotExist:
        return Response({
            "success": False,
            "err": "Chat room not found"
        }, status=status.HTTP_404_NOT_FOUND)

    campaign = chatroom.kocmission.application.campaign

    if str(campaign.vendor_id) != str(vendor_id):
        return Response({
            "success": False,
            "err": "This chat room does not belong to this vendor"
        }, status=status.HTTP_403_FORBIDDEN)

    updated_count = chatroom.messages.filter(
        sender_role="koc",
        is_read=False
    ).update(is_read=True)

    return Response({
        "success": True,
        "err": "",
        "room_id": chatroom.room_id,
        "updated_count": updated_count
    }, status=status.HTTP_200_OK)
    
@api_view(["POST"])
@permission_classes([AllowAny])
def vendor_upload_image(request):
    """
    上傳商品圖片到 R2，回傳圖片網址
    URL: /vendor/product/upload-image
    """
    file_obj = request.FILES.get('image')

    if not file_obj:
        return Response({
            "success": False,
            "err": "請提供圖片檔案（欄位名稱：image）"
        }, status=status.HTTP_400_BAD_REQUEST)

    try:
        image_url = upload_image_to_r2(file_obj, file_obj.name)
        return Response({
            "success": True,
            "image_url": image_url
        }, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({
            "success": False,
            "err": str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# ==============================================================================
# 廠商金流：總覽 / 明細 / 申請撥款
# 比照 koc.py 的 get_revenue_total / get_revenue_history / request_payout 設計
# ==============================================================================

@api_view(["GET"])
@permission_classes([AllowAny])
def get_vendor_finance_overview(request):
    """
    廠商金流總覽：可提領餘額、凍結中(鑑賞期內)金額、是否已綁定銀行帳戶
    URL: GET /vendor/finance/getOverview
    """
    vendor_id = request.query_params.get("vendor_id")

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

    try:
        wallet = vendor.wallet  # VendorWallet 的 related_name='wallet'
        balance_available = wallet.balance_available
        balance_frozen = wallet.balance_frozen
    except VendorWallet.DoesNotExist:
        balance_available = 0
        balance_frozen = 0

    has_bank_account = bool(vendor.bank_account)

    return Response({
        "success": True,
        "err": "",
        "withdrawable_amount": balance_available,
        "pending_amount": balance_frozen,
        "hasBankAccount": has_bank_account,
        "platform_fee_rate": str(vendor.platform_fee_rate),
    }, status=status.HTTP_200_OK)


@api_view(["GET"])
@permission_classes([AllowAny])
def get_vendor_finance_transactions(request):
    """
    廠商金流明細列表（Finance.jsx 表格資料源）
    URL: GET /vendor/finance/getTransactions
    """
    vendor_id = request.query_params.get("vendor_id")

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

    try:
        wallet = vendor.wallet
    except VendorWallet.DoesNotExist:
        return Response({
            "success": True,
            "err": "",
            "transactions": []
        }, status=status.HTTP_200_OK)

    txns = (
        Transactions.objects
        .filter(vendor_wallet=wallet)
        .order_by("-created_at")
    )

    # order_income 的交易才有對應訂單可以查訂單金額；withdraw 是撥款本身，不用查訂單
    order_ids = [
        t.reference_id for t in txns
        if t.reference_type == "order"
    ]
    orders_by_id = {
        str(o.order_id): o
        for o in Order.objects.filter(order_id__in=order_ids)
    }

    account_display = (
        f"{vendor.bank_code} ****{vendor.bank_account[-4:]}"
        if vendor.bank_account else "未設定"
    )

    STATUS_TEXT_MAP = {
        "order_income": ("鑑賞期中", "frozen"),  # 還在凍結餘額，不可勾選申請撥款
        "settle": ("待撥款", "pending"),          # 已轉入可提領餘額，可勾選申請撥款
    }
    PAYOUT_STATUS_TEXT_MAP = {
        "pending": ("撥款確認中", "processing"),
        "completed": ("已完成撥款", "success"),
        "failed": ("款項異常,審核中", "error"),
    }

    # withdraw 類型的交易，實際狀態要看對應的 VendorPayouts.status
    payout_ids = [
        t.reference_id for t in txns
        if t.type == "withdraw" and t.reference_type == "payout"
    ]
    payouts_by_id = {
        str(p.payout_id): p
        for p in VendorPayouts.objects.filter(payout_id__in=payout_ids)
    }

    results = []
    for t in txns:
        order = orders_by_id.get(t.reference_id) if t.reference_type == "order" else None

        if t.type == "withdraw":
            payout = payouts_by_id.get(t.reference_id)
            status_text, status_type = PAYOUT_STATUS_TEXT_MAP.get(
                payout.status if payout else "pending", ("撥款確認中", "processing")
            )
        else:
            status_text, status_type = STATUS_TEXT_MAP.get(t.type, (t.type, "pending"))

        results.append({
            "id": f"{t.transaction_id:08d}",
            "order_id": str(order.order_id) if order else "",
            "type": t.type,
            "amount": t.amount,
            "gross_amount": t.gross_amount,
            "fee_amount": t.fee_amount,
            "date": t.created_at.date().isoformat(),
            "statusText": status_text,
            "statusType": status_type,
            "account": account_display,
        })

    return Response({
        "success": True,
        "err": "",
        "transactions": results
    }, status=status.HTTP_200_OK)


@api_view(["POST"])
@permission_classes([AllowAny])
def vendor_request_payout(request):
    """
    廠商申請撥款：把可提領餘額(balance_available)送出撥款申請
    URL: POST /vendor/finance/requestPayout
    """
    vendor_id = request.data.get("vendor_id")
    amount = request.data.get("amount")

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

    if not vendor.bank_account:
        return Response({
            "success": False,
            "err": "尚未綁定銀行帳戶，無法申請撥款"
        }, status=status.HTTP_400_BAD_REQUEST)

    try:
        wallet = vendor.wallet
    except VendorWallet.DoesNotExist:
        wallet = None

    available = wallet.balance_available if wallet else 0

    if available <= 0:
        return Response({
            "success": False,
            "err": "目前沒有可提領的餘額"
        }, status=status.HTTP_400_BAD_REQUEST)

    payout_amount = int(amount) if amount else available

    if payout_amount <= 0 or payout_amount > available:
        return Response({
            "success": False,
            "err": "申請金額不可小於等於 0 或超過可提領餘額"
        }, status=status.HTTP_400_BAD_REQUEST)

    with transaction.atomic():
        wallet = VendorWallet.objects.select_for_update().get(vendor=vendor)
        wallet.balance_available = wallet.balance_available - payout_amount
        wallet.save(update_fields=["balance_available", "updated_at"])

        payout = VendorPayouts.objects.create(
            vendor=vendor,
            amount=payout_amount,
            payout_date=timezone.localdate(),
            status="pending"
        )

        Transactions.objects.create(
            vendor_wallet=wallet,
            type="withdraw",
            amount=payout_amount,
            reference_type="payout",
            reference_id=str(payout.payout_id)
        )

    return Response({
        "success": True,
        "err": "",
        "payout_id": payout.payout_id,
        "amount": payout.amount,
        "payout_date": payout.payout_date,
        "status": payout.status,
        "remaining_balance": wallet.balance_available,
    }, status=status.HTTP_200_OK)
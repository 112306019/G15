import random, string
from django.contrib.auth.hashers import make_password, check_password
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status
from django.utils import timezone
from datetime import datetime, time, timedelta
from django.db import transaction
from django.db.models import Sum, Count, Min
from decimal import Decimal, ROUND_HALF_UP
from api.r2_storage import upload_image_to_r2

from api.views.constants import (
    STAGE_ALLOWED_SUBMISSION_TYPE,
    sync_expired_promoting_missions,
    restore_order_stock,
    SUBMISSION_REMINDER_DAYS,
    KOC_COMMISSION_RATE_PERCENT,
    VENDOR_SETTLEMENT_RATE_PERCENT,
)
from api.models import (
    Vendor, Product, Campaigns, CampaignProduct, Application, KOCMissionNew,
    Submissions, Order, OrderItem, CouponNew, Earnings, ChatRoom, Message,
    Address, User, ShipmentInfo, VendorEmailVerificationCode, ReturnRequest,
    VendorSettlement, VendorSettlementItem, VendorSettlementPayment,
    VendorReceivable, VendorReceivablePayout,
)
from api.emails import send_vendor_email_verification_email, send_invoice_notification_email, send_submission_revising_email, send_submission_approved_email
from api.notifications import create_notification
from payments.services import get_order_payment_status, is_payment_effectively_failed, pick_relevant_payment, mark_payment_refund_pending
from .platform import reverse_earning_and_vendor_income_for_return

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
            "platform_fee_rate": str(VENDOR_SETTLEMENT_RATE_PERCENT),
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
    if data["discount_value"] <= 0:
        return Response({
            "success": False,
            "err": {
                "discount_value": "折扣數必須大於 0"
            }
        }, status=status.HTTP_400_BAD_REQUEST)

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
                status=data["status"],
                recruit_limit=data.get("recruit_limit")
            )

            CampaignProduct.objects.create(
                campaign=campaign,
                product=product,
                discount_type=data["discount_type"],
                discount_value=data["discount_value"],
                # KOC 分潤比例由平台統一固定，不接受 Vendor 自訂。
                koc_commission_rate=Decimal(str(KOC_COMMISSION_RATE_PERCENT))
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

    # 該活動只要有任何優惠碼已被使用過，折扣與綁定商品就鎖定；
    # 避免事後更動讓已發生的訂單/分潤跟畫面顯示對不起來。
    coupon_used = CouponNew.objects.filter(
        kocmission__application__campaign=campaign,
        usage_count__gt=0
    ).exists()

    if coupon_used and campaign_product:
        locked_field_changed = (
            str(campaign_product.discount_type) != str(data["discount_type"])
            or Decimal(str(campaign_product.discount_value)) != Decimal(str(data["discount_value"]))
            or (
                product_id is not None
                and str(campaign_product.product_id) != str(product_id)
            )
        )

        if locked_field_changed:
            return Response({
                "success": False,
                "err": "此活動已有優惠碼被使用，折扣與綁定商品無法再修改"
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


    if data["discount_value"] <= 0:
        return Response({
            "success": False,
            "err": {
                "discount_value": "折扣數必須大於 0"
            }
        }, status=status.HTTP_400_BAD_REQUEST)

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
                campaign_product.koc_commission_rate = Decimal(str(KOC_COMMISSION_RATE_PERCENT))

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
                    koc_commission_rate=Decimal(str(KOC_COMMISSION_RATE_PERCENT))
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
                "koc_commission_rate": str(KOC_COMMISSION_RATE_PERCENT),
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
            "recruit_limit": campaign.recruit_limit,
            "approved_count": Application.objects.filter(
                campaign=campaign, status="approved"
            ).count(),
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

        koc_violation_count = application.koc.total_violation_count if application.koc else 0

        # 平均一次接案賣出多少：只算這個 KOC 已完成的任務
        # （stage 為 promoting 或 completed），用任務綁定的優惠碼
        # 查出對應訂單，加總訂單金額後除以已完成任務數。
        koc_avg_sales_amount = None
        if application.koc_id:
            completed_missions = KOCMissionNew.objects.filter(
                koc_id=application.koc_id,
                stage__in=["promoting", "completed"],
            )
            completed_count = completed_missions.count()

            if completed_count > 0:
                promo_codes = list(
                    CouponNew.objects
                    .filter(kocmission__in=completed_missions)
                    .values_list("promotion_code", flat=True)
                )
                total_sales = (
                    Order.objects
                    .filter(promotion_code__in=promo_codes)
                    .aggregate(total=Sum("total_amount"))
                    .get("total") or 0
                )
                koc_avg_sales_amount = float(total_sales) / completed_count

        application_list.append({
            "application_id": application.application_id,
            "koc_id": application.koc_id,
            "koc_name": koc_name,
            "koc_violation_count": koc_violation_count,
            "koc_avg_sales_amount": koc_avg_sales_amount,
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
                str(KOC_COMMISSION_RATE_PERCENT) if campaign_product else None
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

    # 招募人數已達上限就不能再通過新申請
    if review_result == "approved" and application.campaign.recruit_limit is not None:
        approved_count = Application.objects.filter(
            campaign=application.campaign,
            status="approved"
        ).exclude(application_id=application.application_id).count()
        if approved_count >= application.campaign.recruit_limit:
            return Response({
                "success": False,
                "err": "此活動招募人數已達上限，無法再通過新的申請"
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
                            "stage": "writing",
                            # 進入 writing 起算 SUBMISSION_REMINDER_DAYS 天的交件提醒期限
                            "submission_deadline_at": timezone.now() + timedelta(days=SUBMISSION_REMINDER_DAYS),
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
                    mission.submission_deadline_at = timezone.now() + timedelta(days=SUBMISSION_REMINDER_DAYS)
                    mission.submission_reminder_sent = False
                    mission_fields_to_update.append("stage")
                    mission_fields_to_update.append("submission_deadline_at")
                    mission_fields_to_update.append("submission_reminder_sent")

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

    if application.koc:
        create_notification(
            user=application.koc.user,
            category="koc",
            title="接案申請已通過" if review_result == "approved" else "接案申請被拒絕",
            body=(
                f"您申請的案件「{application.campaign.name}」已通過審核，可以開始接案囉！"
                if review_result == "approved"
                else f"您申請的案件「{application.campaign.name}」很可惜未通過審核。"
            ),
            reference_type="koc_home",
        )

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
            # 文案審核通過：進入待發佈，重新起算交件提醒期限
            mission.stage = "publishing"
            mission.submission_deadline_at = timezone.now() + timedelta(days=SUBMISSION_REMINDER_DAYS)
            mission.submission_reminder_sent = False
            mission.save(update_fields=["stage", "submission_deadline_at", "submission_reminder_sent"])
            # 寄信通知 KOC 可以去提交貼文連結了；寄信失敗不影響審核本身成功與否。
            try:
                send_submission_approved_email(submission)
            except Exception as e:
                print(f"文案審核通過通知信寄送失敗（submission_id={submission.submission_id}）: {e}")
        # link 投稿不會經過這裡：連結提交後直接進 promoting（見 koc.py
        # mission_submit），不經廠商審核，mission.stage 到這裡一定不是
        # "reviewing"，會被上面的檢查擋掉。

    elif review_result == "revising":
        # 審核退回：依 submission 的類型回到對應的撰寫階段
        # ('text' -> 'writing'，'link' -> 'publishing')
        # 而不是不分類型都退回 "writing"，同時重新起算交件提醒期限
        mission.stage = SUBMISSION_TYPE_TO_STAGE.get(
            submission.submission_type,
            "writing"
        )
        mission.submission_deadline_at = timezone.now() + timedelta(days=SUBMISSION_REMINDER_DAYS)
        mission.submission_reminder_sent = False
        mission.save(update_fields=["stage", "submission_deadline_at", "submission_reminder_sent"])

        # 設定 3 天修改期限，並寄信通知 KOC；寄信失敗不影響審核本身成功與否。
        submission.revising_deadline = timezone.now() + timedelta(days=3)
        submission.revising_reminder_sent = False
        submission.save(update_fields=["revising_deadline", "revising_reminder_sent"])
        try:
            send_submission_revising_email(submission)
        except Exception as e:
            print(f"文案退回通知信寄送失敗（submission_id={submission.submission_id}）: {e}")

    # 只有文案審核通過才啟用優惠碼
    if should_activate_coupon:
        coupon.status = "active"
        coupon.save(update_fields=["status"])

    submission_type_label = "文案" if submission.submission_type == "text" else "作品連結"
    if mission.koc:
        create_notification(
            user=mission.koc.user,
            category="koc",
            title=f"{submission_type_label}審核通過" if review_result == "approved" else f"{submission_type_label}被退回",
            body=(
                f"您提交的{submission_type_label}已通過審核。"
                if review_result == "approved"
                else f"您提交的{submission_type_label}被退回，請依廠商意見修改後重新提交。"
            ),
            reference_type="koc_home",
        )

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

    # 付款失敗（或形同失敗）的訂單不該出現在廠商的訂單管理裡，
    # 跟消費者「我的訂單」用同一套判斷（is_payment_effectively_failed）。
    orders_with_transactions = Order.objects.filter(
        order_id__in=order_ids
    ).prefetch_related("payment_transactions")

    failed_order_ids = set()
    for order in orders_with_transactions:
        payment_tx = pick_relevant_payment(order.payment_transactions.all())
        if payment_tx and is_payment_effectively_failed(payment_tx):
            failed_order_ids.add(order.order_id)

    order_items = [
        item for item in order_items
        if item.order_id not in failed_order_ids
    ]

    order_ids = order_ids - failed_order_ids

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
                "cancel_reason": order.cancel_reason,
                "invoice_number": order.invoice_number,

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

    # 跟訂單列表一致：付款失敗（或形同失敗）的訂單不該讓廠商看到，
    # 直接連結過來也視為找不到，而不是顯示一筆付款失敗的訂單。
    if payment_tx and is_payment_effectively_failed(payment_tx):
        return Response({
            "success": False,
            "err": "Order not found or does not belong to this vendor"
        }, status=status.HTTP_404_NOT_FOUND)

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
            "cancel_reason": order.cancel_reason,
            "address_id": order.address_id,
            "invoice_number": order.invoice_number,

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

    shipping_status_labels = {
        "preparing": "備貨中",
        "shipped": "已出貨",
        "delivered": "已送達",
    }
    if shipping_status in shipping_status_labels:
        create_notification(
            user=order.user,
            category="order",
            title=f"訂單{shipping_status_labels[shipping_status]}",
            body=f"您的訂單出貨狀態已更新為「{shipping_status_labels[shipping_status]}」。",
            reference_type="order",
            reference_id=order.order_id,
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



# ==============================================================================
# 退貨退款：廠商端
# GET  /vendor/return/getlist          列出這個廠商訂單的退貨申請
# POST /vendor/return/review           同意 / 拒絕退貨申請
# POST /vendor/return/confirmReceived  確認收到消費者退回的商品
# POST /vendor/return/processRefund    執行退款（收回分潤/廠商淨額）
# ==============================================================================

def _get_return_request_for_vendor(return_id, vendor_id):
    """
    第一版整張訂單退款只支援單一廠商訂單。

    因此不只是「訂單裡有一項商品屬於此廠商」就算有權限，而是整張訂單
    的所有 OrderItem 都必須屬於目前 vendor_id，避免多廠商訂單中其中一個
    廠商可以替其他廠商的商品一起核准／退款。
    """
    try:
        return_request = ReturnRequest.objects.select_related('order').get(return_id=return_id)
    except ReturnRequest.DoesNotExist:
        return None, Response(
            {"success": False, "err": "找不到此退貨申請"},
            status=status.HTTP_404_NOT_FOUND
        )

    vendor_ids = set(
        OrderItem.objects.filter(order=return_request.order)
        .values_list('product__vendor_id', flat=True)
    )

    if len(vendor_ids) != 1:
        return None, Response(
            {
                "success": False,
                "err": "目前整張訂單退款僅支援單一廠商訂單；此訂單包含多個廠商商品"
            },
            status=status.HTTP_400_BAD_REQUEST
        )

    if str(next(iter(vendor_ids), '')) != str(vendor_id):
        return None, Response(
            {"success": False, "err": "此退貨申請不屬於這個廠商"},
            status=status.HTTP_403_FORBIDDEN
        )

    return return_request, None


@api_view(["GET"])
@permission_classes([AllowAny])
def vendor_return_getlist(request):
    vendor_id = request.GET.get("vendor_id")
    status_filter = request.GET.get("status")

    if not vendor_id:
        return Response(
            {"success": False, "err": "vendor_id is required"},
            status=status.HTTP_400_BAD_REQUEST
        )

    order_ids = OrderItem.objects.filter(
        product__vendor_id=vendor_id
    ).values_list("order_id", flat=True).distinct()

    returns = ReturnRequest.objects.filter(
        order_id__in=order_ids
    ).select_related("order").order_by("-requested_at")

    if status_filter:
        returns = returns.filter(status=status_filter)

    result = []
    for r in returns:
        result.append({
            "return_id": str(r.return_id),
            "order_id": str(r.order_id),
            "user_id": r.user_id,
            "reason": r.reason,
            "description": r.description,
            "status": r.status,
            "requested_amount": str(r.requested_amount),
            "refunded_amount": str(r.refunded_amount) if r.refunded_amount is not None else None,
            "requested_at": r.requested_at,
            'vendor_note': r.vendor_note,
            'vendor_dispute_deadline': r.vendor_dispute_deadline,
            'packing_proof_urls': r.packing_proof_urls,
        })

    return Response(result, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([AllowAny])
def vendor_return_review(request):
    vendor_id = request.data.get('vendor_id')
    return_id = request.data.get('return_id')
    action = request.data.get('action')
    vendor_note = (
        request.data.get('vendor_note')
        or ''
    ).strip()

    if (
        not vendor_id
        or not return_id
        or action not in (
            'approve',
            'reject',
        )
    ):
        return Response(
            {
                'success': False,
                'err': (
                    'vendor_id、return_id 為必填，'
                    'action 必須是 approve 或 reject'
                )
            },
            status=status.HTTP_400_BAD_REQUEST
        )

    # 拒絕退貨時一定要留下理由
    if (
        action == 'reject'
        and not vendor_note
    ):
        return Response(
            {
                'success': False,
                'err': '拒絕退貨時必須填寫拒絕理由'
            },
            status=status.HTTP_400_BAD_REQUEST
        )

    return_request, err = (
        _get_return_request_for_vendor(
            return_id,
            vendor_id
        )
    )

    if err:
        return err

    if (
        return_request.status
        != 'requested'
    ):
        return Response(
            {
                'success': False,
                'err': (
                    '此退貨申請目前狀態是'
                    f'「{return_request.status}」，'
                    '不是申請中，無法審核'
                )
            },
            status=status.HTTP_400_BAD_REQUEST
        )

    if action == 'approve':
        return_request.status = (
            'approved'
        )

        return_request.approved_at = (
            timezone.now()
        )

        return_request.rejected_at = None

    else:
        return_request.status = (
            'rejected'
        )

        return_request.rejected_at = (
            timezone.now()
        )

        return_request.approved_at = None

    return_request.vendor_note = (
        vendor_note
    )

    return_request.save(
        update_fields=[
            'status',
            'approved_at',
            'rejected_at',
            'vendor_note',
        ]
    )

    return Response(
        {
            'success': True,
            'err': '',
            'return_id': str(
                return_request.return_id
            ),
            'status':
                return_request.status,
            'vendor_note':
                return_request.vendor_note,
        },
        status=status.HTTP_200_OK
    )


@api_view(["POST"])
@permission_classes([AllowAny])
def vendor_return_confirm_received(request):
    """廠商確認收到消費者退回的商品，退款流程的下一步。"""
    vendor_id = request.data.get("vendor_id")
    return_id = request.data.get("return_id")

    if not vendor_id or not return_id:
        return Response(
            {"success": False, "err": "vendor_id、return_id 為必填"},
            status=status.HTTP_400_BAD_REQUEST
        )

    return_request, err = _get_return_request_for_vendor(return_id, vendor_id)
    if err:
        return err

    if return_request.status not in ("approved", "returning"):
        return Response(
            {"success": False, "err": f"此退貨申請目前狀態是「{return_request.status}」，尚未到可確認收貨的階段"},
            status=status.HTTP_400_BAD_REQUEST
        )

    now = timezone.now()
    return_request.status = "received"
    return_request.returned_at = now
    # 廠商從現在起 48 小時內，如果認為商品有問題，要提出爭議佐證；逾期視為放棄，
    # 交由平台端（或排程）依原流程走退款。
    return_request.vendor_dispute_deadline = now + timedelta(hours=48)
    return_request.save(update_fields=["status", "returned_at", "vendor_dispute_deadline"])

    return Response({
        "success": True,
        "err": "",
        "return_id": str(return_request.return_id),
        "status": return_request.status,
        "vendor_dispute_deadline": return_request.vendor_dispute_deadline,
    }, status=status.HTTP_200_OK)


@api_view(["POST"])
@permission_classes([AllowAny])
def vendor_order_respond_cancel_request(request):
    """
    廠商核准或拒絕消費者在「備貨中」狀態發起的取消申請。

    approve=True：訂單正式變成 cancelled，商品庫存加回去。
    approve=False：訂單退回 pending，繼續原本的備貨/出貨流程，庫存不變。
    """
    vendor_id = request.data.get("vendor_id")
    order_id = request.data.get("order_id")
    approve = request.data.get("approve")

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

    if approve is None:
        return Response({
            "success": False,
            "err": "approve is required"
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

    if order.order_status != "cancel_requested":
        return Response({
            "success": False,
            "err": "此訂單目前沒有待審核的取消申請"
        }, status=status.HTTP_400_BAD_REQUEST)

    payment_tx = None

    with transaction.atomic():
        if approve:
            order.order_status = "cancelled"
            order.shipping_status = "cancelled"
            order.save(update_fields=["order_status", "shipping_status"])

            shipment = ShipmentInfo.objects.filter(order=order).first()
            if shipment:
                shipment.shipping_status = "cancelled"
                shipment.save(update_fields=["shipping_status", "updated_at"])

            restore_order_stock(order)

            payment_tx = get_order_payment_status(order)
            if payment_tx:
                mark_payment_refund_pending(payment_tx)
        else:
            order.order_status = "pending"
            order.cancel_rejected_at = timezone.now()
            order.save(update_fields=["order_status", "cancel_rejected_at"])

    create_notification(
        user=order.user,
        category="order",
        title="取消申請已核准" if approve else "取消申請被拒絕",
        body=(
            "您的取消訂單申請已核准，訂單已取消。"
            if approve
            else "您的取消訂單申請已被廠商拒絕，訂單將繼續處理。"
        ),
        reference_type="order",
        reference_id=order.order_id,
    )

    return Response({
        "success": True,
        "err": "",
        "order_id": str(order.order_id),
        "order_status": order.order_status,
        "shipping_status": order.shipping_status,
        "cancel_rejected": bool(order.cancel_rejected_at),
        "payment_status": payment_tx.status if payment_tx else None,
    }, status=status.HTTP_200_OK)


@api_view(["POST"])
@permission_classes([AllowAny])
def vendor_return_process_refund(request):
    """
    執行整張訂單全額退款的「平台內部帳務」處理。

    第一版規則：
    - 只支援整張訂單全額退款
    - 退款金額固定等於 ReturnRequest.requested_amount / Order.total_amount
    - 不接受前端傳 refunded_amount 改變退款金額
    - 內部帳務收回成功後，才把 ReturnRequest 標記為 refunded

    目前仍不會自動呼叫綠界退款 API；ecpay_refund_trade_no 僅用來記錄
    外部退款完成後取得的交易識別資料。
    """
    vendor_id = request.data.get("vendor_id")
    return_id = request.data.get("return_id")
    ecpay_refund_trade_no = request.data.get("ecpay_refund_trade_no", "")

    if not vendor_id or not return_id:
        return Response(
            {"success": False, "err": "vendor_id、return_id 為必填"},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        with transaction.atomic():
            try:
                return_request = (
                    ReturnRequest.objects
                    .select_for_update()
                    .select_related('order')
                    .get(return_id=return_id)
                )
            except ReturnRequest.DoesNotExist:
                return Response(
                    {"success": False, "err": "找不到此退貨申請"},
                    status=status.HTTP_404_NOT_FOUND
                )

            # 同一個 transaction 內重新做廠商歸屬檢查，避免並發下資料被改動。
            vendor_ids = set(
                OrderItem.objects.filter(order=return_request.order)
                .values_list('product__vendor_id', flat=True)
            )
            if len(vendor_ids) != 1:
                return Response(
                    {
                        "success": False,
                        "err": "目前整張訂單退款僅支援單一廠商訂單；此訂單包含多個廠商商品"
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )
            if str(next(iter(vendor_ids), '')) != str(vendor_id):
                return Response(
                    {"success": False, "err": "此退貨申請不屬於這個廠商"},
                    status=status.HTTP_403_FORBIDDEN
                )

            if return_request.status not in ("approved", "returning", "received"):
                return Response(
                    {"success": False, "err": f"此退貨申請目前狀態是「{return_request.status}」，尚未到可退款的階段"},
                    status=status.HTTP_400_BAD_REQUEST
                )

            order_total = Decimal(str(return_request.order.total_amount))
            requested_total = Decimal(str(return_request.requested_amount))

            if order_total <= 0:
                return Response(
                    {"success": False, "err": "訂單總金額異常，無法退款"},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # 第一版只支援整張訂單全額退款。若遇到舊資料 requested_amount
            # 不是整張訂單金額，直接拒絕，避免用舊的部分退款資料誤扣帳。
            if requested_total != order_total:
                return Response(
                    {
                        "success": False,
                        "err": "目前只支援整張訂單全額退款，此退貨申請金額與訂單總金額不一致"
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )

            return_request.refunded_amount = order_total
            return_request.ecpay_refund_trade_no = ecpay_refund_trade_no
            return_request.status = "refunding"
            return_request.save(
                update_fields=["refunded_amount", "ecpay_refund_trade_no", "status"]
            )

            reversal_result = reverse_earning_and_vendor_income_for_return(return_request)
            if not reversal_result.get("success"):
                # 丟 exception 讓 transaction.atomic rollback：refunding、refunded_amount、
                # 錢包與 Transactions 都一起回到執行退款前的狀態。
                raise ValueError(
                    reversal_result.get("message") or "退款帳務處理失敗"
                )

            return_request.status = "refunded"
            return_request.refunded_at = timezone.now()
            return_request.save(update_fields=["status", "refunded_at"])

        return Response({
            "success": True,
            "err": "",
            "return_id": str(return_request.return_id),
            "status": return_request.status,
            "refund_scope": "full_order",
            "refunded_amount": str(return_request.refunded_amount),
            "reversal": reversal_result,
        }, status=status.HTTP_200_OK)

    except ValueError as error:
        return Response(
            {"success": False, "err": str(error)},
            status=status.HTTP_400_BAD_REQUEST
        )
    except Exception as error:
        return Response(
            {"success": False, "err": f"退款帳務處理失敗：{error}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(["POST"])
@permission_classes([AllowAny])
def vendor_return_raise_dispute(request):
    """
    廠商確認收到退貨商品後，如果認為商品有問題（故意寄壞的、缺配件等），
    要在 vendor_dispute_deadline（收貨後 48 小時）之前提出爭議，
    附上照片佐證（1~5 張）和文字描述，交由平台端判定。
    """
    vendor_id = request.data.get("vendor_id")
    return_id = request.data.get("return_id")
    photo_urls = request.data.get("photo_urls", [])
    description = request.data.get("description", "")

    if not vendor_id or not return_id:
        return Response(
            {"success": False, "err": "vendor_id、return_id 為必填"},
            status=status.HTTP_400_BAD_REQUEST
        )

    if not description or not description.strip():
        return Response(
            {"success": False, "err": "description 為必填，請說明商品問題"},
            status=status.HTTP_400_BAD_REQUEST
        )

    if not isinstance(photo_urls, list) or not (1 <= len(photo_urls) <= 5):
        return Response(
            {"success": False, "err": "photo_urls 需為 1~5 張照片的網址陣列"},
            status=status.HTTP_400_BAD_REQUEST
        )

    return_request, err = _get_return_request_for_vendor(return_id, vendor_id)
    if err:
        return err

    if return_request.status != "received":
        return Response(
            {"success": False, "err": f"此退貨申請目前狀態是「{return_request.status}」，只有已收貨的申請能提出爭議"},
            status=status.HTTP_400_BAD_REQUEST
        )

    if not return_request.vendor_dispute_deadline or timezone.now() > return_request.vendor_dispute_deadline:
        return Response(
            {"success": False, "err": "爭議提出期限（收貨後 48 小時）已過，無法再提出爭議"},
            status=status.HTTP_400_BAD_REQUEST
        )

    return_request.status = "disputed"
    return_request.vendor_dispute_photo_urls = photo_urls
    return_request.vendor_dispute_description = description.strip()
    return_request.save(update_fields=[
        "status", "vendor_dispute_photo_urls", "vendor_dispute_description"
    ])

    return Response({
        "success": True,
        "err": "",
        "return_id": str(return_request.return_id),
        "status": return_request.status,
    }, status=status.HTTP_200_OK)


@api_view(["POST"])
@permission_classes([AllowAny])
def vendor_order_upload_invoice(request):
    """
    廠商自行用綠界（或其他系統）開立發票後，回填發票號碼給平台。
    平台收到後存進 Order，並寄信通知消費者；平台本身不代開發票，
    不需要碰廠商的金流帳密。
    URL: /vendor/order/uploadInvoice
    """
    vendor_id = request.data.get("vendor_id")
    order_id = request.data.get("order_id")
    invoice_number = request.data.get("invoice_number")

    if not vendor_id or not order_id or not invoice_number:
        return Response({
            "success": False,
            "err": "vendor_id、order_id、invoice_number 為必填"
        }, status=status.HTTP_400_BAD_REQUEST)

    try:
        order = Order.objects.select_related("user").get(order_id=order_id)
    except Order.DoesNotExist:
        return Response({
            "success": False,
            "err": "找不到對應的訂單"
        }, status=status.HTTP_404_NOT_FOUND)

    order.invoice_number = invoice_number
    order.invoice_uploaded_at = timezone.now()
    order.save(update_fields=["invoice_number", "invoice_uploaded_at"])

    try:
        send_invoice_notification_email(order)
    except Exception as e:
        print(f"發票通知信寄送失敗（order_id={order_id}）: {e}")

    create_notification(
        user=order.user,
        category="order",
        title="發票已開立",
        body=f"您的訂單發票號碼為 {invoice_number}。",
        reference_type="order",
        reference_id=order.order_id,
    )

    return Response({
        "success": True,
        "err": "",
        "order_id": str(order.order_id),
        "invoice_number": order.invoice_number
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
                str(KOC_COMMISSION_RATE_PERCENT) if campaign_product else None
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

# ==============================================================================
# KOC 合作成效：總帶貨 GMV / 淨營業額 / ROAS
#
# 歸屬規則跟 KOC 端爆款榜（koc_insights.py）一致：Order.promotion_code 對到
# 這個廠商活動的 CouponNew，且只算該活動 CampaignProduct 裡、屬於這個廠商的商品。
#
# - GMV：曾經付款成功的訂單（paid / completed / refunded），含之後被取消或退款的部分
# - 淨營業額：GMV 扣掉已取消（order_status='cancelled'）與已退款
#   （payment_status='refunded' 或有 status='refunded' 的 ReturnRequest）的訂單
# - 分潤：Earnings 排除 status='cancelled'（退款被收回的分潤不算成本）
# - 平台費：淨營業額 × 系統固定 Vendor 結算費率 15%
# - KOC 分潤屬於平台從這 15% 中支付的成本，不再額外加到 Vendor 成本
# - ROAS：淨營業額 ÷ 平台結算費；分母為 0 時回傳 None，前端顯示「—」
# ==============================================================================
KOC_GMV_PAYMENT_STATUSES = ["paid", "completed", "refunded"]


def _vendor_koc_performance(vendor_id):
    vendor = Vendor.objects.filter(vendor_id=vendor_id).first()
    fee_rate = Decimal(str(VENDOR_SETTLEMENT_RATE_PERCENT)) if vendor else Decimal("0")

    coupon_rows = CouponNew.objects.filter(
        kocmission__application__campaign__vendor_id=vendor_id
    ).values_list(
        "promotion_code",
        "kocmission__application__campaign_id",
    )
    code_campaign = {code: cid for code, cid in coupon_rows}

    campaign_names = dict(
        Campaigns.objects.filter(vendor_id=vendor_id).values_list("campaign_id", "name")
    )

    campaign_products = {}
    for cid, pid in CampaignProduct.objects.filter(
        campaign__vendor_id=vendor_id
    ).values_list("campaign_id", "product_id"):
        campaign_products.setdefault(cid, set()).add(pid)

    orders = {}
    if code_campaign:
        for row in Order.objects.filter(
            promotion_code__in=list(code_campaign.keys()),
            payment_status__in=KOC_GMV_PAYMENT_STATUSES,
        ).values("order_id", "promotion_code", "order_status", "payment_status"):
            orders[row["order_id"]] = row

    refunded_order_ids = set(
        ReturnRequest.objects.filter(
            order_id__in=list(orders.keys()), status="refunded"
        ).values_list("order_id", flat=True)
    ) if orders else set()

    stats = {}

    def _bucket(cid):
        return stats.setdefault(cid, {
            "gmv": Decimal("0"),
            "net_sales": Decimal("0"),
            "orders": set(),
            "net_orders": set(),
            "commission": 0,
        })

    if orders:
        items = OrderItem.objects.filter(
            order_id__in=list(orders.keys()),
            product__vendor_id=vendor_id,
        ).values("order_id", "product_id", "subtotal")

        for it in items:
            order = orders[it["order_id"]]
            cid = code_campaign.get(order["promotion_code"])
            if cid is None or it["product_id"] not in campaign_products.get(cid, ()):
                continue

            amount = Decimal(str(it["subtotal"] or 0))
            b = _bucket(cid)
            b["gmv"] += amount
            b["orders"].add(it["order_id"])

            is_lost = (
                order["order_status"] == "cancelled"
                or order["payment_status"] == "refunded"
                or it["order_id"] in refunded_order_ids
            )
            if not is_lost:
                b["net_sales"] += amount
                b["net_orders"].add(it["order_id"])

    for row in (
        Earnings.objects.filter(kocmission__application__campaign__vendor_id=vendor_id)
        .exclude(status="cancelled")
        .values("kocmission__application__campaign_id")
        .annotate(total=Sum("amount"))
    ):
        _bucket(row["kocmission__application__campaign_id"])["commission"] = row["total"] or 0

    def _summarize(gmv, net_sales, order_count, net_order_count, commission):
        platform_fee = (net_sales * fee_rate / Decimal("100")).quantize(
            Decimal("1"), rounding=ROUND_HALF_UP
        )
        # Vendor 的總平台成本就是 15% 結算費；KOC 分潤是平台從這 15% 中支付，
        # 不能再額外加一次，否則會把 Vendor 成本錯算成 20%。
        cost = platform_fee
        roas = round(float(net_sales / cost), 2) if cost > 0 else None
        return {
            "gmv": int(gmv.quantize(Decimal("1"), rounding=ROUND_HALF_UP)),
            "net_sales": int(net_sales.quantize(Decimal("1"), rounding=ROUND_HALF_UP)),
            "order_count": order_count,
            "net_order_count": net_order_count,
            "commission": int(commission),
            "platform_fee": int(platform_fee),
            "roas": roas,
        }

    breakdown = []
    for cid, b in stats.items():
        row = _summarize(b["gmv"], b["net_sales"], len(b["orders"]), len(b["net_orders"]), b["commission"])
        row["campaign_id"] = str(cid)
        row["campaign_name"] = campaign_names.get(cid, "")
        breakdown.append(row)
    breakdown.sort(key=lambda r: (r["net_sales"], r["gmv"]), reverse=True)

    all_orders = set().union(*(b["orders"] for b in stats.values())) if stats else set()
    all_net_orders = set().union(*(b["net_orders"] for b in stats.values())) if stats else set()
    total = _summarize(
        sum((b["gmv"] for b in stats.values()), Decimal("0")),
        sum((b["net_sales"] for b in stats.values()), Decimal("0")),
        len(all_orders),
        len(all_net_orders),
        sum(b["commission"] for b in stats.values()),
    )
    total["platform_fee_rate"] = str(fee_rate)
    return total, breakdown


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

    # 8. KOC 合作成效（GMV / 淨營業額 / ROAS）
    koc_performance, campaign_breakdown = _vendor_koc_performance(vendor_id)

    return Response({
        "success": True,
        "err": "",
        "analytics": {
            "vendor_id": vendor_id,
            "koc_performance": koc_performance,
            "campaign_breakdown": campaign_breakdown,
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
                "kocmission__application__campaign__vendor",
                "kocmission__koc__user",
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

    # 通知 KOC 有新訊息，reference_type='koc_chat' 帶 kocmission_id，前端點通知
    # 直接跳去 /chat?mission=<id> 打開對應的聊天室（見 ChatPage.jsx）。
    create_notification(
        user=chatroom.kocmission.koc.user,
        category="koc",
        title=f"{campaign.vendor.company_name} 傳送了新訊息",
        body=content,
        reference_type="koc_chat",
        reference_id=chatroom.kocmission_id,
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
# Vendor 商品款應收：ShareBuy → Vendor
#
# 與 15% 平台服務費結算分開：
# - receivable：平台應撥給 Vendor 的商品款
# - settlement：Vendor 應繳給平台的服務費
# ==============================================================================


def _vendor_receivable_paid_amount(receivable):
    return (
        receivable.payouts
        .filter(status='confirmed')
        .aggregate(total=Sum('amount'))['total']
        or Decimal('0.00')
    )


@api_view(["GET"])
@permission_classes([AllowAny])
def get_vendor_receivable_overview(request):
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

    receivables = (
        VendorReceivable.objects
        .filter(vendor=vendor)
        .prefetch_related('payouts')
        .order_by('-created_at')
    )

    pending_amount = Decimal('0.00')
    eligible_amount = Decimal('0.00')
    payout_pending_amount = Decimal('0.00')
    paid_amount = Decimal('0.00')

    pending_count = 0
    eligible_count = 0
    payout_pending_count = 0

    for receivable in receivables:
        confirmed = _vendor_receivable_paid_amount(receivable)
        outstanding = max(
            Decimal('0.00'),
            Decimal(str(receivable.amount_due or 0)) - confirmed
        )

        paid_amount += confirmed

        if receivable.status in ('pending', 'adjusted'):
            pending_amount += outstanding
            pending_count += 1
        elif receivable.status in ('eligible', 'partially_paid'):
            eligible_amount += outstanding
            eligible_count += 1
        elif receivable.status == 'payout_pending':
            payout_pending_amount += outstanding
            payout_pending_count += 1

    return Response({
        "success": True,
        "err": "",
        "pending_goods_amount": float(pending_amount),
        "eligible_goods_amount": float(eligible_amount),
        "payout_pending_amount": float(payout_pending_amount),
        "paid_goods_amount": float(paid_amount),
        "pending_count": pending_count,
        "eligible_count": eligible_count,
        "payout_pending_count": payout_pending_count,
        "hasBankAccount": bool(vendor.bank_account),
        "bank_display": (
            f"{vendor.bank_code} ****{vendor.bank_account[-4:]}"
            if vendor.bank_account else "未設定"
        ),
        "bank_account_name": vendor.bank_account_name or "",
    }, status=status.HTTP_200_OK)


@api_view(["GET"])
@permission_classes([AllowAny])
def get_vendor_receivables(request):
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

    qs = (
        VendorReceivable.objects
        .filter(vendor=vendor)
        .select_related('order')
        .prefetch_related('payouts')
        .order_by('-created_at')
    )

    rows = []
    for receivable in qs:
        paid = _vendor_receivable_paid_amount(receivable)
        outstanding = max(
            Decimal('0.00'),
            Decimal(str(receivable.amount_due or 0)) - paid
        )

        payouts = [{
            "payout_id": p.payout_id,
            "amount": float(p.amount or 0),
            "payout_method": p.payout_method,
            "transaction_reference": p.transaction_reference,
            "status": p.status,
            "payout_at": p.payout_at,
            "confirmed_at": p.confirmed_at,
            "destination_bank_code": p.destination_bank_code,
            "destination_account_last4": p.destination_account_last4,
            "destination_account_name": p.destination_account_name,
        } for p in receivable.payouts.all()]

        rows.append({
            "receivable_id": receivable.receivable_id,
            "order_id": str(receivable.order_id),
            "goods_amount": float(receivable.goods_amount or 0),
            "shipping_amount": float(receivable.shipping_amount or 0),
            "adjustment_amount": float(receivable.adjustment_amount or 0),
            "amount_due": float(receivable.amount_due or 0),
            "amount_paid": float(paid),
            "outstanding_amount": float(outstanding),
            "eligible_at": receivable.eligible_at,
            "paid_at": receivable.paid_at,
            "status": receivable.status,
            "created_at": receivable.created_at,
            "payouts": payouts,
        })

    return Response({
        "success": True,
        "err": "",
        "receivables": rows,
    }, status=status.HTTP_200_OK)



# ==============================================================================
# Vendor 新制結算：總覽 / 結算明細
#
# 新制度：消費者商品款由 Vendor 取得，Vendor 再依有效成交額支付 15% 給 ShareBuy。
# 因此 Vendor 不再有「可提領餘額 / 凍結餘額 / 申請撥款」概念。
# ==============================================================================


def _vendor_settlement_paid_amount(settlement):
    """回傳某張結算單已由 Admin 確認入帳的總金額。"""
    return (
        settlement.payments
        .filter(status="confirmed")
        .aggregate(total=Sum("amount"))["total"]
        or Decimal("0.00")
    )


def _vendor_settlement_outstanding_amount(settlement):
    return max(
        Decimal("0.00"),
        Decimal(str(settlement.amount_due or 0)) - _vendor_settlement_paid_amount(settlement)
    )


@api_view(["GET"])
@permission_classes([AllowAny])
def get_vendor_finance_overview(request):
    """
    Vendor 結算總覽。

    URL: GET /vendor/finance/getOverview?vendor_id=V00001

    回傳重點：
    - outstanding_amount：已開立結算單但尚未繳清的金額
    - pending_settlement_amount：尚未被納入正式結算單的預估服務費
    - paid_amount：歷史已確認繳款金額
    - overdue_amount：已逾期未繳金額
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

    settlements = (
        VendorSettlement.objects
        .filter(vendor=vendor)
        .prefetch_related("payments")
        .order_by("-period_end", "-created_at")
    )

    outstanding_amount = Decimal("0.00")
    overdue_amount = Decimal("0.00")
    paid_amount = Decimal("0.00")
    awaiting_count = 0
    overdue_count = 0
    next_due_date = None

    for settlement in settlements:
        confirmed = _vendor_settlement_paid_amount(settlement)
        paid_amount += confirmed
        outstanding = max(Decimal("0.00"), Decimal(str(settlement.amount_due or 0)) - confirmed)

        if settlement.status in ("awaiting_payment", "partially_paid", "overdue") and outstanding > 0:
            outstanding_amount += outstanding
            awaiting_count += 1
            if settlement.due_date and (next_due_date is None or settlement.due_date < next_due_date):
                next_due_date = settlement.due_date

        if settlement.status == "overdue" and outstanding > 0:
            overdue_amount += outstanding
            overdue_count += 1

    pending_items = VendorSettlementItem.objects.filter(
        vendor=vendor,
        settlement__isnull=True,
        status__in=["pending", "eligible", "adjusted"],
    )
    pending_agg = pending_items.aggregate(
        sales=Sum("sales_amount"),
        fee=Sum("settlement_amount"),
        koc=Sum("koc_amount"),
        platform=Sum("platform_amount"),
    )

    latest = settlements.first()

    return Response({
        "success": True,
        "err": "",
        "settlement_rate": str(VENDOR_SETTLEMENT_RATE_PERCENT),
        "platform_fee_rate": str(VENDOR_SETTLEMENT_RATE_PERCENT),
        "outstanding_amount": float(outstanding_amount),
        "pending_settlement_amount": float(pending_agg["fee"] or 0),
        "pending_sales_amount": float(pending_agg["sales"] or 0),
        "pending_koc_amount": float(pending_agg["koc"] or 0),
        "pending_platform_amount": float(pending_agg["platform"] or 0),
        "paid_amount": float(paid_amount),
        "overdue_amount": float(overdue_amount),
        "awaiting_count": awaiting_count,
        "overdue_count": overdue_count,
        "next_due_date": next_due_date.isoformat() if next_due_date else None,
        "latest_settlement_id": latest.settlement_id if latest else None,
        "latest_settlement_status": latest.status if latest else None,

        # 舊 Finance.jsx 尚未改版前的相容欄位。
        # 第 9 步前端改完後即可刪除。
        "withdrawable_amount": 0,
        "pending_amount": float(pending_agg["fee"] or 0),
        "hasBankAccount": bool(vendor.bank_account),
    }, status=status.HTTP_200_OK)


@api_view(["GET"])
@permission_classes([AllowAny])
def get_vendor_finance_transactions(request):
    """
    Vendor 結算單與結算明細。

    URL: GET /vendor/finance/getTransactions?vendor_id=V00001

    `settlements` 是新前端應使用的正式欄位；`transactions` 暫時保留給舊版
    Finance.jsx，等第 9 步前端換成結算 UI 後即可移除。
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

    settlements = (
        VendorSettlement.objects
        .filter(vendor=vendor)
        .prefetch_related("payments", "items", "items__order")
        .order_by("-period_end", "-created_at")
    )

    status_text = {
        "draft": ("結算中", "pending"),
        "awaiting_payment": ("待繳款", "pending"),
        "partially_paid": ("部分繳款", "processing"),
        "paid": ("已繳清", "success"),
        "overdue": ("已逾期", "error"),
        "cancelled": ("已取消", "cancelled"),
    }

    settlement_rows = []
    compatibility_transactions = []

    for settlement in settlements:
        paid = _vendor_settlement_paid_amount(settlement)
        outstanding = max(Decimal("0.00"), Decimal(str(settlement.amount_due or 0)) - paid)
        label, status_type = status_text.get(settlement.status, (settlement.status, "pending"))

        items = []
        for item in settlement.items.all():
            items.append({
                "settlement_item_id": item.settlement_item_id,
                "order_id": str(item.order_id),
                "sales_amount": float(item.sales_amount or 0),
                "settlement_rate": float(item.settlement_rate or 0),
                "settlement_amount": float(item.settlement_amount or 0),
                "koc_amount": float(item.koc_amount or 0),
                "platform_amount": float(item.platform_amount or 0),
                "status": item.status,
                "eligible_at": item.eligible_at,
            })

        payments = [{
            "payment_id": p.payment_id,
            "amount": float(p.amount or 0),
            "payment_method": p.payment_method,
            "reference_no": p.reference_no,
            "status": p.status,
            "paid_at": p.paid_at,
            "confirmed_at": p.confirmed_at,
        } for p in settlement.payments.all()]

        row = {
            "settlement_id": settlement.settlement_id,
            "period_start": settlement.period_start,
            "period_end": settlement.period_end,
            "gross_sales": float(settlement.gross_sales or 0),
            "adjustment_amount": float(settlement.adjustment_amount or 0),
            "settlement_rate": float(settlement.settlement_rate or 0),
            "amount_due": float(settlement.amount_due or 0),
            "koc_amount": float(settlement.koc_amount or 0),
            "platform_amount": float(settlement.platform_amount or 0),
            "paid_amount": float(paid),
            "outstanding_amount": float(outstanding),
            "status": settlement.status,
            "status_text": label,
            "status_type": status_type,
            "due_date": settlement.due_date,
            "paid_at": settlement.paid_at,
            "created_at": settlement.created_at,
            "items": items,
            "payments": payments,
        }
        settlement_rows.append(row)

        # 舊版 Finance.jsx 相容資料。
        compatibility_transactions.append({
            "id": f"SET-{settlement.settlement_id:06d}",
            "settlement_id": settlement.settlement_id,
            "order_id": "",
            "type": "vendor_settlement",
            "amount": float(settlement.amount_due or 0),
            "gross_amount": float(settlement.gross_sales or 0),
            "fee_amount": float(settlement.amount_due or 0),
            "platform_fee_display": float(settlement.platform_amount or 0),
            "koc_commission_fee_display": float(settlement.koc_amount or 0),
            "date": settlement.created_at.date().isoformat(),
            "dateLabel": "結算日",
            "statusText": label,
            "statusType": status_type,
            "account": "ShareBuy 平台結算",
        })

    pending_items = (
        VendorSettlementItem.objects
        .filter(vendor=vendor, settlement__isnull=True)
        .select_related("order")
        .order_by("-created_at")
    )

    pending_rows = [{
        "settlement_item_id": item.settlement_item_id,
        "order_id": str(item.order_id),
        "sales_amount": float(item.sales_amount or 0),
        "settlement_amount": float(item.settlement_amount or 0),
        "koc_amount": float(item.koc_amount or 0),
        "platform_amount": float(item.platform_amount or 0),
        "status": item.status,
        "eligible_at": item.eligible_at,
        "created_at": item.created_at,
    } for item in pending_items]

    return Response({
        "success": True,
        "err": "",
        "settlements": settlement_rows,
        "pending_items": pending_rows,
        "transactions": compatibility_transactions,
    }, status=status.HTTP_200_OK)


@api_view(["POST"])
@permission_classes([AllowAny])
def vendor_request_payout(request):
    """
    舊 API 相容端點。

    新制度下商品款由 ShareBuy 代收後依 VendorReceivable 流程撥付，
    因此不存在「申請撥款」。第 7 步 urls.py 會把這條舊 route 移除。
    """
    return Response({
        "success": False,
        "err": "新制不採廠商自行申請提領；商品款由平台依 VendorReceivable 流程主動撥付，請至金流頁查看商品款與服務費結算。"
    }, status=status.HTTP_410_GONE)


@api_view(["GET"])
@permission_classes([AllowAny])
def vendor_analytics_funnel(request):
    """
    廠商的 KOC 優惠碼電商漏斗（資料來源：GA4 Data API）。
    URL: GET /vendor/analytics/funnel?vendor_id=...&start_date=...&end_date=...

    只追蹤「KOC 優惠碼帶來的流量」：先查出這個廠商所有活動底下的優惠碼，
    再用優惠碼去 GA4 篩選 select_promotion / begin_checkout / purchase 事件。
    """
    from api.ga4_client import get_coupon_funnel, GA4NotConfigured

    vendor_id = request.GET.get("vendor_id")
    campaign_id = request.GET.get("campaign_id")
    start_date = request.GET.get("start_date") or "30daysAgo"
    end_date = request.GET.get("end_date") or "today"

    if not vendor_id:
        return Response({
            "success": False,
            "err": "vendor_id is required"
        }, status=status.HTTP_400_BAD_REQUEST)

    coupon_qs = CouponNew.objects.filter(
        kocmission__application__campaign__vendor_id=vendor_id
    )
    if campaign_id:
        coupon_qs = coupon_qs.filter(
            kocmission__application__campaign_id=campaign_id
        )
    codes = list(coupon_qs.values_list("promotion_code", flat=True))

    try:
        funnel = get_coupon_funnel(codes, start_date, end_date)
    except GA4NotConfigured as error:
        return Response({
            "success": False,
            "err": str(error)
        }, status=status.HTTP_503_SERVICE_UNAVAILABLE)
    except Exception as error:
        return Response({
            "success": False,
            "err": f"GA4 資料讀取失敗：{error}"
        }, status=status.HTTP_502_BAD_GATEWAY)

    return Response({
        "success": True,
        "err": "",
        "coupon_count": len(codes),
        **funnel,
    }, status=status.HTTP_200_OK)

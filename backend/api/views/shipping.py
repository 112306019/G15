import json
import hashlib
import time
import re
from datetime import datetime
from urllib.parse import urlencode, parse_qs, quote_plus
from urllib.request import Request, urlopen

from api.models import ShipmentInfo, OrderItem, Vendor

from django.conf import settings
from django.http import HttpResponse
from django.views.decorators.csrf import csrf_exempt

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny



# 綠界 GoodsName 不允許的特殊符號。
# Serializer 會阻止新資料進 DB；這裡是為了相容資料庫中已存在的舊商品。
ECPAY_GOODS_NAME_FORBIDDEN_PATTERN = re.compile(
    r"""[\^'`!@#%&*+\\\"<>|_\[\]]"""
)



# 綠界超商取貨收件人姓名驗證
# 中文：2~5 個中文字
# 英文：4~10 個半形英文字母，可包含空白
ECPAY_CVS_CHINESE_NAME_PATTERN = re.compile(r"^[\u4e00-\u9fff]{2,5}$")
ECPAY_CVS_ENGLISH_NAME_PATTERN = re.compile(r"^[A-Za-z ]{4,10}$")


def is_valid_ecpay_cvs_receiver_name(name):
    value = (name or "").strip()

    if not value:
        return False

    if ECPAY_CVS_CHINESE_NAME_PATTERN.fullmatch(value):
        return True

    if ECPAY_CVS_ENGLISH_NAME_PATTERN.fullmatch(value):
        return True

    return False


def sanitize_ecpay_goods_name(name):
    cleaned = ECPAY_GOODS_NAME_FORBIDDEN_PATTERN.sub(
        "",
        str(name or "")
    ).strip()

    return cleaned


def truncate_ecpay_goods_name(value, max_length=50):
    """
    綠界欄位長度：中文/全形字元以 2 計，其餘以 1 計。
    避免直接用 [:50] 導致中文實際長度超標。
    """
    result = []
    length = 0

    for char in str(value or ""):
        char_length = 2 if ord(char) > 127 else 1

        if length + char_length > max_length:
            break

        result.append(char)
        length += char_length

    return "".join(result)


@api_view(["GET"])
@permission_classes([AllowAny])
def ecpay_store_map(request):
    """
    產生綠界 Stage 超商選店表單。
    """

    callback_url = (
        "https://g15-backend.onrender.com"
        "/api/shipping/ecpay/map/callback/"
    )

    print(
        "CallbackURL:",
        callback_url
    )

    html = f"""
    <!DOCTYPE html>
    <html lang="zh-Hant">

    <head>
        <meta charset="UTF-8">
        <title>選擇超商門市</title>
    </head>

    <body onload="document.getElementById('ecpay-form').submit();">

        <p>正在前往綠界超商門市選擇...</p>

        <form
            id="ecpay-form"
            method="post"
            action="{settings.ECPAY_LOGISTICS_MAP_URL}"
        >

            <input
                type="hidden"
                name="MerchantID"
                value="{settings.ECPAY_LOGISTICS_MERCHANT_ID}"
            >

            <input
                type="hidden"
                name="LogisticsType"
                value="CVS"
            >

            <input
                type="hidden"
                name="LogisticsSubType"
                value="{settings.ECPAY_LOGISTICS_SUBTYPE}"
            >

            <input
                type="hidden"
                name="IsCollection"
                value="N"
            >

            <input
                type="hidden"
                name="ServerReplyURL"
                value="{callback_url}"
            >

            <input
                type="hidden"
                name="ExtraData"
                value="G15"
            >

            <input
                type="hidden"
                name="Device"
                value="0"
            >

        </form>

    </body>
    </html>
    """

    return HttpResponse(html)


@csrf_exempt
def ecpay_store_map_callback(request):
    """
    接收綠界選店完成後 POST 回來的門市資料。

    不再使用 window.opener，
    而是把目前 popup 導向 React 的結果頁。
    """

    if request.method != "POST":
        return HttpResponse(
            "Method not allowed",
            status=405
        )

    store_data = {
        "logistics_sub_type": request.POST.get(
            "LogisticsSubType",
            ""
        ),
        "store_id": request.POST.get(
            "CVSStoreID",
            ""
        ),
        "store_name": request.POST.get(
            "CVSStoreName",
            ""
        ),
        "store_address": request.POST.get(
            "CVSAddress",
            ""
        ),
        "store_telephone": request.POST.get(
            "CVSTelephone",
            ""
        ),
        "store_outside": request.POST.get(
            "CVSOutSide",
            ""
        ),
    }

    query_string = urlencode(store_data)

    # React 開發環境
    frontend_url = (
        f"https://g15-frontend.onrender.com/ecpay-store-result"
        f"?{query_string}"
    )

    html = f"""
    <!DOCTYPE html>
    <html lang="zh-Hant">

    <head>
        <meta charset="UTF-8">
        <title>門市選擇完成</title>

        <meta
            http-equiv="refresh"
            content="0;url={frontend_url}"
        >
    </head>

    <body>

        <p>
            門市選擇完成，正在返回結帳頁...
        </p>

        <script>
            window.location.replace(
                {json.dumps(frontend_url)}
            );
        </script>

    </body>
    </html>
    """

    return HttpResponse(html)


def generate_ecpay_check_mac_value(params):
    """
    綠界物流整合 API CheckMacValue
    """

    # CheckMacValue 本身不能參與計算
    filtered = {
        key: str(value)
        for key, value in params.items()
        if key != "CheckMacValue"
        and value is not None
    }

    # 依 key 排序
    sorted_items = sorted(
        filtered.items(),
        key=lambda item: item[0].lower()
    )

    query_string = "&".join(
        f"{key}={value}"
        for key, value in sorted_items
    )

    raw = (
        f"HashKey={settings.ECPAY_LOGISTICS_HASH_KEY}"
        f"&{query_string}"
        f"&HashIV={settings.ECPAY_LOGISTICS_HASH_IV}"
    )

    encoded = quote_plus(
        raw,
        safe="-_.!*()"
    ).lower()

    return hashlib.md5(
        encoded.encode("utf-8")
    ).hexdigest().upper()


def create_ecpay_logistics_order(order):
    try:
        shipment = ShipmentInfo.objects.get(order=order)
    except ShipmentInfo.DoesNotExist:
        raise ValueError("此訂單沒有 ShipmentInfo")

    if shipment.ecpay_logistics_id:
        return {
            "success": True,
            "already_created": True,
            "shipment": shipment,
        }

    if not order.address:
        raise ValueError("此訂單沒有收件人資料")

    order_items = list(
        OrderItem.objects
        .filter(order=order)
        .select_related("product")
    )

    if not order_items:
        raise ValueError("此訂單沒有商品")

    vendor_ids = {
        str(item.product.vendor_id)
        for item in order_items
        if item.product and item.product.vendor_id
    }

    if len(vendor_ids) != 1:
        raise ValueError(
            "目前物流建單僅支援單一廠商訂單；"
            "此訂單包含多個廠商商品，需拆單後才能建立物流單"
        )

    vendor_id = next(iter(vendor_ids))

    vendor = Vendor.objects.filter(
        vendor_id=vendor_id
    ).first()

    if not vendor:
        raise ValueError("找不到訂單所屬廠商")

    sender_name = (vendor.sender_name or "").strip()
    sender_phone = (vendor.sender_phone or "").strip()
    sender_postal_code = (vendor.sender_postal_code or "").strip()
    sender_address = (
        f"{vendor.sender_city or ''}"
        f"{vendor.sender_district or ''}"
        f"{vendor.sender_address or ''}"
    ).strip()

    if not sender_name:
        raise ValueError("廠商尚未設定寄件人姓名")

    if (
        len(sender_phone) != 10
        or not sender_phone.startswith("09")
        or not sender_phone.isdigit()
    ):
        raise ValueError(
            "廠商寄件人手機必須為 09 開頭的 10 碼手機號碼"
        )

    receiver_name = (
        order.address.recipient_name or ""
    ).strip()

    receiver_phone = (
        order.address.phone or ""
    ).strip()

    if not receiver_name:
        raise ValueError("缺少收件人姓名")

    if (
        len(receiver_phone) != 10
        or not receiver_phone.startswith("09")
        or not receiver_phone.isdigit()
    ):
        raise ValueError(
            "收件人手機必須為 09 開頭的 10 碼手機號碼"
        )

    if not settings.ECPAY_LOGISTICS_REPLY_URL:
        raise ValueError(
            "尚未設定 ECPAY_LOGISTICS_REPLY_URL"
        )

    goods_names = [
        sanitize_ecpay_goods_name(
            item.product.product_name
        )
        for item in order_items
    ]

    goods_names = [
        name
        for name in goods_names
        if name
    ]

    if not goods_names:
        raise ValueError(
            "商品名稱清理後為空，請先修改商品名稱"
        )

    goods_name = truncate_ecpay_goods_name(
        ",".join(goods_names),
        50
    )

    merchant_trade_no = (
        "G15"
        + datetime.now().strftime("%y%m%d%H%M%S")
        + str(shipment.shipment_id)
    )[:20]

    params = {
        "MerchantID": settings.ECPAY_LOGISTICS_MERCHANT_ID,
        "MerchantTradeNo": merchant_trade_no,
        "MerchantTradeDate": datetime.now().strftime("%Y/%m/%d %H:%M:%S"),
        "GoodsAmount": int(order.total_amount),
        "IsCollection": "N",
        "GoodsName": goods_name,
        "SenderName": sender_name,
        "SenderCellPhone": sender_phone,
        "ReceiverName": receiver_name,
        "ReceiverCellPhone": receiver_phone,
        "ServerReplyURL": settings.ECPAY_LOGISTICS_REPLY_URL,
    }

    # 7-ELEVEN C2C
    if (
        shipment.logistics_type == "CVS"
        and shipment.logistics_sub_type == "UNIMARTC2C"
    ):
        if not shipment.store_id:
            raise ValueError("此超商訂單沒有取貨門市")

        if not is_valid_ecpay_cvs_receiver_name(receiver_name):
            raise ValueError(
                "7-ELEVEN 收件人姓名格式不符合規定："
                "中文需 2～5 個字，"
                "英文需 4～10 個半形英文字母"
            )

        params.update({
            "LogisticsType": "CVS",
            "LogisticsSubType": "UNIMARTC2C",
            "CollectionAmount": 0,
            "ReceiverStoreID": shipment.store_id,
        })

    # 黑貓宅配
    elif (
        shipment.logistics_type == "HOME"
        and shipment.logistics_sub_type == "TCAT"
    ):
        receiver_postal_code = (
            order.address.postal_code or ""
        ).strip()

        receiver_address = (
            f"{order.address.city or ''}"
            f"{order.address.district or ''}"
            f"{order.address.detail_address or ''}"
        ).strip()

        if not sender_postal_code:
            raise ValueError("廠商尚未設定寄件郵遞區號")

        if len(sender_address) <= 6:
            raise ValueError("廠商寄件地址不完整")

        if not receiver_postal_code:
            raise ValueError("宅配訂單缺少收件人郵遞區號")

        if len(receiver_address) <= 6:
            raise ValueError("宅配收件地址不完整")

        params.update({
            "LogisticsType": "HOME",
            "LogisticsSubType": "TCAT",
            "SenderZipCode": sender_postal_code,
            "SenderAddress": sender_address,
            "ReceiverZipCode": receiver_postal_code,
            "ReceiverAddress": receiver_address,
            "Temperature": "0001",
            "Specification": "0001",
            "ScheduledPickupTime": "4",
            "ScheduledDeliveryTime": "4",
            "Distance": "00",
        })

    else:
        raise ValueError("目前不支援此物流方式")

    params["CheckMacValue"] = (
        generate_ecpay_check_mac_value(params)
    )

    encoded_data = urlencode(params).encode("utf-8")

    request = Request(
        settings.ECPAY_LOGISTICS_CREATE_URL,
        data=encoded_data,
        headers={
            "Content-Type": "application/x-www-form-urlencoded",
        },
        method="POST",
    )

    try:
        with urlopen(request, timeout=30) as response:
            raw_response = response.read().decode("utf-8")
    except Exception as error:
        raise ValueError(
            f"呼叫綠界物流 API 失敗：{error}"
        )

    if not raw_response.startswith("1|"):
        raise ValueError(
            f"綠界建立物流單失敗：{raw_response}"
        )

    response_query = raw_response.split("|", 1)[1]

    response_data = {
        key: values[0]
        for key, values in parse_qs(
            response_query,
            keep_blank_values=True
        ).items()
    }

    logistics_id = response_data.get("AllPayLogisticsID")

    returned_trade_no = (
        response_data.get("MerchantTradeNo")
        or merchant_trade_no
    )

    if not logistics_id:
        raise ValueError(
            "綠界回傳成功，但沒有 AllPayLogisticsID"
        )

    shipment.merchant_trade_no = returned_trade_no
    shipment.ecpay_logistics_id = logistics_id
    shipment.booking_note = (
        response_data.get("BookingNote") or None
    )
    shipment.shipping_status = "created"

    shipment.save(
        update_fields=[
            "merchant_trade_no",
            "ecpay_logistics_id",
            "booking_note",
            "shipping_status",
            "updated_at",
        ]
    )

    return {
        "success": True,
        "already_created": False,
        "shipment": shipment,
        "response": response_data,
    }

@csrf_exempt
def ecpay_logistics_status_callback(request):
    if request.method != "POST":
        return HttpResponse(
            "Method not allowed",
            status=405
        )

    received = request.POST.dict()

    received_check_mac = received.pop(
        "CheckMacValue",
        ""
    )

    # 驗證綠界 CheckMacValue
    expected_check_mac = (
        generate_ecpay_check_mac_value(
            received
        )
    )

    if (
        not received_check_mac
        or received_check_mac.upper()
        != expected_check_mac.upper()
    ):
        print(
            "ECPay callback CheckMacValue 驗證失敗"
        )

        return HttpResponse(
            "0|CheckMacValue Error",
            status=400
        )

    logistics_id = received.get(
        "AllPayLogisticsID"
    )

    merchant_trade_no = received.get(
        "MerchantTradeNo"
    )

    rtn_code = received.get(
        "RtnCode"
    )

    rtn_msg = received.get(
        "RtnMsg",
        ""
    )

    shipment = None

    if logistics_id:
        shipment = (
            ShipmentInfo.objects
            .filter(
                ecpay_logistics_id=
                    logistics_id
            )
            .first()
        )

    if (
        not shipment
        and merchant_trade_no
    ):
        shipment = (
            ShipmentInfo.objects
            .filter(
                merchant_trade_no=
                    merchant_trade_no
            )
            .first()
        )

    if not shipment:
        print(
            "找不到對應 ShipmentInfo:",
            logistics_id,
            merchant_trade_no
        )

        # 即使找不到也先回 1|OK，
        # 避免綠界持續重送相同通知
        return HttpResponse("1|OK")

    print(
        "ECPay Logistics Callback:",
        {
            "shipment_id":
                shipment.shipment_id,
            "logistics_id":
                logistics_id,
            "rtn_code":
                rtn_code,
            "rtn_msg":
                rtn_msg,
        }
    )

    # ---------------------------------
    # 狀態映射
    # ---------------------------------
    #
    # 正式環境收到 callback 時，
    # 再依實際 RtnCode / RtnMsg
    # 對應平台物流狀態。
    #
    # Stage 不會模擬貨態通知，
    # 因此目前先保存 callback 成功，
    # 不自行假造物流公司的狀態。

    if shipment.shipping_status == "pending":
        shipment.shipping_status = "created"

        shipment.save(
            update_fields=[
                "shipping_status",
                "updated_at",
            ]
        )

    return HttpResponse("1|OK")


def query_ecpay_logistics_order(shipment):
    if not shipment.ecpay_logistics_id:
        raise ValueError(
            "此物流單尚未有綠界物流編號"
        )

    params = {
        "MerchantID":
            settings.ECPAY_LOGISTICS_MERCHANT_ID,

        "AllPayLogisticsID":
            shipment.ecpay_logistics_id,

        "TimeStamp":
            str(int(time.time())),
    }

    params["CheckMacValue"] = (
        generate_ecpay_check_mac_value(
            params
        )
    )

    request_data = urlencode(
        params
    ).encode("utf-8")

    req = Request(
        settings.ECPAY_LOGISTICS_QUERY_URL,
        data=request_data,
        headers={
            "Content-Type":
                "application/x-www-form-urlencoded"
        },
        method="POST"
    )

    try:
        with urlopen(
            req,
            timeout=30
        ) as response:
            raw_response = (
                response
                .read()
                .decode("utf-8")
            )

    except Exception as error:
        raise ValueError(
            f"查詢綠界物流失敗：{error}"
        )

    response_data = {
        key: values[0]
        for key, values in parse_qs(
            raw_response,
            keep_blank_values=True
        ).items()
    }

    # --------------------------
    # 驗證綠界回傳 CheckMacValue
    # --------------------------

    received_check_mac = (
        response_data.pop(
            "CheckMacValue",
            ""
        )
    )

    if received_check_mac:
        expected_check_mac = (
            generate_ecpay_check_mac_value(
                response_data
            )
        )

        if (
            received_check_mac.upper()
            != expected_check_mac.upper()
        ):
            raise ValueError(
                "綠界查詢結果 CheckMacValue 驗證失敗"
            )

    # --------------------------
    # 取得寄貨編號
    # --------------------------

    cvs_payment_no = (
        response_data.get(
            "CVSPaymentNo"
        )
        or ""
    )

    cvs_validation_no = (
        response_data.get(
            "CVSValidationNo"
        )
        or ""
    )

    logistics_status = (
        response_data.get(
            "LogisticsStatus"
        )
        or ""
    )

    shipment.cvs_payment_no = (
        cvs_payment_no or None
    )

    shipment.cvs_validation_no = (
        cvs_validation_no or None
    )

    booking_note = (
        response_data.get("BookingNote")
        or response_data.get("ShipmentNo")
        or ""
    )

    if (
        shipment.logistics_type == "HOME"
        and booking_note
    ):
        shipment.booking_note = booking_note

    shipment.save(
        update_fields=[
            "cvs_payment_no",
            "cvs_validation_no",
            "booking_note",
            "updated_at",
        ]
    )

    return {
        "shipment": shipment,
        "cvs_payment_no":
            cvs_payment_no,
        "cvs_validation_no":
            cvs_validation_no,
        "delivery_code":
            (
                cvs_payment_no
                + cvs_validation_no
            ),
        "logistics_status":
            logistics_status,
        "booking_note":
            shipment.booking_note or "",
        "ecpay_response":
            response_data,
    }
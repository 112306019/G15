import json
import hashlib
import time
from datetime import datetime
from urllib.parse import urlencode, parse_qs, quote_plus
from urllib.request import Request, urlopen
from urllib.parse import urlencode

from api.models import ShipmentInfo, OrderItem

from django.conf import settings
from django.http import HttpResponse
from django.views.decorators.csrf import csrf_exempt

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny


@api_view(["GET"])
@permission_classes([AllowAny])
def ecpay_store_map(request):
    """
    產生綠界 Stage 超商選店表單。
    """

    callback_url = request.build_absolute_uri(
        "/api/shipping/ecpay/map/callback/"
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
        f"http://localhost:5173/ecpay-store-result"
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
        shipment = ShipmentInfo.objects.get(
            order=order
        )
    except ShipmentInfo.DoesNotExist:
        raise ValueError("此訂單沒有 ShipmentInfo")

    # 目前先只做 7-ELEVEN C2C
    if shipment.logistics_type != "CVS":
        raise ValueError("目前只支援超商物流")

    if shipment.logistics_sub_type != "UNIMARTC2C":
        raise ValueError("目前只支援 7-ELEVEN C2C")

    # 避免重複建單
    if shipment.ecpay_logistics_id:
        return {
            "success": True,
            "already_created": True,
            "shipment": shipment,
        }

    if not shipment.store_id:
        raise ValueError("此訂單沒有取貨門市")

    if not order.address:
        raise ValueError("此訂單沒有收件人資料")

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

    order_items = (
        OrderItem.objects
        .filter(order=order)
        .select_related("product")
    )

    goods_names = [
        item.product.product_name
        for item in order_items
    ]

    goods_name = ",".join(goods_names)

    # 綠界 GoodsName 最大 50
    goods_name = goods_name[:50]

    # 自己產生唯一 MerchantTradeNo
    #
    # 最多 20 字元
    merchant_trade_no = (
        "G15"
        + datetime.now().strftime(
            "%y%m%d%H%M%S"
        )
        + str(shipment.shipment_id)
    )[:20]

    params = {
        "MerchantID":
            settings.ECPAY_LOGISTICS_MERCHANT_ID,

        "MerchantTradeNo":
            merchant_trade_no,

        "MerchantTradeDate":
            datetime.now().strftime(
                "%Y/%m/%d %H:%M:%S"
            ),

        "LogisticsType":
            "CVS",

        "LogisticsSubType":
            shipment.logistics_sub_type,

        "GoodsAmount":
            int(order.total_amount),

        "CollectionAmount":
            0,

        "IsCollection":
            "N",

        "GoodsName":
            goods_name,

        "SenderName":
            settings.ECPAY_LOGISTICS_SENDER_NAME,

        "SenderCellPhone":
            settings.ECPAY_LOGISTICS_SENDER_PHONE,

        "ReceiverName":
            receiver_name,

        "ReceiverCellPhone":
            receiver_phone,

        "ServerReplyURL":
            settings.ECPAY_LOGISTICS_REPLY_URL,

        "ReceiverStoreID":
            shipment.store_id,
    }

    params["CheckMacValue"] = (
        generate_ecpay_check_mac_value(
            params
        )
    )

    encoded_data = urlencode(
        params
    ).encode("utf-8")

    request = Request(
        settings.ECPAY_LOGISTICS_CREATE_URL,
        data=encoded_data,
        headers={
            "Content-Type":
                "application/x-www-form-urlencoded",
        },
        method="POST",
    )

    try:
        with urlopen(
            request,
            timeout=30
        ) as response:
            raw_response = (
                response
                .read()
                .decode("utf-8")
            )

    except Exception as error:
        raise ValueError(
            f"呼叫綠界物流 API 失敗：{error}"
        )

    # 綠界成功：
    # 1|MerchantID=...&AllPayLogisticsID=...
    if not raw_response.startswith("1|"):
        raise ValueError(
            f"綠界建立物流單失敗：{raw_response}"
        )

    response_query = raw_response.split(
        "|",
        1
    )[1]

    response_data = {
        key: values[0]
        for key, values in parse_qs(
            response_query,
            keep_blank_values=True
        ).items()
    }

    logistics_id = (
        response_data.get(
            "AllPayLogisticsID"
        )
    )

    returned_trade_no = (
        response_data.get(
            "MerchantTradeNo"
        )
        or merchant_trade_no
    )

    if not logistics_id:
        raise ValueError(
            "綠界回傳成功，但沒有 AllPayLogisticsID"
        )

    shipment.merchant_trade_no = (
        returned_trade_no
    )

    shipment.ecpay_logistics_id = (
        logistics_id
    )

    shipment.shipping_status = (
        "created"
    )

    shipment.save(
        update_fields=[
            "merchant_trade_no",
            "ecpay_logistics_id",
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

    shipment.save(
        update_fields=[
            "cvs_payment_no",
            "cvs_validation_no",
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
        "ecpay_response":
            response_data,
    }
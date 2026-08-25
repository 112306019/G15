import logging

from django.conf import settings
from django.core.exceptions import ImproperlyConfigured, ValidationError
from django.http import HttpResponse
from django.shortcuts import redirect
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_GET, require_POST
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from api.models import Order

from .models import PaymentTransaction
from .services import (
    build_payment_form,
    create_order_payment,
    get_order_payment_status,
    mark_payment_abandoned,
    process_ecpay_callback,
    verify_check_mac_value,
)

logger = logging.getLogger("payments")


@api_view(["POST"])
@permission_classes([AllowAny])
def create_payment(request):
    """
    消費者結帳：針對一筆已存在的 Order 建立 PaymentTransaction，並回傳綠界 AIO 付款表單資料，
    前端拿到 {action, method, fields} 後直接 auto-submit 導向綠界刷卡頁。
    金額、ItemName 都是後端從 Order/OrderItem 組出來的，不接受前端傳金額，避免被竄改。
    """
    order_id = request.data.get("Order_id")
    if not order_id:
        return Response({"success": False, "err": "Order_id 為必填"}, status=status.HTTP_400_BAD_REQUEST)

    try:
        order = Order.objects.get(order_id=order_id)
    except Order.DoesNotExist:
        return Response({"success": False, "err": "訂單不存在"}, status=status.HTTP_404_NOT_FOUND)

    if order.payment_transactions.filter(status=PaymentTransaction.STATUS_PAID).exists():
        return Response({"success": False, "err": "此訂單已完成付款"}, status=status.HTTP_400_BAD_REQUEST)

    try:
        payment = create_order_payment(order)
        form = build_payment_form(payment)
    except ValueError as e:
        return Response({"success": False, "err": str(e)}, status=status.HTTP_400_BAD_REQUEST)
    except ImproperlyConfigured:
        logger.exception("ECPay 設定缺漏，無法建立付款")
        raise

    return Response({
        "success": True,
        "action": form["action"],
        "method": form["method"],
        "fields": form["fields"],
    }, status=status.HTTP_200_OK)


@csrf_exempt
@require_POST
def ecpay_return(request):
    """
    綠界 AIO 金流 ReturnURL：Server-to-Server Form POST 付款結果通知。

    不論驗證/處理成功與否都必須回應 HTTP 200 + 純文字 "1|OK"，
    否則綠界每 5-15 分鐘重試一次、最多每日 4 次。純 Django view（非 DRF），
    確保回應內容不會被 DRF 的 renderer 動到格式。
    """
    params = request.POST.dict()

    if not verify_check_mac_value(params):
        logger.error(
            "ECPay callback CheckMacValue 驗證失敗: MerchantTradeNo=%s",
            params.get("MerchantTradeNo"),
        )
        return HttpResponse("1|OK", content_type="text/plain")

    process_ecpay_callback(params)

    return HttpResponse("1|OK", content_type="text/plain")


@csrf_exempt
@require_POST
def ecpay_order_result(request):
    """
    綠界 AIO 金流 OrderResultURL：消費者付款完成後，「瀏覽器」被導向這裡（Form POST 帶付款結果）。

    這裡只負責「認出是哪筆交易、把瀏覽器導回前端結果頁」，刻意不在這裡寫入任何 PaymentTransaction 狀態——
    真正的付款狀態一律由 ReturnURL 那條 Server-to-Server 通知（process_ecpay_callback）決定；
    綠界官方文件明載 ReturnURL 和 OrderResultURL 兩者到達順序沒有保證，這裡若也寫狀態，
    有機會用還沒驗證過、或比 ReturnURL 更舊的資料覆蓋掉正確結果。
    前端結果頁一律呼叫 GET /api/payments/status/ 取得目前真正的狀態，不採信這裡轉跳網址帶的任何欄位。
    """
    params = request.POST.dict()
    merchant_trade_no = params.get("MerchantTradeNo")

    if not verify_check_mac_value(params):
        logger.error(
            "ECPay OrderResultURL CheckMacValue 驗證失敗: MerchantTradeNo=%s", merchant_trade_no,
        )
        return redirect(f"{settings.FRONTEND_BASE_URL}/checkout/result")

    payment = PaymentTransaction.objects.filter(merchant_trade_no=merchant_trade_no).first()
    if not payment:
        logger.error(
            "ECPay OrderResultURL 找不到對應的 PaymentTransaction: MerchantTradeNo=%s", merchant_trade_no,
        )
        return redirect(f"{settings.FRONTEND_BASE_URL}/checkout/result")

    return redirect(f"{settings.FRONTEND_BASE_URL}/checkout/result?order_id={payment.order_id}")


@require_GET
def ecpay_client_back(request):
    """
    綠界 AIO 金流 ClientBackURL：消費者在付款頁主動按「返回商店」時導回這裡
    （例如 3D/簡訊 OTP 驗證失敗後顯示的那顆按鈕）。

    官方規格明講這個導回不會帶任何付款結果、也不會附上可辨識交易的參數，
    所以這裡讀的 merchant_trade_no 是我們自己在 build_payment_form 塞進網址的，
    不是綠界簽章過的資料——不需要也無法驗證 CheckMacValue，純粹是「使用者自己
    說要放棄」的訊號。把對應的 PaymentTransaction 標成 failed（僅在還是 pending
    時才動），避免這筆訂單永遠卡在 pending、一直出現在消費者的訂單列表裡。
    """
    merchant_trade_no = request.GET.get("merchant_trade_no")
    if merchant_trade_no:
        mark_payment_abandoned(merchant_trade_no)
    else:
        logger.error("ECPay ClientBackURL 沒有帶 merchant_trade_no，無法辨識是哪一筆交易")

    return redirect(f"{settings.FRONTEND_BASE_URL}/cart")


@api_view(["GET"])
@permission_classes([AllowAny])
def get_payment_status(request):
    """
    前端付款結果頁輪詢用：回傳一筆 Order 目前真正的付款狀態。
    是「確認付款成功」唯一該信任的來源——OrderResultURL 轉跳網址上的參數不算數。
    """
    order_id = request.query_params.get("order_id") or request.query_params.get("Order_id")
    if not order_id:
        return Response({"success": False, "err": "order_id 為必填"}, status=status.HTTP_400_BAD_REQUEST)

    try:
        order = Order.objects.get(order_id=order_id)
    except (Order.DoesNotExist, ValueError, ValidationError):
        return Response({"success": False, "err": "訂單不存在"}, status=status.HTTP_404_NOT_FOUND)

    payment = get_order_payment_status(order)
    if not payment:
        return Response({"success": False, "err": "此訂單尚無付款紀錄"}, status=status.HTTP_404_NOT_FOUND)

    return Response({
        "success": True,
        "order_id": str(order.order_id),
        "status": payment.status,
        "merchant_trade_no": payment.merchant_trade_no,
    }, status=status.HTTP_200_OK)

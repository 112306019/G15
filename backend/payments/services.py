"""
綠界 ECPay AIO 金流 — 商品訂單付款服務層。

綠界官方只提供 PHP SDK（composer require ecpay/sdk），沒有 Python 版本，
所以這裡是照 PHP SDK 的邏輯（CheckMacValueService + AutoSubmitFormWithCmvService）手刻對應實作：
組裝參數 → 計算 CheckMacValue（CMV-SHA256）→ 產生前端可直接 auto-submit 的付款表單資料。

Source: web_fetch https://developers.ecpay.com.tw/2862.md 2026-08-12（產生訂單參數表）
"""

import hashlib
import hmac
import logging
import secrets
import time
import urllib.parse
from datetime import datetime
from decimal import Decimal
from zoneinfo import ZoneInfo

from django.conf import settings
from django.core.exceptions import ImproperlyConfigured
from django.db import transaction

from api.models import Order

from .models import PaymentTransaction

logger = logging.getLogger("payments")

TW_TZ = ZoneInfo("Asia/Taipei")

ECPAY_AIO_CHECKOUT_URL = {
    "stage": "https://payment-stage.ecpay.com.tw/Cashier/AioCheckOut/V5",
    "production": "https://payment.ecpay.com.tw/Cashier/AioCheckOut/V5",
}


def _ecpay_url_encode(source: str) -> str:
    """對應 ECPay UrlService::ecpayUrlEncode()。僅用於 CheckMacValue，不可用於 AES 加密（見 guides/14）"""
    encoded = urllib.parse.quote_plus(source)  # 空格 → +
    encoded = encoded.replace("~", "%7E")  # Python quote_plus 不編碼 ~，PHP urlencode('~') 會輸出 %7E
    encoded = encoded.lower()
    replacements = {
        "%2d": "-", "%5f": "_", "%2e": ".", "%21": "!",
        "%2a": "*", "%28": "(", "%29": ")",
    }
    for old, new in replacements.items():
        encoded = encoded.replace(old, new)
    return encoded


def generate_check_mac_value(params: dict, hash_key: str, hash_iv: str) -> str:
    """對應 ECPay CheckMacValueService::generate()。AIO 金流固定用 SHA256"""
    filtered = {k: v for k, v in params.items() if k != "CheckMacValue"}
    sorted_params = sorted(filtered.items(), key=lambda item: item[0].lower())
    param_str = "&".join(f"{k}={v}" for k, v in sorted_params)
    raw = f"HashKey={hash_key}&{param_str}&HashIV={hash_iv}"
    encoded = _ecpay_url_encode(raw)
    return hashlib.sha256(encoded.encode("utf-8")).hexdigest().upper()


def _get_ecpay_credentials() -> tuple[str, str, str, str, str, str]:
    merchant_id = settings.ECPAY_MERCHANT_ID
    hash_key = settings.ECPAY_HASH_KEY
    hash_iv = settings.ECPAY_HASH_IV
    return_url = settings.ECPAY_RETURN_URL
    order_result_url = settings.ECPAY_ORDER_RESULT_URL
    env = settings.ECPAY_ENV

    missing = [
        name
        for name, value in [
            ("ECPAY_MERCHANT_ID", merchant_id),
            ("ECPAY_HASH_KEY", hash_key),
            ("ECPAY_HASH_IV", hash_iv),
            ("ECPAY_RETURN_URL", return_url),
            ("ECPAY_ORDER_RESULT_URL", order_result_url),
        ]
        if not value
    ]
    if missing:
        raise ImproperlyConfigured(f"缺少 ECPay 設定：{', '.join(missing)}，請確認 .env")
    if env not in ECPAY_AIO_CHECKOUT_URL:
        raise ImproperlyConfigured(f"ECPAY_ENV 必須是 'stage' 或 'production'，目前是 {env!r}")

    return merchant_id, hash_key, hash_iv, return_url, order_result_url, env


def _generate_merchant_trade_no() -> str:
    """綠界 MerchantTradeNo 限制：英數字、最長 20 碼、不可重複送單"""
    return f"KOC{int(time.time())}{secrets.token_hex(2).upper()}"


def _to_ecpay_amount(amount) -> str:
    """
    ECPay TotalAmount 只收整數新台幣，不支援小數。
    amount 型別強制轉成 Decimal 再判斷：DecimalField 的值在同一個 process 內
    建立完馬上使用時（尚未從 DB 重新讀回）可能還是原本傳入的 int，不能假設一定是 Decimal。
    """
    amount = Decimal(str(amount))
    if amount != amount.to_integral_value():
        raise ValueError(f"ECPay TotalAmount 僅接受整數金額，收到 {amount}")
    return str(int(amount))


def create_order_payment(order) -> PaymentTransaction:
    """
    針對一筆 Order 建立付款交易紀錄（status=pending），merchant_trade_no 在此產生。
    金額直接採用 order.total_amount，不讓呼叫端另外傳入，避免金額被繞過訂單本身竄改。
    """
    return PaymentTransaction.objects.create(
        order=order,
        merchant_trade_no=_generate_merchant_trade_no(),
        amount=order.total_amount,
        status=PaymentTransaction.STATUS_PENDING,
    )


def pick_relevant_payment(transactions) -> PaymentTransaction | None:
    """
    從同一張 Order 底下的一組 PaymentTransaction（list/queryset 皆可）裡，
    挑出「該顯示的那一筆」：優先挑已付款成功的，沒有的話挑最新建立的一筆
    （信用卡失敗、使用者重新嘗試會有多筆）。傳入空集合時回傳 None。
    純函式、不查 DB，讓呼叫端可以先用 prefetch_related 一次撈完全部訂單的
    PaymentTransaction 再逐筆挑選，避免對每筆訂單各查一次資料庫（N+1）。
    """
    transactions = list(transactions)
    if not transactions:
        return None
    paid = next((t for t in transactions if t.status == PaymentTransaction.STATUS_PAID), None)
    if paid:
        return paid
    return max(transactions, key=lambda t: t.created_at)


def get_order_payment_status(order) -> PaymentTransaction | None:
    """
    回傳一筆 Order 目前該顯示的付款交易紀錄，規則同 pick_relevant_payment。
    找不到任何付款紀錄（例如訂單建立後還沒按過付款）時回傳 None。
    """
    return pick_relevant_payment(PaymentTransaction.objects.filter(order=order))


def _build_item_name(order) -> str:
    """從 Order 底下的 OrderItem/Product 組出 ECPay ItemName，多筆商品以 # 分隔"""
    items = order.items.select_related("product").all().order_by("order_item_id")
    names = [item.product.product_name for item in items]
    if not names:
        raise ValueError(f"Order {order.order_id} 底下沒有任何 OrderItem，無法組出 ItemName")
    return "#".join(names)[:200]



def build_payment_form(payment: PaymentTransaction) -> dict:
    """
    組裝 AIO 建立訂單參數、計算 CheckMacValue，回傳前端可直接 auto-submit 的表單資料：
    {"action": <綠界付款頁 URL>, "method": "POST", "fields": {...含 CheckMacValue}}
    """
    merchant_id, hash_key, hash_iv, return_url, order_result_url, env = _get_ecpay_credentials()

    item_name = _build_item_name(payment.order)

    params = {
        "MerchantID": merchant_id,
        "MerchantTradeNo": payment.merchant_trade_no,
        "MerchantTradeDate": datetime.now(TW_TZ).strftime("%Y/%m/%d %H:%M:%S"),
        "PaymentType": "aio",
        "TotalAmount": _to_ecpay_amount(payment.amount),
        "TradeDesc": "訂單付款",
        "ItemName": item_name,
        "ReturnURL": return_url,
        "OrderResultURL": order_result_url,
        "ChoosePayment": "Credit",
        "EncryptType": "1",
    }
    params["CheckMacValue"] = generate_check_mac_value(params, hash_key, hash_iv)

    logger.info(
        "ECPay AIO 建立訂單: MerchantTradeNo=%s amount=%s",
        payment.merchant_trade_no, params["TotalAmount"],
    )

    return {
        "action": ECPAY_AIO_CHECKOUT_URL[env],
        "method": "POST",
        "fields": params,
    }


def verify_check_mac_value(params: dict) -> bool:
    """驗證綠界 ReturnURL 帶回來的 CheckMacValue，timing-safe 比較，禁止用 == / !="""
    hash_key = settings.ECPAY_HASH_KEY
    hash_iv = settings.ECPAY_HASH_IV
    if not hash_key or not hash_iv:
        raise ImproperlyConfigured("缺少 ECPay 設定：ECPAY_HASH_KEY, ECPAY_HASH_IV，請確認 .env")

    received = params.get("CheckMacValue", "")
    calculated = generate_check_mac_value(params, hash_key, hash_iv)
    return hmac.compare_digest(received.upper(), calculated)


@transaction.atomic
def process_ecpay_callback(params: dict) -> PaymentTransaction | None:
    """
    處理已驗證過 CheckMacValue 的 ECPay ReturnURL 通知：
    依 MerchantTradeNo 找回交易紀錄、寫入 ecpay_trade_no/raw_response、更新 status，
    付款成功時同步把舊版 api.Order.payment_status 標成 'paid'
    （vendor.py / platform.py 既有的訂單查詢邏輯是看這個欄位判斷有沒有收到錢，不是看 PaymentTransaction）。

    - select_for_update 鎖住該筆，避免綠界重送（最多 4 次）造成併發重複處理。
    - 用 update 而非 insert（冪等）：同一個 MerchantTradeNo 收到幾次都是覆蓋同一筆。
    - RtnCode 是字串 '1'（AIO / CMV-SHA256 協議），不是整數。
    - 找不到對應交易時回傳 None，呼叫端仍須回應 1|OK（避免綠界持續重試一筆我方根本查無的訂單）。
    """
    merchant_trade_no = params.get("MerchantTradeNo")
    try:
        payment = PaymentTransaction.objects.select_for_update().get(merchant_trade_no=merchant_trade_no)
    except PaymentTransaction.DoesNotExist:
        logger.error("ECPay callback 找不到對應的 PaymentTransaction: MerchantTradeNo=%s", merchant_trade_no)
        return None

    payment.ecpay_trade_no = params.get("TradeNo", payment.ecpay_trade_no)
    payment.raw_response = params
    payment.status = (
        PaymentTransaction.STATUS_PAID if params.get("RtnCode") == "1" else PaymentTransaction.STATUS_FAILED
    )
    payment.save(update_fields=["ecpay_trade_no", "raw_response", "status", "updated_at"])

    if payment.status == PaymentTransaction.STATUS_PAID:
        Order.objects.filter(order_id=payment.order_id).update(payment_status="paid")

    logger.info(
        "ECPay callback 處理完成: MerchantTradeNo=%s status=%s",
        merchant_trade_no, payment.status,
    )
    return payment

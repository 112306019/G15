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
from datetime import datetime, timedelta
from decimal import Decimal
from zoneinfo import ZoneInfo

import requests
from django.conf import settings
from django.core.exceptions import ImproperlyConfigured
from django.db import transaction
from django.utils import timezone

from api.models import Order

from .models import PaymentTransaction

logger = logging.getLogger("payments")

TW_TZ = ZoneInfo("Asia/Taipei")

# pending 超過這個時間還沒收到任何結果通知，視為使用者已經放棄（例如直接關掉分頁，
# 沒有點「返回商店」、也沒有等到 ReturnURL），從消費者端的訂單列表隱藏。
# 30 分鐘是抓一個遠大於正常結帳耗時的容錯值，避免誤傷正在結帳中的訂單。
PENDING_STALE_AFTER = timedelta(minutes=30)

ECPAY_AIO_CHECKOUT_URL = {
    "stage": "https://payment-stage.ecpay.com.tw/Cashier/AioCheckOut/V5",
    "production": "https://payment.ecpay.com.tw/Cashier/AioCheckOut/V5",
}

# Source: web_fetch https://developers.ecpay.com.tw/2890.md 2026-08-22（查詢訂單 QueryTradeInfo）
ECPAY_QUERY_TRADE_URL = {
    "stage": "https://payment-stage.ecpay.com.tw/Cashier/QueryTradeInfo/V5",
    "production": "https://payment.ecpay.com.tw/Cashier/QueryTradeInfo/V5",
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


def _get_ecpay_credentials() -> tuple[str, str, str, str, str, str, str]:
    merchant_id = settings.ECPAY_MERCHANT_ID
    hash_key = settings.ECPAY_HASH_KEY
    hash_iv = settings.ECPAY_HASH_IV
    return_url = settings.ECPAY_RETURN_URL
    order_result_url = settings.ECPAY_ORDER_RESULT_URL
    client_back_url = settings.ECPAY_CLIENT_BACK_URL
    env = settings.ECPAY_ENV

    missing = [
        name
        for name, value in [
            ("ECPAY_MERCHANT_ID", merchant_id),
            ("ECPAY_HASH_KEY", hash_key),
            ("ECPAY_HASH_IV", hash_iv),
            ("ECPAY_RETURN_URL", return_url),
            ("ECPAY_ORDER_RESULT_URL", order_result_url),
            ("ECPAY_CLIENT_BACK_URL", client_back_url),
        ]
        if not value
    ]
    if missing:
        raise ImproperlyConfigured(f"缺少 ECPay 設定：{', '.join(missing)}，請確認 .env")
    if env not in ECPAY_AIO_CHECKOUT_URL:
        raise ImproperlyConfigured(f"ECPAY_ENV 必須是 'stage' 或 'production'，目前是 {env!r}")

    return merchant_id, hash_key, hash_iv, return_url, order_result_url, client_back_url, env


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


def is_payment_effectively_failed(payment: PaymentTransaction) -> bool:
    """
    判斷一筆 PaymentTransaction 該不該被消費者端視為「不算數」：
    真的失敗（status=failed），或卡在 pending 超過 PENDING_STALE_AFTER——
    後者通常是使用者直接關分頁放棄，沒有走 ClientBackURL、也沒等到 ReturnURL，
    系統永遠不會主動收到「這筆失敗了」的通知，只能用時間判斷已經被放棄。
    """
    if payment.status == PaymentTransaction.STATUS_FAILED:
        return True
    if payment.status == PaymentTransaction.STATUS_PENDING:
        return timezone.now() - payment.created_at > PENDING_STALE_AFTER
    return False


@transaction.atomic
def mark_payment_abandoned(merchant_trade_no: str) -> PaymentTransaction | None:
    """
    消費者在綠界付款頁按「返回商店」（ClientBackURL）離開時呼叫：把對應的
    PaymentTransaction 標成 failed。只在還是 pending 時才動它——已經是 paid
    的絕不能被這裡覆蓋掉（例如使用者按返回商店的同時，ReturnURL 剛好也送達了）。

    這裡沒有、也不需要驗證 CheckMacValue：ClientBackURL 官方規格明講導回時
    不會帶任何綠界簽章過的付款結果，這支函式只是「使用者自己說要放棄」的訊號，
    不是在採信一筆可能被偽造的付款結果。就算誤標，後續真的收到 ReturnURL
    時 process_ecpay_callback 一樣會覆蓋回正確狀態，不會造成金流誤判。
    """
    try:
        payment = PaymentTransaction.objects.select_for_update().get(merchant_trade_no=merchant_trade_no)
    except PaymentTransaction.DoesNotExist:
        logger.error("ClientBackURL 找不到對應的 PaymentTransaction: MerchantTradeNo=%s", merchant_trade_no)
        return None

    if payment.status != PaymentTransaction.STATUS_PENDING:
        logger.info(
            "ClientBackURL 觸發時該筆已經不是 pending，不覆蓋: MerchantTradeNo=%s status=%s",
            merchant_trade_no, payment.status,
        )
        return payment

    payment.status = PaymentTransaction.STATUS_FAILED
    payment.raw_response = {"_source": "ClientBackURL", "_note": "使用者在綠界付款頁按返回商店離開"}
    payment.save(update_fields=["status", "raw_response", "updated_at"])

    logger.info("ClientBackURL 已將交易標成 failed: MerchantTradeNo=%s", merchant_trade_no)
    return payment


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
    merchant_id, hash_key, hash_iv, return_url, order_result_url, client_back_url, env = _get_ecpay_credentials()

    item_name = _build_item_name(payment.order)

    # 消費者在綠界付款頁主動按「返回商店」時導回的網址（例如 3D/簡訊 OTP 驗證失敗時顯示的按鈕）。
    # 官方文件明講這個導回「不會帶付款結果」，也不會附上任何可辨識交易的參數，
    # 所以這裡自己在網址上帶 merchant_trade_no，讓 ecpay_client_back 這支 view
    # 知道使用者是從哪一筆交易按「返回商店」離開的，才能把該筆 PaymentTransaction 標成 failed。
    client_back_url_with_trade_no = (
        f"{client_back_url}?{urllib.parse.urlencode({'merchant_trade_no': payment.merchant_trade_no})}"
    )

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
        "ClientBackURL": client_back_url_with_trade_no,
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


def _apply_payment_result(payment: PaymentTransaction, *, ecpay_trade_no, raw_response, is_paid: bool) -> PaymentTransaction:
    """
    共用邏輯：把一筆「已經確認過的」付款結果寫回 PaymentTransaction，並同步 Order.payment_status。
    來源可以是 ReturnURL callback（process_ecpay_callback），也可以是主動查詢的對帳結果
    （reconcile_payment_from_query）——兩者最終都是同一組欄位、同一套同步規則，只有結果的
    取得方式不同，所以共用同一個寫入函式，避免兩處邏輯之後改一邊漏改另一邊。
    呼叫端負責上鎖（select_for_update）跟包 transaction，這裡只單純寫入。
    """
    payment.ecpay_trade_no = ecpay_trade_no or payment.ecpay_trade_no
    payment.raw_response = raw_response
    payment.status = PaymentTransaction.STATUS_PAID if is_paid else PaymentTransaction.STATUS_FAILED
    payment.save(update_fields=["ecpay_trade_no", "raw_response", "status", "updated_at"])

    if payment.status == PaymentTransaction.STATUS_PAID:
        Order.objects.filter(order_id=payment.order_id).update(payment_status="paid")

    return payment


@transaction.atomic
def process_ecpay_callback(params: dict) -> PaymentTransaction | None:
    """
    處理已驗證過 CheckMacValue 的 ECPay ReturnURL 通知：
    依 MerchantTradeNo 找回交易紀錄，寫入結果（見 _apply_payment_result）。

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

    payment = _apply_payment_result(
        payment,
        ecpay_trade_no=params.get("TradeNo"),
        raw_response=params,
        is_paid=params.get("RtnCode") == "1",
    )

    logger.info(
        "ECPay callback 處理完成: MerchantTradeNo=%s status=%s",
        merchant_trade_no, payment.status,
    )
    return payment


def _parse_query_trade_response(body: str) -> dict:
    """
    QueryTradeInfo 回應是 text/html、URL-encoded 的 key=value 字串（不是 JSON），手動解析成 dict。
    keep_blank_values=True 是必要的：查無交易/尚未付款時，PaymentDate/PaymentType/TradeNo 等欄位
    會是空字串（例如 "TradeNo="），parse_qsl 預設會把這種空值參數整個丟掉，
    但 CheckMacValue 的計算規則明文要求空字串參數仍要納入——用預設值解析會讓驗證永遠失敗。
    """
    return dict(urllib.parse.parse_qsl(body, keep_blank_values=True))


def query_trade_info(payment: PaymentTransaction) -> dict:
    """
    主動向綠界查詢一筆交易的真實付款狀態（QueryTradeInfo API），純查詢、不寫入任何資料。

    用途：ReturnURL 收不到通知時的對帳工具。銀行端的授權/請款是消費者刷卡當下就跟綠界完成的，
    跟 ReturnURL 有沒有送達是兩件事——PaymentTransaction 卡在 pending 不代表真的沒付款，
    只代表「我們沒收到通知」，正確做法是主動查證，不是憑猜測改狀態。

    回傳綠界解析後的欄位 dict，其中 TradeStatus（字串）：
      "0"         交易訂單成立未付款
      "1"         交易訂單成立已付款
      "10200095"  交易訂單未成立，消費者未完成付款作業
    信用卡建議付款後至少等 10 分鐘再查，太快查可能銀行還沒回覆、TradeStatus 仍是 "0"。

    Source: web_fetch https://developers.ecpay.com.tw/2890.md 2026-08-22
    """
    merchant_id, hash_key, hash_iv, _return_url, _order_result_url, _client_back_url, env = _get_ecpay_credentials()

    params = {
        "MerchantID": merchant_id,
        "MerchantTradeNo": payment.merchant_trade_no,
        "TimeStamp": str(int(time.time())),  # 3 分鐘內有效，每次呼叫都要重新產生
    }
    params["CheckMacValue"] = generate_check_mac_value(params, hash_key, hash_iv)

    resp = requests.post(ECPAY_QUERY_TRADE_URL[env], data=params, timeout=30)
    resp.raise_for_status()
    result = _parse_query_trade_response(resp.text)

    if not verify_check_mac_value(result):
        raise ValueError(
            f"QueryTradeInfo 回應的 CheckMacValue 驗證失敗，不可信任: MerchantTradeNo={payment.merchant_trade_no}"
        )

    logger.info(
        "QueryTradeInfo 查詢完成: MerchantTradeNo=%s TradeStatus=%s",
        payment.merchant_trade_no, result.get("TradeStatus"),
    )
    return result


@transaction.atomic
def reconcile_payment_from_query(payment: PaymentTransaction) -> PaymentTransaction:
    """
    對一筆卡住的 PaymentTransaction 主動呼叫 QueryTradeInfo 對帳、並依查詢結果更新狀態。
    TradeStatus="0"（銀行還沒回覆/消費者還沒付）時不動它，維持 pending，避免誤判成失敗；
    "1" 或 "10200095" 才分別寫成 paid / failed。
    """
    result = query_trade_info(payment)
    trade_status = result.get("TradeStatus")

    if trade_status == "0":
        logger.info(
            "QueryTradeInfo 對帳：仍是待付款，維持 pending 不變更: MerchantTradeNo=%s",
            payment.merchant_trade_no,
        )
        return payment

    payment = PaymentTransaction.objects.select_for_update().get(pk=payment.pk)
    payment = _apply_payment_result(
        payment,
        ecpay_trade_no=result.get("TradeNo"),
        raw_response=result,
        is_paid=(trade_status == "1"),
    )

    logger.info(
        "QueryTradeInfo 對帳完成: MerchantTradeNo=%s TradeStatus=%s status=%s",
        payment.merchant_trade_no, trade_status, payment.status,
    )
    return payment

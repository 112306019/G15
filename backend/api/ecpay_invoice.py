import base64
import json
import time
import uuid
import urllib.parse
import requests
from Crypto.Cipher import AES

# 測試環境設定（正式上線時要換成正式的 MerchantID / HashKey / HashIV）
ECPAY_INVOICE_MERCHANT_ID = "2000132"
ECPAY_INVOICE_HASH_KEY = "ejCk326UnaZWKisg"
ECPAY_INVOICE_HASH_IV = "q9jcZX8Ib9LM8wYk"
ECPAY_INVOICE_TEST_URL = "https://einvoice-stage.ecpay.com.tw/B2BInvoice/Issue"
ECPAY_INVOICE_B2C_TEST_URL = "https://einvoice-stage.ecpay.com.tw/B2CInvoice/Issue"
ECPAY_INVOICE_B2C_VOID_URL = "https://einvoice-stage.ecpay.com.tw/B2CInvoice/Invalid"


def _pkcs7_pad(data: bytes, block_size: int = 16) -> bytes:
    pad_len = block_size - (len(data) % block_size)
    return data + bytes([pad_len]) * pad_len


def _pkcs7_unpad(data: bytes) -> bytes:
    pad_len = data[-1]
    return data[:-pad_len]


def encrypt_data(data_dict: dict) -> str:
    """
    綠界電子發票 Data 參數加密：
    1. 轉成 JSON 字串
    2. URL Encode（注意事項有特別強調）
    3. AES-128-CBC 加密（key/iv 用 HashKey/HashIV）
    4. Base64 編碼
    """
    json_str = json.dumps(data_dict, ensure_ascii=False, separators=(",", ":"))
    url_encoded = urllib.parse.quote_plus(json_str)

    key = ECPAY_INVOICE_HASH_KEY.encode("utf-8")
    iv = ECPAY_INVOICE_HASH_IV.encode("utf-8")

    cipher = AES.new(key, AES.MODE_CBC, iv)
    padded = _pkcs7_pad(url_encoded.encode("utf-8"))
    encrypted = cipher.encrypt(padded)

    return base64.b64encode(encrypted).decode("utf-8")


def decrypt_data(encrypted_b64: str) -> dict:
    """把綠界回傳的加密 Data 解密回原本的 dict"""
    key = ECPAY_INVOICE_HASH_KEY.encode("utf-8")
    iv = ECPAY_INVOICE_HASH_IV.encode("utf-8")

    encrypted_bytes = base64.b64decode(encrypted_b64)
    cipher = AES.new(key, AES.MODE_CBC, iv)
    decrypted_padded = cipher.decrypt(encrypted_bytes)
    decrypted = _pkcs7_unpad(decrypted_padded)

    url_decoded = urllib.parse.unquote_plus(decrypted.decode("utf-8"))
    return json.loads(url_decoded)


def issue_b2b_invoice(relate_number: str, buyer_tax_id: str, item_name: str, sales_amount: int, tax_amount: int):
    """
    呼叫綠界 B2B 電子發票開立 API（測試環境）。
    回傳 (success: bool, invoice_number: str|None, message: str)
    """
    total_amount = sales_amount + tax_amount

    data_payload = {
        "MerchantID": ECPAY_INVOICE_MERCHANT_ID,
        "RelateNumber": relate_number,
        "CustomerIdentifier": buyer_tax_id,
        "InvType": "07",
        "TaxType": 1,
        "SalesAmount": sales_amount,
        "TaxAmount": tax_amount,
        "TotalAmount": total_amount,
        "InvoiceRemark": "平台服務費",
        "Items": [
            {
                "ItemSeq": 1,
                "ItemName": item_name,
                "ItemCount": 1,
                "ItemWord": "式",
                "ItemPrice": sales_amount,
                "ItemAmount": sales_amount,
                "ItemTax": tax_amount,
            }
        ],
    }

    encrypted_data = encrypt_data(data_payload)

    request_body = {
        "MerchantID": ECPAY_INVOICE_MERCHANT_ID,
        "RqHeader": {"Timestamp": int(time.time())},
        "Data": encrypted_data,
    }

    try:
        response = requests.post(ECPAY_INVOICE_TEST_URL, json=request_body, timeout=15)
        response.raise_for_status()
        result = response.json()

        if result.get("TransCode") != 1:
            return False, None, result.get("TransMsg", "傳輸失敗")

        decrypted = decrypt_data(result["Data"])

        if decrypted.get("RtnCode") == 1:
            return True, decrypted.get("InvoiceNumber"), decrypted.get("RtnMsg", "成功")
        else:
            return False, None, decrypted.get("RtnMsg", "開立失敗")

    except Exception as e:
        return False, None, str(e)


def issue_b2c_invoice(relate_number: str, item_name: str, sales_amount: int, buyer_name: str = "", buyer_email: str = ""):
    """
    呼叫綠界 B2C 電子發票開立 API（測試環境），開給沒有統一編號的自然人
    （例如 KOC 個人）。跟 issue_b2b_invoice 共用同一套加解密機制，差別在：
    - 不用帶買受人統一編號（CustomerIdentifier 留空）
    - 不指定載具（CarrierType 留空），也不列印紙本（Print="0"）、
      不捐贈（Donation="0"）——發票會存進財政部電子發票整合服務平台，
      買受人憑「發票號碼 + 開立日期 + 隨機碼」就查得到，不需要我們自己
      產生 PDF。
    - sales_amount 視為未稅金額，稅額固定用 5% 計算（TaxType=1 應稅）。
    - 回傳欄位跟 B2B 不一樣：發票號碼的 key 是 InvoiceNo（B2B 是
      InvoiceNumber），而且多了 RandomNumber（4 碼隨機碼）——這支是
      B2C 發票查詢用的必要資訊，B2B 沒有這個概念，一定要一起存起來，
      不然買受人查不到自己的發票。這是實際打過綠界測試環境驗證過的。

    回傳 (success: bool, invoice_number: str|None, random_number: str|None, invoice_date: str|None, message: str)
    """
    tax_amount = round(sales_amount * 0.05)
    total_amount = sales_amount + tax_amount

    data_payload = {
        "MerchantID": ECPAY_INVOICE_MERCHANT_ID,
        "RelateNumber": relate_number,
        "CustomerID": "",
        "CustomerIdentifier": "",
        "CustomerName": buyer_name or "",
        "CustomerAddr": "",
        "CustomerPhone": "",
        "CustomerEmail": buyer_email or "",
        "ClearanceMark": "",
        "Print": "0",
        "Donation": "0",
        "LoveCode": "",
        "CarrierType": "",
        "CarrierNum": "",
        "TaxType": "1",
        "SpecialTaxType": 0,
        "SalesAmount": sales_amount,
        "InvoiceRemark": "平台服務費",
        "InvType": "07",
        "vat": "1",
        "Items": [
            {
                "ItemSeq": 1,
                "ItemName": item_name,
                "ItemCount": 1,
                "ItemWord": "式",
                "ItemPrice": sales_amount,
                "ItemAmount": sales_amount,
                "ItemTaxType": "1",
            }
        ],
    }

    encrypted_data = encrypt_data(data_payload)

    request_body = {
        "MerchantID": ECPAY_INVOICE_MERCHANT_ID,
        "RqHeader": {"Timestamp": int(time.time())},
        "Data": encrypted_data,
    }

    try:
        response = requests.post(ECPAY_INVOICE_B2C_TEST_URL, json=request_body, timeout=15)
        response.raise_for_status()
        result = response.json()

        if result.get("TransCode") != 1:
            return False, None, None, None, result.get("TransMsg", "傳輸失敗")

        decrypted = decrypt_data(result["Data"])

        if decrypted.get("RtnCode") == 1:
            return (
                True,
                decrypted.get("InvoiceNo"),
                decrypted.get("RandomNumber"),
                decrypted.get("InvoiceDate"),
                decrypted.get("RtnMsg", "成功"),
            )
        else:
            return False, None, None, None, decrypted.get("RtnMsg", "開立失敗")

    except Exception as e:
        return False, None, None, None, str(e)


def void_b2c_invoice(invoice_no: str, invoice_date: str, reason: str = "撥款失敗作廢"):
    """
    呼叫綠界 B2C 電子發票作廢 API（測試環境），已經實際打過測試環境驗證過。

    用在：撥款當下已經自動開立平台服務費發票，但這筆撥款後來被後台標記
    「匯款失敗」（見 admin_confirm_koc_payout）——錢已經退回 KOC 錢包了，
    但發票已經開出去，不作廢的話會變成一張對應到「根本沒有真的撥款成功」
    的有效稅務憑證，稅務上是錯的，一定要跟著作廢掉。

    invoice_date 只需要日期（yyyy-MM-dd），不用完整時間，
    直接取 issue 當下回傳的 InvoiceDate 的日期部分即可。
    reason 上限 20 字，只是給財政部平台記錄用，不會顯示給 KOC 看。

    回傳 (success: bool, message: str)
    """
    data_payload = {
        "MerchantID": ECPAY_INVOICE_MERCHANT_ID,
        "InvoiceNo": invoice_no,
        "InvoiceDate": invoice_date,
        "Reason": reason,
    }

    encrypted_data = encrypt_data(data_payload)

    request_body = {
        "MerchantID": ECPAY_INVOICE_MERCHANT_ID,
        "RqHeader": {"Timestamp": int(time.time())},
        "Data": encrypted_data,
    }

    try:
        response = requests.post(ECPAY_INVOICE_B2C_VOID_URL, json=request_body, timeout=15)
        response.raise_for_status()
        result = response.json()

        if result.get("TransCode") != 1:
            return False, result.get("TransMsg", "傳輸失敗")

        decrypted = decrypt_data(result["Data"])

        if decrypted.get("RtnCode") == 1:
            return True, decrypted.get("RtnMsg", "成功")
        else:
            return False, decrypted.get("RtnMsg", "作廢失敗")

    except Exception as e:
        return False, str(e)
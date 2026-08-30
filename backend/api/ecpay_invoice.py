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
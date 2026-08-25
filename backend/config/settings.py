from pathlib import Path
from datetime import timedelta
from dotenv import load_dotenv
import os

load_dotenv()

import pymysql
pymysql.install_as_MySQLdb()

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = os.getenv("SECRET_KEY", "django-insecure-15o+w&lvzvtw-!%+lnf6-9k2%t9=bu9d=4sdsjvkwuco*269!*")

DEBUG = True


ALLOWED_HOSTS = ["*"]

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "rest_framework",
    "rest_framework_simplejwt",
    "corsheaders",
    "api",
    "payments",
]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

# 開發階段先全開
CORS_ALLOW_ALL_ORIGINS = True

CORS_ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.mysql',
        'NAME': os.getenv('DB_NAME', 'defaultdb'),
        'USER': os.getenv('DB_USER', 'avnadmin'),
        'PASSWORD': os.getenv('DB_PASSWORD', ''),
        'HOST': os.getenv('DB_HOST', ''),
        'PORT': os.getenv('DB_PORT', '14195'),
        'OPTIONS': {
            'ssl': {'ssl-mode': 'REQUIRED'},
        },
    }
}


# ==============================================================================
# ECPay Logistics - Stage
# ==============================================================================
ECPAY_LOGISTICS_MERCHANT_ID = os.getenv(
    "ECPAY_LOGISTICS_MERCHANT_ID",
    ""
)

ECPAY_LOGISTICS_HASH_KEY = os.getenv(
    "ECPAY_LOGISTICS_HASH_KEY",
    ""
)

ECPAY_LOGISTICS_HASH_IV = os.getenv(
    "ECPAY_LOGISTICS_HASH_IV",
    ""
)

ECPAY_LOGISTICS_MAP_URL = os.getenv(
    "ECPAY_LOGISTICS_MAP_URL",
    "https://logistics-stage.ecpay.com.tw/Express/map"
)

ECPAY_LOGISTICS_SUBTYPE = os.getenv(
    "ECPAY_LOGISTICS_SUBTYPE",
    "UNIMARTC2C"
)

ECPAY_LOGISTICS_CREATE_URL = os.getenv(
    "ECPAY_LOGISTICS_CREATE_URL",
    "https://logistics-stage.ecpay.com.tw/Express/Create"
)

ECPAY_LOGISTICS_SENDER_NAME = os.getenv(
    "ECPAY_LOGISTICS_SENDER_NAME",
    "測試人員"
)

ECPAY_LOGISTICS_SENDER_PHONE = os.getenv(
    "ECPAY_LOGISTICS_SENDER_PHONE",
    "0912345678"
)

ECPAY_LOGISTICS_REPLY_URL = os.getenv(
    "ECPAY_LOGISTICS_REPLY_URL",
    ""
)

ECPAY_LOGISTICS_QUERY_URL = os.getenv(
    "ECPAY_LOGISTICS_QUERY_URL",
    "https://logistics-stage.ecpay.com.tw/Helper/QueryLogisticsTradeInfo/V5"
)

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [],
    "DEFAULT_PERMISSION_CLASSES": (
        "rest_framework.permissions.AllowAny",
    ),
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(hours=2),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    "ROTATE_REFRESH_TOKENS": True,
}


MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"

LANGUAGE_CODE = "zh-hant"
TIME_ZONE = "Asia/Taipei"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# ==============================================================================
# Email
# 正式環境只要在 .env 填上 EMAIL_HOST_USER / EMAIL_HOST_PASSWORD 就會自動切換成真的寄信。
# ==============================================================================
EMAIL_HOST_USER = os.getenv("EMAIL_HOST_USER", "").strip("'\" ")
# 應用程式密碼本身不該含任何空格；Google 畫面上是用空格分成 4 組方便閱讀
# （例如 abcd efgh ijkl mnop），一不小心連空格整串複製貼上，.strip() 只清得掉頭尾、
# 清不掉中間的空格，所以密碼這行額外用 replace 把字串裡所有空格都拿掉。
EMAIL_HOST_PASSWORD = os.getenv("EMAIL_HOST_PASSWORD", "").strip("'\" ").replace(" ", "")

if EMAIL_HOST_USER:
    EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"
else:
    EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"

EMAIL_HOST = os.getenv("EMAIL_HOST", "smtp.gmail.com").strip("'\" ")
EMAIL_PORT = int(os.getenv("EMAIL_PORT", "587"))

# 讓 TLS 判斷不論大寫、小寫 true / 1 都能正確解析為 True
EMAIL_USE_TLS = os.getenv("EMAIL_USE_TLS", "True").lower() in ["true", "1", "t"]
EMAIL_USE_SSL = False  # 明確關閉 SSL，避免與 TLS 衝突

DEFAULT_FROM_EMAIL = os.getenv("DEFAULT_FROM_EMAIL", f"KOC Platform <{EMAIL_HOST_USER}>")
# ==============================================================================
# ECPay 綠界科技
# MerchantID / HashKey / HashIV 皆從環境變數讀取，不寫死在程式碼裡；
# 未設定時故意留空字串，缺漏會在 payments/services.py 實際呼叫時明確報錯，
# 而不是讓別的、沒用到 ECPay 的指令（如 manage.py test）因為缺環境變數而啟動失敗。
# ==============================================================================
ECPAY_MERCHANT_ID = os.getenv("ECPAY_MERCHANT_ID", "")
ECPAY_HASH_KEY = os.getenv("ECPAY_HASH_KEY", "")
ECPAY_HASH_IV = os.getenv("ECPAY_HASH_IV", "")
# stage：測試環境（payment-stage.ecpay.com.tw） / production：正式環境（payment.ecpay.com.tw）
ECPAY_ENV = os.getenv("ECPAY_ENV", "stage")
# 綠界 Server-to-Server 付款結果通知網址（ReturnURL），必須是可公開訪問的網址（本機開發需用 ngrok 等工具轉發）
ECPAY_RETURN_URL = os.getenv("ECPAY_RETURN_URL", "")
# 消費者付款完成後，綠界把「瀏覽器」導回的網址（OrderResultURL）。
# 這條路徑打的也是後端（跟 ReturnURL 一樣要公開可訪問），後端收到後再把瀏覽器導去 FRONTEND_BASE_URL 底下的結果頁，
# 不能直接填前端網址：OrderResultURL 帶回的是 Form POST + CheckMacValue，前端 SPA 沒有能力接收、驗證這個請求。
ECPAY_ORDER_RESULT_URL = os.getenv("ECPAY_ORDER_RESULT_URL", "")

# 消費者在綠界付款頁主動按「返回商店」時（例如 3D/簡訊 OTP 驗證失敗後顯示的按鈕）打的網址。
# 官方文件明講這個導回「不會帶付款結果」，綠界不會附上任何可辨識交易的參數，
# 所以送出去的 ClientBackURL 是我們自己在網址上加 ?merchant_trade_no=... 帶進去，
# 這樣後端收到請求時才知道使用者是從哪一筆交易按「返回商店」離開的。
# 一樣要能公開訪問（跟 ReturnURL/OrderResultURL 一樣本機開發需用 ngrok）。
ECPAY_CLIENT_BACK_URL = os.getenv("ECPAY_CLIENT_BACK_URL", "")

# 前端網站的網域，後端驗證完 OrderResultURL 通知、或處理完 ClientBackURL 後，
# 會把瀏覽器導去 FRONTEND_BASE_URL 底下對應的頁面（結果頁 / 購物車）
FRONTEND_BASE_URL = os.getenv("FRONTEND_BASE_URL", "http://localhost:5173")
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
# 沒設定 EMAIL_HOST_USER 時（本機開發預設）改用 console backend，
# 寄信內容直接印在終端機，不會真的寄出去、也不需要真的 SMTP 帳密。
# 正式環境只要在 .env 填上 EMAIL_HOST_USER / EMAIL_HOST_PASSWORD 就會自動切換成真的寄信。
# ==============================================================================
EMAIL_HOST_USER = os.getenv("EMAIL_HOST_USER", "")
EMAIL_HOST_PASSWORD = os.getenv("EMAIL_HOST_PASSWORD", "")

if EMAIL_HOST_USER:
    EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"
else:
    EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"

EMAIL_HOST = os.getenv("EMAIL_HOST", "smtp.gmail.com")
EMAIL_PORT = int(os.getenv("EMAIL_PORT", "587"))
EMAIL_USE_TLS = os.getenv("EMAIL_USE_TLS", "True") == "True"
DEFAULT_FROM_EMAIL = os.getenv("DEFAULT_FROM_EMAIL", "KOC Platform <no-reply@kocplatform.com>")
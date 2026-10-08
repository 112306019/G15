"""
KOC AI 文案檢測。

KOC 在任務頁撰寫貼文時，可以用這個工具自行檢查文案有沒有廣告法規風險。
廠商不參與、也看不到結果；平台不保存送出的文案與檢測結果。

使用前必須同意免責條款（constants.AI_CHECK_TERMS），同意紀錄存在
AiCheckConsent。同一版條款只需同意一次，條款改版後要重新同意。

為什麼不由後端代為轉送：ad-checker 分析一篇文案要一分鐘左右（休眠中還要更久），
超過 gunicorn 每個請求 30 秒的上限，而且會佔住後端的 worker 讓整站卡住。
所以改成「後端發通行證、瀏覽器直接呼叫 ad-checker」：
  1. 前端呼叫 /koc/aiCheck/token，後端確認已同意目前版本條款、任務屬於這位 KOC，
     才發一張短效的簽章通行證（內含使用者、任務、商品廣告類別、到期時間）。
  2. 瀏覽器帶著通行證（X-AiCheck-Token header）直接呼叫 ad-checker 的 /api/analyze。
  3. ad-checker 用同一把密鑰（AI_CHECK_SHARED_SECRET）驗證簽章與到期時間，
     沒有有效通行證就拒絕（見 ad-checker/backend/main.py 的 verify_ai_check_token）。
這樣沒同意條款就拿不到通行證，也就無法使用 ad-checker。

GET  /koc/aiCheck/terms?User_id=     條款內容與這位使用者是否已同意目前版本
POST /koc/aiCheck/consent            同意條款 {User_id, terms_version}
POST /koc/aiCheck/token              取得檢測通行證 {User_id, KOCMission_id}
"""

import base64
import hashlib
import hmac
import json
import time

from django.conf import settings
from rest_framework import status as http_status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from api.models import AiCheckConsent, CampaignProduct, KOCMissionNew, User
from api.views.constants import (
    AI_CHECK_TERMS,
    AI_CHECK_TERMS_TITLE,
    AI_CHECK_TERMS_VERSION,
)

# 通行證有效時間：夠 KOC 檢測幾次、等 ad-checker 從休眠中醒來即可
AI_CHECK_TOKEN_TTL_SECONDS = 10 * 60


def _get_user(user_id):
    if not user_id:
        return None
    return User.objects.filter(pk=user_id).first()


def _current_consent(user):
    return AiCheckConsent.objects.filter(user=user, terms_version=AI_CHECK_TERMS_VERSION).first()


def _client_ip(request):
    # Render 等反向代理會把真實來源放在 X-Forwarded-For 的第一個
    forwarded = request.META.get('HTTP_X_FORWARDED_FOR', '')
    if forwarded:
        return forwarded.split(',')[0].strip() or None
    return request.META.get('REMOTE_ADDR') or None


def _b64url(raw):
    return base64.urlsafe_b64encode(raw).rstrip(b'=').decode()


def sign_ai_check_token(payload, secret):
    """
    通行證格式：<base64url(JSON payload)>.<hex HMAC-SHA256>。
    ad-checker 那邊用同樣的規則驗證，兩邊格式要一起改。
    """
    body = _b64url(json.dumps(payload, separators=(',', ':'), ensure_ascii=False).encode())
    signature = hmac.new(secret.encode(), body.encode(), hashlib.sha256).hexdigest()
    return f'{body}.{signature}'


@api_view(['GET'])
@permission_classes([AllowAny])
def ai_check_terms(request):
    user = _get_user(request.query_params.get('User_id'))
    consent = _current_consent(user) if user else None
    return Response({
        'success': True,
        'err': '',
        'terms_version': AI_CHECK_TERMS_VERSION,
        'title': AI_CHECK_TERMS_TITLE,
        'terms': AI_CHECK_TERMS,
        'agreed': consent is not None,
        'agreed_at': consent.agreed_at if consent else None,
    }, status=http_status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([AllowAny])
def ai_check_consent(request):
    user = _get_user(request.data.get('User_id'))
    if not user:
        return Response({
            'success': False,
            'err': '找不到對應的使用者'
        }, status=http_status.HTTP_404_NOT_FOUND)

    # 前端顯示的條款版本必須是目前版本，避免 KOC 看的是舊內容卻記成同意新版
    if request.data.get('terms_version') != AI_CHECK_TERMS_VERSION:
        return Response({
            'success': False,
            'err': '條款內容已更新，請重新閱讀後再同意'
        }, status=http_status.HTTP_409_CONFLICT)

    consent, _created = AiCheckConsent.objects.get_or_create(
        user=user,
        terms_version=AI_CHECK_TERMS_VERSION,
        defaults={
            'ip_address': _client_ip(request),
            'user_agent': (request.META.get('HTTP_USER_AGENT') or '')[:500],
        },
    )
    return Response({
        'success': True,
        'err': '',
        'terms_version': consent.terms_version,
        'agreed_at': consent.agreed_at,
    }, status=http_status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([AllowAny])
def ai_check_token(request):
    user = _get_user(request.data.get('User_id'))
    if not user:
        return Response({
            'success': False,
            'err': '找不到對應的使用者'
        }, status=http_status.HTTP_404_NOT_FOUND)

    if not _current_consent(user):
        return Response({
            'success': False,
            'err': '請先閱讀並同意 AI 文案檢測使用條款',
            'need_consent': True,
        }, status=http_status.HTTP_403_FORBIDDEN)

    mission = (
        KOCMissionNew.objects
        .select_related('koc', 'application__campaign')
        .filter(pk=request.data.get('KOCMission_id'))
        .first()
    )
    if not mission or not mission.koc or str(mission.koc.user_id) != str(user.pk):
        return Response({
            'success': False,
            'err': '找不到對應的 KOC 任務'
        }, status=http_status.HTTP_404_NOT_FOUND)

    secret = getattr(settings, 'AI_CHECK_SHARED_SECRET', '')
    if not secret:
        print('AI 文案檢測：未設定環境變數 AI_CHECK_SHARED_SECRET')
        return Response({
            'success': False,
            'err': 'AI 文案檢測尚未完成設定，請聯絡平台管理員'
        }, status=http_status.HTTP_503_SERVICE_UNAVAILABLE)

    # 依活動商品的廣告類別（食品／化粧品／醫療器材／藥品）套用對應法規；
    # 類別寫進通行證，ad-checker 以通行證裡的為準
    ad_category = 'other'
    campaign_product = (
        CampaignProduct.objects
        .filter(campaign=mission.application.campaign)
        .select_related('product')
        .first()
    )
    if campaign_product and campaign_product.product:
        ad_category = campaign_product.product.ad_category or 'other'

    token = sign_ai_check_token({
        'u': str(user.pk),
        'm': mission.kocmission_id,
        'c': ad_category,
        'v': AI_CHECK_TERMS_VERSION,
        'exp': int(time.time()) + AI_CHECK_TOKEN_TTL_SECONDS,
    }, secret)

    return Response({
        'success': True,
        'err': '',
        'token': token,
        'category': ad_category,
        'analyze_url': f'{settings.ADGUARD_API_URL}/api/analyze',
    }, status=http_status.HTTP_200_OK)

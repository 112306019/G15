"""
KOC AI 文案檢測。

KOC 在任務頁撰寫貼文時，可以用這個工具自行檢查文案有沒有廣告法規風險。
廠商不參與、也看不到結果；平台不保存送出的文案與檢測結果。

使用前必須同意免責條款（constants.AI_CHECK_TERMS），同意紀錄存在
AiCheckConsent。同一版條款只需同意一次，條款改版後要重新同意。
後端在轉發檢測前一定會檢查同意紀錄，不只靠前端彈窗。

GET  /koc/aiCheck/terms?User_id=     條款內容與這位使用者是否已同意目前版本
POST /koc/aiCheck/consent            同意條款 {User_id, terms_version}
POST /koc/aiCheck/analyze            檢測文案 {User_id, KOCMission_id, text}
"""

import requests
from django.conf import settings
from rest_framework import status as http_status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from api.error_messages import internal_error_message
from api.models import AiCheckConsent, CampaignProduct, KOCMissionNew, User
from api.views.constants import (
    AI_CHECK_TERMS,
    AI_CHECK_TERMS_TITLE,
    AI_CHECK_TERMS_VERSION,
)

AI_CHECK_MAX_TEXT_LENGTH = 5000
AI_CHECK_TIMEOUT_SECONDS = 60


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
def ai_check_analyze(request):
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

    text = (request.data.get('text') or '').strip()
    if not text:
        return Response({
            'success': False,
            'err': '請先輸入要檢測的文案'
        }, status=http_status.HTTP_400_BAD_REQUEST)
    if len(text) > AI_CHECK_MAX_TEXT_LENGTH:
        return Response({
            'success': False,
            'err': f'文案長度請在 {AI_CHECK_MAX_TEXT_LENGTH} 字以內'
        }, status=http_status.HTTP_400_BAD_REQUEST)

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

    # 依活動商品的廣告類別（食品／化粧品／醫療器材／藥品）套用對應法規
    ad_category = 'other'
    campaign_product = (
        CampaignProduct.objects
        .filter(campaign=mission.application.campaign)
        .select_related('product')
        .first()
    )
    if campaign_product and campaign_product.product:
        ad_category = campaign_product.product.ad_category or 'other'

    try:
        response = requests.post(
            f'{settings.ADGUARD_API_URL}/api/analyze',
            json={'text': text, 'category': ad_category},
            timeout=AI_CHECK_TIMEOUT_SECONDS,
        )
        response.raise_for_status()
        result = response.json()
    except Exception:
        return Response({
            'success': False,
            'err': internal_error_message('AI 文案檢測暫時無法使用'),
        }, status=http_status.HTTP_502_BAD_GATEWAY)

    # 結果只回傳給 KOC，不寫進資料庫、不提供給廠商
    return Response({
        'success': True,
        'err': '',
        'category': ad_category,
        'result': result,
    }, status=http_status.HTTP_200_OK)

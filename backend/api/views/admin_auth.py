"""
平台管理員（Admins）的忘記密碼與「登入與安全性」相關 API。

跟一般使用者 auth.py 的流程對應，但有幾個刻意的差異：
- 忘記密碼不管 email 存不存在都回一樣的成功訊息，避免被拿來探測哪些信箱是管理員帳號
- 驗證碼錯誤次數有上限，超過就作廢，要重新申請（6 位數驗證碼不設上限可以被暴力試出來）
- 同一個帳號 60 秒內只寄一次，避免被狂按把 SendGrid 額度打光
- 驗證碼用 secrets 產生，不用 random
"""
import logging
import secrets
from datetime import timedelta

from django.contrib.auth.hashers import check_password, make_password
from django.db import transaction
from django.utils import timezone
from django.utils.crypto import constant_time_compare
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from api.emails import send_admin_password_reset_email
from api.models import AdminLoginHistory, AdminPasswordResetCode, Admins

logger = logging.getLogger(__name__)

ADMIN_RESET_CODE_TTL_MINUTES = 10
ADMIN_RESET_CODE_MAX_ATTEMPTS = 5
ADMIN_RESET_RESEND_COOLDOWN_SECONDS = 60
ADMIN_PASSWORD_MIN_LENGTH = 8
ADMIN_LOGIN_HISTORY_KEEP = 20
ADMIN_LOGIN_HISTORY_SHOW = 5

GENERIC_FORGOT_OK_MESSAGE = '若此信箱為管理員帳號，驗證碼已寄出，請於 10 分鐘內完成重設'
GENERIC_RESET_FAIL_MESSAGE = '驗證碼錯誤或已失效，請重新申請'


def _generate_code():
    return f"{secrets.randbelow(1_000_000):06d}"


def _get_client_ip(request):
    # Render 前面有一層 proxy，REMOTE_ADDR 會是 proxy 的 IP，要先看 X-Forwarded-For
    forwarded = request.META.get('HTTP_X_FORWARDED_FOR', '')
    if forwarded:
        return forwarded.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR', '')


def _get_admin_by_id(admin_id):
    if not admin_id:
        return None
    try:
        return Admins.objects.get(admin_id=admin_id)
    except (Admins.DoesNotExist, ValueError, TypeError):
        return None


def record_admin_login(admin, request):
    """
    給 platform.py 的 admin_login 在密碼驗證通過後呼叫。
    記錄失敗不能影響登入本身，所以整段包 try/except。
    """
    try:
        AdminLoginHistory.objects.create(
            admin=admin,
            ip_address=_get_client_ip(request)[:50],
            user_agent=request.META.get('HTTP_USER_AGENT', '')[:255],
        )
        old_ids = list(
            AdminLoginHistory.objects.filter(admin=admin)
            .order_by('-login_at')
            .values_list('log_id', flat=True)[ADMIN_LOGIN_HISTORY_KEEP:]
        )
        if old_ids:
            AdminLoginHistory.objects.filter(log_id__in=old_ids).delete()
    except Exception:
        logger.exception("記錄管理員登入紀錄失敗（admin_id=%s）", getattr(admin, 'admin_id', None))


## 管理員忘記密碼：寄送驗證碼
@api_view(['POST'])
@permission_classes([AllowAny])
def admin_forgot_password(request):
    email = (request.data.get('email') or '').strip()

    if not email:
        return Response(
            {'success': False, 'err': 'email 為必填'},
            status=status.HTTP_400_BAD_REQUEST
        )

    admin = Admins.objects.filter(email__iexact=email).first()
    if not admin:
        # 不透露這個信箱是不是管理員
        return Response({'success': True, 'err': '', 'message': GENERIC_FORGOT_OK_MESSAGE},
                        status=status.HTTP_200_OK)

    latest = AdminPasswordResetCode.objects.filter(admin=admin).order_by('-created_at').first()
    if latest and (timezone.now() - latest.created_at).total_seconds() < ADMIN_RESET_RESEND_COOLDOWN_SECONDS:
        return Response(
            {'success': False, 'err': f'請稍候 {ADMIN_RESET_RESEND_COOLDOWN_SECONDS} 秒再重新寄送'},
            status=status.HTTP_429_TOO_MANY_REQUESTS
        )

    code = _generate_code()
    try:
        with transaction.atomic():
            # 舊的未使用驗證碼一律作廢，只認最新一組
            AdminPasswordResetCode.objects.filter(admin=admin, is_used=False).update(is_used=True)
            AdminPasswordResetCode.objects.create(
                admin=admin,
                code=code,
                expires_at=timezone.now() + timedelta(minutes=ADMIN_RESET_CODE_TTL_MINUTES),
            )
            # 寄信失敗就整筆 rollback，不留下一組使用者永遠收不到的驗證碼
            send_admin_password_reset_email(admin, code)
    except Exception as email_error:
        logger.warning(f"寄送管理員重設密碼驗證碼失敗（admin_id={admin.admin_id}）: {email_error}")
        return Response(
            {'success': False, 'err': '驗證碼寄送失敗，請稍後再試'},
            status=status.HTTP_502_BAD_GATEWAY
        )

    return Response({'success': True, 'err': '', 'message': GENERIC_FORGOT_OK_MESSAGE},
                    status=status.HTTP_200_OK)


## 管理員忘記密碼：驗證驗證碼並重設密碼
@api_view(['POST'])
@permission_classes([AllowAny])
def admin_reset_password(request):
    email = (request.data.get('email') or '').strip()
    code = (request.data.get('code') or '').strip()
    new_password = request.data.get('new_password') or ''

    if not email or not code or not new_password:
        return Response(
            {'success': False, 'err': 'email、code、new_password 為必填'},
            status=status.HTTP_400_BAD_REQUEST
        )

    if len(new_password) < ADMIN_PASSWORD_MIN_LENGTH:
        return Response(
            {'success': False, 'err': f'密碼需至少 {ADMIN_PASSWORD_MIN_LENGTH} 位'},
            status=status.HTTP_400_BAD_REQUEST
        )

    admin = Admins.objects.filter(email__iexact=email).first()
    if not admin:
        return Response({'success': False, 'err': GENERIC_RESET_FAIL_MESSAGE},
                        status=status.HTTP_400_BAD_REQUEST)

    with transaction.atomic():
        reset_code = (
            AdminPasswordResetCode.objects.select_for_update()
            .filter(admin=admin, is_used=False)
            .order_by('-created_at')
            .first()
        )

        if (
            not reset_code
            or reset_code.expires_at < timezone.now()
            or reset_code.failed_attempts >= ADMIN_RESET_CODE_MAX_ATTEMPTS
        ):
            return Response({'success': False, 'err': GENERIC_RESET_FAIL_MESSAGE},
                            status=status.HTTP_400_BAD_REQUEST)

        if not constant_time_compare(reset_code.code, code):
            reset_code.failed_attempts += 1
            remaining = ADMIN_RESET_CODE_MAX_ATTEMPTS - reset_code.failed_attempts
            if remaining <= 0:
                reset_code.is_used = True
            reset_code.save(update_fields=['failed_attempts', 'is_used'])
            err = (f'驗證碼錯誤，還可以再試 {remaining} 次' if remaining > 0
                   else '錯誤次數過多，此驗證碼已失效，請重新申請')
            return Response({'success': False, 'err': err}, status=status.HTTP_400_BAD_REQUEST)

        admin.password = make_password(new_password)
        admin.password_updated_at = timezone.now()
        admin.save(update_fields=['password', 'password_updated_at'])

        reset_code.is_used = True
        reset_code.save(update_fields=['is_used'])

    return Response({'success': True, 'err': ''}, status=status.HTTP_200_OK)


## 管理員登入與安全性：帳號資訊（密碼最後更新時間等）
@api_view(['GET'])
@permission_classes([AllowAny])
def admin_security_info(request):
    admin = _get_admin_by_id(request.query_params.get('admin_id'))
    if not admin:
        return Response({'success': False, 'err': '找不到對應的管理員'},
                        status=status.HTTP_404_NOT_FOUND)

    return Response({
        'success': True,
        'err': '',
        'admin_id': admin.admin_id,
        'name': admin.name,
        'email': admin.email,
        'role': admin.role,
        'last_login_at': admin.last_login_at,
        'password_updated_at': admin.password_updated_at,
    }, status=status.HTTP_200_OK)


## 管理員登入與安全性：最近登入紀錄
@api_view(['GET'])
@permission_classes([AllowAny])
def admin_login_history(request):
    admin = _get_admin_by_id(request.query_params.get('admin_id'))
    if not admin:
        return Response({'success': False, 'err': '找不到對應的管理員'},
                        status=status.HTTP_404_NOT_FOUND)

    logs = AdminLoginHistory.objects.filter(admin=admin).order_by('-login_at')[:ADMIN_LOGIN_HISTORY_SHOW]

    return Response({
        'success': True,
        'err': '',
        'logs': [
            {
                'log_id': log.log_id,
                'ip_address': log.ip_address,
                'user_agent': log.user_agent,
                'login_at': log.login_at,
            }
            for log in logs
        ],
    }, status=status.HTTP_200_OK)


## 管理員登入與安全性：變更密碼
@api_view(['POST'])
@permission_classes([AllowAny])
def admin_change_password(request):
    admin_id = request.data.get('admin_id')
    current_password = request.data.get('current_password') or ''
    new_password = request.data.get('new_password') or ''

    if not admin_id or not current_password or not new_password:
        return Response(
            {'success': False, 'err': 'admin_id、current_password、new_password 為必填'},
            status=status.HTTP_400_BAD_REQUEST
        )

    if len(new_password) < ADMIN_PASSWORD_MIN_LENGTH:
        return Response(
            {'success': False, 'err': f'新密碼需至少 {ADMIN_PASSWORD_MIN_LENGTH} 位'},
            status=status.HTTP_400_BAD_REQUEST
        )

    admin = _get_admin_by_id(admin_id)
    if not admin:
        return Response({'success': False, 'err': '找不到對應的管理員'},
                        status=status.HTTP_404_NOT_FOUND)

    if not check_password(current_password, admin.password):
        return Response({'success': False, 'err': '目前密碼不正確'},
                        status=status.HTTP_401_UNAUTHORIZED)

    if check_password(new_password, admin.password):
        return Response({'success': False, 'err': '新密碼不可與目前密碼相同'},
                        status=status.HTTP_400_BAD_REQUEST)

    admin.password = make_password(new_password)
    admin.password_updated_at = timezone.now()
    admin.save(update_fields=['password', 'password_updated_at'])

    # 已經知道密碼的人改了密碼，之前寄出去還沒用的重設驗證碼也一起作廢
    AdminPasswordResetCode.objects.filter(admin=admin, is_used=False).update(is_used=True)

    return Response({'success': True, 'err': '', 'message': '密碼已更新'}, status=status.HTTP_200_OK)
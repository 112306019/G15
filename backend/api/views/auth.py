import logging
import random
from datetime import timedelta

from django.contrib.auth.hashers import check_password
from django.db import transaction
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status
from api.models import Admins, User, PasswordResetCode, EmailVerificationCode
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth.hashers import make_password, check_password
from api.emails import send_password_reset_email, send_email_verification_email

logger = logging.getLogger(__name__)

RESET_CODE_TTL_MINUTES = 10
VERIFICATION_CODE_TTL_MINUTES = 10

# 用手機號碼註冊時，email 欄位會被塞進這個佔位網域（見 LoginPage.jsx 的 handleRegister），
# 這種帳號沒有真正的信箱可以驗證，註冊時要跳過寄信驗證這一步
PHONE_PLACEHOLDER_EMAIL_SUFFIX = '@phone.local'


def _generate_verification_code():
    return f"{random.randint(0, 999999):06d}"


## 使用者註冊
@api_view(['POST'])
@permission_classes([AllowAny])
def user_signup(request):
    name = request.data.get('name')
    email = request.data.get('email')
    password = request.data.get('password')
    phone = request.data.get('phone', None)
    role = request.data.get('role')

    # 驗證必填欄位
    if not name or not email or not password or role is None:
        return Response(
            {'success': False, 'err': 'name、email、password、role 為必填'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # 驗證 role 值
    if role not in [0, 1, 2]:
        return Response(
            {'success': False, 'err': 'role 只能是 0（廠商）、1（KOC）、2（消費者）'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # 檢查 email 是否已存在
    if User.objects.filter(email=email).exists():
        return Response(
            {'success': False, 'err': '此 Email 已被註冊'},
            status=status.HTTP_400_BAD_REQUEST
        )

    is_real_email = not email.endswith(PHONE_PLACEHOLDER_EMAIL_SUFFIX)

    try:
        with transaction.atomic():
            # 建立使用者；用手機號碼註冊的沒有真正的信箱可以驗證，直接視為已驗證
            user = User.objects.create(
                name=name,
                email=email,
                password=make_password(password),
                phone=phone or '',
                role=str(role),
                is_verified=not is_real_email,
            )

            if is_real_email:
                code = _generate_verification_code()
                EmailVerificationCode.objects.create(
                    user=user,
                    code=code,
                    expires_at=timezone.now() + timedelta(minutes=VERIFICATION_CODE_TTL_MINUTES),
                )
                # 寄信失敗要讓整筆註冊一起 rollback，不然這個 email 會卡在
                # 「已被註冊但帳號永遠拿不到驗證碼」的死狀態
                send_email_verification_email(user, code)
    except Exception as email_error:
        logger.warning(f"寄送註冊驗證信失敗（email={email}）: {email_error}")
        return Response(
            {'success': False, 'err': '驗證信寄送失敗，請稍後再試'},
            status=status.HTTP_502_BAD_GATEWAY
        )

    return Response({
        'success': True,
        'userId': user.user_id,
        'role': role,
        'requiresVerification': is_real_email,
    }, status=status.HTTP_201_CREATED)


## 註冊信箱驗證：輸入驗證碼確認信箱真的存在
@api_view(['POST'])
@permission_classes([AllowAny])
def verify_email(request):
    email = request.data.get('email')
    code = request.data.get('code')

    if not email or not code:
        return Response(
            {'success': False, 'err': 'email、code 為必填'},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        user = User.objects.get(email=email)
    except User.DoesNotExist:
        return Response(
            {'success': False, 'err': '找不到使用這個 Email 的帳號'},
            status=status.HTTP_404_NOT_FOUND
        )

    if user.is_verified:
        return Response({'success': True, 'err': ''}, status=status.HTTP_200_OK)

    verification = EmailVerificationCode.objects.filter(
        user=user, code=code, is_used=False
    ).order_by('-created_at').first()

    if not verification:
        return Response(
            {'success': False, 'err': '驗證碼錯誤'},
            status=status.HTTP_400_BAD_REQUEST
        )

    if verification.expires_at < timezone.now():
        return Response(
            {'success': False, 'err': '驗證碼已過期，請重新寄送'},
            status=status.HTTP_400_BAD_REQUEST
        )

    user.is_verified = True
    user.save()

    verification.is_used = True
    verification.save()

    return Response({'success': True, 'err': ''}, status=status.HTTP_200_OK)


## 重新寄送註冊驗證碼
@api_view(['POST'])
@permission_classes([AllowAny])
def resend_verification_code(request):
    email = request.data.get('email')

    if not email:
        return Response(
            {'success': False, 'err': 'email 為必填'},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        user = User.objects.get(email=email)
    except User.DoesNotExist:
        return Response(
            {'success': False, 'err': '找不到使用這個 Email 的帳號'},
            status=status.HTTP_404_NOT_FOUND
        )

    if user.is_verified:
        return Response(
            {'success': False, 'err': '此帳號已經完成驗證'},
            status=status.HTTP_400_BAD_REQUEST
        )

    code = _generate_verification_code()
    EmailVerificationCode.objects.create(
        user=user,
        code=code,
        expires_at=timezone.now() + timedelta(minutes=VERIFICATION_CODE_TTL_MINUTES),
    )

    try:
        send_email_verification_email(user, code)
    except Exception as email_error:
        logger.warning(f"重新寄送註冊驗證信失敗（user_id={user.user_id}）: {email_error}")
        return Response(
            {'success': False, 'err': '驗證信寄送失敗，請稍後再試'},
            status=status.HTTP_502_BAD_GATEWAY
        )

    return Response({'success': True, 'err': ''}, status=status.HTTP_200_OK)

## 使用者登入
@api_view(['POST'])
@permission_classes([AllowAny])
def user_login(request):
    email = request.data.get('email')
    password = request.data.get('password')

    # 驗證必填欄位
    if not email or not password:
        return Response(
            {'success': False, 'err': 'email 和 password 為必填'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # 查找使用者
    try:
        user = User.objects.get(email=email)
    except User.DoesNotExist:
        return Response(
            {'success': False, 'err': '帳號或密碼錯誤'},
            status=status.HTTP_401_UNAUTHORIZED
        )

    # 驗證密碼
    if not check_password(password, user.password):
        return Response(
            {'success': False, 'err': '帳號或密碼錯誤'},
            status=status.HTTP_401_UNAUTHORIZED
        )

    # 信箱還沒驗證不能登入，前端要能分辨這種情況去導去驗證流程
    if not user.is_verified:
        return Response(
            {'success': False, 'err': '請先完成 Email 驗證', 'needsVerification': True},
            status=status.HTTP_403_FORBIDDEN
        )

    # 產生 JWT token（用 user_id 當作識別）
    # 因為我們用自訂 User model 不是 Django 內建 auth.User
    # 所以手動產生 token
    from rest_framework_simplejwt.tokens import AccessToken
    import uuid

    # 用 Django 內建 auth.User 來產生 token（暫時方案）
    from django.contrib.auth.models import User as AuthUser
    auth_user, created = AuthUser.objects.get_or_create(
        username=user.user_id,
        defaults={'email': user.email}
    )
    refresh = RefreshToken.for_user(auth_user)

    return Response({
        'success': True,
        'userId': user.user_id,
        'role': int(user.role),
        'token': str(refresh.access_token),
    }, status=status.HTTP_200_OK)





## 平台管理員登入
@api_view(['POST'])
@permission_classes([AllowAny])
def admin_login(request):
    email = request.data.get('Email')
    password = request.data.get('Password')

    # 驗證必填欄位
    if not email or not password:
        return Response(
            {'success': False, 'err': 'Email 和 Password 為必填'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # 查找管理員
    try:
        admin = Admins.objects.get(email=email)
    except Admins.DoesNotExist:
        return Response(
            {'success': False, 'err': '帳號或密碼錯誤'},
            status=status.HTTP_401_UNAUTHORIZED
        )

    # 驗證密碼（目前用明文比對，之後可改成 check_password）
    if admin.password != password:
        return Response(
            {'success': False, 'err': '帳號或密碼錯誤'},
            status=status.HTTP_401_UNAUTHORIZED
        )

    # 更新最後登入時間
    admin.last_login_at = timezone.now()
    admin.save()

    return Response({
        'success': True,
        'Admin_id': admin.admin_id,
        'Name': admin.name,
        'Email': admin.email,
        'Password': admin.password,
        'Role': admin.role,
        'Status': admin.status,
        'Last_login_at': admin.last_login_at,
    }, status=status.HTTP_200_OK)


## 忘記密碼：寄送驗證碼到使用者信箱
@api_view(['POST'])
@permission_classes([AllowAny])
def forgot_password(request):
    email = request.data.get('email')

    if not email:
        return Response(
            {'success': False, 'err': 'email 為必填'},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        user = User.objects.get(email=email)
    except User.DoesNotExist:
        return Response(
            {'success': False, 'err': '找不到使用這個 Email 的帳號'},
            status=status.HTTP_404_NOT_FOUND
        )

    code = f"{random.randint(0, 999999):06d}"
    PasswordResetCode.objects.create(
        user=user,
        code=code,
        expires_at=timezone.now() + timedelta(minutes=RESET_CODE_TTL_MINUTES),
    )

    try:
        send_password_reset_email(user, code)
    except Exception as email_error:
        logger.warning(f"寄送忘記密碼驗證碼失敗（user_id={user.user_id}）: {email_error}")
        return Response(
            {'success': False, 'err': '驗證碼寄送失敗，請稍後再試'},
            status=status.HTTP_502_BAD_GATEWAY
        )

    return Response({'success': True, 'err': ''}, status=status.HTTP_200_OK)


## 忘記密碼：驗證驗證碼並重設密碼
@api_view(['POST'])
@permission_classes([AllowAny])
def reset_password(request):
    email = request.data.get('email')
    code = request.data.get('code')
    new_password = request.data.get('new_password')

    if not email or not code or not new_password:
        return Response(
            {'success': False, 'err': 'email、code、new_password 為必填'},
            status=status.HTTP_400_BAD_REQUEST
        )

    if len(new_password) < 8:
        return Response(
            {'success': False, 'err': '密碼需至少 8 位'},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        user = User.objects.get(email=email)
    except User.DoesNotExist:
        return Response(
            {'success': False, 'err': '找不到使用這個 Email 的帳號'},
            status=status.HTTP_404_NOT_FOUND
        )

    reset_code = PasswordResetCode.objects.filter(
        user=user, code=code, is_used=False
    ).order_by('-created_at').first()

    if not reset_code:
        return Response(
            {'success': False, 'err': '驗證碼錯誤'},
            status=status.HTTP_400_BAD_REQUEST
        )

    if reset_code.expires_at < timezone.now():
        return Response(
            {'success': False, 'err': '驗證碼已過期，請重新申請'},
            status=status.HTTP_400_BAD_REQUEST
        )

    user.password = make_password(new_password)
    user.save()

    reset_code.is_used = True
    reset_code.save()

    return Response({'success': True, 'err': ''}, status=status.HTTP_200_OK)
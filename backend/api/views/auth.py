from django.contrib.auth.hashers import check_password
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status
from api.models import Admins, User
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth.hashers import make_password, check_password

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

    # 建立使用者
    user = User.objects.create(
    name=name,
    email=email,
    password=make_password(password),
    phone=phone or '',
    role=str(role),
    )

    return Response({
        'success': True,
        'userId': user.user_id,
        'role': role,
    }, status=status.HTTP_201_CREATED)

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
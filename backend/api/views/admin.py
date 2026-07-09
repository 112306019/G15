from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status
from api.models import Admins, User, Order, Payment, Transactions, AdminAuditLogs


# ── 平台管理員登入 ──
@api_view(['POST'])
@permission_classes([AllowAny])
def admin_login(request):
    from django.utils import timezone
    email = request.data.get('Email')
    password = request.data.get('Password')

    if not email or not password:
        return Response(
            {'success': False, 'err': 'Email 和 Password 為必填'},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        admin = Admins.objects.get(email=email)
    except Admins.DoesNotExist:
        return Response(
            {'success': False, 'err': '帳號或密碼錯誤'},
            status=status.HTTP_401_UNAUTHORIZED
        )

    if admin.password != password:
        return Response(
            {'success': False, 'err': '帳號或密碼錯誤'},
            status=status.HTTP_401_UNAUTHORIZED
        )

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


# ── 查看一般使用者列表 ──
@api_view(['GET'])
@permission_classes([AllowAny])
def get_consumers(request):
    user_id = request.query_params.get('User_id', None)
    role = request.query_params.get('Role', None)
    email = request.query_params.get('Email', None)

    users = User.objects.all()

    if user_id:
        users = users.filter(user_id=user_id)
    if role is not None:
        users = users.filter(role=str(role))
    if email:
        users = users.filter(email=email)

    result = []
    for u in users:
        result.append({
            'User_id': u.user_id,
            'Role': u.role,
            'Name': u.name,
            'Email': u.email,
            'Password': u.password,
            'Phone': u.phone,
            'Created_At': u.created_at,
        })

    return Response(result, status=status.HTTP_200_OK)


# ── 查看使用者訂單資料 ──
@api_view(['GET'])
@permission_classes([AllowAny])
def get_consumer_orders(request):
    user_id = request.query_params.get('User_id', None)
    order_id = request.query_params.get('Order_id', None)
    payment_status = request.query_params.get('payment_status', None)

    orders = Order.objects.all()

    if user_id:
        orders = orders.filter(user_id=user_id)
    if order_id:
        orders = orders.filter(order_id=order_id)
    if payment_status:
        orders = orders.filter(payment_status=payment_status)

    result = []
    for o in orders:
        result.append({
            'Order_id': str(o.order_id),
            'User_id': o.user_id,
            'Guest_id': o.guest_id,
            'Promotion_code': o.promotion_code,
            'total_amount': float(o.total_amount),
            'order_status': o.order_status,
            'payment_status': o.payment_status,
            'shipping_status': o.shipping_status,
            'Address_id': o.address_id,
            'created_at': o.created_at,
        })

    return Response(result, status=status.HTTP_200_OK)


# ── 查看訂單與付款資料 ──
@api_view(['GET'])
@permission_classes([AllowAny])
def get_payments(request):
    order_id = request.query_params.get('Order_id', None)
    payment_id = request.query_params.get('Payment_id', None)
    payment_status = request.query_params.get('payment_status', None)

    orders = Order.objects.all()

    if order_id:
        orders = orders.filter(order_id=order_id)
    if payment_status:
        orders = orders.filter(payment_status=payment_status)

    result = []
    for o in orders:
        payments = Payment.objects.filter(order_id=o)
        if payment_id:
            payments = payments.filter(payment_id=payment_id)
        for p in payments:
            result.append({
                'Order_id': str(o.order_id),
                'User_id': o.user_id,
                'Guest_id': o.guest_id,
                'Promotion_code': o.promotion_code,
                'total_amount': float(o.total_amount),
                'order_status': o.order_status,
                'payment_status': o.payment_status,
                'shipping_status': o.shipping_status,
                'Address_id': o.address_id,
                'created_at': o.created_at,
                'Payment_id': p.payment_id,
                'payment_method': p.payment_method,
                'transaction_id': p.transaction_id,
            })

    return Response(result, status=status.HTTP_200_OK)


# ── 查看交易紀錄 ──
@api_view(['GET'])
@permission_classes([AllowAny])
def get_transactions(request):
    transaction_id = request.query_params.get('Transaction_ID', None)
    wallets_id = request.query_params.get('Wallets_id', None)
    reference_type = request.query_params.get('Reference_type', None)

    transactions = Transactions.objects.all()

    if transaction_id:
        transactions = transactions.filter(transaction_id=transaction_id)
    if wallets_id:
        transactions = transactions.filter(wallets_id=wallets_id)
    if reference_type:
        transactions = transactions.filter(reference_type=reference_type)

    result = []
    for t in transactions:
        result.append({
            'Transaction_ID': t.transaction_id,
            'Wallets_id': t.wallets_id.wallets_id,
            'Type': t.type,
            'Amount': t.amount,
            'Reference_type': t.reference_type,
            'Reference_id': t.reference_id,
        })

    return Response(result, status=status.HTTP_200_OK)


# ── 查看管理員操作紀錄 ──
@api_view(['GET'])
@permission_classes([AllowAny])
def get_audit_logs(request):
    admin_id = request.query_params.get('Admin_id', None)
    action_type = request.query_params.get('Action_type', None)
    vendor_id = request.query_params.get('Vendor_id', None)
    influencer_id = request.query_params.get('Influencer_id', None)

    logs = AdminAuditLogs.objects.all()

    if admin_id:
        logs = logs.filter(admin_id=admin_id)
    if action_type:
        logs = logs.filter(action_type=action_type)
    if vendor_id:
        logs = logs.filter(vendor_id=vendor_id)
    if influencer_id:
        logs = logs.filter(koc_id=influencer_id)

    result = []
    for log in logs:
        result.append({
            'Log_id': log.log_id,
            'Admin_id': log.admin_id.admin_id,
            'Action_type': log.action_type,
            'Submission_id': log.submission_id,
            'Tasks_id': log.tasks_id,
            'Influencer_id': log.koc_id,
            'Vendor_id': log.vendor_id,
            'Action_reason': log.action_reason,
            'created_at': log.created_at,
        })

    return Response(result, status=status.HTTP_200_OK)
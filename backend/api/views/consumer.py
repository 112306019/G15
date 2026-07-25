from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status
from api.models import Product, Cart, CartItem, Wishlist, CouponNew, Guest, Order, OrderItem, Transactions, Payment
from api.models import User

## 商品查詢
@api_view(['GET'])
@permission_classes([AllowAny])
def get_products(request):
    product_name = request.query_params.get('Product_name', None)
    category = request.query_params.get('category', None)
    product_status = request.query_params.get('status', None)

    products = Product.objects.all()

    # 過濾條件
    if product_name:
        products = products.filter(product_name__icontains=product_name)
    if category:
        products = products.filter(category=category)
    if product_status:
        products = products.filter(status=product_status)

    result = []
    for p in products:
        result.append({
            'Product_id': p.product_id,
            'Vendor_id': p.vendor_id,
            'Product_name': p.product_name,
            'description': p.description,
            'price': p.price,
            'discounted_price': p.discounted_price,
            'stock': p.stock,
            'category': p.category,
            'image_url': p.image_url,
            'status': p.status,
        })

    return Response(result, status=status.HTTP_200_OK)

## 商品詳細資料
@api_view(['GET'])
@permission_classes([AllowAny])
def get_product_detail(request):
    product_id = request.query_params.get('Product_id', None)

    if not product_id:
        return Response(
            {'success': False, 'err': 'Product_id 為必填'},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        p = Product.objects.get(product_id=product_id)
    except Product.DoesNotExist:
        return Response(
            {'success': False, 'err': '商品不存在'},
            status=status.HTTP_404_NOT_FOUND
        )

    return Response({
        'Product_id': p.product_id,
        'Vendor_id': p.vendor_id,
        'Product_name': p.product_name,
        'description': p.description,
        'price': p.price,
        'discounted_price': p.discounted_price,
        'stock': p.stock,
        'category': p.category,
        'image_url': p.image_url,
        'status': p.status,
    }, status=status.HTTP_200_OK)

## 建立購物車
@api_view(['POST'])
@permission_classes([AllowAny])
def create_cart(request):
    user_id = request.data.get('User_id')

    if not user_id:
        return Response(
            {'success': False, 'err': 'User_id 為必填'},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        user = User.objects.get(user_id=user_id)
    except User.DoesNotExist:
        return Response(
            {'success': False, 'err': '使用者不存在'},
            status=status.HTTP_404_NOT_FOUND
        )

    # 如果已有購物車就回傳現有的，不重複建立
    cart, created = Cart.objects.get_or_create(
    user=user,
    defaults={'status': 'active'}
    )

    return Response({
        'Cart_id': cart.cart_id,
        'User_id': cart.user.user_id,
        'Created_at': cart.created_at,
        'Updated_at': cart.updated_at,
        'status': cart.status,
    }, status=status.HTTP_200_OK)

# 加入購物車商品
@api_view(['POST'])
@permission_classes([AllowAny])
def add_cart_item(request):
    cart_id = request.data.get('Cart_id')
    product_id = request.data.get('Product_id')
    quantity = request.data.get('Quantity', 1)

    if not cart_id or not product_id:
        return Response(
            {'success': False, 'err': 'Cart_id、Product_id 為必填'},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        cart = Cart.objects.get(cart_id=cart_id)
    except Cart.DoesNotExist:
        return Response(
            {'success': False, 'err': '購物車不存在'},
            status=status.HTTP_404_NOT_FOUND
        )

    try:
        product = Product.objects.get(product_id=product_id)
    except Product.DoesNotExist:
        return Response(
            {'success': False, 'err': '商品不存在'},
            status=status.HTTP_404_NOT_FOUND
        )

    unit_price = product.discounted_price if product.discounted_price else product.price
    subtotal = unit_price * quantity

    item = CartItem.objects.create(
    cart=cart,
    product=product,
    quantity=quantity,
    unit_price=unit_price,
    subtotal=subtotal,
    )

    return Response({
    'Cart_item_id': item.cart_item_id,
    'Cart_id': item.cart.cart_id,
    'Product_id': item.product.product_id,
    'quantity': item.quantity,
    'Unit_price': item.unit_price,
    'subtotal': item.subtotal,
    }, status=status.HTTP_201_CREATED)


# 查看購物車
@api_view(['GET'])
@permission_classes([AllowAny])
def view_cart(request):
    user_id = request.query_params.get('User_id')
    cart_id = request.query_params.get('Cart_id', None)

    if not user_id:
        return Response(
            {'success': False, 'err': 'User_id 為必填'},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        user = User.objects.get(user_id=user_id)
    except User.DoesNotExist:
        return Response(
            {'success': False, 'err': '使用者不存在'},
            status=status.HTTP_404_NOT_FOUND
        )

    carts = Cart.objects.filter(user=user)
    if cart_id:
        carts = carts.filter(cart_id=cart_id)

    result = []
    for cart in carts:
        items = CartItem.objects.filter(cart=cart)
        for item in items:
            result.append({
                'Cart_id': cart.cart_id,
                'User_id': cart.user.user_id,
                'Created_at': cart.created_at,
                'Updated_at': cart.updated_at,
                'status': cart.status,
                'Cart_item_id': item.cart_item_id,
                'Product_id': item.product.product_id,
                'quantity': item.quantity,
                'Unit_price': item.unit_price,
                'subtotal': item.subtotal,
            })

    if not carts.exists():
        return Response({'Cart_id': None, 'items': []}, status=status.HTTP_200_OK)

    cart = carts.first()
    items = CartItem.objects.filter(cart=cart)

    result_items = []
    for item in items:
        result_items.append({
            'Cart_item_id': item.cart_item_id,
            'Product_id': item.product.product_id,
            'product_name': item.product.product_name,
            'Unit_price': item.unit_price,
            'Quantity': item.quantity,
            'subtotal': item.subtotal,
        })

    return Response({
        'Cart_id': cart.cart_id,
        'User_id': cart.user.user_id,
        'items': result_items,
    }, status=status.HTTP_200_OK)


# 修改購物車商品數量
@api_view(['PATCH'])
@permission_classes([AllowAny])
def update_cart_item(request):
    cart_item_id = request.data.get('Cart_item_id')
    quantity = request.data.get('Quantity') or request.data.get('quantity')

    if not cart_item_id or not quantity:
        return Response(
            {'success': False, 'err': 'Cart_item_id、Quantity 為必填'},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        item = CartItem.objects.get(cart_item_id=cart_item_id)
    except CartItem.DoesNotExist:
        return Response(
            {'success': False, 'err': '購物車商品不存在'},
            status=status.HTTP_404_NOT_FOUND
        )

    item.quantity = quantity
    item.subtotal = item.unit_price * quantity
    item.save()

    return Response({
        'Cart_item_id': item.cart_item_id,
        'quantity': item.quantity,
        'Unit_price': item.unit_price,
        'subtotal': item.subtotal,
    }, status=status.HTTP_200_OK)


# 刪除購物車商品
@api_view(['DELETE'])
@permission_classes([AllowAny])
def delete_cart_item(request):
    cart_item_id = request.data.get('Cart_item_id')

    if not cart_item_id:
        return Response(
            {'success': False, 'err': 'Cart_item_id 為必填'},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        item = CartItem.objects.get(cart_item_id=cart_item_id)
    except CartItem.DoesNotExist:
        return Response(
            {'success': False, 'err': '購物車商品不存在'},
            status=status.HTTP_404_NOT_FOUND
        )

    cart_id = item.cart.cart_id
    product_id = item.product.product_id
    item.delete()

    return Response({
        'Cart_item_id': cart_item_id,
        'Cart_id': cart_id,
        'Product_id': product_id,
    }, status=status.HTTP_200_OK)


# ── 加入收藏清單 ──
@api_view(['POST'])
@permission_classes([AllowAny])
def add_wishlist(request):
    user_id = request.data.get('User_id')
    product_id = request.data.get('Product_id')

    if not user_id or not product_id:
        return Response(
            {'success': False, 'err': 'User_id 和 Product_id 為必填'},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        user = User.objects.get(user_id=user_id)
    except User.DoesNotExist:
        return Response(
            {'success': False, 'err': '使用者不存在'},
            status=status.HTTP_404_NOT_FOUND
        )

    try:
        product = Product.objects.get(product_id=product_id)
    except Product.DoesNotExist:
        return Response(
            {'success': False, 'err': '商品不存在'},
            status=status.HTTP_404_NOT_FOUND
        )

    wishlist = Wishlist.objects.create(
        user=user,
        product=product,
    )

    return Response({
        'Wishlist_id': wishlist.wishlist_id,
        'User_id': wishlist.user.user_id,
        'Product_id': wishlist.product.product_id,
    }, status=status.HTTP_201_CREATED)


# ── 查看收藏清單 ──
@api_view(['GET'])
@permission_classes([AllowAny])
def view_wishlist(request):
    user_id = request.query_params.get('User_id') or request.query_params.get('user_id')

    if not user_id:
        return Response(
            {'success': False, 'err': 'User_id 為必填'},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        user = User.objects.get(user_id=user_id)
    except User.DoesNotExist:
        return Response(
            {'success': False, 'err': '使用者不存在'},
            status=status.HTTP_404_NOT_FOUND
        )

    wishlists = Wishlist.objects.filter(user=user)
    result = []
    for w in wishlists:
        result.append({
            'Wishlist_id': w.wishlist_id,
            'User_id': w.user.user_id,
            'Product_id': w.product.product_id,
            'product_name': w.product.product_name,
            'price': w.product.discounted_price or w.product.price,
        })

    return Response(result, status=status.HTTP_200_OK)


# ── 刪除收藏商品 ──
@api_view(['DELETE'])
@permission_classes([AllowAny])
def delete_wishlist(request):
    wishlist_id = request.data.get('Wishlist_id')

    if not wishlist_id:
        return Response(
            {'success': False, 'err': 'Wishlist_id 為必填'},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        wishlist = Wishlist.objects.get(wishlist_id=wishlist_id)
    except Wishlist.DoesNotExist:
        return Response(
            {'success': False, 'err': '收藏商品不存在'},
            status=status.HTTP_404_NOT_FOUND
        )

    user_id = wishlist.user_id.user_id
    product_id = wishlist.product_id.product_id
    wishlist.delete()

    return Response({
        'Wishlist_id': wishlist_id,
        'User_id': user_id,
        'Product_id': product_id,
    }, status=status.HTTP_200_OK)


# ── 驗證優惠碼 ──
@api_view(['POST'])
@permission_classes([AllowAny])
def verify_coupon(request):
    promotion_code = request.data.get('Promotion_code')

    if not promotion_code:
        return Response(
            {'success': False, 'err': 'Promotion_code 為必填'},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        coupon = CouponNew.objects.get(promotion_code=promotion_code)
    except CouponNew.DoesNotExist:
        return Response(
            {'success': False, 'err': '優惠碼不存在'},
            status=status.HTTP_404_NOT_FOUND
        )

    return Response({
        'Coupon_id': coupon.coupon_id,
        'KOCMisson_id': coupon.kocmission.kocmission_id if coupon.kocmission else None,
        'Promotion_code': coupon.promotion_code,
        'Discount_value': coupon.discount_value,
        'Status': coupon.status,
    }, status=status.HTTP_200_OK)


# ── 建立訪客資料 ──
@api_view(['POST'])
@permission_classes([AllowAny])
def create_guest(request):
    order_id = request.data.get('Order_id')

    if not order_id:
        return Response(
            {'success': False, 'err': 'Order_id 為必填'},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        order = Order.objects.get(order_id=order_id)
    except Order.DoesNotExist:
        return Response(
            {'success': False, 'err': '訂單不存在'},
            status=status.HTTP_404_NOT_FOUND
        )

    guest = Guest.objects.create(order_id=order)

    return Response({
        'Guest_id': guest.guest_id,
        'Order_id': guest.order_id.order_id,
    }, status=status.HTTP_201_CREATED)


# ── 建立訂單 ──
@api_view(['POST'])
@permission_classes([AllowAny])
def create_order(request):
    user_id = request.data.get('User_id', None)
    guest_id = request.data.get('Guest_id', None)
    promotion_code = request.data.get('Promotion_code', None)
    total_amount = request.data.get('total_amount')

    if not total_amount:
        return Response(
            {'success': False, 'err': 'total_amount 為必填'},
            status=status.HTTP_400_BAD_REQUEST
        )

    if not user_id and not guest_id:
        return Response(
            {'success': False, 'err': 'User_id 或 Guest_id 至少填一個'},
            status=status.HTTP_400_BAD_REQUEST
        )

    order = Order.objects.create(
        user_id=user_id or '',
        guest_id=guest_id or '',
        promotion_code=promotion_code or '',
        total_amount=total_amount,
        order_status='pending',
        payment_status='unpaid',
        shipping_status='unshipped',
        address_id='',
    )

    return Response({
        'success': True,
        'orderId': str(order.order_id),
        'orderStatus': order.order_status,
        'paymentStatus': order.payment_status,
        'shippingStatus': order.shipping_status,
        'totalAmount': float(order.total_amount),
    }, status=status.HTTP_201_CREATED)


# ── 查看訂單 ──
@api_view(['GET'])
@permission_classes([AllowAny])
def view_order(request):
    user_id = request.query_params.get('User_id') or request.query_params.get('user_id')
    guest_id = request.query_params.get('Guest_id', None)
    order_id = request.query_params.get('Order_id', None)

    orders = Order.objects.all()

    if user_id:
        orders = orders.filter(user_id=user_id)
    if guest_id:
        orders = orders.filter(guest_id=guest_id)
    if order_id:
        orders = orders.filter(order_id=order_id)

    result = []
    for order in orders:
        items = OrderItem.objects.filter(order=order)
        order_data = {
            'Order_id': str(order.order_id),
            'User_id': order.user_id,
            'Guest_id': order.guest_id,
            'Promotion_code': order.promotion_code,
            'total_amount': float(order.total_amount),
            'order_status': order.order_status,
            'payment_status': order.payment_status,
            'shipping_status': order.shipping_status,
            'Address_id': order.address_id,
            'created_at': order.created_at,
            'items': [
                {
                    'Order_item_id': str(item.order_item_id),
                    'Product_id': item.product_id,
                    'quantity': item.quantity,
                    'Unit_price': float(item.unit_price),
                    'subtotal': float(item.subtotal),
                }
            for item in items
        ],
        }
        result.append(order_data)

    return Response(result, status=status.HTTP_200_OK)


# ── 建立交易紀錄 ──
@api_view(['POST'])
@permission_classes([AllowAny])
def create_transaction(request):
    print("request.data:", request.data)
    wallet_type = request.data.get('wallet_type', 'koc')
    type_ = request.data.get('Type') or request.data.get('type')
    amount = request.data.get('Amount')
    reference_type = request.data.get('Reference_type')
    reference_id = request.data.get('Reference_id')

    if not type_ or not amount:
        return Response(
            {'success': False, 'err': 'Type、Amount 為必填'},
            status=status.HTTP_400_BAD_REQUEST
        )

    transaction = Transactions.objects.create(
        koc_wallet=None,
        vendor_wallet=None,
        type=type_,
        amount=amount,
        reference_type=reference_type,
        reference_id=str(reference_id) if reference_id else None,
    )

    return Response({
        'Transaction_ID': transaction.transaction_id,
        'Type': transaction.type,
        'Amount': transaction.amount,
        'Reference_type': transaction.reference_type,
        'Reference_id': transaction.reference_id,
    }, status=status.HTTP_201_CREATED)


# ── 更新付款狀態 ──
@api_view(['POST'])
@permission_classes([AllowAny])
def update_payment(request):
    order_id = request.data.get('Order_id')
    payment_method = request.data.get('payment_method')
    payment_status = request.data.get('payment_status', 'paid')
    transaction_id = request.data.get('transaction_id', None)

    if not order_id or not payment_method:
        return Response(
            {'success': False, 'err': 'Order_id、payment_method 為必填'},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        order = Order.objects.get(order_id=order_id)
    except Order.DoesNotExist:
        return Response(
            {'success': False, 'err': '訂單不存在'},
            status=status.HTTP_404_NOT_FOUND
        )

    # 建立或更新 payment record
    payment, created = Payment.objects.get_or_create(
        order=order,
        defaults={
            'payment_method': payment_method,
            'payment_status': payment_status,
            'transaction_id': transaction_id,
        }
    )

    if not created:
        payment.payment_method = payment_method
        payment.payment_status = payment_status
        if transaction_id:
            payment.transaction_id = transaction_id
        payment.save()

    return Response({
        'Payment_id': payment.payment_id,
        'Order_id': str(order.order_id),
        'payment_status': payment.payment_status,
        'payment_method': payment.payment_method,
    }, status=status.HTTP_200_OK)


# ── 接收付款結果 ──
@api_view(['POST'])
@permission_classes([AllowAny])
def payment_result(request):
    order_id = request.data.get('Order_id')
    payment_status = request.data.get('payment_status', 'paid')

    if not order_id:
        return Response(
            {'success': False, 'err': 'Order_id 為必填'},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        order = Order.objects.get(order_id=order_id)
    except Order.DoesNotExist:
        return Response(
            {'success': False, 'err': '訂單不存在'},
            status=status.HTTP_404_NOT_FOUND
        )

    order.payment_status = payment_status
    order.save()

    return Response({
        'success': True,
        'Order_id': str(order.order_id),
        'payment_status': order.payment_status,
    }, status=status.HTTP_200_OK)
    
# ── 完成訂單 ──
@api_view(['PATCH'])
@permission_classes([AllowAny])
def update_order_status(request):
    order_id = request.data.get('Order_id')
    order_status = request.data.get('order_status')

    if not order_id or not order_status:
        return Response(
            {'success': False, 'err': 'Order_id 和 order_status 為必填'},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        order = Order.objects.get(order_id=order_id)
    except Order.DoesNotExist:
        return Response(
            {'success': False, 'err': '訂單不存在'},
            status=status.HTTP_404_NOT_FOUND
        )

    order.order_status = order_status
    order.save()

    return Response({
        'success': True,
        'Order_id': str(order.order_id),
        'order_status': order.order_status,
    }, status=status.HTTP_200_OK)
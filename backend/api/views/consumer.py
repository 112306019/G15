from decimal import Decimal, ROUND_HALF_UP
from datetime import timedelta

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status
from django.db import transaction
from django.utils import timezone
from api.models import Product, Cart, CartItem, Wishlist, CouponNew, Guest, Order, OrderItem, Transactions, Payment, Campaigns, CampaignProduct, User, Vendor, Address
from .platform import calculate_order_commission


def _has_active_campaign(product_id):
    """商品是否目前綁定一個「進行中」的活動（狀態 active 且落在 start_date ~ end_date 之間）"""
    now = timezone.now()
    return CampaignProduct.objects.filter(
        product_id=product_id,
        campaign__status='active',
        campaign__start_date__lte=now,
        campaign__end_date__gte=now
    ).exists()


def _is_campaign_promo_expired(campaign):
    """活動是否已經超過優惠碼效期（活動結束日 + promo_days 寬限期）"""
    deadline = campaign.end_date + timedelta(days=campaign.promo_days or 0)
    return timezone.now() > deadline


## 商品查詢
@api_view(['GET'])
@permission_classes([AllowAny])
def get_products(request):
    product_name = request.query_params.get('Product_name', None)
    category = request.query_params.get('category', None)
    product_status = request.query_params.get('status', None)

    products = Product.objects.filter(status='active')

    # 只顯示目前有「進行中」活動的商品——活動狀態要是 active，
    # 而且現在時間要落在 start_date ~ end_date 之間，跟廠商端判斷「推廣中」用同一套規則。
    now = timezone.now()
    promoted_product_ids = CampaignProduct.objects.filter(
        campaign__status='active',
        campaign__start_date__lte=now,
        campaign__end_date__gte=now
    ).values_list('product_id', flat=True)
    products = products.filter(product_id__in=promoted_product_ids)
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
        p = Product.objects.get(product_id=product_id, status='active')
    except Product.DoesNotExist:
        return Response(
            {'success': False, 'err': '商品不存在或已下架'},
            status=status.HTTP_404_NOT_FOUND
        )

    if not _has_active_campaign(product_id):
        return Response(
            {'success': False, 'err': '商品不存在或已下架'},
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
        product = Product.objects.get(product_id=product_id, status='active')
    except Product.DoesNotExist:
        return Response(
            {'success': False, 'err': '商品不存在或已下架'},
            status=status.HTTP_404_NOT_FOUND
        )

    if not _has_active_campaign(product_id):
        return Response(
            {'success': False, 'err': '商品不存在或已下架'},
            status=status.HTTP_404_NOT_FOUND
        )

    unit_price = product.discounted_price if product.discounted_price else product.price
    subtotal = unit_price * quantity

    existing_item = CartItem.objects.filter(cart=cart, product=product).first()
    
    if existing_item:
        existing_item.quantity += quantity
        existing_item.subtotal = existing_item.unit_price * existing_item.quantity
        existing_item.save()
        item = existing_item
    else:
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

    # 用 get_or_create 避免重複點擊加入收藏時，同一個商品被建立多筆重複紀錄
    wishlist, _ = Wishlist.objects.get_or_create(
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

    wishlists = Wishlist.objects.filter(user=user).select_related('product')
    result = []
    for w in wishlists:
        result.append({
            'Wishlist_id': w.wishlist_id,
            'User_id': w.user.user_id,
            'Product_id': w.product.product_id,
            'product_name': w.product.product_name,
            'price': w.product.discounted_price or w.product.price,
            'image_url': w.product.image_url,
        })

    return Response(result, status=status.HTTP_200_OK)


# ── 刪除收藏商品 ──
@api_view(['DELETE'])
@permission_classes([AllowAny])
def delete_wishlist(request):
    wishlist_id = request.data.get('Wishlist_id')
    user_id = request.data.get('User_id')
    product_id = request.data.get('Product_id')

    if wishlist_id:
        matches = Wishlist.objects.filter(wishlist_id=wishlist_id)
    elif user_id and product_id:
        # 前端實際上都是用 User_id + Product_id 呼叫這支 API（沒有先查出 Wishlist_id）
        matches = Wishlist.objects.filter(user_id=user_id, product_id=product_id)
    else:
        return Response(
            {'success': False, 'err': '需提供 Wishlist_id，或 User_id 和 Product_id'},
            status=status.HTTP_400_BAD_REQUEST
        )

    wishlist = matches.select_related('user', 'product').first()

    if not wishlist:
        return Response(
            {'success': False, 'err': '收藏商品不存在'},
            status=status.HTTP_404_NOT_FOUND
        )

    result_wishlist_id = wishlist.wishlist_id
    result_user_id = wishlist.user.user_id
    result_product_id = wishlist.product.product_id
    wishlist.delete()

    return Response({
        'Wishlist_id': result_wishlist_id,
        'User_id': result_user_id,
        'Product_id': result_product_id,
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

    if coupon.status != 'active':
        return Response(
            {'success': False, 'err': '優惠碼未啟用或已失效'},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        campaign = coupon.kocmission.application.campaign
    except Exception:
        return Response(
            {'success': False, 'err': '優惠碼未綁定任何活動'},
            status=status.HTTP_400_BAD_REQUEST
        )

    if _is_campaign_promo_expired(campaign):
        # lazy write：讀到才順便把狀態寫回，不用額外排程
        coupon.status = 'expired'
        coupon.save(update_fields=['status'])
        return Response(
            {'success': False, 'err': '優惠碼已過期'},
            status=status.HTTP_400_BAD_REQUEST
        )

    campaign_products = CampaignProduct.objects.filter(campaign=campaign).select_related('product')

    if not campaign_products:
        return Response(
            {'success': False, 'err': '此優惠碼沒有適用的商品'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # 折扣規則是每個商品各自在 CampaignProduct 裡的 discount_type/discount_value，
    # 不是 coupon 本身的欄位；promotion_code 只是啟用這個活動折扣的開關。
    product_discounts = [
        {
            'product_id': cp.product.product_id,
            'discount_type': cp.discount_type,
            'discount_value': float(cp.discount_value),
        }
        for cp in campaign_products
    ]

    return Response({
        'Coupon_id': coupon.coupon_id,
        'Promotion_code': coupon.promotion_code,
        'Campaign_id': str(campaign.campaign_id),
        'Campaign_name': campaign.name,
        'applicable_product_ids': [pd['product_id'] for pd in product_discounts],
        'product_discounts': product_discounts,
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
    promotion_code = request.data.get('Promotion_code', None)
    items_data = request.data.get('items') or []

    recipient_name = request.data.get('recipient')
    recipient_phone = request.data.get('recipient_phone')
    recipient_address = request.data.get('recipient_address')

    if not user_id:
        return Response(
            {'success': False, 'err': 'User_id 為必填，需登入會員才能下單'},
            status=status.HTTP_400_BAD_REQUEST
        )

    if not items_data:
        return Response(
            {'success': False, 'err': 'items 為必填，訂單至少需要一項商品'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # 先把商品都查出來，任何一項商品不存在或庫存不足就整單擋下，
    # 不要建立一張「買了不存在商品」的訂單。
    product_ids = [item.get('Product_id') for item in items_data]
    products_by_id = {
        p.product_id: p
        for p in Product.objects.filter(product_id__in=product_ids)
    }

    for item in items_data:
        product_id = item.get('Product_id')
        quantity = int(item.get('Quantity') or 1)
        product = products_by_id.get(product_id)

        if not product:
            return Response(
                {'success': False, 'err': f'商品 {product_id} 不存在'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if product.stock < quantity:
            return Response(
                {'success': False, 'err': f'{product.product_name} 庫存不足'},
                status=status.HTTP_400_BAD_REQUEST
            )

    # 金額一律由後端重新計算，不採信前端傳來的 total_amount，避免被竄改請求內容占便宜。
    # base_subtotal 是套用優惠碼前，商品本身售價(discounted_price 或 price) x 數量的小計。
    line_items = []
    for item in items_data:
        product_id = item.get('Product_id')
        quantity = int(item.get('Quantity') or 1)
        product = products_by_id[product_id]

        unit_price = Decimal(product.discounted_price if product.discounted_price else product.price)
        base_subtotal = unit_price * quantity

        line_items.append({
            'product': product,
            'quantity': quantity,
            'unit_price': unit_price,
            'base_subtotal': base_subtotal,
            'eligible': False,
            'final_subtotal': base_subtotal,
        })

    # 套用優惠碼：promotion_code 只是「啟用該活動折扣」的開關，
    # 實際折扣規則要看 CampaignProduct 裡每個商品各自的 discount_type/discount_value，
    # 不是 CouponNew 自己的 discount_type/discount_value。
    if promotion_code:
        coupon = CouponNew.objects.filter(promotion_code=promotion_code).first()
        if not coupon:
            return Response(
                {'success': False, 'err': '優惠碼不存在'},
                status=status.HTTP_400_BAD_REQUEST
            )
        if coupon.status != 'active':
            return Response(
                {'success': False, 'err': '優惠碼未啟用或已失效'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            campaign = coupon.kocmission.application.campaign
        except Exception:
            return Response(
                {'success': False, 'err': '優惠碼未綁定任何活動'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if _is_campaign_promo_expired(campaign):
            coupon.status = 'expired'
            coupon.save(update_fields=['status'])
            return Response(
                {'success': False, 'err': '優惠碼已過期'},
                status=status.HTTP_400_BAD_REQUEST
            )

        campaign_products_by_product_id = {
            cp.product_id: cp
            for cp in CampaignProduct.objects.filter(campaign=campaign)
        }

        for line in line_items:
            campaign_product = campaign_products_by_product_id.get(line['product'].product_id)
            if not campaign_product:
                continue  # 不屬於這個活動的商品，維持原價

            line['eligible'] = True
            discount_value = campaign_product.discount_value

            if campaign_product.discount_type == 'percentage':
                discounted = line['base_subtotal'] * (Decimal('1') - discount_value / Decimal('100'))
            else:
                discounted = line['base_subtotal'] - discount_value

            line['final_subtotal'] = max(discounted, Decimal('0')).quantize(
                Decimal('0.01'), rounding=ROUND_HALF_UP
            )

    total_amount = sum(
        (line['final_subtotal'] for line in line_items), Decimal('0')
    ).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)

    with transaction.atomic():
        # 結帳頁有收集收件人姓名、電話跟地址，把它們存成一筆 Address，
        # 綁在下單的會員身上（不支援訪客結帳，所以一定有 user_id）。
        address = None
        if recipient_name or recipient_phone or recipient_address:
            address = Address.objects.create(
                user_id=user_id,
                recipient_name=recipient_name or '',
                phone=recipient_phone or '',
                detail_address=recipient_address or '',
            )

        order = Order.objects.create(
            user_id=user_id,
            promotion_code=promotion_code or '',
            total_amount=total_amount,
            order_status='pending',
            payment_status='unpaid',
            shipping_status='unshipped',
            address=address,
        )

        created_items = []
        for line in line_items:
            product = line['product']

            order_item = OrderItem.objects.create(
                order=order,
                product=product,
                quantity=line['quantity'],
                unit_price=line['unit_price'],
                subtotal=line['final_subtotal'],
            )
            created_items.append(order_item)

            product.stock = max(0, product.stock - line['quantity'])
            product.save(update_fields=['stock'])

    return Response({
        'success': True,
        'orderId': str(order.order_id),
        'orderStatus': order.order_status,
        'paymentStatus': order.payment_status,
        'shippingStatus': order.shipping_status,
        'totalAmount': float(order.total_amount),
        'itemCount': len(created_items),
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

    order_list = list(orders)
    items_by_order = {}
    vendor_ids = set()
    for order in order_list:
        items = list(OrderItem.objects.filter(order=order).select_related('product'))
        items_by_order[order.order_id] = items
        for item in items:
            if item.product and item.product.vendor_id:
                vendor_ids.add(item.product.vendor_id)

    vendor_name_by_id = {
        v.vendor_id: v.company_name
        for v in Vendor.objects.filter(vendor_id__in=vendor_ids)
    }

    result = []
    for order in order_list:
        items = items_by_order[order.order_id]
        first_vendor_id = items[0].product.vendor_id if items and items[0].product else None
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
            'vendor_name': vendor_name_by_id.get(first_vendor_id, ''),
            'items': [
                {
                    'Order_item_id': str(item.order_item_id),
                    'Product_id': item.product_id,
                    'product_name': item.product.product_name,
                    'image_url': item.product.image_url,
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
    """
    暫時停用內部錢包扣款/帳務邏輯，等第三方金流 API 串接後再實作真正的
    Transactions 寫入。koc_wallet/vendor_wallet 目前都拿不到真實錢包，
    若照舊寫入會違反 transactions_exactly_one_wallet 這個 Check Constraint，
    這裡先直接回傳模擬成功。
    """
    type_ = request.data.get('Type') or request.data.get('type')
    amount = request.data.get('Amount')
    reference_type = request.data.get('Reference_type')
    reference_id = request.data.get('Reference_id')

    if not type_ or not amount:
        return Response(
            {'success': False, 'err': 'Type、Amount 為必填'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # transaction = Transactions.objects.create(
    #     koc_wallet=None,
    #     vendor_wallet=None,
    #     type=type_,
    #     amount=amount,
    #     reference_type=reference_type,
    #     reference_id=str(reference_id) if reference_id else None,
    # )

    return Response({
        'success': True,
        'Transaction_ID': None,
        'Type': type_,
        'Amount': amount,
        'Reference_type': reference_type,
        'Reference_id': str(reference_id) if reference_id else None,
    }, status=status.HTTP_200_OK)


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
    user_id = request.data.get('User_id')
    guest_id = request.data.get('Guest_id')

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

    commission_result = None

    # 「完成訂單」是分潤唯一的觸發點，需要額外驗證，
    # 避免商品送達前、或已取消/退款的訂單被算進分潤。
    if order_status == 'completed':
        if user_id and str(order.user_id) != str(user_id):
            return Response(
                {'success': False, 'err': '無權限操作此訂單'},
                status=status.HTTP_403_FORBIDDEN
            )

        if guest_id and str(order.guest_id) != str(guest_id):
            return Response(
                {'success': False, 'err': '無權限操作此訂單'},
                status=status.HTTP_403_FORBIDDEN
            )

        if order.order_status == 'cancelled':
            return Response(
                {'success': False, 'err': '此訂單已取消，無法確認完成'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if order.payment_status not in ('paid', 'completed'):
            return Response(
                {'success': False, 'err': '此訂單尚未完成付款，無法確認完成'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if order.shipping_status != 'delivered':
            return Response(
                {'success': False, 'err': '此訂單尚未送達，無法確認完成'},
                status=status.HTTP_400_BAD_REQUEST
            )

        already_completed = order.order_status == 'completed'

        order.order_status = 'completed'
        order.save()

        if not already_completed:
            try:
                commission_result = calculate_order_commission(order)
            except ValueError as commission_error:
                commission_result = {
                    'created': False,
                    'commission_amount': 0,
                    'message': str(commission_error)
                }
    else:
        order.order_status = order_status
        order.save()

    response_data = {
        'success': True,
        'Order_id': str(order.order_id),
        'order_status': order.order_status,
    }

    if commission_result:
        response_data['commission'] = commission_result

    return Response(response_data, status=status.HTTP_200_OK)


# ── 查看商品所屬活動 ──
@api_view(['GET'])
@permission_classes([AllowAny])
def get_product_campaign(request):
    product_id = request.query_params.get('Product_id')

    if not product_id:
        return Response({'success': False, 'err': 'Product_id 為必填'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        campaign_product = CampaignProduct.objects.filter(product__product_id=product_id).first()
        if not campaign_product:
            return Response({'success': False, 'err': '找不到對應活動'}, status=status.HTTP_404_NOT_FOUND)

        campaign = Campaigns.objects.get(campaign_id=campaign_product.campaign_id)
        return Response({
            'campaign_id': str(campaign.campaign_id),
            'name': campaign.name,
            'description': campaign.description or "",
            'reward_type': campaign.reward_type,
            'discount_type': campaign_product.discount_type,
            'discount_value': float(campaign_product.discount_value),
            'start_date': campaign.start_date,
            'end_date': campaign.end_date,
            'status': campaign.status,
        }, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({'success': False, 'err': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
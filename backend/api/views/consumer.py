from decimal import Decimal, ROUND_HALF_UP
from datetime import timedelta
import re

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status
from django.db import transaction
from django.utils import timezone
from api.models import Product, Cart, CartItem, Wishlist, CouponNew, Guest, Order, OrderItem, Transactions, Payment, Campaigns, CampaignProduct, User, Vendor, Address, ShipmentInfo, ReturnRequest
from .platform import calculate_order_commission, calculate_vendor_earning
from api.views.constants import is_return_window_open, has_unresolved_return_request, RETURN_REQUEST_WINDOW_DAYS, is_order_auto_completable
from payments.models import PaymentTransaction
from payments.services import is_payment_effectively_failed, pick_relevant_payment


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


def _complete_order_with_finance(order):
    """
    用同一套流程完成訂單，確保「手動完成」與「7 天後自動完成」都會：
    1. 寫入 order_status / completed_at
    2. 建立 KOC 分潤
    3. 建立 Vendor 凍結收入

    回傳 (commission_result, vendor_result, changed)。
    changed=False 代表這張訂單本來就已經 completed。
    """
    with transaction.atomic():
        locked_order = Order.objects.select_for_update().get(order_id=order.order_id)

        if locked_order.order_status == 'completed':
            return None, None, False

        locked_order.order_status = 'completed'
        if not locked_order.completed_at:
            locked_order.completed_at = timezone.now()
        locked_order.save(update_fields=['order_status', 'completed_at'])

        try:
            commission_result = calculate_order_commission(locked_order)
        except ValueError as commission_error:
            commission_result = {
                'created': False,
                'commission_amount': 0,
                'message': str(commission_error),
            }

        try:
            vendor_result = calculate_vendor_earning(locked_order)
        except Exception as vendor_error:
            vendor_result = [{
                'created': False,
                'message': str(vendor_error),
            }]

    return commission_result, vendor_result, True


def sync_auto_completed_orders():
    """
    Lazy sync：把已送達超過 7 天、沒有未結案退貨申請的訂單自動完成。

    不能用 QuerySet.update() 直接改狀態，因為完成訂單同時是建立
    KOC 分潤與 Vendor 凍結收入的觸發點；因此逐筆走 _complete_order_with_finance。
    """
    cutoff = timezone.now() - timedelta(days=RETURN_REQUEST_WINDOW_DAYS)

    candidates = (
        Order.objects
        .filter(
            shipping_status='delivered',
            delivered_at__isnull=False,
            delivered_at__lt=cutoff,
            payment_status__in=['paid', 'completed'],
        )
        .exclude(order_status__in=['completed', 'cancelled'])
        .order_by('delivered_at')
    )

    completed_count = 0

    for order in candidates:
        if not is_order_auto_completable(order):
            continue

        _commission, _vendor, changed = _complete_order_with_finance(order)
        if changed:
            completed_count += 1

    return completed_count


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
        vendor = Vendor.objects.filter(vendor_id=p.vendor_id).first()
        result.append({
            'Product_id': p.product_id,
            'Vendor_id': p.vendor_id,
            'Vendor_name': vendor.company_name if vendor else p.vendor_id,
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

    vendor = Vendor.objects.filter(vendor_id=p.vendor_id).first()

    return Response({
        'Product_id': p.product_id,
        'Vendor_id': p.vendor_id,
        'Vendor_name': vendor.company_name if vendor else p.vendor_id,
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

    # ============================
    # 收件資訊
    # ============================
    recipient_name = request.data.get('recipient')
    recipient_phone = request.data.get('recipient_phone')
    recipient_address = request.data.get('recipient_address')

    recipient_postal_code = (
        request.data.get('recipient_postal_code')
        or request.data.get('postal_code')
        or ''
    )
    recipient_city = (
        request.data.get('recipient_city')
        or request.data.get('city')
        or ''
    )
    recipient_district = (
        request.data.get('recipient_district')
        or request.data.get('district')
        or ''
    )

    # ============================
    # 配送資訊
    # ============================
    shipping_method = request.data.get('shipping_method', 'home')
    logistics_type = request.data.get('logistics_type')
    logistics_sub_type = request.data.get('logistics_sub_type')

    store_id = request.data.get('store_id')
    store_name = request.data.get('store_name')
    store_address = request.data.get('store_address')

    # ============================
    # 基本驗證
    # ============================
    if not user_id:
        return Response(
            {
                'success': False,
                'err': 'User_id 為必填，需登入會員才能下單'
            },
            status=status.HTTP_400_BAD_REQUEST
        )

    if not items_data:
        return Response(
            {
                'success': False,
                'err': 'items 為必填，訂單至少需要一項商品'
            },
            status=status.HTTP_400_BAD_REQUEST
        )

    # ============================
    # 收件人姓名驗證
    # 綠界物流限制：
    # 中文 2～5 個字；英文 4～10 個字元。
    # 前端會先驗證一次，後端仍需再驗證，避免繞過前端直接送 API。
    # ============================
    recipient_name = (recipient_name or '').strip()

    if not recipient_name:
        return Response(
            {
                'success': False,
                'err': '收件人姓名為必填'
            },
            status=status.HTTP_400_BAD_REQUEST
        )

    is_chinese_name = bool(
        re.fullmatch(r'[\u4e00-\u9fff]{2,5}', recipient_name)
    )

    is_english_name = bool(
        re.fullmatch(r'[A-Za-z]+(?: [A-Za-z]+)*', recipient_name)
    ) and 4 <= len(recipient_name) <= 10

    if not is_chinese_name and not is_english_name:
        return Response(
            {
                'success': False,
                'err': '收件人姓名格式不正確：中文請輸入 2～5 個字，英文請輸入 4～10 個字元'
            },
            status=status.HTTP_400_BAD_REQUEST
        )

    # ============================
    # 配送方式驗證
    # ============================
    if shipping_method not in ('home', 'cvs'):
        return Response(
            {
                'success': False,
                'err': 'shipping_method 必須為 home 或 cvs'
            },
            status=status.HTTP_400_BAD_REQUEST
        )

    # 宅配需要地址
    if shipping_method == 'home':
        if not recipient_address:
            return Response(
                {
                    'success': False,
                    'err': '宅配必須提供配送地址'
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        # 後端統一配送類型
        logistics_type = 'HOME'

        if not logistics_sub_type:
            logistics_sub_type = 'TCAT'

    # 超商取貨需要門市資訊
    elif shipping_method == 'cvs':
        if not store_id:
            return Response(
                {
                    'success': False,
                    'err': '超商取貨必須選擇取貨門市'
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        logistics_type = 'CVS'

        if not logistics_sub_type:
            logistics_sub_type = 'UNIMARTC2C'

    # ============================
    # 商品資料
    # ============================
    product_ids = [
        item.get('Product_id')
        for item in items_data
    ]

    products_by_id = {
        p.product_id: p
        for p in Product.objects.filter(
            product_id__in=product_ids
        )
    }

    for item in items_data:
        product_id = item.get('Product_id')

        try:
            quantity = int(
                item.get('Quantity') or 1
            )
        except (TypeError, ValueError):
            return Response(
                {
                    'success': False,
                    'err': f'商品 {product_id} 的數量格式錯誤'
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        if quantity <= 0:
            return Response(
                {
                    'success': False,
                    'err': f'商品 {product_id} 的數量必須大於 0'
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        product = products_by_id.get(
            product_id
        )

        if not product:
            return Response(
                {
                    'success': False,
                    'err': f'商品 {product_id} 不存在'
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        if product.stock < quantity:
            return Response(
                {
                    'success': False,
                    'err': f'{product.product_name} 庫存不足'
                },
                status=status.HTTP_400_BAD_REQUEST
            )

    # ============================
    # 後端重新計算金額
    # ============================
    line_items = []

    for item in items_data:
        product_id = item.get('Product_id')
        quantity = int(
            item.get('Quantity') or 1
        )

        product = products_by_id[
            product_id
        ]

        unit_price = Decimal(
            product.discounted_price
            if product.discounted_price
            else product.price
        )

        base_subtotal = (
            unit_price * quantity
        )

        line_items.append({
            'product': product,
            'quantity': quantity,
            'unit_price': unit_price,
            'base_subtotal': base_subtotal,
            'eligible': False,
            'final_subtotal': base_subtotal,
        })

    # ============================
    # 優惠碼
    # ============================
    if promotion_code:
        coupon = CouponNew.objects.filter(
            promotion_code=promotion_code
        ).first()

        if not coupon:
            return Response(
                {
                    'success': False,
                    'err': '優惠碼不存在'
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        if coupon.status != 'active':
            return Response(
                {
                    'success': False,
                    'err': '優惠碼未啟用或已失效'
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            campaign = (
                coupon
                .kocmission
                .application
                .campaign
            )
        except Exception:
            return Response(
                {
                    'success': False,
                    'err': '優惠碼未綁定任何活動'
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        if _is_campaign_promo_expired(
            campaign
        ):
            coupon.status = 'expired'

            coupon.save(
                update_fields=['status']
            )

            return Response(
                {
                    'success': False,
                    'err': '優惠碼已過期'
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        campaign_products_by_product_id = {
            cp.product_id: cp
            for cp in CampaignProduct.objects.filter(
                campaign=campaign
            )
        }

        for line in line_items:
            campaign_product = (
                campaign_products_by_product_id.get(
                    line['product'].product_id
                )
            )

            # 商品不屬於活動
            if not campaign_product:
                continue

            line['eligible'] = True

            discount_value = (
                campaign_product.discount_value
            )

            if (
                campaign_product.discount_type
                == 'percentage'
            ):
                discounted = (
                    line['base_subtotal']
                    * (
                        Decimal('1')
                        - discount_value
                        / Decimal('100')
                    )
                )

            else:
                discounted = (
                    line['base_subtotal']
                    - discount_value
                )

            line['final_subtotal'] = max(
                discounted,
                Decimal('0')
            ).quantize(
                Decimal('0.01'),
                rounding=ROUND_HALF_UP
            )

    total_amount = sum(
        (
            line['final_subtotal']
            for line in line_items
        ),
        Decimal('0')
    ).quantize(
        Decimal('0.01'),
        rounding=ROUND_HALF_UP
    )

    # ============================
    # 建立訂單
    # ============================
    with transaction.atomic():

        # --------------------------
        # Address
        # --------------------------
        address = None

        if (
            recipient_name
            or recipient_phone
            or recipient_address
        ):
            address = Address.objects.create(
                user_id=user_id,
                recipient_name=(
                    recipient_name or ''
                ),
                phone=(
                    recipient_phone or ''
                ),

                # 宅配才寫真正配送地址
                # 超商取貨這裡不需要塞門市地址
                city=(
                    recipient_city
                    if shipping_method == 'home'
                    else ''
                ),
                district=(
                    recipient_district
                    if shipping_method == 'home'
                    else ''
                ),
                detail_address=(
                    recipient_address
                    if shipping_method == 'home'
                    else ''
                ),
                postal_code=(
                    recipient_postal_code
                    if shipping_method == 'home'
                    else ''
                ),
            )

        # --------------------------
        # Order
        # --------------------------
        order = Order.objects.create(
            user_id=user_id,
            promotion_code=(
                promotion_code or ''
            ),
            total_amount=total_amount,
            order_status='pending',
            payment_status='unpaid',
            shipping_status='unshipped',
            address=address,
        )

        # --------------------------
        # ShipmentInfo
        # --------------------------
        shipment = ShipmentInfo.objects.create(
            order=order,

            provider='ecpay',

            logistics_type=(
                logistics_type
            ),

            logistics_sub_type=(
                logistics_sub_type
            ),

            store_id=(
                store_id
                if shipping_method == 'cvs'
                else None
            ),

            store_name=(
                store_name
                if shipping_method == 'cvs'
                else None
            ),

            store_address=(
                store_address
                if shipping_method == 'cvs'
                else None
            ),

            # 還沒有真正呼叫綠界建立物流單，
            # 所以現在先不會有物流編號
            merchant_trade_no=None,
            ecpay_logistics_id=None,

            shipping_status='pending',
        )

        # --------------------------
        # OrderItem
        # --------------------------
        created_items = []

        for line in line_items:
            product = line['product']

            order_item = (
                OrderItem.objects.create(
                    order=order,
                    product=product,
                    quantity=line[
                        'quantity'
                    ],
                    unit_price=line[
                        'unit_price'
                    ],
                    subtotal=line[
                        'final_subtotal'
                    ],
                )
            )

            created_items.append(
                order_item
            )

            # 扣庫存
            product.stock = max(
                0,
                product.stock
                - line['quantity']
            )

            product.save(
                update_fields=['stock']
            )

    # ============================
    # Response
    # ============================
    return Response(
        {
            'success': True,

            'orderId': str(
                order.order_id
            ),

            'orderStatus':
                order.order_status,

            'paymentStatus':
                order.payment_status,

            'shippingStatus':
                order.shipping_status,

            'totalAmount':
                float(
                    order.total_amount
                ),

            'itemCount':
                len(created_items),

            'shipment': {
                'shipmentId':
                    shipment.shipment_id,

                'provider':
                    shipment.provider,

                'logisticsType':
                    shipment.logistics_type,

                'logisticsSubType':
                    shipment.logistics_sub_type,

                'storeId':
                    shipment.store_id,

                'storeName':
                    shipment.store_name,

                'storeAddress':
                    shipment.store_address,

                'shippingStatus':
                    shipment.shipping_status,
            },
        },
        status=status.HTTP_201_CREATED
    )


# ── 查看訂單 ──
@api_view(['GET'])
@permission_classes([AllowAny])
def view_order(request):
    # 使用者查看訂單時順便執行一次自動完成同步。
    sync_auto_completed_orders()

    user_id = request.query_params.get('User_id') or request.query_params.get('user_id')
    guest_id = request.query_params.get('Guest_id', None)
    order_id = request.query_params.get('Order_id', None)

    orders = Order.objects.all().prefetch_related('payment_transactions')

    if user_id:
        orders = orders.filter(user_id=user_id)
    if guest_id:
        orders = orders.filter(guest_id=guest_id)
    if order_id:
        orders = orders.filter(order_id=order_id)

    # 付款失敗（或形同失敗）的訂單不該出現在消費者的訂單列表/詳情裡：
    # 走綠界付款失敗後，使用者只會回到購物車重新結帳（會建立一筆新訂單），
    # 這筆舊訂單就變成沒有人會再去付款的孤兒訂單，顯示出來只會讓人誤會。
    # is_payment_effectively_failed 涵蓋兩種情況：真的是 failed，或卡在 pending
    # 超過 30 分鐘（使用者直接關分頁放棄，沒有走 ClientBackURL 也沒等到 ReturnURL，
    # 系統永遠不會收到明確的失敗通知，只能用時間判斷）。
    # 還沒付過款(沒有 PaymentTransaction)、或曾經失敗後來重試成功的訂單都正常顯示
    # （pick_relevant_payment 本身就會優先挑成功的那筆）。
    order_list = []
    for order in orders:
        payment_tx = pick_relevant_payment(order.payment_transactions.all())
        if payment_tx and is_payment_effectively_failed(payment_tx):
            continue
        order_list.append(order)

    items_by_order = {}
    vendor_ids = set()

    for order in order_list:
        items = list(
            OrderItem.objects
            .filter(order=order)
            .select_related('product')
        )
        items_by_order[order.order_id] = items

        for item in items:
            if item.product and item.product.vendor_id:
                vendor_ids.add(item.product.vendor_id)

    vendor_name_by_id = {
        v.vendor_id: v.company_name
        for v in Vendor.objects.filter(vendor_id__in=vendor_ids)
    }

    order_ids = [order.order_id for order in order_list]

    shipment_by_order = {
        shipment.order_id: shipment
        for shipment in ShipmentInfo.objects.filter(order_id__in=order_ids)
    }

    result = []

    for order in order_list:
        items = items_by_order.get(order.order_id, [])

        first_vendor_id = (
            items[0].product.vendor_id
            if items and items[0].product
            else None
        )

        recipient_data = None

        if order.address_id:
            address = Address.objects.filter(
                pk=order.address_id
            ).first()

            if address:
                recipient_data = {
                    'recipient_name': address.recipient_name,
                    'phone': address.phone,
                    'postal_code': address.postal_code,
                    'city': address.city,
                    'district': address.district,
                    'detail_address': address.detail_address,
                }

        shipment = shipment_by_order.get(order.order_id)
        shipment_data = None

        if shipment:
            shipment_data = {
                'shipment_id': shipment.shipment_id,
                'provider': shipment.provider,
                'logistics_type': shipment.logistics_type,
                'logistics_sub_type': shipment.logistics_sub_type,
                'store_id': shipment.store_id,
                'store_name': shipment.store_name,
                'store_address': shipment.store_address,
                'merchant_trade_no': shipment.merchant_trade_no,
                'ecpay_logistics_id': shipment.ecpay_logistics_id,
                'booking_note': shipment.booking_note,
                'shipping_status': shipment.shipping_status,
            }

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
            'delivered_at': order.delivered_at,
            'completed_at': order.completed_at,
            'vendor_name': vendor_name_by_id.get(first_vendor_id, ''),
            'recipient': recipient_data,
            'shipment': shipment_data,
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
    vendor_result = None

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

        commission_result, vendor_result, changed = _complete_order_with_finance(order)

        # 重新抓一次，讓 response 裡的 completed_at / order_status 是最新資料。
        order.refresh_from_db(fields=['order_status', 'completed_at'])
    else:
        order.order_status = order_status
        order.save()

    response_data = {
        'success': True,
        'Order_id': str(order.order_id),
        'order_status': order.order_status,
        'completed_at': order.completed_at,
    }

    if commission_result:
        response_data['commission'] = commission_result

    if vendor_result:
        response_data['vendor_earning'] = vendor_result

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


# ==============================================================================
# 退貨退款：消費者端
# POST /consumer/order/return/create    申請退貨退款
# GET  /consumer/order/return/list      查看自己的退貨申請
# POST /consumer/order/return/dispute   廠商拒絕後提出爭議，交給 Admin 判定
# ==============================================================================

def _check_order_ownership(order, user_id, guest_id):
    """跟 update_order_status 用同一套擁有者檢查，回傳 None 代表通過。"""
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
    return None


@api_view(['POST'])
@permission_classes([AllowAny])
def create_return_request(request):
    """
    建立整張訂單退貨退款申請。

    第一版只支援：
    - 整張訂單全額退貨退款
    - 單一廠商訂單

    requested_amount 不接受前端指定，永遠由後端使用 Order.total_amount，
    避免前端竄改退款金額，也避免目前尚未完成的部分退款／跨廠商拆帳邏輯。
    """
    order_id = request.data.get('Order_id')
    user_id = request.data.get('User_id')
    guest_id = request.data.get('Guest_id')
    reason = request.data.get('reason')
    description = request.data.get('description', '')

    if not order_id or not reason:
        return Response(
            {'success': False, 'err': 'Order_id 和 reason 為必填'},
            status=status.HTTP_400_BAD_REQUEST
        )

    valid_reasons = dict(ReturnRequest.REASON_CHOICES)
    if reason not in valid_reasons:
        return Response(
            {'success': False, 'err': f'reason 必須是以下其中之一：{", ".join(valid_reasons.keys())}'},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        order = Order.objects.get(order_id=order_id)
    except Order.DoesNotExist:
        return Response(
            {'success': False, 'err': '訂單不存在'},
            status=status.HTTP_404_NOT_FOUND
        )

    ownership_err = _check_order_ownership(order, user_id, guest_id)
    if ownership_err:
        return ownership_err

    if order.order_status == 'cancelled':
        return Response(
            {'success': False, 'err': '此訂單已取消，無法申請退貨'},
            status=status.HTTP_400_BAD_REQUEST
        )

    if order.payment_status == 'refunded':
        return Response(
            {'success': False, 'err': '此訂單已完成退款，無法再次申請退貨'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # 第一版只支援單一廠商的整張訂單退款。
    vendor_ids = set(
        OrderItem.objects.filter(order=order)
        .values_list('product__vendor_id', flat=True)
    )
    if len(vendor_ids) != 1:
        return Response(
            {
                'success': False,
                'err': '目前整張訂單退貨退款僅支援單一廠商訂單；此訂單包含多個廠商商品，暫無法線上申請'
            },
            status=status.HTTP_400_BAD_REQUEST
        )

    # 退貨期限用 delivered_at 起算，不看消費者有沒有點過「確認收貨」。
    if not order.delivered_at:
        return Response(
            {'success': False, 'err': '此訂單尚未送達，無法申請退貨'},
            status=status.HTTP_400_BAD_REQUEST
        )

    if not is_return_window_open(order):
        deadline = order.delivered_at + timedelta(days=RETURN_REQUEST_WINDOW_DAYS)
        return Response(
            {'success': False, 'err': f'退貨期限已於 {deadline.isoformat()} 截止'},
            status=status.HTTP_400_BAD_REQUEST
        )

    if has_unresolved_return_request(order):
        return Response(
            {'success': False, 'err': '此訂單已有一筆退貨申請正在處理中'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # 只支援整張訂單全額退款，退款申請金額完全由後端決定。
    final_amount = Decimal(str(order.total_amount))
    if final_amount <= 0:
        return Response(
            {'success': False, 'err': '訂單總金額異常，無法申請退款'},
            status=status.HTTP_400_BAD_REQUEST
        )

    return_request = ReturnRequest.objects.create(
        order=order,
        user_id=order.user_id,
        order_item=None,
        reason=reason,
        description=description,
        requested_amount=final_amount,
        status='requested',
    )

    return Response({
        'success': True,
        'err': '',
        'return_id': str(return_request.return_id),
        'status': return_request.status,
        'refund_scope': 'full_order',
        'requested_amount': str(return_request.requested_amount),
    }, status=status.HTTP_201_CREATED)


@api_view(['GET'])
@permission_classes([AllowAny])
def get_return_requests(request):
    order_id = request.query_params.get('Order_id')
    user_id = request.query_params.get('User_id')
    guest_id = request.query_params.get('Guest_id')

    if not user_id and not guest_id:
        return Response(
            {'success': False, 'err': 'User_id 或 Guest_id 至少需要一個'},
            status=status.HTTP_400_BAD_REQUEST
        )

    returns = ReturnRequest.objects.select_related('order').order_by('-requested_at')

    if order_id:
        returns = returns.filter(order_id=order_id)
    if user_id:
        returns = returns.filter(order__user_id=user_id)
    if guest_id:
        returns = returns.filter(order__guest_id=guest_id)

    result = []
    for r in returns:
        result.append({
            'return_id': str(r.return_id),
            'order_id': str(r.order_id),
            'reason': r.reason,
            'description': r.description,
            'status': r.status,
            'requested_amount': str(r.requested_amount),
            'refunded_amount': str(r.refunded_amount) if r.refunded_amount is not None else None,
            'vendor_note': r.vendor_note,
            'admin_note': r.admin_note,
            'requested_at': r.requested_at,
            'approved_at': r.approved_at,
            'rejected_at': r.rejected_at,
            'returned_at': r.returned_at,
            'refunded_at': r.refunded_at,
        })

    return Response(result, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([AllowAny])
def dispute_return_request(request):
    """
    廠商拒絕退貨後，消費者不服，提出爭議，交給 Admin 判定
    （見 platform.py 的 admin_list_return_disputes / admin_resolve_return_dispute）。
    只有 status='rejected' 的申請能提爭議——已經同意、已經在退款中、
    或已經是爭議中的，都不能重複觸發。
    """
    return_id = request.data.get('Return_id')
    user_id = request.data.get('User_id')
    guest_id = request.data.get('Guest_id')
    description = request.data.get('description', '')

    if not return_id:
        return Response(
            {'success': False, 'err': 'Return_id 為必填'},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        return_request = ReturnRequest.objects.select_related('order').get(return_id=return_id)
    except ReturnRequest.DoesNotExist:
        return Response(
            {'success': False, 'err': '找不到此退貨申請'},
            status=status.HTTP_404_NOT_FOUND
        )

    ownership_err = _check_order_ownership(return_request.order, user_id, guest_id)
    if ownership_err:
        return ownership_err

    if return_request.status != 'rejected':
        return Response(
            {'success': False, 'err': f'此退貨申請目前狀態是「{return_request.status}」，只有被拒絕的申請能提出爭議'},
            status=status.HTTP_400_BAD_REQUEST
        )

    return_request.status = 'disputed'
    if description:
        return_request.description = (return_request.description or '') + f"\n[消費者爭議補充] {description}"
    return_request.save(update_fields=['status', 'description'])

    return Response({
        'success': True,
        'err': '',
        'return_id': str(return_request.return_id),
        'status': return_request.status,
    }, status=status.HTTP_200_OK)
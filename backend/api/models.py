from django.db import models, transaction
import uuid

# ==============================================================================
# 1. User / KOC / Campaigns / Order / OrderItem
# ==============================================================================

class User(models.Model):
    user_id = models.CharField(max_length=50, unique=True, primary_key=True)
    role = models.CharField(max_length=20)
    name = models.CharField(max_length=100)
    email = models.EmailField(unique=True)
    password = models.CharField(max_length=128)
    phone = models.CharField(max_length=20)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'User'

    def save(self, *args, **kwargs):
        if not self.user_id:
            with transaction.atomic():
                last_user = User.objects.select_for_update().order_by('-user_id').first()
                if last_user and last_user.user_id.startswith('U'):
                    next_num = int(last_user.user_id[1:]) + 1
                else:
                    next_num = 1
                self.user_id = f"U{next_num:05d}"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"[{self.role}] {self.name}"


class KOC(models.Model):
    APPROVAL_STATUS_CHOICES = [
        ('pending', '待審核'),
        ('approved', '已通過'),
        ('rejected', '已拒絕'),
    ]

    koc_id = models.CharField(max_length=50, unique=True, primary_key=True)
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='koc_profile')
    fb_account = models.CharField(max_length=100, blank=True, default='', db_column='fb_account')
    ig_account = models.CharField(max_length=100, blank=True, default='', db_column='ig_account')
    threads_account = models.CharField(max_length=100, blank=True, default='', db_column='threads_account')
    bank_number = models.CharField(max_length=50, blank=True, default='', db_column='bank_number')
    bank_account = models.CharField(max_length=50, blank=True, default='', db_column='bank_account')
    address = models.TextField(blank=True, null=True)
    approval_status = models.CharField(
        max_length=50,
        choices=APPROVAL_STATUS_CHOICES,
        default='pending',
        db_column='approval_status'
    )
    reject_reason = models.TextField(blank=True, null=True, db_column='reject_reason')
    is_suspended = models.BooleanField(default=False, db_column='is_suspended')  # 新增

    class Meta:
        db_table = 'Koc'

    def save(self, *args, **kwargs):
        if not self.koc_id:
            with transaction.atomic():
                last_koc = KOC.objects.select_for_update().order_by('-koc_id').first()
                if last_koc and last_koc.koc_id.startswith('KOC'):
                    next_num = int(last_koc.koc_id[3:]) + 1
                else:
                    next_num = 1
                self.koc_id = f"KOC{next_num:05d}"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"KOC: {self.user.name}"


class Campaigns(models.Model):
    """代言活動表"""
    campaign_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    vendor = models.ForeignKey('Vendor', on_delete=models.CASCADE, db_column='vendor_id', related_name='campaigns')
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    budget = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    reward_type = models.CharField(max_length=100)
    start_date = models.DateTimeField()
    end_date = models.DateTimeField()
    status = models.CharField(max_length=50, default='active')

    class Meta:
        db_table = 'Campaigns'

    def __str__(self):
        return self.name

class CampaignProduct(models.Model):
    """活動與商品的交叉關聯表（多對多中介表）"""
    campaign_product_id = models.AutoField(primary_key=True, db_column='campaign_product_id')
    
    # 1. 關聯到活動表 (假設你的活動表類別叫 Campaign，主鍵或欄位叫 campaign_id)
    campaign = models.ForeignKey(
        'Campaigns', 
        on_delete=models.CASCADE, 
        db_column='campaign_id',
        related_name='campaign_products'
    )
    # 2. 關聯到商品表 (假設你的商品表類別叫 Product，主鍵或欄位叫 product_id)
    product = models.ForeignKey(
        'Product', 
        on_delete=models.CASCADE, 
        db_column='product_id',
        related_name='product_campaigns'
    )
    # 💡 擴充小撇步：未來如果想記錄「某個商品在這個活動裡的限定活動價」或「分潤比例」，可以直接加欄位在這裡！
    # activity_price = models.IntegerField(blank=True, null=True, db_column='activity_price'
    class Meta:
        db_table = 'Campaign_Product'  # 統一全小寫加底線命名規範
        # 🌟 加上聯合唯一限制，防止同一個活動重複綁定同一個商品
        unique_together = ('campaign', 'product')
    def __str__(self):
        return f"Campaign: {self.campaign_id} - Product: {self.product_id}"

class Order(models.Model):
    """訂單主表"""
    order_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, db_column='user_id')
    guest = models.ForeignKey('Guest', on_delete=models.SET_NULL, db_column='guest_id', null=True, blank=True, related_name='orders')
    address = models.ForeignKey('Address', on_delete=models.SET_NULL, db_column='address_id', null=True, blank=True, related_name='orders')
    promotion_code = models.CharField(max_length=50, blank=True, null=True)
    total_amount = models.DecimalField(max_digits=10, decimal_places=2)
    order_status = models.CharField(max_length=50, default='pending')
    payment_status = models.CharField(max_length=50, default='unpaid')
    shipping_status = models.CharField(max_length=50, default='unshipped')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'Order'

    def __str__(self):
        return f"Order {self.order_id} by {self.user_id}"


class OrderItem(models.Model):
    """訂單明細表"""
    order_item_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='items', db_column='order_id')
    product = models.ForeignKey('Product', on_delete=models.CASCADE, db_column='product_id',related_name='order_items')
    quantity = models.IntegerField(default=1)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    subtotal = models.DecimalField(max_digits=10, decimal_places=2)
    apply_status = models.IntegerField(default=0)

    class Meta:
        db_table = 'OrderItem'

    def __str__(self):
        return f"Item {self.product_id} in Order {self.order.order_id}"


# ==============================================================================
# 2. Application / KOC_Misson / Submissions / Coupon
# ==============================================================================

class Application(models.Model):
    application_id = models.AutoField(primary_key=True, db_column='application_id')
    koc = models.ForeignKey('KOC', on_delete=models.CASCADE, db_column='koc_id', null=True, blank=True)
    order = models.ForeignKey(
        'Order',                      # 指向你的 Order 模型類別名稱
        on_delete=models.CASCADE,     # 當訂單被刪除時，連帶刪除這筆申請（或用 on_delete=models.PROTECT 限制刪除）
        db_column='order_id',         # 明確指定資料庫實體資料表的欄位名稱為 order_id
        related_name='applications',  # 反向查詢名稱
        null=True,
        blank=True
    )
    campaign = models.ForeignKey(Campaigns, on_delete=models.CASCADE, db_column='campaign_id',related_name='applications')
    status = models.CharField(max_length=50, db_column='status', default='pending')

    class Meta:
        db_table = 'Application'

    def __str__(self):
        return f"Application {self.application_id} by KOC {self.koc_id}"


class KOCMissionNew(models.Model):
    """KOC 任務表（優化版：全面小寫規範 + 減少 JOIN 效能優化）"""
    kocmission_id = models.AutoField(primary_key=True, db_column='kocmission_id')
    
    # 1. 依然保留與申請表的關聯（為了追蹤當初是哪一次申請通過的）
    application = models.ForeignKey('Application',  on_delete=models.CASCADE, db_column='application_id')
    
    # 🌟 2. 冗餘欄位：直接綁定 KOC（對應 KOC 表），方便網紅打開 App 看任務清單時，不需要 JOIN Application 表！
    koc = models.ForeignKey('KOC', on_delete=models.CASCADE, db_column='koc_id', db_index=True, null=True, blank=True)
    stage = models.CharField(max_length=50, db_column='stage')

    class Meta:
        db_table = 'Koc_Mission'  

    def __str__(self):
        return f"Mission {self.kocmission_id} for KOC {self.koc_id} (Stage: {self.stage})"


class Submissions(models.Model):
    SUBMISSION_TYPE_CHOICES = [
        ('text', '文案'),
        ('link', '作品連結'),
    ]
    STATUS_CHOICES = [
        ('draft', '草稿'),
        ('pending', '審核中'),
        ('revising', '修改中'),
        ('approved', '審核通過'),
    ]
    submission_id = models.AutoField(primary_key=True, db_column='submission_id')
    kocmission = models.ForeignKey(KOCMissionNew, on_delete=models.CASCADE, db_column='kocmisson_id')
    submission_type = models.CharField(
        max_length=50,
        choices=SUBMISSION_TYPE_CHOICES,
        db_column='submission_type'
    )
    content_url = models.CharField(max_length=500, blank=True, null=True, db_column='content_url')
    text_content = models.TextField(blank=True, null=True, db_column='text_content')
    status = models.CharField(
        max_length=50,
        choices=STATUS_CHOICES,
        default='pending',
        db_column='status'
    )
    vendor_feedback = models.TextField(blank=True, null=True, db_column='vendor_feedback')
    submitted_time = models.DateTimeField(blank=True, null=True, db_column='submitted_time')
    reviewed_time = models.DateTimeField(blank=True, null=True, db_column='reviewed_time')

    class Meta:
        db_table = 'Submissions'

    def __str__(self):
        return f"Submission {self.submission_id}"


class CouponNew(models.Model):
    STATUS_CHOICES = [
        ('inactive', '未啟用'),
        ('active', '啟用中'),
        ('expired', '已過期'),
    ]
    coupon_id = models.AutoField(primary_key=True, db_column='coupon_id')
    kocmission = models.ForeignKey(KOCMissionNew, on_delete=models.CASCADE, db_column='kocmisson_id')
    promotion_code = models.CharField(max_length=100, unique=True, db_column='promotion_code')
    discount_value = models.IntegerField(db_column='discount_value')
    status = models.CharField(max_length=50, choices=STATUS_CHOICES, default='inactive', db_column='status')
    usage_count = models.IntegerField(default=0, db_column='usage_count')
    total_commission = models.IntegerField(default=0, db_column='total_commission')

    class Meta:
        db_table = 'Coupon'

    def __str__(self):
        return self.promotion_code


# ==============================================================================
# 3. 金流模組 ── BaseWallet(抽象) / KocWallet / VendorWallet / Transactions(合併)
# ==============================================================================

class BaseWallet(models.Model):
    """抽象錢包基礎範本（不單獨建表）"""
    balance_available = models.IntegerField(default=0)
    balance_frozen = models.IntegerField(default=0)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class KocWallet(BaseWallet):
    """KOC 網紅個人錢包"""
    koc = models.OneToOneField(KOC, on_delete=models.CASCADE, related_name='wallet', db_column='koc_id')

    class Meta:
        db_table = 'Koc_Wallet'

    def __str__(self):
        return f"KocWallet for {self.koc_id}"


class VendorWallet(BaseWallet):
    """Vendor 廠商企業錢包"""
    vendor = models.OneToOneField('Vendor', on_delete=models.CASCADE, related_name='wallet', db_column='vendor_id')

    class Meta:
        db_table = 'Vendor_Wallet'

    def __str__(self):
        return f"VendorWallet for {self.vendor_id}"


class Transactions(models.Model):
    """統一資金交易流水帳總表"""
    transaction_id = models.AutoField(primary_key=True)

    # 多型關聯：每筆交易只會用到其中一個欄位（koc_wallet 或 vendor_wallet），另一個留空
    # 用哪個欄位有值，就代表這筆交易屬於哪種錢包類型
    koc_wallet = models.ForeignKey(
        KocWallet, on_delete=models.CASCADE, null=True, blank=True,
        related_name='transactions', db_column='koc_wallet_id'
    )
    vendor_wallet = models.ForeignKey(
        VendorWallet, on_delete=models.CASCADE, null=True, blank=True,
        related_name='transactions', db_column='vendor_wallet_id'
    )

    # 金流種類，例如：'deposit'(儲值), 'withdraw'(提領), 'reward'(分潤), 'pay'(付活動費)
    type = models.CharField(max_length=50) 
    # 交易金額
    amount = models.IntegerField()
    
    # 關聯業務軌跡（例如：reference_type='order', reference_id='訂單UUID'）
    reference_type = models.CharField(max_length=50, blank=True, null=True)
    reference_id = models.CharField(max_length=100, blank=True, null=True)
    
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'Transactions'
        constraints = [
            # 確保每筆交易「恰好」對應一種錢包：koc_wallet 和 vendor_wallet 不會同時有值，也不會同時都空
            models.CheckConstraint(
                condition=(
                    models.Q(koc_wallet__isnull=False, vendor_wallet__isnull=True) |
                    models.Q(koc_wallet__isnull=True, vendor_wallet__isnull=False)
                ),
                name='transactions_exactly_one_wallet'
            )
        ]

    @property
    def wallet_type(self):
        """方便顯示用：依哪個欄位有值，回傳 'koc' 或 'vendor'"""
        if self.koc_wallet_id:
            return 'koc'
        if self.vendor_wallet_id:
            return 'vendor'
        return None

    def __str__(self):
        return f"[{(self.wallet_type or '').upper()}] Trans {self.transaction_id}: {self.type} ({self.amount})"


# ==============================================================================
# 4. 其他電商與基本模組
# ==============================================================================

class Product(models.Model):
    product_id = models.AutoField(primary_key=True)
    vendor_id = models.CharField(max_length=100, db_column='vendor_id')
    product_name = models.CharField(max_length=200)
    description = models.TextField(blank=True, null=True)
    price = models.IntegerField()
    discounted_price = models.IntegerField(blank=True, null=True)
    stock = models.IntegerField(default=0)
    category = models.CharField(max_length=100, blank=True, null=True)
    image_url = models.CharField(max_length=500, blank=True, null=True)
    status = models.CharField(max_length=50)

    class Meta:
        db_table = 'Product'

    def __str__(self):
        return self.product_name


class Cart(models.Model):
    cart_id = models.AutoField(primary_key=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, db_column='user_id')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    status = models.CharField(max_length=50)

    class Meta:
        db_table = 'Cart'

    def __str__(self):
        return f"Cart {self.cart_id}"


class CartItem(models.Model):
    cart_item_id = models.AutoField(primary_key=True)
    cart = models.ForeignKey(Cart, on_delete=models.CASCADE, db_column='cart_id')
    product = models.ForeignKey(Product, on_delete=models.CASCADE, db_column='product_id')
    quantity = models.IntegerField(default=1)
    unit_price = models.IntegerField()
    subtotal = models.IntegerField()

    class Meta:
        db_table = 'CartItem'

    def __str__(self):
        return f"CartItem {self.cart_item_id}"


class Wishlist(models.Model):
    wishlist_id = models.AutoField(primary_key=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, db_column='user_id')
    product = models.ForeignKey(Product, on_delete=models.CASCADE, db_column='product_id')

    class Meta:
        db_table = 'Wishlist'

    def __str__(self):
        return f"Wishlist {self.wishlist_id}"


class Guest(models.Model):
    guest_id = models.AutoField(primary_key=True)

    class Meta:
        db_table = 'Guest'

    def __str__(self):
        return f"Guest {self.guest_id}"


class Address(models.Model):
    address_id = models.AutoField(primary_key=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, db_column='user_id')
    phone = models.CharField(max_length=20, blank=True, null=True)
    city = models.CharField(max_length=100, blank=True, null=True)
    district = models.CharField(max_length=100, blank=True, null=True)
    detail_address = models.CharField(max_length=300, blank=True, null=True)
    postal_code = models.CharField(max_length=20, blank=True, null=True)
    is_default = models.BooleanField(default=False)

    class Meta:
        db_table = 'Address'

    def __str__(self):
        return f"Address {self.address_id}"


class Payment(models.Model):
    payment_id = models.AutoField(primary_key=True)
    order = models.ForeignKey(Order, on_delete=models.CASCADE, db_column='order_id')
    payment_method = models.CharField(max_length=50, blank=True, null=True)
    payment_status = models.CharField(max_length=50, blank=True, null=True)
    transaction_id = models.CharField(max_length=100, blank=True, null=True)
    promotion_code = models.CharField(max_length=100, blank=True, null=True)

    class Meta:
        db_table = 'Payment'

    def __str__(self):
        return f"Payment {self.payment_id}"


class Admins(models.Model):
    admin_id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=200)
    email = models.EmailField(max_length=255)
    password = models.CharField(max_length=255)
    role = models.CharField(max_length=50)
    status = models.CharField(max_length=50)
    last_login_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        db_table = 'Admins'

    def __str__(self):
        return self.name


class Vendor(models.Model):
    vendor_id = models.AutoField(primary_key=True)
    company_name = models.CharField(max_length=200)
    contact_name = models.CharField(max_length=200)
    email = models.EmailField(max_length=255)
    password = models.CharField(max_length=255)
    tax_id = models.CharField(max_length=50, db_column='tax_id')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'Vendor'

    def __str__(self):
        return self.company_name


class CampaignParticipants(models.Model):
    participants_id = models.AutoField(primary_key=True)
    campaign = models.ForeignKey(Campaigns, on_delete=models.CASCADE, db_column='campaign_id')
    koc = models.ForeignKey(User, on_delete=models.CASCADE, db_column='koc_id')
    coupon = models.ForeignKey(CouponNew, on_delete=models.SET_NULL, db_column='coupon_id', null=True, blank=True, related_name='campaign_participants')
    status = models.CharField(max_length=50)

    class Meta:
        db_table = 'Campaign_Participants'

    def __str__(self):
        return f"CampaignParticipants {self.participants_id}"


class Payouts(models.Model):
    payout_id = models.AutoField(primary_key=True)
    koc = models.ForeignKey(User, on_delete=models.CASCADE, db_column='koc_id')
    amount = models.IntegerField()
    payout_date = models.DateField()
    status = models.CharField(max_length=50)

    class Meta:
        db_table = 'Payouts'

    def __str__(self):
        return f"Payout {self.payout_id}"


class Earnings(models.Model):
    STATUS_CHOICES = [
        ('pending', '待定'),
        ('withdrawable', '可提領'),
         ('transferred', '已轉帳'),
    ]

    earnings_id = models.AutoField(primary_key=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, db_column='user_id')
    kocmission = models.ForeignKey(
        KOCMissionNew,
        on_delete=models.CASCADE,
        db_column='kocmission_id',
        null=True,
        blank=True,
        related_name='earnings'
    )
    order = models.ForeignKey(
        'Order',
        on_delete=models.SET_NULL,
        db_column='order_id',
        null=True,
        blank=True,
        related_name='earnings'
    )
    amount = models.IntegerField()
    status = models.CharField(max_length=50, choices=STATUS_CHOICES, default='pending')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'Earnings'

    def __str__(self):
        return f"Earnings {self.earnings_id}"


class ServiceTickets(models.Model):
    ticket_id = models.AutoField(primary_key=True)
    admin_id = models.ForeignKey(Admins, on_delete=models.SET_NULL, db_column='admin_id', null=True, blank=True)
    koc_id = models.ForeignKey(User, on_delete=models.SET_NULL, db_column='koc_id', related_name='tickets_as_koc', null=True, blank=True)
    consumer_id = models.ForeignKey(User, on_delete=models.SET_NULL, db_column='consumer_id', related_name='tickets_as_consumer', null=True, blank=True)
    vendor_id = models.ForeignKey(Vendor, on_delete=models.SET_NULL, db_column='vendor_id', null=True, blank=True)
    order_id = models.ForeignKey(Order, on_delete=models.SET_NULL, db_column='order_id', null=True, blank=True)
    category = models.CharField(max_length=100)
    description = models.TextField(blank=True, null=True)
    status = models.CharField(max_length=50)
    resolution_note = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    update_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'Service_Tickets'

    def __str__(self):
        return f"Ticket {self.ticket_id}"


class AdminAuditLogs(models.Model):
    log_id = models.AutoField(primary_key=True)
    admin_id = models.ForeignKey(Admins, on_delete=models.CASCADE, db_column='admin_id')
    action_type = models.CharField(max_length=100)
    submission_id = models.CharField(max_length=100, blank=True, null=True)
    tasks_id = models.CharField(max_length=100, blank=True, null=True)
    koc = models.ForeignKey('KOC', on_delete=models.SET_NULL, db_column='koc_id', null=True, blank=True, related_name='audit_logs')
    vendor = models.ForeignKey(Vendor, on_delete=models.SET_NULL, db_column='vendor_id', null=True, blank=True, related_name='audit_logs')
    action_reason = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'Admin_Audit_Logs'

    def __str__(self):
        return f"AuditLog {self.log_id}"
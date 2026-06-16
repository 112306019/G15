from django.db import models
import uuid

# ══════════════════════════════════════
# 1. 核心主幹表 ── User / KOC / Campaigns / Order / OrderItem
# ══════════════════════════════════════

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

    def __str__(self):
        return f"[{self.role}] {self.name}"


class KOC(models.Model):
    koc_id = models.CharField(max_length=50, unique=True, primary_key=True)
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='koc_profile')
    social_account = models.CharField(max_length=100)
    bank_number = models.CharField(max_length=50)
    bank_account = models.CharField(max_length=50)
    address = models.TextField(blank=True, null=True)

    class Meta:
        db_table = 'Koc'  # 改為首字大寫

    def __str__(self):
        return f"KOC: {self.user.name}"


class Campaigns(models.Model):
    """代言活動表"""
    Campaign_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    product_id = models.CharField(max_length=100, db_index=True)
    Vendor_id = models.CharField(max_length=100)
    Name = models.CharField(max_length=255)
    Description = models.TextField(blank=True, null=True)
    Budget = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    Reward_type = models.CharField(max_length=100)
    Start_date = models.DateTimeField()
    End_date = models.DateTimeField()
    Status = models.CharField(max_length=50, default='active')

    class Meta:
        db_table = 'Campaigns'  # 去除 api_ 並改為首字大寫

    def __str__(self):
        return self.Name


class Order(models.Model):
    """訂單主表"""
    Order_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    User_id = models.CharField(max_length=100, db_index=True)
    Guest_id = models.CharField(max_length=100, blank=True, null=True)
    Promotion_code = models.CharField(max_length=50, blank=True, null=True)
    total_amount = models.DecimalField(max_digits=10, decimal_places=2)
    order_status = models.CharField(max_length=50, default='pending')
    payment_status = models.CharField(max_length=50, default='unpaid')
    shipping_status = models.CharField(max_length=50, default='unshipped')
    Address_id = models.CharField(max_length=100)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'Order'  # 去除 api_ 並改為首字大寫

    def __str__(self):
        return f"Order {self.Order_id} by {self.User_id}"


class OrderItem(models.Model):
    """訂單明細表"""
    Order_item_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='items', db_column='Order_id')
    Product_id = models.CharField(max_length=100, db_index=True)
    quantity = models.IntegerField(default=1)
    Unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    subtotal = models.DecimalField(max_digits=10, decimal_places=2)
    apply_status = models.IntegerField(default=0)

    class Meta:
        db_table = 'OrderItem'  # 去除 api_ 並改為大寫駝峰

    def __str__(self):
        return f"Item {self.Product_id} in Order {self.order.Order_id}"


# ══════════════════════════════════════
# 2. 截圖全新需求 ── Application / KOC_Misson / Submissions / Coupon
# ══════════════════════════════════════

class Application(models.Model):
    application_id = models.AutoField(primary_key=True, db_column='Application_id')
    user = models.ForeignKey(User, on_delete=models.CASCADE, db_column='User_id')
    campaign = models.ForeignKey(Campaigns, on_delete=models.CASCADE, db_column='Campaign_id')
    status = models.CharField(max_length=50, db_column='Status')

    class Meta:
        db_table = 'Application'  # 去除 api_ 並改為首字大寫

    def __str__(self):
        return f"Application {self.application_id} by {self.user.user_id}"


class KOCMissionNew(models.Model):
    kocmission_id = models.AutoField(primary_key=True, db_column='KOCMisson_id')
    application = models.ForeignKey(Application, on_delete=models.CASCADE, db_column='Application_id')
    stage = models.CharField(max_length=50, db_column='Stage')

    class Meta:
        db_table = 'KOC_Misson'  # 保持原樣

    def __str__(self):
        return f"KOCMission {self.kocmission_id} (Stage: {self.stage})"


class Submissions(models.Model):
    submission_id = models.AutoField(primary_key=True, db_column='Submission_id')
    kocmission = models.ForeignKey(KOCMissionNew, on_delete=models.CASCADE, db_column='KOCMisson_id')
    submission_type = models.CharField(max_length=50, db_column='Submission_type')
    content_url = models.CharField(max_length=500, blank=True, null=True, db_column='content_url')
    text_content = models.TextField(blank=True, null=True, db_column='text_content')
    status = models.CharField(max_length=50, db_column='Status')
    vendor_feedback = models.TextField(blank=True, null=True, db_column='vendor_feedback')
    submitted_time = models.DateTimeField(blank=True, null=True, db_column='submitted_time')
    reviewed_time = models.DateTimeField(blank=True, null=True, db_column='reviewed_time')

    class Meta:
        db_table = 'Submissions'  # 保持原樣

    def __str__(self):
        return f"Submission {self.submission_id}"


class CouponNew(models.Model):
    coupon_id = models.AutoField(primary_key=True, db_column='Coupon_id')
    kocmission = models.ForeignKey(KOCMissionNew, on_delete=models.CASCADE, db_column='KOCMisson_id')
    promotion_code = models.CharField(max_length=100, unique=True, db_column='Promotion_code')
    discount_value = models.IntegerField(db_column='Discount_value')
    status = models.CharField(max_length=50, db_column='Status')
    usage_count = models.IntegerField(default=0, db_column='usage_count')
    total_commission = models.IntegerField(default=0, db_column='total_commission')

    class Meta:
        db_table = 'Coupon'  # 保持原樣

    def __str__(self):
        return self.promotion_code


# ══════════════════════════════════════
# 3. 其他電商與後台模組（全面拿掉 api_ 並改為首字大寫）
# ══════════════════════════════════════

class Product(models.Model):
    product_id = models.AutoField(primary_key=True)
    vendor_id = models.CharField(max_length=100, db_column='Vendor_id')
    product_name = models.CharField(max_length=200)
    description = models.TextField(blank=True, null=True)
    price = models.IntegerField()
    discounted_price = models.IntegerField(blank=True, null=True)
    stock = models.IntegerField(default=0)
    category = models.CharField(max_length=100, blank=True, null=True)
    image_url = models.CharField(max_length=500, blank=True, null=True)
    status = models.CharField(max_length=50)

    class Meta:
        db_table = 'Product'  # 新增：指定大寫名稱

    def __str__(self):
        return self.product_name


class Cart(models.Model):
    cart_id = models.AutoField(primary_key=True)
    user_id = models.ForeignKey(User, on_delete=models.CASCADE, db_column='user_id')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    status = models.CharField(max_length=50)

    class Meta:
        db_table = 'Cart'  # 新增：指定大寫名稱

    def __str__(self):
        return f"Cart {self.cart_id}"


class CartItem(models.Model):
    cart_item_id = models.AutoField(primary_key=True)
    cart_id = models.ForeignKey(Cart, on_delete=models.CASCADE, db_column='cart_id')
    product_id = models.ForeignKey(Product, on_delete=models.CASCADE, db_column='product_id')
    quantity = models.IntegerField(default=1)
    unit_price = models.IntegerField()
    subtotal = models.IntegerField()

    class Meta:
        db_table = 'CartItem'  # 新增：指定大寫名稱

    def __str__(self):
        return f"CartItem {self.cart_item_id}"


class Wishlist(models.Model):
    wishlist_id = models.AutoField(primary_key=True)
    user_id = models.ForeignKey(User, on_delete=models.CASCADE, db_column='user_id')
    product_id = models.ForeignKey(Product, on_delete=models.CASCADE, db_column='product_id')

    class Meta:
        db_table = 'Wishlist'  # 新增：指定大寫名稱

    def __str__(self):
        return f"Wishlist {self.wishlist_id}"


class Guest(models.Model):
    guest_id = models.AutoField(primary_key=True)
    order_id = models.ForeignKey(Order, on_delete=models.CASCADE, db_column='Order_id')

    class Meta:
        db_table = 'Guest'  # 新增：指定大寫名稱

    def __str__(self):
        return f"Guest {self.guest_id}"


class Address(models.Model):
    address_id = models.AutoField(primary_key=True)
    user_id = models.ForeignKey(User, on_delete=models.CASCADE, db_column='user_id')
    phone = models.CharField(max_length=20, blank=True, null=True)
    city = models.CharField(max_length=100, blank=True, null=True)
    district = models.CharField(max_length=100, blank=True, null=True)
    detail_address = models.CharField(max_length=300, blank=True, null=True)
    postal_code = models.CharField(max_length=20, blank=True, null=True)
    is_default = models.BooleanField(default=False)

    class Meta:
        db_table = 'Address'  # 新增：指定大寫名稱

    def __str__(self):
        return f"Address {self.address_id}"


class Wallets(models.Model):
    wallets_id = models.AutoField(primary_key=True)
    user_id = models.ForeignKey(User, on_delete=models.CASCADE, db_column='user_id')
    balance_available = models.IntegerField(default=0)
    balance_frozen = models.IntegerField(default=0)
    updated_time = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'Wallets'  # 新增：指定大寫名稱

    def __str__(self):
        return f"Wallets {self.wallets_id}"


class Transactions(models.Model):
    transaction_id = models.AutoField(primary_key=True, db_column='Transaction_ID')
    wallets_id = models.ForeignKey(Wallets, on_delete=models.CASCADE, db_column='Wallets_id')
    type = models.CharField(max_length=50, db_column='Type')
    amount = models.IntegerField(db_column='Amount')
    reference_type = models.CharField(max_length=50, db_column='Reference_type')
    reference_id = models.CharField(max_length=100, db_column='Reference_id')

    class Meta:
        db_table = 'Transactions'  # 保持原樣

    def __str__(self):
        return f"Transactions {self.transaction_id}"


class Payment(models.Model):
    payment_id = models.AutoField(primary_key=True)
    order_id = models.ForeignKey(Order, on_delete=models.CASCADE, db_column='Order_id')
    payment_method = models.CharField(max_length=50, blank=True, null=True)
    payment_status = models.CharField(max_length=50, blank=True, null=True)
    transaction_id = models.CharField(max_length=100, blank=True, null=True)
    promotion_code = models.CharField(max_length=100, blank=True, null=True)

    class Meta:
        db_table = 'Payment'  # 新增：指定大寫名稱

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
        db_table = 'Admins'  # 新增：指定大寫名稱

    def __str__(self):
        return self.name


class Vendor(models.Model):
    vendor_id = models.AutoField(primary_key=True)
    company_name = models.CharField(max_length=200)
    contact_name = models.CharField(max_length=200)
    email = models.EmailField(max_length=255)
    password = models.CharField(max_length=255)
    tax_id = models.CharField(max_length=50, db_column='Tax_ID')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'Vendor'  # 新增：指定大寫名稱

    def __str__(self):
        return self.company_name


class VendorWallet(models.Model):
    wallet_id = models.AutoField(primary_key=True, db_column='Wallet_id')
    vendor_id = models.ForeignKey(Vendor, on_delete=models.CASCADE, db_column='Vendor_id')
    balance = models.IntegerField(default=0)
    history = models.TextField(blank=True, null=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'Vendor_Wallet'  # 保持原樣

    def __str__(self):
        return f"VendorWallet {self.wallet_id}"


class CampaignApplications(models.Model):
    application_id = models.AutoField(primary_key=True)
    campaign = models.ForeignKey(Campaigns, on_delete=models.CASCADE, db_column='Campaign_id')
    influencer = models.ForeignKey(User, on_delete=models.CASCADE, db_column='Influencer_id')
    status = models.CharField(max_length=50)
    applied_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'Campaign_Applications'  # 改為大寫駝峰

    def __str__(self):
        return f"CampaignApplication {self.application_id}"


class CampaignParticipants(models.Model):
    participants_id = models.AutoField(primary_key=True)
    campaign = models.ForeignKey(Campaigns, on_delete=models.CASCADE, db_column='Campaign_id')
    influencer = models.ForeignKey(User, on_delete=models.CASCADE, db_column='Influencer_id')
    assigned_coupon_id = models.CharField(max_length=100, blank=True, null=True)
    status = models.CharField(max_length=50)

    class Meta:
        db_table = 'Campaign_Participants'  # 保持原樣

    def __str__(self):
        return f"CampaignParticipants {self.participants_id}"


class TrackingLogs(models.Model):
    tracking_id = models.AutoField(primary_key=True)
    order = models.ForeignKey(Order, on_delete=models.CASCADE, db_column='Order_id')
    user = models.ForeignKey(User, on_delete=models.CASCADE, db_column='User_id')
    promotion_code = models.CharField(max_length=100, db_column='Promotion_code', null=True, blank=True)
    click_id = models.CharField(max_length=100, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'Tracking_Logs'  # 改為大寫駝峰

    def __str__(self):
        return f"TrackingLogs {self.tracking_id}"


class Commissions(models.Model):
    commission_id = models.AutoField(primary_key=True)
    influencer = models.ForeignKey(User, on_delete=models.CASCADE, db_column='Influencer_id')
    order = models.ForeignKey(Order, on_delete=models.CASCADE, db_column='Order_id')
    amount = models.IntegerField()
    status = models.CharField(max_length=50)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'Commissions'  # 新增：指定大寫名稱

    def __str__(self):
        return f"Commission {self.commission_id}"


class Payouts(models.Model):
    payout_id = models.AutoField(primary_key=True)
    influencer_id = models.ForeignKey(User, on_delete=models.CASCADE, db_column='Influencer_id')
    amount = models.IntegerField()
    payout_date = models.DateField()
    status = models.CharField(max_length=50)

    class Meta:
        db_table = 'Payouts'  # 新增：指定大寫名稱

    def __str__(self):
        return f"Payout {self.payout_id}"


class Earnings(models.Model):
    earnings_id = models.AutoField(primary_key=True)
    user_id = models.ForeignKey(User, on_delete=models.CASCADE, db_column='User_id')
    amount = models.IntegerField()
    status = models.CharField(max_length=50)

    class Meta:
        db_table = 'Earnings'  # 新增：指定大寫名稱

    def __str__(self):
        return f"Earnings {self.earnings_id}"


class ServiceTickets(models.Model):
    ticket_id = models.AutoField(primary_key=True)
    admin_id = models.ForeignKey(Admins, on_delete=models.SET_NULL, db_column='Admin_id', null=True, blank=True)
    influencer_id = models.ForeignKey(User, on_delete=models.SET_NULL, db_column='Influencer_id', related_name='tickets_as_influencer', null=True, blank=True)
    consumer_id = models.ForeignKey(User, on_delete=models.SET_NULL, db_column='Consumer_id', related_name='tickets_as_consumer', null=True, blank=True)
    vendor_id = models.ForeignKey(Vendor, on_delete=models.SET_NULL, db_column='Vendor_id', null=True, blank=True)
    order_id = models.ForeignKey(Order, on_delete=models.SET_NULL, db_column='Order_id', null=True, blank=True)
    category = models.CharField(max_length=100)
    description = models.TextField(blank=True, null=True)
    status = models.CharField(max_length=50)
    resolution_note = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    update_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'Service_Tickets'  # 保持原樣

    def __str__(self):
        return f"Ticket {self.ticket_id}"


class AdminAuditLogs(models.Model):
    log_id = models.AutoField(primary_key=True)
    admin_id = models.ForeignKey(Admins, on_delete=models.CASCADE, db_column='Admin_id')
    action_type = models.CharField(max_length=100)
    submission_id = models.CharField(max_length=100, blank=True, null=True)
    tasks_id = models.CharField(max_length=100, blank=True, null=True)
    influencer_id = models.CharField(max_length=100, blank=True, null=True)
    vendor_id = models.CharField(max_length=100, blank=True, null=True)
    action_reason = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'Admin_Audit_Logs'  # 保持原樣

    def __str__(self):
        return f"AuditLog {self.log_id}"
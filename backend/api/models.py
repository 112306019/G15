from django.db import models
import uuid


# ── 之後在這裡定義你的 model ──
#
# 範例：
# class Product(models.Model):
#     name = models.CharField(max_length=200)
#     ...
class User(models.Model):
    # 這裡用 User_id 當作主鍵
    user_id = models.CharField(max_length=50, unique=True, primary_key=True)
    role = models.CharField(max_length=20)       # 例如：KOC, Brand, Admin
    name = models.CharField(max_length=100)
    email = models.EmailField(unique=True)
    password = models.CharField(max_length=128)  # 放密碼
    phone = models.CharField(max_length=20)
    created_at = models.DateTimeField(auto_now_add=True) # 自動記錄建立時間

    def __str__(self):
        return f"[{self.role}] {self.name}"


class KOC(models.Model):
    # 關鍵：這裡就是「繼承/連結」User 表的核心！
    # koc_id 作為主鍵
    koc_id = models.CharField(max_length=50, unique=True, primary_key=True)
    
    # 透過 OneToOneField 連結 User 表。
    # 當 User 被刪除時，對應的 KOC 資料也會一起被刪除 (on_delete=models.CASCADE)
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='koc_profile')
    
    # 擴充 KOC 專屬的欄位
    social_account = models.CharField(max_length=100) # 社群帳號 (IG/FB等)
    bank_number = models.CharField(max_length=50) # 銀行代碼  
    bank_account = models.CharField(max_length=50)  # 銀行帳號
    address = models.TextField(blank=True, null=True) # 補上之前的地址欄位

    def __str__(self):
        return f"KOC: {self.user.name}"
    
class Campaigns(models.Model):
    """
    代言活動表 (對應第二張截圖)
    """
    # 使用 UUID 作為主鍵，確保在 Supabase 分散式環境下不會重複
    Campaign_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    product_id = models.CharField(max_length=100, db_index=True) # 商品ID (用來跟訂單明細對應)
    Vendor_id = models.CharField(max_length=100)                # 廠商ID
    Name = models.CharField(max_length=255)                     # 活動名稱
    Description = models.TextField(blank=True, null=True)       # 活動描述
    Budget = models.DecimalField(max_digits=10, decimal_places=2, default=0.00) # 預算
    Reward_type = models.CharField(max_length=100)              # 獎勵類型
    Start_date = models.DateTimeField()                         # 開始日期
    End_date = models.DateTimeField()                           # 結束日期
    Status = models.CharField(max_length=50, default='active')  # 狀態

    class Meta:
        db_table = 'api_campaigns' # 確保在 Supabase 中的實體表名漂亮

    def __str__(self):
        return self.Name


class Order(models.Model):
    """
    訂單主表 (對應第一張截圖)
    """
    Order_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    User_id = models.CharField(max_length=100, db_index=True)   # KOC的使用者ID
    Guest_id = models.CharField(max_length=100, blank=True, null=True) # 訪客ID
    Promotion_code = models.CharField(max_length=50, blank=True, null=True) # 優惠碼
    total_amount = models.DecimalField(max_digits=10, decimal_places=2) # 總金額
    order_status = models.CharField(max_length=50, default='pending')   # 訂單狀態
    payment_status = models.CharField(max_length=50, default='unpaid')  # 付款狀態
    shipping_status = models.CharField(max_length=50, default='unshipped') # 物流狀態
    Address_id = models.CharField(max_length=100)               # 地址ID
    created_at = models.DateTimeField(auto_now_add=True)        # 建立時間

    class Meta:
        db_table = 'api_order'

    def __str__(self):
        return f"Order {self.Order_id} by {self.User_id}"


class OrderItem(models.Model):
    """
    訂單明細表 (對應第三張截圖)
    """
    Order_item_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # 💡 關鍵連連看：一筆訂單明細，必須屬於某一筆「訂單主表」
    # on_delete=models.CASCADE 代表如果主訂單被刪除，明細也跟著一起刪除
    # related_name='items' 讓我們未來可以用 order.items.all() 直接抓到所有明細！
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='items', db_column='Order_id')
    
    Product_id = models.CharField(max_length=100, db_index=True) # 商品ID
    quantity = models.IntegerField(default=1)                    # 數量
    Unit_price = models.DecimalField(max_digits=10, decimal_places=2) # 單價
    subtotal = models.DecimalField(max_digits=10, decimal_places=2)   # 小計

    # 💡 幫你貼心補上：規格書要求的代言申請狀態（0:尚未申請 / 1:審核中 / 2:被退件）
    # 因為它是跟著「買過的商品」走的，開在明細表最完美！
    apply_status = models.IntegerField(default=0)

    class Meta:
        db_table = 'api_order_item'

    def __str__(self):
        return f"Item {self.Product_id} in Order {self.order.Order_id}"
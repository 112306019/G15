from django.contrib import admin
from .models import User, Order, OrderItem, Campaigns, CampaignProduct, Product, KOC, Application,  KOCMissionNew, Submissions, Vendor, KocWallet, Earnings, CouponNew, Admins, AdminAuditLogs, Payouts
# 例如：from .models import Product
# admin.site.register(Product)

@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ('order_id', 'user_id')  # 在清單上顯示主鍵與用戶ID
    search_fields = ('user_id',)     # 支援搜尋用戶ID

@admin.register(OrderItem)
class OrderItemAdmin(admin.ModelAdmin):
    list_display = ('order_item_id', 'order', 'product_id') # 顯示明細ID、所屬訂單、商品ID
    search_fields = ('product_id',)

@admin.register(Campaigns)
class CampaignsAdmin(admin.ModelAdmin):
    list_display = ('campaign_id', 'name') # 顯示活動ID與活動名稱
    search_fields = ('name', 'campaign_id')

@admin.register(CampaignProduct)
class CampaignProductAdmin(admin.ModelAdmin):
    list_display = ('campaign_product_id', 'campaign', 'product_id') # 顯示中間表ID、活動、商品ID
    search_fields = ('product_id',)

@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    # 填入你在 Product Model 裡面有的欄位（例如：product_id 或 name 等）
    # 這裡先假設主鍵叫 product_id，你可以根據實際 models.py 修改
    list_display = ('product_id', 'product_name')

@admin.register(Application)
class ApplicationAdmin(admin.ModelAdmin):
    list_display = ('application_id', 'koc_id', 'order_id', 'campaign_id', 'status')
    list_filter = ('status',)
    search_fields = ('application_id', 'koc__koc_id', 'order__order_id', 'status')
    list_editable = ('status',)

@admin.register(KOC)
class KOCAdmin(admin.ModelAdmin):
    readonly_fields = ('koc_id',)
    list_display = ('koc_id', 'user', 'ig_account', 'fb_account', 'threads_account', 'approval_status', 'is_suspended')
    list_filter = ('approval_status', 'is_suspended')
    search_fields = ('koc_id', 'user__name', 'ig_account', 'fb_account', 'threads_account')
    list_editable = ('is_suspended',)

@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    readonly_fields = ('user_id',)
    list_display = ('user_id', 'name', 'email', 'role', 'phone', 'created_at')
    list_filter = ('role',)
    search_fields = ('user_id', 'name', 'email', 'phone')

@admin.register(KOCMissionNew)
class KOCMissionNewAdmin(admin.ModelAdmin):
    list_display = ('kocmission_id', 'koc', 'application', 'stage')
    list_filter = ('stage',)
    search_fields = ('kocmission_id', 'koc__koc_id')


@admin.register(Submissions)
class SubmissionsAdmin(admin.ModelAdmin):
    list_display = ('submission_id', 'kocmission', 'submission_type', 'status', 'submitted_time')
    list_filter = ('status', 'submission_type')
    search_fields = ('submission_id', 'kocmission__kocmission_id')
    readonly_fields = ('submitted_time', 'reviewed_time')

@admin.register(Vendor)
class VendorAdmin(admin.ModelAdmin):
    list_display = ('vendor_id', 'company_name', 'contact_name', 'email', 'tax_id', 'created_at')
    search_fields = ('company_name', 'contact_name', 'email', 'tax_id')

@admin.register(KocWallet)
class KocWalletAdmin(admin.ModelAdmin):
    list_display = ('koc', 'balance_available', 'balance_frozen', 'updated_at')
    search_fields = ('koc__koc_id',)
    readonly_fields = ('updated_at',)


@admin.register(Earnings)
class EarningsAdmin(admin.ModelAdmin):
    list_display = ('earnings_id', 'user', 'kocmission', 'amount', 'status')
    list_filter = ('status',)
    search_fields = ('user__name', 'user__user_id')
    list_editable = ('status',)

@admin.register(CouponNew)
class CouponNewAdmin(admin.ModelAdmin):
    list_display = ('coupon_id', 'kocmission', 'promotion_code', 'discount_value', 'status', 'usage_count', 'total_commission')
    list_filter = ('status',)
    search_fields = ('promotion_code', 'kocmission__kocmission_id')
    list_editable = ('status', 'usage_count')
    readonly_fields = ('total_commission',)

@admin.register(Admins)
class AdminsAdmin(admin.ModelAdmin):
    list_display = ('admin_id', 'name', 'email', 'role', 'status', 'last_login_at')
    list_filter = ('role', 'status')
    search_fields = ('name', 'email')


@admin.register(AdminAuditLogs)
class AdminAuditLogsAdmin(admin.ModelAdmin):
    list_display = ('log_id', 'admin_id', 'action_type', 'koc', 'vendor', 'created_at')
    list_filter = ('action_type',)
    search_fields = ('action_type', 'koc__koc_id', 'vendor__company_name')
    readonly_fields = ('created_at',)


@admin.register(Payouts)
class PayoutsAdmin(admin.ModelAdmin):
    list_display = ('payout_id', 'koc', 'amount', 'status', 'payout_date')
    list_filter = ('status',)
    search_fields = ('koc__user_id',)

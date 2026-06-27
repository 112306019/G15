from django.contrib import admin
from .models import User, Order, OrderItem, Campaigns, CampaignProduct, Product, KOC, Application,  KOCMissionNew, Submissions, Vendor
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
    list_display = ('koc_id', 'user', 'social_account', 'bank_account')
    search_fields = ('koc_id', 'user__name', 'social_account')

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
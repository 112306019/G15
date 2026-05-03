from django.contrib.auth import get_user_model
from rest_framework import serializers
from .models import (
    Category, Product, Order, OrderItem,
    KOCTask, KOCApplication, TaskExecution,
    PromoCode, EarningsRecord,
)

User = get_user_model()


# ──────────────────────────────────────────────
# Auth / User
# ──────────────────────────────────────────────

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = ["id", "username", "email", "password", "role", "phone"]

    def create(self, validated_data):
        password = validated_data.pop("password")
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            "id", "username", "email", "role", "phone", "avatar",
            "points", "display_name", "ig_username", "fb_url",
            "threads_username", "koc_approved", "company_name",
            "company_address", "created_at",
        ]
        read_only_fields = ["id", "role", "koc_approved", "points", "created_at"]


class UserPublicSerializer(serializers.ModelSerializer):
    """給其他人看的精簡版（不含私人資料）"""
    class Meta:
        model = User
        fields = ["id", "display_name", "ig_username", "avatar"]


# ──────────────────────────────────────────────
# 商品
# ──────────────────────────────────────────────

class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ["id", "name", "slug"]


class ProductSerializer(serializers.ModelSerializer):
    vendor_name = serializers.CharField(source="vendor.company_name", read_only=True)
    category_name = serializers.CharField(source="category.name", read_only=True)

    class Meta:
        model = Product
        fields = [
            "id", "vendor", "vendor_name", "category", "category_name",
            "name", "description", "price", "stock", "image",
            "is_active", "created_at",
        ]
        read_only_fields = ["id", "vendor", "created_at"]


# ──────────────────────────────────────────────
# 訂單
# ──────────────────────────────────────────────

class OrderItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source="product.name", read_only=True)
    product_image = serializers.ImageField(source="product.image", read_only=True)
    subtotal = serializers.DecimalField(
        max_digits=10, decimal_places=2, read_only=True
    )

    class Meta:
        model = OrderItem
        fields = ["id", "product", "product_name", "product_image",
                  "quantity", "unit_price", "subtotal"]


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    buyer_username = serializers.CharField(source="buyer.username", read_only=True)

    class Meta:
        model = Order
        fields = [
            "id", "buyer", "buyer_username", "status", "total_price",
            "shipping_address", "promo_code", "discount_amount",
            "items", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "buyer", "total_price", "created_at", "updated_at"]


class OrderCreateSerializer(serializers.Serializer):
    """建立訂單時的輸入格式"""
    shipping_address = serializers.CharField()
    promo_code = serializers.CharField(required=False, allow_blank=True)
    items = serializers.ListField(
        child=serializers.DictField()  # [{product_id, quantity}, ...]
    )


# ──────────────────────────────────────────────
# 優惠碼
# ──────────────────────────────────────────────

class PromoCodeSerializer(serializers.ModelSerializer):
    class Meta:
        model = PromoCode
        fields = [
            "id", "code", "discount_type", "discount_value",
            "koc", "vendor", "valid_from", "valid_until",
            "max_uses", "used_count", "is_active", "created_at",
        ]
        read_only_fields = ["id", "vendor", "used_count", "created_at"]


class PromoCodeValidateSerializer(serializers.Serializer):
    """前端查優惠碼是否有效"""
    code = serializers.CharField()


# ──────────────────────────────────────────────
# KOC 任務
# ──────────────────────────────────────────────

class KOCTaskSerializer(serializers.ModelSerializer):
    vendor_name = serializers.CharField(
        source="vendor.company_name", read_only=True
    )
    product_name = serializers.CharField(source="product.name", read_only=True)
    product_image = serializers.ImageField(source="product.image", read_only=True)
    applicant_count = serializers.SerializerMethodField()

    class Meta:
        model = KOCTask
        fields = [
            "id", "vendor", "vendor_name", "product", "product_name",
            "product_image", "title", "description", "reward_amount",
            "max_koc_count", "deadline", "is_active", "applicant_count",
            "created_at",
        ]
        read_only_fields = ["id", "vendor", "created_at"]

    def get_applicant_count(self, obj):
        return obj.applications.count()


class KOCApplicationSerializer(serializers.ModelSerializer):
    koc_display_name = serializers.CharField(
        source="koc.display_name", read_only=True
    )
    task_title = serializers.CharField(source="task.title", read_only=True)

    class Meta:
        model = KOCApplication
        fields = [
            "id", "task", "task_title", "koc", "koc_display_name",
            "status", "applied_at", "reviewed_at", "reject_reason",
        ]
        read_only_fields = ["id", "koc", "applied_at", "reviewed_at"]


class TaskExecutionSerializer(serializers.ModelSerializer):
    class Meta:
        model = TaskExecution
        fields = [
            "id", "application", "status", "promo_code",
            "content_draft", "content_file",
            "post_url", "post_screenshot",
            "reject_reason", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "application", "created_at", "updated_at"]


# ──────────────────────────────────────────────
# 收益
# ──────────────────────────────────────────────

class EarningsRecordSerializer(serializers.ModelSerializer):
    task_title = serializers.CharField(
        source="task_execution.application.task.title", read_only=True
    )

    class Meta:
        model = EarningsRecord
        fields = [
            "id", "koc", "task_execution", "task_title",
            "order", "amount", "status",
            "transaction_id", "paid_at", "created_at",
        ]
        read_only_fields = ["id", "koc", "created_at"]

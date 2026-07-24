from rest_framework import serializers
from .models import Vendor, Product, Campaigns, CampaignProduct, Application, KOCMissionNew, Submissions

class VendorRegisterSerializer(serializers.ModelSerializer):
    class Meta:
        model = Vendor
        fields = [
            "vendor_id",
            "company_name",
            "contact_name",
            "email",
            "password",
            "tax_id",
        ]
        read_only_fields = ["vendor_id"]
        extra_kwargs = {
            "password": {"write_only": True}
        }


class VendorLoginSerializer(serializers.Serializer):
    vendor_id = serializers.CharField()
    password = serializers.CharField()


class VendorProfileUpdateSerializer(serializers.ModelSerializer):
    vendor_id = serializers.CharField()

    class Meta:
        model = Vendor
        fields = [
            "vendor_id",
            "company_name",
            "contact_name",
            "email",
            "tax_id",
        ]

    def update(self, instance, validated_data):
        validated_data.pop("vendor_id", None)

        for field, value in validated_data.items():
            setattr(instance, field, value)

        instance.save()
        return instance
    


# ──────────────────────────────────────────────
# Vendor 商品管理
# ──────────────────────────────────────────────

class VendorProductCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Product
        fields = [
            "product_id",
            "vendor_id",
            "product_name",
            "description",
            "price",
            "discounted_price",
            "stock",
            "category",
            "image_url",
            "status",
        ]
        read_only_fields = ["product_id"]


class VendorProductUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Product
        fields = [
            "product_id",
            "vendor_id",
            "product_name",
            "description",
            "price",
            "discounted_price",
            "stock",
            "category",
            "image_url",
            "status",
        ]
        read_only_fields = ["product_id", "vendor_id"]


class VendorProductStatusSerializer(serializers.Serializer):
    vendor_id = serializers.CharField()
    product_id = serializers.IntegerField()
    status = serializers.CharField()


# ──────────────────────────────────────────────
# Vendor 任務 / Campaign 管理
# ──────────────────────────────────────────────

class VendorCampaignProductSerializer(serializers.Serializer):
    product_name = serializers.CharField(max_length=200)

    description = serializers.CharField(
        required=False,
        allow_blank=True,
        allow_null=True
    )

    price = serializers.IntegerField(min_value=0)

    discounted_price = serializers.IntegerField(
        required=False,
        allow_null=True,
        min_value=0
    )

    stock = serializers.IntegerField(min_value=0)

    category = serializers.CharField(
        required=False,
        allow_blank=True,
        allow_null=True
    )

    image_url = serializers.CharField(
        required=False,
        allow_blank=True,
        allow_null=True
    )


class VendorCampaignCreateSerializer(serializers.Serializer):
    vendor_id = serializers.CharField()
    name = serializers.CharField(max_length=255)

    description = serializers.CharField(
        required=False,
        allow_blank=True,
        allow_null=True
    )

    budget = serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
        min_value=0
    )

    reward_type = serializers.ChoiceField(
        choices=["commission", "fixed", "product"],
        required=False,
        default="commission"
    )

    discount_percent = serializers.IntegerField(
        min_value=0,
        max_value=100
    )

    promo_days = serializers.IntegerField(
        min_value=1,
        max_value=30
    )

    start_date = serializers.DateField()
    end_date = serializers.DateField()

    status = serializers.ChoiceField(
        choices=["draft", "active"],
        default="draft"
    )

    # 選擇既有商品時傳這個
    product_id = serializers.IntegerField(
        required=False,
        allow_null=True
    )

    # 建立新商品時傳這個
    product = VendorCampaignProductSerializer(
        required=False,
        allow_null=True
    )

    def validate(self, data):
        product_id = data.get("product_id")
        product_data = data.get("product")

        # 兩種商品來源至少要有一種
        if product_id is None and not product_data:
            raise serializers.ValidationError({
                "product": "請選擇既有商品或建立新商品"
            })

        # 不允許兩種同時傳送
        if product_id is not None and product_data:
            raise serializers.ValidationError({
                "product": "product_id 與 product 只能擇一傳入"
            })

        if data["end_date"] < data["start_date"]:
            raise serializers.ValidationError({
                "end_date": "申請截止日期不能早於任務開始日期"
            })

        if product_data:
            discounted_price = product_data.get(
                "discounted_price"
            )

            if (
                discounted_price is not None
                and discounted_price > product_data["price"]
            ):
                raise serializers.ValidationError({
                    "product": {
                        "discounted_price": "優惠價不能高於商品原價"
                    }
                })

        return data


class VendorCampaignUpdateSerializer(serializers.Serializer):
    campaign_id = serializers.UUIDField()
    vendor_id = serializers.CharField()

    name = serializers.CharField(max_length=255)

    description = serializers.CharField(
        required=False,
        allow_blank=True,
        allow_null=True
    )

    budget = serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
        min_value=0
    )

    reward_type = serializers.ChoiceField(
        choices=["commission", "fixed", "product"],
        required=False,
        default="commission"
    )

    discount_percent = serializers.IntegerField(
        min_value=0,
        max_value=100
    )

    promo_days = serializers.IntegerField(
        min_value=1,
        max_value=30
    )

    start_date = serializers.DateField()
    end_date = serializers.DateField()

    status = serializers.ChoiceField(
        choices=["draft", "active"]
    )

    # 選擇商品庫中的既有商品
    product_id = serializers.IntegerField(
        required=False,
        allow_null=True
    )

    # 建立新的商品並改綁到活動
    product = VendorCampaignProductSerializer(
        required=False,
        allow_null=True
    )

    def validate(self, data):
        product_id = data.get("product_id")
        product_data = data.get("product")

        if product_id is None and not product_data:
            raise serializers.ValidationError({
                "product": "請選擇既有商品或提供新商品資料"
            })

        if product_id is not None and product_data:
            raise serializers.ValidationError({
                "product": "product_id 與 product 只能擇一傳入"
            })

        if data["end_date"] < data["start_date"]:
            raise serializers.ValidationError({
                "end_date": "申請截止日期不能早於任務開始日期"
            })

        if product_data:
            discounted_price = product_data.get(
                "discounted_price"
            )

            product_price = product_data.get("price")

            if (
                discounted_price is not None
                and product_price is not None
                and discounted_price > product_price
            ):
                raise serializers.ValidationError({
                    "product": {
                        "discounted_price": "優惠價不能高於商品原價"
                    }
                })

        return data


# ──────────────────────────────────────────────
# Vendor KOC 報名審核
# ──────────────────────────────────────────────

class VendorApplicationReviewSerializer(serializers.Serializer):
    vendor_id = serializers.CharField()
    application_id = serializers.IntegerField()
    status = serializers.CharField()


# ──────────────────────────────────────────────
# Vendor 投稿 / 任務成果審核
# ──────────────────────────────────────────────

class VendorSubmissionReviewSerializer(serializers.Serializer):
    vendor_id = serializers.CharField()
    submission_id = serializers.IntegerField()
    status = serializers.CharField()
    vendor_feedback = serializers.CharField(required=False, allow_blank=True)
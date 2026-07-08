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
    vendor_id = serializers.IntegerField()
    product_id = serializers.IntegerField()
    status = serializers.CharField()


# ──────────────────────────────────────────────
# Vendor 任務 / Campaign 管理
# ──────────────────────────────────────────────

class VendorCampaignCreateSerializer(serializers.ModelSerializer):
    product_id = serializers.IntegerField(write_only=True)

    class Meta:
        model = Campaigns
        fields = [
            "campaign_id",
            "vendor_id",
            "product_id",
            "name",
            "description",
            "budget",
            "reward_type",
            "start_date",
            "end_date",
            "status",
        ]
        read_only_fields = ["campaign_id"]


class VendorCampaignUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Campaigns
        fields = [
            "campaign_id",
            "vendor_id",
            "name",
            "description",
            "budget",
            "reward_type",
            "start_date",
            "end_date",
            "status",
        ]
        read_only_fields = ["campaign_id", "vendor_id"]


# ──────────────────────────────────────────────
# Vendor KOC 報名審核
# ──────────────────────────────────────────────

class VendorApplicationReviewSerializer(serializers.Serializer):
    vendor_id = serializers.IntegerField()
    application_id = serializers.IntegerField()
    status = serializers.CharField()


# ──────────────────────────────────────────────
# Vendor 投稿 / 任務成果審核
# ──────────────────────────────────────────────

class VendorSubmissionReviewSerializer(serializers.Serializer):
    vendor_id = serializers.IntegerField()
    submission_id = serializers.IntegerField()
    status = serializers.CharField()
    vendor_feedback = serializers.CharField(required=False, allow_blank=True)
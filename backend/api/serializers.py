from django.contrib.auth import get_user_model
from rest_framework import serializers
from .models import (
    User, Order, OrderItem, Campaigns, CampaignProduct, Product,
    Application, KOCMissionNew, Submissions, KOC
)


User = get_user_model()
# ──────────────────────────────────────────────
# KOC部分
# ──────────────────────────────────────────────
class InfluencerSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = '__all__'

class UpdateKOCProfileSerializer(serializers.Serializer):
    user_id = serializers.CharField(required=True)
    user_name = serializers.CharField(required=True)
    phone = serializers.CharField(required=True)
    email = serializers.EmailField(required=True)
    bank_account = serializers.CharField(required=True)
    bank_number = serializers.CharField(required=True)
    address = serializers.CharField(required=True)
  
class MissionSubmitSerializer(serializers.Serializer):
    KOCMission_id = serializers.IntegerField(required=True)
    submission_type = serializers.ChoiceField(choices=['0', '1'], required=True)
    text_content = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    content_url = serializers.CharField(required=False, allow_blank=True, allow_null=True)

    def validate(self, data):
        submission_type = data.get('submission_type')
        if submission_type == '0' and not data.get('text_content'):
            raise serializers.ValidationError("submission_type=0 (文案) 時，text_content 為必填")
        if submission_type == '1' and not data.get('content_url'):
            raise serializers.ValidationError("submission_type=1 (作品連結) 時，content_url 為必填")
        return data

class ApplicationListItemSerializer(serializers.Serializer):
    application_id = serializers.CharField()
    campaign_name = serializers.CharField()
    campaign_image = serializers.CharField(allow_null=True)
    status = serializers.IntegerField()
    promotion_code = serializers.CharField(allow_null=True)
    coupon_status = serializers.IntegerField(allow_null=True)


class MissionDetailSerializer(serializers.Serializer):
    KOCMission_id = serializers.IntegerField(required=True)
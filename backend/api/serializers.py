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
class UpdateKOCProfileSerializer(serializers.Serializer):
    user_id = serializers.CharField(required=True)
    display_name = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    user_name = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    phone = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    email = serializers.EmailField(required=False, allow_null=True)
    address = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    bank_account = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    bank_number = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    fb_account = serializers.CharField(required=False, allow_blank=True, allow_null=True)   # 新增
    ig_account = serializers.CharField(required=False, allow_blank=True, allow_null=True)   # 新增
    threads_account = serializers.CharField(required=False, allow_blank=True, allow_null=True)  # 新增

class InfluencerSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = '__all__'

  
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

class MissionListItemSerializer(serializers.Serializer):
    KOCMission_id = serializers.CharField()
    campaign_name = serializers.CharField()
    campaign_image = serializers.CharField(allow_null=True)
    stage = serializers.IntegerField()

class MissionStageCountsSerializer(serializers.Serializer):
    qualification = serializers.IntegerField()
    writing = serializers.IntegerField()
    reviewing = serializers.IntegerField()
    publishing = serializers.IntegerField()
    completed = serializers.IntegerField()

class RevenueTotalSerializer(serializers.Serializer):
    withdrawable_amount = serializers.IntegerField()
    pending_amount = serializers.IntegerField()
    hasBankAccount = serializers.BooleanField()

class RevenueHistoryItemSerializer(serializers.Serializer):
    date = serializers.CharField(allow_null=True)
    amount = serializers.IntegerField()
    KOCMission_id = serializers.CharField()
    campaign_name = serializers.CharField()
    status = serializers.IntegerField()

class PendingEarningsItemSerializer(serializers.Serializer):
    earnings_no = serializers.CharField()
    amount = serializers.IntegerField()
    campaign_name = serializers.CharField(allow_null=True)
    date = serializers.CharField(allow_null=True)

class AnalyticsListItemSerializer(serializers.Serializer):
    KOCMission_id = serializers.CharField()
    campaign_image = serializers.CharField(allow_null=True)
    campaign_name = serializers.CharField()
    usage_count = serializers.IntegerField()

class AnalyticsDetailSerializer(serializers.Serializer):
    KOCMission_id = serializers.IntegerField(required=True)
    period = serializers.ChoiceField(choices=['week', 'month'], required=True)

class SaveDraftSerializer(serializers.Serializer):
    KOCMission_id = serializers.IntegerField(required=True)
    submission_type = serializers.ChoiceField(choices=['0', '1'], required=True)
    text_content = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    content_url = serializers.CharField(required=False, allow_blank=True, allow_null=True)

class KOCApplySerializer(serializers.Serializer):
    user_id = serializers.CharField(required=True)
    name = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    email = serializers.EmailField(required=False, allow_null=True)
    fb_account = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    ig_account = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    threads_account = serializers.CharField(required=False, allow_blank=True, allow_null=True)

    def validate(self, data):
        # 至少要填一個社群帳號
        if not any([
            data.get('fb_account'),
            data.get('ig_account'),
            data.get('threads_account')
        ]):
            raise serializers.ValidationError("請至少填入一個社群帳號")
        return data
    
# ──────────────────────────────────────────────
# 平台端部分
# ──────────────────────────────────────────────
class KOCApproveSerializer(serializers.Serializer):
    koc_id = serializers.CharField(required=True)
    admin_id = serializers.IntegerField(required=True)


class KOCRejectSerializer(serializers.Serializer):
    koc_id = serializers.CharField(required=True)
    admin_id = serializers.IntegerField(required=True)
    reject_reason = serializers.CharField(required=True)

class KOCPendingListItemSerializer(serializers.Serializer):
    koc_id = serializers.CharField()
    user_id = serializers.CharField()
    name = serializers.CharField()
    email = serializers.CharField()
    ig_account = serializers.CharField()
    fb_account = serializers.CharField()
    threads_account = serializers.CharField()
    user_role = serializers.CharField()
    applied_at = serializers.CharField()

class PlatformKOCListItemSerializer(serializers.Serializer):
    koc_id = serializers.CharField()
    name = serializers.CharField()
    ig_account = serializers.CharField()
    fb_account = serializers.CharField()
    threads_account = serializers.CharField()
    status = serializers.IntegerField()  # 0: 已啟用, 1: 已停權

class PlatformKOCDetailSerializer(serializers.Serializer):
    koc_id = serializers.CharField(required=True)

class KOCMissionStageUpdateSerializer(serializers.Serializer):
    KOCMisson_id = serializers.IntegerField(required=True)
    Stage = serializers.ChoiceField(
        choices=['writing', 'reviewing', 'publishing', 'promoting', 'completed'],
        required=True
    )
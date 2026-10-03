import logging
import csv
import io
from django.conf import settings
from django.http import HttpResponse
from django.contrib.auth.hashers import check_password, make_password
from decimal import Decimal, ROUND_HALF_UP
from datetime import date, timedelta

from django.utils import timezone
from django.db import transaction
from django.db.models import Sum, Min

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status
from rest_framework import status as http_status

from api.error_messages import internal_error_message, serializer_error_message
from api.models import (
    User,
    Vendor,
    VendorWallet,
    Campaigns,
    Order,
    Transactions,
    ServiceTickets,
    KOCMissionNew,
    CouponNew,
    CampaignParticipants,
    Admins,
    AdminAuditLogs,
    KOC,
    Application,
    CampaignProduct,
    Earnings,
    OrderItem,
    KocWallet,
    RemunerationForm,
    VendorPayouts,
    VendorSettlement,
    VendorSettlementItem,
    VendorSettlementPayment,
    VendorInvoice,
    VendorReceivable,
    VendorReceivablePayout,
    VendorPayoutBatch,
    Payouts,
    ReturnRequest,
    Submissions

)

from api.serializers import KOCApproveSerializer, KOCRejectSerializer
from api.views.constants import ROLE_CODE_MAP, STAGE_CODE_MAP, SUBMISSION_REMINDER_DAYS, EARNINGS_STATUS_CODE_MAP, EARNINGS_STATUS_CHOICES_MAP, VENDOR_SETTLEMENT_HOLD_DAYS, REMUNERATION_SERVICE_CONTENT, RETURN_REQUEST_WINDOW_DAYS, is_return_window_open, has_unresolved_return_request, sync_expired_promoting_missions, KOC_COMMISSION_RATE_PERCENT, VENDOR_SETTLEMENT_RATE_PERCENT
from api.emails import send_koc_approval_email, send_vendor_approval_email, send_tax_form_rejected_email, send_vendor_review_overdue_email
from api.notifications import create_notification
from payments.services import pick_relevant_payment

logger = logging.getLogger(__name__)


# ==============================================================================
# 財務相關 admin API 的共用權限檢查
#
# 背景：AdminLogin.jsx 的「登入身分權限」選單有 Super Admin / Reviewer / Finance
# 三種角色，Finance 的定位是「財務員，僅看帳與審核」。但底下這些會動到金流的
# admin API 原本完全沒檢查角色，只要帶得出存在的 Admin_id 就能呼叫——代表一個
# Reviewer 帳號一樣能結算分潤、確認撥款。這支統一補上角色檢查。
#
# 目前只針對「金流」相關的 admin API 做角色限制（Admins.role 必須是
# 'Super Admin' 或 'Finance' 才放行），KOC/廠商審核那些非金流的 admin API
# 這次沒有動，範圍限定在這次討論的 AdminFinance.jsx 相關端點。
# ==============================================================================

FINANCE_ADMIN_ROLES = {'super_admin', 'finance'}


def normalize_admin_role(value):
    """把 Super Admin / super admin / super_admin 統一成 super_admin。"""
    return (
        (value or '')
        .strip()
        .lower()
        .replace(' ', '_')
    )


def require_admin_role(request, allowed_roles, source='data'):
    """
    共用權限檢查：確認這個請求帶的 Admin_id 存在，且該管理員的 role 在允許清單裡。
    source='data'：從 POST body 抓 Admin_id（給寫入類 API 用）
    source='query'：從 query string 抓 Admin_id（給 GET 類 API 用）

    回傳 (admin_obj, None) 代表通過檢查；
    回傳 (None, Response) 代表沒通過，呼叫端要直接把這個 Response 回傳給前端、
    不能繼續往下執行。
    """
    admin_id = (
        request.data.get('Admin_id') if source == 'data'
        else request.query_params.get('Admin_id')
    )

    if not admin_id:
        return None, Response({
            'success': False,
            'err': 'Admin_id is required'
        }, status=status.HTTP_400_BAD_REQUEST)

    try:
        admin_obj = Admins.objects.get(admin_id=admin_id)
    except Admins.DoesNotExist:
        return None, Response({
            'success': False,
            'err': 'Admin not found'
        }, status=status.HTTP_404_NOT_FOUND)

    # 比對時忽略大小寫跟前後空白，避免手動建立的測試資料（例如 "super admin"
    # 或 "Super Admin " 多一個空格）誤判成沒有權限。allowed_roles 也用同一套
    # 正規化處理，所以呼叫端傳 {'Super Admin', 'Finance'} 這種原始寫法即可。
    normalized_role = normalize_admin_role(admin_obj.role)
    normalized_allowed = {
        normalize_admin_role(role)
        for role in allowed_roles
    }

    if normalized_role not in normalized_allowed:
        return None, Response({
            'success': False,
            'err': f'此帳號角色「{admin_obj.role}」無權限執行此操作'
        }, status=status.HTTP_403_FORBIDDEN)

    return admin_obj, None


# ==============================================================================
# 訂單分潤計算（原本位於 vendor.py，依需求搬移到平台端統一管理）
# ==============================================================================

def calculate_order_commission(order):
    """訂單完成後建立 KOC 5% 待結算分潤。

    新制：訂單完成時只建立 pending Earnings，並放入 KOCWallet.balance_frozen；
    等該訂單所屬 Vendor 的 VendorSettlement 確認 paid 後，才轉成 withdrawable。
    分潤基礎只計算該 Campaign 綁定、且屬於該 Campaign Vendor 的商品小計，不含運費。
    """
    promotion_code = (order.promotion_code or "").strip()
    if not promotion_code:
        return {"created": False, "earning_id": None, "commission_amount": 0, "message": "訂單未使用優惠碼"}

    try:
        coupon = (CouponNew.objects
                  .select_related("kocmission__koc__user", "kocmission__application__campaign__vendor")
                  .get(promotion_code=promotion_code))
    except CouponNew.DoesNotExist:
        return {"created": False, "earning_id": None, "commission_amount": 0, "message": "找不到優惠碼"}

    if coupon.status != "active":
        return {"created": False, "earning_id": None, "commission_amount": 0, "message": "優惠碼尚未啟用"}

    mission = coupon.kocmission
    if not mission or not mission.koc_id or not mission.koc or not mission.koc.user:
        raise ValueError("找不到 KOC 對應資料")

    # 第三層保險：
    # 歷史訂單、直接改資料或其他繞過 checkout 的情況，
    # 只要下單者就是優惠碼所屬 KOC，就不建立 Earnings。
    if (
        order.user_id
        and str(order.user_id) == str(mission.koc.user_id)
    ):
        return {
            "created": False,
            "earning_id": None,
            "commission_amount": 0,
            "message": "KOC 自購訂單不計算分潤",
        }

    existing = Earnings.objects.filter(order=order, kocmission=mission).first()
    if existing:
        return {
            "created": False,
            "earning_id": existing.earnings_id,
            "commission_amount": existing.amount,
            "message": "此訂單已計算過分潤",
        }

    campaign = mission.application.campaign
    campaign_product_ids = set(
        CampaignProduct.objects.filter(campaign=campaign).values_list("product_id", flat=True)
    )
    eligible_items = OrderItem.objects.filter(
        order=order,
        product_id__in=campaign_product_ids,
        product__vendor_id=campaign.vendor_id,
    )
    commission_base = sum((Decimal(str(i.subtotal)) for i in eligible_items), Decimal('0.00'))
    if commission_base <= 0:
        return {"created": False, "earning_id": None, "commission_amount": 0, "message": "沒有符合活動的訂單商品"}

    raw = commission_base * Decimal(str(KOC_COMMISSION_RATE_PERCENT)) / Decimal('100')
    commission_amount = int(raw.quantize(Decimal('1'), rounding=ROUND_HALF_UP))
    if commission_amount <= 0:
        return {"created": False, "earning_id": None, "commission_amount": 0, "message": "計算後分潤為 0"}

    with transaction.atomic():
        earning = Earnings.objects.create(
            user=mission.koc.user,
            kocmission=mission,
            order=order,
            amount=commission_amount,
            status=EARNINGS_STATUS_CHOICES_MAP["pending"],
        )
        wallet, _ = KocWallet.objects.select_for_update().get_or_create(koc=mission.koc)
        wallet.balance_frozen += commission_amount
        wallet.save(update_fields=["balance_frozen", "updated_at"])
        Transactions.objects.create(
            koc_wallet=wallet,
            type="reward_pending",
            amount=commission_amount,
            reference_type="earning",
            reference_id=str(earning.earnings_id),
        )
        coupon.usage_count = (coupon.usage_count or 0) + 1
        coupon.save(update_fields=["usage_count"])

    return {
        "created": True,
        "earning_id": earning.earnings_id,
        "commission_amount": commission_amount,
        "commission_base": str(commission_base),
        "message": "分潤已建立，待廠商完成平台結算後轉為可提領",
    }



# ==============================================================================
# Vendor 訂單完成後的兩條帳
#
# A. VendorSettlementItem
#    Vendor → ShareBuy：依折扣後商品成交額計算 15% 平台服務費。
#
# B. VendorReceivable
#    ShareBuy → Vendor：平台代收後，應全額撥給 Vendor 的折扣後商品款。
#
# 兩者不能互相抵銷；因此同一張 NT$1,000 訂單可以同時存在：
#   VendorSettlementItem.settlement_amount = 150
#   VendorReceivable.amount_due = 1000
#
# OrderItem.subtotal 在 consumer checkout 建單時已經存 final_subtotal，
# 所以此處直接按 Vendor 加總 OrderItem.subtotal，就是折扣後商品成交額。
# 運費目前不納入 Vendor 商品款撥付，shipping_amount 先記 0。
# ==============================================================================

def calculate_vendor_earning(order):
    """相容既有呼叫名稱；實際用途是建立/更新 Vendor 15% 平台服務費明細。"""
    order_items = list(
        OrderItem.objects
        .filter(order=order)
        .select_related("product")
    )
    if not order_items:
        return []

    items_by_vendor = {}
    for item in order_items:
        if not item.product or not item.product.vendor_id:
            continue
        items_by_vendor.setdefault(item.product.vendor_id, []).append(item)

    earning = (
        Earnings.objects
        .select_related("kocmission__application__campaign__vendor")
        .filter(order=order)
        .exclude(status='cancelled')
        .first()
    )

    earning_vendor_id = None
    if earning and earning.kocmission and earning.kocmission.application:
        campaign = earning.kocmission.application.campaign
        if campaign:
            earning_vendor_id = campaign.vendor_id

    eligible_at = (
        order.delivered_at + timedelta(days=RETURN_REQUEST_WINDOW_DAYS)
        if order.delivered_at
        else None
    )

    now = timezone.now()
    results = []

    for vendor_id, items in items_by_vendor.items():
        vendor = Vendor.objects.filter(vendor_id=vendor_id).first()
        if not vendor:
            results.append({
                "vendor_id": vendor_id,
                "created": False,
                "message": "找不到廠商",
            })
            continue

        # OrderItem.subtotal 已是優惠折扣後小計。
        sales_amount = sum(
            (Decimal(str(item.subtotal or 0)) for item in items),
            Decimal('0.00')
        ).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)

        rate = Decimal(str(VENDOR_SETTLEMENT_RATE_PERCENT))
        settlement_amount = (
            sales_amount * rate / Decimal('100')
        ).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)

        koc_amount = Decimal(
            str(
                earning.amount
                if earning and earning_vendor_id == vendor_id
                else 0
            )
        )
        platform_amount = max(
            Decimal('0.00'),
            settlement_amount - koc_amount
        )

        is_eligible = bool(
            eligible_at
            and eligible_at <= now
            and order.payment_status != 'refunded'
            and not has_unresolved_return_request(order)
        )

        item_status = 'eligible' if is_eligible else 'pending'

        obj, created = VendorSettlementItem.objects.update_or_create(
            vendor=vendor,
            order=order,
            defaults={
                'sales_amount': sales_amount,
                'settlement_rate': rate,
                'settlement_amount': settlement_amount,
                'koc_amount': koc_amount,
                'platform_amount': platform_amount,
                'eligible_at': eligible_at,
                'status': item_status,
            },
        )

        results.append({
            'vendor_id': vendor_id,
            'created': created,
            'settlement_item_id': obj.settlement_item_id,
            'sales_amount': str(sales_amount),
            'settlement_rate': str(rate),
            'settlement_amount': str(settlement_amount),
            'koc_amount': str(koc_amount),
            'platform_amount': str(platform_amount),
            'status': obj.status,
            'message': (
                '已建立廠商 15% 平台服務費明細'
                if created
                else '廠商 15% 平台服務費明細已存在並更新'
            ),
        })

    return results


# 正式名稱，舊 calculate_vendor_earning 暫時保留避免其他檔案 import 失敗。
create_vendor_settlement_items = calculate_vendor_earning


def create_vendor_receivables(order):
    """建立/更新平台應全額撥付給各 Vendor 的商品款。

    新金流：
      Consumer → ShareBuy 代收 → Vendor 收到 100% 折扣後商品款。

    注意：
    - 這裡完全不扣 15% 平台服務費。
    - 15% 由 VendorSettlementItem / VendorSettlement 另外記帳。
    - OrderItem.subtotal 已是優惠折扣後小計，因此直接依 Vendor 加總即可。
    - 運費目前不分配給 Vendor，shipping_amount 固定為 0。
    """
    order_items = list(
        OrderItem.objects
        .filter(order=order)
        .select_related("product")
    )
    if not order_items:
        return []

    items_by_vendor = {}
    for item in order_items:
        if not item.product or not item.product.vendor_id:
            continue
        items_by_vendor.setdefault(item.product.vendor_id, []).append(item)

    eligible_at = (
        order.delivered_at + timedelta(days=RETURN_REQUEST_WINDOW_DAYS)
        if order.delivered_at
        else None
    )

    now = timezone.now()
    results = []

    for vendor_id, items in items_by_vendor.items():
        vendor = Vendor.objects.filter(vendor_id=vendor_id).first()
        if not vendor:
            results.append({
                'vendor_id': vendor_id,
                'created': False,
                'message': '找不到廠商',
            })
            continue

        goods_amount = sum(
            (Decimal(str(item.subtotal or 0)) for item in items),
            Decimal('0.00')
        ).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)

        shipping_amount = Decimal('0.00')
        adjustment_amount = Decimal('0.00')
        amount_due = (
            goods_amount + shipping_amount + adjustment_amount
        ).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)

        is_eligible = bool(
            eligible_at
            and eligible_at <= now
            and order.payment_status != 'refunded'
            and not has_unresolved_return_request(order)
        )
        receivable_status = 'eligible' if is_eligible else 'pending'

        receivable, created = VendorReceivable.objects.update_or_create(
            vendor=vendor,
            order=order,
            defaults={
                'goods_amount': goods_amount,
                'shipping_amount': shipping_amount,
                'adjustment_amount': adjustment_amount,
                'amount_due': amount_due,
                'eligible_at': eligible_at,
                'status': receivable_status,
            },
        )

        results.append({
            'vendor_id': vendor_id,
            'created': created,
            'receivable_id': receivable.receivable_id,
            'goods_amount': str(receivable.goods_amount),
            'shipping_amount': str(receivable.shipping_amount),
            'adjustment_amount': str(receivable.adjustment_amount),
            'amount_due': str(receivable.amount_due),
            'eligible_at': (
                receivable.eligible_at.isoformat()
                if receivable.eligible_at
                else None
            ),
            'status': receivable.status,
            'message': (
                '已建立平台應撥 Vendor 商品款'
                if created
                else '平台應撥 Vendor 商品款已存在並更新'
            ),
        })

    return results


# ==============================================================================
# 退貨退款收回分潤/廠商淨額
#
# 呼叫時機：ReturnRequest 的退款動作完成的當下（退貨審核 API，另外實作，
# 尚未包含在這次的修改範圍）。這支只負責「錢要怎麼收回」，不負責把
# return_request.status 改成 'refunded'——那是呼叫端的責任，順序上應該是
# 先呼叫這支確認錢收回成功，再把 ReturnRequest 狀態落定，避免狀態已經是
# refunded、但錢實際上沒收回成功的不一致。
# ==============================================================================

def reverse_earning_and_vendor_income_for_return(return_request):
    """退款完成後撤銷 KOC 待結算分潤與 VendorSettlementItem。

    目前既有 Vendor/Admin 實際退款端仍以整張訂單全額退款為主；此函式不再碰 VendorWallet。
    已經 paid 的 VendorSettlement 不直接改歷史金額，而列入 needs_manual_review，避免破壞已完成對帳。
    """
    order = return_request.order
    if not order:
        return {'success': False, 'message': '此退貨申請沒有關聯的訂單'}
    if return_request.refunded_amount is None:
        return {'success': False, 'message': 'refunded_amount 尚未填寫，無法執行退款帳務'}

    refunded_amount = Decimal(str(return_request.refunded_amount))
    total_amount = Decimal(str(order.total_amount))
    full_refund = refunded_amount == total_amount or return_request.order_item_id is None

    results = {
        'success': True,
        'refund_scope': 'full_order' if full_refund else 'partial_item',
        'earning_adjustment': None,
        'vendor_adjustments': [],
        'receivable_adjustments': [],
        'needs_manual_review': [],
    }

    earning = (Earnings.objects
               .select_related('kocmission__koc')
               .filter(order=order)
               .exclude(status='cancelled')
               .first())
    if earning and earning.kocmission and earning.kocmission.koc:
        wallet, _ = KocWallet.objects.get_or_create(koc=earning.kocmission.koc)
        if full_refund:
            delta = int(earning.amount)
        else:
            base = sum((Decimal(str(i.subtotal)) for i in OrderItem.objects.filter(order=order)), Decimal('0.00'))
            ratio = min(Decimal('1'), refunded_amount / base) if base > 0 else Decimal('0')
            delta = int((Decimal(str(earning.amount)) * ratio).quantize(Decimal('1'), rounding=ROUND_HALF_UP))

        if delta > 0:
            with transaction.atomic():
                wallet = KocWallet.objects.select_for_update().get(pk=wallet.pk)
                if earning.status == 'pending':
                    wallet.balance_frozen = max(0, wallet.balance_frozen - delta)
                elif earning.status == 'withdrawable':
                    wallet.balance_available = max(0, wallet.balance_available - delta)
                wallet.save(update_fields=['balance_frozen', 'balance_available', 'updated_at'])
                Transactions.objects.create(
                    koc_wallet=wallet,
                    type='return_deduction',
                    amount=-delta,
                    reference_type='return_request',
                    reference_id=str(return_request.return_id),
                )
                if full_refund or delta >= earning.amount:
                    earning.status = 'cancelled'
                    earning.cancelled_by_return_request = return_request
                    earning.save(update_fields=['status', 'cancelled_by_return_request'])
                else:
                    earning.amount = max(0, earning.amount - delta)
                    earning.save(update_fields=['amount'])
            results['earning_adjustment'] = {'earnings_id': earning.earnings_id, 'deducted': delta, 'status': earning.status}

    qs = VendorSettlementItem.objects.select_related('settlement', 'vendor').filter(order=order)
    if return_request.order_item_id:
        vendor_id = return_request.order_item.product.vendor_id
        qs = qs.filter(vendor_id=vendor_id)

    for item in qs:
        if item.settlement_id and item.settlement.status == 'paid':
            results['needs_manual_review'].append({
                'vendor_id': item.vendor_id,
                'settlement_id': item.settlement_id,
                'reason': '此結算單已付款，請於下一期建立退款調整，不直接改寫已付款結算單',
            })
            continue

        if full_refund:
            new_sales = Decimal('0.00')
        else:
            new_sales = max(Decimal('0.00'), item.sales_amount - refunded_amount)
        new_fee = (new_sales * Decimal(str(VENDOR_SETTLEMENT_RATE_PERCENT)) / Decimal('100')).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
        new_koc = Decimal(str(earning.amount if earning and earning.status != 'cancelled' else 0))
        new_platform = max(Decimal('0.00'), new_fee - new_koc)
        item.sales_amount = new_sales
        item.settlement_amount = new_fee
        item.koc_amount = new_koc
        item.platform_amount = new_platform
        item.status = 'refunded' if new_sales == 0 else 'adjusted'
        item.save(update_fields=['sales_amount','settlement_amount','koc_amount','platform_amount','status','updated_at'])
        results['vendor_adjustments'].append({
            'vendor_id': item.vendor_id,
            'settlement_item_id': item.settlement_item_id,
            'sales_amount': str(new_sales),
            'settlement_amount': str(new_fee),
            'status': item.status,
        })

    # 同步調整「平台應撥 Vendor 的商品款」。
    receivables = VendorReceivable.objects.filter(order=order).select_related('vendor')
    if return_request.order_item_id:
        receivables = receivables.filter(
            vendor_id=return_request.order_item.product.vendor_id
        )

    for receivable in receivables:
        confirmed_paid = Decimal(str(receivable.amount_paid))

        if confirmed_paid > 0:
            # 已經實際撥款的歷史不直接改寫；後續要做追回/下期扣抵。
            results['needs_manual_review'].append({
                'vendor_id': receivable.vendor_id,
                'receivable_id': receivable.receivable_id,
                'reason': (
                    '此商品款已全部或部分撥給廠商，退款需建立追回或下期扣抵，'
                    '不可直接改寫已確認的撥款紀錄'
                ),
            })
            continue

        if full_refund:
            new_goods_amount = Decimal('0.00')
        else:
            # 部分退款目前 refund_amount 已是這次核准退款金額。
            new_goods_amount = max(
                Decimal('0.00'),
                Decimal(str(receivable.goods_amount)) - refunded_amount
            )

        receivable.goods_amount = new_goods_amount
        receivable.amount_due = max(
            Decimal('0.00'),
            new_goods_amount
            + Decimal(str(receivable.shipping_amount or 0))
            + Decimal(str(receivable.adjustment_amount or 0))
        )
        receivable.status = (
            'refunded'
            if receivable.amount_due == 0
            else 'adjusted'
        )
        receivable.save(update_fields=[
            'goods_amount',
            'amount_due',
            'status',
            'updated_at',
        ])

        results['receivable_adjustments'].append({
            'vendor_id': receivable.vendor_id,
            'receivable_id': receivable.receivable_id,
            'goods_amount': str(receivable.goods_amount),
            'amount_due': str(receivable.amount_due),
            'status': receivable.status,
        })

    if full_refund:
        order.payment_status = 'refunded'
        order.save(update_fields=['payment_status'])
    return results



# ==============================================================================
# 廠商結算：出貨完成滿 N 天鑑賞期後，把廠商凍結餘額轉成可提領餘額
# POST /platform_admin/vendor/settle-earnings
#
# 用途：出貨後鑑賞期過了，才能把「已入帳但還在凍結」的款項轉為可提領。
# 這支由排程（cron / celery beat）定期呼叫，會自動把「已經過鑑賞期」的
# 全部廠商一起結算；也可以在後台放一顆手動按鈕呼叫（帶 vendor_id 只結算
# 單一廠商）。鑑賞期天數定義在 constants.py 的 VENDOR_SETTLEMENT_HOLD_DAYS。
#
# 權限：跟 admin_run_monthly_vendor_payouts 一樣是雙軌——帶 Admin_id 走
# 原本的角色檢查（後台手動按鈕用），沒帶就比對 X-Cron-Token 這個 header
# 是否等於 settings.VENDOR_PAYOUT_CRON_TOKEN（這個 token 是共用的，不是
# 只給撥款用，任何排程觸發的財務批次工作都比對同一個值）。
# ==============================================================================


def _previous_calendar_month():
    """回傳上個曆月的第一天與最後一天。"""
    today = timezone.localdate()
    this_month_start = today.replace(day=1)
    previous_month_end = this_month_start - timedelta(days=1)
    previous_month_start = previous_month_end.replace(day=1)
    return previous_month_start, previous_month_end


def _month_bounds(month_value=None):
    """
    將 YYYY-MM 轉成該月第一天、最後一天。

    若未帶 month，預設使用上個曆月。
    例如 2026-10-01 執行時，預設結算 2026-09。
    """
    if not month_value:
        return _previous_calendar_month()

    try:
        year_text, month_text = str(month_value).strip().split('-', 1)
        year = int(year_text)
        month = int(month_text)

        if month < 1 or month > 12:
            raise ValueError

        period_start = date(year, month, 1)

        if month == 12:
            next_month_start = date(year + 1, 1, 1)
        else:
            next_month_start = date(year, month + 1, 1)

        period_end = next_month_start - timedelta(days=1)
        return period_start, period_end
    except Exception:
        raise ValueError('month 格式必須為 YYYY-MM，例如 2026-09')


def _next_month_start(period_end):
    return period_end + timedelta(days=1)


def _month_datetime_bounds(period_start, period_end):
    """
    eligible_at 是 DateTimeField，所以月結篩選使用：
        >= 本月第一天 00:00
        <  下月第一天 00:00
    """
    tz = timezone.get_current_timezone()
    start_dt = timezone.make_aware(
        timezone.datetime.combine(period_start, timezone.datetime.min.time()),
        tz
    )
    next_month = period_end + timedelta(days=1)
    end_dt = timezone.make_aware(
        timezone.datetime.combine(next_month, timezone.datetime.min.time()),
        tz
    )
    return start_dt, end_dt


def _sync_monthly_finance_eligibility():
    """
    將已過退貨風險期、無退款／未結退貨的貨款與服務費明細同步成 eligible。

    只做資格同步，不建立月結單。
    """
    now = timezone.now()

    receivables = (
        VendorReceivable.objects
        .select_related('order')
        .filter(
            payout_batch__isnull=True,
            status__in=['pending', 'eligible']
        )
    )

    for receivable in receivables:
        if (
            receivable.eligible_at
            and receivable.eligible_at <= now
            and receivable.order.payment_status != 'refunded'
            and not has_unresolved_return_request(receivable.order)
        ):
            if receivable.status != 'eligible':
                receivable.status = 'eligible'
                receivable.save(update_fields=['status', 'updated_at'])

    settlement_items = (
        VendorSettlementItem.objects
        .select_related('order')
        .filter(
            settlement__isnull=True,
            status__in=['pending', 'eligible']
        )
    )

    for item in settlement_items:
        if (
            item.eligible_at
            and item.eligible_at <= now
            and item.order.payment_status != 'refunded'
            and not has_unresolved_return_request(item.order)
        ):
            if item.status != 'eligible':
                item.status = 'eligible'
                item.save(update_fields=['status', 'updated_at'])


def _next_supplemental_sequence(model_cls, vendor, period_start, period_end, type_field):
    filter_kwargs = {
        'vendor': vendor,
        'period_start': period_start,
        'period_end': period_end,
        type_field: 'supplemental',
    }

    latest = (
        model_cls.objects
        .filter(**filter_kwargs)
        .order_by('-sequence')
        .first()
    )

    return (latest.sequence + 1) if latest else 1


@api_view(['POST'])
@permission_classes([AllowAny])
def admin_settle_vendor_earnings(request):
    """
    產生 Vendor 的「月結服務費結算單」。

    - 預設結算上個曆月。
    - 可傳 month='YYYY-MM' 手動指定月份。
    - 月份歸屬以 VendorSettlementItem.eligible_at 為準。
    - 只納入該月份已 eligible、尚未被其他 settlement 納入的明細。
    """
    admin_obj = None

    if request.data.get('Admin_id'):
        admin_obj, err = require_admin_role(
            request,
            FINANCE_ADMIN_ROLES,
            source='data'
        )
        if err:
            return err
    else:
        cron_token = request.headers.get('X-Cron-Token')
        expected_token = getattr(
            settings,
            'VENDOR_PAYOUT_CRON_TOKEN',
            None
        )

        if not expected_token or cron_token != expected_token:
            return Response({
                'success': False,
                'err': '未授權：需要有效的 Admin_id 或 X-Cron-Token'
            }, status=status.HTTP_403_FORBIDDEN)

    target_vendor_id = request.data.get('vendor_id')
    month_value = request.data.get('month')

    try:
        period_start, period_end = _month_bounds(month_value)
    except ValueError as exc:
        return Response({
            'success': False,
            'err': str(exc)
        }, status=status.HTTP_400_BAD_REQUEST)

    _sync_monthly_finance_eligibility()

    start_dt, end_dt = _month_datetime_bounds(
        period_start,
        period_end
    )

    qs = (
        VendorSettlementItem.objects
        .select_related('vendor', 'order')
        .filter(
            settlement__isnull=True,
            status='eligible',
            eligible_at__gte=start_dt,
            eligible_at__lt=end_dt,
        )
        .order_by('vendor_id', 'eligible_at')
    )

    if target_vendor_id:
        qs = qs.filter(vendor_id=target_vendor_id)

    by_vendor = {}

    for item in qs:
        if (
            item.order.payment_status == 'refunded'
            or has_unresolved_return_request(item.order)
        ):
            continue

        by_vendor.setdefault(
            item.vendor_id,
            []
        ).append(item)

    created_settlements = []

    for vendor_id, items in by_vendor.items():
        vendor = items[0].vendor

        regular_settlement = VendorSettlement.objects.filter(
            vendor=vendor,
            period_start=period_start,
            period_end=period_end,
            settlement_type='regular',
            sequence=1,
        ).first()

        if regular_settlement:
            settlement_type = 'supplemental'
            sequence = _next_supplemental_sequence(
                VendorSettlement,
                vendor,
                period_start,
                period_end,
                'settlement_type',
            )
        else:
            settlement_type = 'regular'
            sequence = 1

        gross = sum(
            (item.sales_amount for item in items),
            Decimal('0.00')
        )

        fee = sum(
            (item.settlement_amount for item in items),
            Decimal('0.00')
        )

        koc = sum(
            (item.koc_amount for item in items),
            Decimal('0.00')
        )

        platform_amount = max(
            Decimal('0.00'),
            fee - koc
        )

        # 月結於次月產生，服務費給 Vendor 7 天付款：
        # 例如 9 月結算 -> 10/1 產生 -> 10/8 到期。
        due_date = _next_month_start(period_end) + timedelta(days=7)

        with transaction.atomic():
            settlement = VendorSettlement.objects.create(
                vendor=vendor,
                period_start=period_start,
                period_end=period_end,
                settlement_type=settlement_type,
                sequence=sequence,
                gross_sales=gross,
                adjustment_amount=Decimal('0.00'),
                settlement_rate=Decimal(
                    str(VENDOR_SETTLEMENT_RATE_PERCENT)
                ),
                amount_due=fee,
                koc_amount=koc,
                platform_amount=platform_amount,
                status='awaiting_payment',
                due_date=due_date,
            )

            VendorSettlementItem.objects.filter(
                pk__in=[item.pk for item in items]
            ).update(
                settlement=settlement,
                status='included'
            )

        created_settlements.append({
            'settlement_id': settlement.settlement_id,
            'vendor_id': vendor_id,
            'vendor_name': vendor.company_name,
            'settlement_type': settlement.settlement_type,
            'sequence': settlement.sequence,
            'display_label': (
                '正式月結'
                if settlement.settlement_type == 'regular'
                else f'補結算 #{settlement.sequence}'
            ),
            'item_count': len(items),
            'gross_sales': str(gross),
            'amount_due': str(fee),
            'koc_amount': str(koc),
            'platform_amount': str(platform_amount),
            'due_date': due_date,
            'status': settlement.status,
            'already_existed': False,
        })

        if admin_obj:
            AdminAuditLogs.objects.create(
                admin_id=admin_obj,
                action_type='generate_vendor_monthly_settlement',
                vendor=vendor,
                tasks_id=str(settlement.settlement_id),
                action_reason=(
                    f'建立 {period_start:%Y-%m} 月 Vendor 服務費結算單 '
                    f'#{settlement.settlement_id}，'
                    f'有效成交額 NT$ {gross}，'
                    f'應繳平台服務費 NT$ {fee}'
                ),
            )

    return Response({
        'success': True,
        'err': '',
        'month': period_start.strftime('%Y-%m'),
        'period_start': period_start,
        'period_end': period_end,
        'settled_count': sum(
            item['item_count']
            for item in created_settlements
            if not item.get('already_existed')
        ),
        'total_amount': str(sum(
            (
                Decimal(item['amount_due'])
                for item in created_settlements
                if not item.get('already_existed')
            ),
            Decimal('0.00')
        )),
        'settlements': created_settlements,
        'settled': created_settlements,
    }, status=status.HTTP_200_OK)


# 新名稱，下一步 urls.py 會改用它
admin_generate_vendor_settlement = admin_settle_vendor_earnings



# ==============================================================================
# 待結算廠商列表：後台用，列出「有凍結餘額、且已經過了鑑賞期」的廠商，
# 給後台一個總覽 + 一顆手動結算按鈕（比照 admin_list_settleable_campaigns 的設計）
# GET /platform/vendors/settleable
# ==============================================================================

@api_view(['GET'])
@permission_classes([AllowAny])
def admin_list_vendor_invoices(request):
    _admin_obj, err = require_admin_role(request, FINANCE_ADMIN_ROLES, source='query')
    if err:
        return err
    vendor_id = request.query_params.get('vendor_id')
    status_filter = request.query_params.get('status')

    qs = VendorInvoice.objects.select_related('vendor', 'settlement').order_by('-created_at')
    if vendor_id:
        qs = qs.filter(vendor_id=vendor_id)
    if status_filter:
        qs = qs.filter(status=status_filter)

    result = [{
        'invoice_id': inv.invoice_id,
        'settlement_id': inv.settlement_id,
        'vendor_id': inv.vendor_id,
        'vendor_name': inv.vendor.company_name if inv.vendor else None,
        'relate_number': inv.relate_number,
        'settlement_amount': str(inv.settlement_amount),
        'service_fee': str(inv.service_fee),
        'platform_service_fee': str(inv.platform_service_fee) if inv.platform_service_fee is not None else None,
        'koc_commission_display': str(inv.koc_commission_display) if inv.koc_commission_display is not None else None,
        'tax_amount': str(inv.tax_amount),
        'total_amount': str(inv.total_amount),
        'status': inv.status,
        'invoice_number': inv.invoice_number,
        'error_message': inv.error_message,
        'created_at': inv.created_at,
    } for inv in qs[:200]]
    return Response({'success': True, 'err': '', 'invoices': result}, status=status.HTTP_200_OK)


def _finalize_vendor_settlement_status(locked_settlement):
    """
    結算單收到一筆已確認付款後，重新計算 status（部分/全額繳清），全額繳清
    的話一併釋放對應訂單的 KOC 分潤（pending -> withdrawable）。呼叫端要自己
    在 transaction.atomic() 裡先 select_for_update 鎖住這張 settlement 再呼叫，
    這支本身不開交易。
    """
    confirmed_total = VendorSettlementPayment.objects.filter(
        settlement=locked_settlement, status='confirmed'
    ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')

    if confirmed_total >= locked_settlement.amount_due:
        locked_settlement.status = 'paid'
        locked_settlement.paid_at = timezone.now()
    else:
        locked_settlement.status = 'partially_paid'
    locked_settlement.save(update_fields=['status', 'paid_at', 'updated_at'])

    released = []
    if locked_settlement.status == 'paid':
        order_ids = list(locked_settlement.items.values_list('order_id', flat=True))
        earnings = Earnings.objects.select_related('kocmission__koc').filter(
            order_id__in=order_ids,
            status=EARNINGS_STATUS_CHOICES_MAP['pending'],
            kocmission__application__campaign__vendor=locked_settlement.vendor,
        )
        for earning in earnings:
            wallet, _ = KocWallet.objects.select_for_update().get_or_create(koc=earning.kocmission.koc)
            amount_to_release = earning.amount
            wallet.balance_frozen = max(0, wallet.balance_frozen - amount_to_release)
            wallet.balance_available += amount_to_release
            wallet.save(update_fields=['balance_frozen', 'balance_available', 'updated_at'])
            earning.status = EARNINGS_STATUS_CHOICES_MAP['withdrawable']
            earning.save(update_fields=['status'])
            Transactions.objects.create(
                koc_wallet=wallet, type='settlement_release', amount=amount_to_release,
                reference_type='vendor_settlement', reference_id=str(locked_settlement.settlement_id)
            )
            released.append({'earnings_id': earning.earnings_id, 'amount': amount_to_release, 'user_id': earning.user_id})

    return released


def _issue_vendor_settlement_invoice(settlement):
    """
    廠商結算單全額繳清後，建立（或重用既有）VendorInvoice 並呼叫綠界 B2B
    電子發票 API 開立。同一張結算單只會真的開票一次——已經 issued 的話直接
    回傳既有紀錄，不會重複呼叫綠界。
    """
    from api.models import VendorInvoice

    existing = VendorInvoice.objects.filter(settlement=settlement, status='issued').first()
    if existing:
        return {
            'invoice_id': existing.invoice_id, 'status': existing.status,
            'invoice_number': existing.invoice_number, 'error_message': existing.error_message,
        }

    vendor_obj = settlement.vendor
    if not vendor_obj.tax_id:
        return {'invoice_id': None, 'status': 'failed', 'invoice_number': None, 'error_message': '廠商無統一編號，無法開立發票'}

    service_fee = Decimal(str(settlement.amount_due or 0))
    tax_amount = (service_fee * Decimal('0.05')).quantize(Decimal('1'), rounding=ROUND_HALF_UP)
    grand_total = service_fee + tax_amount

    invoice, _ = VendorInvoice.objects.get_or_create(
        settlement=settlement,
        defaults={
            'vendor': vendor_obj,
            'relate_number': f"INV{int(timezone.now().timestamp())}{settlement.vendor_id}"[:20],
            'settlement_amount': Decimal(str(settlement.gross_sales or 0)),
            'service_fee': service_fee,
            'platform_service_fee': Decimal(str(settlement.platform_amount or 0)),
            'koc_commission_display': Decimal(str(settlement.koc_amount or 0)),
            'tax_amount': tax_amount,
            'total_amount': grand_total,
            'status': 'pending',
        },
    )

    from api.ecpay_invoice import issue_b2b_invoice

    issue_success, invoice_number, issue_message = issue_b2b_invoice(
        relate_number=invoice.relate_number,
        buyer_tax_id=vendor_obj.tax_id,
        item_name='平台服務費',
        sales_amount=int(invoice.service_fee),
        tax_amount=int(invoice.tax_amount),
    )

    if issue_success:
        invoice.status = 'issued'
        invoice.invoice_number = invoice_number
        invoice.error_message = None
    else:
        invoice.status = 'failed'
        invoice.error_message = issue_message
    invoice.save(update_fields=['status', 'invoice_number', 'error_message'])

    return {
        'invoice_id': invoice.invoice_id, 'status': invoice.status,
        'invoice_number': invoice.invoice_number, 'error_message': invoice.error_message,
    }


# ==============================================================================
# 後台確認廠商「服務費」匯款回報：廠商在服務費月結明細回報匯款後，這裡
# 「確認收到」才真的更新結算單狀態、釋放對應的 KOC 分潤，全額繳清時順便
# 呼叫綠界 B2B 電子發票 API 開立；「退回」則讓廠商可以重新回報。
# POST /platform/vendor/settlement/payment/confirm
# ==============================================================================

@api_view(['POST'])
@permission_classes([AllowAny])
def admin_confirm_vendor_settlement_remittance(request):
    admin_obj, err = require_admin_role(request, FINANCE_ADMIN_ROLES, source='data')
    if err:
        return err

    from api.notifications import create_notification

    payment_id = request.data.get('payment_id')
    action = request.data.get('action')  # 'confirm' 或 'reject'
    action_reason = request.data.get('Action_reason')

    if action not in ('confirm', 'reject'):
        return Response({'success': False, 'err': "action 必須是 'confirm' 或 'reject'"}, status=status.HTTP_400_BAD_REQUEST)

    try:
        payment = VendorSettlementPayment.objects.select_related('settlement__vendor').get(payment_id=payment_id)
    except VendorSettlementPayment.DoesNotExist:
        return Response({'success': False, 'err': '找不到這筆匯款回報'}, status=status.HTTP_404_NOT_FOUND)

    if payment.status != 'pending':
        return Response({'success': False, 'err': f'這筆匯款回報已經是「{payment.get_status_display()}」狀態，不能重複處理'}, status=status.HTTP_400_BAD_REQUEST)

    settlement = payment.settlement
    vendor_obj = settlement.vendor

    if action == 'reject':
        with transaction.atomic():
            payment.status = 'rejected'
            payment.note = action_reason or '匯款資訊有誤，請重新回報'
            payment.save(update_fields=['status', 'note'])

            AdminAuditLogs.objects.create(
                admin_id=admin_obj,
                action_type='reject_vendor_settlement_payment',
                tasks_id=str(settlement.settlement_id), vendor=vendor_obj,
                action_reason=action_reason or f'退回廠商結算單 #{settlement.settlement_id} 的匯款回報',
            )

        try:
            create_notification(
                vendor=vendor_obj, category='payout', title='服務費匯款回報已被退回',
                body=f'您回報的匯款資訊未通過確認：{payment.note}，請重新回報。',
                reference_type='vendor_finance', reference_id=str(settlement.settlement_id),
            )
        except Exception as e:
            logger.error(f'服務費匯款退回通知寄送失敗（payment_id={payment.payment_id}）: {e}')

        return Response({'success': True, 'err': '', 'payment_id': payment.payment_id, 'status': payment.status}, status=status.HTTP_200_OK)

    with transaction.atomic():
        locked = VendorSettlement.objects.select_for_update().get(pk=settlement.pk)
        payment.status = 'confirmed'
        payment.confirmed_by = admin_obj
        payment.confirmed_at = timezone.now()
        payment.save(update_fields=['status', 'confirmed_by', 'confirmed_at'])

        released = _finalize_vendor_settlement_status(locked)

        AdminAuditLogs.objects.create(
            admin_id=admin_obj,
            action_type='confirm_vendor_settlement_payment',
            tasks_id=str(locked.settlement_id), vendor=vendor_obj,
            action_reason=action_reason or f'確認收到廠商結算單 #{locked.settlement_id} 的服務費匯款 NT$ {payment.amount}',
        )

    invoice_payload = None
    if locked.status == 'paid':
        invoice_payload = _issue_vendor_settlement_invoice(locked)

    try:
        if invoice_payload and invoice_payload['status'] == 'issued':
            create_notification(
                vendor=vendor_obj, category='payout', title='服務費發票已開立',
                body=f'平台已確認收到匯款並開立服務費發票（發票號碼：{invoice_payload["invoice_number"]}）。',
                reference_type='vendor_finance', reference_id=str(locked.settlement_id),
            )
        elif invoice_payload and invoice_payload['status'] == 'failed':
            create_notification(
                vendor=vendor_obj, category='payout', title='服務費發票開立失敗',
                body=f'平台已確認收到匯款，但開立發票時發生錯誤：{invoice_payload["error_message"]}，將由平台人員協助處理。',
                reference_type='vendor_finance', reference_id=str(locked.settlement_id),
            )
        else:
            create_notification(
                vendor=vendor_obj, category='payout', title='服務費匯款已確認',
                body=f'平台已確認收到 NT$ {payment.amount} 服務費匯款。',
                reference_type='vendor_finance', reference_id=str(locked.settlement_id),
            )
    except Exception as e:
        logger.error(f'服務費匯款確認通知寄送失敗（payment_id={payment.payment_id}）: {e}')

    return Response({
        'success': True, 'err': '', 'payment_id': payment.payment_id,
        'settlement_id': locked.settlement_id, 'settlement_status': locked.status,
        'released_earnings': released, 'invoice': invoice_payload,
    }, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([AllowAny])
def admin_list_settleable_vendors(request):
    """
    列出指定月份可產生 15% 服務費月結單的 Vendor。

    GET:
        /platform/vendors/settleable?Admin_id=1&month=2026-09

    month 未帶時預設上個曆月。
    """
    _admin_obj, err = require_admin_role(
        request,
        FINANCE_ADMIN_ROLES,
        source='query'
    )
    if err:
        return err

    try:
        period_start, period_end = _month_bounds(
            request.query_params.get('month')
        )
    except ValueError as exc:
        return Response({
            'success': False,
            'err': str(exc)
        }, status=status.HTTP_400_BAD_REQUEST)

    _sync_monthly_finance_eligibility()

    start_dt, end_dt = _month_datetime_bounds(
        period_start,
        period_end
    )

    items = (
        VendorSettlementItem.objects
        .select_related('vendor', 'order')
        .filter(
            settlement__isnull=True,
            status='eligible',
            eligible_at__gte=start_dt,
            eligible_at__lt=end_dt,
        )
        .order_by('vendor_id', 'eligible_at')
    )

    by_vendor = {}

    for item in items:
        if (
            item.order.payment_status == 'refunded'
            or has_unresolved_return_request(item.order)
        ):
            continue

        entry = by_vendor.setdefault(
            item.vendor_id,
            {
                'Vendor_id': item.vendor_id,
                'Vendor_name': item.vendor.company_name,
                'Eligible_count': 0,
                'Eligible_amount': Decimal('0.00'),
                'Eligible_sales': Decimal('0.00'),
            }
        )

        entry['Eligible_count'] += 1
        entry['Eligible_amount'] += item.settlement_amount
        entry['Eligible_sales'] += item.sales_amount

    result = []

    for entry in by_vendor.values():
        entry['Month'] = period_start.strftime('%Y-%m')
        entry['Period_start'] = period_start
        entry['Period_end'] = period_end
        entry['Eligible_amount'] = float(
            entry['Eligible_amount']
        )
        entry['Eligible_sales'] = float(
            entry['Eligible_sales']
        )
        result.append(entry)

    result.sort(
        key=lambda row: row['Eligible_amount'],
        reverse=True
    )

    return Response(
        result,
        status=status.HTTP_200_OK
    )



# ==============================================================================
# 廠商撥款申請：後台處理
# GET  /platform/vendor/payouts             列出待處理的撥款申請
# POST /platform/vendor/payout/confirm       把撥款申請標記為完成或失敗
# ==============================================================================

@api_view(['GET'])
@permission_classes([AllowAny])
def admin_list_vendor_payouts(request):
    """相容舊 URL；現在列的是 Vendor 應繳結算單，不是平台撥給 Vendor 的款項。"""
    _admin_obj, err = require_admin_role(request, FINANCE_ADMIN_ROLES, source='query')
    if err:
        return err
    requested_status = request.query_params.get('status')
    qs = VendorSettlement.objects.select_related('vendor').prefetch_related('payments', 'invoices').order_by('-created_at')
    if requested_status:
        status_map={'pending':'awaiting_payment','completed':'paid'}
        qs=qs.filter(status=status_map.get(requested_status, requested_status))
    result=[]
    for s in qs[:300]:
        paid = s.amount_paid

        # 最新一筆廠商匯款回報（依 payment_id 由大到小，不依賴沒有設
        # Meta.ordering 的預設順序），給後台判斷目前有沒有待審核的回報。
        payments_sorted = sorted(s.payments.all(), key=lambda p: p.payment_id, reverse=True)
        latest_payment = payments_sorted[0] if payments_sorted else None
        latest_payment_payload = None
        if latest_payment:
            latest_payment_payload = {
                'payment_id': latest_payment.payment_id,
                'amount': float(latest_payment.amount or 0),
                'reference_no': latest_payment.reference_no,
                'status': latest_payment.status,
                'paid_at': latest_payment.paid_at,
                'note': latest_payment.note,
            }

        invoice_obj = next(iter(s.invoices.all()), None)
        invoice_payload = None
        if invoice_obj:
            invoice_payload = {
                'invoice_id': invoice_obj.invoice_id,
                'status': invoice_obj.status,
                'invoice_number': invoice_obj.invoice_number,
                'error_message': invoice_obj.error_message,
            }

        result.append({
            'Settlement_id': s.settlement_id,
            'Payout_id': s.settlement_id,
            'Vendor_id': s.vendor_id,
            'Vendor_name': s.vendor.company_name,
            'Settlement_type': s.settlement_type,
            'Sequence': s.sequence,
            'Display_label': (
                '正式月結'
                if s.settlement_type == 'regular'
                else f'補結算 #{s.sequence}'
            ),
            'Gross_sales': float(s.gross_sales),
            'Amount_due': float(s.amount_due),
            'Amount_paid': float(paid),
            'Outstanding_amount': float(s.outstanding_amount),
            'Koc_amount': float(s.koc_amount),
            'Platform_amount': float(s.platform_amount),
            'Due_date': s.due_date,
            'Status': s.status,
            'Created_at': s.created_at,
            'latest_payment': latest_payment_payload,
            'invoice': invoice_payload,
        })
    return Response(result, status=status.HTTP_200_OK)

admin_list_vendor_settlements = admin_list_vendor_payouts



# ==============================================================================
# 匯出轉帳資訊：結算完之後，財務要實際去銀行系統把錢匯出去，這支把「目前所有
# 還沒處理的撥款申請」匯出成 CSV，包含銀行帳戶資訊跟金額，財務可以直接拿去
# 對照銀行的批次匯款作業。
#
# 廠商跟 KOC 分開匯出（各自的銀行欄位結構本來就不完全一樣：廠商有獨立的
# bank_account_name「戶名」欄位，KOC 沒有；財務實際作業上兩邊送的銀行批次
# 範本也大概率不同），用 type 參數區分，各自產生獨立檔案，不會混在同一份。
#
# 注意：這支只是「匯出」，不會改變任何撥款申請的狀態。匯款實際做完之後，
# 還是要回來個別按「標記完成」（廠商走 admin_confirm_vendor_payout；
# KOC 目前沒有對應的後台確認端點，是舊的既有缺口，這次沒有一併補）。
#
# GET /platform/payouts/export?type=vendor|koc&status=pending
# （status 預設 pending，也可以帶其他狀態匯出歷史紀錄；type 為必填）
# ==============================================================================

@api_view(['GET'])
@permission_classes([AllowAny])
def admin_export_payout_transfers(request):
    """此舊匯出端點目前只處理 KOC；Vendor 貨款改由月結批次處理。"""
    _admin_obj, err = require_admin_role(request, FINANCE_ADMIN_ROLES, source='query')
    if err:
        return err
    export_type = request.query_params.get('type')
    export_status = request.query_params.get('status', 'pending')
    if export_type != 'koc':
        return Response({'success': False, 'err': "Vendor 貨款已改為月結批次，不再使用舊 VendorPayouts 匯出；type 請使用 'koc'"}, status=status.HTTP_400_BAD_REQUEST)
    fieldnames = ['撥款單號','KOC用戶ID','KOC名稱','銀行代碼','銀行帳號','戶名','金額','申請日期']
    rows=[]
    payouts=(Payouts.objects.select_related('koc__koc_profile').filter(status=export_status).order_by('payout_date'))
    for p in payouts:
        user=p.koc; kp=getattr(user,'koc_profile',None)
        rows.append({'撥款單號':p.payout_id,'KOC用戶ID':user.user_id,'KOC名稱':user.display_name or user.name,
                     '銀行代碼':(kp.bank_number if kp else '') or '','銀行帳號':(kp.bank_account if kp else '') or '',
                     '戶名':user.name or '','金額':p.amount,'申請日期':p.payout_date})
    output=io.StringIO(); writer=csv.DictWriter(output,fieldnames=fieldnames); writer.writeheader(); writer.writerows(rows)
    response=HttpResponse('\ufeff'+output.getvalue(),content_type='text/csv; charset=utf-8')
    response['Content-Disposition']=f'attachment; filename="payout_transfers_koc_{timezone.localdate()}.csv"'
    return response



@api_view(['POST'])
@permission_classes([AllowAny])
def admin_confirm_vendor_payout(request):
    """相容舊名稱：確認 Vendor 結算款是否已入帳；成功後釋放相關 KOC 分潤。"""
    admin_obj, err = require_admin_role(request, FINANCE_ADMIN_ROLES, source='data')
    if err:
        return err
    settlement_id = request.data.get('settlement_id') or request.data.get('payout_id')
    new_status = request.data.get('status', 'completed')
    if not settlement_id:
        return Response({'success': False, 'err': 'settlement_id is required'}, status=status.HTTP_400_BAD_REQUEST)
    try:
        settlement = VendorSettlement.objects.select_related('vendor').get(settlement_id=settlement_id)
    except VendorSettlement.DoesNotExist:
        return Response({'success': False, 'err': '找不到此廠商結算單'}, status=status.HTTP_404_NOT_FOUND)
    if settlement.status == 'paid':
        return Response({'success': False, 'err': '此結算單已完成付款確認'}, status=status.HTTP_400_BAD_REQUEST)

    amount = Decimal(str(request.data.get('amount') or settlement.outstanding_amount))
    reference_no = request.data.get('reference_no') or request.data.get('Reference_no')
    action_reason = request.data.get('Action_reason')
    if amount <= 0:
        return Response({'success': False, 'err': '付款金額必須大於 0'}, status=status.HTTP_400_BAD_REQUEST)

    with transaction.atomic():
        locked = VendorSettlement.objects.select_for_update().get(pk=settlement.pk)
        payment_status = 'confirmed' if new_status in ('completed','confirmed','paid') else 'failed'
        payment = VendorSettlementPayment.objects.create(
            settlement=locked, amount=amount, payment_method=request.data.get('payment_method','bank_transfer'),
            reference_no=reference_no, status=payment_status, paid_at=timezone.now(),
            confirmed_by=admin_obj if payment_status=='confirmed' else None,
            confirmed_at=timezone.now() if payment_status=='confirmed' else None,
            note=action_reason,
        )
        released = []
        if payment_status == 'confirmed':
            released = _finalize_vendor_settlement_status(locked)
        else:
            locked.save(update_fields=['updated_at'])

        AdminAuditLogs.objects.create(
            admin_id=admin_obj,
            action_type='confirm_vendor_settlement_paid' if payment_status=='confirmed' else 'confirm_vendor_settlement_failed',
            vendor=locked.vendor,
            tasks_id=str(locked.settlement_id),
            action_reason=action_reason or f'廠商結算單 #{locked.settlement_id} 收款 NT$ {amount}，狀態 {locked.status}',
        )

    invoice_payload = None
    if locked.status == 'paid':
        invoice_payload = _issue_vendor_settlement_invoice(locked)

    return Response({'success':True,'err':'','settlement_id':locked.settlement_id,'payment_id':payment.payment_id,'status':locked.status,'released_earnings':released,'invoice':invoice_payload},status=status.HTTP_200_OK)

admin_confirm_vendor_settlement_payment = admin_confirm_vendor_payout



# ==============================================================================
# Vendor 貨款月結：ShareBuy → Vendor
#
# VendorReceivable：
#   每張訂單、每個 Vendor 的貨款明細。
#
# VendorPayoutBatch：
#   依 eligible_at 所屬月份彙整成一張 Vendor 貨款月結單。
#
# 月結月份以「取得結算資格的月份」為準，不是 Order 建立月份。
# 兩筆金流仍完全獨立：
#   ShareBuy → Vendor：VendorPayoutBatch
#   Vendor → ShareBuy：VendorSettlement
# ==============================================================================


def _sync_vendor_receivable_status(receivable):
    """
    同步 VendorReceivable 狀態。

    新月結制：
    - 尚未過退貨風險期：pending
    - 已符合資格、尚未進月結：eligible
    - 已加入 VendorPayoutBatch：included
    - 該月結已完成：paid

    舊 VendorReceivablePayout 僅保留相容既有資料。
    """
    if receivable.status in ('refunded', 'cancelled'):
        return receivable

    due = Decimal(
        str(receivable.amount_due or 0)
    )

    if due <= 0:
        receivable.status = 'refunded'
        receivable.paid_at = None

    elif receivable.payout_batch_id:
        batch = receivable.payout_batch

        if batch.status == 'paid':
            receivable.status = 'paid'
            receivable.paid_at = (
                batch.paid_at
                or receivable.paid_at
                or timezone.now()
            )
        else:
            receivable.status = 'included'
            receivable.paid_at = None

    else:
        # 相容 0052 之前／月結切換前已存在的單筆撥款紀錄。
        legacy_paid = (
            receivable.payouts
            .filter(status='confirmed')
            .aggregate(total=Sum('amount'))['total']
            or Decimal('0.00')
        )

        if legacy_paid >= due:
            receivable.status = 'paid'

            if not receivable.paid_at:
                receivable.paid_at = timezone.now()

        elif (
            receivable.eligible_at
            and receivable.eligible_at <= timezone.now()
            and receivable.order.payment_status != 'refunded'
            and not has_unresolved_return_request(receivable.order)
        ):
            receivable.status = 'eligible'
            receivable.paid_at = None

        else:
            receivable.status = 'pending'
            receivable.paid_at = None

    receivable.save(
        update_fields=[
            'status',
            'paid_at',
            'updated_at',
        ]
    )

    return receivable


@api_view(['GET'])
@permission_classes([AllowAny])
def admin_list_vendor_receivables(request):
    """
    保留逐訂單貨款明細查詢，供稽核／明細頁使用。

    新月結流程不再從此 API 對單筆 receivable 建立撥款。
    """
    _admin_obj, err = require_admin_role(
        request,
        FINANCE_ADMIN_ROLES,
        source='query'
    )
    if err:
        return err

    vendor_id = request.query_params.get(
        'vendor_id'
    )

    requested_status = request.query_params.get(
        'status'
    )

    qs = (
        VendorReceivable.objects
        .select_related(
            'vendor',
            'order',
            'payout_batch',
        )
        .prefetch_related('payouts')
        .order_by('-created_at')
    )

    if vendor_id:
        qs = qs.filter(
            vendor_id=vendor_id
        )

    rows = []

    for receivable in qs[:500]:
        _sync_vendor_receivable_status(
            receivable
        )

        if (
            requested_status
            and receivable.status != requested_status
        ):
            continue

        batch = receivable.payout_batch

        rows.append({
            'Receivable_id': receivable.receivable_id,
            'Vendor_id': receivable.vendor_id,
            'Vendor_name': receivable.vendor.company_name,
            'Order_id': str(receivable.order_id),

            'Goods_amount': float(
                receivable.goods_amount or 0
            ),

            'Shipping_amount': float(
                receivable.shipping_amount or 0
            ),

            'Adjustment_amount': float(
                receivable.adjustment_amount or 0
            ),

            'Amount_due': float(
                receivable.amount_due or 0
            ),

            'Amount_paid': float(
                receivable.amount_paid or 0
            ),

            'Outstanding_amount': float(
                receivable.outstanding_amount or 0
            ),

            'Eligible_at': receivable.eligible_at,
            'Paid_at': receivable.paid_at,
            'Status': receivable.status,

            'Payout_batch_id': (
                batch.batch_id
                if batch else None
            ),

            'Payout_batch_status': (
                batch.status
                if batch else None
            ),

            'Payout_month': (
                batch.period_start.strftime('%Y-%m')
                if batch else None
            ),

            'Created_at': receivable.created_at,
        })

    return Response({
        'success': True,
        'err': '',
        'receivables': rows,
    }, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([AllowAny])
def admin_list_monthly_payout_ready_vendors(request):
    """
    列出指定月份可產生「貨款月結單」的 Vendor。

    GET:
      /platform/vendor/payout-batches/ready
        ?Admin_id=1
        &month=2026-09
    """
    _admin_obj, err = require_admin_role(
        request,
        FINANCE_ADMIN_ROLES,
        source='query'
    )
    if err:
        return err

    try:
        period_start, period_end = _month_bounds(
            request.query_params.get('month')
        )
    except ValueError as exc:
        return Response({
            'success': False,
            'err': str(exc)
        }, status=status.HTTP_400_BAD_REQUEST)

    _sync_monthly_finance_eligibility()

    start_dt, end_dt = _month_datetime_bounds(
        period_start,
        period_end
    )

    qs = (
        VendorReceivable.objects
        .select_related('vendor', 'order')
        .filter(
            payout_batch__isnull=True,
            status='eligible',
            eligible_at__gte=start_dt,
            eligible_at__lt=end_dt,
        )
        .order_by('vendor_id', 'eligible_at')
    )

    by_vendor = {}

    for receivable in qs:
        if (
            receivable.order.payment_status == 'refunded'
            or has_unresolved_return_request(
                receivable.order
            )
        ):
            continue

        entry = by_vendor.setdefault(
            receivable.vendor_id,
            {
                'Vendor_id': receivable.vendor_id,
                'Vendor_name': receivable.vendor.company_name,
                'Receivable_count': 0,
                'Goods_amount': Decimal('0.00'),
                'Shipping_amount': Decimal('0.00'),
                'Adjustment_amount': Decimal('0.00'),
                'Amount_due': Decimal('0.00'),
                'Bank_code': receivable.vendor.bank_code or '',
                'Bank_account_last4': (
                    receivable.vendor.bank_account[-4:]
                    if receivable.vendor.bank_account
                    else ''
                ),
                'Bank_account_name': (
                    receivable.vendor.bank_account_name
                    or ''
                ),
                'Has_bank_account': bool(
                    receivable.vendor.bank_account
                ),
            }
        )

        entry['Receivable_count'] += 1
        entry['Goods_amount'] += (
            receivable.goods_amount
            or Decimal('0.00')
        )
        entry['Shipping_amount'] += (
            receivable.shipping_amount
            or Decimal('0.00')
        )
        entry['Adjustment_amount'] += (
            receivable.adjustment_amount
            or Decimal('0.00')
        )
        entry['Amount_due'] += (
            receivable.amount_due
            or Decimal('0.00')
        )

    result = []

    for entry in by_vendor.values():
        entry['Month'] = (
            period_start.strftime('%Y-%m')
        )
        entry['Period_start'] = period_start
        entry['Period_end'] = period_end

        for key in (
            'Goods_amount',
            'Shipping_amount',
            'Adjustment_amount',
            'Amount_due',
        ):
            entry[key] = float(entry[key])

        result.append(entry)

    result.sort(
        key=lambda row: row['Amount_due'],
        reverse=True
    )

    return Response({
        'success': True,
        'err': '',
        'month': period_start.strftime('%Y-%m'),
        'period_start': period_start,
        'period_end': period_end,
        'vendors': result,
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([AllowAny])
def admin_generate_vendor_payout_batch(request):
    """
    產生 ShareBuy → Vendor 的貨款月結單。

    POST body:
      {
        "Admin_id": 1,
        "vendor_id": "V00001",   # 可選；不帶則該月全部 Vendor
        "month": "2026-09"       # 可選；預設上個月
      }
    """
    admin_obj = None

    if request.data.get('Admin_id'):
        admin_obj, err = require_admin_role(
            request,
            FINANCE_ADMIN_ROLES,
            source='data'
        )
        if err:
            return err
    else:
        cron_token = request.headers.get(
            'X-Cron-Token'
        )

        expected_token = getattr(
            settings,
            'VENDOR_PAYOUT_CRON_TOKEN',
            None
        )

        if (
            not expected_token
            or cron_token != expected_token
        ):
            return Response({
                'success': False,
                'err': (
                    '未授權：需要有效的 '
                    'Admin_id 或 X-Cron-Token'
                )
            }, status=status.HTTP_403_FORBIDDEN)

    target_vendor_id = request.data.get(
        'vendor_id'
    )

    try:
        period_start, period_end = _month_bounds(
            request.data.get('month')
        )
    except ValueError as exc:
        return Response({
            'success': False,
            'err': str(exc)
        }, status=status.HTTP_400_BAD_REQUEST)

    _sync_monthly_finance_eligibility()

    start_dt, end_dt = _month_datetime_bounds(
        period_start,
        period_end
    )

    qs = (
        VendorReceivable.objects
        .select_related('vendor', 'order')
        .filter(
            payout_batch__isnull=True,
            status='eligible',
            eligible_at__gte=start_dt,
            eligible_at__lt=end_dt,
        )
        .order_by('vendor_id', 'eligible_at')
    )

    if target_vendor_id:
        qs = qs.filter(
            vendor_id=target_vendor_id
        )

    by_vendor = {}

    for receivable in qs:
        if (
            receivable.order.payment_status == 'refunded'
            or has_unresolved_return_request(
                receivable.order
            )
        ):
            continue

        by_vendor.setdefault(
            receivable.vendor_id,
            []
        ).append(receivable)

    created_batches = []

    for vendor_id, receivables in by_vendor.items():
        vendor = receivables[0].vendor

        regular_batch = VendorPayoutBatch.objects.filter(
            vendor=vendor,
            period_start=period_start,
            period_end=period_end,
            batch_type='regular',
            sequence=1,
        ).first()

        if regular_batch:
            batch_type = 'supplemental'
            sequence = _next_supplemental_sequence(
                VendorPayoutBatch,
                vendor,
                period_start,
                period_end,
                'batch_type',
            )
        else:
            batch_type = 'regular'
            sequence = 1

        if not vendor.bank_account:
            created_batches.append({
                'vendor_id': vendor_id,
                'vendor_name': vendor.company_name,
                'error': (
                    'Vendor 尚未設定收款銀行帳戶'
                ),
                'already_existed': False,
                'skipped': True,
            })
            continue

        goods_amount = sum(
            (
                item.goods_amount
                for item in receivables
            ),
            Decimal('0.00')
        )

        shipping_amount = sum(
            (
                item.shipping_amount
                for item in receivables
            ),
            Decimal('0.00')
        )

        adjustment_amount = sum(
            (
                item.adjustment_amount
                for item in receivables
            ),
            Decimal('0.00')
        )

        amount_due = sum(
            (
                item.amount_due
                for item in receivables
            ),
            Decimal('0.00')
        )

        # 先定為次月 5 日預計撥款。
        scheduled_payout_date = (
            _next_month_start(period_end)
            + timedelta(days=4)
        )

        with transaction.atomic():
            batch = VendorPayoutBatch.objects.create(
                vendor=vendor,
                period_start=period_start,
                period_end=period_end,
                batch_type=batch_type,
                sequence=sequence,
                goods_amount=goods_amount,
                shipping_amount=shipping_amount,
                adjustment_amount=adjustment_amount,
                amount_due=amount_due,
                status='ready',
                payout_method='bank_transfer',
                destination_bank_code=(
                    vendor.bank_code or ''
                ),
                destination_account_last4=(
                    vendor.bank_account[-4:]
                    if vendor.bank_account
                    else ''
                ),
                destination_account_name=(
                    vendor.bank_account_name
                    or ''
                ),
                scheduled_payout_date=(
                    scheduled_payout_date
                ),
            )

            VendorReceivable.objects.filter(
                pk__in=[
                    item.pk
                    for item in receivables
                ]
            ).update(
                payout_batch=batch,
                status='included'
            )

        created_batches.append({
            'batch_id': batch.batch_id,
            'vendor_id': vendor_id,
            'vendor_name': vendor.company_name,
            'batch_type': batch.batch_type,
            'sequence': batch.sequence,
            'display_label': (
                '正式月結'
                if batch.batch_type == 'regular'
                else f'補結算 #{batch.sequence}'
            ),
            'receivable_count': len(
                receivables
            ),
            'goods_amount': str(
                goods_amount
            ),
            'amount_due': str(
                amount_due
            ),
            'scheduled_payout_date': (
                scheduled_payout_date
            ),
            'status': batch.status,
            'already_existed': False,
            'skipped': False,
        })

        if admin_obj:
            AdminAuditLogs.objects.create(
                admin_id=admin_obj,
                action_type=(
                    'generate_vendor_monthly_payout_batch'
                ),
                vendor=vendor,
                tasks_id=str(
                    batch.batch_id
                ),
                action_reason=(
                    f'建立 {period_start:%Y-%m} 月 '
                    f'Vendor 貨款月結單 '
                    f'#{batch.batch_id}，'
                    f'{len(receivables)} 筆貨款，'
                    f'應撥 NT$ {amount_due}'
                ),
            )

    return Response({
        'success': True,
        'err': '',
        'month': period_start.strftime('%Y-%m'),
        'period_start': period_start,
        'period_end': period_end,
        'batches': created_batches,
    }, status=status.HTTP_201_CREATED)


@api_view(['GET'])
@permission_classes([AllowAny])
def admin_list_vendor_payout_batches(request):
    """
    列出 Vendor 貨款月結單。
    """
    _admin_obj, err = require_admin_role(
        request,
        FINANCE_ADMIN_ROLES,
        source='query'
    )
    if err:
        return err

    vendor_id = request.query_params.get(
        'vendor_id'
    )

    requested_status = request.query_params.get(
        'status'
    )

    month_value = request.query_params.get(
        'month'
    )

    qs = (
        VendorPayoutBatch.objects
        .select_related(
            'vendor',
            'confirmed_by',
        )
        .prefetch_related(
            'receivables__order'
        )
        .order_by(
            '-period_start',
            '-created_at',
        )
    )

    if vendor_id:
        qs = qs.filter(
            vendor_id=vendor_id
        )

    if requested_status:
        qs = qs.filter(
            status=requested_status
        )

    if month_value:
        try:
            period_start, period_end = (
                _month_bounds(month_value)
            )
        except ValueError as exc:
            return Response({
                'success': False,
                'err': str(exc)
            }, status=status.HTTP_400_BAD_REQUEST)

        qs = qs.filter(
            period_start=period_start,
            period_end=period_end,
        )

    rows = []

    for batch in qs[:300]:
        rows.append({
            'Batch_id': batch.batch_id,
            'Vendor_id': batch.vendor_id,
            'Vendor_name': batch.vendor.company_name,
            'Batch_type': batch.batch_type,
            'Sequence': batch.sequence,
            'Display_label': (
                '正式月結'
                if batch.batch_type == 'regular'
                else f'補結算 #{batch.sequence}'
            ),

            'Month': batch.period_start.strftime(
                '%Y-%m'
            ),

            'Period_start': batch.period_start,
            'Period_end': batch.period_end,

            'Receivable_count': (
                batch.receivables.count()
            ),

            'Goods_amount': float(
                batch.goods_amount or 0
            ),

            'Shipping_amount': float(
                batch.shipping_amount or 0
            ),

            'Adjustment_amount': float(
                batch.adjustment_amount or 0
            ),

            'Amount_due': float(
                batch.amount_due or 0
            ),

            'Amount_paid': float(
                batch.amount_paid or 0
            ),

            'Outstanding_amount': float(
                batch.outstanding_amount or 0
            ),

            'Status': batch.status,

            'Scheduled_payout_date': (
                batch.scheduled_payout_date
            ),

            'Paid_at': batch.paid_at,

            'Bank_code': (
                batch.destination_bank_code
                or ''
            ),

            'Bank_account_last4': (
                batch.destination_account_last4
                or ''
            ),

            'Bank_account_name': (
                batch.destination_account_name
                or ''
            ),

            'Transaction_reference': (
                batch.transaction_reference
                or ''
            ),

            'Created_at': batch.created_at,
        })

    return Response({
        'success': True,
        'err': '',
        'batches': rows,
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([AllowAny])
def admin_confirm_vendor_payout_batch(request):
    """
    確認一張 Vendor 貨款月結單是否已完成匯款。

    POST:
      {
        "Admin_id": 1,
        "batch_id": 123,
        "status": "completed",
        "transaction_reference": "BANK-..."
      }
    """
    admin_obj, err = require_admin_role(
        request,
        FINANCE_ADMIN_ROLES,
        source='data'
    )
    if err:
        return err

    batch_id = request.data.get(
        'batch_id'
    )

    new_status = request.data.get(
        'status'
    )

    transaction_reference = (
        request.data.get(
            'transaction_reference'
        )
        or request.data.get(
            'reference_no'
        )
        or ''
    ).strip()

    action_reason = (
        request.data.get(
            'Action_reason'
        )
        or ''
    )

    if not batch_id:
        return Response({
            'success': False,
            'err': 'batch_id 為必填'
        }, status=status.HTTP_400_BAD_REQUEST)

    status_map = {
        'completed': 'paid',
        'confirmed': 'paid',
        'paid': 'paid',
        'failed': 'failed',
        'cancelled': 'cancelled',
    }

    target_status = status_map.get(
        new_status
    )

    if not target_status:
        return Response({
            'success': False,
            'err': (
                'status 必須是 '
                'completed/confirmed/paid、'
                'failed 或 cancelled'
            )
        }, status=status.HTTP_400_BAD_REQUEST)

    try:
        with transaction.atomic():
            batch = (
                VendorPayoutBatch.objects
                .select_for_update()
                .select_related('vendor')
                .get(batch_id=batch_id)
            )

            if batch.status == 'paid':
                return Response({
                    'success': False,
                    'err': '此貨款月結單已完成撥款'
                }, status=status.HTTP_400_BAD_REQUEST)

            if transaction_reference:
                batch.transaction_reference = (
                    transaction_reference
                )

            batch.status = target_status

            if target_status == 'paid':
                batch.paid_at = timezone.now()
                batch.confirmed_by = admin_obj

            else:
                batch.paid_at = None

            batch.note = action_reason

            batch.save(update_fields=[
                'status',
                'transaction_reference',
                'paid_at',
                'confirmed_by',
                'note',
                'updated_at',
            ])

            if target_status == 'paid':
                batch.receivables.update(
                    status='paid',
                    paid_at=batch.paid_at,
                )

            elif target_status in (
                'failed',
                'cancelled',
            ):
                # 月結單仍保留供稽核；
                # 明細也仍掛在原批次，不重新進其他月份。
                batch.receivables.update(
                    status='included',
                    paid_at=None,
                )

            AdminAuditLogs.objects.create(
                admin_id=admin_obj,
                action_type=(
                    'confirm_vendor_monthly_payout'
                    if target_status == 'paid'
                    else 'vendor_monthly_payout_failed'
                ),
                vendor=batch.vendor,
                tasks_id=str(
                    batch.batch_id
                ),
                action_reason=(
                    action_reason
                    or (
                        f'Vendor 貨款月結單 '
                        f'#{batch.batch_id} '
                        f'標記為 {target_status}，'
                        f'金額 NT$ {batch.amount_due}'
                    )
                ),
            )

        return Response({
            'success': True,
            'err': '',
            'batch_id': batch.batch_id,
            'status': batch.status,
            'amount_due': float(
                batch.amount_due
            ),
            'paid_at': batch.paid_at,
            'transaction_reference': (
                batch.transaction_reference
            ),
        }, status=status.HTTP_200_OK)

    except VendorPayoutBatch.DoesNotExist:
        return Response({
            'success': False,
            'err': '找不到此 Vendor 貨款月結單'
        }, status=status.HTTP_404_NOT_FOUND)


# --------------------------------------------------------------------------
# 舊 0052 單筆撥款 API：保留名稱避免舊前端暫時 404，但停止建立新單筆撥款。
# --------------------------------------------------------------------------

@api_view(['POST'])
@permission_classes([AllowAny])
def admin_create_vendor_receivable_payout(request):
    return Response({
        'success': False,
        'err': (
            '貨款已改為月結制，'
            '請使用 VendorPayoutBatch 月結功能，'
            '不再逐筆建立 VendorReceivablePayout。'
        )
    }, status=status.HTTP_410_GONE)


@api_view(['POST'])
@permission_classes([AllowAny])
def admin_confirm_vendor_receivable_payout(request):
    return Response({
        'success': False,
        'err': (
            '貨款已改為月結制。'
            '舊單筆 VendorReceivablePayout '
            '僅保留歷史資料。'
        )
    }, status=status.HTTP_410_GONE)




# ==============================================================================
# KOC 撥款申請：後台處理（比照廠商那一套，補上原本缺的後台端點）
# GET  /platform/koc/payouts              列出 KOC 撥款申請
# POST /platform/koc/payout/confirm       把撥款申請標記為完成或失敗
# ==============================================================================

@api_view(['GET'])
@permission_classes([AllowAny])
def admin_list_koc_payouts(request):
    _admin_obj, err = require_admin_role(request, FINANCE_ADMIN_ROLES, source='query')
    if err:
        return err

    payout_status = request.query_params.get('status', 'pending')

    payouts = Payouts.objects.select_related('koc__koc_profile').order_by('-payout_date')

    if payout_status:
        payouts = payouts.filter(status=payout_status)

    result = []
    for p in payouts:
        user = p.koc
        koc_profile = getattr(user, 'koc_profile', None)
        result.append({
            'Payout_id': p.payout_id,
            'Koc_user_id': user.user_id,
            'Koc_name': user.display_name or user.name,
            'Bank_display': (
                f"{koc_profile.bank_number} {koc_profile.bank_account}"
                if koc_profile and koc_profile.bank_account else '未設定'
            ),
            'Amount': p.amount,
            'Payout_date': p.payout_date,
            'Status': p.status,
        })

    return Response(result, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([AllowAny])
def admin_confirm_koc_payout(request):
    admin_obj, err = require_admin_role(request, FINANCE_ADMIN_ROLES, source='data')
    if err:
        return err

    payout_id = request.data.get('payout_id')
    new_status = request.data.get('status')  # 'completed' 或 'failed'
    action_reason = request.data.get('Action_reason')

    if new_status not in ('completed', 'failed'):
        return Response({
            'success': False,
            'err': "status 必須是 'completed' 或 'failed'"
        }, status=status.HTTP_400_BAD_REQUEST)

    try:
        payout = Payouts.objects.select_related('koc__koc_profile').get(payout_id=payout_id)
    except Payouts.DoesNotExist:
        return Response({
            'success': False,
            'err': '找不到這筆撥款申請'
        }, status=status.HTTP_404_NOT_FOUND)

    if payout.status != 'pending':
        return Response({
            'success': False,
            'err': f'這筆撥款申請已經是「{payout.status}」狀態，不能重複處理'
        }, status=status.HTTP_400_BAD_REQUEST)

    koc = getattr(payout.koc, 'koc_profile', None)

    with transaction.atomic():
        payout.status = new_status
        payout.save(update_fields=['status'])

        # 如果匯款失敗，錢要退回 KOC 的可提領餘額（退回撥款當時扣掉的金額，
        # 不能讓錢憑空消失）。
        if new_status == 'failed' and koc:
            wallet, _ = KocWallet.objects.select_for_update().get_or_create(koc=koc)
            wallet.balance_available = wallet.balance_available + payout.amount
            wallet.save(update_fields=['balance_available', 'updated_at'])

            Transactions.objects.create(
                koc_wallet=wallet,
                type="withdraw_failed_refund",
                amount=payout.amount,
                reference_type="payout",
                reference_id=str(payout.payout_id)
            )

        # 稽核紀錄：誰、對哪個 KOC 的哪一筆撥款申請、做了什麼判定
        AdminAuditLogs.objects.create(
            admin_id=admin_obj,
            action_type='confirm_koc_payout_completed' if new_status == 'completed' else 'confirm_koc_payout_failed',
            tasks_id=str(payout.payout_id),
            koc=koc,
            action_reason=action_reason or f'撥款申請 #{payout.payout_id}，金額 NT$ {payout.amount}，標記為「{new_status}」',
        )

    return Response({
        'success': True,
        'err': '',
        'payout_id': payout.payout_id,
        'status': payout.status,
    }, status=status.HTTP_200_OK)


# ==============================================================================
# 廠商撥款改月結：原本 vendor_request_payout 是廠商自己隨時申請撥款，
# 現在改成「月結」——廠商不用也不能再自行申請，改由這支在每月固定日期
# 被排程呼叫，自動幫每一個「有可提領餘額」的廠商各自建立一張撥款單，
# 把 balance_available 歸零、轉成一筆 pending 的 VendorPayouts + withdraw
# 交易。之後的後台流程（列表 admin_list_vendor_payouts、匯出
# admin_export_payout_transfers、標記完成/失敗 admin_confirm_vendor_payout）
# 完全沿用既有的，不用另外改，因為它們都是照 VendorPayouts 的紀錄在跑，
# 不管這筆紀錄當初是廠商自己申請的還是月結批次產生的。
#
# 這支本身「不管日期」，只要被打就會立刻對所有符合條件的廠商跑一次；
# 實際「每月幾號跑」由外部排程系統設定（例如 Render 的 Cron Job，或
# celery beat 的 crontab schedule），之後日期定案了再去那邊設定
# cron expression 即可，不用改這支程式。
#
# 權限：這支預期主要是被排程系統打，不是登入中的管理員操作，所以除了
# 原本「帶 Admin_id」的手動觸發路徑（後台可以放一顆「手動月結」按鈕，
# 給忘記排程或需要補跑時用），也接受帶 X-Cron-Token 這個 header，
# 比對 settings.VENDOR_PAYOUT_CRON_TOKEN（要記得在 settings.py /
# 環境變數加這個值，排程系統呼叫時把它放進 header 帶過來）。
#
# 注意：AdminAuditLogs.admin_id 這個欄位如果在 models.py 裡不是
# nullable，排程觸發（沒有 admin_obj）這條路徑寫入稽核紀錄時會炸掉，
# 要嘛把欄位改成可以是 null，要嘛另外準備一個代表「系統排程」的
# Admins 帳號在這裡帶入——這部分我沒看到 models.py，麻煩確認一下。
#
# POST /platform_admin/vendor/run-monthly-payouts
# ==============================================================================

# 舊排程名稱直接指向新制結算產生端點；避免在 DRF @api_view wrapper 內再次呼叫另一個 wrapper。
admin_run_monthly_vendor_payouts = admin_settle_vendor_earnings
admin_run_monthly_vendor_settlements = admin_settle_vendor_earnings



# ==============================================================================
# 活動結算：活動結束後，把該活動所有「可提領」的分潤一次匯入 KOC 錢包
# POST /platform_admin/campaign/settle-earnings
# ==============================================================================

@api_view(['GET'])
@permission_classes([AllowAny])
def admin_get_earnings(request):
    _admin_obj, err = require_admin_role(request, FINANCE_ADMIN_ROLES, source='query')
    if err:
        return err

    earnings = Earnings.objects.select_related(
        'user', 'kocmission__application__campaign'
    ).order_by('-created_at')

    result = []
    for earning in earnings:
        campaign = None
        if earning.kocmission and earning.kocmission.application:
            campaign = earning.kocmission.application.campaign

        result.append({
            'Earnings_id': earning.earnings_id,
            'KOCMission_id': earning.kocmission_id,
            'Influencer_id': earning.user_id,
            'Influencer_name': earning.user.name if earning.user else None,
            'Campaign_id': str(campaign.campaign_id) if campaign else None,
            'Campaign_name': campaign.name if campaign else None,
            'amount': earning.amount,
            'status': earning.status,
            'created_at': earning.created_at,
        })

    return Response(result, status=status.HTTP_200_OK)


# 列出「有可提領分潤」的活動，並標出是否已經過了 end_date + promo_days，
# 可以讓前端知道要顯示可結算還是要等待。
#
# 注意：calculate_order_commission 現在建立 Earnings 時就直接是 withdrawable，
# 正常流程不會再產生 pending 分潤，這支 API（以及下面的 admin_settle_campaign_earnings）
# 只當作補算舊資料或例外情況的手動工具保留，不是主要結算路徑。
@api_view(['GET'])
@permission_classes([AllowAny])
def admin_list_settleable_campaigns(request):
    _admin_obj, err = require_admin_role(request, FINANCE_ADMIN_ROLES, source='query')
    if err:
        return err

    now = timezone.now()

    campaigns = Campaigns.objects.select_related('vendor').all()

    result = []
    for campaign in campaigns:
        pending = Earnings.objects.filter(
            kocmission__application__campaign=campaign,
            status=EARNINGS_STATUS_CHOICES_MAP['pending']
        ).select_related('order')

        pending_count = pending.count()

        if pending_count == 0:
            continue

        pending_amount = sum(item.amount for item in pending)
        eligible_at = campaign.end_date + timedelta(
            days=campaign.promo_days or 0
        )
        campaign_date_eligible = eligible_at <= now

        # 活動效期過了只是第一道門檻，個別訂單如果還在退貨期內、或有退貨
        # 申請還沒結案，那筆分潤還是不能結算——這裡先算出「現在按下結算
        # 實際能清掉幾筆、多少錢」，讓後台看得出跟 Pending_amount 的落差
        # 是被退貨卡住，不是系統算錯。
        settleable_count = 0
        settleable_amount = 0
        return_blocked_count = 0

        if campaign_date_eligible:
            for earning in pending:
                order = earning.order
                if not order:
                    continue
                if is_return_window_open(order) or has_unresolved_return_request(order):
                    return_blocked_count += 1
                    continue
                settleable_count += 1
                settleable_amount += earning.amount

        result.append({
            'Campaign_id': str(campaign.campaign_id),
            'Campaign_name': campaign.name,
            'Vendor_name': campaign.vendor.company_name if campaign.vendor else None,
            'End_date': campaign.end_date,
            'Settlement_eligible_at': eligible_at,
            'Is_eligible': campaign_date_eligible,
            'Pending_count': pending_count,
            'Pending_amount': pending_amount,
            'Settleable_count': settleable_count,
            'Settleable_amount': settleable_amount,
            'Return_blocked_count': return_blocked_count,
        })

    return Response(result, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([AllowAny])
def admin_settle_campaign_earnings(request):
    """舊活動結算入口保留，但不得繞過 Vendor paid 條件。

    只會釋放其訂單已包含於 paid VendorSettlement 的 pending Earnings。
    正常流程由 admin_confirm_vendor_settlement_payment 自動完成，因此這支主要作補算工具。
    """
    admin_obj, err = require_admin_role(request, FINANCE_ADMIN_ROLES, source='data')
    if err:
        return err
    campaign_id=request.data.get('Campaign_id')
    if not campaign_id:
        return Response({'success':False,'err':'Campaign_id is required'},status=status.HTTP_400_BAD_REQUEST)
    try:
        campaign=Campaigns.objects.get(campaign_id=campaign_id)
    except Campaigns.DoesNotExist:
        return Response({'success':False,'err':'Campaign not found'},status=status.HTTP_404_NOT_FOUND)

    earnings=(Earnings.objects.select_related('kocmission__koc').filter(
        kocmission__application__campaign=campaign,
        status=EARNINGS_STATUS_CHOICES_MAP['pending'],
    ))
    settled=[]; skipped=[]
    for earning in earnings:
        paid_item=VendorSettlementItem.objects.filter(order=earning.order,vendor=campaign.vendor,settlement__status='paid').select_related('settlement').first()
        if not paid_item:
            skipped.append({'earnings_id':earning.earnings_id,'reason':'廠商對應結算單尚未付款'})
            continue
        with transaction.atomic():
            wallet,_=KocWallet.objects.select_for_update().get_or_create(koc=earning.kocmission.koc)
            wallet.balance_frozen=max(0,wallet.balance_frozen-earning.amount)
            wallet.balance_available += earning.amount
            wallet.save(update_fields=['balance_frozen','balance_available','updated_at'])
            earning.status=EARNINGS_STATUS_CHOICES_MAP['withdrawable']; earning.save(update_fields=['status'])
            Transactions.objects.create(koc_wallet=wallet,type='settlement_release',amount=earning.amount,reference_type='vendor_settlement',reference_id=str(paid_item.settlement_id))
        settled.append({'earnings_id':earning.earnings_id,'amount':earning.amount})
    total=sum(x['amount'] for x in settled)
    AdminAuditLogs.objects.create(admin_id=admin_obj,action_type='settle_campaign_earnings',tasks_id=str(campaign_id),vendor=campaign.vendor,action_reason=f'補算活動分潤 {len(settled)} 筆，共 NT$ {total}')
    return Response({'success':True,'err':'','settled_count':len(settled),'total_amount':total,'settled':settled,'skipped':skipped},status=status.HTTP_200_OK)



# ==============================================================================
# Platform Admin - 平台總覽
# GET /platform_admin/overview
# ==============================================================================

@api_view(['GET'])
@permission_classes([AllowAny])
def admin_overview(request):
    user_count = User.objects.count()
    vendor_count = Vendor.objects.count()
    order_count = Order.objects.count()
    campaign_count = Campaigns.objects.count()
    # 舊版 Payment model 只有走過模擬結帳流程才會有紀錄，改成直接數 Order.payment_status='paid'
    # 的筆數 —— 這是綠界（PaymentTransaction）跟舊版轉帳/貨到付款流程都會寫入的共同欄位
    payment_count = Order.objects.filter(payment_status='paid').count()
    ticket_count = ServiceTickets.objects.count()
    kocmission_count = KOCMissionNew.objects.count()
    # 總覽卡片右上角的成長標籤：近 30 天新增的會員與廠商
    recent_since = timezone.now() - timedelta(days=30)
    new_user_count = User.objects.filter(created_at__gte=recent_since).count()
    new_vendor_count = Vendor.objects.filter(created_at__gte=recent_since).count()

    return Response({
        "success": True,
        "overview": {
            "User_count": user_count,
            "Vendor_count": vendor_count,
            "Order_count": order_count,
            "Campaign_count": campaign_count,
            "KOCMission_count": kocmission_count,
            "Payment_count": payment_count,
            "Ticket_count": ticket_count,
            "New_user_count_30d": new_user_count,
            "New_vendor_count_30d": new_vendor_count,
        }
    }, status=status.HTTP_200_OK)



# ==============================================================================
# Platform Admin - 網站流量趨勢（資料來源：GA4）
# GET /platform/analytics/traffic?range=7d|30d|year
# ==============================================================================

TRAFFIC_RANGE_DAYS = {"7d": 7, "30d": 30}


@api_view(['GET'])
@permission_classes([AllowAny])
def admin_site_traffic(request):
    from api.ga4_client import get_site_traffic, GA4NotConfigured, friendly_error

    range_key = request.GET.get("range") or "7d"
    today = timezone.localdate()
    if range_key == "year":
        start_date = date(today.year, 1, 1)
    elif range_key in TRAFFIC_RANGE_DAYS:
        # 「近 7 天」含今天共 7 天
        start_date = today - timedelta(days=TRAFFIC_RANGE_DAYS[range_key] - 1)
    else:
        return Response({
            "success": False,
            "err": "不支援的時間範圍"
        }, status=status.HTTP_400_BAD_REQUEST)

    try:
        traffic = get_site_traffic(start_date, today)
    except GA4NotConfigured as error:
        return Response({
            "success": False,
            "err": str(error)
        }, status=status.HTTP_503_SERVICE_UNAVAILABLE)
    except Exception as error:
        return Response({
            "success": False,
            "err": friendly_error(error, "網站流量")
        }, status=status.HTTP_502_BAD_GATEWAY)

    return Response({
        "success": True,
        "err": "",
        "range": range_key,
        **traffic,
    }, status=status.HTTP_200_OK)


# ==============================================================================
# Platform Admin - 查看廠商列表
# GET /platform_admin/vendors
# ==============================================================================

@api_view(['GET'])
@permission_classes([AllowAny])
def admin_vendor_list(request):
    vendor_id = request.query_params.get('Vendor_id')
    company_name = request.query_params.get('Company_name')
    email = request.query_params.get('Email')
    vendor_status = request.query_params.get('Status')

    vendors = Vendor.objects.all().order_by('-created_at')

    if vendor_id:
        vendors = vendors.filter(vendor_id=vendor_id)

    if company_name:
        vendors = vendors.filter(company_name__icontains=company_name)

    if email:
        vendors = vendors.filter(email__icontains=email)

    if vendor_status:
        vendors = vendors.filter(status=vendor_status)

    data = []

    for vendor in vendors:
        data.append({
            "Vendor_id": vendor.vendor_id,
            "Company_name": vendor.company_name,
            "Contact_name": vendor.contact_name,
            "Email": vendor.email,
            "Tax_ID": vendor.tax_id,
            "Status": vendor.status,
            "Created_at": vendor.created_at,
        })

    return Response({
        "success": True,
        "err": "",
        "total": len(data),
        "vendors": data,

    }, status=status.HTTP_200_OK)



# 顯示待審核koc名單
@api_view(['GET'])
@permission_classes([AllowAny])
def koc_get_pending_list(request):
    # 查所有 approval_status='pending' 的 KOC
    pending_kocs = KOC.objects.filter(
        approval_status='pending'
    ).select_related('user').order_by('koc_id')

    result = []
    for koc in pending_kocs:
        result.append({
            "koc_id": koc.koc_id,
            "user_id": koc.user.user_id,
            "name": koc.user.name,
            "email": koc.user.email,
            "ig_account": koc.ig_account,
            "ig_url": koc.ig_url,
            "fb_account": koc.fb_account,
            "fb_url": koc.fb_url,
            "threads_account": koc.threads_account,
            "threads_url": koc.threads_url,
            "user_role": ROLE_CODE_MAP.get(koc.user.role, -1), 
            "applied_at": koc.user.created_at.strftime('%Y-%m-%d %H:%M') if koc.user.created_at else None,
        })

    return Response({
        "success": True,
        "err": "",
        "pending_list": result,
        "total": len(result)
    }, status=status.HTTP_200_OK)

# ==============================================================================
# Platform Admin - 查看廠商詳細資料
# GET /platform_admin/vendor/detail?Vendor_id=1
# ==============================================================================

@api_view(['GET'])
@permission_classes([AllowAny])
def admin_vendor_detail(request):
    vendor_id = request.query_params.get('Vendor_id')

    if not vendor_id:
        return Response({
            "success": False,
            "err": "Vendor_id is required"
        }, status=status.HTTP_400_BAD_REQUEST)

    try:
        vendor = Vendor.objects.get(vendor_id=vendor_id)
    except Vendor.DoesNotExist:
        return Response({
            "success": False,
            "err": "Vendor not found"
        }, status=status.HTTP_404_NOT_FOUND)

    # 查廠商錢包
    wallet = None

    try:
        vendor_wallet = VendorWallet.objects.get(vendor=vendor)
        wallet = {
            "Wallet_id": vendor_wallet.id,
            "Vendor_id": vendor.vendor_id,
            "Balance_available": vendor_wallet.balance_available,
            "Balance_frozen": vendor_wallet.balance_frozen,
            "Updated_at": vendor_wallet.updated_at,
        }
    except VendorWallet.DoesNotExist:
        wallet = None

    # 查廠商活動
    # 注意：Campaigns.vendor_id 是 CharField，Vendor.vendor_id 是 AutoField
    campaigns = Campaigns.objects.filter(
        vendor_id=str(vendor.vendor_id)
    ).order_by('-start_date')

    campaign_data = []

    for campaign in campaigns:
        campaign_data.append({
            "Campaign_id": campaign.campaign_id,
            "Vendor_id": campaign.vendor_id,
            "Name": campaign.name,
            "Description": campaign.description,
            "Budget": campaign.budget,
            "Reward_type": campaign.reward_type,
            "Start_date": campaign.start_date,
            "End_date": campaign.end_date,
            "Status": campaign.status,
        })

    return Response({
        "success": True,
        "vendor": {
            "Vendor_id": vendor.vendor_id,
            "Company_name": vendor.company_name,
            "Contact_name": vendor.contact_name,
            "Email": vendor.email,
            "Tax_ID": vendor.tax_id,
            "Status": vendor.status,
            "Created_at": vendor.created_at,
        },
        "wallet": wallet,
        "campaigns": campaign_data
    }, status=status.HTTP_200_OK)


# ==============================================================================
# Platform Admin - 記錄廠商審核操作
# POST /platform_admin/vendor/audit
# ==============================================================================

@api_view(['POST'])
@permission_classes([AllowAny])
def admin_vendor_audit(request):
    admin_id = request.data.get('Admin_id')
    vendor_id = request.data.get('Vendor_id')
    action_type = request.data.get('Action_type')
    action_reason = request.data.get('Action_reason')

    if not admin_id:
        return Response({
            "success": False,
            "err": "Admin_id is required"
        }, status=status.HTTP_400_BAD_REQUEST)

    if not vendor_id:
        return Response({
            "success": False,
            "err": "Vendor_id is required"
        }, status=status.HTTP_400_BAD_REQUEST)

    if not action_type:
        return Response({
            "success": False,
            "err": "Action_type is required"
        }, status=status.HTTP_400_BAD_REQUEST)

    try:
        admin_obj = Admins.objects.get(admin_id=admin_id)
    except Admins.DoesNotExist:
        return Response({
            "success": False,
            "err": "Admin not found"
        }, status=status.HTTP_404_NOT_FOUND)

    try:
        vendor = Vendor.objects.get(vendor_id=vendor_id)
    except Vendor.DoesNotExist:
        return Response({
            "success": False,
            "err": "Vendor not found"
        }, status=status.HTTP_404_NOT_FOUND)

    audit_log = AdminAuditLogs.objects.create(
        admin_id=admin_obj,
        action_type=action_type,
        vendor_id=str(vendor.vendor_id),
        action_reason=action_reason
    )

    return Response({
        "success": True,
        "log": {
            "Log_id": audit_log.log_id,
            "Admin_id": audit_log.admin_id.admin_id,
            "Action_type": audit_log.action_type,
            "Submission_id": audit_log.submission_id,
            "Tasks_id": audit_log.tasks_id,
            "Influencer_id": audit_log.koc_id,
            "Vendor_id": audit_log.vendor_id,
            "Action_reason": audit_log.action_reason,
            "Created_at": audit_log.created_at,
        }
    }, status=status.HTTP_201_CREATED)


# ==============================================================================
# Platform Admin - 審核廠商申請
# PATCH /platform_admin/vendor/review
# ==============================================================================

@api_view(['PATCH'])
@permission_classes([AllowAny])
def admin_vendor_review(request):
    admin_id = request.data.get('Admin_id')
    vendor_id = request.data.get('Vendor_id')
    review_status = request.data.get('Status')
    action_reason = request.data.get('Action_reason')

    if not admin_id:
        return Response({
            "success": False,
            "err": "Admin_id is required"
        }, status=status.HTTP_400_BAD_REQUEST)

    if not vendor_id:
        return Response({
            "success": False,
            "err": "Vendor_id is required"
        }, status=status.HTTP_400_BAD_REQUEST)

    if not review_status:
        return Response({
            "success": False,
            "err": "Status is required"
        }, status=status.HTTP_400_BAD_REQUEST)

    allowed_status = ["pending", "approved", "rejected"]

    if review_status not in allowed_status:
        return Response({
            "success": False,
            "err": "Status must be pending, approved, or rejected"
        }, status=status.HTTP_400_BAD_REQUEST)

    try:
        admin_obj = Admins.objects.get(admin_id=admin_id)
    except Admins.DoesNotExist:
        return Response({
            "success": False,
            "err": "Admin not found"
        }, status=status.HTTP_404_NOT_FOUND)

    try:
        vendor = Vendor.objects.get(vendor_id=vendor_id)
    except Vendor.DoesNotExist:
        return Response({
            "success": False,
            "err": "Vendor not found"
        }, status=status.HTTP_404_NOT_FOUND)

    # 更新廠商審核狀態
    vendor.status = review_status
    vendor.save()

    # 自動新增管理員操作紀錄
    if review_status == "approved":
        audit_action_type = "approve_vendor"
    elif review_status == "rejected":
        audit_action_type = "reject_vendor"
    else:
        audit_action_type = "review_vendor"

    audit_log = AdminAuditLogs.objects.create(
        admin_id=admin_obj,
        action_type=audit_action_type,
        vendor=vendor,
        action_reason=action_reason
    )

    # 寄送審核通過通知信；寄信失敗不影響審核結果，只記錄下來
    if review_status == "approved":
        try:
            send_vendor_approval_email(vendor)
        except Exception as email_error:
            logger.warning(f"寄送廠商審核通過通知信失敗（vendor_id={vendor.vendor_id}）: {email_error}")

    return Response({
        "success": True,
        "vendor": {
            "Vendor_id": vendor.vendor_id,
            "Company_name": vendor.company_name,
            "Contact_name": vendor.contact_name,
            "Email": vendor.email,
            "Tax_ID": vendor.tax_id,
            "Status": vendor.status,
            "Created_at": vendor.created_at,
        },
        "audit_log": {
            "Log_id": audit_log.log_id,
            "Admin_id": audit_log.admin_id.admin_id,
            "Action_type": audit_log.action_type,
            "Vendor_id": audit_log.vendor_id,
            "Action_reason": audit_log.action_reason,
            "Created_at": audit_log.created_at,
        }
    }, status=status.HTTP_200_OK)


# ==============================================================================
# Platform Admin - 查看優惠碼使用狀況
# GET /platform/coupons
# ==============================================================================

@api_view(['GET'])
@permission_classes([AllowAny])
def admin_coupon_usage(request):
    promotion_code = request.query_params.get('Promotion_code')
    campaign_id = request.query_params.get('Campaign_id')
    coupon_status = request.query_params.get('Status')


    coupons = CouponNew.objects.select_related(
        'kocmission__application__campaign',
        'kocmission__koc',
    ).all().order_by('-coupon_id')


    # 依優惠碼模糊搜尋
    if promotion_code:
        coupons = coupons.filter(
            promotion_code__icontains=promotion_code
        )

    # 依狀態搜尋：inactive、active、expired
    if coupon_status:
        coupons = coupons.filter(status=coupon_status)

    # 依活動編號搜尋
    if campaign_id:
        coupons = coupons.filter(
            kocmission__application__campaign__campaign_id=campaign_id
        )


    coupons = list(coupons)

    # 🔥 批次查出所有優惠碼對應的訂單，依 promotion_code 分組，避免迴圈內逐一查詢
    promotion_codes = [coupon.promotion_code for coupon in coupons]
    orders_by_code = {}
    for order in Order.objects.filter(promotion_code__in=promotion_codes).order_by('-created_at'):
        orders_by_code.setdefault(order.promotion_code, []).append(order)

    # 🔥 批次查出每個任務(kocmission)累積的分潤總額，避免迴圈內逐一查詢。
    # 不用 coupon.total_commission 這個快取欄位，直接從 Earnings 帳本算才準。
    kocmission_ids = [coupon.kocmission_id for coupon in coupons]
    commission_by_kocmission_id = {
        row['kocmission']: row['total']
        for row in Earnings.objects.filter(kocmission_id__in=kocmission_ids)
        .exclude(status='cancelled')
        .values('kocmission')
        .annotate(total=Sum('amount'))
    }

    data = []

    for coupon in coupons:
        matching_orders = orders_by_code.get(coupon.promotion_code, [])
        latest_order = matching_orders[0] if matching_orders else None
        actual_order_count = len(matching_orders)

        campaign = coupon.kocmission.application.campaign
        koc = coupon.kocmission.koc

        data.append({
            "Coupon_id": coupon.coupon_id,
            "Promotion_code": coupon.promotion_code,
            "Status": coupon.status,
            "Usage_count": coupon.usage_count,
            "Actual_order_count": actual_order_count,
            "Total_commission": commission_by_kocmission_id.get(coupon.kocmission_id, 0),

            "KOCMission_id": coupon.kocmission_id,
            "KOC_id": koc.koc_id if koc else None,

            "Campaign_id": str(campaign.campaign_id),
            "Campaign_name": campaign.name,

            "Latest_order": {
                "Order_id": (
                    str(latest_order.order_id)
                    if latest_order
                    else None
                ),
                "User_id": (
                    latest_order.user_id
                    if latest_order
                    else None
                ),
                "Total_amount": (
                    float(latest_order.total_amount)
                    if latest_order
                    else None
                ),
                "Payment_status": (
                    latest_order.payment_status
                    if latest_order
                    else None
                ),
                "Created_at": (
                    latest_order.created_at
                    if latest_order
                    else None
                ),
            }

        })

    return Response({
        "success": True,
        "err": "",
        "total": len(data),
        "coupons": data,

    }, status=status.HTTP_200_OK)

# ==============================================================================
# Platform Admin - 查看每月成效追蹤資料
# GET /platform/performance
# 可選參數：Year、Month、Campaign_id、Promotion_code
# ==============================================================================

@api_view(['GET'])
@permission_classes([AllowAny])
def admin_performance(request):
    now = timezone.localtime()

    # 沒有帶 Year、Month 時，預設查詢本月
    try:
        year = int(
            request.query_params.get('Year', now.year)
        )
        month = int(
            request.query_params.get('Month', now.month)
        )
    except (TypeError, ValueError):
        return Response({
            "success": False,
            "err": "Year 和 Month 必須是整數"
        }, status=status.HTTP_400_BAD_REQUEST)

    if month < 1 or month > 12:
        return Response({
            "success": False,
            "err": "Month 必須介於 1 到 12"
        }, status=status.HTTP_400_BAD_REQUEST)

    campaign_id = request.query_params.get('Campaign_id')
    promotion_code = request.query_params.get('Promotion_code')

    coupons = CouponNew.objects.select_related(
        'kocmission__application__campaign',
        'kocmission__koc',
    ).all().order_by('-coupon_id')

    if campaign_id:
        coupons = coupons.filter(
            kocmission__application__campaign__campaign_id=campaign_id
        )

    if promotion_code:
        coupons = coupons.filter(
            promotion_code__icontains=promotion_code
        )

    coupons = list(coupons)

    # 🔥 批次查出每個任務(kocmission)歷史累積的分潤總額，避免迴圈內逐一查詢。
    # 不用 coupon.total_commission 這個快取欄位，直接從 Earnings 帳本算才準。
    kocmission_ids = [coupon.kocmission_id for coupon in coupons]
    all_time_commission_by_kocmission_id = {
        row['kocmission']: row['total']
        for row in Earnings.objects.filter(kocmission_id__in=kocmission_ids)
        .exclude(status='cancelled')
        .values('kocmission')
        .annotate(total=Sum('amount'))
    }

    performance_data = []

    total_actual_orders = 0
    total_completed_orders = 0
    total_revenue = 0
    total_commission = 0
    coupons_used_this_month = 0

    for coupon in coupons:
        campaign = coupon.kocmission.application.campaign
        koc = coupon.kocmission.koc

        # 只查指定月份使用此優惠碼的訂單
        monthly_orders = Order.objects.filter(
            promotion_code=coupon.promotion_code,
            created_at__year=year,
            created_at__month=month,
        )

        # 只把付款完成的訂單算入營收
        completed_orders = monthly_orders.filter(
            payment_status__in=['completed', 'paid']
        )

        actual_order_count = monthly_orders.count()
        completed_order_count = completed_orders.count()

        if actual_order_count > 0:
            coupons_used_this_month += 1

        monthly_revenue = sum(
            float(order.total_amount or 0)
            for order in completed_orders
        )

        average_order_amount = (
            monthly_revenue / completed_order_count
            if completed_order_count > 0
            else 0
        )

        # 從 Earnings 計算這個月實際產生的分潤
        monthly_earnings = Earnings.objects.filter(
            kocmission=coupon.kocmission,
            order__in=completed_orders,
            created_at__year=year,
            created_at__month=month,
        ).exclude(status='cancelled')

        monthly_commission = sum(
            float(earning.amount or 0)
            for earning in monthly_earnings
        )

        total_actual_orders += actual_order_count
        total_completed_orders += completed_order_count
        total_revenue += monthly_revenue
        total_commission += monthly_commission

        performance_data.append({
            "Coupon_id": coupon.coupon_id,
            "Promotion_code": coupon.promotion_code,
            "Coupon_status": coupon.status,

            "KOCMission_id": coupon.kocmission_id,
            "KOC_id": koc.koc_id if koc else None,

            "Campaign_id": str(campaign.campaign_id),
            "Campaign_name": campaign.name,

            # 本月資料
            "Usage_count": actual_order_count,
            "Actual_order_count": actual_order_count,
            "Completed_order_count": completed_order_count,
            "Revenue": round(monthly_revenue, 2),
            "Average_order_amount": round(
                average_order_amount,
                2
            ),
            "Total_commission": round(
                monthly_commission,
                2
            ),

            # 額外保留原本 Coupon 表的累計資料
            "Usage_count_all_time": coupon.usage_count,
            "Total_commission_all_time": float(
                all_time_commission_by_kocmission_id.get(coupon.kocmission_id, 0)
            ),
        })

    overall_average_order_amount = (
        total_revenue / total_completed_orders
        if total_completed_orders > 0
        else 0
    )

    return Response({
        "success": True,
        "err": "",

        "period": {
            "Year": year,
            "Month": month,
            "Label": f"{year}-{month:02d}",
        },

        "summary": {
            "Total_coupons": len(coupons),
            "Coupons_used_this_month": coupons_used_this_month,

            # 保留原本欄位名稱，前端不用大改
            "Total_usage_count": total_actual_orders,
            "Total_actual_orders": total_actual_orders,
            "Total_completed_orders": total_completed_orders,
            "Total_revenue": round(total_revenue, 2),
            "Average_order_amount": round(
                overall_average_order_amount,
                2
            ),
            "Total_commission": round(
                total_commission,
                2
            ),
        },

        "performance": performance_data,
    }, status=status.HTTP_200_OK)


# 同意koc申請
@api_view(['POST'])
@permission_classes([AllowAny])
def koc_approve(request):
    serializer = KOCApproveSerializer(data=request.data)
    if not serializer.is_valid():
        return Response({
            "success": False,
            "err": serializer_error_message(serializer.errors)
        }, status=http_status.HTTP_400_BAD_REQUEST)

    data = serializer.validated_data

    try:
        admin = Admins.objects.get(pk=data['admin_id'])
    except Admins.DoesNotExist:
        return Response({
            "success": False,
            "err": "找不到對應的管理員"
        }, status=http_status.HTTP_404_NOT_FOUND)

    try:
        koc = KOC.objects.select_related('user').get(pk=data['koc_id'])
    except KOC.DoesNotExist:
        return Response({
            "success": False,
            "err": "找不到對應的 KOC 申請"
        }, status=http_status.HTTP_404_NOT_FOUND)

    if koc.approval_status != 'pending':
        return Response({
            "success": False,
            "err": f"此申請目前狀態為「{koc.get_approval_status_display()}」，無法審核"
        }, status=http_status.HTTP_400_BAD_REQUEST)

    # 更新 KOC 審核狀態
    koc.approval_status = 'approved'
    koc.reject_reason = None
    koc.save()

    # 同步更新 User.role
    user = koc.user
    user.role = '1'
    user.save()

    # 寫入 AdminAuditLogs
    AdminAuditLogs.objects.create(
        admin_id=admin,
        action_type='approve_koc',
        koc=koc,
        action_reason=None,
    )

    # 寄送審核通過通知信；寄信失敗不影響審核結果，只記錄下來
    try:
        send_koc_approval_email(user)
    except Exception as email_error:
        logger.warning(f"寄送 KOC 審核通過通知信失敗（koc_id={koc.koc_id}）: {email_error}")

    return Response({
        "success": True,
        "err": "",
        "koc_id": koc.koc_id,
        "message": "審核已通過"
    }, status=http_status.HTTP_200_OK)


# 否決koc申請
@api_view(['POST'])
@permission_classes([AllowAny])
def koc_reject(request):
    serializer = KOCRejectSerializer(data=request.data)
    if not serializer.is_valid():
        return Response({
            "success": False,
            "err": serializer_error_message(serializer.errors)
        }, status=http_status.HTTP_400_BAD_REQUEST)

    data = serializer.validated_data

    try:
        admin = Admins.objects.get(pk=data['admin_id'])
    except Admins.DoesNotExist:
        return Response({
            "success": False,
            "err": "找不到對應的管理員"
        }, status=http_status.HTTP_404_NOT_FOUND)

    try:
        koc = KOC.objects.select_related('user').get(pk=data['koc_id'])
    except KOC.DoesNotExist:
        return Response({
            "success": False,
            "err": "找不到對應的 KOC 申請"
        }, status=http_status.HTTP_404_NOT_FOUND)

    if koc.approval_status != 'pending':
        return Response({
            "success": False,
            "err": f"此申請目前狀態為「{koc.get_approval_status_display()}」，無法審核"
        }, status=http_status.HTTP_400_BAD_REQUEST)

    # 更新 KOC 審核狀態
    koc.approval_status = 'rejected'
    koc.reject_reason = data['reject_reason']
    koc.save()

    # 寫入 AdminAuditLogs
    AdminAuditLogs.objects.create(
        admin_id=admin,
        action_type='reject_koc',
        koc=koc,
        action_reason=data['reject_reason'],
    )

    # TODO: 寄送審核拒絕通知(信件或簡訊)，告知拒絕原因
    # send_rejection_notification(user, data['reject_reason'])

    return Response({
        "success": True,
        "err": "",
        "koc_id": koc.koc_id,
        "message": "已拒絕此申請"
    }, status=http_status.HTTP_200_OK)

# 顯示koc列表
@api_view(['GET'])
@permission_classes([AllowAny])
def koc_get_list(request):
    # 只列出審核通過的 KOC
    kocs = KOC.objects.filter(
        approval_status='approved'
    ).select_related('user').order_by('koc_id')

    result = []
    for koc in kocs:
        result.append({
            "koc_id": koc.koc_id,
            "name": koc.user.name,
            "ig_account": koc.ig_account,
            "fb_account": koc.fb_account,
            "fb_url": koc.fb_url,
            "threads_account": koc.threads_account,
            "status": 1 if koc.is_suspended else 0,  # 0:已啟用, 1:已停權
        })

    return Response({
        "success": True,
        "err": "",
        "koc_list": result,
        "total": len(result)
    }, status=http_status.HTTP_200_OK)

# 獲取koc任務詳情
@api_view(['GET'])
@permission_classes([AllowAny])
def koc_get_detail(request):
    sync_expired_promoting_missions()

    koc_id = request.query_params.get('koc_id')
    user_id = request.query_params.get('User_id')
    application_id = request.query_params.get('Application_id')
    kocmission_id = request.query_params.get('KOCMisson_id')
    status_param = request.query_params.get('Status')

    # 至少要有一個參數
    if not any([koc_id, user_id, application_id, kocmission_id]):
        return Response({
            "success": False,
            "err": "請至少提供一個查詢參數"
        }, status=http_status.HTTP_400_BAD_REQUEST)

    # 先找到 KOC
    try:
        if koc_id:
            koc = KOC.objects.select_related('user').get(pk=koc_id)
        elif user_id:
            koc = KOC.objects.select_related('user').get(user_id=user_id)
        else:
            koc = None
    except KOC.DoesNotExist:
        return Response({
            "success": False,
            "err": "找不到對應的 KOC"
        }, status=http_status.HTTP_404_NOT_FOUND)

    # 查詢 Application
    applications = Application.objects.filter(
        koc=koc
    ).select_related('campaign__vendor') if koc else Application.objects.none()

    if application_id:
        applications = applications.filter(application_id=application_id)
    if status_param:
        applications = applications.filter(status=status_param)

    applications = list(applications)

    # 🔥 批次查出所有活動的商品，避免迴圈內逐一查詢
    campaign_ids = [app.campaign_id for app in applications]
    campaign_products = CampaignProduct.objects.filter(
        campaign_id__in=campaign_ids
    ).select_related('product')
    product_id_map = {}
    for cp in campaign_products:
        if cp.campaign_id not in product_id_map and cp.product:
            product_id_map[cp.campaign_id] = cp.product.product_id

    # 🔥 批次查出所有申請對應的任務，依 application_id 分組，避免迴圈內逐一查詢
    missions_qs = KOCMissionNew.objects.filter(application__in=applications)
    if kocmission_id:
        missions_qs = missions_qs.filter(kocmission_id=kocmission_id)
    missions_qs = list(missions_qs)

    missions_by_application = {}
    for mission in missions_qs:
        missions_by_application.setdefault(mission.application_id, []).append(mission)

    # 🔥 批次查出所有任務對應的優惠碼，避免迴圈內逐一查詢
    coupons = CouponNew.objects.filter(kocmission__in=missions_qs)
    coupon_map = {}
    for coupon in coupons:
        if coupon.kocmission_id not in coupon_map:
            coupon_map[coupon.kocmission_id] = coupon

    result = []
    for app in applications:
        campaign = app.campaign
        vendor = campaign.vendor

        product_id = product_id_map.get(campaign.campaign_id)

        for mission in missions_by_application.get(app.application_id, []):
            # 取得優惠碼
            coupon = coupon_map.get(mission.kocmission_id)

            result.append({
                # Application 層級
                "Application_id": str(app.application_id),
                "User_id": koc.user.user_id if koc else None,
                "Brand_id": str(vendor.vendor_id),
                "Mission_id": str(campaign.campaign_id),
                "Status": app.status,

                # KOCMission 層級
                "KOCMisson_id": str(mission.kocmission_id),
                "Product_id": str(product_id) if product_id else None,
                "Promotion_code": coupon.promotion_code if coupon else None,
                "Stage": STAGE_CODE_MAP.get(mission.stage),
                "Tasks_id": str(mission.kocmission_id),
                "Deadline": campaign.end_date.strftime('%Y-%m-%d %H:%M') if campaign.end_date else None,
            })

    return Response({
        "success": True,
        "err": "",
        "total": len(result),
        "data": result
    }, status=http_status.HTTP_200_OK)
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status
from api.models import Admins, User, Order, Transactions, AdminAuditLogs

# ==============================================================================
# KOC 任務的管理員例外處理
#
# 任務階段平常由流程自動推進（廠商核准申請 → 撰寫文案 → KOC 交文案 → 審核中 →
# 廠商通過 → 待發佈 → KOC 交連結 → 推廣中 → 活動結束自動結案），管理員不能再
# 任意指定階段，只保留兩種例外操作，且都必須填寫原因並寫入操作紀錄：
#   POST /platform/kocmission/forceClose   強制結案（違規、廠商要求終止等）
#   POST /platform/kocmission/revertStage  退回上一階段（更正誤操作）
# Body: Admin_id, KOCMission_id, Reason
# ==============================================================================

MISSION_ADMIN_ROLES = {'super_admin', 'reviewer'}
MISSION_STAGE_LABELS = {
    'writing': '撰寫文案',
    'reviewing': '文案審核中',
    'publishing': '待發佈',
    'promoting': '推廣中',
    'completed': '已結案',
}
# 可以退回的階段 → 退回後的階段
MISSION_REVERT_TARGET = {
    'reviewing': 'writing',
    'publishing': 'reviewing',
    'promoting': 'publishing',
}


def _get_mission_for_admin_action(request):
    """共用檢查：管理員角色、任務存在、原因必填。回傳 (admin, mission, reason, err)。"""
    admin_obj, err = require_admin_role(request, MISSION_ADMIN_ROLES, source='data')
    if err:
        return None, None, None, err

    reason = (request.data.get('Reason') or '').strip()
    if not reason:
        return None, None, None, Response({
            'success': False,
            'err': '請填寫處理原因'
        }, status=http_status.HTTP_400_BAD_REQUEST)

    try:
        mission = KOCMissionNew.objects.select_related(
            'application__campaign__vendor', 'koc__user'
        ).get(pk=request.data.get('KOCMission_id'))
    except (KOCMissionNew.DoesNotExist, ValueError, TypeError):
        return None, None, None, Response({
            'success': False,
            'err': '找不到對應的 KOC 任務'
        }, status=http_status.HTTP_404_NOT_FOUND)

    return admin_obj, mission, reason, None


def _notify_mission_parties(mission, title, body):
    """通知任務的 KOC 與廠商；通知失敗不影響操作本身。"""
    campaign = mission.application.campaign
    if mission.koc and mission.koc.user:
        create_notification(
            user=mission.koc.user,
            category='koc',
            title=title,
            body=body,
            reference_type='koc_home',
            reference_id=str(mission.kocmission_id),
        )
    if campaign.vendor:
        create_notification(
            vendor=campaign.vendor,
            category='koc',
            title=title,
            body=body,
        )


@api_view(['POST'])
@permission_classes([AllowAny])
def admin_force_close_mission(request):
    sync_expired_promoting_missions()

    admin_obj, mission, reason, err = _get_mission_for_admin_action(request)
    if err:
        return err

    if mission.stage == 'completed':
        return Response({
            'success': False,
            'err': '這個任務已經結束了'
        }, status=http_status.HTTP_400_BAD_REQUEST)

    previous_stage = mission.stage
    campaign = mission.application.campaign

    with transaction.atomic():
        mission.stage = 'completed'
        mission.end_reason = 'admin_closed'
        mission.save(update_fields=['stage', 'end_reason'])

        # 結案後優惠碼與推廣連結不能再使用
        CouponNew.objects.filter(kocmission=mission).update(status='inactive')

        AdminAuditLogs.objects.create(
            admin_id=admin_obj,
            action_type='admin_close_mission',
            tasks_id=str(mission.kocmission_id),
            koc=mission.koc,
            vendor=campaign.vendor,
            action_reason=f'{MISSION_STAGE_LABELS.get(previous_stage, previous_stage)} → 強制結案：{reason}',
        )

    _notify_mission_parties(
        mission,
        title='任務已由平台終止',
        body=f'案件「{campaign.name}」的任務已由平台終止，原因：{reason}',
    )

    return Response({
        'success': True,
        'err': '',
        'KOCMission_id': mission.kocmission_id,
        'Stage': STAGE_CODE_MAP.get(mission.stage),
    }, status=http_status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([AllowAny])
def admin_revert_mission_stage(request):
    sync_expired_promoting_missions()

    admin_obj, mission, reason, err = _get_mission_for_admin_action(request)
    if err:
        return err

    previous_stage = mission.stage
    target_stage = MISSION_REVERT_TARGET.get(previous_stage)
    if not target_stage:
        return Response({
            'success': False,
            'err': f'「{MISSION_STAGE_LABELS.get(previous_stage, previous_stage)}」階段的任務無法退回'
        }, status=http_status.HTTP_400_BAD_REQUEST)

    campaign = mission.application.campaign
    submissions = Submissions.objects.filter(kocmission=mission).order_by('-submitted_time')
    platform_feedback = f'平台退回：{reason}'

    with transaction.atomic():
        update_fields = ['stage']
        mission.stage = target_stage

        if previous_stage == 'reviewing':
            # 審核中 → 撰寫文案：把待審的文案標成退回，KOC 要重新提交
            pending_text = submissions.filter(submission_type='text', status='pending').first()
            if pending_text:
                pending_text.status = 'revising'
                pending_text.vendor_feedback = platform_feedback
                pending_text.save(update_fields=['status', 'vendor_feedback'])
        elif previous_stage == 'publishing':
            # 待發佈 → 審核中：撤銷文案的審核通過，讓廠商重新審核；
            # 優惠碼是在文案通過時啟用的，一起停用
            approved_text = submissions.filter(submission_type='text', status='approved').first()
            if approved_text:
                approved_text.status = 'pending'
                approved_text.reviewed_time = None
                approved_text.save(update_fields=['status', 'reviewed_time'])
            CouponNew.objects.filter(kocmission=mission).update(status='inactive')
        elif previous_stage == 'promoting':
            # 推廣中 → 待發佈：作品連結標成退回，KOC 要重新提交連結
            latest_link = submissions.filter(submission_type='link').first()
            if latest_link:
                latest_link.status = 'revising'
                latest_link.vendor_feedback = platform_feedback
                latest_link.save(update_fields=['status', 'vendor_feedback'])

        # 回到需要 KOC 交件的階段時，比照正常流程重新起算交件提醒期限
        if target_stage in ('writing', 'publishing'):
            mission.submission_deadline_at = timezone.now() + timedelta(days=SUBMISSION_REMINDER_DAYS)
            mission.submission_reminder_sent = False
            update_fields += ['submission_deadline_at', 'submission_reminder_sent']

        mission.save(update_fields=update_fields)

        AdminAuditLogs.objects.create(
            admin_id=admin_obj,
            action_type='admin_revert_mission_stage',
            tasks_id=str(mission.kocmission_id),
            koc=mission.koc,
            vendor=campaign.vendor,
            action_reason=(
                f'{MISSION_STAGE_LABELS[previous_stage]} → '
                f'{MISSION_STAGE_LABELS[target_stage]}：{reason}'
            ),
        )

    _notify_mission_parties(
        mission,
        title='任務階段已由平台調整',
        body=(
            f'案件「{campaign.name}」的任務已由平台退回到'
            f'「{MISSION_STAGE_LABELS[target_stage]}」，原因：{reason}'
        ),
    )

    return Response({
        'success': True,
        'err': '',
        'KOCMission_id': mission.kocmission_id,
        'Stage': STAGE_CODE_MAP.get(mission.stage),
    }, status=http_status.HTTP_200_OK)


# 查看全平台所有 KOC 任務
@api_view(['GET'])
@permission_classes([AllowAny])
def get_all_missions(request):
    sync_expired_promoting_missions()

    # 🔥 用 select_related 一次帶出 koc/user/活動/廠商，避免迴圈內逐一查詢
    missions = KOCMissionNew.objects.select_related(
        'koc__user',
        'application__campaign__vendor'
    ).order_by('-kocmission_id')

    result = []
    for mission in missions:
        campaign = mission.application.campaign

        result.append({
            "kocmission_id": str(mission.kocmission_id),
            "koc_id": mission.koc.koc_id if mission.koc else None,
            "koc_name": mission.koc.user.name if mission.koc else None,
            "vendor_name": campaign.vendor.company_name,
            "stage": STAGE_CODE_MAP.get(mission.stage),
            "deadline": campaign.end_date.strftime('%Y-%m-%d') if campaign.end_date else None,
        })

    return Response({
        "success": True,
        "err": "",
        "missions": result,
        "total": len(result)
    }, status=http_status.HTTP_200_OK)


# 查看使用推薦碼的訂單與對應分潤資料
@api_view(['GET'])
@permission_classes([AllowAny])
def get_earnings_tracking(request):
    # 只撈訂單有帶推薦碼、且已經產生分潤紀錄的 Earnings
    earnings_list = list(
        Earnings.objects.filter(order__isnull=False)
        .exclude(order__promotion_code__isnull=True)
        .exclude(order__promotion_code='')
        .select_related('order')
        .order_by('-created_at')
    )

    # 🔥 批次查出所有推薦碼對應的 KOC 姓名（CouponNew -> KOCMissionNew -> KOC -> User），避免迴圈內逐一查詢
    promotion_codes = {earning.order.promotion_code for earning in earnings_list}
    coupons = CouponNew.objects.filter(
        promotion_code__in=promotion_codes
    ).select_related('kocmission__koc__user')

    koc_name_map = {}
    for coupon in coupons:
        if coupon.promotion_code in koc_name_map:
            continue
        if coupon.kocmission and coupon.kocmission.koc and coupon.kocmission.koc.user:
            koc_name_map[coupon.promotion_code] = coupon.kocmission.koc.user.name

    result = []
    for earning in earnings_list:
        promotion_code = earning.order.promotion_code
        result.append({
            "promotion_code": promotion_code,
            "koc_name": koc_name_map.get(promotion_code),
            "order_id": str(earning.order.order_id),
            "order_total": float(earning.order.total_amount),
            "order_created_at": earning.order.created_at,
            "amount": earning.amount,
            # 舊資料沒有 original_amount，以 amount 代替；部分退款時兩者會不同
            "original_amount": (
                earning.original_amount
                if earning.original_amount is not None
                else earning.amount
            ),
            "status": earning.status,
        })

    return Response({
        "success": True,
        "err": "",
        "tracking": result,
        "total": len(result)
    }, status=http_status.HTTP_200_OK)


# ── 平台管理員登入 ──
@api_view(['POST'])
@permission_classes([AllowAny])
def admin_login(request):
    from django.utils import timezone
    email = request.data.get('Email')
    password = request.data.get('Password')

    if not email or not password:
        return Response(
            {'success': False, 'err': 'Email 和 Password 為必填'},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        admin = Admins.objects.get(email=email)
    except Admins.DoesNotExist:
        return Response(
            {'success': False, 'err': '帳號或密碼錯誤'},
            status=status.HTTP_401_UNAUTHORIZED
        )

    if not check_password(password, admin.password):
        return Response(
            {'success': False, 'err': '帳號或密碼錯誤'},
            status=status.HTTP_401_UNAUTHORIZED
        )

    admin.last_login_at = timezone.now()
    admin.save()

    return Response({
        'success': True,
        'Admin_id': admin.admin_id,
        'Name': admin.name,
        'Email': admin.email,
        'Role': admin.role,
        'Status': admin.status,
        'Last_login_at': admin.last_login_at,
    }, status=status.HTTP_200_OK)


# ── 新增管理員帳號（只有 super_admin 可以） ──
# POST /platform/admins/create
# Body: Admin_id（操作者）, Name, Email, Password, Role（reviewer / finance / super_admin）
ADMIN_ACCOUNT_ROLES = {'reviewer', 'finance', 'super_admin'}
ADMIN_ROLE_LABELS = {'reviewer': '審核員', 'finance': '財務管理', 'super_admin': '超級管理員'}
ADMIN_PASSWORD_MIN_LENGTH = 8


@api_view(['POST'])
@permission_classes([AllowAny])
def admin_create_account(request):
    operator, err = require_admin_role(request, {'super_admin'}, source='data')
    if err:
        return err

    name = (request.data.get('Name') or '').strip()
    email = (request.data.get('Email') or '').strip().lower()
    password = request.data.get('Password') or ''
    role = normalize_admin_role(request.data.get('Role'))

    if not name or not email or not password:
        return Response({
            'success': False,
            'err': '姓名、信箱與初始密碼皆為必填'
        }, status=status.HTTP_400_BAD_REQUEST)
    if role not in ADMIN_ACCOUNT_ROLES:
        return Response({
            'success': False,
            'err': '請選擇有效的管理員角色'
        }, status=status.HTTP_400_BAD_REQUEST)
    if len(password) < ADMIN_PASSWORD_MIN_LENGTH:
        return Response({
            'success': False,
            'err': f'初始密碼至少需要 {ADMIN_PASSWORD_MIN_LENGTH} 個字元'
        }, status=status.HTTP_400_BAD_REQUEST)
    if Admins.objects.filter(email__iexact=email).exists():
        return Response({
            'success': False,
            'err': '這個信箱已經是管理員帳號'
        }, status=status.HTTP_400_BAD_REQUEST)

    with transaction.atomic():
        new_admin = Admins.objects.create(
            name=name,
            email=email,
            password=make_password(password),
            role=role,
            status='active',
        )
        AdminAuditLogs.objects.create(
            admin_id=operator,
            action_type='create_admin',
            action_reason=f'建立{ADMIN_ROLE_LABELS[role]}帳號：{name}（{email}）',
        )

    return Response({
        'success': True,
        'err': '',
        'Admin_id': new_admin.admin_id,
        'Name': new_admin.name,
        'Email': new_admin.email,
        'Role': new_admin.role,
    }, status=status.HTTP_201_CREATED)


# ── 查看一般使用者列表 ──
@api_view(['GET'])
@permission_classes([AllowAny])
def get_consumers(request):
    user_id = request.query_params.get('User_id', None)
    role = request.query_params.get('Role', None)
    email = request.query_params.get('Email', None)

    users = User.objects.all()

    if user_id:
        users = users.filter(user_id=user_id)
    if role is not None:
        users = users.filter(role=str(role))
    if email:
        users = users.filter(email=email)

    result = []
    for u in users:
        result.append({
            'User_id': u.user_id,
            'Role': u.role,
            'Name': u.name,
            'Email': u.email,
            'Phone': u.phone,
            'Created_At': u.created_at,
        })

    return Response(result, status=status.HTTP_200_OK)


# ── 查看使用者訂單資料 ──
@api_view(['GET'])
@permission_classes([AllowAny])
def get_consumer_orders(request):
    user_id = request.query_params.get('User_id', None)
    order_id = request.query_params.get('Order_id', None)
    payment_status = request.query_params.get('payment_status', None)

    orders = Order.objects.all()

    if user_id:
        orders = orders.filter(user_id=user_id)
    if order_id:
        orders = orders.filter(order_id=order_id)
    if payment_status:
        orders = orders.filter(payment_status=payment_status)

    result = []
    for o in orders:
        result.append({
            'Order_id': str(o.order_id),
            'User_id': o.user_id,
            'Guest_id': o.guest_id,
            'Promotion_code': o.promotion_code,
            'total_amount': float(o.total_amount),
            'order_status': o.order_status,
            'payment_status': o.payment_status,
            'shipping_status': o.shipping_status,
            'Address_id': o.address_id,
            'created_at': o.created_at,
        })

    return Response(result, status=status.HTTP_200_OK)


# ── 查看訂單與付款資料 ──
@api_view(['GET'])
@permission_classes([AllowAny])
def get_payments(request):
    """
    改成直接從 Order + PaymentTransaction 組資料，不再讀舊版 Payment model。
    基準從「有 Payment 紀錄的訂單」變成「全部訂單」——包含還沒付款的，
    這樣後台才看得到卡在待付款狀態的訂單，用 payment_status=unpaid 篩選即可排除。
    走綠界的訂單用 PaymentTransaction 補上付款方式/交易編號；
    走舊版轉帳/貨到付款流程的訂單沒有 PaymentTransaction，退回顯示 Order.payment_status，
    付款方式留空——那條舊流程唯一記錄「轉帳」/「貨到付款」字樣的地方(Payment.payment_method)
    現在沒讀了，這個資訊目前無法從 Order/PaymentTransaction 還原。
    """
    _admin_obj, err = require_admin_role(request, FINANCE_ADMIN_ROLES, source='query')
    if err:
        return err

    order_id = request.query_params.get('Order_id', None)
    payment_transaction_id = request.query_params.get('Payment_id', None)
    payment_status = request.query_params.get('payment_status', None)

    # prefetch_related 一次撈完全部訂單的 PaymentTransaction，避免對每筆訂單各查一次（N+1）
    orders = Order.objects.all().prefetch_related('payment_transactions')

    if order_id:
        orders = orders.filter(order_id=order_id)
    if payment_status:
        orders = orders.filter(payment_status=payment_status)
    if payment_transaction_id:
        orders = orders.filter(payment_transactions__payment_transaction_id=payment_transaction_id)

    result = []
    for o in orders:
        payment_tx = pick_relevant_payment(o.payment_transactions.all())

        result.append({
            'Order_id': str(o.order_id),
            'User_id': o.user_id,
            'Guest_id': o.guest_id,
            'Promotion_code': o.promotion_code,
            'total_amount': float(o.total_amount),
            'order_status': o.order_status,
            'payment_status': payment_tx.status if payment_tx else o.payment_status,
            'shipping_status': o.shipping_status,
            'Address_id': o.address_id,
            'created_at': o.created_at,
            'Payment_id': payment_tx.payment_transaction_id if payment_tx else None,
            'payment_method': '信用卡' if payment_tx else None,
            'transaction_id': payment_tx.ecpay_trade_no if payment_tx else None,
        })

    return Response(result, status=status.HTTP_200_OK)


# ── 查看交易紀錄 ──
# 修正：原本這裡讀的是 t.wallets_id，但 Transactions 已經改成 koc_wallet /
# vendor_wallet 兩個各自獨立的外鍵（多型設計，見 models.py 裡的說明），沒有
# 叫 wallets_id 的欄位，原本的寫法會直接噴 AttributeError，是壞的。
# 改成用 koc_wallet / vendor_wallet 哪個有值來判斷這筆交易屬於哪種錢包，
# 順便把持有人名稱帶出來，後台列表才看得出這筆錢是誰的。
@api_view(['GET'])
@permission_classes([AllowAny])
def get_transactions(request):
    _admin_obj, err = require_admin_role(request, FINANCE_ADMIN_ROLES, source='query')
    if err:
        return err

    transaction_id = request.query_params.get('Transaction_ID', None)
    wallet_type = request.query_params.get('Wallet_type', None)  # 'koc' 或 'vendor'，選填
    wallets_id = request.query_params.get('Wallets_id', None)
    reference_type = request.query_params.get('Reference_type', None)

    transactions = (
        Transactions.objects
        .select_related('koc_wallet__koc__user', 'vendor_wallet__vendor')
        .order_by('-created_at')
    )

    if transaction_id:
        transactions = transactions.filter(transaction_id=transaction_id)
    if reference_type:
        transactions = transactions.filter(reference_type=reference_type)

    if wallet_type == 'koc':
        transactions = transactions.filter(koc_wallet__isnull=False)
        if wallets_id:
            transactions = transactions.filter(koc_wallet_id=wallets_id)
    elif wallet_type == 'vendor':
        transactions = transactions.filter(vendor_wallet__isnull=False)
        if wallets_id:
            transactions = transactions.filter(vendor_wallet_id=wallets_id)

    result = []
    for t in transactions:
        if t.koc_wallet_id:
            owner_type = 'koc'
            owner_wallet_id = t.koc_wallet_id
            owner_id = t.koc_wallet.koc_id
            owner_name = (
                t.koc_wallet.koc.user.display_name
                or t.koc_wallet.koc.user.name
            ) if t.koc_wallet.koc and t.koc_wallet.koc.user else t.koc_wallet.koc_id
        else:
            owner_type = 'vendor'
            owner_wallet_id = t.vendor_wallet_id
            owner_id = t.vendor_wallet.vendor_id
            owner_name = t.vendor_wallet.vendor.company_name if t.vendor_wallet.vendor else t.vendor_wallet.vendor_id

        result.append({
            'Transaction_ID': t.transaction_id,
            'Wallet_type': owner_type,
            'Wallets_id': owner_wallet_id,
            'Owner_id': owner_id,
            'Owner_name': owner_name,
            'Type': t.type,
            'Amount': t.amount,
            'Gross_amount': t.gross_amount,
            'Fee_amount': t.fee_amount,
            'Platform_fee_display': t.platform_fee_display,
            'Koc_commission_fee_display': t.koc_commission_fee_display,
            'Reference_type': t.reference_type,
            'Reference_id': t.reference_id,
            'created_at': t.created_at,
        })

    return Response(result, status=status.HTTP_200_OK)


# 操作紀錄 action_type 的中文名稱（平台總覽「最新系統動態」顯示用）
AUDIT_ACTION_LABELS = {
    'approve_koc': '核准 KOC 申請',
    'reject_koc': '退回 KOC 申請',
    'approve_vendor': '核准廠商入駐',
    'reject_vendor': '退回廠商申請',
    'review_vendor': '更新廠商審核狀態',
    'generate_vendor_monthly_settlement': '產生廠商貨款月結單',
    'confirm_vendor_settlement_paid': '確認廠商貨款已撥付',
    'confirm_vendor_settlement_failed': '廠商貨款撥付失敗',
    'generate_vendor_monthly_payout_batch': '產生廠商月撥款批次',
    'confirm_vendor_monthly_payout': '確認廠商月撥款',
    'vendor_monthly_payout_failed': '廠商月撥款失敗',
    'confirm_koc_payout_completed': '確認 KOC 撥款完成',
    'confirm_koc_payout_failed': 'KOC 撥款失敗',
    'settle_campaign_earnings': '結算活動分潤',
    'resolve_return_dispute_approve': '退貨爭議：同意退款',
    'resolve_return_dispute_reject': '退貨爭議：維持拒絕',
    'notify_vendor_review_overdue': '提醒廠商審核逾期',
    'create_admin': '新增管理員帳號',
    'admin_close_mission': '強制結案 KOC 任務',
    'admin_revert_mission_stage': '退回 KOC 任務階段',
}


# ── 查看管理員操作紀錄 ──
# 選填 limit：只取最新 N 筆（平台總覽用）
@api_view(['GET'])
@permission_classes([AllowAny])
def get_audit_logs(request):
    admin_id = request.query_params.get('Admin_id', None)
    action_type = request.query_params.get('Action_type', None)
    vendor_id = request.query_params.get('Vendor_id', None)
    influencer_id = request.query_params.get('Influencer_id', None)
    limit = request.query_params.get('limit', None)

    logs = AdminAuditLogs.objects.select_related('admin_id').order_by('-created_at')

    if admin_id:
        logs = logs.filter(admin_id=admin_id)
    if action_type:
        logs = logs.filter(action_type=action_type)
    if vendor_id:
        logs = logs.filter(vendor_id=vendor_id)
    if influencer_id:
        logs = logs.filter(koc_id=influencer_id)
    if limit and limit.isdigit():
        logs = logs[:int(limit)]

    result = []
    for log in logs:
        result.append({
            'Log_id': log.log_id,
            'Admin_id': log.admin_id.admin_id,
            'Admin_name': log.admin_id.name,
            'Action_type': log.action_type,
            'Action_label': AUDIT_ACTION_LABELS.get(log.action_type, log.action_type),
            'Submission_id': log.submission_id,
            'Tasks_id': log.tasks_id,
            'Influencer_id': log.koc_id,
            'Vendor_id': log.vendor_id,
            'Action_reason': log.action_reason,
            'created_at': log.created_at,
        })

    return Response(result, status=status.HTTP_200_OK)


# ==============================================================================
# 退貨爭議：廠商拒絕退貨後，消費者提出爭議（見 consumer.py 的
# dispute_return_request），status 會變成 'disputed'，這裡是 Admin 端的
# 判定入口。
# GET  /platform/returns/disputes          列出待判定的爭議
# POST /platform/returns/disputes/resolve  判定同意退款或維持拒絕

@api_view(['GET'])
@permission_classes([AllowAny])
def admin_list_return_disputes(request):
    _admin_obj, err = require_admin_role(request, FINANCE_ADMIN_ROLES, source='query')
    if err:
        return err

    disputes = (
        ReturnRequest.objects
        .filter(status='disputed')
        .select_related('order', 'user')
        .order_by('-requested_at')
    )

    result = []
    for r in disputes:
        result.append({
            'Return_id': str(r.return_id),
            'Order_id': str(r.order_id),
            'User_id': r.user_id,
            'Reason': r.reason,
            'Description': r.description,
            'Requested_amount': str(r.requested_amount),
            'Vendor_note': r.vendor_note,
            'Requested_at': r.requested_at,
        })

    return Response(result, status=status.HTTP_200_OK)

@api_view(['POST'])
@permission_classes([AllowAny])
def admin_resolve_return_dispute(request):
    """
    Admin 判定爭議退貨。

    跟 vendor.py 的 vendor_return_process_refund 用同一套安全模式：
    整段包在 transaction.atomic 裡、退款帳務失敗就整筆 rollback，不會
    出現「ReturnRequest 已經是 refunded，但錢其實沒收回成功」的不一致
    ——這支原本沒有這層保護，是這次補上的，跟 vendor_return_process_refund
    當初漏改成同一套模式一樣的問題。

    第一版只支援整張訂單全額退款、單一廠商訂單，跟
    reverse_earning_and_vendor_income_for_return 的限制一致；Admin 不能
    透過 Refunded_amount 帶出跟訂單總額不同的金額，理由跟 vendor 端一樣：
    避免用還沒做的部分退款/多廠商拆帳邏輯誤扣帳。
    """
    admin_obj, err = require_admin_role(request, FINANCE_ADMIN_ROLES, source='data')
    if err:
        return err

    return_id = request.data.get('Return_id')
    decision = request.data.get('Decision')  # 'approve_refund' 或 'reject'
    admin_note = request.data.get('Admin_note', '')

    if not return_id or decision not in ('approve_refund', 'reject'):
        return Response({
            'success': False,
            'err': 'Return_id 為必填，Decision 必須是 approve_refund 或 reject'
        }, status=status.HTTP_400_BAD_REQUEST)

    try:
        with transaction.atomic():
            try:
                return_request = (
                    ReturnRequest.objects
                    .select_for_update()
                    .select_related('order')
                    .get(return_id=return_id)
                )
            except ReturnRequest.DoesNotExist:
                return Response({
                    'success': False,
                    'err': '找不到此退貨申請'
                }, status=status.HTTP_404_NOT_FOUND)

            if return_request.status != 'disputed':
                return Response({
                    'success': False,
                    'err': f'此退貨申請目前狀態是「{return_request.status}」，不是爭議中，無法在這裡判定'
                }, status=status.HTTP_400_BAD_REQUEST)

            if decision == 'reject':
                return_request.status = 'rejected'
                return_request.rejected_at = timezone.now()
                return_request.admin = admin_obj
                return_request.admin_note = admin_note
                return_request.save(
                    update_fields=['status', 'rejected_at', 'admin', 'admin_note']
                )

                AdminAuditLogs.objects.create(
                    admin_id=admin_obj,
                    action_type='resolve_return_dispute_reject',
                    action_reason=f'爭議退貨 {return_id} 判定維持拒絕退款，原因：{admin_note}',
                )

                return Response({
                    'success': True,
                    'err': '',
                    'return_id': str(return_request.return_id),
                    'status': return_request.status,
                }, status=status.HTTP_200_OK)

            # decision == 'approve_refund'
            # 同一個 transaction 內重新確認是單一廠商訂單，避免並發下資料被改動
            vendor_ids = set(
                OrderItem.objects.filter(order=return_request.order)
                .values_list('product__vendor_id', flat=True)
            )
            if len(vendor_ids) != 1:
                return Response({
                    'success': False,
                    'err': '目前整張訂單退款僅支援單一廠商訂單；此訂單包含多個廠商商品，無法在此判定退款'
                }, status=status.HTTP_400_BAD_REQUEST)

            order_total = Decimal(str(return_request.order.total_amount))
            if order_total <= 0:
                return Response({
                    'success': False,
                    'err': '訂單總金額異常，無法退款'
                }, status=status.HTTP_400_BAD_REQUEST)

            # 第一版只支援整張訂單全額退款，不接受 Admin 帶出跟訂單總額
            # 不同的金額——理由跟 vendor_return_process_refund 一樣。
            return_request.refunded_amount = order_total
            return_request.admin = admin_obj
            return_request.admin_note = admin_note
            return_request.status = 'refunding'
            return_request.save(
                update_fields=['refunded_amount', 'admin', 'admin_note', 'status']
            )

            reversal_result = reverse_earning_and_vendor_income_for_return(return_request)
            if not reversal_result.get('success'):
                # 丟例外讓 transaction.atomic rollback：refunding、refunded_amount、
                # 錢包與 Transactions 都一起回到判定前的狀態，不會卡在半套狀態。
                raise ValueError(
                    reversal_result.get('message') or '退款帳務處理失敗'
                )

            return_request.status = 'refunded'
            return_request.refunded_at = timezone.now()
            return_request.save(update_fields=['status', 'refunded_at'])

            AdminAuditLogs.objects.create(
                admin_id=admin_obj,
                action_type='resolve_return_dispute_approve',
                action_reason=(
                    f'爭議退貨 {return_id} 判定同意退款 NT$ {order_total}，'
                    f'原因：{admin_note}'
                ),
            )

        return Response({
            'success': True,
            'err': '',
            'return_id': str(return_request.return_id),
            'status': return_request.status,
            'refund_scope': 'full_order',
            'refunded_amount': str(order_total),
            'reversal': reversal_result,
        }, status=status.HTTP_200_OK)

    except ValueError as error:
        return Response({
            'success': False,
            'err': str(error)
        }, status=status.HTTP_400_BAD_REQUEST)
    except Exception:
        return Response({
            'success': False,
            'err': internal_error_message('退款帳務處理失敗')
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ==============================================================================
# 勞務報酬單（勞報單）審核
# ==============================================================================

@api_view(['GET'])
@permission_classes([AllowAny])
def admin_get_tax_forms(request):
    """
    勞報單列表，給平台/財務審核用。
    URL: /platform/taxForms/getlist?status=pending_review（status 可省略，省略就回全部）
    """
    status_filter = request.query_params.get('status')

    valid_statuses = {choice[0] for choice in RemunerationForm.STATUS_CHOICES}
    if status_filter and status_filter not in valid_statuses:
        return Response({
            'success': False,
            'err': f"status 必須是 {', '.join(sorted(valid_statuses))} 其中之一"
        }, status=status.HTTP_400_BAD_REQUEST)

    forms = RemunerationForm.objects.select_related('koc__user').order_by('-submitted_at')

    if status_filter:
        forms = forms.filter(status=status_filter)

    result = []
    for form in forms:
        koc_user = form.koc.user if form.koc else None

        result.append({
            'form_id': form.form_id,
            'koc_id': form.koc_id,
            'koc_name': (koc_user.display_name or koc_user.name) if koc_user else '',
            'service_content': REMUNERATION_SERVICE_CONTENT,
            'amount': form.amount,
            'status': form.status,
            'cloud_link_url': form.cloud_link_url,
            'submitted_at': form.submitted_at,
            'reviewed_at': form.reviewed_at,
            'reject_reason': form.reject_reason,
        })

    return Response({
        'success': True,
        'err': '',
        'forms': result,
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([AllowAny])
def admin_review_tax_form(request):
    """
    平台/財務審核勞報單：通過或退回。
    URL: /platform/taxForms/review

    Request:
    {
        "form_id": 1,
        "admin_id": "1",
        "action": "approve" | "reject",
        "reject_reason": "連結權限未開放"   # action=reject 時必填
    }
    """
    form_id = request.data.get('form_id')
    admin_id = request.data.get('admin_id')
    action = request.data.get('action')
    reject_reason = (request.data.get('reject_reason') or '').strip()

    if not form_id:
        return Response({'success': False, 'err': 'form_id is required'}, status=status.HTTP_400_BAD_REQUEST)
    if not admin_id:
        return Response({'success': False, 'err': 'admin_id is required'}, status=status.HTTP_400_BAD_REQUEST)
    if action not in ('approve', 'reject'):
        return Response({'success': False, 'err': "action 必須是 'approve' 或 'reject'"}, status=status.HTTP_400_BAD_REQUEST)
    if action == 'reject' and not reject_reason:
        return Response({'success': False, 'err': '退回時必須填寫原因'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        form = RemunerationForm.objects.select_related('koc__user').get(form_id=form_id)
    except RemunerationForm.DoesNotExist:
        return Response({'success': False, 'err': '找不到對應的勞報單'}, status=status.HTTP_404_NOT_FOUND)

    if form.status == 'approved':
        return Response({'success': False, 'err': '此勞報單已經審核通過，無法再次審核'}, status=status.HTTP_400_BAD_REQUEST)

    form.status = 'approved' if action == 'approve' else 'rejected'
    form.reviewed_at = timezone.now()
    form.reviewed_by_admin_id = str(admin_id)
    form.reject_reason = reject_reason if action == 'reject' else None
    form.save(update_fields=['status', 'reviewed_at', 'reviewed_by_admin_id', 'reject_reason'])

    if action == 'reject':
        koc_user = form.koc.user if form.koc else None
        if koc_user and koc_user.email:
            try:
                send_tax_form_rejected_email(koc_user, form.amount, reject_reason)
            except Exception:
                logger.exception('勞報單退回通知信寄送失敗：form_id=%s', form.form_id)

    if form.koc:
        create_notification(
            user=form.koc.user,
            category='koc',
            title='勞務報酬單審核通過' if action == 'approve' else '勞務報酬單被退回',
            body=(
                f'您申報的 NT$ {form.amount:,} 勞務報酬單已審核通過。'
                if action == 'approve'
                else f'您申報的 NT$ {form.amount:,} 勞務報酬單被退回：{reject_reason}'
            ),
            reference_type='tax_form_records',
        )

    return Response({
        'success': True,
        'err': '',
        'form_id': form.form_id,
        'status': form.status,
    }, status=status.HTTP_200_OK)


# ==============================================================================
# 廠商審核逾期列表：後台用，列出「底下有待審文案、且最早一筆已超過 5 天未審完」
# 的廠商，給後台一個總覽 + 一顆手動重寄提醒信按鈕。
# GET /platform/vendor/review-overdue
# ==============================================================================

VENDOR_REVIEW_DEADLINE_DAYS = 5


@api_view(['GET'])
@permission_classes([AllowAny])
def admin_list_vendor_review_overdue(request):
    _admin_obj, err = require_admin_role(request, FINANCE_ADMIN_ROLES, source='query')
    if err:
        return err

    now = timezone.now()

    earliest_by_vendor = (
        Submissions.objects
        .filter(status="pending", submitted_time__isnull=False)
        .values("kocmission__application__campaign__vendor_id")
        .annotate(earliest_submitted=Min("submitted_time"))
    )

    result = []
    for row in earliest_by_vendor:
        vendor_id = row["kocmission__application__campaign__vendor_id"]
        earliest_submitted = row["earliest_submitted"]
        deadline = earliest_submitted + timedelta(days=VENDOR_REVIEW_DEADLINE_DAYS)

        if now < deadline:
            continue

        vendor = Vendor.objects.filter(vendor_id=vendor_id).first()
        if not vendor:
            continue

        pending_count = Submissions.objects.filter(
            status="pending",
            kocmission__application__campaign__vendor_id=vendor_id,
        ).count()

        result.append({
            'vendor_id': vendor.vendor_id,
            'vendor_name': vendor.company_name,
            'pending_count': pending_count,
            'earliest_submitted_at': earliest_submitted,
            'deadline': deadline,
            'overdue_days': (now - deadline).days,
        })

    result.sort(key=lambda r: r['earliest_submitted_at'])

    return Response({
        'success': True,
        'err': '',
        'vendors': result,
    }, status=status.HTTP_200_OK)


# ==============================================================================
# 手動重新寄送廠商審核逾期提醒信：後台用，不受排程指令的「同一批只提醒一次」限制，
# 管理員可以隨時手動再寄一次。
# POST /platform/vendor/review-overdue/notify
# ==============================================================================

@api_view(['POST'])
@permission_classes([AllowAny])
def admin_notify_vendor_review_overdue(request):
    admin_obj, err = require_admin_role(request, FINANCE_ADMIN_ROLES, source='data')
    if err:
        return err

    vendor_id = request.data.get('vendor_id')
    if not vendor_id:
        return Response({
            'success': False,
            'err': 'vendor_id 為必填',
        }, status=status.HTTP_400_BAD_REQUEST)

    try:
        vendor = Vendor.objects.get(vendor_id=vendor_id)
    except Vendor.DoesNotExist:
        return Response({
            'success': False,
            'err': '找不到此廠商',
        }, status=status.HTTP_404_NOT_FOUND)

    pending_submissions = Submissions.objects.filter(
        status="pending",
        kocmission__application__campaign__vendor_id=vendor_id,
    )
    pending_count = pending_submissions.count()

    if pending_count == 0:
        return Response({
            'success': False,
            'err': '此廠商目前沒有待審核文案',
        }, status=status.HTTP_400_BAD_REQUEST)

    earliest_submitted = pending_submissions.filter(submitted_time__isnull=False).order_by('submitted_time').first().submitted_time

    try:
        send_vendor_review_overdue_email(vendor, pending_count, earliest_submitted)
    except Exception:
        return Response({
            'success': False,
            'err': internal_error_message('提醒信寄送失敗'),
        }, status=status.HTTP_502_BAD_GATEWAY)

    # 手動重寄後，也更新記錄，避免排程指令緊接著又寄一次重複的信
    vendor.last_review_reminder_batch_time = earliest_submitted
    vendor.save(update_fields=['last_review_reminder_batch_time'])

    AdminAuditLogs.objects.create(
        admin_id=admin_obj,
        action_type='notify_vendor_review_overdue',
        vendor=vendor,
        action_reason=f'手動重新寄送審核逾期提醒信，待審文案 {pending_count} 筆',
    )

    return Response({
        'success': True,
        'err': '',
    }, status=status.HTTP_200_OK)

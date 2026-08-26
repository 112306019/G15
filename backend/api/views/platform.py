import logging
import csv
import io
from django.http import HttpResponse
from django.contrib.auth.hashers import check_password
from decimal import Decimal, ROUND_HALF_UP
from datetime import timedelta

from django.utils import timezone
from django.db import transaction
from django.db.models import Sum

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status
from rest_framework import status as http_status

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
    VendorPayouts,
    Payouts

)

from api.serializers import KOCApproveSerializer, KOCRejectSerializer, KOCMissionStageUpdateSerializer
from api.views.constants import ROLE_CODE_MAP, STAGE_CODE_MAP, EARNINGS_STATUS_CODE_MAP, EARNINGS_STATUS_CHOICES_MAP, VENDOR_SETTLEMENT_HOLD_DAYS, sync_expired_promoting_missions
from api.emails import send_koc_approval_email, send_vendor_approval_email
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
    normalized_role = (admin_obj.role or '').strip().lower()
    normalized_allowed = {r.strip().lower() for r in allowed_roles}

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
    """
    訂單完成後計算並寫入 KOC 分潤。

    暫時沿用現有 Earnings model：
    - 不修改 amount 欄位型態
    - 透過程式檢查避免重複建立
    """

    promotion_code = (
        order.promotion_code or ""
    ).strip()

    if not promotion_code:
        return {
            "created": False,
            "earning": None,
            "commission_amount": 0,
            "message": "訂單未使用優惠碼"
        }

    try:
        coupon = (
            CouponNew.objects
            .select_related(
                "kocmission__koc__user",
                "kocmission__application__campaign"
            )
            .get(
                promotion_code=promotion_code
            )
        )
    except CouponNew.DoesNotExist:
        return {
            "created": False,
            "earning": None,
            "commission_amount": 0,
            "message": "找不到優惠碼"
        }

    if coupon.status != "active":
        return {
            "created": False,
            "earning": None,
            "commission_amount": 0,
            "message": "優惠碼尚未啟用"
        }

    mission = coupon.kocmission

    if not mission.koc_id:
        raise ValueError(
            "此任務沒有綁定 KOC"
        )

    if not mission.koc or not mission.koc.user:
        raise ValueError(
            "找不到 KOC 對應的使用者"
        )

    # 程式層避免同一張訂單重複建立分潤
    existing_earning = (
        Earnings.objects
        .filter(
            order=order,
            kocmission=mission
        )
        .first()
    )

    if existing_earning:
        return {
            "created": False,
            "earning": existing_earning,
            "commission_amount": (
                existing_earning.amount
            ),
            "message": "此訂單已計算過分潤"
        }

    campaign = (
        mission.application.campaign
    )

    # 分潤比例要看每個商品自己在 CampaignProduct 裡的 koc_commission_rate，
    # 不是 coupon 自己的欄位——不同商品在同一個活動裡可以有不同的分潤比例。
    campaign_products_by_product_id = {
        cp.product_id: cp
        for cp in CampaignProduct.objects.filter(campaign=campaign)
    }

    commission_items = list(
        OrderItem.objects
        .filter(
            order=order,
            product_id__in=campaign_products_by_product_id.keys()
        )
    )

    if not commission_items:
        return {
            "created": False,
            "earning": None,
            "commission_amount": 0,
            "message": "沒有符合活動的訂單商品"
        }

    raw_commission = Decimal("0.00")
    for item in commission_items:
        campaign_product = campaign_products_by_product_id[item.product_id]
        item_subtotal = Decimal(str(item.subtotal))
        item_rate = Decimal(str(campaign_product.koc_commission_rate))
        raw_commission += item_subtotal * item_rate / Decimal("100")

    # 目前 Earnings.amount 若是 IntegerField，
    # 先四捨五入成整數
    commission_amount = int(
        raw_commission.quantize(
            Decimal("1"),
            rounding=ROUND_HALF_UP
        )
    )

    if commission_amount <= 0:
        return {
            "created": False,
            "earning": None,
            "commission_amount": 0,
            "message": "計算後分潤為 0"
        }

    earning = Earnings.objects.create(
        user=mission.koc.user,
        kocmission=mission,
        order=order,
        amount=commission_amount,
        status=EARNINGS_STATUS_CHOICES_MAP["pending"]
    )

    # 分潤剛算出來時，錢還不能直接動用：先記錄在 KOC 錢包的
    # 凍結餘額（balance_frozen），等活動正式結算（見
    # admin_settle_campaign_earnings）才會轉成可提領餘額。
    wallet, _ = KocWallet.objects.get_or_create(koc=mission.koc)
    wallet.balance_frozen = wallet.balance_frozen + commission_amount
    wallet.save(update_fields=["balance_frozen", "updated_at"])

    coupon.usage_count = (
        coupon.usage_count or 0
    ) + 1

    coupon.save(
        update_fields=[
            "usage_count",
        ]
    )

    return {
        "created": True,
        "earning": earning,
        "commission_amount": (
            commission_amount
        ),
        "message": "分潤建立成功"
    }


# ==============================================================================
# 廠商入帳：訂單付款完成後，依廠商分組計算「廠商應得淨額」並存入凍結餘額
# 淨額 = 該廠商商品小計 - 這筆訂單已計算給 KOC 的分潤(若該分潤屬於同一廠商的活動) - 平台手續費
#
# 呼叫時機：跟 calculate_order_commission 同一個觸發點（consumer.py 的
# update_order_status，訂單第一次被標記 order_status='completed' 的地方）。
# 兩個函式一起呼叫，順序固定：先算 KOC 分潤，再算廠商淨額（廠商淨額要扣掉
# 剛才算出來的 KOC 分潤）：
#   commission_result = calculate_order_commission(order)
#   vendor_results = calculate_vendor_earning(order)
# ==============================================================================

def calculate_vendor_earning(order):
    """
    訂單付款完成後，把錢分帳給訂單裡涉及的每一個廠商（同一張訂單可能有多個廠商的商品）。
    這筆錢先進 VendorWallet.balance_frozen（鑑賞期內不可提領），
    等 admin_settle_vendor_earnings 結算後才會轉進 balance_available。
    """

    order_items = (
        OrderItem.objects
        .filter(order=order)
        .select_related("product")
    )

    if not order_items:
        return []

    # 依商品所屬廠商分組
    items_by_vendor = {}
    for item in order_items:
        vendor_id = item.product.vendor_id
        items_by_vendor.setdefault(vendor_id, []).append(item)

    # 這筆訂單如果有算過 KOC 分潤，抓出來看是哪個活動（用來判斷分潤該從哪個廠商的淨額扣除）
    order_earning = (
        Earnings.objects
        .select_related("kocmission__application__campaign__vendor")
        .filter(order=order)
        .first()
    )
    commission_vendor_id = None
    commission_amount = 0
    if order_earning and order_earning.kocmission:
        campaign = order_earning.kocmission.application.campaign
        if campaign and campaign.vendor_id:
            commission_vendor_id = campaign.vendor_id
            commission_amount = order_earning.amount

    results = []

    for vendor_id, items in items_by_vendor.items():
        # 同一筆訂單、同一廠商，避免重複入帳（可能被呼叫兩次，例如重試付款 webhook）
        already_credited = Transactions.objects.filter(
            vendor_wallet__vendor_id=vendor_id,
            type="order_income",
            reference_type="order",
            reference_id=str(order.order_id)
        ).exists()

        if already_credited:
            results.append({
                "vendor_id": vendor_id,
                "created": False,
                "message": "此訂單已對該廠商入帳過"
            })
            continue

        try:
            vendor = Vendor.objects.get(vendor_id=vendor_id)
        except Vendor.DoesNotExist:
            results.append({
                "vendor_id": vendor_id,
                "created": False,
                "message": "找不到廠商"
            })
            continue

        items_subtotal = sum(Decimal(str(i.subtotal)) for i in items)

        fee_rate = Decimal(str(vendor.platform_fee_rate or 0))
        platform_fee = (items_subtotal * fee_rate / Decimal("100")).quantize(
            Decimal("1"), rounding=ROUND_HALF_UP
        )

        koc_deduction = Decimal("0")
        if vendor_id == commission_vendor_id:
            koc_deduction = Decimal(str(commission_amount))

        net_amount = int(
            (items_subtotal - platform_fee - koc_deduction).quantize(
                Decimal("1"), rounding=ROUND_HALF_UP
            )
        )

        if net_amount <= 0:
            results.append({
                "vendor_id": vendor_id,
                "created": False,
                "message": "計算後廠商淨額為 0 或負數"
            })
            continue

        with transaction.atomic():
            wallet, _ = VendorWallet.objects.select_for_update().get_or_create(
                vendor=vendor
            )
            wallet.balance_frozen = wallet.balance_frozen + net_amount
            wallet.save(update_fields=["balance_frozen", "updated_at"])

            Transactions.objects.create(
                vendor_wallet=wallet,
                type="order_income",
                amount=net_amount,
                gross_amount=int(items_subtotal),
                fee_amount=int(platform_fee + koc_deduction),
                reference_type="order",
                reference_id=str(order.order_id)
            )

        results.append({
            "vendor_id": vendor_id,
            "created": True,
            "items_subtotal": int(items_subtotal),
            "platform_fee": int(platform_fee),
            "koc_commission_deducted": int(koc_deduction),
            "net_amount": net_amount
        })

    return results


# ==============================================================================
# 廠商結算：出貨完成滿 N 天鑑賞期後，把廠商凍結餘額轉成可提領餘額
# POST /platform_admin/vendor/settle-earnings
#
# 用途：出貨後鑑賞期過了，才能把「已入帳但還在凍結」的款項轉為可提領。
# 這支可以由排程（cron / celery beat）定期呼叫，也可以在後台放一顆手動按鈕呼叫。
# 鑑賞期天數定義在 constants.py 的 VENDOR_SETTLEMENT_HOLD_DAYS。
# ==============================================================================

@api_view(['POST'])
@permission_classes([AllowAny])
def admin_settle_vendor_earnings(request):
    admin_obj, err = require_admin_role(request, FINANCE_ADMIN_ROLES, source='data')
    if err:
        return err

    vendor_id = request.data.get('vendor_id')  # 選填：只結算單一廠商；不帶則全廠商一起跑

    cutoff = timezone.now() - timedelta(days=VENDOR_SETTLEMENT_HOLD_DAYS)

    # 找出所有「已入帳但尚未結算」的 order_income 交易
    income_txns = (
        Transactions.objects
        .filter(type="order_income", reference_type="order")
        .select_related("vendor_wallet__vendor")
    )

    if vendor_id:
        income_txns = income_txns.filter(vendor_wallet__vendor_id=vendor_id)

    # 已經結算過的交易：用 (vendor_wallet, reference_id) 這組合去比對，
    # 不能只看 reference_id ── 同一張訂單如果有多個廠商的商品，
    # 每個廠商的 order_income 交易 reference_id 會是同一個 order_id，
    # 只用 reference_id 判斷會導致其中一個廠商結算後，另一個廠商的份被誤判成「已結算」而跳過。
    settled_keys = set(
        Transactions.objects
        .filter(type="settle", reference_type="order")
        .values_list("vendor_wallet_id", "reference_id")
    )

    # 把還沒結算的交易，依訂單 delivered_at 篩出已經過了鑑賞期的
    pending_income_txns = [
        t for t in income_txns
        if (t.vendor_wallet_id, t.reference_id) not in settled_keys
    ]

    order_ids = [t.reference_id for t in pending_income_txns]
    orders_by_id = {
        str(o.order_id): o
        for o in Order.objects.filter(order_id__in=order_ids)
    }

    settled = []
    skipped = []

    for txn in pending_income_txns:
        order = orders_by_id.get(txn.reference_id)

        if not order or not order.delivered_at:
            skipped.append({
                'transaction_id': txn.transaction_id,
                'reason': '訂單尚未出貨完成（無 delivered_at）'
            })
            continue

        if order.delivered_at > cutoff:
            skipped.append({
                'transaction_id': txn.transaction_id,
                'reason': f'鑑賞期尚未結束，需等到 {(order.delivered_at + timedelta(days=VENDOR_SETTLEMENT_HOLD_DAYS)).isoformat()}'
            })
            continue

        with transaction.atomic():
            wallet = VendorWallet.objects.select_for_update().get(
                pk=txn.vendor_wallet_id
            )
            wallet.balance_frozen = max(0, wallet.balance_frozen - txn.amount)
            wallet.balance_available = wallet.balance_available + txn.amount
            wallet.save(update_fields=["balance_frozen", "balance_available", "updated_at"])

            Transactions.objects.create(
                vendor_wallet=wallet,
                type="settle",
                amount=txn.amount,
                reference_type="order",
                reference_id=txn.reference_id
            )

        settled.append({
            'vendor_id': wallet.vendor_id,
            'order_id': txn.reference_id,
            'amount': txn.amount
        })

    total_amount = sum(s['amount'] for s in settled)
    distinct_vendor_ids = {s['vendor_id'] for s in settled}

    # 稽核紀錄：單一廠商結算就直接關聯該廠商；一次跑全平台結算的話，
    # AdminAuditLogs.vendor 留空，把涉及的廠商數量寫進 action_reason
    log_vendor = None
    if vendor_id and len(distinct_vendor_ids) <= 1:
        log_vendor = Vendor.objects.filter(vendor_id=vendor_id).first()

    AdminAuditLogs.objects.create(
        admin_id=admin_obj,
        action_type='settle_vendor_earnings',
        vendor=log_vendor,
        action_reason=(
            f'結算廠商淨額，共 {len(settled)} 筆訂單、涉及 {len(distinct_vendor_ids)} 個廠商，'
            f'總金額 NT$ {total_amount}'
        ),
    )

    return Response({
        'success': True,
        'err': '',
        'settled_count': len(settled),
        'total_amount': total_amount,
        'settled': settled,
        'skipped': skipped
    }, status=status.HTTP_200_OK)


# ==============================================================================
# 待結算廠商列表：後台用，列出「有凍結餘額、且已經過了鑑賞期」的廠商，
# 給後台一個總覽 + 一顆手動結算按鈕（比照 admin_list_settleable_campaigns 的設計）
# GET /platform/vendors/settleable
# ==============================================================================

@api_view(['GET'])
@permission_classes([AllowAny])
def admin_list_settleable_vendors(request):
    _admin_obj, err = require_admin_role(request, FINANCE_ADMIN_ROLES, source='query')
    if err:
        return err

    cutoff = timezone.now() - timedelta(days=VENDOR_SETTLEMENT_HOLD_DAYS)

    income_txns = (
        Transactions.objects
        .filter(type="order_income", reference_type="order")
        .select_related("vendor_wallet__vendor")
    )

    settled_keys = set(
        Transactions.objects
        .filter(type="settle", reference_type="order")
        .values_list("vendor_wallet_id", "reference_id")
    )

    pending_income_txns = [
        t for t in income_txns
        if (t.vendor_wallet_id, t.reference_id) not in settled_keys
    ]

    order_ids = [t.reference_id for t in pending_income_txns]
    orders_by_id = {
        str(o.order_id): o
        for o in Order.objects.filter(order_id__in=order_ids)
    }

    # 依廠商彙總：可結算金額(已過鑑賞期) vs 還在鑑賞期內的金額
    by_vendor = {}

    for t in pending_income_txns:
        order = orders_by_id.get(t.reference_id)
        vendor = t.vendor_wallet.vendor

        entry = by_vendor.setdefault(vendor.vendor_id, {
            'Vendor_id': vendor.vendor_id,
            'Vendor_name': vendor.company_name,
            'Eligible_count': 0,
            'Eligible_amount': 0,
            'Not_yet_eligible_count': 0,
            'Not_yet_eligible_amount': 0,
            'Earliest_eligible_at': None,
        })

        if order and order.delivered_at and order.delivered_at <= cutoff:
            entry['Eligible_count'] += 1
            entry['Eligible_amount'] += t.amount
        else:
            entry['Not_yet_eligible_count'] += 1
            entry['Not_yet_eligible_amount'] += t.amount
            if order and order.delivered_at:
                eligible_at = order.delivered_at + timedelta(days=VENDOR_SETTLEMENT_HOLD_DAYS)
                if entry['Earliest_eligible_at'] is None or eligible_at < entry['Earliest_eligible_at']:
                    entry['Earliest_eligible_at'] = eligible_at

    # 只回傳「有可結算金額」的廠商，跟活動結算列表的邏輯一致，看板才不會被一堆 0 元的洗版
    result = [v for v in by_vendor.values() if v['Eligible_amount'] > 0 or v['Not_yet_eligible_amount'] > 0]
    result.sort(key=lambda v: v['Eligible_amount'], reverse=True)

    return Response(result, status=status.HTTP_200_OK)


# ==============================================================================
# 廠商撥款申請：後台處理
# GET  /platform/vendor/payouts             列出待處理的撥款申請
# POST /platform/vendor/payout/confirm       把撥款申請標記為完成或失敗
# ==============================================================================

@api_view(['GET'])
@permission_classes([AllowAny])
def admin_list_vendor_payouts(request):
    _admin_obj, err = require_admin_role(request, FINANCE_ADMIN_ROLES, source='query')
    if err:
        return err

    payout_status = request.query_params.get('status', 'pending')

    payouts = VendorPayouts.objects.select_related('vendor').order_by('-payout_date')

    if payout_status:
        payouts = payouts.filter(status=payout_status)

    result = [{
        'Payout_id': p.payout_id,
        'Vendor_id': p.vendor_id,
        'Vendor_name': p.vendor.company_name,
        'Bank_display': f"{p.vendor.bank_code} {p.vendor.bank_account}" if p.vendor.bank_account else '未設定',
        'Amount': p.amount,
        'Payout_date': p.payout_date,
        'Status': p.status,
    } for p in payouts]

    return Response(result, status=status.HTTP_200_OK)


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
    _admin_obj, err = require_admin_role(request, FINANCE_ADMIN_ROLES, source='query')
    if err:
        return err

    export_type = request.query_params.get('type')
    export_status = request.query_params.get('status', 'pending')

    if export_type not in ('vendor', 'koc'):
        return Response({
            'success': False,
            'err': "type 必須是 'vendor' 或 'koc'"
        }, status=status.HTTP_400_BAD_REQUEST)

    rows = []

    if export_type == 'vendor':
        fieldnames = ['撥款單號', '廠商ID', '廠商名稱', '銀行代碼', '銀行帳號', '戶名', '金額', '申請日期']

        vendor_payouts = (
            VendorPayouts.objects
            .select_related('vendor')
            .filter(status=export_status)
            .order_by('payout_date')
        )
        for p in vendor_payouts:
            vendor = p.vendor
            rows.append({
                '撥款單號': p.payout_id,
                '廠商ID': vendor.vendor_id,
                '廠商名稱': vendor.company_name,
                '銀行代碼': vendor.bank_code or '',
                '銀行帳號': vendor.bank_account or '',
                '戶名': vendor.bank_account_name or '',
                '金額': p.amount,
                '申請日期': p.payout_date,
            })

    else:  # export_type == 'koc'
        fieldnames = ['撥款單號', 'KOC用戶ID', 'KOC名稱', '銀行代碼', '銀行帳號', '戶名', '金額', '申請日期']

        koc_payouts = (
            Payouts.objects
            .select_related('koc__koc_profile')
            .filter(status=export_status)
            .order_by('payout_date')
        )
        for p in koc_payouts:
            user = p.koc
            koc_profile = getattr(user, 'koc_profile', None)
            rows.append({
                '撥款單號': p.payout_id,
                'KOC用戶ID': user.user_id,
                'KOC名稱': user.display_name or user.name,
                '銀行代碼': (koc_profile.bank_number if koc_profile else '') or '',
                '銀行帳號': (koc_profile.bank_account if koc_profile else '') or '',
                # KOC 資料表沒有獨立的「戶名」欄位（跟廠商不一樣，Vendor 有
                # bank_account_name，KOC 只有 bank_number/bank_account），
                # 這裡退回用 User.display_name 或 User.name 當戶名，實務上
                # 財務可能還是要人工核對戶名是否跟本人身分證姓名一致。
                '戶名': user.display_name or user.name,
                '金額': p.amount,
                '申請日期': p.payout_date,
            })

    # 用 io.StringIO 組 CSV 內容，開頭加 UTF-8 BOM（\ufeff）是因為財務多半用
    # Windows 版 Excel 直接開啟，沒有 BOM 的話中文欄位會變亂碼。
    buffer = io.StringIO()
    buffer.write('\ufeff')
    writer = csv.DictWriter(buffer, fieldnames=fieldnames)
    writer.writeheader()
    for row in rows:
        writer.writerow(row)

    today_str = timezone.localdate().isoformat()
    response = HttpResponse(buffer.getvalue(), content_type='text/csv; charset=utf-8')
    response['Content-Disposition'] = f'attachment; filename="payout_transfers_{export_type}_{export_status}_{today_str}.csv"'
    return response


@api_view(['POST'])
@permission_classes([AllowAny])
def admin_confirm_vendor_payout(request):
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
        payout = VendorPayouts.objects.select_related('vendor').get(payout_id=payout_id)
    except VendorPayouts.DoesNotExist:
        return Response({
            'success': False,
            'err': '找不到這筆撥款申請'
        }, status=status.HTTP_404_NOT_FOUND)

    if payout.status != 'pending':
        return Response({
            'success': False,
            'err': f'這筆撥款申請已經是「{payout.status}」狀態，不能重複處理'
        }, status=status.HTTP_400_BAD_REQUEST)

    with transaction.atomic():
        payout.status = new_status
        payout.save(update_fields=['status'])

        # 如果匯款失敗，錢要退回廠商的可提領餘額，不能讓錢憑空消失
        if new_status == 'failed':
            wallet = VendorWallet.objects.select_for_update().get(vendor=payout.vendor)
            wallet.balance_available = wallet.balance_available + payout.amount
            wallet.save(update_fields=['balance_available', 'updated_at'])

            Transactions.objects.create(
                vendor_wallet=wallet,
                type="withdraw_failed_refund",
                amount=payout.amount,
                reference_type="payout",
                reference_id=str(payout.payout_id)
            )

        # 稽核紀錄：誰、對哪個廠商的哪一筆撥款申請、做了什麼判定
        AdminAuditLogs.objects.create(
            admin_id=admin_obj,
            action_type='confirm_vendor_payout_completed' if new_status == 'completed' else 'confirm_vendor_payout_failed',
            tasks_id=str(payout.payout_id),
            vendor=payout.vendor,
            action_reason=action_reason or f'撥款申請 #{payout.payout_id}，金額 NT$ {payout.amount}，標記為「{new_status}」',
        )

    return Response({
        'success': True,
        'err': '',
        'payout_id': payout.payout_id,
        'status': payout.status,
    }, status=status.HTTP_200_OK)


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
        )

        pending_count = pending.count()

        if pending_count == 0:
            continue

        pending_amount = sum(item.amount for item in pending)
        eligible_at = campaign.end_date + timedelta(
            days=campaign.promo_days or 0
        )

        result.append({
            'Campaign_id': str(campaign.campaign_id),
            'Campaign_name': campaign.name,
            'Vendor_name': campaign.vendor.company_name if campaign.vendor else None,
            'End_date': campaign.end_date,
            'Settlement_eligible_at': eligible_at,
            'Is_eligible': eligible_at <= now,
            'Pending_count': pending_count,
            'Pending_amount': pending_amount,
        })

    return Response(result, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([AllowAny])
def admin_settle_campaign_earnings(request):
    admin_obj, err = require_admin_role(request, FINANCE_ADMIN_ROLES, source='data')
    if err:
        return err

    campaign_id = request.data.get('Campaign_id')

    if not campaign_id:
        return Response({
            'success': False,
            'err': 'Campaign_id 為必填'
        }, status=status.HTTP_400_BAD_REQUEST)

    try:
        campaign = Campaigns.objects.get(campaign_id=campaign_id)
    except Campaigns.DoesNotExist:
        return Response({
            'success': False,
            'err': '活動不存在'
        }, status=status.HTTP_404_NOT_FOUND)

    # 活動真正「結束」要等優惠碼最後效期（end_date 之後還有 promo_days 天）
    # 也過了，不然這段期間下的訂單用的優惠碼還有效，還是可能產生新的分潤。
    settlement_eligible_at = campaign.end_date + timedelta(
        days=campaign.promo_days or 0
    )

    if settlement_eligible_at > timezone.now():
        return Response({
            'success': False,
            'err': f'活動優惠碼最後效期到 {settlement_eligible_at.isoformat()} 才結束，尚不能結算分潤'
        }, status=status.HTTP_400_BAD_REQUEST)

    # 這個活動底下、狀態還是「待結算」的分潤，才是這次要從凍結餘額
    # 轉成可提領餘額的對象。
    earnings = (
        Earnings.objects
        .select_related('kocmission__koc', 'user')
        .filter(
            kocmission__application__campaign=campaign,
            status=EARNINGS_STATUS_CHOICES_MAP['pending']
        )
    )

    settled = []
    skipped = []

    for earning in earnings:
        mission = earning.kocmission

        if not mission or not mission.koc:
            skipped.append({
                'earnings_id': earning.earnings_id,
                'reason': '找不到對應的 KOC'
            })
            continue

        with transaction.atomic():
            # 用 select_for_update 鎖住這筆錢包餘額，避免同時間有其他請求
            # （例如另一個活動的結算，或 KOC 剛好在提領）一起改到餘額造成誤差
            wallet, _ = KocWallet.objects.select_for_update().get_or_create(
                koc=mission.koc
            )

            # 結算就是把錢從「凍結」轉成「可提領」，不是憑空多加一筆錢進去
            wallet.balance_frozen = max(
                0, wallet.balance_frozen - earning.amount
            )
            wallet.balance_available = (
                wallet.balance_available + earning.amount
            )
            wallet.save(
                update_fields=[
                    'balance_frozen',
                    'balance_available',
                    'updated_at'
                ]
            )

            Transactions.objects.create(
                koc_wallet=wallet,
                type='reward',
                amount=earning.amount,
                reference_type='earning',
                reference_id=str(earning.earnings_id)
            )

            earning.status = 'withdrawable'
            earning.save(update_fields=['status'])

        settled.append({
            'earnings_id': earning.earnings_id,
            'koc_id': mission.koc.koc_id,
            'amount': earning.amount
        })

    total_amount = sum(item['amount'] for item in settled)

    # 稽核紀錄：誰結算了哪個活動、結算了多少筆、多少錢
    AdminAuditLogs.objects.create(
        admin_id=admin_obj,
        action_type='settle_campaign_earnings',
        vendor=campaign.vendor,
        action_reason=f'結算活動「{campaign.name}」，共 {len(settled)} 筆分潤，總金額 NT$ {total_amount}',
    )

    return Response({
        'success': True,
        'err': '',
        'campaign_id': str(campaign.campaign_id),
        'settled_count': len(settled),
        'total_amount': total_amount,
        'settled': settled,
        'skipped': skipped
    }, status=status.HTTP_200_OK)


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
        }
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
        )

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
            "err": "; ".join(str(e) for e in serializer.errors.values())
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
            "err": "; ".join(str(e) for e in serializer.errors.values())
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

# 手動更新koc任務階段
@api_view(['PATCH'])
@permission_classes([AllowAny])
def koc_mission_stage_update(request):
    sync_expired_promoting_missions()

    serializer = KOCMissionStageUpdateSerializer(data=request.data)
    if not serializer.is_valid():
        return Response({
            "success": False,
            "err": "; ".join(str(e) for e in serializer.errors.values())
        }, status=http_status.HTTP_400_BAD_REQUEST)

    data = serializer.validated_data

    try:
        mission = KOCMissionNew.objects.select_related(
            'application__campaign__vendor',
            'koc__user'
        ).get(pk=data['KOCMisson_id'])
    except KOCMissionNew.DoesNotExist:
        return Response({
            "success": False,
            "err": "找不到對應的 KOC 任務"
        }, status=http_status.HTTP_404_NOT_FOUND)

    # 更新 stage
    mission.stage = data['Stage']
    mission.save()

    # 取得相關資料
    campaign = mission.application.campaign
    vendor = campaign.vendor
    campaign_product = CampaignProduct.objects.filter(
        campaign=campaign
    ).select_related('product').first()
    product_id = campaign_product.product.product_id if campaign_product else None

    coupon = CouponNew.objects.filter(kocmission=mission).first()

    return Response({
        "success": True,
        "err": "",
        "KOCMisson_id": str(mission.kocmission_id),
        "Mission_id": str(campaign.campaign_id),
        "User_id": mission.koc.user.user_id if mission.koc else None,
        "Brand_id": str(vendor.vendor_id),
        "Product_id": str(product_id) if product_id else None,
        "Promotion_code": coupon.promotion_code if coupon else None,
        "Stage": STAGE_CODE_MAP.get(mission.stage),
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
            "amount": earning.amount,
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
            'Password': u.password,
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
            'Reference_type': t.reference_type,
            'Reference_id': t.reference_id,
            'created_at': t.created_at,
        })

    return Response(result, status=status.HTTP_200_OK)


# ── 查看管理員操作紀錄 ──
@api_view(['GET'])
@permission_classes([AllowAny])
def get_audit_logs(request):
    admin_id = request.query_params.get('Admin_id', None)
    action_type = request.query_params.get('Action_type', None)
    vendor_id = request.query_params.get('Vendor_id', None)
    influencer_id = request.query_params.get('Influencer_id', None)

    logs = AdminAuditLogs.objects.select_related('admin_id')

    if admin_id:
        logs = logs.filter(admin_id=admin_id)
    if action_type:
        logs = logs.filter(action_type=action_type)
    if vendor_id:
        logs = logs.filter(vendor_id=vendor_id)
    if influencer_id:
        logs = logs.filter(koc_id=influencer_id)

    result = []
    for log in logs:
        result.append({
            'Log_id': log.log_id,
            'Admin_id': log.admin_id.admin_id,
            'Action_type': log.action_type,
            'Submission_id': log.submission_id,
            'Tasks_id': log.tasks_id,
            'Influencer_id': log.koc_id,
            'Vendor_id': log.vendor_id,
            'Action_reason': log.action_reason,
            'created_at': log.created_at,
        })

    return Response(result, status=status.HTTP_200_OK)
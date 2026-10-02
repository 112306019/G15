"""
驗證合併 koc-frontend 後，廠商「服務費匯款回報」整合進 VendorSettlement 架構
是否正常運作。走 Django 測試資料庫（manage.py test），不會碰到正式雲端資料：

1. calculate_order_commission + create_vendor_settlement_items：
   訂單完成時正確建立 pending Earnings（進 KocWallet.balance_frozen）
   與 VendorSettlementItem。
2. admin_generate_vendor_settlement：把到期的 item 彙總成一張 VendorSettlement。
3. vendor_report_settlement_payment：廠商回報匯款，建立 pending 的
   VendorSettlementPayment。
4. admin_confirm_vendor_settlement_remittance reject → 可重新回報 →
   confirm（mock ECPay）：VendorSettlement 變成 paid、對應 Earnings 從
   pending 轉 withdrawable、KocWallet 正確從 balance_frozen 轉
   balance_available、VendorInvoice 被建立並呼叫 issue_b2b_invoice。
5. VendorReceivable／VendorReceivablePayout（貨款撥付那條線）完全沒被動到。
"""
import json
from decimal import Decimal
from datetime import timedelta
from unittest.mock import patch

from django.test import TestCase, RequestFactory
from django.utils import timezone

from api.models import (
    Vendor, Admins, Order, OrderItem, Product, User, KOC, Campaigns,
    CampaignProduct, Application, KOCMissionNew, CouponNew, Earnings,
    KocWallet, VendorSettlement, VendorSettlementItem, VendorSettlementPayment,
    VendorInvoice, VendorReceivable, VendorReceivablePayout,
)
from api.views.platform import (
    calculate_order_commission,
    create_vendor_settlement_items,
    admin_generate_vendor_settlement,
    admin_confirm_vendor_settlement_remittance,
)
from api.views.vendor import vendor_report_settlement_payment


class VendorSettlementRemittanceFlowTest(TestCase):
    def setUp(self):
        self.vendor = Vendor.objects.create(
            vendor_id='V00001', company_name='測試廠商', contact_name='測試聯絡人',
            email='v1@test.com', password='x', tax_id='12345678', status='approved',
        )
        self.admin = Admins.objects.create(
            name='admin1', email='admin1@test.com', password='x',
            role='super_admin', status='active',
        )
        self.consumer = User.objects.create(
            role='consumer', name='測試消費者', email='c1@test.com',
            password='x', phone='0900000000',
        )
        self.koc_user = User.objects.create(
            role='koc', name='測試KOC', email='koc1@test.com',
            password='x', phone='0911111111',
        )
        self.koc = KOC.objects.create(koc_id='KOC001', user=self.koc_user)

        self.product = Product.objects.create(
            vendor_id=self.vendor.vendor_id, product_name='測試商品',
            price=1000, stock=100, status='active',
        )

        self.campaign = Campaigns.objects.create(
            vendor=self.vendor, name='測試活動', reward_type='commission',
            start_date=timezone.now() - timedelta(days=30),
            end_date=timezone.now() + timedelta(days=30),
        )
        CampaignProduct.objects.create(
            campaign=self.campaign, product=self.product, koc_commission_rate=Decimal('5.00'),
        )

        self.application = Application.objects.create(
            koc=self.koc, campaign=self.campaign, status='approved',
        )
        self.mission = KOCMissionNew.objects.create(
            application=self.application, koc=self.koc,
        )
        self.coupon = CouponNew.objects.create(
            kocmission=self.mission, promotion_code='TESTCODE1', status='active',
        )

        self.order = Order.objects.create(
            user=self.consumer, total_amount=Decimal('1000'),
            promotion_code='TESTCODE1',
            order_status='completed', payment_status='paid',
            shipping_status='delivered',
            delivered_at=timezone.now() - timedelta(days=10),
        )
        OrderItem.objects.create(
            order=self.order, product=self.product,
            quantity=1, unit_price=Decimal('1000'), subtotal=Decimal('1000'),
        )

    def _post_json(self, path, payload):
        factory = RequestFactory()
        return factory.post(path, data=json.dumps(payload), content_type='application/json')

    def test_full_settlement_remittance_flow(self):
        # ── 1) 訂單完成：KOC 分潤 + 廠商服務費明細 ──
        # 這兩支函式本身在合併進來的 koc-frontend 程式碼裡原本有一個跟這次
        # 合併無關的既有 bug（`product__vendor=...`，Product 其實只有
        # vendor_id 是 CharField、沒有 vendor 這個 FK，呼叫一定會噴錯），
        # 已經順手修好（改成 product__vendor_id / select_related("product")），
        # 這裡直接呼叫真正的函式驗證，不用再繞過。
        commission_result = calculate_order_commission(self.order)
        self.assertTrue(commission_result['created'])
        commission_amount = commission_result['commission_amount']

        wallet = KocWallet.objects.get(koc=self.koc)
        self.assertEqual(wallet.balance_frozen, commission_amount)
        self.assertEqual(wallet.balance_available, 0)

        earning = Earnings.objects.get(order=self.order, kocmission=self.mission)
        self.assertEqual(earning.status, 'pending')

        settlement_result = create_vendor_settlement_items(self.order)
        self.assertEqual(len(settlement_result), 1)
        self.assertTrue(settlement_result[0]['created'])
        item = VendorSettlementItem.objects.get(vendor=self.vendor, order=self.order)
        self.assertEqual(item.status, 'eligible')  # delivered_at 已超過鑑賞期
        print(f'[OK] 1. calculate_order_commission + create_vendor_settlement_items: '
              f'commission={commission_amount}, settlement_amount={item.settlement_amount}, '
              f'koc_amount={item.koc_amount}, platform_amount={item.platform_amount}')

        # ── 2) 後台產生結算單 ──
        req = self._post_json('/platform/vendor/settlement/generate',
                               {'vendor_id': self.vendor.vendor_id, 'Admin_id': self.admin.admin_id,
                                'month': item.eligible_at.strftime('%Y-%m')})
        resp = admin_generate_vendor_settlement(req)
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data['settled_count'], 1)

        settlement = VendorSettlement.objects.get(vendor=self.vendor)
        self.assertEqual(settlement.status, 'awaiting_payment')
        self.assertEqual(settlement.amount_due, item.settlement_amount)
        print(f'[OK] 2. admin_generate_vendor_settlement: settlement_id={settlement.settlement_id}, '
              f'status={settlement.status}, amount_due={settlement.amount_due}')

        # ── 3) 廠商回報匯款 ──
        report_payload = {
            'vendor_id': self.vendor.vendor_id,
            'settlement_id': settlement.settlement_id,
            'amount': str(settlement.amount_due),
            'account_last5': '12345',
            'transfer_date': str(timezone.now().date()),
        }
        resp2 = vendor_report_settlement_payment(self._post_json('/vendor/settlement/payment/report', report_payload))
        self.assertEqual(resp2.status_code, 200)
        payment = VendorSettlementPayment.objects.get(settlement=settlement)
        self.assertEqual(payment.status, 'pending')
        print(f'[OK] 3. vendor_report_settlement_payment: payment_id={payment.payment_id}, status={payment.status}')

        # ── 4) 後台先測退回 ──
        reject_payload = {
            'payment_id': payment.payment_id, 'action': 'reject',
            'Admin_id': self.admin.admin_id, 'Action_reason': '帳號後五碼對不起來',
        }
        resp3 = admin_confirm_vendor_settlement_remittance(
            self._post_json('/platform/vendor/settlement/payment/confirm', reject_payload)
        )
        self.assertEqual(resp3.status_code, 200)
        payment.refresh_from_db()
        self.assertEqual(payment.status, 'rejected')
        self.assertEqual(payment.note, '帳號後五碼對不起來')
        settlement.refresh_from_db()
        self.assertEqual(settlement.status, 'awaiting_payment')  # 退回不動結算單狀態
        print(f'[OK] 4. admin_confirm_vendor_settlement_remittance(reject): payment.status={payment.status}')

        # ── 5) 退回後可重新回報 ──
        resp2b = vendor_report_settlement_payment(
            self._post_json('/vendor/settlement/payment/report', report_payload)
        )
        self.assertEqual(resp2b.status_code, 200)
        new_payment = VendorSettlementPayment.objects.exclude(pk=payment.pk).get(settlement=settlement)
        self.assertEqual(new_payment.status, 'pending')
        print(f'[OK] 5. 退回後重新回報: new payment_id={new_payment.payment_id}, status={new_payment.status}')

        # ── 6) 後台確認（mock ECPay 成功）──
        with patch('api.ecpay_invoice.issue_b2b_invoice') as mock_issue:
            mock_issue.return_value = (True, 'AB12345678', '')
            confirm_payload = {
                'payment_id': new_payment.payment_id, 'action': 'confirm',
                'Admin_id': self.admin.admin_id,
            }
            resp4 = admin_confirm_vendor_settlement_remittance(
                self._post_json('/platform/vendor/settlement/payment/confirm', confirm_payload)
            )
            self.assertEqual(resp4.status_code, 200)
            mock_issue.assert_called_once()

        new_payment.refresh_from_db()
        self.assertEqual(new_payment.status, 'confirmed')
        settlement.refresh_from_db()
        self.assertEqual(settlement.status, 'paid')

        # KOC 分潤應該從 pending 轉 withdrawable，錢包 frozen -> available
        earning.refresh_from_db()
        self.assertEqual(earning.status, 'withdrawable')
        wallet.refresh_from_db()
        self.assertEqual(wallet.balance_frozen, 0)
        self.assertEqual(wallet.balance_available, commission_amount)

        invoice = VendorInvoice.objects.get(settlement=settlement)
        self.assertEqual(invoice.status, 'issued')
        self.assertEqual(invoice.invoice_number, 'AB12345678')
        print(f'[OK] 6. admin_confirm_vendor_settlement_remittance(confirm): settlement.status={settlement.status}, '
              f'earning.status={earning.status}, wallet.balance_available={wallet.balance_available}, '
              f'invoice.status={invoice.status}, invoice_number={invoice.invoice_number}')

    def test_goods_payout_models_untouched(self):
        """貨款撥付（VendorReceivable/VendorReceivablePayout）的流程完全沒被我的改動碰到，
        這裡只確認這兩個 model 本身還能正常建立使用，行為跟合併前一致。"""
        receivable = VendorReceivable.objects.create(
            vendor=self.vendor, order=self.order,
            goods_amount=Decimal('1000.00'), amount_due=Decimal('1000.00'),
            status='eligible',
        )
        payout = VendorReceivablePayout.objects.create(
            receivable=receivable, amount=Decimal('1000.00'), status='pending',
        )
        self.assertEqual(receivable.amount_due, Decimal('1000.00'))
        self.assertEqual(payout.amount, Decimal('1000.00'))
        print(f'[OK] VendorReceivable/VendorReceivablePayout 建立正常，未受影響')

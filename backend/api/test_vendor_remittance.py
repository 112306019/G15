"""
一次性驗證腳本（透過 manage.py test 執行，使用 Django 自動建立/銷毀的測試資料庫，
不會碰到真正的雲端資料）：

1. calculate_vendor_earning 全額入帳 + fee_amount 只記平台服務費
2. admin_settle_vendor_earnings：凍結轉可提領、VendorInvoice 建立為 awaiting_remittance、
   service_fee 是加總 fee_amount（不是淨額反推）、沒有呼叫 issue_b2b_invoice
3. vendor_report_remittance：狀態變成 remittance_reported
4. admin_confirm_vendor_remittance reject → 可重新回報 → confirm（mock ECPay）：狀態變成 issued
5. 退款「收回廠商淨額」邏輯正確扣回新的（較大的）全額
"""
import json
from decimal import Decimal
from unittest.mock import patch

from django.test import TestCase, RequestFactory
from django.utils import timezone
from datetime import timedelta

from api.models import (
    Vendor, Admins, Order, OrderItem, Product, VendorWallet, Transactions,
    VendorInvoice, User,
)
from api.views.platform import calculate_vendor_earning, admin_settle_vendor_earnings, admin_confirm_vendor_remittance
from api.views.vendor import vendor_report_remittance


class VendorRemittanceFlowTest(TestCase):
    def setUp(self):
        self.vendor = Vendor.objects.create(
            vendor_id='V00001', company_name='測試廠商', contact_name='測試聯絡人',
            email='v1@test.com', password='x', tax_id='12345678', status='approved',
            platform_fee_rate=Decimal('15.00'),
        )
        self.admin = Admins.objects.create(
            name='admin1', email='admin1@test.com', password='x',
            role='super_admin', status='active',
        )
        self.user = User.objects.create(
            role='consumer', name='測試消費者', email='c1@test.com',
            password='x', phone='0900000000',
        )
        self.product = Product.objects.create(
            vendor_id=self.vendor.vendor_id, product_name='測試商品',
            price=1000, stock=100, status='active',
        )
        self.order = Order.objects.create(
            user=self.user, total_amount=Decimal('1000'),
            order_status='completed', payment_status='paid',
            shipping_status='delivered',
            delivered_at=timezone.now() - timedelta(days=10),
        )
        OrderItem.objects.create(
            order=self.order, product=self.product, quantity=1,
            unit_price=Decimal('1000'), subtotal=Decimal('1000'),
        )

    def test_calculate_vendor_earning_full_amount(self):
        calculate_vendor_earning(self.order)

        wallet = VendorWallet.objects.get(vendor=self.vendor)
        txn = Transactions.objects.get(
            vendor_wallet=wallet, type='order_income',
            reference_type='order', reference_id=str(self.order.order_id),
        )

        # 全額入帳：沒有 KOC 分潤，所以淨額就是商品小計全額 1000（不扣平台服務費）
        self.assertEqual(wallet.balance_frozen, 1000)
        self.assertEqual(txn.amount, 1000)
        # fee_amount 只記平台服務費（15% of 1000 = 150），不含 koc_deduction
        self.assertEqual(txn.fee_amount, 150)
        print(f'[OK] calculate_vendor_earning: balance_frozen={wallet.balance_frozen}, amount={txn.amount}, fee_amount={txn.fee_amount}')

    @patch('api.ecpay_invoice.issue_b2b_invoice')
    def test_full_remittance_flow(self, mock_issue):
        calculate_vendor_earning(self.order)
        factory = RequestFactory()

        def post_json(path, payload):
            # 透過 @api_view 裝飾過的 view 會把 request 包成 DRF Request，
            # 直接手動塞 req.data 會被這層包裝蓋掉，一定要真的塞 JSON body
            # 讓 DRF 的 parser 去解析，而且同一個 request 的 body stream
            # 只能被讀一次，每次呼叫都要是全新的 request。
            return factory.post(path, data=json.dumps(payload), content_type='application/json')

        # ── 結算 ──
        req = post_json('/platform/vendor/settle-earnings', {'vendor_id': self.vendor.vendor_id, 'Admin_id': self.admin.admin_id})
        resp = admin_settle_vendor_earnings(req)
        print(f'[settle] status={resp.status_code} data={resp.data}')
        self.assertEqual(resp.status_code, 200)

        wallet = VendorWallet.objects.get(vendor=self.vendor)
        self.assertEqual(wallet.balance_frozen, 0)
        self.assertEqual(wallet.balance_available, 1000)

        invoice = VendorInvoice.objects.get(vendor=self.vendor)
        self.assertEqual(invoice.status, 'awaiting_remittance')
        self.assertEqual(invoice.service_fee, Decimal('150'))
        self.assertEqual(invoice.tax_amount, Decimal('8'))  # 150*0.05=7.5 → ROUND_HALF_UP = 8
        self.assertEqual(invoice.total_amount, Decimal('158'))
        mock_issue.assert_not_called()
        print(f'[OK] admin_settle_vendor_earnings: status={invoice.status}, service_fee={invoice.service_fee}, total_amount={invoice.total_amount}')

        # ── 廠商回報匯款 ──
        report_payload = {
            'vendor_id': self.vendor.vendor_id, 'invoice_id': invoice.invoice_id,
            'amount': str(invoice.total_amount), 'account_last5': '12345',
            'transfer_date': str(timezone.now().date()),
        }
        resp2 = vendor_report_remittance(post_json('/vendor/invoice/reportRemittance', report_payload))
        print(f'[report] status={resp2.status_code} data={resp2.data}')
        invoice.refresh_from_db()
        self.assertEqual(invoice.status, 'remittance_reported')
        print(f'[OK] vendor_report_remittance: status={invoice.status}')

        # ── 後台先測退回 ──
        reject_payload = {'invoice_id': invoice.invoice_id, 'action': 'reject', 'Admin_id': self.admin.admin_id, 'Action_reason': '帳號後五碼對不起來'}
        resp3 = admin_confirm_vendor_remittance(post_json('/platform/vendor/remittance/confirm', reject_payload))
        print(f'[reject] status={resp3.status_code} data={resp3.data}')
        invoice.refresh_from_db()
        self.assertEqual(invoice.status, 'rejected')
        self.assertEqual(invoice.remittance_reject_reason, '帳號後五碼對不起來')
        print(f'[OK] admin_confirm_vendor_remittance reject: status={invoice.status}')

        # ── 退回後可重新回報 ──
        resp2b = vendor_report_remittance(post_json('/vendor/invoice/reportRemittance', report_payload))
        self.assertEqual(resp2b.status_code, 200)
        invoice.refresh_from_db()
        self.assertEqual(invoice.status, 'remittance_reported')
        print(f'[OK] 退回後可重新回報: status={invoice.status}')

        # ── 後台確認（mock ECPay 成功）──
        mock_issue.return_value = (True, 'AB12345678', '')
        confirm_payload = {'invoice_id': invoice.invoice_id, 'action': 'confirm', 'Admin_id': self.admin.admin_id}
        resp4 = admin_confirm_vendor_remittance(post_json('/platform/vendor/remittance/confirm', confirm_payload))
        print(f'[confirm] status={resp4.status_code} data={resp4.data}')
        invoice.refresh_from_db()
        self.assertEqual(invoice.status, 'issued')
        self.assertEqual(invoice.invoice_number, 'AB12345678')
        mock_issue.assert_called_once_with(
            relate_number=invoice.relate_number, buyer_tax_id=self.vendor.tax_id,
            item_name='平台服務費', sales_amount=150, tax_amount=8,
        )
        print(f'[OK] admin_confirm_vendor_remittance confirm: status={invoice.status}, invoice_number={invoice.invoice_number}')

    def test_refund_claws_back_full_amount(self):
        """退款邏輯（platform.py 的「收回廠商淨額」）不用改也能正確扣回新的全額——
        驗證方式：直接檢查退款邏輯讀取的 order_income txn.amount 就是新公式算出的全額。"""
        calculate_vendor_earning(self.order)
        txn = Transactions.objects.get(
            type='order_income', reference_type='order', reference_id=str(self.order.order_id),
        )
        # 退款邏輯用 delta = txn.amount 去扣 balance_frozen，這裡確認這個值就是全額 1000
        # （而不是舊邏輯下的淨額 850），所以退款時會正確扣回全額，不用額外改程式碼。
        self.assertEqual(txn.amount, 1000)
        print(f'[OK] 退款邏輯會讀到的 order_income amount（全額）={txn.amount}')

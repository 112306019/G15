from decimal import Decimal

from django.test import Client, TestCase

from api.models import Order, OrderItem, Product, User
from payments.models import PaymentTransaction


class VendorPlatformPaymentReadTests(TestCase):
    """
    vendor.py / platform.py 改成直接讀 Order + PaymentTransaction（不再讀舊版 Payment model）
    之後的驗證：綠界訂單、舊版轉帳/貨到付款訂單（只有 Order.payment_status，沒有 PaymentTransaction）、
    完全還沒付款的訂單，三種情況回傳的資料都要正確、且不能因為查無 PaymentTransaction 就整段消失或壞掉。
    """

    def setUp(self):
        self.client = Client()
        self.user = User.objects.create(
            role="consumer", name="測試用戶", email="vendor-read-test@example.com",
            password="x", phone="0900000000",
        )
        self.product = Product.objects.create(
            vendor_id="V00001", product_name="測試商品", price=500, status="active"
        )

    def make_order(self, total_amount=500):
        order = Order.objects.create(user=self.user, total_amount=total_amount)
        OrderItem.objects.create(
            order=order, product=self.product, quantity=1,
            unit_price=total_amount, subtotal=total_amount,
        )
        return order

    def test_vendor_detail_shows_ecpay_payment_transaction(self):
        order = self.make_order()
        PaymentTransaction.objects.create(
            order=order, merchant_trade_no="VENDORTEST0000001", amount=order.total_amount,
            status=PaymentTransaction.STATUS_PAID, ecpay_trade_no="2026081900000001",
        )

        resp = self.client.get(
            "/api/vendor/order/getDetail",
            {"vendor_id": "V00001", "order_id": str(order.order_id)},
        )

        self.assertEqual(resp.status_code, 200)
        payment = resp.json()["order"]["payment"]
        self.assertIsNotNone(payment)  # 有 PaymentTransaction 時一定要有值，不能是 None
        self.assertEqual(payment["payment_status"], "paid")
        self.assertEqual(payment["payment_method"], "信用卡")
        self.assertEqual(payment["transaction_id"], "2026081900000001")

    def test_vendor_detail_falls_back_to_order_payment_status_without_transaction(self):
        # 模擬舊版轉帳/貨到付款流程：只有 Order.payment_status 被寫成 paid，沒有 PaymentTransaction
        order = self.make_order()
        order.payment_status = "paid"
        order.save(update_fields=["payment_status"])

        resp = self.client.get(
            "/api/vendor/order/getDetail",
            {"vendor_id": "V00001", "order_id": str(order.order_id)},
        )

        self.assertEqual(resp.status_code, 200)
        payment = resp.json()["order"]["payment"]
        self.assertIsNotNone(payment)  # 沒有 PaymentTransaction 也不該整段變 None，只是欄位比較少
        self.assertEqual(payment["payment_status"], "paid")
        self.assertIsNone(payment["payment_method"])  # 舊流程的付款方式字樣現在沒有地方能還原

    def test_vendor_detail_unpaid_order_still_returns_payment_block(self):
        order = self.make_order()  # 完全還沒付款，Order.payment_status 預設 'unpaid'

        resp = self.client.get(
            "/api/vendor/order/getDetail",
            {"vendor_id": "V00001", "order_id": str(order.order_id)},
        )

        self.assertEqual(resp.status_code, 200)
        payment = resp.json()["order"]["payment"]
        self.assertIsNotNone(payment)
        self.assertEqual(payment["payment_status"], "unpaid")

    def test_admin_overview_payment_count_reflects_paid_orders(self):
        paid_order = self.make_order()
        PaymentTransaction.objects.create(
            order=paid_order, merchant_trade_no="ADMINOVERVIEW0001", amount=paid_order.total_amount,
            status=PaymentTransaction.STATUS_PAID,
        )
        paid_order.payment_status = "paid"
        paid_order.save(update_fields=["payment_status"])

        self.make_order()  # 還沒付款，不該被算進 Payment_count

        resp = self.client.get("/api/platform/overview")

        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()["overview"]["Payment_count"], 1)

    def test_admin_payments_list_includes_unpaid_orders_and_filters_by_status(self):
        paid_order = self.make_order()
        PaymentTransaction.objects.create(
            order=paid_order, merchant_trade_no="ADMINLIST00000001", amount=paid_order.total_amount,
            status=PaymentTransaction.STATUS_PAID, ecpay_trade_no="2026081900000002",
        )
        paid_order.payment_status = "paid"
        paid_order.save(update_fields=["payment_status"])

        unpaid_order = self.make_order()

        resp_all = self.client.get("/api/platform/payments")
        self.assertEqual(resp_all.status_code, 200)
        order_ids = {row["Order_id"] for row in resp_all.json()}
        # 改成以 Order 為主之後，還沒付款的訂單也該出現在列表裡，不是只有走過付款的才看得到
        self.assertIn(str(paid_order.order_id), order_ids)
        self.assertIn(str(unpaid_order.order_id), order_ids)

        resp_filtered = self.client.get("/api/platform/payments", {"payment_status": "paid"})
        filtered_ids = {row["Order_id"] for row in resp_filtered.json()}
        self.assertIn(str(paid_order.order_id), filtered_ids)
        self.assertNotIn(str(unpaid_order.order_id), filtered_ids)

        paid_row = next(row for row in resp_all.json() if row["Order_id"] == str(paid_order.order_id))
        self.assertEqual(paid_row["payment_method"], "信用卡")
        self.assertEqual(paid_row["transaction_id"], "2026081900000002")

        unpaid_row = next(row for row in resp_all.json() if row["Order_id"] == str(unpaid_order.order_id))
        self.assertIsNone(unpaid_row["payment_method"])
        self.assertEqual(unpaid_row["payment_status"], "unpaid")

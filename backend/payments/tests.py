import uuid

from django.conf import settings
from django.test import Client, TestCase, override_settings

from api.models import Order, OrderItem, Product, User

from .models import PaymentTransaction
from .services import create_order_payment, generate_check_mac_value

# 綠界公開測試帳號（AIO 金流），來源：SKILL.md §測試帳號，非正式環境機密
ECPAY_TEST_SETTINGS = dict(
    ECPAY_MERCHANT_ID="3002607",
    ECPAY_HASH_KEY="pwFHCqoQZGmho4w6",
    ECPAY_HASH_IV="EkRm7iFT261dpevs",
    ECPAY_ENV="stage",
    ECPAY_RETURN_URL="https://example.com/api/payments/ecpay/notify/",
    ECPAY_ORDER_RESULT_URL="https://example.com/api/payments/ecpay/result/",
    FRONTEND_BASE_URL="https://frontend.example.com",
)


@override_settings(**ECPAY_TEST_SETTINGS)
class PaymentsTestCase(TestCase):
    """共用的訂單/商品資料建置，供 create_payment 與 ecpay_return 兩組測試共用"""

    def setUp(self):
        self.client = Client()
        self.user = User.objects.create(
            role="consumer", name="測試用戶", email="ecpay-test@example.com",
            password="x", phone="0900000000",
        )
        self.product1 = Product.objects.create(
            vendor_id="V00001", product_name="手工皂禮盒組", price=680, status="active"
        )
        self.product2 = Product.objects.create(
            vendor_id="V00001", product_name="精油蠟燭", price=320, status="active"
        )

    def make_order(self, total_amount, items):
        """items: [(product, quantity, unit_price), ...]"""
        order = Order.objects.create(user=self.user, total_amount=total_amount)
        for product, quantity, unit_price in items:
            OrderItem.objects.create(
                order=order, product=product, quantity=quantity,
                unit_price=unit_price, subtotal=unit_price * quantity,
            )
        return order

    def make_callback_params(self, merchant_trade_no, amount, **overrides):
        """組一份跟綠界格式一致、CheckMacValue 正確算好的 ReturnURL callback 參數"""
        params = {
            "MerchantID": settings.ECPAY_MERCHANT_ID,
            "MerchantTradeNo": merchant_trade_no,
            "RtnCode": "1",
            "RtnMsg": "交易成功",
            "TradeNo": "2026081300000001",
            "TradeAmt": str(int(amount)),
            "PaymentDate": "2026/08/13 12:00:00",
            "PaymentType": "Credit_CreditCard",
            "SimulatePaid": "0",
        }
        params.update(overrides)
        params["CheckMacValue"] = generate_check_mac_value(
            params, settings.ECPAY_HASH_KEY, settings.ECPAY_HASH_IV
        )
        return params


class CreatePaymentEndpointTests(PaymentsTestCase):
    """POST /api/payments/create/"""

    def test_success_builds_form_from_order_ignoring_client_amount(self):
        order = self.make_order(1000, [(self.product1, 1, 680), (self.product2, 1, 320)])

        resp = self.client.post("/api/payments/create/", data={"Order_id": str(order.order_id), "amount": "1"})

        self.assertEqual(resp.status_code, 200)
        fields = resp.json()["fields"]
        self.assertEqual(fields["TotalAmount"], "1000")  # 忽略前端傳的 amount=1，用 order.total_amount
        # OrderItem.order_item_id 是隨機 UUID（沒有 created_at 可排序），
        # 兩個商品在 ItemName 裡的先後順序本質上不保證，這裡只驗證用 # 分隔、兩者都有出現
        self.assertEqual(set(fields["ItemName"].split("#")), {"手工皂禮盒組", "精油蠟燭"})
        self.assertTrue(fields["CheckMacValue"])
        self.assertEqual(fields["OrderResultURL"], "https://example.com/api/payments/ecpay/result/")

    def test_missing_order_id_returns_400(self):
        resp = self.client.post("/api/payments/create/", data={})
        self.assertEqual(resp.status_code, 400)

    def test_unknown_order_returns_404(self):
        resp = self.client.post("/api/payments/create/", data={"Order_id": str(uuid.uuid4())})
        self.assertEqual(resp.status_code, 404)

    def test_order_without_items_returns_400(self):
        order = Order.objects.create(user=self.user, total_amount=0)
        resp = self.client.post("/api/payments/create/", data={"Order_id": str(order.order_id)})
        self.assertEqual(resp.status_code, 400)

    def test_already_paid_order_is_blocked(self):
        order = self.make_order(680, [(self.product1, 1, 680)])
        PaymentTransaction.objects.create(
            order=order, merchant_trade_no="ALREADYPAID001", amount=680,
            status=PaymentTransaction.STATUS_PAID,
        )
        resp = self.client.post("/api/payments/create/", data={"Order_id": str(order.order_id)})
        self.assertEqual(resp.status_code, 400)


class EcpayReturnCallbackTests(PaymentsTestCase):
    """POST /api/payments/ecpay/notify/ —— 對應這次要求的 6 個端到端案例"""

    def test_1_successful_payment_marks_status_paid(self):
        order = self.make_order(680, [(self.product1, 1, 680)])
        payment = create_order_payment(order)
        params = self.make_callback_params(payment.merchant_trade_no, payment.amount)

        resp = self.client.post("/api/payments/ecpay/notify/", data=params)

        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.content, b"1|OK")
        self.assertEqual(resp["Content-Type"], "text/plain")
        payment.refresh_from_db()
        self.assertEqual(payment.status, PaymentTransaction.STATUS_PAID)
        self.assertEqual(payment.ecpay_trade_no, "2026081300000001")
        self.assertEqual(payment.raw_response["RtnCode"], "1")
        order.refresh_from_db()
        self.assertEqual(order.payment_status, "paid")  # 舊版 Order.payment_status 要同步

    def test_2_tampered_checkmacvalue_is_rejected(self):
        order = self.make_order(680, [(self.product1, 1, 680)])
        payment = create_order_payment(order)
        params = self.make_callback_params(payment.merchant_trade_no, payment.amount)
        params["TradeAmt"] = "1"  # 竄改金額但沒有重算 CheckMacValue

        resp = self.client.post("/api/payments/ecpay/notify/", data=params)

        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.content, b"1|OK")  # 仍須回應，避免綠界重試風暴
        payment.refresh_from_db()
        self.assertEqual(payment.status, PaymentTransaction.STATUS_PENDING)  # 沒有被更新
        self.assertIsNone(payment.ecpay_trade_no)
        order.refresh_from_db()
        self.assertEqual(order.payment_status, "unpaid")

    def test_3_unknown_merchant_trade_no_does_not_crash(self):
        params = self.make_callback_params("NOTEXIST12345678", 100)

        resp = self.client.post("/api/payments/ecpay/notify/", data=params)

        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.content, b"1|OK")

    def test_4_duplicate_delivery_is_idempotent(self):
        order = self.make_order(680, [(self.product1, 1, 680)])
        payment = create_order_payment(order)
        params = self.make_callback_params(payment.merchant_trade_no, payment.amount)

        resp1 = self.client.post("/api/payments/ecpay/notify/", data=params)
        resp2 = self.client.post("/api/payments/ecpay/notify/", data=params)

        self.assertEqual(resp1.content, b"1|OK")
        self.assertEqual(resp2.content, b"1|OK")
        self.assertEqual(
            PaymentTransaction.objects.filter(merchant_trade_no=payment.merchant_trade_no).count(), 1
        )
        payment.refresh_from_db()
        self.assertEqual(payment.status, PaymentTransaction.STATUS_PAID)

    def test_5_get_request_returns_405(self):
        resp = self.client.get("/api/payments/ecpay/notify/")
        self.assertEqual(resp.status_code, 405)

    def test_6_failed_payment_records_failed_status(self):
        order = self.make_order(680, [(self.product1, 1, 680)])
        payment = create_order_payment(order)
        params = self.make_callback_params(
            payment.merchant_trade_no, payment.amount, RtnCode="10100248", RtnMsg="交易失敗"
        )

        resp = self.client.post("/api/payments/ecpay/notify/", data=params)

        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.content, b"1|OK")
        payment.refresh_from_db()
        self.assertEqual(payment.status, PaymentTransaction.STATUS_FAILED)
        order.refresh_from_db()
        self.assertEqual(order.payment_status, "unpaid")


class EcpayOrderResultViewTests(PaymentsTestCase):
    """POST /api/payments/ecpay/result/ —— OrderResultURL：把瀏覽器導回前端結果頁"""

    def test_valid_callback_redirects_to_frontend_with_order_id(self):
        order = self.make_order(680, [(self.product1, 1, 680)])
        payment = create_order_payment(order)
        params = self.make_callback_params(payment.merchant_trade_no, payment.amount)

        resp = self.client.post("/api/payments/ecpay/result/", data=params)

        self.assertEqual(resp.status_code, 302)
        self.assertEqual(
            resp["Location"], f"https://frontend.example.com/checkout/result?order_id={order.order_id}"
        )

    def test_tampered_checkmacvalue_redirects_without_order_id(self):
        order = self.make_order(680, [(self.product1, 1, 680)])
        payment = create_order_payment(order)
        params = self.make_callback_params(payment.merchant_trade_no, payment.amount)
        params["TradeAmt"] = "1"  # 竄改但沒有重算 CheckMacValue

        resp = self.client.post("/api/payments/ecpay/result/", data=params)

        self.assertEqual(resp.status_code, 302)
        self.assertEqual(resp["Location"], "https://frontend.example.com/checkout/result")

    def test_unknown_merchant_trade_no_redirects_without_order_id(self):
        params = self.make_callback_params("NOTEXIST12345678", 100)

        resp = self.client.post("/api/payments/ecpay/result/", data=params)

        self.assertEqual(resp.status_code, 302)
        self.assertEqual(resp["Location"], "https://frontend.example.com/checkout/result")

    def test_get_request_returns_405(self):
        resp = self.client.get("/api/payments/ecpay/result/")
        self.assertEqual(resp.status_code, 405)


class PaymentStatusEndpointTests(PaymentsTestCase):
    """GET /api/payments/status/ —— 前端結果頁確認付款成功的唯一依據"""

    def test_missing_order_id_returns_400(self):
        resp = self.client.get("/api/payments/status/")
        self.assertEqual(resp.status_code, 400)

    def test_unknown_order_returns_404(self):
        resp = self.client.get(f"/api/payments/status/?order_id={uuid.uuid4()}")
        self.assertEqual(resp.status_code, 404)

    def test_order_without_any_payment_returns_404(self):
        order = self.make_order(680, [(self.product1, 1, 680)])
        resp = self.client.get(f"/api/payments/status/?order_id={order.order_id}")
        self.assertEqual(resp.status_code, 404)

    def test_pending_payment_reports_pending(self):
        order = self.make_order(680, [(self.product1, 1, 680)])
        create_order_payment(order)

        resp = self.client.get(f"/api/payments/status/?order_id={order.order_id}")

        self.assertEqual(resp.status_code, 200)
        body = resp.json()
        self.assertTrue(body["success"])
        self.assertEqual(body["status"], PaymentTransaction.STATUS_PENDING)

    def test_prefers_paid_transaction_over_older_failed_attempt(self):
        order = self.make_order(680, [(self.product1, 1, 680)])
        PaymentTransaction.objects.create(
            order=order, merchant_trade_no="FIRSTATTEMPTFAIL", amount=680,
            status=PaymentTransaction.STATUS_FAILED,
        )
        PaymentTransaction.objects.create(
            order=order, merchant_trade_no="SECONDATTEMPTOK1", amount=680,
            status=PaymentTransaction.STATUS_PAID,
        )

        resp = self.client.get(f"/api/payments/status/?order_id={order.order_id}")

        self.assertEqual(resp.status_code, 200)
        body = resp.json()
        self.assertEqual(body["status"], PaymentTransaction.STATUS_PAID)
        self.assertEqual(body["merchant_trade_no"], "SECONDATTEMPTOK1")

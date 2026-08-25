import io
import uuid
import urllib.parse
from unittest.mock import patch

from django.conf import settings
from django.core.management import call_command
from django.test import Client, TestCase, override_settings

from api.models import Order, OrderItem, Product, User

from .models import PaymentTransaction
from .services import (
    create_order_payment,
    generate_check_mac_value,
    is_payment_effectively_failed,
    mark_payment_abandoned,
    query_trade_info,
    reconcile_payment_from_query,
)

# 綠界公開測試帳號（AIO 金流），來源：SKILL.md §測試帳號，非正式環境機密
ECPAY_TEST_SETTINGS = dict(
    ECPAY_MERCHANT_ID="3002607",
    ECPAY_HASH_KEY="pwFHCqoQZGmho4w6",
    ECPAY_HASH_IV="EkRm7iFT261dpevs",
    ECPAY_ENV="stage",
    ECPAY_RETURN_URL="https://example.com/api/payments/ecpay/notify/",
    ECPAY_ORDER_RESULT_URL="https://example.com/api/payments/ecpay/result/",
    ECPAY_CLIENT_BACK_URL="https://example.com/api/payments/ecpay/client-back/",
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

    def make_query_trade_response_text(self, merchant_trade_no, trade_status, *, valid_cmv=True, **overrides):
        """組一份跟綠界 QueryTradeInfo 格式一致（URL-encoded key=value 字串）的回應內容"""
        params = {
            "MerchantID": settings.ECPAY_MERCHANT_ID,
            "MerchantTradeNo": merchant_trade_no,
            "TradeNo": "2026082200000099",
            "TradeAmt": "680",
            "PaymentDate": "2026/08/22 12:00:00",
            "PaymentType": "Credit_CreditCard",
            "TradeDate": "2026/08/22 11:55:00",
            "TradeStatus": trade_status,
            "ItemName": "測試商品",
        }
        params.update(overrides)
        if valid_cmv:
            params["CheckMacValue"] = generate_check_mac_value(
                params, settings.ECPAY_HASH_KEY, settings.ECPAY_HASH_IV
            )
        else:
            params["CheckMacValue"] = "TAMPEREDVALUE0000000000000000000000000000000000"
        return urllib.parse.urlencode(params)


class _MockResponse:
    """模擬 requests.Response，只提供 query_trade_info 用得到的兩個介面"""

    def __init__(self, text, status_code=200):
        self.text = text
        self.status_code = status_code

    def raise_for_status(self):
        pass


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
        # ClientBackURL 指向後端（不是前端），且自己帶 merchant_trade_no 讓 ecpay_client_back 認得出是哪筆交易
        self.assertEqual(
            fields["ClientBackURL"],
            f"https://example.com/api/payments/ecpay/client-back/?merchant_trade_no={fields['MerchantTradeNo']}",
        )

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


class QueryTradeInfoTests(PaymentsTestCase):
    """query_trade_info / reconcile_payment_from_query —— 主動對帳工具，全程 mock requests.post，不打真正的綠界"""

    def make_pending_payment(self):
        order = self.make_order(680, [(self.product1, 1, 680)])
        return create_order_payment(order)

    @patch("payments.services.requests.post")
    def test_query_trade_info_parses_valid_response(self, mock_post):
        payment = self.make_pending_payment()
        mock_post.return_value = _MockResponse(
            self.make_query_trade_response_text(payment.merchant_trade_no, "1")
        )

        result = query_trade_info(payment)

        self.assertEqual(result["TradeStatus"], "1")
        self.assertEqual(result["MerchantTradeNo"], payment.merchant_trade_no)
        # 送出的請求要打對測試站網址、帶正確的 MerchantTradeNo
        called_url = mock_post.call_args.args[0]
        self.assertEqual(called_url, "https://payment-stage.ecpay.com.tw/Cashier/QueryTradeInfo/V5")
        sent_data = mock_post.call_args.kwargs["data"]
        self.assertEqual(sent_data["MerchantTradeNo"], payment.merchant_trade_no)

    @patch("payments.services.requests.post")
    def test_query_trade_info_handles_blank_value_fields(self, mock_post):
        # 真實情境：查詢一筆綠界那邊查無此單/尚未付款的交易時，PaymentDate/PaymentType/TradeNo
        # 等欄位會是空字串（例如 "TradeNo="），CheckMacValue 的計算規則要求空值參數仍要納入計算，
        # 這裡刻意模擬這種回應，確保 CMV 驗證不會因為 parse_qsl 把空值欄位丟掉而誤判失敗。
        payment = self.make_pending_payment()
        mock_post.return_value = _MockResponse(
            self.make_query_trade_response_text(
                payment.merchant_trade_no, "10200047",
                PaymentDate="", PaymentType="", TradeNo="", TradeDate="", ItemName="",
            )
        )

        result = query_trade_info(payment)

        self.assertEqual(result["TradeStatus"], "10200047")
        self.assertEqual(result["TradeNo"], "")

    @patch("payments.services.requests.post")
    def test_query_trade_info_rejects_tampered_checkmacvalue(self, mock_post):
        payment = self.make_pending_payment()
        mock_post.return_value = _MockResponse(
            self.make_query_trade_response_text(payment.merchant_trade_no, "1", valid_cmv=False)
        )

        with self.assertRaises(ValueError):
            query_trade_info(payment)

    @patch("payments.services.requests.post")
    def test_reconcile_marks_paid_when_trade_status_is_1(self, mock_post):
        payment = self.make_pending_payment()
        mock_post.return_value = _MockResponse(
            self.make_query_trade_response_text(payment.merchant_trade_no, "1")
        )

        payment = reconcile_payment_from_query(payment)

        self.assertEqual(payment.status, PaymentTransaction.STATUS_PAID)
        self.assertEqual(payment.ecpay_trade_no, "2026082200000099")
        payment.order.refresh_from_db()
        self.assertEqual(payment.order.payment_status, "paid")

    @patch("payments.services.requests.post")
    def test_reconcile_marks_failed_when_trade_not_established(self, mock_post):
        payment = self.make_pending_payment()
        mock_post.return_value = _MockResponse(
            self.make_query_trade_response_text(payment.merchant_trade_no, "10200095")
        )

        payment = reconcile_payment_from_query(payment)

        self.assertEqual(payment.status, PaymentTransaction.STATUS_FAILED)
        payment.order.refresh_from_db()
        self.assertEqual(payment.order.payment_status, "unpaid")

    @patch("payments.services.requests.post")
    def test_reconcile_leaves_pending_when_trade_status_is_0(self, mock_post):
        payment = self.make_pending_payment()
        mock_post.return_value = _MockResponse(
            self.make_query_trade_response_text(payment.merchant_trade_no, "0")
        )

        payment = reconcile_payment_from_query(payment)

        # 銀行還沒回覆，不能誤判成失敗，維持 pending
        self.assertEqual(payment.status, PaymentTransaction.STATUS_PENDING)
        payment.order.refresh_from_db()
        self.assertEqual(payment.order.payment_status, "unpaid")


@override_settings(**ECPAY_TEST_SETTINGS)
class ReconcilePendingPaymentsCommandTests(TestCase):
    """python manage.py reconcile_pending_payments —— 對帳批次工具"""

    def setUp(self):
        self.user = User.objects.create(
            role="consumer", name="測試用戶", email="reconcile-cmd-test@example.com",
            password="x", phone="0900000000",
        )
        self.product = Product.objects.create(
            vendor_id="V00001", product_name="測試商品", price=680, status="active"
        )
        order = Order.objects.create(user=self.user, total_amount=680)
        OrderItem.objects.create(
            order=order, product=self.product, quantity=1, unit_price=680, subtotal=680,
        )
        self.payment = create_order_payment(order)

    def _response_text(self, trade_status):
        params = {
            "MerchantID": settings.ECPAY_MERCHANT_ID,
            "MerchantTradeNo": self.payment.merchant_trade_no,
            "TradeNo": "2026082200000123",
            "TradeStatus": trade_status,
        }
        params["CheckMacValue"] = generate_check_mac_value(
            params, settings.ECPAY_HASH_KEY, settings.ECPAY_HASH_IV
        )
        return urllib.parse.urlencode(params)

    @patch("payments.services.requests.post")
    def test_dry_run_does_not_write_changes(self, mock_post):
        mock_post.return_value = _MockResponse(self._response_text("1"))

        out = io.StringIO()
        call_command(
            "reconcile_pending_payments",
            f"--merchant-trade-no={self.payment.merchant_trade_no}",
            stdout=out,
        )

        self.payment.refresh_from_db()
        self.assertEqual(self.payment.status, PaymentTransaction.STATUS_PENDING)  # 沒加 --apply，不該被寫入
        self.assertIn("TradeStatus=1", out.getvalue())
        self.assertIn("尚未寫入任何變更", out.getvalue())

    @patch("payments.services.requests.post")
    def test_apply_writes_changes(self, mock_post):
        mock_post.return_value = _MockResponse(self._response_text("1"))

        out = io.StringIO()
        call_command(
            "reconcile_pending_payments",
            f"--merchant-trade-no={self.payment.merchant_trade_no}",
            "--apply",
            stdout=out,
        )

        self.payment.refresh_from_db()
        self.assertEqual(self.payment.status, PaymentTransaction.STATUS_PAID)
        self.assertIn("已更新", out.getvalue())

    def test_unknown_merchant_trade_no_raises_command_error(self):
        from django.core.management.base import CommandError
        with self.assertRaises(CommandError):
            call_command("reconcile_pending_payments", "--merchant-trade-no=NOTEXIST00000001")


class IsPaymentEffectivelyFailedTests(PaymentsTestCase):
    """is_payment_effectively_failed —— 消費者端「這筆不算數」的判斷規則"""

    def test_failed_status_is_effectively_failed(self):
        order = self.make_order(680, [(self.product1, 1, 680)])
        payment = create_order_payment(order)
        payment.status = PaymentTransaction.STATUS_FAILED
        payment.save(update_fields=["status"])
        self.assertTrue(is_payment_effectively_failed(payment))

    def test_paid_status_is_never_effectively_failed(self):
        order = self.make_order(680, [(self.product1, 1, 680)])
        payment = create_order_payment(order)
        payment.status = PaymentTransaction.STATUS_PAID
        payment.save(update_fields=["status"])
        self.assertFalse(is_payment_effectively_failed(payment))

    def test_fresh_pending_is_not_effectively_failed(self):
        order = self.make_order(680, [(self.product1, 1, 680)])
        payment = create_order_payment(order)  # 剛建立，created_at 是現在
        self.assertFalse(is_payment_effectively_failed(payment))

    def test_stale_pending_is_effectively_failed(self):
        from django.utils import timezone
        from datetime import timedelta

        order = self.make_order(680, [(self.product1, 1, 680)])
        payment = create_order_payment(order)
        PaymentTransaction.objects.filter(pk=payment.pk).update(
            created_at=timezone.now() - timedelta(minutes=31)
        )
        payment.refresh_from_db()
        self.assertTrue(is_payment_effectively_failed(payment))


class MarkPaymentAbandonedTests(PaymentsTestCase):
    """mark_payment_abandoned —— ClientBackURL 觸發時的處理邏輯"""

    def test_pending_payment_gets_marked_failed(self):
        order = self.make_order(680, [(self.product1, 1, 680)])
        payment = create_order_payment(order)

        result = mark_payment_abandoned(payment.merchant_trade_no)

        self.assertEqual(result.status, PaymentTransaction.STATUS_FAILED)
        payment.refresh_from_db()
        self.assertEqual(payment.status, PaymentTransaction.STATUS_FAILED)

    def test_already_paid_payment_is_not_overwritten(self):
        # 極端情境：使用者按返回商店的同時 ReturnURL 剛好也送達、已經標成 paid，
        # ClientBackURL 這裡絕對不能把它改回 failed
        order = self.make_order(680, [(self.product1, 1, 680)])
        payment = create_order_payment(order)
        payment.status = PaymentTransaction.STATUS_PAID
        payment.save(update_fields=["status"])

        result = mark_payment_abandoned(payment.merchant_trade_no)

        self.assertEqual(result.status, PaymentTransaction.STATUS_PAID)
        payment.refresh_from_db()
        self.assertEqual(payment.status, PaymentTransaction.STATUS_PAID)

    def test_unknown_merchant_trade_no_returns_none_without_crashing(self):
        result = mark_payment_abandoned("NOTEXIST00000001")
        self.assertIsNone(result)


class EcpayClientBackViewTests(PaymentsTestCase):
    """GET /api/payments/ecpay/client-back/"""

    def test_marks_payment_failed_and_redirects_to_cart(self):
        order = self.make_order(680, [(self.product1, 1, 680)])
        payment = create_order_payment(order)

        resp = self.client.get(f"/api/payments/ecpay/client-back/?merchant_trade_no={payment.merchant_trade_no}")

        self.assertEqual(resp.status_code, 302)
        self.assertEqual(resp["Location"], "https://frontend.example.com/cart")
        payment.refresh_from_db()
        self.assertEqual(payment.status, PaymentTransaction.STATUS_FAILED)

    def test_missing_merchant_trade_no_still_redirects(self):
        resp = self.client.get("/api/payments/ecpay/client-back/")
        self.assertEqual(resp.status_code, 302)
        self.assertEqual(resp["Location"], "https://frontend.example.com/cart")

    def test_post_request_returns_405(self):
        resp = self.client.post("/api/payments/ecpay/client-back/")
        self.assertEqual(resp.status_code, 405)


class ConsumerOrderViewStalePendingTests(PaymentsTestCase):
    """GET /api/consumer/order/view —— 卡住太久的 pending 訂單也該從列表隱藏"""

    def test_stale_pending_order_is_hidden(self):
        from django.utils import timezone
        from datetime import timedelta

        order = self.make_order(680, [(self.product1, 1, 680)])
        payment = create_order_payment(order)
        PaymentTransaction.objects.filter(pk=payment.pk).update(
            created_at=timezone.now() - timedelta(minutes=31)
        )

        resp = self.client.get(f"/api/consumer/order/view?User_id={self.user.user_id}")

        order_ids = {row["Order_id"] for row in resp.json()}
        self.assertNotIn(str(order.order_id), order_ids)

    def test_fresh_pending_order_still_shows(self):
        order = self.make_order(680, [(self.product1, 1, 680)])
        create_order_payment(order)  # 剛建立，還在合理的結帳時間內

        resp = self.client.get(f"/api/consumer/order/view?User_id={self.user.user_id}")

        order_ids = {row["Order_id"] for row in resp.json()}
        self.assertIn(str(order.order_id), order_ids)

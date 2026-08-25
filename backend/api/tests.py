import uuid
from decimal import Decimal
from unittest.mock import patch

import requests
from django.core.mail import EmailMessage
from django.test import Client, TestCase, override_settings

from api.email_backend import SendGridEmailBackend
from api.models import Order, OrderItem, Product, User, Vendor, VendorEmailVerificationCode
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


class ConsumerOrderViewFailedPaymentTests(TestCase):
    """
    GET /api/consumer/order/view —— 付款失敗的訂單不該出現在消費者的「我的訂單」列表/詳情裡，
    但還沒付款、或曾經失敗後來重試成功的訂單要正常顯示，不能被一起誤殺。
    """

    def setUp(self):
        self.client = Client()
        self.user = User.objects.create(
            role="consumer", name="測試用戶", email="order-view-test@example.com",
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

    def test_failed_only_order_is_hidden_from_list(self):
        failed_order = self.make_order()
        PaymentTransaction.objects.create(
            order=failed_order, merchant_trade_no="ORDERVIEWFAILED01", amount=failed_order.total_amount,
            status=PaymentTransaction.STATUS_FAILED,
        )

        resp = self.client.get(f"/api/consumer/order/view?User_id={self.user.user_id}")

        self.assertEqual(resp.status_code, 200)
        order_ids = {row["Order_id"] for row in resp.json()}
        self.assertNotIn(str(failed_order.order_id), order_ids)

    def test_failed_only_order_is_hidden_from_direct_detail_lookup(self):
        failed_order = self.make_order()
        PaymentTransaction.objects.create(
            order=failed_order, merchant_trade_no="ORDERVIEWFAILED02", amount=failed_order.total_amount,
            status=PaymentTransaction.STATUS_FAILED,
        )

        resp = self.client.get(f"/api/consumer/order/view?Order_id={failed_order.order_id}")

        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json(), [])

    def test_unpaid_order_without_any_payment_attempt_still_shows(self):
        order = self.make_order()  # 還沒按過付款，完全沒有 PaymentTransaction

        resp = self.client.get(f"/api/consumer/order/view?User_id={self.user.user_id}")

        order_ids = {row["Order_id"] for row in resp.json()}
        self.assertIn(str(order.order_id), order_ids)

    def test_order_that_failed_then_succeeded_on_retry_still_shows(self):
        order = self.make_order()
        PaymentTransaction.objects.create(
            order=order, merchant_trade_no="ORDERVIEWRETRY001", amount=order.total_amount,
            status=PaymentTransaction.STATUS_FAILED,
        )
        PaymentTransaction.objects.create(
            order=order, merchant_trade_no="ORDERVIEWRETRY002", amount=order.total_amount,
            status=PaymentTransaction.STATUS_PAID,
        )

        resp = self.client.get(f"/api/consumer/order/view?User_id={self.user.user_id}")

        order_ids = {row["Order_id"] for row in resp.json()}
        self.assertIn(str(order.order_id), order_ids)


class VendorEmailVerificationTests(TestCase):
    """
    廠商註冊信箱驗證：跟消費者/KOC 的 user_signup/verify_email/resend_verification_code
    是同一套邏輯，差別只在對象是 Vendor 不是 User。
    """

    def setUp(self):
        self.client = Client()

    def register(self, email="vendor-test@example.com", **overrides):
        payload = {
            "company_name": "測試公司",
            "contact_name": "測試聯絡人",
            "email": email,
            "password": "testpass123",
            "tax_id": str(uuid.uuid4().int)[:8],
        }
        payload.update(overrides)
        return self.client.post("/api/vendor/auth/register", data=payload, content_type="application/json")

    def get_latest_code(self, vendor_id):
        return VendorEmailVerificationCode.objects.filter(
            vendor_id=vendor_id
        ).order_by("-created_at").first().code

    def test_register_creates_unverified_vendor_and_sends_code(self):
        resp = self.register()
        self.assertEqual(resp.status_code, 201)
        body = resp.json()
        self.assertTrue(body["success"])
        self.assertTrue(body["requiresVerification"])

        vendor = Vendor.objects.get(vendor_id=body["vendor_id"])
        self.assertFalse(vendor.is_verified)
        self.assertTrue(VendorEmailVerificationCode.objects.filter(vendor=vendor).exists())

    def test_unverified_vendor_cannot_login(self):
        resp = self.register()
        vendor_id = resp.json()["vendor_id"]

        login_resp = self.client.post(
            "/api/vendor/auth/login",
            data={"vendor_id": vendor_id, "password": "testpass123"},
            content_type="application/json",
        )
        self.assertEqual(login_resp.status_code, 403)
        self.assertTrue(login_resp.json()["needsVerification"])

    def test_wrong_code_is_rejected(self):
        resp = self.register()
        resp_wrong = self.client.post(
            "/api/vendor/auth/verifyEmail",
            data={"email": "vendor-test@example.com", "code": "000000"},
            content_type="application/json",
        )
        self.assertEqual(resp_wrong.status_code, 400)

    def test_correct_code_verifies_and_unlocks_login(self):
        resp = self.register()
        vendor_id = resp.json()["vendor_id"]
        code = self.get_latest_code(vendor_id)

        verify_resp = self.client.post(
            "/api/vendor/auth/verifyEmail",
            data={"email": "vendor-test@example.com", "code": code},
            content_type="application/json",
        )
        self.assertEqual(verify_resp.status_code, 200)
        self.assertTrue(verify_resp.json()["success"])

        vendor = Vendor.objects.get(vendor_id=vendor_id)
        self.assertTrue(vendor.is_verified)

        login_resp = self.client.post(
            "/api/vendor/auth/login",
            data={"vendor_id": vendor_id, "password": "testpass123"},
            content_type="application/json",
        )
        self.assertEqual(login_resp.status_code, 200)
        self.assertTrue(login_resp.json()["success"])

    def test_resend_blocked_once_verified(self):
        resp = self.register()
        vendor_id = resp.json()["vendor_id"]
        code = self.get_latest_code(vendor_id)
        self.client.post(
            "/api/vendor/auth/verifyEmail",
            data={"email": "vendor-test@example.com", "code": code},
            content_type="application/json",
        )

        resend_resp = self.client.post(
            "/api/vendor/auth/resendVerification",
            data={"email": "vendor-test@example.com"},
            content_type="application/json",
        )
        self.assertEqual(resend_resp.status_code, 400)

    def test_resend_issues_new_working_code(self):
        resp = self.register()
        vendor_id = resp.json()["vendor_id"]

        resend_resp = self.client.post(
            "/api/vendor/auth/resendVerification",
            data={"email": "vendor-test@example.com"},
            content_type="application/json",
        )
        self.assertEqual(resend_resp.status_code, 200)

        new_code = self.get_latest_code(vendor_id)
        verify_resp = self.client.post(
            "/api/vendor/auth/verifyEmail",
            data={"email": "vendor-test@example.com", "code": new_code},
            content_type="application/json",
        )
        self.assertEqual(verify_resp.status_code, 200)

    def test_reregistering_unverified_email_deletes_stale_record(self):
        first_resp = self.register(email="vendor-stale@example.com")
        first_vendor_id = first_resp.json()["vendor_id"]
        # vendor_id 是自動遞增字串，舊紀錄刪除後下一筆很可能重新分配到同一個 vendor_id，
        # 所以要記住這筆驗證碼本身的 PK（verification_id），不能只憑 vendor_id 判斷「舊的還在不在」
        first_verification_id = VendorEmailVerificationCode.objects.filter(
            vendor_id=first_vendor_id
        ).values_list("verification_id", flat=True).first()

        second_resp = self.register(email="vendor-stale@example.com")
        self.assertEqual(second_resp.status_code, 201)

        # 舊的那一筆驗證碼紀錄（用 PK 精準指認）應該被一起刪掉，不會留下孤兒資料
        self.assertFalse(
            VendorEmailVerificationCode.objects.filter(verification_id=first_verification_id).exists()
        )
        self.assertEqual(Vendor.objects.filter(email="vendor-stale@example.com").count(), 1)

    def test_reregistering_verified_email_is_rejected(self):
        resp = self.register(email="vendor-verified@example.com")
        vendor_id = resp.json()["vendor_id"]
        code = self.get_latest_code(vendor_id)
        self.client.post(
            "/api/vendor/auth/verifyEmail",
            data={"email": "vendor-verified@example.com", "code": code},
            content_type="application/json",
        )

        second_resp = self.register(email="vendor-verified@example.com")
        self.assertEqual(second_resp.status_code, 400)

    def test_duplicate_tax_id_is_rejected(self):
        tax_id = str(uuid.uuid4().int)[:8]
        self.register(email="vendor-tax-a@example.com", tax_id=tax_id)

        second_resp = self.register(email="vendor-tax-b@example.com", tax_id=tax_id)
        self.assertEqual(second_resp.status_code, 400)
        self.assertIn("Tax ID", second_resp.json()["err"])


class _MockResponse:
    def __init__(self, status_code=200):
        self.status_code = status_code

    def raise_for_status(self):
        if self.status_code >= 400:
            raise requests.HTTPError(f"status {self.status_code}")


@override_settings(SENDGRID_API_KEY="test-sendgrid-key")
class SendGridEmailBackendTests(TestCase):
    """透過 SendGrid HTTP API 寄信的 backend —— 全程 mock requests.post，不打真正的 SendGrid"""

    def _build_message(self, **kwargs):
        return EmailMessage(
            subject=kwargs.get("subject", "測試信件"),
            body=kwargs.get("body", "測試內容"),
            from_email=kwargs.get("from_email", "KOC Platform <sender@example.com>"),
            to=kwargs.get("to", ["user@example.com"]),
            cc=kwargs.get("cc"),
            bcc=kwargs.get("bcc"),
        )

    @patch("api.email_backend.requests.post")
    def test_send_messages_posts_expected_payload(self, mock_post):
        mock_post.return_value = _MockResponse(202)
        message = self._build_message()

        sent = SendGridEmailBackend().send_messages([message])

        self.assertEqual(sent, 1)
        called_url = mock_post.call_args.args[0]
        self.assertEqual(called_url, "https://api.sendgrid.com/v3/mail/send")

        headers = mock_post.call_args.kwargs["headers"]
        self.assertEqual(headers["Authorization"], "Bearer test-sendgrid-key")

        payload = mock_post.call_args.kwargs["json"]
        self.assertEqual(payload["from"], {"email": "sender@example.com", "name": "KOC Platform"})
        self.assertEqual(payload["personalizations"], [{"to": [{"email": "user@example.com"}]}])
        self.assertEqual(payload["subject"], "測試信件")
        self.assertEqual(payload["content"], [{"type": "text/plain", "value": "測試內容"}])

    @patch("api.email_backend.requests.post")
    def test_send_messages_includes_cc_and_bcc_when_present(self, mock_post):
        mock_post.return_value = _MockResponse(202)
        message = self._build_message(cc=["cc@example.com"], bcc=["bcc@example.com"])

        SendGridEmailBackend().send_messages([message])

        personalization = mock_post.call_args.kwargs["json"]["personalizations"][0]
        self.assertEqual(personalization["cc"], [{"email": "cc@example.com"}])
        self.assertEqual(personalization["bcc"], [{"email": "bcc@example.com"}])

    @override_settings(SENDGRID_API_KEY="")
    def test_missing_api_key_raises_when_not_fail_silently(self):
        message = self._build_message()

        with self.assertRaises(ValueError):
            SendGridEmailBackend().send_messages([message])

    @override_settings(SENDGRID_API_KEY="")
    def test_missing_api_key_returns_zero_when_fail_silently(self):
        message = self._build_message()

        sent = SendGridEmailBackend(fail_silently=True).send_messages([message])

        self.assertEqual(sent, 0)

    @patch("api.email_backend.requests.post")
    def test_http_error_raises_when_not_fail_silently(self, mock_post):
        mock_post.return_value = _MockResponse(500)
        message = self._build_message()

        with self.assertRaises(Exception):
            SendGridEmailBackend().send_messages([message])

    @patch("api.email_backend.requests.post")
    def test_http_error_fails_silently_when_requested(self, mock_post):
        mock_post.return_value = _MockResponse(500)
        message = self._build_message()

        sent = SendGridEmailBackend(fail_silently=True).send_messages([message])

        self.assertEqual(sent, 0)

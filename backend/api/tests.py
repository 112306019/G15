import uuid
from datetime import timedelta
from decimal import Decimal
from unittest.mock import patch

import requests
from django.core.mail import EmailMessage
from django.test import Client, TestCase, override_settings
from django.utils import timezone

from api.email_backend import SendGridEmailBackend
from api.models import (
    Order, OrderItem, Product, User, Vendor, VendorEmailVerificationCode,
    SupportChatRoom, SupportMessage, KOC, KOCMissionNew, Application, Campaigns,
    RemunerationForm, Earnings,
)
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

    def test_vendor_order_list_hides_failed_payment_order(self):
        failed_order = self.make_order()
        PaymentTransaction.objects.create(
            order=failed_order, merchant_trade_no="VENDORLISTFAILED1", amount=failed_order.total_amount,
            status=PaymentTransaction.STATUS_FAILED,
        )

        ok_order = self.make_order()  # 還沒付款，正常訂單，不該被一起濾掉

        resp = self.client.get("/api/vendor/order/getlist", {"vendor_id": "V00001"})

        self.assertEqual(resp.status_code, 200)
        order_ids = {row["order_id"] for row in resp.json()["orders"]}
        self.assertNotIn(str(failed_order.order_id), order_ids)
        self.assertIn(str(ok_order.order_id), order_ids)

    def test_vendor_order_detail_hides_failed_payment_order(self):
        failed_order = self.make_order()
        PaymentTransaction.objects.create(
            order=failed_order, merchant_trade_no="VENDORDETAILFAIL1", amount=failed_order.total_amount,
            status=PaymentTransaction.STATUS_FAILED,
        )

        resp = self.client.get(
            "/api/vendor/order/getDetail",
            {"vendor_id": "V00001", "order_id": str(failed_order.order_id)},
        )

        self.assertEqual(resp.status_code, 404)


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


class CancelOrderTests(TestCase):
    """
    消費者取消訂單：
    - 待出貨（unshipped）：直接取消，庫存立刻加回去。
    - 備貨中（preparing）：變成 cancel_requested，庫存先不動，等廠商核准/拒絕。
    - 已出貨/已送達：不能取消。

    廠商核准/拒絕取消申請：
    - 核准：訂單變 cancelled，庫存加回去。
    - 拒絕：訂單退回 pending，繼續備貨流程，庫存不變。
    """

    def setUp(self):
        self.client = Client()
        self.user = User.objects.create(
            role="consumer", name="測試用戶", email="cancel-order-test@example.com",
            password="x", phone="0900000000",
        )
        self.other_user = User.objects.create(
            role="consumer", name="別的用戶", email="cancel-order-other@example.com",
            password="x", phone="0900000001",
        )
        self.product = Product.objects.create(
            vendor_id="V00001", product_name="測試商品", price=500, stock=10, status="active"
        )

    def make_order(self, shipping_status="unshipped", order_status="pending", quantity=2):
        order = Order.objects.create(
            user=self.user, total_amount=500 * quantity,
            shipping_status=shipping_status, order_status=order_status,
        )
        OrderItem.objects.create(
            order=order, product=self.product, quantity=quantity,
            unit_price=500, subtotal=500 * quantity,
        )
        return order

    def test_cancel_while_unshipped_is_immediate_and_restores_stock(self):
        order = self.make_order(shipping_status="unshipped")
        self.product.stock = 5
        self.product.save(update_fields=["stock"])

        resp = self.client.post(
            "/api/consumer/order/cancel",
            data={"order_id": str(order.order_id), "user_id": self.user.user_id},
            content_type="application/json",
        )

        self.assertEqual(resp.status_code, 200)
        body = resp.json()
        self.assertTrue(body["success"])
        self.assertEqual(body["order_status"], "cancelled")
        self.assertEqual(body["shipping_status"], "cancelled")

        order.refresh_from_db()
        self.assertEqual(order.order_status, "cancelled")
        self.assertEqual(order.shipping_status, "cancelled")

        self.product.refresh_from_db()
        self.assertEqual(self.product.stock, 7)  # 5 + 2（訂單數量）

    def test_cancel_while_unshipped_marks_paid_transaction_refund_pending(self):
        order = self.make_order(shipping_status="unshipped")
        order.payment_status = "paid"
        order.save(update_fields=["payment_status"])
        payment = PaymentTransaction.objects.create(
            order=order, merchant_trade_no="CANCELREFUNDPEND01", amount=order.total_amount,
            status=PaymentTransaction.STATUS_PAID,
        )

        resp = self.client.post(
            "/api/consumer/order/cancel",
            data={"order_id": str(order.order_id), "user_id": self.user.user_id},
            content_type="application/json",
        )

        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()["payment_status"], "refund_pending")

        payment.refresh_from_db()
        self.assertEqual(payment.status, PaymentTransaction.STATUS_REFUND_PENDING)

    def test_cancel_while_unshipped_without_payment_leaves_payment_status_null(self):
        order = self.make_order(shipping_status="unshipped")  # 從沒付過款，沒有任何 PaymentTransaction

        resp = self.client.post(
            "/api/consumer/order/cancel",
            data={"order_id": str(order.order_id), "user_id": self.user.user_id},
            content_type="application/json",
        )

        self.assertEqual(resp.status_code, 200)
        self.assertIsNone(resp.json()["payment_status"])

    def test_cancel_while_preparing_requires_vendor_approval_and_does_not_touch_stock(self):
        order = self.make_order(shipping_status="preparing")
        self.product.stock = 5
        self.product.save(update_fields=["stock"])

        resp = self.client.post(
            "/api/consumer/order/cancel",
            data={"order_id": str(order.order_id), "user_id": self.user.user_id},
            content_type="application/json",
        )

        self.assertEqual(resp.status_code, 200)
        body = resp.json()
        self.assertEqual(body["order_status"], "cancel_requested")
        self.assertEqual(body["shipping_status"], "preparing")  # 出貨狀態還沒被動到

        order.refresh_from_db()
        self.assertEqual(order.order_status, "cancel_requested")
        self.assertEqual(order.shipping_status, "preparing")

        self.product.refresh_from_db()
        self.assertEqual(self.product.stock, 5)  # 還沒核准，庫存不該變

    def test_cancel_while_shipped_is_rejected(self):
        order = self.make_order(shipping_status="shipped")

        resp = self.client.post(
            "/api/consumer/order/cancel",
            data={"order_id": str(order.order_id), "user_id": self.user.user_id},
            content_type="application/json",
        )

        self.assertEqual(resp.status_code, 400)
        order.refresh_from_db()
        self.assertEqual(order.order_status, "pending")  # 沒有被改動

    def test_cancel_already_cancelled_order_is_rejected(self):
        order = self.make_order(shipping_status="cancelled", order_status="cancelled")

        resp = self.client.post(
            "/api/consumer/order/cancel",
            data={"order_id": str(order.order_id), "user_id": self.user.user_id},
            content_type="application/json",
        )

        self.assertEqual(resp.status_code, 400)

    def test_cancel_while_already_requested_is_rejected(self):
        order = self.make_order(shipping_status="preparing", order_status="cancel_requested")

        resp = self.client.post(
            "/api/consumer/order/cancel",
            data={"order_id": str(order.order_id), "user_id": self.user.user_id},
            content_type="application/json",
        )

        self.assertEqual(resp.status_code, 400)

    def test_cancel_by_non_owner_is_forbidden(self):
        order = self.make_order(shipping_status="unshipped")

        resp = self.client.post(
            "/api/consumer/order/cancel",
            data={"order_id": str(order.order_id), "user_id": self.other_user.user_id},
            content_type="application/json",
        )

        self.assertEqual(resp.status_code, 403)
        order.refresh_from_db()
        self.assertEqual(order.order_status, "pending")

    def test_vendor_approve_cancel_request_restores_stock(self):
        order = self.make_order(shipping_status="preparing", order_status="cancel_requested")
        self.product.stock = 3
        self.product.save(update_fields=["stock"])

        resp = self.client.post(
            "/api/vendor/order/respondCancelRequest",
            data={"vendor_id": "V00001", "order_id": str(order.order_id), "approve": True},
            content_type="application/json",
        )

        self.assertEqual(resp.status_code, 200)
        body = resp.json()
        self.assertEqual(body["order_status"], "cancelled")
        self.assertEqual(body["shipping_status"], "cancelled")

        order.refresh_from_db()
        self.assertEqual(order.order_status, "cancelled")
        self.assertEqual(order.shipping_status, "cancelled")

        self.product.refresh_from_db()
        self.assertEqual(self.product.stock, 5)  # 3 + 2（訂單數量）

    def test_vendor_approve_cancel_request_marks_paid_transaction_refund_pending(self):
        order = self.make_order(shipping_status="preparing", order_status="cancel_requested")
        payment = PaymentTransaction.objects.create(
            order=order, merchant_trade_no="VENDORAPPROVEREFND", amount=order.total_amount,
            status=PaymentTransaction.STATUS_PAID,
        )

        resp = self.client.post(
            "/api/vendor/order/respondCancelRequest",
            data={"vendor_id": "V00001", "order_id": str(order.order_id), "approve": True},
            content_type="application/json",
        )

        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()["payment_status"], "refund_pending")

        payment.refresh_from_db()
        self.assertEqual(payment.status, PaymentTransaction.STATUS_REFUND_PENDING)

    def test_vendor_reject_cancel_request_reverts_to_pending_without_touching_stock(self):
        order = self.make_order(shipping_status="preparing", order_status="cancel_requested")
        self.product.stock = 3
        self.product.save(update_fields=["stock"])

        resp = self.client.post(
            "/api/vendor/order/respondCancelRequest",
            data={"vendor_id": "V00001", "order_id": str(order.order_id), "approve": False},
            content_type="application/json",
        )

        self.assertEqual(resp.status_code, 200)
        body = resp.json()
        self.assertEqual(body["order_status"], "pending")
        self.assertEqual(body["shipping_status"], "preparing")
        self.assertTrue(body["cancel_rejected"])

        order.refresh_from_db()
        self.assertEqual(order.order_status, "pending")
        self.assertEqual(order.shipping_status, "preparing")
        self.assertIsNotNone(order.cancel_rejected_at)

        self.product.refresh_from_db()
        self.assertEqual(self.product.stock, 3)  # 拒絕了，庫存不該變

    def test_cancel_is_blocked_after_vendor_already_rejected_once(self):
        order = self.make_order(shipping_status="preparing", order_status="cancel_requested")

        reject_resp = self.client.post(
            "/api/vendor/order/respondCancelRequest",
            data={"vendor_id": "V00001", "order_id": str(order.order_id), "approve": False},
            content_type="application/json",
        )
        self.assertEqual(reject_resp.status_code, 200)

        # 廠商拒絕後訂單退回 pending，理論上又符合「preparing + pending」可以申請取消的條件，
        # 但這筆訂單已經被拒絕過一次，不該讓消費者無限重複申請。
        second_resp = self.client.post(
            "/api/consumer/order/cancel",
            data={"order_id": str(order.order_id), "user_id": self.user.user_id},
            content_type="application/json",
        )

        self.assertEqual(second_resp.status_code, 400)

        view_resp = self.client.get(f"/api/consumer/order/view?Order_id={order.order_id}")
        self.assertTrue(view_resp.json()[0]["cancel_rejected"])

    def test_vendor_respond_without_pending_request_is_rejected(self):
        order = self.make_order(shipping_status="preparing", order_status="pending")

        resp = self.client.post(
            "/api/vendor/order/respondCancelRequest",
            data={"vendor_id": "V00001", "order_id": str(order.order_id), "approve": True},
            content_type="application/json",
        )

        self.assertEqual(resp.status_code, 400)

    def test_vendor_respond_for_order_not_belonging_to_vendor_is_not_found(self):
        order = self.make_order(shipping_status="preparing", order_status="cancel_requested")

        resp = self.client.post(
            "/api/vendor/order/respondCancelRequest",
            data={"vendor_id": "V99999", "order_id": str(order.order_id), "approve": True},
            content_type="application/json",
        )

        self.assertEqual(resp.status_code, 404)


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


class SupportChatTests(TestCase):
    """
    客服聊天室：廠商/消費者(含 KOC)各自只有一間持續使用的聊天室，
    跟平台客服（admin）一對一對話。廠商跟消費者兩側的端點邏輯一樣，
    只是身分欄位跟 URL 前綴不同，這裡兩邊都測。
    """

    def setUp(self):
        self.client = Client()
        self.vendor = Vendor.objects.create(
            vendor_id="V00001", company_name="測試廠商", contact_name="廠商聯絡人",
            email="support-vendor@example.com", password="x", tax_id="12345678",
        )
        self.user = User.objects.create(
            role="consumer", name="測試消費者", email="support-user@example.com",
            password="x", phone="0900000000",
        )

    # ── 廠商端 ──

    def test_vendor_get_or_create_room_is_idempotent(self):
        first = self.client.post(
            "/api/vendor/support/getOrCreateRoom",
            data={"vendor_id": "V00001"}, content_type="application/json",
        )
        second = self.client.post(
            "/api/vendor/support/getOrCreateRoom",
            data={"vendor_id": "V00001"}, content_type="application/json",
        )

        self.assertEqual(first.status_code, 201)
        self.assertEqual(second.status_code, 200)
        self.assertEqual(first.json()["room_id"], second.json()["room_id"])
        self.assertEqual(SupportChatRoom.objects.filter(participant_type="vendor", participant_id="V00001").count(), 1)

    def test_vendor_send_message_creates_room_implicitly(self):
        resp = self.client.post(
            "/api/vendor/support/sendMessage",
            data={"vendor_id": "V00001", "content": "請問我的訂單什麼時候出貨？"},
            content_type="application/json",
        )

        self.assertEqual(resp.status_code, 201)
        message = resp.json()["message"]
        self.assertEqual(message["sender_role"], "vendor")
        self.assertEqual(message["sender_id"], "V00001")
        self.assertFalse(message["is_read"])

    def test_vendor_send_message_requires_content(self):
        resp = self.client.post(
            "/api/vendor/support/sendMessage",
            data={"vendor_id": "V00001", "content": "  "}, content_type="application/json",
        )
        self.assertEqual(resp.status_code, 400)

    def test_vendor_get_messages_marks_admin_messages_read_but_not_own(self):
        room = SupportChatRoom.objects.create(participant_type="vendor", participant_id="V00001")
        SupportMessage.objects.create(room=room, sender_role="vendor", sender_id="V00001", content="你好")
        SupportMessage.objects.create(room=room, sender_role="admin", sender_id="1", content="您好，有什麼可以幫忙的？")

        resp = self.client.get("/api/vendor/support/getMessages", {"vendor_id": "V00001"})

        self.assertEqual(resp.status_code, 200)
        messages = resp.json()["messages"]
        self.assertEqual(len(messages), 2)

        vendor_msg = next(m for m in messages if m["sender_role"] == "vendor")
        admin_msg = next(m for m in messages if m["sender_role"] == "admin")
        self.assertFalse(vendor_msg["is_read"])  # 自己發的訊息不會被自己這支 API 改已讀
        self.assertTrue(admin_msg["is_read"])   # 客服發的訊息，廠商一開啟就算已讀

    def test_vendor_unread_count_zero_without_room(self):
        resp = self.client.get("/api/vendor/support/unreadCount", {"vendor_id": "V00001"})
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()["unread_count"], 0)

    def test_vendor_unread_count_reflects_unread_admin_messages(self):
        room = SupportChatRoom.objects.create(participant_type="vendor", participant_id="V00001")
        SupportMessage.objects.create(room=room, sender_role="admin", sender_id="1", content="訊息一")
        SupportMessage.objects.create(room=room, sender_role="admin", sender_id="1", content="訊息二")
        SupportMessage.objects.create(room=room, sender_role="vendor", sender_id="V00001", content="自己發的不算未讀")

        resp = self.client.get("/api/vendor/support/unreadCount", {"vendor_id": "V00001"})
        self.assertEqual(resp.json()["unread_count"], 2)

    # ── 消費者 / KOC 端 ──

    def test_user_get_or_create_room_is_idempotent(self):
        first = self.client.post(
            "/api/user/support/getOrCreateRoom",
            data={"user_id": self.user.user_id}, content_type="application/json",
        )
        second = self.client.post(
            "/api/user/support/getOrCreateRoom",
            data={"user_id": self.user.user_id}, content_type="application/json",
        )

        self.assertEqual(first.status_code, 201)
        self.assertEqual(second.status_code, 200)
        self.assertEqual(first.json()["room_id"], second.json()["room_id"])

    def test_user_send_and_get_messages_round_trip(self):
        self.client.post(
            "/api/user/support/sendMessage",
            data={"user_id": self.user.user_id, "content": "我想詢問退款進度"},
            content_type="application/json",
        )

        resp = self.client.get("/api/user/support/getMessages", {"user_id": self.user.user_id})

        self.assertEqual(resp.status_code, 200)
        messages = resp.json()["messages"]
        self.assertEqual(len(messages), 1)
        self.assertEqual(messages[0]["sender_role"], "user")
        self.assertEqual(messages[0]["sender_id"], self.user.user_id)

    def test_user_unread_count_reflects_unread_admin_messages(self):
        room = SupportChatRoom.objects.create(participant_type="user", participant_id=self.user.user_id)
        SupportMessage.objects.create(room=room, sender_role="admin", sender_id="1", content="您好")

        resp = self.client.get("/api/user/support/unreadCount", {"user_id": self.user.user_id})
        self.assertEqual(resp.json()["unread_count"], 1)

    def test_vendor_and_user_rooms_are_isolated(self):
        # 剛好同一個字串當 id 也不該互相污染（雖然目前 vendor_id/user_id 格式不同，仍測試邊界情況）
        SupportChatRoom.objects.create(participant_type="vendor", participant_id="SHARED01")
        SupportChatRoom.objects.create(participant_type="user", participant_id="SHARED01")
        self.assertEqual(SupportChatRoom.objects.filter(participant_id="SHARED01").count(), 2)

    # ── 平台客服端 ──

    def test_admin_get_rooms_requires_valid_participant_type(self):
        resp = self.client.get("/api/platform/support/getRooms", {"participant_type": "invalid"})
        self.assertEqual(resp.status_code, 400)

    def test_admin_get_rooms_filters_by_participant_type(self):
        SupportChatRoom.objects.create(participant_type="vendor", participant_id="V00001")
        SupportChatRoom.objects.create(participant_type="user", participant_id=self.user.user_id)

        vendor_resp = self.client.get("/api/platform/support/getRooms", {"participant_type": "vendor"})
        user_resp = self.client.get("/api/platform/support/getRooms", {"participant_type": "user"})

        vendor_rooms = vendor_resp.json()["rooms"]
        user_rooms = user_resp.json()["rooms"]

        self.assertEqual(len(vendor_rooms), 1)
        self.assertEqual(vendor_rooms[0]["participant_id"], "V00001")
        self.assertEqual(vendor_rooms[0]["participant_name"], "測試廠商")

        self.assertEqual(len(user_rooms), 1)
        self.assertEqual(user_rooms[0]["participant_id"], self.user.user_id)
        self.assertEqual(user_rooms[0]["participant_name"], "測試消費者")

    def test_admin_get_rooms_includes_unread_count_from_participant_side(self):
        room = SupportChatRoom.objects.create(participant_type="vendor", participant_id="V00001")
        SupportMessage.objects.create(room=room, sender_role="vendor", sender_id="V00001", content="訊息一")
        SupportMessage.objects.create(room=room, sender_role="admin", sender_id="1", content="已讀客服訊息不算")

        resp = self.client.get("/api/platform/support/getRooms", {"participant_type": "vendor"})
        self.assertEqual(resp.json()["rooms"][0]["unread_count"], 1)

    def test_admin_send_message_and_get_messages(self):
        room = SupportChatRoom.objects.create(participant_type="vendor", participant_id="V00001")

        send_resp = self.client.post(
            "/api/platform/support/sendMessage",
            data={"room_id": room.room_id, "admin_id": "1", "content": "您好，我是客服"},
            content_type="application/json",
        )
        self.assertEqual(send_resp.status_code, 201)
        self.assertEqual(send_resp.json()["message"]["sender_role"], "admin")

        get_resp = self.client.get("/api/platform/support/getMessages", {"room_id": room.room_id})
        self.assertEqual(get_resp.status_code, 200)
        self.assertEqual(len(get_resp.json()["messages"]), 1)
        self.assertEqual(get_resp.json()["room"]["participant_name"], "測試廠商")

    def test_admin_get_messages_does_not_auto_mark_read(self):
        room = SupportChatRoom.objects.create(participant_type="vendor", participant_id="V00001")
        SupportMessage.objects.create(room=room, sender_role="vendor", sender_id="V00001", content="你好")

        self.client.get("/api/platform/support/getMessages", {"room_id": room.room_id})

        self.assertFalse(SupportMessage.objects.get(room=room).is_read)

    def test_admin_mark_read_marks_participant_messages_but_not_own(self):
        room = SupportChatRoom.objects.create(participant_type="vendor", participant_id="V00001")
        SupportMessage.objects.create(room=room, sender_role="vendor", sender_id="V00001", content="你好")
        SupportMessage.objects.create(room=room, sender_role="admin", sender_id="1", content="您好")

        resp = self.client.post(
            "/api/platform/support/markRead",
            data={"room_id": room.room_id}, content_type="application/json",
        )

        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()["updated_count"], 1)

        vendor_msg = SupportMessage.objects.get(room=room, sender_role="vendor")
        admin_msg = SupportMessage.objects.get(room=room, sender_role="admin")
        self.assertTrue(vendor_msg.is_read)
        self.assertFalse(admin_msg.is_read)  # admin 自己發的訊息不受這支影響

    def test_admin_get_messages_for_missing_room_is_not_found(self):
        resp = self.client.get("/api/platform/support/getMessages", {"room_id": 999999})
        self.assertEqual(resp.status_code, 404)


class KocMissionExpiryTests(TestCase):
    """
    GET /api/koc/mission/getlist —— 任務是否過期的判斷：不管卡在哪個階段，
    只要現在日期超過「活動截止日 + 推廣寬限天數（promo_days）」就算過期，
    只有 completed 是例外（代表任務本身有正常跑完，不算過期）。
    """

    def setUp(self):
        self.client = Client()
        self.user = User.objects.create(
            role="koc", name="測試 KOC", email="mission-expiry-test@example.com",
            password="x", phone="0900000000",
        )
        self.koc = KOC.objects.create(user=self.user)
        self.vendor = Vendor.objects.create(
            vendor_id="V00001", company_name="測試廠商", contact_name="廠商聯絡人",
            email="mission-expiry-vendor@example.com", password="x", tax_id="12345678",
        )

    def make_mission(self, stage, days_since_end=0, promo_days=7):
        now = timezone.now()
        campaign = Campaigns.objects.create(
            vendor=self.vendor, name="測試活動", budget=1000, reward_type="cash",
            promo_days=promo_days,
            start_date=now - timedelta(days=30),
            end_date=now - timedelta(days=days_since_end),
        )
        application = Application.objects.create(koc=self.koc, campaign=campaign, status="approved")
        mission = KOCMissionNew.objects.create(application=application, koc=self.koc, stage=stage)
        return mission

    def get_mission(self, stage_code):
        resp = self.client.get(
            "/api/koc/mission/getlist",
            {"User_id": self.user.user_id, "stage": stage_code},
        )
        self.assertEqual(resp.status_code, 200)
        missions = resp.json()["missions"]
        self.assertEqual(len(missions), 1)
        return missions[0]

    def test_writing_stage_past_deadline_and_grace_period_is_expired(self):
        # end_date 7 天前，promo_days 寬限 7 天 -> 剛好用完寬限期，今天已經超過
        self.make_mission(stage="writing", days_since_end=8, promo_days=7)
        mission = self.get_mission(stage_code=0)
        self.assertTrue(mission["is_expired"])

    def test_writing_stage_within_grace_period_is_not_expired(self):
        # end_date 3 天前，promo_days 寬限 7 天 -> 還在寬限期內
        self.make_mission(stage="writing", days_since_end=3, promo_days=7)
        mission = self.get_mission(stage_code=0)
        self.assertFalse(mission["is_expired"])

    def test_publishing_stage_past_grace_period_is_expired(self):
        # 不管卡在哪個階段都適用，這裡測 publishing(2)
        self.make_mission(stage="publishing", days_since_end=10, promo_days=7)
        mission = self.get_mission(stage_code=2)
        self.assertTrue(mission["is_expired"])

    def test_completed_stage_is_never_expired(self):
        # 已結案代表任務正常跑完，即使早就超過截止日+寬限期也不算過期
        self.make_mission(stage="completed", days_since_end=30, promo_days=7)
        mission = self.get_mission(stage_code=4)
        self.assertFalse(mission["is_expired"])


class TaxFormTests(TestCase):
    """
    勞務報酬單（勞報單）：KOC 提交雲端連結、平台/財務審核通過或退回。
    """

    def setUp(self):
        self.client = Client()
        self.user = User.objects.create(
            role="koc", name="測試 KOC", email="tax-form-test@example.com",
            password="x", phone="0900000000",
        )
        self.other_user = User.objects.create(
            role="koc", name="別的 KOC", email="tax-form-other@example.com",
            password="x", phone="0900000001",
        )
        self.koc = KOC.objects.create(user=self.user)
        self.vendor = Vendor.objects.create(
            vendor_id="V00001", company_name="測試廠商", contact_name="廠商聯絡人",
            email="tax-form-vendor@example.com", password="x", tax_id="12345678",
        )

    def make_mission(self, stage="completed"):
        now = timezone.now()
        campaign = Campaigns.objects.create(
            vendor=self.vendor, name="測試活動", budget=1000, reward_type="cash",
            start_date=now - timedelta(days=30), end_date=now - timedelta(days=5),
        )
        application = Application.objects.create(koc=self.koc, campaign=campaign, status="approved")
        mission = KOCMissionNew.objects.create(application=application, koc=self.koc, stage=stage)
        return mission

    def submit_link(self, mission, url="https://drive.google.com/file/d/abc123/view", user_id=None):
        return self.client.post(
            "/api/koc/mission/submitTaxFormLink",
            data={"User_id": user_id or self.user.user_id, "kocmission_id": mission.kocmission_id, "url": url},
            content_type="application/json",
        )

    # ── 勞報單資料（給前端渲染/列印用） ──

    def test_get_tax_form_data_succeeds_for_owner(self):
        mission = self.make_mission(stage="completed")
        Earnings.objects.create(user=self.user, kocmission=mission, amount=2000, status="withdrawable")

        resp = self.client.get(
            "/api/koc/mission/taxFormData",
            {"User_id": self.user.user_id, "kocmission_id": mission.kocmission_id},
        )

        self.assertEqual(resp.status_code, 200)
        body = resp.json()
        self.assertTrue(body["success"])
        self.assertEqual(body["koc_name"], "測試 KOC")
        self.assertEqual(body["vendor_name"], "測試廠商")
        self.assertEqual(body["vendor_tax_id"], "12345678")
        self.assertEqual(body["campaign_name"], "測試活動")
        self.assertEqual(body["amount"], 2000)
        self.assertEqual(body["mission_id"], mission.kocmission_id)

    def test_get_tax_form_data_by_non_owner_is_forbidden(self):
        mission = self.make_mission(stage="completed")

        resp = self.client.get(
            "/api/koc/mission/taxFormData",
            {"User_id": self.other_user.user_id, "kocmission_id": mission.kocmission_id},
        )

        self.assertEqual(resp.status_code, 403)

    def test_get_tax_form_data_for_missing_mission_is_not_found(self):
        resp = self.client.get(
            "/api/koc/mission/taxFormData",
            {"User_id": self.user.user_id, "kocmission_id": 999999},
        )

        self.assertEqual(resp.status_code, 404)

    # ── KOC 提交連結 ──

    def test_submit_link_on_completed_mission_creates_pending_review(self):
        mission = self.make_mission(stage="completed")

        resp = self.submit_link(mission)

        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()["tax_form_status"], "pending_review")

        form = RemunerationForm.objects.get(kocmission=mission)
        self.assertEqual(form.status, "pending_review")
        self.assertEqual(form.cloud_link_url, "https://drive.google.com/file/d/abc123/view")
        self.assertIsNotNone(form.submitted_at)

    def test_submit_link_on_non_completed_mission_is_rejected(self):
        mission = self.make_mission(stage="promoting")

        resp = self.submit_link(mission)

        self.assertEqual(resp.status_code, 400)
        self.assertFalse(RemunerationForm.objects.filter(kocmission=mission).exists())

    def test_submit_invalid_url_format_is_rejected(self):
        mission = self.make_mission(stage="completed")

        resp = self.submit_link(mission, url="not-a-real-url")

        self.assertEqual(resp.status_code, 400)

    def test_submit_by_non_owner_is_forbidden(self):
        mission = self.make_mission(stage="completed")

        resp = self.submit_link(mission, user_id=self.other_user.user_id)

        self.assertEqual(resp.status_code, 403)

    def test_resubmit_after_rejection_clears_reject_reason_and_reopens_review(self):
        mission = self.make_mission(stage="completed")
        self.submit_link(mission)
        form = RemunerationForm.objects.get(kocmission=mission)
        form.status = "rejected"
        form.reject_reason = "連結權限未開放"
        form.save(update_fields=["status", "reject_reason"])

        resp = self.submit_link(mission, url="https://drive.google.com/file/d/newlink/view")

        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()["tax_form_status"], "pending_review")

        form.refresh_from_db()
        self.assertEqual(form.status, "pending_review")
        self.assertIsNone(form.reject_reason)
        self.assertEqual(form.cloud_link_url, "https://drive.google.com/file/d/newlink/view")

    def test_submit_after_approved_is_locked(self):
        mission = self.make_mission(stage="completed")
        self.submit_link(mission)
        form = RemunerationForm.objects.get(kocmission=mission)
        form.status = "approved"
        form.save(update_fields=["status"])

        resp = self.submit_link(mission, url="https://drive.google.com/file/d/another/view")

        self.assertEqual(resp.status_code, 400)
        form.refresh_from_db()
        self.assertEqual(form.status, "approved")

    def test_mission_list_reports_not_submitted_when_no_form_exists(self):
        self.make_mission(stage="completed")

        resp = self.client.get("/api/koc/mission/getlist", {"User_id": self.user.user_id, "stage": 4})

        mission_row = resp.json()["missions"][0]
        self.assertEqual(mission_row["tax_form_status"], "not_submitted")
        self.assertIsNone(mission_row["tax_form_url"])

    # ── 平台/財務審核 ──

    def test_admin_get_tax_forms_filters_by_status_and_includes_amount(self):
        mission = self.make_mission(stage="completed")
        self.submit_link(mission)
        Earnings.objects.create(user=self.user, kocmission=mission, amount=1500, status="withdrawable")

        resp = self.client.get("/api/platform/taxForms/getlist", {"status": "pending_review"})

        self.assertEqual(resp.status_code, 200)
        forms = resp.json()["forms"]
        self.assertEqual(len(forms), 1)
        self.assertEqual(forms[0]["amount"], 1500)
        self.assertEqual(forms[0]["koc_name"], "測試 KOC")
        self.assertEqual(forms[0]["campaign_name"], "測試活動")

        empty_resp = self.client.get("/api/platform/taxForms/getlist", {"status": "approved"})
        self.assertEqual(empty_resp.json()["forms"], [])

    def test_admin_get_tax_forms_rejects_invalid_status(self):
        resp = self.client.get("/api/platform/taxForms/getlist", {"status": "bogus"})
        self.assertEqual(resp.status_code, 400)

    def test_admin_approve_tax_form(self):
        mission = self.make_mission(stage="completed")
        self.submit_link(mission)
        form = RemunerationForm.objects.get(kocmission=mission)

        resp = self.client.post(
            "/api/platform/taxForms/review",
            data={"form_id": form.form_id, "admin_id": "1", "action": "approve"},
            content_type="application/json",
        )

        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()["status"], "approved")

        form.refresh_from_db()
        self.assertEqual(form.status, "approved")
        self.assertEqual(form.reviewed_by_admin_id, "1")
        self.assertIsNotNone(form.reviewed_at)

    def test_admin_reject_tax_form_requires_reason(self):
        mission = self.make_mission(stage="completed")
        self.submit_link(mission)
        form = RemunerationForm.objects.get(kocmission=mission)

        resp = self.client.post(
            "/api/platform/taxForms/review",
            data={"form_id": form.form_id, "admin_id": "1", "action": "reject"},
            content_type="application/json",
        )

        self.assertEqual(resp.status_code, 400)
        form.refresh_from_db()
        self.assertEqual(form.status, "pending_review")

    @patch("api.views.platform.send_tax_form_rejected_email")
    def test_admin_reject_tax_form_sends_notification(self, mock_send_email):
        mission = self.make_mission(stage="completed")
        self.submit_link(mission)
        form = RemunerationForm.objects.get(kocmission=mission)

        resp = self.client.post(
            "/api/platform/taxForms/review",
            data={"form_id": form.form_id, "admin_id": "1", "action": "reject", "reject_reason": "連結權限未開放"},
            content_type="application/json",
        )

        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()["status"], "rejected")

        form.refresh_from_db()
        self.assertEqual(form.status, "rejected")
        self.assertEqual(form.reject_reason, "連結權限未開放")

        mock_send_email.assert_called_once()

    def test_admin_cannot_review_already_approved_form(self):
        mission = self.make_mission(stage="completed")
        self.submit_link(mission)
        form = RemunerationForm.objects.get(kocmission=mission)
        form.status = "approved"
        form.save(update_fields=["status"])

        resp = self.client.post(
            "/api/platform/taxForms/review",
            data={"form_id": form.form_id, "admin_id": "1", "action": "reject", "reject_reason": "測試"},
            content_type="application/json",
        )

        self.assertEqual(resp.status_code, 400)

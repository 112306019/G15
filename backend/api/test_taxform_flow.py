"""
驗證勞報單從「未申報」到「已申報待確認」到「審核通過」的金額與階段轉換是否正確，
包含審核期間又有新訂單完成時新舊兩筆錢不會互相污染、退回後金額留在「已申報
待確認」而不是跑回「未申報」、以及重新提交時會把退回期間新累積的未申報分潤
一併併入同一張單。
"""
import json
from decimal import Decimal
from datetime import timedelta

from django.test import TestCase, RequestFactory
from django.utils import timezone

from api.models import (
    Vendor, Admins, Order, OrderItem, Product, User, KOC, Campaigns,
    CampaignProduct, Application, KOCMissionNew, CouponNew, Earnings,
    KocWallet, RemunerationForm,
)
from api.views.platform import calculate_order_commission, admin_review_tax_form
from api.views.koc import get_revenue_total, get_remuneration_forms, get_tax_form_data, submit_tax_form_link


class TaxFormFlowDiagnosticTest(TestCase):
    def setUp(self):
        self.vendor = Vendor.objects.create(
            vendor_id='VTF001', company_name='測試廠商TF', contact_name='x',
            email='vtf@test.com', password='x', tax_id='99999999', status='approved',
        )
        self.admin = Admins.objects.create(
            name='admintf', email='admintf@test.com', password='x', role='super_admin', status='active',
        )
        self.consumer = User.objects.create(
            role='consumer', name='消費者TF', email='ctf@test.com', password='x', phone='0900000001',
        )
        self.koc_user = User.objects.create(
            role='koc', name='KOC_TF', email='koctf@test.com', password='x', phone='0911111112',
        )
        self.koc = KOC.objects.create(koc_id='KOCTF01', user=self.koc_user, bank_account='1234567')

        self.product = Product.objects.create(
            vendor_id=self.vendor.vendor_id, product_name='商品TF', price=1000, stock=100, status='active',
        )
        self.campaign = Campaigns.objects.create(
            vendor=self.vendor, name='活動TF', reward_type='commission',
            start_date=timezone.now() - timedelta(days=30), end_date=timezone.now() + timedelta(days=30),
        )
        CampaignProduct.objects.create(campaign=self.campaign, product=self.product, koc_commission_rate=Decimal('5.00'))
        self.application = Application.objects.create(koc=self.koc, campaign=self.campaign, status='approved')
        self.mission = KOCMissionNew.objects.create(application=self.application, koc=self.koc)
        self.coupon = CouponNew.objects.create(kocmission=self.mission, promotion_code='TFCODE1', status='active')

    def _get(self, view, params):
        req = RequestFactory().get('/x', data=params)
        resp = view(req)
        if hasattr(resp, 'render'):
            resp.render()
        return json.loads(resp.content)

    def _post(self, view, payload):
        req = RequestFactory().post('/x', data=json.dumps(payload), content_type='application/json')
        resp = view(req)
        if hasattr(resp, 'render'):
            resp.render()
        return json.loads(resp.content)

    def _make_order(self, quantity):
        order = Order.objects.create(
            user=self.consumer, total_amount=Decimal(str(1000 * quantity)), promotion_code='TFCODE1',
            order_status='completed', payment_status='paid', shipping_status='delivered',
            delivered_at=timezone.now() - timedelta(days=10), completed_at=timezone.now(),
        )
        OrderItem.objects.create(
            order=order, product=self.product, quantity=quantity,
            unit_price=Decimal('1000'), subtotal=Decimal(str(1000 * quantity)),
        )
        return order

    def test_full_flow(self):
        # 1) 第一筆訂單完成 -> 建立分潤
        order1 = self._make_order(1)
        r1 = calculate_order_commission(order1)
        self.assertTrue(r1['created'])
        print(f'[1] calculate_order_commission(order1) -> {r1}')

        wallet = KocWallet.objects.get(koc=self.koc)
        print(f'[1] wallet.balance_available={wallet.balance_available} balance_frozen={wallet.balance_frozen}')
        self.assertEqual(wallet.balance_frozen, 0)
        self.assertEqual(wallet.balance_available, r1['commission_amount'])

        # 2) 提交前：get_revenue_total 的未申報金額應該等於這筆分潤金額
        res = self._get(get_revenue_total, {'user_id': self.koc_user.user_id})
        print(f'[2] get_revenue_total (提交前) -> {res}')
        self.assertEqual(res['undeclared_amount'], r1['commission_amount'])
        self.assertEqual(res['unapproved_amount'], 0)
        self.assertEqual(res['confirmed_amount'], 0)

        # 3) 不帶 form_id 預覽：應該等於未申報金額
        res = self._get(get_tax_form_data, {'User_id': self.koc_user.user_id})
        print(f'[3] get_tax_form_data(no form_id, 預覽) -> {res}')
        self.assertEqual(res['amount'], r1['commission_amount'])

        # 4) 送出勞報單
        res = self._post(submit_tax_form_link, {'User_id': self.koc_user.user_id, 'url': 'https://drive.google.com/fake-link'})
        print(f'[4] submit_tax_form_link -> {res}')
        self.assertTrue(res['success'])
        form_id = res['form_id']
        self.assertEqual(res['amount'], r1['commission_amount'])

        # 5) 提交後：未申報應變 0，已申報待確認應該等於這筆金額
        res = self._get(get_revenue_total, {'user_id': self.koc_user.user_id})
        print(f'[5] get_revenue_total (提交後) -> {res}')
        self.assertEqual(res['undeclared_amount'], 0)
        self.assertEqual(res['unapproved_amount'], r1['commission_amount'])
        self.assertEqual(res['confirmed_amount'], 0)

        # 6) 帶 form_id 查看這張已送出的單：金額、申報時間應該固定，不是「現在」
        res = self._get(get_tax_form_data, {'User_id': self.koc_user.user_id, 'form_id': form_id})
        print(f'[6] get_tax_form_data(form_id={form_id}) -> {res}')
        self.assertEqual(res['amount'], r1['commission_amount'])
        form = RemunerationForm.objects.get(form_id=form_id)
        self.assertEqual(res['submitted_at'], form.submitted_at.strftime('%Y-%m-%d'))

        # 7) get_remuneration_forms：這張應該在 pending_review，金額正確
        res = self._get(get_remuneration_forms, {'user_id': self.koc_user.user_id})
        print(f'[7] get_remuneration_forms -> {json.dumps(res, ensure_ascii=False, default=str)}')
        self.assertEqual(len(res['forms']), 1)
        self.assertEqual(res['forms'][0]['status'], 'pending_review')
        self.assertEqual(res['forms'][0]['amount'], r1['commission_amount'])

        # 8) 審核期間，第二筆訂單完成 -> 這筆錢應該算入「未申報」，不該混進剛剛那張審核中的單
        order2 = self._make_order(2)
        r2 = calculate_order_commission(order2)
        print(f'[8] calculate_order_commission(order2) -> {r2}')
        res = self._get(get_revenue_total, {'user_id': self.koc_user.user_id})
        print(f'[8] get_revenue_total (order2 完成後，審核中) -> {res}')
        self.assertEqual(res['undeclared_amount'], r2['commission_amount'])
        self.assertEqual(res['unapproved_amount'], r1['commission_amount'])
        self.assertEqual(res['confirmed_amount'], 0)

        # 確認第一張單的金額沒有被 order2 影響而改變
        form.refresh_from_db()
        print(f'[8] form(form_id={form_id}).amount={form.amount}（應該還是 {r1["commission_amount"]}，沒被 order2 影響）')
        self.assertEqual(form.amount, r1['commission_amount'])

        # 9) 後台審核通過第一張單
        res = self._post(admin_review_tax_form, {'form_id': form_id, 'admin_id': self.admin.admin_id, 'action': 'approve'})
        print(f'[9] admin_review_tax_form(approve) -> {res}')
        self.assertTrue(res['success'])

        # 10) 審核後：這張單的金額應該變成「確定撥款」，order2 那筆還是未申報，兩者不會混在一起
        res = self._get(get_revenue_total, {'user_id': self.koc_user.user_id})
        print(f'[10] get_revenue_total (審核通過後) -> {res}')
        self.assertEqual(res['undeclared_amount'], r2['commission_amount'])
        self.assertEqual(res['unapproved_amount'], 0)
        self.assertEqual(res['confirmed_amount'], r1['commission_amount'])

        # 11) get_remuneration_forms：這張應該轉成 approved，金額不變
        res = self._get(get_remuneration_forms, {'user_id': self.koc_user.user_id})
        print(f'[11] get_remuneration_forms (審核後) -> {json.dumps(res, ensure_ascii=False, default=str)}')
        self.assertEqual(res['forms'][0]['status'], 'approved')
        self.assertEqual(res['forms'][0]['amount'], r1['commission_amount'])

        # 12) 再查一次這張已核准的單：金額、申報時間仍然固定在當初提交的那一刻
        res = self._get(get_tax_form_data, {'User_id': self.koc_user.user_id, 'form_id': form_id})
        print(f'[12] get_tax_form_data(已核准的 form_id={form_id}) -> {res}')
        self.assertEqual(res['amount'], r1['commission_amount'])

    def test_rejected_form_stays_in_unapproved_bucket(self):
        """退回後，金額不會回到「未申報」，而是留在「已申報待確認」，
        直到重新提交（同一張單）被審核通過為止。"""
        order1 = self._make_order(1)
        r1 = calculate_order_commission(order1)

        res = self._post(submit_tax_form_link, {'User_id': self.koc_user.user_id, 'url': 'https://drive.google.com/fake-link'})
        form_id = res['form_id']

        res = self._post(admin_review_tax_form, {'form_id': form_id, 'admin_id': self.admin.admin_id, 'action': 'reject', 'reject_reason': '連結權限未開放'})
        print(f'[reject-1] admin_review_tax_form(reject) -> {res}')
        self.assertTrue(res['success'])

        res = self._get(get_revenue_total, {'user_id': self.koc_user.user_id})
        print(f'[reject-2] get_revenue_total (退回後) -> {res}')
        # 關鍵驗證：退回後金額不會跑回「未申報」，而是留在「已申報待確認」
        self.assertEqual(res['undeclared_amount'], 0)
        self.assertEqual(res['unapproved_amount'], r1['commission_amount'])
        self.assertEqual(res['confirmed_amount'], 0)

        res = self._get(get_remuneration_forms, {'user_id': self.koc_user.user_id})
        print(f'[reject-3] get_remuneration_forms (退回後) -> {json.dumps(res, ensure_ascii=False, default=str)}')
        self.assertEqual(res['forms'][0]['status'], 'rejected')
        self.assertEqual(res['forms'][0]['amount'], r1['commission_amount'])

        # 重新提交（同一張單，這段期間沒有新分潤累積，所以金額不變、amount_changed=False）
        res = self._post(submit_tax_form_link, {'User_id': self.koc_user.user_id, 'url': 'https://drive.google.com/fixed-link'})
        print(f'[reject-4] submit_tax_form_link (重新提交) -> {res}')
        self.assertEqual(res['form_id'], form_id)
        self.assertEqual(res['amount'], r1['commission_amount'])
        self.assertFalse(res['amount_changed'])

        res = self._get(get_revenue_total, {'user_id': self.koc_user.user_id})
        print(f'[reject-5] get_revenue_total (重新提交後) -> {res}')
        self.assertEqual(res['undeclared_amount'], 0)
        self.assertEqual(res['unapproved_amount'], r1['commission_amount'])

    def test_resubmit_merges_newly_undeclared_earnings(self):
        """退回期間如果有新訂單完成，重新提交時應該把新累積的未申報分潤一起併進
        同一張單，金額變大、amount_changed=True；不能提前混進一張待審核的單。"""
        order1 = self._make_order(1)
        r1 = calculate_order_commission(order1)

        res = self._post(submit_tax_form_link, {'User_id': self.koc_user.user_id, 'url': 'https://drive.google.com/fake-link'})
        form_id = res['form_id']

        res = self._post(admin_review_tax_form, {'form_id': form_id, 'admin_id': self.admin.admin_id, 'action': 'reject', 'reject_reason': '連結權限未開放'})
        self.assertTrue(res['success'])

        # 退回期間，第二筆訂單完成 -> 產生新的未申報金額
        order2 = self._make_order(2)
        r2 = calculate_order_commission(order2)
        print(f'[merge-1] calculate_order_commission(order2，退回期間) -> {r2}')

        # 預覽（不帶 form_id）應該是「舊單金額 + 新未申報金額」
        res = self._get(get_tax_form_data, {'User_id': self.koc_user.user_id})
        print(f'[merge-2] get_tax_form_data(預覽，退回期間) -> {res}')
        self.assertEqual(res['amount'], r1['commission_amount'] + r2['commission_amount'])

        # 重新提交：同一張單，金額變成合計，amount_changed=True
        res = self._post(submit_tax_form_link, {'User_id': self.koc_user.user_id, 'url': 'https://drive.google.com/fixed-link'})
        print(f'[merge-3] submit_tax_form_link (重新提交，併入新分潤) -> {res}')
        self.assertEqual(res['form_id'], form_id)
        self.assertEqual(res['amount'], r1['commission_amount'] + r2['commission_amount'])
        self.assertTrue(res['amount_changed'])

        # 未申報應歸零，已申報待確認應該是合計金額，且是同一張單
        res = self._get(get_revenue_total, {'user_id': self.koc_user.user_id})
        print(f'[merge-4] get_revenue_total (重新提交後) -> {res}')
        self.assertEqual(res['undeclared_amount'], 0)
        self.assertEqual(res['unapproved_amount'], r1['commission_amount'] + r2['commission_amount'])

        res = self._get(get_remuneration_forms, {'user_id': self.koc_user.user_id})
        print(f'[merge-5] get_remuneration_forms (重新提交後) -> {json.dumps(res, ensure_ascii=False, default=str)}')
        self.assertEqual(len(res['forms']), 1)
        self.assertEqual(res['forms'][0]['form_id'], form_id)
        self.assertEqual(res['forms'][0]['amount'], r1['commission_amount'] + r2['commission_amount'])
        self.assertEqual(res['forms'][0]['status'], 'pending_review')

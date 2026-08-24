from django.db import models


class PaymentTransaction(models.Model):
    """
    商品訂單付款交易紀錄（綠界 ECPay AIO 金流）。
    建立付款時先產生一筆本紀錄並帶 merchant_trade_no 送給 ECPay 當訂單編號，
    之後綠界打 ReturnURL 回來時憑 merchant_trade_no 找回這筆、寫入 ecpay_trade_no 與 raw_response、更新 status。
    """

    STATUS_PENDING = "pending"
    STATUS_PAID = "paid"
    STATUS_FAILED = "failed"

    STATUS_CHOICES = [
        (STATUS_PENDING, "待付款"),
        (STATUS_PAID, "付款成功"),
        (STATUS_FAILED, "付款失敗"),
    ]

    payment_transaction_id = models.BigAutoField(primary_key=True)

    order = models.ForeignKey(
        "api.Order", on_delete=models.PROTECT,
        db_column="order_id", related_name="payment_transactions"
    )

    # 對應綠界參數 MerchantTradeNo：我方產生、送給綠界當訂單編號，最長 20 碼英數字，同一組不可重複送單
    merchant_trade_no = models.CharField(max_length=20, unique=True, db_column="merchant_trade_no")

    # 付款金額（新台幣）
    amount = models.DecimalField(max_digits=10, decimal_places=2)

    # 對應綠界回傳參數 TradeNo：綠界端的交易序號，付款結果確定前為空
    ecpay_trade_no = models.CharField(max_length=20, blank=True, null=True, db_column="ecpay_trade_no")

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_PENDING, db_column="status")

    # 綠界 ReturnURL / OrderResultURL 回傳的原始 payload，留底供對帳、除錯
    raw_response = models.JSONField(blank=True, null=True, db_column="raw_response")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "PaymentTransaction"

    def __str__(self):
        return f"[{self.status}] {self.merchant_trade_no}"

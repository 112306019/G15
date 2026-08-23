from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone
from datetime import timedelta

from payments.models import PaymentTransaction
from payments.services import query_trade_info, reconcile_payment_from_query

TRADE_STATUS_LABELS = {
    "0": "待付款",
    "1": "已付款",
    "10200047": "訂單不存在",
    "10200095": "交易未成立",
}


class Command(BaseCommand):
    help = (
        "對卡在 pending 狀態的 PaymentTransaction 主動呼叫綠界 QueryTradeInfo 對帳。"
        "預設只查詢、印出結果，不會寫入任何變更；要真的更新狀態請加 --apply。"
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--merchant-trade-no",
            help="只對帳單一筆，指定 MerchantTradeNo（忽略 --older-than-minutes）",
        )
        parser.add_argument(
            "--older-than-minutes",
            type=int,
            default=15,
            help="只對帳建立時間超過這幾分鐘的 pending 交易，避免查到還在刷卡中的訂單（預設 15）",
        )
        parser.add_argument(
            "--apply",
            action="store_true",
            help="真的把查詢結果寫回 PaymentTransaction / Order；不加這個參數只會印出查詢結果",
        )

    def handle(self, *args, **options):
        merchant_trade_no = options["merchant_trade_no"]
        apply_changes = options["apply"]

        if merchant_trade_no:
            try:
                candidates = [PaymentTransaction.objects.get(merchant_trade_no=merchant_trade_no)]
            except PaymentTransaction.DoesNotExist:
                raise CommandError(f"找不到 MerchantTradeNo={merchant_trade_no} 的 PaymentTransaction")
        else:
            cutoff = timezone.now() - timedelta(minutes=options["older_than_minutes"])
            candidates = list(
                PaymentTransaction.objects.filter(
                    status=PaymentTransaction.STATUS_PENDING, created_at__lte=cutoff
                ).order_by("created_at")
            )

        if not candidates:
            self.stdout.write("沒有符合條件的 pending 交易需要對帳。")
            return

        self.stdout.write(f"共 {len(candidates)} 筆待對帳（{'套用變更' if apply_changes else '僅查詢，不寫入'}）：")

        for payment in candidates:
            try:
                if apply_changes:
                    before_status = payment.status
                    payment = reconcile_payment_from_query(payment)
                    changed = payment.status != before_status
                    self.stdout.write(
                        f"  MerchantTradeNo={payment.merchant_trade_no} "
                        f"-> status={payment.status}{'（已更新）' if changed else '（維持不變）'}"
                    )
                else:
                    result = query_trade_info(payment)
                    trade_status = result.get("TradeStatus")
                    label = TRADE_STATUS_LABELS.get(trade_status, trade_status)
                    self.stdout.write(
                        f"  MerchantTradeNo={payment.merchant_trade_no} "
                        f"-> TradeStatus={trade_status}（{label}）"
                    )
            except Exception as e:
                self.stderr.write(
                    self.style.ERROR(f"  MerchantTradeNo={payment.merchant_trade_no} 對帳失敗: {e}")
                )

        if not apply_changes:
            self.stdout.write(self.style.WARNING("這是查詢結果，尚未寫入任何變更。確認無誤後加上 --apply 才會真的更新。"))

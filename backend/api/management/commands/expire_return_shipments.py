"""
定期執行的排程腳本：檢查所有已產生退貨編號（ecpay_return_trade_no 有值）、
但已經超過 7 天期限（return_ship_deadline 已過）仍未寄出（狀態還停在
approved，沒有進入 returning 之後的階段）的退貨申請，標記為
return_ship_expired=True。

標記過期後，這組退貨編號在超商端會失效、無法再使用；但消費者只要訂單
還在鑑賞期內（create_return_request 的期限檢查邏輯），可以直接重新透過
系統申請退貨退款，重新走一次自動流程、產生一組新的退貨編號。

用法：
    python manage.py expire_return_shipments             # 正式執行
    python manage.py expire_return_shipments --dry-run    # 只列出符合條件的筆數，不實際標記

建議搭配 Render Cron Jobs（或其他排程工具）每天執行一次。
"""

from django.core.management.base import BaseCommand
from django.utils import timezone

from api.models import ReturnRequest


class Command(BaseCommand):
    help = "標記超過 7 天未寄出的退貨編號為失效"

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="只列出符合條件的退貨申請，不實際標記",
        )

    def handle(self, *args, **options):
        dry_run = options["dry_run"]
        now = timezone.now()

        overdue = ReturnRequest.objects.filter(
            ecpay_return_trade_no__isnull=False,
            return_ship_deadline__isnull=False,
            return_ship_deadline__lte=now,
            return_ship_expired=False,
            status="approved",
        )

        total = overdue.count()
        self.stdout.write(f"共 {total} 筆退貨編號已超過 7 天期限未寄出")

        if dry_run:
            self.stdout.write(self.style.WARNING("── DRY RUN，不會標記 ──"))
            for r in overdue:
                self.stdout.write(
                    f"  return_id={r.return_id} "
                    f"ecpay_return_trade_no={r.ecpay_return_trade_no} "
                    f"return_ship_deadline={r.return_ship_deadline}"
                )
            return

        expired_count = overdue.update(return_ship_expired=True)

        self.stdout.write(self.style.SUCCESS("── 執行結果 ──"))
        self.stdout.write(f"已標記為失效：{expired_count} 筆")

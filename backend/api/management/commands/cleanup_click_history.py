"""
定期執行的排程腳本：刪除 KocLinkClickDaily 裡超過
CLICK_DAILY_RETENTION_DAYS 天（預設 90 天）的每日點擊聚合資料。

這張表只是給戰報近期走勢圖（週/月）用的每日拆分，終身累積點擊數已經
存在 CouponNew.click_count，不受這支指令影響；清掉舊的每日資料只是為了
避免資料表隨時間無限膨脹，不會遺失戰報需要的總量數字。

用法：
    python manage.py cleanup_click_history             # 正式執行
    python manage.py cleanup_click_history --dry-run    # 只列出符合條件的筆數，不實際刪除

建議搭配 Render Cron Jobs（或其他排程工具）每天執行一次。
"""

from django.core.management.base import BaseCommand
from django.utils import timezone

from api.models import KocLinkClickDaily
from api.views.constants import CLICK_DAILY_RETENTION_DAYS


class Command(BaseCommand):
    help = f"刪除超過 {CLICK_DAILY_RETENTION_DAYS} 天的 KOC 短連結每日點擊聚合資料"

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="只列出符合條件的筆數，不實際刪除",
        )

    def handle(self, *args, **options):
        dry_run = options["dry_run"]
        cutoff = timezone.localdate() - timezone.timedelta(days=CLICK_DAILY_RETENTION_DAYS)

        overdue = KocLinkClickDaily.objects.filter(click_date__lt=cutoff)
        total = overdue.count()
        self.stdout.write(f"共 {total} 筆每日點擊資料早於 {cutoff}（保留 {CLICK_DAILY_RETENTION_DAYS} 天）")

        if dry_run:
            self.stdout.write(self.style.WARNING("── DRY RUN，不會刪除 ──"))
            return

        deleted_count, _ = overdue.delete()

        self.stdout.write(self.style.SUCCESS("── 執行結果 ──"))
        self.stdout.write(f"已刪除：{deleted_count} 筆")

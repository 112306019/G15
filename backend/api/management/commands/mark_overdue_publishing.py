"""
定期執行的排程腳本：檢查所有文案審核通過後（stage='publishing'）已超過 7 天，
KOC 卻還沒提交貼文連結（stage 還沒推進到 promoting）的任務，標記為
missed_publishing_deadline=True，作為該 KOC 過往失信次數統計的依據。

這個標記一旦設為 True 就永久保留：即使 KOC 之後補交了貼文連結、
stage 推進到 promoting，這筆任務「曾經逾期」的紀錄依然算數，
不會因為後來補交而被清除。

用法：
    python manage.py mark_overdue_publishing            # 正式執行
    python manage.py mark_overdue_publishing --dry-run   # 只列出符合條件的筆數，不實際標記

建議搭配 Render Cron Jobs（或其他排程工具）每天執行一次。
"""

from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta

from api.models import KOCMissionNew

PUBLISHING_DEADLINE_DAYS = 7


class Command(BaseCommand):
    help = "文案審核通過後超過 7 天未提交貼文連結，標記為失信（永久保留）"

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="只列出符合條件的任務，不實際標記",
        )

    def handle(self, *args, **options):
        dry_run = options["dry_run"]
        now = timezone.now()
        cutoff = now - timedelta(days=PUBLISHING_DEADLINE_DAYS)

        overdue = KOCMissionNew.objects.select_related("koc__user").filter(
            stage="publishing",
            publishing_started_at__isnull=False,
            publishing_started_at__lte=cutoff,
            missed_publishing_deadline=False,
        )

        total = overdue.count()
        self.stdout.write(f"共 {total} 筆任務貼文連結逾期未提交（尚未標記過）")

        if dry_run:
            self.stdout.write(self.style.WARNING("── DRY RUN，不會標記 ──"))
            for mission in overdue:
                koc_user = mission.koc.user if mission.koc else None
                self.stdout.write(
                    f"  kocmission_id={mission.kocmission_id} "
                    f"koc={koc_user.user_id if koc_user else '（無 KOC）'} "
                    f"publishing_started_at={mission.publishing_started_at}"
                )
            return

        marked_count = overdue.update(missed_publishing_deadline=True)

        self.stdout.write(self.style.SUCCESS("── 執行結果 ──"))
        self.stdout.write(f"已標記為失信：{marked_count} 筆")

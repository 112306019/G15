"""
定期執行的排程腳本：檢查所有被廠商退回（Submissions.status='revising'）
且已經超過修改期限（revising_deadline 已過）、KOC 卻還沒有重新提交的文案，
寄送第二封提醒信；revising_reminder_sent 避免對同一筆重複寄信。

用法：
    python manage.py send_revising_reminders            # 正式執行，寄信
    python manage.py send_revising_reminders --dry-run   # 只列出符合條件的筆數，不寄信

建議搭配 Render Cron Jobs（或其他排程工具）每天執行一次，例如每天早上 9 點。
"""

from django.core.management.base import BaseCommand
from django.utils import timezone

from api.models import Submissions
from api.emails import send_submission_revising_reminder_email


class Command(BaseCommand):
    help = "文案被退回滿 3 天仍未重新提交時，寄送提醒信給 KOC"

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="只列出符合條件的筆數與內容，不實際寄信",
        )

    def handle(self, *args, **options):
        dry_run = options["dry_run"]

        now = timezone.now()

        # 條件：狀態仍是 revising（還沒重新提交）、期限已過、還沒寄過提醒信
        overdue = Submissions.objects.select_related(
            "kocmission__koc__user"
        ).filter(
            status="revising",
            revising_deadline__lte=now,
            revising_reminder_sent=False,
        )

        total = overdue.count()
        self.stdout.write(f"共 {total} 筆逾期未修改的文案")

        if dry_run:
            self.stdout.write(self.style.WARNING("── DRY RUN，不會寄信 ──"))
            for submission in overdue:
                koc_user = submission.kocmission.koc.user
                self.stdout.write(
                    f"  submission_id={submission.submission_id} "
                    f"koc={koc_user.user_id}({koc_user.email}) "
                    f"deadline={submission.revising_deadline}"
                )
            return

        sent_count = 0
        failed_count = 0

        for submission in overdue:
            try:
                send_submission_revising_reminder_email(submission)
                submission.revising_reminder_sent = True
                submission.save(update_fields=["revising_reminder_sent"])
                sent_count += 1
                self.stdout.write(
                    f"  已寄出提醒信：submission_id={submission.submission_id}"
                )
            except Exception as e:
                failed_count += 1
                self.stdout.write(
                    self.style.ERROR(
                        f"  提醒信寄送失敗 submission_id={submission.submission_id}：{e}"
                    )
                )

        self.stdout.write(self.style.SUCCESS("── 執行結果 ──"))
        self.stdout.write(f"成功寄出：{sent_count}")
        self.stdout.write(f"寄送失敗：{failed_count}")

"""
定期執行的排程腳本：檢查所有超過 7 天仍是 status='pending' 的
KOC 代言活動申請（Application），廠商既沒有核准也沒有拒絕，
系統直接無條件自動取消（status -> 'rejected'），並寄信通知 KOC。

用法：
    python manage.py auto_reject_overdue_applications             # 正式執行
    python manage.py auto_reject_overdue_applications --dry-run    # 只列出符合條件的筆數，不實際處理

建議搭配 Render Cron Jobs（或其他排程工具）每天執行一次。
"""

from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta

from api.models import Application
from api.emails import send_application_auto_rejected_email

APPLICATION_REVIEW_DEADLINE_DAYS = 7


class Command(BaseCommand):
    help = "廠商超過 7 天未審核的 KOC 代言活動申請，自動取消並寄信通知"

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="只列出符合條件的申請，不實際取消或寄信",
        )

    def handle(self, *args, **options):
        dry_run = options["dry_run"]
        now = timezone.now()
        cutoff = now - timedelta(days=APPLICATION_REVIEW_DEADLINE_DAYS)

        overdue = Application.objects.select_related(
            "koc__user", "campaign"
        ).filter(
            status="pending",
            created_at__isnull=False,
            created_at__lte=cutoff,
        )

        total = overdue.count()
        self.stdout.write(f"共 {total} 筆申請已超過 7 天未審核")

        if dry_run:
            self.stdout.write(self.style.WARNING("── DRY RUN，不會取消或寄信 ──"))
            for application in overdue:
                self.stdout.write(
                    f"  application_id={application.application_id} "
                    f"campaign={application.campaign.name} "
                    f"created_at={application.created_at}"
                )
            return

        processed_count = 0
        failed_count = 0

        for application in overdue:
            if not application.koc_id:
                # 沒有綁定 KOC 的申請理論上不該出現在 pending，跳過避免寄信炸掉
                continue

            try:
                application.status = "rejected"
                application.reject_reason = "廠商超過 7 天未審核，系統自動取消"
                application.save(update_fields=["status", "reject_reason"])

                send_application_auto_rejected_email(application)
                processed_count += 1
                self.stdout.write(
                    f"  已自動取消並通知：application_id={application.application_id}"
                )
            except Exception as e:
                failed_count += 1
                self.stdout.write(
                    self.style.ERROR(
                        f"  處理失敗 application_id={application.application_id}：{e}"
                    )
                )

        self.stdout.write(self.style.SUCCESS("── 執行結果 ──"))
        self.stdout.write(f"成功處理：{processed_count}")
        self.stdout.write(f"失敗：{failed_count}")

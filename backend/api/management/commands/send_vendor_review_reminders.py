"""
定期執行的排程腳本：檢查每個廠商底下「待審核文案」（Submissions.status='pending'）
的最早一筆提交時間，若已經超過 5 天仍未審完（也就是這個廠商還有任何一筆
pending 的文案），寄信提醒廠商盡快完成審核。

計算基準：同一個廠商底下所有待審文案，用「最早那筆的 submitted_time」當基準算 5 天。
這段期間內新提交的文案不會另外起算，直到廠商把目前這批全部審完（該廠商完全沒有
pending 文案）為止，下一批才會從屆時最早的那筆重新起算。

防重複寄信：Vendor.last_review_reminder_batch_time 記錄「上次寄提醒信時，
那批待審文案最早提交的時間」。如果這次算出來的最早提交時間跟上次記錄的一樣，
代表還是同一批、已經提醒過，不會重複寄；换了新的一批（最早提交時間不同）
才會再寄一次。

用法：
    python manage.py send_vendor_review_reminders             # 正式執行，寄信
    python manage.py send_vendor_review_reminders --dry-run    # 只列出符合條件的廠商，不寄信

建議搭配 Render Cron Jobs（或其他排程工具）每天執行一次即可，
即使一天跑多次或漏跑幾天，防重複機制都能確保同一批文案只寄一次提醒。
"""

from django.core.management.base import BaseCommand
from django.db.models import Min
from django.utils import timezone
from datetime import timedelta

from api.models import Submissions, Vendor
from api.emails import send_vendor_review_overdue_email

REVIEW_DEADLINE_DAYS = 5


class Command(BaseCommand):
    help = "廠商待審核文案超過 5 天未審完時，寄信提醒廠商（同一批只提醒一次）"

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="只列出符合條件的廠商與筆數，不實際寄信",
        )

    def handle(self, *args, **options):
        dry_run = options["dry_run"]
        now = timezone.now()

        earliest_by_vendor = (
            Submissions.objects
            .filter(status="pending", submitted_time__isnull=False)
            .values("kocmission__application__campaign__vendor_id")
            .annotate(earliest_submitted=Min("submitted_time"))
        )

        candidates = []
        for row in earliest_by_vendor:
            vendor_id = row["kocmission__application__campaign__vendor_id"]
            earliest_submitted = row["earliest_submitted"]
            deadline = earliest_submitted + timedelta(days=REVIEW_DEADLINE_DAYS)
            if now >= deadline:
                candidates.append((vendor_id, earliest_submitted))

        self.stdout.write(f"共 {len(candidates)} 個廠商有審核逾期的待審文案（已扣除尚未到期的）")

        to_notify = []
        skipped_already_notified = 0

        for vendor_id, earliest_submitted in candidates:
            try:
                vendor = Vendor.objects.get(vendor_id=vendor_id)
            except Vendor.DoesNotExist:
                continue

            if vendor.last_review_reminder_batch_time == earliest_submitted:
                skipped_already_notified += 1
                continue

            to_notify.append((vendor, earliest_submitted))

        self.stdout.write(f"其中 {len(to_notify)} 個廠商是新一批逾期、需要寄信")
        self.stdout.write(f"其中 {skipped_already_notified} 個廠商同一批已提醒過，跳過")

        if dry_run:
            self.stdout.write(self.style.WARNING("── DRY RUN，不會寄信 ──"))
            for vendor, earliest_submitted in to_notify:
                pending_count = Submissions.objects.filter(
                    status="pending",
                    kocmission__application__campaign__vendor_id=vendor.vendor_id,
                ).count()
                self.stdout.write(
                    f"  vendor_id={vendor.vendor_id} 最早提交={earliest_submitted} "
                    f"待審文案數={pending_count}"
                )
            return

        sent_count = 0
        failed_count = 0

        for vendor, earliest_submitted in to_notify:
            pending_count = Submissions.objects.filter(
                status="pending",
                kocmission__application__campaign__vendor_id=vendor.vendor_id,
            ).count()

            try:
                send_vendor_review_overdue_email(vendor, pending_count, earliest_submitted)
                vendor.last_review_reminder_batch_time = earliest_submitted
                vendor.save(update_fields=["last_review_reminder_batch_time"])
                sent_count += 1
                self.stdout.write(f"  已寄出提醒信：vendor_id={vendor.vendor_id}")
            except Exception as e:
                failed_count += 1
                self.stdout.write(
                    self.style.ERROR(f"  提醒信寄送失敗 vendor_id={vendor.vendor_id}：{e}")
                )

        self.stdout.write(self.style.SUCCESS("── 執行結果 ──"))
        self.stdout.write(f"成功寄出：{sent_count}")
        self.stdout.write(f"寄送失敗：{failed_count}")

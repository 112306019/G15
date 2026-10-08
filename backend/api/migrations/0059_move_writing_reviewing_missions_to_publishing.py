"""
KOC 不再提交文案給廠商審核，任務核准後直接進入 publishing。
把還停在已停用階段（writing／reviewing）的任務轉到 publishing，
並重新起算交件提醒期限（比照正常進入 publishing 的處理）。
"""
from datetime import timedelta

from django.db import migrations
from django.utils import timezone

# 跟 constants.SUBMISSION_REMINDER_DAYS 相同；migration 不 import 執行中的程式碼，
# 避免之後常數改動影響已套用過的 migration
SUBMISSION_REMINDER_DAYS = 7


def move_to_publishing(apps, schema_editor):
    KOCMissionNew = apps.get_model('api', 'KOCMissionNew')
    KOCMissionNew.objects.filter(stage__in=['writing', 'reviewing']).update(
        stage='publishing',
        submission_deadline_at=timezone.now() + timedelta(days=SUBMISSION_REMINDER_DAYS),
        submission_reminder_sent=False,
    )


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0058_aicheckconsent'),
    ]

    operations = [
        # 無法還原：轉移前無法得知每筆原本是 writing 還是 reviewing
        migrations.RunPython(move_to_publishing, migrations.RunPython.noop),
    ]

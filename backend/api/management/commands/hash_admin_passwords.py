"""
一次性補跑腳本：把 Admins.password 欄位裡還是明文的密碼，就地雜湊成
Django 標準的 hash 格式（預設 pbkdf2_sha256）。

背景：
    admin_login 原本是 `admin.password != password` 明文比對，現在改成
    `check_password(password, admin.password)`。check_password 只認得
    Django hasher 產生的雜湊字串格式（例如 "pbkdf2_sha256$..."），如果
    資料庫裡還是舊的明文密碼，check_password 一律會判斷失敗——也就是說
    這支腳本沒跑之前，所有現有的管理員帳號都會登入不了，必須先跑這支
    把舊資料轉換過去，兩件事要一起做。

安全性：
    用 django.contrib.auth.hashers.identify_hasher 判斷一個字串是不是
    已經是合法的雜湊格式，是的話直接跳過（代表已經雜湊過，不會重複雜湊
    導致密碼跑掉）；不是的話才視為明文、用 make_password 雜湊後寫回去。
    冪等、可以重複執行，不會有副作用。

用法：
    python manage.py hash_admin_passwords              # 正式執行
    python manage.py hash_admin_passwords --dry-run     # 先看有幾筆會被轉換，不寫入
"""

from django.core.management.base import BaseCommand
from django.contrib.auth.hashers import make_password, identify_hasher

from api.models import Admins


def _is_already_hashed(raw_password):
    try:
        identify_hasher(raw_password)
        return True
    except ValueError:
        return False


class Command(BaseCommand):
    help = "把 Admins.password 欄位裡還是明文的密碼就地雜湊"

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="只列出會被轉換的帳號，不實際寫入資料庫",
        )

    def handle(self, *args, **options):
        dry_run = options["dry_run"]

        admins = Admins.objects.all()
        total = admins.count()
        self.stdout.write(f"共 {total} 個管理員帳號要檢查")

        if dry_run:
            self.stdout.write(self.style.WARNING("── DRY RUN，不會寫入任何資料 ──"))

        converted = 0
        already_hashed = 0

        for admin in admins.iterator():
            if _is_already_hashed(admin.password):
                already_hashed += 1
                continue

            self.stdout.write(
                f"  {admin.email}（admin_id={admin.admin_id}）目前是明文，將被雜湊"
            )

            if not dry_run:
                admin.password = make_password(admin.password)
                admin.save(update_fields=["password"])

            converted += 1

        self.stdout.write(self.style.SUCCESS("── 執行結果 ──"))
        self.stdout.write(f"已經是雜湊格式、跳過：{already_hashed}")
        self.stdout.write(f"{'將被' if dry_run else '已'}轉換：{converted}")

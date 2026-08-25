"""
一次性補跑腳本：把「calculate_vendor_earning 上線之前」就已經是
order_status='completed' 的舊訂單，補算廠商淨額並存進 VendorWallet.balance_frozen。

背景：
    calculate_vendor_earning 只有在 consumer.py 的 update_order_status
    把訂單「第一次」標成 completed 的當下才會被呼叫（if not already_completed）。
    在這支程式碼上線之前就已經 completed 的訂單，不會再有任何動作觸發它，
    所以這些訂單的廠商淨額永遠不會自動補上，需要手動跑這支一次。

安全性：
    calculate_vendor_earning 本身有做冪等檢查（用 Transactions 是否已有
    type='order_income' 的紀錄來判斷），所以這支腳本可以放心對「全部」
    已完成訂單重新跑一次，已經入帳過的訂單會被自動跳過、不會重複入帳。
    可以重複執行、可以中斷後重跑。

用法：
    python manage.py backfill_vendor_earnings                # 正式執行
    python manage.py backfill_vendor_earnings --dry-run       # 先看會入帳多少，不寫入
    python manage.py backfill_vendor_earnings --order-id <uuid>  # 只處理單一訂單，方便先抽樣驗證
"""

from django.core.management.base import BaseCommand
from django.db import transaction

from api.models import Order, Transactions
from api.views.platform import calculate_vendor_earning


class Command(BaseCommand):
    help = "補算 calculate_vendor_earning 上線前，已完成訂單缺少的廠商淨額"

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="只試算並印出結果，不實際寫入資料庫",
        )
        parser.add_argument(
            "--order-id",
            type=str,
            default=None,
            help="只處理單一訂單（傳訂單 UUID），方便先抽樣驗證邏輯正不正確",
        )

    def handle(self, *args, **options):
        dry_run = options["dry_run"]
        single_order_id = options["order_id"]

        orders = Order.objects.filter(order_status="completed").order_by("created_at")

        if single_order_id:
            orders = orders.filter(order_id=single_order_id)

        total_orders = orders.count()
        self.stdout.write(f"共 {total_orders} 筆 order_status=completed 的訂單要檢查")

        if dry_run:
            self.stdout.write(self.style.WARNING("── DRY RUN，不會寫入任何資料 ──"))

        processed_orders = 0
        newly_credited = 0
        already_had = 0
        skipped_zero_or_error = 0
        total_amount = 0

        for order in orders.iterator():
            processed_orders += 1

            if dry_run:
                # dry-run 模式下不能直接呼叫 calculate_vendor_earning，
                # 因為它內部真的會寫入 DB。這裡改成只判斷「有沒有算過」，
                # 沒算過的话，用同一套邏輯試算金額但不寫入。
                already_credited_vendor_ids = set(
                    Transactions.objects.filter(
                        type="order_income",
                        reference_type="order",
                        reference_id=str(order.order_id),
                    ).values_list("vendor_wallet__vendor_id", flat=True)
                )

                # 訂單裡涉及哪些廠商（跟 calculate_vendor_earning 內部分組邏輯一致）
                vendor_ids_in_order = set(
                    order.items.select_related("product").values_list(
                        "product__vendor_id", flat=True
                    )
                )

                pending_vendor_ids = vendor_ids_in_order - already_credited_vendor_ids

                if not pending_vendor_ids:
                    already_had += 1
                    continue

                self.stdout.write(
                    f"  [dry-run] 訂單 {order.order_id} 有 {len(pending_vendor_ids)} "
                    f"個廠商尚未入帳：{pending_vendor_ids}"
                )
                newly_credited += 1
                continue

            # 正式執行：直接呼叫既有的 calculate_vendor_earning，
            # 冪等檢查交給它自己處理，這裡不用重複判斷。
            try:
                with transaction.atomic():
                    results = calculate_vendor_earning(order)
            except Exception as e:
                skipped_zero_or_error += 1
                self.stdout.write(
                    self.style.ERROR(f"  訂單 {order.order_id} 補算失敗：{e}")
                )
                continue

            for r in results:
                if r.get("created"):
                    newly_credited += 1
                    total_amount += r.get("net_amount", 0)
                    self.stdout.write(
                        f"  訂單 {order.order_id} → 廠商 {r['vendor_id']} "
                        f"入帳 NTD$ {r['net_amount']}"
                    )
                elif r.get("message") == "此訂單已對該廠商入帳過":
                    already_had += 1
                else:
                    skipped_zero_or_error += 1

        self.stdout.write(self.style.SUCCESS("── 補算結果 ──"))
        self.stdout.write(f"檢查訂單數：{processed_orders}")
        self.stdout.write(f"新入帳筆數：{newly_credited}")
        self.stdout.write(f"本來就有的：{already_had}")
        self.stdout.write(f"跳過/失敗：{skipped_zero_or_error}")
        if not dry_run:
            self.stdout.write(f"新入帳總金額：NTD$ {total_amount}")

from django.db import migrations


def settle_existing_pending_earnings(apps, schema_editor):
    """
    KOC 分潤結算時機從「案件結束後才結算」改成「訂單完成當下就直接可提領」，
    這裡把改動前就已經存在、還卡在 pending 狀態的分潤，一次性補轉成 withdrawable，
    金額同步從錢包的 balance_frozen 轉進 balance_available，避免規則改了但舊資料
    仍停留在舊狀態、只能靠 admin 手動結算才能領到錢。
    """
    Earnings = apps.get_model('api', 'Earnings')
    KocWallet = apps.get_model('api', 'KocWallet')
    Transactions = apps.get_model('api', 'Transactions')

    pending_earnings = Earnings.objects.filter(
        status='pending'
    ).select_related('kocmission')

    for earning in pending_earnings:
        mission = earning.kocmission

        if not mission or not mission.koc_id:
            continue

        wallet, _ = KocWallet.objects.get_or_create(koc_id=mission.koc_id)

        wallet.balance_frozen = max(0, wallet.balance_frozen - earning.amount)
        wallet.balance_available = wallet.balance_available + earning.amount
        wallet.save(update_fields=['balance_frozen', 'balance_available', 'updated_at'])

        Transactions.objects.create(
            koc_wallet=wallet,
            type='reward',
            amount=earning.amount,
            reference_type='earning',
            reference_id=str(earning.earnings_id),
        )

        earning.status = 'withdrawable'
        earning.save(update_fields=['status'])


def reverse_noop(apps, schema_editor):
    # 資料狀態遷移不可逆，沒有安全的方式還原（哪些是這次改的、哪些本來就是
    # withdrawable 已經無法區分），rollback 這個 migration 時不做任何事。
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0031_orderchatroom_ordermessage'),
    ]

    operations = [
        migrations.RunPython(settle_existing_pending_earnings, reverse_noop),
    ]

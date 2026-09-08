import django.db.models.deletion
from django.db import migrations, models


def backfill_koc_and_amount(apps, schema_editor):
    """
    防呆用：如果某個環境在改成「加總開單」之前就已經有勞報單資料（本機開發資料庫
    目前是 0 筆），用舊的 kocmission 關聯回推 koc 是誰、amount 抓該案件當時的分潤
    總額，並把這些分潤標記成「已經被這張單申報過」，避免下一次加總申報時重複計入。
    """
    RemunerationForm = apps.get_model('api', 'RemunerationForm')
    Earnings = apps.get_model('api', 'Earnings')

    for form in RemunerationForm.objects.all():
        mission = form.kocmission
        if not mission:
            continue

        earnings_qs = Earnings.objects.filter(kocmission=mission)
        form.koc_id = mission.koc_id
        form.amount = sum(e.amount for e in earnings_qs) or 0
        form.save(update_fields=['koc', 'amount'])

        earnings_qs.update(remuneration_form=form)


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0032_settle_pending_koc_earnings'),
    ]

    operations = [
        migrations.AddField(
            model_name='remunerationform',
            name='koc',
            field=models.ForeignKey(
                to='api.koc',
                on_delete=django.db.models.deletion.CASCADE,
                db_column='koc_id',
                related_name='remuneration_forms',
                null=True,
            ),
        ),
        migrations.AddField(
            model_name='remunerationform',
            name='amount',
            field=models.IntegerField(db_column='amount', null=True),
        ),
        migrations.AddField(
            model_name='earnings',
            name='remuneration_form',
            field=models.ForeignKey(
                to='api.remunerationform',
                on_delete=django.db.models.deletion.SET_NULL,
                db_column='remuneration_form_id',
                related_name='earnings',
                null=True,
                blank=True,
            ),
        ),
        migrations.RunPython(backfill_koc_and_amount, noop_reverse),
        migrations.AlterField(
            model_name='remunerationform',
            name='koc',
            field=models.ForeignKey(
                to='api.koc',
                on_delete=django.db.models.deletion.CASCADE,
                db_column='koc_id',
                related_name='remuneration_forms',
            ),
        ),
        migrations.AlterField(
            model_name='remunerationform',
            name='amount',
            field=models.IntegerField(db_column='amount'),
        ),
        migrations.RemoveField(
            model_name='remunerationform',
            name='kocmission',
        ),
    ]

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0054_remove_vendorpayoutbatch_uniq_vendor_payout_period_and_more'),
    ]

    operations = [
        migrations.AlterField(
            model_name='kocmissionnew',
            name='end_reason',
            field=models.CharField(blank=True, choices=[('expired', '已過期'), ('cancelled', 'KOC取消'), ('admin_closed', '平台終止')], db_column='end_reason', max_length=20, null=True),
        ),
    ]

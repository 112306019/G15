from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0055_merge_20261003_0250'),
    ]

    operations = [
        migrations.AlterField(
            model_name='kocmissionnew',
            name='end_reason',
            field=models.CharField(blank=True, choices=[('expired', '已過期'), ('cancelled', 'KOC取消'), ('admin_closed', '平台終止')], db_column='end_reason', max_length=20, null=True),
        ),
    ]

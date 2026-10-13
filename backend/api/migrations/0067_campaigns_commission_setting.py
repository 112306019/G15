from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0066_vendor_login_security'),
    ]

    operations = [
        migrations.AddField(
            model_name='campaigns',
            name='commission_mode',
            field=models.CharField(choices=[('platform_tier', '平台統一級距（舊活動）'), ('fixed', '固定分潤'), ('progressive', '階層式累進分潤')], db_column='commission_mode', default='platform_tier', max_length=20),
        ),
        migrations.AddField(
            model_name='campaigns',
            name='commission_tiers',
            field=models.JSONField(blank=True, db_column='commission_tiers', default=list),
        ),
    ]

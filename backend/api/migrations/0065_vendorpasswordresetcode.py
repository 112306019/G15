import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0064_inquirymessage_order_merge_order_chat'),
    ]

    operations = [
        migrations.CreateModel(
            name='VendorPasswordResetCode',
            fields=[
                ('reset_id', models.AutoField(primary_key=True, serialize=False)),
                ('code', models.CharField(max_length=6)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('expires_at', models.DateTimeField()),
                ('is_used', models.BooleanField(default=False)),
                ('vendor', models.ForeignKey(db_column='vendor_id', on_delete=django.db.models.deletion.CASCADE, related_name='password_reset_codes', to='api.vendor')),
            ],
            options={
                'db_table': 'VendorPasswordResetCode',
            },
        ),
    ]

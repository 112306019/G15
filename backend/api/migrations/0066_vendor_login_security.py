import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0065_vendorpasswordresetcode'),
    ]

    operations = [
        migrations.AddField(
            model_name='vendor',
            name='password_updated_at',
            field=models.DateTimeField(blank=True, db_column='password_updated_at', null=True),
        ),
        migrations.CreateModel(
            name='VendorLoginHistory',
            fields=[
                ('log_id', models.AutoField(primary_key=True, serialize=False)),
                ('ip_address', models.CharField(blank=True, max_length=50, null=True)),
                ('user_agent', models.CharField(blank=True, max_length=255, null=True)),
                ('login_at', models.DateTimeField(auto_now_add=True)),
                ('vendor', models.ForeignKey(db_column='vendor_id', on_delete=django.db.models.deletion.CASCADE, related_name='login_history', to='api.vendor')),
            ],
            options={
                'db_table': 'Vendor_Login_History',
                'ordering': ['-login_at'],
            },
        ),
    ]

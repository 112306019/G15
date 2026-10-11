import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0057_earnings_tiered_commission'),
    ]

    operations = [
        migrations.CreateModel(
            name='AiCheckConsent',
            fields=[
                ('consent_id', models.AutoField(db_column='consent_id', primary_key=True, serialize=False)),
                ('terms_version', models.CharField(db_column='terms_version', max_length=20)),
                ('agreed_at', models.DateTimeField(auto_now_add=True, db_column='agreed_at')),
                ('ip_address', models.GenericIPAddressField(blank=True, db_column='ip_address', null=True)),
                ('user_agent', models.CharField(blank=True, db_column='user_agent', default='', max_length=500)),
                ('user', models.ForeignKey(db_column='user_id', on_delete=django.db.models.deletion.CASCADE, related_name='ai_check_consents', to='api.user')),
            ],
            options={
                'db_table': 'Ai_Check_Consent',
                'unique_together': {('user', 'terms_version')},
            },
        ),
    ]

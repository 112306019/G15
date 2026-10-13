from decimal import Decimal

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0067_campaigns_commission_setting'),
    ]

    operations = [
        migrations.AddField(
            model_name='vendorsettlementitem',
            name='koc_bonus_amount',
            field=models.DecimalField(db_column='koc_bonus_amount', decimal_places=2, default=Decimal('0.00'), max_digits=14),
        ),
        migrations.AddField(
            model_name='vendorsettlement',
            name='koc_bonus_amount',
            field=models.DecimalField(db_column='koc_bonus_amount', decimal_places=2, default=Decimal('0.00'), max_digits=14),
        ),
    ]

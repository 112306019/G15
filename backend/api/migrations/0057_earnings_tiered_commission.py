from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0056_alter_kocmissionnew_end_reason'),
    ]

    operations = [
        migrations.AddField(
            model_name='earnings',
            name='commission_base',
            field=models.DecimalField(blank=True, decimal_places=2, max_digits=12, null=True),
        ),
        migrations.AddField(
            model_name='earnings',
            name='item_quantity',
            field=models.IntegerField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='earnings',
            name='commission_rate',
            field=models.DecimalField(blank=True, decimal_places=2, max_digits=5, null=True),
        ),
        migrations.AddField(
            model_name='earnings',
            name='commission_month',
            field=models.DateField(blank=True, db_index=True, null=True),
        ),
    ]

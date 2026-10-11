import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0060_inquiry_chat'),
    ]

    operations = [
        migrations.AddField(
            model_name='inquirymessage',
            name='product',
            field=models.ForeignKey(blank=True, db_column='product_id', null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='inquiry_messages', to='api.product'),
        ),
    ]

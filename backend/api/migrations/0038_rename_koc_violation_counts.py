from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0037_koc_cancel_count_since_suspension_and_more'),
    ]

    operations = [
        migrations.RenameField(
            model_name='koc',
            old_name='total_cancel_count',
            new_name='total_violation_count',
        ),
        migrations.RenameField(
            model_name='koc',
            old_name='cancel_count_since_suspension',
            new_name='violation_count_since_suspension',
        ),
    ]

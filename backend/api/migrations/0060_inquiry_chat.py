import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0059_move_writing_reviewing_missions_to_publishing'),
    ]

    operations = [
        migrations.CreateModel(
            name='InquiryRoom',
            fields=[
                ('room_id', models.AutoField(primary_key=True, serialize=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('user', models.ForeignKey(db_column='user_id', on_delete=django.db.models.deletion.CASCADE, related_name='inquiry_rooms', to='api.user')),
                ('vendor', models.ForeignKey(db_column='vendor_id', on_delete=django.db.models.deletion.CASCADE, related_name='inquiry_rooms', to='api.vendor')),
            ],
            options={
                'db_table': 'Inquiry_Room',
                'unique_together': {('user', 'vendor')},
            },
        ),
        migrations.CreateModel(
            name='InquiryMessage',
            fields=[
                ('message_id', models.AutoField(primary_key=True, serialize=False)),
                ('sender_role', models.CharField(choices=[('user', '消費者'), ('vendor', '廠商')], db_column='sender_role', max_length=20)),
                ('sender_id', models.CharField(db_column='sender_id', max_length=50)),
                ('content', models.TextField(db_column='content')),
                ('is_read', models.BooleanField(db_column='is_read', default=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('room', models.ForeignKey(db_column='room_id', on_delete=django.db.models.deletion.CASCADE, related_name='messages', to='api.inquiryroom')),
            ],
            options={
                'db_table': 'Inquiry_Message',
                'ordering': ['created_at', 'message_id'],
            },
        ),
    ]

from django.db import migrations


class Migration(migrations.Migration):
    """
    合併兩條各自從 0064 分出來的 migration：
    - 0065_admins_password_updated_at_adminloginhistory_and_more（平台管理員登入安全）
    - 0065_vendorpasswordresetcode → 0066 → 0067 → 0068（廠商忘記密碼、登入與安全性、自訂分潤、廠商加碼）
    兩邊動到的資料表不同，不需要額外的資料庫操作，只是讓 migration 只有一個終點。
    """

    dependencies = [
        ('api', '0065_admins_password_updated_at_adminloginhistory_and_more'),
        ('api', '0068_settlement_koc_bonus_amount'),
    ]

    operations = [
    ]

import boto3
import os
import uuid
from django.conf import settings

def get_r2_client():
    return boto3.client(
        's3',
        endpoint_url=os.getenv('R2_ENDPOINT_URL'),
        aws_access_key_id=os.getenv('R2_ACCESS_KEY_ID'),
        aws_secret_access_key=os.getenv('R2_SECRET_ACCESS_KEY'),
        region_name='auto',
    )

def upload_image_to_r2(file_obj, original_filename):
    """
    上傳圖片到 R2，回傳公開網址
    """
    bucket_name = os.getenv('R2_BUCKET_NAME')
    ext = original_filename.split('.')[-1] if '.' in original_filename else 'jpg'
    key = f"products/{uuid.uuid4()}.{ext}"

    client = get_r2_client()
    client.upload_fileobj(
        file_obj,
        bucket_name,
        key,
        ExtraArgs={'ContentType': file_obj.content_type}
    )

    public_url = os.getenv('R2_PUBLIC_URL')
    if public_url:
        return f"{public_url}/{key}"
    else:
        # 沒有設定自訂網域時，用 R2 的預設公開路徑（需要先在 Cloudflare 開啟 public access）
        account_id = os.getenv('R2_ACCOUNT_ID')
        return f"https://{bucket_name}.{account_id}.r2.dev/{key}"
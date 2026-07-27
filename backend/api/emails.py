import logging

from django.conf import settings
from django.core.mail import send_mail

logger = logging.getLogger(__name__)


def send_koc_approval_email(user):
    """
    KOC 身份審核通過後寄送通知信。

    寄信失敗不應該讓審核流程跟著失敗或卡住 API 回應，
    呼叫端要自己包 try/except，這裡只負責寄信本身。
    """
    subject = "您的 KOC 申請已通過審核！"
    message = (
        f"{user.display_name or user.name} 您好，\n\n"
        "恭喜您！您申請成為 KOC 的審核已經通過。\n"
        "請重新登入帳號，即可開始使用 KOC 專屬功能（接案、撰寫文案、查看分潤等）。\n\n"
        "KOC Platform 團隊"
    )

    send_mail(
        subject=subject,
        message=message,
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[user.email],
        fail_silently=False,
    )

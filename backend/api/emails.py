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


def send_invoice_notification_email(order):
    """
    廠商回填發票號碼後，寄信通知消費者。

    寄信失敗不應該讓上傳流程跟著失敗或卡住 API 回應，
    呼叫端要自己包 try/except，這裡只負責寄信本身。
    """
    user = order.user
    subject = "您的訂單發票已開立"
    message = (
        f"{user.display_name or user.name} 您好，\n\n"
        f"您的訂單（訂單編號：{order.order_id}）發票已由廠商開立完成。\n"
        f"發票號碼：{order.invoice_number}\n\n"
        "請妥善保存此發票號碼，作為報稅或退換貨之憑證。\n\n"
        "KOC Platform 團隊"
    )

    send_mail(
        subject=subject,
        message=message,
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[user.email],
        fail_silently=False,
    )


def send_vendor_approval_email(vendor):
    """
    廠商審核通過後寄送通知信。

    寄信失敗不應該讓審核流程跟著失敗或卡住 API 回應，
    呼叫端要自己包 try/except，這裡只負責寄信本身。
    """
    subject = "您的廠商申請已通過審核！"
    message = (
        f"{vendor.contact_name or vendor.company_name} 您好，\n\n"
        f"恭喜！{vendor.company_name} 申請成為廠商的審核已經通過。\n"
        "請重新登入帳號，即可開始使用廠商專屬功能（建立代言活動、審核 KOC 文案、查看成效分析等）。\n\n"
        "KOC Platform 團隊"
    )

    send_mail(
        subject=subject,
        message=message,
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[vendor.email],
        fail_silently=False,
    )


def send_email_verification_email(user, code):
    """
    註冊時寄送信箱驗證碼，確認這個 Email 真的存在、使用者收得到信。

    這封信是驗證流程的必要環節，寄信失敗要讓呼叫端知道並回報錯誤，
    不能悄悄吞掉（不然帳號就卡在「永遠無法驗證」的狀態）。
    """
    subject = "【KOC Platform】請驗證您的 Email"
    message = (
        f"{user.display_name or user.name} 您好，\n\n"
        f"您的註冊驗證碼為：{code}\n\n"
        "此驗證碼將於 10 分鐘後失效，請盡快完成信箱驗證。\n"
        "如果這不是您本人的操作，請忽略此信。\n\n"
        "KOC Platform 團隊"
    )

    send_mail(
        subject=subject,
        message=message,
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[user.email],
        fail_silently=False,
    )


def send_vendor_email_verification_email(vendor, code):
    """
    廠商註冊時寄送信箱驗證碼，確認這個 Email 真的存在、廠商收得到信。
    跟 send_email_verification_email 對消費者/KOC 做的事一樣，只是收件對象是 Vendor。

    這封信是驗證流程的必要環節，寄信失敗要讓呼叫端知道並回報錯誤，
    不能悄悄吞掉（不然帳號就卡在「永遠無法驗證」的狀態）。
    """
    subject = "【KOC Platform】請驗證您的廠商帳號 Email"
    message = (
        f"{vendor.contact_name or vendor.company_name} 您好，\n\n"
        f"您的廠商註冊驗證碼為：{code}\n\n"
        "此驗證碼將於 10 分鐘後失效，請盡快完成信箱驗證。\n"
        "如果這不是您本人的操作，請忽略此信。\n\n"
        "KOC Platform 團隊"
    )

    send_mail(
        subject=subject,
        message=message,
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[vendor.email],
        fail_silently=False,
    )


def send_password_reset_email(user, code):
    """
    忘記密碼流程寄送驗證碼。

    跟審核通知信不一樣：這封信「就是」使用者拿到驗證碼的唯一管道，
    寄信失敗必須讓呼叫端知道並回報錯誤，不能悄悄吞掉。
    """
    subject = "【KOC Platform】密碼重設驗證碼"
    message = (
        f"{user.display_name or user.name} 您好，\n\n"
        f"您的密碼重設驗證碼為：{code}\n\n"
        "此驗證碼將於 10 分鐘後失效，請盡快完成密碼重設。\n"
        "如果這不是您本人的操作，請忽略此信，您的密碼不會被變更。\n\n"
        "KOC Platform 團隊"
    )

    send_mail(
        subject=subject,
        message=message,
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[user.email],
        fail_silently=False,
    )


def send_tax_form_rejected_email(user, campaign_name, reject_reason):
    """
    勞務報酬單被退回時通知 KOC。

    寄信失敗不應該讓審核流程跟著失敗或卡住 API 回應，
    呼叫端要自己包 try/except，這裡只負責寄信本身。
    """
    subject = f"【KOC Platform】您的勞務報酬單被退回：{campaign_name}"
    message = (
        f"{user.display_name or user.name} 您好，\n\n"
        f"您針對「{campaign_name}」提交的勞務報酬單經審核後需要修正：\n\n"
        f"退回原因：{reject_reason}\n\n"
        "請登入平台重新上傳連結。\n\n"
        "KOC Platform 團隊"
    )

    send_mail(
        subject=subject,
        message=message,
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[user.email],
        fail_silently=False,
    )

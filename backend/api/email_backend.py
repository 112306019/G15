import logging
from email.utils import parseaddr

import requests
from django.conf import settings
from django.core.mail.backends.base import BaseEmailBackend

logger = logging.getLogger(__name__)

SENDGRID_API_URL = "https://api.sendgrid.com/v3/mail/send"


def _split_address(address):
    name, email = parseaddr(address)
    return {"email": email, "name": name} if name else {"email": email}


def _to_recipient_list(addresses):
    return [{"email": address} for address in addresses]


class SendGridEmailBackend(BaseEmailBackend):
    """
    透過 SendGrid HTTP API（走 port 443）寄信。

    Render 免費方案的防火牆會擋掉傳統 SMTP 的 587/465，改用 HTTPS API
    呼叫 SendGrid 才能在上面正常寄信。SendGrid 的 Single Sender Verification
    只需要驗證單一信箱（不用擁有網域），適合我們沒有自己網域的情況。
    """

    def send_messages(self, email_messages):
        if not email_messages:
            return 0

        api_key = getattr(settings, "SENDGRID_API_KEY", "")
        if not api_key:
            if not self.fail_silently:
                raise ValueError("SENDGRID_API_KEY 未設定，無法透過 SendGrid 寄信")
            return 0

        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }

        sent_count = 0
        for message in email_messages:
            personalization = {"to": _to_recipient_list(message.to)}
            if message.cc:
                personalization["cc"] = _to_recipient_list(message.cc)
            if message.bcc:
                personalization["bcc"] = _to_recipient_list(message.bcc)

            content_type = (
                "text/html" if getattr(message, "content_subtype", "plain") == "html" else "text/plain"
            )

            payload = {
                "personalizations": [personalization],
                "from": _split_address(message.from_email),
                "subject": message.subject,
                "content": [{"type": content_type, "value": message.body}],
            }

            if message.reply_to:
                payload["reply_to"] = _split_address(message.reply_to[0])

            try:
                response = requests.post(SENDGRID_API_URL, json=payload, headers=headers, timeout=10)
                response.raise_for_status()
                sent_count += 1
            except requests.RequestException:
                logger.exception(
                    "透過 SendGrid 寄信失敗：subject=%s, to=%s", message.subject, message.to
                )
                if not self.fail_silently:
                    raise

        return sent_count

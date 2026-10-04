from email.message import EmailMessage
from email.utils import formataddr, formatdate, make_msgid
import smtplib
import ssl
from typing import Optional

from noti.drivers.base import Driver, Message, PermanentError, TransientError


class SmtpDriver(Driver):
    def __init__(
        self,
        host: Optional[str] = None,
        port: int = 587,
        user: Optional[str] = None,
        password: Optional[str] = None,
        mail_from: Optional[str] = None,
        timeout: int = 30,
    ):
        self.host = host or "localhost"
        self.port = port
        self.user = user
        self.password = password
        self.mail_from = mail_from or "noreply@example.com"
        self.timeout = timeout

    def send(self, message: Message) -> None:
        msg = EmailMessage()
        msg["From"] = self.mail_from
        if message.to_name:
            msg["To"] = formataddr((message.to_name, message.to_email))
        else:
            msg["To"] = message.to_email

        if message.cc:
            msg["Cc"] = ", ".join(message.cc)
        if message.reply_to:
            msg["Reply-To"] = message.reply_to
        msg["Subject"] = message.subject
        msg["Date"] = formatdate(localtime=True)
        msg["Message-ID"] = make_msgid(domain=self.mail_from.rsplit("@", 1)[-1])

        msg.set_content(message.text)
        msg.add_alternative(message.html, subtype="html")

        try:
            with smtplib.SMTP(self.host, self.port, timeout=self.timeout) as server:
                server.starttls(context=ssl.create_default_context())
                if self.user and self.password:
                    server.login(self.user, self.password)
                server.send_message(msg)
        except smtplib.SMTPRecipientsRefused as e:
            codes = [r[0] for r in e.recipients.values()]
            if codes and all(500 <= c < 600 for c in codes):
                raise PermanentError(f"SMTP recipients refused: {e}")
            raise TransientError(f"SMTP recipients refused (not all permanent): {e}")
        except smtplib.SMTPResponseException as e:
            # 530/534/535 = lỗi xác thực/cấu hình phía ta (sửa được) -> thử lại, không đánh dấu vĩnh viễn.
            if e.smtp_code in (530, 534, 535):
                raise TransientError(f"SMTP {e.smtp_code} auth error: {e}")
            if 500 <= e.smtp_code < 600:
                raise PermanentError(f"SMTP {e.smtp_code} permanent error: {e}")
            raise TransientError(f"SMTP {e.smtp_code} transient error: {e}")
        except (ssl.SSLError, smtplib.SMTPException, OSError) as e:
            raise TransientError(f"SMTP connection/network error: {e}")
        except Exception as e:
            raise TransientError(f"Unexpected SMTP error: {e}")

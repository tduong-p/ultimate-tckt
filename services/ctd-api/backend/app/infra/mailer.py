import smtplib
from email.message import EmailMessage

from app.config import settings


class Mailer:
    def send(self, to: list[str], cc: list[str], subject: str, body: str) -> None:
        raise NotImplementedError


class ConsoleMailer(Mailer):
    """Dùng cho dev và test — không cần quyền Microsoft. `sent` cho test đọc lại."""

    sent: list[dict] = []

    def send(self, to: list[str], cc: list[str], subject: str, body: str) -> None:
        record = {"to": to, "cc": cc, "subject": subject, "body": body}
        ConsoleMailer.sent.append(record)
        print(f"[MAIL] to={to} cc={cc} subject={subject}\n{body}")


class SmtpMailer(Mailer):
    def send(self, to: list[str], cc: list[str], subject: str, body: str) -> None:
        message = EmailMessage()
        message["From"] = settings.mail_from
        message["To"] = ", ".join(to)
        if cc:
            message["Cc"] = ", ".join(cc)
        message["Subject"] = subject
        message.set_content(body)
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port) as server:
            server.starttls()
            if settings.smtp_user:
                server.login(settings.smtp_user, settings.smtp_password)
            server.send_message(message)


def get_mailer() -> Mailer:
    return SmtpMailer() if settings.mailer_driver == "smtp" else ConsoleMailer()

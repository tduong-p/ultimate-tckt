from noti.config import Settings
from noti.drivers.base import Driver, DriverError, Message, PermanentError, TransientError
from noti.drivers.console import ConsoleDriver
from noti.drivers.graph import GraphDriver
from noti.drivers.smtp import SmtpDriver


def get_driver(settings: Settings) -> Driver:
    driver_name = (settings.mail_driver or "console").lower()
    if driver_name == "console":
        return ConsoleDriver()
    elif driver_name == "smtp":
        return SmtpDriver(
            host=settings.smtp_host,
            port=settings.smtp_port,
            user=settings.smtp_user,
            password=settings.smtp_password,
            mail_from=settings.mail_from,
        )
    elif driver_name == "graph":
        return GraphDriver(
            tenant_id=settings.graph_tenant_id,
            client_id=settings.graph_client_id,
            client_secret=settings.graph_client_secret,
            certificate_path=settings.graph_certificate_path,
            mail_from=settings.mail_from,
        )
    else:
        raise ValueError(f"Unknown mail driver: '{driver_name}'")


__all__ = [
    "Driver",
    "DriverError",
    "Message",
    "PermanentError",
    "TransientError",
    "ConsoleDriver",
    "SmtpDriver",
    "GraphDriver",
    "get_driver",
]

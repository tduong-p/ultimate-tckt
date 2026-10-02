from dataclasses import dataclass
from typing import Optional


@dataclass
class Message:
    to_email: str
    to_name: Optional[str]
    cc: list[str]
    reply_to: Optional[str]
    subject: str
    html: str
    text: str


class DriverError(Exception):
    pass


class TransientError(DriverError):
    def __init__(self, message: str = "", retry_after: Optional[int] = None):
        super().__init__(message)
        self.retry_after = retry_after


class PermanentError(DriverError):
    pass


class Driver:
    def send(self, message: Message) -> None:
        raise NotImplementedError

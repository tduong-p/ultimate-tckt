import logging
from typing import ClassVar
from noti.drivers.base import Driver, Message

logger = logging.getLogger(__name__)


class ConsoleDriver(Driver):
    outbox: ClassVar[list[Message]] = []

    def __init__(self):
        # Allow instance-level access to outbox while keeping class-level shared
        pass

    def send(self, message: Message) -> None:
        logger.info(
            "ConsoleDriver: dispatched email subject='%s' (recipients_count=%d)",
            message.subject,
            1 + len(message.cc),
        )
        self.outbox.append(message)

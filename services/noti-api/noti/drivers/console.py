from collections import deque
import logging

from noti.drivers.base import Driver, Message

logger = logging.getLogger(__name__)


class ConsoleDriver(Driver):
    """Không gửi thật. Giữ vài thư gần nhất trong bộ nhớ để test/kiểm tra tay; log không chứa nội dung (§12)."""

    MAX_OUTBOX = 100

    def __init__(self):
        self.outbox: deque[Message] = deque(maxlen=self.MAX_OUTBOX)

    def send(self, message: Message) -> None:
        logger.info("ConsoleDriver: email not sent (console driver), recipients_count=%d", 1 + len(message.cc))
        self.outbox.append(message)

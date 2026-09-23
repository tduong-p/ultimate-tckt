from collections.abc import Callable

from sqlalchemy.orm import Session

from app.models.case import Case
from app.models.workflow import TransitionDef

Handler = Callable[[Session, Case, str, TransitionDef], None]

_handlers: list[Handler] = []


def subscribe(handler: Handler) -> None:
    """Module `notification` đăng ký ở đây. Nhờ vậy `workflow` không phụ thuộc
    ngược vào `notification` — phụ thuộc chỉ đi một chiều."""
    if handler not in _handlers:
        _handlers.append(handler)


def emit(db: Session, case: Case, event_code: str, transition: TransitionDef) -> None:
    for handler in _handlers:
        handler(db, case, event_code, transition)

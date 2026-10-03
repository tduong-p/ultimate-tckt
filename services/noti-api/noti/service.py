from datetime import datetime, timedelta, timezone
from typing import Any
import uuid

from pydantic import ValidationError
from sqlalchemy import select, text
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from noti.config import settings
from noti.errors import NotiError
from noti.hashing import payload_hash
from noti.schemas import NotificationIn, format_errors
from noti.models import ApiClient, Notification, NotificationRecipient
from noti.status import overall_status
from noti.templating import Registry, render

PRIORITY_MAP = {"high": 0, "normal": 1, "low": 2}


def _validate_paths(data: Any, current_path: str = ""):
    if isinstance(data, dict):
        for k, v in data.items():
            path_key = f"{current_path}.{k}" if current_path else k
            if k == "path" or k.endswith("_path"):
                if not isinstance(v, str) or not v.startswith("/") or v.startswith("//"):
                    raise NotiError(
                        400,
                        "validation_error",
                        details=[f"Đường dẫn '{path_key}' phải là đường dẫn tương đối bắt đầu bằng '/' và không bắt đầu bằng '//'"],
                    )
            _validate_paths(v, path_key)
    elif isinstance(data, list):
        for i, item in enumerate(data):
            _validate_paths(item, f"{current_path}[{i}]")


def create_notification(
    db: Session,
    client: ApiClient,
    payload_data: dict,
    registry: Registry,
) -> dict:
    try:
        body = NotificationIn.model_validate(payload_data)
    except ValidationError as error:
        raise NotiError(400, "validation_error", details=format_errors(error.errors()))

    template_name = body.template
    if client.allowed_templates and template_name not in client.allowed_templates:
        raise NotiError(400, "validation_error", details=[f"Template '{template_name}' không được phép với client này"])

    template = registry.get(template_name)
    if template is None:
        raise NotiError(400, "validation_error", details=[f"Template '{template_name}' không tồn tại"])

    missing = template.missing(body.data)
    if missing:
        raise NotiError(400, "validation_error", details=[f"Thiếu trường bắt buộc: {f}" for f in missing])

    pruned_data = template.prune(body.data)
    _validate_paths(pruned_data)

    # Chuẩn hoá người nhận: email chữ thường, loại trùng; biến riêng cũng chỉ giữ biến đã khai (§9)
    seen_emails = set()
    recipients = []
    for r in body.recipients:
        email = str(r.email).lower()
        if email in seen_emails:
            continue
        seen_emails.add(email)
        variables = template.prune(r.variables)
        _validate_paths(variables)
        recipients.append({"email": email, "name": (r.name or "").strip() or None, "variables": variables})

    # Thử render với từng người nhận để bắt lỗi ngay lúc nhận yêu cầu
    for rec in recipients:
        try:
            render(registry, template_name, {**pruned_data, **rec["variables"]}, rec["name"], settings.app_base_url)
        except Exception as e:
            raise NotiError(400, "validation_error", details=[f"Lỗi render template: {str(e)}"])

    cc_list = list(dict.fromkeys(str(c).lower() for c in body.cc))
    reply_to = str(body.reply_to).lower() if body.reply_to else None
    priority_val = PRIORITY_MAP[body.priority]

    expires_at = body.expires_at
    if expires_at is None and template.ttl:
        expires_at = datetime.now(timezone.utc) + timedelta(seconds=template.ttl)

    dedupe_key = body.dedupe_key
    source_ref = body.source_ref

    h = payload_hash(template_name, recipients, cc_list, reply_to, pruned_data)

    if dedupe_key:
        stmt = (
            insert(Notification)
            .values(
                id=uuid.uuid4(),
                client_id=client.id,
                template=template.key,
                template_version=registry.version,
                data=pruned_data,
                payload_hash=h,
                dedupe_key=dedupe_key,
                cc=cc_list,
                reply_to=reply_to,
                priority=priority_val,
                expires_at=expires_at,
                source_ref=source_ref,
            )
            .on_conflict_do_nothing(
                index_elements=["client_id", "dedupe_key"],
                index_where=text("dedupe_key IS NOT NULL"),
            )
            .returning(Notification.id)
        )
        res = db.execute(stmt).scalar()
        if res is None:
            # Conflict occurred
            existing = db.scalar(
                select(Notification).where(
                    Notification.client_id == client.id,
                    Notification.dedupe_key == dedupe_key,
                )
            )
            if existing and existing.payload_hash == h:
                st = overall_status([r.status for r in existing.recipients])
                return {"code": 200, "body": {"id": str(existing.id), "status": st}}
            raise NotiError(
                409,
                "dedupe_key_conflict",
                extra={"id": str(existing.id) if existing else None},
            )

        notification_id = res
    else:
        noti = Notification(
            id=uuid.uuid4(),
            client_id=client.id,
            template=template.key,
            template_version=registry.version,
            data=pruned_data,
            payload_hash=h,
            dedupe_key=None,
            cc=cc_list,
            reply_to=reply_to,
            priority=priority_val,
            expires_at=expires_at,
            source_ref=source_ref,
        )
        db.add(noti)
        db.flush()
        notification_id = noti.id

    for r in recipients:
        rec = NotificationRecipient(
            notification_id=notification_id,
            email=r["email"],
            name=r["name"],
            variables=r["variables"] or None,
            status="pending",
        )
        db.add(rec)

    db.commit()
    return {"code": 202, "body": {"id": str(notification_id), "status": "pending"}}

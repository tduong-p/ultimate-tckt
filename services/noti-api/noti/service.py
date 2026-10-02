from datetime import datetime, timedelta, timezone
from typing import Any
import uuid

from sqlalchemy import select, text
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from noti.config import settings
from noti.errors import NotiError
from noti.hashing import payload_hash
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
    template_name = payload_data.get("template")
    if not template_name:
        raise NotiError(400, "validation_error", details=["Trường 'template' là bắt buộc"])

    if client.allowed_templates and template_name not in client.allowed_templates:
        raise NotiError(400, "validation_error", details=[f"Template '{template_name}' không được phép với client này"])

    template = registry.get(template_name)
    if template is None:
        raise NotiError(400, "validation_error", details=[f"Template '{template_name}' không tồn tại"])

    raw_recipients = payload_data.get("recipients")
    if not raw_recipients or not isinstance(raw_recipients, list):
        raise NotiError(400, "validation_error", details=["Danh sách 'recipients' không được rỗng"])
    if len(raw_recipients) > 50:
        raise NotiError(400, "validation_error", details=["Số lượng người nhận tối đa là 50"])

    raw_data = payload_data.get("data") or {}
    missing = template.missing(raw_data)
    if missing:
        raise NotiError(400, "validation_error", details=[f"Thiếu trường bắt buộc: {f}" for f in missing])

    pruned_data = template.prune(raw_data)
    _validate_paths(pruned_data)

    # Normalize recipients: lowercase email, deduplicate
    seen_emails = set()
    recipients = []
    for r in raw_recipients:
        email = (r.get("email") or "").strip().lower()
        if not email or "@" not in email:
            raise NotiError(400, "validation_error", details=[f"Địa chỉ email '{email}' không hợp lệ"])
        if email not in seen_emails:
            seen_emails.add(email)
            recipients.append({
                "email": email,
                "name": (r.get("name") or "").strip() or None,
                "variables": r.get("variables") or {},
            })

    # Try test render with first recipient
    first_rec = recipients[0]
    test_context_data = {**pruned_data, **(first_rec.get("variables") or {})}
    try:
        render(registry, template_name, test_context_data, first_rec.get("name"), settings.app_base_url)
    except Exception as e:
        raise NotiError(400, "validation_error", details=[f"Lỗi render template: {str(e)}"])

    raw_cc = payload_data.get("cc") or []
    seen_cc = set()
    cc_list = []
    for c in raw_cc:
        c_lower = c.strip().lower()
        if c_lower and "@" in c_lower and c_lower not in seen_cc:
            seen_cc.add(c_lower)
            cc_list.append(c_lower)

    reply_to = payload_data.get("reply_to")
    if reply_to:
        reply_to = reply_to.strip().lower()

    priority_str = payload_data.get("priority", "normal")
    priority_val = PRIORITY_MAP.get(priority_str, 1)

    expires_at = payload_data.get("expires_at")
    if expires_at and isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    elif not expires_at and template.ttl:
        expires_at = datetime.now(timezone.utc) + timedelta(seconds=template.ttl)

    dedupe_key = payload_data.get("dedupe_key")
    if dedupe_key and len(dedupe_key) > 255:
        raise NotiError(400, "validation_error", details=["'dedupe_key' không được vượt quá 255 ký tự"])

    source_ref = payload_data.get("source_ref")
    if source_ref and len(source_ref) > 255:
        raise NotiError(400, "validation_error", details=["'source_ref' không được vượt quá 255 ký tự"])

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

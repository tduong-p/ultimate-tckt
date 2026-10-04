from datetime import datetime, timezone
from pathlib import Path
from typing import Any
import uuid

from fastapi import Depends, FastAPI, Query, Request, Response
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from noti.auth import current_client
from noti.config import settings
from noti.db import get_db
from noti.errors import NotiError, noti_error_handler, validation_error_handler
from noti.models import ApiClient, Notification, NotificationRecipient
from noti.service import create_notification
from noti.status import overall_status
from noti.templating import load_registry

app = FastAPI(title="Noti", docs_url="/v1/docs", openapi_url="/v1/openapi.json")

app.add_exception_handler(NotiError, noti_error_handler)
app.add_exception_handler(RequestValidationError, validation_error_handler)

TEMPLATES_ROOT = Path(__file__).parent.parent / "templates"
app.state.registry = load_registry(TEMPLATES_ROOT)


@app.middleware("http")
async def limit_body_size(request: Request, call_next):
    content_length = request.headers.get("content-length")
    if content_length:
        try:
            if int(content_length) > settings.max_body_bytes:
                return Response(status_code=413)
        except ValueError:
            pass

    body = await request.body()
    if len(body) > settings.max_body_bytes:
        return Response(status_code=413)

    return await call_next(request)


@app.get("/v1/health")
def health():
    return {"status": "ok"}


@app.post("/v1/notifications")
async def post_notification(
    request: Request,
    client: ApiClient = Depends(current_client),
    db: Session = Depends(get_db),
):
    try:
        payload = await request.json()
    except Exception:
        raise NotiError(400, "validation_error", details=["Dữ liệu JSON không hợp lệ"])

    if not isinstance(payload, dict):
        raise NotiError(400, "validation_error", details=["Thân yêu cầu phải là JSON object"])

    res = create_notification(db, client, payload, app.state.registry)
    return JSONResponse(status_code=res["code"], content=res["body"])


@app.get("/v1/notifications/{id}")
def get_notification(
    id: uuid.UUID,
    client: ApiClient = Depends(current_client),
    db: Session = Depends(get_db),
):
    noti = db.scalar(
        select(Notification).where(
            Notification.id == id,
            Notification.client_id == client.id,
        )
    )
    if not noti:
        raise NotiError(404, "not_found")

    st = overall_status([r.status for r in noti.recipients])
    return {
        "id": str(noti.id),
        "template": noti.template,
        "template_version": noti.template_version,
        "status": st,
        "recipients": [
            {
                "email": r.email,
                "name": r.name,
                "status": r.status,
                "attempts": r.attempts,
                "last_error": r.last_error,
                "sent_at": r.sent_at.isoformat() if r.sent_at else None,
            }
            for r in noti.recipients
        ],
    }


@app.get("/v1/notifications")
def get_notification_by_query(
    dedupe_key: str = Query(...),
    client: ApiClient = Depends(current_client),
    db: Session = Depends(get_db),
):
    noti = db.scalar(
        select(Notification).where(
            Notification.client_id == client.id,
            Notification.dedupe_key == dedupe_key,
        )
    )
    if not noti:
        raise NotiError(404, "not_found")

    st = overall_status([r.status for r in noti.recipients])
    return {
        "id": str(noti.id),
        "template": noti.template,
        "template_version": noti.template_version,
        "status": st,
        "recipients": [
            {
                "email": r.email,
                "name": r.name,
                "status": r.status,
                "attempts": r.attempts,
                "last_error": r.last_error,
                "sent_at": r.sent_at.isoformat() if r.sent_at else None,
            }
            for r in noti.recipients
        ],
    }


@app.post("/v1/notifications/{id}/retry")
def retry_notification(
    id: uuid.UUID,
    client: ApiClient = Depends(current_client),
    db: Session = Depends(get_db),
):
    noti = db.scalar(
        select(Notification).where(
            Notification.id == id,
            Notification.client_id == client.id,
        )
    )
    if not noti:
        raise NotiError(404, "not_found")
    if noti.data is None:
        raise NotiError(409, "data_purged")

    for r in noti.recipients:
        if r.status == "failed":
            r.status = "pending"
            r.attempts = 0
            r.next_attempt_at = datetime.now(timezone.utc)
            r.last_error = None

    db.commit()
    db.refresh(noti)
    st = overall_status([r.status for r in noti.recipients])
    return {"id": str(noti.id), "status": st}


@app.get("/v1/templates")
def list_templates(client: ApiClient = Depends(current_client)):
    items = []
    for key, t in app.state.registry.items():
        if not client.allowed_templates or key in client.allowed_templates:
            items.append({
                "key": t.key,
                "required": t.required,
                "optional": t.optional,
                "data_example": t.data_example,
            })
    return {"templates": items}

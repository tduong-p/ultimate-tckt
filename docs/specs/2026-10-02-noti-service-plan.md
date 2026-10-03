---
doc_id: PLAN-NOTI-001
title: Kế hoạch xây service Noti (services/noti-api)
version: 1.0
status: draft
audience: [dev, ai]
owner: DYC
updated: 2026-10-02
related_code: [docs/specs/2026-10-02-noti-service-design.md]
---

# Noti Service Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dựng service `services/noti-api/` nhận `template + data` qua HTTP, xếp hàng trên Postgres, gửi email (driver `console|smtp|graph`) với retry, dedupe, template tiếng Việt.

**Architecture:** Một codebase Python/FastAPI, hai tiến trình (`api`, `worker`) cùng image. Hàng đợi là bảng `notification_recipients` lấy bằng `FOR UPDATE SKIP LOCKED`, bọc sau module `queue`. Template nạp từ `templates/` lúc khởi động.

**Tech Stack:** Python 3.12, FastAPI, SQLAlchemy 2, psycopg 3, Alembic, Jinja2, PyYAML, css-inline, httpx, pytest. Khuôn giống `services/ctd-api/backend`.

**Spec:** `docs/specs/2026-10-02-noti-service-design.md` (SPEC-NOTI-001 v1.1). Mọi số mục `§` dưới đây trỏ vào spec đó.

## Global Constraints

- Thư mục code: `services/noti-api/` (pyproject, `noti/`, `templates/`, `alembic/`, `tests/`). Package tên `noti`.
- API prefix `/v1`; Bearer key; mã lỗi validation là **400** (không 422); dedupe: 202 / 200 / 409 `dedupe_key_conflict`; thân tối đa 64 KB (413); tối đa 50 người nhận; `dedupe_key` ≤ 255 ký tự.
- Backoff: 1 phút, 5 phút, 30 phút, 2 giờ, 12 giờ; tối đa 5 lần; khoá 5 phút; timeout driver 30 giây; ngủ 2 giây khi rỗng.
- `attempts` tăng **lúc lấy việc**. Render lỗi lúc gửi = `failed` vĩnh viễn.
- Không ghi `data`/email vào log. Không secret trong repo. Driver mặc định `console`.
- Subject và tên người nhận loại `\r` `\n`; HTML autoescape bật; đường dẫn trong `data` chỉ là tương đối.
- Tài liệu: mỗi doc sửa phải tăng `version`, đặt `updated`, thêm dòng lịch sử; cuối cùng `npm run docs:index && npm run docs:check -- --base origin/staging`.
- Commit `type(scope): ...` và kết thúc bằng dòng `Co-Authored-By` theo hướng dẫn của phiên.
- Test cần Postgres: biến `NOTI_TEST_DATABASE_URL`; chạy trong CI (xem memory: không chạy MySQL/Postgres cục bộ nếu không có sẵn).

## Phạm vi và việc phải raise họp team

Plan này **chỉ code trong `services/noti-api/`** (module mới) và tài liệu. Các việc sau thuộc hợp đồng dùng chung, **không làm trong plan này**, đưa vào issue `.github/ISSUE_TEMPLATE/cross-module.md` (Task 0): thêm service vào `infra/compose/*.yml`, env/secret trên VM, job CI cho `services/noti-api`, sao lưu/cảnh báo, ADR mới, dòng module trong `docs/dev/ranh-gioi-module.md`. Đổi thân facade `core/src/notifier.js` để gọi Noti là plan riêng (Plan C), sau khi Noti chạy trên staging.

## Review Focus

Các tình huống spec ngầm ý nhưng dễ bị bỏ sót; mỗi dòng có test ở task sở hữu:

1. Hai yêu cầu cùng `dedupe_key` đồng thời chỉ tạo một bản ghi (Task 4).
2. Subject/tên chứa `<script>`, dấu `"` và `\r\n` không chèn được header (Task 2).
3. Worker chết lặp lại trên một dòng không lặp vô hạn: `attempts` tăng lúc lấy, tới mốc thì `failed` (Task 5).
4. `data` có đường dẫn tuyệt đối (`https://evil`) bị từ chối (Task 4).
5. Client A không thấy/retry được thông báo của client B (Task 4).
6. Staging allowlist: địa chỉ ngoài danh sách bị chuyển hướng/bỏ, không gửi thật (Task 6).

## File Structure

```
services/noti-api/
  pyproject.toml  Dockerfile  alembic.ini  alembic/{env.py,versions/0001_initial.py}
  noti/__init__.py  config.py  db.py  models.py  errors.py  auth.py  cli.py
  noti/templating.py      # registry + render + prune + sanitize
  noti/hashing.py         # payload_hash chuẩn hoá
  noti/status.py          # trạng thái tổng
  noti/queue.py           # enqueue, claim_next, mark_*, recover
  noti/drivers/{__init__.py,base.py,console.py,smtp.py,graph.py}
  noti/worker.py          # vòng lặp + phân loại lỗi + backoff
  noti/api.py             # FastAPI app + routes
  templates/_layout/{layout.html.j2,layout.txt.j2}
  templates/<template>/{meta.yaml,body.html.j2,body.txt.j2}   # 11 template
  tests/{conftest.py,test_*.py}
```

---

### Task 0: Issue liên module và ADR (không code)

**Files:**
- Create: `docs/adr/0014-noti-service.md` (số kế tiếp sau 0013; `supersedes: 0004`)
- Modify: `docs/dev/ranh-gioi-module.md` (thêm dòng module Noti, đã có tên "Thông báo (Noti)" — chỉ bổ sung đường dẫn `services/noti-api/**`), tăng version

- [ ] **Step 1: Soạn issue** theo mẫu `cross-module.md`, tiêu đề `[Liên module] Thêm service Noti (noti-api, noti-worker)`. Nội dung lấy từ spec §13: compose (một image hai lệnh, mạng nội bộ, healthcheck), database `noti` trên Postgres sẵn có, env/secret (`NOTI_*` ở Task 1, 5, 6), job CI `services/noti-api` (Postgres service, `NOTI_TEST_DATABASE_URL`), lịch `purge`, sao lưu, cảnh báo tuổi dòng `pending`. Lưu nháp tại scratchpad, tạo bằng `gh issue create --label cross-module --body-file …`.
- [ ] **Step 2: Viết ADR 0014** (frontmatter `supersedes: 0004`): quyết định có Noti là service riêng thay Rule Engine trong Core; bối cảnh = ADR-0013; hệ quả = cần hạ tầng mới.
- [ ] **Step 3:** `npm run docs:index && npm run docs:check -- --base origin/staging`; commit `docs: ADR-0014 Noti service`.

---

### Task 1: Khung dự án, cấu hình, schema, health

**Files:**
- Create: `services/noti-api/pyproject.toml`, `noti/__init__.py`, `noti/config.py`, `noti/db.py`, `noti/models.py`, `noti/errors.py`, `noti/api.py`, `alembic.ini`, `alembic/env.py`, `alembic/versions/0001_initial.py`, `tests/conftest.py`
- Test: `tests/test_health.py`, `tests/test_config.py`

**Interfaces:**
- Produces: `settings` (xem dưới), `get_db()` dependency, `Base`, models `ApiClient`, `Notification`, `NotificationRecipient`, `app` (FastAPI) với `GET /v1/health`.

- [ ] **Step 1: pyproject.toml**

```toml
[build-system]
requires = ["setuptools>=68", "wheel"]
build-backend = "setuptools.build_meta"

[project]
name = "noti-api"
version = "0.1.0"
requires-python = ">=3.12"
dependencies = [
  "fastapi>=0.115", "uvicorn[standard]>=0.32", "sqlalchemy>=2.0.36",
  "psycopg[binary]>=3.2", "alembic>=1.14", "pydantic>=2.9",
  "pydantic-settings>=2.6", "email-validator>=2.2", "jinja2>=3.1",
  "pyyaml>=6.0", "css-inline>=0.14", "httpx>=0.27", "msal>=1.31",
]

[project.optional-dependencies]
dev = ["pytest>=8.3"]

[tool.setuptools]
packages = ["noti", "noti.drivers"]

[tool.pytest.ini_options]
testpaths = ["tests"]
addopts = "-q"
```

- [ ] **Step 2: Test cấu hình (failing)** — `tests/test_config.py`

```python
from noti.config import Settings


def test_defaults_are_safe():
    s = Settings(database_url="postgresql+psycopg://x/y")
    assert s.mail_driver == "console"
    assert s.send_rate_per_minute == 30
    assert s.recipient_allowlist == []
    assert s.max_body_bytes == 64 * 1024


def test_allowlist_is_parsed_from_csv():
    s = Settings(database_url="postgresql+psycopg://x/y", recipient_allowlist="hust.edu.vn, a@b.c")
    assert s.recipient_allowlist == ["hust.edu.vn", "a@b.c"]
```

- [ ] **Step 3: `noti/config.py`**

```python
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="NOTI_", env_file=".env", extra="ignore")

    database_url: str = "postgresql+psycopg://postgres:postgres@localhost:5432/noti"
    test_database_url: str = "postgresql+psycopg://postgres:postgres@localhost:5432/noti_test"
    mail_driver: str = "console"            # console | smtp | graph
    mail_from: str = "noti@example.invalid"
    app_base_url: str = "http://localhost:3000"
    send_rate_per_minute: int = 30
    max_body_bytes: int = 64 * 1024
    recipient_allowlist: list[str] = []
    redirect_to: str | None = None
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    graph_tenant: str = ""
    graph_client_id: str = ""
    graph_client_secret: str = ""
    graph_certificate_path: str = ""

    @field_validator("recipient_allowlist", mode="before")
    @classmethod
    def _csv(cls, value):
        if isinstance(value, str):
            return [part.strip() for part in value.split(",") if part.strip()]
        return value


settings = Settings()
```

Lưu ý: pydantic-settings đọc `list` từ env dạng JSON; validator `mode="before"` chỉ chạy với chuỗi đã là CSV khi truyền tay. Để env `NOTI_RECIPIENT_ALLOWLIST=a,b` hoạt động, khai trường là `Annotated[list[str], NoDecode]` (import `NoDecode` từ `pydantic_settings`) — làm theo và thêm test đặt biến môi trường bằng `monkeypatch`.

- [ ] **Step 4:** chạy `pytest tests/test_config.py` → PASS (sau khi áp dụng `NoDecode`).
- [ ] **Step 5: `noti/models.py`** (schema đúng §6)

```python
import uuid
from datetime import datetime
from sqlalchemy import ARRAY, DateTime, ForeignKey, Index, Integer, String, Text, UniqueConstraint, func, text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


class ApiClient(Base):
    __tablename__ = "api_clients"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100), unique=True)
    key_hash: Mapped[str] = mapped_column(String(64), unique=True)
    allowed_templates: Mapped[list[str]] = mapped_column(ARRAY(Text), default=list, server_default="{}")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class Notification(Base):
    __tablename__ = "notifications"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    client_id: Mapped[int] = mapped_column(ForeignKey("api_clients.id"))
    template: Mapped[str] = mapped_column(String(100))
    template_version: Mapped[str] = mapped_column(String(64))
    data: Mapped[dict | None] = mapped_column(JSONB)
    payload_hash: Mapped[str] = mapped_column(String(64))
    dedupe_key: Mapped[str | None] = mapped_column(String(255))
    cc: Mapped[list[str]] = mapped_column(ARRAY(Text), default=list, server_default="{}")
    reply_to: Mapped[str | None] = mapped_column(String(320))
    priority: Mapped[int] = mapped_column(Integer, default=1)       # 0 high, 1 normal, 2 low
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    source_ref: Mapped[str | None] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    recipients: Mapped[list["NotificationRecipient"]] = relationship(back_populates="notification", cascade="all, delete-orphan")
    __table_args__ = (
        Index("uq_notifications_client_dedupe", "client_id", "dedupe_key", unique=True,
              postgresql_where=text("dedupe_key IS NOT NULL")),
    )


class NotificationRecipient(Base):
    __tablename__ = "notification_recipients"
    id: Mapped[int] = mapped_column(primary_key=True)
    notification_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("notifications.id", ondelete="CASCADE"))
    email: Mapped[str] = mapped_column(String(320))
    name: Mapped[str | None] = mapped_column(String(200))
    variables: Mapped[dict | None] = mapped_column(JSONB)
    status: Mapped[str] = mapped_column(String(16), default="pending")
    attempts: Mapped[int] = mapped_column(Integer, default=0)
    next_attempt_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    locked_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    last_error: Mapped[str | None] = mapped_column(Text)
    sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    notification: Mapped[Notification] = relationship(back_populates="recipients")
    __table_args__ = (Index("ix_recipients_claim", "status", "next_attempt_at"),)
```

- [ ] **Step 6: `noti/db.py`** — `engine = create_engine(settings.database_url, pool_pre_ping=True)`, `SessionLocal`, `get_db()` generator.
- [ ] **Step 7: Alembic** — `alembic/env.py` đọc `settings.database_url`, `target_metadata = Base.metadata`, bọc `context.run_migrations()` trong `SELECT pg_advisory_lock(727001)` / `pg_advisory_unlock` (§12). Sinh `0001_initial.py` bằng `alembic revision --autogenerate -m initial` rồi kiểm tay index một phần `uq_notifications_client_dedupe`.
- [ ] **Step 8: `tests/conftest.py`** theo khuôn ctd-api: engine từ `settings.test_database_url`, `drop_all/create_all` mỗi session, fixture `db` truncate `CASCADE` sau mỗi test, fixture `client` override `get_db`. Thêm fixture `make_client(name="core", allowed=())` tạo `ApiClient` và trả `(client_row, raw_key)` (dùng `noti.auth.hash_key` ở Task 3 — tạm để `NotImplementedError` đến Task 3).
- [ ] **Step 9: health** — test:

```python
def test_health_needs_no_key(client):
    r = client.get("/v1/health")
    assert r.status_code == 200 and r.json() == {"status": "ok"}
```

  `noti/api.py`: `app = FastAPI(title="Noti", docs_url="/v1/docs", openapi_url="/v1/openapi.json")`, route health. `noti/errors.py` ghi đè `RequestValidationError` → `400 {"error":"validation_error","details":[…]}` (§5), và định nghĩa `class NotiError(Exception)` có `status`, `code`, `extra`.
- [ ] **Step 10:** chạy `pytest` → PASS; commit `feat(noti): project skeleton, schema, health`.

---

### Task 2: Template registry và render an toàn

**Files:**
- Create: `noti/templating.py`, `templates/_layout/layout.html.j2`, `templates/_layout/layout.txt.j2`, 11 thư mục template (bảng §9)
- Test: `tests/test_templating.py`, `tests/test_templates_contract.py`

**Interfaces:**
- Produces:
  - `load_registry(root: Path) -> Registry` (ném `TemplateError` nếu cấu trúc sai).
  - `Registry.get(key) -> Template`, `Registry.version: str` (sha256 nội dung thư mục), `Registry.items()`.
  - `Template` có `key, required, optional, ttl, sensitive, data_example`, `missing(data) -> list[str]`, `prune(data) -> dict`.
  - `render(registry, key, data, recipient_name, app_base_url) -> Rendered(subject, html, text)`.
  - `sanitize_header(s) -> str` (loại `\r` `\n`).

- [ ] **Step 1: Test (failing)** — `tests/test_templating.py`

```python
from pathlib import Path
import pytest
from noti.templating import load_registry, render, sanitize_header, TemplateError

ROOT = Path(__file__).parent.parent / "templates"


def test_subject_strips_crlf_and_html_is_escaped():
    reg = load_registry(ROOT)
    data = {**reg.get("task.assigned").data_example, "task": {"id": 1, "title": 'x"<script>\r\nBcc: a@b', "path": "/#a/1"}}
    out = render(reg, "task.assigned", data, "An\r\nBcc: z@z", "https://app.example")
    assert "\r" not in out.subject and "\n" not in out.subject
    assert "<script>" not in out.html and "&lt;script&gt;" in out.html


def test_prune_drops_undeclared_variables():
    reg = load_registry(ROOT)
    t = reg.get("task.assigned")
    pruned = t.prune({**t.data_example, "secret": "x"})
    assert "secret" not in pruned


def test_missing_required_paths_reported():
    reg = load_registry(ROOT)
    assert "task.title" in reg.get("task.assigned").missing({"actor": "B", "task": {"id": 1}})


def test_broken_template_dir_fails_loading(tmp_path):
    (tmp_path / "bad").mkdir()
    (tmp_path / "bad" / "meta.yaml").write_text("key: bad\n")
    with pytest.raises(TemplateError):
        load_registry(tmp_path)


def test_sanitize_header():
    assert sanitize_header("a\r\nb") == "a b"
```

- [ ] **Step 2:** chạy → FAIL (module chưa có).
- [ ] **Step 3: `noti/templating.py`**

```python
import hashlib
import re
from dataclasses import dataclass, field
from pathlib import Path

import css_inline
import yaml
from jinja2 import Environment, FileSystemLoader, StrictUndefined, select_autoescape


class TemplateError(Exception):
    pass


def sanitize_header(value: str) -> str:
    return re.sub(r"[\r\n]+", " ", str(value)).strip()


def _get(data, path):
    cur = data
    for part in path.split("."):
        if not isinstance(cur, dict) or part not in cur:
            return None
        cur = cur[part]
    return cur


def _put(out, path, value):
    cur = out
    parts = path.split(".")
    for part in parts[:-1]:
        cur = cur.setdefault(part, {})
    cur[parts[-1]] = value


@dataclass
class Template:
    key: str
    subject: str
    required: list[str]
    optional: list[str] = field(default_factory=list)
    ttl: int | None = None            # giây
    sensitive: bool = False
    data_example: dict = field(default_factory=dict)

    def missing(self, data: dict) -> list[str]:
        return [p for p in self.required if _get(data, p) in (None, "")]

    def prune(self, data: dict) -> dict:
        out: dict = {}
        for path in [*self.required, *self.optional]:
            value = _get(data, path)
            if value is not None:
                _put(out, path, value)
        return out


@dataclass
class Registry:
    templates: dict[str, Template]
    version: str
    env_html: Environment
    env_text: Environment

    def get(self, key: str) -> Template | None:
        return self.templates.get(key)

    def items(self):
        return self.templates.items()


@dataclass
class Rendered:
    subject: str
    html: str
    text: str


def load_registry(root: Path) -> Registry:
    root = Path(root)
    digest = hashlib.sha256()
    templates: dict[str, Template] = {}
    for directory in sorted(p for p in root.iterdir() if p.is_dir() and not p.name.startswith("_")):
        try:
            meta = yaml.safe_load((directory / "meta.yaml").read_text(encoding="utf-8"))
            for needed in ("body.html.j2", "body.txt.j2"):
                if not (directory / needed).exists():
                    raise TemplateError(f"{directory.name}: thiếu {needed}")
            if meta["key"] != directory.name:
                raise TemplateError(f"{directory.name}: key không khớp tên thư mục")
            templates[meta["key"]] = Template(
                key=meta["key"], subject=meta["subject"], required=list(meta["required"]),
                optional=list(meta.get("optional", [])), ttl=meta.get("ttl"),
                sensitive=bool(meta.get("sensitive", False)), data_example=meta.get("data_example", {}),
            )
        except (OSError, KeyError, yaml.YAMLError) as error:
            raise TemplateError(f"{directory.name}: {error}") from error
    for file in sorted(root.rglob("*")):
        if file.is_file():
            digest.update(file.relative_to(root).as_posix().encode())
            digest.update(file.read_bytes())
    loader = FileSystemLoader(str(root))
    env_html = Environment(loader=loader, autoescape=select_autoescape(["html", "j2"], default=True),
                           undefined=StrictUndefined)
    env_text = Environment(loader=loader, autoescape=False, undefined=StrictUndefined)
    registry = Registry(templates, digest.hexdigest(), env_html, env_text)
    for template in templates.values():       # thử render bằng data_example: lỗi → không khởi động
        render(registry, template.key, template.data_example, "Người nhận", "https://app.example")
    return registry


def render(registry: Registry, key: str, data: dict, recipient_name: str | None, base_url: str) -> Rendered:
    template = registry.get(key)
    if template is None:
        raise TemplateError(f"template không tồn tại: {key}")
    context = {**template.prune(data), "recipient_name": sanitize_header(recipient_name or ""),
               "base_url": base_url.rstrip("/"), "brand": {"name": "DYC"}}
    try:
        subject = sanitize_header(registry.env_text.from_string(template.subject).render(**context))
        html = registry.env_html.get_template(f"{key}/body.html.j2").render(**context)
        text = registry.env_text.get_template(f"{key}/body.txt.j2").render(**context)
    except Exception as error:   # jinja2.TemplateError, UndefinedError…
        raise TemplateError(f"{key}: {error}") from error
    return Rendered(subject=subject, html=css_inline.inline(html), text=text)
```

Ghi chú: `body.html.j2` dùng `{% extends "_layout/layout.html.j2" %}`; `body.txt.j2` dùng `{% extends "_layout/layout.txt.j2" %}`.

- [ ] **Step 4: Layout** — `_layout/layout.html.j2` có `<style>` (inline hoá sau), tiêu đề `{{ brand.name }}`, `{% block content %}`, chân trang "Thư tự động từ hệ thống DYC. Vui lòng không trả lời." `layout.txt.j2` tương tự bằng chữ thuần. Liên kết hành động dựng bằng `{{ base_url }}{{ task.path }}`.
- [ ] **Step 5: 11 template.** Mỗi template: `meta.yaml` (key, subject có mã định danh cố định ở đầu, ví dụ `"[DYC] (TCKT-{{ task.id }}) {{ task.title }}"`, required, optional, data_example) + `body.html.j2` + `body.txt.j2`, nội dung tiếng Việt. Danh sách biến theo bảng sự kiện trong `docs/specs/2026-10-02-go-email-cu-plan.md` (Task 2 của plan đó) và `core/src/routes/*.js` (đối chiếu từng lời gọi `notifier.notify`). `task.deadline_soon` đặt `ttl: 86400`, `system.test` `sensitive: false`. Template `sensitive: true`: để trống ở v1.
- [ ] **Step 6: Contract test** — `tests/test_templates_contract.py`: với mỗi template trong registry, `missing(data_example) == []` và `render(...)` thành công, subject không chứa `\n`, `html` không còn thẻ `<style>` chưa inline cho các thuộc tính cốt lõi (kiểm `style="` xuất hiện).
- [ ] **Step 7:** `pytest tests/test_templating.py tests/test_templates_contract.py` → PASS; commit `feat(noti): template registry, safe rendering, 11 templates`.

---

### Task 3: Xác thực bằng API key và CLI

**Files:**
- Create: `noti/auth.py`, `noti/cli.py`
- Modify: `tests/conftest.py` (fixture `make_client`)
- Test: `tests/test_auth.py`

**Interfaces:**
- Produces: `hash_key(raw) -> str` (sha256 hex), `generate_key() -> str` (`secrets.token_urlsafe(32)`), `current_client` FastAPI dependency trả `ApiClient` hoặc ném `NotiError(401)`.
- CLI: `python -m noti.cli create-client <name> [--templates a,b]` in key **một lần**; `revoke-client <name>`.

- [ ] **Step 1: Test (failing)**

```python
def test_missing_key_is_401(client):
    assert client.get("/v1/templates").status_code == 401

def test_wrong_key_is_401(client, make_client):
    make_client()
    assert client.get("/v1/templates", headers={"Authorization": "Bearer nope"}).status_code == 401

def test_revoked_key_is_401(client, db, make_client):
    row, key = make_client()
    from datetime import datetime, timezone
    row.revoked_at = datetime.now(timezone.utc); db.commit()
    assert client.get("/v1/templates", headers={"Authorization": f"Bearer {key}"}).status_code == 401

def test_valid_key_ok(client, make_client):
    _, key = make_client()
    assert client.get("/v1/templates", headers={"Authorization": f"Bearer {key}"}).status_code == 200
```

- [ ] **Step 2: `noti/auth.py`**

```python
import hashlib, hmac, secrets
from fastapi import Depends, Header
from sqlalchemy import select
from sqlalchemy.orm import Session
from noti.db import get_db
from noti.errors import NotiError
from noti.models import ApiClient


def hash_key(raw: str) -> str:
    return hashlib.sha256(raw.encode()).hexdigest()


def generate_key() -> str:
    return secrets.token_urlsafe(32)


def current_client(authorization: str | None = Header(default=None), db: Session = Depends(get_db)) -> ApiClient:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise NotiError(401, "unauthorized")
    digest = hash_key(authorization[7:].strip())
    client = db.scalar(select(ApiClient).where(ApiClient.key_hash == digest))
    if client is None or client.revoked_at is not None or not hmac.compare_digest(client.key_hash, digest):
        raise NotiError(401, "unauthorized")
    return client
```

- [ ] **Step 3:** `make_client` fixture tạo `ApiClient(name, key_hash=hash_key(key), allowed_templates=list(allowed))`. Thêm route `GET /v1/templates` tối thiểu (hoàn thiện ở Task 4) để test chạy.
- [ ] **Step 4: `noti/cli.py`** bằng `argparse`: `create-client` sinh key, ghi `ApiClient`, `print(key)` kèm cảnh báo "chỉ hiển thị một lần"; `revoke-client`; `purge` (Task 6). Test CLI: gọi hàm `create_client(db, name)` trực tiếp, kiểm DB chỉ có hash (không có key thô).
- [ ] **Step 5:** `pytest tests/test_auth.py` → PASS; commit `feat(noti): per-client api keys and cli`.

---

### Task 4: POST/GET notifications, dedupe, templates API

**Files:**
- Create: `noti/hashing.py`, `noti/status.py`
- Modify: `noti/api.py`, `noti/errors.py`
- Test: `tests/test_hashing.py`, `tests/test_status.py`, `tests/test_api_notifications.py`

**Interfaces:**
- Consumes: `load_registry`, `current_client`, models, `settings`.
- Produces:
  - `payload_hash(template, recipients, cc, reply_to, pruned_data) -> str`
  - `overall_status(recipient_statuses: list[str]) -> str`
  - Routes theo §5. Schema pydantic: `RecipientIn(email: EmailStr, name: str|None, variables: dict={})`, `NotificationIn(template, recipients(min 1, max 50), cc: list[EmailStr]=[], reply_to: EmailStr|None, priority: Literal['high','normal','low']='normal', expires_at: datetime|None, source_ref: str|None (≤255), data: dict={}, dedupe_key: str|None (≤255))`.

- [ ] **Step 1: Test hash + status (failing)**

```python
from noti.hashing import payload_hash
from noti.status import overall_status

R = [{"email": "A@x.vn", "name": "A"}, {"email": "b@x.vn", "name": "B"}]

def test_hash_ignores_order_case_and_extra_fields_by_caller():
    h1 = payload_hash("t", R, [], None, {"a": 1, "b": 2})
    h2 = payload_hash("t", list(reversed([{"email": "a@x.vn", "name": "A"}, R[1]])), [], None, {"b": 2, "a": 1})
    assert h1 == h2

def test_hash_changes_with_data():
    assert payload_hash("t", R, [], None, {"a": 1}) != payload_hash("t", R, [], None, {"a": 2})

def test_overall_status():
    assert overall_status(["sent", "sent"]) == "sent"
    assert overall_status(["sent", "pending"]) == "pending"
    assert overall_status(["failed", "failed"]) == "failed"
    assert overall_status(["sent", "failed"]) == "partial"
    assert overall_status(["sent", "expired"]) == "partial"
```

- [ ] **Step 2: `noti/hashing.py`**

```python
import hashlib, json, unicodedata


def _nfc(value):
    if isinstance(value, str):
        return unicodedata.normalize("NFC", value)
    if isinstance(value, dict):
        return {k: _nfc(v) for k, v in value.items()}
    if isinstance(value, list):
        return [_nfc(v) for v in value]
    return value


def payload_hash(template, recipients, cc, reply_to, data) -> str:
    people = sorted({(r["email"].lower(), r.get("name") or "", json.dumps(_nfc(r.get("variables") or {}), sort_keys=True))
                     for r in recipients})
    body = {"t": template, "r": people, "cc": sorted({c.lower() for c in cc}),
            "rt": (reply_to or "").lower(), "d": _nfc(data)}
    text = json.dumps(body, sort_keys=True, ensure_ascii=False, separators=(",", ":"))
    return hashlib.sha256(text.encode("utf-8")).hexdigest()
```

`noti/status.py`:

```python
def overall_status(statuses: list[str]) -> str:
    if any(s in ("pending", "sending") for s in statuses):
        return "pending"
    if all(s == "sent" for s in statuses):
        return "sent"
    if not any(s == "sent" for s in statuses):
        return "failed"
    return "partial"
```

(Quy ước: toàn `expired` cũng ra `failed`, ghi chú trong docstring; test thêm trường hợp.)

- [ ] **Step 3: Test API (failing)** — `tests/test_api_notifications.py`, dùng `registry` thật. Các test bắt buộc:

```python
import threading

def body(**over):
    base = {"template": "task.assigned",
            "recipients": [{"email": "an@example.com", "name": "An"}],
            "data": {"actor": "Bình", "task": {"id": 1, "title": "Poster", "path": "/#activity/3"}},
            "dedupe_key": "task-assigned:1:7"}
    base.update(over); return base

def auth(key): return {"Authorization": f"Bearer {key}"}

def test_create_then_replay_then_conflict(client, make_client):
    _, key = make_client()
    r1 = client.post("/v1/notifications", json=body(), headers=auth(key))
    assert r1.status_code == 202 and r1.json()["status"] == "pending"
    r2 = client.post("/v1/notifications", json=body(), headers=auth(key))
    assert r2.status_code == 200 and r2.json()["id"] == r1.json()["id"]
    r3 = client.post("/v1/notifications", json=body(data={"actor": "Khác", "task": {"id": 1, "title": "Poster", "path": "/#a"}}), headers=auth(key))
    assert r3.status_code == 409 and r3.json()["error"] == "dedupe_key_conflict"

def test_unknown_template_missing_var_and_limits_are_400(client, make_client):
    _, key = make_client()
    assert client.post("/v1/notifications", json=body(template="nope"), headers=auth(key)).status_code == 400
    assert client.post("/v1/notifications", json=body(data={"actor": "B"}), headers=auth(key)).status_code == 400
    many = [{"email": f"u{i}@example.com"} for i in range(51)]
    assert client.post("/v1/notifications", json=body(recipients=many), headers=auth(key)).status_code == 400
    assert client.post("/v1/notifications", json=body(recipients=[]), headers=auth(key)).status_code == 400

def test_absolute_url_in_path_is_rejected(client, make_client):
    _, key = make_client()
    bad = body(data={"actor": "B", "task": {"id": 1, "title": "x", "path": "https://evil.example/x"}})
    assert client.post("/v1/notifications", json=bad, headers=auth(key)).status_code == 400

def test_client_not_allowed_template_is_400(client, make_client):
    _, key = make_client(allowed=("task.overdue",))
    assert client.post("/v1/notifications", json=body(), headers=auth(key)).status_code == 400

def test_oversize_body_is_413(client, make_client):
    _, key = make_client()
    big = body(data={"actor": "x" * 70_000, "task": {"id": 1, "title": "t", "path": "/#a"}})
    assert client.post("/v1/notifications", json=big, headers=auth(key)).status_code == 413

def test_other_client_gets_404_on_get_and_retry(client, make_client):
    _, key_a = make_client("a"); _, key_b = make_client("b")
    nid = client.post("/v1/notifications", json=body(), headers=auth(key_a)).json()["id"]
    assert client.get(f"/v1/notifications/{nid}", headers=auth(key_b)).status_code == 404
    assert client.post(f"/v1/notifications/{nid}/retry", headers=auth(key_b)).status_code == 404

def test_unseen_variables_are_not_stored(client, db, make_client):
    from noti.models import Notification
    _, key = make_client()
    b = body(); b["data"]["secret"] = "x"
    client.post("/v1/notifications", json=b, headers=auth(key))
    assert "secret" not in db.query(Notification).one().data

# test_concurrent_same_key_creates_one_row: viết ở Step 5 (cần hai Session riêng)
```

- [ ] **Step 4: Triển khai `api.py`:**
  - Registry nạp một lần ở `startup` (`app.state.registry`), đường dẫn từ `Path(__file__).parent.parent / "templates"`.
  - Middleware/dependency chặn thân: đọc `Content-Length`, vượt `settings.max_body_bytes` → 413; đồng thời chặn khi stream vượt giới hạn (đọc `await request.body()` có kiểm độ dài). Ghi chú: giới hạn thật cũng đặt ở proxy (issue hạ tầng).
  - Kiểm `path`: duyệt `data` đã `prune`, mọi khoá tên `path` hoặc kết thúc `_path` phải bắt đầu bằng `/` và không bắt đầu bằng `//`; ngược lại → `NotiError(400, "validation_error", details=…)`.
  - Luồng tạo: (1) kiểm quyền template theo `client.allowed_templates` (rỗng = tất cả); (2) `missing()` → 400; (3) `prune`; (4) thử `render` bằng người nhận đầu tiên → lỗi → 400; (5) loại trùng recipients/cc theo email chữ thường; (6) `payload_hash`; (7) `expires_at = body.expires_at or now+ttl` nếu template có `ttl`; (8) nếu `dedupe_key`: `INSERT … ON CONFLICT (client_id, dedupe_key) WHERE dedupe_key IS NOT NULL DO NOTHING RETURNING id` (dùng `sqlalchemy.dialects.postgresql.insert(...).on_conflict_do_nothing(index_elements=[...], index_where=...)`); không có dòng trả về → `SELECT` bản cũ, so hash → 200 hoặc 409; (9) tạo recipients `pending`; trả `202 {"id","status":"pending"}`.
  - `GET /v1/notifications/{id}`: `{id, template, template_version, status (overall_status), recipients:[{email,status,attempts,last_error,sent_at}]}`; 404 nếu khác client. Ánh xạ priority `high→0, normal→1, low→2`.
  - `GET /v1/notifications?dedupe_key=` trong phạm vi client (404 nếu không có).
  - `POST …/retry`: các recipient `failed` → `pending`, `attempts=0`, `next_attempt_at=now()`; chỉ chủ sở hữu.
  - `GET /v1/templates`: danh sách `{key, required, optional, data_example}` lọc theo `allowed_templates`.
- [ ] **Step 5: Test đồng thời** — dùng `threading` + hai `SessionLocal` riêng gọi hàm dịch vụ `create_notification(db, client, payload, registry)` (tách khỏi route để test không phụ thuộc override `get_db` dùng chung một session); assert tổng số dòng `notifications` = 1 và đúng một lần trả "created".
- [ ] **Step 6:** `pytest` → PASS; commit `feat(noti): notifications api with dedupe and template listing`.

---

### Task 5: Hàng đợi, driver, worker

**Files:**
- Create: `noti/queue.py`, `noti/drivers/{__init__,base,console,smtp,graph}.py`, `noti/worker.py`
- Test: `tests/test_queue.py`, `tests/test_worker.py`, `tests/test_drivers.py`

**Interfaces:**
- Produces:
  - `queue.claim_next(db, limit=10, now=None) -> list[Claimed]` (`Claimed`: `recipient_id, notification_id, email, name, variables, template, data, cc, reply_to, attempts`), đã đặt `sending`, `locked_until=now+5m`, `attempts+=1`.
  - `queue.recover(db, now=None, max_attempts=5)`: trả `sending` quá khoá về `pending` (hoặc `failed` nếu `attempts >= max_attempts`); `pending` quá `expires_at` → `expired`.
  - `queue.mark_sent(db, rid)`, `queue.mark_retry(db, rid, delay_seconds, error)`, `queue.mark_failed(db, rid, error)`.
  - `drivers.base.Driver.send(message: Message) -> None`; ném `TransientError(retry_after: int|None)` hoặc `PermanentError`. `Message(to_email, to_name, cc, reply_to, subject, html, text)`.
  - `worker.run_once(db, registry, driver, now=None) -> int` (số dòng xử lý), `worker.main()` vòng lặp.
  - `worker.BACKOFF = [60, 300, 1800, 7200, 43200]`, `MAX_ATTEMPTS = 5`, `delay_for(attempts, retry_after)`.

- [ ] **Step 1: Test queue (failing)** — các test:
  - `claim_next` tăng `attempts` và đặt `sending`; gọi lần 2 không trả lại cùng dòng.
  - Hai `Session` song song gọi `claim_next` trên cùng bộ 20 dòng → hợp hai kết quả không trùng id.
  - `recover`: dòng `sending` hết khoá và `attempts<5` → `pending`; `attempts>=5` → `failed`.
  - Dòng `pending` có `expires_at` quá khứ → `expired`, không được claim.
  - Thứ tự: `priority` nhỏ trước, rồi `next_attempt_at`.
- [ ] **Step 2: `claim_next`**

```python
from sqlalchemy import text

CLAIM_SQL = text("""
WITH picked AS (
  SELECT r.id FROM notification_recipients r
  JOIN notifications n ON n.id = r.notification_id
  WHERE r.status = 'pending' AND r.next_attempt_at <= :now
    AND (n.expires_at IS NULL OR n.expires_at > :now)
  ORDER BY n.priority, r.next_attempt_at
  FOR UPDATE OF r SKIP LOCKED
  LIMIT :limit)
UPDATE notification_recipients r
SET status='sending', attempts = r.attempts + 1, locked_until = :now + interval '5 minutes'
FROM picked, notifications n
WHERE r.id = picked.id AND n.id = r.notification_id
RETURNING r.id AS recipient_id, r.notification_id, r.email, r.name, r.variables, r.attempts,
          n.template, n.data, n.cc, n.reply_to
""")
```

  `claim_next` chạy `recover` trước, rồi `db.execute(CLAIM_SQL, …)`, `db.commit()`.
- [ ] **Step 3: Test worker (driver giả)** — `FakeDriver` ghi lại thư, có thể cấu hình lỗi theo địa chỉ. Test: thành công → `sent`; `TransientError` → `pending` với `next_attempt_at ≈ now+60s` và `attempts=1`; `TransientError(retry_after=3600)` → trễ 3600 s (lớn hơn backoff); `PermanentError` → `failed` ngay; transient ở lần thứ 5 → `failed`; một người lỗi không chặn người kia (trạng thái tổng `partial`); template bị xoá khỏi registry → `failed` không retry; thử render lỗi → `failed`; dòng bị "worker chết" 5 lần (set `sending`+hết khoá, gọi `recover` lặp) kết thúc `failed`, không lặp vô hạn.
- [ ] **Step 4: `worker.py`** — `delay_for(attempts, retry_after)`: `BACKOFF[min(attempts, 5) - 1]`, trả `max(backoff, retry_after or 0)`. `run_once`: `claim_next`; mỗi dòng: render (`TemplateError` → `mark_failed`); áp `recipient_policy` (Task 6); `driver.send`; `PermanentError` → `mark_failed`; `TransientError` → nếu `attempts >= MAX_ATTEMPTS` thì `mark_failed` còn không `mark_retry`; ngoại lệ khác coi là transient. Giới hạn tốc độ: giữa các lần gửi `time.sleep(60 / settings.send_rate_per_minute)` (tham số hoá để test truyền 0). `last_error` qua `scrub_error()` loại địa chỉ email bằng regex. `main()`: kiểm schema (`alembic current` so với head, thoát nếu lệch), vòng lặp `while True: n = run_once(...); if n == 0: sleep(2)`.
- [ ] **Step 5: Driver**
  - `console`: ghi log (`id` và chủ đề, **không** nội dung) và append `Message` vào `ConsoleDriver.outbox` (list) cho test.
  - `smtp`: `smtplib.SMTP(host, port, timeout=30)` + `starttls()`, `EmailMessage` với `formataddr((name, email))`, multipart text+html; `SMTPRecipientsRefused`/mã 5xx → `PermanentError`; `SMTPException`/`OSError`/mã 4xx → `TransientError`.
  - `graph`: lấy token bằng `msal.ConfidentialClientApplication` (scope `https://graph.microsoft.com/.default`, chứng chỉ nếu `graph_certificate_path`, ngược lại secret), `httpx.post(f"https://graph.microsoft.com/v1.0/users/{mail_from}/sendMail", timeout=30)`; `202` ok; `429` → `TransientError(retry_after=int(Retry-After))`; `5xx` → transient; `400/404` (địa chỉ/hộp thư) → permanent; `401/403` → permanent (lỗi cấu hình).
  - `get_driver(settings)`; mặc định `console`; tên lạ → ném lỗi khi khởi động.
- [ ] **Step 6: Test driver** — SMTP với `smtplib` được `monkeypatch`; Graph với `httpx.MockTransport`: 202 / 429 + `Retry-After` / 503 / 400 / 403 cho đúng loại lỗi; test `get_driver` mặc định là console.
- [ ] **Step 7:** `pytest` → PASS; commit `feat(noti): queue, drivers and worker with retry`.

---

### Task 6: Chính sách người nhận (staging), dọn dữ liệu, chỉ số

**Files:**
- Create: `noti/recipient_policy.py`
- Modify: `noti/worker.py`, `noti/cli.py`
- Test: `tests/test_recipient_policy.py`, `tests/test_purge.py`, `tests/test_metrics.py`

**Interfaces:**
- Produces: `apply_policy(email, allowlist, redirect_to) -> str | None` (địa chỉ gửi thật, hoặc `None` = bỏ); `cli purge`; `queue.metrics(db) -> dict` (`pending`, `failed`, `oldest_pending_age_seconds`).

- [ ] **Step 1: Test policy (failing)**

```python
from noti.recipient_policy import apply_policy

def test_empty_allowlist_sends_everything():
    assert apply_policy("a@x.vn", [], None) == "a@x.vn"

def test_allowed_domain_and_address():
    assert apply_policy("a@hust.edu.vn", ["hust.edu.vn"], None) == "a@hust.edu.vn"
    assert apply_policy("a@x.vn", ["a@x.vn"], None) == "a@x.vn"

def test_outside_allowlist_redirects_or_drops():
    assert apply_policy("a@gmail.com", ["hust.edu.vn"], "qa@hust.edu.vn") == "qa@hust.edu.vn"
    assert apply_policy("a@gmail.com", ["hust.edu.vn"], None) is None
```

  Worker: khi `None` → `mark_failed(error="blocked by allowlist")`? Spec nói "chuyển hướng hoặc bỏ": bỏ = đánh `sent` với `last_error="dropped by allowlist"` để không retry và không báo `failed` giả. Test worker: driver không được gọi.
- [ ] **Step 2:** Implement `apply_policy` (so khớp chữ thường; mục không có `@` là miền, so với phần sau `@`). Gắn vào `run_once` trước `driver.send`, và thêm tiền tố `[chuyển hướng từ <địa chỉ gốc>]` vào subject khi chuyển hướng.
- [ ] **Step 3: Test purge** — tạo thông báo `sent` hoàn tất 8 ngày trước → `data`/`variables` thành null; 6 ngày trước → còn nguyên; template `sensitive` hoàn tất vừa xong → xoá ngay; thông báo 91 ngày → xoá hẳn cùng recipients; thông báo còn `pending` không bị chạm dù cũ.
- [ ] **Step 4: Implement `purge(db, now)`** theo §12 (dùng thời điểm hoàn tất = `max(sent_at, updated)`: thêm cột `finished_at` vào `notification_recipients`? — **không**; dùng `GREATEST` trên `sent_at` và `next_attempt_at` của dòng cuối). Nếu việc này làm logic lộn xộn, thêm cột `finished_at` bằng migration `0002` và đặt trong `mark_sent/mark_failed/expired` — chọn cách này và cập nhật test queue tương ứng. `purge` in số dòng đã xử lý (không in nội dung).
- [ ] **Step 5: Metrics** — `queue.metrics`, test các giá trị; `worker` log một dòng JSON mỗi 60 giây: `{"pending":…, "failed":…, "oldest_pending_age_s":…}`; thêm `GET /v1/health?deep=1`? **Không** (YAGNI): chỉ log.
- [ ] **Step 6:** `pytest` → PASS; commit `feat(noti): staging recipient policy, purge, metrics`.

---

### Task 7: Đóng gói và tài liệu

**Files:**
- Create: `services/noti-api/Dockerfile`, `services/noti-api/.env.example`, `docs/dev/noti.md` (DEV-NOTI-001)
- Modify: `docs/dev/ranh-gioi-module.md`, `docs/ai/tim-o-dau.md`, `docs/dev/email-cron.md`

- [ ] **Step 1: Dockerfile** (một image, hai lệnh):

```dockerfile
FROM python:3.12-slim
WORKDIR /app
COPY pyproject.toml ./
COPY noti ./noti
COPY templates ./templates
COPY alembic ./alembic
COPY alembic.ini ./
RUN pip install --no-cache-dir .
EXPOSE 8000
CMD ["sh", "-c", "alembic upgrade head && uvicorn noti.api:app --host 0.0.0.0 --port 8000"]
# worker: python -m noti.worker
```

  Kiểm `docker build` chạy được trong CI (không bắt buộc cục bộ).
- [ ] **Step 2: `.env.example`** liệt kê mọi `NOTI_*` với giá trị mẫu giả, không secret thật.
- [ ] **Step 3: Tài liệu** — `docs/dev/noti.md`: chạy cục bộ, tạo client, gọi thử bằng `curl`, thêm template mới (checklist: meta, hai body, data_example, test contract), bảng lỗi, quy ước `dedupe_key` (dẫn tới `docs/playbooks/viet-http-request-noti.md`). Cập nhật `ranh-gioi-module.md` (đường dẫn module), `email-cron.md` (trỏ tới Noti là đích của facade), `tim-o-dau.md`. Frontmatter `related_code: [services/noti-api/**]`. Cập nhật spec: `related_code` thêm `services/noti-api/**`, `version` 1.2, chuyển `status: active` khi plan hoàn tất.
- [ ] **Step 4:** `npm run docs:index && npm run docs:check -- --base origin/staging` xanh (broad glob → nhãn `no-docs-needed` nếu cần, kèm dòng `Docs:` trong PR).
- [ ] **Step 5:** commit `feat(noti): dockerfile, env example, docs`; mở PR vào `staging`.

---

## Self-Review

- **Spec coverage:** §5 API (Task 4), §6 dữ liệu (Task 1), §7 worker/retry (Task 5), §8 dedupe (Task 4), §9 template (Task 2), §10 driver và allowlist (Task 5, 6), §11 auth (Task 3), §12 vận hành/purge/metrics (Task 6), §13 hạ tầng → Task 0 issue (cố ý không code), §16 kiểm thử có mặt ở từng task. Khối diff, chuông, push: ngoài phạm vi theo §14.
- **Chỗ cần quyết khi thực thi:** cột `finished_at` (Task 6 Step 4, đã chọn thêm migration 0002); cách chặn thân 64 KB ở tầng ứng dụng bổ sung cho giới hạn proxy.
- **Không nằm trong plan này:** compose/CI/VM (issue), đổi thân `core/src/notifier.js` sang gọi HTTP (Plan C, sau khi Noti chạy trên staging).

## Lịch sử phiên bản

| Version | Ngày | Thay đổi | Người |
|---|---|---|---|
| 1.0 | 2026-10-02 | Bản đầu | DYC |

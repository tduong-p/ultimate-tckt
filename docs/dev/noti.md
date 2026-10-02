---
doc_id: DEV-NOTI-001
title: Hướng dẫn phát triển và vận hành service Noti
version: 1.0
status: active
audience: [dev, ai]
owner: DYC
updated: 2026-10-02
related_code: [services/noti-api/**]
---

# Hướng dẫn phát triển và vận hành service Noti

Service **Noti** (`services/noti-api/`) là dịch vụ thông báo độc lập cho hệ thống `ultimate-tckt`. Noti cung cấp HTTP API để nhận yêu cầu gửi email từ các module khác (Core, CTD, …), render template an toàn (Jinja2 + autoescape + inlined CSS), xếp hàng đợi trong database Postgres (`noti`), và worker xử lý gửi qua 3 driver: `console`, `smtp`, `graph` (Microsoft 365).

Tài liệu thiết kế chi tiết: [SPEC-NOTI-001](file:///Users/duongpt/Developer/ultimate-tckt/docs/specs/2026-10-02-noti-service-design.md).
Quyết định kiến trúc: [ADR-0014](file:///Users/duongpt/Developer/ultimate-tckt/docs/adr/0014-noti-service.md).

## 1. Cấu trúc thư mục

```
services/noti-api/
├── alembic/              # Migration database
├── noti/
│   ├── api.py            # FastAPI application & endpoints
│   ├── auth.py           # Per-client API key authentication
│   ├── cli.py            # CLI quản trị (create-client, revoke-client, purge)
│   ├── config.py         # Pydantic settings & env loading
│   ├── db.py             # SQLAlchemy session & engine
│   ├── errors.py         # Error handler (400 validation format)
│   ├── hashing.py        # payload_hash chuẩn hoá (NFC, sorted, lowercase)
│   ├── models.py         # SQLAlchemy models (api_clients, notifications, notification_recipients)
│   ├── queue.py          # Claim (SKIP LOCKED), recover, metrics, purge
│   ├── recipient_policy.py # Staging allowlist & redirect
│   ├── status.py         # overall_status calculator
│   ├── templating.py     # Registry, safe render, sanitize headers, inline CSS
│   ├── worker.py         # Background worker loop & retry backoff
│   └── drivers/          # console, smtp, graph
├── templates/            # 11 template email ban đầu & _layout
├── tests/                # Bộ test pytest đầy đủ
├── Dockerfile            # Container image cho cả API và Worker
├── pyproject.toml
└── .env.example
```

## 2. Chạy cục bộ (Local Development)

### 2.1. Cài đặt môi trường

Yêu cầu Python >= 3.12 và Postgres chạy tại `localhost:5432`:

```bash
cd services/noti-api
python3.12 -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
```

Tạo database `noti` (và `noti_test` cho test):

```bash
createdb noti
createdb noti_test
```

### 2.2. Chạy migration

```bash
alembic upgrade head
```

### 2.3. Chạy API server

```bash
uvicorn noti.api:app --reload --port 8000
```

API docs xem tại `http://localhost:8000/v1/docs`.

### 2.4. Chạy Worker

Trong terminal riêng:

```bash
python -m noti.worker
```

### 2.5. Chạy kiểm thử (Tests)

```bash
pytest
```

## 3. Quản lý client và API key (CLI)

Mọi dịch vụ gọi Noti đều cần một API key riêng được xác thực qua header `Authorization: Bearer <key>`. Key chỉ lưu bản băm SHA-256 trong database.

### Tạo client mới:

```bash
python -m noti.cli create-client core --templates activity.proposed,task.assigned
```

Lệnh sẽ sinh một chuỗi ngẫu nhiên 32-byte an toàn và hiển thị một lần duy nhất.

### Thu hồi client:

```bash
python -m noti.cli revoke-client core
```

### Dọn dẹp dữ liệu (Purge):

```bash
python -m noti.cli purge
```

Lệnh purge thực hiện:
- Xoá `data` và `variables` của thông báo nhạy cảm ngay khi hoàn tất.
- Xoá `data` và `variables` của thông báo thường sau 7 ngày kể từ khi hoàn tất.
- Xoá vĩnh viễn (hard delete) các thông báo đã hoàn tất cũ hơn 90 ngày.
- Không chạm vào các thông báo còn đang `pending`.

## 4. Gọi thử API bằng cURL

### 4.1. Gửi thông báo

```bash
curl -X POST http://localhost:8000/v1/notifications \
  -H "Authorization: Bearer <YOUR_API_KEY>" \
  -H "Content-Type: application/json" \
  -d '{
    "template": "system.test",
    "recipients": [
      {"email": "student@hust.edu.vn", "name": "Nguyễn Văn A"}
    ],
    "data": {
      "message": "Xin chào từ hệ thống Noti!"
    },
    "dedupe_key": "system-test:12345"
  }'
```

Trả về: `202 Accepted` kèm `id` và `status: "pending"`.
Gọi lại đúng nội dung và `dedupe_key` sẽ trả về `200 OK` (idempotent).
Gọi lại cùng `dedupe_key` nhưng khác nội dung trả về `409 Conflict`.

### 4.2. Xem trạng thái thông báo

```bash
curl http://localhost:8000/v1/notifications/<NOTIFICATION_ID> \
  -H "Authorization: Bearer <YOUR_API_KEY>"
```

### 4.3. Thử lại người nhận lỗi (Retry)

```bash
curl -X POST http://localhost:8000/v1/notifications/<NOTIFICATION_ID>/retry \
  -H "Authorization: Bearer <YOUR_API_KEY>"
```

### 4.4. Danh sách template

```bash
curl http://localhost:8000/v1/templates \
  -H "Authorization: Bearer <YOUR_API_KEY>"
```

## 5. Thêm template mới (Checklist)

Để thêm template mới vào Noti:
1. Tạo thư mục `templates/<tên_sự_kiện>/`.
2. Tạo file `meta.yaml`:
   - `key`: trùng tên thư mục.
   - `subject`: tiêu đề Jinja, bắt đầu bằng mã chuẩn như `[DYC] (TCKT-{{ task.id }}) {{ task.title }}`.
   - `required`: danh sách đường dẫn biến bắt buộc (hỗ trợ nested, vd `task.title`).
   - `optional`: danh sách đường dẫn biến tuỳ chọn.
   - `ttl`: thời gian sống tính bằng giây (tuỳ chọn).
   - `sensitive`: `true` hoặc `false` (nếu true, data bị xoá ngay khi gửi xong).
   - `data_example`: mẫu dữ liệu đầy đủ để kiểm tra tự động.
3. Tạo file `body.html.j2`: kế thừa `_layout/layout.html.j2`.
4. Tạo file `body.txt.j2`: kế thừa `_layout/layout.txt.j2`.
5. Chạy contract test để xác minh:
   ```bash
   pytest tests/test_templates_contract.py
   ```

## 6. Bảng mã lỗi API

| Mã HTTP | Mã lỗi (`error`) | Ý nghĩa |
|---|---|---|
| `400` | `validation_error` | Thiếu biến bắt buộc, đường dẫn tuyệt đối trong path, quá 50 người nhận, template không tồn tại hoặc ngoài quyền cho phép của client. |
| `401` | `unauthorized` | Thiếu hoặc sai API key, hoặc key đã bị thu hồi. |
| `404` | `not_found` | Không tìm thấy thông báo hoặc thông báo thuộc về client khác. |
| `409` | `dedupe_key_conflict` | Cùng `dedupe_key` nhưng payload đã bị thay đổi so với lần gọi trước. |
| `413` | `request_entity_too_large` | Kích thước payload vượt quá giới hạn cấu hình (mặc định 64KB). |

## 7. Quy ước `dedupe_key`

`dedupe_key` là bắt buộc để chống gửi lặp sự kiện. Quy ước đặt key:
- Giao việc: `task-assigned:<taskId>:<userId>`
- Nghiệm thu: `task-review:<taskId>:<reviewerId>:<thời điểm request>`
- Nhắc hạn scheduler: `task-deadline-<4h|24h>:<taskId>:<userId>:<ngày YYYY-MM-DD>`
- Phản hồi: `task-response:<updateId>:<userId>`

## Lịch sử phiên bản

| Version | Ngày | Thay đổi | Người |
|---|---|---|---|
| 1.0 | 2026-10-02 | Tài liệu ban đầu hướng dẫn phát triển và vận hành Noti service (PLAN-NOTI-001) | DYC |

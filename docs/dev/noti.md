---
doc_id: DEV-NOTI-001
title: Hướng dẫn phát triển và vận hành service Noti
version: 1.5
status: active
audience: [dev, ai]
owner: DYC
updated: 2026-10-05
related_code: [services/noti-api/**]
---

# Hướng dẫn phát triển và vận hành service Noti

Service **Noti** (`services/noti-api/`) là dịch vụ thông báo độc lập cho hệ thống `ultimate-tckt`. Noti cung cấp HTTP API để nhận yêu cầu gửi email từ các module khác (Core, CTD, …), render template an toàn (Jinja2 + autoescape + inlined CSS), xếp hàng đợi trong database Postgres (`noti`), và worker xử lý gửi qua 3 driver: `console`, `smtp`, `graph` (Microsoft 365).

Tài liệu thiết kế chi tiết: [SPEC-NOTI-001](../specs/2026-10-02-noti-service-design.md).
Quyết định kiến trúc: [ADR-0014](../adr/0014-noti-service.md).

> **Trạng thái:** chạy **chỉ ở staging** (compose, CI `test-noti`/`build-noti`/`deploy-noti`, driver `console`) —
> cách dựng và biến môi trường: [`docs/ops/moi-truong.md`](../ops/moi-truong.md) mục 4a. Production và cảnh báo chưa làm.
> Image chạy bằng user không phải root; worker tự purge mỗi giờ. Core gọi Noti qua `core/src/noti-sender.js` (client `core`, key `CORE_NOTI_API_KEY`) — xem `docs/dev/email-cron.md`.

## 1. Cấu trúc thư mục

```
services/noti-api/
├── alembic/              # Migration database
├── noti/
│   ├── api.py            # FastAPI application & endpoints
│   ├── auth.py           # Per-client API key authentication
│   ├── body_limit.py     # Middleware ASGI chặn thân yêu cầu quá lớn (413)
│   ├── cli.py            # CLI quản trị (create-client, revoke-client, purge)
│   ├── config.py         # Pydantic settings & env loading
│   ├── db.py             # SQLAlchemy session & engine
│   ├── errors.py         # Error handler (400 validation format)
│   ├── hashing.py        # payload_hash chuẩn hoá (NFC, sorted, lowercase)
│   ├── models.py         # SQLAlchemy models (api_clients, notifications, notification_recipients)
│   ├── queue.py          # Claim (SKIP LOCKED), recover, metrics, purge
│   ├── recipient_policy.py # Staging allowlist & redirect
│   ├── status.py         # overall_status calculator (bỏ qua `suppressed`)
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

### 2.6. Cấu hình

Mọi biến môi trường có tiền tố `NOTI_` và được liệt kê đầy đủ trong `services/noti-api/.env.example`
(test `test_env_example_matches_settings_fields` bắt lệch giữa file này và `noti/config.py`). Điểm cần nhớ:

- `NOTI_MAIL_DRIVER` mặc định `console`: không gửi thật, chỉ giữ 100 thư gần nhất trong bộ nhớ, log không chứa nội dung.
- `NOTI_APP_BASE_URL` là gốc của mọi liên kết trong email; người gọi chỉ gửi đường dẫn tương đối.
- Driver `graph`: `NOTI_GRAPH_TENANT`, `NOTI_GRAPH_CLIENT_ID`, và chứng chỉ (`NOTI_GRAPH_CERTIFICATE_PATH` +
  `NOTI_GRAPH_CERTIFICATE_THUMBPRINT`, ưu tiên) hoặc `NOTI_GRAPH_CLIENT_SECRET`; `NOTI_MAIL_FROM` là hộp thư chung gửi đi.
- Staging: `NOTI_RECIPIENT_ALLOWLIST` (miền hoặc địa chỉ, phân tách bằng dấu phẩy). Người nhận ngoài danh sách được
  chuyển về `NOTI_REDIRECT_TO` (hoặc bỏ nếu trống); **CC và `reply_to` ngoài danh sách luôn bị bỏ**, không chuyển hướng.
  Người nhận bị bỏ vì allowlist có trạng thái `suppressed` (không phải `sent`, vì chưa có thư nào đi).
  Production để trống danh sách.

### 2.7. Trạng thái người nhận, retry và lỗi

- Trạng thái người nhận: `pending`, `sending`, `sent`, `failed`, `expired`, `suppressed`. `sent` chỉ có nghĩa nhà cung cấp
  đã nhận thư. `suppressed` = bị allowlist bỏ, không gửi thư nào. Trạng thái tổng bỏ qua `suppressed`; nếu **tất cả**
  người nhận đều `suppressed` thì trạng thái tổng là `suppressed`.
- Tối đa `MAX_ATTEMPTS = 6` lần thử (`noti/queue.py`), nghỉ giữa các lần `BACKOFF = [60, 300, 1800, 7200, 43200]` giây
  (`noti/worker.py`), tổng cửa sổ thử lại xấp xỉ 14,6 giờ; hết lượt thì `failed`. Lỗi `429` tôn trọng `Retry-After` nếu lớn hơn backoff.
- Phân loại lỗi driver: SMTP `5xx` (trừ `530/534/535`, coi là lỗi cấu hình sửa được → thử lại) và Graph `400/403/404/4xx`
  là vĩnh viễn (`failed` ngay); mất kết nối, timeout, `5xx`, `429`, Graph `401` và lỗi MSAL tạm thời là thử lại. SMTP kiểm
  chứng chỉ TLS khi `starttls`; MSAL có timeout.
- Một lô lấy ra phải xong trước khi khoá 5 phút hết hạn: quá hạn chót của lô thì phần còn lại được trả về `pending`
  mà **không** tính là một lần thử.
- Ghi `sent` được thử 3 lần và **không bao giờ** kích hoạt gửi lại. **Rủi ro còn lại:** nếu sau khi thư đã đi mà DB
  vẫn hỏng lâu hơn thời hạn khoá 5 phút, `recover()` trả dòng về `pending` và thư có thể bị gửi thêm một lần.
- `POST /v1/notifications/{id}/retry` sau khi dữ liệu đã bị purge (`data` null) trả `409 data_purged`.
- Thân yêu cầu quá `NOTI_MAX_BODY_BYTES` (mặc định 64 KB) bị từ chối `413` ngay khi vượt, kể cả upload chunked, không đệm cả thân vào bộ nhớ.

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

Worker tự chạy purge lúc khởi động và sau đó mỗi giờ (`PURGE_INTERVAL_SECONDS`), nên không cần cron. Chạy tay khi cần:

```bash
python -m noti.cli purge
```

Purge thực hiện:
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
| `400` | `validation_error` | Thân sai kiểu (email không hợp lệ, `expires_at` thiếu múi giờ, `priority` lạ…), thiếu biến bắt buộc, đường dẫn tuyệt đối trong path, 0 hoặc quá 50 người nhận, template không tồn tại hoặc ngoài quyền của client. |
| `401` | `unauthorized` | Thiếu hoặc sai API key, hoặc key đã bị thu hồi. |
| `404` | `not_found` | Không tìm thấy thông báo hoặc thông báo thuộc về client khác. |
| `409` | `dedupe_key_conflict` | Cùng `dedupe_key` nhưng payload đã bị thay đổi so với lần gọi trước. |
| `409` | `data_purged` | `POST …/retry` khi dữ liệu thông báo đã bị purge: không thể soạn lại, hãy gửi yêu cầu mới. |
| `413` | — (thân rỗng) | Kích thước payload vượt quá giới hạn cấu hình (mặc định 64 KB). |

## 7. Quy ước `dedupe_key`

`dedupe_key` là **tuỳ chọn**: không gửi thì Noti không chống trùng (spec §8). Core sẽ gửi đúng `sourceKey` mà facade
`core/src/notifier.js` nhận ở mỗi điểm gọi (bảng sự kiện trong `docs/specs/2026-10-02-go-email-cu-plan.md`).
Cách đặt key cho từng use case: `docs/playbooks/viet-http-request-noti.md`.

## Lịch sử phiên bản

| Version | Ngày | Thay đổi | Người |
|---|---|---|---|
| 1.5 | 2026-10-05 | #49: trạng thái `suppressed`, `MAX_ATTEMPTS = 6`, phân loại lỗi, `/retry` sau purge → 409, giới hạn thân 413, rủi ro gửi lặp còn lại | DYC |
| 1.3 | 2026-10-02 | Chạy ở staging: compose, CI, việc làm tay trên VM (trỏ OPS-ENV-001 §4a) | DYC |
| 1.2 | 2026-10-02 | Worker tự purge mỗi giờ; image chạy non-root | DYC |
| 1.1 | 2026-10-02 | Sửa link tuyệt đối; ghi rõ chưa chạy trên VM; thêm mục cấu hình (graph, allowlist áp cho CC); `dedupe_key` là tuỳ chọn, trỏ về playbook; sửa mã 413 và mô tả 400 | DYC |
| 1.0 | 2026-10-02 | Tài liệu ban đầu hướng dẫn phát triển và vận hành Noti service (PLAN-NOTI-001) | DYC |
| 1.4 | 2026-10-02 | Core đã gọi Noti ở staging qua `core/src/noti-sender.js` | DYC |

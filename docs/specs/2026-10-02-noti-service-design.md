---
doc_id: SPEC-NOTI-001
title: Thiết kế service Noti — gửi thông báo email theo template qua HTTP API
version: 1.2
status: active
audience: [dev, ai]
owner: DYC
updated: 2026-10-02
related_code: [services/noti-api/**]
---

# Service Noti — thiết kế

> Trạng thái: **active** (đã triển khai theo kế hoạch PLAN-NOTI-001). Code nằm tại `services/noti-api/**`.
> Bản 1.2 ghi nhận việc hoàn tất triển khai Noti service.

## 1. Mục tiêu

Một service độc lập tên **Noti**. Các module khác (Core, Điều hành, CTD, module sau này) chỉ cần gọi một HTTP API kèm
`template + data`; Noti nắm template cài sẵn, soạn nội dung email, xếp hàng, gửi, retry và ghi lịch sử.
Mức hoàn thiện mong muốn tương đương email thông báo của Jira: một khung chung, mỗi sự kiện một thân riêng.
Khối "thay đổi" (giá trị cũ gạch ngang, giá trị mới tô nền) là mục tiêu sau v1 (§14).

Người dùng của spec này: dev các module gọi Noti; dev bảo trì Noti; người vận hành VM.

## 2. Phạm vi

**Trong phạm vi (v1):**
- Kênh **email** duy nhất.
- API `v1` để gửi, tra trạng thái, thử lại, liệt kê template.
- Hàng đợi trên Postgres, worker, retry có backoff, chống gửi trùng, hạn dùng của thông báo.
- Template tiếng Việt trong repo, một khung chung.
- Driver gửi: `console`, `smtp`, `graph` (Microsoft Graph).
- Xác thực bằng API key riêng cho từng service gọi.

**Ngoài phạm vi (để sau, xem §14):** chuông trong ứng dụng, push, khối diff, digest, tuỳ chọn nhận mail theo người,
sửa template trên giao diện, đa đơn vị/đa thương hiệu, RabbitMQ, theo dõi thư bị trả lại (bounce/NDR).

## 3. Quyết định đã chốt (2026-10-02, với người dùng)

| # | Quyết định |
|---|---|
| 1 | Template **nằm trong code** (repo), có version qua git |
| 2 | Người nhận do **service gọi tự quyết** theo nghiệp vụ; Noti không có bảng người dùng nên người gọi gửi sẵn `email` và `name` |
| 3 | Ngôn ngữ **toàn tiếng Việt**; một đơn vị duy nhất là **DYC**; bộ nhận diện làm sau nhưng khung email phải đổi được ở một chỗ |
| 4 | `dedupe_key` theo mô hình idempotency key, chi tiết §8 |
| 5 | Noti là **service riêng**, giao tiếp bằng **HTTP API** |
| 6 | Stack: **Python/FastAPI**, `services/noti-api/`, Postgres, Alembic, pytest (cùng khuôn `ctd-api`) |
| 7 | v1 chỉ email; chuông trong app giữ trong Core, ghi ở §14 |
| 8 | Hàng đợi: **bảng Postgres tự viết** + `FOR UPDATE SKIP LOCKED`, không dùng Procrastinate/RabbitMQ ở v1 |
| 9 | Xác thực giữa service: **API key riêng cho từng service gọi** |
| 10 | Khối diff (gạch ngang/tô màu) **muốn có, nhưng hoãn sau v1**: hiện chưa có điểm gọi nào cần (§9, §14); làm khi có nghiệp vụ "sửa việc/bình luận" |
| 11 | **Bỏ hẳn OneSignal** khỏi Core (đã chốt 2026-10-02). Push về sau sẽ là một kênh của Noti, chọn nhà cung cấp lại khi cần |

## 4. Kiến trúc

```
Core / Điều hành / CTD / …  ──HTTP + Bearer key──▶  noti-api (FastAPI)
                                                       │ ghi notifications + recipients (pending)
                                                       ▼
                                                   Postgres (database noti)
                                                       ▲ SKIP LOCKED
                                                   noti-worker ──▶ driver email: console | smtp | graph
```

- **noti-api**: kiểm key, kiểm template và biến, thử render, ghi DB, trả `202`. Không gửi mail trong request.
- **noti-worker**: cùng codebase, cùng image, lệnh khởi chạy khác; lấy việc, render, gửi, ghi kết quả.
- **Registry template**: nạp từ thư mục `templates/` lúc khởi động; template sai cấu trúc làm service **không khởi động**.
- Lớp mỏng `queue` (`enqueue`, `claim_next`, `mark_*`) bọc mọi thao tác hàng đợi để sau này đổi cài đặt (Procrastinate,
  RabbitMQ) mà không đụng API và template.

## 5. Hợp đồng API v1

Mọi route (trừ health) yêu cầu `Authorization: Bearer <api-key>`; thiếu hoặc sai → `401`.

### `POST /v1/notifications`

```json
{
  "template": "task.assigned",
  "recipients": [{ "email": "an@hust.edu.vn", "name": "Nguyễn Văn An", "variables": {} }],
  "cc": [],
  "reply_to": null,
  "priority": "normal",
  "expires_at": "2026-10-03T08:00:00+07:00",
  "source_ref": "task:120",
  "data": {
    "actor": "Bình",
    "task": { "id": 120, "title": "Làm poster", "path": "/#activity/3" }
  },
  "dedupe_key": "task-assigned:120:7"
}
```

- `recipients[].variables` (tuỳ chọn): biến riêng từng người, gộp đè lên `data` khi render.
- `cc`, `reply_to`: tuỳ chọn; áp dụng cho mọi người nhận. Địa chỉ được kiểm hợp lệ và loại trùng (không phân biệt hoa thường).
- `priority`: `high | normal | low`, quyết định thứ tự lấy việc (mặc định `normal`).
- `expires_at`: quá hạn mà chưa gửi thì **không gửi nữa** (trạng thái `expired`). Template có thể khai `ttl` mặc định trong `meta.yaml` (ví dụ nhắc hạn 24 giờ).
- `source_ref`: chuỗi tự do của người gọi để đối chiếu nghiệp vụ (tuỳ chọn, ≤ 255 ký tự).
- **Đường dẫn trong `data`** (`path`): người gọi chỉ gửi đường dẫn tương đối; Noti nối với `NOTI_APP_BASE_URL` đã cấu hình. Không nhận URL tuyệt đối từ người gọi (chống chèn liên kết lạ).

| Kết quả | Mã | Thân |
|---|---|---|
| Tạo mới | `202` | `{ "id", "status": "pending" }` |
| `dedupe_key` đã có, nội dung giống | `200` | cùng dạng thân như `202`, `id` và `status` hiện tại của bản cũ |
| `dedupe_key` đã có, nội dung khác | `409` | `{ "error": "dedupe_key_conflict", "id": "<bản cũ>" }` |
| Thân sai cấu trúc, template không có/không được phép, thiếu biến bắt buộc, thử render lỗi, `recipients` rỗng/quá giới hạn | `400` | `{ "error": "validation_error", "details": […] }` |
| Thân vượt giới hạn kích thước | `413` | — |

Mã `422` mặc định của FastAPI được ghi đè về `400` ở một chỗ duy nhất để người gọi chỉ phải xử lý một dạng lỗi.

Giới hạn: tối đa **50 người nhận** mỗi yêu cầu; thân yêu cầu tối đa **64 KB** (chặn ở tầng uvicorn/proxy, không chỉ ở ứng dụng); `dedupe_key` tối đa 255 ký tự.
Mỗi client có **danh sách template được phép** (cột `allowed_templates` của `api_clients`; rỗng = tất cả); gọi template ngoài danh sách → `400`.

### Các route khác
- `GET /v1/notifications/{id}` → trạng thái từng người nhận, số lần thử, lỗi cuối, `template_version`. Yêu cầu của client khác trả `404` (không lộ sự tồn tại).
- `GET /v1/notifications?dedupe_key=…` → tra theo khoá chống trùng trong phạm vi client gọi.
- `POST /v1/notifications/{id}/retry` → đặt lại các người nhận `failed` về `pending` (chỉ client tạo ra nó; `404` nếu client khác).
- `GET /v1/templates` → danh sách template, biến bắt buộc/tuỳ chọn và dữ liệu mẫu, lọc theo quyền của client.
- `GET /v1/health` (không cần key) → `{ "status": "ok" }`, dùng cho healthcheck compose.

API được tài liệu hoá qua OpenAPI của FastAPI; thay đổi phá vỡ thì ra `/v2`.

## 6. Dữ liệu (Postgres, database `noti` riêng)

| Bảng | Cột chính |
|---|---|
| `api_clients` | `id`, `name` (unique), `key_hash`, `allowed_templates` (text[]), `created_at`, `revoked_at` |
| `notifications` | `id` (uuid), `client_id`, `template`, `template_version`, `data` (jsonb, null được sau khi dọn), `payload_hash`, `dedupe_key` (null được), `cc`, `reply_to`, `priority`, `expires_at`, `source_ref`, `created_at`; **unique `(client_id, dedupe_key)`** khi `dedupe_key` không null |
| `notification_recipients` | `id`, `notification_id`, `email`, `name`, `variables` (jsonb), `status` (`pending`/`sending`/`sent`/`failed`/`expired`), `attempts`, `next_attempt_at`, `locked_until`, `last_error`, `sent_at` |

**Trạng thái tổng** suy ra từ người nhận, không lưu riêng: `pending` nếu còn người `pending`/`sending`; ngược lại `sent` nếu tất cả `sent`;
`failed` nếu không ai `sent`; còn lại (có cả `sent` lẫn `failed`/`expired`) là `partial`.

Dữ liệu chứa email và tên người (dữ liệu cá nhân): xem §12.

## 7. Worker, retry, phục hồi

- Lấy việc: `SELECT … FROM notification_recipients WHERE status='pending' AND next_attempt_at<=now() ORDER BY priority, next_attempt_at FOR UPDATE SKIP LOCKED LIMIT n` (có join `notifications` để lấy `priority`, `expires_at`).
  Khi lấy: `status='sending'`, `locked_until=now()+5 phút`, **`attempts = attempts + 1` ngay lúc lấy** (để một dòng làm chết worker nhiều lần vẫn bị chặn ở mốc tối đa, không lặp vô hạn).
- Dòng `pending` quá `expires_at` → `expired`, không gửi.
- Dòng `sending` có `locked_until < now()` được trả về `pending` (chỉ khi `attempts` chưa tới mốc tối đa, nếu đã tới thì `failed`). Việc này chạy ở đầu mỗi vòng.
- **Timeout của driver là 30 giây**, luôn nhỏ hơn thời gian khoá, để một lần gửi chậm không bị worker khác lấy trùng.
- Gửi **từng người nhận một**; lỗi của một người không ảnh hưởng người khác.
- **Render lỗi lúc gửi là lỗi vĩnh viễn** (`failed` ngay, không retry), vì thử lại cũng cho cùng kết quả. Thử render đã chạy lúc nhận yêu cầu nên trường hợp này chỉ xảy ra khi template đổi giữa chừng; `template_version` (băm nội dung thư mục template) được lưu để biết thư đã soạn bằng bản nào.
- Phân loại lỗi: **tạm thời** (mất kết nối, timeout, `5xx` từ nhà cung cấp) → backoff `1 phút, 5 phút, 30 phút, 2 giờ, 12 giờ`, tối đa **5 lần**, sau đó `failed`. **`429`**: tôn trọng `Retry-After` của nhà cung cấp (lấy giá trị lớn hơn giữa nó và backoff). **Vĩnh viễn** (địa chỉ không hợp lệ, từ chối kiểu người nhận không tồn tại, lỗi xác thực cấu hình) → `failed` ngay.
- Vòng lặp ngủ 2 giây khi không có việc.
- **Giới hạn tốc độ**: `NOTI_SEND_RATE_PER_MINUTE` (mặc định 30) áp dụng **theo từng tiến trình worker**. v1 chạy **đúng một** worker để giới hạn có nghĩa; khi cần nhiều worker thì chuyển giới hạn sang token bucket trong DB (việc để sau, §14). `SKIP LOCKED` vẫn bảo đảm nhiều worker không lấy trùng, nên việc tăng sau này không đổi hợp đồng.
- **Giới hạn đã biết:** gửi theo kiểu "ít nhất một lần". Nếu worker chết sau khi nhà cung cấp nhận thư nhưng trước khi ghi `sent`, người nhận có thể nhận trùng một lần. Chấp nhận, vì xác suất thấp và hậu quả nhỏ.
- **Ý nghĩa của `sent`:** nhà cung cấp **đã nhận** thư (với Graph là lệnh `sendMail` trả `202`). Thư bị trả lại về sau (NDR/bounce) **không** được theo dõi ở v1.
- **Thử lại thủ công** (`POST …/retry`): đặt `attempts = 0`, `next_attempt_at = now()`, chỉ cho người nhận `failed`; người nhận `expired` không retry (cần gửi yêu cầu mới với `dedupe_key` khác).
- Điều kiện xem xét thay hàng đợi bằng thư viện hoặc broker: nhu cầu lên lịch phức tạp, nhiều loại job ngoài email, nhiều worker cần giới hạn tốc độ chung, hoặc thông lượng vượt vài chục thư mỗi giây.

## 8. Chống gửi trùng (`dedupe_key`)

Theo mô hình idempotency key đã dùng rộng rãi (Stripe, Adyen, bản nháp IETF `Idempotency-Key`), điều chỉnh để chặn cả **sự kiện lặp** chứ không chỉ gọi lại do mạng.

- Phạm vi duy nhất: `(client, dedupe_key)`.
- Cài đặt không có cửa sổ đua: `INSERT … ON CONFLICT (client_id, dedupe_key) DO NOTHING RETURNING id`; nếu không trả dòng nào thì `SELECT` bản có sẵn rồi so `payload_hash`. Cùng hash → `200` bản cũ; khác hash → `409 dedupe_key_conflict`.
- **`payload_hash` chuẩn hoá** để hai lần gọi giống nhau về nghĩa cho cùng một hash: JSON khoá sắp xếp, UTF-8 chuẩn NFC, email hạ chữ thường, danh sách `recipients`/`cc` sắp xếp theo email và loại trùng; băm tính trên `template + recipients + cc + reply_to + data` **sau khi đã bỏ biến thừa** (biến không khai trong `meta.yaml`). `priority`, `expires_at`, `source_ref` **không** vào hash (thay đổi chúng không làm thành thông báo khác).
- Key do **người gọi tạo từ định danh nghiệp vụ** và phải chứa yếu tố làm sự kiện khác nhau khi cần lặp lại hợp lệ (ngày, số lần).
  Ví dụ: `task-deadline-24h:120:7:2026-10-02`, `task-assigned:120:7`. Core đã có sẵn `source_key` cho thông báo trong ứng dụng; dùng chính chuỗi đó làm `dedupe_key` để hai kênh cùng một sự kiện cùng một khoá.
- Không có key → không chống trùng; Noti không đoán.
- Key sống cùng vòng đời bản ghi (90 ngày, §12). Sau đó có thể gửi lại cùng key.
- Gọi lại cùng key khi bản cũ đã `failed` → vẫn trả bản cũ; muốn gửi lại dùng `POST …/retry`.
- Tài liệu cho dev module gọi (playbook, tách khỏi spec): bảng quy ước đặt key cho từng template.

## 9. Template

Cấu trúc:

```
templates/
  _layout/layout.html.j2  _layout/layout.txt.j2   # khung chung + biến thương hiệu
  task.assigned/meta.yaml  body.html.j2  body.txt.j2
```

- `meta.yaml`: `key`, `subject` (Jinja), `required` (danh sách biến, hỗ trợ đường dẫn `task.title`), `optional`, `ttl` (tuỳ chọn), `sensitive` (mặc định false), `data_example`.
- Thiếu biến bắt buộc, hoặc thử render lỗi → `400` ngay lúc nhận yêu cầu, không phải lúc gửi.
- Chỉ các biến được khai trong `required` và `optional` mới được render; biến thừa bị bỏ và **không được lưu** vào `data` trong DB.
- **Autoescape bật cho HTML.** Subject và bản chữ thuần **không** được autoescape của HTML, nên: subject/tên người nhận **bị loại ký tự `\r` `\n`** (chặn chèn header), tên người nhận đi qua `email.utils.formataddr`. Test bắt buộc có tiêu đề chứa `<script>`, dấu ngoặc kép và `\r\n`.
- Mỗi email có **bản HTML và bản chữ thuần**. Sau khi render, HTML được **inline CSS** (nhiều trình đọc mail bỏ qua thẻ `<style>`).
- **Khung chung** chứa tên (`DYC`), màu, logo (để trống ở v1), chân trang; đổi bộ nhận diện chỉ sửa `_layout/` và biến thương hiệu.
- **Subject** có mã định danh cố định ở đầu, ví dụ `[DYC] (TCKT-120) Làm poster`, để mail client gom thread như Jira.
- **Template ban đầu**, chỉ gồm những gì Core thực sự gọi hôm nay (đối chiếu từng điểm gọi trong plan A):

| Template | Điểm gọi hiện tại của Core |
|---|---|
| `activity.proposed` | tạo hoạt động; nộp lại đề án (2 chỗ) |
| `activity.participant_added` | thêm người tham gia |
| `activity.decided` | duyệt / từ chối / yêu cầu sửa đề án |
| `task.assigned` | giao việc |
| `task.response` | phản hồi công việc |
| `task.review_requested` | nộp nghiệm thu (2 chỗ) |
| `task.reviewed` | kết quả nghiệm thu |
| `task.deadline_soon` | scheduler: sắp đến hạn (24h/4h) |
| `task.overdue` | scheduler: quá hạn |
| `task.unacknowledged` | scheduler: chưa xác nhận nhận việc |
| `system.test` | gửi thử cấu hình (quản trị) |

  `task.updated`, `task.commented` và khối diff **không** nằm trong v1 vì chưa có điểm gọi (§14).

## 10. Driver email

| Driver | Dùng cho | Cấu hình |
|---|---|---|
| `console` | phát triển, test | không cần; ghi email ra log và bộ nhớ test |
| `smtp` | môi trường thử, hoặc SMTP OAuth sau này | `NOTI_SMTP_HOST/PORT/USER/PASSWORD`, TLS bắt buộc |
| `graph` | `hust.edu.vn` (Microsoft 365) | `NOTI_GRAPH_TENANT/CLIENT_ID`, chứng chỉ (ưu tiên) hoặc `NOTI_GRAPH_CLIENT_SECRET`, `NOTI_MAIL_FROM` |

- Chọn bằng `NOTI_MAIL_DRIVER`; mặc định `console` (không bao giờ gửi thật nếu chưa cấu hình rõ).
- Basic auth SMTP của Exchange Online đang bị Microsoft tắt dần (mặc định tắt cuối 12/2026 cho tenant hiện có; mốc có thể đổi), nên không xây trên đó. `graph` dùng OAuth và cần **admin trường cấp quyền `Mail.Send` kiểu application**. Việc xin quyền chạy song song, không chặn code vì `console` và `smtp` đủ để phát triển và kiểm thử.
- **Yêu cầu khi xin quyền:** `Mail.Send` kiểu application mặc định cho phép gửi **từ mọi hộp thư** trong tenant. Phải xin IT **giới hạn phạm vi theo hộp thư gửi duy nhất** (Exchange *RBAC for Applications* hoặc application access policy) và dùng một **hộp thư chung riêng cho Noti**, không dùng hộp thư cá nhân.
- Ưu tiên **chứng chỉ** thay cho client secret; secret nếu dùng phải có lịch xoay vòng (≤ 12 tháng) và người chịu trách nhiệm.
- **Staging không được gửi cho người thật** trừ khi có danh sách cho phép: `NOTI_RECIPIENT_ALLOWLIST` (miền hoặc địa chỉ); thư tới địa chỉ ngoài danh sách bị chuyển hướng về `NOTI_REDIRECT_TO` (một hộp thư thử) hoặc bỏ. Production để trống danh sách (gửi thẳng).
- Mọi secret chỉ qua biến môi trường, không vào repo hay log.

## 11. Xác thực

- Mỗi service gọi có một `api_clients` riêng; key sinh ngẫu nhiên ≥ 32 byte, chỉ hiển thị một lần lúc tạo, **chỉ lưu băm**.
- Thu hồi bằng `revoked_at`; key bị thu hồi trả `401`.
- Tạo key bằng lệnh quản trị (`python -m noti.cli create-client <tên>`), không có endpoint công khai.
- Noti **không** mở ra internet: chỉ truy cập từ mạng compose nội bộ. Việc cấu hình nginx/compose thuộc `infra/` (§13).

## 12. Vận hành, bảo mật, dữ liệu cá nhân

- `data` chứa email và tên người: **không ghi `data` vào log**; log chỉ có `id`, `template`, `client`, trạng thái. `last_error` được lọc bỏ địa chỉ email và nội dung thư trước khi lưu.
- **Giảm lưu giữ:** `data` và `variables` được xoá (đặt null) **7 ngày sau khi thông báo đạt trạng thái cuối**; template có `sensitive: true` thì xoá **ngay khi đạt trạng thái cuối**. Dòng metadata (không có nội dung) giữ **90 ngày** rồi bị xoá hẳn, kèm người nhận.
- Dọn bằng lệnh `python -m noti.cli purge`, chạy định kỳ do `infra/`.
- Chỉ số tối thiểu qua log có cấu trúc: số `pending`, số `failed`, tuổi dòng `pending` lâu nhất. Cần **cảnh báo** khi tuổi này vượt ngưỡng (ví dụ 15 phút) hoặc `failed` tăng bất thường; cách phát cảnh báo do `infra/` quyết định.
- Phiên bản schema qua Alembic; migration chạy dưới **advisory lock** để API và worker khởi động đồng thời không chạy đua; worker kiểm schema khi khởi động.
- **Sao lưu:** database `noti` nằm trong lịch sao lưu Postgres chung (§13).

## 13. Hạ tầng và việc liên module (phải họp team)

Theo `AGENTS.md` §3, các việc sau **không tự làm**, đưa vào issue `.github/ISSUE_TEMPLATE/cross-module.md`:
- Thêm service `noti-api` và `noti-worker` vào `infra/compose/*.yml`: **một image, hai lệnh** (`api`, `worker`), healthcheck, mạng nội bộ. Đề xuất: dùng lại **instance Postgres sẵn có với một database `noti` riêng** (không dùng chung database với Core/CTD), để tránh thêm máy chủ DB.
- Biến môi trường và secret mới trên VM (`apply-infra.sh`), job CI cho `services/noti-api`, sao lưu và cảnh báo (§12).
- Hợp đồng API v1 là hợp đồng dùng chung; việc đổi sau này phải qua họp.
- Dịch vụ mới nằm ngoài các module hiện có trong `docs/dev/ranh-gioi-module.md`: cần thêm dòng module và cập nhật dòng "Email & Cron".
- **ADR mới** (số kế tiếp, `supersedes: 0004`) ghi quyết định có Noti thay cho Rule Engine trong Core; ADR-0004 mô tả hướng chưa từng có trên `staging`.
- Quyết định của người dùng gói chung vào issue: bỏ OneSignal (§3 #11).

## 14. Việc để sau (không làm trong v1)

| Hạng mục | Ghi chú |
|---|---|
| **Chuông trong ứng dụng** | Hiện là bảng `notifications` trong DB của Core. Hướng mở rộng: kênh `in_app` do Noti nắm kho thông báo, giao diện Core đọc qua API; cần di chuyển dữ liệu `notifications` và đổi giao diện. Giữ nguyên hợp đồng v1 khi mở rộng |
| **Khối diff** (gạch ngang giá trị cũ, tô nền giá trị mới, so sánh theo từ bằng `difflib`) | Muốn có. Làm cùng template `task.updated`/`task.commented` khi Core có luồng sửa việc và bình luận gửi mail; kiểu dữ liệu `changes: [{field, from, to, diff?}]`, tối đa 20 thay đổi mỗi thư |
| Push (web/mobile) | Chọn lại nhà cung cấp khi cần (đã bỏ OneSignal) |
| Digest, tuỳ chọn nhận mail | Cần bảng tuỳ chọn người dùng |
| Soạn template trên giao diện | Hiện chỉ sửa qua PR |
| Bộ nhận diện (logo, màu) | Làm khi có thiết kế |
| Đa đơn vị / đa ngôn ngữ | Hiện chỉ DYC và tiếng Việt |
| Giới hạn tốc độ chung nhiều worker | Token bucket trong DB, khi cần quá một worker |
| Theo dõi thư trả lại (bounce/NDR) | `sent` hiện chỉ có nghĩa nhà cung cấp đã nhận |
| Thay hàng đợi bằng Procrastinate hoặc RabbitMQ | Theo điều kiện ở §7 |
| Trình xem trước email trên giao diện | v1 chỉ có driver `console` và `GET /v1/templates` |

## 15. Rủi ro

| Rủi ro | Xử lý |
|---|---|
| IT HUST chưa cấp quyền gửi qua Microsoft Graph | Code và test với `console`/`smtp`; xin quyền song song; ghi đầu mối vào issue |
| Quyền `Mail.Send` rộng hơn cần thiết | Xin giới hạn theo một hộp thư chung (§10) |
| Hạn mức gửi của hộp thư/tenant thấp hơn nhu cầu | Giới hạn tốc độ cấu hình được; một worker; đo trước khi bật rộng |
| Gửi trùng một lần khi worker chết đúng lúc | Chấp nhận, đã ghi §7 |
| Thư tới người thật từ staging | Danh sách cho phép / chuyển hướng (§10) |
| Thông tin cá nhân nằm trong `data` | Không log, xoá nội dung sau 7 ngày (hoặc ngay khi xong với `sensitive`), chỉ client tạo mới xem được |
| Chèn header/liên kết lạ qua dữ liệu người gọi | Loại `\r\n`, `formataddr`, chỉ nhận đường dẫn tương đối (§5, §9) |
| Service mới đòi hỏi hạ tầng và người bảo trì | Họp team; dùng đúng khuôn `ctd-api`; một image, dùng lại Postgres |
| Key bị lộ | Chỉ lưu băm, thu hồi theo từng service, không mở ra internet |

## 16. Kiểm thử

- **Đơn vị:** render từng template với `data_example` (snapshot HTML và text), autoescape (`<script>`), loại `\r\n` trong subject/tên, tính backoff, phân loại lỗi, `payload_hash` chuẩn hoá (đảo thứ tự người nhận, hoa/thường email, biến thừa không đổi hash).
- **API:** `401` (thiếu/sai/thu hồi key), `400` (thiếu biến, template lạ hoặc ngoài quyền, quá giới hạn, render lỗi), `413`, `dedupe_key` đủ 3 trường hợp (`202`, `200`, `409`) kể cả **hai yêu cầu cùng key gửi đồng thời** chỉ tạo một bản ghi, `404` khi client khác xem/retry.
- **Worker** (driver giả): thành công, lỗi tạm thời rồi thành công, lỗi vĩnh viễn, `429` với `Retry-After`, vượt số lần thử, `attempts` tăng khi lấy (worker chết lặp lại không lặp vô hạn), phục hồi khoá hết hạn, `expired`, hai worker song song không gửi trùng, một người nhận lỗi không chặn người khác, trạng thái tổng (`partial`).
- **Hợp đồng:** test đọc `GET /v1/templates` rồi gọi thử từng template bằng `data_example`, bắt template và `meta.yaml` lệch nhau.
- Test chạy bằng `pytest` trong CI như `ctd-api`.

## 17. Liên hệ với Plan A (gỡ email cũ của Core)

`docs/specs/2026-10-02-go-email-cu-plan.md` gỡ module email cũ **và OneSignal** khỏi Core, và đưa mọi điểm gọi
`mailer.notify*` về **một facade duy nhất** `core/src/notifier.js` (hiện chưa gửi gì). Mỗi lời gọi truyền
`{ event, recipient, data, sourceKey }`; `event` trùng tên template (§9), `sourceKey` là chuỗi dùng làm `dedupe_key`
(§8). Khi Noti sẵn sàng, chỉ thân của facade đổi thành `POST /v1/notifications`; các điểm gọi nghiệp vụ không phải sửa lại.

## Lịch sử phiên bản

| Version | Ngày | Thay đổi | Người |
|---|---|---|---|
| 1.2 | 2026-10-02 | Hoàn tất triển khai service Noti (PLAN-NOTI-001), chuyển trạng thái sang active, cập nhật related_code | DYC |
| 1.1 | 2026-10-02 | Áp dụng rà soát độc lập: 409 thay 422, hash chuẩn hoá, `attempts` khi lấy, expiry/priority, 429, trạng thái tổng, bảo mật Graph/staging/đường dẫn/header, giảm lưu giữ dữ liệu, ops; hoãn khối diff; rút danh sách template theo điểm gọi thật; bỏ OneSignal | DYC |
| 1.0 | 2026-10-02 | Bản đầu, chốt qua brainstorming | DYC |


---
doc_id: DEV-MAIL-001
title: Thông báo của Core (email, push và nhắc hạn)
version: 5.1
status: active
audience: [dev, ai]
owner: DYC
updated: 2026-10-04
related_code: [core/src/notifier.js, core/src/noti-sender.js, core/src/services/deadline-notifications.js, core/src/routes/activities.js, core/src/routes/tasks.js, core/src/routes/notifications.js, core/src/config/database.js]
---

# Thông báo của Core

Tài liệu này mô tả hiện trạng thật của `staging` và chỗ cắm cho service **Noti**. Các mô tả cũ về Rule Engine, `email_rules`,
cron động và trang Setting email chỉ tồn tại ở nhánh `archive/gd1a-staging`, chưa từng có trên `staging`, nên đã bỏ.

## Trạng thái hiện tại

- Core **không có** module email (không Gmail/nodemailer, không endpoint gửi thử) và **không có** push OneSignal (đã gỡ, ADR-0013).
- Có ba thứ: thông báo **trong ứng dụng** (bảng `notifications`, chuông ở `core/public/notifications.js`, route `core/src/routes/notifications.js`), scheduler nhắc hạn
  (`core/src/services/deadline-notifications.js`, chạy mỗi 15 phút), và facade `core/src/notifier.js`.
- `notifier.notify({ event, recipient: { id, name, email }, data, sourceKey })` là điểm duy nhất phát thông báo ra ngoài ứng dụng. Lỗi hoặc dữ liệu
  thiếu (không có email, thiếu `sourceKey`) bị bỏ qua và ghi log, không bao giờ ném lỗi hay làm treo request (facade cắt sau 5 s).
- Service Noti (`services/noti-api/`, xem `docs/dev/noti.md` và `docs/specs/2026-10-02-noti-service-design.md`) đã có code
  và chạy ở **staging** (chưa có production; driver `console`).

## Sender Core → Noti

`core/src/noti-sender.js` là sender của facade. `core/src/app.js` chỉ gắn nó khi có **cả** `NOTI_URL` và `NOTI_API_KEY`;
thiếu một trong hai thì Core chạy như cũ và không gửi gì (log `no sender configured`). Staging: `NOTI_URL=http://noti-api:8000`,
key lấy từ `CORE_NOTI_API_KEY` trong `.env` của VM (`docs/ops/moi-truong.md` §4a). Production chưa cấu hình.

- Mỗi `notify` là một `POST {NOTI_URL}/v1/notifications` với `Authorization: Bearer <key>`, body
  `{ template: event, recipients: [{ email, name }], data, dedupe_key: sourceKey }`.
- `200`/`202` là thành công. `409 dedupe_key_conflict` cũng coi là đã gửi: scheduler gửi lại mỗi 15 phút, cùng `sourceKey` mà
  nội dung đổi (đổi tên task, dời hạn, đổi tên người nhận) nghĩa là thư đã đi với nội dung cũ.
- Mã khác (`400 validation_error`, `401`, `409 data_purged`, `413`, `5xx`) ghi log `Noti responded <status> <error>`; mạng lỗi ghi
  `Noti request failed: <tên lỗi>`; quá 5 s ghi `timeout`. Log không chứa key (lỗi của `fetch` bị bỏ message vì có thể chứa header).
- `toNotiPayload` sửa dữ liệu trước khi gửi: mã thô thành chữ (`activity.decided.action`: `approve`/`reject`/`request_changes`;
  `task.reviewed.decision`: `approve`/`reject`/`cancel`; `task.response.response.kind`), `Date` của mysql2 thành `YYYY-MM-DD`
  (thêm ` HH:mm` nếu có giờ), bỏ giá trị `null`/`undefined`/chuỗi rỗng, cắt `response.body` còn 4000 ký tự (Noti từ chối
  body > 64 KB). Mã lạ giữ nguyên.
- `core/tests/noti-sender.test.js` đọc `required` trong `services/noti-api/templates/<event>/meta.yaml`: thêm event hay đổi
  template mà thiếu trường thì test này đỏ.

## Điểm tích hợp (event → nơi gọi)

| `event` (template Noti) | Nơi gọi | `sourceKey` |
|---|---|---|
| `activity.proposed` | `routes/activities.js` (tạo hoạt động; nộp lại đề án) | `activity-proposed:<activityId>:<adminId>:<create\|proposalId>` |
| `activity.participant_added` | `routes/activities.js` (thêm người tham gia) | `activity-participant:<activityId>:<userId>` |
| `activity.decided` | `routes/activities.js` (duyệt / từ chối / yêu cầu sửa) | `activity-decided:<activityId>:<proposalId\|deleted>:<creatorId>` |
| `task.assigned` | `routes/activities.js` (giao việc) | `task-assigned:<taskId>:<userId>` |
| `task.response` | `routes/activities.js` (phản hồi) | `task-response:<updateId>:<userId>` |
| `task.review_requested` | `routes/activities.js` (log-task), `routes/tasks.js` (nộp nghiệm thu) | `task-review:<taskId>:<reviewerId>:<thời điểm request>` |
| `task.reviewed` | `routes/tasks.js` (nghiệm thu) | `task-reviewed:<taskId>:<userId>:<decision>:<thời điểm request>` |
| `task.deadline_soon` | scheduler | `task-deadline-<4h\|24h>:<taskId>:<userId>:<ngày>` |
| `task.overdue` | scheduler | `task-overdue:<taskId>:<userId>:<ngày>` |
| `task.unacknowledged` | scheduler | `task-unacknowledged:<taskId>:<memberId>` |

Scheduler gọi facade cho **mọi** mục tìm thấy, không chỉ khi chèn được dòng thông báo mới trong ứng dụng; phía nhận dedupe theo `sourceKey`.
Với `sourceKey` có "thời điểm request" thì khoá chỉ chống gọi lặp trong cùng một request (nghiệp vụ đã chặn nộp lặp bằng `409`).

## Khoảng trống đã biết

- Cột `notifications.email_status` và `push_status` còn trong schema nhưng luôn `NULL` (đổi schema là việc liên module).
- Push thẻ tên trong bình luận đã bỏ cùng OneSignal; chưa có template email tương ứng.
- Driver Noti trên staging là `console`: thư chỉ ra log `noti-worker`, chưa tới hộp thư thật.
- Scheduler bắn mọi `notify` cùng lúc, không chờ, và `task.overdue` gửi lại mỗi ngày cho mọi task quá hạn chưa xong. Trước khi
  bật mail thật cần quyết: giới hạn số request đồng thời và có nên nhắc quá hạn hằng ngày không.
- `ctd-api` có mailer riêng (`services/ctd-api/backend/app/infra/mailer.py`), nằm ngoài phạm vi tài liệu này.

## Biến `DEVOPS_EMAILS`

Ngoài ra, biến `DEVOPS_EMAILS` (trên VM là `CORE_DEVOPS_EMAILS`) là danh sách các email luôn được tự động đảm bảo có membership `dyc_admin` mỗi lần khởi động app và mỗi khi người dùng đăng nhập. Điều này giúp ngăn chặn việc bị khóa khỏi nền tảng.

## Lịch sử phiên bản

| Version | Ngày | Thay đổi | Người |
|---|---|---|---|
| 1.0 | 2026-09-24 | Bản đầu (viết lại từ tài liệu cũ khi gộp monorepo) | DYC |
| 2.0 | 2026-09-27 | Đồng bộ `main` = `staging`: nội dung theo bản `main` (chưa có code đa đơn vị GĐ1-A). Bản 1.2 trên `staging` mô tả GĐ1-A, lưu ở nhánh `archive/gd1a-staging` — NTMT làm lại ở PR sau | DYC |
| 2.1 | 2026-09-29 | Cập nhật quyền cấu hình SMTP/cron thành platformAdmin (membership DYC). Thêm chi tiết về DEVOPS_EMAILS bootstrap. | DYC |
| 3.0 | 2026-09-29 | Thêm section "Phân quyền và khoá cấu hình": platform-level vs unit-level settings, setting locks mechanism, catalog và middleware. | DYC |
| 4.0 | 2026-10-02 | Gỡ module email cũ và OneSignal; viết lại theo hiện trạng staging; thêm bảng điểm tích hợp cho Noti | DYC |
| 4.1 | 2026-10-02 | Noti service đã hoàn tất triển khai tại services/noti-api/ | DYC |
| 4.2 | 2026-10-02 | Sửa: Noti mới có code, chưa chạy trên VM | DYC |
| 4.3 | 2026-10-02 | Noti chạy ở staging | DYC |
| 5.0 | 2026-10-02 | Core gửi sang Noti qua `core/src/noti-sender.js` khi có `NOTI_URL` + `NOTI_API_KEY`; nhãn tiếng Việt và định dạng ngày | DYC |
| 5.1 | 2026-10-04 | Thêm core/src/config/database.js vào related_code - cấu hình timezone cho deadline notifications | DYC |

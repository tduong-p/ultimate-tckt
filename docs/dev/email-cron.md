---
doc_id: DEV-MAIL-001
title: Thông báo của Core (email, push và nhắc hạn)
version: 4.1
status: active
audience: [dev, ai]
owner: DYC
updated: 2026-10-02
related_code: [core/src/notifier.js, core/src/services/deadline-notifications.js, core/src/routes/activities.js, core/src/routes/tasks.js, core/src/routes/notifications.js]
---

# Thông báo của Core

Tài liệu này mô tả hiện trạng thật của `staging` và chỗ cắm cho service **Noti**. Các mô tả cũ về Rule Engine, `email_rules`,
cron động và trang Setting email chỉ tồn tại ở nhánh `archive/gd1a-staging`, chưa từng có trên `staging`, nên đã bỏ.

## Trạng thái hiện tại

- Core **không có** module email (không Gmail/nodemailer, không endpoint gửi thử) và **không có** push OneSignal (đã gỡ, ADR-0013).
- Có ba thứ: thông báo **trong ứng dụng** (bảng `notifications`, chuông ở `core/public/notifications.js`, route `core/src/routes/notifications.js`), scheduler nhắc hạn
  (`core/src/services/deadline-notifications.js`, chạy mỗi 15 phút), và facade `core/src/notifier.js`.
- `notifier.notify({ event, recipient: { id, name, email }, data, sourceKey })` là điểm duy nhất phát thông báo ra ngoài ứng dụng. Hiện **chưa có sender**
  nên không gửi gì; lỗi hoặc dữ liệu thiếu (không có email, thiếu `sourceKey`) bị bỏ qua và ghi log, không bao giờ ném lỗi hay làm treo request.
- Service Noti (`services/noti-api/`, xem `docs/dev/noti.md` và `docs/specs/2026-10-02-noti-service-design.md`) đã sẵn sàng;
  thân của facade sẽ đổi thành `POST /v1/notifications` khi được cấu hình hạ tầng; `event` là tên template, `sourceKey` là `dedupe_key`.

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
- Chưa có email nào từ Core cho tới khi Noti hoàn tất.
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


---
doc_id: DEV-MAIL-001
title: Thông báo của Core (email, push và nhắc hạn)
version: 7.0
status: active
audience: [dev, ai]
owner: DYC
updated: 2026-10-07
related_code: [core/src/notifier.js, core/src/noti-sender.js, core/src/services/deadline-notifications.js, core/src/services/reminder-rules.js, core/src/services/notification-recipients.js, core/src/email.js, core/src/routes/activities.js, core/src/routes/tasks.js, core/src/routes/notifications.js, core/src/config/database.js]
---

# Thông báo của Core

Tài liệu này mô tả hiện trạng thật của `staging` và chỗ cắm cho service **Noti**. Các mô tả cũ về Rule Engine, `email_rules`,
cron động và trang Setting email chỉ tồn tại ở nhánh `archive/gd1a-staging`, chưa từng có trên `staging`, nên đã bỏ.

## Trạng thái hiện tại

- Core **không có** module email (không Gmail/nodemailer, không endpoint gửi thử) và **không có** push OneSignal (đã gỡ, ADR-0013).
- Có ba thứ: thông báo **trong ứng dụng** (bảng `notifications`, chuông ở `core/public/notifications.js`, route `core/src/routes/notifications.js`), scheduler nhắc hạn
  (`core/src/services/deadline-notifications.js`, chạy mỗi 15 phút), và facade `core/src/notifier.js`.
- `notifier.notify({ event, recipient: { id, name, email }, data, sourceKey })` là điểm duy nhất phát thông báo ra ngoài ứng dụng. Lỗi hoặc dữ liệu
  thiếu (không có email, thiếu `sourceKey`) bị bỏ qua và ghi log, không bao giờ ném lỗi hay làm treo request (mỗi lần gửi cắt sau 5 s).
- Facade lọc trước khi gửi: (1) `event.actorId` trùng `recipient.id` thì bỏ (không tự thông báo cho người vừa thao tác);
  (2) email không gửi được (`core/src/email.js`: sai định dạng, tên miền không hợp lệ) thì bỏ và log chỉ tên miền;
  (3) lỗi tạm thời (sender đánh dấu `transient`, hoặc quá 5 s) được thử lại tối đa 3 lần, cách 1 s rồi 3 s; lỗi vĩnh viễn (`400`, `401`...) không thử lại.
  Kết quả trả về có `delivered`, hoặc `reason`, và `retryable: true` khi hết lượt thử mà lỗi vẫn là tạm thời.
- Việc tạo hoặc sửa email người dùng (`routes/users.js`) từ chối email không gửi được.
- Service Noti (`services/noti-api/`, xem `docs/dev/noti.md` và `docs/specs/2026-10-02-noti-service-design.md`) đã có code
  và chạy ở **staging**; compose production cũng đã có Noti (SPEC-MAIL-001), bật theo ba pha, mặc định driver `console`.

## Sender Core → Noti

`core/src/noti-sender.js` là sender của facade. `core/src/app.js` chỉ gắn nó khi có **cả** `NOTI_URL` và `NOTI_API_KEY`;
thiếu một trong hai thì Core chạy như cũ và không gửi gì (log `no sender configured`). Staging: `NOTI_URL=http://noti-api:8000`,
key lấy từ `CORE_NOTI_API_KEY` trong `.env` của VM (`docs/ops/moi-truong.md` §4a). Production: `NOTI_URL` cố định trong compose, `NOTI_API_KEY` lấy từ `CORE_NOTI_API_KEY`; để trống là công tắc tắt khẩn cấp (Core chạy, không gửi).

- Mỗi `notify` là một `POST {NOTI_URL}/v1/notifications` với `Authorization: Bearer <key>`, body
  `{ template: event, recipients: [{ email, name }], data, dedupe_key: sourceKey }`.
- `200`/`202` là thành công. `409 dedupe_key_conflict` cũng coi là đã gửi: scheduler gửi lại mỗi 15 phút, cùng `sourceKey` mà
  nội dung đổi (đổi tên task, dời hạn, đổi tên người nhận) nghĩa là thư đã đi với nội dung cũ.
- Mã khác (`400 validation_error`, `401`, `409 data_purged`, `413`, `5xx`) ghi log `Noti responded <status> <error>`; mạng lỗi ghi
  `Noti request failed: <tên lỗi>`; quá 5 s ghi `timeout`. Log không chứa key (lỗi của `fetch` bị bỏ message vì có thể chứa header).
- `toNotiPayload` sửa dữ liệu trước khi gửi: mã thô thành chữ (`activity.decided.action`: `approve`/`reject`/`request_changes`;
  `task.reviewed.decision`: `approve`/`reject`/`cancel`; `task.response.response.kind`), `Date` của mysql2 thành `YYYY-MM-DD`
  (thêm ` HH:mm` nếu có giờ), bỏ giá trị `null`/`undefined`/chuỗi rỗng, cắt `response.body`, `comment.body` và `feedback` còn 4000 ký tự (Noti từ chối
  body > 64 KB), gắn nhãn tiếng Việt cho loại và mức ưu tiên của đề án (`activity.type`, `activity.priority`). Mã lạ giữ nguyên.
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
| `comment.mentioned` | `routes/activities.js` (gắn thẻ trong bình luận hoạt động hoặc công việc) | `comment-mention:<updateId>:<userId>` |
| `task.review_requested` | `routes/activities.js` (log-task), `routes/tasks.js` (nộp nghiệm thu) | `task-review:<taskId>:<reviewerId>:<thời điểm request>` |
| `task.reviewed` | `routes/tasks.js` (nghiệm thu) | `task-reviewed:<taskId>:<userId>:<decision>:<thời điểm request>` |
| `task.deadline_soon` | scheduler | `task-deadline-<1d\|today>:<taskId>:<userId>:<ngày hạn>` |
| `task.overdue` | scheduler | `task-overdue:<taskId>:<userId>:<ngày VN hôm nay>` |
| `task.unacknowledged` | scheduler | `task-unacknowledged:<taskId>:<memberId>:<epoch giây của assigned_at>` |

Mọi route truyền `actorId` (người thao tác) để facade bỏ thông báo tự gửi cho chính họ. Người nhận của
`task.review_requested` lấy từ `findReviewRecipients` (`core/src/services/notification-recipients.js`); `activity.proposed` dùng truy vấn riêng (admin + vice_admin đang hoạt động) và mang
`type`, `deadline`, `priority` và đi tới admin + vice_admin; `activity.decided` khi hoạt động đã xoá thì không có `path`.

### Subject và thread

Mọi email của cùng một công việc có **cùng một subject** `[<tên hoạt động>] <tên công việc>`, mọi email chỉ về hoạt động có
subject `[<tên hoạt động>]`, để Gmail/Outlook gom thành một thread. Loại sự kiện (quá hạn, nghiệm thu…) và mã `TCKT-<id>` nằm
trong thân thư, không nằm trong subject. Vì vậy mọi event `task.*` **bắt buộc** có `activity.title` (thiếu thì Noti trả `400`).
`comment.mentioned` dùng subject của công việc khi bình luận gắn công việc, ngược lại dùng subject của hoạt động.

### Người nhận

| `event` | Người nhận |
|---|---|
| `activity.proposed` | admin + vice_admin đang hoạt động |
| `activity.decided` | người tạo hoạt động |
| `activity.participant_added` | người được thêm (trừ người đã `confirmed` từ trước); route chỉ cho thêm user đang hoạt động |
| `task.assigned` | mọi người được giao **đang hoạt động** (cả thông báo trong ứng dụng) |
| `task.review_requested` | `findReviewRecipients`: tổ trưởng/tổ phó + trưởng BTC, không còn ai thì admin |
| `task.reviewed` | mọi người được giao đang hoạt động |
| `task.response` | người giao việc + người được giao, trừ người đăng và trừ người đã nhận `comment.mentioned` cho cùng bình luận |
| `comment.mentioned` | người được gắn thẻ (route đã kiểm tra đang hoạt động và xem được hoạt động; không tự gắn thẻ mình) |
| `task.deadline_soon`, `task.overdue` | từng người được giao đang hoạt động của task chưa xong |
| `task.unacknowledged` | người giao việc, mỗi thành viên chưa xác nhận một thư |

Ngoài các luật trên, facade bỏ người nhận trùng `actorId` (xem đầu tài liệu).

### Scheduler nhắc hạn (`deadline-notifications.js` + `reminder-rules.js`)

- `tasks.deadline` là cột `DATE`: nhắc theo **ngày lịch giờ VN**, không theo giờ. Mốc "1 ngày" (hạn là ngày mai) và "hôm nay";
  nhãn trong thư là `1 ngày` / `hôm nay`. Task `review`, `done`, `cancelled` bị loại. `task.overdue` gửi mỗi ngày cho task quá hạn chưa xong.
  `task.unacknowledged` chỉ gửi khi giao đã từ 24 giờ trở lên và dưới 168 giờ (7 ngày).
- Chỉ gửi trong khung 07:00–21:59 giờ VN; ngoài khung thì lượt chạy chỉ dọn dòng thông báo đã hết hạn, không tạo dòng trong ứng dụng và không gửi; lượt 15 phút sau xử lý tiếp. Kiểm tra giờ chỉ làm một lần ở đầu lượt, nên lượt chạy bắt đầu trước 22:00 có thể gửi xong sau mốc đó. Lượt chạy dừng gửi sau lần lỗi tạm thời (`retryable`) đầu tiên; các mục còn lại giữ `pending` cho lượt sau.
- Gửi **tuần tự** (`await` từng mục), không bắn đồng thời.
- Dòng `notifications` mới có `email_status = 'pending'`. Scheduler chỉ gọi `notifier.notify` khi dòng còn `pending`, rồi ghi kết quả
  bằng `emailStatusFor`: `success` (đã gửi), `pending` (lỗi tạm thời, lượt sau gửi lại), `failed` (lỗi vĩnh viễn hoặc bị lọc), `NULL` (không có sender).
  Dòng đã `success`/`failed` không gửi lại. Phía nhận vẫn dedupe theo `sourceKey`.
Với `sourceKey` có "thời điểm request" thì khoá chỉ chống gọi lặp trong cùng một request (nghiệp vụ đã chặn nộp lặp bằng `409`).

## Khoảng trống đã biết

- `notifications.email_status` nay do scheduler dùng làm trạng thái gửi (xem trên); các thông báo do route tạo không ghi cột này.
  Dòng `pending` mồ côi (người nhận hết hiệu lực, task đã đóng) không có gì tự dọn. `push_status` còn trong schema nhưng luôn `NULL`.
- Driver Noti trên staging là `console`: thư chỉ ra log `noti-worker`, chưa tới hộp thư thật.
- `task.overdue` vẫn gửi lại mỗi ngày cho mọi task quá hạn chưa xong. Trước khi bật mail thật cần quyết có nên nhắc quá hạn hằng ngày không.
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
| 6.0 | 2026-10-05 | #49: khoá `sourceKey` mới (`task-deadline-1d\|today`, `unacknowledged` có epoch); scheduler nhắc theo ngày lịch, khung 07:00–21:59, gửi tuần tự, dùng `email_status`; notifier lọc tự gửi/email lỗi và thử lại; nêu `actorId`, người nhận review | DYC |
| 6.1 | 2026-10-05 | Sửa mô tả khung giờ (ngoài khung không tạo gì), người nhận `activity.proposed`, hai nhãn `activity.type`/`activity.priority`; thêm kiểm tra giờ một lần mỗi lượt và dừng gửi sau lỗi tạm thời | DYC |
| 6.2 | 2026-10-05 | Production có Noti trong compose; `CORE_NOTI_API_KEY` trống = tắt gửi (SPEC-MAIL-001) | DYC |
| 7.0 | 2026-10-07 | Subject gom thread `[hoạt động] công việc`, `activity.title` bắt buộc cho `task.*`; thêm `comment.mentioned`; bảng người nhận; `task.assigned` bỏ user không hoạt động | DYC |

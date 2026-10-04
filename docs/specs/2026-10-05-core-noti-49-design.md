---
doc_id: SPEC-NOTI-002
title: Thiết kế — sửa phần Core của #49 (thông báo Core → Noti gửi sai giờ, trùng, sai người, mất thư)
version: 1.0
status: active
audience: [dev, ai]
owner: TCKT
updated: 2026-10-05
related_code: [core/src/services/deadline-notifications.js, core/src/notifier.js, core/src/noti-sender.js, core/src/routes/activities.js, core/src/routes/tasks.js, core/src/routes/users.js]
---

# Thiết kế — sửa phần Core của #49

## 1. Bối cảnh

Issue #49 liệt kê 9 lỗi phía Core ở chỗ nối Core → Noti (thư nhắc hạn sai giờ và trùng, người thực hiện tự nhận thư,
bỏ sót người nghiệm thu, email sai làm mất thư, không retry…). Quyết định ngày 2026-10-03 trong #49 cho phép sửa
(R12, múi giờ VN, lọc trạng thái, retry có giới hạn) và yêu cầu không tuyên bố #49 xong khi mới sửa một phần.
PR #65 chỉ đổi cách lấy "hôm nay" (múi giờ), chưa sửa các mục 1–9. Đây là cổng M1 của #63 (bật email thật).

## 2. Phạm vi

- Trong phạm vi: code Core (`core/src/**`, `core/tests/**`) và tài liệu liên quan. Mục 1–9 phần Core của #49.
- Ngoài phạm vi: phần bên trong Noti (cổng M2 của #63), schema DB, template Noti, thông báo **trong app** cho chính
  người thực hiện (mục 3 chỉ nói về thư), lọc admin theo đơn vị (xem §9).
- Liên module: đã có quyết định trong #49. PR cần reviewer DYC (Noti) và TCKT (Điều hành).

## 3. Scheduler nhắc hạn (`core/src/services/deadline-notifications.js`) — mục 1, 2, 4, 8a

- **Khung giờ gửi**: scheduler chỉ tạo thông báo khi giờ VN trong khoảng 07:00–21:59. Ngoài khung, lần chạy không làm gì
  (trừ dọn thông báo hết hạn). Áp dụng cho nhắc hạn, trễ hạn và chưa xác nhận.
- **Nhắc hạn theo ngày lịch**. `deadline` là cột `DATE`, coi là cả ngày D theo giờ VN. Tính trong Node từ `dateInVietnam(now)`:
  - D = ngày mai → `window` = `"1 ngày"`, `sourceKey` = `task-deadline-1d:<task>:<user>:<D>`.
  - D = hôm nay → `window` = `"hôm nay"`, `sourceKey` = `task-deadline-today:<task>:<user>:<D>`.
  - Key gắn với giá trị hạn D, không gắn với ngày chạy → mỗi thư một lần; dời hạn thì key mới và nhắc theo hạn mới.
  - Không còn `TIMESTAMPDIFF`/`Math.round`; truy vấn so `deadline IN (?, ?)` với hai chuỗi ngày VN.
- **Trạng thái**: cả ba truy vấn loại `review`, `done`, `cancelled`.
- **Chưa xác nhận**: member và lead `is_active = 1`; `t.assigned_by <> ta.user_id`; chỉ khi `assigned_at` cách `now`
  từ 24 giờ đến dưới 7 ngày (168 giờ). `sourceKey` = `task-unacknowledged:<task>:<member>:<epoch giây của assigned_at>`.
- **Trễ hạn**: giữ mỗi ngày một thư, key `task-overdue:<task>:<user>:<ngày VN>`.
- **R12 (idempotency)**: chỉ gọi `notifier.notify` khi `INSERT IGNORE` vào `notifications` chèn được dòng mới. Dòng
  trong app là dấu "đã gửi"; các lần chạy 15 phút sau không gọi lại.
- Nội dung trong app: "…sẽ đến hạn vào ngày mai (DD/MM)." và "…đến hạn hôm nay."

## 4. Notifier facade (`core/src/notifier.js`) — mục 3, 6, 7

- **Lọc người thực hiện**: event có thêm `actorId` (tuỳ chọn). `recipient.id === actorId` → bỏ, trả
  `{ delivered: false, reason: 'self' }`.
- **Email**: helper mới `core/src/email.js` — `isDeliverableEmail(email)`: cú pháp `local@domain.tld`, không khoảng
  trắng, và tên miền không kết thúc bằng tên dành riêng `.local`, `.localhost`, `.test`, `.invalid`, `.example`.
  Sai → bỏ, ghi `warn`, trả `reason: 'invalid-email'`. Không in địa chỉ đầy đủ vào log (chỉ tên miền).
- **Retry có giới hạn**: tối đa 3 lần thử; nghỉ 1 s rồi 3 s (cấu hình được để test). Chỉ thử lại khi lỗi có
  `transient === true` hoặc là timeout của facade. Mỗi lần thử có timeout riêng. Các route vẫn gọi không `await`,
  nên retry không làm chậm response. `sourceKey` ổn định → Noti dedupe, gửi lại an toàn.

## 5. Sender (`core/src/noti-sender.js`)

- Gắn `error.transient = true` cho lỗi mạng/abort, HTTP 5xx và 429. 4xx khác không gắn.
- Cắt `data.feedback` (chuỗi) về 4000 ký tự như `response.body` (mục 8c).
- Thêm nhãn cho `activity.proposed` (theo nhãn giao diện `core/public/app.js`): `activity.priority`
  `low/medium/high/urgent` → Thấp/Trung bình/Cao/Khẩn cấp; `activity.type` `event/assigned` → Tổ đề xuất/Lãnh đạo giao.
  Giá trị lạ giữ nguyên.

## 6. Các route — mục 3, 5, 8b, 9

- Mọi `notifier.notify` trong `routes/**` truyền `actorId: req.actor.id`.
- `activity.decided`: người nhận phải `is_active = 1`. Khi đề án bị từ chối/huỷ (hoạt động bị xoá cứng) thì không gửi
  `activity.path` (trường tuỳ chọn của template).
- `task.review_requested` (helper dùng chung cho `POST /api/tasks/:id/submit-review` và `POST /api/activities/:id/log-task`):
  người nhận = lead/vice-lead đang hoạt động của tổ ∪ event_lead đang hoạt động của hoạt động. Nếu sau khi bỏ người thực
  hiện mà rỗng → admin và vice_admin đang hoạt động. Thông báo trong app của `log-task` dùng cùng danh sách.
- `activity.proposed`: gửi thêm `activity.type`, `activity.deadline`, `activity.priority`. Lúc tạo và lúc nộp lại đều
  báo `admin` và `vice_admin` đang hoạt động.

## 7. Users (`core/src/routes/users.js`) — mục 6

- `POST /api/users` và `PATCH /api/users/:id`: email không qua `isDeliverableEmail` → 400 `Email không hợp lệ.`
  Import hàng loạt dùng cùng helper (dòng sai bị bỏ qua như hiện nay).

## 8. Kiểm thử

- `services.deadline-notifications.test.js`: giờ giả lập VN 00:30, 02:30, 06:59, 07:00, 21:59, 22:00; hạn ngày mai,
  hạn hôm nay, dời hạn, task `review`, chạy hai lần không gọi `notify` lần hai, lead tự giao cho mình, lead/member bị khoá,
  chưa xác nhận quá 7 ngày.
- `notifier.test.js`: lọc `self`, lọc email sai, retry với lỗi `transient`, không retry với lỗi thường, hết lượt thử.
- `noti-sender.test.js`: cờ `transient` theo mã HTTP/lỗi mạng, cắt `feedback`, nhãn `priority`.
- Test route: người nhận nghiệm thu (event_lead, fallback admin, bỏ người nộp), `activity.decided` không có path khi
  từ chối, `activity.proposed` có type/deadline/priority, users từ chối email sai.

## 9. Rủi ro và việc để sau

- Đổi `sourceKey` nhắc hạn/chưa xác nhận: trong ngày triển khai có thể nhắc lại tối đa một lần (đã chấp nhận ở #49;
  production chưa bật mail thật).
- Scheduler ngừng chạy cả ngày D-1 trong khung giờ → thư "1 ngày" bị bỏ, chỉ còn thư "hôm nay". Chấp nhận.
- Để sau (không làm ở đây): truy vấn admin chưa lọc theo đơn vị (đa đơn vị có thể gửi chéo); outbox bền trong MySQL;
  phần Noti của #49.
- Rollback: revert PR. Không đổi schema.

## Lịch sử phiên bản

| Version | Ngày | Thay đổi |
|---|---|---|
| 1.0 | 2026-10-05 | Bản đầu. |

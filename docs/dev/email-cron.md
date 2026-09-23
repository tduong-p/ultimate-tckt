---
doc_id: DEV-MAIL-001
title: Email và Cron
version: 1.0
status: active
audience: [dev, ai]
owner: DYC
updated: 2026-09-24
related_code: [core/src/services/email-*.js, core/src/services/cron-runner.js, core/src/routes/settings-*.js]
---

# Email và Cron

Tài liệu này giúp dev thêm một loại thông báo email mới hoặc một cron job mới ở Core mà không phải đọc lại toàn
bộ thiết kế gốc.

## Kiến trúc: event bus → rule engine → gửi

Mọi nơi trong code cần gửi email chỉ gọi một chỗ duy nhất:

```js
emailEvents.emit(eventKey, payload);
```

`core/src/services/email-events.js` giữ registry sự kiện (`registerEmailEvent(key, { fields, samplePayload })`)
— khai sự kiện nào tồn tại, payload có field gì, dùng để dashboard gợi ý biến khi soạn template
(`{{activity.title}}`…). Khi `emit` được gọi, hệ thống tra các `email_rules` khớp `event_key`, đánh giá điều kiện
bằng `core/src/services/email-condition-evaluator.js` (cây điều kiện AND/OR thuần), rồi với rule khớp: dựng nội
dung từ `email_templates` (thay biến theo path phẳng/lồng từ payload), xác định người nhận, gửi qua SMTP đã cấu
hình trong `email_settings` (mã hoá bằng `SETTINGS_ENCRYPTION_KEY`, xem `core/src/config/settings-crypto.js`),
và ghi log vào bảng deliveries.

**Toàn bộ 10 thông báo hardcode cũ (`notifyTaskAssigned`, `notifyActivityOverdue`…) đã được migrate sang Rule
Engine này** (xem lịch sử: `feat(email): migrate all legacy mailer notifications to the Rule Engine`) — không
còn code gửi email trực tiếp qua `src/mailer.js` kiểu cũ; thêm thông báo mới nghĩa là đăng ký một sự kiện mới +
tạo rule/template qua UI hoặc seed, không phải viết hàm `notifyXxx` mới.

Thêm một sự kiện email mới:
1. `registerEmailEvent('module.ten_su_kien', { fields: [...], samplePayload: {...} })` trong file service tương ứng.
2. Gọi `emailEvents.emit('module.ten_su_kien', payload)` đúng chỗ nghiệp vụ xảy ra.
3. Tạo rule + template qua trang Setting → Email (cần quyền `devops`), hoặc qua seed nếu cần có sẵn.
4. Test: `emailEvents.emit` trong test phải đợi xong hoặc bị mock — xem bẫy "Pool is closed" ở `docs/ai/bay-da-gap.md`.

## Cron Runner (`core/src/services/cron-runner.js`)

Job runner tổng quát dựa trên `node-cron`, không chỉ dành cho email. `registerCronHandler(key, fn)` khai một
loại việc lặp lại (ví dụ nhắc hạn chót); job thật (lịch chạy, bật/tắt, job nào dùng handler nào) là dữ liệu trong
bảng `cron_jobs`, quản lý qua `core/src/routes/settings-cron.js` (yêu cầu quyền `devops`): tạo/sửa/xoá job, bật/
tắt, chạy thử ngay (`run-now`), xem lịch sử chạy (`cron_job_runs`). Runner khởi động/dừng theo vòng đời HTTP
server (`core/src/runtime.js`).

Thêm một loại job mới: `registerCronHandler('module.ten_job', async (context) => {...})`, sau đó tạo bản ghi
`cron_jobs` trỏ tới `handler_key` này qua UI/API — không hardcode lịch chạy trong code.

## Trạng thái email hiện tại trên staging/production

`EMAIL_NOTIFICATIONS_ENABLED=false` ở cả hai môi trường compose hiện tại (`infra/compose/docker-compose.*.yml`)
— **email không thực sự được gửi ra ngoài** dù rule/template đã cấu hình đúng. Kiểm biến này trước khi kết luận
"bug không gửi mail". Bật lại cần đổi biến này trong `.env` trên VM (qua `apply-infra.sh`, không sửa tay trên
container) và đảm bảo `SETTINGS_ENCRYPTION_KEY` đã có (thiếu biến này thì trang Setting → SMTP lưu cấu hình sẽ
lỗi).

## Lịch sử phiên bản

| Version | Ngày | Thay đổi | Người |
|---|---|---|---|
| 1.0 | 2026-09-24 | Bản đầu (viết lại từ tài liệu cũ khi gộp monorepo) | DYC |

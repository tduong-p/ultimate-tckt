---
doc_id: DEV-MAIL-001
title: Email và Cron
version: 1.1
status: active
audience: [dev, ai]
owner: DYC
updated: 2026-09-24
related_code: [core/src/services/email-*.js, core/src/services/cron-runner.js, core/src/routes/settings-*.js, core/src/middleware/auth.js, core/src/units/memberships.js]
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
3. Tạo rule + template qua trang Setting → Email (cần membership DYC — `platformAdmin`, xem dưới), hoặc qua seed nếu cần có sẵn.
4. Test: `emailEvents.emit` trong test phải đợi xong hoặc bị mock — xem bẫy "Pool is closed" ở `docs/ai/bay-da-gap.md`.

## Cron Runner (`core/src/services/cron-runner.js`)

Job runner tổng quát dựa trên `node-cron`, không chỉ dành cho email. `registerCronHandler(key, fn)` khai một
loại việc lặp lại (ví dụ nhắc hạn chót); job thật (lịch chạy, bật/tắt, job nào dùng handler nào) là dữ liệu trong
bảng `cron_jobs`, quản lý qua `core/src/routes/settings-cron.js` (yêu cầu `platformAdmin`, xem dưới): tạo/sửa/xoá
job, bật/tắt, chạy thử ngay (`run-now`), xem lịch sử chạy (`cron_job_runs`). Runner khởi động/dừng theo vòng đời
HTTP server (`core/src/runtime.js`).

## Quyền cấu hình SMTP/Cron: membership DYC, không còn cờ `devops`

Quyền ghi/đọc cấu hình nền tảng (`email_settings`, `email_templates`, `email_rules`, `cron_jobs`) không còn kiểm
tra `users.is_devops` hay `isExecutive`. Middleware `platformAdmin` (`core/src/middleware/auth.js`) chỉ kiểm tra
`req.memberships` có một membership đơn vị `platform_owner` (DYC, bất kể role `dyc_admin`/`dyc_engineer`, bất kể
`current_unit_id` đang chọn) — nếu không có, trả 403 `{ error: 'Chỉ DYC được thao tác cấu hình nền tảng.' }`.
Trang Delivery Log (chỉ đọc) vẫn dùng `admin` như cũ, không đổi.

Biến môi trường `DEVOPS_EMAILS` (trên VM là `CORE_DEVOPS_EMAILS`, xem `infra/`) là danh sách email (phân tách
bởi dấu phẩy, so khớp không phân biệt hoa/thường) luôn được đảm bảo có membership `dyc_admin` — chống khoá
ngoài: `ensureDycAdmins(db, devopsEmailAllowlist())` chạy một lần lúc khởi động server (`core/src/runtime.js`,
ngay sau auto-migrate) cho các tài khoản đã tồn tại, và chạy lại cho từng email trong danh sách ngay khi tài
khoản đó đăng nhập lần đầu (`POST /api/login` và `GET /auth/microsoft/callback` trong `core/src/routes/system.js`)
— nhờ vậy một email được thêm vào allowlist sau khi server đã chạy vẫn được cấp `dyc_admin` ngay lần đăng nhập
đầu tiên, không phải chờ khởi động lại. Cột `users.is_devops` vẫn còn trong DB (dùng để migrate một lần sang
`unit_memberships` lúc nâng cấp — `core/src/config/migrate-units.js`) nhưng không còn được đọc để cấp quyền.

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
| 1.1 | 2026-09-24 | Thêm mục "Quyền cấu hình SMTP/Cron": `platformAdmin` (membership DYC) thay cờ `is_devops`/`isExecutive`; `DEVOPS_EMAILS`/`ensureDycAdmins` bootstrap lúc khởi động và lúc đăng nhập | DYC |

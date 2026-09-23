---
doc_id: ADR-0004-001
title: Email Rule Engine + Cron runner tổng quát + quyền devops
version: 1.0
status: active
audience: [dev, ai]
owner: DYC
updated: 2026-09-24
related_code: [core/src/services/email-*.js, core/src/services/cron-runner.js, core/src/routes/settings-*.js]
---

# Email Rule Engine + Cron runner tổng quát + quyền devops

Ghi lại quyết định thay hệ thống email hardcode bằng hạ tầng cấu hình được, và
tách quyền vận hành kỹ thuật (devops) khỏi phân cấp nghiệp vụ.

## Bối cảnh

Trước đây 10 hàm `notifyXxx` trong `mailer.js` được gọi cứng từ route nghiệp
vụ, SMTP hardcode chỉ hỗ trợ Gmail (đang không hoạt động vì thiếu biến môi
trường), và job nền chạy `setInterval` 15 phút cố định, không cấu hình được.
5 vai trò nghiệp vụ hiện có không phù hợp để quyết định ai được sửa SMTP/cron.

## Quyết định

Xây "Email module" (cấu hình SMTP, template, ma trận điều kiện gửi) và "Cron
module" (job runner tổng quát theo lịch cấu hình được), giao tiếp phần còn lại
hệ thống qua event bus nội bộ (`emailEvents.emit(eventKey, payload)`) — nơi gọi
không cần biết template/điều kiện gửi. Thêm cột `users.is_devops` và middleware
`devops = isExecutive(user) && user.is_devops`, cộng biến môi trường
`DEVOPS_EMAILS` để bootstrap an toàn (tránh tự khoá quyền của chính mình).
Delivery Log chỉ đọc cho `admin`/`vice_admin` thường; các trang cấu hình khác
yêu cầu `devops`.

## Hệ quả

- Route nghiệp vụ mới muốn gửi email chỉ cần emit event, không gọi hàm mailer
  trực tiếp.
- 10 hàm `notifyXxx` hardcode ban đầu nằm ngoài phạm vi spec này, được migrate
  dần; toàn bộ đã hoàn tất di dời sang Rule Engine (commit `7d04f11`).
- Mọi thay đổi ma trận điều kiện/template đi qua UI, không cần sửa code hay
  redeploy.

## Lịch sử phiên bản

| Version | Ngày | Thay đổi | Người |
|---|---|---|---|
| 1.0 | 2026-09-24 | Bản đầu, nguồn: `legacy/hub/docs/superpowers/specs/2026-09-21-email-cron-module-design.md` (repo cũ `tckt-activity-hub`) | DYC |

---
doc_id: ADR-0013-001
title: Gỡ module email cũ và OneSignal khỏi Core
version: 1.0
status: active
audience: [dev, ai]
owner: DYC
updated: 2026-10-02
related_code: [core/src/notifier.js, core/src/services/deadline-notifications.js, docs/specs/2026-10-02-noti-service-design.md]
---

# Gỡ module email cũ và OneSignal khỏi Core

## Bối cảnh

`core/src/mailer.js` gửi email qua Gmail (nodemailer) và gộp luôn push OneSignal trong cùng các hàm `notify*`. Cả hai đều tắt trên VM
(`EMAIL_NOTIFICATIONS_ENABLED=false`, không có `GMAIL_*` và `ONESIGNAL_*` trong compose). Tài liệu cũ (`email-cron.md` v3.0, ADR-0004) mô tả một
Rule Engine chỉ tồn tại ở nhánh `archive/gd1a-staging`, lệch với code.

## Quyết định

Người dùng chốt ngày 2026-10-02: gỡ hẳn module email cũ và OneSignal khỏi Core. Mọi điểm phát thông báo ra ngoài ứng dụng đi qua một facade
`core/src/notifier.js` (chưa gửi gì). Email, và push về sau, do service **Noti** riêng đảm nhận (SPEC-NOTI-001). Thông báo trong ứng dụng không đổi.

## Hệ quả

- Không có email hay push nào từ Core cho tới khi Noti xong; trên VM trước đó cũng đang tắt.
- Cột `email_status`/`push_status` giữ nguyên trong schema, luôn `NULL`.
- Khi làm Noti sẽ có ADR riêng với `supersedes: 0004`; ADR này không supersede ADR-0004.
- Thông báo cho team: issue liên module số 41.

## Lịch sử phiên bản

| Version | Ngày | Thay đổi | Người |
|---|---|---|---|
| 1.0 | 2026-10-02 | Bản đầu | DYC |

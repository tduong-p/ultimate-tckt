---
doc_id: PLAN-NOTI-002
title: Kế hoạch — Core gửi thông báo sang Noti (sender HTTP)
version: 1.2
status: active
audience: [dev, ai]
owner: DYC
updated: 2026-10-10
related_code: [core/src/noti-sender.js, core/src/app.js, core/tests/noti-sender.test.js, core/src/config/database.js]
---

# Core → Noti sender Implementation Plan

> Hợp đồng pipeline Express hiện được mô tả ở DEV-ARCH-001; sau cutover, frontend Core mới ở `/` và UI legacy ở `/legacy/`. Thay đổi định tuyến frontend không đổi hợp đồng gửi Noti trong plan này.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** facade `core/src/notifier.js` thật sự gửi thông báo sang Noti (`POST /v1/notifications`) trên staging.

**Architecture:** file mới `core/src/noti-sender.js` gồm `toNotiPayload(event)` (đổi dữ liệu Core sang dạng template Noti cần)
và `createNotiSender({ url, apiKey })` (gọi HTTP). `app.js` gắn sender khi có đủ `NOTI_URL` + `NOTI_API_KEY`; thiếu thì giữ hành vi cũ
(không gửi). Không đổi chỗ gọi `notifier.notify` và không đổi facade.

**Tech Stack:** Node 22 (`fetch`, `AbortSignal.timeout`), `node:test`, Docker Compose.

**Spec:** `docs/specs/2026-10-02-noti-service-design.md` (SPEC-NOTI-001), `docs/dev/email-cron.md`.

## Global Constraints

- Thông báo không bao giờ làm lỗi hay treo request: 202/200 là thành công; 4xx/5xx/timeout chỉ ghi log (facade đã bắt lỗi và cắt 5 s).
- Thiếu `NOTI_URL` hoặc `NOTI_API_KEY` → không gắn sender.
- API key chỉ nằm trong `.env` trên VM (`CORE_NOTI_API_KEY`), không vào repo, log, tài liệu hay chat. Log lỗi không in header.
- Ngoài phạm vi: mail thật (Graph/SMTP), production, mailer của ctd-api.

## Review Focus

- Mã thô (`approve`, `reject`, `request_changes`, `cancel`, kind phản hồi) phải ra chữ tiếng Việt trong thư, không hiện mã.
- Hạn chót là `Date` của mysql2 (cột `DATE`) → in `YYYY-MM-DD`, không in chuỗi ISO có múi giờ.
- `null`/`undefined` ở trường tuỳ chọn (feedback rỗng, activity.title thiếu) không làm Noti trả 400.
- Noti trả 409 `dedupe_key_conflict` (scheduler gửi lại, nội dung đã đổi) → coi là đã gửi; 401/409 `data_purged`/413 → log có mã lỗi, không có API key.
- Payload của mọi event có đủ trường `required` trong `services/noti-api/templates/<event>/meta.yaml`.

## Task 1: `noti-sender.js` (TDD)

**Files:** Create `core/src/noti-sender.js`, `core/tests/noti-sender.test.js`.

- [ ] Test `toNotiPayload`: mỗi event trong bảng ở `docs/dev/email-cron.md`, với dữ liệu giống chỗ gọi thật, cho ra
  `{ template, recipients: [{ email, name }], data, dedupe_key }` và `data` có đủ trường `required` đọc trực tiếp từ `meta.yaml`.
- [ ] Test nhãn: `activity.decided.action`, `task.reviewed.decision`, `task.response.response.kind` → tiếng Việt; mã lạ giữ nguyên.
- [ ] Test ngày: `Date` → `YYYY-MM-DD` (thêm ` HH:mm` nếu có giờ); `null`/`undefined`/chuỗi rỗng bị bỏ khỏi `data`.
- [ ] Test `createNotiSender`: gửi đúng URL, `Authorization: Bearer`, body JSON; 202/200 → resolve; 4xx/5xx → reject với lỗi chứa
  status và `error` của Noti, không chứa key; `fetch` bị huỷ sau `timeoutMs`.
- [ ] Test `notiSenderFromEnv`: thiếu một trong hai biến → `null`.
- [ ] Code cho test xanh. Commit.

## Task 2: gắn vào app + cấu hình staging

**Files:** Modify `core/src/app.js`, `infra/compose/docker-compose.staging.yml`, `infra/.env.example`.

- [ ] `createNotifier({ logger, sender: options.notiSender !== undefined ? options.notiSender : notiSenderFromEnv(process.env) })`.
- [ ] Compose staging, service `core`: `NOTI_URL: http://noti-api:8000`, `NOTI_API_KEY: ${CORE_NOTI_API_KEY:-}`.
- [ ] `.env.example`: thêm `CORE_NOTI_API_KEY=` (bootstrap coi là tuỳ chọn). Chạy `npm run test:tools`. Commit.

## Task 3: tài liệu

- [ ] `docs/dev/email-cron.md` (sender, nhãn, ngày), `docs/dev/noti.md`, `docs/ops/moi-truong.md` §4a (tạo key, đặt vào `.env`, apply-infra).
- [ ] Bẫy mới vào `docs/ai/bay-da-gap.md`: lần deploy đầu đổi cả script và compose → job infra chạy script cũ, rerun.
- [ ] Commit, rồi `npm run docs:index && npm run docs:check -- --base origin/staging`.

## Task 4: kiểm tra trên staging (sau merge)

- [ ] Người dùng tạo key: `docker exec ultimate-tckt-staging-noti-api-1 python -m noti.cli create-client core`, đặt vào `.env` staging
  thành `CORE_NOTI_API_KEY`, chạy lại apply-infra (hoặc `up -d core`).
- [ ] Làm thao tác thật (giao việc, nghiệm thu) → `docker logs ultimate-tckt-staging-noti-worker-1` thấy thư console, link đúng
  `https://tckt-hub-staging.duckdns.org/#activity/<id>`, gửi lại cùng `sourceKey` không ra thư thứ hai.

## Lịch sử phiên bản

| Version | Ngày | Thay đổi |
|---|---|---|
| 1.0 | 2026-10-02 | Bản đầu. |
| 1.1 | 2026-10-04 | Thêm core/src/config/database.js vào related_code - cấu hình timezone | DYC |
| 1.2 | 2026-10-10 | Liên kết đến kiến trúc Express hiện tại sau cutover frontend | DYC |

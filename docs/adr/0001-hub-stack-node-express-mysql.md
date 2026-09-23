---
doc_id: ADR-0001-001
title: Stack Hub — Node 22/Express 5 + MySQL 8, frontend vanilla
version: 1.0
status: active
audience: [dev, ai]
owner: DYC
updated: 2026-09-24
related_code: [core/**]
---

# Stack Hub — Node 22/Express 5 + MySQL 8, frontend vanilla

Ghi lại lựa chọn stack kỹ thuật cho TCKT Activity Hub (nay là `core/`) từ đợt
Phase 1, và lý do giữ nguyên stack đó thay vì viết lại.

## Bối cảnh

Repo `deployment-package` (tiền thân của `core/`) đã có sẵn một ứng dụng SEEE
Activity Hub chạy Express + `mysql2` thuần (không ORM), một router-factory mỗi
tài nguyên dưới `src/routes/`, một `context` dùng chung xuyên suốt route, và
`db.sql` là nguồn schema duy nhất (không có công cụ migration). Frontend là
vanilla JS hash-router trong `public/app.js`, không dùng framework.

## Quyết định

Phase 1 (TCKT Activity Hub) là biến đổi tại chỗ trên codebase này, không viết
lại: giữ nguyên Express 5 + `mysql2/promise`, router-factory pattern, `db.sql`
làm nguồn schema, và frontend vanilla JS. Bổ sung `node:test` +
`node:assert/strict` làm test runner (mới với repo này), chạy trên MySQL thật
disposable qua `TEST_DB_*`. Node engine giữ `>=22 <23`.

## Hệ quả

- Mọi route mới phải theo đúng router-factory (`createXRoutes(context)`),
  không thêm ORM hay ORM song song.
- Không có migration tool: thay đổi schema sửa `db.sql` (fresh install), lịch
  sử migrate thật xem ADR-0012 (docs)/DEV-DB-001.
- Test bắt buộc chạy với MySQL thật, không mock DB.

## Lịch sử phiên bản

| Version | Ngày | Thay đổi | Người |
|---|---|---|---|
| 1.0 | 2026-09-24 | Bản đầu, nguồn: `legacy/hub/docs/superpowers/plans/2026-09-16-tckt-activity-hub-phase1.md` (repo cũ `tckt-activity-hub`) | DYC |

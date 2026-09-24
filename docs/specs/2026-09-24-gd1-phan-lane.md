---
doc_id: SPEC-UNIT-006
title: Phân lane làm song song — GĐ1 nền tảng đa đơn vị
version: 1.0
status: active
audience: [dev, ai]
owner: DYC
updated: 2026-09-24
related_code: []
---

# Phân lane làm song song — GĐ1 nền tảng đa đơn vị

Tài liệu này chia phần còn lại của GĐ1 (`docs/specs/nen-tang-da-don-vi-tasks.md`) thành các **lane** để nhiều
người (và AI agent của họ) làm song song mà không giẫm chân nhau. Mỗi lane gắn với **một module** theo
`docs/dev/ranh-gioi-module.md`: việc trong lane mình thì làm luôn; việc chạm lane khác hoặc hợp đồng dùng chung
thì raise họp team (mẫu issue `cross-module`).

Tài liệu này chỉ ghi **ai sở hữu việc gì và phụ thuộc gì** (ít đổi). **Tiến độ** theo dõi bằng GitHub issue /
PR, không ghi vào đây (xem `docs/onboarding/ban-giao.md` mục 3).

## Đã xong (nền phần 1 — GĐ1-A)

Mục 1, 2, 3, 4 và backend mục 8 — plan `docs/specs/2026-09-24-gd1a-core-da-don-vi-plan.md`. Có sẵn cho mọi lane:
bảng đa đơn vị (kể cả `directives`, `submissions`, `ops_logs`, `ops_log_attendance`), `req.memberships` /
`req.unit` / `req.unitRole` / `req.actor`, `legacyGate`, `platformAdmin`, `settingGuard` + `setting_locks`,
`recordAudit`, `/api/units*`, `/api/session` có đơn vị, test chống rò rỉ route GET.

## Lane 0 — Nền (chủ: DYC; làm tập trung, TRƯỚC các lane khác)

Nền phần 2 — plan `docs/specs/2026-09-24-gd1a2-nen-phan-2-plan.md`. Toàn bộ là hợp đồng dùng chung nên chỉ lane
này sửa; lane khác cần đổi thì raise.

| Mục spec | Nội dung | Lane nào chờ |
|---|---|---|
| 5 | Module registry + manifest + API menu theo `unit_modules` | B |
| 6 | Gateway `/m/ctd/api/v1/*` + JWT bridge + `POST /internal/events` | C |
| 16 (tối thiểu) | CTD nhận JWT bridge, JIT `app_user` theo `hub_user_id` | C |
| 7 (khung) | `web/` Vite + React 18 + TS ở `/app`: layout, đăng nhập, chuyển đơn vị, menu | B |
| 11 | `unit_visibility_policies` + `scopeFor` + `toSummaryView` (backend) | A, B |
| 21, 22, 23 | Test chống rò rỉ mức `summary`, DYC đọc có audit, gắn CI chặn merge | tất cả |

## Lane A — Điều hành backend (module Điều hành)

| Mục spec | Nội dung | Bắt đầu được khi |
|---|---|---|
| 9 | API `directives` (luồng `sent → … → accepted/revision_requested`) | Ngay (bảng đã có); phần xem liên đơn vị cần mục 11 |
| 10 | API `submissions` (trình, rút lại, phản hồi) | Ngay; phần xem liên đơn vị cần mục 11 |
| 12 | API `ops_logs` / `ops_log_attendance` | Ngay |
| 13 | Đăng ký event `directive.*`, `submission.*`, `ops_log.absent_recorded` vào Rule Engine | Sau 9/10/12; phối hợp Lane D (chạm Email & Cron → raise nếu đổi engine) |

Route mới đọc quyền từ `req.unit` / `req.unitRole` (đơn vị đang chọn), **không** từ `req.actor` (chỉ dành cho route
Điều hành cũ). Đổi cột bảng `directives`/`submissions`/`ops_logs` = đổi schema → raise.

## Lane B — Frontend (module Web)

| Mục spec | Nội dung | Bắt đầu được khi |
|---|---|---|
| 14 | Chuyển Việc hôm nay / Hoạt động / Kanban / Setting sang `web/src/modules/dieu-hanh/` | Sau khung `web/` (mục 7) |
| 15 | Màn BTV (Việc đã giao, Hồ sơ được trình, Dashboard) và TCKT (Việc cấp trên giao, Đã trình, Nhật ký) | Sau mục 7 + API của Lane A |
| 8 (UI) | Quản lý đơn vị và membership cho DYC + admin đơn vị (API `/api/units*` đã có) | Sau mục 7 |
| 11 (UI) | Trang Setting → Phạm vi xem liên đơn vị | Sau mục 7 + 11 |

Frontend cũ `core/public/**` thuộc Điều hành: sửa lỗi ở đó vẫn làm được, nhưng tính năng mới viết trong `web/`.

## Lane C — CTD (module CTD, `services/ctd-api/**`)

| Mục spec | Nội dung | Bắt đầu được khi |
|---|---|---|
| 17 | Ánh xạ role Core → CTD (DYC → `quan_tri`; TCKT từ tổ phó trở lên → `tckt`; `member` không có quyền) — ADR-0008 | Sau mục 16 tối thiểu |
| 18 | `GET /api/v1/summary` thay dữ liệu giả `frontend/src/data/mock.ts` | Ngay |
| 19 | Gửi event trạng thái hồ sơ về Core qua outbox | Sau mục 6 (`/internal/events`) |
| 20 | Chuyển `features/canbo/*`, `features/baocao/*` sang `web/src/modules/ctd/`; giữ `features/hoso/*`, `features/auth/*` cho sinh viên | Sau mục 7; phối hợp Lane B |

## Lane D — Email & Cron

| Mục spec | Nội dung | Bắt đầu được khi |
|---|---|---|
| 24 | Bật email thật + cron (Hub + CTD) | Chuẩn bị ngay; bật thật chỉ trước khi mở cho người dùng thật (quyết định họp team) |
| 13 | Hỗ trợ Lane A đăng ký event mới vào Rule Engine | Khi Lane A cần |

Bật SMTP/cron là setting `platform` (chỉ DYC) và đổi môi trường → raise trước khi bật trên production.

## Thứ tự gợi ý

1. Lane 0 làm nền phần 2. Cùng lúc: Lane A làm 9/10/12 (chưa có xem liên đơn vị), Lane C làm 18, Lane D chuẩn bị 24.
2. Xong mục 7 + 5 → Lane B bắt đầu. Xong mục 6 + 16 → Lane C làm 17, 19. Xong mục 11 → Lane A thêm xem liên đơn vị.
3. Mỗi lane làm trên nhánh riêng `feat/<lane>-<việc>`, PR vào `staging`, theo `AGENTS.md`.

## Lịch sử phiên bản

| Version | Ngày | Thay đổi | Người |
|---|---|---|---|
| 1.0 | 2026-09-24 | Bản đầu: lane 0 (nền phần 2), A Điều hành backend, B frontend, C CTD, D email/cron; phụ thuộc và thứ tự | DYC |

---
doc_id: DEV-ARCH-001
title: Kiến trúc hệ thống
version: 1.2
status: active
audience: [dev, ai]
owner: DYC
updated: 2026-09-24
related_code: [core/src/app.js, core/src/server.js, core/src/units/, core/src/settings/, core/src/middleware/unit-context.js, core/src/middleware/legacy-gate.js, core/src/middleware/setting-guard.js, services/ctd-api/backend/app/main.py]
---

# Kiến trúc hệ thống

Tài liệu này giúp dev/AI hiểu nhanh cách hai app trong monorepo được ghép lại và giao tiếp với nhau.

## Hai app, hai công nghệ, một VM

- **Core** (`core/`): Node 22 + Express 5 + MySQL 8. Chứa module **Điều hành** (hoạt động, task/Kanban, đề án,
  nghiệm thu, báo cáo, Trình, quản lý team/người dùng) và hạ tầng dùng chung của mọi module loại A (session,
  auth, policy, email rule engine, cron runner). Entry point: `core/app.js` → `core/src/server.js` (`runtime.js`)
  → `core/src/app.js` (`createApplication`, dựng Express app: helmet CSP, session, static `public/`, đăng ký
  route qua `registerRoutes`, fallback SPA `index.html`, error handler cuối cùng).
  - **Thứ tự middleware** (giữa session và `registerRoutes`, GĐ1-A): session → static → `createUnitContext(db)`
    (`core/src/middleware/unit-context.js`, gắn `req.memberships`/`req.unit`/`req.actor` từ `unit_memberships`;
    không có membership nào → 403, Task 4) → `createLegacyGate(db)` áp cho `LEGACY_PREFIXES`
    (`core/src/middleware/legacy-gate.js`, chặn route Điều hành cũ ngoài TCKT; GET/HEAD của DYC được qua và ghi
    `audit_logs` (`cross_unit_read`), Task 5) → route handler, nơi các route tự áp thêm `auth`/`admin`/`manager`
    (đọc `req.actor`), `settingGuard` (`core/src/middleware/setting-guard.js`, chặn ghi setting `managed_by`
    ngoài quyền, Task 7) hoặc `platformAdmin` (chỉ DYC, Task 6–8) tuỳ route.
  - **`core/src/units/`** (GĐ1-A Task 1–4, 8): `catalog.js` (danh mục đơn vị/`kind`/role), `memberships.js` (repo
    đọc/ghi `unit_memberships`, `hasDycMembership`, `unitIdByCode`), dùng bởi `routes/units.js` (CRUD đơn vị +
    membership, chặn hạ/xoá `dyc_admin` cuối cùng) và `config/migrate-units.js` (migration idempotent).
  - **`core/src/settings/`** (GĐ1-A Task 7): danh mục setting theo `managed_by` (`platform`: SMTP, cron, đơn vị,
    membership ngoài đơn vị mình, danh mục module — chỉ DYC; `unit`: email templates/rules, mức xem, weight
    presets — admin đơn vị sửa được trừ khi có `setting_locks`), dùng bởi `createSettingGuard` và
    `routes/platform.js` (`/api/platform/setting-locks`).
  - Xem `docs/dev/phan-quyen.md` cho chi tiết role/quyền theo membership; `core/tests/units.leak.test.js`
    (GĐ1-A Task 9) quét toàn bộ `router.get('/api/...')` trong `core/src/routes/` để bảo đảm hồi quy: route mới
    thêm sau này tự động bị kiểm (BTV ngoài TCKT bị 403, DYC không bao giờ 403).
- **CTD** (`services/ctd-api/`): FastAPI + SQLAlchemy 2.0 + Alembic + Postgres 16. Module **Công tác Đảng** (xét
  duyệt hồ sơ Đảng). Entry point: `services/ctd-api/backend/app/main.py` (`include_router(auth.router)`,
  `cases.router`, `documents.router`). Frontend riêng React/Vite ở `services/ctd-api/frontend`, build ra
  `backend/static` để FastAPI phục vụ tĩnh.
- Hai app **không dùng chung DB, không dùng chung session**. Core gọi CTD (khi cần) qua JWT bridge:
  `services/ctd-api/backend/app/deps.py` phát/kiểm token HS256, `aud` cố định, hết hạn theo `jwt_ttl_minutes`.

## Loại module (theo `.kiro/specs/nen-tang-da-don-vi/design.md` §4)

- **Loại A** — sống trong `core/src/modules/` (chưa tồn tại ở GĐ1, TCKT Điều hành hiện vẫn nằm trực tiếp trong
  `core/src/routes|services|policies`), dùng chung DB MySQL và session của Core.
- **Loại B** — service riêng ở `services/<id>/`, có DB riêng, nối qua JWT bridge + gateway (CTD là ví dụ loại B).
  Tiêu chí tách loại B: có nhóm người dùng riêng, dữ liệu ít JOIN với phần còn lại, có quy trình nghiệp vụ riêng
  (đạt ≥2/3 thì tách).

## Hạ tầng

Một VM Oracle Ampere (arm64) chạy hai môi trường độc lập (`staging`, `production`), mỗi môi trường là một Docker
Compose project riêng (`ultimate-tckt-staging` / `ultimate-tckt-production`) với 4 service: `core`, `core-db`
(MySQL 8), `ctd-api`, `ctd-db` (Postgres 16). Nginx trên host định tuyến theo tên miền tới cổng `127.0.0.1` của
từng service (không expose port ra ngoài). Chi tiết cổng/tên miền: `docs/ops/moi-truong.md`; chi tiết deploy/CI:
`docs/ops/deploy-va-nhanh.md`.

## Frontend

- `core/public/` — frontend cũ, JavaScript thuần (`app.js`), chỉ bảo trì, không thêm tính năng mới.
- `services/ctd-api/frontend/` — React 18 + TypeScript + Vite, theo tính năng (`features/auth`, `features/hoso`,
  `features/canbo`, `features/baocao`).
- `web/` — frontend chung tương lai cho toàn nền tảng (React 18 + TypeScript + Vite), **chưa tạo** ở GĐ1. Xem
  `.kiro/specs/nen-tang-da-don-vi/design.md` §3 cho kiến trúc dự kiến (`shell/`, `ui/`, `modules/<module-id>/`).

## Lịch sử phiên bản

| Version | Ngày | Thay đổi | Người |
|---|---|---|---|
| 1.0 | 2026-09-24 | Bản đầu (viết lại từ tài liệu cũ khi gộp monorepo) | DYC |
| 1.1 | 2026-09-24 | Ghi middleware order trong `app.js`: `createUnitContext` rồi `createLegacyGate` giữa session và `registerRoutes` (nợ tài liệu từ GĐ1-A Task 4, khớp luôn khi Task 5 sửa `app.js`) | DYC |
| 1.2 | 2026-09-24 | GĐ1-A Task 9: chốt sơ đồ middleware đầy đủ (session → static → `loadUnitContext` → `legacyGate` → route tự áp `auth`/`admin`/`manager`/`settingGuard`/`platformAdmin`), thêm mục `core/src/units/` và `core/src/settings/` | DYC |

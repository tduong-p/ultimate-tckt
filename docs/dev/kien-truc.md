---
doc_id: DEV-ARCH-001
title: Kiến trúc hệ thống
version: 3.5
status: active
audience: [dev, ai]
owner: DYC
updated: 2026-10-10
related_code: [core/src/app.js, core/src/server.js, core/Dockerfile, .dockerignore, web/**, services/ctd-api/backend/app/main.py, core/src/middleware/unit-context.js, core/src/middleware/legacy-gate.js, core/src/config/database.js]
---

# Kiến trúc hệ thống

Tài liệu này giúp dev/AI hiểu nhanh cách hai app trong monorepo được ghép lại và giao tiếp với nhau.

## Hai app, hai công nghệ, một VM

- **Core** (`core/`): Node 22 + Express 5 + MySQL 8. Chứa module **Điều hành** (hoạt động, task/Kanban, đề án,
  nghiệm thu, báo cáo, Trình, quản lý team/người dùng) và hạ tầng dùng chung của mọi module loại A (session,
  auth, policy, facade thông báo `notifier` — gửi sang Noti qua `noti-sender.js` khi có `NOTI_URL`/`NOTI_API_KEY` —, scheduler nhắc hạn). Entry point: `core/app.js` → `core/src/server.js` (`runtime.js`)
  → `core/src/app.js` (`createApplication`, dựng Express app theo pipeline:
  1. helmet CSP
  2. session middleware (express-session)
  3. mount `core/public/` tại `/legacy` và static asset build từ `web/` tại `/` (không tự trả entry)
  4. `loadUnitContext` — gắn `req.unit`, `req.unitRole`, `req.memberships`, `req.actor` từ session
  5. `legacyGate` — chặn API Điều hành cũ nếu không phải TCKT hoặc DYC; ghi audit khi DYC đọc dữ liệu TCKT
  6. đăng ký route qua `registerRoutes`; `/api/*` chưa khớp trả JSON 404, `/auth/*` và `/legacy/*` trả 404 riêng
  7. GET frontend chưa khớp trả `core/web-dist/index.html`; method ghi không đi qua SPA fallback
  8. error handler cuối cùng
- **CTD** (`services/ctd-api/`): FastAPI + SQLAlchemy 2.0 + Alembic + Postgres 16. Module **Công tác Đảng** (xét
  duyệt hồ sơ Đảng). Entry point: `services/ctd-api/backend/app/main.py` (`include_router(auth.router)`,
  `cases.router`, `documents.router`). Frontend riêng React/Vite ở `services/ctd-api/frontend`, build ra
  `backend/static` để FastAPI phục vụ tĩnh.
- Hai app **không dùng chung DB, không dùng chung session**. Core gọi CTD (khi cần) qua JWT bridge:
  `services/ctd-api/backend/app/deps.py` phát/kiểm token HS256, `aud` cố định, hết hạn theo `jwt_ttl_minutes`.

## Nền tảng đa đơn vị (từ GĐ1-A)

Từ GĐ1-A, Core hỗ trợ nhiều đơn vị (DYC, BTV, TCKT, VP Đoàn, Chi bộ, ĐT/LCĐ). Mỗi người có membership ở một hoặc
nhiều đơn vị, quyền tính theo `unit_memberships.role` của đơn vị đang chọn (`session.current_unit_id`).

**Middleware pipeline phân quyền:**

1. **`loadUnitContext`** (`core/src/middleware/unit-context.js`) — gắn ngữ cảnh đơn vị:
   - `req.memberships` (array `{ unit_id, role, code, kind }`)
   - `req.unit` (đơn vị đang chọn, gồm `modules` đọc từ `unit_modules`), `req.unitRole` (role đang chọn)
   - `req.actor` (user với `role` = role TCKT của membership, hoặc `admin` cho DYC khi đọc, hoặc `null` cho đơn vị khác)
   - Fallback: `current_unit_id` không hợp lệ → membership đầu tiên; không có membership nào thì ngữ cảnh đơn vị rỗng, middleware không tự trả 403

2. **`legacyGate`** (`core/src/middleware/legacy-gate.js`) — bảo vệ route Điều hành cũ (`/api/activities`, `/api/tasks`, `/api/teams`,…):
   - Cho phép TCKT (membership có `unit.code == 'TCKT'`) với `req.actor` = user có role TCKT
   - Cho phép DYC (platform admin) **CHỈ** với GET/HEAD, ghi `audit_logs` mỗi lượt đọc liên đơn vị
   - Chặn (403) các đơn vị khác

3. **Route Điều hành** đọc quyền từ `req.actor.role` (không dùng `req.session.user.role` trực tiếp)

4. **DYC admin global** — `scopeFor` trong `core/src/policies/access.js` coi DYC là admin, cho đọc mọi dữ liệu nghiệp vụ (không 403), mỗi lượt đọc liên đơn vị ghi `audit_logs`

Chi tiết: `.kiro/specs/nen-tang-da-don-vi/design.md` §3, 6, 7

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

- `core/public/` — frontend cũ, JavaScript thuần (`app.js`), chỉ bảo trì, không thêm tính năng mới; Core giữ tại `/legacy/` trong thời gian chuyển tiếp.
- `services/ctd-api/frontend/` — React 18 + TypeScript + Vite, theo tính năng (`features/auth`, `features/hoso`,
  `features/canbo`, `features/baocao`).
- `web/` — frontend React 18 + TypeScript + Vite thay giao diện Core ở `/`; `web/index.html` là entrypoint Core, còn `ctd.html` tiếp tục là entry riêng. Vite tạo `web/dist`, được chép vào `/app/web-dist` khi đóng gói Core.

Image Core dùng multi-stage Docker build với context ở gốc repo: stage đầu cài và build `web/`, stage runtime cài dependencies sản xuất từ `core/` rồi chép bundle vào image. `.dockerignore` ở gốc giữ `web/` và `core/public/`, loại dependencies, dữ liệu cục bộ và các thư mục không cần cho image. Workflow Core chạy khi `core/**`, `web/**` hoặc `.dockerignore` đổi; PR kiểm tra build `linux/arm64` nhưng không publish image. `deploy-core` vẫn chỉ chạy trên push theo chính sách hiện hành.

## Múi giờ

**Toàn hệ thống dùng giờ Việt Nam (Asia/Ho_Chi_Minh, UTC+7) làm chuẩn duy nhất.**

- Node.js: `process.env.TZ = 'Asia/Ho_Chi_Minh'` (đặt ở `core/app.js` dòng đầu)
- MySQL connection: `timezone: '+07:00'` (trong `core/src/config/database.js`)
- MySQL server: `--default-time-zone='+07:00'` (trong Docker Compose)
- Mọi cột `DATETIME`/`TIMESTAMP` lưu giờ Việt Nam, không phải UTC

Chi tiết: **DEV-TZ-001** (`docs/dev/mui-gio.md`) — quy ước, cách dùng đúng, testing, troubleshooting.

## Lịch sử phiên bản

| Version | Ngày | Thay đổi | Người |
|---|---|---|---|
| 1.0 | 2026-09-24 | Bản đầu (viết lại từ tài liệu cũ khi gộp monorepo) | DYC |
| 2.0 | 2026-09-27 | Đồng bộ `main` = `staging`: nội dung theo bản `main` (chưa có code đa đơn vị GĐ1-A). Bản 1.2 trên `staging` mô tả GĐ1-A, lưu ở nhánh `archive/gd1a-staging` — NTMT làm lại ở PR sau | DYC |
| 2.1 | 2026-09-29 | Bổ sung middleware ngữ cảnh đa đơn vị createUnitContext và cổng legacyGate vào pipeline Express Core (GĐ1-A) | DYC |
| 3.0 | 2026-09-30 | Làm rõ flow middleware đa đơn vị: pipeline 8 bước từ helmet→error handler, chi tiết loadUnitContext + legacyGate + req.actor | DYC |
| 3.1 | 2026-10-02 | Core không còn email rule engine; có facade `notifier` | DYC |
| 3.2 | 2026-10-02 | Facade `notifier` có sender HTTP sang Noti | DYC |
| 3.3 | 2026-10-04 | Thêm mục "Múi giờ" - toàn hệ thống dùng Asia/Ho_Chi_Minh (UTC+7), xem DEV-TZ-001 | DYC |
| 3.4 | 2026-10-09 | Bổ sung `req.unit.modules` vào ngữ cảnh đa đơn vị và đính chính fallback khi không có membership | DYC |
| 3.5 | 2026-10-10 | Cập nhật pipeline Core sau cutover web: `/`, `/legacy`, Docker multi-stage từ root context và build arm64 trên PR | DYC |

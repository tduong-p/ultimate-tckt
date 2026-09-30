# Implementation Plan: Nền tảng đa đơn vị (GĐ1)

## Overview

Triển khai nền tảng đa đơn vị cho hệ thống Core, bao gồm migration schema, middleware phân quyền theo đơn vị, DYC admin global, audit logs, và các tính năng Điều hành nâng cao (directives, submissions, ops logs). Phân chia thành 4 nhóm: Core (hạ tầng đa đơn vị), Điều hành (luồng nghiệp vụ nội bộ), CTD (tích hợp module Công tác Đảng), và các bước bảo mật/triển khai cuối.

---

## Tasks

## Core

- [x] 1. Viết migration idempotent (bảng mới + seed đơn vị + gán dữ liệu cũ)
  - Tạo `org_units`, `unit_memberships`, `unit_modules`, `unit_visibility_policies`, `setting_locks`, `audit_logs`, `directives`, `submissions`, `ops_logs`, `ops_log_attendance`
  - Seed đơn vị: DYC, BTV, TCKT, VP Đoàn, Chi bộ, ĐT/LCĐ (dữ liệu giả ở GĐ1 — thay bằng danh sách thật trước khi mở cho người dùng thật)
  - Gán `teams.unit_id` / `activities.unit_id` = TCKT cho dữ liệu hiện có
  - Tạo membership TCKT từ `users.role`; chuyển `is_devops=1` thành membership DYC `dyc_engineer`
  - Seed policy BTV→TCKT = `summary`
  - Test chạy migration hai lần, xác nhận không tạo bản ghi trùng
  - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 3.1_

- [x] 2. Middleware `loadUnitContext` + refactor `src/policies/access.js`
  - Gắn `req.unit`, `req.unitRole`, `req.memberships` từ session `current_unit_id`
  - Xử lý fallback: `current_unit_id` không hợp lệ → membership đầu tiên; không có membership nào → 403
  - Chuyển `isExecutive`, `leadsTeam`, `activityScope`,… sang dùng `req.unitRole`
  - _Requirements: 1.4, 1.5_

- [x] 3. DYC + `setting_locks` + `managed_by` + admin global
  - Thêm cột `managed_by` (`platform` / `unit`) cho setting
  - Endpoint khóa/mở khóa setting (chỉ DYC), ghi audit
  - Bootstrap `DEVOPS_EMAILS` → membership `dyc_admin` mỗi lần khởi động
  - `scopeFor` coi DYC là admin global: cho đọc mọi endpoint dữ liệu nghiệp vụ (không 403), ghi `audit_logs` mỗi lượt đọc liên đơn vị
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7_

- [x] 4. `audit_logs`
  - Ghi log khi: đọc liên đơn vị, đổi mức xem, khóa/mở khóa setting, đổi membership
  - _Requirements: 3.6, 3.7, 9.1, 9.2_

- [ ] 5. Module registry + manifest + `unit_modules`
  - Định nghĩa manifest cho module `dieu-hanh` và `ctd`
  - API cho shell lấy menu theo membership + `unit_modules` của đơn vị đang chọn
  - _Requirements: 7.1, 7.2, 7.3_

- [ ] 6. Gateway + JWT bridge + `/internal/events`
  - Ký JWT HS256 (`HUB_BRIDGE_SECRET`, `aud=ctd`, TTL 60s) khi forward `/m/ctd/api/v1/*`
  - Endpoint nhận event từ module (`POST /internal/events`)
  - _Requirements: 8.1, 8.3, 8.7_

- [ ] 7. Shell React (`web/`) + bộ UI dùng chung
  - Khởi tạo `web/` (Vite + React 18 + TS), phục vụ tĩnh ở `/app`
  - Layout, đăng nhập, chuyển đơn vị, menu theo manifest, chuông thông báo
  - _Requirements: 7.1, 7.4, 7.5_

- [ ] 8. Quản lý đơn vị và membership (UI cho DYC + admin đơn vị)
  - _Requirements: 1.1, 1.3_

## Điều hành

- [ ] 9. Bảng + API `directives` (luồng `sent → acknowledged → in_progress → submitted → accepted/revision_requested`)
  - _Requirements: 4.1–4.8_

- [ ] 10. Bảng + API `submissions` (Trình, rút lại, phản hồi)
  - _Requirements: 5.1–5.4_

- [ ] 11. `unit_visibility_policies` + `scopeFor` + serializer `toSummaryView`
  - Trang Setting → Phạm vi xem liên đơn vị (chỉ admin đơn vị sở hữu sửa, có audit)
  - _Requirements: 3.1–3.8_

- [ ] 12. Bảng + API `ops_logs` / `ops_log_attendance`
  - _Requirements: 6.1–6.4_

- [ ] 13. Event mới đăng ký vào Rule Engine (`directive.*`, `submission.*`, `ops_log.absent_recorded`)
  - _Requirements: 4.6, 4.7, 5.4, 6.4_

- [ ] 14. Frontend: chuyển Việc hôm nay / Hoạt động / Kanban / Setting sang shell (`web/src/modules/dieu-hanh/`)
  - _Requirements: 7.4, 7.5_

- [ ] 15. Frontend: màn BTV (Việc đã giao, Hồ sơ được trình, Dashboard) và màn TCKT (Việc cấp trên giao, Đã trình, Nhật ký)
  - _Requirements: 4.*, 5.*, 6.*_

## CTD

- [ ] 16. `backend/app/deps.py`: chấp nhận JWT bridge, JIT tạo/đồng bộ `app_user` theo `hub_user_id`
  - _Requirements: 8.1, 8.2, 8.3_

- [ ] 17. Ánh xạ role Core → CTD theo bảng §8.1 (DYC → `quan_tri` admin global; TCKT từ tổ phó trở lên: `vice_leader`/`leader`/`vice_admin`/`admin` → `tckt`; `member` không có quyền)
  - _Requirements: 8.2_

- [ ] 18. Endpoint `GET /api/v1/summary` (thay dữ liệu giả trong `frontend/src/data/mock.ts`)
  - _Requirements: 8.4_

- [ ] 19. Gửi event trạng thái hồ sơ về Core qua outbox hiện có
  - _Requirements: 8.7_

- [ ] 20. Chuyển `features/canbo/*` và `features/baocao/*` sang `web/src/modules/ctd/`; giữ lại `features/hoso/*`, `features/auth/*` cho sinh viên
  - _Requirements: 8.5, 8.6_

## Chống rò rỉ (chặn merge)

- [x] 21. Test: mọi route GET với tài khoản BTV mức `summary` không lộ trường/id ngoài phạm vi
  - _Requirements: 10.1_
- [x] 22. Test: DYC đọc được mọi endpoint nghiệp vụ (không 403) và mỗi lượt đọc có ghi `audit_logs`
  - _Requirements: 10.2_
- [ ] 23. Gắn hai test trên vào CI, chặn merge khi fail
  - _Requirements: 10.3_

## Trước khi mở cho người dùng thật

- [ ] 24. Bật email thật + cron (Hub + CTD)


---

## Notes

- **Trình tự triển khai:** Core tasks (1-8) phải hoàn thành trước các task khác vì chúng tạo nền tảng hạ tầng đa đơn vị
- **Task 21-22 (test rò rỉ)** đã hoàn thành trong Task 9 của implementation plan, tạo file `core/tests/units.leak.test.js`
- **Dữ liệu giả ĐT/LCĐ:** Các đơn vị grassroots trong seed data đánh dấu `[Dữ liệu giả]`, phải thay bằng danh sách thật trước task 24
- **Migration idempotent:** Task 1 tạo marker `platform_migrations.multi_unit_backfill_v1` để backfill chỉ chạy một lần
- **Tài liệu:** Mọi task sửa code phải cập nhật tài liệu liên quan + tăng version + chạy `npm run docs:check`

## Task Dependency Graph

```json
{
  "waves": [
    {
      "name": "Wave 1: Foundation",
      "tasks": [1],
      "description": "Migration schema - creates all tables and seeds initial data"
    },
    {
      "name": "Wave 2: Middleware & Auth",
      "tasks": [2, 3, 4],
      "description": "Unit context, DYC admin global, audit logs - core authorization infrastructure",
      "dependsOn": [1]
    },
    {
      "name": "Wave 3: Core Features",
      "tasks": [5, 8],
      "description": "Module registry and unit membership management UI",
      "dependsOn": [2]
    },
    {
      "name": "Wave 4: Gateway & Integration",
      "tasks": [6, 7],
      "description": "JWT bridge and React shell for frontend integration",
      "dependsOn": [5]
    },
    {
      "name": "Wave 5: Business Logic - Điều hành",
      "tasks": [9, 10, 11, 12, 13],
      "description": "Directives, submissions, visibility policies, ops logs",
      "dependsOn": [4]
    },
    {
      "name": "Wave 6: CTD Integration",
      "tasks": [16, 17, 18, 19, 20],
      "description": "CTD module JWT auth, role mapping, and frontend migration",
      "dependsOn": [6]
    },
    {
      "name": "Wave 7: Frontend Migration",
      "tasks": [14, 15],
      "description": "Move Điều hành screens to React shell",
      "dependsOn": [11]
    },
    {
      "name": "Wave 8: Security Testing",
      "tasks": [21, 22],
      "description": "Data leak regression tests (completed in Task 9)",
      "dependsOn": [2, 3, 4]
    },
    {
      "name": "Wave 9: CI Integration",
      "tasks": [23],
      "description": "Add leak tests to CI pipeline",
      "dependsOn": [21, 22]
    },
    {
      "name": "Wave 10: Production Readiness",
      "tasks": [24],
      "description": "Enable real email and cron for production launch",
      "dependsOn": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23]
    }
  ]
}
```

**Visual dependency flow:**

```
Wave 1: Foundation
[1] Migration
  ↓
Wave 2: Middleware & Auth  
[2] loadUnitContext → [3] DYC admin → [8] Membership UI
  ↓                      ↓
  ↓                    [4] audit_logs
  ↓                      ↓
Wave 3: Core           Wave 5: Business Logic
[5] Module registry    [9] Directives
  ↓                    [10] Submissions
Wave 4: Gateway        [11] Visibility + Serializer → Wave 7: Frontend
[6] JWT bridge            [12] Ops logs              [14] Điều hành screens
  ↓                       [13] Rule engine events    [15] BTV/TCKT screens
[7] React shell
  ↓
Wave 6: CTD Integration
[16] JWT auth deps
[17] Role mapping
[18] Summary API
[19] Event outbox
[20] Frontend migration

Wave 8-9: Security
[21,22] Leak tests (✓ done) → [23] CI integration

Wave 10: Production
[24] Email + Cron
```

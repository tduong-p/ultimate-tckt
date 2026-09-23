# Tasks: Nền tảng đa đơn vị (GĐ1)

> Bản nháp viết tay dựa trên `design.md` §10 và `requirements.md`. Nếu mở bằng Kiro và bấm **Generate tasks**, Kiro có thể sinh lại file này theo đúng định dạng riêng của nó — khi đó hãy thay thế bản nháp này.

## Core

- [ ] 1. Viết migration idempotent (bảng mới + seed đơn vị + gán dữ liệu cũ)
  - Tạo `org_units`, `unit_memberships`, `unit_modules`, `unit_visibility_policies`, `setting_locks`, `audit_logs`, `directives`, `submissions`, `ops_logs`, `ops_log_attendance`
  - Seed đơn vị: DYC, BTV, TCKT, VP Đoàn, Chi bộ, ĐT/LCĐ (dữ liệu giả ở GĐ1 — thay bằng danh sách thật trước khi mở cho người dùng thật)
  - Gán `teams.unit_id` / `activities.unit_id` = TCKT cho dữ liệu hiện có
  - Tạo membership TCKT từ `users.role`; chuyển `is_devops=1` thành membership DYC `dyc_engineer`
  - Seed policy BTV→TCKT = `summary`
  - Test chạy migration hai lần, xác nhận không tạo bản ghi trùng
  - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 3.1_

- [ ] 2. Middleware `loadUnitContext` + refactor `src/policies/access.js`
  - Gắn `req.unit`, `req.unitRole`, `req.memberships` từ session `current_unit_id`
  - Xử lý fallback: `current_unit_id` không hợp lệ → membership đầu tiên; không có membership nào → 403
  - Chuyển `isExecutive`, `leadsTeam`, `activityScope`,… sang dùng `req.unitRole`
  - _Requirements: 1.4, 1.5_

- [ ] 3. DYC + `setting_locks` + `managed_by` + admin global
  - Thêm cột `managed_by` (`platform` / `unit`) cho setting
  - Endpoint khóa/mở khóa setting (chỉ DYC), ghi audit
  - Bootstrap `DEVOPS_EMAILS` → membership `dyc_admin` mỗi lần khởi động
  - `scopeFor` coi DYC là admin global: cho đọc mọi endpoint dữ liệu nghiệp vụ (không 403), ghi `audit_logs` mỗi lượt đọc liên đơn vị
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7_

- [ ] 4. `audit_logs`
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

- [ ] 21. Test: mọi route GET với tài khoản BTV mức `summary` không lộ trường/id ngoài phạm vi
  - _Requirements: 10.1_
- [ ] 22. Test: DYC đọc được mọi endpoint nghiệp vụ (không 403) và mỗi lượt đọc có ghi `audit_logs`
  - _Requirements: 10.2_
- [ ] 23. Gắn hai test trên vào CI, chặn merge khi fail
  - _Requirements: 10.3_

## Trước khi mở cho người dùng thật

- [ ] 24. Bật email thật + cron (Hub + CTD)

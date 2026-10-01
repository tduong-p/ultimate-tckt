---
doc_id: BA-UNIT-001
title: Cơ cấu đơn vị và vai trò
version: 2.4
status: active
audience: [ba]
owner: DYC
updated: 2026-10-01
related_code: [core/src/policies/access.js, core/src/middleware/auth.js, core/src/routes/units.js]
---

# Cơ cấu đơn vị và vai trò

Tài liệu này giúp BA hiểu cây tổ chức mà nền tảng hướng tới, vai trò của từng đơn vị, và phạm vi quyền nghiệp vụ tương ứng. Phần lớn nội dung dưới đây là **thiết kế kế hoạch (GĐ1)**, không phải hiện trạng code — phần "đã làm" được ghi rõ ở mục 3.

## 1. Cây đơn vị (kế hoạch)

![Cơ cấu tổ chức](images/co-cau-to-chuc.png)

```
[DYC] — chủ quản nền tảng (độc lập, ngoài cây Đoàn)

Đoàn Đại học
├── Ban Thường vụ (BTV)
├── Văn phòng Đoàn (VP Đoàn)
├── Các Ban chuyên môn
│   ├── Ban Tổ chức – Kiểm tra (TCKT)
│   └── Các ban khác                      (kế hoạch GĐ3)
├── Chi bộ                                (quan sát hồ sơ Đảng)
└── Đoàn trường / Liên chi đoàn (ĐT/LCĐ)  (chung một nhóm role)
```

| `kind` (loại đơn vị) | Đơn vị | Vai trò trong đơn vị |
|---|---|---|
| `platform_owner` | DYC | `dyc_admin`, `dyc_engineer` |
| `standing_committee` | BTV | `btv_lead`, `btv_member` |
| `department` | TCKT (các ban khác ở GĐ3) | `admin`, `vice_admin`, `leader`, `vice_leader`, `member` |
| `office` | Văn phòng Đoàn | `officer` |
| `party_cell` | Chi bộ | `observer` |
| `grassroots` | ĐT/LCĐ | `officer` |

Một người có thể thuộc nhiều đơn vị cùng lúc; vai trò gắn với **từng membership** (đơn vị + vai trò), không gắn cứng vào tài khoản.

## 2. Quyết định nghiệp vụ đã chốt (2026-09-23)

- **DYC là admin toàn cục**: đọc được mọi dữ liệu nghiệp vụ của mọi đơn vị, kể cả hồ sơ CTD — kèm ghi vết truy cập (audit log) cho mỗi lượt đọc liên đơn vị. Phân cấp quyền xem nội bộ trong DYC (không phải ai trong DYC cũng nên xem hồ sơ CTD) chưa chốt, để thiết kế sau.
- **Quyền truy cập tab CTD trong nội bộ TCKT**: chỉ nhóm **từ tổ phó trở lên** (`vice_leader`, `leader`, `vice_admin`, `admin`) mới có quyền vào tab Công tác Đảng; role `member` không có quyền này. Phía CTD, nhóm TCKT có quyền này được ánh xạ sang vai trò `tckt` (đã xác nhận đúng với `Role.TCKT` trong `services/ctd-api/backend/app/models/identity.py`).
- **Mức xem liên đơn vị cấu hình được** (không sửa code khi đổi chính sách): 3 mức cố định — `summary` (tổng quan), `tasks_readonly` (thêm task/assignee chỉ đọc), `full_readonly` (thêm checklist/bình luận/đính kèm/nhật ký trực ban chỉ đọc). Mặc định BTV → TCKT ở mức `summary`.
- **Quyền quản lý cấu hình hệ thống**: Cấu hình chia hai loại — **platform-level** (SMTP, Cron jobs) chỉ DYC quản lý; **unit-level** (Email templates, Rules, Weight presets) do DYC hoặc unit admin quản lý (trong GĐ1 là TCKT admin: `admin`, `vice_admin`). DYC có thể tạm khoá unit-level settings để ngăn đơn vị sửa khi đang bảo trì hệ thống (setting lock). Chi tiết kỹ thuật: `docs/dev/email-cron.md`.
- **Quản lý thành viên đơn vị**: DYC quản lý thành viên mọi đơn vị (nhưng chỉ `dyc_admin` mới sửa được chính đơn vị DYC); unit admin (TCKT admin, BTV lead...) chỉ quản lý thành viên đơn vị của mình. **Quan trọng:** Thêm/xóa/sửa role thành viên TCKT qua API `/api/units/:id/members/:userId` sẽ **tự động đồng bộ** với `users.role` (field cũ dùng cho màn Tài khoản) — không cần sửa tay hai nơi. Chi tiết API: `docs/dev/api.md` section "Unit Management".

## 3. Đã làm vs. kế hoạch

### Đã làm (RBAC một-ban, đang chạy)

Phần vận hành TCKT hiện tại (`core/src/policies/access.js`, `core/src/middleware/auth.js`) chỉ biết **một cấp tổ chức** — không có khái niệm đơn vị/BTV/DYC ở tầng dữ liệu:

- 5 vai trò trên cột `users.role`: `admin`, `vice_admin` (Ban điều hành, toàn quyền — hàm `isExecutive`), `leader`, `vice_leader` (Tổ trưởng/phó, quản lý Tổ mình — gộp cùng `isExecutive` thành `isLeadership`), `member` (thành viên thường).
- Vai trò được **tự động tính lại** mỗi khi vai trò trong Tổ (`user_teams.is_lead` / `is_vice_lead`) thay đổi (xem `core/src/routes/teams.js`).
- Phạm vi xem/sửa được kiểm soát qua các hàm thuần trong `access.js`: `activityScope`, `canManageTeam`, `canManageActivity`, `canReviewTask`, `canManageUser`, v.v. — đây chính là các hàm sẽ được refactor thành `scopeFor(viewer, resourceType)` đa đơn vị khi GĐ1 triển khai.
- Các bảng `org_units`, `unit_memberships`, `unit_visibility_policies`, `setting_locks`, `audit_logs` đã được bổ sung ở GĐ1-A. Middleware `auth.js` đã chuyển sang kiểm tra membership và phân quyền qua `req.actor` (Task 4 & 5).

### Kế hoạch (GĐ1 tiếp theo)

Toàn bộ cây đơn vị ở mục 1, hàm `scopeFor(viewer, resourceType)` thay thế các hàm trong `access.js`, và luồng giao việc liên đơn vị (directive)/Trình (submission) — xem `.kiro/specs/nen-tang-da-don-vi/design.md` §5–§8 và use case vận hành ở [`dieu-hanh-use-case.md`](dieu-hanh-use-case.md).

## 4. Lưu ý quan trọng — dữ liệu ĐT/LCĐ trong GĐ1 là giả định

**Trong Giai đoạn 1 (GĐ1), danh sách Đoàn trường/Liên chi đoàn (ĐT/LCĐ) và cán bộ phụ trách thực tế trong phần Điều hành là dữ liệu giả/placeholder, chưa phải danh sách thật.** Đây là một câu hỏi còn mở, chưa chốt (xem `.kiro/specs/nen-tang-da-don-vi/design.md` §13): danh sách ĐT/LCĐ và cán bộ phụ trách thực tế còn thiếu, cần dữ liệu thật trước khi seed migration chính thức. ĐT/LCĐ chỉ dùng module CTD ở GĐ1; việc dùng module Điều hành được xếp vào GĐ3.

BA khi viết use case hoặc kịch bản demo liên quan tới ĐT/LCĐ trong phần Điều hành cần nêu rõ đây là dữ liệu giả định, không suy diễn thành yêu cầu nghiệp vụ đã xác nhận.

## 5. Ánh xạ vai trò Core → CTD (kế hoạch)

| Core (`kind`, role) | Vai trò CTD |
|---|---|
| `grassroots`, `officer` (ĐT/LCĐ) | `can_bo_don_vi` |
| `department` TCKT (tổ phó trở lên) | `tckt` |
| `office`, `officer` (VP Đoàn) | `vp_doan` |
| `party_cell`, `observer` (Chi bộ) | `chi_bo` |
| `standing_committee` (BTV) | không có vai trò CTD, chỉ gọi được `/summary` |
| `platform_owner` (DYC) | `quan_tri` (admin toàn cục phía CTD) |

## Lịch sử phiên bản

| Version | Ngày | Thay đổi | Người |
|---|---|---|---|
| 1.0 | 2026-09-24 | Bản đầu (viết lại từ tài liệu cũ khi gộp monorepo) | DYC |
| 2.0 | 2026-09-27 | Đồng bộ `main` = `staging`: nội dung theo bản `main` (chưa có code đa đơn vị GĐ1-A). Bản 1.3 trên `staging` mô tả GĐ1-A, lưu ở nhánh `archive/gd1a-staging` — NTMT làm lại ở PR sau | DYC |
| 2.1 | 2026-09-29 | Ghi nhận middleware auth và cổng Điều hành chuyển sang xác thực qua membership và req.actor (GĐ1-A Task 4 & 5) | DYC |
| 2.2 | 2026-09-29 | Thêm quyền quản lý cấu hình hệ thống: platform-level (DYC only) vs unit-level (DYC hoặc unit admin), setting locks mechanism (góc độ BA). | DYC |
| 2.3 | 2026-09-29 | Thêm "Quản lý thành viên đơn vị": DYC quản lý mọi đơn vị (chỉ dyc_admin sửa DYC), unit admin quản lý đơn vị mình. Đồng bộ tự động TCKT role ↔ users.role khi sửa membership qua API. | DYC |
| 2.1 | 2026-09-30 | Tổ trưởng không đổi mật khẩu/email người khác; ranh giới quản lý tài khoản (pilot PR 4) | DYC |
| 2.4 | 2026-10-01 | Xử lý conflict merge staging và cập nhật tài liệu | DYC |

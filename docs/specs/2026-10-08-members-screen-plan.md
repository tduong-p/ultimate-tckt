---
doc_id: PLAN-MEMBERS-001
title: Plan — Members Screen UI Implementation
version: 1.3
status: active
audience: [dev, ai]
owner: DYC
updated: 2026-10-10
related_code: [web/src/core/features/members/MembersView.tsx]
---

# Members Screen Implementation Plan

## Tasks

Kế hoạch giao diện ban đầu đã được mở rộng và hoàn tất trong SPEC-WEB-003 đợt 3, gồm tạo/sửa/xoá tài khoản và quyền theo vai trò. Kế hoạch chi tiết hiện hành là `docs/specs/2026-10-09-web-dot-3-to-thanh-vien-plan.md`.

### Task 1: Create MembersView Component
- Create `web/src/core/features/members/MembersView.tsx`.
- Header: "Thành viên", subtitle, and "+ Tạo tài khoản" button.
- Toolbar: Search input and 2 Select filters ("Tất cả các Tổ", "Tất cả vai trò").
- 3-column responsive grid with member cards containing avatar, details, role badge, stats, email link, and action buttons.

### Task 2: Unit Testing
- Create `web/src/core/features/members/MembersView.test.tsx`.
- Test header rendering, search bar, and member cards.

### Task 3: Navigation Integration
- Update `web/src/shared/layouts/PageLayout.tsx` for "Thành viên" (`members`).
- Update `web/src/core/main.tsx` to mount `MembersView` when `currentView === 'members'`.
- Run full test suite.

## Lịch sử phiên bản
| Version | Ngày | Thay đổi | Người |
|---|---|---|---|
| 1.0 | 2026-10-08 | Khởi tạo kế hoạch triển khai giao diện Thành viên | DYC |
| 1.1 | 2026-10-08 | Tích hợp React Query với API /api/people và /api/teams, xóa mock | DYC |
| 1.2 | 2026-10-09 | Trỏ tới kế hoạch đợt 3 hiện hành đã hoàn tất luồng thành viên và tài khoản | DYC |
| 1.3 | 2026-10-10 | Cập nhật lưới thẻ và thanh lọc responsive trên di động trong `MembersView.tsx`; xem SPEC-MEMBERS-001 1.4 | DYC |

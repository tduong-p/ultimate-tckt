---
doc_id: PLAN-TEAMS-001
title: Plan — Teams Screen UI Implementation
version: 1.2
status: active
audience: [dev, ai]
owner: DYC
updated: 2026-10-09
related_code: [web/src/core/features/teams/TeamsView.tsx]
---

# Teams Screen Implementation Plan

## Tasks

Kế hoạch giao diện ban đầu đã được mở rộng và hoàn tất trong SPEC-WEB-003 đợt 3: tạo/sửa/xoá Tổ, quản lý thành viên, trang chi tiết `#/team/:id`, quyền theo server và điều hướng khi 403. Kế hoạch chi tiết hiện hành là `docs/specs/2026-10-09-web-dot-3-to-thanh-vien-plan.md`.

### Task 1: Create TeamsView Component
- Create `web/src/core/features/teams/TeamsView.tsx`.
- Header: "Tổ" and subtitle "Những con người và đơn vị cùng tạo nên các hoạt động."
- Cards grid for teams with color badge, description, metrics (members, active tasks/activities), and action buttons.

### Task 2: Unit Testing
- Create `web/src/core/features/teams/TeamsView.test.tsx`.
- Test header rendering and team cards presence.

### Task 3: Navigation Integration
- Update `web/src/shared/layouts/PageLayout.tsx` for "Các Tổ" (`teams`).
- Update `web/src/core/main.tsx` to mount `TeamsView` when `currentView === 'teams'`.
- Run full test suite.

## Lịch sử phiên bản
| Version | Ngày | Thay đổi | Người |
|---|---|---|---|
| 1.0 | 2026-10-08 | Khởi tạo kế hoạch triển khai giao diện Các Tổ | DYC |
| 1.1 | 2026-10-08 | Tích hợp React Query với API /api/teams thực tế, xóa mock | DYC |
| 1.2 | 2026-10-09 | Trỏ tới kế hoạch đợt 3 hiện hành, đã hoàn tất luồng quản lý Tổ và thành viên | DYC |

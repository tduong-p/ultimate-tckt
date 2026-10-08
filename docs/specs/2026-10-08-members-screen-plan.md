---
doc_id: PLAN-MEMBERS-001
title: Plan — Members Screen UI Implementation
version: 1.0
status: active
audience: [dev, ai]
owner: DYC
updated: 2026-10-08
related_code: [web/src/core/features/members/MembersView.tsx]
---

# Members Screen Implementation Plan

## Tasks

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
- 1.0 (2026-10-08): Khởi tạo kế hoạch triển khai giao diện Thành viên.

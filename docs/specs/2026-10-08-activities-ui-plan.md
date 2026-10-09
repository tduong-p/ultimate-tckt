---
doc_id: PLAN-ACTIVITIES-001
title: Plan — Activities & Projects Screen UI Implementation
version: 1.3
status: active
audience: [dev, ai]
owner: DYC
updated: 2026-10-09
related_code: [web/src/core/features/activities/**]
---

# Activities & Projects Screen Implementation Plan

## Tasks

### Task 1: Create ActivitiesView Component
- Create `web/src/core/features/activities/ActivitiesView.tsx`.
- Include "+ Đề xuất hoạt động" primary button connected to `<CreateActivityModal />`.
- Build Search bar & Select dropdowns ("Tất cả trạng thái", "Tất cả loại").
- Build Activity Card displaying metadata, teams, Lozenge status, title, description, and progress bar.

### Task 2: Unit Testing
- Create `web/src/core/features/activities/ActivitiesView.test.tsx`.
- Test header, search input, filter dropdowns, card rendering, and opening the CreateActivityModal when clicking the button.

### Task 3: Navigation Integration
- Update `web/src/shared/layouts/PageLayout.tsx` for "Hoạt động & Dự án" (`activities`).
- Update `web/src/core/main.tsx` to mount `ActivitiesView` when `currentView === 'activities'`.
- Run full test suite.

## Lịch sử phiên bản
| Version | Ngày | Thay đổi | Người |
|---|---|---|---|
| 1.0 | 2026-10-08 | Khởi tạo kế hoạch triển khai giao diện Hoạt động & Dự án | DYC |
| 1.1 | 2026-10-08 | Tích hợp React Query với API activities/teams thực tế, xóa mock | DYC |
| 1.2 | 2026-10-09 | Đợt 1 SPEC-WEB-003 đổi code liên quan; nội dung kế hoạch không đổi, xem spec tương ứng và SPEC-WEB-003 mục 4.1 | DYC |
| 1.3 | 2026-10-09 | Cập nhật thanh hành động và tạo nhiệm vụ từ chi tiết hoạt động (PR #88) | DYC |

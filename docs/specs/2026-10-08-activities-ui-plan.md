---
doc_id: PLAN-ACTIVITIES-001
title: Plan — Activities & Projects Screen UI Implementation
version: 1.0
status: active
audience: [dev, ai]
owner: DYC
updated: 2026-10-08
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
- 1.0 (2026-10-08): Khởi tạo kế hoạch triển khai giao diện Hoạt động & Dự án.

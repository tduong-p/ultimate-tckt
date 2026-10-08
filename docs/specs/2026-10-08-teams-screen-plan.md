---
doc_id: PLAN-TEAMS-001
title: Plan — Teams Screen UI Implementation
version: 1.0
status: active
audience: [dev, ai]
owner: DYC
updated: 2026-10-08
related_code: [web/src/core/features/teams/TeamsView.tsx]
---

# Teams Screen Implementation Plan

## Tasks

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
- 1.0 (2026-10-08): Khởi tạo kế hoạch triển khai giao diện Các Tổ.

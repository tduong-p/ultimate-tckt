---
doc_id: PLAN-REPORTS-001
title: Plan — Reports Screen UI Implementation
version: 1.0
status: active
audience: [dev, ai]
owner: DYC
updated: 2026-10-08
related_code: [web/src/core/features/reports/ReportsView.tsx]
---

# Reports Screen Implementation Plan

## Tasks

### Task 1: Create ReportsView Component
- Create `web/src/core/features/reports/ReportsView.tsx`.
- Header: "Báo cáo" and subtitle.
- Form card with start/end date inputs, team selector, report note, and "Xuất báo cáo Excel" button.

### Task 2: Unit Testing
- Create `web/src/core/features/reports/ReportsView.test.tsx`.
- Test header rendering, form controls, and export button.

### Task 3: Navigation Integration
- Update `web/src/shared/layouts/PageLayout.tsx` for "Báo cáo" (`reports`).
- Update `web/src/core/main.tsx` to mount `ReportsView` when `currentView === 'reports'`.
- Run full test suite.

## Lịch sử phiên bản
- 1.0 (2026-10-08): Khởi tạo kế hoạch triển khai giao diện Báo cáo.

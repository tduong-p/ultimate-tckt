---
doc_id: PLAN-CALENDAR-001
title: Plan — Calendar Screen UI Implementation
version: 1.1
status: active
audience: [dev, ai]
owner: DYC
updated: 2026-10-08
related_code: [web/src/core/features/calendar/**]
---

# Calendar Screen Implementation Plan

## Tasks

### Task 1: Create CalendarView Component
- Create `web/src/core/features/calendar/CalendarView.tsx`.
- Implement page header: "Lịch chung" and subtitle.
- Implement toolbar: Month picker controls (`<`, `Tháng 10 năm 2026`, `>`, `Hôm nay`), Team filter dropdown (`Tất cả các Tổ`), and View switcher (`Tháng` / `Danh sách`).
- Build responsive calendar month grid with day numbers, highlighted today indicator (day 8), and previous/next month muted styling.

### Task 2: Unit Testing
- Create `web/src/core/features/calendar/CalendarView.test.tsx`.
- Test header rendering, toolbar items, today badge, and grid days.

### Task 3: Integration & Navigation
- Update `web/src/shared/layouts/PageLayout.tsx` to handle "Lịch hoạt động" navigation click and selection.
- Update `web/src/core/main.tsx` to mount `CalendarView` when `currentView === 'calendar'`.
- Verify full test suite.

## Lịch sử phiên bản
| Version | Ngày | Thay đổi | Người |
|---|---|---|---|
| 1.0 | 2026-10-08 | Khởi tạo kế hoạch triển khai giao diện Lịch chung | DYC |
| 1.1 | 2026-10-08 | Tích hợp React Query với API /api/activities và /api/teams, xóa mock | DYC |

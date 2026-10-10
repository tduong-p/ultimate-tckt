---
doc_id: PLAN-MYTASKS-001
title: Plan — My Tasks Screen UI Implementation
version: 1.4
status: active
audience: [dev, ai]
owner: DYC
updated: 2026-10-10
related_code: [web/src/core/features/tasks/MyTasksView.tsx]
---

# My Tasks Screen Implementation Plan

## Tasks

### Task 1: Create MyTasksView Component
- Create `web/src/core/features/tasks/MyTasksView.tsx`.
- Header: "Công việc của tôi" and subtitle.
- Card: "Công việc đang mở" with counter badge "• 0 Công Việc".
- Empty state: "Bạn đã hoàn thành tất cả" & "Không có công việc đang mở trong danh sách."

### Task 2: Unit Testing
- Create `web/src/core/features/tasks/MyTasksView.test.tsx`.
- Test header rendering, badge counter, and empty state messages.

### Task 3: Navigation Integration
- Update `web/src/shared/layouts/PageLayout.tsx` for "Công việc của tôi" (`my-tasks`).
- Update `web/src/core/main.tsx` to mount `MyTasksView` when `currentView === 'my-tasks'`.
- Run full test suite.

## Lịch sử phiên bản
| Version | Ngày | Thay đổi | Người |
|---|---|---|---|
| 1.0 | 2026-10-08 | Khởi tạo kế hoạch triển khai giao diện Công việc của tôi | DYC |
| 1.1 | 2026-10-08 | Tích hợp React Query với API /api/my-tasks-today thực tế, xóa mock | DYC |
| 1.2 | 2026-10-09 | Thêm nút thao tác việc vào thẻ việc (làm sớm từ PR #86); xem design 1.4 | DYC |
| 1.3 | 2026-10-09 | Đợt 2: tiêu đề công việc và nút tích tròn kết nối mở hộp chi tiết công việc; xem design 1.5 | DYC |
| 1.4 | 2026-10-10 | Bổ sung liên kết hoạt động `#/activity/:id` và bố cục responsive di động trong `MyTasksView.tsx`; xem design 1.6 | DYC |

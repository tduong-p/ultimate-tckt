---
doc_id: SPEC-ACTIVITIES-001
title: Design — Activities & Projects Screen UI (Hoạt động & Dự án)
version: 1.5
status: active
audience: [dev, ai]
owner: DYC
updated: 2026-10-09
related_code: [web/src/core/features/activities/**]
---

# Activities & Projects Screen UI Design (Hoạt động & Dự án)

## 1. Overview
The "Hoạt động & Dự án" screen enables members and leaders to view, plan, coordinate, and track all department activities and projects. It also includes the "+ Đề xuất hoạt động" action button that opens the proposal creation modal.

## 2. Layout & Structure

### Header
- **Title**: "Hoạt động"
- **Subtitle**: "Lập kế hoạch, phối hợp và theo dõi mọi hoạt động."
- **Action Button**: "+ Đề xuất hoạt động" (Primary button, opens `CreateActivityModal`) — chỉ hiện khi `capabilities.canCreateActivity` (cả ở header lẫn empty state).

### Filter & Search Bar
- **Search Input**: "Tìm kiếm hoạt động..."
- **Status Filter**: Dropdown "Tất cả trạng thái"; các trạng thái theo enum DB `proposed`, `changes_requested` ("Cần chỉnh sửa"), `approved`, `active`, `completed` — nhãn và màu lozenge lấy từ `features/activities/activityLabels.ts`.
- Tìm kiếm debounce 300 ms, máy chủ lọc (không lọc lại phía client).
- **Type Filter**: Dropdown "Tất cả loại" (All types)

### Activity Cards Grid
- Card with subtle border, shadow, and rounded corners:
  - Top colored accent indicator
  - Participating teams tag list
  - Status Lozenge (e.g. `Đã Duyệt` - Success)
  - Activity Title & Description snippet
  - Bottom metadata: Event type, participant count, date
  - Visual progress bar indicator (ưu tiên `progress_percent` khi có)
- Dòng tóm tắt hoạt động của đơn vị khác (`toSummaryView`) không có loại/Tổ/số công việc: không hiện nhãn loại hay Tổ sai, chỉ hiện phần có dữ liệu.

Cập nhật 2026-10-09 (đợt 1 SPEC-WEB-003): Thẻ hoạt động bấm được để mở `#/activity/:id`; link đề án hợp lệ được hiển thị trên thẻ.

## Lịch sử phiên bản
| Version | Ngày | Thay đổi | Người |
|---|---|---|---|
| 1.0 | 2026-10-08 | Khởi tạo tài liệu thiết kế giao diện Hoạt động & Dự án | DYC |
| 1.1 | 2026-10-08 | Tích hợp React Query với API activities/teams thực tế, xóa mock | DYC |
| 1.2 | 2026-10-09 | Trạng thái `changes_requested` ("Cần chỉnh sửa") và nhãn dùng chung `activityLabels.ts`; nút đề xuất theo `canCreateActivity`; dòng tóm tắt đơn vị khác; tìm kiếm debounce do máy chủ lọc | DYC |
| 1.3 | 2026-10-09 | Đợt 1 SPEC-WEB-003: thẻ hoạt động mở chi tiết và có link đề án | DYC |
| 1.4 | 2026-10-09 | Cập nhật thanh hành động và tạo nhiệm vụ từ chi tiết hoạt động (PR #88) | DYC |
| 1.5 | 2026-10-09 | Đợt 2 SPEC-WEB-003: chi tiết hoạt động gắn Bảng Kanban, Giao việc, Tự ghi nhận, tiêu đề việc mở hộp chi tiết và thêm tài liệu | DYC |

---
doc_id: SPEC-WEB-002
title: Dashboard UI Design (Atlassian Design System)
version: 1.2
status: active
audience: [dev, ai]
owner: AI
updated: 2026-10-08
related_code: [web/src/core/features/dashboard/**]
---

# Dashboard UI Design Spec

**Goal:** Implement the 'Tổng quan' (Dashboard) static UI for the web module using Atlassian Design System, based on the approved Executive Workspace mockup.

## Architecture & Components

The Dashboard will be implemented in web/src/core/features/dashboard/Dashboard.tsx. It will use mock data for the UI POC.

### 1. Header Section
- **Greeting:** A simple greeting text e.g., 'Xin chào <tên người dùng trong phiên>! Bạn có 0 nhiệm vụ cần làm.' — tên lấy từ prop `userName` (`session.user.name`), không hard-code (The large department title is EXPLICITLY REMOVED as requested).
- **Actions (Right-aligned):** 
  - '+ Đề xuất hoạt động' (Primary Button)
  - 'Lịch sự kiện' (Default Button)
  - 'Hoạt động' (Default Button)

### 2. KPI Cards (Top Row)
A CSS Grid containing 4 identical-sized cards with elevation.surface.raised:
1. **Hoạt động đang diễn ra:** Rocket icon, 'Đang chạy' badge (green).
2. **Nhiệm vụ đang mở:** Clipboard icon, 'Cần xử lý' badge (blue).
3. **Nhiệm vụ quá hạn:** Warning icon, 'Đúng tiến độ' (or equivalent) badge.
4. **Hiệu suất hoàn thành:** Shows percentage, a progress bar, and a '0đ' token badge.

### 3. Main Layout (2 Columns)
A Flexbox or CSS Grid layout splitting the lower section: Left (approx 60-65%), Right (approx 35-40%).

**Left Column (Task Widget - Quản lý nhiệm vụ):**
- **Tabs/Filters:** 'Cần làm', 'Hôm nay', 'Quá hạn', 'Đã xong'.
- **Search:** Textfield for 'Lọc theo tên...'.
- **Content:** Empty state illustration ('Không tìm thấy công việc nào') with a friendly message.
- **Footer:** Links to 'Xem toàn bộ công việc chi tiết' and total task count.

**Right Column (Updates Widgets):**
A stack of 3 distinct cards:
1. **Lịch sự kiện & Deadline:** Left calendar date block (Month/Day), Right event details.
2. **Hoạt động đang diễn ra:** Activity name, 'Đã Duyệt' badge, Atlassian ProgressBar, and quick action links.
3. **Nhật ký hoạt động (Activity Stream):** A vertical list of recent actions. Each item has a user Avatar, user name (bold), action badge (e.g., 'Bình luận', 'Minh chứng'), action description text, and timestamp/project link.

## Implementation Details
- All components must use @atlaskit/tokens for colors, spacing, and typography to support Dark Mode natively.
- No real API integration; all data arrays will be hardcoded in the component or a local mock file.
- Add the Dashboard component to the PageLayout routing/tab selection so it can be viewed.

## Lịch sử phiên bản
| Version | Ngày | Thay đổi | Người |
|---|---|---|---|
| 1.0 | 2026-10-08 | Khởi tạo spec cho trang Tổng quan | AI |
| 1.1 | 2026-10-08 | Kết nối Dashboard với API GET /api/bootstrap và xóa KPI mock | AI |
| 1.2 | 2026-10-08 | Lời chào lấy tên người dùng từ phiên (`userName`), hai nút điều hướng sang Lịch chung/Hoạt động qua `onNavigate` | DYC |

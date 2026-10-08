---
doc_id: SPEC-WEB-002
title: Dashboard UI Design (Atlassian Design System)
version: 1.3
status: active
audience: [dev, ai]
owner: AI
updated: 2026-10-09
related_code: [web/src/core/features/dashboard/**]
---

# Dashboard UI Design Spec

**Goal:** Implement the 'Tổng quan' (Dashboard) static UI for the web module using Atlassian Design System, based on the approved Executive Workspace mockup.

## Architecture & Components

The Dashboard is implemented in web/src/core/features/dashboard/Dashboard.tsx, using real data from `GET /api/bootstrap` (query key `core-bootstrap`) and `GET /api/my-tasks-today` (`core-my-tasks-today`).

### 1. Header Section
- **Greeting:** A simple greeting text e.g., 'Xin chào <tên người dùng trong phiên>! Có N nhiệm vụ đang mở trong phạm vi của bạn.' (N = `stats.openTasks`, theo phạm vi vai trò: admin thấy mọi việc, Tổ trưởng/Tổ phó thấy việc của Tổ mình + việc được giao, thành viên thấy việc được giao) — tên lấy từ prop `userName` (`session.user.name`), không hard-code (The large department title is EXPLICITLY REMOVED as requested).
- **Actions (Right-aligned):** 
  - '+ Đề xuất hoạt động' (Primary Button) — chỉ hiện khi `capabilities.canCreateActivity` (admin/vice_admin hoặc Tổ trưởng/Tổ phó, giống middleware `manager` của `POST /api/activities`)
  - 'Lịch sự kiện' (Default Button)
  - 'Hoạt động' (Default Button)

### 2. KPI Cards (Top Row)
A CSS Grid containing 4 identical-sized cards with elevation.surface.raised:
1. **Hoạt động đang diễn ra:** Rocket icon, 'Đang chạy' badge (green).
2. **Nhiệm vụ đang mở:** Clipboard icon, 'Cần xử lý' badge (blue).
3. **Nhiệm vụ quá hạn:** Warning icon, 'Đúng tiến độ' (or equivalent) badge.
4. **Hoàn thành tháng này:** `stats.completedMonth`, chú thích "Tính trên các hoạt động bạn xem được". Không tính phần trăm (hai số liệu khác phạm vi) và không có badge điểm.

### 3. Main Layout (2 Columns)
A Flexbox or CSS Grid layout splitting the lower section: Left (approx 60-65%), Right (approx 35-40%).

**Left Column (Task Widget - Quản lý nhiệm vụ):**
- **Tabs/Filters:** 'Cần làm', 'Hôm nay', 'Quá hạn' — chỉ dùng dữ liệu `/api/my-tasks-today` của chính người dùng (không lấy `bootstrap.tasks` bù khi rỗng). Trạng thái/ưu tiên hiển thị tiếng Việt qua `tasks/taskLabels.ts`.
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
- Không dùng dữ liệu mock; ngày hiển thị theo giờ Việt Nam qua `shared/utils/date.ts`.
- Add the Dashboard component to the PageLayout routing/tab selection so it can be viewed.

## Lịch sử phiên bản
| Version | Ngày | Thay đổi | Người |
|---|---|---|---|
| 1.0 | 2026-10-08 | Khởi tạo spec cho trang Tổng quan | AI |
| 1.1 | 2026-10-08 | Kết nối Dashboard với API GET /api/bootstrap và xóa KPI mock | AI |
| 1.2 | 2026-10-08 | Lời chào lấy tên người dùng từ phiên (`userName`), hai nút điều hướng sang Lịch chung/Hoạt động qua `onNavigate` | DYC |
| 1.3 | 2026-10-09 | Đồng bộ với code: dữ liệu thật từ `/api/bootstrap` + `/api/my-tasks-today`; nút đề xuất theo `canCreateActivity`; KPI 4 = "Hoàn thành tháng này"; bỏ tab "Đã xong" và fallback; nhãn tiếng Việt; câu chào theo phạm vi | DYC |

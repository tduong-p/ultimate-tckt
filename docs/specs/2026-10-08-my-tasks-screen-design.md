---
doc_id: SPEC-MYTASKS-001
title: Design — My Tasks Screen UI (Công việc của tôi)
version: 1.6
status: active
audience: [dev, ai]
owner: DYC
updated: 2026-10-10
related_code: [web/src/core/features/tasks/MyTasksView.tsx]
---

# My Tasks Screen UI Design (Công việc của tôi)

## 1. Overview
The "Công việc của tôi" screen displays tasks assigned to the current member and their teams.

## 2. Layout & Structure

### Header
- **Title**: "Công việc của tôi"
- **Subtitle**: "Công việc được giao cho bạn và các Tổ của bạn."

### Tasks Card
- Raised surface card matching Atlassian elevation tokens.
- **Card Header**:
  - Title: "Công việc đang mở"
  - Counter pill: "• 0 Công Việc"
- **Nguồn dữ liệu**: `bootstrap.tasks` (cùng `taskScope` với `stats.openTasks`, đã loại `done`/`cancelled`, tối đa 100 việc) + `pendingMyReview` từ `/api/my-tasks-today`, loại trùng theo id.
- **Nhóm**: "Quá hạn", "Hôm nay", "Sắp tới", "Chờ bạn duyệt" — nhóm rỗng thì ẩn. Ngày so theo giờ Việt Nam.
- **Tương tác**: Tiêu đề công việc là `TaskTitleButton` mở hộp chi tiết công việc `TaskDetailModal`; tên hoạt động dẫn tới `#/activity/:id` khi có `activity_id`. Nút tích tròn `TaskCheckButton` bật khi người dùng được giao và việc còn `todo`/`in_progress`, bấm mở hộp chi tiết và cuộn tới phần nộp nghiệm thu.
- **Empty State Box** (chỉ khi tổng bằng 0):
  - Sunken / neutral subtle background container with icon.
  - Message: "Bạn đã hoàn thành tất cả" (bold).
  - Subtext: "Không có công việc đang mở trong danh sách."

## Lịch sử phiên bản
| Version | Ngày | Thay đổi | Người |
|---|---|---|---|
| 1.0 | 2026-10-08 | Khởi tạo tài liệu thiết kế giao diện Công việc của tôi | DYC |
| 1.1 | 2026-10-08 | Tích hợp React Query với API /api/my-tasks-today thực tế, xóa mock | DYC |
| 1.2 | 2026-10-08 | Trạng thái `open` của Core hiển thị "Cần làm"; hạn chót định dạng theo giờ Việt Nam | DYC |
| 1.3 | 2026-10-09 | Hiện mọi việc đang mở trong phạm vi (gồm việc hạn tương lai) từ `bootstrap.tasks`, nhóm Quá hạn/Hôm nay/Sắp tới/Chờ bạn duyệt | DYC |
| 1.4 | 2026-10-09 | Mỗi thẻ việc có nút thao tác theo trạng thái (`TaskActionButtons`): Nhận việc, Bắt đầu làm, Nộp nghiệm thu, Tạm dừng; nhóm Chờ bạn duyệt thêm Duyệt đạt, Yêu cầu làm lại, Bác bỏ | DYC |
| 1.5 | 2026-10-09 | Đợt 2: tiêu đề công việc và nút tích tròn mở hộp chi tiết công việc `TaskDetailModal` | DYC |
| 1.6 | 2026-10-10 | Tên hoạt động dẫn tới `#/activity/:id`; dòng thẻ việc tự động xuống dòng trên màn hình di động (`<= 768px`) | DYC |

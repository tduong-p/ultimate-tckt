---
doc_id: SPEC-PROPTASK-002
title: Kế hoạch triển khai — Bổ sung Luồng Phê duyệt Đề xuất Hoạt động và Quản lý Vòng đời Nhiệm vụ (Core Web)
version: 1.1
status: active
audience: [dev, ai]
owner: DYC
updated: 2026-10-09
related_code: [web/src/core/**, web/src/shared/**]
---

# Kế hoạch triển khai — Bổ sung Luồng Phê duyệt Đề xuất Hoạt động và Quản lý Vòng đời Nhiệm vụ (Core Web)

## 1. Mục tiêu
Triển khai toàn bộ tính năng theo thiết kế [`SPEC-PROPTASK-001`](./2026-10-09-proposals-and-tasks-design.md) bằng phương pháp Test-Driven Development (TDD), chia thành 4 tác vụ tuần tự rõ ràng.

## 2. Danh sách Tác vụ (Tasks)

### Tác vụ 1: Mở rộng API Client & Kiểm thử tầng API (`web/src/core/api/`) — [ĐÃ HOÀN THÀNH - Commit `c197dfe`]
- **Tệp sửa:** `web/src/core/api/types.ts`, `web/src/core/api/index.ts`, `web/src/core/api/index.test.ts`.
- **Mô tả:** Thêm các định nghĩa types và các hàm API:
  - `approveActivity`, `rejectActivity`, `requestChangesActivity`, `submitActivityProposal`.
  - `createActivityTask`.
  - `acknowledgeTask`, `updateTaskStatus`, `submitTaskReview`, `reviewTask`, `toggleTaskChecklist`.
- **Kiểm thử:** Viết unit tests kiểm tra từng hàm API với mock `apiClient` (34/34 tests xanh).

### Tác vụ 2: Cụm nút Phê duyệt Đề xuất trong `ActivityDetailModal` — [ĐÃ HOÀN THÀNH - Commit `ec6293f`]
- **Tệp sửa/tạo:**
  - `web/src/core/features/calendar/ActivityDetailModal.tsx`
  - `web/src/core/features/calendar/ActivityDetailModal.test.tsx`
  - `web/src/core/features/calendar/CalendarView.tsx`, `CalendarView.test.tsx`
  - `web/src/core/features/activities/ActivitiesView.tsx`, `ActivitiesView.test.tsx`
- **Mô tả:**
  - Bổ sung cụm nút hành động cho Ban Điều hành khi xem hoạt động ở trạng thái `proposed` (`Phê duyệt`, `Yêu cầu sửa đổi`, `Từ chối`).
  - Hỗ trợ prompt phản hồi lý do khi yêu cầu sửa đổi hoặc từ chối.
  - Hỗ trợ nút nộp lại (`submit`) khi trạng thái là `changes_requested`.
- **Kiểm thử:** Component tests kiểm tra quyền hiển thị và hành vi click gọi mutation (9/9 tests xanh).

### Tác vụ 3: Modal Tạo Nhiệm vụ con cho Hoạt động (`CreateTaskModal`) — [ĐÃ HOÀN THÀNH - Commit `93ad820`]
- **Tệp sửa/tạo:**
  - `web/src/core/features/tasks/CreateTaskModal.tsx`
  - `web/src/core/features/tasks/CreateTaskModal.test.tsx`
  - Tích hợp nút mở modal bên trong `ActivityDetailModal.tsx`.
- **Mô tả:**
  - Form thêm nhiệm vụ với: Tiêu đề, Tổ phụ trách, Giai đoạn, Người phụ trách chính (lọc theo tổ), Deadline, Sản phẩm bàn giao, Mô tả.
  - Validation hợp lệ và gọi `createActivityTask`.
- **Kiểm thử:** Component tests kiểm tra form submission và validation (7/7 tests xanh).

### Tác vụ 4: Vòng đời & Tương tác Nhiệm vụ trong `MyTasksView` & `MyTasksToday` — [ĐÃ HOÀN THÀNH - Commit `ff48b4e`]
- **Tệp sửa/tạo:**
  - `web/src/core/features/tasks/SubmitReviewModal.tsx`, `SubmitReviewModal.test.tsx`
  - `web/src/core/features/tasks/ReviewDecisionModal.tsx`, `ReviewDecisionModal.test.tsx`
  - `web/src/core/features/tasks/TaskActionButtons.tsx`, `TaskActionButtons.test.tsx`
  - `web/src/core/features/tasks/MyTasksView.tsx`, `web/src/core/features/tasks/MyTasksView.test.tsx`
  - `web/src/core/features/tasks/MyTasksToday.tsx`, `web/src/core/features/tasks/MyTasksToday.test.tsx`
- **Mô tả:**
  - Nút "Xác nhận nhận việc" khi chưa acknowledge.
  - Nút chuyển trạng thái nhanh (`todo` -> `in_progress`, `in_progress` -> `todo`).
  - Dialog nộp nghiệm thu (`submit-review`) với ghi chú/link minh chứng -> chuyển sang `review`.
  - Cụm nút nghiệm thu cho Lãnh đạo (`approve` / `reject` có feedback).
- **Kiểm thử:** Component tests kiểm tra luồng tương tác trạng thái (32/32 tests xanh).

## Lịch sử phiên bản
| Version | Ngày | Thay đổi | Người |
|---|---|---|---|
| 1.0 | 2026-10-09 | Khởi tạo kế hoạch triển khai luồng phê duyệt và quản lý nhiệm vụ | AI Agent |
| 1.1 | 2026-10-09 | Cập nhật hoàn thành 4 tác vụ với mã commit chi tiết | AI Agent |

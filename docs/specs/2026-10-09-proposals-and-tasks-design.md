---
doc_id: SPEC-PROPTASK-001
title: Thiết kế — Bổ sung Luồng Phê duyệt Đề xuất Hoạt động và Quản lý Vòng đời Nhiệm vụ (Core Web)
version: 1.0
status: active
audience: [dev, ai]
owner: DYC
updated: 2026-10-09
related_code: [web/src/core/**, web/src/shared/**]
---

# Thiết kế — Bổ sung Luồng Phê duyệt Đề xuất Hoạt động và Quản lý Vòng đời Nhiệm vụ (Core Web)

## 1. Mục tiêu và Phạm vi
- **Mục tiêu**: Bổ sung đầy đủ các tương tác ghi/duyệt dữ liệu cốt lõi trên frontend `web/src/core/` nhằm đạt sự tương đồng tính năng (feature parity) với giao diện cũ (`core/public/app.js`), gồm:
  1. Luồng duyệt đề xuất hoạt động cho Ban Điều hành (`approve`, `request-changes`, `reject`, `submit`).
  2. Tạo và phân công nhiệm vụ con (Work Plan) bên trong hoạt động (`/api/activities/:id/tasks`).
  3. Quản lý trạng thái và vòng đời nhiệm vụ cá nhân (`acknowledge`, `status`, `submit-review`, `review`, `checklist`).
- **Phạm vi tác động**: Hoàn toàn nằm trong module Web (`web/**`) và tài liệu (`docs/specs/**`).
- **Ràng buộc bất biến**:
  - Tuyệt đối không thay đổi schema database và không sửa đổi backend `core/`.
  - Không vi phạm nguyên tắc empty state: không dùng checkbox icon trong empty states.
  - Tuân thủ Atlassian Design System (ADS) và các token màu sắc/elevation.

## 2. Thiết kế API Client (`web/src/core/api/index.ts`)
Bổ sung các kiểu dữ liệu và hàm gọi API kết nối backend Express:
```typescript
// Luồng đề xuất hoạt động
export async function approveActivity(activityId: number): Promise<{ ok: boolean }>;
export async function rejectActivity(activityId: number, feedback: string): Promise<{ ok: boolean; deleted?: boolean }>;
export async function requestChangesActivity(activityId: number, feedback: string): Promise<{ ok: boolean }>;
export async function submitActivityProposal(activityId: number): Promise<{ ok: boolean }>;

// Tạo nhiệm vụ con cho hoạt động
export interface CreateTaskPayload {
  title: string;
  description?: string;
  stage?: 'before' | 'during' | 'after' | 'general';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  team_id: number;
  primary_assignee_id: number;
  co_assignee_ids?: number[];
  start_date?: string | null;
  deadline: string;
  deliverable?: string | null;
}
export async function createActivityTask(activityId: number, payload: CreateTaskPayload): Promise<{ id: number }>;

// Quản lý nhiệm vụ (Tasks)
export async function acknowledgeTask(taskId: number): Promise<{ ok: boolean }>;
export async function updateTaskStatus(taskId: number, status: 'todo' | 'in_progress'): Promise<{ ok: boolean }>;
export async function submitTaskReview(taskId: number, payload: { notes?: string; link_url?: string }): Promise<{ ok: boolean }>;
export async function reviewTask(taskId: number, payload: { decision: 'approve' | 'reject' | 'cancel'; feedback?: string }): Promise<{ ok: boolean }>;
export async function toggleTaskChecklist(taskId: number, itemId: number, isDone: boolean): Promise<{ ok: boolean }>;
export async function addTaskChecklistItem(taskId: number, title: string): Promise<{ id: number }>;
export async function deleteTaskChecklistItem(taskId: number, itemId: number): Promise<{ ok: boolean }>;
```

## 3. Thiết kế Giao diện Chi tiết Hoạt động (`ActivityDetailModal.tsx` & `CreateTaskModal.tsx`)

### 3.1 Cụm nút Phê duyệt Đề xuất Hoạt động
Trong [`ActivityDetailModal.tsx`](file:///d:/ultimate-tckt/web/src/core/features/calendar/ActivityDetailModal.tsx):
- Khi hoạt động ở trạng thái `proposed` và người dùng có quyền quản lý/admin (`canCreateActivity` hoặc `isLeadership`):
  - **Nút "Phê duyệt"** (`appearance="primary"`): Kích hoạt `approveActivity`. Cập nhật trạng thái thành công sang `approved` và làm mới danh sách `core-activities`.
  - **Nút "Yêu cầu sửa đổi"** (`appearance="warning"`): Mở form prompt nhập phản hồi bắt buộc -> Gọi `requestChangesActivity`.
  - **Nút "Từ chối"** (`appearance="danger"`): Mở dialog xác nhận lý do từ chối -> Gọi `rejectActivity`.
- Khi hoạt động ở trạng thái `changes_requested` và người tạo xem:
  - **Nút "Nộp lại đề xuất"** (`appearance="primary"`): Gọi `submitActivityProposal`.

### 3.2 Tab Kế hoạch công việc & Form "Thêm nhiệm vụ" (`CreateTaskModal.tsx`)
- Hiển thị danh sách nhiệm vụ con thuộc hoạt động.
- Nút **"Thêm nhiệm vụ"** mở `CreateTaskModal`:
  - Lựa chọn Tổ phụ trách (chỉ lọc các tổ người dùng được quản lý hoặc toàn bộ tổ nếu là admin).
  - Chọn Người phụ trách chính (tự động load danh sách thành viên thuộc Tổ đã chọn).
  - Chọn các thành viên cùng phụ trách (Co-assignees).
  - Chọn giai đoạn (Trước sự kiện, Trong sự kiện, Sau sự kiện, Chung).
  - Chọn mức độ ưu tiên và hạn chót (Deadline).

## 4. Thiết kế Tương tác Nhiệm vụ Cá nhân (`MyTasksView.tsx` & `MyTasksToday.tsx`)
1. **Xác nhận đã nhận việc (`Acknowledge`):**
   - Nếu nhiệm vụ được giao chưa được xác nhận, hiển thị nút/lozenge nổi bật "Xác nhận nhận việc".
2. **Chuyển đổi trạng thái:**
   - Nút hành động nhanh: "Bắt đầu làm" (từ `todo` sang `in_progress`), hoặc chuyển ngược lại.
3. **Nộp nghiệm thu (`Submit Review`):**
   - Khi hoàn tất công việc, nút "Nộp nghiệm thu" mở popup nhập link kết quả/minh chứng và ghi chú bàn giao -> gọi `submitTaskReview` -> chuyển trạng thái sang `review`.
4. **Nghiệm thu công việc (Dành cho Leader/Admin):**
   - Với các nhiệm vụ ở trạng thái `review`, người quản lý thấy cụm nút:
     - `Duyệt đạt` (`approve` -> `done`).
     - `Yêu cầu làm lại` (`reject` -> `in_progress` kèm feedback).

## 5. Kế hoạch Kiểm thử & Đảm bảo Chất lượng
1. **Unit & Component Testing:**
   - Test suite cho các API mới trong `api/index.test.ts`.
   - Test suite cho cụm nút duyệt trong `ActivityDetailModal.test.tsx`.
   - Test suite cho `CreateTaskModal.test.tsx`.
   - Test suite cho các tương tác trạng thái trong `MyTasksView.test.tsx`.
2. **Kiểm tra tài liệu & CI:**
   - Chạy `npm run docs:index` và `node tools/docs-check/cli.js check --base staging`.
   - Chạy toàn bộ test `npm --prefix web test`.

## Lịch sử phiên bản
| Version | Ngày | Thay đổi | Người |
|---|---|---|---|
| 1.0 | 2026-10-09 | Khởi tạo tài liệu thiết kế tính năng phê duyệt đề xuất và quản lý nhiệm vụ trên web/ | AI Agent |

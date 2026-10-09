---
doc_id: PLAN-WEBP2-001
title: Kế hoạch triển khai — web/ đợt 2 (công việc và Kanban)
version: 1.2
status: completed
audience: [dev, ai]
owner: DYC
updated: 2026-10-09
related_code: []
---

# web/ đợt 2 — Công việc và Kanban Implementation Plan

> **Đã làm sớm (nhánh `feature/web-merge-pr86`, port từ PR #86 — chưa merge):** tầng API và kiểu dữ liệu công việc (một phần Task 1: tạo, nhận, đổi trạng thái, nộp/duyệt nghiệm thu, checklist, chi tiết), `TaskActionButtons`, `SubmitReviewModal`, `ReviewDecisionModal`, `useTaskMutation` (một phần Task 3), `CreateTaskModal` và nút "Tạo nhiệm vụ" ở trang chi tiết hoạt động (Task 9, Task 12), nút vòng đời ở Việc của tôi / Việc hôm nay (một phần Task 7–8). **Khi thực thi: đối chiếu từng task với code trên nhánh đó, bỏ phần đã có, giữ phần chưa có** (hộp chi tiết `#task/:id`, bình luận, tài liệu, sửa công việc, SelfLog, Kanban chưa làm; `fetchTaskDetail` và hàm checklist đã có nhưng chưa có UI).

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Đưa toàn bộ phần "Công việc" của UI cũ sang `web/` (giao việc, chi tiết công việc dạng modal, xác nhận, đổi trạng thái, checklist, tài liệu, bình luận, nộp và duyệt nghiệm thu, tự ghi nhận, rút lại, Kanban, nút ở "Việc hôm nay"), cộng hai cải tiến đang "Sắp có": **sửa công việc** và **xoá việc con**.

**Architecture:** Mọi thao tác công việc nằm trong `web/src/core/features/tasks/`. Một `TaskModalProvider` (gắn trong `SignedInShell`) giữ hộp chi tiết công việc; mọi danh sách gọi `useTaskModal().open(id)`; route `#task/:id` mở cùng hộp đó trên nền Tổng quan. Các hộp nhỏ (nộp nghiệm thu, duyệt, thêm tài liệu, sửa, giao việc, tự ghi nhận) là thành phần riêng, tự gọi `useMutation` và làm mới cache qua một hook `useInvalidateTaskCaches`. Quyền ẩn/hiện tính ở hàm thuần `taskPermissions.ts`, nối với `useCapabilities()` của đợt 0. Không đổi `core/`.

**Tech Stack:** React 18, TypeScript, Vite, Vitest + jsdom + @testing-library/react 14, @tanstack/react-query 5, react-router-dom 6, Atlaskit (`modal-dialog`, `button/new`, `textfield`, `textarea`, `lozenge`, `flag` qua `Toast`). Ô chọn dùng `<select>` gốc như `UnitSwitcher`.

**Spec:** `docs/specs/2026-10-09-web-hoan-thien-thay-the-design.md` (SPEC-WEB-003, mục 2, 3, 4.2, 7).

## Giả định từ đợt 0 và đợt 1 (kiểm tra ở Task 1 bước 1)

Đợt 0 (đã có trên nhánh): `ApiError`/`apiErrorMessage`/`translateServerError` ở `web/src/core/api/errors.ts`, bảng `errorMessages.ts`, `queryKeys.ts` (`SESSION_KEY`, `BOOTSTRAP_KEY`), `useCapabilities()` (`isExec`, `isManager`, `canManageTeam(teamId)`), `Toast`/`useToast`, `ConfirmDialog`, `ReasonDialog` (không dùng ở đợt này — hộp duyệt riêng), `PeoplePicker`, `LinkField`, `QuotaBar`, `normalizeSearch`, `isHttpUrl`, `formatBytes`, `AppRoutes.tsx` (HashRouter), `PageLayout`.

Đợt 1 (giả định, **chưa có khi viết plan này**): trang chi tiết hoạt động `web/src/core/features/activities/ActivityDetailView.tsx` tại route `/activity/:id` (`#activity/:id`), đọc `GET /api/activities/:id` và nhận `canManage`, `activityTeams`, `tasks` từ phản hồi đó. Đợt 2 **chỉ cần** ba thứ từ đợt 1, và chỉ động tới đúng ba chỗ ở Task 12:
1. Route `/activity/:id` tồn tại (Kanban và hộp chi tiết công việc link tới đó).
2. Prefix query key của dữ liệu chi tiết hoạt động. Đợt 2 giả định `['core-activity', <id>]` và khai báo hằng `ACTIVITY_PREFIX` ở `queryKeys.ts`. Nếu đợt 1 đặt khác, **chỉ sửa hằng này** — mọi nơi làm mới cache đi qua nó.
3. Trong `ActivityDetailView`: chỗ đặt nút ở đầu trang và dòng việc trong "Kế hoạch công việc". Task 12 nối vào đó.

Đợt 2 tự định nghĩa `fetchActivityBoard(id)` (cùng endpoint `GET /api/activities/:id`, kiểu hẹp `ActivityBoardData`) trong `api/tasks.ts` để không phụ thuộc tên hàm của đợt 1. Nếu đợt 1 dùng cùng key `['core-activity', id]` thì hai nơi dùng chung cache (phản hồi là cùng một object).

## Global Constraints

- Chỉ tiếng Việt; không có ô tải tệp. Tài liệu, minh chứng và nghiệm thu chỉ bằng link (`LinkField`, http/https). Gửi multipart đúng như spec nhưng **không bao giờ** gắn `file`.
- Làm theo luật server, không chép lỗi UI cũ: trọng số tự ghi nhận là số nguyên 0–10; nộp nghiệm thu bắt buộc link; Kanban/ô trạng thái chỉ chuyển trực tiếp `todo ↔ in_progress` (sang "Chờ duyệt" qua hộp nộp nghiệm thu, sang "Hoàn thành" qua hộp duyệt); bộ lọc và nhãn có `changes_requested` là việc của đợt 1, không thuộc đợt này.
- Không đổi API Core. Chỉ dùng endpoint có thật: `GET/PATCH /api/tasks/:id`, `POST /api/tasks/:id/{acknowledge,checklist,attachments,submit-review,review,cancel}`, `PATCH /api/tasks/:id/status`, `PATCH|DELETE /api/tasks/:id/checklist/:itemId`, `POST /api/activities/:id/{tasks,log-task,updates}`, `GET /api/activities/:id`, `GET /api/teams/:id/members`, `GET /api/weight-presets`, `GET /api/task-attachments/:id/content`.
- Điều kiện ẩn/hiện bắt chước server (lấy từ `core/src/routes/tasks.js`, `core/src/routes/activities.js`, `core/src/policies/access.js`); server vẫn là nơi chặn cuối:
  - Sửa công việc (`PATCH /api/tasks/:id`): chỉ `canManageTeam(task.team_id)`; sửa đúng 4 trường `deadline`, `start_date`, `priority`, `deliverable`.
  - Checklist thêm/tích/xoá, tài liệu: `canUpdate` của `GET /api/tasks/:id` (= được giao hoặc quản lý Tổ; server dùng `canTouchTask`).
  - Đổi trạng thái: được giao hoặc quản lý Tổ, chỉ khi `todo`/`in_progress`.
  - Nộp nghiệm thu: **được giao** và `todo`/`in_progress`.
  - Duyệt: `status === 'review'` và (admin/vice_admin, hoặc quản lý Tổ của công việc, hoặc Trưởng BTC của hoạt động).
  - Rút lại việc tự ghi nhận: `is_self_logged` và được giao và chưa `done`/`cancelled`.
  - Giao việc: `canManage` của hoạt động; danh sách Tổ = mọi Tổ của hoạt động nếu admin, còn lại chỉ Tổ có `can_manage`.
  - Tự ghi nhận: hoạt động `approved` hoặc `active`.
- Lỗi API luôn hiện qua `apiErrorMessage(err, fallback)`; thông báo thành công/thất bại qua `useToast()`. Mọi import API trong `features/tasks/` đi qua `'../../api'` (để `vi.mock('../../api')` trong test có tác dụng).
- Thành công thì làm mới cache bằng `useInvalidateTaskCaches()` (Task 2): `['core-task', id]`, `['core-bootstrap']`, `['core-my-tasks-today']`, `['core-activities']`, `ACTIVITY_PREFIX`.
- Ngày hiển thị theo giờ Việt Nam: dùng `formatVnDate`/`toVnDateKey` (`web/src/shared/utils/date.ts`), không cắt chuỗi ISO (bất biến #7).
- Điện thoại từ 360px dùng được cho "Việc hôm nay", chi tiết công việc và nộp nghiệm thu: hàng/nút `flex-wrap`, lưới thông tin `repeat(auto-fit, minmax(140px, 1fr))`, hộp không rộng cố định.
- Test từng thao tác ghi: đúng endpoint + body, nút ẩn/hiện theo quyền (≥1 ca được, ≥1 ca bị chặn), lỗi server hiện tiếng Việt, cache được làm mới.
- Kiểm tra trước khi báo xong: `cd web && npm test && npm run build` xanh; `npm run test:tools`; `npm run docs:index && npm run docs:check -- --base origin/staging` xanh **sau khi commit**.
- Commit kết thúc bằng dòng `Co-Authored-By` theo cấu hình của phiên thực thi.

## Quyết định (spec để ngỏ hoặc mâu thuẫn với code)

- **`GET /api/my-tasks-today` không trả `acknowledged_at`** (`SELECT t.*` không join cột đó), nên UI cũ luôn hiện "Xác nhận" và không bao giờ hiện "Nộp nghiệm thu". Quyết định: mỗi dòng "đến hạn/quá hạn" hiện **cả hai** nút — "Xác nhận" (idempotent; ẩn cục bộ sau khi bấm) và "Nộp nghiệm thu" (khi `todo`/`in_progress`). Không đổi backend (spec 2). Ghi bẫy vào `docs/ai/bay-da-gap.md` ở Task 13.
- **Trưởng BTC không phải Tổ trưởng** gọi `GET /api/teams/:id/members` bị 403 "You cannot manage this team." (server chỉ cho admin hoặc người quản lý Tổ). Quyết định: danh sách Tổ trong hộp "Giao việc" lọc theo `canManageTeam` như spec (người chỉ là Trưởng BTC không thấy Tổ nào và được báo rõ); lỗi tải thành viên hiện nguyên nhân tiếng Việt. Không tự sửa server.
- **Trưởng BTC duyệt trong hộp chi tiết công việc**: `GET /api/tasks/:id` không trả `event_lead_id`. Quyết định: chỉ khi công việc `review` và người xem không phải admin/quản lý Tổ, hộp chi tiết gọi thêm `fetchActivityBoard(activity_id)` để biết `event_lead_id`.
- **Giai đoạn** (`stage`) chỉ hiện ở hộp "Giao việc" khi hoạt động là `event`; hoạt động `assigned` luôn gửi `general` (khớp cách trang chi tiết gom giai đoạn). Hộp "Tự ghi nhận" không có giai đoạn: server luôn đặt `general`.
- **Duyệt qua hộp**: ba nút "Duyệt đạt / Yêu cầu làm lại / Bác bỏ" đều mở `ReviewDialog` (chọn sẵn quyết định) — thống nhất với "thả vào Hoàn thành mở hộp duyệt". Hai quyết định sau bắt buộc lý do (khớp 400 của server).
- **Thêm tài liệu** chỉ cho người được giao hoặc quản lý Tổ (spec 4.2; UI cũ cho mọi người nhưng server trả 403).
- **Việc `open` cũ** (kiểu dữ liệu `TaskItem.status` còn `'open'`): coi như `todo` (`normalizeTaskStatus`).
- **Lịch** (`CalendarView`) chưa hiện việc nên không có "task pill" để nối; spec 4.2 không yêu cầu. Trang Tổ (đợt 3) dùng `useTaskModal()` có sẵn.
- **Kéo-thả** chỉ bật khi `matchMedia('(pointer: fine)')` đúng; thiết bị cảm ứng dùng nút trên thẻ.
- Dùng `FormData` + `Content-Type: multipart/form-data` cho `submit-review`, `attachments`, `log-task` (spec 4.2); server đọc được vì `taskUpload.single('file')` chấp nhận multipart không có tệp.

## Review Focus

- Nộp nghiệm thu **bắt buộc link**: để trống hoặc link không phải http(s) thì không gửi — test ở Task 3.
- Yêu cầu làm lại / Bác bỏ **bắt buộc lý do**; chỉ gõ khoảng trắng thì không gửi — Task 3.
- Kanban: thả sang "Chờ duyệt"/"Hoàn thành" **không gọi** `PATCH /status`, mà mở hộp nộp/duyệt; thả sang cột không hợp lệ báo lỗi — Task 11.
- Đổi Tổ nhanh trong hộp "Giao việc": kết quả về muộn của Tổ cũ **không** ghi đè danh sách Tổ mới — Task 9.
- Trọng số `0.5` hoặc `11` bị chặn trước khi gửi — Task 10.
- Nút "Sửa" chỉ hiện với người quản lý Tổ của công việc; nút xoá việc con cùng điều kiện `canUpdate` với thêm/tích và luôn hỏi xác nhận — Task 4, 5, 6.
- "Việc hôm nay": nút đúng theo mục (đến hạn/quá hạn vs chờ duyệt) — Task 8.
- Mọi test có ca người **không** có quyền (member) không thấy nút.

---

## File Structure

| File | Trách nhiệm |
|---|---|
| `web/src/core/api/types.ts` (sửa) | Thêm kiểu chi tiết công việc, payload, kiểu bảng Kanban; thêm field tuỳ chọn vào `TaskItem` |
| `web/src/core/api/tasks.ts` (sửa) | Hàm gọi mọi endpoint công việc |
| `web/src/core/api/teams.ts` (sửa) | `fetchTeamMembers` |
| `web/src/core/api/errorMessages.ts` (sửa) | Thêm câu lỗi tiếng Anh còn sót của route công việc |
| `web/src/core/queryKeys.ts` (sửa) | `TASK_KEY`, `MY_TASKS_TODAY_KEY`, `ACTIVITY_PREFIX`, `activityBoardKey` |
| `web/src/core/features/tasks/taskLabels.ts` (sửa) | Nhãn loại tài liệu và loại cập nhật |
| `web/src/core/features/tasks/taskPermissions.ts` (mới) | Hàm thuần quyền + `useCurrentUserId` |
| `web/src/core/features/tasks/useTaskCaches.ts` (mới) | Làm mới cache sau thao tác |
| `web/src/core/features/tasks/formFields.tsx` (mới) | `SelectField`, `TextField`, `AreaField`, `ErrorText`, hằng tuỳ chọn |
| `web/src/core/features/tasks/testUtils.tsx` (mới) | Helper test: bọc Query/Toast/Router, dữ liệu mẫu |
| `web/src/core/features/tasks/ReviewDialog.tsx`, `ReviewButtons.tsx` (mới) | Hộp duyệt và ba nút duyệt |
| `web/src/core/features/tasks/SubmitReviewForm.tsx`, `SubmitReviewDialog.tsx` (mới) | Form nộp nghiệm thu (nhúng) và hộp |
| `web/src/core/features/tasks/ChecklistSection.tsx` (mới) | Thêm/tích/xoá việc con |
| `web/src/core/features/tasks/AttachmentsSection.tsx`, `AddAttachmentDialog.tsx` (mới) | Danh sách tài liệu + thanh dung lượng; hộp và nút thêm |
| `web/src/core/features/tasks/CommentsSection.tsx` (mới) | Bình luận công việc |
| `web/src/core/features/tasks/EditTaskDialog.tsx` (mới) | Sửa 4 trường |
| `web/src/core/features/tasks/TaskDetailModal.tsx` (mới) | Hộp chi tiết công việc |
| `web/src/core/features/tasks/TaskModalProvider.tsx` (mới) | Context mở hộp, `TaskRoute` |
| `web/src/core/features/tasks/TaskRowControls.tsx` (mới) | Nút tích và nút tiêu đề dùng ở danh sách |
| `web/src/core/features/tasks/MyTasksToday.tsx` (sửa) | Nút theo dòng |
| `web/src/core/features/tasks/MyTasksView.tsx`, `dashboard/Dashboard.tsx` (sửa) | Nút tích + tiêu đề mở hộp |
| `web/src/core/features/tasks/CreateTaskModal.tsx` (mới) | Giao việc |
| `web/src/core/features/tasks/SelfLogModal.tsx` (mới) | Tự ghi nhận việc |
| `web/src/core/features/tasks/KanbanBoard.tsx` (mới) | Bảng Kanban `#board/:id` |
| `web/src/core/features/tasks/ActivityTaskActions.tsx` (mới) | Nút Kanban/Giao việc/Tự ghi nhận cho trang chi tiết hoạt động |
| `web/src/core/features/activities/ActivityDetailView.tsx` (sửa, của đợt 1) | Nối `ActivityTaskActions`, mở hộp công việc |
| `web/src/core/AppRoutes.tsx`, `web/src/core/main.tsx` (sửa) | Route `/board/:id`, `/task/:id`; gắn `TaskModalProvider` |

Mọi lệnh test chạy trong `web/`. Chạy một file: `npx vitest run <đường dẫn>`.

---

### Task 1: Tầng API công việc, kiểu dữ liệu, query key, câu lỗi

**Files:**
- Modify: `web/src/core/api/types.ts`, `web/src/core/api/tasks.ts`, `web/src/core/api/teams.ts`, `web/src/core/api/errorMessages.ts`, `web/src/core/queryKeys.ts`
- Test: `web/src/core/api/tasks.test.ts`

**Interfaces:**
- Consumes: `apiClient` (`web/src/shared/utils/api.ts`), `translateServerError` (đợt 0).
- Produces (xuất qua `web/src/core/api/index.ts`, vốn đã `export * from './tasks'` và `'./teams'`): các hàm và kiểu ở dưới; hằng `TASK_KEY`, `MY_TASKS_TODAY_KEY`, `ACTIVITY_PREFIX`, `activityBoardKey`.

- [ ] **Step 1: Kiểm tra giả định**

Run (ở gốc repo): `ls web/src/core/api web/src/core/features/activities; grep -n "core-activity\|ActivityDetail\|fetchActivityDetail" -r web/src/core | head`
Expected: thấy đủ file đợt 0. Nếu đợt 1 đã merge, ghi lại key của dữ liệu chi tiết hoạt động; nếu khác `['core-activity', id]` thì đặt `ACTIVITY_PREFIX` ở bước 3 theo key đó (phần tử đầu của key). Nếu `fetchTeamMembers` hoặc `fetchWeightPresets` đã được đợt khác thêm, **dùng lại** (xoá bản trong plan này, giữ test).

- [ ] **Step 2: Viết test hỏng**

```ts
// web/src/core/api/tasks.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiClient } from '../../shared/utils/api';
import {
  fetchTask, acknowledgeTask, updateTaskStatus, editTask, addChecklistItem, setChecklistItemDone, deleteChecklistItem,
  addTaskAttachment, submitTaskReview, reviewTask, cancelTask, postTaskComment, createTask, logTask,
  fetchWeightPresets, fetchActivityBoard, taskAttachmentContentUrl,
} from './tasks';
import { fetchTeamMembers } from './teams';
import { translateServerError } from './errors';

vi.mock('../../shared/utils/api', () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

const formOf = (call: unknown[]) => Object.fromEntries((call[1] as FormData).entries());

describe('API công việc', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(apiClient.get).mockResolvedValue({ data: {} });
    vi.mocked(apiClient.post).mockResolvedValue({ data: { id: 1 } });
    vi.mocked(apiClient.patch).mockResolvedValue({ data: { ok: true } });
    vi.mocked(apiClient.delete).mockResolvedValue({ data: { ok: true } });
  });

  it('đọc chi tiết công việc, bảng Kanban, thành viên Tổ, bộ trọng số', async () => {
    await fetchTask(5);
    expect(apiClient.get).toHaveBeenCalledWith('/tasks/5');
    await fetchActivityBoard(9);
    expect(apiClient.get).toHaveBeenCalledWith('/activities/9');
    await fetchTeamMembers(3);
    expect(apiClient.get).toHaveBeenCalledWith('/teams/3/members');
    await fetchWeightPresets();
    expect(apiClient.get).toHaveBeenCalledWith('/weight-presets');
  });

  it('xác nhận, đổi trạng thái, sửa 4 trường, rút lại', async () => {
    await acknowledgeTask(5);
    expect(apiClient.post).toHaveBeenCalledWith('/tasks/5/acknowledge');
    await updateTaskStatus(5, 'in_progress');
    expect(apiClient.patch).toHaveBeenCalledWith('/tasks/5/status', { status: 'in_progress' });
    await editTask(5, { deadline: '2026-11-01', start_date: null, priority: 'high', deliverable: 'Báo cáo' });
    expect(apiClient.patch).toHaveBeenCalledWith('/tasks/5', { deadline: '2026-11-01', start_date: null, priority: 'high', deliverable: 'Báo cáo' });
    await cancelTask(5);
    expect(apiClient.post).toHaveBeenCalledWith('/tasks/5/cancel');
  });

  it('checklist: thêm, tích, xoá', async () => {
    await addChecklistItem(5, 'Mua nước');
    expect(apiClient.post).toHaveBeenCalledWith('/tasks/5/checklist', { title: 'Mua nước' });
    await setChecklistItemDone(5, 8, true);
    expect(apiClient.patch).toHaveBeenCalledWith('/tasks/5/checklist/8', { is_done: true });
    await deleteChecklistItem(5, 8);
    expect(apiClient.delete).toHaveBeenCalledWith('/tasks/5/checklist/8');
  });

  it('tài liệu và nộp nghiệm thu gửi multipart chỉ gồm các trường link, không có file', async () => {
    await addTaskAttachment(5, { kind: 'evidence', label: 'Ảnh sự kiện', link_url: 'https://drive.example/a' });
    const call = vi.mocked(apiClient.post).mock.calls[0];
    expect(call[0]).toBe('/tasks/5/attachments');
    expect(formOf(call)).toEqual({ kind: 'evidence', label: 'Ảnh sự kiện', link_url: 'https://drive.example/a' });
    expect(call[2]).toEqual({ headers: { 'Content-Type': 'multipart/form-data' } });

    vi.mocked(apiClient.post).mockClear();
    await submitTaskReview(5, { link_url: 'https://drive.example/b', notes: '' });
    const submit = vi.mocked(apiClient.post).mock.calls[0];
    expect(submit[0]).toBe('/tasks/5/submit-review');
    expect(formOf(submit)).toEqual({ link_url: 'https://drive.example/b' });
  });

  it('duyệt và bình luận công việc', async () => {
    await reviewTask(5, { decision: 'reject', feedback: 'Thiếu ảnh' });
    expect(apiClient.post).toHaveBeenCalledWith('/tasks/5/review', { decision: 'reject', feedback: 'Thiếu ảnh' });
    await postTaskComment(9, { kind: 'progress', body: 'Xong 50%', task_id: 5 });
    expect(apiClient.post).toHaveBeenCalledWith('/activities/9/updates', { kind: 'progress', body: 'Xong 50%', task_id: 5 });
  });

  it('giao việc gửi JSON; tự ghi nhận gửi multipart không có file', async () => {
    const payload = { title: 'Dựng sân khấu', description: '', stage: 'before', priority: 'high', team_id: 2, start_date: null, deadline: '2026-11-01', deliverable: '', primary_assignee_id: 7, co_assignee_ids: [8] };
    await createTask(9, payload);
    expect(apiClient.post).toHaveBeenCalledWith('/activities/9/tasks', payload);

    vi.mocked(apiClient.post).mockClear();
    await logTask(9, { title: 'Trực gian hàng', team_id: 2, weight: 3, link_url: 'https://drive.example/c', description: 'Ca sáng' });
    const call = vi.mocked(apiClient.post).mock.calls[0];
    expect(call[0]).toBe('/activities/9/log-task');
    expect(formOf(call)).toEqual({ title: 'Trực gian hàng', team_id: '2', weight: '3', link_url: 'https://drive.example/c', description: 'Ca sáng' });
  });

  it('đường dẫn mở tệp đã lưu và câu lỗi tiếng Anh của route công việc được dịch', () => {
    expect(taskAttachmentContentUrl(12)).toBe('/api/task-attachments/12/content');
    expect(translateServerError('Task not found.')).toBe('Không tìm thấy công việc.');
    expect(translateServerError('You cannot update this task.')).toBe('Bạn không thể cập nhật công việc này.');
    expect(translateServerError('You cannot manage this team.')).toBe('Bạn không có quyền quản lý Tổ này.');
  });
});
```

- [ ] **Step 3: Chạy, xác nhận hỏng**

Run: `npx vitest run src/core/api/tasks.test.ts`
Expected: FAIL — các hàm chưa export.

- [ ] **Step 4: Viết code**

Thêm vào **cuối** `web/src/core/api/types.ts`, và thêm các field tuỳ chọn vào `TaskItem` (giữ nguyên field cũ):

```ts
// Trong interface TaskItem, thêm:
//   is_self_logged?: number | boolean | null;
//   deliverable?: string | null;
//   primary_assignee_id?: number | null;
//   primary_assignee_name?: string | null;
//   checklist_total?: number;
//   checklist_done?: number;
//   stage?: string;

export interface TaskDetailTask extends TaskItem {
  activity_status?: string;
  activity_description?: string | null;
  activity_deadline?: string;
  assigned_by?: number | null;
}

export interface TaskAssignee {
  user_id: number;
  is_primary: number | boolean;
  acknowledged_at: string | null;
  name: string;
  email?: string;
  avatar_color?: string;
}

export interface TaskAttachment {
  id: number;
  task_id: number;
  kind: string;
  label: string;
  link_url: string | null;
  original_name: string | null;
  mime_type: string | null;
  size_bytes: number | string | null;
  created_at: string;
  user_name: string;
}

export interface TaskUpdate {
  id: number;
  kind: string;
  body: string;
  created_at: string;
  user_name: string;
  avatar_color?: string;
}

export interface ChecklistItem {
  id: number;
  task_id: number;
  title: string;
  is_done: number | boolean;
  sort_order?: number;
}

export interface TaskDetailResponse {
  task: TaskDetailTask;
  assignees: TaskAssignee[];
  attachments: TaskAttachment[];
  updates: TaskUpdate[];
  checklist: ChecklistItem[];
  canUpdate: boolean;
  myAcknowledgedAt: string | null;
}

export type ReviewDecision = 'approve' | 'reject' | 'cancel';
export type TaskTransitionStatus = 'todo' | 'in_progress';
export type TaskAttachmentKind = 'clarification' | 'evidence' | 'issue' | 'deliverable';
export type TaskCommentKind = 'comment' | 'progress' | 'issue' | 'evidence';

export interface CreateTaskPayload {
  title: string;
  description: string;
  stage: string;
  priority: string;
  team_id: number;
  start_date: string | null;
  deadline: string;
  deliverable: string;
  primary_assignee_id: number;
  co_assignee_ids: number[];
}

/** Server chỉ cho sửa 4 trường này (`PATCH /api/tasks/:id`). */
export interface EditTaskPayload {
  deadline?: string;
  start_date?: string | null;
  priority?: string;
  deliverable?: string | null;
}

export interface LogTaskPayload {
  title: string;
  team_id: number;
  weight?: number;
  link_url?: string;
  description?: string;
}

export interface WeightPreset {
  id: number;
  name: string;
  points: number;
  description?: string | null;
}

export interface TeamMemberOption {
  id: number;
  name: string;
  email?: string;
  role?: string;
  is_lead?: number | boolean;
  is_vice_lead?: number | boolean;
}

export interface TeamMembersResponse {
  members: TeamMemberOption[];
  available: TeamMemberOption[];
}

export interface BoardTeam {
  team_id: number;
  name: string;
  color?: string;
  role?: string;
}

/** Phần của `GET /api/activities/:id` mà Kanban và hộp công việc cần. */
export interface ActivityBoardData {
  activity: ActivityItem;
  activityTeams: BoardTeam[];
  tasks: TaskItem[];
  canManage: boolean;
}
```

Thay nội dung `web/src/core/api/tasks.ts`:

```ts
import { apiClient } from '../../shared/utils/api';
import type {
  ActivityBoardData,
  CreateTaskPayload,
  EditTaskPayload,
  LogTaskPayload,
  MyTasksTodayResponse,
  ReviewDecision,
  TaskAttachmentKind,
  TaskCommentKind,
  TaskDetailResponse,
  TaskTransitionStatus,
  WeightPreset,
} from './types';

const MULTIPART = { headers: { 'Content-Type': 'multipart/form-data' } };

/** FormData chỉ gồm các trường có giá trị; không bao giờ có `file` (chỉ dùng link, spec mục 2). */
function toFormData(fields: Record<string, string | number | null | undefined>): FormData {
  const form = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined && value !== null && value !== '') form.append(key, String(value));
  }
  return form;
}

/**
 * Fetch tasks assigned to the current user due today, overdue, or pending review.
 * Endpoint: GET /api/my-tasks-today
 */
export async function fetchMyTasksToday(): Promise<MyTasksTodayResponse> {
  const response = await apiClient.get<MyTasksTodayResponse>('/my-tasks-today');
  return response.data;
}

/** Endpoint: GET /api/tasks/:id */
export async function fetchTask(taskId: number): Promise<TaskDetailResponse> {
  const response = await apiClient.get<TaskDetailResponse>(`/tasks/${taskId}`);
  return response.data;
}

/** Endpoint: GET /api/activities/:id (phần Kanban cần). */
export async function fetchActivityBoard(activityId: number): Promise<ActivityBoardData> {
  const response = await apiClient.get<ActivityBoardData>(`/activities/${activityId}`);
  return response.data;
}

/** Endpoint: POST /api/tasks/:id/acknowledge (idempotent). */
export async function acknowledgeTask(taskId: number): Promise<void> {
  await apiClient.post(`/tasks/${taskId}/acknowledge`);
}

/** Endpoint: PATCH /api/tasks/:id/status — server chỉ cho todo <-> in_progress. */
export async function updateTaskStatus(taskId: number, status: TaskTransitionStatus): Promise<void> {
  await apiClient.patch(`/tasks/${taskId}/status`, { status });
}

/** Endpoint: PATCH /api/tasks/:id — chỉ người quản lý Tổ; 4 trường deadline/start_date/priority/deliverable. */
export async function editTask(taskId: number, payload: EditTaskPayload): Promise<void> {
  await apiClient.patch(`/tasks/${taskId}`, payload);
}

/** Endpoint: POST /api/tasks/:id/checklist */
export async function addChecklistItem(taskId: number, title: string): Promise<{ id: number }> {
  const response = await apiClient.post<{ id: number }>(`/tasks/${taskId}/checklist`, { title });
  return response.data;
}

/** Endpoint: PATCH /api/tasks/:id/checklist/:itemId */
export async function setChecklistItemDone(taskId: number, itemId: number, isDone: boolean): Promise<void> {
  await apiClient.patch(`/tasks/${taskId}/checklist/${itemId}`, { is_done: isDone });
}

/** Endpoint: DELETE /api/tasks/:id/checklist/:itemId */
export async function deleteChecklistItem(taskId: number, itemId: number): Promise<void> {
  await apiClient.delete(`/tasks/${taskId}/checklist/${itemId}`);
}

/** Endpoint: POST /api/tasks/:id/attachments (multipart; chỉ link). */
export async function addTaskAttachment(
  taskId: number,
  payload: { kind: TaskAttachmentKind; label: string; link_url: string }
): Promise<{ id: number }> {
  const response = await apiClient.post<{ id: number }>(`/tasks/${taskId}/attachments`, toFormData(payload), MULTIPART);
  return response.data;
}

/** Endpoint: POST /api/tasks/:id/submit-review (multipart; link bắt buộc, notes thành nhãn tài liệu). */
export async function submitTaskReview(
  taskId: number,
  payload: { link_url: string; notes?: string }
): Promise<{ id: number }> {
  const response = await apiClient.post<{ id: number }>(`/tasks/${taskId}/submit-review`, toFormData(payload), MULTIPART);
  return response.data;
}

/** Endpoint: POST /api/tasks/:id/review */
export async function reviewTask(taskId: number, payload: { decision: ReviewDecision; feedback: string }): Promise<void> {
  await apiClient.post(`/tasks/${taskId}/review`, payload);
}

/** Endpoint: POST /api/tasks/:id/cancel */
export async function cancelTask(taskId: number): Promise<void> {
  await apiClient.post(`/tasks/${taskId}/cancel`);
}

/** Endpoint: POST /api/activities/:id/updates (bình luận gắn với một công việc). */
export async function postTaskComment(
  activityId: number,
  payload: { kind: TaskCommentKind; body: string; task_id: number }
): Promise<void> {
  await apiClient.post(`/activities/${activityId}/updates`, payload);
}

/** Endpoint: POST /api/activities/:id/tasks */
export async function createTask(activityId: number, payload: CreateTaskPayload): Promise<{ id: number }> {
  const response = await apiClient.post<{ id: number }>(`/activities/${activityId}/tasks`, payload);
  return response.data;
}

/** Endpoint: POST /api/activities/:id/log-task (multipart; link tuỳ chọn, trọng số số nguyên 0–10). */
export async function logTask(activityId: number, payload: LogTaskPayload): Promise<{ id: number }> {
  const response = await apiClient.post<{ id: number }>(`/activities/${activityId}/log-task`, toFormData({ ...payload }), MULTIPART);
  return response.data;
}

/** Endpoint: GET /api/weight-presets (chỉ bộ đang bật). */
export async function fetchWeightPresets(): Promise<WeightPreset[]> {
  const response = await apiClient.get<WeightPreset[]>('/weight-presets');
  return response.data;
}

/** Đường dẫn mở tệp đã lưu của một tài liệu (không phải link). Endpoint: GET /api/task-attachments/:id/content */
export function taskAttachmentContentUrl(attachmentId: number): string {
  return `/api/task-attachments/${attachmentId}/content`;
}
```

Thêm vào `web/src/core/api/teams.ts` (import thêm `TeamMembersResponse`):

```ts
/**
 * Thành viên của một Tổ (admin hoặc người quản lý Tổ đó; người khác nhận 403).
 * Endpoint: GET /api/teams/:id/members
 */
export async function fetchTeamMembers(teamId: number): Promise<TeamMembersResponse> {
  const response = await apiClient.get<TeamMembersResponse>(`/teams/${teamId}/members`);
  return response.data;
}
```

Thêm vào `VI_ERROR_MESSAGES` trong `web/src/core/api/errorMessages.ts` (bỏ khoá nào đã có từ đợt khác):

```ts
  // Công việc
  'Task not found.': 'Không tìm thấy công việc.',
  'You cannot update this task.': 'Bạn không thể cập nhật công việc này.',
  'Attachment not found.': 'Không tìm thấy tài liệu.',
  'Stored file not found.': 'Không tìm thấy tệp đã lưu.',
  'You cannot manage this team.': 'Bạn không có quyền quản lý Tổ này.',
```

Thêm vào `web/src/core/queryKeys.ts`:

```ts
export const TASK_KEY = (taskId: number) => ['core-task', taskId] as const;
export const MY_TASKS_TODAY_KEY = ['core-my-tasks-today'] as const;
/** Phần tử đầu của key dữ liệu chi tiết hoạt động (đợt 1). Đổi ở đây nếu đợt 1 đặt khác. */
export const ACTIVITY_PREFIX = ['core-activity'] as const;
export const activityBoardKey = (activityId: number) => [...ACTIVITY_PREFIX, activityId] as const;
```

- [ ] **Step 5: Chạy test**

Run: `npx vitest run src/core/api && npx tsc --noEmit -p .`
Expected: PASS, không lỗi kiểu.

- [ ] **Step 6: Commit**

```bash
git add web/src/core/api web/src/core/queryKeys.ts
git commit -m "feat(web): tầng API công việc (chi tiết, trạng thái, checklist, tài liệu, nghiệm thu, giao việc)"
```

---

### Task 2: Quyền công việc, làm mới cache, trường form, helper test

**Files:**
- Create: `web/src/core/features/tasks/taskPermissions.ts`, `useTaskCaches.ts`, `formFields.tsx`, `testUtils.tsx`
- Modify: `web/src/core/features/tasks/taskLabels.ts`
- Test: `web/src/core/features/tasks/taskPermissions.test.ts`, `web/src/core/features/tasks/taskLabels.test.ts` (sửa file có sẵn, thêm ca)

**Interfaces:**
- Consumes: `fetchSession`, `SESSION_KEY`, `BOOTSTRAP_KEY`, `TASK_KEY`, `MY_TASKS_TODAY_KEY`, `ACTIVITY_PREFIX`.
- Produces:
  - `assigneeIdsOf(task)`, `normalizeTaskStatus(status)`, `isAssignedTo(task, userId)`, `isSubmittable(status)`, `canMoveTask(task, {userId, manages})`, `canSubmitForReview(task, userId)`, `canReviewTask(task, {isExec, manages, isEventLead})`, `canCancelSelfLogged(task, userId)`, `useCurrentUserId(): number | null`.
  - `useInvalidateTaskCaches(): (taskId?: number) => Promise<unknown>`.
  - `SelectField`, `TextField`, `AreaField`, `ErrorText`, `PRIORITY_OPTIONS`, `STAGE_OPTIONS`, `ATTACHMENT_KIND_OPTIONS`, `COMMENT_KIND_OPTIONS`.
  - `renderApp(ui, {session?, teams?, path?, routePath?})` → `{ qc, ...RenderResult }`, `makeSession({id, role})`, `makeBootstrap(teams)`.
  - `getAttachmentKindLabel`, `getUpdateKindLabel` trong `taskLabels.ts`.

- [ ] **Step 1: Viết test hỏng**

```ts
// web/src/core/features/tasks/taskPermissions.test.ts
import { describe, it, expect } from 'vitest';
import {
  assigneeIdsOf, normalizeTaskStatus, isAssignedTo, isSubmittable, canMoveTask, canSubmitForReview, canReviewTask, canCancelSelfLogged,
} from './taskPermissions';

const task = (over: Partial<{ status: string; assignee_ids: string | null; is_self_logged: number | null; team_id: number }> = {}) => ({
  status: 'todo', assignee_ids: '7,8', is_self_logged: 0, team_id: 2, ...over,
});

describe('taskPermissions', () => {
  it('tách danh sách người được giao và chuẩn hoá trạng thái cũ', () => {
    expect(assigneeIdsOf({ assignee_ids: '7, 8,x' })).toEqual([7, 8]);
    expect(assigneeIdsOf({ assignee_ids: null })).toEqual([]);
    expect(normalizeTaskStatus('open')).toBe('todo');
    expect(normalizeTaskStatus('review')).toBe('review');
    expect(isAssignedTo(task(), 8)).toBe(true);
    expect(isAssignedTo(task(), null)).toBe(false);
  });

  it('đổi trạng thái: người được giao hoặc quản lý Tổ, chỉ khi todo/in_progress', () => {
    expect(canMoveTask(task(), { userId: 7, manages: false })).toBe(true);
    expect(canMoveTask(task(), { userId: 99, manages: true })).toBe(true);
    expect(canMoveTask(task(), { userId: 99, manages: false })).toBe(false);
    expect(canMoveTask(task({ status: 'review' }), { userId: 7, manages: true })).toBe(false);
  });

  it('nộp nghiệm thu chỉ cho người được giao, không cho quản lý Tổ không được giao', () => {
    expect(canSubmitForReview(task({ status: 'in_progress' }), 7)).toBe(true);
    expect(canSubmitForReview(task(), 99)).toBe(false);
    expect(canSubmitForReview(task({ status: 'done' }), 7)).toBe(false);
    expect(isSubmittable('open')).toBe(true);
    expect(isSubmittable('review')).toBe(false);
  });

  it('duyệt: trạng thái review và admin / quản lý Tổ / Trưởng BTC', () => {
    const review = task({ status: 'review' });
    expect(canReviewTask(review, { isExec: true, manages: false, isEventLead: false })).toBe(true);
    expect(canReviewTask(review, { isExec: false, manages: true, isEventLead: false })).toBe(true);
    expect(canReviewTask(review, { isExec: false, manages: false, isEventLead: true })).toBe(true);
    expect(canReviewTask(review, { isExec: false, manages: false, isEventLead: false })).toBe(false);
    expect(canReviewTask(task(), { isExec: true, manages: true, isEventLead: true })).toBe(false);
  });

  it('rút lại: việc tự ghi nhận, được giao, chưa xong hoặc huỷ', () => {
    expect(canCancelSelfLogged(task({ is_self_logged: 1, status: 'review' }), 7)).toBe(true);
    expect(canCancelSelfLogged(task({ is_self_logged: 0, status: 'review' }), 7)).toBe(false);
    expect(canCancelSelfLogged(task({ is_self_logged: 1, status: 'done' }), 7)).toBe(false);
    expect(canCancelSelfLogged(task({ is_self_logged: 1, status: 'review' }), 99)).toBe(false);
  });
});
```

Thêm vào `web/src/core/features/tasks/taskLabels.test.ts` (đã có; thêm import và ca):

```ts
import { getAttachmentKindLabel, getUpdateKindLabel } from './taskLabels';

it('nhãn loại tài liệu và loại cập nhật', () => {
  expect(getAttachmentKindLabel('deliverable')).toBe('Sản phẩm bàn giao');
  expect(getAttachmentKindLabel('lạ')).toBe('lạ');
  expect(getUpdateKindLabel('review_note')).toBe('Ghi chú nghiệm thu');
  expect(getUpdateKindLabel('comment')).toBe('Bình luận');
});
```
(Đặt `it` trong một `describe` có sẵn hoặc bọc `describe('nhãn tài liệu', () => { … })` nếu file không có.)

- [ ] **Step 2: Chạy, xác nhận hỏng**

Run: `npx vitest run src/core/features/tasks/taskPermissions.test.ts src/core/features/tasks/taskLabels.test.ts`
Expected: FAIL — module/hàm chưa có.

- [ ] **Step 3: Viết code**

```ts
// web/src/core/features/tasks/taskPermissions.ts
import { useQuery } from '@tanstack/react-query';
import { fetchSession } from '../../api';
import { SESSION_KEY } from '../../queryKeys';

export interface TaskLike {
  status: string;
  team_id: number;
  assignee_ids?: string | null;
  is_self_logged?: number | boolean | null;
}

/** Bắt chước điều kiện server (core/src/routes/tasks.js). Server vẫn là nơi chặn cuối. */
export function assigneeIdsOf(task: Pick<TaskLike, 'assignee_ids'>): number[] {
  return String(task.assignee_ids ?? '')
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .map(Number)
    .filter((id) => !Number.isNaN(id));
}

/** Dữ liệu cũ còn trạng thái `open`; coi như `todo`. */
export function normalizeTaskStatus(status: string): string {
  return status === 'open' ? 'todo' : status;
}

export function isAssignedTo(task: Pick<TaskLike, 'assignee_ids'>, userId: number | null): boolean {
  return userId !== null && assigneeIdsOf(task).includes(userId);
}

export function isSubmittable(status: string): boolean {
  return ['todo', 'in_progress'].includes(normalizeTaskStatus(status));
}

/** `PATCH /api/tasks/:id/status`: người được giao hoặc quản lý Tổ, chỉ todo <-> in_progress. */
export function canMoveTask(task: TaskLike, ctx: { userId: number | null; manages: boolean }): boolean {
  return isSubmittable(task.status) && (ctx.manages || isAssignedTo(task, ctx.userId));
}

/** `POST /api/tasks/:id/submit-review`: chỉ người được giao, khi todo/in_progress. */
export function canSubmitForReview(task: TaskLike, userId: number | null): boolean {
  return isSubmittable(task.status) && isAssignedTo(task, userId);
}

/** `POST /api/tasks/:id/review` (canReviewTask của server): admin, quản lý Tổ, hoặc Trưởng BTC; việc phải ở review. */
export function canReviewTask(task: TaskLike, ctx: { isExec: boolean; manages: boolean; isEventLead: boolean }): boolean {
  return normalizeTaskStatus(task.status) === 'review' && (ctx.isExec || ctx.manages || ctx.isEventLead);
}

/** Rút lại việc tự ghi nhận (spec 4.2): của mình, chưa xong hoặc huỷ. */
export function canCancelSelfLogged(task: TaskLike, userId: number | null): boolean {
  return Boolean(task.is_self_logged) && isAssignedTo(task, userId) && !['done', 'cancelled'].includes(task.status);
}

/** Id người dùng hiện tại, đọc từ cache `session` (App đã tải trước khi vào màn). */
export function useCurrentUserId(): number | null {
  const { data } = useQuery({ queryKey: SESSION_KEY, queryFn: fetchSession, enabled: false });
  return data?.user?.id ?? null;
}
```

```ts
// web/src/core/features/tasks/useTaskCaches.ts
import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ACTIVITY_PREFIX, BOOTSTRAP_KEY, MY_TASKS_TODAY_KEY, TASK_KEY } from '../../queryKeys';

/** Làm mới mọi dữ liệu có thể đổi sau một thao tác công việc. */
export function useInvalidateTaskCaches() {
  const queryClient = useQueryClient();
  return useCallback(
    (taskId?: number) => {
      const keys: (readonly unknown[])[] = [BOOTSTRAP_KEY, MY_TASKS_TODAY_KEY, ['core-activities'], ACTIVITY_PREFIX];
      if (taskId !== undefined) keys.unshift(TASK_KEY(taskId));
      return Promise.all(keys.map((queryKey) => queryClient.invalidateQueries({ queryKey })));
    },
    [queryClient]
  );
}
```

Thêm vào cuối `taskLabels.ts`:

```ts
const ATTACHMENT_KIND_LABELS: Record<string, string> = {
  clarification: 'Làm rõ',
  evidence: 'Minh chứng',
  issue: 'Vướng mắc',
  deliverable: 'Sản phẩm bàn giao',
};

export const getAttachmentKindLabel = (kind?: string | null): string => ATTACHMENT_KIND_LABELS[kind ?? ''] ?? kind ?? '';

const UPDATE_KIND_LABELS: Record<string, string> = {
  comment: 'Bình luận',
  progress: 'Tiến độ',
  issue: 'Vướng mắc',
  evidence: 'Minh chứng',
  review_note: 'Ghi chú nghiệm thu',
};

export const getUpdateKindLabel = (kind?: string | null): string => UPDATE_KIND_LABELS[kind ?? ''] ?? kind ?? '';
```

```tsx
// web/src/core/features/tasks/formFields.tsx
import React, { useId } from 'react';
import Textfield from '@atlaskit/textfield';
import TextArea from '@atlaskit/textarea';
import { token } from '@atlaskit/tokens';

export interface Option { value: string; label: string }

export const PRIORITY_OPTIONS: Option[] = [
  { value: 'low', label: 'Thấp' },
  { value: 'medium', label: 'Trung bình' },
  { value: 'high', label: 'Cao' },
  { value: 'urgent', label: 'Khẩn cấp' },
];
export const STAGE_OPTIONS: Option[] = [
  { value: 'before', label: 'Trước sự kiện' },
  { value: 'during', label: 'Trong sự kiện' },
  { value: 'after', label: 'Sau sự kiện' },
  { value: 'general', label: 'Chung' },
];
export const ATTACHMENT_KIND_OPTIONS: Option[] = [
  { value: 'clarification', label: 'Làm rõ' },
  { value: 'evidence', label: 'Minh chứng' },
  { value: 'issue', label: 'Vướng mắc' },
  { value: 'deliverable', label: 'Sản phẩm bàn giao' },
];
export const COMMENT_KIND_OPTIONS: Option[] = [
  { value: 'comment', label: 'Bình luận' },
  { value: 'progress', label: 'Tiến độ' },
  { value: 'issue', label: 'Vướng mắc' },
  { value: 'evidence', label: 'Minh chứng' },
];

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 12, fontWeight: 600, margin: '12px 0 4px', color: token('color.text.subtle', '#44546F'),
};
const selectStyle: React.CSSProperties = {
  width: '100%', padding: 8, borderRadius: 3, boxSizing: 'border-box', fontSize: 14,
  border: `1px solid ${token('color.border.input', '#8590A2')}`,
  background: token('color.background.input', '#FFFFFF'), color: token('color.text', '#172B4D'),
};

export const SelectField: React.FC<{
  label: string; value: string; onChange: (value: string) => void; options: Option[];
  required?: boolean; placeholder?: string; disabled?: boolean;
}> = ({ label, value, onChange, options, required = false, placeholder, disabled = false }) => {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} style={labelStyle}>{label}{required ? ' *' : ''}</label>
      <select id={id} value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)} style={selectStyle}>
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
};

export const TextField: React.FC<{
  label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean;
  maxLength?: number; placeholder?: string; min?: number; max?: number; step?: number;
}> = ({ label, value, onChange, type = 'text', required = false, maxLength, placeholder, min, max, step }) => {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} style={labelStyle}>{label}{required ? ' *' : ''}</label>
      <Textfield id={id} type={type} value={value} maxLength={maxLength} placeholder={placeholder} min={min} max={max} step={step}
        onChange={(e) => onChange((e.target as HTMLInputElement).value)} />
    </div>
  );
};

export const AreaField: React.FC<{
  label: string; value: string; onChange: (value: string) => void; required?: boolean; placeholder?: string; rows?: number;
}> = ({ label, value, onChange, required = false, placeholder, rows = 3 }) => {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} style={labelStyle}>{label}{required ? ' *' : ''}</label>
      <TextArea id={id} value={value} placeholder={placeholder} minimumRows={rows} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
};

export const ErrorText: React.FC<{ children?: React.ReactNode }> = ({ children }) =>
  children ? <p role="alert" style={{ color: token('color.text.danger', '#AE2E24'), margin: '8px 0 0', fontSize: 13 }}>{children}</p> : null;
```

```tsx
// web/src/core/features/tasks/testUtils.tsx
// Helper dùng chung cho test của features/tasks (không import ở code chạy thật).
import React from 'react';
import { render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ToastProvider } from '../../../shared/components/Toast';
import { BOOTSTRAP_KEY, SESSION_KEY } from '../../queryKeys';
import type { BootstrapData, SessionData, TeamItem } from '../../api';

export function makeSession(opts: { id?: number; role?: string } = {}): SessionData {
  const role = opts.role ?? 'member';
  return {
    user: { id: opts.id ?? 7, name: 'Người dùng', email: 'u@x.vn', role },
    units: {
      current: { id: 1, code: 'tckt', name: 'TCKT', kind: 'union' },
      memberships: [{ unit_id: 1, code: 'tckt', name: 'TCKT', kind: 'union', role }],
    },
  };
}

export function makeBootstrap(teams: Partial<TeamItem>[] = []): BootstrapData {
  return {
    stats: { activeActivities: 0, openTasks: 0, overdueTasks: 0, completedMonth: 0 },
    upcoming: [], tasks: [], activity: [],
    teams: teams.map((t, i) => ({ id: i + 1, name: `Tổ ${i + 1}`, can_manage: 0, ...t })) as TeamItem[],
    capabilities: { canCreateActivity: true, canCreateAccount: false },
  };
}

/** Bọc Query (cache đã có session + bootstrap, không tự tải lại), Toast và MemoryRouter. */
export function renderApp(
  ui: React.ReactElement,
  opts: { session?: SessionData; teams?: Partial<TeamItem>[]; path?: string; routePath?: string } = {}
) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity }, mutations: { retry: false } } });
  qc.setQueryData(SESSION_KEY, opts.session ?? makeSession());
  qc.setQueryData(BOOTSTRAP_KEY, makeBootstrap(opts.teams));
  const body = opts.routePath ? <Routes><Route path={opts.routePath} element={ui} /></Routes> : ui;
  const utils = render(
    <QueryClientProvider client={qc}>
      <ToastProvider>
        <MemoryRouter initialEntries={[opts.path ?? '/']}>{body}</MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>
  );
  return { qc, ...utils };
}
```

- [ ] **Step 4: Chạy test**

Run: `npx vitest run src/core/features/tasks/taskPermissions.test.ts src/core/features/tasks/taskLabels.test.ts && npx tsc --noEmit -p .`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add web/src/core/features/tasks
git commit -m "feat(web): hàm quyền công việc, làm mới cache, trường form và helper test"
```

---

### Task 3: Nộp nghiệm thu và duyệt nghiệm thu

**Files:**
- Create: `SubmitReviewForm.tsx`, `SubmitReviewDialog.tsx`, `ReviewDialog.tsx`, `ReviewButtons.tsx` (cùng thư mục `web/src/core/features/tasks/`)
- Test: `SubmitReviewForm.test.tsx`, `ReviewDialog.test.tsx` (cùng thư mục)

**Interfaces:**
- Consumes: `submitTaskReview`, `reviewTask`, `apiErrorMessage`, `useToast`, `LinkField`, `LINK_ERROR_MESSAGE`, `isHttpUrl`, `useInvalidateTaskCaches`, `AreaField`, `ErrorText`.
- Produces:
  - `<SubmitReviewForm taskId onDone? />` — form nhúng (link bắt buộc, ghi chú tuỳ chọn).
  - `<SubmitReviewDialog isOpen taskId taskTitle onClose />` — hộp; tiêu đề `Nộp nghiệm thu: <tên>`.
  - `<ReviewDialog isOpen taskId taskTitle initialDecision? onClose />` — tiêu đề `Nghiệm thu: <tên>`; `REVIEW_DECISIONS`.
  - `<ReviewButtons taskId taskTitle />` — ba nút mở `ReviewDialog` chọn sẵn quyết định.

- [ ] **Step 1: Viết test hỏng**

```tsx
// web/src/core/features/tasks/SubmitReviewForm.test.tsx
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { SubmitReviewForm } from './SubmitReviewForm';
import { renderApp } from './testUtils';
import { TASK_KEY } from '../../queryKeys';
import * as api from '../../api';

vi.mock('../../api', async () => {
  const actual = await vi.importActual<typeof import('../../api')>('../../api');
  return { ...actual, submitTaskReview: vi.fn() };
});

describe('SubmitReviewForm', () => {
  beforeEach(() => { vi.clearAllMocks(); vi.mocked(api.submitTaskReview).mockResolvedValue({ id: 1 }); });
  afterEach(cleanup);

  it('không gửi khi thiếu link hoặc link không phải http(s)', () => {
    renderApp(<SubmitReviewForm taskId={5} />);
    fireEvent.click(screen.getByRole('button', { name: 'Nộp nghiệm thu' }));
    expect(screen.getByText('Vui lòng nhập liên kết minh chứng.')).toBeDefined();
    fireEvent.change(screen.getByLabelText(/Liên kết minh chứng/), { target: { value: 'ftp://x' } });
    fireEvent.click(screen.getByRole('button', { name: 'Nộp nghiệm thu' }));
    expect(api.submitTaskReview).not.toHaveBeenCalled();
  });

  it('gửi link và ghi chú, làm mới cache công việc, báo thành công', async () => {
    const { qc } = renderApp(<SubmitReviewForm taskId={5} />);
    const spy = vi.spyOn(qc, 'invalidateQueries');
    fireEvent.change(screen.getByLabelText(/Liên kết minh chứng/), { target: { value: ' https://drive.example/x ' } });
    fireEvent.change(screen.getByLabelText('Ghi chú'), { target: { value: 'Ảnh sân khấu' } });
    fireEvent.click(screen.getByRole('button', { name: 'Nộp nghiệm thu' }));
    await waitFor(() => expect(api.submitTaskReview).toHaveBeenCalledWith(5, { link_url: 'https://drive.example/x', notes: 'Ảnh sân khấu' }));
    expect(await screen.findByText('Đã nộp nghiệm thu')).toBeDefined();
    expect(spy).toHaveBeenCalledWith({ queryKey: TASK_KEY(5) });
  });

  it('lỗi của server hiện bằng tiếng Việt, không mất dữ liệu đã nhập', async () => {
    vi.mocked(api.submitTaskReview).mockRejectedValueOnce({ response: { status: 409, data: { error: 'Công việc này không ở trạng thái có thể nộp nghiệm thu.' } } });
    renderApp(<SubmitReviewForm taskId={5} />);
    fireEvent.change(screen.getByLabelText(/Liên kết minh chứng/), { target: { value: 'https://drive.example/x' } });
    fireEvent.click(screen.getByRole('button', { name: 'Nộp nghiệm thu' }));
    expect(await screen.findByText('Công việc này không ở trạng thái có thể nộp nghiệm thu.')).toBeDefined();
    expect((screen.getByLabelText(/Liên kết minh chứng/) as HTMLInputElement).value).toBe('https://drive.example/x');
  });
});
```

```tsx
// web/src/core/features/tasks/ReviewDialog.test.tsx
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { ReviewDialog } from './ReviewDialog';
import { ReviewButtons } from './ReviewButtons';
import { renderApp } from './testUtils';
import { TASK_KEY } from '../../queryKeys';
import * as api from '../../api';

vi.mock('../../api', async () => {
  const actual = await vi.importActual<typeof import('../../api')>('../../api');
  return { ...actual, reviewTask: vi.fn() };
});

describe('ReviewDialog', () => {
  beforeEach(() => { vi.clearAllMocks(); vi.mocked(api.reviewTask).mockResolvedValue(undefined); });
  afterEach(cleanup);

  it('duyệt đạt không cần lý do, làm mới cache, báo thành công và đóng', async () => {
    const onClose = vi.fn();
    const { qc } = renderApp(<ReviewDialog isOpen taskId={5} taskTitle="Dựng sân khấu" onClose={onClose} />);
    const spy = vi.spyOn(qc, 'invalidateQueries');
    expect(screen.getByText('Nghiệm thu: Dựng sân khấu')).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Gửi kết quả' }));
    await waitFor(() => expect(api.reviewTask).toHaveBeenCalledWith(5, { decision: 'approve', feedback: '' }));
    expect(await screen.findByText('Đã duyệt đạt')).toBeDefined();
    expect(spy).toHaveBeenCalledWith({ queryKey: TASK_KEY(5) });
    expect(onClose).toHaveBeenCalled();
  });

  it('yêu cầu làm lại và bác bỏ bắt buộc lý do (khoảng trắng không tính)', () => {
    renderApp(<ReviewDialog isOpen taskId={5} taskTitle="A" initialDecision="reject" onClose={() => {}} />);
    fireEvent.change(screen.getByLabelText(/Ghi chú/), { target: { value: '   ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Gửi kết quả' }));
    expect(screen.getByText('Vui lòng nêu rõ lý do khi yêu cầu làm lại.')).toBeDefined();
    fireEvent.click(screen.getByLabelText('Bác bỏ'));
    fireEvent.click(screen.getByRole('button', { name: 'Gửi kết quả' }));
    expect(screen.getByText('Vui lòng nêu rõ lý do khi bác bỏ.')).toBeDefined();
    expect(api.reviewTask).not.toHaveBeenCalled();
  });

  it('gửi quyết định bác bỏ kèm lý do đã cắt khoảng trắng', async () => {
    renderApp(<ReviewDialog isOpen taskId={5} taskTitle="A" initialDecision="cancel" onClose={() => {}} />);
    fireEvent.change(screen.getByLabelText(/Ghi chú/), { target: { value: '  Không đạt  ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Gửi kết quả' }));
    await waitFor(() => expect(api.reviewTask).toHaveBeenCalledWith(5, { decision: 'cancel', feedback: 'Không đạt' }));
    expect(await screen.findByText('Đã bác bỏ công việc')).toBeDefined();
  });

  it('lỗi 409 của server hiện trong hộp', async () => {
    vi.mocked(api.reviewTask).mockRejectedValueOnce({ response: { status: 409, data: { error: 'Công việc chưa được nộp để nghiệm thu.' } } });
    renderApp(<ReviewDialog isOpen taskId={5} taskTitle="A" onClose={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: 'Gửi kết quả' }));
    expect(await screen.findByText('Công việc chưa được nộp để nghiệm thu.')).toBeDefined();
  });
});

describe('ReviewButtons', () => {
  afterEach(cleanup);
  it('mỗi nút mở hộp với quyết định tương ứng được chọn sẵn', () => {
    renderApp(<ReviewButtons taskId={5} taskTitle="Việc X" />);
    fireEvent.click(screen.getByRole('button', { name: 'Bác bỏ' }));
    expect(screen.getByText('Nghiệm thu: Việc X')).toBeDefined();
    expect((screen.getByLabelText('Bác bỏ') as HTMLInputElement).checked).toBe(true);
  });
});
```

- [ ] **Step 2: Chạy, xác nhận hỏng**

Run: `npx vitest run src/core/features/tasks/SubmitReviewForm.test.tsx src/core/features/tasks/ReviewDialog.test.tsx`
Expected: FAIL — module chưa có.

- [ ] **Step 3: Viết code**

```tsx
// web/src/core/features/tasks/SubmitReviewForm.tsx
import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import Button from '@atlaskit/button/new';
import { apiErrorMessage, submitTaskReview } from '../../api';
import { useToast } from '../../../shared/components/Toast';
import { LinkField, LINK_ERROR_MESSAGE } from '../../../shared/components/LinkField';
import { isHttpUrl } from '../../../shared/utils/url';
import { useInvalidateTaskCaches } from './useTaskCaches';
import { AreaField, ErrorText } from './formFields';

/** Form nộp nghiệm thu: link bắt buộc (server từ chối khi thiếu), ghi chú tuỳ chọn. */
export const SubmitReviewForm: React.FC<{ taskId: number; onDone?: () => void }> = ({ taskId, onDone }) => {
  const toast = useToast();
  const invalidate = useInvalidateTaskCaches();
  const [link, setLink] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: () => submitTaskReview(taskId, { link_url: link.trim(), notes: notes.trim() }),
    onSuccess: async () => {
      toast.success('Đã nộp nghiệm thu');
      await invalidate(taskId);
      setLink('');
      setNotes('');
      onDone?.();
    },
    onError: (err) => setError(apiErrorMessage(err, 'Không nộp được nghiệm thu. Vui lòng thử lại.')),
  });

  const submit = () => {
    if (!link.trim()) { setError('Vui lòng nhập liên kết minh chứng.'); return; }
    if (!isHttpUrl(link)) { setError(LINK_ERROR_MESSAGE); return; }
    setError('');
    mutation.mutate();
  };

  return (
    <div>
      <LinkField label="Liên kết minh chứng" value={link} onChange={(v) => { setLink(v); setError(''); }} isRequired />
      <AreaField label="Ghi chú" value={notes} onChange={setNotes} />
      <ErrorText>{error}</ErrorText>
      <div style={{ marginTop: 12 }}>
        <Button appearance="primary" isLoading={mutation.isPending} onClick={submit}>Nộp nghiệm thu</Button>
      </div>
    </div>
  );
};
```

```tsx
// web/src/core/features/tasks/SubmitReviewDialog.tsx
import React from 'react';
import Modal, { ModalBody, ModalFooter, ModalHeader, ModalTitle, ModalTransition } from '@atlaskit/modal-dialog';
import Button from '@atlaskit/button/new';
import { SubmitReviewForm } from './SubmitReviewForm';

export interface SubmitReviewDialogProps { isOpen: boolean; taskId: number; taskTitle: string; onClose: () => void }

export const SubmitReviewDialog: React.FC<SubmitReviewDialogProps> = ({ isOpen, taskId, taskTitle, onClose }) => (
  <ModalTransition>
    {isOpen && (
      <Modal onClose={onClose} width="small">
        <ModalHeader><ModalTitle>{`Nộp nghiệm thu: ${taskTitle}`}</ModalTitle></ModalHeader>
        <ModalBody><SubmitReviewForm taskId={taskId} onDone={onClose} /></ModalBody>
        <ModalFooter><Button appearance="subtle" onClick={onClose}>Đóng</Button></ModalFooter>
      </Modal>
    )}
  </ModalTransition>
);
```

```tsx
// web/src/core/features/tasks/ReviewDialog.tsx
import React, { useEffect, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import Modal, { ModalBody, ModalFooter, ModalHeader, ModalTitle, ModalTransition } from '@atlaskit/modal-dialog';
import Button from '@atlaskit/button/new';
import { apiErrorMessage, reviewTask, type ReviewDecision } from '../../api';
import { useToast } from '../../../shared/components/Toast';
import { useInvalidateTaskCaches } from './useTaskCaches';
import { AreaField, ErrorText } from './formFields';

export const REVIEW_DECISIONS: { value: ReviewDecision; label: string }[] = [
  { value: 'approve', label: 'Duyệt đạt' },
  { value: 'reject', label: 'Yêu cầu làm lại' },
  { value: 'cancel', label: 'Bác bỏ' },
];

const SUCCESS_MESSAGE: Record<ReviewDecision, string> = {
  approve: 'Đã duyệt đạt',
  reject: 'Đã yêu cầu làm lại',
  cancel: 'Đã bác bỏ công việc',
};
const REASON_REQUIRED: Record<'reject' | 'cancel', string> = {
  reject: 'Vui lòng nêu rõ lý do khi yêu cầu làm lại.',
  cancel: 'Vui lòng nêu rõ lý do khi bác bỏ.',
};

export interface ReviewDialogProps {
  isOpen: boolean;
  taskId: number;
  taskTitle: string;
  initialDecision?: ReviewDecision;
  onClose: () => void;
}

/** Hộp duyệt nghiệm thu. Yêu cầu làm lại và bác bỏ bắt buộc lý do, như server. */
export const ReviewDialog: React.FC<ReviewDialogProps> = ({ isOpen, taskId, taskTitle, initialDecision = 'approve', onClose }) => {
  const toast = useToast();
  const invalidate = useInvalidateTaskCaches();
  const [decision, setDecision] = useState<ReviewDecision>(initialDecision);
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) { setDecision(initialDecision); setFeedback(''); setError(''); }
  }, [isOpen, initialDecision]);

  const mutation = useMutation({
    mutationFn: () => reviewTask(taskId, { decision, feedback: feedback.trim() }),
    onSuccess: async () => {
      toast.success(SUCCESS_MESSAGE[decision]);
      await invalidate(taskId);
      onClose();
    },
    onError: (err) => setError(apiErrorMessage(err, 'Không gửi được kết quả nghiệm thu.')),
  });

  const submit = () => {
    if (decision !== 'approve' && !feedback.trim()) { setError(REASON_REQUIRED[decision]); return; }
    setError('');
    mutation.mutate();
  };

  return (
    <ModalTransition>
      {isOpen && (
        <Modal onClose={onClose} width="small">
          <ModalHeader><ModalTitle>{`Nghiệm thu: ${taskTitle}`}</ModalTitle></ModalHeader>
          <ModalBody>
            <fieldset style={{ border: 'none', padding: 0, margin: 0 }}>
              <legend style={{ fontSize: 12, fontWeight: 600 }}>Kết quả</legend>
              {REVIEW_DECISIONS.map((d) => (
                <label key={d.value} style={{ display: 'block', padding: '4px 0' }}>
                  <input type="radio" name="review-decision" value={d.value} checked={decision === d.value}
                    onChange={() => { setDecision(d.value); setError(''); }} /> {d.label}
                </label>
              ))}
            </fieldset>
            <AreaField label="Ghi chú" required={decision !== 'approve'} value={feedback} onChange={setFeedback} />
            <ErrorText>{error}</ErrorText>
          </ModalBody>
          <ModalFooter>
            <Button appearance="subtle" onClick={onClose}>Huỷ</Button>
            <Button appearance={decision === 'approve' ? 'primary' : decision === 'cancel' ? 'danger' : 'warning'} isLoading={mutation.isPending} onClick={submit}>
              Gửi kết quả
            </Button>
          </ModalFooter>
        </Modal>
      )}
    </ModalTransition>
  );
};
```

```tsx
// web/src/core/features/tasks/ReviewButtons.tsx
import React, { useState } from 'react';
import Button from '@atlaskit/button/new';
import type { ReviewDecision } from '../../api';
import { ReviewDialog, REVIEW_DECISIONS } from './ReviewDialog';

/** Ba nút duyệt; nút nào cũng mở hộp duyệt với quyết định tương ứng được chọn sẵn. */
export const ReviewButtons: React.FC<{ taskId: number; taskTitle: string }> = ({ taskId, taskTitle }) => {
  const [decision, setDecision] = useState<ReviewDecision | null>(null);
  return (
    <>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {REVIEW_DECISIONS.map((d) => (
          <Button key={d.value} spacing="compact" appearance={d.value === 'approve' ? 'primary' : d.value === 'cancel' ? 'danger' : 'default'}
            onClick={() => setDecision(d.value)}>
            {d.label}
          </Button>
        ))}
      </div>
      <ReviewDialog isOpen={decision !== null} taskId={taskId} taskTitle={taskTitle} initialDecision={decision ?? 'approve'}
        onClose={() => setDecision(null)} />
    </>
  );
};
```

- [ ] **Step 4: Chạy test**

Run: `npx vitest run src/core/features/tasks/SubmitReviewForm.test.tsx src/core/features/tasks/ReviewDialog.test.tsx && npx tsc --noEmit -p .`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add web/src/core/features/tasks
git commit -m "feat(web): nộp nghiệm thu bắt buộc link và hộp duyệt bắt buộc lý do"
```

---

### Task 4: Checklist, tài liệu, bình luận

**Files:**
- Create: `ChecklistSection.tsx`, `AttachmentsSection.tsx`, `AddAttachmentDialog.tsx`, `CommentsSection.tsx` (trong `web/src/core/features/tasks/`)
- Test: `ChecklistSection.test.tsx`, `AttachmentsSection.test.tsx`, `CommentsSection.test.tsx`

**Interfaces:**
- Consumes: `addChecklistItem`, `setChecklistItemDone`, `deleteChecklistItem`, `addTaskAttachment`, `postTaskComment`, `taskAttachmentContentUrl`, `ConfirmDialog`, `QuotaBar`, `LinkField`, `getAttachmentKindLabel`, `getUpdateKindLabel`, `formatBytes`, `formatVnDate`.
- Produces:
  - `<ChecklistSection taskId items canUpdate />`
  - `<AttachmentsSection taskId taskTitle attachments canAttach />`
  - `<AddAttachmentDialog isOpen taskId taskTitle onClose />` và `<AddAttachmentButton taskId taskTitle />` (nút + hộp, dùng ở trang chi tiết hoạt động)
  - `<CommentsSection taskId activityId updates />`

- [ ] **Step 1: Viết test hỏng**

```tsx
// web/src/core/features/tasks/ChecklistSection.test.tsx
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { ChecklistSection } from './ChecklistSection';
import { renderApp } from './testUtils';
import { TASK_KEY } from '../../queryKeys';
import * as api from '../../api';

vi.mock('../../api', async () => {
  const actual = await vi.importActual<typeof import('../../api')>('../../api');
  return { ...actual, addChecklistItem: vi.fn(), setChecklistItemDone: vi.fn(), deleteChecklistItem: vi.fn() };
});

const items = [
  { id: 3, task_id: 5, title: 'Mua nước', is_done: 0 },
  { id: 4, task_id: 5, title: 'In banner', is_done: 1 },
];

describe('ChecklistSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.addChecklistItem).mockResolvedValue({ id: 9 });
    vi.mocked(api.setChecklistItemDone).mockResolvedValue(undefined);
    vi.mocked(api.deleteChecklistItem).mockResolvedValue(undefined);
  });
  afterEach(cleanup);

  it('hiện số mục đã xong; có quyền thì thêm được và làm mới cache', async () => {
    const { qc } = renderApp(<ChecklistSection taskId={5} items={items} canUpdate />);
    const spy = vi.spyOn(qc, 'invalidateQueries');
    expect(screen.getByText('1/2')).toBeDefined();
    fireEvent.change(screen.getByLabelText('Thêm việc con'), { target: { value: '  Đặt xe  ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Thêm' }));
    await waitFor(() => expect(api.addChecklistItem).toHaveBeenCalledWith(5, 'Đặt xe'));
    await waitFor(() => expect(spy).toHaveBeenCalledWith({ queryKey: TASK_KEY(5) }));
  });

  it('không cho thêm mục trống', () => {
    renderApp(<ChecklistSection taskId={5} items={items} canUpdate />);
    fireEvent.click(screen.getByRole('button', { name: 'Thêm' }));
    expect(screen.getByText('Nội dung việc con là bắt buộc.')).toBeDefined();
    expect(api.addChecklistItem).not.toHaveBeenCalled();
  });

  it('tích mục gọi PATCH với is_done', async () => {
    renderApp(<ChecklistSection taskId={5} items={items} canUpdate />);
    fireEvent.click(screen.getByLabelText('Mua nước'));
    await waitFor(() => expect(api.setChecklistItemDone).toHaveBeenCalledWith(5, 3, true));
  });

  it('xoá việc con phải xác nhận trước; huỷ thì không gọi API', async () => {
    renderApp(<ChecklistSection taskId={5} items={items} canUpdate />);
    fireEvent.click(screen.getByRole('button', { name: 'Xoá việc con: Mua nước' }));
    expect(await screen.findByText('Xoá việc con?')).toBeDefined();
    expect(api.deleteChecklistItem).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Huỷ' }));
    expect(api.deleteChecklistItem).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Xoá việc con: Mua nước' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Xoá' }));
    await waitFor(() => expect(api.deleteChecklistItem).toHaveBeenCalledWith(5, 3));
    expect(await screen.findByText('Đã xoá việc con')).toBeDefined();
  });

  it('không có quyền: ô tích bị khoá, không có form thêm và không có nút xoá', () => {
    renderApp(<ChecklistSection taskId={5} items={items} canUpdate={false} />);
    expect((screen.getByLabelText('Mua nước') as HTMLInputElement).disabled).toBe(true);
    expect(screen.queryByLabelText('Thêm việc con')).toBeNull();
    expect(screen.queryByRole('button', { name: /Xoá việc con/ })).toBeNull();
  });

  it('lỗi 403 của server hiện toast tiếng Việt', async () => {
    vi.mocked(api.setChecklistItemDone).mockRejectedValueOnce({ response: { status: 403, data: { error: 'Bạn không thể chỉnh sửa việc con của công việc này.' } } });
    renderApp(<ChecklistSection taskId={5} items={items} canUpdate />);
    fireEvent.click(screen.getByLabelText('Mua nước'));
    expect(await screen.findByText('Bạn không thể chỉnh sửa việc con của công việc này.')).toBeDefined();
  });
});
```

```tsx
// web/src/core/features/tasks/AttachmentsSection.test.tsx
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { AttachmentsSection } from './AttachmentsSection';
import { renderApp } from './testUtils';
import { TASK_KEY } from '../../queryKeys';
import * as api from '../../api';

vi.mock('../../api', async () => {
  const actual = await vi.importActual<typeof import('../../api')>('../../api');
  return { ...actual, addTaskAttachment: vi.fn() };
});

const attachments = [
  { id: 1, task_id: 5, kind: 'evidence', label: 'Ảnh sân khấu', link_url: 'https://drive.example/a', original_name: null, mime_type: null, size_bytes: 0, created_at: '2026-10-08T03:00:00Z', user_name: 'An' },
  { id: 2, task_id: 5, kind: 'deliverable', label: 'Báo cáo.pdf', link_url: null, original_name: 'bc.pdf', mime_type: 'application/pdf', size_bytes: 1048576, created_at: '2026-10-08T03:00:00Z', user_name: 'Bình' },
];

describe('AttachmentsSection', () => {
  beforeEach(() => { vi.clearAllMocks(); vi.mocked(api.addTaskAttachment).mockResolvedValue({ id: 3 }); });
  afterEach(cleanup);

  it('link mở theo link, tệp đã lưu mở theo /api/task-attachments/:id/content; có thanh dung lượng', () => {
    renderApp(<AttachmentsSection taskId={5} taskTitle="A" attachments={attachments} canAttach />);
    expect((screen.getByRole('link', { name: /Ảnh sân khấu/ }) as HTMLAnchorElement).getAttribute('href')).toBe('https://drive.example/a');
    expect((screen.getByRole('link', { name: /Báo cáo\.pdf/ }) as HTMLAnchorElement).getAttribute('href')).toBe('/api/task-attachments/2/content');
    expect(screen.getByText(/Đã dùng 1 MB \/ 50 MB/)).toBeDefined();
  });

  it('thêm tài liệu: link bắt buộc, gửi đúng kind/label/link và làm mới cache', async () => {
    const { qc } = renderApp(<AttachmentsSection taskId={5} taskTitle="Việc A" attachments={[]} canAttach />);
    const spy = vi.spyOn(qc, 'invalidateQueries');
    fireEvent.click(screen.getByRole('button', { name: 'Thêm tài liệu' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Thêm' }));
    expect(screen.getByText('Vui lòng nhập liên kết.')).toBeDefined();
    expect(api.addTaskAttachment).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText('Loại'), { target: { value: 'issue' } });
    fireEvent.change(screen.getByLabelText('Tên hiển thị'), { target: { value: 'Biên bản' } });
    fireEvent.change(screen.getByLabelText(/Liên kết/), { target: { value: 'https://drive.example/b' } });
    fireEvent.click(screen.getByRole('button', { name: 'Thêm' }));
    await waitFor(() => expect(api.addTaskAttachment).toHaveBeenCalledWith(5, { kind: 'issue', label: 'Biên bản', link_url: 'https://drive.example/b' }));
    expect(await screen.findByText('Đã thêm tài liệu')).toBeDefined();
    expect(spy).toHaveBeenCalledWith({ queryKey: TASK_KEY(5) });
  });

  it('không có quyền thì không có nút thêm', () => {
    renderApp(<AttachmentsSection taskId={5} taskTitle="A" attachments={[]} canAttach={false} />);
    expect(screen.queryByRole('button', { name: 'Thêm tài liệu' })).toBeNull();
  });

  it('lỗi 403 hiện tiếng Việt trong hộp', async () => {
    vi.mocked(api.addTaskAttachment).mockRejectedValueOnce({ response: { status: 403, data: { error: 'Bạn không thể đính kèm vào công việc này.' } } });
    renderApp(<AttachmentsSection taskId={5} taskTitle="A" attachments={[]} canAttach />);
    fireEvent.click(screen.getByRole('button', { name: 'Thêm tài liệu' }));
    fireEvent.change(await screen.findByLabelText(/Liên kết/), { target: { value: 'https://x.example' } });
    fireEvent.click(screen.getByRole('button', { name: 'Thêm' }));
    expect(await screen.findByText('Bạn không thể đính kèm vào công việc này.')).toBeDefined();
  });
});
```

```tsx
// web/src/core/features/tasks/CommentsSection.test.tsx
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { CommentsSection } from './CommentsSection';
import { renderApp } from './testUtils';
import { TASK_KEY } from '../../queryKeys';
import * as api from '../../api';

vi.mock('../../api', async () => {
  const actual = await vi.importActual<typeof import('../../api')>('../../api');
  return { ...actual, postTaskComment: vi.fn() };
});

const updates = [{ id: 1, kind: 'review_note', body: 'Đã duyệt đạt.', created_at: '2026-10-08T03:00:00Z', user_name: 'Cường' }];

describe('CommentsSection', () => {
  beforeEach(() => { vi.clearAllMocks(); vi.mocked(api.postTaskComment).mockResolvedValue(undefined); });
  afterEach(cleanup);

  it('hiện dòng thời gian với nhãn loại bằng tiếng Việt', () => {
    renderApp(<CommentsSection taskId={5} activityId={9} updates={updates} />);
    expect(screen.getByText('Đã duyệt đạt.')).toBeDefined();
    expect(screen.getByText('Ghi chú nghiệm thu')).toBeDefined();
  });

  it('gửi bình luận gắn task_id và activity, làm mới cache', async () => {
    const { qc } = renderApp(<CommentsSection taskId={5} activityId={9} updates={[]} />);
    const spy = vi.spyOn(qc, 'invalidateQueries');
    fireEvent.click(screen.getByRole('button', { name: 'Gửi bình luận' }));
    expect(screen.getByText('Vui lòng nhập nội dung bình luận.')).toBeDefined();
    fireEvent.change(screen.getByLabelText('Loại cập nhật'), { target: { value: 'progress' } });
    fireEvent.change(screen.getByLabelText('Nội dung'), { target: { value: ' Xong 50% ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Gửi bình luận' }));
    await waitFor(() => expect(api.postTaskComment).toHaveBeenCalledWith(9, { kind: 'progress', body: 'Xong 50%', task_id: 5 }));
    expect(await screen.findByText('Đã gửi bình luận')).toBeDefined();
    expect(spy).toHaveBeenCalledWith({ queryKey: TASK_KEY(5) });
  });
});
```

- [ ] **Step 2: Chạy, xác nhận hỏng**

Run: `npx vitest run src/core/features/tasks/ChecklistSection.test.tsx src/core/features/tasks/AttachmentsSection.test.tsx src/core/features/tasks/CommentsSection.test.tsx`
Expected: FAIL — module chưa có.

- [ ] **Step 3: Viết code**

```tsx
// web/src/core/features/tasks/ChecklistSection.tsx
import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import Button from '@atlaskit/button/new';
import { token } from '@atlaskit/tokens';
import { addChecklistItem, apiErrorMessage, deleteChecklistItem, setChecklistItemDone, type ChecklistItem } from '../../api';
import { useToast } from '../../../shared/components/Toast';
import { ConfirmDialog } from '../../../shared/components/ConfirmDialog';
import { useInvalidateTaskCaches } from './useTaskCaches';
import { TextField, ErrorText } from './formFields';

export interface ChecklistSectionProps { taskId: number; items: ChecklistItem[]; canUpdate: boolean }

/** Thêm, tích và xoá việc con; cả ba cùng điều kiện `canUpdate` (server: canTouchTask). Xoá phải xác nhận. */
export const ChecklistSection: React.FC<ChecklistSectionProps> = ({ taskId, items, canUpdate }) => {
  const toast = useToast();
  const invalidate = useInvalidateTaskCaches();
  const [title, setTitle] = useState('');
  const [error, setError] = useState('');
  const [pendingDelete, setPendingDelete] = useState<ChecklistItem | null>(null);
  const done = items.filter((i) => Boolean(i.is_done)).length;
  const fail = (err: unknown) => toast.error(apiErrorMessage(err, 'Không cập nhật được việc con.'));

  const addMutation = useMutation({
    mutationFn: (text: string) => addChecklistItem(taskId, text),
    onSuccess: () => { setTitle(''); return invalidate(taskId); },
    onError: fail,
  });
  const toggleMutation = useMutation({
    mutationFn: (v: { id: number; done: boolean }) => setChecklistItemDone(taskId, v.id, v.done),
    onSuccess: () => invalidate(taskId),
    onError: fail,
  });
  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteChecklistItem(taskId, id),
    onSuccess: () => { setPendingDelete(null); toast.success('Đã xoá việc con'); return invalidate(taskId); },
    onError: (err) => { setPendingDelete(null); fail(err); },
  });

  const add = () => {
    const text = title.trim();
    if (!text) { setError('Nội dung việc con là bắt buộc.'); return; }
    setError('');
    addMutation.mutate(text);
  };

  return (
    <section aria-label="Việc con">
      <h3 style={{ fontSize: 14, margin: '16px 0 8px' }}>Việc con <span style={{ fontWeight: 400 }}>{items.length > 0 ? `${done}/${items.length}` : ''}</span></h3>
      {items.length === 0 && <p style={{ color: token('color.text.subtle', '#626F86'), margin: 0 }}>Chưa có việc con.</p>}
      {items.map((item) => (
        <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}>
          <label style={{ flex: 1, display: 'flex', gap: 8, alignItems: 'center' }}>
            <input type="checkbox" checked={Boolean(item.is_done)} disabled={!canUpdate || toggleMutation.isPending}
              onChange={(e) => toggleMutation.mutate({ id: item.id, done: e.target.checked })} />
            <span>{item.title}</span>
          </label>
          {canUpdate && (
            <Button spacing="compact" appearance="subtle" aria-label={`Xoá việc con: ${item.title}`} onClick={() => setPendingDelete(item)}>Xoá</Button>
          )}
        </div>
      ))}
      {canUpdate && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 180 }}>
            <TextField label="Thêm việc con" value={title} maxLength={255} onChange={(v) => { setTitle(v); setError(''); }} />
          </div>
          <Button isLoading={addMutation.isPending} onClick={add}>Thêm</Button>
        </div>
      )}
      <ErrorText>{error}</ErrorText>
      <ConfirmDialog isOpen={pendingDelete !== null} title="Xoá việc con?" appearance="danger" confirmLabel="Xoá"
        isLoading={deleteMutation.isPending}
        onConfirm={() => pendingDelete && deleteMutation.mutate(pendingDelete.id)} onCancel={() => setPendingDelete(null)}>
        <p>Bạn sắp xoá "{pendingDelete?.title}". Không hoàn tác được.</p>
      </ConfirmDialog>
    </section>
  );
};
```

```tsx
// web/src/core/features/tasks/AddAttachmentDialog.tsx
import React, { useEffect, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import Modal, { ModalBody, ModalFooter, ModalHeader, ModalTitle, ModalTransition } from '@atlaskit/modal-dialog';
import Button from '@atlaskit/button/new';
import { addTaskAttachment, apiErrorMessage, type TaskAttachmentKind } from '../../api';
import { useToast } from '../../../shared/components/Toast';
import { LinkField, LINK_ERROR_MESSAGE } from '../../../shared/components/LinkField';
import { isHttpUrl } from '../../../shared/utils/url';
import { useInvalidateTaskCaches } from './useTaskCaches';
import { ATTACHMENT_KIND_OPTIONS, ErrorText, SelectField, TextField } from './formFields';

export interface AddAttachmentDialogProps { isOpen: boolean; taskId: number; taskTitle: string; onClose: () => void }

/** Thêm tài liệu/minh chứng bằng link (không tải tệp). */
export const AddAttachmentDialog: React.FC<AddAttachmentDialogProps> = ({ isOpen, taskId, taskTitle, onClose }) => {
  const toast = useToast();
  const invalidate = useInvalidateTaskCaches();
  const [kind, setKind] = useState<TaskAttachmentKind>('clarification');
  const [label, setLabel] = useState('');
  const [link, setLink] = useState('');
  const [error, setError] = useState('');

  useEffect(() => { if (isOpen) { setKind('clarification'); setLabel(''); setLink(''); setError(''); } }, [isOpen]);

  const mutation = useMutation({
    mutationFn: () => addTaskAttachment(taskId, { kind, label: label.trim(), link_url: link.trim() }),
    onSuccess: async () => { toast.success('Đã thêm tài liệu'); await invalidate(taskId); onClose(); },
    onError: (err) => setError(apiErrorMessage(err, 'Không thêm được tài liệu.')),
  });

  const submit = () => {
    if (!link.trim()) { setError('Vui lòng nhập liên kết.'); return; }
    if (!isHttpUrl(link)) { setError(LINK_ERROR_MESSAGE); return; }
    setError('');
    mutation.mutate();
  };

  return (
    <ModalTransition>
      {isOpen && (
        <Modal onClose={onClose} width="small">
          <ModalHeader><ModalTitle>{`Thêm tài liệu: ${taskTitle}`}</ModalTitle></ModalHeader>
          <ModalBody>
            <SelectField label="Loại" value={kind} onChange={(v) => setKind(v as TaskAttachmentKind)} options={ATTACHMENT_KIND_OPTIONS} />
            <TextField label="Tên hiển thị" value={label} maxLength={180} onChange={setLabel} />
            <LinkField label="Liên kết" value={link} onChange={(v) => { setLink(v); setError(''); }} isRequired />
            <ErrorText>{error}</ErrorText>
          </ModalBody>
          <ModalFooter>
            <Button appearance="subtle" onClick={onClose}>Huỷ</Button>
            <Button appearance="primary" isLoading={mutation.isPending} onClick={submit}>Thêm</Button>
          </ModalFooter>
        </Modal>
      )}
    </ModalTransition>
  );
};

/** Nút + hộp, dùng ở danh sách tài liệu theo từng việc của trang chi tiết hoạt động. */
export const AddAttachmentButton: React.FC<{ taskId: number; taskTitle: string }> = ({ taskId, taskTitle }) => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button spacing="compact" onClick={() => setOpen(true)}>Thêm tài liệu</Button>
      <AddAttachmentDialog isOpen={open} taskId={taskId} taskTitle={taskTitle} onClose={() => setOpen(false)} />
    </>
  );
};
```

```tsx
// web/src/core/features/tasks/AttachmentsSection.tsx
import React, { useState } from 'react';
import Button from '@atlaskit/button/new';
import { token } from '@atlaskit/tokens';
import { taskAttachmentContentUrl, type TaskAttachment } from '../../api';
import { QuotaBar } from '../../../shared/components/QuotaBar';
import { isHttpUrl } from '../../../shared/utils/url';
import { formatBytes } from '../../../shared/utils/bytes';
import { formatVnDate } from '../../../shared/utils/date';
import { getAttachmentKindLabel } from './taskLabels';
import { AddAttachmentDialog } from './AddAttachmentDialog';

export interface AttachmentsSectionProps {
  taskId: number;
  taskTitle: string;
  attachments: TaskAttachment[];
  /** Người được giao hoặc quản lý Tổ (server: canTouchTask). */
  canAttach: boolean;
}

export const AttachmentsSection: React.FC<AttachmentsSectionProps> = ({ taskId, taskTitle, attachments, canAttach }) => {
  const [open, setOpen] = useState(false);
  const used = attachments.reduce((sum, a) => sum + Number(a.size_bytes || 0), 0);
  return (
    <section aria-label="Tài liệu và liên kết">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '16px 0 8px' }}>
        <h3 style={{ fontSize: 14, margin: 0 }}>Tài liệu và liên kết</h3>
        {canAttach && <Button spacing="compact" onClick={() => setOpen(true)}>Thêm tài liệu</Button>}
      </div>
      <QuotaBar usedBytes={used} />
      {attachments.length === 0 && <p style={{ color: token('color.text.subtle', '#626F86') }}>Chưa có tài liệu hay liên kết.</p>}
      <ul style={{ listStyle: 'none', padding: 0, margin: '8px 0 0' }}>
        {attachments.map((a) => (
          <li key={a.id} style={{ padding: '6px 0' }}>
            <a href={a.link_url && isHttpUrl(a.link_url) ? a.link_url : taskAttachmentContentUrl(a.id)} target="_blank" rel="noopener noreferrer">
              {a.label}
            </a>
            <div style={{ fontSize: 12, color: token('color.text.subtle', '#626F86') }}>
              {a.user_name} · {getAttachmentKindLabel(a.kind)}
              {Number(a.size_bytes) > 0 ? ` · ${formatBytes(Number(a.size_bytes))}` : ''} · {formatVnDate(a.created_at)}
            </div>
          </li>
        ))}
      </ul>
      <AddAttachmentDialog isOpen={open} taskId={taskId} taskTitle={taskTitle} onClose={() => setOpen(false)} />
    </section>
  );
};
```

```tsx
// web/src/core/features/tasks/CommentsSection.tsx
import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import Button from '@atlaskit/button/new';
import { token } from '@atlaskit/tokens';
import { apiErrorMessage, postTaskComment, type TaskCommentKind, type TaskUpdate } from '../../api';
import { useToast } from '../../../shared/components/Toast';
import { formatVnDate } from '../../../shared/utils/date';
import { useInvalidateTaskCaches } from './useTaskCaches';
import { getUpdateKindLabel } from './taskLabels';
import { AreaField, COMMENT_KIND_OPTIONS, ErrorText, SelectField } from './formFields';

export const CommentsSection: React.FC<{ taskId: number; activityId: number; updates: TaskUpdate[] }> = ({ taskId, activityId, updates }) => {
  const toast = useToast();
  const invalidate = useInvalidateTaskCaches();
  const [kind, setKind] = useState<TaskCommentKind>('comment');
  const [body, setBody] = useState('');
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: () => postTaskComment(activityId, { kind, body: body.trim(), task_id: taskId }),
    onSuccess: async () => { setBody(''); toast.success('Đã gửi bình luận'); await invalidate(taskId); },
    onError: (err) => setError(apiErrorMessage(err, 'Không gửi được bình luận.')),
  });

  const submit = () => {
    if (!body.trim()) { setError('Vui lòng nhập nội dung bình luận.'); return; }
    setError('');
    mutation.mutate();
  };

  return (
    <section aria-label="Bình luận công việc">
      <h3 style={{ fontSize: 14, margin: '16px 0 8px' }}>Bình luận</h3>
      {updates.length === 0 && <p style={{ color: token('color.text.subtle', '#626F86'), margin: 0 }}>Chưa có bình luận.</p>}
      {updates.map((u) => (
        <div key={u.id} style={{ padding: '6px 0', borderBottom: `1px solid ${token('color.border', '#DFE1E6')}` }}>
          <strong>{u.user_name}</strong> <span style={{ fontSize: 12 }}>{getUpdateKindLabel(u.kind)}</span>
          <p style={{ margin: '2px 0', whiteSpace: 'pre-wrap' }}>{u.body}</p>
          <small style={{ color: token('color.text.subtle', '#626F86') }}>{formatVnDate(u.created_at)}</small>
        </div>
      ))}
      <SelectField label="Loại cập nhật" value={kind} onChange={(v) => setKind(v as TaskCommentKind)} options={COMMENT_KIND_OPTIONS} />
      <AreaField label="Nội dung" value={body} onChange={(v) => { setBody(v); setError(''); }} />
      <ErrorText>{error}</ErrorText>
      <div style={{ marginTop: 8 }}><Button isLoading={mutation.isPending} onClick={submit}>Gửi bình luận</Button></div>
    </section>
  );
};
```

- [ ] **Step 4: Chạy test**

Run: `npx vitest run src/core/features/tasks && npx tsc --noEmit -p .`
Expected: PASS. Nếu `getByRole('button', {name: 'Thêm'})` trùng nhiều nút trong `AttachmentsSection.test` (nút "Thêm tài liệu" cũng tồn tại), sửa truy vấn thành `findAllByRole` rồi lấy phần tử có tên chính xác `'Thêm'` bằng `{ name: 'Thêm', exact: true }`; `name` kiểu chuỗi vốn đã khớp toàn chuỗi nên thường không cần.

- [ ] **Step 5: Commit**

```bash
git add web/src/core/features/tasks
git commit -m "feat(web): checklist có xoá (xác nhận), tài liệu bằng link và bình luận công việc"
```

---

### Task 5: Sửa công việc (cải tiến)

**Files:**
- Create: `web/src/core/features/tasks/EditTaskDialog.tsx`
- Test: `web/src/core/features/tasks/EditTaskDialog.test.tsx`

**Interfaces:**
- Consumes: `editTask`, `toVnDateKey`, `PRIORITY_OPTIONS`, `TextField`, `SelectField`, `AreaField`.
- Produces: `<EditTaskDialog isOpen task onClose />`; `task: { id, title, deadline, start_date?, priority, deliverable? }`. Người gọi (Task 6) chỉ mount khi `canManageTeam(task.team_id)`.

- [ ] **Step 1: Viết test hỏng**

```tsx
// web/src/core/features/tasks/EditTaskDialog.test.tsx
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { EditTaskDialog } from './EditTaskDialog';
import { renderApp } from './testUtils';
import { TASK_KEY } from '../../queryKeys';
import * as api from '../../api';

vi.mock('../../api', async () => {
  const actual = await vi.importActual<typeof import('../../api')>('../../api');
  return { ...actual, editTask: vi.fn() };
});

const task = { id: 5, title: 'Dựng sân khấu', deadline: '2026-10-31T17:00:00.000Z', start_date: null, priority: 'medium', deliverable: 'Ảnh' };

describe('EditTaskDialog', () => {
  beforeEach(() => { vi.clearAllMocks(); vi.mocked(api.editTask).mockResolvedValue(undefined); });
  afterEach(cleanup);

  it('điền sẵn giá trị (hạn theo giờ Việt Nam) và nói rõ 3 trường chưa sửa được', () => {
    renderApp(<EditTaskDialog isOpen task={task} onClose={() => {}} />);
    expect((screen.getByLabelText(/Hạn chót/) as HTMLInputElement).value).toBe('2026-11-01');
    expect(screen.getByText(/Tiêu đề, mô tả và người được giao chưa sửa được/)).toBeDefined();
  });

  it('gửi đúng 4 trường, làm mới cache và đóng', async () => {
    const onClose = vi.fn();
    const { qc } = renderApp(<EditTaskDialog isOpen task={task} onClose={onClose} />);
    const spy = vi.spyOn(qc, 'invalidateQueries');
    fireEvent.change(screen.getByLabelText(/Hạn chót/), { target: { value: '2026-11-05' } });
    fireEvent.change(screen.getByLabelText('Ngày bắt đầu'), { target: { value: '2026-11-02' } });
    fireEvent.change(screen.getByLabelText('Mức ưu tiên'), { target: { value: 'urgent' } });
    fireEvent.change(screen.getByLabelText('Sản phẩm cần nộp'), { target: { value: '  Ảnh và biên bản ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Lưu' }));
    await waitFor(() => expect(api.editTask).toHaveBeenCalledWith(5, { deadline: '2026-11-05', start_date: '2026-11-02', priority: 'urgent', deliverable: 'Ảnh và biên bản' }));
    expect(await screen.findByText('Đã cập nhật công việc')).toBeDefined();
    expect(spy).toHaveBeenCalledWith({ queryKey: TASK_KEY(5) });
    expect(onClose).toHaveBeenCalled();
  });

  it('chặn hạn trống và ngày bắt đầu sau hạn', () => {
    renderApp(<EditTaskDialog isOpen task={task} onClose={() => {}} />);
    fireEvent.change(screen.getByLabelText(/Hạn chót/), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: 'Lưu' }));
    expect(screen.getByText('Vui lòng chọn hạn chót.')).toBeDefined();
    fireEvent.change(screen.getByLabelText(/Hạn chót/), { target: { value: '2026-11-01' } });
    fireEvent.change(screen.getByLabelText('Ngày bắt đầu'), { target: { value: '2026-11-09' } });
    fireEvent.click(screen.getByRole('button', { name: 'Lưu' }));
    expect(screen.getByText('Ngày bắt đầu phải trước hoặc bằng hạn chót.')).toBeDefined();
    expect(api.editTask).not.toHaveBeenCalled();
  });

  it('lỗi 403 của server hiện tiếng Việt', async () => {
    vi.mocked(api.editTask).mockRejectedValueOnce({ response: { status: 403, data: { error: 'You cannot update this task.' } } });
    renderApp(<EditTaskDialog isOpen task={task} onClose={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: 'Lưu' }));
    expect(await screen.findByText('Bạn không thể cập nhật công việc này.')).toBeDefined();
  });
});
```

- [ ] **Step 2: Chạy, xác nhận hỏng**

Run: `npx vitest run src/core/features/tasks/EditTaskDialog.test.tsx` — Expected: FAIL (không resolve `./EditTaskDialog`).

- [ ] **Step 3: Viết code**

```tsx
// web/src/core/features/tasks/EditTaskDialog.tsx
import React, { useEffect, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import Modal, { ModalBody, ModalFooter, ModalHeader, ModalTitle, ModalTransition } from '@atlaskit/modal-dialog';
import Button from '@atlaskit/button/new';
import { token } from '@atlaskit/tokens';
import { apiErrorMessage, editTask } from '../../api';
import { useToast } from '../../../shared/components/Toast';
import { toVnDateKey } from '../../../shared/utils/date';
import { useInvalidateTaskCaches } from './useTaskCaches';
import { AreaField, ErrorText, PRIORITY_OPTIONS, SelectField, TextField } from './formFields';

export interface EditableTask {
  id: number;
  title: string;
  deadline: string;
  start_date?: string | null;
  priority: string;
  deliverable?: string | null;
}

/** Sửa đúng 4 trường server cho phép (`PATCH /api/tasks/:id`): hạn, ngày bắt đầu, ưu tiên, sản phẩm cần nộp. */
export const EditTaskDialog: React.FC<{ isOpen: boolean; task: EditableTask; onClose: () => void }> = ({ isOpen, task, onClose }) => {
  const toast = useToast();
  const invalidate = useInvalidateTaskCaches();
  const [deadline, setDeadline] = useState('');
  const [startDate, setStartDate] = useState('');
  const [priority, setPriority] = useState('medium');
  const [deliverable, setDeliverable] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setDeadline(toVnDateKey(task.deadline));
    setStartDate(toVnDateKey(task.start_date));
    setPriority(task.priority || 'medium');
    setDeliverable(task.deliverable ?? '');
    setError('');
  }, [isOpen, task]);

  const mutation = useMutation({
    mutationFn: () => editTask(task.id, { deadline, start_date: startDate || null, priority, deliverable: deliverable.trim() || null }),
    onSuccess: async () => { toast.success('Đã cập nhật công việc'); await invalidate(task.id); onClose(); },
    onError: (err) => setError(apiErrorMessage(err, 'Không lưu được công việc.')),
  });

  const submit = () => {
    if (!deadline) { setError('Vui lòng chọn hạn chót.'); return; }
    if (startDate && startDate > deadline) { setError('Ngày bắt đầu phải trước hoặc bằng hạn chót.'); return; }
    setError('');
    mutation.mutate();
  };

  return (
    <ModalTransition>
      {isOpen && (
        <Modal onClose={onClose} width="small">
          <ModalHeader><ModalTitle>{`Sửa công việc: ${task.title}`}</ModalTitle></ModalHeader>
          <ModalBody>
            <p style={{ margin: 0, fontSize: 13, color: token('color.text.subtle', '#626F86') }}>
              Tiêu đề, mô tả và người được giao chưa sửa được.
            </p>
            <TextField label="Hạn chót" type="date" required value={deadline} onChange={setDeadline} />
            <TextField label="Ngày bắt đầu" type="date" value={startDate} onChange={setStartDate} />
            <SelectField label="Mức ưu tiên" value={priority} onChange={setPriority} options={PRIORITY_OPTIONS} />
            <AreaField label="Sản phẩm cần nộp" value={deliverable} onChange={setDeliverable} />
            <ErrorText>{error}</ErrorText>
          </ModalBody>
          <ModalFooter>
            <Button appearance="subtle" onClick={onClose}>Huỷ</Button>
            <Button appearance="primary" isLoading={mutation.isPending} onClick={submit}>Lưu</Button>
          </ModalFooter>
        </Modal>
      )}
    </ModalTransition>
  );
};
```

- [ ] **Step 4: Chạy test**

Run: `npx vitest run src/core/features/tasks/EditTaskDialog.test.tsx && npx tsc --noEmit -p .`
Expected: PASS. (`2026-10-31T17:00:00.000Z` là 01/11 giờ Việt Nam, nên ô hạn điền `2026-11-01`.)

- [ ] **Step 5: Commit**

```bash
git add web/src/core/features/tasks
git commit -m "feat(web): sửa công việc (hạn, ngày bắt đầu, ưu tiên, sản phẩm cần nộp)"
```

---

### Task 6: Hộp chi tiết công việc, provider và route `#task/:id`

**Files:**
- Create: `TaskDetailModal.tsx`, `TaskModalProvider.tsx` (trong `web/src/core/features/tasks/`)
- Modify: `web/src/core/AppRoutes.tsx` (route `/task/:id`), `web/src/core/main.tsx` (gắn `TaskModalProvider`)
- Test: `TaskDetailModal.test.tsx`, `TaskModalProvider.test.tsx`; sửa `web/src/core/AppRoutes.test.tsx` (thêm ca)

**Interfaces:**
- Consumes: Task 1–5; `useCapabilities`, `fetchTask`, `fetchActivityBoard`, `acknowledgeTask`, `cancelTask`, `ConfirmDialog`.
- Produces:
  - `<TaskDetailModal taskId focusSubmit? onClose />`.
  - `TaskModalContext`, `useTaskModal(): { open(taskId, {focusSubmit?}), close() }` (mặc định no-op khi không có provider), `<TaskModalProvider>`, `<TaskRoute>`.

- [ ] **Step 1: Viết test hỏng**

```tsx
// web/src/core/features/tasks/TaskDetailModal.test.tsx
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { TaskDetailModal } from './TaskDetailModal';
import { renderApp, makeSession } from './testUtils';
import { TASK_KEY } from '../../queryKeys';
import * as api from '../../api';

vi.mock('../../api', async () => {
  const actual = await vi.importActual<typeof import('../../api')>('../../api');
  return { ...actual, fetchTask: vi.fn(), fetchActivityBoard: vi.fn(), acknowledgeTask: vi.fn(), cancelTask: vi.fn() };
});

const baseTask = {
  id: 5, activity_id: 9, team_id: 2, title: 'Dựng sân khấu', description: 'Chuẩn bị sân khấu chính', status: 'in_progress',
  priority: 'high', deadline: '2026-10-31T17:00:00.000Z', start_date: null, activity_title: 'Ngày hội', team_name: 'Tổ Sự kiện',
  deliverable: 'Ảnh nghiệm thu', assignee_ids: '7', is_self_logged: 0, weight: 1,
};
const detail = (over: Record<string, unknown> = {}, taskOver: Record<string, unknown> = {}) => ({
  task: { ...baseTask, ...taskOver },
  assignees: [{ user_id: 7, is_primary: 1, acknowledged_at: null, name: 'Nguyễn An' }],
  attachments: [], updates: [], checklist: [], canUpdate: true, myAcknowledgedAt: null, ...over,
});

describe('TaskDetailModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.acknowledgeTask).mockResolvedValue(undefined);
    vi.mocked(api.cancelTask).mockResolvedValue(undefined);
    Element.prototype.scrollIntoView = vi.fn();
  });
  afterEach(cleanup);

  it('hiện thông tin, người được giao (chính, chờ xác nhận) và sản phẩm cần nộp', async () => {
    vi.mocked(api.fetchTask).mockResolvedValue(detail() as never);
    renderApp(<TaskDetailModal taskId={5} onClose={() => {}} />);
    expect(await screen.findByText('Dựng sân khấu')).toBeDefined();
    expect(screen.getByText('Chuẩn bị sân khấu chính')).toBeDefined();
    expect(screen.getByText(/Nguyễn An \(chính\)/)).toBeDefined();
    expect(screen.getByText('Ảnh nghiệm thu')).toBeDefined();
    expect(screen.getByText('01/11/2026')).toBeDefined();
  });

  it('người được giao: xác nhận nhận việc gọi API và làm mới cache', async () => {
    vi.mocked(api.fetchTask).mockResolvedValue(detail() as never);
    const { qc } = renderApp(<TaskDetailModal taskId={5} onClose={() => {}} />);
    const spy = vi.spyOn(qc, 'invalidateQueries');
    fireEvent.click(await screen.findByRole('button', { name: 'Xác nhận nhận việc' }));
    await waitFor(() => expect(api.acknowledgeTask).toHaveBeenCalledWith(5));
    expect(await screen.findByText('Đã xác nhận nhận việc')).toBeDefined();
    expect(spy).toHaveBeenCalledWith({ queryKey: TASK_KEY(5) });
  });

  it('đã xác nhận thì hiện ngày, không còn nút', async () => {
    vi.mocked(api.fetchTask).mockResolvedValue(detail({ myAcknowledgedAt: '2026-10-08T03:00:00Z' }) as never);
    renderApp(<TaskDetailModal taskId={5} onClose={() => {}} />);
    expect(await screen.findByText(/Đã xác nhận · 08\/10\/2026/)).toBeDefined();
    expect(screen.queryByRole('button', { name: 'Xác nhận nhận việc' })).toBeNull();
  });

  it('nút Sửa chỉ hiện với người quản lý Tổ của công việc', async () => {
    vi.mocked(api.fetchTask).mockResolvedValue(detail() as never);
    renderApp(<TaskDetailModal taskId={5} onClose={() => {}} />, { teams: [{ id: 2, can_manage: 0 }] });
    await screen.findByText('Dựng sân khấu');
    expect(screen.queryByRole('button', { name: 'Sửa' })).toBeNull();
    cleanup();

    renderApp(<TaskDetailModal taskId={5} onClose={() => {}} />, { session: makeSession({ id: 3, role: 'leader' }), teams: [{ id: 2, can_manage: 1 }] });
    fireEvent.click(await screen.findByRole('button', { name: 'Sửa' }));
    expect(await screen.findByText('Sửa công việc: Dựng sân khấu')).toBeDefined();
  });

  it('nộp nghiệm thu chỉ cho người được giao khi todo/in_progress; mở từ nút tích thì cuộn tới đó', async () => {
    vi.mocked(api.fetchTask).mockResolvedValue(detail() as never);
    renderApp(<TaskDetailModal taskId={5} focusSubmit onClose={() => {}} />);
    expect(await screen.findByRole('heading', { name: 'Nộp nghiệm thu' })).toBeDefined();
    await waitFor(() => expect(Element.prototype.scrollIntoView).toHaveBeenCalled());
    cleanup();

    vi.mocked(api.fetchTask).mockResolvedValue(detail({}, { assignee_ids: '8' }) as never);
    renderApp(<TaskDetailModal taskId={5} onClose={() => {}} />);
    await screen.findByText('Dựng sân khấu');
    expect(screen.queryByRole('heading', { name: 'Nộp nghiệm thu' })).toBeNull();
  });

  it('nút duyệt chỉ hiện cho admin/quản lý Tổ khi việc ở "Chờ duyệt"', async () => {
    vi.mocked(api.fetchTask).mockResolvedValue(detail({}, { status: 'review' }) as never);
    renderApp(<TaskDetailModal taskId={5} onClose={() => {}} />, { session: makeSession({ id: 1, role: 'admin' }) });
    expect(await screen.findByRole('button', { name: 'Duyệt đạt' })).toBeDefined();
    cleanup();

    vi.mocked(api.fetchActivityBoard).mockResolvedValue({ activity: { id: 9, event_lead_id: 99 }, activityTeams: [], tasks: [], canManage: false } as never);
    renderApp(<TaskDetailModal taskId={5} onClose={() => {}} />);
    await screen.findByText('Dựng sân khấu');
    await waitFor(() => expect(api.fetchActivityBoard).toHaveBeenCalledWith(9));
    expect(screen.queryByRole('button', { name: 'Duyệt đạt' })).toBeNull();
  });

  it('Trưởng ban tổ chức (không phải quản lý Tổ) duyệt được', async () => {
    vi.mocked(api.fetchTask).mockResolvedValue(detail({}, { status: 'review', assignee_ids: '8' }) as never);
    vi.mocked(api.fetchActivityBoard).mockResolvedValue({ activity: { id: 9, event_lead_id: 7 }, activityTeams: [], tasks: [], canManage: false } as never);
    renderApp(<TaskDetailModal taskId={5} onClose={() => {}} />);
    expect(await screen.findByRole('button', { name: 'Duyệt đạt' })).toBeDefined();
  });

  it('rút lại việc tự ghi nhận: phải xác nhận, rồi gọi cancel và đóng hộp', async () => {
    vi.mocked(api.fetchTask).mockResolvedValue(detail({}, { is_self_logged: 1, status: 'review' }) as never);
    const onClose = vi.fn();
    renderApp(<TaskDetailModal taskId={5} onClose={onClose} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Rút lại công việc này' }));
    expect(api.cancelTask).not.toHaveBeenCalled();
    fireEvent.click(await screen.findByRole('button', { name: 'Rút lại' }));
    await waitFor(() => expect(api.cancelTask).toHaveBeenCalledWith(5));
    expect(await screen.findByText('Đã rút lại công việc')).toBeDefined();
    expect(onClose).toHaveBeenCalled();
  });

  it('lỗi tải hiện thông báo tiếng Việt', async () => {
    vi.mocked(api.fetchTask).mockRejectedValue({ response: { status: 404, data: { error: 'Task not found.' } } });
    renderApp(<TaskDetailModal taskId={5} onClose={() => {}} />);
    expect(await screen.findByText('Không tìm thấy công việc.')).toBeDefined();
  });
});
```

```tsx
// web/src/core/features/tasks/TaskModalProvider.test.tsx
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { Route, Routes, useLocation } from 'react-router-dom';
import { TaskModalProvider, TaskRoute, useTaskModal } from './TaskModalProvider';
import { renderApp } from './testUtils';
import * as api from '../../api';

vi.mock('../../api', async () => {
  const actual = await vi.importActual<typeof import('../../api')>('../../api');
  return { ...actual, fetchTask: vi.fn(), fetchActivityBoard: vi.fn() };
});

const Probe = () => <div data-testid="path">{useLocation().pathname}</div>;
const Opener = () => { const { open } = useTaskModal(); return <button onClick={() => open(5)}>mở việc</button>; };

const task = { id: 5, activity_id: 9, team_id: 2, title: 'Dựng sân khấu', status: 'done', priority: 'low', deadline: '2026-10-31', assignee_ids: '1' };
const detail = { task, assignees: [], attachments: [], updates: [], checklist: [], canUpdate: false, myAcknowledgedAt: null };

describe('TaskModalProvider', () => {
  beforeEach(() => { vi.clearAllMocks(); vi.mocked(api.fetchTask).mockResolvedValue(detail as never); });
  afterEach(cleanup);

  it('open() mở hộp từ bất kỳ danh sách nào và Đóng thì tắt, giữ nguyên trang', async () => {
    renderApp(
      <TaskModalProvider><Opener /><Probe /></TaskModalProvider>, { path: '/my-tasks' }
    );
    fireEvent.click(screen.getByText('mở việc'));
    expect(await screen.findByText('Dựng sân khấu')).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Đóng' }));
    expect(screen.queryByText('Dựng sân khấu')).toBeNull();
    expect(screen.getByTestId('path').textContent).toBe('/my-tasks');
  });

  it('#task/:id mở hộp trên nền Tổng quan; đóng thì về /dashboard', async () => {
    renderApp(
      <TaskModalProvider>
        <Routes>
          <Route path="/task/:id" element={<TaskRoute><div>nền-tổng-quan</div></TaskRoute>} />
          <Route path="/dashboard" element={<div>nền-tổng-quan-sạch</div>} />
        </Routes>
        <Probe />
      </TaskModalProvider>,
      { path: '/task/5' }
    );
    expect(screen.getByText('nền-tổng-quan')).toBeDefined();
    expect(await screen.findByText('Dựng sân khấu')).toBeDefined();
    expect(api.fetchTask).toHaveBeenCalledWith(5);
    fireEvent.click(screen.getByRole('button', { name: 'Đóng' }));
    expect(await screen.findByText('nền-tổng-quan-sạch')).toBeDefined();
    expect(screen.getByTestId('path').textContent).toBe('/dashboard');
  });

  it('id không hợp lệ về Tổng quan', () => {
    renderApp(
      <TaskModalProvider>
        <Routes>
          <Route path="/task/:id" element={<TaskRoute><div>nền</div></TaskRoute>} />
          <Route path="/dashboard" element={<div>về-tổng-quan</div>} />
        </Routes>
      </TaskModalProvider>,
      { path: '/task/abc' }
    );
    expect(screen.getByText('về-tổng-quan')).toBeDefined();
    expect(api.fetchTask).not.toHaveBeenCalled();
  });
});
```

Thêm vào `web/src/core/AppRoutes.test.tsx` (cùng `vi.mock` của `Dashboard` ở đầu file; thêm mock `KanbanBoard`):

```tsx
vi.mock('./features/tasks/KanbanBoard', () => ({ KanbanBoard: () => <div>màn-kanban</div> }));

it('/board/:id mở Kanban và /task/:id mở Tổng quan làm nền', () => {
  renderAt('/board/9', 'member');
  expect(screen.getByText('màn-kanban')).toBeDefined();
  cleanup();
  renderAt('/task/5', 'member');
  expect(screen.getByText('màn-tổng-quan')).toBeDefined();
});
```
(Task 11 tạo `KanbanBoard`; trong Task 6 thêm `export const KanbanBoard` rỗng tạm không cần — ca AppRoutes này **thêm ở Task 11**. Ở Task 6 chỉ thêm ca `/task/5`.)

- [ ] **Step 2: Chạy, xác nhận hỏng**

Run: `npx vitest run src/core/features/tasks/TaskDetailModal.test.tsx src/core/features/tasks/TaskModalProvider.test.tsx`
Expected: FAIL — module chưa có.

- [ ] **Step 3: Viết code**

```tsx
// web/src/core/features/tasks/TaskDetailModal.tsx
import React, { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import Modal, { ModalBody, ModalFooter, ModalHeader, ModalTitle, ModalTransition } from '@atlaskit/modal-dialog';
import Button from '@atlaskit/button/new';
import Lozenge from '@atlaskit/lozenge';
import { token } from '@atlaskit/tokens';
import { acknowledgeTask, apiErrorMessage, cancelTask, fetchActivityBoard, fetchTask } from '../../api';
import { activityBoardKey, TASK_KEY } from '../../queryKeys';
import { useCapabilities } from '../../capabilities';
import { useToast } from '../../../shared/components/Toast';
import { ConfirmDialog } from '../../../shared/components/ConfirmDialog';
import { formatVnDate } from '../../../shared/utils/date';
import { getTaskPriorityLabel, getTaskStatusAppearance, getTaskStatusLabel } from './taskLabels';
import { canCancelSelfLogged, canReviewTask, canSubmitForReview, isAssignedTo, useCurrentUserId } from './taskPermissions';
import { useInvalidateTaskCaches } from './useTaskCaches';
import { ChecklistSection } from './ChecklistSection';
import { AttachmentsSection } from './AttachmentsSection';
import { CommentsSection } from './CommentsSection';
import { SubmitReviewForm } from './SubmitReviewForm';
import { ReviewButtons } from './ReviewButtons';
import { EditTaskDialog } from './EditTaskDialog';

const Fact: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div>
    <div style={{ fontSize: 12, color: token('color.text.subtle', '#626F86') }}>{label}</div>
    <div style={{ fontWeight: 600 }}>{children}</div>
  </div>
);

export interface TaskDetailModalProps { taskId: number; focusSubmit?: boolean; onClose: () => void }

/** Hộp chi tiết công việc (mở từ mọi danh sách và từ `#task/:id`). Mọi nút ẩn/hiện theo quyền như server. */
export const TaskDetailModal: React.FC<TaskDetailModalProps> = ({ taskId, focusSubmit = false, onClose }) => {
  const caps = useCapabilities();
  const userId = useCurrentUserId();
  const toast = useToast();
  const invalidate = useInvalidateTaskCaches();
  const submitRef = useRef<HTMLDivElement>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);

  const query = useQuery({ queryKey: TASK_KEY(taskId), queryFn: () => fetchTask(taskId) });
  const data = query.data;
  const task = data?.task;
  const manages = task ? caps.canManageTeam(task.team_id) : false;

  // GET /api/tasks/:id không trả event_lead_id: chỉ tải thêm khi cần biết người xem có phải Trưởng BTC không.
  const needsEventLead = Boolean(task && task.status === 'review' && !caps.isExec && !manages);
  const activityQuery = useQuery({
    queryKey: activityBoardKey(task?.activity_id ?? 0),
    queryFn: () => fetchActivityBoard(task!.activity_id),
    enabled: needsEventLead,
  });
  const isEventLead = userId !== null && activityQuery.data?.activity.event_lead_id === userId;

  useEffect(() => {
    if (focusSubmit && task) submitRef.current?.scrollIntoView?.({ behavior: 'smooth' });
  }, [focusSubmit, Boolean(task)]); // eslint-disable-line react-hooks/exhaustive-deps

  const ackMutation = useMutation({
    mutationFn: () => acknowledgeTask(taskId),
    onSuccess: () => { toast.success('Đã xác nhận nhận việc'); return invalidate(taskId); },
    onError: (err) => toast.error(apiErrorMessage(err, 'Không xác nhận được.')),
  });
  const cancelMutation = useMutation({
    mutationFn: () => cancelTask(taskId),
    onSuccess: async () => { toast.success('Đã rút lại công việc'); await invalidate(taskId); setConfirmCancel(false); onClose(); },
    onError: (err) => { setConfirmCancel(false); toast.error(apiErrorMessage(err, 'Không rút lại được công việc.')); },
  });

  const assigned = task ? isAssignedTo(task, userId) : false;
  const title = task?.title ?? 'Chi tiết công việc';

  return (
    <ModalTransition>
      <Modal onClose={onClose} width="large">
        <ModalHeader><ModalTitle>{title}</ModalTitle></ModalHeader>
        <ModalBody>
          {query.isLoading && <p>Đang tải công việc...</p>}
          {query.isError && <p role="alert" style={{ color: token('color.text.danger', '#AE2E24') }}>{apiErrorMessage(query.error, 'Không tải được công việc.')}</p>}
          {data && task && (
            <div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <Lozenge appearance={getTaskStatusAppearance(task.status)}>{getTaskStatusLabel(task.status)}</Lozenge>
                {Boolean(task.is_self_logged) && <Lozenge appearance="new">Tự ghi nhận</Lozenge>}
                {task.weight !== undefined && task.weight !== null && Boolean(task.is_self_logged) && <Lozenge>{`${task.weight}đ`}</Lozenge>}
                {manages && <Button spacing="compact" onClick={() => setEditOpen(true)}>Sửa</Button>}
              </div>
              <p style={{ margin: '8px 0', color: token('color.text.subtle', '#626F86') }}>
                <Link to={`/activity/${task.activity_id}`} onClick={onClose}>{task.activity_title}</Link> · {task.team_name}
              </p>
              {task.description && <p style={{ whiteSpace: 'pre-wrap' }}>{task.description}</p>}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, margin: '12px 0' }}>
                <Fact label="Ngày bắt đầu">{formatVnDate(task.start_date) || 'Chưa đặt'}</Fact>
                <Fact label="Hạn chót">{formatVnDate(task.deadline)}</Fact>
                <Fact label="Ưu tiên">{getTaskPriorityLabel(task.priority)}</Fact>
                <Fact label="Người được giao">
                  {data.assignees.length === 0 ? 'Chưa giao' : data.assignees.map((a) => (
                    <div key={a.user_id} style={{ fontWeight: 400 }}>
                      {a.name}{a.is_primary ? ' (chính)' : ''}{a.acknowledged_at ? ' ✓' : ' · chờ xác nhận'}
                    </div>
                  ))}
                </Fact>
              </div>
              {task.deliverable && <Fact label="Sản phẩm cần nộp">{task.deliverable}</Fact>}

              {assigned && (
                <section aria-label="Xác nhận nhận việc" style={{ margin: '12px 0' }}>
                  {data.myAcknowledgedAt
                    ? <p style={{ margin: 0 }}>Đã xác nhận · {formatVnDate(data.myAcknowledgedAt)}</p>
                    : <Button isLoading={ackMutation.isPending} onClick={() => ackMutation.mutate()}>Xác nhận nhận việc</Button>}
                </section>
              )}

              <ChecklistSection taskId={taskId} items={data.checklist} canUpdate={data.canUpdate} />
              <AttachmentsSection taskId={taskId} taskTitle={task.title} attachments={data.attachments} canAttach={data.canUpdate} />
              <CommentsSection taskId={taskId} activityId={task.activity_id} updates={data.updates} />

              {canSubmitForReview(task, userId) && (
                <div ref={submitRef} id="submit-review-box" style={{ marginTop: 16 }}>
                  <h3 style={{ fontSize: 14, margin: '0 0 4px' }}>Nộp nghiệm thu</h3>
                  <p style={{ margin: 0, fontSize: 13, color: token('color.text.subtle', '#626F86') }}>
                    Gửi liên kết minh chứng để Tổ trưởng hoặc Ban điều hành duyệt.
                  </p>
                  <SubmitReviewForm taskId={taskId} />
                </div>
              )}

              {canReviewTask(task, { isExec: caps.isExec, manages, isEventLead }) && (
                <div style={{ marginTop: 16 }}>
                  <h3 style={{ fontSize: 14, margin: '0 0 8px' }}>Nghiệm thu công việc</h3>
                  <ReviewButtons taskId={taskId} taskTitle={task.title} />
                </div>
              )}

              {canCancelSelfLogged(task, userId) && (
                <div style={{ marginTop: 16, textAlign: 'right' }}>
                  <Button appearance="danger" spacing="compact" onClick={() => setConfirmCancel(true)}>Rút lại công việc này</Button>
                </div>
              )}

              {manages && <EditTaskDialog isOpen={editOpen} task={task} onClose={() => setEditOpen(false)} />}
              <ConfirmDialog isOpen={confirmCancel} title="Rút lại công việc?" appearance="danger" confirmLabel="Rút lại"
                isLoading={cancelMutation.isPending} onConfirm={() => cancelMutation.mutate()} onCancel={() => setConfirmCancel(false)}>
                <p>Bạn có chắc muốn rút lại công việc tự ghi nhận này không?</p>
              </ConfirmDialog>
            </div>
          )}
        </ModalBody>
        <ModalFooter><Button appearance="subtle" onClick={onClose}>Đóng</Button></ModalFooter>
      </Modal>
    </ModalTransition>
  );
};
```

```tsx
// web/src/core/features/tasks/TaskModalProvider.tsx
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
import { TaskDetailModal } from './TaskDetailModal';

export interface TaskModalApi {
  open: (taskId: number, options?: { focusSubmit?: boolean }) => void;
  close: () => void;
}

/** Mặc định no-op để màn dùng được (và test được) khi không có provider. */
export const TaskModalContext = createContext<TaskModalApi>({ open: () => {}, close: () => {} });
export const useTaskModal = (): TaskModalApi => useContext(TaskModalContext);

/** Giữ hộp chi tiết công việc; phải nằm trong Router. Mở từ mọi danh sách bằng `useTaskModal().open(id)`. */
export const TaskModalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [current, setCurrent] = useState<{ taskId: number; focusSubmit: boolean } | null>(null);
  const location = useLocation();
  const navigate = useNavigate();

  const open = useCallback((taskId: number, options?: { focusSubmit?: boolean }) => {
    setCurrent({ taskId, focusSubmit: Boolean(options?.focusSubmit) });
  }, []);
  const close = useCallback(() => {
    setCurrent(null);
    if (location.pathname.startsWith('/task/')) navigate('/dashboard', { replace: true });
  }, [location.pathname, navigate]);
  const value = useMemo(() => ({ open, close }), [open, close]);

  return (
    <TaskModalContext.Provider value={value}>
      {children}
      {current && <TaskDetailModal taskId={current.taskId} focusSubmit={current.focusSubmit} onClose={close} />}
    </TaskModalContext.Provider>
  );
};

/** Route `#task/:id`: mở hộp công việc trên nền là `children` (Tổng quan). */
export const TaskRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { id } = useParams();
  const taskId = Number(id);
  const { open } = useTaskModal();
  const valid = Number.isInteger(taskId) && taskId > 0;
  useEffect(() => { if (valid) open(taskId); }, [valid, taskId, open]);
  if (!valid) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
};
```

Sửa `web/src/core/AppRoutes.tsx`: thêm `import { TaskRoute } from './features/tasks/TaskModalProvider';`; trong `AppRoutes` đặt `const dashboard = <Dashboard userName={userName} onNavigate={(view) => navigate(`/${view}`)} />;` rồi `<Route path="/dashboard" element={dashboard} />` và thêm `<Route path="/task/:id" element={<TaskRoute>{dashboard}</TaskRoute>} />` (trước `*`).

Sửa `web/src/core/main.tsx`: `import { TaskModalProvider } from './features/tasks/TaskModalProvider';` và bọc

```tsx
<ToastProvider>
  <TaskModalProvider>
    <SignedInShell userName={session.user.name} user={session.user} onLogout={handleLogout} />
  </TaskModalProvider>
</ToastProvider>
```

Thêm vào `AppRoutes.test.tsx` ca:

```tsx
it('/task/:id mở Tổng quan làm nền cho hộp công việc', () => {
  renderAt('/task/5', 'member');
  expect(screen.getByText('màn-tổng-quan')).toBeDefined();
});
```

- [ ] **Step 4: Chạy test**

Run: `npx vitest run src/core && npx tsc --noEmit -p .`
Expected: PASS (gồm `main.test.tsx` cũ; nếu nó dựng `App` mà không có `QueryClientProvider` cho `TaskDetailModal`, `TaskModalProvider` chỉ render hộp khi `current` khác null nên không ảnh hưởng).

- [ ] **Step 5: Commit**

```bash
git add web/src/core
git commit -m "feat(web): hộp chi tiết công việc (xác nhận, sửa, nộp và duyệt, rút lại) và route #task/:id"
```

---

### Task 7: Nút tích và tiêu đề mở hộp ở Tổng quan và Nhiệm vụ của tôi

**Files:**
- Create: `web/src/core/features/tasks/TaskRowControls.tsx`
- Modify: `web/src/core/features/dashboard/Dashboard.tsx` (`TaskListPanel`), `web/src/core/features/tasks/MyTasksView.tsx`
- Test: `TaskRowControls.test.tsx` (mới); sửa `Dashboard.test.tsx`, `MyTasksView.test.tsx` (thêm ca)

**Interfaces:**
- Consumes: `useTaskModal`, `useCurrentUserId`, `canSubmitForReview`.
- Produces: `<TaskTitleButton task />` (mở hộp), `<TaskCheckButton task />` (bật khi `canSubmitForReview`, mở hộp và `focusSubmit`).

- [ ] **Step 1: Viết test hỏng**

```tsx
// web/src/core/features/tasks/TaskRowControls.test.tsx
import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { TaskCheckButton, TaskTitleButton } from './TaskRowControls';
import { TaskModalContext } from './TaskModalProvider';
import { renderApp, makeSession } from './testUtils';

const task = { id: 5, activity_id: 9, team_id: 2, title: 'Dựng sân khấu', status: 'in_progress', priority: 'high', deadline: '2026-10-31', assignee_ids: '7,8' };

const withModal = (open: ReturnType<typeof vi.fn>, ui: React.ReactElement) => (
  <TaskModalContext.Provider value={{ open, close: vi.fn() }}>{ui}</TaskModalContext.Provider>
);

describe('TaskRowControls', () => {
  afterEach(cleanup);

  it('bấm tiêu đề mở hộp công việc', () => {
    const open = vi.fn();
    renderApp(withModal(open, <TaskTitleButton task={task} />));
    fireEvent.click(screen.getByRole('button', { name: 'Dựng sân khấu' }));
    expect(open).toHaveBeenCalledWith(5);
  });

  it('nút tích bật với người được giao và mở hộp, cuộn tới phần nộp nghiệm thu', () => {
    const open = vi.fn();
    renderApp(withModal(open, <TaskCheckButton task={task} />), { session: makeSession({ id: 7 }) });
    fireEvent.click(screen.getByRole('button', { name: 'Nộp nghiệm thu: Dựng sân khấu' }));
    expect(open).toHaveBeenCalledWith(5, { focusSubmit: true });
  });

  it('nút tích tắt với người không được giao hoặc việc đã ở Chờ duyệt', () => {
    const open = vi.fn();
    renderApp(withModal(open, <TaskCheckButton task={task} />), { session: makeSession({ id: 99 }) });
    expect((screen.getByRole('button', { name: 'Chỉ xem: Dựng sân khấu' }) as HTMLButtonElement).disabled).toBe(true);
    cleanup();
    renderApp(withModal(open, <TaskCheckButton task={{ ...task, status: 'review' }} />), { session: makeSession({ id: 7 }) });
    expect((screen.getByRole('button', { name: 'Chỉ xem: Dựng sân khấu' }) as HTMLButtonElement).disabled).toBe(true);
  });
});
```

Thêm ca vào `MyTasksView.test.tsx` (theo mẫu file: mock `fetchBootstrap`, `fetchMyTasksToday`, render bằng `QueryClientProvider`); dùng `TaskModalContext.Provider` để bắt `open`:

```tsx
it('bấm tiêu đề công việc mở hộp chi tiết', async () => {
  const open = vi.fn();
  vi.mocked(api.fetchBootstrap).mockResolvedValue({ stats: {}, upcoming: [], tasks: [{ id: 201, activity_id: 1, team_id: 2, title: 'Soạn báo cáo tháng', status: 'in_progress', priority: 'high', deadline: '2099-01-01', assignee_ids: '7' }], activity: [], teams: [], capabilities: { canCreateActivity: false, canCreateAccount: false } } as never);
  vi.mocked(api.fetchMyTasksToday).mockResolvedValue({ dueToday: [], overdue: [], pendingMyReview: [] });
  render(
    <QueryClientProvider client={queryClient}>
      <TaskModalContext.Provider value={{ open, close: vi.fn() }}><MyTasksView /></TaskModalContext.Provider>
    </QueryClientProvider>
  );
  fireEvent.click(await screen.findByRole('button', { name: 'Soạn báo cáo tháng' }));
  expect(open).toHaveBeenCalledWith(201);
});
```
(thêm import `fireEvent`, `TaskModalContext`; dùng biến `queryClient` hay cách dựng client sẵn có của file đó.) Làm ca tương tự cho `Dashboard.test.tsx` (mở tab "Tất cả" nếu cần để thấy tiêu đề).

- [ ] **Step 2: Chạy, xác nhận hỏng**

Run: `npx vitest run src/core/features/tasks/TaskRowControls.test.tsx` — Expected: FAIL.

- [ ] **Step 3: Viết code**

```tsx
// web/src/core/features/tasks/TaskRowControls.tsx
import React from 'react';
import { token } from '@atlaskit/tokens';
import type { TaskItem } from '../../api';
import { useTaskModal } from './TaskModalProvider';
import { canSubmitForReview, useCurrentUserId } from './taskPermissions';

/** Tiêu đề công việc bấm được, mở hộp chi tiết. */
export const TaskTitleButton: React.FC<{ task: Pick<TaskItem, 'id' | 'title'> }> = ({ task }) => {
  const { open } = useTaskModal();
  return (
    <button type="button" onClick={() => open(task.id)}
      style={{ border: 'none', background: 'none', padding: 0, cursor: 'pointer', font: 'inherit', fontWeight: 600, textAlign: 'left', color: token('color.link', '#0C66E4') }}>
      {task.title}
    </button>
  );
};

/** Nút tích: chỉ bật với người được giao khi việc còn todo/in_progress; mở hộp và cuộn tới phần nộp nghiệm thu. */
export const TaskCheckButton: React.FC<{ task: TaskItem }> = ({ task }) => {
  const { open } = useTaskModal();
  const userId = useCurrentUserId();
  const enabled = canSubmitForReview(task, userId);
  return (
    <button type="button" disabled={!enabled} aria-label={enabled ? `Nộp nghiệm thu: ${task.title}` : `Chỉ xem: ${task.title}`}
      title={enabled ? 'Nộp nghiệm thu' : 'Chỉ xem'} onClick={() => open(task.id, { focusSubmit: true })}
      style={{
        width: 20, height: 20, borderRadius: '50%', flexShrink: 0, marginRight: 12, cursor: enabled ? 'pointer' : 'default',
        border: `2px solid ${token('color.border.bold', '#8590A2')}`, background: 'none', opacity: enabled ? 1 : 0.4,
      }} />
  );
};
```

Sửa `Dashboard.tsx`, trong `TaskListPanel`: thêm `import { TaskCheckButton, TaskTitleButton } from '../tasks/TaskRowControls';`; thay khối hàng công việc: bọc phần `<div style={{ flex: 1, minWidth: 0 }}>` trong một hàng có `<TaskCheckButton task={task} />` đứng trước, và thay

```tsx
            <div style={{ fontSize: '14px', fontWeight: 500, color: token('color.text', '#172B4D'), marginBottom: '4px' }}>
              {task.title}
            </div>
```
bằng
```tsx
            <div style={{ fontSize: '14px', marginBottom: '4px' }}>
              <TaskTitleButton task={task} />
            </div>
```
Cụ thể: đổi thẻ hàng ngoài cùng của mỗi `task` thành `display:'flex', alignItems:'center'` (đã là flex), đặt `<TaskCheckButton task={task} />` làm phần tử con đầu tiên, trước `<div style={{ flex: 1, minWidth: 0 }}>`.

Sửa `MyTasksView.tsx` tương tự: thêm import, đặt `<TaskCheckButton task={task} />` đầu hàng và đổi `{task.title}` (khối `<div ... fontWeight: 600 ...>`) thành `<TaskTitleButton task={task} />`.

- [ ] **Step 4: Chạy test**

Run: `npx vitest run src/core/features && npx tsc --noEmit -p .`
Expected: PASS. Test cũ của Dashboard/MyTasksView dùng `findByText(title)` vẫn khớp nút tiêu đề. Nếu một test cũ đếm `button` hoặc `getByRole('checkbox')`, sửa theo giao diện mới và ghi lý do trong commit.

- [ ] **Step 5: Commit**

```bash
git add web/src/core/features
git commit -m "feat(web): tiêu đề và nút tích mở chi tiết công việc ở Tổng quan, Nhiệm vụ của tôi"
```

---

### Task 8: "Việc hôm nay" có nút Xác nhận, Nộp nghiệm thu, duyệt

**Files:**
- Modify: `web/src/core/features/tasks/MyTasksToday.tsx` (viết lại), `web/src/core/features/tasks/MyTasksToday.test.tsx` (bọc `renderApp`, thêm ca)

**Interfaces:**
- Consumes: `acknowledgeTask`, `SubmitReviewDialog`, `ReviewButtons`, `useTaskModal`, `isSubmittable`, `MY_TASKS_TODAY_KEY`.
- Produces: `MyTasksToday` giữ tên export; mục thứ ba đổi tiêu đề thành "Chờ bạn duyệt".

- [ ] **Step 1: Viết test hỏng (thay file test)**

Giữ nguyên các ca hiển thị cũ nhưng dựng bằng `renderApp` (cần `ToastProvider` + `MemoryRouter`), đổi mong đợi "Chờ duyệt" → "Chờ bạn duyệt", rồi thêm:

```tsx
// web/src/core/features/tasks/MyTasksToday.test.tsx
import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { MyTasksToday } from './MyTasksToday';
import { TaskModalContext } from './TaskModalProvider';
import { renderApp } from './testUtils';
import { MY_TASKS_TODAY_KEY } from '../../queryKeys';
import * as api from '../../api';

vi.mock('../../api', async () => {
  const actual = await vi.importActual<typeof import('../../api')>('../../api');
  return { ...actual, fetchMyTasksToday: vi.fn(), acknowledgeTask: vi.fn() };
});

const row = (over: Partial<api.TaskItem> = {}): api.TaskItem => ({
  id: 101, activity_id: 1, team_id: 2, title: 'Chuẩn bị phòng họp', status: 'in_progress', priority: 'high',
  deadline: '2026-10-08T17:00:00Z', activity_title: 'Đại hội Chi đoàn', team_name: 'Tổ Tổ chức', assignee_name: 'Nguyễn Văn A', ...over,
});

const data = (): api.MyTasksTodayResponse => ({
  dueToday: [row()],
  overdue: [row({ id: 102, title: 'Báo cáo tháng 9', status: 'todo' })],
  pendingMyReview: [row({ id: 103, title: 'Duyệt bài đăng', status: 'review' })],
});

describe('MyTasksToday', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.fetchMyTasksToday).mockResolvedValue(data());
    vi.mocked(api.acknowledgeTask).mockResolvedValue(undefined);
  });
  afterEach(cleanup);

  it('hiện tiêu đề, ba mục và dòng công việc', async () => {
    renderApp(<MyTasksToday />);
    expect(screen.getByText('Công việc hôm nay')).toBeDefined();
    expect(await screen.findByText('Chuẩn bị phòng họp')).toBeDefined();
    expect(screen.getByText('Báo cáo tháng 9')).toBeDefined();
    expect(screen.getByText('Chờ bạn duyệt')).toBeDefined();
    expect(screen.getByText('Duyệt bài đăng')).toBeDefined();
  });

  it('mục trống hiện thông báo trống', async () => {
    vi.mocked(api.fetchMyTasksToday).mockResolvedValue({ dueToday: [], overdue: [], pendingMyReview: [] });
    renderApp(<MyTasksToday />);
    expect(await screen.findByText('Không có việc đến hạn hôm nay')).toBeDefined();
    expect(screen.getByText('Không có việc quá hạn')).toBeDefined();
    expect(screen.getByText('Không có việc chờ bạn duyệt')).toBeDefined();
  });

  it('hiển thị hạn theo ngày Việt Nam và nhãn "Cần làm" cho trạng thái open', async () => {
    vi.mocked(api.fetchMyTasksToday).mockResolvedValue({ dueToday: [row({ id: 201, title: 'Việc mới giao', status: 'open', priority: 'medium' })], overdue: [], pendingMyReview: [] });
    renderApp(<MyTasksToday />);
    expect(await screen.findByText('Việc mới giao')).toBeDefined();
    expect(screen.getByText(/Hạn: 09\/10\/2026/)).toBeDefined();
    expect(screen.getByText('Cần làm')).toBeDefined();
  });

  it('Xác nhận gọi API, làm mới cache và ẩn nút ở dòng đó', async () => {
    const { qc } = renderApp(<MyTasksToday />);
    const spy = vi.spyOn(qc, 'invalidateQueries');
    const ackButtons = await screen.findAllByRole('button', { name: 'Xác nhận' });
    expect(ackButtons).toHaveLength(2);
    fireEvent.click(ackButtons[0]);
    await waitFor(() => expect(api.acknowledgeTask).toHaveBeenCalledWith(101));
    expect(await screen.findByText('Đã xác nhận nhận việc')).toBeDefined();
    expect(spy).toHaveBeenCalledWith({ queryKey: MY_TASKS_TODAY_KEY });
    expect(screen.getAllByRole('button', { name: 'Xác nhận' })).toHaveLength(1);
  });

  it('lỗi khi xác nhận hiện tiếng Việt và giữ nút', async () => {
    vi.mocked(api.acknowledgeTask).mockRejectedValueOnce({ response: { status: 403, data: { error: 'Bạn không được giao công việc này.' } } });
    renderApp(<MyTasksToday />);
    fireEvent.click((await screen.findAllByRole('button', { name: 'Xác nhận' }))[0]);
    expect(await screen.findByText('Bạn không được giao công việc này.')).toBeDefined();
    expect(screen.getAllByRole('button', { name: 'Xác nhận' })).toHaveLength(2);
  });

  it('Nộp nghiệm thu mở hộp theo từng dòng (chỉ việc todo/in_progress)', async () => {
    renderApp(<MyTasksToday />);
    const submit = await screen.findAllByRole('button', { name: 'Nộp nghiệm thu' });
    expect(submit).toHaveLength(2);
    fireEvent.click(submit[0]);
    expect(await screen.findByText('Nộp nghiệm thu: Chuẩn bị phòng họp')).toBeDefined();
  });

  it('mục "Chờ bạn duyệt" có ba nút duyệt và không có Xác nhận/Nộp nghiệm thu', async () => {
    vi.mocked(api.fetchMyTasksToday).mockResolvedValue({ dueToday: [], overdue: [], pendingMyReview: [row({ id: 103, title: 'Duyệt bài đăng', status: 'review' })] });
    renderApp(<MyTasksToday />);
    await screen.findByText('Duyệt bài đăng');
    expect(screen.getByRole('button', { name: 'Duyệt đạt' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Yêu cầu làm lại' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Bác bỏ' })).toBeDefined();
    expect(screen.queryByRole('button', { name: 'Xác nhận' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Nộp nghiệm thu' })).toBeNull();
  });

  it('Xem chi tiết và bấm tiêu đề mở hộp công việc', async () => {
    const open = vi.fn();
    renderApp(<TaskModalContext.Provider value={{ open, close: vi.fn() }}><MyTasksToday /></TaskModalContext.Provider>);
    fireEvent.click((await screen.findAllByRole('button', { name: 'Xem chi tiết' }))[0]);
    expect(open).toHaveBeenCalledWith(101);
    fireEvent.click(screen.getByRole('button', { name: 'Báo cáo tháng 9' }));
    expect(open).toHaveBeenCalledWith(102);
  });
});
```

- [ ] **Step 2: Chạy, xác nhận hỏng**

Run: `npx vitest run src/core/features/tasks/MyTasksToday.test.tsx` — Expected: FAIL (chưa có nút, tiêu đề cũ).

- [ ] **Step 3: Viết code**

Thay `web/src/core/features/tasks/MyTasksToday.tsx`:

```tsx
import React, { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { token } from '@atlaskit/tokens';
import Badge from '@atlaskit/badge';
import Button from '@atlaskit/button/new';
import Lozenge from '@atlaskit/lozenge';
import { LottieLoading } from '../../../shared/components/LottieLoading';
import InboxIcon from '@atlaskit/icon/core/inbox';
import { acknowledgeTask, apiErrorMessage, fetchMyTasksToday, TaskItem } from '../../api';
import { MY_TASKS_TODAY_KEY } from '../../queryKeys';
import { useToast } from '../../../shared/components/Toast';
import { formatVnDate } from '../../../shared/utils/date';
import { getTaskPriorityAppearance, getTaskPriorityLabel, getTaskStatusAppearance, getTaskStatusLabel } from './taskLabels';
import { isSubmittable } from './taskPermissions';
import { useInvalidateTaskCaches } from './useTaskCaches';
import { useTaskModal } from './TaskModalProvider';
import { TaskTitleButton } from './TaskRowControls';
import { SubmitReviewDialog } from './SubmitReviewDialog';
import { ReviewButtons } from './ReviewButtons';

interface RowProps {
  task: TaskItem;
  review: boolean;
  acked: boolean;
  ackPending: boolean;
  onAck: (id: number) => void;
  onSubmit: (task: TaskItem) => void;
}

const TaskCardItem: React.FC<RowProps> = ({ task, review, acked, ackPending, onAck, onSubmit }) => {
  const { open } = useTaskModal();
  return (
    <div style={{
      backgroundColor: token('elevation.surface', '#FFFFFF'), border: `1px solid ${token('color.border', '#DFE1E6')}`,
      borderRadius: '4px', padding: '12px 16px', marginBottom: '8px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ fontSize: '14px', marginBottom: '4px' }}><TaskTitleButton task={task} /></div>
          <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: token('color.text.subtle', '#6B778C'), flexWrap: 'wrap' }}>
            {task.activity_title && <span>Hoạt động: <Link to={`/activity/${task.activity_id}`}>{task.activity_title}</Link></span>}
            {task.team_name && <span>Tổ: {task.team_name}</span>}
            {task.deadline && <span>Hạn: {formatVnDate(task.deadline)}</span>}
            {task.assignee_name && <span>Phụ trách: {task.assignee_name}</span>}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          {task.priority && <Lozenge appearance={getTaskPriorityAppearance(task.priority)}>{getTaskPriorityLabel(task.priority)}</Lozenge>}
          <Lozenge appearance={getTaskStatusAppearance(task.status)}>{getTaskStatusLabel(task.status)}</Lozenge>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
        {review ? (
          <ReviewButtons taskId={task.id} taskTitle={task.title} />
        ) : (
          <>
            {!acked && <Button spacing="compact" isLoading={ackPending} onClick={() => onAck(task.id)}>Xác nhận</Button>}
            {isSubmittable(task.status) && <Button spacing="compact" appearance="primary" onClick={() => onSubmit(task)}>Nộp nghiệm thu</Button>}
          </>
        )}
        <Button spacing="compact" appearance="subtle" onClick={() => open(task.id)}>Xem chi tiết</Button>
      </div>
    </div>
  );
};

const TaskSection: React.FC<{
  title: string; count: number; badgeAppearance?: 'default' | 'primary' | 'important' | 'added' | 'removed';
  emptyMessage: string; tasks: TaskItem[]; review?: boolean; acked: Set<number>; ackingId: number | null;
  onAck: (id: number) => void; onSubmit: (task: TaskItem) => void;
}> = ({ title, count, badgeAppearance = 'default', emptyMessage, tasks, review = false, acked, ackingId, onAck, onSubmit }) => (
  <div style={{
    backgroundColor: token('elevation.surface.raised', '#FFFFFF'), borderRadius: '8px',
    boxShadow: token('elevation.shadow.raised', '0 1px 1px rgba(9, 30, 66, 0.25), 0 0 1px rgba(9, 30, 66, 0.31)'),
    padding: '24px', marginBottom: '24px', border: `1px solid ${token('color.border', '#DFE1E6')}`,
  }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
      <h2 style={{ fontSize: '16px', fontWeight: 600, margin: 0, color: token('color.text', '#172B4D') }}>{title}</h2>
      <Badge appearance={badgeAppearance}>{count}</Badge>
    </div>
    {tasks.length === 0 ? (
      <div style={{
        backgroundColor: token('color.background.neutral.subtle', '#F4F5F7'), borderRadius: '4px', padding: '16px 24px',
        border: `1px solid ${token('color.border', '#DFE1E6')}`, display: 'flex', alignItems: 'center', gap: '12px',
      }}>
        <div style={{ color: token('color.icon.subtle', '#6B778C'), display: 'flex' }}><InboxIcon label="" size="small" /></div>
        <span style={{ fontSize: '14px', fontWeight: 500, color: token('color.text', '#172B4D') }}>{emptyMessage}</span>
      </div>
    ) : (
      <div>
        {tasks.map((task) => (
          <TaskCardItem key={task.id} task={task} review={review} acked={acked.has(task.id)} ackPending={ackingId === task.id}
            onAck={onAck} onSubmit={onSubmit} />
        ))}
      </div>
    )}
  </div>
);

export const MyTasksToday: React.FC = () => {
  const toast = useToast();
  const invalidate = useInvalidateTaskCaches();
  const { data, isLoading, isError } = useQuery({ queryKey: MY_TASKS_TODAY_KEY, queryFn: fetchMyTasksToday });
  // /api/my-tasks-today không trả acknowledged_at, nên nhớ cục bộ những việc vừa xác nhận.
  const [acked, setAcked] = useState<Set<number>>(new Set());
  const [submitTask, setSubmitTask] = useState<TaskItem | null>(null);

  const ackMutation = useMutation({
    mutationFn: (id: number) => acknowledgeTask(id),
    onSuccess: (_result, id) => {
      setAcked((prev) => new Set(prev).add(id));
      toast.success('Đã xác nhận nhận việc');
      return invalidate(id);
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Không xác nhận được. Vui lòng thử lại.')),
  });
  const ackingId = ackMutation.isPending ? (ackMutation.variables ?? null) : null;

  const dueToday = data?.dueToday || [];
  const overdue = data?.overdue || [];
  const pendingMyReview = data?.pendingMyReview || [];
  const common = { acked, ackingId, onAck: (id: number) => ackMutation.mutate(id), onSubmit: setSubmitTask };

  return (
    <div style={{ maxWidth: '1000px', margin: '0', paddingTop: '16px' }}>
      <h1 style={{ fontSize: '28px', fontWeight: 600, color: token('color.text', '#172B4D'), marginBottom: '8px' }}>Công việc hôm nay</h1>
      <p style={{ fontSize: '14px', color: token('color.text.subtle', '#5E6C84'), marginBottom: '32px' }}>
        Công việc đến hạn hôm nay, quá hạn, hoặc đang chờ bạn duyệt.
      </p>

      {isLoading ? (
        <LottieLoading message="Đang tải danh sách việc cần xử lý..." size={140} />
      ) : isError ? (
        <div style={{ color: token('color.text.danger', '#DE350B'), padding: '16px' }}>Lỗi tải danh sách công việc.</div>
      ) : (
        <>
          <TaskSection title="Đến hạn hôm nay" count={dueToday.length} emptyMessage="Không có việc đến hạn hôm nay" tasks={dueToday} {...common} />
          <TaskSection title="Quá hạn" count={overdue.length} badgeAppearance={overdue.length > 0 ? 'important' : 'default'}
            emptyMessage="Không có việc quá hạn" tasks={overdue} {...common} />
          <TaskSection title="Chờ bạn duyệt" count={pendingMyReview.length} badgeAppearance="primary"
            emptyMessage="Không có việc chờ bạn duyệt" tasks={pendingMyReview} review {...common} />
        </>
      )}
      {submitTask && <SubmitReviewDialog isOpen taskId={submitTask.id} taskTitle={submitTask.title} onClose={() => setSubmitTask(null)} />}
    </div>
  );
};
```

- [ ] **Step 4: Chạy test**

Run: `npx vitest run src/core/features/tasks/MyTasksToday.test.tsx src/core/features/dashboard && npx tsc --noEmit -p .`
Expected: PASS. Nếu test Dashboard cũ dựng `MyTasksToday`/`TaskModal` không có `ToastProvider`, chỉ Dashboard dùng `TaskCheckButton`/`TaskTitleButton` (không dùng toast) nên không bị ảnh hưởng.

- [ ] **Step 5: Commit**

```bash
git add web/src/core/features/tasks
git commit -m "feat(web): Việc hôm nay có nút Xác nhận, Nộp nghiệm thu và duyệt theo từng dòng"
```

---

### Task 9: Giao việc (`CreateTaskModal`)

**Files:**
- Create: `web/src/core/features/tasks/CreateTaskModal.tsx`
- Test: `web/src/core/features/tasks/CreateTaskModal.test.tsx`

**Interfaces:**
- Consumes: `createTask`, `fetchTeamMembers`, `useCapabilities`, `PeoplePicker`, `formFields`.
- Produces: `<CreateTaskModal isOpen activityId activityType? activityTeams onClose onCreated? />`; `activityTeams: BoardTeam[]` (`{team_id, name}`).

- [ ] **Step 1: Viết test hỏng**

```tsx
// web/src/core/features/tasks/CreateTaskModal.test.tsx
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { CreateTaskModal } from './CreateTaskModal';
import { renderApp, makeSession } from './testUtils';
import * as api from '../../api';

vi.mock('../../api', async () => {
  const actual = await vi.importActual<typeof import('../../api')>('../../api');
  return { ...actual, createTask: vi.fn(), fetchTeamMembers: vi.fn() };
});

const teams = [{ team_id: 2, name: 'Tổ Sự kiện' }, { team_id: 3, name: 'Tổ Truyền thông' }];
const members = (names: [number, string][]) => ({ members: names.map(([id, name]) => ({ id, name })), available: [] });
const admin = { session: makeSession({ id: 1, role: 'admin' }) };

function deferred<T>() {
  let resolve!: (v: T) => void;
  const promise = new Promise<T>((r) => { resolve = r; });
  return { promise, resolve };
}

describe('CreateTaskModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.createTask).mockResolvedValue({ id: 50 });
    vi.mocked(api.fetchTeamMembers).mockImplementation(async (id) => (id === 2 ? members([[7, 'Nguyễn An'], [8, 'Trần Bình']]) : members([[9, 'Lê Cường']])));
  });
  afterEach(cleanup);

  it('admin thấy mọi Tổ của hoạt động; người khác chỉ thấy Tổ mình quản lý', () => {
    renderApp(<CreateTaskModal isOpen activityId={9} activityType="event" activityTeams={teams} onClose={() => {}} />, admin);
    expect(screen.getAllByRole('option', { name: /Tổ Sự kiện|Tổ Truyền thông/ })).toHaveLength(2);
    cleanup();
    renderApp(<CreateTaskModal isOpen activityId={9} activityType="event" activityTeams={teams} onClose={() => {}} />,
      { session: makeSession({ id: 3, role: 'leader' }), teams: [{ id: 3, can_manage: 1 }] });
    expect(screen.queryByRole('option', { name: 'Tổ Sự kiện' })).toBeNull();
    expect(screen.getByRole('option', { name: 'Tổ Truyền thông' })).toBeDefined();
  });

  it('người không quản lý Tổ nào của hoạt động được báo rõ và không gửi được', () => {
    renderApp(<CreateTaskModal isOpen activityId={9} activityType="event" activityTeams={teams} onClose={() => {}} />);
    expect(screen.getByText(/Bạn không quản lý Tổ nào của hoạt động này/)).toBeDefined();
  });

  it('chọn Tổ tải thành viên; người chính bị loại khỏi danh sách đồng phụ trách', async () => {
    renderApp(<CreateTaskModal isOpen activityId={9} activityType="event" activityTeams={teams} onClose={() => {}} />, admin);
    fireEvent.change(screen.getByLabelText(/Tổ phụ trách/), { target: { value: '2' } });
    expect(await screen.findByRole('option', { name: 'Nguyễn An' })).toBeDefined();
    fireEvent.change(screen.getByLabelText(/Người phụ trách chính/), { target: { value: '7' } });
    fireEvent.change(screen.getByLabelText(/Đồng phụ trách/), { target: { value: 'nguyen' } });
    expect(screen.queryByRole('option', { name: /Nguyễn An/ })).toBeNull();
    fireEvent.change(screen.getByLabelText(/Đồng phụ trách/), { target: { value: 'tran' } });
    expect(screen.getByRole('option', { name: /Trần Bình/ })).toBeDefined();
  });

  it('đổi Tổ nhanh: kết quả về muộn của Tổ trước không ghi đè danh sách Tổ mới', async () => {
    const slow = deferred<ReturnType<typeof members>>();
    const fast = deferred<ReturnType<typeof members>>();
    vi.mocked(api.fetchTeamMembers).mockImplementation((id) => (id === 2 ? slow.promise : fast.promise));
    renderApp(<CreateTaskModal isOpen activityId={9} activityType="event" activityTeams={teams} onClose={() => {}} />, admin);
    fireEvent.change(screen.getByLabelText(/Tổ phụ trách/), { target: { value: '2' } });
    fireEvent.change(screen.getByLabelText(/Tổ phụ trách/), { target: { value: '3' } });
    await act(async () => { fast.resolve(members([[9, 'Lê Cường']])); });
    await act(async () => { slow.resolve(members([[7, 'Nguyễn An']])); });
    expect(await screen.findByRole('option', { name: 'Lê Cường' })).toBeDefined();
    expect(screen.queryByRole('option', { name: 'Nguyễn An' })).toBeNull();
  });

  it('kiểm tra bắt buộc trước khi gửi', () => {
    renderApp(<CreateTaskModal isOpen activityId={9} activityType="event" activityTeams={teams} onClose={() => {}} />, admin);
    fireEvent.click(screen.getByRole('button', { name: 'Giao việc' }));
    expect(screen.getByText('Vui lòng nhập tiêu đề.')).toBeDefined();
    fireEvent.change(screen.getByLabelText(/Tiêu đề/), { target: { value: 'Dựng sân khấu' } });
    fireEvent.click(screen.getByRole('button', { name: 'Giao việc' }));
    expect(screen.getByText('Vui lòng chọn Tổ phụ trách.')).toBeDefined();
    expect(api.createTask).not.toHaveBeenCalled();
  });

  it('gửi đúng payload, làm mới cache, báo thành công và đóng', async () => {
    const onClose = vi.fn();
    const onCreated = vi.fn();
    const { qc } = renderApp(<CreateTaskModal isOpen activityId={9} activityType="event" activityTeams={teams} onClose={onClose} onCreated={onCreated} />, admin);
    const spy = vi.spyOn(qc, 'invalidateQueries');
    fireEvent.change(screen.getByLabelText(/Tiêu đề/), { target: { value: ' Dựng sân khấu ' } });
    fireEvent.change(screen.getByLabelText(/Giai đoạn/), { target: { value: 'before' } });
    fireEvent.change(screen.getByLabelText(/Tổ phụ trách/), { target: { value: '2' } });
    await screen.findByRole('option', { name: 'Nguyễn An' });
    fireEvent.change(screen.getByLabelText(/Người phụ trách chính/), { target: { value: '7' } });
    fireEvent.change(screen.getByLabelText(/Đồng phụ trách/), { target: { value: 'tran' } });
    fireEvent.click(screen.getByRole('option', { name: /Trần Bình/ }));
    fireEvent.change(screen.getByLabelText(/Hạn chót/), { target: { value: '2026-11-20' } });
    fireEvent.change(screen.getByLabelText('Mức ưu tiên'), { target: { value: 'high' } });
    fireEvent.change(screen.getByLabelText('Sản phẩm cần nộp'), { target: { value: 'Ảnh nghiệm thu' } });
    fireEvent.click(screen.getByRole('button', { name: 'Giao việc' }));
    await waitFor(() => expect(api.createTask).toHaveBeenCalledWith(9, {
      title: 'Dựng sân khấu', description: '', stage: 'before', priority: 'high', team_id: 2, start_date: null,
      deadline: '2026-11-20', deliverable: 'Ảnh nghiệm thu', primary_assignee_id: 7, co_assignee_ids: [8],
    }));
    expect(await screen.findByText('Đã giao việc')).toBeDefined();
    expect(spy).toHaveBeenCalledWith({ queryKey: ['core-activity'] });
    expect(onCreated).toHaveBeenCalledWith(50);
    expect(onClose).toHaveBeenCalled();
  });

  it('hoạt động được giao (assigned): không có ô giai đoạn, luôn gửi general', async () => {
    renderApp(<CreateTaskModal isOpen activityId={9} activityType="assigned" activityTeams={[teams[0]]} onClose={() => {}} />, admin);
    expect(screen.queryByLabelText(/Giai đoạn/)).toBeNull();
    fireEvent.change(screen.getByLabelText(/Tiêu đề/), { target: { value: 'Việc' } });
    await screen.findByRole('option', { name: 'Nguyễn An' }); // một Tổ duy nhất: tự chọn
    fireEvent.change(screen.getByLabelText(/Người phụ trách chính/), { target: { value: '7' } });
    fireEvent.change(screen.getByLabelText(/Hạn chót/), { target: { value: '2026-11-20' } });
    fireEvent.click(screen.getByRole('button', { name: 'Giao việc' }));
    await waitFor(() => expect(api.createTask).toHaveBeenCalledWith(9, expect.objectContaining({ stage: 'general', team_id: 2 })));
  });

  it('lỗi tải thành viên (403) và lỗi tạo hiện bằng tiếng Việt', async () => {
    vi.mocked(api.fetchTeamMembers).mockRejectedValue({ response: { status: 403, data: { error: 'You cannot manage this team.' } } });
    renderApp(<CreateTaskModal isOpen activityId={9} activityType="event" activityTeams={teams} onClose={() => {}} />, admin);
    fireEvent.change(screen.getByLabelText(/Tổ phụ trách/), { target: { value: '2' } });
    expect(await screen.findByText('Bạn không có quyền quản lý Tổ này.')).toBeDefined();
  });

  it('server từ chối giao việc: hiện lý do trong hộp', async () => {
    vi.mocked(api.createTask).mockRejectedValueOnce({ response: { status: 403, data: { error: 'Bạn không thể giao việc cho ban này.' } } });
    renderApp(<CreateTaskModal isOpen activityId={9} activityType="assigned" activityTeams={[teams[0]]} onClose={() => {}} />, admin);
    fireEvent.change(screen.getByLabelText(/Tiêu đề/), { target: { value: 'Việc' } });
    await screen.findByRole('option', { name: 'Nguyễn An' });
    fireEvent.change(screen.getByLabelText(/Người phụ trách chính/), { target: { value: '7' } });
    fireEvent.change(screen.getByLabelText(/Hạn chót/), { target: { value: '2026-11-20' } });
    fireEvent.click(screen.getByRole('button', { name: 'Giao việc' }));
    expect(await screen.findByText('Bạn không thể giao việc cho ban này.')).toBeDefined();
  });
});
```

Ghi chú test: nhãn của `PeoplePicker` là "Đồng phụ trách"; chọn gợi ý bằng `fireEvent.click` lên `role="option"` (như `PeoplePicker.test.tsx` của đợt 0).

- [ ] **Step 2: Chạy, xác nhận hỏng**

Run: `npx vitest run src/core/features/tasks/CreateTaskModal.test.tsx` — Expected: FAIL (không resolve `./CreateTaskModal`).

- [ ] **Step 3: Viết code**

```tsx
// web/src/core/features/tasks/CreateTaskModal.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import Modal, { ModalBody, ModalFooter, ModalHeader, ModalTitle, ModalTransition } from '@atlaskit/modal-dialog';
import Button from '@atlaskit/button/new';
import { apiErrorMessage, createTask, fetchTeamMembers, type BoardTeam } from '../../api';
import { useCapabilities } from '../../capabilities';
import { useToast } from '../../../shared/components/Toast';
import { PeoplePicker } from '../../../shared/components/PeoplePicker';
import { useInvalidateTaskCaches } from './useTaskCaches';
import { AreaField, ErrorText, PRIORITY_OPTIONS, SelectField, STAGE_OPTIONS, TextField } from './formFields';

export interface CreateTaskModalProps {
  isOpen: boolean;
  activityId: number;
  /** `event` có giai đoạn trước/trong/sau; `assigned` luôn là "Chung". */
  activityType?: string;
  activityTeams: BoardTeam[];
  onClose: () => void;
  onCreated?: (taskId: number) => void;
}

/** Giao việc (`POST /api/activities/:id/tasks`). Admin thấy mọi Tổ của hoạt động, người khác chỉ Tổ mình quản lý. */
export const CreateTaskModal: React.FC<CreateTaskModalProps> = ({ isOpen, activityId, activityType, activityTeams, onClose, onCreated }) => {
  const caps = useCapabilities();
  const toast = useToast();
  const invalidate = useInvalidateTaskCaches();

  const [title, setTitle] = useState('');
  const [stage, setStage] = useState('before');
  const [teamId, setTeamId] = useState('');
  const [primaryId, setPrimaryId] = useState('');
  const [coIds, setCoIds] = useState<number[]>([]);
  const [startDate, setStartDate] = useState('');
  const [deadline, setDeadline] = useState('');
  const [priority, setPriority] = useState('medium');
  const [deliverable, setDeliverable] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');

  const teamOptions = useMemo(
    () => activityTeams.filter((t) => caps.isExec || caps.canManageTeam(t.team_id)).map((t) => ({ value: String(t.team_id), label: t.name })),
    [activityTeams, caps]
  );
  const showStage = activityType === 'event';

  useEffect(() => {
    if (!isOpen) return;
    setTitle(''); setStage('before'); setPrimaryId(''); setCoIds([]); setStartDate(''); setDeadline('');
    setPriority('medium'); setDeliverable(''); setDescription(''); setError('');
    setTeamId(teamOptions.length === 1 ? teamOptions[0].value : '');
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  // Dữ liệu gắn với key theo Tổ: kết quả về muộn của lần đổi Tổ trước nằm ở key cũ, không bao giờ hiện.
  const teamNumber = Number(teamId) || 0;
  const membersQuery = useQuery({
    queryKey: ['core-team-members', teamNumber],
    queryFn: () => fetchTeamMembers(teamNumber),
    enabled: isOpen && teamNumber > 0,
  });
  const members = teamNumber > 0 ? membersQuery.data?.members ?? [] : [];

  const changeTeam = (value: string) => { setTeamId(value); setPrimaryId(''); setCoIds([]); };
  const changePrimary = (value: string) => { setPrimaryId(value); setCoIds((ids) => ids.filter((id) => id !== Number(value))); };

  const mutation = useMutation({
    mutationFn: () => createTask(activityId, {
      title: title.trim(), description: description.trim(), stage: showStage ? stage : 'general', priority,
      team_id: teamNumber, start_date: startDate || null, deadline, deliverable: deliverable.trim(),
      primary_assignee_id: Number(primaryId), co_assignee_ids: coIds.filter((id) => id !== Number(primaryId)),
    }),
    onSuccess: async (created) => {
      toast.success('Đã giao việc');
      await invalidate();
      onCreated?.(created.id);
      onClose();
    },
    onError: (err) => setError(apiErrorMessage(err, 'Không giao được việc. Vui lòng kiểm tra lại thông tin.')),
  });

  const submit = () => {
    if (!title.trim()) { setError('Vui lòng nhập tiêu đề.'); return; }
    if (!teamNumber) { setError('Vui lòng chọn Tổ phụ trách.'); return; }
    if (!primaryId) { setError('Vui lòng chọn người phụ trách chính.'); return; }
    if (!deadline) { setError('Vui lòng chọn hạn chót.'); return; }
    if (startDate && startDate > deadline) { setError('Ngày bắt đầu phải trước hoặc bằng hạn chót.'); return; }
    setError('');
    mutation.mutate();
  };

  return (
    <ModalTransition>
      {isOpen && (
        <Modal onClose={onClose} width="medium" shouldScrollInViewport>
          <ModalHeader><ModalTitle>Giao việc</ModalTitle></ModalHeader>
          <ModalBody>
            {teamOptions.length === 0 ? (
              <p role="alert">Bạn không quản lý Tổ nào của hoạt động này nên chưa giao việc được.</p>
            ) : (
              <>
                <TextField label="Tiêu đề" required value={title} onChange={setTitle} />
                {showStage && <SelectField label="Giai đoạn" value={stage} onChange={setStage} options={STAGE_OPTIONS} />}
                <SelectField label="Tổ phụ trách" required value={teamId} onChange={changeTeam} options={teamOptions} placeholder="Chọn Tổ" />
                {membersQuery.isError && <ErrorText>{apiErrorMessage(membersQuery.error, 'Không tải được thành viên của Tổ.')}</ErrorText>}
                <SelectField label="Người phụ trách chính" required value={primaryId} onChange={changePrimary}
                  options={members.map((m) => ({ value: String(m.id), label: m.name }))} placeholder="Chọn người" disabled={teamNumber === 0} />
                <PeoplePicker label="Đồng phụ trách" people={members} value={coIds} onChange={setCoIds} excludeIds={primaryId ? [Number(primaryId)] : []} />
                <TextField label="Ngày bắt đầu" type="date" value={startDate} onChange={setStartDate} />
                <TextField label="Hạn chót" type="date" required value={deadline} onChange={setDeadline} />
                <SelectField label="Mức ưu tiên" value={priority} onChange={setPriority} options={PRIORITY_OPTIONS} />
                <AreaField label="Sản phẩm cần nộp" value={deliverable} onChange={setDeliverable} rows={2} />
                <AreaField label="Mô tả" value={description} onChange={setDescription} />
              </>
            )}
            <ErrorText>{error}</ErrorText>
          </ModalBody>
          <ModalFooter>
            <Button appearance="subtle" onClick={onClose}>Huỷ</Button>
            {teamOptions.length > 0 && <Button appearance="primary" isLoading={mutation.isPending} onClick={submit}>Giao việc</Button>}
          </ModalFooter>
        </Modal>
      )}
    </ModalTransition>
  );
};
```

- [ ] **Step 4: Chạy test**

Run: `npx vitest run src/core/features/tasks/CreateTaskModal.test.tsx && npx tsc --noEmit -p .`
Expected: PASS. Ghi chú: `getByLabelText(/Tổ phụ trách/)` có thể khớp cả "Người phụ trách chính" — regex `/Tổ phụ trách/` chỉ khớp nhãn "Tổ phụ trách"; `/Người phụ trách chính/` khớp một nhãn. Nếu `aria-label` của danh sách gợi ý PeoplePicker (`Gợi ý Đồng phụ trách`) gây khớp thừa với `/Đồng phụ trách/`, đổi truy vấn thành `getByLabelText('Đồng phụ trách')`.

- [ ] **Step 5: Commit**

```bash
git add web/src/core/features/tasks
git commit -m "feat(web): hộp Giao việc theo Tổ, bỏ qua kết quả tải thành viên về muộn"
```

---

### Task 10: Tự ghi nhận việc (`SelfLogModal`)

**Files:**
- Create: `web/src/core/features/tasks/SelfLogModal.tsx`
- Test: `web/src/core/features/tasks/SelfLogModal.test.tsx`

**Interfaces:**
- Consumes: `logTask`, `fetchWeightPresets`, `fetchMembers` (key `['core-members']`, như `MembersView`), `useCurrentUserId`, `LinkField`.
- Produces: `<SelfLogModal isOpen activityId activityTeams onClose />`.

- [ ] **Step 1: Viết test hỏng**

```tsx
// web/src/core/features/tasks/SelfLogModal.test.tsx
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { SelfLogModal } from './SelfLogModal';
import { renderApp, makeSession } from './testUtils';
import * as api from '../../api';

vi.mock('../../api', async () => {
  const actual = await vi.importActual<typeof import('../../api')>('../../api');
  return { ...actual, logTask: vi.fn(), fetchWeightPresets: vi.fn(), fetchMembers: vi.fn() };
});

const teams = [{ team_id: 2, name: 'Tổ Sự kiện' }, { team_id: 3, name: 'Tổ Truyền thông' }];

describe('SelfLogModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.logTask).mockResolvedValue({ id: 70 });
    vi.mocked(api.fetchWeightPresets).mockResolvedValue([{ id: 1, name: 'Trực gian hàng', points: 3 }, { id: 2, name: 'Hỗ trợ nhỏ', points: 1 }]);
    vi.mocked(api.fetchMembers).mockResolvedValue([{ id: 7, name: 'An', email: 'a@x', role: 'member', team_ids: '3' }]);
  });
  afterEach(cleanup);

  const open = () => renderApp(<SelfLogModal isOpen activityId={9} activityTeams={teams} onClose={() => {}} />, { session: makeSession({ id: 7 }) });

  it('chọn sẵn Tổ của người dùng trong số Tổ của hoạt động', async () => {
    open();
    await waitFor(() => expect((screen.getByLabelText(/Tổ phụ trách/) as HTMLSelectElement).value).toBe('3'));
  });

  it('chọn bộ trọng số điền trọng số và điền tên nếu đang trống', async () => {
    open();
    await screen.findByRole('option', { name: /Trực gian hàng/ });
    fireEvent.change(screen.getByLabelText('Mẫu trọng số'), { target: { value: '1' } });
    expect((screen.getByLabelText(/Trọng số/) as HTMLInputElement).value).toBe('3');
    expect((screen.getByLabelText(/Tên công việc/) as HTMLInputElement).value).toBe('Trực gian hàng');
  });

  it('trọng số phải là số nguyên 0–10', async () => {
    open();
    fireEvent.change(screen.getByLabelText(/Tên công việc/), { target: { value: 'Việc' } });
    await waitFor(() => expect((screen.getByLabelText(/Tổ phụ trách/) as HTMLSelectElement).value).toBe('3'));
    for (const bad of ['0.5', '11', '-1']) {
      fireEvent.change(screen.getByLabelText(/Trọng số/), { target: { value: bad } });
      fireEvent.click(screen.getByRole('button', { name: 'Ghi nhận' }));
      expect(screen.getByText('Trọng số phải là số nguyên từ 0 đến 10.')).toBeDefined();
    }
    expect(api.logTask).not.toHaveBeenCalled();
  });

  it('link minh chứng tuỳ chọn nhưng nếu nhập phải là http(s)', async () => {
    open();
    fireEvent.change(screen.getByLabelText(/Tên công việc/), { target: { value: 'Việc' } });
    await waitFor(() => expect((screen.getByLabelText(/Tổ phụ trách/) as HTMLSelectElement).value).toBe('3'));
    fireEvent.change(screen.getByLabelText(/Liên kết minh chứng/), { target: { value: 'abc' } });
    fireEvent.click(screen.getByRole('button', { name: 'Ghi nhận' }));
    expect(screen.getByText('Liên kết minh chứng phải bắt đầu bằng http:// hoặc https://.')).toBeDefined();
    expect(api.logTask).not.toHaveBeenCalled();
  });

  it('gửi đúng payload, làm mới cache và báo "đang chờ nghiệm thu"', async () => {
    const { qc } = open();
    const spy = vi.spyOn(qc, 'invalidateQueries');
    fireEvent.change(screen.getByLabelText(/Tên công việc/), { target: { value: ' Trực gian hàng ' } });
    await waitFor(() => expect((screen.getByLabelText(/Tổ phụ trách/) as HTMLSelectElement).value).toBe('3'));
    fireEvent.change(screen.getByLabelText(/Trọng số/), { target: { value: '3' } });
    fireEvent.change(screen.getByLabelText(/Liên kết minh chứng/), { target: { value: 'https://drive.example/c' } });
    fireEvent.change(screen.getByLabelText('Mô tả'), { target: { value: 'Ca sáng' } });
    fireEvent.click(screen.getByRole('button', { name: 'Ghi nhận' }));
    await waitFor(() => expect(api.logTask).toHaveBeenCalledWith(9, { title: 'Trực gian hàng', team_id: 3, weight: 3, link_url: 'https://drive.example/c', description: 'Ca sáng' }));
    expect(await screen.findByText('Đã ghi nhận công việc thành công. Đang chờ nghiệm thu.')).toBeDefined();
    expect(spy).toHaveBeenCalledWith({ queryKey: ['core-activity'] });
  });

  it('lỗi 409 (hoạt động chưa duyệt) hiện tiếng Việt', async () => {
    vi.mocked(api.logTask).mockRejectedValueOnce({ response: { status: 409, data: { error: 'Chỉ có thể ghi nhận công việc vào hoạt động đã được duyệt và đang diễn ra.' } } });
    open();
    fireEvent.change(screen.getByLabelText(/Tên công việc/), { target: { value: 'Việc' } });
    await waitFor(() => expect((screen.getByLabelText(/Tổ phụ trách/) as HTMLSelectElement).value).toBe('3'));
    fireEvent.click(screen.getByRole('button', { name: 'Ghi nhận' }));
    expect(await screen.findByText('Chỉ có thể ghi nhận công việc vào hoạt động đã được duyệt và đang diễn ra.')).toBeDefined();
  });
});
```

- [ ] **Step 2: Chạy, xác nhận hỏng**

Run: `npx vitest run src/core/features/tasks/SelfLogModal.test.tsx` — Expected: FAIL.

- [ ] **Step 3: Viết code**

```tsx
// web/src/core/features/tasks/SelfLogModal.tsx
import React, { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import Modal, { ModalBody, ModalFooter, ModalHeader, ModalTitle, ModalTransition } from '@atlaskit/modal-dialog';
import Button from '@atlaskit/button/new';
import { apiErrorMessage, fetchMembers, fetchWeightPresets, logTask, type BoardTeam } from '../../api';
import { useToast } from '../../../shared/components/Toast';
import { LinkField } from '../../../shared/components/LinkField';
import { isHttpUrl } from '../../../shared/utils/url';
import { useInvalidateTaskCaches } from './useTaskCaches';
import { useCurrentUserId } from './taskPermissions';
import { AreaField, ErrorText, SelectField, TextField } from './formFields';

export interface SelfLogModalProps { isOpen: boolean; activityId: number; activityTeams: BoardTeam[]; onClose: () => void }

/** Tự ghi nhận việc đã làm (chỉ hoạt động approved/active). Trọng số là số nguyên 0–10 theo server. */
export const SelfLogModal: React.FC<SelfLogModalProps> = ({ isOpen, activityId, activityTeams, onClose }) => {
  const toast = useToast();
  const invalidate = useInvalidateTaskCaches();
  const userId = useCurrentUserId();
  const [title, setTitle] = useState('');
  const [teamId, setTeamId] = useState('');
  const [weight, setWeight] = useState('1');
  const [link, setLink] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');

  const presetsQuery = useQuery({ queryKey: ['core-weight-presets'], queryFn: fetchWeightPresets, enabled: isOpen });
  const membersQuery = useQuery({ queryKey: ['core-members'], queryFn: fetchMembers, enabled: isOpen });
  const presets = presetsQuery.data ?? [];

  useEffect(() => {
    if (isOpen) { setTitle(''); setTeamId(''); setWeight('1'); setLink(''); setDescription(''); setError(''); }
  }, [isOpen]);

  // Chọn sẵn Tổ của người dùng (nếu thuộc đúng một Tổ của hoạt động), hoặc Tổ duy nhất.
  useEffect(() => {
    if (!isOpen || teamId) return;
    if (activityTeams.length === 1) { setTeamId(String(activityTeams[0].team_id)); return; }
    const me = (membersQuery.data ?? []).find((m) => m.id === userId);
    const mine = String(me?.team_ids ?? '').split(',').map(Number).filter((id) => activityTeams.some((t) => t.team_id === id));
    if (mine.length === 1) setTeamId(String(mine[0]));
  }, [isOpen, teamId, activityTeams, membersQuery.data, userId]);

  const mutation = useMutation({
    mutationFn: () => logTask(activityId, {
      title: title.trim(), team_id: Number(teamId), weight: Number(weight),
      link_url: link.trim() || undefined, description: description.trim() || undefined,
    }),
    onSuccess: async () => {
      toast.success('Đã ghi nhận công việc thành công. Đang chờ nghiệm thu.');
      await invalidate();
      onClose();
    },
    onError: (err) => setError(apiErrorMessage(err, 'Không ghi nhận được công việc.')),
  });

  const choosePreset = (value: string) => {
    const preset = presets.find((p) => String(p.id) === value);
    if (!preset) return;
    setWeight(String(preset.points));
    if (!title.trim()) setTitle(preset.name);
  };

  const submit = () => {
    const w = Number(weight);
    if (!title.trim()) { setError('Vui lòng nhập tên công việc.'); return; }
    if (!teamId) { setError('Vui lòng chọn Tổ phụ trách.'); return; }
    if (weight.trim() === '' || !Number.isInteger(w) || w < 0 || w > 10) { setError('Trọng số phải là số nguyên từ 0 đến 10.'); return; }
    if (link.trim() && !isHttpUrl(link)) { setError('Liên kết minh chứng phải bắt đầu bằng http:// hoặc https://.'); return; }
    setError('');
    mutation.mutate();
  };

  return (
    <ModalTransition>
      {isOpen && (
        <Modal onClose={onClose} width="small" shouldScrollInViewport>
          <ModalHeader><ModalTitle>Tự ghi nhận việc</ModalTitle></ModalHeader>
          <ModalBody>
            <TextField label="Tên công việc" required value={title} onChange={setTitle} />
            <SelectField label="Tổ phụ trách" required value={teamId} onChange={setTeamId} placeholder="Chọn Tổ"
              options={activityTeams.map((t) => ({ value: String(t.team_id), label: t.name }))} />
            {presets.length > 0 && (
              <SelectField label="Mẫu trọng số" value="" onChange={choosePreset} placeholder="Chọn mẫu (không bắt buộc)"
                options={presets.map((p) => ({ value: String(p.id), label: `${p.name} (${p.points} điểm)` }))} />
            )}
            <TextField label="Trọng số (0–10)" type="number" min={0} max={10} step={1} value={weight} onChange={setWeight} />
            <LinkField label="Liên kết minh chứng" value={link} onChange={(v) => { setLink(v); setError(''); }} />
            <AreaField label="Mô tả" value={description} onChange={setDescription} />
            <ErrorText>{error}</ErrorText>
          </ModalBody>
          <ModalFooter>
            <Button appearance="subtle" onClick={onClose}>Huỷ</Button>
            <Button appearance="primary" isLoading={mutation.isPending} onClick={submit}>Ghi nhận</Button>
          </ModalFooter>
        </Modal>
      )}
    </ModalTransition>
  );
};
```

Ghi chú: `LinkField` đã tự hiện `LINK_ERROR_MESSAGE` dưới ô khi link sai; câu "Liên kết minh chứng phải bắt đầu bằng …" ở `submit` là thông báo chặn gửi (khớp 400 của server). Test dùng `getByText` chính xác cho câu dài này nên không trùng câu ngắn của `LinkField`.

- [ ] **Step 4: Chạy test**

Run: `npx vitest run src/core/features/tasks/SelfLogModal.test.tsx && npx tsc --noEmit -p .`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add web/src/core/features/tasks
git commit -m "feat(web): hộp Tự ghi nhận việc với trọng số nguyên 0–10 và mẫu trọng số"
```

---

### Task 11: Kanban `#board/:id`

**Files:**
- Create: `web/src/core/features/tasks/KanbanBoard.tsx`
- Modify: `web/src/core/AppRoutes.tsx` (route `/board/:id`), `web/src/core/AppRoutes.test.tsx` (ca `/board/9`, mock `KanbanBoard`)
- Test: `web/src/core/features/tasks/KanbanBoard.test.tsx`

**Interfaces:**
- Consumes: `fetchActivityBoard`, `activityBoardKey`, `updateTaskStatus`, `SubmitReviewDialog`, `ReviewDialog`, `ReviewButtons`, `SelfLogModal`, các hàm quyền.
- Produces: `<KanbanBoard />` (đọc `:id` từ route).

- [ ] **Step 1: Viết test hỏng**

```tsx
// web/src/core/features/tasks/KanbanBoard.test.tsx
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { KanbanBoard } from './KanbanBoard';
import { TaskModalContext } from './TaskModalProvider';
import { renderApp, makeSession } from './testUtils';
import * as api from '../../api';

vi.mock('../../api', async () => {
  const actual = await vi.importActual<typeof import('../../api')>('../../api');
  return { ...actual, fetchActivityBoard: vi.fn(), updateTaskStatus: vi.fn(), fetchWeightPresets: vi.fn(), fetchMembers: vi.fn() };
});

const task = (over: Record<string, unknown>) => ({
  activity_id: 9, team_id: 2, priority: 'medium', deadline: '2099-12-31', assignee_ids: '8', primary_assignee_name: 'Trần Bình',
  checklist_total: 2, checklist_done: 1, is_self_logged: 0, ...over,
});

const board = (status = 'active') => ({
  activity: { id: 9, title: 'Ngày hội Kỹ thuật', status, event_lead_id: 99 },
  activityTeams: [{ team_id: 2, name: 'Tổ Sự kiện' }],
  canManage: false,
  tasks: [
    task({ id: 1, title: 'Việc A', status: 'todo', assignee_ids: '7' }),
    task({ id: 2, title: 'Việc B', status: 'in_progress', assignee_ids: '8' }),
    task({ id: 3, title: 'Việc C', status: 'review', assignee_ids: '8' }),
    task({ id: 4, title: 'Việc D', status: 'done', is_self_logged: 1, weight: 3 }),
    task({ id: 5, title: 'Việc đã huỷ', status: 'cancelled' }),
  ],
});

const leader = { session: makeSession({ id: 3, role: 'leader' }), teams: [{ id: 2, can_manage: 1 }] };
const opts = (extra: Record<string, unknown> = {}) => ({ path: '/board/9', routePath: '/board/:id', ...extra });
const card = (name: string) => screen.getByText(name).closest('article') as HTMLElement;
const column = (name: string) => screen.getByRole('region', { name });

describe('KanbanBoard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.fetchActivityBoard).mockResolvedValue(board() as never);
    vi.mocked(api.updateTaskStatus).mockResolvedValue(undefined);
    vi.mocked(api.fetchWeightPresets).mockResolvedValue([]);
    vi.mocked(api.fetchMembers).mockResolvedValue([]);
  });
  afterEach(() => { cleanup(); vi.restoreAllMocks(); });

  it('bốn cột theo trạng thái, ẩn việc đã huỷ, thẻ hiện huy hiệu và checklist', async () => {
    renderApp(<KanbanBoard />, opts());
    await screen.findByText('Việc A');
    expect(within(column('Cần làm')).getByText('Việc A')).toBeDefined();
    expect(within(column('Đang làm')).getByText('Việc B')).toBeDefined();
    expect(within(column('Chờ duyệt')).getByText('Việc C')).toBeDefined();
    expect(within(column('Hoàn thành')).getByText('Việc D')).toBeDefined();
    expect(screen.queryByText('Việc đã huỷ')).toBeNull();
    expect(within(card('Việc D')).getByText('Tự ghi nhận')).toBeDefined();
    expect(within(card('Việc D')).getByText('3đ')).toBeDefined();
    expect(within(card('Việc A')).getByText('1/2 việc con')).toBeDefined();
  });

  it('thành viên được giao: có Bắt đầu làm và Nộp nghiệm thu ở việc của mình, không có nút duyệt', async () => {
    renderApp(<KanbanBoard />, opts());
    await screen.findByText('Việc A');
    expect(within(card('Việc A')).getByRole('button', { name: 'Bắt đầu làm' })).toBeDefined();
    expect(within(card('Việc A')).getByRole('button', { name: 'Nộp nghiệm thu' })).toBeDefined();
    expect(within(card('Việc B')).queryByRole('button', { name: /Bắt đầu làm|Nộp nghiệm thu|Duyệt đạt/ })).toBeNull(); // việc của người khác
    expect(within(card('Việc C')).queryByRole('button', { name: 'Duyệt đạt' })).toBeNull();
  });

  it('Bắt đầu làm gọi PATCH status in_progress và làm mới bảng', async () => {
    const { qc } = renderApp(<KanbanBoard />, opts());
    const spy = vi.spyOn(qc, 'invalidateQueries');
    fireEvent.click(within(await screen.findByText('Việc A').then(() => card('Việc A'))).getByRole('button', { name: 'Bắt đầu làm' }));
    await waitFor(() => expect(api.updateTaskStatus).toHaveBeenCalledWith(1, 'in_progress'));
    expect(await screen.findByText('Đã cập nhật trạng thái')).toBeDefined();
    expect(spy).toHaveBeenCalledWith({ queryKey: ['core-activity'] });
  });

  it('Tổ trưởng: có nút duyệt ở cột Chờ duyệt và nút Bắt đầu làm ở việc không phải của mình', async () => {
    renderApp(<KanbanBoard />, opts(leader));
    await screen.findByText('Việc A');
    expect(within(card('Việc C')).getByRole('button', { name: 'Duyệt đạt' })).toBeDefined();
    expect(within(card('Việc A')).getByRole('button', { name: 'Bắt đầu làm' })).toBeDefined();
    expect(within(card('Việc B')).queryByRole('button', { name: 'Nộp nghiệm thu' })).toBeNull(); // chỉ người được giao
    fireEvent.click(within(card('Việc C')).getByRole('button', { name: 'Yêu cầu làm lại' }));
    expect(await screen.findByText('Nghiệm thu: Việc C')).toBeDefined();
  });

  it('Trưởng BTC (không phải Tổ trưởng) cũng thấy nút duyệt', async () => {
    renderApp(<KanbanBoard />, opts({ session: makeSession({ id: 99 }) }));
    await screen.findByText('Việc A');
    expect(within(card('Việc C')).getByRole('button', { name: 'Duyệt đạt' })).toBeDefined();
  });

  it('chỉ hiện "Tự ghi nhận việc" khi hoạt động đã duyệt hoặc đang diễn ra', async () => {
    renderApp(<KanbanBoard />, opts());
    expect(await screen.findByRole('button', { name: 'Tự ghi nhận việc' })).toBeDefined();
    cleanup();
    vi.mocked(api.fetchActivityBoard).mockResolvedValue(board('completed') as never);
    renderApp(<KanbanBoard />, opts());
    await screen.findByText('Việc A');
    expect(screen.queryByRole('button', { name: 'Tự ghi nhận việc' })).toBeNull();
  });

  it('bấm tiêu đề thẻ mở hộp công việc', async () => {
    const open = vi.fn();
    renderApp(<TaskModalContext.Provider value={{ open, close: vi.fn() }}><KanbanBoard /></TaskModalContext.Provider>, opts());
    fireEvent.click(await screen.findByRole('button', { name: 'Việc A' }));
    expect(open).toHaveBeenCalledWith(1);
  });

  it('lỗi tải hiện tiếng Việt', async () => {
    vi.mocked(api.fetchActivityBoard).mockRejectedValue({ response: { status: 404, data: { error: 'Activity not found.' } } });
    renderApp(<KanbanBoard />, opts());
    expect(await screen.findByText('Không tìm thấy hoạt động.')).toBeDefined();
  });

  describe('kéo-thả (chỉ khi thiết bị có con trỏ)', () => {
    const finePointer = () => vi.spyOn(window, 'matchMedia').mockImplementation(((q: string) => ({ matches: true, media: q, addEventListener() {}, removeEventListener() {} })) as never);
    const drag = (name: string, to: string) => {
      const dataTransfer = { setData: vi.fn(), effectAllowed: '', dropEffect: '' };
      fireEvent.dragStart(card(name), { dataTransfer });
      fireEvent.dragOver(column(to), { dataTransfer });
      fireEvent.drop(column(to), { dataTransfer });
    };

    it('thiết bị cảm ứng: thẻ không kéo được', async () => {
      renderApp(<KanbanBoard />, opts());
      await screen.findByText('Việc A');
      expect(card('Việc A').getAttribute('draggable')).not.toBe('true');
    });

    it('thả todo -> in_progress gọi PATCH status', async () => {
      finePointer();
      renderApp(<KanbanBoard />, opts());
      await screen.findByText('Việc A');
      expect(card('Việc A').getAttribute('draggable')).toBe('true');
      drag('Việc A', 'Đang làm');
      await waitFor(() => expect(api.updateTaskStatus).toHaveBeenCalledWith(1, 'in_progress'));
    });

    it('thả vào Chờ duyệt mở hộp nộp nghiệm thu, KHÔNG gọi PATCH status', async () => {
      finePointer();
      renderApp(<KanbanBoard />, opts());
      await screen.findByText('Việc A');
      drag('Việc A', 'Chờ duyệt');
      expect(await screen.findByText('Nộp nghiệm thu: Việc A')).toBeDefined();
      expect(api.updateTaskStatus).not.toHaveBeenCalled();
    });

    it('thả việc của người khác vào Chờ duyệt: báo lỗi, không mở hộp', async () => {
      finePointer();
      renderApp(<KanbanBoard />, opts());
      await screen.findByText('Việc B');
      drag('Việc B', 'Chờ duyệt');
      expect(await screen.findByText(/Chỉ người được giao việc mới nộp nghiệm thu được/)).toBeDefined();
      expect(screen.queryByText('Nộp nghiệm thu: Việc B')).toBeNull();
    });

    it('người duyệt thả việc Chờ duyệt vào Hoàn thành: mở hộp duyệt, KHÔNG gọi PATCH status', async () => {
      finePointer();
      renderApp(<KanbanBoard />, opts(leader));
      await screen.findByText('Việc C');
      drag('Việc C', 'Hoàn thành');
      expect(await screen.findByText('Nghiệm thu: Việc C')).toBeDefined();
      expect((screen.getByLabelText('Duyệt đạt') as HTMLInputElement).checked).toBe(true);
      expect(api.updateTaskStatus).not.toHaveBeenCalled();
    });

    it('thả việc chưa nộp vào Hoàn thành, hoặc người không có quyền duyệt: báo lỗi', async () => {
      finePointer();
      renderApp(<KanbanBoard />, opts(leader));
      await screen.findByText('Việc A');
      drag('Việc A', 'Hoàn thành');
      expect(await screen.findByText('Công việc cần được nộp nghiệm thu trước khi duyệt.')).toBeDefined();
      cleanup();
      renderApp(<KanbanBoard />, opts());
      await screen.findByText('Việc C');
      drag('Việc C', 'Hoàn thành');
      expect(await screen.findByText('Bạn không có quyền duyệt công việc này.')).toBeDefined();
    });

    it('thả việc đang Chờ duyệt về Cần làm: báo chỉ chuyển được giữa Cần làm và Đang làm', async () => {
      finePointer();
      renderApp(<KanbanBoard />, opts(leader));
      await screen.findByText('Việc C');
      drag('Việc C', 'Cần làm');
      expect(await screen.findByText('Chỉ chuyển được giữa "Cần làm" và "Đang làm".')).toBeDefined();
      expect(api.updateTaskStatus).not.toHaveBeenCalled();
    });
  });
});
```

Thêm vào `AppRoutes.test.tsx` (đầu file: `vi.mock('./features/tasks/KanbanBoard', () => ({ KanbanBoard: () => <div>màn-kanban</div> }));`):

```tsx
it('/board/:id mở Kanban của hoạt động', () => {
  renderAt('/board/9', 'member');
  expect(screen.getByText('màn-kanban')).toBeDefined();
});
```

- [ ] **Step 2: Chạy, xác nhận hỏng**

Run: `npx vitest run src/core/features/tasks/KanbanBoard.test.tsx` — Expected: FAIL (không resolve `./KanbanBoard`).

- [ ] **Step 3: Viết code**

```tsx
// web/src/core/features/tasks/KanbanBoard.tsx
import React, { useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import Button from '@atlaskit/button/new';
import Lozenge from '@atlaskit/lozenge';
import { token } from '@atlaskit/tokens';
import { apiErrorMessage, fetchActivityBoard, updateTaskStatus, type TaskItem, type TaskTransitionStatus } from '../../api';
import { activityBoardKey } from '../../queryKeys';
import { useCapabilities } from '../../capabilities';
import { useToast } from '../../../shared/components/Toast';
import { formatVnDate, todayVnKey, toVnDateKey } from '../../../shared/utils/date';
import { getTaskPriorityAppearance, getTaskPriorityLabel } from './taskLabels';
import {
  canMoveTask, canReviewTask, canSubmitForReview, isAssignedTo, normalizeTaskStatus, useCurrentUserId,
} from './taskPermissions';
import { useInvalidateTaskCaches } from './useTaskCaches';
import { useTaskModal } from './TaskModalProvider';
import { SubmitReviewDialog } from './SubmitReviewDialog';
import { ReviewButtons } from './ReviewButtons';
import { ReviewDialog } from './ReviewDialog';
import { SelfLogModal } from './SelfLogModal';

const COLUMNS = [
  { status: 'todo', label: 'Cần làm' },
  { status: 'in_progress', label: 'Đang làm' },
  { status: 'review', label: 'Chờ duyệt' },
  { status: 'done', label: 'Hoàn thành' },
] as const;
type ColumnStatus = (typeof COLUMNS)[number]['status'];

/** Kéo-thả chỉ bật khi thiết bị có con trỏ chính xác; thiết bị cảm ứng dùng nút trên thẻ. */
function supportsPointerDrag(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(pointer: fine)').matches === true;
}

export const KanbanBoard: React.FC = () => {
  const { id } = useParams();
  const activityId = Number(id);
  const caps = useCapabilities();
  const userId = useCurrentUserId();
  const toast = useToast();
  const invalidate = useInvalidateTaskCaches();
  const { open } = useTaskModal();

  const query = useQuery({
    queryKey: activityBoardKey(activityId),
    queryFn: () => fetchActivityBoard(activityId),
    enabled: Number.isInteger(activityId) && activityId > 0,
  });
  const [submitTask, setSubmitTask] = useState<TaskItem | null>(null);
  const [reviewTask, setReviewTask] = useState<TaskItem | null>(null);
  const [selfLogOpen, setSelfLogOpen] = useState(false);
  const [overColumn, setOverColumn] = useState<string | null>(null);
  const dragId = useRef<number | null>(null);
  const dnd = supportsPointerDrag();

  const moveMutation = useMutation({
    mutationFn: (v: { id: number; status: TaskTransitionStatus }) => updateTaskStatus(v.id, v.status),
    onSuccess: () => { toast.success('Đã cập nhật trạng thái'); return invalidate(); },
    onError: (err) => toast.error(apiErrorMessage(err, 'Không đổi được trạng thái.')),
  });

  const data = query.data;
  const activity = data?.activity;
  const tasks = (data?.tasks ?? []).filter((t) => t.status !== 'cancelled');
  const isEventLead = userId !== null && activity?.event_lead_id === userId;
  const today = todayVnKey();

  const reviewable = (task: TaskItem) =>
    canReviewTask(task, { isExec: caps.isExec, manages: caps.canManageTeam(task.team_id), isEventLead });

  const handleDrop = (target: ColumnStatus) => {
    const task = tasks.find((t) => t.id === dragId.current);
    dragId.current = null;
    setOverColumn(null);
    if (!task) return;
    const from = normalizeTaskStatus(task.status);
    if (from === target) return;
    if (target === 'review') {
      if (canSubmitForReview(task, userId)) setSubmitTask(task);
      else toast.error('Chỉ người được giao việc mới nộp nghiệm thu được, khi việc đang ở "Cần làm" hoặc "Đang làm".');
      return;
    }
    if (target === 'done') {
      if (from !== 'review') toast.error('Công việc cần được nộp nghiệm thu trước khi duyệt.');
      else if (reviewable(task)) setReviewTask(task);
      else toast.error('Bạn không có quyền duyệt công việc này.');
      return;
    }
    if (from !== 'todo' && from !== 'in_progress') { toast.error('Chỉ chuyển được giữa "Cần làm" và "Đang làm".'); return; }
    if (!canMoveTask(task, { userId, manages: caps.canManageTeam(task.team_id) })) { toast.error('Bạn không thể cập nhật công việc này.'); return; }
    moveMutation.mutate({ id: task.id, status: target });
  };

  const renderCard = (task: TaskItem) => {
    const status = normalizeTaskStatus(task.status);
    const manages = caps.canManageTeam(task.team_id);
    const overdue = status !== 'done' && Boolean(task.deadline) && toVnDateKey(task.deadline) < today;
    return (
      <article key={task.id} draggable={dnd}
        onDragStart={(e) => { dragId.current = task.id; e.dataTransfer?.setData('text/plain', String(task.id)); }}
        onDragEnd={() => { dragId.current = null; setOverColumn(null); }}
        style={{
          background: token('elevation.surface.raised', '#FFFFFF'), border: `1px solid ${token('color.border', '#DFE1E6')}`,
          borderRadius: 4, padding: 12, marginBottom: 8, cursor: dnd ? 'grab' : 'default',
        }}>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 6 }}>
          <Lozenge appearance={getTaskPriorityAppearance(task.priority)}>{getTaskPriorityLabel(task.priority)}</Lozenge>
          {Boolean(task.is_self_logged) && <Lozenge appearance="new">Tự ghi nhận</Lozenge>}
          {task.weight !== undefined && task.weight !== null && Boolean(task.is_self_logged) && <Lozenge>{`${task.weight}đ`}</Lozenge>}
          {overdue && <Lozenge appearance="removed">Quá hạn</Lozenge>}
        </div>
        <button type="button" onClick={() => open(task.id)}
          style={{ border: 'none', background: 'none', padding: 0, cursor: 'pointer', font: 'inherit', fontWeight: 600, textAlign: 'left', color: token('color.text', '#172B4D') }}>
          {task.title}
        </button>
        <div style={{ fontSize: 12, color: token('color.text.subtle', '#626F86'), marginTop: 4 }}>
          {task.primary_assignee_name || 'Chưa giao'}
        </div>
        <div style={{ fontSize: 12, color: token('color.text.subtle', '#626F86'), display: 'flex', justifyContent: 'space-between', gap: 8 }}>
          <span>{`${Number(task.checklist_done || 0)}/${Number(task.checklist_total || 0)} việc con`}</span>
          <span>{formatVnDate(task.deadline)}</span>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
          {status === 'todo' && (isAssignedTo(task, userId) || manages) && (
            <Button spacing="compact" onClick={() => moveMutation.mutate({ id: task.id, status: 'in_progress' })}>Bắt đầu làm</Button>
          )}
          {canSubmitForReview(task, userId) && (
            <Button spacing="compact" appearance="primary" onClick={() => setSubmitTask(task)}>Nộp nghiệm thu</Button>
          )}
          {reviewable(task) && <ReviewButtons taskId={task.id} taskTitle={task.title} />}
        </div>
      </article>
    );
  };

  if (!Number.isInteger(activityId) || activityId < 1) return <p>Không tìm thấy hoạt động.</p>;

  return (
    <div style={{ paddingTop: 4 }}>
      <Link to={`/activity/${activityId}`}>← Quay lại hoạt động</Link>
      {query.isLoading && <p>Đang tải bảng công việc...</p>}
      {query.isError && <p role="alert" style={{ color: token('color.text.danger', '#AE2E24') }}>{apiErrorMessage(query.error, 'Không tải được bảng công việc.')}</p>}
      {activity && data && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', margin: '12px 0' }}>
            <div>
              <h1 style={{ fontSize: 24, margin: 0 }}>{activity.title}</h1>
              <p style={{ margin: '4px 0 0', color: token('color.text.subtle', '#626F86') }}>
                Bảng Kanban{dnd ? ' · Kéo thẻ để đổi trạng thái' : ''}
              </p>
            </div>
            {(activity.status === 'approved' || activity.status === 'active') && (
              <Button appearance="primary" onClick={() => setSelfLogOpen(true)}>Tự ghi nhận việc</Button>
            )}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12, alignItems: 'start' }}>
            {COLUMNS.map((col) => {
              const items = tasks.filter((t) => normalizeTaskStatus(t.status) === col.status);
              return (
                <section key={col.status} aria-label={col.label}
                  onDragOver={(e) => { if (dnd) { e.preventDefault(); setOverColumn(col.status); } }}
                  onDragLeave={() => setOverColumn((c) => (c === col.status ? null : c))}
                  onDrop={(e) => { if (dnd) { e.preventDefault(); handleDrop(col.status); } }}
                  style={{
                    background: overColumn === col.status ? token('color.background.selected', '#E9F2FF') : token('color.background.neutral', '#F1F2F4'),
                    borderRadius: 4, padding: 8, minHeight: 120,
                  }}>
                  <h2 style={{ fontSize: 13, margin: '0 0 8px' }}>{col.label} ({items.length})</h2>
                  {items.length === 0 ? <p style={{ color: token('color.text.subtle', '#626F86'), fontSize: 13, margin: 0 }}>Trống</p> : items.map(renderCard)}
                </section>
              );
            })}
          </div>
          <SelfLogModal isOpen={selfLogOpen} activityId={activityId} activityTeams={data.activityTeams} onClose={() => setSelfLogOpen(false)} />
        </>
      )}
      {submitTask && <SubmitReviewDialog isOpen taskId={submitTask.id} taskTitle={submitTask.title} onClose={() => setSubmitTask(null)} />}
      {reviewTask && <ReviewDialog isOpen taskId={reviewTask.id} taskTitle={reviewTask.title} initialDecision="approve" onClose={() => setReviewTask(null)} />}
    </div>
  );
};
```

Sửa `AppRoutes.tsx`: `import { KanbanBoard } from './features/tasks/KanbanBoard';` và thêm `<Route path="/board/:id" element={<KanbanBoard />} />`.

- [ ] **Step 4: Chạy test**

Run: `npx vitest run src/core && npx tsc --noEmit -p .`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add web/src/core
git commit -m "feat(web): Kanban bốn cột, nút theo quyền, kéo-thả qua hộp nộp và hộp duyệt"
```

---

### Task 12: Nối vào trang chi tiết hoạt động (đợt 1)

**Files:**
- Create: `web/src/core/features/tasks/ActivityTaskActions.tsx`
- Modify: `web/src/core/features/activities/ActivityDetailView.tsx` (của đợt 1; thêm đúng 3 chỗ)
- Test: `web/src/core/features/tasks/ActivityTaskActions.test.tsx`; thêm 2 ca vào test của `ActivityDetailView` (nếu đợt 1 đã có `ActivityDetailView.test.tsx`)

**Interfaces:**
- Consumes: `CreateTaskModal`, `SelfLogModal`, `AddAttachmentButton`, `useTaskModal`.
- Produces: `<ActivityTaskActions activityId activityType activityStatus canManage activityTeams />` — liên kết "Bảng Kanban" (mọi người), nút "Giao việc" (`canManage`), nút "Tự ghi nhận việc" (trạng thái `approved`/`active`).

- [ ] **Step 1: Viết test hỏng**

```tsx
// web/src/core/features/tasks/ActivityTaskActions.test.tsx
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { ActivityTaskActions } from './ActivityTaskActions';
import { renderApp, makeSession } from './testUtils';
import * as api from '../../api';

vi.mock('../../api', async () => {
  const actual = await vi.importActual<typeof import('../../api')>('../../api');
  return { ...actual, fetchTeamMembers: vi.fn(), fetchWeightPresets: vi.fn(), fetchMembers: vi.fn() };
});

const teams = [{ team_id: 2, name: 'Tổ Sự kiện' }];
const props = { activityId: 9, activityType: 'event', activityStatus: 'active', canManage: true, activityTeams: teams };

describe('ActivityTaskActions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.fetchTeamMembers).mockResolvedValue({ members: [], available: [] });
    vi.mocked(api.fetchWeightPresets).mockResolvedValue([]);
    vi.mocked(api.fetchMembers).mockResolvedValue([]);
  });
  afterEach(cleanup);

  it('luôn có liên kết Bảng Kanban trỏ tới /board/:id', () => {
    renderApp(<ActivityTaskActions {...props} canManage={false} activityStatus="completed" />);
    expect(screen.getByRole('link', { name: 'Bảng Kanban' }).getAttribute('href')).toBe('/board/9');
  });

  it('Giao việc chỉ hiện khi canManage; bấm thì mở hộp Giao việc', async () => {
    renderApp(<ActivityTaskActions {...props} canManage={false} />, { session: makeSession({ id: 1, role: 'admin' }) });
    expect(screen.queryByRole('button', { name: 'Giao việc' })).toBeNull();
    cleanup();
    renderApp(<ActivityTaskActions {...props} />, { session: makeSession({ id: 1, role: 'admin' }) });
    fireEvent.click(screen.getByRole('button', { name: 'Giao việc' }));
    expect(await screen.findByLabelText(/Tiêu đề/)).toBeDefined();
  });

  it('Tự ghi nhận chỉ hiện với hoạt động approved/active', async () => {
    renderApp(<ActivityTaskActions {...props} activityStatus="proposed" />);
    expect(screen.queryByRole('button', { name: 'Tự ghi nhận việc' })).toBeNull();
    cleanup();
    renderApp(<ActivityTaskActions {...props} activityStatus="approved" />);
    fireEvent.click(screen.getByRole('button', { name: 'Tự ghi nhận việc' }));
    expect(await screen.findByLabelText(/Tên công việc/)).toBeDefined();
  });
});
```

- [ ] **Step 2: Chạy, xác nhận hỏng**

Run: `npx vitest run src/core/features/tasks/ActivityTaskActions.test.tsx` — Expected: FAIL.

- [ ] **Step 3: Viết code**

```tsx
// web/src/core/features/tasks/ActivityTaskActions.tsx
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Button from '@atlaskit/button/new';
import type { BoardTeam } from '../../api';
import { CreateTaskModal } from './CreateTaskModal';
import { SelfLogModal } from './SelfLogModal';

export interface ActivityTaskActionsProps {
  activityId: number;
  activityType?: string;
  activityStatus: string;
  canManage: boolean;
  activityTeams: BoardTeam[];
}

/** Nút công việc ở đầu trang chi tiết hoạt động: Bảng Kanban, Giao việc, Tự ghi nhận việc. */
export const ActivityTaskActions: React.FC<ActivityTaskActionsProps> = ({ activityId, activityType, activityStatus, canManage, activityTeams }) => {
  const [createOpen, setCreateOpen] = useState(false);
  const [selfLogOpen, setSelfLogOpen] = useState(false);
  const canSelfLog = activityStatus === 'approved' || activityStatus === 'active';
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
      <Link to={`/board/${activityId}`}>Bảng Kanban</Link>
      {canManage && <Button appearance="primary" onClick={() => setCreateOpen(true)}>Giao việc</Button>}
      {canSelfLog && <Button onClick={() => setSelfLogOpen(true)}>Tự ghi nhận việc</Button>}
      <CreateTaskModal isOpen={createOpen} activityId={activityId} activityType={activityType} activityTeams={activityTeams} onClose={() => setCreateOpen(false)} />
      <SelfLogModal isOpen={selfLogOpen} activityId={activityId} activityTeams={activityTeams} onClose={() => setSelfLogOpen(false)} />
    </div>
  );
};
```

Sửa `web/src/core/features/activities/ActivityDetailView.tsx` (đợt 1). **Đọc file trước**, rồi thêm đúng ba chỗ sau (neo theo cấu trúc thật của đợt 1):

1. **Đầu trang**, cạnh nút Sửa/Duyệt của đợt 1: `<ActivityTaskActions activityId={activity.id} activityType={activity.type} activityStatus={activity.status} canManage={detail.canManage} activityTeams={detail.activityTeams.map((t) => ({ team_id: t.team_id, name: t.name, color: t.color }))} />`.
2. **Dòng công việc trong "Kế hoạch công việc"**: thay phần hiển thị tiêu đề (text hoặc link cũ) bằng `<TaskTitleButton task={task} />` (import từ `../tasks/TaskRowControls`), để bấm mở hộp chi tiết thay vì điều hướng.
3. **Khối "Tài liệu/minh chứng theo từng việc"**: thêm `<AddAttachmentButton taskId={task.id} taskTitle={task.title} />` (import từ `../tasks/AddAttachmentDialog`) ở đầu mỗi nhóm việc, **chỉ khi** `detail.canManage` hoặc người dùng được giao việc đó (`isAssignedTo(task, userId)` với `useCurrentUserId()`), để khớp quyền server (`canTouchTask`); không hiện cho người ngoài.

Thêm hai ca vào test của `ActivityDetailView` theo mẫu dựng sẵn của đợt 1: (a) `canManage: true` → có nút "Giao việc" và liên kết "Bảng Kanban"; `canManage: false` → không có "Giao việc"; (b) bấm tiêu đề một việc gọi `open(task.id)` của `TaskModalContext` (bọc `TaskModalContext.Provider` như `TaskRowControls.test.tsx`). Nếu `ActivityDetailView.test.tsx` chưa có (đợt 1 chưa merge), tạo ca vào file test mà đợt 1 dùng.

- [ ] **Step 4: Chạy test**

Run: `npx vitest run src/core && npx tsc --noEmit -p .`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add web/src/core
git commit -m "feat(web): trang chi tiết hoạt động có Kanban, Giao việc, Tự ghi nhận, mở công việc và thêm tài liệu"
```

---

### Task 13: Tài liệu, kiểm tra và PR

**Files:**
- Modify: `docs/dev/frontend.md` (thêm mục "Công việc và Kanban", bump MINOR, `updated`, lịch sử)
- Modify: `docs/ai/bay-da-gap.md` (thêm bẫy, bump MINOR, lịch sử)
- Modify: `docs/specs/2026-10-08-my-tasks-screen-design.md` (SPEC-MYTASKS-001: ghi tiêu đề và nút tích nay mở hộp công việc; bump)
- Modify: mọi tài liệu khác có `related_code` trùng `web/src/core/features/tasks/**` hoặc `web/src/core/features/dashboard/Dashboard.tsx` (tìm ở Step 1)
- Modify: `docs/specs/2026-10-09-web-hoan-thien-thay-the-design.md` chỉ khi đợt khác chưa sửa phần đó: thêm vào bảng đợt "đợt 2 xong" (bump MINOR) — nếu xung đột với PR của đợt khác thì gộp theo bản mới nhất.

- [ ] **Step 1: Tìm tài liệu liên quan**

Run: `grep -rln "features/tasks\|Dashboard.tsx\|MyTasksToday\|MyTasksView" docs --include=*.md | xargs grep -ln "related_code"`
Mở từng file; sửa những file còn `status: active` mô tả hành vi đã đổi.

- [ ] **Step 2: Viết nội dung**

`docs/dev/frontend.md`, mục mới "Công việc và Kanban (web/)":
- Hộp chi tiết công việc: `useTaskModal().open(id, { focusSubmit })` từ mọi danh sách; route `#task/:id` mở hộp trên nền Tổng quan.
- Quyền ẩn/hiện nằm ở `web/src/core/features/tasks/taskPermissions.ts` (bắt chước `core/src/routes/tasks.js` và `policies/access.js`); màn không tự viết điều kiện vai trò.
- Thao tác ghi dùng `useMutation` + `useInvalidateTaskCaches()`; hằng `ACTIVITY_PREFIX` trong `queryKeys.ts` là nơi duy nhất khai báo prefix cache chi tiết hoạt động.
- Nộp nghiệm thu, tài liệu, tự ghi nhận gửi multipart không có tệp (chỉ link).
- Kanban chỉ chuyển trực tiếp `todo ↔ in_progress`; thả vào Chờ duyệt/Hoàn thành mở hộp nộp/duyệt; kéo-thả chỉ khi `(pointer: fine)`.

`docs/ai/bay-da-gap.md`, thêm bẫy:
- `GET /api/my-tasks-today` không trả `acknowledged_at` (`SELECT t.*` không join `task_assignees`), nên không biết việc đã xác nhận hay chưa từ danh sách này. UI cũ luôn hiện "Xác nhận" và không bao giờ hiện "Nộp nghiệm thu" vì điều kiện `!acknowledged_at` luôn đúng. Đừng viết điều kiện dựa vào field đó; nếu cần, thêm field vào API (việc liên module) hoặc tải `GET /api/tasks/:id`.
- `GET /api/teams/:id/members` chỉ cho admin hoặc người quản lý Tổ (403 "You cannot manage this team."). Trưởng ban tổ chức không phải Tổ trưởng được `POST /api/activities/:id/tasks` vào Tổ của hoạt động nhưng không tải được danh sách người để chọn.
- `GET /api/tasks/:id` không trả `event_lead_id`; muốn biết người xem có phải Trưởng BTC phải đọc `GET /api/activities/:id`.
- `PATCH /api/tasks/:id` chỉ nhận `deadline`, `start_date`, `priority`, `deliverable` và chỉ người quản lý Tổ; `v||null` biến chuỗi rỗng thành NULL nên `deadline` rỗng sẽ lỗi cột NOT NULL — client phải bắt buộc hạn.

Bump `version` (MINOR), `updated: 2026-10-09`, thêm dòng `## Lịch sử phiên bản` cho mọi file sửa.

- [ ] **Step 3: Chạy kiểm tra đầy đủ**

```bash
cd web && npm test && npm run build && cd ..
npm run test:tools
npm run docs:index
git add -A docs && git commit -m "docs: web/ đợt 2 — công việc và Kanban"
npm run docs:check -- --base origin/staging
```
Expected: mọi lệnh xanh. `docs:check` chạy **sau** commit (cây sạch). `cd core && npm test` chạy qua CI (đợt này không đổi `core/`).

- [ ] **Step 4: Push và mở PR vào `staging`**

```bash
git push -u origin <nhánh-đợt-2>
gh pr create --base staging --title "web/: đợt 2 — công việc và Kanban" --body "…"
```
Mô tả PR: tóm tắt các thao tác (giao việc, hộp chi tiết, sửa công việc, xoá việc con, nộp/duyệt nghiệm thu, tự ghi nhận, rút lại, Kanban, nút ở Việc hôm nay); mục "Phụ thuộc": đợt 0 đã merge, đợt 1 cung cấp `/activity/:id` và `ActivityDetailView`; mục "Kiểm tra": liệt kê lệnh đã chạy; mục "Quyết định" chép từ plan này; kết thúc bằng `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.

---

## Lịch sử phiên bản

| Version | Ngày | Thay đổi | Người |
|---|---|---|---|
| 1.0 | 2026-10-09 | Bản đầu: kế hoạch đợt 2 của SPEC-WEB-003 (công việc và Kanban) | DYC |
| 1.1 | 2026-10-09 | Ghi chú phần đã làm sớm từ port PR #86 | DYC |
| 1.2 | 2026-10-09 | Hoàn thành toàn bộ 13 task của đợt 2: công việc, chi tiết, Kanban, tích hợp và tài liệu | DYC |

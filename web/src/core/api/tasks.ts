import { apiClient } from '../../shared/utils/api';
import type {
  ActivityBoardData,
  CreateTaskPayload,
  EditTaskPayload,
  LogTaskPayload,
  MyTasksTodayResponse,
  ReviewTaskPayload,
  SubmitTaskReviewPayload,
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

/** Alias giữ tương thích cho PR #88 */
export const fetchTaskDetail = fetchTask;

/** Endpoint: GET /api/activities/:id (phần Kanban cần). */
export async function fetchActivityBoard(activityId: number): Promise<ActivityBoardData> {
  const response = await apiClient.get<ActivityBoardData>(`/activities/${activityId}`);
  return response.data;
}

/** Endpoint: POST /api/tasks/:id/acknowledge (idempotent). */
export async function acknowledgeTask(taskId: number): Promise<{ ok: boolean }> {
  const response = await apiClient.post<{ ok: boolean }>(`/tasks/${taskId}/acknowledge`);
  return response.data;
}

/** Endpoint: PATCH /api/tasks/:id/status — server chỉ cho todo <-> in_progress. */
export async function updateTaskStatus(taskId: number, status: TaskTransitionStatus): Promise<{ ok: boolean }> {
  const response = await apiClient.patch<{ ok: boolean }>(`/tasks/${taskId}/status`, { status });
  return response.data;
}

/** Endpoint: PATCH /api/tasks/:id — chỉ người quản lý Tổ; 4 trường deadline/start_date/priority/deliverable. */
export async function editTask(taskId: number, payload: EditTaskPayload): Promise<{ ok: boolean }> {
  const response = await apiClient.patch<{ ok: boolean }>(`/tasks/${taskId}`, payload);
  return response.data;
}

/** Endpoint: POST /api/tasks/:id/checklist */
export async function addChecklistItem(taskId: number, title: string): Promise<{ id: number }> {
  const response = await apiClient.post<{ id: number }>(`/tasks/${taskId}/checklist`, { title });
  return response.data;
}

/** Alias giữ tương thích cho PR #88 */
export const addTaskChecklistItem = addChecklistItem;

/** Endpoint: PATCH /api/tasks/:id/checklist/:itemId */
export async function setChecklistItemDone(taskId: number, itemId: number, isDone: boolean): Promise<{ ok: boolean }> {
  const response = await apiClient.patch<{ ok: boolean }>(`/tasks/${taskId}/checklist/${itemId}`, { is_done: isDone });
  return response.data;
}

/** Alias giữ tương thích cho PR #88 */
export const toggleTaskChecklist = setChecklistItemDone;

/** Endpoint: DELETE /api/tasks/:id/checklist/:itemId */
export async function deleteChecklistItem(taskId: number, itemId: number): Promise<{ ok: boolean }> {
  const response = await apiClient.delete<{ ok: boolean }>(`/tasks/${taskId}/checklist/${itemId}`);
  return response.data;
}

/** Alias giữ tương thích cho PR #88 */
export const deleteTaskChecklistItem = deleteChecklistItem;

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
  payload: SubmitTaskReviewPayload
): Promise<{ ok?: boolean; id?: number }> {
  const response = await apiClient.post<{ ok?: boolean; id?: number }>(
    `/tasks/${taskId}/submit-review`,
    toFormData(payload as Record<string, string | number | null | undefined>),
    MULTIPART
  );
  return response.data;
}

/** Endpoint: POST /api/tasks/:id/review */
export async function reviewTask(
  taskId: number,
  payload: ReviewTaskPayload
): Promise<{ ok: boolean }> {
  const response = await apiClient.post<{ ok: boolean }>(`/tasks/${taskId}/review`, payload);
  return response.data;
}

/** Endpoint: POST /api/tasks/:id/cancel */
export async function cancelTask(taskId: number): Promise<{ ok: boolean }> {
  const response = await apiClient.post<{ ok: boolean }>(`/tasks/${taskId}/cancel`);
  return response.data;
}

/** Endpoint: POST /api/activities/:id/updates (bình luận gắn với một công việc). */
export async function postTaskComment(
  activityId: number,
  payload: { kind: TaskCommentKind; body: string; task_id: number }
): Promise<{ id?: number; ok?: boolean }> {
  const response = await apiClient.post<{ id?: number; ok?: boolean }>(`/activities/${activityId}/updates`, payload);
  return response.data;
}

/** Endpoint: POST /api/activities/:id/tasks */
export async function createTask(activityId: number, payload: CreateTaskPayload): Promise<{ id: number }> {
  const response = await apiClient.post<{ id: number }>(`/activities/${activityId}/tasks`, payload);
  return response.data;
}

/** Alias giữ tương thích cho PR #88 */
export const createActivityTask = createTask;

/** Endpoint: POST /api/activities/:id/log-task (multipart; link tuỳ chọn, trọng số số nguyên 0–10). */
export async function logTask(activityId: number, payload: LogTaskPayload): Promise<{ id: number }> {
  const response = await apiClient.post<{ id: number }>(
    `/activities/${activityId}/log-task`,
    toFormData({ ...payload }),
    MULTIPART
  );
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

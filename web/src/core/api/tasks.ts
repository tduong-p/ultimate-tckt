import { apiClient } from '../../shared/utils/api';
import type {
  CreateTaskPayload,
  MyTasksTodayResponse,
  ReviewTaskPayload,
  SubmitTaskReviewPayload,
  TaskDetailResponse,
} from './types';

/**
 * Fetch tasks assigned to the current user due today, overdue, or pending review.
 * Endpoint: GET /api/my-tasks-today
 */
export async function fetchMyTasksToday(): Promise<MyTasksTodayResponse> {
  const response = await apiClient.get<MyTasksTodayResponse>('/my-tasks-today');
  return response.data;
}

/**
 * Tạo nhiệm vụ mới thuộc hoạt động.
 * Endpoint: POST /api/activities/:id/tasks
 */
export async function createActivityTask(activityId: number, payload: CreateTaskPayload): Promise<{ id: number }> {
  const response = await apiClient.post<{ id: number }>(`/activities/${activityId}/tasks`, payload);
  return response.data;
}

/**
 * Lấy chi tiết nhiệm vụ kèm checklist và người phụ trách.
 * Endpoint: GET /api/tasks/:id
 */
export async function fetchTaskDetail(taskId: number): Promise<TaskDetailResponse> {
  const response = await apiClient.get<TaskDetailResponse>(`/tasks/${taskId}`);
  return response.data;
}

/**
 * Người phụ trách xác nhận đã nhận nhiệm vụ.
 * Endpoint: POST /api/tasks/:id/acknowledge
 */
export async function acknowledgeTask(taskId: number): Promise<{ ok: boolean }> {
  const response = await apiClient.post<{ ok: boolean }>(`/tasks/${taskId}/acknowledge`);
  return response.data;
}

/**
 * Cập nhật trạng thái nhiệm vụ (todo <-> in_progress).
 * Endpoint: PATCH /api/tasks/:id/status
 */
export async function updateTaskStatus(taskId: number, status: 'todo' | 'in_progress'): Promise<{ ok: boolean }> {
  const response = await apiClient.patch<{ ok: boolean }>(`/tasks/${taskId}/status`, { status });
  return response.data;
}

/**
 * Người được giao việc nộp nghiệm thu nhiệm vụ kèm minh chứng/ghi chú.
 * Endpoint: POST /api/tasks/:id/submit-review
 */
export async function submitTaskReview(taskId: number, payload: SubmitTaskReviewPayload): Promise<{ ok: boolean }> {
  const response = await apiClient.post<{ ok: boolean }>(`/tasks/${taskId}/submit-review`, payload);
  return response.data;
}

/**
 * Lãnh đạo nghiệm thu nhiệm vụ (approve, reject, cancel).
 * Endpoint: POST /api/tasks/:id/review
 */
export async function reviewTask(taskId: number, payload: ReviewTaskPayload): Promise<{ ok: boolean }> {
  const response = await apiClient.post<{ ok: boolean }>(`/tasks/${taskId}/review`, payload);
  return response.data;
}

/**
 * Đánh dấu hoàn thành / chưa hoàn thành đầu việc con (checklist).
 * Endpoint: PATCH /api/tasks/:id/checklist/:itemId
 */
export async function toggleTaskChecklist(taskId: number, itemId: number, isDone: boolean): Promise<{ ok: boolean }> {
  const response = await apiClient.patch<{ ok: boolean }>(`/tasks/${taskId}/checklist/${itemId}`, { is_done: isDone });
  return response.data;
}

/**
 * Thêm đầu việc con vào nhiệm vụ.
 * Endpoint: POST /api/tasks/:id/checklist
 */
export async function addTaskChecklistItem(taskId: number, title: string): Promise<{ id: number }> {
  const response = await apiClient.post<{ id: number }>(`/tasks/${taskId}/checklist`, { title });
  return response.data;
}

/**
 * Xóa đầu việc con khỏi nhiệm vụ.
 * Endpoint: DELETE /api/tasks/:id/checklist/:itemId
 */
export async function deleteTaskChecklistItem(taskId: number, itemId: number): Promise<{ ok: boolean }> {
  const response = await apiClient.delete<{ ok: boolean }>(`/tasks/${taskId}/checklist/${itemId}`);
  return response.data;
}

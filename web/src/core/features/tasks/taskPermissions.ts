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

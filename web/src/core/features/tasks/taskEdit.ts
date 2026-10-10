import type { TaskDetailResponse } from '../../api';
import { toVnDateKey } from '../../../shared/utils/date';

/** `GET /api/tasks/:id` kèm `editable[]` (docs/dev/api.md, mục Task Batch). */
export type TaskDetailData = TaskDetailResponse & { editable?: string[] };

/** Các trường màn sửa được qua `PATCH /api/tasks/:id/batch` (core/src/services/task-batch.js; `co_assignee_ids` chưa có ô sửa). */
export interface TaskDraftFields {
  title: string;
  description: string;
  priority: string;
  /** YYYY-MM-DD, '' = không có. */
  start_date: string;
  deadline: string;
  deliverable: string;
  team_id: number;
  primary_assignee_id: number | null;
}

export const REQUIRED_FIELDS: (keyof TaskDraftFields)[] = ['title', 'deadline'];

/** Nhãn trường dùng trong thông báo lỗi/xung đột (khớp FIELD_LABEL của server). */
export const TASK_FIELD_LABELS: Record<string, string> = {
  title: 'Tiêu đề',
  description: 'Mô tả',
  primary_assignee_id: 'Người phụ trách',
  co_assignee_ids: 'Người phối hợp',
  team_id: 'Tổ',
  deadline: 'Hạn',
  start_date: 'Ngày bắt đầu',
  priority: 'Ưu tiên',
  deliverable: 'Sản phẩm bàn giao',
};

export const describeTaskFields = (fields: string[]): string => fields.map((f) => TASK_FIELD_LABELS[f] ?? f).join(', ');

export const EMPTY_DRAFT: TaskDraftFields = {
  title: '', description: '', priority: 'medium', start_date: '', deadline: '', deliverable: '', team_id: 0, primary_assignee_id: null,
};

/** Bản gốc của phiên sửa: lấy từ GET chi tiết, ngày theo giờ Việt Nam. */
export function toTaskDraftOriginal(detail: TaskDetailData): TaskDraftFields {
  const { task, assignees } = detail;
  const primary = task.primary_assignee_id ?? assignees.find((a) => Boolean(a.is_primary))?.user_id ?? null;
  return {
    title: task.title ?? '',
    description: task.description ?? '',
    priority: task.priority ?? 'medium',
    start_date: toVnDateKey(task.start_date),
    deadline: toVnDateKey(task.deadline),
    deliverable: task.deliverable ?? '',
    team_id: Number(task.team_id ?? 0),
    primary_assignee_id: primary ? Number(primary) : null,
  };
}

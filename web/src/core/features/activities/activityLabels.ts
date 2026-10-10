import type { ActivityItem, ActivityStatus } from '../../api/types';

export type { ActivityStatus };

export type LozengeAppearance =
  | 'default'
  | 'inprogress'
  | 'moved'
  | 'new'
  | 'removed'
  | 'success';

export interface ActivityStatusMeta {
  /** Nhãn hiển thị trong Lozenge. */
  label: string;
  /** Nhãn dạng văn bản thường (tooltip, bộ lọc). */
  text: string;
  appearance: LozengeAppearance;
}

export const ACTIVITY_STATUS_META: Record<ActivityStatus, ActivityStatusMeta> = {
  proposed: { label: 'Đề xuất', text: 'Đề xuất', appearance: 'default' },
  changes_requested: { label: 'Cần chỉnh sửa', text: 'Cần chỉnh sửa', appearance: 'moved' },
  approved: { label: 'Đã Duyệt', text: 'Đã duyệt', appearance: 'success' },
  active: { label: 'Đang diễn ra', text: 'Đang diễn ra', appearance: 'inprogress' },
  completed: { label: 'Hoàn thành', text: 'Hoàn thành', appearance: 'success' },
  cancelled: { label: 'Đã hủy', text: 'Đã hủy', appearance: 'removed' },
};

/** Trạng thái không nhận ra được coi như "Đề xuất". */
export const getActivityStatusMeta = (status?: string | null): ActivityStatusMeta =>
  (status && ACTIVITY_STATUS_META[status as ActivityStatus]) || ACTIVITY_STATUS_META.proposed;

/** Tuỳ chọn bộ lọc trạng thái (không gồm "Tất cả"). */
export const ACTIVITY_STATUS_FILTER_OPTIONS: { label: string; value: ActivityStatus }[] = [
  { label: 'Đề xuất', value: 'proposed' },
  { label: 'Cần chỉnh sửa', value: 'changes_requested' },
  { label: 'Đã duyệt', value: 'approved' },
  { label: 'Đang diễn ra', value: 'active' },
  { label: 'Hoàn thành', value: 'completed' },
];

/** Nhãn loại hoạt động; null khi thiếu type (hoạt động tóm tắt của đơn vị khác). */
export const getActivityTypeLabel = (type?: string | null): string | null => {
  if (type === 'event') return 'Sự kiện đơn vị';
  if (type === 'assigned') return 'Chỉ đạo cấp trên';
  return null;
};

export const getActivityTypeShortLabel = (type?: string | null): string | null => {
  if (type === 'event') return 'Sự kiện';
  if (type === 'assigned') return 'Chỉ đạo';
  return null;
};

/** Tiến độ 0-100: ưu tiên `progress_percent` của backend, nếu không thì tính từ done/task. */
export const getActivityProgressPercent = (
  activity: Pick<ActivityItem, 'progress_percent' | 'task_count' | 'done_count'>
): number => {
  if (typeof activity.progress_percent === 'number') {
    return Math.max(0, Math.min(100, Math.round(activity.progress_percent)));
  }
  if (activity.task_count && activity.task_count > 0) {
    return Math.min(100, Math.round(((activity.done_count || 0) / activity.task_count) * 100));
  }
  return 0;
};

/**
 * Tổ có tham gia hoạt động không (chủ trì hoặc phối hợp).
 * `/api/activities` chỉ trả `team_names` (tên các Tổ, nối bằng ", ") chứ không có `team_ids`.
 */
export const participatesInTeam = (
  activity: Pick<ActivityItem, 'team_id' | 'team_names'>,
  team: { id: number; name: string }
): boolean => {
  if (activity.team_id !== undefined && String(activity.team_id) === String(team.id)) return true;
  if (!activity.team_names) return false;
  return `, ${activity.team_names}, `.includes(`, ${team.name}, `);
};

/** Nhãn tiếng Việt của các trường sửa theo lô (khớp `FIELD_LABEL` của core/src/services/activity-batch.js). */
export const ACTIVITY_FIELD_LABELS: Record<string, string> = {
  title: 'Tiêu đề',
  description: 'Mô tả',
  deadline: 'Hạn chót',
  start_date: 'Ngày bắt đầu',
  priority: 'Ưu tiên',
  team_id: 'Tổ điều phối',
  event_lead_id: 'Trưởng Ban Tổ chức',
};

/** "Tiêu đề, Tổ điều phối"; trường lạ giữ nguyên tên. */
export const describeActivityFields = (fields: string[] = []): string =>
  fields.map((f) => ACTIVITY_FIELD_LABELS[f] ?? f).join(', ');

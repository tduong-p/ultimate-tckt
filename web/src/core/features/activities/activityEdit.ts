import type { ActivityDetail, ActivityItem } from '../../api';
import { toVnDateKey } from '../../../shared/utils/date';

/** `GET /api/activities/:id` kèm `editable[]` (docs/dev/api.md, mục Activity Batch). */
export type ActivityDetailData = ActivityDetail & { editable?: string[] };

/** Các trường `PATCH /api/activities/:id/batch` nhận (core/src/services/activity-batch.js). */
export interface ActivityDraftFields {
  title: string;
  description: string;
  priority: string;
  /** YYYY-MM-DD, '' = không có. */
  start_date: string;
  deadline: string;
  team_id: number;
  event_lead_id: number | null;
}

export const REQUIRED_FIELDS: (keyof ActivityDraftFields)[] = ['title', 'description', 'deadline'];

/** Bản gốc của phiên sửa: lấy từ GET chi tiết, ngày theo giờ Việt Nam. */
export function toDraftOriginal(activity: ActivityItem): ActivityDraftFields {
  return {
    title: activity.title ?? '',
    description: activity.description ?? '',
    priority: activity.priority ?? 'medium',
    start_date: toVnDateKey(activity.start_date),
    deadline: toVnDateKey(activity.deadline),
    team_id: Number(activity.team_id ?? 0),
    event_lead_id: activity.event_lead_id ? Number(activity.event_lead_id) : null,
  };
}

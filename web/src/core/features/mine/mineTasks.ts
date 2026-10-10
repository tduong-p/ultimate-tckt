import { apiClient } from '../../../shared/utils/api';

/** Một dòng của `GET /api/tasks` (Core): đủ cho danh sách "Việc của tôi". */
export interface MineTask {
  id: number;
  title: string;
  status: string;
  priority: string;
  /** YYYY-MM-DD theo giờ Việt Nam (Core đã DATE_FORMAT), có thể rỗng. */
  deadline: string | null;
  team_id: number;
  team_name?: string;
  activity_id: number;
  activity_title?: string;
  primary_assignee_id?: number | null;
  assignee_name?: string | null;
  /** Thời điểm tôi xác nhận nhận việc; null = chưa xác nhận (chỉ có nghĩa nếu tôi là người được giao). */
  acknowledged_at?: string | null;
  /** Lời nhận xét khi bị trả lại; có giá trị ⇒ huy hiệu "Bị trả lại". */
  review_feedback?: string | null;
}

export type MineTab = 'today' | 'overdue' | 'review' | 'all';
export const MINE_TABS: readonly MineTab[] = ['today', 'overdue', 'review', 'all'];

/** `mine` = việc tôi được giao (`?mine=1`); `review` = việc tôi duyệt được (`?pending_review=1`, Core lọc quyền). */
export type MineListKind = 'mine' | 'review';

export async function fetchMyTaskList(kind: MineListKind): Promise<MineTask[]> {
  const params = kind === 'mine' ? { mine: 1 } : { pending_review: 1 };
  const response = await apiClient.get<MineTask[]>('/tasks', { params });
  return response.data;
}

/** Không có `tab` = Tất cả (giữ nghĩa `#/my-tasks` cũ); `tab` không hợp lệ = Hôm nay. */
export function parseTab(raw: string | null): MineTab {
  if (!raw) return 'all';
  return (MINE_TABS as readonly string[]).includes(raw) ? (raw as MineTab) : 'today';
}

const isOpen = (t: MineTask) => t.status !== 'done' && t.status !== 'cancelled';
const deadlineKey = (t: MineTask) => t.deadline?.slice(0, 10) ?? '';

export interface MineGroups {
  today: MineTask[];
  overdue: MineTask[];
  review: MineTask[];
  all: MineTask[];
}

/**
 * Chia danh sách thành bốn tab (chỉ phía client, `today` = YYYY-MM-DD giờ Việt Nam):
 * - overdue: chưa xong/huỷ, hạn < hôm nay
 * - today:   chưa xong/huỷ, chưa quá hạn, và (hạn = hôm nay HOẶC đang làm)
 * - review:  danh sách pending_review (Core đã lọc quyền), bỏ việc xong/huỷ
 * - all:     mọi việc của tôi chưa xong/huỷ
 */
export function groupMine(mine: MineTask[], reviewable: MineTask[], today: string): MineGroups {
  const all = mine.filter(isOpen);
  const overdue = all.filter((t) => deadlineKey(t) !== '' && deadlineKey(t) < today);
  const todayList = all.filter((t) => {
    const d = deadlineKey(t);
    if (d !== '' && d < today) return false;
    return d === today || t.status === 'in_progress';
  });
  return { today: todayList, overdue, review: reviewable.filter(isOpen), all };
}

import type { NotificationItem } from '../../api';

export type InboxFilter = 'unread' | 'mention' | 'review';

/**
 * Phân loại theo `kind` Core lưu trong bảng notifications:
 * Nhắc tên = `comment_tag` (và `comment.mentioned`); Duyệt = mọi kind chứa `review`
 * (`task_review`, `task.review_requested`, `task.reviewed`).
 */
export const isMention = (n: NotificationItem): boolean => n.kind === 'comment_tag' || n.kind.includes('mention');
export const isReview = (n: NotificationItem): boolean => n.kind.includes('review');

const TESTS: Record<InboxFilter, (n: NotificationItem) => boolean> = {
  unread: (n) => !n.seen_at,
  mention: isMention,
  review: isReview,
};

/** Các bộ lọc đang bật kết hợp theo AND. */
export function applyInboxFilters(items: NotificationItem[], active: readonly InboxFilter[]): NotificationItem[] {
  return items.filter((n) => active.every((f) => TESTS[f](n)));
}

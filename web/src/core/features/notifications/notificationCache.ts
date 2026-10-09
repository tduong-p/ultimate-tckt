import type { NotificationsResponse } from '../../api';

/** Đánh dấu một mục đã xem trong cache; chỉ trừ huy hiệu nếu mục đó đang chưa xem. */
export function markOneSeen(prev: NotificationsResponse, id: number, now: string = new Date().toISOString()): NotificationsResponse {
  const target = prev.notifications.find((n) => n.id === id);
  if (!target || target.seen_at) return prev;
  return {
    notifications: prev.notifications.map((n) => (n.id === id ? { ...n, seen_at: now } : n)),
    unread_count: Math.max(0, prev.unread_count - 1),
  };
}

/** Đánh dấu mọi mục đã xem trong cache, huy hiệu về 0. */
export function markAllSeen(prev: NotificationsResponse, now: string = new Date().toISOString()): NotificationsResponse {
  return {
    notifications: prev.notifications.map((n) => (n.seen_at ? n : { ...n, seen_at: now })),
    unread_count: 0,
  };
}

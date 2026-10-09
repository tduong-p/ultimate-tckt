import { useQuery } from '@tanstack/react-query';
import { fetchNotifications } from '../../api';

export const NOTIFICATIONS_KEY = ['core-notifications'] as const;
export const NOTIFICATIONS_POLL_MS = 60_000;

/** Hộp thông báo của người dùng, tự tải lại mỗi 60 giây. Chỉ dùng ở MỘT nơi (NotificationBell) để không poll đôi. */
export function useNotifications() {
  return useQuery({
    queryKey: NOTIFICATIONS_KEY,
    queryFn: fetchNotifications,
    refetchInterval: NOTIFICATIONS_POLL_MS,
  });
}

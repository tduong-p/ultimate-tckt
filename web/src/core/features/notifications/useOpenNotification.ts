import { useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { markNotificationSeen, type NotificationItem, type NotificationsResponse } from '../../api';
import { markOneSeen } from './notificationCache';
import { NOTIFICATIONS_KEY } from './useNotifications';
import { notificationRoute } from './notificationUrl';

/**
 * Mở một thông báo: đánh dấu đã xem (lạc quan, lỗi bỏ qua như UI cũ) rồi đi tới `url` của nó.
 * Dựa vào bản trong cache, không dựa vào `item` truyền vào, để popup cũ không trừ huy hiệu hai lần.
 */
export function useOpenNotification(): (item: NotificationItem) => void {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const mutation = useMutation({ mutationFn: (id: number) => markNotificationSeen(id) });
  const { mutate } = mutation;

  return useCallback(
    (item: NotificationItem) => {
      const cached = queryClient.getQueryData<NotificationsResponse>(NOTIFICATIONS_KEY)?.notifications.find((n) => n.id === item.id);
      const unseen = cached ? !cached.seen_at : !item.seen_at;
      if (unseen) {
        queryClient.setQueryData<NotificationsResponse>(NOTIFICATIONS_KEY, (prev) => (prev ? markOneSeen(prev, item.id) : prev));
        mutate(item.id);
      }
      navigate(notificationRoute(item.url));
    },
    [queryClient, navigate, mutate]
  );
}

import React from 'react';
import { useNotifications } from '../features/notifications/useNotifications';
import { Icon } from './icons';

export interface NotificationBellProps {
  active: boolean;
  onClick: () => void;
}

/**
 * Mục "Hộp thư" của sidebar kèm huy hiệu số chưa xem. Đây là nơi DUY NHẤT poll thông báo (useNotifications, 60s);
 * danh sách thông báo nằm ở màn /inbox.
 */
export const NotificationBell: React.FC<NotificationBellProps> = ({ active, onClick }) => {
  const { data } = useNotifications();
  const unread = data?.unread_count ?? 0;
  return (
    <button type="button" className="shell-nav-item" aria-label={unread > 0 ? `Hộp thư, ${unread} chưa xem` : 'Hộp thư'} aria-current={active ? 'page' : undefined} onClick={onClick}>
      <Icon name="inbox" />
      <span className="shell-nav-label">Hộp thư</span>
      {unread > 0 && (
        <span className="shell-nav-count" data-testid="notification-badge" aria-hidden="true">
          {unread > 99 ? '99+' : unread}
        </span>
      )}
    </button>
  );
};

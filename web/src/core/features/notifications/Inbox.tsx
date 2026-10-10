import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '../../../ui';
import { apiErrorMessage, fetchNotifications, markAllNotificationsSeen, type NotificationsResponse } from '../../api';
import { useToast } from '../../../shared/components/Toast';
import { formatVnDate } from '../../../shared/utils/date';
import { markAllSeen } from './notificationCache';
import { applyInboxFilters, type InboxFilter } from './notificationFilters';
import { notificationBody, notificationTitle } from './notificationText';
import { NOTIFICATIONS_KEY } from './useNotifications';
import { useOpenNotification } from './useOpenNotification';
import './inbox.css';

/** Core trả tối đa chừng này thông báo mới nhất (GET /api/notifications LIMIT 20). */
const CORE_LIMIT = 20;

const CHIPS: { value: InboxFilter; label: string }[] = [
  { value: 'unread', label: 'Chưa đọc' },
  { value: 'mention', label: 'Nhắc tên' },
  { value: 'review', label: 'Duyệt' },
];

/**
 * Màn Hộp thư. Chỉ ĐỌC cache `core-notifications` (`enabled: false`): việc tải và poll 60 giây do
 * `shell/NotificationBell` làm, để không có poller thứ hai.
 */
export const Inbox: React.FC = () => {
  const toast = useToast();
  const queryClient = useQueryClient();
  const { data, isError } = useQuery({ queryKey: NOTIFICATIONS_KEY, queryFn: fetchNotifications, enabled: false });
  const openNotification = useOpenNotification();
  const [active, setActive] = useState<InboxFilter[]>([]);

  const markAll = useMutation({
    mutationFn: markAllNotificationsSeen,
    onSuccess: () => queryClient.setQueryData<NotificationsResponse>(NOTIFICATIONS_KEY, (prev) => (prev ? markAllSeen(prev) : prev)),
    onError: (err) => toast.error(apiErrorMessage(err, 'Không đánh dấu được đã đọc.')),
  });

  const toggle = (f: InboxFilter) => setActive((prev) => (prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f]));
  const items = data ? applyInboxFilters(data.notifications, active) : [];
  const unread = data?.unread_count ?? 0;
  const capped = (data?.notifications.length ?? 0) >= CORE_LIMIT;

  return (
    <div className="inbox">
      <div className="inbox-head">
        <h1 className="inbox-title">Hộp thư</h1>
        <span className="inbox-spacer" />
        <Button size="sm" disabled={unread === 0 || markAll.isPending} onClick={() => markAll.mutate()}>
          Đánh dấu tất cả đã đọc
        </Button>
      </div>
      <div className="inbox-chips" role="group" aria-label="Lọc thông báo">
        {CHIPS.map((c) => (
          <button key={c.value} type="button" className="inbox-chip" aria-pressed={active.includes(c.value)} onClick={() => toggle(c.value)}>
            {c.label}
          </button>
        ))}
      </div>
      {!data ? (
        isError ? <p className="inbox-state inbox-state--error" role="alert">Lỗi tải thông báo.</p>
          : <p className="inbox-state" role="status">Đang tải thông báo…</p>
      ) : data.notifications.length === 0 ? (
        <p className="inbox-state">Hộp thư trống.</p>
      ) : items.length === 0 ? (
        <p className="inbox-state">{capped ? `Không có thông báo nào khớp trong ${CORE_LIMIT} thông báo gần nhất.` : 'Không có thông báo nào khớp bộ lọc.'}</p>
      ) : (
        <ul className="inbox-list">
          {items.map((n) => (
            <li key={n.id}>
              <button type="button" className={`inbox-row${n.seen_at ? '' : ' inbox-row--unread'}`} onClick={() => openNotification(n)}>
                {n.seen_at ? <span className="inbox-dot-gap" /> : <span className="inbox-dot" aria-label="Chưa đọc" role="img" />}
                <span className="inbox-row-body">
                  <span className="inbox-row-title">{notificationTitle(n.title)}</span>
                  <span className="inbox-row-text">{notificationBody(n.body)}</span>
                </span>
                <span className="inbox-row-date">{formatVnDate(n.created_at)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {capped && <p className="inbox-note">Hiển thị {CORE_LIMIT} thông báo gần nhất</p>}
    </div>
  );
};

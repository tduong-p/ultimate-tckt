import React, { useEffect, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiErrorMessage, markAllNotificationsSeen, type NotificationsResponse } from '../../api';
import { useToast } from '../../../shared/components/Toast';
import { formatVnDate } from '../../../shared/utils/date';
import { markAllSeen } from './notificationCache';
import { deliveryLabel, notificationBody, notificationTitle } from './notificationText';
import { NOTIFICATIONS_KEY, useNotifications } from './useNotifications';
import { useOpenNotification } from './useOpenNotification';

const BellIcon = () => (
  <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
);

/** Nút chuông ở thanh trên: huy hiệu số chưa xem và bảng thông báo (giữ 7 ngày). */
export const NotificationBell: React.FC = () => {
  const queryClient = useQueryClient();
  const toast = useToast();
  const openNotification = useOpenNotification();
  const { data, refetch, isError, isPending, error } = useNotifications();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const items = data?.notifications ?? [];
  const unread = data?.unread_count ?? 0;

  const markAll = useMutation({
    mutationFn: markAllNotificationsSeen,
    onSuccess: () => {
      queryClient.setQueryData<NotificationsResponse>(NOTIFICATIONS_KEY, (prev) => (prev ? markAllSeen(prev) : prev));
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Không đánh dấu được đã xem.')),
  });

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const toggle = async () => {
    const opening = !open;
    setOpen(opening);
    if (!opening) return;
    const result = await refetch();
    if ((result.data?.unread_count ?? 0) > 0) markAll.mutate();
  };

  return (
    <div ref={rootRef} style={{ position: 'relative' }}>
      <button
        type="button"
        aria-label={unread ? `Thông báo, ${unread} chưa xem` : 'Thông báo'}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={toggle}
        style={{ position: 'relative', background: 'none', border: 'none', cursor: 'pointer', padding: 6, borderRadius: 4, display: 'flex', alignItems: 'center', color: 'var(--ui-text-muted)' }}
      >
        <BellIcon />
        {unread > 0 && (
          <span
            data-testid="notification-badge"
            style={{ position: 'absolute', top: 0, right: 0, minWidth: 16, height: 16, padding: '0 4px', borderRadius: 8, fontSize: 10, lineHeight: '16px', fontWeight: 700, textAlign: 'center', color: '#fff', background: 'var(--ui-danger)', boxSizing: 'border-box' }}
          >
            {unread > 99 ? '99+' : String(unread)}
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Thông báo"
          style={{ position: 'absolute', right: 0, top: '100%', zIndex: 600, width: 360, maxWidth: 'calc(100vw - 32px)', maxHeight: '70vh', overflowY: 'auto', background: 'var(--ui-bg-card)', border: '1px solid var(--ui-border)', borderRadius: 6, boxShadow: 'var(--ui-shadow-md)' }}
        >
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--ui-border)' }}>
            <strong>Thông báo</strong>
            <div style={{ fontSize: 12, color: 'var(--ui-text-muted)' }}>Lưu trong 7 ngày</div>
          </div>
          {isError && (
            <p role="alert" style={{ padding: 16, margin: 0, color: 'var(--ui-danger)' }}>
              {apiErrorMessage(error, 'Không tải được thông báo.')}
            </p>
          )}
          {items.length === 0 && isPending ? (
            <p style={{ padding: 16, margin: 0, color: 'var(--ui-text-muted)' }}>Đang tải thông báo…</p>
          ) : items.length === 0 && !isError ? (
            <p style={{ padding: 16, margin: 0, color: 'var(--ui-text-muted)' }}>Chưa có thông báo.</p>
          ) : items.length > 0 ? (
            items.map((n) => (
              <button
                key={n.id}
                type="button"
                data-testid={`notification-${n.id}`}
                data-unread={n.seen_at ? 'false' : 'true'}
                onClick={() => {
                  setOpen(false);
                  openNotification(n);
                }}
                style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 16px', border: 'none', borderBottom: '1px solid var(--ui-border)', cursor: 'pointer', background: n.seen_at ? 'transparent' : 'var(--ui-bg-hover)', color: 'var(--ui-text)' }}
              >
                <strong style={{ display: 'block' }}>{notificationTitle(n.title)}</strong>
                <span style={{ display: 'block', margin: '2px 0' }}>{notificationBody(n.body)}</span>
                <span style={{ display: 'flex', gap: 6, flexWrap: 'wrap', fontSize: 11 }}>
                  {n.email_status && <span>{deliveryLabel('email', n.email_status)}</span>}
                  {n.push_status && <span>{deliveryLabel('push', n.push_status)}</span>}
                </span>
                <small style={{ color: 'var(--ui-text-muted)' }}>{formatVnDate(n.created_at)}</small>
              </button>
            ))
          ) : null}
        </div>
      )}
    </div>
  );
};

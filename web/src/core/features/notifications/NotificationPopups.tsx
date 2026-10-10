import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchNotifications, type NotificationItem } from '../../api';
import { notificationBody, notificationTitle } from './notificationText';
import { NOTIFICATIONS_KEY } from './useNotifications';
import { useOpenNotification } from './useOpenNotification';

const BellIcon = () => (
  <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0, marginTop: 2 }}>
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
);

const MAX_POPUPS = 3;
const POPUP_MS = 7000;

const PopupCard: React.FC<{ item: NotificationItem; onOpen: (item: NotificationItem) => void; onExpire: (id: number) => void }> = ({ item, onOpen, onExpire }) => {
  useEffect(() => {
    const timer = setTimeout(() => onExpire(item.id), POPUP_MS);
    return () => clearTimeout(timer);
  }, [item.id, onExpire]);
  return (
    <button
      type="button"
      onClick={() => onOpen(item)}
      style={{
        display: 'flex',
        gap: 10,
        textAlign: 'left',
        width: 320,
        maxWidth: 'calc(100vw - 32px)',
        padding: '10px 14px',
        border: '1px solid var(--ui-border)',
        borderRadius: 'var(--ui-radius-sm, 6px)',
        cursor: 'pointer',
        background: 'var(--ui-bg-card)',
        color: 'var(--ui-text)',
        boxShadow: 'var(--ui-shadow-md)',
      }}
    >
      <BellIcon />
      <span>
        <strong style={{ display: 'block' }}>{notificationTitle(item.title)}</strong>
        <span style={{ color: 'var(--ui-text-muted)' }}>{notificationBody(item.body)}</span>
      </span>
    </button>
  );
};

/**
 * Popup cho tối đa 3 thông báo mới chưa xem. Chỉ đọc cache `core-notifications` (`enabled: false`);
 * việc tải/poll do `NotificationBell` làm.
 */
export const NotificationPopups: React.FC = () => {
  const { data } = useQuery({ queryKey: NOTIFICATIONS_KEY, queryFn: fetchNotifications, enabled: false });
  const openNotification = useOpenNotification();
  const announced = useRef<Set<number>>(new Set());
  const [popups, setPopups] = useState<NotificationItem[]>([]);

  useEffect(() => {
    if (!data) return;
    // Như UI cũ: lấy 3 mục chưa xem mới nhất trước, rồi mới bỏ mục đã báo.
    const fresh = data.notifications
      .filter((n) => !n.seen_at)
      .slice(0, MAX_POPUPS)
      .reverse()
      .filter((n) => !announced.current.has(n.id));
    if (fresh.length === 0) return;
    fresh.forEach((n) => announced.current.add(n.id));
    setPopups((prev) => [...prev, ...fresh].slice(-MAX_POPUPS));
  }, [data]);

  const expire = useCallback((id: number) => setPopups((prev) => prev.filter((p) => p.id !== id)), []);
  const open = useCallback(
    (item: NotificationItem) => {
      expire(item.id);
      openNotification(item);
    },
    [expire, openNotification]
  );

  return (
    <div
      data-testid="notification-popups"
      aria-live="polite"
      style={{ position: 'fixed', top: 64, right: 16, zIndex: 700, display: 'flex', flexDirection: 'column', gap: 8, pointerEvents: popups.length ? 'auto' : 'none' }}
    >
      {popups.map((p) => <PopupCard key={p.id} item={p} onOpen={open} onExpire={expire} />)}
    </div>
  );
};

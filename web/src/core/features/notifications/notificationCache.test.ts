import { describe, it, expect } from 'vitest';
import { markAllSeen, markOneSeen } from './notificationCache';
import type { NotificationsResponse } from '../../api';

const base = (): NotificationsResponse => ({
  unread_count: 2,
  notifications: [
    { id: 3, kind: 'k', title: 'a', body: 'b', created_at: '2026-10-09T01:00:00Z', seen_at: null },
    { id: 2, kind: 'k', title: 'a', body: 'b', created_at: '2026-10-09T00:30:00Z', seen_at: null },
    { id: 1, kind: 'k', title: 'a', body: 'b', created_at: '2026-10-08T00:00:00Z', seen_at: '2026-10-08T01:00:00Z' },
  ],
});

describe('notificationCache', () => {
  it('markOneSeen: đánh dấu mục chưa xem và trừ 1', () => {
    const next = markOneSeen(base(), 3, '2026-10-09T02:00:00Z');
    expect(next.unread_count).toBe(1);
    expect(next.notifications.find((n) => n.id === 3)?.seen_at).toBe('2026-10-09T02:00:00Z');
    expect(next.notifications.find((n) => n.id === 2)?.seen_at).toBeNull();
  });

  it('markOneSeen: mục đã xem hoặc không có trong cache thì giữ nguyên, không trừ hai lần', () => {
    const prev = base();
    expect(markOneSeen(prev, 1)).toEqual(prev);
    expect(markOneSeen(prev, 99)).toEqual(prev);
  });

  it('markOneSeen: không để unread_count âm', () => {
    const prev = { ...base(), unread_count: 0 };
    expect(markOneSeen(prev, 3).unread_count).toBe(0);
  });

  it('markAllSeen: mọi mục có seen_at và unread_count = 0, giữ seen_at cũ', () => {
    const next = markAllSeen(base(), '2026-10-09T02:00:00Z');
    expect(next.unread_count).toBe(0);
    expect(next.notifications.map((n) => n.seen_at)).toEqual([
      '2026-10-09T02:00:00Z',
      '2026-10-09T02:00:00Z',
      '2026-10-08T01:00:00Z',
    ]);
  });
});

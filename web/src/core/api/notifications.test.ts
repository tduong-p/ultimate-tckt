import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiClient } from '../../shared/utils/api';
import { fetchNotifications, markAllNotificationsSeen, markNotificationSeen } from './notifications';

vi.mock('../../shared/utils/api', () => ({ apiClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn() } }));

describe('notifications api', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetchNotifications: GET /notifications', async () => {
    const data = { notifications: [], unread_count: 0 };
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data });
    await expect(fetchNotifications()).resolves.toEqual(data);
    expect(apiClient.get).toHaveBeenCalledWith('/notifications');
  });

  it('markNotificationSeen: PATCH /notifications/:id/seen', async () => {
    vi.mocked(apiClient.patch).mockResolvedValueOnce({ data: { ok: true } });
    await expect(markNotificationSeen(5)).resolves.toEqual({ ok: true });
    expect(apiClient.patch).toHaveBeenCalledWith('/notifications/5/seen');
  });

  it('markAllNotificationsSeen: POST /notifications/seen', async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({ data: { ok: true, marked_seen: 3 } });
    await expect(markAllNotificationsSeen()).resolves.toEqual({ ok: true, marked_seen: 3 });
    expect(apiClient.post).toHaveBeenCalledWith('/notifications/seen');
  });
});

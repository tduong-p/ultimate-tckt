import { apiClient } from '../../shared/utils/api';
import type { NotificationsResponse } from './types';

/**
 * Hộp thông báo trong ứng dụng (tối đa 20 mục, giữ 7 ngày).
 * Endpoint: GET /api/notifications
 */
export async function fetchNotifications(): Promise<NotificationsResponse> {
  const response = await apiClient.get<NotificationsResponse>('/notifications');
  return response.data;
}

/**
 * Đánh dấu một thông báo đã xem.
 * Endpoint: PATCH /api/notifications/:id/seen
 */
export async function markNotificationSeen(id: number): Promise<{ ok: boolean }> {
  const response = await apiClient.patch<{ ok: boolean }>(`/notifications/${id}/seen`);
  return response.data;
}

/**
 * Đánh dấu tất cả thông báo đã xem.
 * Endpoint: POST /api/notifications/seen
 */
export async function markAllNotificationsSeen(): Promise<{ ok: boolean; marked_seen: number }> {
  const response = await apiClient.post<{ ok: boolean; marked_seen: number }>('/notifications/seen');
  return response.data;
}

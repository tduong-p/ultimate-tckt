import { apiClient } from '../../shared/utils/api';
import type { MyTasksTodayResponse } from './types';

/**
 * Fetch tasks assigned to the current user due today, overdue, or pending review.
 * Endpoint: GET /api/my-tasks-today
 */
export async function fetchMyTasksToday(): Promise<MyTasksTodayResponse> {
  const response = await apiClient.get<MyTasksTodayResponse>('/my-tasks-today');
  return response.data;
}

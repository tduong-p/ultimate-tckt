import { apiClient } from '../../shared/utils/api';
import type {
  ActivityItem,
  CreateActivityPayload,
  ActivityFilterParams,
  ArchiveFilterParams,
} from './types';

/**
 * Fetch activities matching optional filter parameters.
 * Endpoint: GET /api/activities
 */
export async function fetchActivities(params?: ActivityFilterParams): Promise<ActivityItem[]> {
  const response = await apiClient.get<ActivityItem[]>('/activities', { params });
  return response.data;
}

/**
 * Propose / create a new activity.
 * Endpoint: POST /api/activities
 */
export async function createActivity(payload: CreateActivityPayload): Promise<{ id: number }> {
  const response = await apiClient.post<{ id: number }>('/activities', payload);
  return response.data;
}

/**
 * Fetch past / completed activities from the archive.
 * Endpoint: GET /api/archive
 */
export async function fetchArchive(params?: ArchiveFilterParams): Promise<ActivityItem[]> {
  const response = await apiClient.get<ActivityItem[]>('/archive', { params });
  return response.data;
}

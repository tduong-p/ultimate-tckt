import { apiClient } from '../../shared/utils/api';
import type { TeamItem } from './types';

/**
 * Fetch active teams list with member counts.
 * Endpoint: GET /api/teams
 */
export async function fetchTeams(): Promise<TeamItem[]> {
  const response = await apiClient.get<TeamItem[]>('/teams');
  return response.data;
}

/**
 * Thành viên của một Tổ (admin hoặc người quản lý Tổ đó; người khác nhận 403).
 * Endpoint: GET /api/teams/:id/members
 */
export async function fetchTeamMembers(teamId: number): Promise<import('./types').TeamMembersResponse> {
  const response = await apiClient.get<import('./types').TeamMembersResponse>(`/teams/${teamId}/members`);
  return response.data;
}


import { apiClient } from '../../shared/utils/api';
import type { TeamItem } from './types';

export type TeamRole = 'member' | 'vice_leader' | 'leader';

export interface TeamOverviewTeam extends TeamItem {
  member_count: number;
  open_tasks: number;
  done_tasks: number;
  overdue_tasks: number;
}

export interface TeamOverviewMember {
  id: number;
  name: string;
  email: string;
  role: string;
  avatar_color?: string;
  is_lead: number | boolean;
  is_vice_lead: number | boolean;
  open_tasks: number;
  done_tasks: number;
}

export interface TeamOverviewTask {
  id: number;
  title: string;
  status: string;
  deadline: string;
  activity_title?: string;
  assignee_name?: string | null;
}

export interface TeamOverviewActivity {
  id: number;
  title: string;
  status: string;
  deadline: string;
  role?: string;
  task_count: number;
  done_count: number;
}

export interface TeamOverview {
  team: TeamOverviewTeam;
  members: TeamOverviewMember[];
  tasks: TeamOverviewTask[];
  activities: TeamOverviewActivity[];
}

export interface TeamMemberRow {
  id: number;
  name: string;
  email?: string;
  role?: string;
  avatar_color?: string;
  is_lead?: number | boolean;
  is_vice_lead?: number | boolean;
}

export interface TeamAvailableUser {
  id: number;
  name: string;
  email?: string;
  role?: string;
}

export interface TeamMembersResponse {
  members: TeamMemberRow[];
  available: TeamAvailableUser[];
}

export interface TeamFormPayload {
  name?: string;
  description?: string;
  color: string;
}

export interface DeleteTeamResult {
  ok: boolean;
  deleted: boolean;
  deactivated: boolean;
}

/**
 * Fetch active teams list with member counts.
 * Endpoint: GET /api/teams
 */
export async function fetchTeams(): Promise<TeamItem[]> {
  const response = await apiClient.get<TeamItem[]>('/teams');
  return response.data;
}

/** Trang Tổ: số liệu, việc, hoạt động, thành viên. Chỉ admin hoặc Tổ trưởng/Tổ phó của Tổ. Endpoint: GET /api/teams/:id/overview */
export async function fetchTeamOverview(teamId: number): Promise<TeamOverview> {
  const response = await apiClient.get<TeamOverview>(`/teams/${teamId}/overview`);
  return response.data;
}

/** Thành viên Tổ và danh sách tài khoản có thể thêm. Endpoint: GET /api/teams/:id/members */
export async function fetchTeamMembers(teamId: number): Promise<TeamMembersResponse> {
  const response = await apiClient.get<TeamMembersResponse>(`/teams/${teamId}/members`);
  return response.data;
}

/** Tạo Tổ (chỉ admin). Endpoint: POST /api/teams */
export async function createTeam(payload: { name: string; description: string; color: string }): Promise<{ id: number }> {
  const response = await apiClient.post<{ id: number }>('/teams', payload);
  return response.data;
}

/** Sửa Tổ: admin sửa tên, mô tả, màu; Tổ trưởng chỉ màu. Endpoint: PATCH /api/teams/:id */
export async function updateTeam(teamId: number, payload: TeamFormPayload): Promise<{ ok: boolean }> {
  const response = await apiClient.patch<{ ok: boolean }>(`/teams/${teamId}`, payload);
  return response.data;
}

/** Xoá Tổ (chỉ admin); server có thể chỉ lưu trữ. Endpoint: DELETE /api/teams/:id */
export async function deleteTeam(teamId: number): Promise<DeleteTeamResult> {
  const response = await apiClient.delete<DeleteTeamResult>(`/teams/${teamId}`);
  return response.data;
}

/** Thêm thành viên vào Tổ. Endpoint: POST /api/teams/:id/members */
export async function addTeamMember(teamId: number, payload: { user_id: number; team_role: TeamRole }): Promise<{ ok: boolean }> {
  const response = await apiClient.post<{ ok: boolean }>(`/teams/${teamId}/members`, payload);
  return response.data;
}

/** Đổi vai trò trong Tổ (chỉ admin). Endpoint: PATCH /api/teams/:id/members/:userId */
export async function setTeamMemberRole(teamId: number, userId: number, teamRole: TeamRole): Promise<{ ok: boolean; role: string }> {
  const response = await apiClient.patch<{ ok: boolean; role: string }>(`/teams/${teamId}/members/${userId}`, { team_role: teamRole });
  return response.data;
}

/** Xoá thành viên khỏi Tổ. Endpoint: DELETE /api/teams/:id/members/:userId */
export async function removeTeamMember(teamId: number, userId: number): Promise<{ ok: boolean; role: string }> {
  const response = await apiClient.delete<{ ok: boolean; role: string }>(`/teams/${teamId}/members/${userId}`);
  return response.data;
}

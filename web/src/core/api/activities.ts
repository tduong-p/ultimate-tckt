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

export interface ActivityTeamRow {
  activity_id?: number;
  team_id: number;
  role: 'primary' | 'supporting' | string;
  responsibility?: string | null;
  contact_user_id?: number | null;
  contact_name?: string | null;
  name: string;
  color?: string;
}

/** Dòng công việc trong `GET /api/activities/:id` (server đã chuẩn hoá `stage`). */
export interface ActivityTaskRow {
  id: number;
  activity_id: number;
  team_id: number;
  title: string;
  description?: string | null;
  stage?: 'before' | 'during' | 'after' | 'general' | string;
  recorded_stage?: string;
  priority: string;
  status: string;
  start_date?: string | null;
  deadline: string;
  deliverable?: string | null;
  team_name?: string;
  primary_assignee_id?: number | null;
  primary_assignee_name?: string | null;
  assignee_name?: string | null;
  assignee_ids?: string | null;
  checklist_total?: number;
  checklist_done?: number;
}

export interface ActivityParticipant {
  activity_id?: number;
  user_id: number;
  state: 'confirmed' | 'volunteered' | 'declined' | string;
  responsibility?: string | null;
  name: string;
  role?: string;
  avatar_color?: string;
}

export interface ActivityUpdateTag {
  id: number;
  name: string;
}

export type ActivityUpdateKind = 'comment' | 'progress' | 'issue' | 'evidence';

export interface ActivityUpdate {
  id: number;
  activity_id?: number;
  task_id?: number | null;
  user_id?: number;
  kind: ActivityUpdateKind | 'review_note' | string;
  body: string;
  attachment_url?: string | null;
  created_at: string;
  user_name: string;
  avatar_color?: string;
  tagged_users: ActivityUpdateTag[];
}

/** Người có thể thêm vào hoạt động (`people` của `GET /api/activities/:id`). */
export interface ActivityPerson {
  id: number;
  name: string;
  role?: string;
  team_id?: number | null;
  team_ids: number[];
  team_names: string[];
}

export interface TaggablePerson {
  id: number;
  name: string;
  role?: string;
}

export interface ActivityAttachment {
  id: number;
  task_id: number;
  kind: 'clarification' | 'evidence' | 'issue' | 'deliverable' | string;
  label?: string | null;
  link_url?: string | null;
  original_name?: string | null;
  mime_type?: string | null;
  size_bytes?: number | null;
  created_at?: string;
  user_name?: string;
}

export interface ProposalHistoryItem {
  id: number;
  activity_id?: number;
  action: 'submit' | 'approve' | 'reject' | 'request_changes' | string;
  submitter_name?: string;
  reviewer_name?: string | null;
  feedback_notes?: string | null;
  created_at: string;
}

export interface ActivityDetail {
  activity: ActivityItem;
  activityTeams: ActivityTeamRow[];
  tasks: ActivityTaskRow[];
  participants: ActivityParticipant[];
  updates: ActivityUpdate[];
  people: ActivityPerson[];
  taggablePeople: TaggablePerson[];
  attachments: ActivityAttachment[];
  proposalHistory: ProposalHistoryItem[];
  canManage: boolean;
}

/** Trường `PATCH /api/activities/:id` chấp nhận. Người không phải admin không được gửi `status`, `event_lead_id`, `team_id`, `team_ids`. */
export interface UpdateActivityPayload {
  title?: string;
  description?: string;
  type?: string;
  priority?: string;
  start_date?: string | null;
  deadline?: string;
  location?: string | null;
  requested_by?: string | null;
  result_summary?: string | null;
  proposal_document_url?: string;
  is_public?: boolean;
  public_image_url?: string;
  status?: string;
  event_lead_id?: number | null;
  team_id?: number;
  team_ids?: number[];
}

export interface PostUpdatePayload {
  kind: ActivityUpdateKind;
  body: string;
  attachment_url?: string;
  tagged_user_ids?: number[];
  task_id?: number;
}

/** Endpoint: GET /api/activities/:id */
export async function fetchActivityDetail(id: number): Promise<ActivityDetail> {
  const response = await apiClient.get<ActivityDetail>(`/activities/${id}`);
  return response.data;
}

/** Endpoint: PATCH /api/activities/:id. `deleted: true` khi admin chuyển sang `cancelled` (server xoá hẳn). */
export async function updateActivity(id: number, payload: UpdateActivityPayload): Promise<{ ok: boolean; deleted?: boolean }> {
  const response = await apiClient.patch<{ ok: boolean; deleted?: boolean }>(`/activities/${id}`, payload);
  return response.data;
}

/** Endpoint: DELETE /api/activities/:id (chỉ admin, xoá hẳn). */
export async function deleteActivity(id: number): Promise<{ ok: boolean; id: number; title: string }> {
  const response = await apiClient.delete<{ ok: boolean; id: number; title: string }>(`/activities/${id}`);
  return response.data;
}

/** Endpoint: POST /api/activities/:id/approve */
export async function approveActivity(id: number): Promise<{ ok: boolean }> {
  const response = await apiClient.post<{ ok: boolean }>(`/activities/${id}/approve`);
  return response.data;
}

/** Endpoint: POST /api/activities/:id/request-changes (bắt buộc feedback). */
export async function requestActivityChanges(id: number, feedback: string): Promise<{ ok: boolean }> {
  const response = await apiClient.post<{ ok: boolean }>(`/activities/${id}/request-changes`, { feedback });
  return response.data;
}

/** Endpoint: POST /api/activities/:id/reject (bắt buộc feedback; server xoá hẳn hoạt động). */
export async function rejectActivity(id: number, feedback: string): Promise<{ ok: boolean; deleted?: boolean }> {
  const response = await apiClient.post<{ ok: boolean; deleted?: boolean }>(`/activities/${id}/reject`, { feedback });
  return response.data;
}

/** Endpoint: POST /api/activities/:id/submit (nộp lại đề án). */
export async function submitActivity(id: number): Promise<{ ok: boolean }> {
  const response = await apiClient.post<{ ok: boolean }>(`/activities/${id}/submit`);
  return response.data;
}

/** Endpoint: POST /api/activities/:id/volunteer */
export async function volunteerForActivity(id: number): Promise<{ ok: boolean }> {
  const response = await apiClient.post<{ ok: boolean }>(`/activities/${id}/volunteer`);
  return response.data;
}

/** Endpoint: POST /api/activities/:id/participants */
export async function addActivityParticipants(id: number, payload: { user_ids: number[]; responsibility: string }): Promise<void> {
  await apiClient.post(`/activities/${id}/participants`, payload);
}

/** Endpoint: POST /api/activities/:id/updates */
export async function postActivityUpdate(id: number, payload: PostUpdatePayload): Promise<{ ok: boolean; id: number }> {
  const response = await apiClient.post<{ ok: boolean; id: number }>(`/activities/${id}/updates`, payload);
  return response.data;
}

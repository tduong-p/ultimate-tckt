import { apiClient } from '../../shared/utils/api';
import type {
  SessionData,
  BootstrapData,
  ActivityItem,
  CreateActivityPayload,
  ActivityFilterParams,
  TeamItem,
  MemberItem,
  MyTasksTodayResponse,
  DocumentsResponse,
  DocumentFilterParams,
  ArchiveFilterParams,
  ReportExportParams,
} from './types';

export * from './types';

/**
 * Fetch current user session and active unit context.
 * Endpoint: GET /api/session
 */
export async function fetchSession(): Promise<SessionData> {
  const response = await apiClient.get<SessionData>('/session');
  return response.data;
}

/**
 * Fetch global dashboard bootstrap statistics, upcoming items, tasks, and teams.
 * Endpoint: GET /api/bootstrap
 */
export async function fetchBootstrap(): Promise<BootstrapData> {
  const response = await apiClient.get<BootstrapData>('/bootstrap');
  return response.data;
}

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
 * Fetch active teams list with member counts.
 * Endpoint: GET /api/teams
 */
export async function fetchTeams(): Promise<TeamItem[]> {
  const response = await apiClient.get<TeamItem[]>('/teams');
  return response.data;
}

/**
 * Fetch member directory list within current user's scope.
 * Endpoint: GET /api/people
 */
export async function fetchMembers(): Promise<MemberItem[]> {
  const response = await apiClient.get<MemberItem[]>('/people');
  return response.data;
}

/**
 * Fetch tasks assigned to the current user due today, overdue, or pending review.
 * Endpoint: GET /api/my-tasks-today
 */
export async function fetchMyTasksToday(): Promise<MyTasksTodayResponse> {
  const response = await apiClient.get<MyTasksTodayResponse>('/my-tasks-today');
  return response.data;
}

/**
 * Fetch documents and available filter options.
 * Endpoint: GET /api/documents
 */
export async function fetchDocuments(params?: DocumentFilterParams): Promise<DocumentsResponse> {
  const response = await apiClient.get<DocumentsResponse>('/documents', { params });
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

/**
 * Generate direct download URL for exporting reports in Excel format.
 * Endpoint: GET /api/reports/export
 */
export function getReportExportUrl(params: ReportExportParams): string {
  const searchParams = new URLSearchParams();
  searchParams.set('start', params.start);
  searchParams.set('end', params.end);

  if (
    params.team_id !== undefined &&
    params.team_id !== null &&
    params.team_id !== '' &&
    params.team_id !== 'all' &&
    params.team_id !== 0 &&
    params.team_id !== '0'
  ) {
    searchParams.set('team_id', String(params.team_id));
  }

  searchParams.set('lang', params.lang || 'vi');

  return `/api/reports/export?${searchParams.toString()}`;
}

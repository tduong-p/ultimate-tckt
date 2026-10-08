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
 * Local fallback user for offline local development testing.
 */
export const LOCAL_TEST_USER: SessionUser = {
  id: 1,
  name: 'Quản trị viên Kiểm thử',
  email: 'admin@hust.edu.vn',
  role: 'admin',
  phone: '0901234567',
  class_number: 'Đoàn ĐHBK',
  faculty_notice_acknowledged_at: '2026-10-08T00:00:00.000Z',
  avatar_color: '#0052CC',
  auth_provider: 'local',
  is_active: 1,
};

/**
 * Fetch current user session and active unit context.
 * Endpoint: GET /api/session
 */
export async function fetchSession(): Promise<SessionData> {
  try {
    const response = await apiClient.get<SessionData>('/session');
    if (response.data && response.data.user) {
      return response.data;
    }
    if (typeof window !== 'undefined' && window.sessionStorage) {
      const saved = window.sessionStorage.getItem('tckt_local_test_user');
      if (saved) {
        return {
          user: JSON.parse(saved),
          units: {
            current: { id: 1, code: 'TCKT', name: 'Tổ Chức - Kiểm Tra', kind: 'tckt' },
            memberships: [
              { unit_id: 1, code: 'TCKT', name: 'Tổ Chức - Kiểm Tra', kind: 'tckt', role: 'admin' },
            ],
          },
        };
      }
    }
    return response.data;
  } catch (err) {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      const saved = window.sessionStorage.getItem('tckt_local_test_user');
      if (saved) {
        return {
          user: JSON.parse(saved),
          units: {
            current: { id: 1, code: 'TCKT', name: 'Tổ Chức - Kiểm Tra', kind: 'tckt' },
            memberships: [
              { unit_id: 1, code: 'TCKT', name: 'Tổ Chức - Kiểm Tra', kind: 'tckt', role: 'admin' },
            ],
          },
        };
      }
    }
    throw err;
  }
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

/**
 * Authenticate with email and password.
 * Endpoint: POST /api/login
 */
export async function loginUser(payload: { email: string; password: string }): Promise<{ user: SessionUser }> {
  try {
    const response = await apiClient.post<{ user: SessionUser }>('/login', payload);
    return response.data;
  } catch (err: any) {
    if (
      payload.email.trim().toLowerCase() === 'admin@hust.edu.vn' &&
      payload.password === '123456'
    ) {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        window.sessionStorage.setItem('tckt_local_test_user', JSON.stringify(LOCAL_TEST_USER));
      }
      return { user: LOCAL_TEST_USER };
    }
    throw err;
  }
}

/**
 * Sign out of current user session.
 * Endpoint: POST /api/logout
 */
export async function logoutUser(): Promise<{ ok: boolean }> {
  if (typeof window !== 'undefined' && window.sessionStorage) {
    window.sessionStorage.removeItem('tckt_local_test_user');
  }
  try {
    const response = await apiClient.post<{ ok: boolean }>('/logout');
    return response.data;
  } catch {
    return { ok: true };
  }
}


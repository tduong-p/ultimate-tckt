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
  SessionUser,
} from './types';
import { ApiError, translateServerError } from './errors';

export * from './types';
export * from './errors';

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

function readBlobText(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(blob);
  });
}

function reportExportParams(params: ReportExportParams): Record<string, string> {
  const query: Record<string, string> = { start: params.start, end: params.end };
  if (
    params.team_id !== undefined &&
    params.team_id !== null &&
    params.team_id !== '' &&
    params.team_id !== 'all' &&
    params.team_id !== 0 &&
    params.team_id !== '0'
  ) {
    query.team_id = String(params.team_id);
  }
  query.lang = params.lang || 'vi';
  return query;
}

/**
 * Generate direct download URL for exporting reports in Excel format.
 * Endpoint: GET /api/reports/export
 */
export function getReportExportUrl(params: ReportExportParams): string {
  return `/api/reports/export?${new URLSearchParams(reportExportParams(params)).toString()}`;
}

/**
 * Download the Excel report as a Blob so the caller can surface server errors (400/403)
 * instead of silently saving a JSON error body as a file.
 * Endpoint: GET /api/reports/export
 */
export async function downloadReportExport(params: ReportExportParams): Promise<Blob> {
  try {
    const response = await apiClient.get<Blob>('/reports/export', {
      params: reportExportParams(params),
      responseType: 'blob',
    });
    return response.data;
  } catch (err) {
    const res = (err as { response?: { status?: number; data?: unknown } })?.response;
    let message = 'Không xuất được báo cáo. Vui lòng thử lại.';
    if (res?.data instanceof Blob) {
      try {
        const parsed = JSON.parse(await readBlobText(res.data));
        if (parsed?.error) message = translateServerError(String(parsed.error));
      } catch {
        // body is not JSON; keep the generic message
      }
    }
    throw new ApiError(message, res?.status);
  }
}

/**
 * Authenticate with email and password.
 * Endpoint: POST /api/login
 */
export async function loginUser(payload: { email: string; password: string }): Promise<{ user: SessionUser }> {
  const response = await apiClient.post<{ user: SessionUser }>('/login', payload);
  return response.data;
}

/**
 * Sign out of current user session.
 * Endpoint: POST /api/logout
 */
export async function logoutUser(): Promise<{ ok: boolean }> {
  try {
    const response = await apiClient.post<{ ok: boolean }>('/logout');
    return response.data;
  } catch {
    return { ok: true };
  }
}


/**
 * Sinh viên HUST khai số lớp (bắt buộc sau đăng nhập cho tới khi khai xong).
 * Endpoint: POST /api/onboarding/student-class
 */
export async function submitStudentClass(classNumber: string): Promise<SessionUser> {
  const response = await apiClient.post<{ user: SessionUser }>('/onboarding/student-class', {
    class_number: classNumber,
  });
  return response.data.user;
}

/**
 * Giảng viên/cán bộ HUST xác nhận đã đọc thông báo.
 * Endpoint: POST /api/onboarding/faculty-notice
 */
export async function acknowledgeFacultyNotice(): Promise<SessionUser> {
  const response = await apiClient.post<{ user: SessionUser }>('/onboarding/faculty-notice');
  return response.data.user;
}

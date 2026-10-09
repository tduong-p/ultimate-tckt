import { apiClient } from '../../shared/utils/api';
import type { SessionData, BootstrapData, SessionUser } from './types';

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

/**
 * Đổi đơn vị đang làm việc.
 * Endpoint: POST /api/session/unit
 */
export async function switchUnit(unitId: number): Promise<SessionData> {
  const response = await apiClient.post<SessionData>('/session/unit', { unit_id: unitId });
  return response.data;
}

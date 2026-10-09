import { apiClient } from '../../shared/utils/api';
import type { MemberItem, SessionUser } from './types';

export interface CreateUserPayload {
  name: string;
  email: string;
  role: string;
  phone?: string;
  auth_provider: 'local' | 'microsoft';
  /** Bắt buộc khi `auth_provider === 'local'`; bỏ hẳn khi SSO. */
  password?: string;
  team_ids: number[];
}

export interface UpdateUserPayload {
  name: string;
  phone: string;
  avatar_color: string;
  role: string;
  team_ids: number[];
  /** Chỉ admin được gửi hai field này. */
  email?: string;
  password?: string;
}

export interface DeleteUserResult {
  ok: boolean;
  deleted: boolean;
  deactivated?: boolean;
  removed_from_managed_teams?: boolean;
}

export interface BulkImportRow {
  name: string;
  email: string;
}

export interface BulkImportResult {
  ok: boolean;
  created: number;
  skipped: number;
}

export interface AccountPayload {
  email: string;
  phone: string;
  avatar_color: string;
  password?: string;
}

/**
 * Fetch member directory list within current user's scope.
 * Endpoint: GET /api/people
 */
export async function fetchMembers(): Promise<MemberItem[]> {
  const response = await apiClient.get<MemberItem[]>('/people');
  return response.data;
}

/** Tạo tài khoản (quản lý). Endpoint: POST /api/users */
export async function createUser(payload: CreateUserPayload): Promise<{ id: number }> {
  const response = await apiClient.post<{ id: number }>('/users', payload);
  return response.data;
}

/** Sửa tài khoản. Endpoint: PATCH /api/users/:id */
export async function updateUser(userId: number, payload: UpdateUserPayload): Promise<{ ok: boolean }> {
  const response = await apiClient.patch<{ ok: boolean }>(`/users/${userId}`, payload);
  return response.data;
}

/** Xoá tài khoản: xoá hẳn, vô hiệu hoá hoặc chỉ gỡ khỏi Tổ của mình. Endpoint: DELETE /api/users/:id */
export async function deleteUser(userId: number): Promise<DeleteUserResult> {
  const response = await apiClient.delete<DeleteUserResult>(`/users/${userId}`);
  return response.data;
}

/** Nhập hàng loạt (chỉ admin). Endpoint: POST /api/users/bulk-import */
export async function bulkImportUsers(rows: BulkImportRow[]): Promise<BulkImportResult> {
  const response = await apiClient.post<BulkImportResult>('/users/bulk-import', { rows });
  return response.data;
}

/** Tài khoản của tôi. Mật khẩu để trống = giữ nguyên (đừng gửi `password`). Endpoint: PATCH /api/account */
export async function updateMyAccount(payload: AccountPayload): Promise<SessionUser> {
  const response = await apiClient.patch<{ user: SessionUser }>('/account', payload);
  return response.data.user;
}

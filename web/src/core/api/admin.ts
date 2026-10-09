import { apiClient } from '../../shared/utils/api';
import { apiErrorMessage } from './errors';

export interface WeightPreset {
  id: number;
  name: string;
  points: number | string;
  description?: string | null;
  sort_order?: number;
  is_active?: number | boolean;
}

export interface WeightPresetPayload {
  name: string;
  points: number;
  sort_order: number;
  description: string;
  /** Chỉ gửi khi sửa. */
  is_active?: boolean;
}

export interface SettingLock {
  message: string;
  reason: string | null;
  lockedBy: string | null;
}

/** Tất cả preset kể cả đã tắt. Endpoint: GET /api/admin/weight-presets (settingGuard) */
export async function fetchWeightPresets(): Promise<WeightPreset[]> {
  const response = await apiClient.get<WeightPreset[]>('/admin/weight-presets');
  return response.data;
}

export async function createWeightPreset(payload: WeightPresetPayload): Promise<WeightPreset> {
  const response = await apiClient.post<WeightPreset>('/admin/weight-presets', payload);
  return response.data;
}

export async function updateWeightPreset(id: number, payload: WeightPresetPayload): Promise<{ ok: boolean }> {
  const response = await apiClient.patch<{ ok: boolean }>(`/admin/weight-presets/${id}`, payload);
  return response.data;
}

export async function deleteWeightPreset(id: number): Promise<{ ok: boolean; deleted: boolean }> {
  const response = await apiClient.delete<{ ok: boolean; deleted: boolean }>(`/admin/weight-presets/${id}`);
  return response.data;
}

/** 403 `locked: true` của `settingGuard` (core/src/middleware/setting-guard.js); lỗi khác trả null. */
export function settingLock(err: unknown): SettingLock | null {
  const response = (err as { response?: { status?: number; data?: Record<string, unknown> } } | null)?.response;
  if (!response || response.status !== 403 || response.data?.locked !== true) return null;
  const error = response.data.error;
  const reason = response.data.reason;
  const lockedBy = response.data.locked_by_name;
  return {
    message: typeof error === 'string' && error ? error : 'Cấu hình này đang bị khoá.',
    reason: typeof reason === 'string' && reason ? reason : null,
    lockedBy: typeof lockedBy === 'string' && lockedBy ? lockedBy : null,
  };
}

/** Câu lỗi cho thao tác trên cấu hình: bị khoá thì kèm lý do và người khoá. */
export function settingErrorMessage(err: unknown): string {
  const lock = settingLock(err);
  if (!lock) return apiErrorMessage(err);
  return `${lock.message}${lock.reason ? ` Lý do: ${lock.reason}.` : ''}${lock.lockedBy ? ` Người khoá: ${lock.lockedBy}.` : ''}`;
}

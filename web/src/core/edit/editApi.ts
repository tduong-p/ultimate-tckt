import { apiClient } from '../../shared/utils/api';
import { DEFAULT_ERROR_MESSAGE, NETWORK_ERROR_MESSAGE, apiErrorMessage } from '../api/errors';

export interface BatchPayload {
  changes: Record<string, unknown>;
  base: Record<string, unknown>;
}

export interface BatchResult {
  changed: string[];
}

export type BatchErrorKind = 'conflict' | 'forbidden' | 'validation' | 'error';

export interface BatchError {
  kind: BatchErrorKind;
  fields?: string[];
  message: string;
}

export const CONFLICT_MESSAGE = 'Dữ liệu đã được người khác thay đổi. Tải lại để xem bản mới nhất.';
export const FORBIDDEN_MESSAGE = 'Bạn không có quyền sửa một số trường đã chọn.';

/** Endpoint: PATCH /api/tasks/:id/batch (docs/dev/api.md, Task Batch). */
export async function patchTaskBatch(id: number, payload: BatchPayload): Promise<BatchResult> {
  const response = await apiClient.patch<BatchResult>(`/tasks/${id}/batch`, payload);
  return response.data;
}

/** Endpoint: PATCH /api/activities/:id/batch. */
export async function patchActivityBatch(id: number, payload: BatchPayload): Promise<BatchResult> {
  const response = await apiClient.patch<BatchResult>(`/activities/${id}/batch`, payload);
  return response.data;
}

function fieldList(value: unknown): string[] | undefined {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : undefined;
}

/** Phân loại lỗi axios của hai route batch: 409 conflicts[], 403 forbidden[], 400 validation, còn lại là lỗi chung. */
export function classifyBatchError(err: unknown): BatchError {
  const response = (err as { response?: { status?: number; data?: Record<string, unknown> } } | null)?.response;
  if (!response) return { kind: 'error', message: NETWORK_ERROR_MESSAGE };
  const data = response.data ?? {};
  switch (response.status) {
    case 409:
      return { kind: 'conflict', fields: fieldList(data.conflicts), message: CONFLICT_MESSAGE };
    case 403:
    {
      const fields = fieldList(data.forbidden);
      const hasServerMessage = typeof data.error === 'string' && data.error.trim() !== '';
      return { kind: 'forbidden', fields, message: hasServerMessage ? apiErrorMessage(err) : FORBIDDEN_MESSAGE };
    }
    case 400:
      return { kind: 'validation', fields: fieldList(data.fields), message: apiErrorMessage(err, DEFAULT_ERROR_MESSAGE) };
    default:
      return { kind: 'error', message: apiErrorMessage(err) };
  }
}

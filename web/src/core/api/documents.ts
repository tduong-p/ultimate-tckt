import { apiClient } from '../../shared/utils/api';
import type { DocumentsResponse, DocumentFilterParams, DocumentPayload } from './types';
export type { DocumentPayload };

/**
 * Fetch documents and available filter options.
 * Endpoint: GET /api/documents
 */
export async function fetchDocuments(params?: DocumentFilterParams): Promise<DocumentsResponse> {
  const response = await apiClient.get<DocumentsResponse>('/documents', { params });
  return response.data;
}

/**
 * Thêm văn bản (chỉ link). Endpoint: POST /api/documents
 */
export async function createDocument(payload: DocumentPayload): Promise<{ id: number }> {
  const response = await apiClient.post<{ id: number }>('/documents', payload);
  return response.data;
}

/**
 * Sửa văn bản. Endpoint: PATCH /api/documents/:id
 */
export async function updateDocument(id: number, payload: DocumentPayload): Promise<{ ok: boolean }> {
  const response = await apiClient.patch<{ ok: boolean }>(`/documents/${id}`, payload);
  return response.data;
}


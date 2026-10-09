import { apiClient } from '../../shared/utils/api';
import type { DocumentsResponse, DocumentFilterParams } from './types';

/**
 * Fetch documents and available filter options.
 * Endpoint: GET /api/documents
 */
export async function fetchDocuments(params?: DocumentFilterParams): Promise<DocumentsResponse> {
  const response = await apiClient.get<DocumentsResponse>('/documents', { params });
  return response.data;
}

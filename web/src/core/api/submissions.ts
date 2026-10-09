import { apiClient } from '../../shared/utils/api';
import type { CreateSubmissionPayload, RespondSubmissionPayload, Submission } from './dieuHanhTypes';

/** GET /api/submissions — trình đơn vị hiện tại gửi hoặc nhận. */
export async function fetchSubmissions(): Promise<Submission[]> {
  const response = await apiClient.get<{ data: Submission[] }>('/submissions');
  return response.data.data;
}

/** GET /api/submissions/:id */
export async function fetchSubmission(id: number): Promise<Submission> {
  const response = await apiClient.get<Submission>(`/submissions/${id}`);
  return response.data;
}

/** POST /api/submissions — admin/vice_admin hoặc BTV. */
export async function createSubmission(payload: CreateSubmissionPayload): Promise<Submission> {
  const response = await apiClient.post<Submission>('/submissions', payload);
  return response.data;
}

/** POST /api/submissions/:id/respond — BTV/DYC. */
export async function respondSubmission(id: number, payload: RespondSubmissionPayload): Promise<Submission> {
  const response = await apiClient.post<Submission>(`/submissions/${id}/respond`, payload);
  return response.data;
}

/** POST /api/submissions/:id/withdraw — rút lại khi chưa có phản hồi. */
export async function withdrawSubmission(id: number): Promise<Submission> {
  const response = await apiClient.post<Submission>(`/submissions/${id}/withdraw`, {});
  return response.data;
}

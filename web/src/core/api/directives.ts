import { apiClient } from '../../shared/utils/api';
import type {
  CreateDirectivePayload, DieuHanhUnit, Directive, DirectiveDetail, RespondDirectivePayload, SubmitDirectivePayload, UnitMember,
} from './dieuHanhTypes';

/** GET /api/directives — chỉ đạo đơn vị hiện tại gửi hoặc nhận. */
export async function fetchDirectives(): Promise<Directive[]> {
  const response = await apiClient.get<{ data: Directive[] }>('/directives');
  return response.data.data;
}

/** GET /api/directives/:id — kèm `submissions` và `activities`. */
export async function fetchDirective(id: number): Promise<DirectiveDetail> {
  const response = await apiClient.get<DirectiveDetail>(`/directives/${id}`);
  return response.data;
}

/** GET /api/directives/units — đơn vị có module dieu-hanh (đích của chỉ đạo và trình). */
export async function fetchDieuHanhUnits(): Promise<DieuHanhUnit[]> {
  const response = await apiClient.get<{ data: DieuHanhUnit[] }>('/directives/units');
  return response.data.data;
}

/** POST /api/directives — chỉ BTV (hoặc DYC). */
export async function createDirective(payload: CreateDirectivePayload): Promise<Directive> {
  const response = await apiClient.post<Directive>('/directives', payload);
  return response.data;
}

/** POST /api/directives/:id/acknowledge — tiếp nhận, có thể chọn người phụ trách. */
export async function acknowledgeDirective(id: number, ownerUserId?: number): Promise<Directive> {
  const response = await apiClient.post<Directive>(`/directives/${id}/acknowledge`, ownerUserId ? { owner_user_id: ownerUserId } : {});
  return response.data;
}

/** POST /api/directives/:id/link-activity */
export async function linkDirectiveActivity(id: number, activityId: number): Promise<Directive> {
  const response = await apiClient.post<Directive>(`/directives/${id}/link-activity`, { activity_id: activityId });
  return response.data;
}

/** POST /api/directives/:id/submit — nộp kết quả (tạo một submission gửi ngược lên đơn vị giao). */
export async function submitDirectiveResult(id: number, payload: SubmitDirectivePayload) {
  const response = await apiClient.post(`/directives/${id}/submit`, payload);
  return response.data;
}

/** POST /api/directives/:id/respond — BTV/DYC đánh giá kết quả. */
export async function respondDirective(id: number, payload: RespondDirectivePayload): Promise<Directive> {
  const response = await apiClient.post<Directive>(`/directives/${id}/respond`, payload);
  return response.data;
}

/** GET /api/units/:id/members — thành viên của đơn vị mình (chọn người phụ trách). */
export async function fetchUnitMembers(unitId: number): Promise<UnitMember[]> {
  const response = await apiClient.get<UnitMember[]>(`/units/${unitId}/members`);
  return response.data;
}

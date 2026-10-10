import type { ActivityDetail, UpdateActivityPayload } from '../../api';
import { LINK_ERROR_MESSAGE } from '../../../shared/components/LinkField';
import { isHttpUrl } from '../../../shared/utils/url';

/**
 * Form của modal "Sửa thông tin khác": CHỈ các trường mà batch (activity-batch.js) không phủ.
 * Tiêu đề, mô tả, ưu tiên, ngày, Trưởng BTC, Tổ chủ trì sửa tại chỗ qua batch (có base/409).
 * Danh sách Tổ tham gia batch không biểu diễn được nên vẫn ở đây; `leadTeamId` chỉ để gửi kèm team_id.
 */
export interface EditForm {
  type: string;
  location: string;
  requestedBy: string;
  resultSummary: string;
  proposalUrl: string;
  isPublic: boolean;
  publicImageUrl: string;
  status: string;
  /** Tổ chủ trì hiện tại, không sửa ở modal. */
  leadTeamId: string;
  teamIds: number[];
}

export const EDIT_TYPE_OPTIONS = [
  { value: 'event', label: 'Sự kiện đơn vị' },
  { value: 'assigned', label: 'Chỉ đạo cấp trên' },
];

export const EDIT_PRIORITY_OPTIONS = [
  { value: 'low', label: 'Thấp' },
  { value: 'medium', label: 'Trung bình' },
  { value: 'high', label: 'Cao' },
  { value: 'urgent', label: 'Khẩn cấp' },
];

export const EDIT_STATUS_OPTIONS = [
  { value: 'proposed', label: 'Đề xuất' },
  { value: 'changes_requested', label: 'Cần chỉnh sửa' },
  { value: 'approved', label: 'Đã duyệt' },
  { value: 'active', label: 'Đang diễn ra' },
  { value: 'completed', label: 'Hoàn thành' },
  { value: 'cancelled', label: 'Đã hủy (xoá hoạt động)' },
];

export function initialEditForm(detail: ActivityDetail): EditForm {
  const a = detail.activity;
  const primary = detail.activityTeams.find((t) => t.role === 'primary');
  const lead = primary?.team_id ?? a.team_id ?? 0;
  return {
    type: a.type ?? 'event',
    location: a.location ?? '',
    requestedBy: a.requested_by ?? '',
    resultSummary: a.result_summary ?? '',
    proposalUrl: a.proposal_document_url ?? '',
    isPublic: Boolean(a.is_public),
    publicImageUrl: a.public_image_url ?? '',
    status: a.status,
    leadTeamId: lead ? String(lead) : '',
    teamIds: detail.activityTeams.map((t) => t.team_id),
  };
}

/** Tổ chủ trì luôn nằm trong các Tổ tham gia (server yêu cầu `team_ids` gồm `team_id`). */
export function effectiveTeamIds(form: EditForm): number[] {
  const lead = Number(form.leadTeamId);
  return Array.from(new Set([...(lead ? [lead] : []), ...form.teamIds]));
}

export function validateEditForm(form: EditForm): string | null {
  const proposal = form.proposalUrl.trim();
  const image = form.publicImageUrl.trim();
  if ((proposal && !isHttpUrl(proposal)) || (image && !isHttpUrl(image))) return LINK_ERROR_MESSAGE;
  return null;
}

const sameSet = (a: number[], b: number[]) => a.length === b.length && a.every((x) => b.includes(x));

/** Người không phải admin KHÔNG BAO GIỜ gửi status/team_id/team_ids (server trả 403 hoặc bỏ qua). */
export function buildUpdatePayload(form: EditForm, initial: EditForm, isAdmin: boolean): UpdateActivityPayload {
  const payload: UpdateActivityPayload = {
    type: form.type,
    location: form.location.trim(),
    requested_by: form.requestedBy.trim(),
    result_summary: form.resultSummary.trim(),
    // Ba trường này luôn có mặt: server xoá ảnh nếu thiếu public_image_url khi gửi is_public, và '' xoá link đề án.
    proposal_document_url: form.proposalUrl.trim(),
    is_public: form.isPublic,
    public_image_url: form.publicImageUrl.trim(),
  };
  if (!isAdmin) return payload;
  if (form.status !== initial.status) payload.status = form.status;
  const teams = effectiveTeamIds(form);
  if (!sameSet(teams, effectiveTeamIds(initial))) {
    payload.team_id = Number(form.leadTeamId);
    payload.team_ids = teams;
  }
  return payload;
}

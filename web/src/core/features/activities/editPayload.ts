import type { ActivityDetail, UpdateActivityPayload } from '../../api';
import { LINK_ERROR_MESSAGE } from '../../../shared/components/LinkField';
import { isHttpUrl } from '../../../shared/utils/url';
import { toVnDateKey } from '../../../shared/utils/date';

export interface EditForm {
  title: string;
  description: string;
  type: string;
  priority: string;
  startDate: string;
  deadline: string;
  location: string;
  requestedBy: string;
  resultSummary: string;
  proposalUrl: string;
  isPublic: boolean;
  publicImageUrl: string;
  status: string;
  /** '' = không có. */
  eventLeadId: string;
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
    title: a.title ?? '',
    description: a.description ?? '',
    type: a.type ?? 'event',
    priority: a.priority ?? 'medium',
    startDate: toVnDateKey(a.start_date),
    deadline: toVnDateKey(a.deadline),
    location: a.location ?? '',
    requestedBy: a.requested_by ?? '',
    resultSummary: a.result_summary ?? '',
    proposalUrl: a.proposal_document_url ?? '',
    isPublic: Boolean(a.is_public),
    publicImageUrl: a.public_image_url ?? '',
    status: a.status,
    eventLeadId: a.event_lead_id ? String(a.event_lead_id) : '',
    leadTeamId: lead ? String(lead) : '',
    teamIds: detail.activityTeams.map((t) => t.team_id),
  };
}

/** Tổ chủ trì luôn nằm trong các Tổ tham gia (server yêu cầu `team_ids` gồm `team_id`). */
export function effectiveTeamIds(form: EditForm): number[] {
  const lead = Number(form.leadTeamId);
  return Array.from(new Set([...(lead ? [lead] : []), ...form.teamIds]));
}

export function validateEditForm(form: EditForm, isAdmin: boolean): string | null {
  if (!form.title.trim() || !form.description.trim() || !form.deadline) return 'Vui lòng nhập tiêu đề, mô tả và hạn chót.';
  if (form.startDate && form.startDate > form.deadline) return 'Ngày bắt đầu phải trước hoặc bằng hạn chót.';
  const proposal = form.proposalUrl.trim();
  const image = form.publicImageUrl.trim();
  if ((proposal && !isHttpUrl(proposal)) || (image && !isHttpUrl(image))) return LINK_ERROR_MESSAGE;
  if (isAdmin && !form.leadTeamId) return 'Vui lòng chọn Tổ chủ trì.';
  return null;
}

const sameSet = (a: number[], b: number[]) => a.length === b.length && a.every((x) => b.includes(x));

/** Người không phải admin KHÔNG BAO GIỜ gửi status/event_lead_id/team_id/team_ids (server trả 403 hoặc bỏ qua). */
export function buildUpdatePayload(form: EditForm, initial: EditForm, isAdmin: boolean): UpdateActivityPayload {
  const payload: UpdateActivityPayload = {
    title: form.title.trim(),
    description: form.description.trim(),
    type: form.type,
    priority: form.priority,
    start_date: form.startDate,
    deadline: form.deadline,
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
  if (form.eventLeadId !== initial.eventLeadId) payload.event_lead_id = form.eventLeadId ? Number(form.eventLeadId) : null;
  const teams = effectiveTeamIds(form);
  if (form.leadTeamId !== initial.leadTeamId || !sameSet(teams, effectiveTeamIds(initial))) {
    payload.team_id = Number(form.leadTeamId);
    payload.team_ids = teams;
  }
  return payload;
}

import type { Submission, SubmissionResponse, SubmissionSource } from '../../api';

export type LozengeTone = 'default' | 'inprogress' | 'moved' | 'new' | 'removed' | 'success';

export const DIRECTIVE_STATUS: Record<string, { label: string; tone: LozengeTone }> = {
  sent: { label: 'Đã gửi', tone: 'new' },
  acknowledged: { label: 'Đã tiếp nhận', tone: 'inprogress' },
  in_progress: { label: 'Đang thực hiện', tone: 'inprogress' },
  submitted: { label: 'Đã nộp kết quả', tone: 'moved' },
  accepted: { label: 'Đã chấp nhận', tone: 'success' },
  revision_requested: { label: 'Yêu cầu sửa', tone: 'removed' },
};

export const directiveStatus = (status: string) => DIRECTIVE_STATUS[status] ?? { label: status, tone: 'default' as LozengeTone };

export const SOURCE_LABEL: Record<SubmissionSource, string> = {
  activity: 'Hoạt động',
  ops_log: 'Nhật ký trực ban',
  report: 'Báo cáo',
};

export const RESPONSE_LABEL: Record<SubmissionResponse, string> = {
  seen: 'Đã xem',
  accepted: 'Chấp nhận',
  revision_requested: 'Yêu cầu sửa',
};

export function submissionStatus(s: Pick<Submission, 'response' | 'withdrawn_at'>): { label: string; tone: LozengeTone } {
  if (s.withdrawn_at) return { label: 'Đã rút lại', tone: 'default' };
  if (s.response === 'accepted') return { label: 'Đã chấp nhận', tone: 'success' };
  if (s.response === 'revision_requested') return { label: 'Yêu cầu sửa', tone: 'removed' };
  if (s.response === 'seen') return { label: 'Đã xem', tone: 'inprogress' };
  return { label: 'Chờ phản hồi', tone: 'new' };
}

/** Tên nguồn của một trình: tiêu đề hoạt động nếu có, không thì "Loại #id". */
export function sourceText(s: Pick<Submission, 'source_type' | 'source_id' | 'source_title'>): string {
  return s.source_title ? `${SOURCE_LABEL[s.source_type]}: ${s.source_title}` : `${SOURCE_LABEL[s.source_type]} #${s.source_id}`;
}

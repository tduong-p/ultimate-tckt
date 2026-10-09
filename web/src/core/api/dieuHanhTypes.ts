export type DirectiveStatus = 'sent' | 'acknowledged' | 'in_progress' | 'submitted' | 'accepted' | 'revision_requested';
export type SubmissionSource = 'activity' | 'ops_log' | 'report';
export type SubmissionResponse = 'seen' | 'revision_requested' | 'accepted';

/** Dòng bảng `directives` (core/src/routes/directives.js) kèm các trường tên do `dieu-hanh-names.js` thêm. */
export interface Directive {
  id: number;
  from_unit_id: number;
  to_unit_id: number;
  title: string;
  body: string | null;
  deadline: string | null;
  status: DirectiveStatus | string;
  created_by: number | null;
  owner_user_id: number | null;
  acknowledged_at: string | null;
  created_at: string;
  updated_at: string;
  from_unit_name?: string | null;
  to_unit_name?: string | null;
  created_by_name?: string | null;
  owner_name?: string | null;
}

/** Dòng bảng `submissions` kèm các trường tên. */
export interface Submission {
  id: number;
  from_unit_id: number;
  to_unit_id: number;
  source_type: SubmissionSource;
  source_id: number;
  directive_id: number | null;
  note: string | null;
  submitted_by: number | null;
  response: SubmissionResponse | null;
  response_note: string | null;
  responded_by: number | null;
  responded_at: string | null;
  withdrawn_at: string | null;
  created_at: string;
  from_unit_name?: string | null;
  to_unit_name?: string | null;
  submitted_by_name?: string | null;
  responded_by_name?: string | null;
  source_title?: string | null;
}

/** Hoạt động gắn với chỉ đạo (`SELECT * FROM activities WHERE directive_id = ?`). */
export interface DirectiveActivity {
  id: number;
  title: string;
  status: string;
  deadline?: string | null;
}

export interface DirectiveDetail extends Directive {
  submissions: Submission[];
  activities: DirectiveActivity[];
}

export interface DieuHanhUnit {
  id: number;
  code: string;
  name: string;
  kind: string;
}

/** Phần tử của GET /api/units/:id/members. */
export interface UnitMember {
  user_id: number;
  name: string;
  email: string;
  role: string;
}

export interface CreateDirectivePayload {
  to_unit_id: number;
  title: string;
  body?: string;
  deadline: string;
}

export interface SubmitDirectivePayload {
  source_type: SubmissionSource;
  source_id: number;
  note?: string;
}

export interface RespondDirectivePayload {
  response: 'accepted' | 'revision_requested';
  response_note?: string;
}

export interface CreateSubmissionPayload {
  to_unit_id: number;
  source_type: SubmissionSource;
  source_id: number;
  directive_id?: number;
  note?: string;
}

export interface RespondSubmissionPayload {
  response: SubmissionResponse;
  response_note?: string;
}

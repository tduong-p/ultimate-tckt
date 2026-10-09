import type { Capabilities } from '../../capabilities';
import type { Directive, SessionUnit, Submission, SubmissionResponse } from '../../api';

/** Ai đang thao tác: đơn vị hiện tại + vai trò đơn vị (INV-AUTH-001: không dùng users.role). */
export interface DhActor {
  userId: number | null;
  unitId: number | null;
  unitKind: string | null;
  unitRole: string | null;
  hasDieuHanh: boolean;
}

const BTV_ROLES = ['btv_lead', 'btv_member'];
const UNIT_ADMIN_ROLES = ['admin', 'vice_admin'];
const UNIT_LEAD_ROLES = [...UNIT_ADMIN_ROLES, 'leader', 'vice_leader'];

/** Cổng của server: đơn vị có module `dieu-hanh`, hoặc là DYC (platform_owner). */
export function unitHasDieuHanh(unit: Pick<SessionUnit, 'kind' | 'modules'> | null | undefined): boolean {
  if (!unit) return false;
  return unit.kind === 'platform_owner' || Boolean(unit.modules?.includes('dieu-hanh'));
}

export function deriveDhActor(caps: Pick<Capabilities, 'unit' | 'unitRole'>, userId: number | null): DhActor {
  return {
    userId,
    unitId: caps.unit?.id ?? null,
    unitKind: caps.unit?.kind ?? null,
    unitRole: caps.unitRole,
    hasDieuHanh: unitHasDieuHanh(caps.unit),
  };
}

const inRoles = (a: DhActor, roles: string[]) => a.unitRole !== null && roles.includes(a.unitRole);
const isBtv = (a: DhActor) => inRoles(a, BTV_ROLES);
const isDyc = (a: DhActor) => a.unitKind === 'platform_owner';
const isUnitAdmin = (a: DhActor) => inRoles(a, UNIT_ADMIN_ROLES);
const isReceiver = (a: DhActor, d: Directive) => a.unitId !== null && d.to_unit_id === a.unitId;
/** Người làm việc của đơn vị nhận: quản lý đơn vị hoặc người phụ trách chỉ đạo. */
const worksOn = (a: DhActor, d: Directive) =>
  isReceiver(a, d) && (inRoles(a, UNIT_LEAD_ROLES) || (a.userId !== null && d.owner_user_id === a.userId));

export const canCreateDirective = (a: DhActor) => isBtv(a) || isDyc(a);

export const canAcknowledgeDirective = (a: DhActor, d: Directive) =>
  isReceiver(a, d) && isUnitAdmin(a) && ['sent', 'pending'].includes(d.status);

export const canLinkActivity = (a: DhActor, d: Directive) =>
  worksOn(a, d) && ['acknowledged', 'in_progress'].includes(d.status);

export const canSubmitDirective = (a: DhActor, d: Directive) =>
  worksOn(a, d) && ['acknowledged', 'in_progress', 'revision_requested'].includes(d.status);

export const canRespondDirective = (a: DhActor, d: Directive) =>
  (isBtv(a) || isDyc(a)) && d.status === 'submitted' && (isDyc(a) || (a.unitId !== null && d.from_unit_id === a.unitId));

export const canCreateSubmission = (a: DhActor) => isUnitAdmin(a) || isBtv(a);

export const canRespondSubmission = (a: DhActor, s: Submission) =>
  (isBtv(a) || isDyc(a)) &&
  (isDyc(a) || (a.unitId !== null && s.to_unit_id === a.unitId)) &&
  !s.withdrawn_at &&
  (s.response === null || s.response === 'seen');

/** `accepted`/`revision_requested` chỉ khi trình gắn với một chỉ đạo (SPEC-WEB-003 mục 4.7). */
export const submissionResponseOptions = (s: Submission): SubmissionResponse[] =>
  s.directive_id ? ['seen', 'accepted', 'revision_requested'] : ['seen'];

export const canWithdrawSubmission = (a: DhActor, s: Submission) =>
  isUnitAdmin(a) && a.unitId !== null && s.from_unit_id === a.unitId && s.response === null && !s.withdrawn_at;

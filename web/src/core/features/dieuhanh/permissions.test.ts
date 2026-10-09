import { describe, it, expect } from 'vitest';
import type { Directive, Submission } from '../../api';
import {
  canAcknowledgeDirective, canCreateDirective, canCreateSubmission, canLinkActivity, canRespondDirective,
  canRespondSubmission, canSubmitDirective, canWithdrawSubmission, deriveDhActor, submissionResponseOptions, unitHasDieuHanh,
  type DhActor,
} from './permissions';

const actor = (over: Partial<DhActor> = {}): DhActor => ({ userId: 5, unitId: 2, unitKind: 'department', unitRole: 'admin', hasDieuHanh: true, ...over });
const directive = (over: Partial<Directive> = {}): Directive => ({
  id: 1, from_unit_id: 1, to_unit_id: 2, title: 'T', body: null, deadline: null, status: 'sent', created_by: 9, owner_user_id: null,
  acknowledged_at: null, created_at: '', updated_at: '', ...over,
});
const submission = (over: Partial<Submission> = {}): Submission => ({
  id: 1, from_unit_id: 2, to_unit_id: 1, source_type: 'activity', source_id: 3, directive_id: null, note: null, submitted_by: 5,
  response: null, response_note: null, responded_by: null, responded_at: null, withdrawn_at: null, created_at: '', ...over,
});
const btv = actor({ unitId: 1, unitKind: 'standing_committee', unitRole: 'btv_lead' });
const dyc = actor({ unitId: 9, unitKind: 'platform_owner', unitRole: 'dyc_admin' });

describe('unitHasDieuHanh / deriveDhActor', () => {
  it('đơn vị có module hoặc platform_owner thì có; không có thì không', () => {
    expect(unitHasDieuHanh({ kind: 'department', modules: ['dieu-hanh', 'ctd'] })).toBe(true);
    expect(unitHasDieuHanh({ kind: 'platform_owner', modules: [] })).toBe(true);
    expect(unitHasDieuHanh({ kind: 'office', modules: ['ctd'] })).toBe(false);
    expect(unitHasDieuHanh({ kind: 'office' })).toBe(false);
    expect(unitHasDieuHanh(null)).toBe(false);
  });

  it('lấy đơn vị, vai trò đơn vị và id người dùng', () => {
    const a = deriveDhActor({ unit: { id: 2, code: 'TCKT', name: 'x', kind: 'department', modules: ['dieu-hanh'] }, unitRole: 'leader' }, 5);
    expect(a).toEqual({ userId: 5, unitId: 2, unitKind: 'department', unitRole: 'leader', hasDieuHanh: true });
  });
});

describe('chỉ đạo', () => {
  it('tạo: chỉ BTV và DYC', () => {
    expect(canCreateDirective(btv)).toBe(true);
    expect(canCreateDirective(dyc)).toBe(true);
    expect(canCreateDirective(actor())).toBe(false);
  });

  it('tiếp nhận: admin/vice_admin của đơn vị nhận, trạng thái chờ', () => {
    expect(canAcknowledgeDirective(actor(), directive())).toBe(true);
    expect(canAcknowledgeDirective(actor({ unitRole: 'vice_admin' }), directive({ status: 'sent' }))).toBe(true);
    expect(canAcknowledgeDirective(actor({ unitRole: 'leader' }), directive())).toBe(false);
    expect(canAcknowledgeDirective(actor({ unitId: 3 }), directive())).toBe(false);
    expect(canAcknowledgeDirective(actor(), directive({ status: 'acknowledged' }))).toBe(false);
    expect(canAcknowledgeDirective(btv, directive())).toBe(false);
  });

  it('gắn hoạt động và nộp kết quả: quản lý đơn vị nhận hoặc người phụ trách, đúng trạng thái', () => {
    const d = directive({ status: 'acknowledged', owner_user_id: 5 });
    expect(canLinkActivity(actor({ unitRole: 'leader' }), d)).toBe(true);
    expect(canLinkActivity(actor({ unitRole: 'member' }), d)).toBe(true);
    expect(canLinkActivity(actor({ unitRole: 'member' }), directive({ status: 'acknowledged', owner_user_id: 8 }))).toBe(false);
    expect(canLinkActivity(actor(), directive({ status: 'sent' }))).toBe(false);
    expect(canLinkActivity(actor({ unitId: 3 }), d)).toBe(false);
    expect(canSubmitDirective(actor(), directive({ status: 'revision_requested' }))).toBe(true);
    expect(canSubmitDirective(actor(), directive({ status: 'submitted' }))).toBe(false);
  });

  it('đánh giá: BTV (đơn vị giao) hoặc DYC, khi đã nộp', () => {
    const d = directive({ status: 'submitted' });
    expect(canRespondDirective(btv, d)).toBe(true);
    expect(canRespondDirective(dyc, d)).toBe(true);
    expect(canRespondDirective(actor(), d)).toBe(false);
    expect(canRespondDirective(btv, directive({ status: 'in_progress' }))).toBe(false);
    expect(canRespondDirective(actor({ ...btv, unitId: 7 }), d)).toBe(false);
  });
});

describe('trình', () => {
  it('tạo: admin/vice_admin hoặc BTV, DYC thì không', () => {
    expect(canCreateSubmission(actor())).toBe(true);
    expect(canCreateSubmission(btv)).toBe(true);
    expect(canCreateSubmission(dyc)).toBe(false);
    expect(canCreateSubmission(actor({ unitRole: 'leader' }))).toBe(false);
  });

  it('phản hồi: BTV/DYC phía nhận, chưa rút, chưa có kết luận cuối', () => {
    expect(canRespondSubmission(btv, submission())).toBe(true);
    expect(canRespondSubmission(btv, submission({ response: 'seen' }))).toBe(true);
    expect(canRespondSubmission(btv, submission({ response: 'accepted' }))).toBe(false);
    expect(canRespondSubmission(btv, submission({ withdrawn_at: '2026-10-01T00:00:00Z' }))).toBe(false);
    expect(canRespondSubmission(actor(), submission())).toBe(false);
    expect(canRespondSubmission(dyc, submission())).toBe(true);
  });

  it('chỉ cho chọn "Chấp nhận/Yêu cầu sửa" khi có directive_id', () => {
    expect(submissionResponseOptions(submission())).toEqual(['seen']);
    expect(submissionResponseOptions(submission({ directive_id: 4 }))).toEqual(['seen', 'accepted', 'revision_requested']);
  });

  it('rút lại: admin/vice_admin của đơn vị gửi, chưa phản hồi, chưa rút', () => {
    expect(canWithdrawSubmission(actor(), submission())).toBe(true);
    expect(canWithdrawSubmission(actor({ unitRole: 'leader' }), submission())).toBe(false);
    expect(canWithdrawSubmission(actor({ unitId: 3 }), submission())).toBe(false);
    expect(canWithdrawSubmission(actor(), submission({ response: 'seen' }))).toBe(false);
    expect(canWithdrawSubmission(actor(), submission({ withdrawn_at: '2026-10-01T00:00:00Z' }))).toBe(false);
  });
});

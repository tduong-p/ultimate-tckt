import { describe, it, expect } from 'vitest';
import { buildUpdatePayload, effectiveTeamIds, initialEditForm, validateEditForm } from './editPayload';
import { makeDetail } from './testUtils';

const detail = makeDetail({
  activity: { status: 'approved', is_public: 1, public_image_url: 'https://img.example/a.jpg', event_lead_id: 7 },
});

describe('initialEditForm', () => {
  it('chỉ lấy các trường ngoài batch từ hoạt động và danh sách Tổ', () => {
    const form = initialEditForm(detail);
    expect(form).toMatchObject({
      type: 'event',
      location: 'Hội trường A',
      requestedBy: '',
      proposalUrl: 'https://drive.example/de-an',
      isPublic: true,
      publicImageUrl: 'https://img.example/a.jpg',
      status: 'approved',
      leadTeamId: '2',
      teamIds: [2, 3],
    });
    for (const key of ['title', 'description', 'priority', 'startDate', 'deadline', 'eventLeadId']) expect(form).not.toHaveProperty(key);
  });
});

describe('validateEditForm', () => {
  const base = initialEditForm(detail);
  it('hợp lệ thì trả null', () => expect(validateEditForm(base)).toBeNull());
  it('link không phải http(s)', () => {
    expect(validateEditForm({ ...base, proposalUrl: 'ftp://x' })).toBe('Liên kết phải bắt đầu bằng http:// hoặc https://.');
    expect(validateEditForm({ ...base, publicImageUrl: 'javascript:alert(1)' })).toBe('Liên kết phải bắt đầu bằng http:// hoặc https://.');
  });
});

describe('buildUpdatePayload', () => {
  const initial = initialEditForm(detail);
  const common = {
    type: 'event',
    location: 'Hội trường A',
    requested_by: '',
    result_summary: '',
    proposal_document_url: 'https://drive.example/de-an',
    is_public: true,
    public_image_url: 'https://img.example/a.jpg',
  };
  const BATCH_KEYS = ['title', 'description', 'priority', 'start_date', 'deadline', 'event_lead_id'];

  it('không phải admin: không có trường batch, status, team_id, team_ids', () => {
    const form = { ...initial, location: '  Sân B  ', status: 'cancelled', teamIds: [3] };
    const payload = buildUpdatePayload(form, initial, false);
    expect(payload).toEqual({ ...common, location: 'Sân B' });
    for (const key of [...BATCH_KEYS, 'status', 'team_id', 'team_ids']) expect(payload).not.toHaveProperty(key);
  });

  it('admin không đổi gì thì cũng không gửi trường admin hay trường batch', () => {
    const payload = buildUpdatePayload(initial, initial, true);
    expect(payload).toEqual(common);
    for (const key of BATCH_KEYS) expect(payload).not.toHaveProperty(key);
  });

  it('admin đổi trạng thái và Tổ tham gia: gửi status, team_id là Tổ chủ trì ban đầu và team_ids', () => {
    const form = { ...initial, status: 'active', teamIds: [2, 3, 4] };
    expect(buildUpdatePayload(form, initial, true)).toEqual({ ...common, status: 'active', team_id: 2, team_ids: [2, 3, 4] });
  });

  it('luôn gửi ảnh công khai và link đề án (rỗng để xoá) cùng is_public', () => {
    const payload = buildUpdatePayload({ ...initial, isPublic: false, publicImageUrl: '', proposalUrl: '' }, initial, false);
    expect(payload).toMatchObject({ is_public: false, public_image_url: '', proposal_document_url: '' });
  });

  it('effectiveTeamIds luôn gồm Tổ chủ trì, không trùng', () => {
    expect(effectiveTeamIds({ ...initial, leadTeamId: '3', teamIds: [2] })).toEqual([3, 2]);
    expect(effectiveTeamIds({ ...initial, leadTeamId: '2', teamIds: [2, 3] })).toEqual([2, 3]);
  });
});

import { describe, it, expect } from 'vitest';
import { buildUpdatePayload, effectiveTeamIds, initialEditForm, validateEditForm } from './editPayload';
import { makeDetail } from './testUtils';

const detail = makeDetail({
  activity: { status: 'approved', is_public: 1, public_image_url: 'https://img.example/a.jpg', event_lead_id: 7 },
});

describe('initialEditForm', () => {
  it('lấy giá trị từ hoạt động và danh sách Tổ', () => {
    expect(initialEditForm(detail)).toMatchObject({
      title: 'Ngày hội Kỹ thuật',
      type: 'event',
      priority: 'high',
      startDate: '2026-11-01',
      deadline: '2026-11-30',
      location: 'Hội trường A',
      requestedBy: '',
      proposalUrl: 'https://drive.example/de-an',
      isPublic: true,
      publicImageUrl: 'https://img.example/a.jpg',
      status: 'approved',
      eventLeadId: '7',
      leadTeamId: '2',
      teamIds: [2, 3],
    });
  });
});

describe('validateEditForm', () => {
  const base = initialEditForm(detail);
  it('hợp lệ thì trả null', () => expect(validateEditForm(base, true)).toBeNull());
  it('thiếu tiêu đề, mô tả hoặc hạn chót', () => {
    const msg = 'Vui lòng nhập tiêu đề, mô tả và hạn chót.';
    expect(validateEditForm({ ...base, title: '  ' }, false)).toBe(msg);
    expect(validateEditForm({ ...base, description: '' }, false)).toBe(msg);
    expect(validateEditForm({ ...base, deadline: '' }, false)).toBe(msg);
  });
  it('ngày bắt đầu sau hạn chót', () => {
    expect(validateEditForm({ ...base, startDate: '2026-12-15' }, false)).toBe('Ngày bắt đầu phải trước hoặc bằng hạn chót.');
  });
  it('link không phải http(s)', () => {
    expect(validateEditForm({ ...base, proposalUrl: 'ftp://x' }, false)).toBe('Liên kết phải bắt đầu bằng http:// hoặc https://.');
    expect(validateEditForm({ ...base, publicImageUrl: 'javascript:alert(1)' }, false)).toBe('Liên kết phải bắt đầu bằng http:// hoặc https://.');
  });
  it('admin phải có Tổ chủ trì, người quản lý thì không bị kiểm', () => {
    expect(validateEditForm({ ...base, leadTeamId: '' }, true)).toBe('Vui lòng chọn Tổ chủ trì.');
    expect(validateEditForm({ ...base, leadTeamId: '' }, false)).toBeNull();
  });
});

describe('buildUpdatePayload', () => {
  const initial = initialEditForm(detail);
  const common = {
    title: 'Ngày hội Kỹ thuật',
    description: 'Ngày hội giới thiệu các câu lạc bộ kỹ thuật.',
    type: 'event',
    priority: 'high',
    start_date: '2026-11-01',
    deadline: '2026-11-30',
    location: 'Hội trường A',
    requested_by: '',
    result_summary: '',
    proposal_document_url: 'https://drive.example/de-an',
    is_public: true,
    public_image_url: 'https://img.example/a.jpg',
  };

  it('không phải admin: chỉ tập con, không bao giờ có status/event_lead_id/team_id/team_ids', () => {
    const form = { ...initial, title: '  Tên mới  ', status: 'cancelled', eventLeadId: '', leadTeamId: '3', teamIds: [3] };
    const payload = buildUpdatePayload(form, initial, false);
    expect(payload).toEqual({ ...common, title: 'Tên mới' });
    for (const key of ['status', 'event_lead_id', 'team_id', 'team_ids']) expect(payload).not.toHaveProperty(key);
  });

  it('admin không đổi gì thì cũng không gửi trường admin', () => {
    expect(buildUpdatePayload(initial, initial, true)).toEqual(common);
  });

  it('admin đổi trạng thái, Trưởng BTC và Tổ thì gửi đúng các trường đó', () => {
    const form = { ...initial, status: 'active', eventLeadId: '', leadTeamId: '3', teamIds: [2, 3] };
    expect(buildUpdatePayload(form, initial, true)).toEqual({ ...common, status: 'active', event_lead_id: null, team_id: 3, team_ids: [3, 2] });
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

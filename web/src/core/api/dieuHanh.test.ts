import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiClient } from '../../shared/utils/api';
import {
  acknowledgeDirective, createDirective, createSubmission, fetchDieuHanhUnits, fetchDirective, fetchDirectives,
  fetchSubmission, fetchSubmissions, fetchUnitMembers, linkDirectiveActivity, respondDirective, respondSubmission,
  submitDirectiveResult, withdrawSubmission,
} from './index';
import { apiErrorMessage } from './errors';

vi.mock('../../shared/utils/api', () => ({ apiClient: { get: vi.fn(), post: vi.fn() } }));

const get = vi.mocked(apiClient.get);
const post = vi.mocked(apiClient.post);

describe('API Giao việc và Trình', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('danh sách bóc lớp { data }', async () => {
    get.mockResolvedValueOnce({ data: { data: [{ id: 1 }] } });
    await expect(fetchDirectives()).resolves.toEqual([{ id: 1 }]);
    expect(get).toHaveBeenCalledWith('/directives');
    get.mockResolvedValueOnce({ data: { data: [{ id: 2 }] } });
    await expect(fetchSubmissions()).resolves.toEqual([{ id: 2 }]);
    expect(get).toHaveBeenLastCalledWith('/submissions');
    get.mockResolvedValueOnce({ data: { data: [{ id: 3, code: 'TCKT' }] } });
    await expect(fetchDieuHanhUnits()).resolves.toEqual([{ id: 3, code: 'TCKT' }]);
    expect(get).toHaveBeenLastCalledWith('/directives/units');
  });

  it('chi tiết và thành viên đơn vị', async () => {
    get.mockResolvedValueOnce({ data: { id: 7, submissions: [], activities: [] } });
    await expect(fetchDirective(7)).resolves.toMatchObject({ id: 7 });
    expect(get).toHaveBeenLastCalledWith('/directives/7');
    get.mockResolvedValueOnce({ data: { id: 9 } });
    await fetchSubmission(9);
    expect(get).toHaveBeenLastCalledWith('/submissions/9');
    get.mockResolvedValueOnce({ data: [{ user_id: 1, name: 'A', email: 'a@x', role: 'admin' }] });
    await expect(fetchUnitMembers(2)).resolves.toHaveLength(1);
    expect(get).toHaveBeenLastCalledWith('/units/2/members');
  });

  it('tạo, tiếp nhận, gắn hoạt động, nộp kết quả, đánh giá chỉ đạo đúng endpoint và body', async () => {
    post.mockResolvedValue({ data: { id: 5 } });
    await createDirective({ to_unit_id: 2, title: 'T', body: 'B', deadline: '2026-12-01' });
    expect(post).toHaveBeenLastCalledWith('/directives', { to_unit_id: 2, title: 'T', body: 'B', deadline: '2026-12-01' });
    await acknowledgeDirective(5, 8);
    expect(post).toHaveBeenLastCalledWith('/directives/5/acknowledge', { owner_user_id: 8 });
    await acknowledgeDirective(5);
    expect(post).toHaveBeenLastCalledWith('/directives/5/acknowledge', {});
    await linkDirectiveActivity(5, 11);
    expect(post).toHaveBeenLastCalledWith('/directives/5/link-activity', { activity_id: 11 });
    await submitDirectiveResult(5, { source_type: 'activity', source_id: 11, note: 'xong' });
    expect(post).toHaveBeenLastCalledWith('/directives/5/submit', { source_type: 'activity', source_id: 11, note: 'xong' });
    await respondDirective(5, { response: 'revision_requested', response_note: 'Thiếu số liệu' });
    expect(post).toHaveBeenLastCalledWith('/directives/5/respond', { response: 'revision_requested', response_note: 'Thiếu số liệu' });
  });

  it('tạo, phản hồi, rút lại trình đúng endpoint và body', async () => {
    post.mockResolvedValue({ data: { id: 6 } });
    await createSubmission({ to_unit_id: 1, source_type: 'activity', source_id: 3, directive_id: 5, note: 'n' });
    expect(post).toHaveBeenLastCalledWith('/submissions', { to_unit_id: 1, source_type: 'activity', source_id: 3, directive_id: 5, note: 'n' });
    await respondSubmission(6, { response: 'seen' });
    expect(post).toHaveBeenLastCalledWith('/submissions/6/respond', { response: 'seen' });
    await withdrawSubmission(6);
    expect(post).toHaveBeenLastCalledWith('/submissions/6/withdraw', {});
  });

  it('403 "Forbidden" của cổng module hiện bằng tiếng Việt', () => {
    expect(apiErrorMessage({ response: { status: 403, data: { error: 'Forbidden' } } })).toBe(
      'Đơn vị hiện tại chưa bật module Điều hành.'
    );
  });
});

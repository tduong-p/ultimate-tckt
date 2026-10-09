import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiClient } from '../../shared/utils/api';
import {
  addActivityParticipants,
  approveActivity,
  deleteActivity,
  fetchActivityDetail,
  postActivityUpdate,
  rejectActivity,
  requestActivityChanges,
  submitActivity,
  updateActivity,
  volunteerForActivity,
} from './activities';

vi.mock('../../shared/utils/api', () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

describe('API chi tiết hoạt động', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetchActivityDetail gọi GET /activities/:id', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: { activity: { id: 5 }, canManage: true } });
    await expect(fetchActivityDetail(5)).resolves.toEqual({ activity: { id: 5 }, canManage: true });
    expect(apiClient.get).toHaveBeenCalledWith('/activities/5');
  });

  it('updateActivity gọi PATCH /activities/:id với đúng body', async () => {
    vi.mocked(apiClient.patch).mockResolvedValueOnce({ data: { ok: true } });
    await expect(updateActivity(5, { title: 'Mới', is_public: true, public_image_url: '' })).resolves.toEqual({ ok: true });
    expect(apiClient.patch).toHaveBeenCalledWith('/activities/5', { title: 'Mới', is_public: true, public_image_url: '' });
  });

  it('deleteActivity gọi DELETE /activities/:id', async () => {
    vi.mocked(apiClient.delete).mockResolvedValueOnce({ data: { ok: true, id: 5, title: 'X' } });
    await expect(deleteActivity(5)).resolves.toEqual({ ok: true, id: 5, title: 'X' });
    expect(apiClient.delete).toHaveBeenCalledWith('/activities/5');
  });

  it('duyệt, nộp lại, đăng ký tham gia gọi POST không body', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: { ok: true } });
    await approveActivity(5);
    await submitActivity(5);
    await volunteerForActivity(5);
    expect(apiClient.post).toHaveBeenNthCalledWith(1, '/activities/5/approve');
    expect(apiClient.post).toHaveBeenNthCalledWith(2, '/activities/5/submit');
    expect(apiClient.post).toHaveBeenNthCalledWith(3, '/activities/5/volunteer');
  });

  it('yêu cầu sửa và từ chối gửi feedback', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: { ok: true } });
    await requestActivityChanges(5, 'Thiếu dự toán');
    await rejectActivity(5, 'Trùng lịch');
    expect(apiClient.post).toHaveBeenNthCalledWith(1, '/activities/5/request-changes', { feedback: 'Thiếu dự toán' });
    expect(apiClient.post).toHaveBeenNthCalledWith(2, '/activities/5/reject', { feedback: 'Trùng lịch' });
  });

  it('addActivityParticipants gửi user_ids và responsibility', async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({ data: undefined });
    await addActivityParticipants(5, { user_ids: [11, 12], responsibility: 'Hậu cần' });
    expect(apiClient.post).toHaveBeenCalledWith('/activities/5/participants', { user_ids: [11, 12], responsibility: 'Hậu cần' });
  });

  it('postActivityUpdate gửi kind, body, attachment_url, tagged_user_ids', async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({ data: { ok: true, id: 9 } });
    const payload = { kind: 'comment' as const, body: 'Ổn rồi @A', attachment_url: 'https://x.vn/a', tagged_user_ids: [3] };
    await expect(postActivityUpdate(5, payload)).resolves.toEqual({ ok: true, id: 9 });
    expect(apiClient.post).toHaveBeenCalledWith('/activities/5/updates', payload);
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiClient } from '../../shared/utils/api';
import {
  acknowledgeTask,
  addTaskChecklistItem,
  createActivityTask,
  deleteTaskChecklistItem,
  fetchTaskDetail,
  reviewTask,
  submitTaskReview,
  toggleTaskChecklist,
  updateTaskStatus,
} from './tasks';

vi.mock('../../shared/utils/api', () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

describe('API vòng đời công việc', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('createActivityTask gọi POST /activities/:id/tasks', async () => {
    const payload = { title: 'Chuẩn bị âm thanh', team_id: 1, primary_assignee_id: 2, deadline: '2026-10-15' };
    vi.mocked(apiClient.post).mockResolvedValueOnce({ data: { id: 99 } });
    await expect(createActivityTask(10, payload)).resolves.toEqual({ id: 99 });
    expect(apiClient.post).toHaveBeenCalledWith('/activities/10/tasks', payload);
  });

  it('fetchTaskDetail gọi GET /tasks/:id', async () => {
    const detail = { task: { id: 99, title: 'Test' }, assignees: [] };
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: detail });
    await expect(fetchTaskDetail(99)).resolves.toEqual(detail);
    expect(apiClient.get).toHaveBeenCalledWith('/tasks/99');
  });

  it('acknowledgeTask gọi POST /tasks/:id/acknowledge', async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({ data: { ok: true } });
    await expect(acknowledgeTask(99)).resolves.toEqual({ ok: true });
    expect(apiClient.post).toHaveBeenCalledWith('/tasks/99/acknowledge');
  });

  it('updateTaskStatus gọi PATCH /tasks/:id/status', async () => {
    vi.mocked(apiClient.patch).mockResolvedValueOnce({ data: { ok: true } });
    await expect(updateTaskStatus(99, 'in_progress')).resolves.toEqual({ ok: true });
    expect(apiClient.patch).toHaveBeenCalledWith('/tasks/99/status', { status: 'in_progress' });
  });

  it('submitTaskReview gọi POST /tasks/:id/submit-review', async () => {
    const payload = { notes: 'Đã xong', link_url: 'https://example.com' };
    vi.mocked(apiClient.post).mockResolvedValueOnce({ data: { ok: true } });
    await expect(submitTaskReview(99, payload)).resolves.toEqual({ ok: true });
    expect(apiClient.post).toHaveBeenCalledWith('/tasks/99/submit-review', payload);
  });

  it('reviewTask gọi POST /tasks/:id/review', async () => {
    const payload = { decision: 'approve' as const, feedback: 'Tốt' };
    vi.mocked(apiClient.post).mockResolvedValueOnce({ data: { ok: true } });
    await expect(reviewTask(99, payload)).resolves.toEqual({ ok: true });
    expect(apiClient.post).toHaveBeenCalledWith('/tasks/99/review', payload);
  });

  it('checklist: bật/tắt, thêm, xoá', async () => {
    vi.mocked(apiClient.patch).mockResolvedValueOnce({ data: { ok: true } });
    await toggleTaskChecklist(99, 1, true);
    expect(apiClient.patch).toHaveBeenCalledWith('/tasks/99/checklist/1', { is_done: true });
    vi.mocked(apiClient.post).mockResolvedValueOnce({ data: { id: 101 } });
    await expect(addTaskChecklistItem(99, 'Việc nhỏ')).resolves.toEqual({ id: 101 });
    expect(apiClient.post).toHaveBeenCalledWith('/tasks/99/checklist', { title: 'Việc nhỏ' });
    vi.mocked(apiClient.delete).mockResolvedValueOnce({ data: { ok: true } });
    await deleteTaskChecklistItem(99, 1);
    expect(apiClient.delete).toHaveBeenCalledWith('/tasks/99/checklist/1');
  });
});

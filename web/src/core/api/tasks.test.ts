import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiClient } from '../../shared/utils/api';
import {
  fetchTask,
  fetchTaskDetail,
  acknowledgeTask,
  updateTaskStatus,
  editTask,
  addChecklistItem,
  setChecklistItemDone,
  deleteChecklistItem,
  addTaskAttachment,
  submitTaskReview,
  reviewTask,
  cancelTask,
  postTaskComment,
  createTask,
  createActivityTask,
  logTask,
  fetchWeightPresets,
  fetchActivityBoard,
  taskAttachmentContentUrl,
} from './tasks';
import { fetchTeamMembers } from './teams';
import { translateServerError } from './errors';

vi.mock('../../shared/utils/api', () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

const formOf = (call: unknown[]) => Object.fromEntries((call[1] as FormData).entries());

describe('API công việc', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(apiClient.get).mockResolvedValue({ data: {} });
    vi.mocked(apiClient.post).mockResolvedValue({ data: { id: 1 } });
    vi.mocked(apiClient.patch).mockResolvedValue({ data: { ok: true } });
    vi.mocked(apiClient.delete).mockResolvedValue({ data: { ok: true } });
  });

  it('đọc chi tiết công việc, bảng Kanban, thành viên Tổ, bộ trọng số', async () => {
    await fetchTask(5);
    expect(apiClient.get).toHaveBeenCalledWith('/tasks/5');
    await fetchTaskDetail(5);
    expect(apiClient.get).toHaveBeenCalledWith('/tasks/5');
    await fetchActivityBoard(9);
    expect(apiClient.get).toHaveBeenCalledWith('/activities/9');
    await fetchTeamMembers(3);
    expect(apiClient.get).toHaveBeenCalledWith('/teams/3/members');
    await fetchWeightPresets();
    expect(apiClient.get).toHaveBeenCalledWith('/weight-presets');
  });

  it('xác nhận, đổi trạng thái, sửa 4 trường, rút lại', async () => {
    await acknowledgeTask(5);
    expect(apiClient.post).toHaveBeenCalledWith('/tasks/5/acknowledge');
    await updateTaskStatus(5, 'in_progress');
    expect(apiClient.patch).toHaveBeenCalledWith('/tasks/5/status', { status: 'in_progress' });
    await editTask(5, { deadline: '2026-11-01', start_date: null, priority: 'high', deliverable: 'Báo cáo' });
    expect(apiClient.patch).toHaveBeenCalledWith('/tasks/5', {
      deadline: '2026-11-01',
      start_date: null,
      priority: 'high',
      deliverable: 'Báo cáo',
    });
    await cancelTask(5);
    expect(apiClient.post).toHaveBeenCalledWith('/tasks/5/cancel');
  });

  it('checklist: thêm, tích, xoá', async () => {
    await addChecklistItem(5, 'Mua nước');
    expect(apiClient.post).toHaveBeenCalledWith('/tasks/5/checklist', { title: 'Mua nước' });
    await setChecklistItemDone(5, 8, true);
    expect(apiClient.patch).toHaveBeenCalledWith('/tasks/5/checklist/8', { is_done: true });
    await deleteChecklistItem(5, 8);
    expect(apiClient.delete).toHaveBeenCalledWith('/tasks/5/checklist/8');
  });

  it('tài liệu và nộp nghiệm thu gửi multipart chỉ gồm các trường link, không có file', async () => {
    await addTaskAttachment(5, { kind: 'evidence', label: 'Ảnh sự kiện', link_url: 'https://drive.example/a' });
    const call = vi.mocked(apiClient.post).mock.calls[0];
    expect(call[0]).toBe('/tasks/5/attachments');
    expect(formOf(call)).toEqual({ kind: 'evidence', label: 'Ảnh sự kiện', link_url: 'https://drive.example/a' });
    expect(call[2]).toEqual({ headers: { 'Content-Type': 'multipart/form-data' } });

    vi.mocked(apiClient.post).mockClear();
    await submitTaskReview(5, { link_url: 'https://drive.example/b', notes: '' });
    const submit = vi.mocked(apiClient.post).mock.calls[0];
    expect(submit[0]).toBe('/tasks/5/submit-review');
    expect(formOf(submit)).toEqual({ link_url: 'https://drive.example/b' });
  });

  it('duyệt và bình luận công việc', async () => {
    await reviewTask(5, { decision: 'reject', feedback: 'Thiếu ảnh' });
    expect(apiClient.post).toHaveBeenCalledWith('/tasks/5/review', { decision: 'reject', feedback: 'Thiếu ảnh' });
    await postTaskComment(9, { kind: 'progress', body: 'Xong 50%', task_id: 5 });
    expect(apiClient.post).toHaveBeenCalledWith('/activities/9/updates', { kind: 'progress', body: 'Xong 50%', task_id: 5 });
  });

  it('giao việc gửi JSON; tự ghi nhận gửi multipart không có file', async () => {
    const payload = {
      title: 'Dựng sân khấu',
      description: '',
      stage: 'before',
      priority: 'high',
      team_id: 2,
      start_date: null,
      deadline: '2026-11-01',
      deliverable: '',
      primary_assignee_id: 7,
      co_assignee_ids: [8],
    };
    await createTask(9, payload);
    expect(apiClient.post).toHaveBeenCalledWith('/activities/9/tasks', payload);
    await createActivityTask(9, payload);
    expect(apiClient.post).toHaveBeenCalledWith('/activities/9/tasks', payload);

    vi.mocked(apiClient.post).mockClear();
    await logTask(9, {
      title: 'Trực gian hàng',
      team_id: 2,
      weight: 3,
      link_url: 'https://drive.example/c',
      description: 'Ca sáng',
    });
    const call = vi.mocked(apiClient.post).mock.calls[0];
    expect(call[0]).toBe('/activities/9/log-task');
    expect(formOf(call)).toEqual({
      title: 'Trực gian hàng',
      team_id: '2',
      weight: '3',
      link_url: 'https://drive.example/c',
      description: 'Ca sáng',
    });
  });

  it('đường dẫn mở tệp đã lưu và câu lỗi tiếng Anh của route công việc được dịch', () => {
    expect(taskAttachmentContentUrl(12)).toBe('/api/task-attachments/12/content');
    expect(translateServerError('Task not found.')).toBe('Không tìm thấy công việc.');
    expect(translateServerError('You cannot update this task.')).toBe('Bạn không thể cập nhật công việc này.');
    expect(translateServerError('You cannot manage this team.')).toBe('Bạn không có quyền quản lý Tổ này.');
  });
});

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { TaskActionButtons } from './TaskActionButtons';
import { renderInApp } from '../activities/testUtils';
import * as api from '../../api';

vi.mock('../../api', async () => {
  const actual = await vi.importActual<typeof import('../../api')>('../../api');
  return { ...actual, acknowledgeTask: vi.fn(), updateTaskStatus: vi.fn(), reviewTask: vi.fn(), submitTaskReview: vi.fn() };
});

const task = (status: string): api.TaskItem => ({
  id: 77,
  activity_id: 5,
  team_id: 2,
  title: 'Chuẩn bị âm thanh',
  status,
  priority: 'high',
  deadline: '2026-11-20',
});

const show = (status: string, canReview = false) => renderInApp(<TaskActionButtons task={task(status)} canReview={canReview} />);

describe('TaskActionButtons', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.acknowledgeTask).mockResolvedValue({ ok: true });
    vi.mocked(api.updateTaskStatus).mockResolvedValue({ ok: true });
    vi.mocked(api.reviewTask).mockResolvedValue({ ok: true });
    vi.mocked(api.submitTaskReview).mockResolvedValue({ ok: true });
  });
  afterEach(cleanup);

  it('việc cần làm: Nhận việc gọi acknowledge, toast và làm mới cache', async () => {
    const { qc } = show('todo');
    const spy = vi.spyOn(qc, 'invalidateQueries');
    fireEvent.click(screen.getByRole('button', { name: 'Nhận việc' }));
    await waitFor(() => expect(api.acknowledgeTask).toHaveBeenCalledWith(77));
    expect(await screen.findByText('Đã nhận việc.')).toBeDefined();
    expect(spy).toHaveBeenCalledWith({ queryKey: ['core-my-tasks-today'] });
    expect(spy).toHaveBeenCalledWith({ queryKey: ['core-activity'] });
  });

  it('việc cần làm: Bắt đầu làm chuyển sang in_progress', async () => {
    show('todo');
    fireEvent.click(screen.getByRole('button', { name: 'Bắt đầu làm' }));
    await waitFor(() => expect(api.updateTaskStatus).toHaveBeenCalledWith(77, 'in_progress'));
  });

  it('đang làm: Tạm dừng quay về todo', async () => {
    show('in_progress');
    fireEvent.click(screen.getByRole('button', { name: 'Tạm dừng' }));
    await waitFor(() => expect(api.updateTaskStatus).toHaveBeenCalledWith(77, 'todo'));
  });

  it('đang làm: Nộp nghiệm thu mở modal và gửi link + ghi chú', async () => {
    show('in_progress');
    fireEvent.click(screen.getByRole('button', { name: 'Nộp nghiệm thu' }));
    fireEvent.change(await screen.findByLabelText('Link minh chứng'), { target: { value: 'https://drive.example/x' } });
    fireEvent.change(screen.getByLabelText('Ghi chú bàn giao'), { target: { value: 'Đã xong' } });
    fireEvent.click(screen.getByRole('button', { name: 'Gửi nghiệm thu' }));
    await waitFor(() => expect(api.submitTaskReview).toHaveBeenCalledWith(77, { link_url: 'https://drive.example/x', notes: 'Đã xong' }));
    expect(await screen.findByText('Đã nộp nghiệm thu.')).toBeDefined();
  });

  it('chờ duyệt: người nghiệm thu thấy Duyệt đạt / Yêu cầu làm lại / Bác bỏ; Duyệt đạt gửi approve', async () => {
    show('review', true);
    expect(screen.getByRole('button', { name: 'Yêu cầu làm lại' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Bác bỏ' })).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Duyệt đạt' }));
    await waitFor(() => expect(api.reviewTask).toHaveBeenCalledWith(77, { decision: 'approve' }));
  });

  it('chờ duyệt: không có quyền nghiệm thu thì không có nút nào', () => {
    show('review', false);
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('việc đã xong hoặc đã huỷ không có nút', () => {
    show('done', true);
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('lỗi từ server hiện thành toast', async () => {
    vi.mocked(api.updateTaskStatus).mockRejectedValue({ response: { status: 400, data: { error: 'Bạn không thể cập nhật công việc này.' } } });
    show('todo');
    fireEvent.click(screen.getByRole('button', { name: 'Bắt đầu làm' }));
    expect(await screen.findByText('Bạn không thể cập nhật công việc này.')).toBeDefined();
  });
});

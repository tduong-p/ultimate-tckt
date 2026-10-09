import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { SubmitReviewModal } from './SubmitReviewModal';
import { renderInApp } from '../activities/testUtils';
import * as api from '../../api';

vi.mock('../../api', async () => {
  const actual = await vi.importActual<typeof import('../../api')>('../../api');
  return { ...actual, submitTaskReview: vi.fn() };
});

const task: api.TaskItem = { id: 77, activity_id: 5, team_id: 2, title: 'Chuẩn bị âm thanh', status: 'in_progress', priority: 'high', deadline: '2026-11-20' };

describe('SubmitReviewModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.submitTaskReview).mockResolvedValue({ ok: true });
  });
  afterEach(cleanup);

  it('gửi payload đã cắt khoảng trắng, bỏ trường trống, đóng modal', async () => {
    const onClose = vi.fn();
    renderInApp(<SubmitReviewModal task={task} isOpen onClose={onClose} />);
    fireEvent.change(screen.getByLabelText('Ghi chú bàn giao'), { target: { value: '  Xong rồi  ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Gửi nghiệm thu' }));
    await waitFor(() => expect(api.submitTaskReview).toHaveBeenCalledWith(77, { link_url: undefined, notes: 'Xong rồi' }));
    expect(onClose).toHaveBeenCalled();
  });

  it('link không phải http(s) thì báo lỗi và không gọi API', () => {
    renderInApp(<SubmitReviewModal task={task} isOpen onClose={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Link minh chứng'), { target: { value: 'ftp://x' } });
    fireEvent.click(screen.getByRole('button', { name: 'Gửi nghiệm thu' }));
    expect(screen.getByText('Link minh chứng phải bắt đầu bằng http:// hoặc https://.')).toBeDefined();
    expect(api.submitTaskReview).not.toHaveBeenCalled();
  });

  it('lỗi server hiện toast, modal vẫn mở', async () => {
    vi.mocked(api.submitTaskReview).mockRejectedValue({ response: { status: 409, data: { error: 'Công việc này không ở trạng thái có thể nộp nghiệm thu.' } } });
    const onClose = vi.fn();
    renderInApp(<SubmitReviewModal task={task} isOpen onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: 'Gửi nghiệm thu' }));
    expect(await screen.findByText('Công việc này không ở trạng thái có thể nộp nghiệm thu.')).toBeDefined();
    expect(onClose).not.toHaveBeenCalled();
  });
});

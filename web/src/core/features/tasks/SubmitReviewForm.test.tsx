import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { SubmitReviewForm } from './SubmitReviewForm';
import { renderApp } from './testUtils';
import { TASK_KEY } from '../../queryKeys';
import * as api from '../../api';

vi.mock('../../api', async () => {
  const actual = await vi.importActual<typeof import('../../api')>('../../api');
  return { ...actual, submitTaskReview: vi.fn() };
});

describe('SubmitReviewForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.submitTaskReview).mockResolvedValue({ id: 1 });
  });
  afterEach(cleanup);

  it('không gửi khi thiếu link hoặc link không phải http(s)', () => {
    renderApp(<SubmitReviewForm taskId={5} />);
    fireEvent.click(screen.getByRole('button', { name: 'Nộp nghiệm thu' }));
    expect(screen.getByText('Vui lòng nhập liên kết minh chứng.')).toBeDefined();
    fireEvent.change(screen.getByLabelText(/Liên kết minh chứng/), { target: { value: 'ftp://x' } });
    fireEvent.click(screen.getByRole('button', { name: 'Nộp nghiệm thu' }));
    expect(api.submitTaskReview).not.toHaveBeenCalled();
  });

  it('gửi link và ghi chú, làm mới cache công việc, báo thành công', async () => {
    const { qc } = renderApp(<SubmitReviewForm taskId={5} />);
    const spy = vi.spyOn(qc, 'invalidateQueries');
    fireEvent.change(screen.getByLabelText(/Liên kết minh chứng/), { target: { value: ' https://drive.example/x ' } });
    fireEvent.change(screen.getByLabelText('Ghi chú'), { target: { value: 'Ảnh sân khấu' } });
    fireEvent.click(screen.getByRole('button', { name: 'Nộp nghiệm thu' }));
    await waitFor(() =>
      expect(api.submitTaskReview).toHaveBeenCalledWith(5, { link_url: 'https://drive.example/x', notes: 'Ảnh sân khấu' })
    );
    expect(await screen.findByText('Đã nộp nghiệm thu')).toBeDefined();
    expect(spy).toHaveBeenCalledWith({ queryKey: TASK_KEY(5) });
  });

  it('lỗi của server hiện bằng tiếng Việt, không mất dữ liệu đã nhập', async () => {
    vi.mocked(api.submitTaskReview).mockRejectedValueOnce({
      response: { status: 409, data: { error: 'Công việc này không ở trạng thái có thể nộp nghiệm thu.' } },
    });
    renderApp(<SubmitReviewForm taskId={5} />);
    fireEvent.change(screen.getByLabelText(/Liên kết minh chứng/), { target: { value: 'https://drive.example/x' } });
    fireEvent.click(screen.getByRole('button', { name: 'Nộp nghiệm thu' }));
    expect(await screen.findByText('Công việc này không ở trạng thái có thể nộp nghiệm thu.')).toBeDefined();
    expect((screen.getByLabelText(/Liên kết minh chứng/) as HTMLInputElement).value).toBe('https://drive.example/x');
  });
});

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { ReviewDialog } from './ReviewDialog';
import { ReviewButtons } from './ReviewButtons';
import { renderApp } from './testUtils';
import { TASK_KEY } from '../../queryKeys';
import * as api from '../../api';

vi.mock('../../api', async () => {
  const actual = await vi.importActual<typeof import('../../api')>('../../api');
  return { ...actual, reviewTask: vi.fn() };
});

describe('ReviewDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.reviewTask).mockResolvedValue({ ok: true });
  });
  afterEach(cleanup);

  it('duyệt đạt không cần lý do, làm mới cache, báo thành công và đóng', async () => {
    const onClose = vi.fn();
    const { qc } = renderApp(<ReviewDialog isOpen taskId={5} taskTitle="Dựng sân khấu" onClose={onClose} />);
    const spy = vi.spyOn(qc, 'invalidateQueries');
    expect(screen.getByText('Nghiệm thu: Dựng sân khấu')).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Gửi kết quả' }));
    await waitFor(() => expect(api.reviewTask).toHaveBeenCalledWith(5, { decision: 'approve', feedback: '' }));
    expect(await screen.findByText('Đã duyệt đạt')).toBeDefined();
    expect(spy).toHaveBeenCalledWith({ queryKey: TASK_KEY(5) });
    expect(onClose).toHaveBeenCalled();
  });

  it('yêu cầu làm lại và bác bỏ bắt buộc lý do (khoảng trắng không tính)', () => {
    renderApp(<ReviewDialog isOpen taskId={5} taskTitle="A" initialDecision="reject" onClose={() => {}} />);
    fireEvent.change(screen.getByLabelText(/Ghi chú/), { target: { value: '   ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Gửi kết quả' }));
    expect(screen.getByText('Vui lòng nêu rõ lý do khi yêu cầu làm lại.')).toBeDefined();
    fireEvent.click(screen.getByLabelText('Bác bỏ'));
    fireEvent.click(screen.getByRole('button', { name: 'Gửi kết quả' }));
    expect(screen.getByText('Vui lòng nêu rõ lý do khi bác bỏ.')).toBeDefined();
    expect(api.reviewTask).not.toHaveBeenCalled();
  });

  it('gửi quyết định bác bỏ kèm lý do đã cắt khoảng trắng', async () => {
    renderApp(<ReviewDialog isOpen taskId={5} taskTitle="A" initialDecision="cancel" onClose={() => {}} />);
    fireEvent.change(screen.getByLabelText(/Ghi chú/), { target: { value: '  Không đạt  ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Gửi kết quả' }));
    await waitFor(() =>
      expect(api.reviewTask).toHaveBeenCalledWith(5, { decision: 'cancel', feedback: 'Không đạt' })
    );
    expect(await screen.findByText('Đã bác bỏ công việc')).toBeDefined();
  });

  it('lỗi 409 của server hiện trong hộp', async () => {
    vi.mocked(api.reviewTask).mockRejectedValueOnce({
      response: { status: 409, data: { error: 'Công việc chưa được nộp để nghiệm thu.' } },
    });
    renderApp(<ReviewDialog isOpen taskId={5} taskTitle="A" onClose={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: 'Gửi kết quả' }));
    expect(await screen.findByText('Công việc chưa được nộp để nghiệm thu.')).toBeDefined();
  });
});

describe('ReviewButtons', () => {
  afterEach(cleanup);
  it('mỗi nút mở hộp với quyết định tương ứng được chọn sẵn', () => {
    renderApp(<ReviewButtons taskId={5} taskTitle="Việc X" />);
    fireEvent.click(screen.getByRole('button', { name: 'Bác bỏ' }));
    expect(screen.getByText('Nghiệm thu: Việc X')).toBeDefined();
    expect((screen.getByLabelText('Bác bỏ') as HTMLInputElement).checked).toBe(true);
  });
});

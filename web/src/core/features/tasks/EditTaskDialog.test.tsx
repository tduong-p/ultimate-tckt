import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { EditTaskDialog } from './EditTaskDialog';
import { renderApp } from './testUtils';
import { TASK_KEY } from '../../queryKeys';
import * as api from '../../api';

vi.mock('../../api', async () => {
  const actual = await vi.importActual<typeof import('../../api')>('../../api');
  return { ...actual, editTask: vi.fn() };
});

const task = {
  id: 5,
  title: 'Dựng sân khấu',
  deadline: '2026-10-31T17:00:00.000Z',
  start_date: null,
  priority: 'medium',
  deliverable: 'Ảnh',
};

describe('EditTaskDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.editTask).mockResolvedValue({ ok: true });
  });
  afterEach(cleanup);

  it('điền sẵn giá trị (hạn theo giờ Việt Nam) và nói rõ 3 trường chưa sửa được', () => {
    renderApp(<EditTaskDialog isOpen task={task} onClose={() => {}} />);
    expect((screen.getByLabelText(/Hạn chót/) as HTMLInputElement).value).toBe('2026-11-01');
    expect(screen.getByText(/Tiêu đề, mô tả và người được giao chưa sửa được/)).toBeDefined();
  });

  it('gửi đúng 4 trường, làm mới cache và đóng', async () => {
    const onClose = vi.fn();
    const { qc } = renderApp(<EditTaskDialog isOpen task={task} onClose={onClose} />);
    const spy = vi.spyOn(qc, 'invalidateQueries');
    fireEvent.change(screen.getByLabelText(/Hạn chót/), { target: { value: '2026-11-05' } });
    fireEvent.change(screen.getByLabelText('Ngày bắt đầu'), { target: { value: '2026-11-02' } });
    fireEvent.change(screen.getByLabelText('Mức ưu tiên'), { target: { value: 'urgent' } });
    fireEvent.change(screen.getByLabelText('Sản phẩm cần nộp'), { target: { value: '  Ảnh và biên bản ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Lưu' }));
    await waitFor(() =>
      expect(api.editTask).toHaveBeenCalledWith(5, {
        deadline: '2026-11-05',
        start_date: '2026-11-02',
        priority: 'urgent',
        deliverable: 'Ảnh và biên bản',
      })
    );
    expect(await screen.findByText('Đã cập nhật công việc')).toBeDefined();
    expect(spy).toHaveBeenCalledWith({ queryKey: TASK_KEY(5) });
    expect(onClose).toHaveBeenCalled();
  });

  it('chặn hạn trống và ngày bắt đầu sau hạn', () => {
    renderApp(<EditTaskDialog isOpen task={task} onClose={() => {}} />);
    fireEvent.change(screen.getByLabelText(/Hạn chót/), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: 'Lưu' }));
    expect(screen.getByText('Vui lòng chọn hạn chót.')).toBeDefined();
    fireEvent.change(screen.getByLabelText(/Hạn chót/), { target: { value: '2026-11-01' } });
    fireEvent.change(screen.getByLabelText('Ngày bắt đầu'), { target: { value: '2026-11-09' } });
    fireEvent.click(screen.getByRole('button', { name: 'Lưu' }));
    expect(screen.getByText('Ngày bắt đầu phải trước hoặc bằng hạn chót.')).toBeDefined();
    expect(api.editTask).not.toHaveBeenCalled();
  });

  it('lỗi 403 của server hiện tiếng Việt', async () => {
    vi.mocked(api.editTask).mockRejectedValueOnce({
      response: { status: 403, data: { error: 'You cannot update this task.' } },
    });
    renderApp(<EditTaskDialog isOpen task={task} onClose={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: 'Lưu' }));
    expect(await screen.findByText('Bạn không thể cập nhật công việc này.')).toBeDefined();
  });
});

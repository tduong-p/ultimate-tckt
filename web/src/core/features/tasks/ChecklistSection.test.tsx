import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { ChecklistSection } from './ChecklistSection';
import { renderApp } from './testUtils';
import { TASK_KEY } from '../../queryKeys';
import * as api from '../../api';

vi.mock('../../api', async () => {
  const actual = await vi.importActual<typeof import('../../api')>('../../api');
  return { ...actual, addChecklistItem: vi.fn(), setChecklistItemDone: vi.fn(), deleteChecklistItem: vi.fn() };
});

const items = [
  { id: 3, task_id: 5, title: 'Mua nước', is_done: 0 },
  { id: 4, task_id: 5, title: 'In banner', is_done: 1 },
];

describe('ChecklistSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.addChecklistItem).mockResolvedValue({ id: 9 });
    vi.mocked(api.setChecklistItemDone).mockResolvedValue({ ok: true });
    vi.mocked(api.deleteChecklistItem).mockResolvedValue({ ok: true });
  });
  afterEach(cleanup);

  it('hiện số mục đã xong; có quyền thì thêm được và làm mới cache', async () => {
    const { qc } = renderApp(<ChecklistSection taskId={5} items={items} canUpdate />);
    const spy = vi.spyOn(qc, 'invalidateQueries');
    expect(screen.getByText('1/2')).toBeDefined();
    fireEvent.change(screen.getByLabelText('Thêm việc con'), { target: { value: '  Đặt xe  ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Thêm' }));
    await waitFor(() => expect(api.addChecklistItem).toHaveBeenCalledWith(5, 'Đặt xe'));
    await waitFor(() => expect(spy).toHaveBeenCalledWith({ queryKey: TASK_KEY(5) }));
  });

  it('không cho thêm mục trống', () => {
    renderApp(<ChecklistSection taskId={5} items={items} canUpdate />);
    fireEvent.click(screen.getByRole('button', { name: 'Thêm' }));
    expect(screen.getByText('Nội dung việc con là bắt buộc.')).toBeDefined();
    expect(api.addChecklistItem).not.toHaveBeenCalled();
  });

  it('tích mục gọi PATCH với is_done', async () => {
    renderApp(<ChecklistSection taskId={5} items={items} canUpdate />);
    fireEvent.click(screen.getByLabelText('Mua nước'));
    await waitFor(() => expect(api.setChecklistItemDone).toHaveBeenCalledWith(5, 3, true));
  });

  it('xoá việc con phải xác nhận trước; huỷ thì không gọi API', async () => {
    renderApp(<ChecklistSection taskId={5} items={items} canUpdate />);
    fireEvent.click(screen.getByRole('button', { name: 'Xoá việc con: Mua nước' }));
    expect(await screen.findByText('Xoá việc con?')).toBeDefined();
    expect(api.deleteChecklistItem).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Huỷ' }));
    expect(api.deleteChecklistItem).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Xoá việc con: Mua nước' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Xoá' }));
    await waitFor(() => expect(api.deleteChecklistItem).toHaveBeenCalledWith(5, 3));
    expect(await screen.findByText('Đã xoá việc con')).toBeDefined();
  });

  it('không có quyền: ô tích bị khoá, không có form thêm và không có nút xoá', () => {
    renderApp(<ChecklistSection taskId={5} items={items} canUpdate={false} />);
    expect((screen.getByLabelText('Mua nước') as HTMLInputElement).disabled).toBe(true);
    expect(screen.queryByLabelText('Thêm việc con')).toBeNull();
    expect(screen.queryByRole('button', { name: /Xoá việc con/ })).toBeNull();
  });

  it('lỗi 403 của server hiện toast tiếng Việt', async () => {
    vi.mocked(api.setChecklistItemDone).mockRejectedValueOnce({
      response: { status: 403, data: { error: 'Bạn không thể chỉnh sửa việc con của công việc này.' } },
    });
    renderApp(<ChecklistSection taskId={5} items={items} canUpdate />);
    fireEvent.click(screen.getByLabelText('Mua nước'));
    expect(await screen.findByText('Bạn không thể chỉnh sửa việc con của công việc này.')).toBeDefined();
  });
});

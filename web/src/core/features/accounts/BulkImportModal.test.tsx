import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { BulkImportModal } from './BulkImportModal';
import * as api from '../../api';
import { renderWithApp } from '../../testing/peopleHarness';

vi.mock('../../api', async () => {
  const actual = await vi.importActual<typeof import('../../api')>('../../api');
  return { ...actual, bulkImportUsers: vi.fn() };
});

describe('BulkImportModal', () => {
  beforeEach(() => { vi.clearAllMocks(); });
  afterEach(cleanup);

  it('gửi các dòng đã chuẩn hoá, báo đã tạo/bỏ qua và làm mới cache', async () => {
    vi.mocked(api.bulkImportUsers).mockResolvedValueOnce({ ok: true, created: 2, skipped: 1 });
    const onClose = vi.fn();
    const { qc } = renderWithApp(<BulkImportModal isOpen onClose={onClose} />, { role: 'admin' });
    const spy = vi.spyOn(qc, 'invalidateQueries').mockResolvedValue(undefined);
    fireEvent.change(screen.getByLabelText('Danh sách (mỗi dòng: Tên,email)'), { target: { value: ' An , an@x.vn \n\nBình,binh@x.vn\nCường,cuong@x.vn' } });
    fireEvent.click(screen.getByRole('button', { name: 'Nhập' }));
    await waitFor(() => expect(api.bulkImportUsers).toHaveBeenCalledWith([
      { name: 'An', email: 'an@x.vn' }, { name: 'Bình', email: 'binh@x.vn' }, { name: 'Cường', email: 'cuong@x.vn' },
    ]));
    expect(await screen.findByText('Đã tạo 2, bỏ qua 1.')).toBeDefined();
    await waitFor(() => expect(spy).toHaveBeenCalledWith({ queryKey: ['core-members'] }));
    expect(onClose).toHaveBeenCalled();
  });

  it('danh sách rỗng: báo lỗi, không gọi API', async () => {
    renderWithApp(<BulkImportModal isOpen onClose={() => {}} />, { role: 'admin' });
    fireEvent.change(screen.getByLabelText('Danh sách (mỗi dòng: Tên,email)'), { target: { value: '  \n ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Nhập' }));
    expect(await screen.findByText('Danh sách thành viên trống.')).toBeDefined();
    expect(api.bulkImportUsers).not.toHaveBeenCalled();
  });

  it('lỗi 403 hiện tiếng Việt trong hộp', async () => {
    vi.mocked(api.bulkImportUsers).mockRejectedValueOnce({ response: { status: 403, data: { error: 'Administrator access is required.' } } });
    renderWithApp(<BulkImportModal isOpen onClose={() => {}} />, { role: 'admin' });
    fireEvent.change(screen.getByLabelText('Danh sách (mỗi dòng: Tên,email)'), { target: { value: 'A,a@x.vn' } });
    fireEvent.click(screen.getByRole('button', { name: 'Nhập' }));
    expect(await screen.findByText('Chỉ quản trị viên được thực hiện thao tác này.')).toBeDefined();
  });
});

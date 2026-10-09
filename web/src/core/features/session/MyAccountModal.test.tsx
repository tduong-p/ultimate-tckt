import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { MyAccountModal } from './MyAccountModal';
import * as api from '../../api';
import { SESSION_KEY } from '../../queryKeys';
import { renderWithApp } from '../../testing/peopleHarness';

vi.mock('../../api', async () => {
  const actual = await vi.importActual<typeof import('../../api')>('../../api');
  return { ...actual, updateMyAccount: vi.fn() };
});

const open = (onClose = vi.fn()) => ({ onClose, ...renderWithApp(<MyAccountModal isOpen onClose={onClose} />, { role: 'member', userId: 7 }) });

describe('MyAccountModal', () => {
  beforeEach(() => { vi.clearAllMocks(); });
  afterEach(cleanup);

  it('điền sẵn thông tin hiện tại và nói rõ tên/vai trò do quản lý đổi', () => {
    open();
    expect((screen.getByLabelText('Email') as HTMLInputElement).value).toBe('toi@x.vn');
    expect((screen.getByLabelText('Màu đại diện') as HTMLInputElement).value).toBe('#0052cc');
    expect(screen.getByText(/chỉ quản lý mới đổi được tên và vai trò/i)).toBeDefined();
  });

  it('lưu: PATCH không có password khi để trống, cập nhật cache session, báo và đóng hộp', async () => {
    vi.mocked(api.updateMyAccount).mockResolvedValueOnce({ id: 7, name: 'Tôi', email: 'moi@x.vn', role: 'member', phone: '0912', avatar_color: '#ff0000' });
    const { onClose, qc } = open();
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: '  moi@x.vn ' } });
    fireEvent.change(screen.getByLabelText('Số điện thoại'), { target: { value: ' 0912 ' } });
    fireEvent.change(screen.getByLabelText('Màu đại diện'), { target: { value: '#ff0000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Lưu tài khoản' }));
    await waitFor(() => expect(api.updateMyAccount).toHaveBeenCalledWith({ email: 'moi@x.vn', phone: '0912', avatar_color: '#ff0000' }));
    const body = vi.mocked(api.updateMyAccount).mock.calls[0][0];
    expect('password' in body).toBe(false);
    expect(await screen.findByText('Đã cập nhật tài khoản.')).toBeDefined();
    expect(onClose).toHaveBeenCalled();
    const session = qc.getQueryData(SESSION_KEY) as { user: { email: string; avatar_color: string } };
    expect(session.user.email).toBe('moi@x.vn');
    expect(session.user.avatar_color).toBe('#ff0000');
  });

  it('có nhập mật khẩu mới thì gửi password', async () => {
    vi.mocked(api.updateMyAccount).mockResolvedValueOnce({ id: 7, name: 'Tôi', email: 'toi@x.vn', role: 'member' });
    open();
    fireEvent.change(screen.getByLabelText('Mật khẩu mới'), { target: { value: 'matkhaumoi1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Lưu tài khoản' }));
    await waitFor(() => expect(api.updateMyAccount).toHaveBeenCalledWith({ email: 'toi@x.vn', phone: '', avatar_color: '#0052cc', password: 'matkhaumoi1' }));
  });

  it('chặn email sai định dạng và mật khẩu ngắn trước khi gửi', async () => {
    open();
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'khong-phai-email' } });
    fireEvent.click(screen.getByRole('button', { name: 'Lưu tài khoản' }));
    expect(await screen.findByText('Vui lòng nhập email hợp lệ.')).toBeDefined();
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'ok@x.vn' } });
    fireEvent.change(screen.getByLabelText('Mật khẩu mới'), { target: { value: '123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Lưu tài khoản' }));
    expect(await screen.findByText('Mật khẩu phải có ít nhất 8 ký tự.')).toBeDefined();
    expect(api.updateMyAccount).not.toHaveBeenCalled();
  });

  it('lỗi server hiện tiếng Việt, hộp không đóng, cache giữ nguyên', async () => {
    vi.mocked(api.updateMyAccount).mockRejectedValueOnce({ response: { status: 400, data: { error: 'A valid email and avatar color are required.' } } });
    const { onClose, qc } = open();
    fireEvent.click(screen.getByRole('button', { name: 'Lưu tài khoản' }));
    expect(await screen.findByText('Cần có email và màu đại diện hợp lệ.')).toBeDefined();
    expect(onClose).not.toHaveBeenCalled();
    expect((qc.getQueryData(SESSION_KEY) as { user: { email: string } }).user.email).toBe('toi@x.vn');
  });
});

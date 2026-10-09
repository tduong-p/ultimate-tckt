import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { screen, cleanup, fireEvent, waitFor, within } from '@testing-library/react';
import { AccountsView } from './AccountsView';
import * as api from '../../api';
import { renderWithApp } from '../../testing/peopleHarness';

vi.mock('../../api', async () => {
  const actual = await vi.importActual<typeof import('../../api')>('../../api');
  return {
    ...actual,
    fetchMembers: vi.fn(), fetchTeams: vi.fn(), createUser: vi.fn(), deleteUser: vi.fn(), updateUser: vi.fn(),
    fetchWeightPresets: vi.fn().mockResolvedValue([]),
  };
});

const rows: api.MemberItem[] = [
  { id: 1, name: 'Tôi Admin', email: 'admin@x.vn', role: 'admin', phone: '0900', teams: '', team_ids: '', auth_provider: 'local', can_manage: true },
  { id: 2, name: 'Nguyễn Văn An', email: 'an@hust.edu.vn', role: 'member', phone: null, teams: 'Tổ A', team_ids: '1', auth_provider: 'microsoft', can_manage: true },
  { id: 3, name: 'Lê Bình', email: 'binh@x.vn', role: 'leader', phone: null, teams: 'Tổ B', team_ids: '2', auth_provider: 'local', can_manage: true },
];

const open = () => renderWithApp(<AccountsView />, { role: 'admin', userId: 1, teams: [{ id: 1, name: 'Tổ A' }, { id: 2, name: 'Tổ B' }] });

describe('AccountsView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.fetchMembers).mockResolvedValue(rows);
    vi.mocked(api.fetchTeams).mockResolvedValue([{ id: 1, name: 'Tổ A' }, { id: 2, name: 'Tổ B' }]);
    vi.mocked(api.fetchWeightPresets).mockResolvedValue([]);
  });
  afterEach(cleanup);

  it('liệt kê tài khoản với badge kiểu đăng nhập', async () => {
    open();
    expect(await screen.findByText('Nguyễn Văn An')).toBeDefined();
    const ssoRow = screen.getByText('Nguyễn Văn An').closest('tr');
    expect(within(ssoRow!).getByText('SSO')).toBeDefined();
    const localRow = screen.getByText('Lê Bình').closest('tr');
    expect(within(localRow!).getByText('Cục bộ')).toBeDefined();
    expect(screen.getByText('3 tài khoản')).toBeDefined();
  });

  it('tìm không dấu: gõ "nguyen" ra "Nguyễn"', async () => {
    open();
    await screen.findByText('Nguyễn Văn An');
    fireEvent.change(screen.getByPlaceholderText('Tìm theo tên, email, số điện thoại, Tổ'), { target: { value: 'nguyen' } });
    await waitFor(() => expect(screen.queryByText('Lê Bình')).toBeNull());
    expect(screen.getByText('Nguyễn Văn An')).toBeDefined();
  });

  it('lọc theo vai trò và theo kiểu đăng nhập', async () => {
    open();
    await screen.findByText('Nguyễn Văn An');
    fireEvent.change(screen.getByLabelText('Lọc theo vai trò'), { target: { value: 'leader' } });
    await waitFor(() => expect(screen.queryByText('Nguyễn Văn An')).toBeNull());
    expect(screen.getByText('Lê Bình')).toBeDefined();
    fireEvent.change(screen.getByLabelText('Lọc theo vai trò'), { target: { value: 'all' } });
    fireEvent.change(screen.getByLabelText('Lọc theo kiểu đăng nhập'), { target: { value: 'microsoft' } });
    await waitFor(() => expect(screen.queryByText('Lê Bình')).toBeNull());
    expect(screen.getByText('Nguyễn Văn An')).toBeDefined();
  });

  it('không có nút Xoá ở dòng của chính mình; có Sửa cho mọi dòng', async () => {
    open();
    await screen.findByText('Nguyễn Văn An');
    expect(screen.queryByRole('button', { name: 'Xoá Tôi Admin' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Xoá Lê Bình' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Sửa Tôi Admin' })).toBeDefined();
  });

  it('"Thêm tài khoản" mở hộp tạo tài khoản; xoá phải xác nhận', async () => {
    vi.mocked(api.deleteUser).mockResolvedValueOnce({ ok: true, deleted: true });
    open();
    await screen.findByText('Nguyễn Văn An');
    fireEvent.click(screen.getByRole('button', { name: 'Thêm tài khoản' }));
    expect(await screen.findByLabelText('Họ và tên')).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Huỷ' }));
    fireEvent.click(screen.getByRole('button', { name: 'Xoá Lê Bình' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Xoá tài khoản' }));
    await waitFor(() => expect(api.deleteUser).toHaveBeenCalledWith(3));
  });

  it('lỗi tải danh sách hiện thông báo tiếng Việt', async () => {
    vi.mocked(api.fetchMembers).mockRejectedValue(new Error('Network Error'));
    open();
    expect(await screen.findByText('Không kết nối được máy chủ. Vui lòng thử lại.')).toBeDefined();
  });

  it('"Nhập danh sách hàng loạt" mở hộp nhập', async () => {
    open();
    await screen.findByText('Nguyễn Văn An');
    fireEvent.click(screen.getByRole('button', { name: 'Nhập danh sách hàng loạt' }));
    expect(await screen.findByLabelText('Danh sách (mỗi dòng: Tên,email)')).toBeDefined();
  });

  it('hiện khu vực Bộ trọng số', async () => {
    open();
    expect(await screen.findByRole('heading', { name: 'Bộ trọng số' })).toBeDefined();
  });
});

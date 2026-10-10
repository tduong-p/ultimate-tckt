import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { MembersView } from './MembersView';
import * as api from '../../api';
import { renderWithApp } from '../../testing/peopleHarness';

vi.mock('../../api', async () => {
  const actual = await vi.importActual<typeof import('../../api')>('../../api');
  return { ...actual, fetchMembers: vi.fn(), fetchTeams: vi.fn(), createUser: vi.fn(), updateUser: vi.fn(), deleteUser: vi.fn() };
});

const members: api.MemberItem[] = [
  { id: 1, name: 'Phạm Việt Bách', role: 'leader', email: 'bach@x.vn', avatar_color: '#e00000', teams: 'Tổ A', team_ids: '1', completed_tasks: 0, can_manage: true },
  { id: 2, name: 'Cao Hương Quỳnh', role: 'member', email: 'quynh@x.vn', avatar_color: '#006644', teams: 'Tổ A', team_ids: '1', completed_tasks: 2, can_manage: true },
  { id: 3, name: 'Nguyễn Văn Huy', role: 'member', email: 'huy@x.vn', avatar_color: '#006644', teams: 'Tổ B', team_ids: '2', completed_tasks: 1, can_manage: true },
];
const teams: api.TeamItem[] = [{ id: 1, name: 'Tổ A', can_manage: true }, { id: 2, name: 'Tổ B', can_manage: false }];
const harnessTeams = [{ id: 1, name: 'Tổ A', can_manage: true }, { id: 2, name: 'Tổ B', can_manage: false }];

describe('MembersView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.fetchMembers).mockResolvedValue(members);
    vi.mocked(api.fetchTeams).mockResolvedValue(teams);
  });
  afterEach(cleanup);

  it('hiện tiêu đề, danh sách thành viên và lọc theo từ khoá', async () => {
    renderWithApp(<MembersView />);
    expect(screen.getByText('Ghi nhận sự tham gia của từng thành viên.')).toBeDefined();
    expect(await screen.findByText('Phạm Việt Bách')).toBeDefined();
    fireEvent.change(screen.getByPlaceholderText('Tìm thành viên...'), { target: { value: 'Huy' } });
    await waitFor(() => expect(screen.queryByText('Phạm Việt Bách')).toBeNull());
    expect(screen.getByText('Nguyễn Văn Huy')).toBeDefined();
  });

  it('lọc theo Tổ và theo vai trò bằng ô chọn có tên truy cập', async () => {
    renderWithApp(<MembersView />);
    await screen.findByText('Phạm Việt Bách');
    fireEvent.change(screen.getByLabelText('Lọc theo Tổ'), { target: { value: '2' } });
    await waitFor(() => expect(screen.queryByText('Phạm Việt Bách')).toBeNull());
    expect(screen.getByText('Nguyễn Văn Huy')).toBeDefined();
    fireEvent.change(screen.getByLabelText('Lọc theo Tổ'), { target: { value: 'all' } });
    fireEvent.change(screen.getByLabelText('Lọc theo vai trò'), { target: { value: 'leader' } });
    await waitFor(() => expect(screen.queryByText('Nguyễn Văn Huy')).toBeNull());
    expect(screen.getByText('Phạm Việt Bách')).toBeDefined();
  });

  it('lọc không ra ai: báo không khớp bộ lọc', async () => {
    renderWithApp(<MembersView />);
    await screen.findByText('Phạm Việt Bách');
    fireEvent.change(screen.getByPlaceholderText('Tìm thành viên...'), { target: { value: 'zzz' } });
    expect(await screen.findByText('Không tìm thấy thành viên phù hợp với tiêu chí tìm kiếm hoặc bộ lọc hiện tại.')).toBeDefined();
  });

  it('lỗi tải hiện thông báo lỗi', async () => {
    vi.mocked(api.fetchMembers).mockRejectedValue(new Error('x'));
    renderWithApp(<MembersView />);
    expect(await screen.findByText('Lỗi tải dữ liệu thành viên')).toBeDefined();
  });

  it('hộp Tạo tài khoản là dialog; nút Tạo gửi form', async () => {
    renderWithApp(<MembersView />, { role: 'admin', teams: harnessTeams });
    await screen.findByText('Phạm Việt Bách');
    fireEvent.click(screen.getByRole('button', { name: 'Tạo tài khoản' }));
    expect(await screen.findByRole('dialog', { name: 'Tạo tài khoản' })).toBeDefined();
  });

  it('danh sách rỗng hiện trạng thái trống', async () => {
    vi.mocked(api.fetchMembers).mockResolvedValue([]);
    renderWithApp(<MembersView />);
    expect(await screen.findByText('Không tìm thấy thành viên')).toBeDefined();
  });

  it('thành viên thường: không có Tạo tài khoản, Sửa, Xoá', async () => {
    renderWithApp(<MembersView />, { role: 'member', userId: 2 });
    await screen.findByText('Phạm Việt Bách');
    expect(screen.queryByRole('button', { name: 'Tạo tài khoản' })).toBeNull();
    expect(screen.queryByRole('button', { name: /^Sửa / })).toBeNull();
  });

  it('Sửa/Xoá chỉ ở dòng can_manage; dòng của chính mình không có Xoá', async () => {
    vi.mocked(api.fetchMembers).mockResolvedValueOnce([
      { id: 1, name: 'Phạm Việt Bách', role: 'leader', email: 'bach@x.vn', avatar_color: '#e00000', teams: 'Tổ A', team_ids: '1', completed_tasks: 0, can_manage: false },
      { id: 2, name: 'Cao Hương Quỳnh', role: 'member', email: 'quynh@x.vn', avatar_color: '#006644', teams: 'Tổ A', team_ids: '1', completed_tasks: 2, can_manage: true },
      { id: 3, name: 'Nguyễn Văn Huy', role: 'member', email: 'huy@x.vn', avatar_color: '#006644', teams: 'Tổ B', team_ids: '2', completed_tasks: 1, can_manage: false },
    ]);
    renderWithApp(<MembersView />, { role: 'leader', userId: 2, teams: harnessTeams });
    await screen.findByText('Cao Hương Quỳnh');
    expect(screen.getByRole('button', { name: 'Sửa Cao Hương Quỳnh' })).toBeDefined();
    expect(screen.queryByRole('button', { name: 'Xoá Cao Hương Quỳnh' })).toBeNull(); // userId 2 = chính mình
    expect(screen.queryByRole('button', { name: 'Sửa Nguyễn Văn Huy' })).toBeNull();
  });

  it('Tổ trưởng tạo tài khoản cục bộ: chỉ Tổ mình quản lý, không có ô vai trò, role gửi là member', async () => {
    vi.mocked(api.createUser).mockResolvedValueOnce({ id: 50 });
    const { qc } = renderWithApp(<MembersView />, { role: 'leader', userId: 1, teams: harnessTeams });
    const spy = vi.spyOn(qc, 'invalidateQueries').mockResolvedValue(undefined);
    await screen.findByText('Phạm Việt Bách');
    fireEvent.click(screen.getByRole('button', { name: 'Tạo tài khoản' }));
    fireEvent.change(await screen.findByLabelText('Họ và tên'), { target: { value: 'Lê Mới' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: ' Moi@X.vn ' } });
    fireEvent.change(screen.getByLabelText('Mật khẩu'), { target: { value: '12345678' } });
    expect(screen.queryByLabelText('Vai trò')).toBeNull();
    expect(screen.queryByLabelText('Tổ B')).toBeNull();
    fireEvent.click(screen.getByLabelText('Tổ A'));
    fireEvent.click(screen.getByRole('button', { name: 'Tạo' }));
    await waitFor(() =>
      expect(api.createUser).toHaveBeenCalledWith({ name: 'Lê Mới', email: 'Moi@X.vn', role: 'member', auth_provider: 'local', password: '12345678', team_ids: [1] })
    );
    expect(await screen.findByText('Đã tạo tài khoản.')).toBeDefined();
    await waitFor(() => expect(spy).toHaveBeenCalledWith({ queryKey: ['core-members'] }));
  });

  it('admin tạo tài khoản SSO: không có ô mật khẩu, chọn được vai trò, body không có password', async () => {
    vi.mocked(api.createUser).mockResolvedValueOnce({ id: 51 });
    renderWithApp(<MembersView />, { role: 'admin', teams: harnessTeams });
    await screen.findByText('Phạm Việt Bách');
    fireEvent.click(screen.getByRole('button', { name: 'Tạo tài khoản' }));
    fireEvent.change(await screen.findByLabelText('Họ và tên'), { target: { value: 'Sso User' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'sso@hust.edu.vn' } });
    fireEvent.click(screen.getByLabelText('SSO Microsoft'));
    expect(screen.queryByLabelText('Mật khẩu')).toBeNull();
    fireEvent.change(screen.getByLabelText('Vai trò'), { target: { value: 'leader' } });
    fireEvent.click(screen.getByLabelText('Tổ B'));
    fireEvent.click(screen.getByRole('button', { name: 'Tạo' }));
    await waitFor(() =>
      expect(api.createUser).toHaveBeenCalledWith({ name: 'Sso User', email: 'sso@hust.edu.vn', role: 'leader', auth_provider: 'microsoft', team_ids: [2] })
    );
  });

  it('tạo tài khoản cục bộ thiếu mật khẩu hoặc mật khẩu ngắn hoặc thành viên không có Tổ: chặn ở client', async () => {
    renderWithApp(<MembersView />, { role: 'admin', teams: harnessTeams });
    await screen.findByText('Phạm Việt Bách');
    fireEvent.click(screen.getByRole('button', { name: 'Tạo tài khoản' }));
    fireEvent.change(await screen.findByLabelText('Họ và tên'), { target: { value: 'A' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'a@x.vn' } });
    fireEvent.click(screen.getByRole('button', { name: 'Tạo' }));
    expect(await screen.findByText('Mật khẩu là bắt buộc đối với tài khoản đăng nhập cục bộ.')).toBeDefined();
    fireEvent.change(screen.getByLabelText('Mật khẩu'), { target: { value: '123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Tạo' }));
    expect(await screen.findByText('Mật khẩu phải có ít nhất 8 ký tự.')).toBeDefined();
    fireEvent.change(screen.getByLabelText('Mật khẩu'), { target: { value: '12345678' } });
    fireEvent.click(screen.getByRole('button', { name: 'Tạo' }));
    expect(await screen.findByText('Thành viên phải thuộc ít nhất một Tổ.')).toBeDefined();
    expect(api.createUser).not.toHaveBeenCalled();
  });

  it('lỗi server khi tạo hiện nguyên văn câu tiếng Việt trong hộp', async () => {
    vi.mocked(api.createUser).mockRejectedValueOnce({ response: { status: 400, data: { error: 'Email không hợp lệ.' } } });
    renderWithApp(<MembersView />, { role: 'admin', teams: harnessTeams });
    await screen.findByText('Phạm Việt Bách');
    fireEvent.click(screen.getByRole('button', { name: 'Tạo tài khoản' }));
    fireEvent.change(await screen.findByLabelText('Họ và tên'), { target: { value: 'A' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'a@x.vn' } });
    fireEvent.change(screen.getByLabelText('Mật khẩu'), { target: { value: '12345678' } });
    fireEvent.click(screen.getByLabelText('Tổ A'));
    fireEvent.click(screen.getByRole('button', { name: 'Tạo' }));
    expect(await screen.findByText('Email không hợp lệ.')).toBeDefined();
  });

  it('Tổ trưởng sửa tài khoản: không có ô email/mật khẩu/vai trò, body không có email và password', async () => {
    vi.mocked(api.updateUser).mockResolvedValueOnce({ ok: true });
    renderWithApp(<MembersView />, { role: 'leader', userId: 1, teams: harnessTeams });
    await screen.findByText('Cao Hương Quỳnh');
    fireEvent.click(screen.getByRole('button', { name: 'Sửa Cao Hương Quỳnh' }));
    const name = await screen.findByLabelText('Họ và tên');
    expect(screen.queryByLabelText('Email')).toBeNull();
    expect(screen.queryByLabelText('Mật khẩu mới')).toBeNull();
    expect(screen.queryByLabelText('Vai trò')).toBeNull();
    fireEvent.change(name, { target: { value: 'Cao H. Quỳnh' } });
    fireEvent.click(screen.getByRole('button', { name: 'Lưu' }));
    await waitFor(() =>
      expect(api.updateUser).toHaveBeenCalledWith(2, { name: 'Cao H. Quỳnh', phone: '', avatar_color: '#006644', role: 'member', team_ids: [1] })
    );
    const body = vi.mocked(api.updateUser).mock.calls[0][1];
    expect('email' in body).toBe(false);
    expect('password' in body).toBe(false);
    expect(await screen.findByText('Đã cập nhật tài khoản.')).toBeDefined();
  });

  it('admin sửa tài khoản: gửi email; mật khẩu chỉ gửi khi có nhập', async () => {
    vi.mocked(api.updateUser).mockResolvedValue({ ok: true });
    renderWithApp(<MembersView />, { role: 'admin', teams: harnessTeams });
    await screen.findByText('Nguyễn Văn Huy');
    fireEvent.click(screen.getByRole('button', { name: 'Sửa Nguyễn Văn Huy' }));
    fireEvent.change(await screen.findByLabelText('Vai trò'), { target: { value: 'vice_leader' } });
    fireEvent.click(screen.getByRole('button', { name: 'Lưu' }));
    await waitFor(() => expect(api.updateUser).toHaveBeenCalledTimes(1));
    const first = vi.mocked(api.updateUser).mock.calls[0][1];
    expect(first.email).toBe('huy@x.vn');
    expect(first.role).toBe('vice_leader');
    expect('password' in first).toBe(false);
    cleanup();
    renderWithApp(<MembersView />, { role: 'admin', teams: harnessTeams });
    await screen.findByText('Nguyễn Văn Huy');
    fireEvent.click(screen.getByRole('button', { name: 'Sửa Nguyễn Văn Huy' }));
    fireEvent.change(await screen.findByLabelText('Mật khẩu mới'), { target: { value: 'matkhaumoi1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Lưu' }));
    await waitFor(() => expect(api.updateUser).toHaveBeenCalledTimes(2));
    expect(vi.mocked(api.updateUser).mock.calls[1][1].password).toBe('matkhaumoi1');
  });

  it('sửa thành viên bỏ hết Tổ: chặn ở client', async () => {
    renderWithApp(<MembersView />, { role: 'admin', teams: harnessTeams });
    await screen.findByText('Nguyễn Văn Huy');
    fireEvent.click(screen.getByRole('button', { name: 'Sửa Nguyễn Văn Huy' }));
    fireEvent.click(await screen.findByLabelText('Tổ B')); // bỏ chọn Tổ duy nhất
    fireEvent.click(screen.getByRole('button', { name: 'Lưu' }));
    expect(await screen.findByText('Thành viên phải thuộc ít nhất một Tổ.')).toBeDefined();
    expect(api.updateUser).not.toHaveBeenCalled();
  });

  it.each([
    [{ ok: true, deleted: true }, 'Đã xoá tài khoản.'],
    [{ ok: true, deleted: false, deactivated: true }, 'Đã vô hiệu hoá tài khoản để giữ lịch sử.'],
    [{ ok: true, deleted: false, removed_from_managed_teams: true }, 'Đã gỡ tài khoản khỏi Tổ của bạn.'],
  ])('xoá tài khoản phải xác nhận, kết quả %j → "%s"', async (result, message) => {
    vi.mocked(api.deleteUser).mockResolvedValueOnce(result);
    renderWithApp(<MembersView />, { role: 'admin', userId: 1, teams: harnessTeams });
    await screen.findByText('Nguyễn Văn Huy');
    fireEvent.click(screen.getByRole('button', { name: 'Xoá Nguyễn Văn Huy' }));
    expect(api.deleteUser).not.toHaveBeenCalled();
    fireEvent.click(await screen.findByRole('button', { name: 'Xoá tài khoản' }));
    await waitFor(() => expect(api.deleteUser).toHaveBeenCalledWith(3));
    expect(await screen.findByText(message)).toBeDefined();
  });

  it('lỗi khi xoá hiện tiếng Việt', async () => {
    vi.mocked(api.deleteUser).mockRejectedValueOnce({ response: { status: 403, data: { error: 'You cannot delete this account.' } } });
    renderWithApp(<MembersView />, { role: 'admin', userId: 1, teams: harnessTeams });
    await screen.findByText('Nguyễn Văn Huy');
    fireEvent.click(screen.getByRole('button', { name: 'Xoá Nguyễn Văn Huy' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Xoá tài khoản' }));
    expect(await screen.findByText('Bạn không có quyền xoá tài khoản này.')).toBeDefined();
  });
});

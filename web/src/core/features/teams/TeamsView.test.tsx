import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { TeamsView } from './TeamsView';
import * as api from '../../api';
import { renderWithApp } from '../../testing/peopleHarness';

vi.mock('../../api', async () => {
  const actual = await vi.importActual<typeof import('../../api')>('../../api');
  return { ...actual, fetchTeams: vi.fn(), createTeam: vi.fn(), updateTeam: vi.fn(), deleteTeam: vi.fn(), fetchTeamMembers: vi.fn() };
});

const mockTeams: api.TeamItem[] = [
  { id: 1, name: 'Tổ A', description: 'Mô tả A', color: '#0052cc', member_count: 8, active_count: 3, can_manage: true },
  { id: 2, name: 'Tổ B', description: 'Mô tả B', color: '#36b37e', member_count: 12, active_count: 5, can_manage: false },
];
const harnessTeams = [{ id: 1, name: 'Tổ A', can_manage: true }, { id: 2, name: 'Tổ B', can_manage: false }];

describe('TeamsView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.fetchTeams).mockResolvedValue(mockTeams);
  });
  afterEach(cleanup);

  it('hiện tiêu đề và danh sách Tổ từ API', async () => {
    renderWithApp(<TeamsView />);
    expect(screen.getByText('Những con người và đơn vị cùng tạo nên các hoạt động.')).toBeDefined();
    expect(await screen.findByText('Tổ A')).toBeDefined();
    expect(screen.getByText('Tổ B')).toBeDefined();
    expect(screen.getByText('8')).toBeDefined();
  });

  it('thành viên thường: không có nút thao tác nào và tên Tổ không là link', async () => {
    renderWithApp(<TeamsView />, { role: 'member', teams: [] });
    await screen.findByText('Tổ A');
    expect(screen.queryAllByRole('button').length).toBe(0);
    expect(screen.queryAllByRole('link').length).toBe(0);
  });

  it('Tổ trưởng: chỉ Tổ mình quản lý có Sửa, Quản lý thành viên, link tới trang Tổ; không có Tạo Tổ, Xoá', async () => {
    renderWithApp(<TeamsView />, { role: 'leader', teams: harnessTeams });
    await screen.findByText('Tổ A');
    expect(screen.getByRole('button', { name: 'Sửa Tổ A' })).toBeDefined();
    expect(screen.queryByRole('button', { name: 'Sửa Tổ B' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Quản lý thành viên Tổ A' })).toBeDefined();
    expect(screen.getByRole('link', { name: 'Tổ A' }).getAttribute('href')).toBe('/team/1');
    expect(screen.queryByRole('button', { name: 'Tạo Tổ' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Xoá Tổ A' })).toBeNull();
  });

  it('admin tạo Tổ: POST đúng body, làm mới cache, báo thành công', async () => {
    vi.mocked(api.createTeam).mockResolvedValueOnce({ id: 9 });
    const { qc } = renderWithApp(<TeamsView />, { role: 'admin' });
    const spy = vi.spyOn(qc, 'invalidateQueries').mockResolvedValue(undefined);
    await screen.findByText('Tổ A');
    fireEvent.click(screen.getByRole('button', { name: 'Tạo Tổ' }));
    expect(await screen.findByRole('dialog', { name: 'Tạo Tổ' })).toBeDefined();
    fireEvent.change(await screen.findByLabelText('Tên Tổ'), { target: { value: '  Tổ mới ' } });
    fireEvent.change(screen.getByLabelText('Mô tả'), { target: { value: 'Mô tả mới' } });
    fireEvent.click(screen.getByRole('button', { name: 'Tạo' }));
    await waitFor(() =>
      expect(api.createTeam).toHaveBeenCalledWith({ name: 'Tổ mới', description: 'Mô tả mới', color: '#1e3a8a' })
    );
    await waitFor(() => expect(spy).toHaveBeenCalledWith({ queryKey: ['core-teams'] }));
    expect(spy).toHaveBeenCalledWith({ queryKey: ['core-bootstrap'] });
    expect(await screen.findByText('Đã tạo Tổ.')).toBeDefined();
  });

  it('tạo Tổ thiếu tên: báo lỗi ngay, không gọi API', async () => {
    renderWithApp(<TeamsView />, { role: 'admin' });
    await screen.findByText('Tổ A');
    fireEvent.click(screen.getByRole('button', { name: 'Tạo Tổ' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Tạo' }));
    expect(await screen.findByText('Vui lòng nhập tên Tổ.')).toBeDefined();
    expect(api.createTeam).not.toHaveBeenCalled();
  });

  it('lỗi mất kết nối khi tạo Tổ hiện tiếng Việt trong hộp', async () => {
    vi.mocked(api.createTeam).mockRejectedValueOnce(new Error('Network Error'));
    renderWithApp(<TeamsView />, { role: 'admin' });
    await screen.findByText('Tổ A');
    fireEvent.click(screen.getByRole('button', { name: 'Tạo Tổ' }));
    fireEvent.change(await screen.findByLabelText('Tên Tổ'), { target: { value: 'X' } });
    fireEvent.click(screen.getByRole('button', { name: 'Tạo' }));
    expect(await screen.findByText('Không kết nối được máy chủ. Vui lòng thử lại.')).toBeDefined();
  });

  it('admin sửa Tổ: gửi cả tên, mô tả và màu', async () => {
    vi.mocked(api.updateTeam).mockResolvedValueOnce({ ok: true });
    renderWithApp(<TeamsView />, { role: 'admin' });
    await screen.findByText('Tổ A');
    fireEvent.click(screen.getByRole('button', { name: 'Sửa Tổ A' }));
    const name = await screen.findByLabelText('Tên Tổ');
    expect((name as HTMLInputElement).value).toBe('Tổ A');
    fireEvent.change(name, { target: { value: 'Tổ A mới' } });
    fireEvent.click(screen.getByRole('button', { name: 'Lưu' }));
    await waitFor(() =>
      expect(api.updateTeam).toHaveBeenCalledWith(1, { name: 'Tổ A mới', description: 'Mô tả A', color: '#0052cc' })
    );
    expect(await screen.findByText('Đã cập nhật Tổ.')).toBeDefined();
  });

  it('Tổ trưởng sửa Tổ: chỉ có ô màu, body chỉ có color', async () => {
    vi.mocked(api.updateTeam).mockResolvedValueOnce({ ok: true });
    renderWithApp(<TeamsView />, { role: 'leader', teams: harnessTeams });
    await screen.findByText('Tổ A');
    fireEvent.click(screen.getByRole('button', { name: 'Sửa Tổ A' }));
    const color = await screen.findByLabelText('Màu của Tổ');
    expect(screen.queryByLabelText('Tên Tổ')).toBeNull();
    fireEvent.change(color, { target: { value: '#ff0000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Lưu' }));
    await waitFor(() => expect(api.updateTeam).toHaveBeenCalledWith(1, { color: '#ff0000' }));
  });

  it('xoá Tổ phải xác nhận; xoá hẳn báo "Đã xoá Tổ thành công."', async () => {
    vi.mocked(api.deleteTeam).mockResolvedValueOnce({ ok: true, deleted: true, deactivated: false });
    const { qc } = renderWithApp(<TeamsView />, { role: 'admin' });
    const spy = vi.spyOn(qc, 'invalidateQueries').mockResolvedValue(undefined);
    await screen.findByText('Tổ A');
    fireEvent.click(screen.getByRole('button', { name: 'Xoá Tổ A' }));
    expect(api.deleteTeam).not.toHaveBeenCalled();
    fireEvent.click(await screen.findByRole('button', { name: 'Xoá Tổ' }));
    await waitFor(() => expect(api.deleteTeam).toHaveBeenCalledWith(1));
    expect(await screen.findByText('Đã xoá Tổ thành công.')).toBeDefined();
    await waitFor(() => expect(spy).toHaveBeenCalledWith({ queryKey: ['core-teams'] }));
  });

  it('server chỉ lưu trữ Tổ thì báo "Đã lưu trữ Tổ."', async () => {
    vi.mocked(api.deleteTeam).mockResolvedValueOnce({ ok: true, deleted: false, deactivated: true });
    renderWithApp(<TeamsView />, { role: 'admin' });
    await screen.findByText('Tổ A');
    fireEvent.click(screen.getByRole('button', { name: 'Xoá Tổ A' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Xoá Tổ' }));
    expect(await screen.findByText('Đã lưu trữ Tổ.')).toBeDefined();
  });

  it('Tổ còn hoạt động đang diễn ra: hiện nguyên văn câu lỗi tiếng Việt của server', async () => {
    const message = 'Không thể xóa Tổ đang có hoạt động đang diễn ra. Vui lòng kết thúc hoặc chuyển giao hoạt động trước.';
    vi.mocked(api.deleteTeam).mockRejectedValueOnce({ response: { status: 400, data: { error: message } } });
    renderWithApp(<TeamsView />, { role: 'admin' });
    await screen.findByText('Tổ A');
    fireEvent.click(screen.getByRole('button', { name: 'Xoá Tổ A' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Xoá Tổ' }));
    expect(await screen.findByText(message)).toBeDefined();
  });

  it('danh sách rỗng hiện trạng thái trống, không có icon checkbox', async () => {
    vi.mocked(api.fetchTeams).mockResolvedValue([]);
    const { container } = renderWithApp(<TeamsView />);
    expect(await screen.findByText('Chưa có tổ nào')).toBeDefined();
    expect(container.querySelector('input[type="checkbox"]')).toBeNull();
  });

  it('Enter trong ô tên gửi form tạo Tổ', async () => {
    vi.mocked(api.createTeam).mockResolvedValueOnce({ id: 9 });
    renderWithApp(<TeamsView />, { role: 'admin' });
    await screen.findByText('Tổ A');
    fireEvent.click(screen.getByRole('button', { name: 'Tạo Tổ' }));
    const name = await screen.findByLabelText('Tên Tổ');
    fireEvent.change(name, { target: { value: 'Tổ Enter' } });
    fireEvent.submit(name.closest('form')!);
    await waitFor(() => expect(api.createTeam).toHaveBeenCalledTimes(1));
  });

  it('lỗi tải Tổ hiện thông báo lỗi', async () => {
    vi.mocked(api.fetchTeams).mockRejectedValue(new Error('x'));
    renderWithApp(<TeamsView />);
    expect(await screen.findByText('Lỗi tải dữ liệu Tổ')).toBeDefined();
  });

  it('"Quản lý thành viên" mở hộp thành viên của đúng Tổ', async () => {
    vi.mocked(api.fetchTeamMembers).mockResolvedValue({ members: [], available: [] });
    renderWithApp(<TeamsView />, { role: 'leader', teams: harnessTeams });
    await screen.findByText('Tổ A');
    fireEvent.click(screen.getByRole('button', { name: 'Quản lý thành viên Tổ A' }));
    expect(await screen.findByText('Thành viên Tổ Tổ A')).toBeDefined();
    expect(api.fetchTeamMembers).toHaveBeenCalledWith(1);
  });
});

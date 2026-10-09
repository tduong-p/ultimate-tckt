import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { screen, cleanup, fireEvent, waitFor, within } from '@testing-library/react';
import { TeamMembersModal } from './TeamMembersModal';
import * as api from '../../api';
import { renderWithApp } from '../../testing/peopleHarness';

vi.mock('../../api', async () => {
  const actual = await vi.importActual<typeof import('../../api')>('../../api');
  return { ...actual, fetchTeamMembers: vi.fn(), addTeamMember: vi.fn(), setTeamMemberRole: vi.fn(), removeTeamMember: vi.fn() };
});

const data: api.TeamMembersResponse = {
  members: [
    { id: 1, name: 'Tôi Admin', email: 'a@x.vn', role: 'admin', is_lead: 0, is_vice_lead: 0 },
    { id: 5, name: 'An', email: 'an@x.vn', role: 'member', is_lead: 0, is_vice_lead: 0 },
    { id: 6, name: 'Bình', email: 'binh@x.vn', role: 'leader', is_lead: 1, is_vice_lead: 0 },
  ],
  available: [
    { id: 7, name: 'Chi', email: 'chi@x.vn', role: 'member' },
    { id: 8, name: 'Dũng', email: 'dung@x.vn', role: 'vice_leader' },
  ],
};

const open = (role: string, userId: number) =>
  renderWithApp(<TeamMembersModal teamId={3} teamName="Tổ A" onClose={() => {}} />, { role, userId });

describe('TeamMembersModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.fetchTeamMembers).mockResolvedValue(data);
  });
  afterEach(cleanup);

  it('admin: đổi vai trò thành viên thường bằng ô chọn, gọi PATCH đúng', async () => {
    vi.mocked(api.setTeamMemberRole).mockResolvedValueOnce({ ok: true, role: 'vice_leader' });
    const { qc } = open('admin', 1);
    const spy = vi.spyOn(qc, 'invalidateQueries').mockResolvedValue(undefined);
    const select = await screen.findByLabelText('Vai trò của An');
    fireEvent.change(select, { target: { value: 'vice_leader' } });
    await waitFor(() => expect(api.setTeamMemberRole).toHaveBeenCalledWith(3, 5, 'vice_leader'));
    expect(await screen.findByText('Đã cập nhật vai trò.')).toBeDefined();
    await waitFor(() => expect(spy).toHaveBeenCalledWith({ queryKey: ['core-team'] }));
  });

  it('admin: tài khoản admin/vice_admin không có ô đổi vai trò; không có nút xoá cạnh chính mình', async () => {
    open('admin', 1);
    await screen.findByText('Tôi Admin');
    expect(screen.queryByLabelText('Vai trò của Tôi Admin')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Xoá Tôi Admin khỏi Tổ' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Xoá An khỏi Tổ' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Xoá Bình khỏi Tổ' })).toBeDefined();
  });

  it('Tổ trưởng: không có ô đổi vai trò, chỉ xoá được thành viên thường', async () => {
    open('leader', 6);
    await screen.findByText('An');
    expect(screen.queryByLabelText('Vai trò của An')).toBeNull();
    expect(screen.getByRole('button', { name: 'Xoá An khỏi Tổ' })).toBeDefined();
    expect(screen.queryByRole('button', { name: 'Xoá Bình khỏi Tổ' })).toBeNull(); // chính mình
    expect(screen.queryByRole('button', { name: 'Xoá Tôi Admin khỏi Tổ' })).toBeNull(); // admin
  });

  it('xoá thành viên phải xác nhận rồi mới gọi DELETE', async () => {
    vi.mocked(api.removeTeamMember).mockResolvedValueOnce({ ok: true, role: 'member' });
    open('admin', 1);
    fireEvent.click(await screen.findByRole('button', { name: 'Xoá An khỏi Tổ' }));
    expect(api.removeTeamMember).not.toHaveBeenCalled();
    fireEvent.click(await screen.findByRole('button', { name: 'Xoá khỏi Tổ' }));
    await waitFor(() => expect(api.removeTeamMember).toHaveBeenCalledWith(3, 5));
    expect(await screen.findByText('Đã xoá thành viên khỏi Tổ.')).toBeDefined();
  });

  it('admin thêm thành viên với vai trò chọn được', async () => {
    vi.mocked(api.addTeamMember).mockResolvedValueOnce({ ok: true });
    open('admin', 1);
    fireEvent.change(await screen.findByLabelText('Tài khoản'), { target: { value: '8' } });
    fireEvent.change(screen.getByLabelText('Vai trò trong Tổ'), { target: { value: 'vice_leader' } });
    fireEvent.click(screen.getByRole('button', { name: 'Thêm vào Tổ' }));
    await waitFor(() => expect(api.addTeamMember).toHaveBeenCalledWith(3, { user_id: 8, team_role: 'vice_leader' }));
    expect(await screen.findByText('Đã thêm thành viên vào Tổ.')).toBeDefined();
  });

  it('Tổ trưởng thêm thành viên: chỉ thấy tài khoản thường, không có ô vai trò, gửi team_role member', async () => {
    vi.mocked(api.addTeamMember).mockResolvedValueOnce({ ok: true });
    open('leader', 6);
    const select = await screen.findByLabelText('Tài khoản');
    expect(within(select).queryByText(/Dũng/)).toBeNull();
    expect(screen.queryByLabelText('Vai trò trong Tổ')).toBeNull();
    fireEvent.change(select, { target: { value: '7' } });
    fireEvent.click(screen.getByRole('button', { name: 'Thêm vào Tổ' }));
    await waitFor(() => expect(api.addTeamMember).toHaveBeenCalledWith(3, { user_id: 7, team_role: 'member' }));
  });

  it('chưa chọn tài khoản thì không gọi API', async () => {
    open('admin', 1);
    fireEvent.click(await screen.findByRole('button', { name: 'Thêm vào Tổ' }));
    expect(await screen.findByText('Vui lòng chọn tài khoản.')).toBeDefined();
    expect(api.addTeamMember).not.toHaveBeenCalled();
  });

  it('lỗi 403 hiện tiếng Việt', async () => {
    vi.mocked(api.fetchTeamMembers).mockRejectedValue({ response: { status: 403, data: { error: 'You cannot manage this team.' } } });
    open('leader', 6);
    expect(await screen.findByText('Bạn không có quyền quản lý Tổ này.')).toBeDefined();
  });
});

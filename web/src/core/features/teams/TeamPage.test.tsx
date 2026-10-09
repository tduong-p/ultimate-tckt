import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { TeamPage } from './TeamPage';
import * as api from '../../api';
import { renderWithApp } from '../../testing/peopleHarness';

vi.mock('../../api', async () => {
  const actual = await vi.importActual<typeof import('../../api')>('../../api');
  return { ...actual, fetchTeamOverview: vi.fn(), deleteTeam: vi.fn(), fetchTeamMembers: vi.fn() };
});

const overview: api.TeamOverview = {
  team: { id: 3, name: 'Tổ Truyền thông', description: 'Làm truyền thông', color: '#6554c0', member_count: 2, open_tasks: 1, done_tasks: 1, overdue_tasks: 1 },
  members: [
    { id: 1, name: 'Lan', email: 'lan@x.vn', role: 'leader', avatar_color: '#0052cc', is_lead: 1, is_vice_lead: 0, open_tasks: 1, done_tasks: 0 },
    { id: 2, name: 'Minh', email: 'minh@x.vn', role: 'member', avatar_color: '#36b37e', is_lead: 0, is_vice_lead: 0, open_tasks: 0, done_tasks: 1 },
  ],
  tasks: [
    { id: 11, title: 'Thiết kế poster', status: 'in_progress', deadline: '2020-01-01', activity_title: 'Hội trại', assignee_name: 'Lan' },
    { id: 12, title: 'Đã xong rồi', status: 'done', deadline: '2020-01-01', activity_title: 'Hội trại', assignee_name: 'Minh' },
  ],
  activities: [{ id: 21, title: 'Hội trại', status: 'active', deadline: '2030-01-01', task_count: 4, done_count: 1 }],
};

const open = (role: string) =>
  renderWithApp(<TeamPage />, { role, userId: 1, path: '/team/3', routePath: '/team/:id', teams: [{ id: 3, name: 'Tổ Truyền thông', can_manage: true }] });

describe('TeamPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.fetchTeamOverview).mockResolvedValue(overview);
  });
  afterEach(cleanup);

  it('hiện số liệu, việc đang mở, hoạt động và thành viên của Tổ', async () => {
    open('leader');
    expect(await screen.findByRole('heading', { name: 'Tổ Truyền thông' })).toBeDefined();
    expect(api.fetchTeamOverview).toHaveBeenCalledWith(3);
    expect(screen.getByText('50%')).toBeDefined(); // 1 xong / (1 mở + 1 xong)
    expect(screen.getByRole('link', { name: /Thiết kế poster/ }).getAttribute('href')).toBe('/task/11');
    expect(screen.queryByText('Đã xong rồi')).toBeNull(); // chỉ việc chưa xong
    expect(screen.getByRole('link', { name: /^Hội trại/ }).getAttribute('href')).toBe('/activity/21');
    expect(screen.getByText(/1\/4 việc/)).toBeDefined();
    expect(screen.getByText('Tổ trưởng')).toBeDefined();
    expect(screen.getByRole('link', { name: 'lan@x.vn' }).getAttribute('href')).toBe('mailto:lan@x.vn');
  });

  it('Tổ trưởng không thấy nút "Xoá Tổ"; admin thấy', async () => {
    open('leader');
    await screen.findByRole('heading', { name: 'Tổ Truyền thông' });
    expect(screen.queryByRole('button', { name: 'Xoá Tổ' })).toBeNull();
    cleanup();
    open('admin');
    expect(await screen.findByRole('button', { name: 'Xoá Tổ' })).toBeDefined();
  });

  it('admin xoá Tổ: xác nhận, gọi DELETE rồi về danh sách Tổ', async () => {
    vi.mocked(api.deleteTeam).mockResolvedValueOnce({ ok: true, deleted: true, deactivated: false });
    open('admin');
    fireEvent.click(await screen.findByRole('button', { name: 'Xoá Tổ' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Xoá Tổ vĩnh viễn' }));
    await waitFor(() => expect(api.deleteTeam).toHaveBeenCalledWith(3));
    await waitFor(() => expect(screen.getByTestId('path').textContent).toBe('/teams'));
  });

  it('"Quản lý thành viên" mở hộp thành viên', async () => {
    vi.mocked(api.fetchTeamMembers).mockResolvedValue({ members: [], available: [] });
    open('leader');
    fireEvent.click(await screen.findByRole('button', { name: 'Quản lý thành viên' }));
    await waitFor(() => expect(api.fetchTeamMembers).toHaveBeenCalledWith(3));
  });

  it('403 (Tổ khác): báo lỗi tiếng Việt và về Tổng quan', async () => {
    vi.mocked(api.fetchTeamOverview).mockRejectedValue({ response: { status: 403, data: { error: 'You cannot view this team overview.' } } });
    open('leader');
    expect(await screen.findByText('Bạn không có quyền xem Tổ này.')).toBeDefined();
    await waitFor(() => expect(screen.getByTestId('path').textContent).toBe('/dashboard'));
  });

  it('404 ở lại trang với câu lỗi và link quay lại', async () => {
    vi.mocked(api.fetchTeamOverview).mockRejectedValue({ response: { status: 404, data: { error: 'Team not found.' } } });
    open('admin');
    expect(await screen.findByText('Không tìm thấy Tổ.')).toBeDefined();
    expect(screen.getByRole('link', { name: /Quay lại danh sách Tổ/ }).getAttribute('href')).toBe('/teams');
  });
});

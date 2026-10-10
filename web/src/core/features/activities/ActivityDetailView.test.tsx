// web/src/core/features/activities/ActivityDetailView.test.tsx
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { cleanup, screen, within } from '@testing-library/react';
import { ActivityDetailView } from './ActivityDetailView';
import { makeDetail, renderInApp } from './testUtils';
import * as api from '../../api';

vi.mock('../../api', async () => {
  const actual = await vi.importActual<typeof import('../../api')>('../../api');
  return { ...actual, fetchActivityDetail: vi.fn() };
});

const show = () => renderInApp(<ActivityDetailView />, { path: '/activity/5', routePath: '/activity/:id' });

describe('ActivityDetailView — thông tin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  afterEach(cleanup);

  it('dịch trách nhiệm mặc định của server, giữ nguyên nội dung do người dùng nhập', async () => {
    const base = makeDetail();
    vi.mocked(api.fetchActivityDetail).mockResolvedValue(makeDetail({ activityTeams: [
      { ...base.activityTeams[0], responsibility: 'Coordinates the activity' },
      { ...base.activityTeams[1], responsibility: 'Supports the activity' },
      { ...base.activityTeams[1], team_id: 4, name: 'Hậu cần', responsibility: 'Phụ trách tiếp đón' },
    ] }));
    show();
    const teams = within(await screen.findByTestId('section-teams'));
    expect(teams.getByText('Điều phối hoạt động')).toBeDefined();
    expect(teams.getByText('Hỗ trợ hoạt động')).toBeDefined();
    expect(teams.getByText('Phụ trách tiếp đón')).toBeDefined();
  });

  it('DYC chỉ đọc thấy timeline nhưng không thấy form cập nhật', async () => {
    vi.mocked(api.fetchActivityDetail).mockResolvedValue(makeDetail({ canManage: true, updates: [
      { id: 1, kind: 'comment', body: 'Báo cáo', created_at: '2026-10-05', user_name: 'A', tagged_users: [] },
    ] }));
    renderInApp(<ActivityDetailView />, { role: 'admin',
      memberships: [{ unit_id: 9, code: 'DYC', name: 'DYC', kind: 'platform_owner', role: 'admin' }],
      currentUnit: { id: 9, code: 'DYC', name: 'DYC', kind: 'platform_owner' },
    });
    expect(await screen.findByText('Báo cáo')).toBeDefined();
    expect(screen.queryByRole('button', { name: 'Đăng cập nhật' })).toBeNull();
    expect(screen.queryByLabelText('Nội dung cập nhật')).toBeNull();
  });

  it('hiện phần đầu, thông tin chung, Tổ, người tham gia, chi tiết và lịch sử đề án', async () => {
    vi.mocked(api.fetchActivityDetail).mockResolvedValue(
      makeDetail({
        participants: [{ activity_id: 5, user_id: 21, state: 'confirmed', responsibility: 'Hậu cần', name: 'Phạm Hậu Cần', role: 'member' }],
        proposalHistory: [
          {
            id: 1,
            action: 'request_changes',
            submitter_name: 'Trần Người Tạo',
            reviewer_name: 'Quản trị A',
            feedback_notes: 'Bổ sung dự toán',
            created_at: '2026-10-02T03:00:00.000Z',
          },
        ],
      })
    );
    show();

    expect(await screen.findByRole('heading', { level: 1, name: 'Ngày hội Kỹ thuật' })).toBeDefined();
    expect(screen.getByText('Ngày hội giới thiệu các câu lạc bộ kỹ thuật.')).toBeDefined();
    expect(screen.getByText('Đề xuất')).toBeDefined();


    const info = within(screen.getByTestId('section-info'));
    expect(info.getByText('Ưu tiên')).toBeDefined();
    expect(info.getByText('Cao')).toBeDefined();
    expect(info.getByText('Tuyên huấn, Truyền thông')).toBeDefined();
    expect(info.getByText('01/11/2026 – 30/11/2026')).toBeDefined();
    expect(info.getByText('Hội trường A')).toBeDefined();
    expect(info.getByText('Trần Người Tạo')).toBeDefined();
    expect(info.getByText('Lê Trưởng BTC')).toBeDefined();
    expect(info.getByRole('link', { name: 'Mở link đề án' }).getAttribute('href')).toBe('https://drive.example/de-an');

    const teams = within(screen.getByTestId('section-teams'));
    expect(teams.getByText('Chủ trì')).toBeDefined();
    expect(teams.getByText('Hỗ trợ truyền thông')).toBeDefined();

    const people = within(screen.getByTestId('section-participants'));
    expect(people.getByText('Phạm Hậu Cần')).toBeDefined();
    expect(people.getByText('Đã xác nhận')).toBeDefined();
    expect(people.getByText('Hậu cần')).toBeDefined();

    const history = within(screen.getByTestId('section-history'));
    expect(history.getByText('Yêu cầu sửa')).toBeDefined();
    expect(history.getByText('Bổ sung dự toán')).toBeDefined();
    expect(history.getByText(/Quản trị A/)).toBeDefined();
  });

  it('link đề án không phải http(s) thì không thành thẻ a', async () => {
    vi.mocked(api.fetchActivityDetail).mockResolvedValue(makeDetail({ activity: { proposal_document_url: 'javascript:alert(1)' } }));
    show();
    await screen.findByRole('heading', { level: 1 });
    expect(screen.queryByRole('link', { name: 'Mở link đề án' })).toBeNull();
  });

  it('"Yêu cầu bởi" chỉ hiện với hoạt động chỉ đạo (assigned)', async () => {
    vi.mocked(api.fetchActivityDetail).mockResolvedValue(makeDetail({ activity: { type: 'assigned', requested_by: 'Ban Thường vụ' } }));
    show();
    await screen.findByRole('heading', { level: 1 });
    expect(within(screen.getByTestId('section-details')).getByText('Ban Thường vụ')).toBeDefined();
    cleanup();

    vi.mocked(api.fetchActivityDetail).mockResolvedValue(makeDetail({ activity: { type: 'event', requested_by: 'Ban Thường vụ' } }));
    show();
    await screen.findByRole('heading', { level: 1 });
    expect(within(screen.getByTestId('section-details')).queryByText('Ban Thường vụ')).toBeNull();
  });

  it('404 từ server hiện "Không tìm thấy hoạt động hoặc bạn không có quyền xem."', async () => {
    vi.mocked(api.fetchActivityDetail).mockRejectedValue({ response: { status: 404, data: { error: 'Activity not found.' } } });
    show();
    expect(await screen.findByText('Không tìm thấy hoạt động hoặc bạn không có quyền xem.')).toBeDefined();
    expect(screen.getByRole('link', { name: /Danh sách hoạt động/ }).getAttribute('href')).toBe('#/activities');
  });

  it('lỗi khác hiện câu lỗi tiếng Việt, mất mạng hiện "Không kết nối được máy chủ"', async () => {
    vi.mocked(api.fetchActivityDetail).mockRejectedValue(new Error('Network Error'));
    show();
    expect(await screen.findByText('Không kết nối được máy chủ. Vui lòng thử lại.')).toBeDefined();
  });

  it('id không hợp lệ không gọi API', async () => {
    renderInApp(<ActivityDetailView />, { path: '/activity/abc', routePath: '/activity/:id' });
    expect(await screen.findByText('Không tìm thấy hoạt động hoặc bạn không có quyền xem.')).toBeDefined();
    expect(api.fetchActivityDetail).not.toHaveBeenCalled();
  });

  it('hiện dòng thời gian cập nhật và form đăng cập nhật', async () => {
    vi.mocked(api.fetchActivityDetail).mockResolvedValue(
      makeDetail({
        updates: [{ id: 1, kind: 'progress', body: 'Đã in xong tờ rơi', created_at: '2026-10-05T03:00:00.000Z', user_name: 'Trần Người Tạo', tagged_users: [] }],
      })
    );
    show();
    expect(await screen.findByText('Đã in xong tờ rơi')).toBeDefined();
    expect(screen.getByRole('button', { name: 'Đăng cập nhật' })).toBeDefined();
  });

  it('admin thấy thanh duyệt; thành viên thường chỉ thấy đăng ký tham gia', async () => {
    vi.mocked(api.fetchActivityDetail).mockResolvedValue(makeDetail({ canManage: true }));
    renderInApp(<ActivityDetailView />, { path: '/activity/5', routePath: '/activity/:id', role: 'admin' });
    expect(await screen.findByRole('button', { name: 'Duyệt' })).toBeDefined();
    cleanup();

    vi.mocked(api.fetchActivityDetail).mockResolvedValue(makeDetail({ canManage: false }));
    renderInApp(<ActivityDetailView />, { path: '/activity/5', routePath: '/activity/:id', role: 'member' });
    expect(await screen.findByRole('button', { name: 'Đăng ký tham gia' })).toBeDefined();
    expect(screen.queryByRole('button', { name: 'Duyệt' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Xoá hoạt động' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Thêm người tham gia' })).toBeNull();
  });

  it('ActivityTaskActions: canManage true có Giao việc và Bảng Kanban, canManage false không có Giao việc', async () => {
    vi.mocked(api.fetchActivityDetail).mockResolvedValue(makeDetail({ canManage: true }));
    renderInApp(<ActivityDetailView />, { path: '/activity/5', routePath: '/activity/:id' });
    expect(await screen.findByRole('link', { name: 'Bảng Kanban' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Giao việc' })).toBeDefined();

    cleanup();
    vi.mocked(api.fetchActivityDetail).mockResolvedValue(makeDetail({ canManage: false }));
    renderInApp(<ActivityDetailView />, { path: '/activity/5', routePath: '/activity/:id' });
    expect(await screen.findByRole('link', { name: 'Bảng Kanban' })).toBeDefined();
    expect(screen.queryByRole('button', { name: 'Giao việc' })).toBeNull();
  });

  it('bấm tiêu đề một việc gọi open(task.id) của TaskModalContext', async () => {
    const openMock = vi.fn();
    vi.mocked(api.fetchActivityDetail).mockResolvedValue(
      makeDetail({
        tasks: [
          {
            id: 42,
            activity_id: 5,
            team_id: 2,
            title: 'Soạn slide báo cáo',
            stage: 'during',
            priority: 'medium',
            status: 'todo',
            start_date: null,
            deadline: '2026-11-20',
            deliverable: null,
            team_name: 'Tổ Sự kiện',
            assignee_name: null,
            primary_assignee_name: null,
            checklist_total: 0,
            checklist_done: 0,
          },
        ],
      })
    );

    const { TaskModalContext } = await import('../tasks/TaskModalProvider');
    const { fireEvent } = await import('@testing-library/react');
    renderInApp(
      <TaskModalContext.Provider value={{ open: openMock, close: vi.fn() }}>
        <ActivityDetailView />
      </TaskModalContext.Provider>,
      { path: '/activity/5', routePath: '/activity/:id' }
    );

    const taskBtn = await screen.findByRole('button', { name: 'Soạn slide báo cáo' });
    fireEvent.click(taskBtn);
    expect(openMock).toHaveBeenCalledWith(42);
  });
});

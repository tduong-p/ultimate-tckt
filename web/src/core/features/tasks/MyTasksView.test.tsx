import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup, within, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MyTasksView } from './MyTasksView';
import * as api from '../../api';
import { ToastProvider } from '../../../shared/components/Toast';
import { TaskModalContext } from './TaskModalProvider';

vi.mock('../../api', async () => {
  const actual = await vi.importActual('../../api');
  return {
    ...actual,
    fetchMyTasksToday: vi.fn(),
    fetchBootstrap: vi.fn(),
  };
});

const mockTasksData: api.MyTasksTodayResponse = {
  dueToday: [
    {
      id: 201,
      activity_id: 1,
      team_id: 2,
      title: 'Soạn báo cáo tháng',
      status: 'in_progress',
      priority: 'high',
      deadline: '2026-10-08T17:00:00Z',
      activity_title: 'Đại hội Chi đoàn',
      team_name: 'Tổ chức và Phát triển Đoàn',
      assignee_name: 'Nguyễn Văn A',
    },
  ],
  overdue: [
    {
      id: 202,
      activity_id: 1,
      team_id: 2,
      title: 'Kiểm tra danh sách đoàn viên',
      status: 'todo',
      priority: 'urgent',
      deadline: '2026-10-01T17:00:00Z',
      activity_title: 'Đại hội Chi đoàn',
      team_name: 'Tổ chức và Phát triển Đoàn',
      assignee_name: 'Trần Thị B',
    },
  ],
  pendingMyReview: [
    {
      id: 203,
      activity_id: 2,
      team_id: 4,
      title: 'Duyệt bài tuyên truyền',
      status: 'review',
      priority: 'medium',
      deadline: '2026-10-09T12:00:00Z',
      activity_title: 'Kỷ niệm ngày truyền thống',
      team_name: 'Tuyên giáo - Truyền thông',
      assignee_name: 'Lê Văn C',
    },
  ],
};

const bootstrapWithTasks = (tasks: api.TaskItem[]): api.BootstrapData => ({
  stats: { activeActivities: 0, openTasks: tasks.length, overdueTasks: 0, completedMonth: 0 },
  upcoming: [],
  tasks,
  activity: [],
  teams: [],
  capabilities: { canCreateActivity: false, canCreateAccount: false },
});

const daysFromToday = (n: number): string => {
  const d = new Date(Date.now() + n * 86400000);
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(d);
};

describe('MyTasksView', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
    vi.mocked(api.fetchMyTasksToday).mockResolvedValue({
      dueToday: [],
      overdue: [],
      pendingMyReview: [],
    });
    vi.mocked(api.fetchBootstrap).mockResolvedValue(bootstrapWithTasks([]));
  });

  afterEach(() => {
    cleanup();
  });

  const renderWithClient = (ui: React.ReactElement) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <ToastProvider>{ui}</ToastProvider>
      </QueryClientProvider>
    );
  };

  it('renders page header title and subtitle', () => {
    renderWithClient(<MyTasksView />);
    expect(screen.getByText('Công việc của tôi')).toBeDefined();
    expect(screen.getByText('Công việc được giao cho bạn và các Tổ của bạn.')).toBeDefined();
  });

  it('renders open tasks card with counter pill', async () => {
    renderWithClient(<MyTasksView />);
    expect(await screen.findByText('Công việc đang mở')).toBeDefined();
    expect(screen.getByText('0 Công Việc')).toBeDefined();
  });

  it('renders empty state messages', async () => {
    const { container } = renderWithClient(<MyTasksView />);
    expect(await screen.findByText('Bạn đã hoàn thành tất cả')).toBeDefined();
    expect(screen.getByText('Không có công việc đang mở trong danh sách.')).toBeDefined();

    // STRICT RULE: No checkbox icon or TaskIcon in empty states
    expect(container.querySelector('[data-testid="task-icon"]')).toBeNull();
    expect(container.querySelector('input[type="checkbox"]')).toBeNull();
  });

  it('renders list of open tasks when returned from API', async () => {
    vi.mocked(api.fetchMyTasksToday).mockResolvedValue(mockTasksData);
    vi.mocked(api.fetchBootstrap).mockResolvedValue(
      bootstrapWithTasks([...mockTasksData.dueToday, ...mockTasksData.overdue])
    );
    renderWithClient(<MyTasksView />);

    expect(await screen.findByText('3 Công Việc')).toBeDefined();
    expect(screen.getByText('Soạn báo cáo tháng')).toBeDefined();
    expect(screen.getByText('Kiểm tra danh sách đoàn viên')).toBeDefined();
    expect(screen.getByText('Duyệt bài tuyên truyền')).toBeDefined();
  });

  it('hiển thị hạn theo ngày Việt Nam và nhãn đúng cho trạng thái open của Core', async () => {
    vi.mocked(api.fetchBootstrap).mockResolvedValue(
      bootstrapWithTasks([
        {
          id: 201,
          activity_id: 1,
          team_id: 2,
          title: 'Việc mới giao',
          status: 'open',
          priority: 'medium',
          deadline: '2026-10-08T17:00:00.000Z',
        },
      ])
    );
    renderWithClient(<MyTasksView />);

    expect(await screen.findByText('Việc mới giao')).toBeDefined();
    expect(screen.getByText(/Hạn: 09\/10\/2026/)).toBeDefined();
    expect(screen.getByText(/Cần làm/i)).toBeDefined();
  });

  it('hiện cả việc có hạn tuần sau trong nhóm Sắp tới và không báo đã hoàn thành tất cả', async () => {
    vi.mocked(api.fetchBootstrap).mockResolvedValue(
      bootstrapWithTasks([
        {
          id: 301,
          activity_id: 1,
          team_id: 2,
          title: 'Việc hạn tuần sau',
          status: 'in_progress',
          priority: 'low',
          deadline: daysFromToday(7),
        },
        {
          id: 302,
          activity_id: 1,
          team_id: 2,
          title: 'Việc đã trễ',
          status: 'open',
          priority: 'urgent',
          deadline: daysFromToday(-3),
        },
      ])
    );
    renderWithClient(<MyTasksView />);

    expect(await screen.findByText('Việc hạn tuần sau')).toBeDefined();
    expect(screen.getByText('2 Công Việc')).toBeDefined();
    expect(screen.queryByText('Bạn đã hoàn thành tất cả')).toBeNull();

    const upcoming = screen.getByRole('region', { name: 'Sắp tới' });
    expect(within(upcoming).getByText('Việc hạn tuần sau')).toBeDefined();
    expect(within(upcoming).queryByText('Việc đã trễ')).toBeNull();
    const overdue = screen.getByRole('region', { name: 'Quá hạn' });
    expect(within(overdue).getByText('Việc đã trễ')).toBeDefined();
  });

  it('hiện mức ưu tiên bằng tiếng Việt', async () => {
    vi.mocked(api.fetchBootstrap).mockResolvedValue(
      bootstrapWithTasks([
        { id: 401, activity_id: 1, team_id: 2, title: 'Việc gấp', status: 'open', priority: 'urgent', deadline: daysFromToday(2) },
      ])
    );
    renderWithClient(<MyTasksView />);
    expect(await screen.findByText('Khẩn cấp')).toBeDefined();
    expect(screen.queryByText('urgent')).toBeNull();
  });

  it('hiện nút vòng đời: Nộp nghiệm thu cho việc đang làm, Duyệt đạt chỉ ở nhóm chờ bạn duyệt', async () => {
    vi.mocked(api.fetchMyTasksToday).mockResolvedValue(mockTasksData);
    vi.mocked(api.fetchBootstrap).mockResolvedValue(bootstrapWithTasks([...mockTasksData.dueToday, ...mockTasksData.overdue]));
    renderWithClient(<MyTasksView />);

    const today = await screen.findByRole('region', { name: 'Hôm nay' });
    expect(within(today).getByRole('button', { name: 'Nộp nghiệm thu' })).toBeDefined();
    const overdue = screen.getByRole('region', { name: 'Quá hạn' });
    expect(within(overdue).getByRole('button', { name: 'Bắt đầu làm' })).toBeDefined();
    const review = screen.getByRole('region', { name: 'Chờ bạn duyệt' });
    expect(within(review).getByRole('button', { name: 'Duyệt đạt' })).toBeDefined();
    expect(within(today).queryByRole('button', { name: 'Duyệt đạt' })).toBeNull();
  });

  it('bấm tiêu đề công việc mở hộp chi tiết', async () => {
    const open = vi.fn();
    vi.mocked(api.fetchBootstrap).mockResolvedValue({
      stats: {} as never,
      upcoming: [],
      tasks: [{ id: 201, activity_id: 1, team_id: 2, title: 'Soạn báo cáo tháng', status: 'in_progress', priority: 'high', deadline: '2099-01-01', assignee_ids: '7' }],
      activity: [],
      teams: [],
      capabilities: { canCreateActivity: false, canCreateAccount: false },
    });
    vi.mocked(api.fetchMyTasksToday).mockResolvedValue({ dueToday: [], overdue: [], pendingMyReview: [] });
    renderWithClient(
      <TaskModalContext.Provider value={{ open, close: vi.fn() }}>
        <MyTasksView />
      </TaskModalContext.Provider>
    );
    fireEvent.click(await screen.findByRole('button', { name: 'Soạn báo cáo tháng' }));
    expect(open).toHaveBeenCalledWith(201);
  });
});


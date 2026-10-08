import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MyTasksView } from './MyTasksView';
import * as api from '../../api';

vi.mock('../../api', async () => {
  const actual = await vi.importActual('../../api');
  return {
    ...actual,
    fetchMyTasksToday: vi.fn(),
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
  });

  afterEach(() => {
    cleanup();
  });

  const renderWithClient = (ui: React.ReactElement) => {
    return render(
      <QueryClientProvider client={queryClient}>
        {ui}
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
    renderWithClient(<MyTasksView />);

    expect(await screen.findByText('3 Công Việc')).toBeDefined();
    expect(screen.getByText('Soạn báo cáo tháng')).toBeDefined();
    expect(screen.getByText('Kiểm tra danh sách đoàn viên')).toBeDefined();
    expect(screen.getByText('Duyệt bài tuyên truyền')).toBeDefined();
  });

  it('hiển thị hạn theo ngày Việt Nam và nhãn đúng cho trạng thái open của Core', async () => {
    vi.mocked(api.fetchMyTasksToday).mockResolvedValue({
      dueToday: [
        {
          id: 201,
          activity_id: 1,
          team_id: 2,
          title: 'Việc mới giao',
          status: 'open',
          priority: 'medium',
          deadline: '2026-10-08T17:00:00.000Z',
        },
      ],
      overdue: [],
      pendingMyReview: [],
    });
    renderWithClient(<MyTasksView />);

    expect(await screen.findByText('Việc mới giao')).toBeDefined();
    expect(screen.getByText(/Hạn: 09\/10\/2026/)).toBeDefined();
    expect(screen.getByText(/Cần làm/i)).toBeDefined();
  });
});

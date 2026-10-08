import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MyTasksToday } from './MyTasksToday';
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
      id: 101,
      activity_id: 1,
      team_id: 2,
      title: 'Chuẩn bị phòng họp Đại hội chi đoàn',
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
      id: 102,
      activity_id: 1,
      team_id: 2,
      title: 'Báo cáo chi đoàn tháng 9',
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
      id: 103,
      activity_id: 2,
      team_id: 4,
      title: 'Duyệt bài đăng kỷ niệm ngày truyền thống',
      status: 'review',
      priority: 'medium',
      deadline: '2026-10-09T12:00:00Z',
      activity_title: 'Kỷ niệm ngày truyền thống',
      team_name: 'Tuyên giáo - Truyền thông',
      assignee_name: 'Lê Văn C',
    },
  ],
};

describe('MyTasksToday', () => {
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

  it('renders the page title and subtitle', () => {
    renderWithClient(<MyTasksToday />);
    expect(screen.getByText('Công việc hôm nay')).toBeDefined();
    expect(screen.getByText('Công việc đến hạn hôm nay, quá hạn, hoặc đang chờ bạn duyệt.')).toBeDefined();
  });

  it('renders both empty cards for due today and overdue', async () => {
    const { container } = renderWithClient(<MyTasksToday />);
    expect(await screen.findByText('Đến hạn hôm nay')).toBeDefined();
    expect(screen.getByText('Không có việc đến hạn hôm nay')).toBeDefined();
    expect(screen.getByText('Quá hạn')).toBeDefined();
    expect(screen.getByText('Không có việc quá hạn')).toBeDefined();
    expect(screen.getByText('Chờ duyệt')).toBeDefined();
    expect(screen.getByText('Không có việc chờ duyệt')).toBeDefined();

    // STRICT RULE: No checkbox icon or TaskIcon in empty states
    expect(container.querySelector('[data-testid="task-icon"]')).toBeNull();
    expect(container.querySelector('input[type="checkbox"]')).toBeNull();
  });

  it('renders tasks when fetchMyTasksToday returns items', async () => {
    vi.mocked(api.fetchMyTasksToday).mockResolvedValue(mockTasksData);
    renderWithClient(<MyTasksToday />);

    expect(await screen.findByText('Chuẩn bị phòng họp Đại hội chi đoàn')).toBeDefined();
    expect(screen.getByText('Báo cáo chi đoàn tháng 9')).toBeDefined();
    expect(screen.getByText('Duyệt bài đăng kỷ niệm ngày truyền thống')).toBeDefined();
  });
});

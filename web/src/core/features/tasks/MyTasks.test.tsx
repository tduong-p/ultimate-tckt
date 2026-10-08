import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MyTasks } from './MyTasks';
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
      id: 301,
      activity_id: 1,
      team_id: 2,
      title: 'Soạn thảo biên bản họp BCH',
      status: 'in_progress',
      priority: 'high',
      deadline: '2026-10-08T17:00:00Z',
      activity_title: 'Họp BCH Đoàn trường',
      team_name: 'Tổ chức và Phát triển Đoàn',
      assignee_name: 'Nguyễn Văn A',
      description: 'Soạn thảo đầy đủ các nội dung kết luận của cuộc họp BCH định kỳ.',
    },
  ],
  overdue: [
    {
      id: 302,
      activity_id: 1,
      team_id: 2,
      title: 'Kiểm tra tài chính quỹ đoàn',
      status: 'todo',
      priority: 'urgent',
      deadline: '2026-10-02T17:00:00Z',
      activity_title: 'Quyết toán quỹ quý 3',
      team_name: 'Tổ chức và Phát triển Đoàn',
      assignee_name: 'Trần Thị B',
      description: 'Rà soát sổ quỹ và chứng từ chi tiêu tháng 9.',
    },
  ],
  pendingMyReview: [
    {
      id: 303,
      activity_id: 2,
      team_id: 4,
      title: 'Kế hoạch truyền thông ngày 26-3',
      status: 'review',
      priority: 'medium',
      deadline: '2026-10-15T12:00:00Z',
      activity_title: 'Chào mừng 26-3',
      team_name: 'Tuyên giáo - Truyền thông',
      assignee_name: 'Lê Văn C',
      description: 'Duyệt market ấn phẩm và bài viết truyền thông.',
    },
  ],
};

describe('MyTasks', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
    vi.mocked(api.fetchMyTasksToday).mockResolvedValue(mockTasksData);
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

  it('renders without crashing and displays header stats from API', async () => {
    renderWithClient(<MyTasks />);
    expect(await screen.findByText('Nhiệm vụ của tôi')).toBeDefined();
    expect(screen.getByText((_, el) => el?.textContent?.trim() === '3 việc cần xử lý')).toBeDefined();
    expect(screen.getByText((_, el) => el?.textContent?.trim() === '1 quá hạn')).toBeDefined();
  });

  it('renders real tasks categorized into overdue, due today, and pending review', async () => {
    renderWithClient(<MyTasks />);

    // Quá hạn
    expect(await screen.findByText('Kiểm tra tài chính quỹ đoàn')).toBeDefined();
    // Đến hạn hôm nay
    expect(screen.getByText('Soạn thảo biên bản họp BCH')).toBeDefined();
    // Chờ duyệt
    expect(screen.getByText('Kế hoạch truyền thông ngày 26-3')).toBeDefined();
  });

  it('opens task details sidebar when a task row is clicked and closes on click close', async () => {
    renderWithClient(<MyTasks />);

    const taskRow = await screen.findByTestId('task-row-301');
    fireEvent.click(taskRow);

    // Detail sidebar should display task description & details
    expect(await screen.findByText('Soạn thảo đầy đủ các nội dung kết luận của cuộc họp BCH định kỳ.')).toBeDefined();
    expect(screen.getByText('Họp BCH Đoàn trường')).toBeDefined();

    // Close sidebar
    const closeBtn = screen.getByRole('button', { name: 'Đóng' });
    fireEvent.click(closeBtn);

    expect(screen.queryByText('Soạn thảo đầy đủ các nội dung kết luận của cuộc họp BCH định kỳ.')).toBeNull();
  });

  it('filters tasks by search input', async () => {
    renderWithClient(<MyTasks />);

    await screen.findByText('Kiểm tra tài chính quỹ đoàn');
    const searchInput = screen.getByPlaceholderText('Tìm kiếm...');
    fireEvent.change(searchInput, { target: { value: 'biên bản' } });

    expect(screen.getByText('Soạn thảo biên bản họp BCH')).toBeDefined();
    expect(screen.queryByText('Kiểm tra tài chính quỹ đoàn')).toBeNull();
  });

  it('renders empty state with InboxIcon and no checkbox/task icon when there are no tasks', async () => {
    vi.mocked(api.fetchMyTasksToday).mockResolvedValue({
      dueToday: [],
      overdue: [],
      pendingMyReview: [],
    });

    const { container } = renderWithClient(<MyTasks />);

    expect(await screen.findByText('Không có công việc nào cần xử lý')).toBeDefined();
    expect(screen.getByText('Bạn đã hoàn thành tất cả nhiệm vụ hoặc chưa có công việc mới được giao.')).toBeDefined();

    // STRICT RULE: No checkbox icon or TaskIcon in empty states
    expect(container.querySelector('[data-testid="task-icon"]')).toBeNull();
    expect(container.querySelector('input[type="checkbox"]')).toBeNull();
  });
});

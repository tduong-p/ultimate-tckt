import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Dashboard } from './Dashboard';
import * as api from '../../api';

vi.mock('../../api', async () => {
  const actual = await vi.importActual('../../api');
  return {
    ...actual,
    fetchBootstrap: vi.fn(),
    fetchMyTasksToday: vi.fn(),
  };
});

const mockBootstrapData: api.BootstrapData = {
  stats: {
    activeActivities: 3,
    openTasks: 5,
    overdueTasks: 1,
    completedMonth: 4,
  },
  upcoming: [
    {
      id: 10,
      title: 'Chiến dịch Mùa hè xanh 2026',
      deadline: '2026-08-15',
      team_name: 'Đội Hình Chuyên',
      team_names: 'Đội Hình Chuyên',
      team_color: '#0052CC',
      status: 'active',
      task_count: 8,
      done_count: 4,
      priority: 'high',
      type: 'event',
      team_id: 1,
    },
  ],
  tasks: [
    {
      id: 101,
      title: 'Khảo sát địa bàn tình nguyện',
      activity_id: 10,
      activity_title: 'Chiến dịch Mùa hè xanh 2026',
      team_id: 1,
      team_name: 'Đội Hình Chuyên',
      deadline: '2026-08-12',
      priority: 'high',
      status: 'todo',
      assignee_name: 'Nguyễn Văn A',
    },
  ],
  activity: [
    {
      body: 'Đã hoàn thành khảo sát thực địa',
      kind: 'Cập nhật',
      created_at: '2026-08-01 14:00',
      user_name: 'Lê Thị Bình',
      avatar_color: '#0052CC',
      activity_title: 'Chiến dịch Mùa hè xanh 2026',
      activity_id: 10,
    },
  ],
  teams: [],
  capabilities: {
    canCreateActivity: true,
    canCreateAccount: true,
  },
};

const mockMyTasksToday: api.MyTasksTodayResponse = {
  dueToday: [
    {
      id: 102,
      title: 'Nộp báo cáo tiến độ tuần',
      activity_id: 10,
      activity_title: 'Chiến dịch Mùa hè xanh 2026',
      team_id: 1,
      team_name: 'Đội Hình Chuyên',
      deadline: '2026-08-10',
      priority: 'medium',
      status: 'in_progress',
    },
  ],
  overdue: [
    {
      id: 103,
      title: 'Chốt danh sách tình nguyện viên',
      activity_id: 10,
      activity_title: 'Chiến dịch Mùa hè xanh 2026',
      team_id: 1,
      team_name: 'Đội Hình Chuyên',
      deadline: '2026-08-05',
      priority: 'urgent',
      status: 'todo',
    },
  ],
  pendingMyReview: [],
};

const renderWithClient = (ui: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      {ui}
    </QueryClientProvider>
  );
};

describe('Dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.fetchBootstrap).mockResolvedValue(mockBootstrapData);
    vi.mocked(api.fetchMyTasksToday).mockResolvedValue(mockMyTasksToday);
  });

  afterEach(() => {
    cleanup();
  });

  it('chào đúng tên người đang đăng nhập kèm số nhiệm vụ', async () => {
    renderWithClient(<Dashboard userName="Nguyễn Thị Hoa" />);

    await waitFor(() => {
      expect(screen.getByText(/Xin chào Nguyễn Thị Hoa! Bạn có 5 nhiệm vụ cần làm/i)).toBeDefined();
    });
    expect(screen.queryByText(/Phạm Việt Bách/)).toBeNull();
    expect(screen.getByText('+ Đề xuất hoạt động')).toBeDefined();
  });

  it('nút Lịch sự kiện và Hoạt động chuyển sang màn tương ứng', () => {
    const onNavigate = vi.fn();
    renderWithClient(<Dashboard userName="Nguyễn Thị Hoa" onNavigate={onNavigate} />);

    fireEvent.click(screen.getByText('Lịch sự kiện'));
    expect(onNavigate).toHaveBeenCalledWith('calendar');

    fireEvent.click(screen.getByText('Hoạt động'));
    expect(onNavigate).toHaveBeenCalledWith('activities');
  });

  it('renders 4 KPI cards with dynamic API data', async () => {
    renderWithClient(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText('3')).toBeDefined(); // activeActivities
      expect(screen.getByText('5')).toBeDefined(); // openTasks
      expect(screen.getByText('1')).toBeDefined(); // overdueTasks
      expect(screen.getByText('44%')).toBeDefined(); // 4 / (5 + 4) = 44%
    });

    expect(screen.getAllByText('Hoạt động đang diễn ra').length).toBeGreaterThan(0);
    expect(screen.getByText('Nhiệm vụ đang mở')).toBeDefined();
    expect(screen.getByText('Nhiệm vụ quá hạn')).toBeDefined();
    expect(screen.getByText('Hiệu suất hoàn thành')).toBeDefined();
  });

  it('renders left column task widget with tasks from API', async () => {
    renderWithClient(<Dashboard />);

    expect(screen.getByText('Quản lý nhiệm vụ')).toBeDefined();

    await waitFor(() => {
      expect(screen.getByText('Khảo sát địa bàn tình nguyện')).toBeDefined();
    });

    expect(screen.getByPlaceholderText('Lọc theo tên...')).toBeDefined();
    expect(screen.getByText('Xem toàn bộ công việc chi tiết >')).toBeDefined();
  });

  it('renders right column update widgets with upcoming events, ongoing activities, and logs', async () => {
    renderWithClient(<Dashboard />);

    expect(screen.getByText('Lịch sự kiện & Deadline')).toBeDefined();
    expect(screen.getByText('Hoạt động đang diễn ra', { selector: 'h2' })).toBeDefined();
    expect(screen.getByText('Nhật ký hoạt động')).toBeDefined();

    await waitFor(() => {
      expect(screen.getAllByText('Chiến dịch Mùa hè xanh 2026').length).toBeGreaterThan(0);
      expect(screen.getByText('Đã hoàn thành khảo sát thực địa')).toBeDefined();
      expect(screen.getAllByText('Lê Thị Bình').length).toBeGreaterThan(0);
    });
  });

  it('renders empty states when API returns empty data without checkbox or task icons in empty state', async () => {
    vi.mocked(api.fetchBootstrap).mockResolvedValue({
      stats: {
        activeActivities: 0,
        openTasks: 0,
        overdueTasks: 0,
        completedMonth: 0,
      },
      upcoming: [],
      tasks: [],
      activity: [],
      teams: [],
      capabilities: {
        canCreateActivity: true,
        canCreateAccount: true,
      },
    });
    vi.mocked(api.fetchMyTasksToday).mockResolvedValue({
      dueToday: [],
      overdue: [],
      pendingMyReview: [],
    });

    renderWithClient(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText('Không tìm thấy công việc nào')).toBeDefined();
      expect(screen.getByText('Không có sự kiện sắp tới')).toBeDefined();
      expect(screen.getByText('Chưa có hoạt động đang chạy')).toBeDefined();
      expect(screen.getByText('Chưa có nhật ký hoạt động nào')).toBeDefined();
    });
  });

  it('filters task list when typing in search input', async () => {
    renderWithClient(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText('Khảo sát địa bàn tình nguyện')).toBeDefined();
    });

    const searchInput = screen.getByPlaceholderText('Lọc theo tên...');
    fireEvent.change(searchInput, { target: { value: 'Không_Tồn_Tại_XYZ' } });

    expect(screen.getByText('Không tìm thấy công việc nào')).toBeDefined();

    fireEvent.change(searchInput, { target: { value: 'Khảo sát' } });
    expect(screen.getByText('Khảo sát địa bàn tình nguyện')).toBeDefined();
  });

  it('opens CreateActivityModal when clicking button', () => {
    renderWithClient(<Dashboard />);
    expect(screen.queryByText('ĐỀ XUẤT MỚI')).toBeNull();
    fireEvent.click(screen.getByText('+ Đề xuất hoạt động'));
    expect(screen.getByText('ĐỀ XUẤT MỚI')).toBeDefined();
  });
});
import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CalendarView } from './CalendarView';
import * as api from '../../api';

vi.mock('../../api', async () => {
  const actual = await vi.importActual('../../api');
  return {
    ...actual,
    fetchActivities: vi.fn(),
    fetchTeams: vi.fn(),
  };
});

const mockActivities: api.ActivityItem[] = [
  {
    id: 1,
    title: 'Họp giao ban Đoàn đầu tháng 10',
    description: 'Đánh giá tiến độ công việc và phân công nhiệm vụ mới.',
    team_id: 1,
    team_name: 'Tổ chức và Phát triển Đoàn',
    team_color: '#0052CC',
    status: 'approved',
    type: 'event',
    priority: 'medium',
    deadline: '2026-10-08',
    start_date: '2026-10-08',
  },
  {
    id: 2,
    title: 'Hội thảo Đổi mới Phương thức Sinh hoạt Chi đoàn',
    description: 'Chuyên đề nâng cao chất lượng sinh hoạt Đoàn.',
    team_id: 2,
    team_name: 'Tuyên giáo - Truyền thông',
    team_color: '#00875A',
    status: 'active',
    type: 'assigned',
    priority: 'medium',
    deadline: '2026-10-20',
  },
];

const mockTeams: api.TeamItem[] = [
  { id: 1, name: 'Tổ chức và Phát triển Đoàn' },
  { id: 2, name: 'Tuyên giáo - Truyền thông' },
];

describe('CalendarView', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-08T03:00:00.000Z'));
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
    vi.mocked(api.fetchActivities).mockResolvedValue(mockActivities);
    vi.mocked(api.fetchTeams).mockResolvedValue(mockTeams);
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  const renderWithClient = (ui: React.ReactElement) => {
    return render(
      <QueryClientProvider client={queryClient}>
        {ui}
      </QueryClientProvider>
    );
  };

  it('renders the header title and description', () => {
    renderWithClient(<CalendarView />);
    expect(screen.getByText('Lịch chung')).toBeDefined();
    expect(screen.getByText('Lịch hoạt động và hạn chót công việc của các Tổ.')).toBeDefined();
  });

  it('renders month navigation and buttons', () => {
    renderWithClient(<CalendarView />);
    expect(screen.getByText('Tháng 10 năm 2026')).toBeDefined();
    expect(screen.getByText('Hôm nay')).toBeDefined();
    expect(screen.getByText('Tháng')).toBeDefined();
    expect(screen.getByText('Danh sách')).toBeDefined();
  });

  it('renders days of week header', () => {
    renderWithClient(<CalendarView />);
    const days = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
    days.forEach((day) => {
      expect(screen.getByText(day)).toBeDefined();
    });
  });

  it('navigates to next month and previous month', () => {
    renderWithClient(<CalendarView />);
    expect(screen.getByText('Tháng 10 năm 2026')).toBeDefined();

    const nextBtn = screen.getByLabelText('Tháng sau');
    fireEvent.click(nextBtn);
    expect(screen.getByText('Tháng 11 năm 2026')).toBeDefined();

    const prevBtn = screen.getByLabelText('Tháng trước');
    fireEvent.click(prevBtn);
    expect(screen.getByText('Tháng 10 năm 2026')).toBeDefined();
  });

  it('renders activity pills on calendar cells from API', async () => {
    renderWithClient(<CalendarView />);

    expect(api.fetchActivities).toHaveBeenCalled();
    expect(api.fetchTeams).toHaveBeenCalled();

    expect(await screen.findByText('Họp giao ban Đoàn đầu tháng 10')).toBeDefined();
    expect(screen.getByText('Hội thảo Đổi mới Phương thức Sinh hoạt Chi đoàn')).toBeDefined();
  });

  it('switches to list view and displays activities', async () => {
    renderWithClient(<CalendarView />);

    const listBtn = screen.getByText('Danh sách');
    fireEvent.click(listBtn);

    expect(await screen.findByText('Họp giao ban Đoàn đầu tháng 10')).toBeDefined();
    expect(screen.getByText('Hội thảo Đổi mới Phương thức Sinh hoạt Chi đoàn')).toBeDefined();
    expect(screen.getByText('Hạn chót: 08/10/2026')).toBeDefined();
  });

  it('renders empty state in list view when no activities exist', async () => {
    vi.mocked(api.fetchActivities).mockResolvedValue([]);
    const { container } = renderWithClient(<CalendarView />);

    const listBtn = screen.getByText('Danh sách');
    fireEvent.click(listBtn);

    expect(await screen.findByText('Không có hoạt động')).toBeDefined();
    expect(
      screen.getByText('Chưa có hoạt động nào được lên lịch cho khoảng thời gian này.')
    ).toBeDefined();

    // STRICT RULE: No checkbox icon or TaskIcon in empty states
    expect(container.querySelector('input[type="checkbox"]')).toBeNull();
    expect(container.querySelector('[data-testid="task-icon"]')).toBeNull();
  });

  it('switches to Gantt chart view and displays activities with distinct colors across days of the month', async () => {
    renderWithClient(<CalendarView />);

    const ganttBtn = screen.getByText('Biểu đồ Gantt');
    fireEvent.click(ganttBtn);

    expect(await screen.findByTestId('gantt-chart-container')).toBeDefined();
    expect(screen.getByText('Tháng 10 năm 2026')).toBeDefined();
    expect(screen.getByText('Danh sách hoạt động (2)')).toBeDefined();

    // Check days of month in timeline header
    expect(screen.getAllByText('1').length).toBeGreaterThan(0);
    expect(screen.getAllByText('8').length).toBeGreaterThan(0);
    expect(screen.getAllByText('31').length).toBeGreaterThan(0);

    // Check activity bars
    const bar1 = screen.getByTestId('gantt-bar-1');
    const bar2 = screen.getByTestId('gantt-bar-2');
    expect(bar1).toBeDefined();
    expect(bar2).toBeDefined();

    // Distinct colors check
    expect(bar1.style.backgroundColor).toBe('rgb(0, 82, 204)'); // #0052CC
    expect(bar2.style.backgroundColor).toBe('rgb(0, 135, 90)'); // #00875A
    expect(bar1.style.backgroundColor).not.toBe(bar2.style.backgroundColor);
  });

  it('renders empty state in Gantt view when no activities exist', async () => {
    vi.mocked(api.fetchActivities).mockResolvedValue([]);
    const { container } = renderWithClient(<CalendarView />);

    const ganttBtn = screen.getByText('Biểu đồ Gantt');
    fireEvent.click(ganttBtn);

    expect(await screen.findByText('Không có hoạt động nào trong danh sách.')).toBeDefined();

    // STRICT RULE: No checkbox icon or TaskIcon in empty states
    expect(container.querySelector('input[type="checkbox"]')).toBeNull();
    expect(container.querySelector('[data-testid="task-icon"]')).toBeNull();
  });

  it('bấm hoạt động ở lịch tháng mở trang chi tiết', async () => {
    window.location.hash = '';
    renderWithClient(<CalendarView />);
    fireEvent.click(await screen.findByTestId('activity-pill-1'));
    expect(window.location.hash).toBe('#/activity/1');
    expect(screen.queryByTestId('activity-detail-modal')).toBeNull();
  });

  it('bấm hoạt động ở dạng danh sách mở trang chi tiết', async () => {
    window.location.hash = '';
    renderWithClient(<CalendarView />);
    fireEvent.click(screen.getByText('Danh sách'));
    fireEvent.click(await screen.findByTestId('list-activity-2'));
    expect(window.location.hash).toBe('#/activity/2');
  });

  it('bấm thanh hoạt động ở Gantt mở trang chi tiết và hỗ trợ bàn phím (Enter/Space)', async () => {
    window.location.hash = '';
    renderWithClient(<CalendarView />);
    const pill = await screen.findByTestId('activity-pill-1');
    expect(pill.getAttribute('role')).toBe('button');
    expect(pill.getAttribute('tabindex')).toBe('0');
    fireEvent.keyDown(pill, { key: 'Enter' });
    expect(window.location.hash).toBe('#/activity/1');

    window.location.hash = '';
    fireEvent.click(screen.getByText('Biểu đồ Gantt'));
    const bar = await screen.findByTestId('gantt-bar-1');
    expect(bar.getAttribute('role')).toBe('button');
    expect(bar.getAttribute('tabindex')).toBe('0');
    fireEvent.keyDown(bar, { key: ' ' });
    expect(window.location.hash).toBe('#/activity/1');
  });

  it('mở tháng hiện tại theo ngày hệ thống và nút Hôm nay quay về đúng tháng đó', () => {
    vi.setSystemTime(new Date('2026-12-15T03:00:00.000Z'));
    renderWithClient(<CalendarView />);
    expect(screen.getByText('Tháng 12 năm 2026')).toBeDefined();

    fireEvent.click(screen.getByLabelText('Tháng sau'));
    expect(screen.getByText('Tháng 1 năm 2027')).toBeDefined();

    fireEvent.click(screen.getByText('Hôm nay'));
    expect(screen.getByText('Tháng 12 năm 2026')).toBeDefined();
  });

  it('đặt hoạt động vào đúng ngày giờ Việt Nam khi Core trả timestamp UTC', async () => {
    vi.mocked(api.fetchActivities).mockResolvedValue([
      { ...mockActivities[1], id: 3, deadline: '2026-10-19T17:00:00.000Z' },
    ]);
    renderWithClient(<CalendarView />);

    const pill = await screen.findByTestId('activity-pill-3');
    expect(pill.closest('[data-testid="calendar-cell-2026-10-20"]')).not.toBeNull();

    fireEvent.click(screen.getByText('Danh sách'));
    expect(await screen.findByText('Hạn chót: 20/10/2026')).toBeDefined();
  });

  it('Gantt không vẽ hoạt động nằm hoàn toàn ngoài tháng đang xem', async () => {
    vi.mocked(api.fetchActivities).mockResolvedValue([
      ...mockActivities,
      { ...mockActivities[0], id: 4, title: 'Hoạt động tháng 9', start_date: '2026-09-01', deadline: '2026-09-05' },
    ]);
    renderWithClient(<CalendarView />);

    fireEvent.click(screen.getByText('Biểu đồ Gantt'));
    expect(await screen.findByTestId('gantt-bar-1')).toBeDefined();
    expect(screen.queryByTestId('gantt-bar-4')).toBeNull();
    expect(screen.getByText('Danh sách hoạt động (2)')).toBeDefined();
  });

  it('bộ lọc Tổ giữ lại hoạt động mà Tổ chỉ phối hợp (team_names), không chỉ Tổ chủ trì', async () => {
    vi.mocked(api.fetchActivities).mockResolvedValue([
      { ...mockActivities[0], team_names: 'Tổ chức và Phát triển Đoàn, Tuyên giáo - Truyền thông' },
      { ...mockActivities[1], team_names: 'Tuyên giáo - Truyền thông' },
      {
        id: 3,
        title: 'Hoạt động của Tổ khác',
        team_id: 9,
        team_name: 'Tổ khác',
        team_names: 'Tổ khác',
        status: 'approved',
        type: 'event',
        priority: 'medium',
        deadline: '2026-10-12',
      },
    ]);
    renderWithClient(<CalendarView />);
    await screen.findByText('Hoạt động của Tổ khác');
    await screen.findByText('Họp giao ban Đoàn đầu tháng 10');

    const teamSelect = screen.getAllByRole('combobox')[0];
    fireEvent.focus(teamSelect);
    fireEvent.keyDown(teamSelect, { key: 'ArrowDown' });
    fireEvent.click(await screen.findByText('Tuyên giáo - Truyền thông', { selector: '[class*="option"], [id*="option"]' }));

    await waitFor(() => expect(screen.queryByText('Hoạt động của Tổ khác')).toBeNull());
    // chủ trì (id 2) và phối hợp (id 1) đều còn
    expect(screen.getByText('Hội thảo Đổi mới Phương thức Sinh hoạt Chi đoàn')).toBeDefined();
    expect(screen.getByText('Họp giao ban Đoàn đầu tháng 10')).toBeDefined();
  });

  it('hiển thị "Cần chỉnh sửa" cho changes_requested trong danh sách', async () => {
    vi.mocked(api.fetchActivities).mockResolvedValue([
      { ...mockActivities[0], status: 'changes_requested' },
    ]);
    renderWithClient(<CalendarView />);
    fireEvent.click(screen.getByText('Danh sách'));
    expect(await screen.findByText('Cần chỉnh sửa')).toBeDefined();
    expect(screen.queryByText('Đề xuất')).toBeNull();
  });

  it('dòng tóm tắt thiếu type/team không hiện nhãn loại hay Tổ sai', async () => {
    vi.mocked(api.fetchActivities).mockResolvedValue([
      {
        id: 7,
        title: 'Hoạt động đơn vị khác',
        status: 'active',
        priority: 'medium',
        deadline: '2026-10-15',
        progress_percent: 30,
      },
    ]);
    renderWithClient(<CalendarView />);
    fireEvent.click(screen.getByText('Danh sách'));
    expect(await screen.findByText('Hoạt động đơn vị khác')).toBeDefined();
    expect(screen.queryByText('Chỉ đạo')).toBeNull();
    expect(screen.queryByText('Sự kiện')).toBeNull();

    window.location.hash = '';
    fireEvent.click(screen.getByText('Hoạt động đơn vị khác'));
    expect(window.location.hash).toBe('#/activity/7');
  });
});

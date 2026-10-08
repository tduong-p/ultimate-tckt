import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor, within } from '@testing-library/react';
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

  it('opens activity detail modal when clicking an activity pill in month view and closes it', async () => {
    renderWithClient(<CalendarView />);

    const pill = await screen.findByTestId('activity-pill-1');
    fireEvent.click(pill);

    // Detail modal should be visible
    const modal = await screen.findByTestId('activity-detail-modal');
    expect(modal).toBeDefined();
    expect(within(modal).getByText('#HĐ-1')).toBeDefined();
    expect(within(modal).getByText('Họp giao ban Đoàn đầu tháng 10')).toBeDefined();
    expect(within(modal).getByText('Đánh giá tiến độ công việc và phân công nhiệm vụ mới.')).toBeDefined();

    // Close modal
    const closeBtn = screen.getByTestId('activity-detail-modal-close-footer');
    fireEvent.click(closeBtn);

    await waitFor(() => {
      expect(screen.queryByTestId('activity-detail-modal')).toBeNull();
    });
  });

  it('opens activity detail modal when clicking an activity in list view', async () => {
    renderWithClient(<CalendarView />);

    const listBtn = screen.getByText('Danh sách');
    fireEvent.click(listBtn);

    const listItem = await screen.findByTestId('list-activity-2');
    fireEvent.click(listItem);

    const modal = await screen.findByTestId('activity-detail-modal');
    expect(modal).toBeDefined();
    expect(within(modal).getByText('#HĐ-2')).toBeDefined();
    expect(within(modal).getByText('Hội thảo Đổi mới Phương thức Sinh hoạt Chi đoàn')).toBeDefined();
    expect(within(modal).getByText('Chuyên đề nâng cao chất lượng sinh hoạt Đoàn.')).toBeDefined();

    // Close via overlay
    const overlay = screen.getByTestId('activity-detail-modal-overlay');
    fireEvent.click(overlay);

    await waitFor(() => {
      expect(screen.queryByTestId('activity-detail-modal')).toBeNull();
    });
  });

  it('opens activity detail modal when clicking an activity bar in Gantt view', async () => {
    renderWithClient(<CalendarView />);

    const ganttBtn = screen.getByText('Biểu đồ Gantt');
    fireEvent.click(ganttBtn);

    const bar = await screen.findByTestId('gantt-bar-1');
    fireEvent.click(bar);

    const modal = await screen.findByTestId('activity-detail-modal');
    expect(modal).toBeDefined();
    expect(within(modal).getByText('#HĐ-1')).toBeDefined();
    expect(within(modal).getByText('Họp giao ban Đoàn đầu tháng 10')).toBeDefined();
    expect(within(modal).getByText('Tổ chức và Phát triển Đoàn')).toBeDefined();

    const closeBtn = screen.getByTestId('activity-detail-modal-close-footer');
    fireEvent.click(closeBtn);

    await waitFor(() => {
      expect(screen.queryByTestId('activity-detail-modal')).toBeNull();
    });
  });
});

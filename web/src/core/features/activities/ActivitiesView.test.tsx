import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ActivitiesView } from './ActivitiesView';
import * as api from '../../api';

vi.mock('../../api', async () => {
  const actual = await vi.importActual('../../api');
  return {
    ...actual,
    fetchActivities: vi.fn(),
    fetchBootstrap: vi.fn(),
    fetchTeams: vi.fn().mockResolvedValue([]),
    createActivity: vi.fn(),
    fetchSession: vi.fn().mockResolvedValue({ user: null }),
  };
});

const mockActivities: api.ActivityItem[] = [
  {
    id: 1,
    title: 'Chiến dịch Mùa hè xanh 2026',
    description: 'Hỗ trợ đồng bào vùng cao nâng cao đời sống văn hóa xã hội',
    team_id: 1,
    team_name: 'Đội Hình Chuyên',
    team_names: 'Đội Hình Chuyên, Ban Phong Trào',
    team_color: '#0052CC',
    status: 'approved',
    type: 'event',
    deadline: '2026-08-15',
    participant_count: 50,
    task_count: 8,
    done_count: 4,
    priority: 'high',
  },
  {
    id: 2,
    title: 'Đại hội Đoàn Thanh niên nhiệm kỳ mới',
    description: 'Báo cáo tổng kết công tác Đoàn và bầu BCH nhiệm kỳ 2026 - 2028',
    team_id: 2,
    team_name: 'Ban Tổ chức',
    team_names: 'Ban Tổ chức',
    team_color: '#00875A',
    status: 'active',
    type: 'assigned',
    deadline: '2026-10-20',
    participant_count: 120,
    task_count: 5,
    done_count: 5,
    priority: 'urgent',
  },
];

const mockCanCreate = (canCreateActivity: boolean) =>
  vi.mocked(api.fetchBootstrap).mockResolvedValue({
    stats: { activeActivities: 0, openTasks: 0, overdueTasks: 0, completedMonth: 0 },
    upcoming: [],
    tasks: [],
    activity: [],
    teams: [],
    capabilities: { canCreateActivity, canCreateAccount: false },
  });

describe('ActivitiesView', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
    vi.mocked(api.fetchActivities).mockResolvedValue(mockActivities);
    mockCanCreate(true);
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

  it('renders the header title, subtitle and action button', async () => {
    renderWithClient(<ActivitiesView />);
    expect(screen.getByText('Hoạt động')).toBeDefined();
    expect(screen.getByText('Lập kế hoạch, phối hợp và theo dõi mọi hoạt động.')).toBeDefined();
    expect(await screen.findByText('+ Đề xuất hoạt động')).toBeDefined();
  });

  it('fetches and displays activity cards from API', async () => {
    renderWithClient(<ActivitiesView />);

    expect(api.fetchActivities).toHaveBeenCalled();
    expect(await screen.findByText('Chiến dịch Mùa hè xanh 2026')).toBeDefined();
    expect(screen.getByText('Đại hội Đoàn Thanh niên nhiệm kỳ mới')).toBeDefined();
    expect(screen.getByText('• Đã Duyệt')).toBeDefined();
    expect(screen.getByText('• Đang diễn ra')).toBeDefined();

    // Verify static K71 hardcoded card is gone
    expect(screen.queryByText(/Triển khai tạo tài khoản chi đoàn K71/i)).toBeNull();
  });

  it('renders empty state with InboxIcon and no checkbox/task icon when activities is empty', async () => {
    vi.mocked(api.fetchActivities).mockResolvedValue([]);
    const { container } = renderWithClient(<ActivitiesView />);

    expect(await screen.findByText('Chưa có hoạt động nào')).toBeDefined();
    expect(screen.getByText('Bắt đầu bằng cách tạo một đề xuất hoạt động mới cho tổ của bạn.')).toBeDefined();

    // Strictly ensure no checkbox icon or TaskIcon in empty state
    expect(container.querySelector('[data-testid="task-icon"]')).toBeNull();
    expect(container.querySelector('input[type="checkbox"]')).toBeNull();
  });

  it('hiển thị kết quả máy chủ trả về cho từ khoá tìm kiếm', async () => {
    vi.mocked(api.fetchActivities).mockImplementation(async (params) =>
      params?.q ? mockActivities.filter((a) => a.title.includes(params.q as string)) : mockActivities
    );
    renderWithClient(<ActivitiesView />);

    expect(await screen.findByText('Chiến dịch Mùa hè xanh 2026')).toBeDefined();

    const searchInput = screen.getByPlaceholderText('Tìm kiếm hoạt động...');
    fireEvent.change(searchInput, { target: { value: 'Đại hội' } });

    expect(await screen.findByText('Đại hội Đoàn Thanh niên nhiệm kỳ mới')).toBeDefined();
    await waitFor(() => {
      expect(screen.queryByText('Chiến dịch Mùa hè xanh 2026')).toBeNull();
    });
  });

  it('opens CreateActivityModal when clicking + Đề xuất hoạt động button', async () => {
    renderWithClient(<ActivitiesView />);
    const button = await screen.findByText('+ Đề xuất hoạt động');
    fireEvent.click(button);
    expect(await screen.findByText('ĐỀ XUẤT MỚI')).toBeDefined();
  });

  it('chỉ gọi API một lần với từ khoá cuối khi gõ liên tục', async () => {
    renderWithClient(<ActivitiesView />);
    await waitFor(() => expect(api.fetchActivities).toHaveBeenCalledTimes(1));
    const input = screen.getByPlaceholderText('Tìm kiếm hoạt động...');

    fireEvent.change(input, { target: { value: 'h' } });
    fireEvent.change(input, { target: { value: 'hộ' } });
    fireEvent.change(input, { target: { value: 'hội' } });

    await waitFor(() =>
      expect(api.fetchActivities).toHaveBeenLastCalledWith(expect.objectContaining({ q: 'hội' }))
    );
    expect(api.fetchActivities).toHaveBeenCalledTimes(2);
  });

  it('hiển thị "Cần chỉnh sửa" cho hoạt động changes_requested (không rơi về Đề xuất)', async () => {
    vi.mocked(api.fetchActivities).mockResolvedValue([
      { ...mockActivities[0], id: 3, title: 'Hoạt động cần sửa', status: 'changes_requested' },
    ]);
    renderWithClient(<ActivitiesView />);
    expect(await screen.findByText('• Cần chỉnh sửa')).toBeDefined();
    expect(screen.queryByText('• Đề xuất')).toBeNull();
  });

  it('bộ lọc trạng thái có lựa chọn "Cần chỉnh sửa" và gửi changes_requested lên API', async () => {
    renderWithClient(<ActivitiesView />);
    await screen.findByText('Chiến dịch Mùa hè xanh 2026');
    const statusSelect = screen.getAllByRole('combobox')[0];
    fireEvent.focus(statusSelect);
    fireEvent.keyDown(statusSelect, { key: 'ArrowDown' });
    fireEvent.click(await screen.findByText('Cần chỉnh sửa'));
    await waitFor(() =>
      expect(api.fetchActivities).toHaveBeenLastCalledWith(
        expect.objectContaining({ status: 'changes_requested' })
      )
    );
  });

  it('ẩn nút đề xuất ở header và empty state khi không có canCreateActivity', async () => {
    mockCanCreate(false);
    vi.mocked(api.fetchActivities).mockResolvedValue([]);
    renderWithClient(<ActivitiesView />);
    await screen.findByText('Chưa có hoạt động nào');
    await waitFor(() => expect(api.fetchBootstrap).toHaveBeenCalled());
    expect(screen.queryByText('+ Đề xuất hoạt động')).toBeNull();
  });

  it('hiện nút đề xuất ở header và empty state khi có canCreateActivity', async () => {
    vi.mocked(api.fetchActivities).mockResolvedValue([]);
    renderWithClient(<ActivitiesView />);
    await screen.findByText('Chưa có hoạt động nào');
    await waitFor(() => expect(screen.getAllByText('+ Đề xuất hoạt động')).toHaveLength(2));
  });

  it('dòng tóm tắt của đơn vị khác: không nhãn loại, không "Chung", dùng progress_percent', async () => {
    vi.mocked(api.fetchActivities).mockResolvedValue([
      {
        id: 9,
        title: 'Hoạt động đơn vị bạn',
        status: 'active',
        priority: 'medium',
        deadline: '2026-11-01',
        progress_percent: 60,
      },
    ]);
    renderWithClient(<ActivitiesView />);
    expect(await screen.findByText('Hoạt động đơn vị bạn')).toBeDefined();
    expect(screen.queryByText('Chung')).toBeNull();
    expect(screen.queryByText('Sự kiện đơn vị')).toBeNull();
    expect(screen.queryByText('Chỉ đạo cấp trên')).toBeNull();
    expect(screen.queryByText(/người$/)).toBeNull();
    expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('60');
  });

  it('opens ActivityDetailModal when clicking on an activity card', async () => {
    vi.mocked(api.fetchActivities).mockResolvedValue(mockActivities);
    renderWithClient(<ActivitiesView />);
    const cardTitle = await screen.findByText('Chiến dịch Mùa hè xanh 2026');
    fireEvent.click(cardTitle);
    await waitFor(() => {
      expect(screen.getByTestId('activity-detail-modal')).toBeDefined();
    });
  });
});

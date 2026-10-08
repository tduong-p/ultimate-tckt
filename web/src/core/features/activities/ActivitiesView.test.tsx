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
    fetchTeams: vi.fn().mockResolvedValue([]),
    createActivity: vi.fn(),
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

  it('renders the header title, subtitle and action button', () => {
    renderWithClient(<ActivitiesView />);
    expect(screen.getByText('Hoạt động')).toBeDefined();
    expect(screen.getByText('Lập kế hoạch, phối hợp và theo dõi mọi hoạt động.')).toBeDefined();
    expect(screen.getByText('+ Đề xuất hoạt động')).toBeDefined();
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
    const button = screen.getByText('+ Đề xuất hoạt động');
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
});

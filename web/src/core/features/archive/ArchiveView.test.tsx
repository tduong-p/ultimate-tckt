import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ArchiveView } from './ArchiveView';
import * as api from '../../api';

vi.mock('../../api', async () => {
  const actual = await vi.importActual('../../api');
  return {
    ...actual,
    fetchArchive: vi.fn(),
  };
});

const mockArchiveActivities: api.ActivityItem[] = [
  {
    id: 101,
    title: 'Hội nghị Tổng kết Năm học 2025 - 2026',
    description: 'Đánh giá hoạt động đoàn kết các chi đoàn và trao khen thưởng.',
    result_summary: 'Hoàn thành xuất sắc với 120 đại biểu tham dự và 15 tập thể được khen thưởng.',
    team_id: 1,
    team_name: 'Tổ chức và Phát triển Đoàn',
    status: 'completed',
    type: 'event',
    priority: 'medium',
    deadline: '2026-06-30',
    participant_count: 120,
    task_count: 10,
    done_count: 10,
  },
  {
    id: 102,
    title: 'Tập huấn Cán bộ Đoàn Cơ sở Đợt 1',
    description: 'Bồi dưỡng kỹ năng tổ chức phong trào thanh niên.',
    result_summary: '100% cán bộ hoàn thành bài kiểm tra cuối khóa.',
    team_id: 2,
    team_name: 'Tuyên giáo - Truyền thông',
    status: 'completed',
    type: 'assigned',
    priority: 'medium',
    deadline: '2026-05-15',
    participant_count: 65,
    task_count: 6,
    done_count: 6,
  },
];

describe('ArchiveView', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
    vi.mocked(api.fetchArchive).mockResolvedValue(mockArchiveActivities);
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

  it('renders header title and subtitle', () => {
    renderWithClient(<ArchiveView />);
    expect(screen.getByText('Kho lưu trữ hoạt động')).toBeDefined();
    expect(screen.getByText('Tìm kiếm kho tri thức chung của tổ chức.')).toBeDefined();
  });

  it('renders search input field with correct placeholder and triggers search', async () => {
    renderWithClient(<ArchiveView />);
    const searchInput = screen.getByPlaceholderText(
      'Tìm hoạt động, kết quả và bài học trước đây...'
    ) as HTMLInputElement;
    expect(searchInput).toBeDefined();

    fireEvent.change(searchInput, { target: { value: 'Hội nghị' } });
    expect(searchInput.value).toBe('Hội nghị');

    await waitFor(() => {
      expect(api.fetchArchive).toHaveBeenCalledWith(
        expect.objectContaining({ q: 'Hội nghị' })
      );
    });
  });

  it('fetches and renders archived activity items from API', async () => {
    renderWithClient(<ArchiveView />);

    expect(api.fetchArchive).toHaveBeenCalled();
    expect(await screen.findByText('Hội nghị Tổng kết Năm học 2025 - 2026')).toBeDefined();
    expect(screen.getByText('Tập huấn Cán bộ Đoàn Cơ sở Đợt 1')).toBeDefined();
    expect(
      screen.getByText('Hoàn thành xuất sắc với 120 đại biểu tham dự và 15 tập thể được khen thưởng.')
    ).toBeDefined();
    expect(screen.getByText('120 người tham gia')).toBeDefined();
    expect(screen.getByText('10/10 việc xong')).toBeDefined();
  });

  it('renders empty state card with icon, title, and description when no data returned', async () => {
    vi.mocked(api.fetchArchive).mockResolvedValue([]);
    const { container } = renderWithClient(<ArchiveView />);

    expect(await screen.findByText('Không tìm thấy hoạt động lưu trữ')).toBeDefined();
    expect(screen.getByText('Hoạt động hoàn thành sẽ được đưa vào kho lưu trữ.')).toBeDefined();

    // STRICT RULE: No checkbox icon or TaskIcon in empty states
    expect(container.querySelector('input[type="checkbox"]')).toBeNull();
    expect(container.querySelector('[data-testid="task-icon"]')).toBeNull();
  });

  it('chỉ gọi API một lần với từ khoá cuối khi gõ liên tục', async () => {
    renderWithClient(<ArchiveView />);
    await waitFor(() => expect(api.fetchArchive).toHaveBeenCalledTimes(1));
    const input = screen.getByPlaceholderText('Tìm hoạt động, kết quả và bài học trước đây...');

    fireEvent.change(input, { target: { value: 'h' } });
    fireEvent.change(input, { target: { value: 'hộ' } });
    fireEvent.change(input, { target: { value: 'hội' } });

    await waitFor(() =>
      expect(api.fetchArchive).toHaveBeenLastCalledWith(expect.objectContaining({ q: 'hội' }))
    );
    expect(api.fetchArchive).toHaveBeenCalledTimes(2);
  });
});

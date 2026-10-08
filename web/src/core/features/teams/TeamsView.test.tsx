import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TeamsView } from './TeamsView';
import * as api from '../../api';

vi.mock('../../api', async () => {
  const actual = await vi.importActual('../../api');
  return {
    ...actual,
    fetchTeams: vi.fn(),
  };
});

const mockTeams: api.TeamItem[] = [
  {
    id: 1,
    name: 'Phát triển Đảng và Chuyển đổi số',
    description: 'Phụ trách công tác phát triển Đảng viên mới, quản lý dữ liệu và chuyển đổi số quy trình Đoàn.',
    color: '#0052CC',
    member_count: 8,
    active_count: 3,
  },
  {
    id: 2,
    name: 'Tổ chức và Phát triển Đoàn',
    description: 'Tổ chức các phong trào thi đua, quản lý hồ sơ đoàn viên, chuyển sinh hoạt đoàn và đánh giá chi đoàn.',
    color: '#36B37E',
    member_count: 12,
    active_count: 5,
  },
  {
    id: 3,
    name: 'Giám sát, Kiểm tra và Điểm rèn luyện',
    description: 'Theo dõi, đánh giá điểm rèn luyện sinh viên, giám sát kỷ luật và tiếp nhận phản hồi từ đoàn viên.',
    color: '#FF991F',
    member_count: 6,
    active_count: 2,
  },
  {
    id: 4,
    name: 'Tuyên giáo - Truyền thông',
    description: 'Quản trị các kênh truyền thông, sản xuất ấn phẩm tuyên truyền, định hướng tư tưởng và sự kiện lớn.',
    color: '#6554C0',
    member_count: 10,
    active_count: 4,
  },
];

describe('TeamsView', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
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

  it('renders header title and description', async () => {
    renderWithClient(<TeamsView />);
    expect(screen.getByText('Tổ')).toBeDefined();
    expect(screen.getByText('Những con người và đơn vị cùng tạo nên các hoạt động.')).toBeDefined();
  });

  it('fetches and renders all organization teams from API', async () => {
    renderWithClient(<TeamsView />);

    expect(api.fetchTeams).toHaveBeenCalled();
    expect(await screen.findByText('Phát triển Đảng và Chuyển đổi số')).toBeDefined();
    expect(screen.getByText('Tổ chức và Phát triển Đoàn')).toBeDefined();
    expect(screen.getByText('Giám sát, Kiểm tra và Điểm rèn luyện')).toBeDefined();
    expect(screen.getByText('Tuyên giáo - Truyền thông')).toBeDefined();

    expect(screen.getByText('8')).toBeDefined();
    expect(screen.getByText('12')).toBeDefined();
  });

  it('renders empty state with InboxIcon and no checkbox/task icon when teams list is empty', async () => {
    vi.mocked(api.fetchTeams).mockResolvedValue([]);
    const { container } = renderWithClient(<TeamsView />);

    expect(await screen.findByText('Chưa có tổ nào')).toBeDefined();
    expect(screen.getByText('Danh sách tổ hiện tại đang trống.')).toBeDefined();

    // STRICT RULE: No checkbox icon or TaskIcon in empty states
    expect(container.querySelector('[data-testid="task-icon"]')).toBeNull();
    expect(container.querySelector('input[type="checkbox"]')).toBeNull();
  });
});

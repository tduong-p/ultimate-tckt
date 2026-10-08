import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MembersView } from './MembersView';
import * as api from '../../api';

vi.mock('../../api', async () => {
  const actual = await vi.importActual('../../api');
  return {
    ...actual,
    fetchMembers: vi.fn(),
    fetchTeams: vi.fn().mockResolvedValue([
      { id: 1, name: 'Phát triển Đảng và Chuyển đổi số' },
    ]),
  };
});

const mockMembers: api.MemberItem[] = [
  {
    id: 1,
    name: 'Phạm Việt Bách',
    role: 'leader',
    email: 'bach.pv2414676@sis.hust.edu.vn',
    avatar_color: '#E00000',
    teams: 'Phát triển Đảng và Chuyển đổi số',
    team_ids: '1',
    completed_tasks: 0,
    can_manage: true,
  },
  {
    id: 2,
    name: 'Cao Hương Quỳnh',
    role: 'vice_leader',
    email: 'quynh.ch238125@sis.hust.edu.vn',
    avatar_color: '#006644',
    teams: 'Phát triển Đảng và Chuyển đổi số',
    team_ids: '1',
    completed_tasks: 0,
    can_manage: true,
  },
  {
    id: 3,
    name: 'Nguyễn Văn Gia Huy',
    role: 'vice_leader',
    email: 'huy.nvg2516805@sis.hust.edu.vn',
    avatar_color: '#006644',
    teams: 'Phát triển Đảng và Chuyển đổi số',
    team_ids: '1',
    completed_tasks: 1,
    can_manage: true,
  },
];

describe('MembersView', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
    vi.mocked(api.fetchMembers).mockResolvedValue(mockMembers);
    vi.mocked(api.fetchTeams).mockResolvedValue([
      { id: 1, name: 'Phát triển Đảng và Chuyển đổi số' },
    ]);
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

  it('renders header title, subtitle and action button', async () => {
    renderWithClient(<MembersView />);
    expect(screen.getByText('Thành viên')).toBeDefined();
    expect(screen.getByText("Recognize every member's participation.")).toBeDefined();
    expect(screen.getByText('+ Tạo tài khoản')).toBeDefined();
  });

  it('fetches and renders member cards from API', async () => {
    renderWithClient(<MembersView />);

    expect(api.fetchMembers).toHaveBeenCalled();
    expect(await screen.findByText('Phạm Việt Bách')).toBeDefined();
    expect(screen.getByText('Cao Hương Quỳnh')).toBeDefined();
    expect(screen.getByText('Nguyễn Văn Gia Huy')).toBeDefined();
    expect(screen.getByText('bach.pv2414676@sis.hust.edu.vn')).toBeDefined();
    expect(screen.getByText('Tổ Trưởng')).toBeDefined();
    expect(screen.getAllByText('Tổ Phó').length).toBe(2);
  });

  it('filters members by search query', async () => {
    renderWithClient(<MembersView />);

    expect(await screen.findByText('Phạm Việt Bách')).toBeDefined();

    const searchInput = screen.getByPlaceholderText('Tìm thành viên...');
    fireEvent.change(searchInput, { target: { value: 'Gia Huy' } });

    expect(await screen.findByText('Nguyễn Văn Gia Huy')).toBeDefined();
    await waitFor(() => {
      expect(screen.queryByText('Phạm Việt Bách')).toBeNull();
      expect(screen.queryByText('Cao Hương Quỳnh')).toBeNull();
    });
  });

  it('renders empty state with InboxIcon and no checkbox/task icon when member list is empty', async () => {
    vi.mocked(api.fetchMembers).mockResolvedValue([]);
    const { container } = renderWithClient(<MembersView />);

    expect(await screen.findByText('Không tìm thấy thành viên')).toBeDefined();

    // STRICT RULE: No checkbox icon or TaskIcon in empty states
    expect(container.querySelector('[data-testid="task-icon"]')).toBeNull();
    expect(container.querySelector('input[type="checkbox"]')).toBeNull();
  });
});

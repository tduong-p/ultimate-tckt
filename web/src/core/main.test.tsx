import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { App } from './main';
import * as api from './api';

vi.mock('./api', async () => {
  const actual = await vi.importActual<typeof import('./api')>('./api');
  return {
    ...actual,
    fetchSession: vi.fn(),
    logoutUser: vi.fn(),
    fetchBootstrap: vi.fn().mockResolvedValue({
      stats: { activeActivities: 1, openTasks: 3, overdueTasks: 0, completedMonth: 2 },
      upcoming: [],
      tasks: [],
      activity: [],
      teams: [],
      capabilities: { canCreateActivity: true, canCreateAccount: false },
    }),
    fetchMyTasksToday: vi.fn().mockResolvedValue({
      todayTasks: [],
      overdueTasks: [],
      reviewTasks: [],
      total: 0,
    }),
  };
});

describe('Core App main entry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders LoginView when session user is null (unauthenticated)', async () => {
    vi.mocked(api.fetchSession).mockResolvedValueOnce({
      user: null,
      units: { current: null, available: [] },
    });

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/Đăng nhập vào không gian làm việc/i)).toBeDefined();
    });
  });

  it('renders PageLayout and Dashboard when user is authenticated', async () => {
    vi.mocked(api.fetchSession).mockResolvedValueOnce({
      user: {
        id: 1,
        name: 'Phạm Việt Bách',
        email: 'bach.pv@hust.edu.vn',
        role: 'admin',
      },
      units: { current: null, available: [] },
    });

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/Xin chào Phạm Việt Bách/i)).toBeDefined();
      expect(screen.getByText('+ Đề xuất hoạt động')).toBeDefined();
    });
  });

  it('handles logout and returns to login view', async () => {
    vi.mocked(api.fetchSession).mockResolvedValueOnce({
      user: {
        id: 1,
        name: 'Phạm Việt Bách',
        email: 'bach.pv@hust.edu.vn',
        role: 'admin',
      },
      units: { current: null, available: [] },
    });
    vi.mocked(api.logoutUser).mockResolvedValueOnce({ ok: true });

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/Xin chào Phạm Việt Bách/i)).toBeDefined();
    });

    const logoutBtn = screen.getByRole('button', { name: /Đăng xuất tài khoản/i });
    fireEvent.click(logoutBtn);

    await waitFor(() => {
      expect(api.logoutUser).toHaveBeenCalled();
      expect(screen.getByText(/Đăng nhập vào không gian làm việc/i)).toBeDefined();
    });
  });
});

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { App, createCoreQueryClient } from './main';
import * as api from './api';

vi.mock('./api', async () => {
  const actual = await vi.importActual<typeof import('./api')>('./api');
  return {
    ...actual,
    fetchSession: vi.fn(),
    logoutUser: vi.fn(),
    submitStudentClass: vi.fn(),
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
    fetchNotifications: vi.fn().mockResolvedValue({ notifications: [], unread_count: 0 }),
  };
});


describe('Core App main entry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    window.location.hash = '';
    cleanup();
  });

  it('renders LoginView when session user is null (unauthenticated)', async () => {
    vi.mocked(api.fetchSession).mockResolvedValueOnce({
      user: null,
      units: { current: null, memberships: [] },
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
      units: { current: null, memberships: [] },
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

  it('admin mở mục Quản trị tài khoản và hộp Tài khoản của tôi từ chip người dùng', async () => {
    vi.mocked(api.fetchSession).mockResolvedValue({
      user: { id: 1, name: 'Phạm Việt Bách', email: 'bach@x.vn', role: 'admin', avatar_color: '#0052cc' },
      units: { current: null, memberships: [] },
    });
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={queryClient}><App /></QueryClientProvider>);
    expect(await screen.findByText('Quản trị tài khoản')).toBeDefined();
    await waitFor(() => expect(api.fetchNotifications).toHaveBeenCalled());
    const notificationFetchCount = vi.mocked(api.fetchNotifications).mock.calls.length;
    fireEvent.click(screen.getByRole('button', { name: 'Tài khoản của tôi' }));
    expect(await screen.findByLabelText('Mật khẩu mới')).toBeDefined();
    expect(api.fetchNotifications).toHaveBeenCalledTimes(notificationFetchCount);
  });

  it('handles logout and returns to login view', async () => {
    vi.mocked(api.fetchSession).mockResolvedValueOnce({
      user: {
        id: 1,
        name: 'Phạm Việt Bách',
        email: 'bach.pv@hust.edu.vn',
        role: 'admin',
      },
      units: { current: null, memberships: [] },
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

  const authedSession = {
    user: { id: 1, name: 'Phạm Việt Bách', email: 'bach.pv@hust.edu.vn', role: 'admin' },
    units: { current: null, memberships: [] },
  };

  it('xoá dữ liệu đã cache của người dùng cũ khi đăng xuất', async () => {
    vi.mocked(api.fetchSession).mockResolvedValueOnce(authedSession);
    vi.mocked(api.logoutUser).mockResolvedValueOnce({ ok: true });
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    queryClient.setQueryData(['core-teams'], [{ id: 9, name: 'Tổ bí mật' }]);

    render(
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    );
    await waitFor(() => expect(screen.getByText(/Xin chào Phạm Việt Bách/i)).toBeDefined());

    fireEvent.click(screen.getByRole('button', { name: /Đăng xuất tài khoản/i }));

    await waitFor(() =>
      expect(screen.getByText(/Đăng nhập vào không gian làm việc/i)).toBeDefined()
    );
    expect(queryClient.getQueryData(['core-teams'])).toBeUndefined();
  });

  it('quay về màn đăng nhập khi một API trả 401 (hết phiên)', async () => {
    vi.mocked(api.fetchSession).mockResolvedValueOnce(authedSession);
    const queryClient = createCoreQueryClient();
    queryClient.setDefaultOptions({ queries: { retry: false } });

    render(
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    );
    await waitFor(() => expect(screen.getByText(/Xin chào Phạm Việt Bách/i)).toBeDefined());

    await queryClient
      .fetchQuery({
        queryKey: ['core-teams'],
        queryFn: () => Promise.reject({ isAxiosError: true, response: { status: 401 } }),
      })
      .catch(() => undefined);

    await waitFor(() =>
      expect(screen.getByText(/Đăng nhập vào không gian làm việc/i)).toBeDefined()
    );
  });

  it('chỉ thử lại lỗi 5xx/mạng tối đa 2 lần, không thử lại 401/403', () => {
    const retry = createCoreQueryClient().getDefaultOptions().queries?.retry as (
      failureCount: number,
      error: unknown
    ) => boolean;
    expect(retry(0, { response: { status: 401 } })).toBe(false);
    expect(retry(0, { response: { status: 403 } })).toBe(false);
    expect(retry(0, { response: { status: 500 } })).toBe(true);
    expect(retry(0, new Error('Network Error'))).toBe(true);
    expect(retry(2, { response: { status: 503 } })).toBe(false);
  });

  it('quay về màn đăng nhập khi một thao tác ghi (mutation) trả 401', async () => {
    vi.mocked(api.fetchSession).mockResolvedValueOnce(authedSession);
    const queryClient = createCoreQueryClient();
    queryClient.setDefaultOptions({ queries: { retry: false } });

    render(
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    );
    await waitFor(() => expect(screen.getByText(/Xin chào Phạm Việt Bách/i)).toBeDefined());

    await queryClient
      .getMutationCache()
      .build(queryClient, {
        mutationFn: () => Promise.reject({ isAxiosError: true, response: { status: 401 } }),
      })
      .execute(undefined)
      .catch(() => undefined);

    await waitFor(() =>
      expect(screen.getByText(/Đăng nhập vào không gian làm việc/i)).toBeDefined()
    );
  });

  it('chặn bằng bước khai lớp khi tài khoản sinh viên chưa onboarding, xong thì vào Tổng quan', async () => {
    const student = {
      id: 7,
      name: 'Nguyễn Văn A',
      email: 'a.nv230001@sis.hust.edu.vn',
      role: 'member',
      cohort: 'K68',
      onboarding: { type: 'student_class' as const, required: true },
    };
    vi.mocked(api.fetchSession).mockResolvedValueOnce({
      user: student,
      units: { current: null, memberships: [] },
    });
    vi.mocked(api.submitStudentClass).mockResolvedValueOnce({
      ...student,
      class_number: 'Điện 1',
      onboarding: { type: 'student_class', required: false },
    });
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    render(
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    );

    expect(await screen.findByText('Khai báo lớp của bạn')).toBeDefined();
    expect(screen.queryByText(/Xin chào/)).toBeNull();

    fireEvent.change(screen.getByLabelText('Số lớp'), { target: { value: 'Điện 1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Lưu và tiếp tục' }));

    await waitFor(() => expect(screen.getByText(/Xin chào Nguyễn Văn A/)).toBeDefined());
  });

  it('link cũ dạng #calendar (không có /) mở thẳng màn Lịch', async () => {
    window.location.hash = '#calendar';
    vi.mocked(api.fetchSession).mockResolvedValueOnce(authedSession);
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={queryClient}><App /></QueryClientProvider>);
    await waitFor(() => expect(screen.getByRole('heading', { name: /Lịch/ })).toBeDefined());
  });

  it('chỉ hiện menu Báo cáo cho quản lý (admin/vice_admin/leader/vice_leader)', async () => {
    vi.mocked(api.fetchSession).mockResolvedValue(authedSession);
    const renderApp = () => {
      const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
      return render(
        <QueryClientProvider client={queryClient}>
          <App />
        </QueryClientProvider>
      );
    };

    renderApp();
    await waitFor(() => expect(screen.getByRole('button', { name: /Báo cáo/ })).toBeDefined());
    cleanup();

    vi.mocked(api.fetchSession).mockResolvedValue({ ...authedSession, user: { ...authedSession.user, role: 'member' } });
    renderApp();
    await waitFor(() => expect(screen.getByText(/Xin chào Phạm Việt Bách/i)).toBeDefined());
    expect(screen.queryByRole('button', { name: /Báo cáo/ })).toBeNull();
  });

  it('thanh trên có chuông thông báo khi đã đăng nhập', async () => {
    vi.mocked(api.fetchSession).mockResolvedValue({
      user: { id: 1, name: 'Phạm Việt Bách', email: 'bach.pv@hust.edu.vn', role: 'admin' },
      units: { current: null, memberships: [] },
    });
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    );
    expect(await screen.findByRole('button', { name: /^Thông báo/ })).toBeDefined();
    await waitFor(() => expect(api.fetchNotifications).toHaveBeenCalled());
  });
});

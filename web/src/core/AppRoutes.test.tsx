import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppRoutes } from './AppRoutes';
import { SESSION_KEY, BOOTSTRAP_KEY } from './queryKeys';

vi.mock('./features/dashboard/Dashboard', () => ({ Dashboard: () => <div>màn-tổng-quan</div> }));
vi.mock('./features/calendar/CalendarView', () => ({ CalendarView: () => <div>màn-lịch</div> }));
vi.mock('./features/reports/ReportsView', () => ({ ReportsView: () => <div>màn-báo-cáo</div> }));
vi.mock('./features/members/MembersView', () => ({ MembersView: () => <div>màn-thành-viên</div> }));

function renderAt(path: string, role: string) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
  qc.setQueryData(SESSION_KEY, { user: { id: 1, name: 'A', email: 'a@x', role }, units: { current: null, memberships: [] } });
  qc.setQueryData(BOOTSTRAP_KEY, { stats: {}, upcoming: [], tasks: [], activity: [], teams: [], capabilities: { canCreateActivity: false, canCreateAccount: false } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[path]}>
        <AppRoutes userName="A" />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('AppRoutes', () => {
  afterEach(cleanup);

  it('"/" về Tổng quan', () => {
    renderAt('/', 'member');
    expect(screen.getByText('màn-tổng-quan')).toBeDefined();
  });

  it('mở đúng màn theo đường dẫn của UI cũ', () => {
    renderAt('/calendar', 'member');
    expect(screen.getByText('màn-lịch')).toBeDefined();
    cleanup();
    renderAt('/people', 'member');
    expect(screen.getByText('màn-thành-viên')).toBeDefined();
  });

  it('không phải quản lý thì #/reports về Tổng quan, không render màn Báo cáo', () => {
    renderAt('/reports', 'member');
    expect(screen.queryByText('màn-báo-cáo')).toBeNull();
    expect(screen.getByText('màn-tổng-quan')).toBeDefined();
  });

  it('quản lý mở được Báo cáo', () => {
    renderAt('/reports', 'leader');
    expect(screen.getByText('màn-báo-cáo')).toBeDefined();
  });

  it('đường dẫn lạ hiện trang Không tìm thấy', () => {
    renderAt('/khong-co', 'member');
    expect(screen.getByText('Không tìm thấy trang')).toBeDefined();
  });
});

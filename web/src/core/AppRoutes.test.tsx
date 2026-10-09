import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppRoutes } from './AppRoutes';
import { SESSION_KEY, BOOTSTRAP_KEY } from './queryKeys';

vi.mock('./features/dashboard/Dashboard', () => ({ Dashboard: () => <div>màn-tổng-quan</div> }));
vi.mock('./features/calendar/CalendarView', () => ({ CalendarView: () => <div>màn-lịch</div> }));
vi.mock('./features/reports/ReportsView', () => ({ ReportsView: () => <div>màn-báo-cáo</div> }));
vi.mock('./features/activities/ActivityDetailView', () => ({ ActivityDetailView: () => <div>màn-chi-tiết-hoạt-động</div> }));
vi.mock('./features/members/MembersView', () => ({ MembersView: () => <div>màn-thành-viên</div> }));
vi.mock('./features/tasks/KanbanBoard', () => ({ KanbanBoard: () => <div>màn-kanban</div> }));
vi.mock('./features/directives/DirectivesView', () => ({ DirectivesView: () => <div>màn-giao-việc</div> }));
vi.mock('./features/directives/DirectiveDetailView', () => ({ DirectiveDetailView: () => <div>màn-chi-tiết-chỉ-đạo</div> }));
vi.mock('./features/submissions/SubmissionsView', () => ({ SubmissionsView: () => <div>màn-trình</div> }));
vi.mock('./features/submissions/SubmissionDetailView', () => ({ SubmissionDetailView: () => <div>màn-chi-tiết-trình</div> }));

function renderWithUnit(path: string, modules: string[] | undefined) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
  const unit = { id: 2, code: 'TCKT', name: 'Ban TCKT', kind: 'department', modules };
  qc.setQueryData(SESSION_KEY, {
    user: { id: 1, name: 'A', email: 'a@x', role: 'member' },
    units: { current: unit, memberships: [{ unit_id: 2, code: 'TCKT', name: 'Ban TCKT', kind: 'department', role: 'admin' }] },
  });
  qc.setQueryData(BOOTSTRAP_KEY, { stats: {}, upcoming: [], tasks: [], activity: [], teams: [], capabilities: { canCreateActivity: false, canCreateAccount: false } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[path]}><AppRoutes userName="A" /></MemoryRouter>
    </QueryClientProvider>
  );
}
vi.mock('./features/teams/TeamPage', () => ({ TeamPage: () => <div>màn-trang-tổ</div> }));
vi.mock('./features/accounts/AccountsView', () => ({ AccountsView: () => <div>màn-quản-trị-tài-khoản</div> }));

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

  it('mở trang chi tiết hoạt động theo #/activity/:id', () => {
    renderAt('/activity/12', 'member');
    expect(screen.getByText('màn-chi-tiết-hoạt-động')).toBeDefined();
  });

  it('đường dẫn lạ hiện trang Không tìm thấy', () => {
    renderAt('/khong-co', 'member');
    expect(screen.getByText('Không tìm thấy trang')).toBeDefined();
  });

  it('/task/:id mở Tổng quan làm nền cho hộp công việc', () => {
    renderAt('/task/5', 'member');
    expect(screen.getByText('màn-tổng-quan')).toBeDefined();
  });

  it('/board/:id mở Kanban của hoạt động', () => {
    renderAt('/board/9', 'member');
    expect(screen.getByText('màn-kanban')).toBeDefined();
  });
  it('đơn vị có module dieu-hanh mở được bốn route Giao việc/Trình', () => {
    for (const [path, text] of [
      ['/directives', 'màn-giao-việc'], ['/directive/7', 'màn-chi-tiết-chỉ-đạo'],
      ['/submissions', 'màn-trình'], ['/submission/44', 'màn-chi-tiết-trình'],
    ]) {
      renderWithUnit(path, ['dieu-hanh']);
      expect(screen.getByText(text)).toBeDefined();
      cleanup();
    }
  });

  it('đơn vị không có module dieu-hanh gõ tay các route đó thì về Tổng quan, không render màn', () => {
    for (const path of ['/directives', '/directive/7', '/submissions', '/submission/44']) {
      renderWithUnit(path, ['ctd']);
      expect(screen.queryByText(/màn-giao-việc|màn-chi-tiết-chỉ-đạo|màn-trình|màn-chi-tiết-trình/)).toBeNull();
      expect(screen.getByText('màn-tổng-quan')).toBeDefined();
      cleanup();
    }
  });

  it('mở được trang Tổ theo #team/:id', () => {
    renderAt('/team/3', 'leader');
    expect(screen.getByText('màn-trang-tổ')).toBeDefined();
  });

  it('admin mở được #/accounts; thành viên và Tổ trưởng bị đưa về Tổng quan', () => {
    renderAt('/accounts', 'admin');
    expect(screen.getByText('màn-quản-trị-tài-khoản')).toBeDefined();
    cleanup();
    renderAt('/accounts', 'leader');
    expect(screen.queryByText('màn-quản-trị-tài-khoản')).toBeNull();
    expect(screen.getByText('màn-tổng-quan')).toBeDefined();
  });
});

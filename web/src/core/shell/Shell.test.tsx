import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { Shell, type ShellProps } from './Shell';
import { ToastProvider } from '../../shared/components/Toast';
import * as api from '../api';

vi.mock('../api', async () => {
  const actual = await vi.importActual<typeof import('../api')>('../api');
  return {
    ...actual,
    fetchSession: vi.fn(),
    fetchBootstrap: vi.fn(),
    fetchNotifications: vi.fn(),
  };
});

const Probe = () => <div data-testid="path">{useLocation().pathname}</div>;

function setup(opts: { path?: string; unread?: number; props?: Partial<ShellProps> } = {}) {
  vi.mocked(api.fetchSession).mockResolvedValue({ user: { id: 1, name: 'An', email: 'a@x.vn', role: 'member' }, units: { current: null, memberships: [] } });
  vi.mocked(api.fetchBootstrap).mockResolvedValue({ teams: [], capabilities: {} } as never);
  vi.mocked(api.fetchNotifications).mockResolvedValue({ notifications: [], unread_count: opts.unread ?? 0 });
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const user = userEvent.setup();
  render(
    <QueryClientProvider client={qc}>
      <ToastProvider>
        <MemoryRouter initialEntries={[opts.path ?? '/activities']}>
          <Shell user={{ name: 'Phạm An' }} {...opts.props}>
            <input aria-label="ô nhập" />
            <textarea aria-label="ô văn bản" />
            <div contentEditable suppressContentEditableWarning data-testid="editable" tabIndex={0} />
            <Routes><Route path="*" element={<Probe />} /></Routes>
          </Shell>
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>
  );
  return { user };
}

const sidebar = () => screen.getByRole('navigation', { name: 'Điều hướng chính' });

beforeEach(() => {
  vi.clearAllMocks();
  document.documentElement.removeAttribute('data-theme');
  try { localStorage.clear(); } catch { /* ignore */ }
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('phím tắt', () => {
  it('c trên body gọi onCreate, trong input/textarea/contenteditable thì không', async () => {
    const onCreate = vi.fn();
    const { user } = setup({ props: { onCreate } });
    await user.keyboard('c');
    expect(onCreate).toHaveBeenCalledTimes(1);

    await user.click(screen.getByLabelText('ô nhập'));
    await user.keyboard('c');
    await user.click(screen.getByLabelText('ô văn bản'));
    await user.keyboard('c');
    await user.click(screen.getByTestId('editable'));
    await user.keyboard('c');
    expect(onCreate).toHaveBeenCalledTimes(1);
  });

  it('/ gọi onSearch khi có; không gõ / trong input', async () => {
    const onSearch = vi.fn();
    const { user } = setup({ props: { onSearch } });
    await user.keyboard('/');
    expect(onSearch).toHaveBeenCalledTimes(1);
    await user.click(screen.getByLabelText('ô nhập'));
    await user.keyboard('/');
    expect(onSearch).toHaveBeenCalledTimes(1);
  });

  it('g rồi i trong 1 giây đi tới /inbox; i đứng một mình thì không', async () => {
    const { user } = setup();
    await user.keyboard('i');
    expect(screen.getByTestId('path')).toHaveTextContent('/activities');
    await user.keyboard('gi');
    expect(screen.getByTestId('path')).toHaveTextContent('/inbox');
  });

  it('g rồi i quá 1 giây thì không đi', async () => {
    const { user } = setup();
    const now = Date.now();
    const spy = vi.spyOn(Date, 'now');
    spy.mockReturnValue(now);
    await user.keyboard('g');
    spy.mockReturnValue(now + 1500);
    await user.keyboard('i');
    expect(screen.getByTestId('path')).toHaveTextContent('/activities');
  });
});

describe('phím tắt: ngoại lệ', () => {
  it('bỏ qua phím lặp, đang soạn IME, trong dialog/textbox/combobox và khi giữ Shift', async () => {
    const onCreate = vi.fn();
    const onSearch = vi.fn();
    const { user } = setup({ props: { onCreate, onSearch } });
    fireEvent.keyDown(document.body, { key: 'c', repeat: true });
    fireEvent.keyDown(document.body, { key: 'c', isComposing: true });
    fireEvent.keyDown(document.body, { key: 'C', shiftKey: true });
    expect(onCreate).not.toHaveBeenCalled();

    const dlg = document.createElement('div');
    dlg.setAttribute('role', 'dialog');
    const btn = document.createElement('button');
    dlg.appendChild(btn);
    const modal = document.createElement('div');
    modal.setAttribute('aria-modal', 'true');
    const btn2 = document.createElement('button');
    modal.appendChild(btn2);
    const tb = document.createElement('div');
    tb.setAttribute('role', 'textbox');
    const inner = document.createElement('span');
    tb.appendChild(inner);
    document.body.append(dlg, modal, tb);
    for (const el of [btn, btn2, inner]) fireEvent.keyDown(el, { key: 'c' });
    expect(onCreate).not.toHaveBeenCalled();
    dlg.remove(); modal.remove(); tb.remove();

    await user.keyboard('c');
    expect(onCreate).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(document.body, { key: '/', shiftKey: true });
    expect(onSearch).toHaveBeenCalledTimes(1);
  });
});

describe('drawer', () => {
  it('hamburger mở/đóng, Escape đóng, chọn mục đóng', async () => {
    const { user } = setup();
    const isOpen = () => sidebar().classList.contains('shell-sidebar--open');
    const burger = () => screen.getByRole('button', { name: /menu/i });
    expect(isOpen()).toBe(false);
    await user.click(burger());
    expect(isOpen()).toBe(true);
    expect(burger()).toHaveAttribute('aria-expanded', 'true');
    await user.click(burger());
    expect(isOpen()).toBe(false);

    await user.click(burger());
    await user.keyboard('{Escape}');
    expect(isOpen()).toBe(false);

    await user.click(burger());
    await user.click(screen.getByRole('button', { name: 'Văn bản' }));
    expect(isOpen()).toBe(false);
    expect(screen.getByTestId('path')).toHaveTextContent('/documents');

    await user.click(burger());
    await user.click(screen.getByTestId('shell-scrim'));
    expect(isOpen()).toBe(false);
  });

  it('mở thì focus mục đầu tiên, đóng thì trả focus về hamburger', async () => {
    const { user } = setup();
    const burger = screen.getByRole('button', { name: /menu/i });
    await user.click(burger);
    expect(sidebar().querySelector('.shell-nav-item')).toHaveFocus();
    await user.keyboard('{Escape}');
    expect(burger).toHaveFocus();
  });

  it('Escape đã bị xử lý nơi khác (defaultPrevented) thì không đóng drawer', async () => {
    const { user } = setup();
    await user.click(screen.getByRole('button', { name: /menu/i }));
    const stop = (e: KeyboardEvent) => e.preventDefault();
    document.addEventListener('keydown', stop, true);
    await user.keyboard('{Escape}');
    document.removeEventListener('keydown', stop, true);
    expect(sidebar().classList.contains('shell-sidebar--open')).toBe(true);
  });
});

describe('aria-current', () => {
  const current = () => Array.from(sidebar().querySelectorAll('[aria-current="page"]')).map((e) => e.textContent);

  it('/activities và /activity/5 tô sáng Hoạt động', () => {
    setup({ path: '/activities' });
    expect(current()).toEqual(['Hoạt động']);
    cleanup();
    setup({ path: '/activity/5' });
    expect(current()).toEqual(['Hoạt động']);
  });

  it('/dashboard tô sáng Tổng quan', () => {
    setup({ path: '/dashboard' });
    expect(current()).toContain('Tổng quan');
    expect(screen.getByRole('button', { name: 'Về trang tổng quan' })).toHaveAttribute('aria-current', 'page');
  });

  it('/my-tasks-today không có mục riêng (Task 8 sẽ chuyển hướng về tab Hôm nay của Việc của tôi); /inbox tô sáng Hộp thư', () => {
    setup({ path: '/my-tasks-today' });
    expect(current()).toEqual([]);
    cleanup();
    setup({ path: '/inbox' });
    expect(current()).toEqual(['Hộp thư']);
  });

  it('/team/3 tô sáng Các tổ', () => {
    setup({ path: '/team/3' });
    expect(current()).toEqual(['Các tổ']);
  });
});

describe('quyền hiển thị mục', () => {
  const has = (name: string) => screen.queryByRole('button', { name }) !== null;

  it('mặc định ẩn Giao việc, Trình, Báo cáo, Quản trị tài khoản', () => {
    setup();
    for (const n of ['Giao việc', 'Trình', 'Báo cáo', 'Quản trị tài khoản']) expect(has(n)).toBe(false);
    for (const n of ['Hoạt động', 'Văn bản', 'Các tổ', 'Lịch', 'Thành viên', 'Lưu trữ', 'Việc của tôi']) expect(has(n)).toBe(true);
  });

  it('hiện từng nhóm theo cờ', () => {
    setup({ props: { canViewDieuHanh: true, canViewReports: true, canViewAccounts: true } });
    for (const n of ['Giao việc', 'Trình', 'Báo cáo', 'Quản trị tài khoản']) expect(has(n)).toBe(true);
  });

  it('Tổng quan luôn hiện', () => {
    setup();
    expect(has('Tổng quan')).toBe(true);
  });

  it('chỉ dieuHanh', () => {
    setup({ props: { canViewDieuHanh: true } });
    expect(has('Giao việc')).toBe(true);
    expect(has('Báo cáo')).toBe(false);
  });
});

// data-theme là danh sách từ: Atlaskit thêm `dark:dark ...`, shell thêm từ `dark`/`light` cho token --ui-*.
const mode = () => document.documentElement.getAttribute('data-theme')?.split(/\s+/).find((w) => w === 'light' || w === 'dark');

describe('theme', () => {
  it('bật tối đặt data-theme và ghi tckt_theme; bật lại sáng', async () => {
    const { user } = setup();
    await user.click(screen.getByRole('button', { name: 'Chuyển sang giao diện tối' }));
    expect(mode()).toBe('dark');
    expect(localStorage.getItem('tckt_theme')).toBe('dark');
    await user.click(screen.getByRole('button', { name: 'Chuyển sang giao diện sáng' }));
    expect(mode()).toBe('light');
    expect(localStorage.getItem('tckt_theme')).toBe('light');
  });

  it('localStorage ném lỗi vẫn đổi được theme', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked'); });
    const { user } = setup();
    expect(mode()).toBe('light');
    await user.click(screen.getByRole('button', { name: 'Chuyển sang giao diện tối' }));
    expect(mode()).toBe('dark');
  });
});

describe('Hộp thư và poller', () => {
  it('huy hiệu hiện số chưa đọc kèm nhãn truy cập', async () => {
    setup({ unread: 4 });
    expect(await screen.findByTestId('notification-badge')).toHaveTextContent('4');
    expect(screen.getByRole('button', { name: 'Hộp thư, 4 chưa xem' })).toBeInTheDocument();
    expect(screen.getByTestId('notification-badge')).toHaveAttribute('aria-hidden', 'true');
  });

  it('150 chưa đọc hiện 99+', async () => {
    setup({ unread: 150 });
    expect(await screen.findByTestId('notification-badge')).toHaveTextContent('99+');
  });

  it('không có huy hiệu khi 0 chưa đọc', async () => {
    setup({ unread: 0 });
    await waitFor(() => expect(api.fetchNotifications).toHaveBeenCalled());
    expect(screen.queryByTestId('notification-badge')).toBeNull();
  });

  it('chỉ tải thông báo một lần (một poller) dù có bell và popups', async () => {
    setup({ unread: 2 });
    await screen.findByTestId('notification-badge');
    expect(api.fetchNotifications).toHaveBeenCalledTimes(1);
  });

  it('bấm Hộp thư đi tới /inbox', async () => {
    const { user } = setup({ unread: 1 });
    await user.click(screen.getByRole('button', { name: /Hộp thư/ }));
    expect(screen.getByTestId('path')).toHaveTextContent('/inbox');
  });
});

describe('tài khoản và đăng xuất', () => {
  it('gọi onOpenAccount và onLogout', async () => {
    const onOpenAccount = vi.fn();
    const onLogout = vi.fn();
    const { user } = setup({ props: { onOpenAccount, onLogout } });
    expect(screen.getByRole('button', { name: 'Tài khoản của tôi' })).toHaveTextContent('Phạm An');
    await user.click(screen.getByRole('button', { name: 'Tài khoản của tôi' }));
    await user.click(screen.getByRole('button', { name: 'Đăng xuất tài khoản' }));
    expect(onOpenAccount).toHaveBeenCalledTimes(1);
    expect(onLogout).toHaveBeenCalledTimes(1);
  });
});

import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { MineView } from './MineView';
import { ToastProvider } from '../../../shared/components/Toast';
import { TaskModalContext } from '../tasks/TaskModalProvider';
import { todayVnKey } from '../../../shared/utils/date';
import * as mineApi from './mineTasks';
import type { MineTask } from './mineTasks';
import * as api from '../../api';

vi.mock('./mineTasks', async () => {
  const actual = await vi.importActual<typeof import('./mineTasks')>('./mineTasks');
  return { ...actual, fetchMyTaskList: vi.fn() };
});
vi.mock('../../api', async () => {
  const actual = await vi.importActual<typeof import('../../api')>('../../api');
  return { ...actual, acknowledgeTask: vi.fn(), updateTaskStatus: vi.fn() };
});

const day = (n: number) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date(new Date(`${todayVnKey()}T12:00:00Z`).getTime() + n * 86400000));
const task = (id: number, title: string, over: Partial<MineTask> = {}): MineTask => ({
  id, title, status: 'todo', priority: 'medium', deadline: day(0), team_id: 1, team_name: 'Tổ A',
  activity_id: 1, activity_title: 'Đại hội', primary_assignee_id: 7, assignee_name: 'An',
  acknowledged_at: '2026-10-01T00:00:00Z', review_feedback: null, ...over,
});

const MINE = [
  task(1, 'Hôm qua', { deadline: day(-1) }),
  task(2, 'Hôm nay', { deadline: day(0) }),
  task(3, 'Ngày mai', { deadline: day(1) }),
  task(4, 'Đã xong', { deadline: day(0), status: 'done' }),
  task(5, 'Mới giao', { deadline: day(2), acknowledged_at: null }),
  task(6, 'Bị trả', { deadline: day(2), review_feedback: 'Làm lại phần 2' }),
];
const REVIEW = [task(9, 'Người khác nộp', { status: 'review', primary_assignee_id: 99, assignee_name: 'Bình' })];

const Probe = () => { const l = useLocation(); return <div data-testid="loc">{l.pathname}{l.search}</div>; };

function setup(path: string, data: { mine?: MineTask[]; review?: MineTask[] } = {}, open = vi.fn()) {
  vi.mocked(mineApi.fetchMyTaskList).mockImplementation(async (kind) => (kind === 'mine' ? data.mine ?? MINE : data.review ?? REVIEW));
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const user = userEvent.setup();
  render(
    <QueryClientProvider client={qc}>
      <ToastProvider>
        <TaskModalContext.Provider value={{ open, close: vi.fn() }}>
          <MemoryRouter initialEntries={[path]}>
            <Routes><Route path="/my-tasks" element={<><MineView /><Probe /></>} /></Routes>
          </MemoryRouter>
        </TaskModalContext.Provider>
      </ToastProvider>
    </QueryClientProvider>
  );
  return { user, open };
}
const tabBtn = (name: RegExp) => screen.getByRole('tab', { name });

beforeEach(() => { vi.clearAllMocks(); });
afterEach(cleanup);

describe('MineView', () => {
  it('tab Hôm nay: chỉ việc của tôi hạn hôm nay (không gồm quá hạn, ngày mai, đã xong, việc người khác)', async () => {
    setup('/my-tasks?tab=today');
    expect(await screen.findByRole('button', { name: /Hôm nay/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Hôm qua/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /Ngày mai/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /Đã xong/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /Người khác nộp/ })).toBeNull();
  });

  it('tab Quá hạn: chỉ việc hạn trước hôm nay', async () => {
    setup('/my-tasks?tab=overdue');
    expect(await screen.findByRole('button', { name: /Hôm qua/ })).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(1);
  });

  it('tab Chờ tôi duyệt: lấy từ truy vấn pending_review', async () => {
    setup('/my-tasks?tab=review');
    expect(await screen.findByRole('button', { name: /Người khác nộp/ })).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(1);
  });

  it('tab Tất cả: mọi việc của tôi chưa xong', async () => {
    setup('/my-tasks?tab=all');
    await screen.findByRole('button', { name: /Hôm qua/ });
    expect(screen.getAllByRole('listitem')).toHaveLength(5); // trừ "Đã xong"
    expect(screen.queryByRole('button', { name: /Đã xong/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /Người khác nộp/ })).toBeNull();
  });

  it('không có tab trên URL = Tất cả; tab sai = Hôm nay', async () => {
    setup('/my-tasks');
    await screen.findByRole('button', { name: /Hôm qua/ });
    expect(tabBtn(/^Tất cả/)).toHaveAttribute('aria-selected', 'true');
    cleanup();
    setup('/my-tasks?tab=xyz');
    await screen.findByRole('button', { name: /Hôm nay/ });
    expect(tabBtn(/^Hôm nay/)).toHaveAttribute('aria-selected', 'true');
  });

  it('đổi tab ghi vào URL', async () => {
    const { user } = setup('/my-tasks?tab=today');
    await screen.findByRole('button', { name: /Hôm nay/ });
    await user.click(tabBtn(/^Quá hạn/));
    expect(screen.getByTestId('loc')).toHaveTextContent('/my-tasks?tab=overdue');
    expect(await screen.findByRole('button', { name: /Hôm qua/ })).toBeInTheDocument();
  });

  it('nhãn tab có số đếm', async () => {
    setup('/my-tasks?tab=today');
    await screen.findByRole('button', { name: /Hôm nay/ });
    expect(tabBtn(/^Hôm nay/)).toHaveTextContent('Hôm nay1');
    expect(tabBtn(/^Quá hạn/)).toHaveTextContent('Quá hạn1');
    expect(tabBtn(/^Chờ tôi duyệt/)).toHaveTextContent('Chờ tôi duyệt1');
    expect(tabBtn(/^Tất cả/)).toHaveTextContent('Tất cả5');
  });

  it('trạng thái rỗng theo từng tab', async () => {
    const { user } = setup('/my-tasks?tab=today', { mine: [], review: [] });
    expect(await screen.findByText('Hôm nay không có việc nào đến hạn.')).toBeInTheDocument();
    await user.click(tabBtn(/^Quá hạn/));
    expect(screen.getByText('Không có việc quá hạn.')).toBeInTheDocument();
    await user.click(tabBtn(/^Chờ tôi duyệt/));
    expect(screen.getByText('Không có việc nào chờ bạn duyệt.')).toBeInTheDocument();
    await user.click(tabBtn(/^Tất cả/));
    expect(screen.getByText('Bạn không có việc nào đang mở.')).toBeInTheDocument();
  });

  it('huy hiệu Mới được giao / Bị trả lại', async () => {
    setup('/my-tasks?tab=all');
    await screen.findByRole('button', { name: /Mới giao/ });
    expect(screen.getAllByText('Mới được giao')).toHaveLength(1);
    expect(screen.getAllByText('Bị trả lại')).toHaveLength(1);
  });

  it('bấm dòng mở chi tiết việc qua TaskModal', async () => {
    const { user, open } = setup('/my-tasks?tab=today');
    await user.click(await screen.findByRole('button', { name: /Hôm nay/ }));
    expect(open).toHaveBeenCalledWith(2);
  });

  it('nút Xác nhận chỉ cho việc chưa xác nhận và gọi acknowledgeTask', async () => {
    vi.mocked(api.acknowledgeTask).mockResolvedValue({ ok: true });
    const { user } = setup('/my-tasks?tab=all');
    await screen.findByRole('button', { name: /Mới giao/ });
    const btns = screen.getAllByRole('button', { name: /^Xác nhận/ });
    expect(btns).toHaveLength(1);
    await user.click(btns[0]);
    await waitFor(() => expect(api.acknowledgeTask).toHaveBeenCalledWith(5));
  });

  it('Bắt đầu làm / Tạm dừng gọi updateTaskStatus; không có ở tab Chờ tôi duyệt', async () => {
    vi.mocked(api.updateTaskStatus).mockResolvedValue({ ok: true });
    const { user } = setup('/my-tasks?tab=all', { mine: [task(1, 'Chưa làm'), task(2, 'Đang làm', { status: 'in_progress' })] });
    await screen.findByRole('button', { name: /Chưa làm/ });
    await user.click(screen.getByRole('button', { name: 'Bắt đầu làm' }));
    await waitFor(() => expect(api.updateTaskStatus).toHaveBeenCalledWith(1, 'in_progress'));
    await user.click(screen.getByRole('button', { name: 'Tạm dừng' }));
    await waitFor(() => expect(api.updateTaskStatus).toHaveBeenCalledWith(2, 'todo'));
    await user.click(tabBtn(/^Chờ tôi duyệt/));
    await screen.findByRole('button', { name: /Người khác nộp/ });
    expect(screen.queryByRole('button', { name: 'Bắt đầu làm' })).toBeNull();
  });

  it('lỗi tải hiện thông báo', async () => {
    vi.mocked(mineApi.fetchMyTaskList).mockRejectedValue(new Error('x'));
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={qc}><ToastProvider><MemoryRouter initialEntries={['/my-tasks?tab=all']}><Routes><Route path="/my-tasks" element={<MineView />} /></Routes></MemoryRouter></ToastProvider></QueryClientProvider>
    );
    expect(await screen.findByText('Lỗi tải danh sách công việc.')).toBeInTheDocument();
  });
  it('số đếm tab Chờ tôi duyệt ẩn cho tới khi truy vấn duyệt thành công', async () => {
    let release: (v: MineTask[]) => void = () => {};
    vi.mocked(mineApi.fetchMyTaskList).mockImplementation((kind) => (kind === 'mine' ? Promise.resolve(MINE) : new Promise<MineTask[]>((r) => { release = r; })));
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={qc}><ToastProvider><MemoryRouter initialEntries={['/my-tasks?tab=all']}><Routes><Route path="/my-tasks" element={<MineView />} /></Routes></MemoryRouter></ToastProvider></QueryClientProvider>
    );
    await screen.findByRole('tab', { name: /^Tất cả\s*\d/ });
    expect(screen.getByRole('tab', { name: /^Chờ tôi duyệt$/ })).toBeInTheDocument();
    release(REVIEW);
    await waitFor(() => expect(screen.getByRole('tab', { name: /^Chờ tôi duyệt\s*1$/ })).toBeInTheDocument());
  });

  it('ranh giới ngày: 18:00Z ngày 10/10 đã là 11/10 theo giờ Việt Nam', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-10T18:00:00Z'));
    try {
      setup('/my-tasks?tab=today', {
        mine: [task(1, 'Hạn 11/10', { deadline: '2026-10-11' }), task(2, 'Hạn 10/10', { deadline: '2026-10-10' })],
      });
      expect(await screen.findByRole('button', { name: /Hạn 11\/10/ })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Hạn 10\/10/ })).toBeNull();
      expect(tabBtn(/^Quá hạn\s*1$/)).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });
});

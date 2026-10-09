import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { MyTasksToday } from './MyTasksToday';
import { TaskModalContext } from './TaskModalProvider';
import { renderApp } from './testUtils';
import { MY_TASKS_TODAY_KEY } from '../../queryKeys';
import * as api from '../../api';

vi.mock('../../api', async () => {
  const actual = await vi.importActual<typeof import('../../api')>('../../api');
  return { ...actual, fetchMyTasksToday: vi.fn(), acknowledgeTask: vi.fn() };
});

const row = (over: Partial<api.TaskItem> = {}): api.TaskItem => ({
  id: 101,
  activity_id: 1,
  team_id: 2,
  title: 'Chuẩn bị phòng họp',
  status: 'in_progress',
  priority: 'high',
  deadline: '2026-10-08T17:00:00Z',
  activity_title: 'Đại hội Chi đoàn',
  team_name: 'Tổ Tổ chức',
  assignee_name: 'Nguyễn Văn A',
  ...over,
});

const data = (): api.MyTasksTodayResponse => ({
  dueToday: [row()],
  overdue: [row({ id: 102, title: 'Báo cáo tháng 9', status: 'todo' })],
  pendingMyReview: [row({ id: 103, title: 'Duyệt bài đăng', status: 'review' })],
});

describe('MyTasksToday', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.fetchMyTasksToday).mockResolvedValue(data());
    vi.mocked(api.acknowledgeTask).mockResolvedValue({ ok: true });
  });
  afterEach(cleanup);

  it('hiện tiêu đề, ba mục và dòng công việc', async () => {
    renderApp(<MyTasksToday />);
    expect(screen.getByText('Công việc hôm nay')).toBeDefined();
    expect(await screen.findByText('Chuẩn bị phòng họp')).toBeDefined();
    expect(screen.getByText('Báo cáo tháng 9')).toBeDefined();
    expect(screen.getByText('Chờ bạn duyệt')).toBeDefined();
    expect(screen.getByText('Duyệt bài đăng')).toBeDefined();
  });

  it('mục trống hiện thông báo trống', async () => {
    vi.mocked(api.fetchMyTasksToday).mockResolvedValue({ dueToday: [], overdue: [], pendingMyReview: [] });
    renderApp(<MyTasksToday />);
    expect(await screen.findByText('Không có việc đến hạn hôm nay')).toBeDefined();
    expect(screen.getByText('Không có việc quá hạn')).toBeDefined();
    expect(screen.getByText('Không có việc chờ bạn duyệt')).toBeDefined();
  });

  it('hiển thị hạn theo ngày Việt Nam và nhãn "Cần làm" cho trạng thái open', async () => {
    vi.mocked(api.fetchMyTasksToday).mockResolvedValue({ dueToday: [row({ id: 201, title: 'Việc mới giao', status: 'open', priority: 'medium' })], overdue: [], pendingMyReview: [] });
    renderApp(<MyTasksToday />);
    expect(await screen.findByText('Việc mới giao')).toBeDefined();
    expect(screen.getByText(/Hạn: 09\/10\/2026/)).toBeDefined();
    expect(screen.getByText('Cần làm')).toBeDefined();
  });

  it('Xác nhận gọi API, làm mới cache và ẩn nút ở dòng đó', async () => {
    const { qc } = renderApp(<MyTasksToday />);
    const spy = vi.spyOn(qc, 'invalidateQueries');
    const ackButtons = await screen.findAllByRole('button', { name: 'Xác nhận' });
    expect(ackButtons).toHaveLength(2);
    fireEvent.click(ackButtons[0]);
    await waitFor(() => expect(api.acknowledgeTask).toHaveBeenCalledWith(101));
    expect(await screen.findByText('Đã xác nhận nhận việc')).toBeDefined();
    expect(spy).toHaveBeenCalledWith({ queryKey: MY_TASKS_TODAY_KEY });
    expect(screen.getAllByRole('button', { name: 'Xác nhận' })).toHaveLength(1);
  });

  it('lỗi khi xác nhận hiện tiếng Việt và giữ nút', async () => {
    vi.mocked(api.acknowledgeTask).mockRejectedValueOnce({ response: { status: 403, data: { error: 'Bạn không được giao công việc này.' } } });
    renderApp(<MyTasksToday />);
    fireEvent.click((await screen.findAllByRole('button', { name: 'Xác nhận' }))[0]);
    expect(await screen.findByText('Bạn không được giao công việc này.')).toBeDefined();
    expect(screen.getAllByRole('button', { name: 'Xác nhận' })).toHaveLength(2);
  });

  it('Nộp nghiệm thu mở hộp theo từng dòng (chỉ việc todo/in_progress)', async () => {
    renderApp(<MyTasksToday />);
    const submit = await screen.findAllByRole('button', { name: 'Nộp nghiệm thu' });
    expect(submit).toHaveLength(2);
    fireEvent.click(submit[0]);
    expect(await screen.findByText('Nộp nghiệm thu: Chuẩn bị phòng họp')).toBeDefined();
  });

  it('mục "Chờ bạn duyệt" có ba nút duyệt và không có Xác nhận/Nộp nghiệm thu', async () => {
    vi.mocked(api.fetchMyTasksToday).mockResolvedValue({ dueToday: [], overdue: [], pendingMyReview: [row({ id: 103, title: 'Duyệt bài đăng', status: 'review' })] });
    renderApp(<MyTasksToday />);
    await screen.findByText('Duyệt bài đăng');
    expect(screen.getByRole('button', { name: 'Duyệt đạt' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Yêu cầu làm lại' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Bác bỏ' })).toBeDefined();
    expect(screen.queryByRole('button', { name: 'Xác nhận' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Nộp nghiệm thu' })).toBeNull();
  });

  it('Xem chi tiết và bấm tiêu đề mở hộp công việc', async () => {
    const open = vi.fn();
    renderApp(<TaskModalContext.Provider value={{ open, close: vi.fn() }}><MyTasksToday /></TaskModalContext.Provider>);
    fireEvent.click((await screen.findAllByRole('button', { name: 'Xem chi tiết' }))[0]);
    expect(open).toHaveBeenCalledWith(101);
    fireEvent.click(screen.getByRole('button', { name: 'Báo cáo tháng 9' }));
    expect(open).toHaveBeenCalledWith(102);
  });
});

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { Route, Routes, useLocation } from 'react-router-dom';
import { TaskModalProvider, TaskRoute, useTaskModal } from './TaskModalProvider';
import { renderApp } from './testUtils';
import * as api from '../../api';

vi.mock('../../api', async () => {
  const actual = await vi.importActual<typeof import('../../api')>('../../api');
  return { ...actual, fetchTask: vi.fn(), fetchActivityBoard: vi.fn() };
});

const Probe = () => <div data-testid="path">{useLocation().pathname}</div>;
const Opener = () => {
  const { open } = useTaskModal();
  return <button onClick={() => open(5)}>mở việc</button>;
};

const task = {
  id: 5,
  activity_id: 9,
  team_id: 2,
  title: 'Dựng sân khấu',
  status: 'done',
  priority: 'low',
  deadline: '2026-10-31',
  assignee_ids: '1',
};
const detail = {
  task,
  assignees: [],
  attachments: [],
  updates: [],
  checklist: [],
  canUpdate: false,
  myAcknowledgedAt: null,
};

describe('TaskModalProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.fetchTask).mockResolvedValue(detail as never);
  });
  afterEach(cleanup);

  it('open() mở hộp từ bất kỳ danh sách nào và Đóng thì tắt, giữ nguyên trang', async () => {
    renderApp(
      <TaskModalProvider>
        <Opener />
        <Probe />
      </TaskModalProvider>,
      { path: '/my-tasks' }
    );
    fireEvent.click(screen.getByText('mở việc'));
    expect(await screen.findByText('Dựng sân khấu')).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Đóng' }));
    expect(screen.queryByText('Dựng sân khấu')).toBeNull();
    expect(screen.getByTestId('path').textContent).toBe('/my-tasks');
  });

  it('#task/:id mở hộp trên nền Tổng quan; đóng thì về /dashboard', async () => {
    renderApp(
      <TaskModalProvider>
        <Routes>
          <Route path="/task/:id" element={<TaskRoute><div>nền-tổng-quan</div></TaskRoute>} />
          <Route path="/dashboard" element={<div>nền-tổng-quan-sạch</div>} />
        </Routes>
        <Probe />
      </TaskModalProvider>,
      { path: '/task/5' }
    );
    expect(screen.getByText('nền-tổng-quan')).toBeDefined();
    expect(await screen.findByText('Dựng sân khấu')).toBeDefined();
    expect(api.fetchTask).toHaveBeenCalledWith(5);
    fireEvent.click(screen.getByRole('button', { name: 'Đóng' }));
    expect(await screen.findByText('nền-tổng-quan-sạch')).toBeDefined();
    expect(screen.getByTestId('path').textContent).toBe('/dashboard');
  });

  it('id không hợp lệ về Tổng quan', () => {
    renderApp(
      <TaskModalProvider>
        <Routes>
          <Route path="/task/:id" element={<TaskRoute><div>nền</div></TaskRoute>} />
          <Route path="/dashboard" element={<div>về-tổng-quan</div>} />
        </Routes>
      </TaskModalProvider>,
      { path: '/task/abc' }
    );
    expect(screen.getByText('về-tổng-quan')).toBeDefined();
    expect(api.fetchTask).not.toHaveBeenCalled();
  });

  it('đang có nháp: Đóng hỏi xác nhận; Ở lại giữ ngăn và nháp, Bỏ thay đổi mới đóng', async () => {
    vi.mocked(api.fetchTask).mockResolvedValue({ ...detail, editable: ['title'] } as never);
    renderApp(
      <TaskModalProvider>
        <Opener />
      </TaskModalProvider>,
      { path: '/my-tasks' }
    );
    fireEvent.click(screen.getByText('mở việc'));
    const box = await screen.findByRole('textbox', { name: 'Tiêu đề công việc' });
    fireEvent.change(box, { target: { value: 'Đã sửa dở' } });
    fireEvent.click(screen.getByRole('button', { name: 'Đóng' }));
    expect(await screen.findByText('Bạn có thay đổi chưa lưu. Rời đi sẽ mất các thay đổi này.')).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Ở lại' }));
    expect((screen.getByRole('textbox', { name: 'Tiêu đề công việc' }) as HTMLInputElement).value).toBe('Đã sửa dở');
    fireEvent.click(screen.getByRole('button', { name: 'Đóng' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Bỏ thay đổi' }));
    await waitFor(() => expect(screen.queryByRole('textbox', { name: 'Tiêu đề công việc' })).toBeNull());
  });
});

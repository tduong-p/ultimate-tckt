import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { TaskDetailModal } from './TaskDetailModal';
import { renderApp, makeSession } from './testUtils';
import { TASK_KEY } from '../../queryKeys';
import * as api from '../../api';

vi.mock('../../api', async () => {
  const actual = await vi.importActual<typeof import('../../api')>('../../api');
  return { ...actual, fetchTask: vi.fn(), fetchActivityBoard: vi.fn(), acknowledgeTask: vi.fn(), cancelTask: vi.fn() };
});

const baseTask = {
  id: 5,
  activity_id: 9,
  team_id: 2,
  title: 'Dựng sân khấu',
  description: 'Chuẩn bị sân khấu chính',
  status: 'in_progress',
  priority: 'high',
  deadline: '2026-10-31T17:00:00.000Z',
  start_date: null,
  activity_title: 'Ngày hội',
  team_name: 'Tổ Sự kiện',
  deliverable: 'Ảnh nghiệm thu',
  assignee_ids: '7',
  is_self_logged: 0,
  weight: 1,
};
const detail = (over: Record<string, unknown> = {}, taskOver: Record<string, unknown> = {}) => ({
  task: { ...baseTask, ...taskOver },
  assignees: [{ user_id: 7, is_primary: 1, acknowledged_at: null, name: 'Nguyễn An' }],
  attachments: [],
  updates: [],
  checklist: [],
  canUpdate: true,
  myAcknowledgedAt: null,
  ...over,
});

describe('TaskDetailModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.acknowledgeTask).mockResolvedValue({ ok: true });
    vi.mocked(api.cancelTask).mockResolvedValue({ ok: true });
    Element.prototype.scrollIntoView = vi.fn();
  });
  afterEach(cleanup);

  it('hiện thông tin, người được giao (chính, chờ xác nhận) và sản phẩm cần nộp', async () => {
    vi.mocked(api.fetchTask).mockResolvedValue(detail() as never);
    renderApp(<TaskDetailModal taskId={5} onClose={() => {}} />);
    expect(await screen.findByText('Dựng sân khấu')).toBeDefined();
    expect(screen.getByText('Chuẩn bị sân khấu chính')).toBeDefined();
    expect(screen.getByText(/Nguyễn An \(chính\)/)).toBeDefined();
    expect(screen.getByText('Ảnh nghiệm thu')).toBeDefined();
    expect(screen.getByText('01/11/2026')).toBeDefined();
  });

  it('người được giao: xác nhận nhận việc gọi API và làm mới cache', async () => {
    vi.mocked(api.fetchTask).mockResolvedValue(detail() as never);
    const { qc } = renderApp(<TaskDetailModal taskId={5} onClose={() => {}} />);
    const spy = vi.spyOn(qc, 'invalidateQueries');
    fireEvent.click(await screen.findByRole('button', { name: 'Xác nhận nhận việc' }));
    await waitFor(() => expect(api.acknowledgeTask).toHaveBeenCalledWith(5));
    expect(await screen.findByText('Đã xác nhận nhận việc')).toBeDefined();
    expect(spy).toHaveBeenCalledWith({ queryKey: TASK_KEY(5) });
  });

  it('đã xác nhận thì hiện ngày, không còn nút', async () => {
    vi.mocked(api.fetchTask).mockResolvedValue(detail({ myAcknowledgedAt: '2026-10-08T03:00:00Z' }) as never);
    renderApp(<TaskDetailModal taskId={5} onClose={() => {}} />);
    expect(await screen.findByText(/Đã xác nhận · 08\/10\/2026/)).toBeDefined();
    expect(screen.queryByRole('button', { name: 'Xác nhận nhận việc' })).toBeNull();
  });

  it('không còn nút/hộp "Sửa" riêng: sửa tại chỗ theo editable[] (xem TaskDetailEdit.test)', async () => {
    vi.mocked(api.fetchTask).mockResolvedValue(detail({ editable: ['title', 'description'] }) as never);
    renderApp(<TaskDetailModal taskId={5} onClose={() => {}} />, { session: makeSession({ id: 3, role: 'leader' }), teams: [{ id: 2, can_manage: 1 }] });
    expect(await screen.findByRole('textbox', { name: 'Tiêu đề công việc' })).toBeDefined();
    expect(screen.queryByRole('button', { name: 'Sửa' })).toBeNull();
  });

  it('nút Đóng gọi onClose', async () => {
    vi.mocked(api.fetchTask).mockResolvedValue(detail() as never);
    const onClose = vi.fn();
    renderApp(<TaskDetailModal taskId={5} onClose={onClose} />);
    await screen.findByText('Dựng sân khấu');
    fireEvent.click(screen.getByRole('button', { name: 'Đóng' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('nộp nghiệm thu chỉ cho người được giao khi todo/in_progress; mở từ nút tích thì cuộn tới đó', async () => {
    vi.mocked(api.fetchTask).mockResolvedValue(detail() as never);
    renderApp(<TaskDetailModal taskId={5} focusSubmit onClose={() => {}} />);
    expect(await screen.findByRole('heading', { name: 'Nộp nghiệm thu' })).toBeDefined();
    await waitFor(() => expect(Element.prototype.scrollIntoView).toHaveBeenCalled());
    cleanup();

    vi.mocked(api.fetchTask).mockResolvedValue(detail({}, { assignee_ids: '8' }) as never);
    renderApp(<TaskDetailModal taskId={5} onClose={() => {}} />);
    await screen.findByText('Dựng sân khấu');
    expect(screen.queryByRole('heading', { name: 'Nộp nghiệm thu' })).toBeNull();
  });

  it('nút duyệt chỉ hiện cho admin/quản lý Tổ khi việc ở "Chờ duyệt"', async () => {
    vi.mocked(api.fetchTask).mockResolvedValue(detail({}, { status: 'review' }) as never);
    renderApp(<TaskDetailModal taskId={5} onClose={() => {}} />, { session: makeSession({ id: 1, role: 'admin' }) });
    expect(await screen.findByRole('button', { name: 'Duyệt đạt' })).toBeDefined();
    cleanup();

    vi.mocked(api.fetchActivityBoard).mockResolvedValue({
      activity: { id: 9, event_lead_id: 99 },
      activityTeams: [],
      tasks: [],
      canManage: false,
    } as never);
    renderApp(<TaskDetailModal taskId={5} onClose={() => {}} />);
    await screen.findByText('Dựng sân khấu');
    await waitFor(() => expect(api.fetchActivityBoard).toHaveBeenCalledWith(9));
    expect(screen.queryByRole('button', { name: 'Duyệt đạt' })).toBeNull();
  });

  it('Trưởng ban tổ chức (không phải quản lý Tổ) duyệt được', async () => {
    vi.mocked(api.fetchTask).mockResolvedValue(detail({}, { status: 'review', assignee_ids: '8' }) as never);
    vi.mocked(api.fetchActivityBoard).mockResolvedValue({
      activity: { id: 9, event_lead_id: 7 },
      activityTeams: [],
      tasks: [],
      canManage: false,
    } as never);
    renderApp(<TaskDetailModal taskId={5} onClose={() => {}} />);
    expect(await screen.findByRole('button', { name: 'Duyệt đạt' })).toBeDefined();
  });

  it('rút lại việc tự ghi nhận: phải xác nhận, rồi gọi cancel và đóng hộp', async () => {
    vi.mocked(api.fetchTask).mockResolvedValue(detail({}, { is_self_logged: 1, status: 'review' }) as never);
    const onClose = vi.fn();
    renderApp(<TaskDetailModal taskId={5} onClose={onClose} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Rút lại công việc này' }));
    expect(api.cancelTask).not.toHaveBeenCalled();
    fireEvent.click(await screen.findByRole('button', { name: 'Rút lại' }));
    await waitFor(() => expect(api.cancelTask).toHaveBeenCalledWith(5));
    expect(await screen.findByText('Đã rút lại công việc')).toBeDefined();
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it('lỗi tải hiện thông báo tiếng Việt', async () => {
    vi.mocked(api.fetchTask).mockRejectedValue({ response: { status: 404, data: { error: 'Task not found.' } } });
    renderApp(<TaskDetailModal taskId={5} onClose={() => {}} />);
    expect(await screen.findByText('Không tìm thấy công việc.')).toBeDefined();
  });
});

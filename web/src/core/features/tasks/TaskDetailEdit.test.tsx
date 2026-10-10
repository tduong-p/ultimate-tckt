// Sửa tại chỗ trên chi tiết công việc: quyền theo editable[], Lưu một lần qua /batch, 403/409/400, thanh Lưu/Hủy.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { TaskDetailModal } from './TaskDetailModal';
import { renderApp, makeSession } from './testUtils';
import { TASK_KEY, MY_TASKS_TODAY_KEY } from '../../queryKeys';
import * as api from '../../api';
import * as editApi from '../../edit/editApi';

vi.mock('../../api', async () => {
  const actual = await vi.importActual<typeof import('../../api')>('../../api');
  return { ...actual, fetchTask: vi.fn(), fetchActivityBoard: vi.fn(), fetchTeams: vi.fn(), fetchTeamMembers: vi.fn() };
});
vi.mock('../../edit/editApi', async () => {
  const actual = await vi.importActual<typeof import('../../edit/editApi')>('../../edit/editApi');
  return { ...actual, patchTaskBatch: vi.fn() };
});

const ALL = ['title', 'description', 'primary_assignee_id', 'co_assignee_ids', 'team_id', 'deadline', 'start_date', 'priority', 'deliverable'];
const LIGHT = ['title', 'description'];

const baseTask = {
  id: 5, activity_id: 9, team_id: 2, title: 'Dựng sân khấu', description: 'Chuẩn bị sân khấu chính', status: 'in_progress',
  priority: 'high', deadline: '2026-10-31T17:00:00.000Z', start_date: null, activity_title: 'Ngày hội', team_name: 'Tổ Sự kiện',
  deliverable: 'Ảnh nghiệm thu', assignee_ids: '7', primary_assignee_id: 7, is_self_logged: 0, weight: 1,
};
const detail = (editable: string[] | undefined, taskOver: Record<string, unknown> = {}) => ({
  task: { ...baseTask, ...taskOver },
  assignees: [{ user_id: 7, is_primary: 1, acknowledged_at: null, name: 'Nguyễn An' }],
  attachments: [], updates: [], checklist: [], canUpdate: true, myAcknowledgedAt: null, editable,
});

const manager = { session: makeSession({ id: 3, role: 'leader' }), teams: [{ id: 2, can_manage: 1 }] };
const show = (opts: Parameters<typeof renderApp>[1] = {}) => renderApp(<TaskDetailModal taskId={5} onClose={() => {}} />, opts);
const titleBox = () => screen.findByRole('textbox', { name: 'Tiêu đề công việc' });
const saveBar = () => screen.queryByRole('region', { name: 'Thay đổi chưa lưu' });
const typeTitle = async (value: string) => {
  const box = await titleBox();
  fireEvent.change(box, { target: { value } });
  return box as HTMLInputElement;
};

describe('TaskDetailModal — sửa tại chỗ', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Element.prototype.scrollIntoView = vi.fn();
    vi.mocked(api.fetchTask).mockResolvedValue(detail(ALL) as never);
    vi.mocked(api.fetchTeams).mockResolvedValue([
      { id: 2, name: 'Tổ Sự kiện', is_active: 1 },
      { id: 3, name: 'Tổ Truyền thông', is_active: 1 },
    ] as never);
    vi.mocked(api.fetchTeamMembers).mockImplementation((async (id: number) => ({
      members: id === 2 ? [{ id: 7, name: 'Nguyễn An' }, { id: 8, name: 'Trần Bình' }] : [{ id: 9, name: 'Lê Cường' }],
      available: [],
    })) as never);
    vi.mocked(editApi.patchTaskBatch).mockResolvedValue({ changed: ['title'] });
  });
  afterEach(cleanup);

  it('người được giao (editable chỉ tiêu đề, mô tả): chỉ hai ô sửa, các trường khác chỉ đọc', async () => {
    vi.mocked(api.fetchTask).mockResolvedValue(detail(LIGHT) as never);
    show();
    expect(await titleBox()).toBeDefined();
    expect(screen.getByRole('textbox', { name: 'Mô tả' })).toBeDefined();
    for (const name of ['Hạn chót', 'Ngày bắt đầu', 'Ưu tiên', 'Tổ', 'Người phụ trách chính', 'Sản phẩm cần nộp']) {
      expect(screen.queryByLabelText(name)).toBeNull();
    }
    expect(screen.getByText('Ảnh nghiệm thu')).toBeDefined();
    expect(screen.getByText('01/11/2026')).toBeDefined();
    expect(api.fetchTeams).not.toHaveBeenCalled();
    expect(saveBar()).toBeNull();
  });

  it('tổ trưởng/quản lý (editable đủ): có ô sửa mọi trường', async () => {
    show(manager);
    await titleBox();
    for (const name of ['Mô tả', 'Hạn chót', 'Ngày bắt đầu', 'Ưu tiên', 'Tổ', 'Người phụ trách chính', 'Sản phẩm cần nộp']) {
      expect(screen.getByLabelText(name)).toBeDefined();
    }
  });

  it('editable rỗng hoặc vắng: không có ô sửa, không có thanh Lưu', async () => {
    vi.mocked(api.fetchTask).mockResolvedValue(detail([]) as never);
    show();
    expect(await screen.findByRole('heading', { level: 2, name: 'Dựng sân khấu' })).toBeDefined();
    expect(screen.queryByRole('textbox', { name: 'Tiêu đề công việc' })).toBeNull();
    cleanup();
    vi.mocked(api.fetchTask).mockResolvedValue(detail(undefined) as never);
    show();
    expect(await screen.findByRole('heading', { level: 2, name: 'Dựng sân khấu' })).toBeDefined();
    expect(screen.queryByRole('textbox', { name: 'Tiêu đề công việc' })).toBeNull();
    expect(saveBar()).toBeNull();
  });

  it('thanh Lưu/Hủy hiện khi có thay đổi và biến mất khi sửa lại về giá trị gốc hoặc bấm Hủy', async () => {
    show(manager);
    const box = await typeTitle('Dựng sân khấu lớn');
    expect(saveBar()).not.toBeNull();
    expect(screen.getByText('1 trường đã thay đổi')).toBeDefined();
    fireEvent.change(box, { target: { value: 'Dựng sân khấu' } });
    expect(saveBar()).toBeNull();
    fireEvent.change(box, { target: { value: 'Khác' } });
    fireEvent.click(screen.getByRole('button', { name: 'Hủy' }));
    expect(saveBar()).toBeNull();
    expect(box.value).toBe('Dựng sân khấu');
  });

  it('Lưu gọi /batch đúng một lần chỉ với trường đổi và base, toast, làm mới cache', async () => {
    const { qc } = show(manager);
    const invalidate = vi.spyOn(qc, 'invalidateQueries');
    await typeTitle('Dựng sân khấu lớn');
    fireEvent.change(screen.getByLabelText('Ưu tiên'), { target: { value: 'urgent' } });
    fireEvent.click(screen.getByRole('button', { name: 'Lưu' }));
    await waitFor(() => expect(editApi.patchTaskBatch).toHaveBeenCalledTimes(1));
    expect(editApi.patchTaskBatch).toHaveBeenCalledWith(5, {
      changes: { title: 'Dựng sân khấu lớn', priority: 'urgent' },
      base: { title: 'Dựng sân khấu', priority: 'high' },
    });
    expect(await screen.findByText('Đã lưu')).toBeDefined();
    expect(invalidate).toHaveBeenCalledWith({ queryKey: TASK_KEY(5) });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: MY_TASKS_TODAY_KEY });
    await waitFor(() => expect(saveBar()).toBeNull());
  });

  it('đổi Tổ và người phụ trách: gửi số nguyên đúng kiểu cùng base', async () => {
    show(manager);
    await titleBox();
    await screen.findByRole('option', { name: 'Tổ Truyền thông' });
    fireEvent.change(screen.getByLabelText('Tổ'), { target: { value: '3' } });
    expect(await screen.findByRole('option', { name: 'Lê Cường' })).toBeDefined();
    fireEvent.change(screen.getByLabelText('Người phụ trách chính'), { target: { value: '9' } });
    fireEvent.click(screen.getByRole('button', { name: 'Lưu' }));
    await waitFor(() => expect(editApi.patchTaskBatch).toHaveBeenCalledWith(5, {
      changes: { team_id: 3, primary_assignee_id: 9 },
      base: { team_id: 2, primary_assignee_id: 7 },
    }));
  });

  it('tiêu đề trống: không gọi API, ô tiêu đề aria-invalid và được focus', async () => {
    show(manager);
    const box = await typeTitle('   ');
    fireEvent.click(screen.getByRole('button', { name: 'Lưu' }));
    expect(editApi.patchTaskBatch).not.toHaveBeenCalled();
    expect(box.getAttribute('aria-invalid')).toBe('true');
    expect(document.activeElement).toBe(box);
    expect(await screen.findByText('Tiêu đề không được để trống.')).toBeDefined();
    fireEvent.change(box, { target: { value: 'Có chữ' } });
    expect(box.getAttribute('aria-invalid')).toBeNull();
  });

  it('ngày bắt đầu sau hạn chót: báo lỗi, không gọi API', async () => {
    show(manager);
    await titleBox();
    fireEvent.change(screen.getByLabelText('Ngày bắt đầu'), { target: { value: '2026-12-01' } });
    fireEvent.click(screen.getByRole('button', { name: 'Lưu' }));
    expect(await screen.findByText('Ngày bắt đầu phải trước hoặc bằng hạn chót.')).toBeDefined();
    expect(editApi.patchTaskBatch).not.toHaveBeenCalled();
  });

  it('409: báo "đã bị người khác sửa" kèm nút Tải lại; khoá Lưu; Tải lại bỏ nháp và tải bản mới', async () => {
    vi.mocked(editApi.patchTaskBatch).mockRejectedValueOnce({ response: { status: 409, data: { conflicts: ['title'] } } });
    show(manager);
    const box = await typeTitle('Của tôi');
    fireEvent.click(screen.getByRole('button', { name: 'Lưu' }));
    expect(await screen.findByText(/đã bị người khác sửa/)).toBeDefined();
    expect(screen.getByText(/Tiêu đề/, { selector: '.tk-notice span' })).toBeDefined();
    expect((screen.getByRole('button', { name: 'Lưu' }) as HTMLButtonElement).disabled).toBe(true);
    expect(box.value).toBe('Của tôi'); // nháp được giữ
    vi.mocked(api.fetchTask).mockResolvedValue(detail(ALL, { title: 'Của người khác' }) as never);
    fireEvent.click(screen.getByRole('button', { name: 'Tải lại' }));
    await waitFor(() => expect((screen.getByRole('textbox', { name: 'Tiêu đề công việc' }) as HTMLInputElement).value).toBe('Của người khác'));
    expect(saveBar()).toBeNull();
    expect(screen.queryByText(/đã bị người khác sửa/)).toBeNull();
  });

  it('409 rồi "Giữ của tôi": tải bản mới rồi lưu lại với base mới', async () => {
    vi.mocked(editApi.patchTaskBatch).mockRejectedValueOnce({ response: { status: 409, data: { conflicts: ['title'] } } });
    show(manager);
    await typeTitle('Của tôi');
    fireEvent.click(screen.getByRole('button', { name: 'Lưu' }));
    await screen.findByText(/đã bị người khác sửa/);
    vi.mocked(api.fetchTask).mockResolvedValue(detail(ALL, { title: 'Của người khác' }) as never);
    fireEvent.click(screen.getByRole('button', { name: 'Giữ của tôi' }));
    await waitFor(() => expect(editApi.patchTaskBatch).toHaveBeenCalledTimes(2));
    expect(editApi.patchTaskBatch).toHaveBeenLastCalledWith(5, { changes: { title: 'Của tôi' }, base: { title: 'Của người khác' } });
  });

  it('403 liệt kê trường bị cấm và giữ nháp; 400 hiện lỗi server', async () => {
    vi.mocked(editApi.patchTaskBatch).mockRejectedValueOnce({ response: { status: 403, data: { error: 'x', forbidden: ['deadline'] } } });
    show(manager);
    const box = await typeTitle('Mới');
    fireEvent.click(screen.getByRole('button', { name: 'Lưu' }));
    expect(await screen.findByText('Bạn không có quyền sửa: Hạn.')).toBeDefined();
    expect(box.value).toBe('Mới');
    vi.mocked(editApi.patchTaskBatch).mockRejectedValueOnce({ response: { status: 400, data: { error: 'Mức ưu tiên không hợp lệ.' } } });
    fireEvent.click(screen.getByRole('button', { name: 'Lưu' }));
    expect(await screen.findByText('Mức ưu tiên không hợp lệ.')).toBeDefined();
  });
});

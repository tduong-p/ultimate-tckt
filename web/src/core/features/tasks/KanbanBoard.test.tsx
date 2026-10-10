import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { KanbanBoard } from './KanbanBoard';
import { TaskModalContext } from './TaskModalProvider';
import { renderApp, makeSession } from './testUtils';
import * as api from '../../api';

vi.mock('../../api', async () => {
  const actual = await vi.importActual<typeof import('../../api')>('../../api');
  return { ...actual, fetchActivityBoard: vi.fn(), updateTaskStatus: vi.fn(), fetchWeightPresets: vi.fn(), fetchMembers: vi.fn() };
});

const task = (over: Record<string, unknown>) => ({
  activity_id: 9,
  team_id: 2,
  priority: 'medium',
  deadline: '2099-12-31',
  assignee_ids: '8',
  primary_assignee_name: 'Trần Bình',
  checklist_total: 2,
  checklist_done: 1,
  is_self_logged: 0,
  ...over,
});

const board = (status = 'active') => ({
  activity: { id: 9, title: 'Ngày hội Kỹ thuật', status, event_lead_id: 99 },
  activityTeams: [{ team_id: 2, name: 'Tổ Sự kiện' }],
  canManage: false,
  tasks: [
    task({ id: 1, title: 'Việc A', status: 'todo', assignee_ids: '7' }),
    task({ id: 2, title: 'Việc B', status: 'in_progress', assignee_ids: '8' }),
    task({ id: 3, title: 'Việc C', status: 'review', assignee_ids: '8' }),
    task({ id: 4, title: 'Việc D', status: 'done', is_self_logged: 1, weight: 3 }),
    task({ id: 5, title: 'Việc đã huỷ', status: 'cancelled' }),
  ],
});

const leader = { session: makeSession({ id: 3, role: 'leader' }), teams: [{ id: 2, can_manage: 1 }] };
const opts = (extra: Record<string, unknown> = {}) => ({ path: '/board/9', routePath: '/board/:id', ...extra });
const card = (name: string) => screen.getByText(name).closest('article') as HTMLElement;
const column = (name: string) => screen.getByRole('region', { name });

describe('KanbanBoard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.fetchActivityBoard).mockResolvedValue(board() as never);
    vi.mocked(api.updateTaskStatus).mockResolvedValue({ ok: true });
    vi.mocked(api.fetchWeightPresets).mockResolvedValue([]);
    vi.mocked(api.fetchMembers).mockResolvedValue([]);
  });
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('bốn cột theo trạng thái, ẩn việc đã huỷ, thẻ hiện huy hiệu và checklist', async () => {
    renderApp(<KanbanBoard />, opts());
    await screen.findByText('Việc A');
    expect(within(column('Cần làm')).getByText('Việc A')).toBeDefined();
    expect(within(column('Đang làm')).getByText('Việc B')).toBeDefined();
    expect(within(column('Chờ duyệt')).getByText('Việc C')).toBeDefined();
    expect(within(column('Hoàn thành')).getByText('Việc D')).toBeDefined();
    expect(screen.queryByText('Việc đã huỷ')).toBeNull();
    expect(within(card('Việc D')).getByText('Tự ghi nhận')).toBeDefined();
    expect(within(card('Việc D')).getByText('3đ')).toBeDefined();
    expect(within(card('Việc A')).getByText('1/2 việc con')).toBeDefined();
  });

  it('thành viên được giao: có Bắt đầu làm và Nộp nghiệm thu ở việc của mình, không có nút duyệt', async () => {
    renderApp(<KanbanBoard />, opts());
    await screen.findByText('Việc A');
    expect(within(card('Việc A')).getByRole('button', { name: 'Bắt đầu làm' })).toBeDefined();
    expect(within(card('Việc A')).getByRole('button', { name: 'Nộp nghiệm thu' })).toBeDefined();
    expect(within(card('Việc B')).queryByRole('button', { name: /Bắt đầu làm|Nộp nghiệm thu|Duyệt đạt/ })).toBeNull(); // việc của người khác
    expect(within(card('Việc C')).queryByRole('button', { name: 'Duyệt đạt' })).toBeNull();
  });

  it('Bắt đầu làm gọi PATCH status in_progress và làm mới bảng', async () => {
    const { qc } = renderApp(<KanbanBoard />, opts());
    const spy = vi.spyOn(qc, 'invalidateQueries');
    fireEvent.click(within(await screen.findByText('Việc A').then(() => card('Việc A'))).getByRole('button', { name: 'Bắt đầu làm' }));
    await waitFor(() => expect(api.updateTaskStatus).toHaveBeenCalledWith(1, 'in_progress'));
    expect(await screen.findByText('Đã cập nhật trạng thái')).toBeDefined();
    expect(spy).toHaveBeenCalledWith({ queryKey: ['core-activity'] });
  });

  it('Tổ trưởng: có nút duyệt ở cột Chờ duyệt và nút Bắt đầu làm ở việc không phải của mình', async () => {
    renderApp(<KanbanBoard />, opts(leader));
    await screen.findByText('Việc A');
    expect(within(card('Việc C')).getByRole('button', { name: 'Duyệt đạt' })).toBeDefined();
    expect(within(card('Việc A')).getByRole('button', { name: 'Bắt đầu làm' })).toBeDefined();
    expect(within(card('Việc B')).queryByRole('button', { name: 'Nộp nghiệm thu' })).toBeNull(); // chỉ người được giao
    fireEvent.click(within(card('Việc C')).getByRole('button', { name: 'Yêu cầu làm lại' }));
    expect(await screen.findByText('Nghiệm thu: Việc C')).toBeDefined();
  });

  it('việc Đang làm có nút "Chuyển về Cần làm" cho người được giao hoặc Tổ trưởng (hỗ trợ cảm ứng di động)', async () => {
    renderApp(<KanbanBoard />, opts(leader));
    await screen.findByText('Việc B');
    const backBtn = within(card('Việc B')).getByRole('button', { name: 'Chuyển về Cần làm' });
    expect(backBtn).toBeDefined();
    fireEvent.click(backBtn);
    await waitFor(() => expect(api.updateTaskStatus).toHaveBeenCalledWith(2, 'todo'));
  });


  it('Trưởng BTC (không phải Tổ trưởng) cũng thấy nút duyệt', async () => {
    renderApp(<KanbanBoard />, opts({ session: makeSession({ id: 99 }) }));
    await screen.findByText('Việc A');
    expect(within(card('Việc C')).getByRole('button', { name: 'Duyệt đạt' })).toBeDefined();
  });

  it('chỉ hiện "Tự ghi nhận việc" khi hoạt động đã duyệt hoặc đang diễn ra', async () => {
    renderApp(<KanbanBoard />, opts());
    expect(await screen.findByRole('button', { name: 'Tự ghi nhận việc' })).toBeDefined();
    cleanup();
    vi.mocked(api.fetchActivityBoard).mockResolvedValue(board('completed') as never);
    renderApp(<KanbanBoard />, opts());
    await screen.findByText('Việc A');
    expect(screen.queryByRole('button', { name: 'Tự ghi nhận việc' })).toBeNull();
  });

  it('bấm tiêu đề thẻ mở hộp công việc', async () => {
    const open = vi.fn();
    renderApp(<TaskModalContext.Provider value={{ open, close: vi.fn() }}><KanbanBoard /></TaskModalContext.Provider>, opts());
    fireEvent.click(await screen.findByRole('button', { name: 'Việc A' }));
    expect(open).toHaveBeenCalledWith(1);
  });

  it('lỗi tải hiện tiếng Việt', async () => {
    vi.mocked(api.fetchActivityBoard).mockRejectedValue({ response: { status: 404, data: { error: 'Activity not found.' } } });
    renderApp(<KanbanBoard />, opts());
    expect(await screen.findByText('Không tìm thấy hoạt động.')).toBeDefined();
  });

  describe('kéo-thả (chỉ khi thiết bị có con trỏ)', () => {
    const finePointer = () =>
      vi.spyOn(window, 'matchMedia').mockImplementation(((q: string) => ({
        matches: true,
        media: q,
        addEventListener() {},
        removeEventListener() {},
      })) as never);

    const drag = (name: string, to: string) => {
      const dataTransfer = { setData: vi.fn(), getData: vi.fn(), effectAllowed: '', dropEffect: '', types: [] };
      fireEvent.dragStart(card(name), { dataTransfer });
      fireEvent.dragOver(column(to), { dataTransfer });
      fireEvent.drop(column(to), { dataTransfer });
    };

    it('thiết bị cảm ứng: thẻ không kéo được', async () => {
      renderApp(<KanbanBoard />, opts());
      await screen.findByText('Việc A');
      expect(card('Việc A').getAttribute('draggable')).not.toBe('true');
    });

    it('thả todo -> in_progress gọi PATCH status', async () => {
      finePointer();
      renderApp(<KanbanBoard />, opts());
      await screen.findByText('Việc A');
      expect(card('Việc A').getAttribute('draggable')).toBe('true');
      drag('Việc A', 'Đang làm');
      await waitFor(() => expect(api.updateTaskStatus).toHaveBeenCalledWith(1, 'in_progress'));
    });

    it('thả vào Chờ duyệt mở hộp nộp nghiệm thu, KHÔNG gọi PATCH status', async () => {
      finePointer();
      renderApp(<KanbanBoard />, opts());
      await screen.findByText('Việc A');
      drag('Việc A', 'Chờ duyệt');
      expect(await screen.findByText('Nộp nghiệm thu: Việc A')).toBeDefined();
      expect(api.updateTaskStatus).not.toHaveBeenCalled();
    });

    it('thả việc của người khác vào Chờ duyệt: báo lỗi, không mở hộp', async () => {
      finePointer();
      renderApp(<KanbanBoard />, opts());
      await screen.findByText('Việc B');
      drag('Việc B', 'Chờ duyệt');
      expect(await screen.findByText(/Chỉ người được giao việc mới nộp nghiệm thu được/)).toBeDefined();
      expect(screen.queryByText('Nộp nghiệm thu: Việc B')).toBeNull();
    });

    it('người duyệt thả việc Chờ duyệt vào Hoàn thành: mở hộp duyệt, KHÔNG gọi PATCH status', async () => {
      finePointer();
      renderApp(<KanbanBoard />, opts(leader));
      await screen.findByText('Việc C');
      drag('Việc C', 'Hoàn thành');
      expect(await screen.findByText('Nghiệm thu: Việc C')).toBeDefined();
      expect((screen.getByLabelText('Duyệt đạt') as HTMLInputElement).checked).toBe(true);
      expect(api.updateTaskStatus).not.toHaveBeenCalled();
    });

    it('thả việc chưa nộp vào Hoàn thành, hoặc người không có quyền duyệt: báo lỗi', async () => {
      finePointer();
      renderApp(<KanbanBoard />, opts(leader));
      await screen.findByText('Việc A');
      drag('Việc A', 'Hoàn thành');
      expect(await screen.findByText('Công việc cần được nộp nghiệm thu trước khi duyệt.')).toBeDefined();
      cleanup();
      renderApp(<KanbanBoard />, opts());
      await screen.findByText('Việc C');
      drag('Việc C', 'Hoàn thành');
      expect(await screen.findByText('Bạn không có quyền duyệt công việc này.')).toBeDefined();
    });

    it('thả việc đang Chờ duyệt về Cần làm: báo chỉ chuyển được giữa Cần làm và Đang làm', async () => {
      finePointer();
      renderApp(<KanbanBoard />, opts(leader));
      await screen.findByText('Việc C');
      drag('Việc C', 'Cần làm');
      expect(await screen.findByText('Chỉ chuyển được giữa "Cần làm" và "Đang làm".')).toBeDefined();
      expect(api.updateTaskStatus).not.toHaveBeenCalled();
    });
  });
});

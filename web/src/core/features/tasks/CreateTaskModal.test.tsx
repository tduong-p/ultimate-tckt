import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { CreateTaskModal } from './CreateTaskModal';
import { renderApp, makeSession } from './testUtils';
import * as api from '../../api';

vi.mock('../../api', async () => {
  const actual = await vi.importActual<typeof import('../../api')>('../../api');
  return { ...actual, createTask: vi.fn(), fetchTeamMembers: vi.fn() };
});

const teams = [{ team_id: 2, name: 'Tổ Sự kiện' }, { team_id: 3, name: 'Tổ Truyền thông' }];
const members = (names: [number, string][]) => ({ members: names.map(([id, name]) => ({ id, name })), available: [] });
const admin = { session: makeSession({ id: 1, role: 'admin' }) };

function deferred<T>() {
  let resolve!: (v: T) => void;
  const promise = new Promise<T>((r) => { resolve = r; });
  return { promise, resolve };
}

describe('CreateTaskModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.createTask).mockResolvedValue({ id: 50 });
    vi.mocked(api.fetchTeamMembers).mockImplementation(async (id) => (id === 2 ? members([[7, 'Nguyễn An'], [8, 'Trần Bình']]) : members([[9, 'Lê Cường']])));
  });
  afterEach(cleanup);

  it('admin thấy mọi Tổ của hoạt động; người khác chỉ thấy Tổ mình quản lý', () => {
    renderApp(<CreateTaskModal isOpen activityId={9} activityType="event" activityTeams={teams} onClose={() => {}} />, admin);
    expect(screen.getAllByRole('option', { name: /Tổ Sự kiện|Tổ Truyền thông/ })).toHaveLength(2);
    cleanup();
    renderApp(<CreateTaskModal isOpen activityId={9} activityType="event" activityTeams={teams} onClose={() => {}} />,
      { session: makeSession({ id: 3, role: 'leader' }), teams: [{ id: 3, can_manage: 1 }] });
    expect(screen.queryByRole('option', { name: 'Tổ Sự kiện' })).toBeNull();
    expect(screen.getByRole('option', { name: 'Tổ Truyền thông' })).toBeDefined();
  });

  it('người không quản lý Tổ nào của hoạt động được báo rõ và không gửi được', () => {
    renderApp(<CreateTaskModal isOpen activityId={9} activityType="event" activityTeams={teams} onClose={() => {}} />);
    expect(screen.getByText(/Bạn không quản lý Tổ nào của hoạt động này/)).toBeDefined();
  });

  it('chọn Tổ tải thành viên; người chính bị loại khỏi danh sách đồng phụ trách', async () => {
    renderApp(<CreateTaskModal isOpen activityId={9} activityType="event" activityTeams={teams} onClose={() => {}} />, admin);
    fireEvent.change(screen.getByLabelText(/Tổ phụ trách/), { target: { value: '2' } });
    expect(await screen.findByRole('option', { name: 'Nguyễn An' })).toBeDefined();
    fireEvent.change(screen.getByLabelText(/Người phụ trách chính/), { target: { value: '7' } });
    fireEvent.change(screen.getByLabelText(/Đồng phụ trách/), { target: { value: 'nguyen' } });
    const listbox = screen.queryByRole('listbox');
    if (listbox) {
      expect(within(listbox).queryByRole('option', { name: /Nguyễn An/ })).toBeNull();
    } else {
      expect(listbox).toBeNull();
    }
    fireEvent.change(screen.getByLabelText(/Đồng phụ trách/), { target: { value: 'tran' } });
    const tranOption = screen.getByRole('listbox');
    expect(within(tranOption).getByRole('option', { name: /Trần Bình/ })).toBeDefined();
  });

  it('đổi Tổ nhanh: kết quả về muộn của Tổ trước không ghi đè danh sách Tổ mới', async () => {
    const slow = deferred<ReturnType<typeof members>>();
    const fast = deferred<ReturnType<typeof members>>();
    vi.mocked(api.fetchTeamMembers).mockImplementation((id) => (id === 2 ? slow.promise : fast.promise));
    renderApp(<CreateTaskModal isOpen activityId={9} activityType="event" activityTeams={teams} onClose={() => {}} />, admin);
    fireEvent.change(screen.getByLabelText(/Tổ phụ trách/), { target: { value: '2' } });
    fireEvent.change(screen.getByLabelText(/Tổ phụ trách/), { target: { value: '3' } });
    await act(async () => { fast.resolve(members([[9, 'Lê Cường']])); });
    await act(async () => { slow.resolve(members([[7, 'Nguyễn An']])); });
    expect(await screen.findByRole('option', { name: 'Lê Cường' })).toBeDefined();
    expect(screen.queryByRole('option', { name: 'Nguyễn An' })).toBeNull();
  });

  it('kiểm tra bắt buộc trước khi gửi', () => {
    renderApp(<CreateTaskModal isOpen activityId={9} activityType="event" activityTeams={teams} onClose={() => {}} />, admin);
    fireEvent.click(screen.getByRole('button', { name: 'Giao việc' }));
    expect(screen.getByText('Vui lòng nhập tiêu đề.')).toBeDefined();
    fireEvent.change(screen.getByLabelText(/Tiêu đề/), { target: { value: 'Dựng sân khấu' } });
    fireEvent.click(screen.getByRole('button', { name: 'Giao việc' }));
    expect(screen.getByText('Vui lòng chọn Tổ phụ trách.')).toBeDefined();
    expect(api.createTask).not.toHaveBeenCalled();
  });

  it('gửi đúng payload, làm mới cache, báo thành công và đóng', async () => {
    const onClose = vi.fn();
    const onCreated = vi.fn();
    const { qc } = renderApp(<CreateTaskModal isOpen activityId={9} activityType="event" activityTeams={teams} onClose={onClose} onCreated={onCreated} />, admin);
    const spy = vi.spyOn(qc, 'invalidateQueries');
    fireEvent.change(screen.getByLabelText(/Tiêu đề/), { target: { value: ' Dựng sân khấu ' } });
    fireEvent.change(screen.getByLabelText(/Giai đoạn/), { target: { value: 'before' } });
    fireEvent.change(screen.getByLabelText(/Tổ phụ trách/), { target: { value: '2' } });
    await screen.findByRole('option', { name: 'Nguyễn An' });
    fireEvent.change(screen.getByLabelText(/Người phụ trách chính/), { target: { value: '7' } });
    fireEvent.change(screen.getByLabelText(/Đồng phụ trách/), { target: { value: 'tran' } });
    const listbox = screen.getByRole('listbox');
    fireEvent.click(within(listbox).getByRole('option', { name: /Trần Bình/ }));
    fireEvent.change(screen.getByLabelText(/Hạn chót/), { target: { value: '2026-11-20' } });
    fireEvent.change(screen.getByLabelText('Mức ưu tiên'), { target: { value: 'high' } });
    fireEvent.change(screen.getByLabelText('Sản phẩm cần nộp'), { target: { value: 'Ảnh nghiệm thu' } });
    fireEvent.click(screen.getByRole('button', { name: 'Giao việc' }));
    await waitFor(() => expect(api.createTask).toHaveBeenCalledWith(9, {
      title: 'Dựng sân khấu', description: '', stage: 'before', priority: 'high', team_id: 2, start_date: null,
      deadline: '2026-11-20', deliverable: 'Ảnh nghiệm thu', primary_assignee_id: 7, co_assignee_ids: [8],
    }));
    expect(await screen.findByText('Đã giao việc')).toBeDefined();
    expect(spy).toHaveBeenCalledWith({ queryKey: ['core-activity'] });
    await waitFor(() => expect(onCreated).toHaveBeenCalledWith(50));
    expect(onClose).toHaveBeenCalled();
  });

  it('hoạt động được giao (assigned): không có ô giai đoạn, luôn gửi general', async () => {
    renderApp(<CreateTaskModal isOpen activityId={9} activityType="assigned" activityTeams={[teams[0]]} onClose={() => {}} />, admin);
    expect(screen.queryByLabelText(/Giai đoạn/)).toBeNull();
    fireEvent.change(screen.getByLabelText(/Tiêu đề/), { target: { value: 'Việc' } });
    await screen.findByRole('option', { name: 'Nguyễn An' }); // một Tổ duy nhất: tự chọn
    fireEvent.change(screen.getByLabelText(/Người phụ trách chính/), { target: { value: '7' } });
    fireEvent.change(screen.getByLabelText(/Hạn chót/), { target: { value: '2026-11-20' } });
    fireEvent.click(screen.getByRole('button', { name: 'Giao việc' }));
    await waitFor(() => expect(api.createTask).toHaveBeenCalledWith(9, expect.objectContaining({ stage: 'general', team_id: 2 })));
  });

  it('lỗi tải thành viên (403) và lỗi tạo hiện bằng tiếng Việt', async () => {
    vi.mocked(api.fetchTeamMembers).mockRejectedValue({ response: { status: 403, data: { error: 'You cannot manage this team.' } } });
    renderApp(<CreateTaskModal isOpen activityId={9} activityType="event" activityTeams={teams} onClose={() => {}} />, admin);
    fireEvent.change(screen.getByLabelText(/Tổ phụ trách/), { target: { value: '2' } });
    expect(await screen.findByText('Bạn không có quyền quản lý Tổ này.')).toBeDefined();
  });

  it('server từ chối giao việc: hiện lý do trong hộp', async () => {
    vi.mocked(api.createTask).mockRejectedValueOnce({ response: { status: 403, data: { error: 'Bạn không thể giao việc cho ban này.' } } });
    renderApp(<CreateTaskModal isOpen activityId={9} activityType="assigned" activityTeams={[teams[0]]} onClose={() => {}} />, admin);
    fireEvent.change(screen.getByLabelText(/Tiêu đề/), { target: { value: 'Việc' } });
    await screen.findByRole('option', { name: 'Nguyễn An' });
    fireEvent.change(screen.getByLabelText(/Người phụ trách chính/), { target: { value: '7' } });
    fireEvent.change(screen.getByLabelText(/Hạn chót/), { target: { value: '2026-11-20' } });
    fireEvent.click(screen.getByRole('button', { name: 'Giao việc' }));
    expect(await screen.findByText('Bạn không thể giao việc cho ban này.')).toBeDefined();
  });
});

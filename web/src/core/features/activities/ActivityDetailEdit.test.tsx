// Sửa tại chỗ trên trang chi tiết hoạt động: quyền theo editable[], Lưu một lần qua /batch, 403/409/400, EditGuard.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { ActivityDetailView } from './ActivityDetailView';
import { makeDetail, renderInApp } from './testUtils';
import * as api from '../../api';
import * as editApi from '../../edit/editApi';

vi.mock('../../api', async () => {
  const actual = await vi.importActual<typeof import('../../api')>('../../api');
  return { ...actual, fetchActivityDetail: vi.fn(), fetchTeams: vi.fn(), fetchMembers: vi.fn() };
});
vi.mock('../../edit/editApi', async () => {
  const actual = await vi.importActual<typeof import('../../edit/editApi')>('../../edit/editApi');
  return { ...actual, patchActivityBatch: vi.fn() };
});

const ALL = ['title', 'description', 'deadline', 'start_date', 'priority', 'team_id', 'event_lead_id'];
const DYC = {
  role: 'admin',
  memberships: [{ unit_id: 9, code: 'DYC', name: 'DYC', kind: 'platform_owner', role: 'admin' }],
  currentUnit: { id: 9, code: 'DYC', name: 'DYC', kind: 'platform_owner' },
};

const show = (opts: Parameters<typeof renderInApp>[1] = {}) => renderInApp(<ActivityDetailView />, opts);
const titleBox = () => screen.findByRole('textbox', { name: 'Tiêu đề' });
const saveBar = () => screen.queryByRole('region', { name: 'Thay đổi chưa lưu' });
const typeTitle = async (value: string) => {
  const box = await titleBox();
  fireEvent.change(box, { target: { value } });
  return box as HTMLInputElement;
};

describe('ActivityDetailView — sửa tại chỗ', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.fetchTeams).mockResolvedValue([
      { id: 2, name: 'Tuyên huấn', is_active: 1 },
      { id: 3, name: 'Truyền thông', is_active: 1 },
    ] as never);
    vi.mocked(api.fetchMembers).mockResolvedValue([
      { id: 7, name: 'Lê Trưởng BTC', email: 'a@x.vn', role: 'member', is_active: 1 },
      { id: 8, name: 'Hoàng Mới', email: 'b@x.vn', role: 'member', is_active: 1 },
    ] as never);
    vi.mocked(api.fetchActivityDetail).mockResolvedValue(makeDetail({ canManage: true, editable: ALL }));
    vi.mocked(editApi.patchActivityBatch).mockResolvedValue({ changed: ['title'] });
  });
  afterEach(cleanup);

  it('trưởng sự kiện sửa được tiêu đề và mô tả, không thấy ô sửa Tổ, Trưởng BTC, ưu tiên, ngày', async () => {
    vi.mocked(api.fetchActivityDetail).mockResolvedValue(makeDetail({ canManage: true, editable: ['title', 'description'] }));
    show({ role: 'member', userId: 7 });
    expect(await titleBox()).toBeDefined();
    expect(screen.getByRole('textbox', { name: 'Mô tả' })).toBeDefined();
    expect(screen.queryByLabelText('Tổ điều phối')).toBeNull();
    expect(screen.queryByLabelText('Trưởng Ban Tổ chức')).toBeNull();
    expect(screen.queryByLabelText('Ưu tiên')).toBeNull();
    expect(screen.queryByLabelText('Hạn chót')).toBeNull();
    expect(screen.queryByLabelText('Ngày bắt đầu')).toBeNull();
    // giá trị chỉ đọc vẫn hiển thị
    expect(screen.getByText('Lê Trưởng BTC')).toBeDefined();
    expect(saveBar()).toBeNull();
  });

  it('admin sửa được cả Tổ điều phối, Trưởng BTC, ưu tiên và ngày', async () => {
    show({ role: 'admin', userId: 1 });
    await titleBox();
    expect(screen.getByLabelText('Tổ điều phối')).toBeDefined();
    expect(screen.getByLabelText('Trưởng Ban Tổ chức')).toBeDefined();
    expect(screen.getByLabelText('Ưu tiên')).toBeDefined();
    expect(screen.getByLabelText('Hạn chót')).toBeDefined();
    expect(screen.getByLabelText('Ngày bắt đầu')).toBeDefined();
  });

  it('DYC chỉ đọc: không có ô sửa, không có thanh Lưu dù GET báo editable', async () => {
    show(DYC);
    expect(await screen.findByRole('heading', { level: 1, name: 'Ngày hội Kỹ thuật' })).toBeDefined();
    expect(screen.queryByRole('textbox', { name: 'Tiêu đề' })).toBeNull();
    expect(screen.queryByRole('textbox', { name: 'Mô tả' })).toBeNull();
    expect(screen.queryByLabelText('Tổ điều phối')).toBeNull();
    expect(saveBar()).toBeNull();
    expect(api.fetchTeams).not.toHaveBeenCalled();
  });

  it('thành viên thường (editable rỗng) chỉ đọc', async () => {
    vi.mocked(api.fetchActivityDetail).mockResolvedValue(makeDetail({ canManage: false, editable: [] }));
    show({ role: 'member', userId: 3 });
    expect(await screen.findByRole('heading', { level: 1, name: 'Ngày hội Kỹ thuật' })).toBeDefined();
    expect(screen.queryByRole('textbox', { name: 'Tiêu đề' })).toBeNull();
    expect(saveBar()).toBeNull();
  });

  it('đổi tiêu đề hiện thanh Lưu; Lưu gọi /batch đúng một lần chỉ với trường đổi và base', async () => {
    const { qc } = show({ role: 'admin', userId: 1 });
    const invalidate = vi.spyOn(qc, 'invalidateQueries');
    await typeTitle('Ngày hội Kỹ thuật 2026');
    expect(saveBar()).not.toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Lưu' }));
    await waitFor(() => expect(editApi.patchActivityBatch).toHaveBeenCalledTimes(1));
    expect(editApi.patchActivityBatch).toHaveBeenCalledWith(5, {
      changes: { title: 'Ngày hội Kỹ thuật 2026' },
      base: { title: 'Ngày hội Kỹ thuật' },
    });
    expect(await screen.findByText('Đã lưu')).toBeDefined();
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['core-activity', 5] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['core-activities'] });
    await waitFor(() => expect(saveBar()).toBeNull());
  });

  it('admin đổi Tổ điều phối và Trưởng BTC: gửi số nguyên đúng kiểu cùng base', async () => {
    show({ role: 'admin', userId: 1 });
    await titleBox();
    fireEvent.change(screen.getByLabelText('Tổ điều phối'), { target: { value: '3' } });
    fireEvent.change(screen.getByLabelText('Trưởng Ban Tổ chức'), { target: { value: '8' } });
    fireEvent.change(screen.getByLabelText('Ưu tiên'), { target: { value: 'urgent' } });
    fireEvent.click(screen.getByRole('button', { name: 'Lưu' }));
    await waitFor(() => expect(editApi.patchActivityBatch).toHaveBeenCalledTimes(1));
    expect(editApi.patchActivityBatch).toHaveBeenCalledWith(5, {
      changes: { team_id: 3, event_lead_id: 8, priority: 'urgent' },
      base: { team_id: 2, event_lead_id: 7, priority: 'high' },
    });
  });

  it('sửa lại về giá trị gốc thì thanh Lưu biến mất', async () => {
    show({ role: 'admin', userId: 1 });
    await typeTitle('Khác');
    expect(saveBar()).not.toBeNull();
    fireEvent.change(screen.getByRole('textbox', { name: 'Tiêu đề' }), { target: { value: 'Ngày hội Kỹ thuật' } });
    expect(saveBar()).toBeNull();
  });

  it('Hủy bỏ nháp và trả về giá trị gốc', async () => {
    show({ role: 'admin', userId: 1 });
    const box = await typeTitle('Khác');
    fireEvent.click(screen.getByRole('button', { name: 'Hủy' }));
    expect(box.value).toBe('Ngày hội Kỹ thuật');
    expect(saveBar()).toBeNull();
  });

  it('tiêu đề trống thì báo lỗi và không gọi /batch', async () => {
    show({ role: 'admin', userId: 1 });
    await typeTitle('   ');
    fireEvent.click(screen.getByRole('button', { name: 'Lưu' }));
    expect(await screen.findByText('Tiêu đề không được để trống.')).toBeDefined();
    expect(editApi.patchActivityBatch).not.toHaveBeenCalled();
  });

  it('403 liệt kê trường bị cấm bằng tên tiếng Việt và giữ nháp', async () => {
    vi.mocked(editApi.patchActivityBatch).mockRejectedValue({
      response: { status: 403, data: { forbidden: ['team_id', 'title'] } },
    });
    show({ role: 'admin', userId: 1 });
    const box = await typeTitle('Mới');
    fireEvent.click(screen.getByRole('button', { name: 'Lưu' }));
    const bar = await screen.findByRole('region', { name: 'Thay đổi chưa lưu' });
    expect(await within(bar).findByText(/Tổ điều phối, Tiêu đề/)).toBeDefined();
    expect(box.value).toBe('Mới');
    expect(saveBar()).not.toBeNull();
  });

  it('400 hiện câu lỗi của server và giữ nháp', async () => {
    vi.mocked(editApi.patchActivityBatch).mockRejectedValue({
      response: { status: 400, data: { error: 'Tiêu đề tối đa 180 ký tự.' } },
    });
    show({ role: 'admin', userId: 1 });
    const box = await typeTitle('Mới');
    fireEvent.click(screen.getByRole('button', { name: 'Lưu' }));
    expect(await screen.findByText('Tiêu đề tối đa 180 ký tự.')).toBeDefined();
    expect(box.value).toBe('Mới');
  });

  describe('409 xung đột', () => {
    const conflict = () => vi.mocked(editApi.patchActivityBatch).mockRejectedValueOnce({
      response: { status: 409, data: { conflicts: ['title'] } },
    });
    const newer = () => makeDetail({ canManage: true, editable: ALL, activity: { title: 'Bản của người khác' } });

    it('hiện "đã bị người khác sửa" với hai hành động, giữ nháp và làm mới bản gốc', async () => {
      conflict();
      show({ role: 'admin', userId: 1 });
      const box = await typeTitle('Của tôi');
      vi.mocked(api.fetchActivityDetail).mockResolvedValue(newer());
      fireEvent.click(screen.getByRole('button', { name: 'Lưu' }));
      expect(await screen.findByText(/đã bị người khác sửa/)).toBeDefined();
      expect(screen.getByRole('button', { name: 'Lấy bản mới' })).toBeDefined();
      expect(screen.getByRole('button', { name: 'Giữ của tôi' })).toBeDefined();
      expect(box.value).toBe('Của tôi');
      await waitFor(() => expect(vi.mocked(api.fetchActivityDetail).mock.calls.length).toBeGreaterThan(1));
    });

    it('"Lấy bản mới" bỏ nháp và hiện dữ liệu mới', async () => {
      conflict();
      show({ role: 'admin', userId: 1 });
      await typeTitle('Của tôi');
      vi.mocked(api.fetchActivityDetail).mockResolvedValue(newer());
      fireEvent.click(screen.getByRole('button', { name: 'Lưu' }));
      fireEvent.click(await screen.findByRole('button', { name: 'Lấy bản mới' }));
      await waitFor(() => expect((screen.getByRole('textbox', { name: 'Tiêu đề' }) as HTMLInputElement).value).toBe('Bản của người khác'));
      expect(saveBar()).toBeNull();
      expect(screen.queryByText(/đã bị người khác sửa/)).toBeNull();
    });

    it('"Giữ của tôi" làm mới rồi lưu lại với base mới', async () => {
      conflict();
      show({ role: 'admin', userId: 1 });
      await typeTitle('Của tôi');
      vi.mocked(api.fetchActivityDetail).mockResolvedValue(newer());
      fireEvent.click(screen.getByRole('button', { name: 'Lưu' }));
      fireEvent.click(await screen.findByRole('button', { name: 'Giữ của tôi' }));
      await waitFor(() => expect(editApi.patchActivityBatch).toHaveBeenCalledTimes(2));
      expect(editApi.patchActivityBatch).toHaveBeenLastCalledWith(5, {
        changes: { title: 'Của tôi' },
        base: { title: 'Bản của người khác' },
      });
      expect(await screen.findByText('Đã lưu')).toBeDefined();
    });
  });

  it('rời trang bằng link hash khi còn nháp thì hỏi xác nhận (EditGuard)', async () => {
    show({ role: 'admin', userId: 1 });
    await typeTitle('Khác');
    fireEvent.click(screen.getByRole('link', { name: /Danh sách hoạt động/ }));
    const dialog = await screen.findByRole('dialog', { name: 'Thay đổi chưa lưu' });
    expect(within(dialog).getByRole('button', { name: 'Ở lại' })).toBeDefined();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Ở lại' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect((screen.getByRole('textbox', { name: 'Tiêu đề' }) as HTMLInputElement).value).toBe('Khác');
  });
});

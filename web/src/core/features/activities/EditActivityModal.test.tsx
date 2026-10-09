import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { EditActivityModal } from './EditActivityModal';
import { makeDetail, renderInApp } from './testUtils';
import * as api from '../../api';

vi.mock('../../api', async () => {
  const actual = await vi.importActual<typeof import('../../api')>('../../api');
  return { ...actual, updateActivity: vi.fn(), fetchTeams: vi.fn(), fetchMembers: vi.fn() };
});

const teams: api.TeamItem[] = [
  { id: 2, name: 'Tuyên huấn', is_active: 1 },
  { id: 3, name: 'Truyền thông', is_active: 1 },
  { id: 4, name: 'Hậu cần', is_active: 1 },
];
const members: api.MemberItem[] = [
  { id: 7, name: 'Lê Trưởng BTC', email: 'le@x.vn', role: 'member', is_active: 1 },
  { id: 8, name: 'Nguyễn Khác', email: 'k@x.vn', role: 'member', is_active: 1 },
];

const detail = makeDetail({ canManage: true });

const show = (isAdmin: boolean, onClose = vi.fn()) => {
  const utils = renderInApp(<EditActivityModal isOpen onClose={onClose} detail={detail} isAdmin={isAdmin} />, { role: isAdmin ? 'admin' : 'leader' });
  return { ...utils, onClose };
};
const lastPayload = () => vi.mocked(api.updateActivity).mock.calls[0][1];

describe('EditActivityModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.updateActivity).mockResolvedValue({ ok: true });
    vi.mocked(api.fetchTeams).mockResolvedValue(teams);
    vi.mocked(api.fetchMembers).mockResolvedValue(members);
  });
  afterEach(cleanup);

  it('người quản lý: sửa tiêu đề, gửi tập con (không có trường admin), toast, đóng, làm mới cache', async () => {
    const { qc, onClose } = show(false);
    const spy = vi.spyOn(qc, 'invalidateQueries');
    expect(screen.queryByLabelText('Trạng thái')).toBeNull();
    expect(screen.queryByLabelText('Tổ chủ trì')).toBeNull();
    expect((screen.getByLabelText('Tiêu đề') as HTMLInputElement).value).toBe('Ngày hội Kỹ thuật');

    fireEvent.change(screen.getByLabelText('Tiêu đề'), { target: { value: 'Ngày hội Kỹ thuật 2026' } });
    fireEvent.change(screen.getByLabelText('Địa điểm'), { target: { value: 'Sân A' } });
    fireEvent.click(screen.getByRole('button', { name: 'Lưu thay đổi' }));

    await waitFor(() => expect(api.updateActivity).toHaveBeenCalledTimes(1));
    expect(api.updateActivity).toHaveBeenCalledWith(5, expect.objectContaining({ title: 'Ngày hội Kỹ thuật 2026', location: 'Sân A', is_public: false, public_image_url: '', proposal_document_url: 'https://drive.example/de-an' }));
    for (const key of ['status', 'event_lead_id', 'team_id', 'team_ids']) expect(lastPayload()).not.toHaveProperty(key);
    expect(await screen.findByText('Đã lưu thay đổi.')).toBeDefined();
    expect(onClose).toHaveBeenCalled();
    expect(spy).toHaveBeenCalledWith({ queryKey: ['core-activity', 5] });
  });

  it('thiếu tiêu đề thì báo lỗi và không gửi', () => {
    show(false);
    fireEvent.change(screen.getByLabelText('Tiêu đề'), { target: { value: '   ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Lưu thay đổi' }));
    expect(screen.getByText('Vui lòng nhập tiêu đề, mô tả và hạn chót.')).toBeDefined();
    expect(api.updateActivity).not.toHaveBeenCalled();
  });

  it('link đề án sai thì chặn gửi', () => {
    show(false);
    fireEvent.change(screen.getByLabelText(/Link đề án/), { target: { value: 'ftp://x' } });
    fireEvent.click(screen.getByRole('button', { name: 'Lưu thay đổi' }));
    expect(api.updateActivity).not.toHaveBeenCalled();
    expect(screen.getAllByText('Liên kết phải bắt đầu bằng http:// hoặc https://.').length).toBeGreaterThan(0);
  });

  it('lỗi 403 của server hiện tiếng Việt, modal vẫn mở', async () => {
    vi.mocked(api.updateActivity).mockRejectedValue({ response: { status: 403, data: { error: 'Only administrators can change involved teams.' } } });
    const { onClose } = show(false);
    fireEvent.click(screen.getByRole('button', { name: 'Lưu thay đổi' }));
    expect(await screen.findByText('Chỉ quản trị viên được đổi các Tổ tham gia.')).toBeDefined();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('admin: đổi trạng thái thì chỉ gửi status, không gửi Tổ hay Trưởng BTC khi không đổi', async () => {
    show(true);
    await screen.findByRole('option', { name: 'Hậu cần' });
    fireEvent.change(screen.getByLabelText('Trạng thái'), { target: { value: 'approved' } });
    fireEvent.click(screen.getByRole('button', { name: 'Lưu thay đổi' }));
    await waitFor(() => expect(api.updateActivity).toHaveBeenCalled());
    expect(lastPayload()).toMatchObject({ status: 'approved' });
    for (const key of ['event_lead_id', 'team_id', 'team_ids']) expect(lastPayload()).not.toHaveProperty(key);
  });

  it('admin: đổi Tổ chủ trì và Trưởng BTC; Tổ chủ trì tự đánh dấu và khoá trong danh sách Tổ', async () => {
    show(true);
    await screen.findByRole('option', { name: 'Hậu cần' });
    fireEvent.change(screen.getByLabelText('Tổ chủ trì'), { target: { value: '4' } });
    const lead = screen.getByRole('checkbox', { name: 'Hậu cần' }) as HTMLInputElement;
    expect(lead.checked).toBe(true);
    expect(lead.disabled).toBe(true);
    fireEvent.change(screen.getByLabelText('Trưởng Ban Tổ chức'), { target: { value: '8' } });
    fireEvent.click(screen.getByRole('button', { name: 'Lưu thay đổi' }));
    await waitFor(() => expect(api.updateActivity).toHaveBeenCalled());
    expect(lastPayload()).toMatchObject({ team_id: 4, event_lead_id: 8 });
    expect((lastPayload().team_ids ?? []).slice().sort()).toEqual([2, 3, 4]);
  });

  it('admin: chuyển sang Đã hủy phải xác nhận, rồi về danh sách khi server xoá hẳn', async () => {
    vi.mocked(api.updateActivity).mockResolvedValue({ ok: true, deleted: true });
    show(true);
    await screen.findByRole('option', { name: 'Hậu cần' });
    fireEvent.change(screen.getByLabelText('Trạng thái'), { target: { value: 'cancelled' } });
    fireEvent.click(screen.getByRole('button', { name: 'Lưu thay đổi' }));
    expect(api.updateActivity).not.toHaveBeenCalled();
    fireEvent.click(await screen.findByRole('button', { name: 'Huỷ và xoá hoạt động' }));

    await waitFor(() => expect(api.updateActivity).toHaveBeenCalledWith(5, expect.objectContaining({ status: 'cancelled' })));
    await waitFor(() => expect(screen.getByTestId('path').textContent).toBe('/activities'));
  });
});

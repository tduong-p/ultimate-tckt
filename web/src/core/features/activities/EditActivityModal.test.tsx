import { useState } from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { EditActivityModal } from './EditActivityModal';
import { makeDetail, renderInApp } from './testUtils';
import * as api from '../../api';

vi.mock('../../api', async () => {
  const actual = await vi.importActual<typeof import('../../api')>('../../api');
  return { ...actual, updateActivity: vi.fn(), fetchTeams: vi.fn() };
});

const teams: api.TeamItem[] = [
  { id: 2, name: 'Tuyên huấn', is_active: 1 },
  { id: 3, name: 'Truyền thông', is_active: 1 },
  { id: 4, name: 'Hậu cần', is_active: 1 },
];
const detail = makeDetail({ canManage: true });

const show = (isAdmin: boolean, onClose = vi.fn()) => {
  const utils = renderInApp(<EditActivityModal isOpen onClose={onClose} detail={detail} isAdmin={isAdmin} />, { role: isAdmin ? 'admin' : 'leader' });
  return { ...utils, onClose };
};
const BATCH_KEYS = ['title', 'description', 'priority', 'start_date', 'deadline', 'event_lead_id'];
const lastPayload = () => vi.mocked(api.updateActivity).mock.calls[0][1];

describe('EditActivityModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.updateActivity).mockResolvedValue({ ok: true });
    vi.mocked(api.fetchTeams).mockResolvedValue(teams);
  });
  afterEach(cleanup);

  it('admin gỡ Tổ đã lưu trữ không có việc và chỉ gửi các Tổ còn hoạt động', async () => {
    const archived = makeDetail({ activityTeams: [
      detail.activityTeams[0],
      { ...detail.activityTeams[1], team_id: 9, name: 'Tổ cũ' },
    ], tasks: [] });
    renderInApp(<EditActivityModal isOpen onClose={() => {}} detail={archived} isAdmin />, { role: 'admin' });
    const oldTeam = await screen.findByRole('checkbox', { name: 'Tổ cũ (đã lưu trữ)' }) as HTMLInputElement;
    expect(oldTeam.checked).toBe(true);
    fireEvent.click(oldTeam);
    fireEvent.click(screen.getByRole('button', { name: 'Lưu thay đổi' }));
    await waitFor(() => expect(api.updateActivity).toHaveBeenCalledWith(5, expect.objectContaining({ team_id: 2, team_ids: [2] })));
    expect(lastPayload().team_ids).not.toContain(9);
  });

  it('người quản lý: sửa địa điểm, gửi tập con (không có trường admin hay trường batch), toast, đóng, làm mới cache', async () => {
    const { qc, onClose } = show(false);
    const spy = vi.spyOn(qc, 'invalidateQueries');
    expect(screen.queryByLabelText('Trạng thái')).toBeNull();
    expect((screen.getByLabelText('Địa điểm') as HTMLInputElement).value).toBe('Hội trường A');

    fireEvent.change(screen.getByLabelText('Địa điểm'), { target: { value: 'Sân A' } });
    fireEvent.click(screen.getByRole('button', { name: 'Lưu thay đổi' }));

    await waitFor(() => expect(api.updateActivity).toHaveBeenCalledTimes(1));
    expect(api.updateActivity).toHaveBeenCalledWith(5, expect.objectContaining({ location: 'Sân A', is_public: false, public_image_url: '', proposal_document_url: 'https://drive.example/de-an' }));
    for (const key of ['status', 'team_id', 'team_ids', ...BATCH_KEYS]) expect(lastPayload()).not.toHaveProperty(key);
    expect(await screen.findByText('Đã lưu thay đổi.')).toBeDefined();
    expect(onClose).toHaveBeenCalled();
    expect(spy).toHaveBeenCalledWith({ queryKey: ['core-activity', 5] });
  });

  it('không còn ô cho trường đã có sửa tại chỗ (batch)', async () => {
    show(true);
    await screen.findByRole('checkbox', { name: 'Hậu cần' });
    for (const label of ['Tiêu đề', 'Mô tả', 'Mức ưu tiên', 'Ngày bắt đầu', 'Hạn chót', 'Trưởng Ban Tổ chức', 'Tổ chủ trì']) {
      expect(screen.queryByLabelText(label)).toBeNull();
    }
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
    await screen.findByRole('checkbox', { name: 'Hậu cần' });
    fireEvent.change(screen.getByLabelText('Trạng thái'), { target: { value: 'approved' } });
    fireEvent.click(screen.getByRole('button', { name: 'Lưu thay đổi' }));
    await waitFor(() => expect(api.updateActivity).toHaveBeenCalled());
    expect(lastPayload()).toMatchObject({ status: 'approved' });
    for (const key of ['team_id', 'team_ids', ...BATCH_KEYS]) expect(lastPayload()).not.toHaveProperty(key);
  });

  it('admin: dữ liệu chi tiết tải lại khi đang sửa không đổi mốc so sánh trường admin', async () => {
    const DetailHarness = () => {
      const [liveDetail, setLiveDetail] = useState(detail);
      return (
        <>
          <button onClick={() => setLiveDetail(makeDetail({
            activity: { status: 'approved', event_lead_id: 8, team_id: 4 },
            activityTeams: [{ activity_id: 5, team_id: 4, role: 'primary', responsibility: '', name: 'Hậu cần', color: '#00875A' }],
          }))}>Tải lại chi tiết</button>
          <EditActivityModal isOpen onClose={vi.fn()} detail={liveDetail} isAdmin />
        </>
      );
    };
    renderInApp(<DetailHarness />, { role: 'admin' });
    await screen.findByRole('checkbox', { name: 'Hậu cần' });
    fireEvent.change(screen.getByLabelText('Địa điểm'), { target: { value: 'Địa điểm mới' } });
    fireEvent.click(screen.getByText('Tải lại chi tiết'));
    fireEvent.click(screen.getByRole('button', { name: 'Lưu thay đổi' }));
    await waitFor(() => expect(api.updateActivity).toHaveBeenCalledTimes(1));
    expect(lastPayload().location).toBe('Địa điểm mới');
    for (const key of ['status', 'team_id', 'team_ids', ...BATCH_KEYS]) expect(lastPayload()).not.toHaveProperty(key);
  });

  it('ẩn công khai vẫn cho sửa link ảnh lỗi để lưu được', async () => {
    renderInApp(<EditActivityModal isOpen onClose={vi.fn()} detail={makeDetail({ activity: { is_public: 1 } })} isAdmin={false} />, { role: 'leader' });
    fireEvent.change(screen.getByLabelText(/Link ảnh công khai/), { target: { value: 'ftp://invalid' } });
    fireEvent.click(screen.getByRole('checkbox', { name: 'Hiển thị trên trang công khai' }));
    fireEvent.change(screen.getByLabelText(/Link ảnh công khai/), { target: { value: 'https://img.example/fixed.jpg' } });
    fireEvent.click(screen.getByRole('button', { name: 'Lưu thay đổi' }));
    await waitFor(() => expect(api.updateActivity).toHaveBeenCalledTimes(1));
    expect(lastPayload()).toMatchObject({ is_public: false, public_image_url: 'https://img.example/fixed.jpg' });
  });

  it('admin: Tổ chủ trì giữ nguyên, đánh dấu và khoá trong danh sách Tổ; thêm Tổ gửi team_id cũ và team_ids', async () => {
    show(true);
    const lead = await screen.findByRole('checkbox', { name: 'Tuyên huấn' }) as HTMLInputElement;
    expect(lead.checked).toBe(true);
    expect(lead.disabled).toBe(true);
    fireEvent.click(await screen.findByRole('checkbox', { name: 'Hậu cần' }));
    fireEvent.click(screen.getByRole('button', { name: 'Lưu thay đổi' }));
    await waitFor(() => expect(api.updateActivity).toHaveBeenCalled());
    expect(lastPayload()).toMatchObject({ team_id: 2 });
    expect((lastPayload().team_ids ?? []).slice().sort()).toEqual([2, 3, 4]);
    expect(lastPayload()).not.toHaveProperty('event_lead_id');
  });

  it('admin: chuyển sang Đã hủy phải xác nhận, rồi về danh sách khi server xoá hẳn', async () => {
    vi.mocked(api.updateActivity).mockResolvedValue({ ok: true, deleted: true });
    show(true);
    await screen.findByRole('checkbox', { name: 'Hậu cần' });
    fireEvent.change(screen.getByLabelText('Trạng thái'), { target: { value: 'cancelled' } });
    fireEvent.click(screen.getByRole('button', { name: 'Lưu thay đổi' }));
    expect(api.updateActivity).not.toHaveBeenCalled();
    fireEvent.click(await screen.findByRole('button', { name: 'Huỷ và xoá hoạt động' }));

    await waitFor(() => expect(api.updateActivity).toHaveBeenCalledWith(5, expect.objectContaining({ status: 'cancelled' })));
    await waitFor(() => expect(screen.getByTestId('path').textContent).toBe('/activities'));
  });
});

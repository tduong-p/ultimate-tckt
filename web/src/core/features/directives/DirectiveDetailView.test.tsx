import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, fireEvent, waitFor, cleanup, within } from '@testing-library/react';
import { DirectiveDetailView } from './DirectiveDetailView';
import { BTV_UNIT, renderDh, TCKT_UNIT } from '../dieuhanh/testUtils';
import * as api from '../../api';

vi.mock('../../api', async () => {
  const actual = await vi.importActual<typeof import('../../api')>('../../api');
  return {
    ...actual, fetchDirective: vi.fn(), fetchUnitMembers: vi.fn(), fetchActivities: vi.fn(),
    acknowledgeDirective: vi.fn(), linkDirectiveActivity: vi.fn(), submitDirectiveResult: vi.fn(), respondDirective: vi.fn(),
  };
});

const detail = (over: Partial<api.DirectiveDetail> = {}): api.DirectiveDetail => ({
  id: 7, from_unit_id: 1, to_unit_id: 2, title: 'Báo cáo quý IV', body: 'Nộp trước hạn', deadline: '2026-12-01', status: 'sent',
  created_by: 9, owner_user_id: null, acknowledged_at: null, created_at: '2026-10-01T03:00:00.000Z', updated_at: '',
  from_unit_name: 'Ban Thường vụ', to_unit_name: 'Ban TCKT', created_by_name: 'Lê BTV', owner_name: null,
  submissions: [], activities: [], ...over,
});
const at = (unit = TCKT_UNIT, role = 'admin') => renderDh(<DirectiveDetailView />, { path: '/directive/7', route: '/directive/:id', unit, role });

describe('DirectiveDetailView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.fetchDirective).mockResolvedValue(detail());
    vi.mocked(api.fetchUnitMembers).mockResolvedValue([
      { user_id: 5, name: 'Tôi', email: 't@x', role: 'admin' },
      { user_id: 8, name: 'Nguyễn Văn B', email: 'b@x', role: 'member' },
    ]);
    vi.mocked(api.fetchActivities).mockResolvedValue([
      { id: 31, title: 'Hội nghị A', status: 'approved', deadline: '2026-11-30', unit_id: TCKT_UNIT.id } as api.ActivityItem,
      { id: 32, title: 'Việc đã huỷ', status: 'cancelled', deadline: '2026-11-30', unit_id: TCKT_UNIT.id } as api.ActivityItem,
    ]);
  });
  afterEach(cleanup);

  it('hiện thông tin chỉ đạo và tên người/đơn vị', async () => {
    at();
    expect(await screen.findByRole('heading', { name: 'Báo cáo quý IV' })).toBeDefined();
    expect(screen.getByText('Ban Thường vụ')).toBeDefined();
    expect(screen.getByText('Nộp trước hạn')).toBeDefined();
    expect(screen.getByText('Lê BTV')).toBeDefined();
    expect(screen.getByText('01/12/2026')).toBeDefined();
  });

  it('TCKT admin tiếp nhận: chọn người phụ trách, gọi API, làm mới cache', async () => {
    vi.mocked(api.acknowledgeDirective).mockResolvedValueOnce({} as api.Directive);
    const { qc } = at();
    fireEvent.click(await screen.findByRole('button', { name: 'Tiếp nhận' }));
    const dialog = await screen.findByRole('dialog');
    await within(dialog).findByRole('option', { name: /Nguyễn Văn B/ });
    fireEvent.change(within(dialog).getByLabelText('Người phụ trách'), { target: { value: '8' } });
    const spy = vi.spyOn(qc, 'invalidateQueries');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Tiếp nhận' }));
    await waitFor(() => expect(api.acknowledgeDirective).toHaveBeenCalledWith(7, 8));
    await waitFor(() => expect(spy).toHaveBeenCalledWith({ queryKey: ['directives'] }));
  });

  it('chặn: BTV (đơn vị giao) không thấy Tiếp nhận; TCKT leader cũng không', async () => {
    at(BTV_UNIT, 'btv_lead');
    await screen.findByRole('heading', { name: 'Báo cáo quý IV' });
    expect(screen.queryByRole('button', { name: 'Tiếp nhận' })).toBeNull();
    cleanup();
    at(TCKT_UNIT, 'leader');
    await screen.findByRole('heading', { name: 'Báo cáo quý IV' });
    expect(screen.queryByRole('button', { name: 'Tiếp nhận' })).toBeNull();
  });

  it('gắn hoạt động: chỉ liệt kê hoạt động còn hiệu lực của đơn vị nhận chưa gắn chỉ đạo nào', async () => {
    vi.mocked(api.fetchDirective).mockResolvedValue(detail({ status: 'acknowledged', owner_user_id: 5 }));
    vi.mocked(api.fetchActivities).mockResolvedValue([
      { id: 31, title: 'Hội nghị A', status: 'approved', unit_id: TCKT_UNIT.id } as api.ActivityItem,
      { id: 32, title: 'Việc đã huỷ', status: 'cancelled', unit_id: TCKT_UNIT.id } as api.ActivityItem,
      { id: 33, title: 'Hoạt động đơn vị khác', status: 'approved', unit_id: BTV_UNIT.id } as api.ActivityItem,
      { id: 34, title: 'Đã gắn chỉ đạo khác', status: 'approved', unit_id: TCKT_UNIT.id, directive_id: 99 } as api.ActivityItem,
    ]);
    vi.mocked(api.linkDirectiveActivity).mockResolvedValueOnce({} as api.Directive);
    at();
    fireEvent.click(await screen.findByRole('button', { name: 'Gắn hoạt động' }));
    const dialog = await screen.findByRole('dialog');
    await within(dialog).findByRole('option', { name: 'Hội nghị A' });
    expect(within(dialog).queryByRole('option', { name: 'Việc đã huỷ' })).toBeNull();
    expect(within(dialog).queryByRole('option', { name: 'Hoạt động đơn vị khác' })).toBeNull();
    expect(within(dialog).queryByRole('option', { name: 'Đã gắn chỉ đạo khác' })).toBeNull();
    fireEvent.change(within(dialog).getByLabelText(/Hoạt động/), { target: { value: '31' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Gắn' }));
    await waitFor(() => expect(api.linkDirectiveActivity).toHaveBeenCalledWith(7, 31));
  });

  it('báo lỗi tải hoạt động và cho thử lại', async () => {
    vi.mocked(api.fetchDirective).mockResolvedValue(detail({ status: 'acknowledged', owner_user_id: 5 }));
    vi.mocked(api.fetchActivities).mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce([
      { id: 31, title: 'Hội nghị A', status: 'approved', unit_id: TCKT_UNIT.id } as api.ActivityItem,
    ]);
    at();
    fireEvent.click(await screen.findByRole('button', { name: 'Gắn hoạt động' }));
    const dialog = await screen.findByRole('dialog');
    expect(await within(dialog).findByText('Không kết nối được máy chủ. Vui lòng thử lại.')).toBeDefined();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Thử tải lại' }));
    expect(await within(dialog).findByRole('option', { name: 'Hội nghị A' })).toBeDefined();
  });

  it('nộp kết quả: nguồn là hoạt động đã gắn; chưa gắn thì báo và khoá nút', async () => {
    vi.mocked(api.fetchDirective).mockResolvedValue(detail({ status: 'in_progress', owner_user_id: 5, activities: [{ id: 31, title: 'Hội nghị A', status: 'approved' }] }));
    vi.mocked(api.submitDirectiveResult).mockResolvedValueOnce({});
    at();
    fireEvent.click(await screen.findByRole('button', { name: 'Nộp kết quả' }));
    let dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText('Ghi chú'), { target: { value: 'Đã xong' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Nộp' }));
    await waitFor(() => expect(api.submitDirectiveResult).toHaveBeenCalledWith(7, { source_type: 'activity', source_id: 31, note: 'Đã xong' }));
    cleanup();
    vi.mocked(api.fetchDirective).mockResolvedValue(detail({ status: 'in_progress', owner_user_id: 5, activities: [] }));
    at();
    fireEvent.click(await screen.findByRole('button', { name: 'Nộp kết quả' }));
    dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Hãy gắn ít nhất một hoạt động trước.')).toBeDefined();
  });

  it('BTV đánh giá: yêu cầu sửa bắt buộc lý do; chấp nhận không bắt buộc', async () => {
    vi.mocked(api.fetchDirective).mockResolvedValue(detail({ status: 'submitted' }));
    vi.mocked(api.respondDirective).mockResolvedValue({} as api.Directive);
    at(BTV_UNIT, 'btv_lead');
    fireEvent.click(await screen.findByRole('button', { name: 'Yêu cầu sửa' }));
    let dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Gửi yêu cầu' }));
    expect(api.respondDirective).not.toHaveBeenCalled();
    fireEvent.change(within(dialog).getByLabelText(/Lý do/), { target: { value: 'Thiếu số liệu' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Gửi yêu cầu' }));
    await waitFor(() => expect(api.respondDirective).toHaveBeenCalledWith(7, { response: 'revision_requested', response_note: 'Thiếu số liệu' }));
    cleanup();
    at(BTV_UNIT, 'btv_lead');
    fireEvent.click(await screen.findByRole('button', { name: 'Chấp nhận' }));
    dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Chấp nhận' }));
    await waitFor(() => expect(api.respondDirective).toHaveBeenLastCalledWith(7, { response: 'accepted', response_note: undefined }));
  });

  it('chặn: TCKT admin không thấy nút đánh giá', async () => {
    vi.mocked(api.fetchDirective).mockResolvedValue(detail({ status: 'submitted' }));
    at();
    await screen.findByRole('heading', { name: 'Báo cáo quý IV' });
    expect(screen.queryByRole('button', { name: 'Chấp nhận' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Yêu cầu sửa' })).toBeNull();
  });

  it('lỗi server khi tiếp nhận hiện bằng tiếng Việt', async () => {
    vi.mocked(api.acknowledgeDirective).mockRejectedValueOnce({ response: { status: 400, data: { error: 'Chỉ đạo không ở trạng thái chờ tiếp nhận.' } } });
    at();
    fireEvent.click(await screen.findByRole('button', { name: 'Tiếp nhận' }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Tiếp nhận' }));
    expect(await screen.findByText('Chỉ đạo không ở trạng thái chờ tiếp nhận.')).toBeDefined();
  });

  it('liệt kê hoạt động liên kết và kết quả đã nộp với đường dẫn tới trang chi tiết', async () => {
    vi.mocked(api.fetchDirective).mockResolvedValue(detail({
      status: 'submitted',
      activities: [{ id: 31, title: 'Hội nghị A', status: 'approved' }],
      submissions: [{
        id: 44, from_unit_id: 2, to_unit_id: 1, source_type: 'activity', source_id: 31, directive_id: 7, note: 'Đã xong', submitted_by: 5,
        response: null, response_note: null, responded_by: null, responded_at: null, withdrawn_at: null, created_at: '2026-10-05T03:00:00.000Z',
        source_title: 'Hội nghị A',
      }],
    }));
    at();
    expect((await screen.findByRole('link', { name: 'Hội nghị A' })).getAttribute('href')).toBe('/activity/31');
    expect(screen.getByRole('link', { name: /Hoạt động: Hội nghị A/ }).getAttribute('href')).toBe('/submission/44');
  });
});

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, fireEvent, waitFor, cleanup, within } from '@testing-library/react';
import { SubmissionsView } from './SubmissionsView';
import { CreateSubmissionButton } from './CreateSubmissionButton';
import { BTV_UNIT, renderDh, TCKT_UNIT } from '../dieuhanh/testUtils';
import * as api from '../../api';

vi.mock('../../api', async () => {
  const actual = await vi.importActual<typeof import('../../api')>('../../api');
  return {
    ...actual, fetchSubmissions: vi.fn(), fetchDieuHanhUnits: vi.fn(), fetchActivities: vi.fn(), fetchDirectives: vi.fn(), createSubmission: vi.fn(),
  };
});

const sub = (over: Partial<api.Submission> = {}): api.Submission => ({
  id: 44, from_unit_id: 2, to_unit_id: 1, source_type: 'activity', source_id: 31, directive_id: null, note: null, submitted_by: 5,
  response: null, response_note: null, responded_by: null, responded_at: null, withdrawn_at: null, created_at: '2026-10-05T03:00:00.000Z',
  from_unit_name: 'Ban TCKT', to_unit_name: 'Ban Thường vụ', source_title: 'Hội nghị A', ...over,
});

describe('SubmissionsView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.fetchSubmissions).mockResolvedValue([
      sub(),
      sub({ id: 45, source_title: 'Hội nghị B', response: 'accepted' }),
      sub({ id: 46, source_title: 'Hội nghị C', withdrawn_at: '2026-10-06T03:00:00.000Z' }),
    ]);
    vi.mocked(api.fetchDieuHanhUnits).mockResolvedValue([
      { id: 1, code: 'BTV', name: 'Ban Thường vụ', kind: 'standing_committee' },
      { id: 2, code: 'TCKT', name: 'Ban TCKT', kind: 'department' },
    ]);
    vi.mocked(api.fetchActivities).mockResolvedValue([
      { id: 31, title: 'Hội nghị A', status: 'approved' } as api.ActivityItem,
      { id: 33, title: 'Đề xuất chưa duyệt', status: 'proposed' } as api.ActivityItem,
    ]);
    vi.mocked(api.fetchDirectives).mockResolvedValue([
      { id: 7, from_unit_id: 1, to_unit_id: 2, title: 'Báo cáo quý IV', status: 'in_progress' } as api.Directive,
      { id: 8, from_unit_id: 1, to_unit_id: 2, title: 'Đã xong rồi', status: 'accepted' } as api.Directive,
    ]);
  });
  afterEach(cleanup);

  it('liệt kê trình với nguồn, đơn vị và trạng thái; dòng dẫn tới trang chi tiết', async () => {
    renderDh(<SubmissionsView />, { path: '/submissions' });
    const link = await screen.findByRole('link', { name: 'Hoạt động: Hội nghị A' });
    expect(link.getAttribute('href')).toBe('/submission/44');
    const tr = link.closest('tr') as HTMLElement;
    expect(within(tr).getByText('Chờ phản hồi')).toBeDefined();
    expect(within(tr).getByText('Ban Thường vụ')).toBeDefined();
    const rows = screen.getAllByRole('row');
    expect(rows.some((r) => within(r).queryByText('Đã rút lại'))).toBe(true);
    expect(rows.some((r) => within(r).queryByText('Đã chấp nhận'))).toBe(true);
  });

  it('lọc theo trạng thái "Chờ phản hồi" loại bỏ trình đã trả lời và đã rút', async () => {
    renderDh(<SubmissionsView />, { path: '/submissions' });
    await screen.findByText('Hoạt động: Hội nghị A');
    fireEvent.change(screen.getByLabelText('Trạng thái'), { target: { value: 'pending' } });
    expect(screen.getByText('Hoạt động: Hội nghị A')).toBeDefined();
    expect(screen.queryByText('Hoạt động: Hội nghị B')).toBeNull();
    expect(screen.queryByText('Hoạt động: Hội nghị C')).toBeNull();
  });

  it('nút "Trình lên" chỉ cho admin/BTV; leader không thấy', async () => {
    renderDh(<SubmissionsView />, { path: '/submissions', unit: TCKT_UNIT, role: 'leader' });
    await screen.findByText('Hoạt động: Hội nghị A');
    expect(screen.queryByRole('button', { name: 'Trình lên' })).toBeNull();
    cleanup();
    renderDh(<SubmissionsView />, { path: '/submissions', unit: TCKT_UNIT, role: 'admin' });
    expect(await screen.findByRole('button', { name: 'Trình lên' })).toBeDefined();
  });

  it('tạo trình từ hoạt động, gắn chỉ đạo đang thực hiện; gửi đúng body và làm mới cache', async () => {
    vi.mocked(api.createSubmission).mockResolvedValueOnce(sub({ id: 60 }));
    const { qc } = renderDh(<SubmissionsView />, { path: '/submissions', unit: TCKT_UNIT, role: 'admin' });
    fireEvent.click(await screen.findByRole('button', { name: 'Trình lên' }));
    const dialog = await screen.findByRole('dialog');
    await within(dialog).findByRole('option', { name: 'Ban Thường vụ' });
    expect(within(dialog).queryByRole('option', { name: 'Ban TCKT' })).toBeNull();
    await within(dialog).findByRole('option', { name: 'Hội nghị A' });
    expect(within(dialog).queryByRole('option', { name: 'Đề xuất chưa duyệt' })).toBeNull();
    fireEvent.change(within(dialog).getByLabelText(/Đơn vị nhận/), { target: { value: '1' } });
    expect(within(dialog).getByRole('option', { name: 'Báo cáo quý IV' })).toBeDefined();
    expect(within(dialog).queryByRole('option', { name: 'Đã xong rồi' })).toBeNull();
    fireEvent.change(within(dialog).getByLabelText(/Hoạt động/), { target: { value: '31' } });
    fireEvent.change(within(dialog).getByLabelText(/Gắn với chỉ đạo/), { target: { value: '7' } });
    fireEvent.change(within(dialog).getByLabelText('Ghi chú'), { target: { value: ' Gửi anh xem ' } });
    const spy = vi.spyOn(qc, 'invalidateQueries');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Trình' }));
    await waitFor(() => expect(api.createSubmission).toHaveBeenCalledWith(
      expect.objectContaining({
        to_unit_id: 1, source_type: 'activity', source_id: 31, directive_id: 7, note: 'Gửi anh xem',
      }),
      expect.anything()
    ));
    await waitFor(() => expect(spy).toHaveBeenCalledWith({ queryKey: ['submissions'] }));
  });

  it('thiếu đơn vị nhận hoặc nguồn thì không gọi API', async () => {
    renderDh(<SubmissionsView />, { path: '/submissions', unit: TCKT_UNIT, role: 'admin' });
    fireEvent.click(await screen.findByRole('button', { name: 'Trình lên' }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Trình' }));
    expect(within(dialog).getByText('Chọn đơn vị nhận và hoạt động cần trình.')).toBeDefined();
    expect(api.createSubmission).not.toHaveBeenCalled();
  });
});

describe('CreateSubmissionButton (dùng cho nhật ký trực ban ở đợt 6)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.fetchDieuHanhUnits).mockResolvedValue([{ id: 1, code: 'BTV', name: 'Ban Thường vụ', kind: 'standing_committee' }]);
    vi.mocked(api.fetchDirectives).mockResolvedValue([]);
    vi.mocked(api.fetchActivities).mockResolvedValue([]);
  });
  afterEach(cleanup);
  const preset = { sourceType: 'ops_log' as const, sourceId: 12, label: 'Ca trực 08/10' };

  it('ẩn khi không có quyền tạo trình hoặc đơn vị không có module', () => {
    renderDh(<CreateSubmissionButton preset={preset} />, { path: '/', role: 'member' });
    expect(screen.queryByRole('button', { name: /Trình lên/ })).toBeNull();
    cleanup();
    renderDh(<CreateSubmissionButton preset={preset} />, { path: '/', unit: { ...TCKT_UNIT, modules: ['ctd'] }, role: 'admin' });
    expect(screen.queryByRole('button', { name: /Trình lên/ })).toBeNull();
  });

  it('hiện cho admin: mở hộp với nguồn cố định và gửi source_type ops_log', async () => {
    vi.mocked(api.createSubmission).mockResolvedValueOnce(sub({ id: 70, source_type: 'ops_log', source_id: 12 }));
    renderDh(<CreateSubmissionButton preset={preset} />, { path: '/', role: 'admin' });
    fireEvent.click(screen.getByRole('button', { name: /Trình lên/ }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Nhật ký trực ban: Ca trực 08/10')).toBeDefined();
    expect(within(dialog).queryByLabelText(/Hoạt động/)).toBeNull();
    await within(dialog).findByRole('option', { name: 'Ban Thường vụ' });
    fireEvent.change(within(dialog).getByLabelText(/Đơn vị nhận/), { target: { value: '1' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Trình' }));
    await waitFor(() => expect(api.createSubmission).toHaveBeenCalledWith(
      expect.objectContaining({ to_unit_id: 1, source_type: 'ops_log', source_id: 12 }),
      expect.anything()
    ));
  });

  it('BTV (đơn vị khác) cũng thấy nút', () => {
    renderDh(<CreateSubmissionButton preset={preset} />, { path: '/', unit: BTV_UNIT, role: 'btv_member' });
    expect(screen.getByRole('button', { name: /Trình lên/ })).toBeDefined();
  });
});

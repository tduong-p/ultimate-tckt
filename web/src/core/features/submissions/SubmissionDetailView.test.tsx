import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, fireEvent, waitFor, cleanup, within } from '@testing-library/react';
import { SubmissionDetailView } from './SubmissionDetailView';
import { BTV_UNIT, renderDh, TCKT_UNIT } from '../dieuhanh/testUtils';
import * as api from '../../api';

vi.mock('../../api', async () => {
  const actual = await vi.importActual<typeof import('../../api')>('../../api');
  return { ...actual, fetchSubmission: vi.fn(), respondSubmission: vi.fn(), withdrawSubmission: vi.fn() };
});

const sub = (over: Partial<api.Submission> = {}): api.Submission => ({
  id: 44, from_unit_id: 2, to_unit_id: 1, source_type: 'activity', source_id: 31, directive_id: null, note: 'Gửi anh xem', submitted_by: 5,
  response: null, response_note: null, responded_by: null, responded_at: null, withdrawn_at: null, created_at: '2026-10-05T03:00:00.000Z',
  from_unit_name: 'Ban TCKT', to_unit_name: 'Ban Thường vụ', submitted_by_name: 'Trần Admin', source_title: 'Hội nghị A', ...over,
});
const at = (unit = TCKT_UNIT, role = 'admin') => renderDh(<SubmissionDetailView />, { path: '/submission/44', route: '/submission/:id', unit, role });

describe('SubmissionDetailView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.fetchSubmission).mockResolvedValue(sub());
  });
  afterEach(cleanup);

  it('hiện nguồn (có link), đơn vị, người nộp, ghi chú và trạng thái', async () => {
    at();
    expect((await screen.findByRole('link', { name: 'Hội nghị A' })).getAttribute('href')).toBe('/activity/31');
    expect(screen.getByText('Ban Thường vụ')).toBeDefined();
    expect(screen.getByText('Trần Admin')).toBeDefined();
    expect(screen.getByText('Gửi anh xem')).toBeDefined();
    expect(screen.getByText('Chờ phản hồi')).toBeDefined();
  });

  it('nguồn ops_log dẫn tới #/ops-log/:id', async () => {
    vi.mocked(api.fetchSubmission).mockResolvedValue(sub({ source_type: 'ops_log', source_id: 12, source_title: null }));
    at();
    expect((await screen.findByRole('link', { name: 'Nhật ký trực ban #12' })).getAttribute('href')).toBe('/ops-log/12');
  });

  it('TCKT admin (đơn vị gửi) rút lại được khi chưa phản hồi; gọi API và làm mới cache', async () => {
    vi.mocked(api.withdrawSubmission).mockResolvedValueOnce(sub());
    const { qc } = at();
    fireEvent.click(await screen.findByRole('button', { name: 'Rút lại' }));
    const dialog = await screen.findByRole('dialog');
    const spy = vi.spyOn(qc, 'invalidateQueries');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Rút lại' }));
    await waitFor(() => expect(api.withdrawSubmission).toHaveBeenCalledWith(44));
    await waitFor(() => expect(spy).toHaveBeenCalledWith({ queryKey: ['submissions'] }));
  });

  it('chặn: đã có phản hồi, đã rút, hoặc không phải admin đơn vị gửi thì không có nút Rút lại', async () => {
    vi.mocked(api.fetchSubmission).mockResolvedValue(sub({ response: 'seen' }));
    at();
    await screen.findAllByText('Đã xem');
    expect(screen.queryByRole('button', { name: 'Rút lại' })).toBeNull();
    cleanup();
    vi.mocked(api.fetchSubmission).mockResolvedValue(sub({ withdrawn_at: '2026-10-06T03:00:00.000Z' }));
    at();
    await screen.findByText('Đã rút lại');
    expect(screen.queryByRole('button', { name: 'Rút lại' })).toBeNull();
    cleanup();
    vi.mocked(api.fetchSubmission).mockResolvedValue(sub());
    at(TCKT_UNIT, 'leader');
    await screen.findByText('Chờ phản hồi');
    expect(screen.queryByRole('button', { name: 'Rút lại' })).toBeNull();
  });

  it('BTV phản hồi: trình không có chỉ đạo chỉ có "Đã xem"; gửi đúng body', async () => {
    vi.mocked(api.respondSubmission).mockResolvedValue(sub({ response: 'seen' }));
    at(BTV_UNIT, 'btv_lead');
    fireEvent.click(await screen.findByRole('button', { name: 'Phản hồi' }));
    const dialog = await screen.findByRole('dialog');
    const select = within(dialog).getByLabelText(/Phản hồi/) as HTMLSelectElement;
    expect(Array.from(select.options).map((o) => o.value)).toEqual(['seen']);
    fireEvent.click(within(dialog).getByRole('button', { name: 'Gửi phản hồi' }));
    await waitFor(() => expect(api.respondSubmission).toHaveBeenCalledWith(44, { response: 'seen', response_note: undefined }));
  });

  it('trình có chỉ đạo: thêm "Chấp nhận" và "Yêu cầu sửa"; yêu cầu sửa bắt buộc lý do', async () => {
    vi.mocked(api.fetchSubmission).mockResolvedValue(sub({ directive_id: 7 }));
    vi.mocked(api.respondSubmission).mockResolvedValue(sub());
    const { qc } = at(BTV_UNIT, 'btv_lead');
    fireEvent.click(await screen.findByRole('button', { name: 'Phản hồi' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText(/đánh giá tại trang Giao việc/)).toBeDefined();
    fireEvent.change(within(dialog).getByLabelText(/Phản hồi/), { target: { value: 'revision_requested' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Gửi phản hồi' }));
    expect(within(dialog).getByText('Vui lòng nhập lý do.')).toBeDefined();
    expect(api.respondSubmission).not.toHaveBeenCalled();
    fireEvent.change(within(dialog).getByLabelText(/Lý do/), { target: { value: 'Thiếu minh chứng' } });
    const spy = vi.spyOn(qc, 'invalidateQueries');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Gửi phản hồi' }));
    await waitFor(() => expect(api.respondSubmission).toHaveBeenCalledWith(44, { response: 'revision_requested', response_note: 'Thiếu minh chứng' }));
    await waitFor(() => expect(spy).toHaveBeenCalledWith({ queryKey: ['directives'] }));
  });

  it('chặn: TCKT admin (bên gửi) không có nút Phản hồi; BTV không có khi đã rút', async () => {
    at();
    await screen.findByText('Chờ phản hồi');
    expect(screen.queryByRole('button', { name: 'Phản hồi' })).toBeNull();
    cleanup();
    vi.mocked(api.fetchSubmission).mockResolvedValue(sub({ withdrawn_at: '2026-10-06T03:00:00.000Z' }));
    at(BTV_UNIT, 'btv_lead');
    await screen.findByText('Đã rút lại');
    expect(screen.queryByRole('button', { name: 'Phản hồi' })).toBeNull();
  });

  it('lỗi server hiện bằng tiếng Việt', async () => {
    vi.mocked(api.withdrawSubmission).mockRejectedValueOnce({ response: { status: 400, data: { error: 'Không thể rút lại submission đã có phản hồi.' } } });
    at();
    fireEvent.click(await screen.findByRole('button', { name: 'Rút lại' }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Rút lại' }));
    expect(await screen.findByText('Không thể rút lại submission đã có phản hồi.')).toBeDefined();
  });

  it('hiện phản hồi đã có kèm người trả lời', async () => {
    vi.mocked(api.fetchSubmission).mockResolvedValue(sub({ response: 'revision_requested', response_note: 'Thiếu minh chứng', responded_by_name: 'Lê BTV', responded_at: '2026-10-06T03:00:00.000Z' }));
    at();
    expect(await screen.findByText('Thiếu minh chứng')).toBeDefined();
    expect(screen.getByText('Lê BTV')).toBeDefined();
  });
});

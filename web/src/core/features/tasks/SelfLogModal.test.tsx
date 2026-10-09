import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { SelfLogModal } from './SelfLogModal';
import { renderApp, makeSession } from './testUtils';
import * as api from '../../api';

vi.mock('../../api', async () => {
  const actual = await vi.importActual<typeof import('../../api')>('../../api');
  return { ...actual, logTask: vi.fn(), fetchWeightPresets: vi.fn(), fetchMembers: vi.fn() };
});

const teams = [{ team_id: 2, name: 'Tổ Sự kiện' }, { team_id: 3, name: 'Tổ Truyền thông' }];

describe('SelfLogModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.logTask).mockResolvedValue({ id: 70 });
    vi.mocked(api.fetchWeightPresets).mockResolvedValue([{ id: 1, name: 'Trực gian hàng', points: 3 }, { id: 2, name: 'Hỗ trợ nhỏ', points: 1 }]);
    vi.mocked(api.fetchMembers).mockResolvedValue([{ id: 7, name: 'An', email: 'a@x', role: 'member', team_ids: '3' }]);
  });
  afterEach(cleanup);

  const open = () => renderApp(<SelfLogModal isOpen activityId={9} activityTeams={teams} onClose={() => {}} />, { session: makeSession({ id: 7 }) });

  it('chọn sẵn Tổ của người dùng trong số Tổ của hoạt động', async () => {
    open();
    await waitFor(() => expect((screen.getByLabelText(/Tổ phụ trách/) as HTMLSelectElement).value).toBe('3'));
  });

  it('chọn bộ trọng số điền trọng số và điền tên nếu đang trống', async () => {
    open();
    await screen.findByRole('option', { name: /Trực gian hàng/ });
    fireEvent.change(screen.getByLabelText('Mẫu trọng số'), { target: { value: '1' } });
    expect((screen.getByLabelText(/Trọng số/) as HTMLInputElement).value).toBe('3');
    expect((screen.getByLabelText(/Tên công việc/) as HTMLInputElement).value).toBe('Trực gian hàng');
  });

  it('trọng số phải là số nguyên 0–10', async () => {
    open();
    fireEvent.change(screen.getByLabelText(/Tên công việc/), { target: { value: 'Việc' } });
    await waitFor(() => expect((screen.getByLabelText(/Tổ phụ trách/) as HTMLSelectElement).value).toBe('3'));
    for (const bad of ['0.5', '11', '-1']) {
      fireEvent.change(screen.getByLabelText(/Trọng số/), { target: { value: bad } });
      fireEvent.click(screen.getByRole('button', { name: 'Ghi nhận' }));
      expect(screen.getByText('Trọng số phải là số nguyên từ 0 đến 10.')).toBeDefined();
    }
    expect(api.logTask).not.toHaveBeenCalled();
  });

  it('link minh chứng tuỳ chọn nhưng nếu nhập phải là http(s)', async () => {
    open();
    fireEvent.change(screen.getByLabelText(/Tên công việc/), { target: { value: 'Việc' } });
    await waitFor(() => expect((screen.getByLabelText(/Tổ phụ trách/) as HTMLSelectElement).value).toBe('3'));
    fireEvent.change(screen.getByLabelText(/Liên kết minh chứng/), { target: { value: 'abc' } });
    fireEvent.click(screen.getByRole('button', { name: 'Ghi nhận' }));
    expect(screen.getByText('Liên kết minh chứng phải bắt đầu bằng http:// hoặc https://.')).toBeDefined();
    expect(api.logTask).not.toHaveBeenCalled();
  });

  it('gửi đúng payload, làm mới cache và báo "đang chờ nghiệm thu"', async () => {
    const { qc } = open();
    const spy = vi.spyOn(qc, 'invalidateQueries');
    fireEvent.change(screen.getByLabelText(/Tên công việc/), { target: { value: ' Trực gian hàng ' } });
    await waitFor(() => expect((screen.getByLabelText(/Tổ phụ trách/) as HTMLSelectElement).value).toBe('3'));
    fireEvent.change(screen.getByLabelText(/Trọng số/), { target: { value: '3' } });
    fireEvent.change(screen.getByLabelText(/Liên kết minh chứng/), { target: { value: 'https://drive.example/c' } });
    fireEvent.change(screen.getByLabelText('Mô tả'), { target: { value: 'Ca sáng' } });
    fireEvent.click(screen.getByRole('button', { name: 'Ghi nhận' }));
    await waitFor(() => expect(api.logTask).toHaveBeenCalledWith(9, { title: 'Trực gian hàng', team_id: 3, weight: 3, link_url: 'https://drive.example/c', description: 'Ca sáng' }));
    expect(await screen.findByText('Đã ghi nhận công việc thành công. Đang chờ nghiệm thu.')).toBeDefined();
    expect(spy).toHaveBeenCalledWith({ queryKey: ['core-activity'] });
  });

  it('lỗi 409 (hoạt động chưa duyệt) hiện tiếng Việt', async () => {
    vi.mocked(api.logTask).mockRejectedValueOnce({ response: { status: 409, data: { error: 'Chỉ có thể ghi nhận công việc vào hoạt động đã được duyệt và đang diễn ra.' } } });
    open();
    fireEvent.change(screen.getByLabelText(/Tên công việc/), { target: { value: 'Việc' } });
    await waitFor(() => expect((screen.getByLabelText(/Tổ phụ trách/) as HTMLSelectElement).value).toBe('3'));
    fireEvent.click(screen.getByRole('button', { name: 'Ghi nhận' }));
    expect(await screen.findByText('Chỉ có thể ghi nhận công việc vào hoạt động đã được duyệt và đang diễn ra.')).toBeDefined();
  });
});

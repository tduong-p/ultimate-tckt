import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { WeightPresetsPanel } from './WeightPresetsPanel';
import * as api from '../../api';
import { renderWithApp } from '../../testing/peopleHarness';

vi.mock('../../api', async () => {
  const actual = await vi.importActual<typeof import('../../api')>('../../api');
  return { ...actual, fetchWeightPresets: vi.fn(), createWeightPreset: vi.fn(), updateWeightPreset: vi.fn(), deleteWeightPreset: vi.fn() };
});

const presets: api.WeightPreset[] = [
  { id: 1, name: 'Việc nhỏ', points: 1, description: 'Dưới 1 giờ', sort_order: 1, is_active: 1 },
  { id: 2, name: 'Việc lớn', points: 8, description: null, sort_order: 2, is_active: 0 },
];
const locked = { response: { status: 403, data: { error: 'Cấu hình này đang bị DYC khoá.', locked: true, reason: 'Đang rà soát trọng số', locked_by_name: 'Nguyễn DYC' } } };
const open = () => renderWithApp(<WeightPresetsPanel />, { role: 'admin' });

describe('WeightPresetsPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.fetchWeightPresets).mockResolvedValue(presets);
  });
  afterEach(cleanup);

  it('liệt kê preset, đánh dấu preset đã tắt', async () => {
    open();
    expect(await screen.findByText('Việc nhỏ')).toBeDefined();
    expect(screen.getByText('1 điểm')).toBeDefined();
    expect(screen.getByText('8 điểm')).toBeDefined();
    expect(screen.getByText('Đã tắt')).toBeDefined();
  });

  it('thêm preset: POST đúng body và làm mới danh sách', async () => {
    vi.mocked(api.createWeightPreset).mockResolvedValueOnce({ ...presets[0], id: 3 });
    const { qc } = open();
    const spy = vi.spyOn(qc, 'invalidateQueries').mockResolvedValue(undefined);
    await screen.findByText('Việc nhỏ');
    fireEvent.click(screen.getByRole('button', { name: 'Thêm preset' }));
    fireEvent.change(await screen.findByLabelText('Tên preset'), { target: { value: ' Việc vừa ' } });
    fireEvent.change(screen.getByLabelText('Điểm (0–10)'), { target: { value: '5' } });
    fireEvent.change(screen.getByLabelText('Thứ tự'), { target: { value: '3' } });
    fireEvent.change(screen.getByLabelText('Mô tả'), { target: { value: 'Nửa ngày' } });
    fireEvent.click(screen.getByRole('button', { name: 'Lưu' }));
    await waitFor(() => expect(api.createWeightPreset).toHaveBeenCalledWith({ name: 'Việc vừa', points: 5, sort_order: 3, description: 'Nửa ngày' }));
    expect(await screen.findByText('Đã thêm preset.')).toBeDefined();
    await waitFor(() => expect(spy).toHaveBeenCalledWith({ queryKey: ['core-weight-presets'] }));
  });

  it('chặn điểm ngoài 0–10, số thập phân và tên rỗng ở client', async () => {
    open();
    await screen.findByText('Việc nhỏ');
    fireEvent.click(screen.getByRole('button', { name: 'Thêm preset' }));
    const points = await screen.findByLabelText('Điểm (0–10)');
    fireEvent.click(screen.getByRole('button', { name: 'Lưu' }));
    expect(await screen.findByText('Tên preset không được để trống.')).toBeDefined();
    fireEvent.change(screen.getByLabelText('Tên preset'), { target: { value: 'X' } });
    for (const bad of ['11', '-1', '2.5', '']) {
      fireEvent.change(points, { target: { value: bad } });
      fireEvent.click(screen.getByRole('button', { name: 'Lưu' }));
      expect(await screen.findByText('Điểm trọng số phải là số nguyên từ 0 đến 10.')).toBeDefined();
    }
    expect(api.createWeightPreset).not.toHaveBeenCalled();
  });

  it('sửa preset: PATCH kèm is_active', async () => {
    vi.mocked(api.updateWeightPreset).mockResolvedValueOnce({ ok: true });
    open();
    fireEvent.click(await screen.findByRole('button', { name: 'Sửa Việc lớn' }));
    expect((await screen.findByLabelText('Tên preset') as HTMLInputElement).value).toBe('Việc lớn');
    fireEvent.click(screen.getByLabelText('Đang dùng'));
    fireEvent.click(screen.getByRole('button', { name: 'Lưu' }));
    await waitFor(() => expect(api.updateWeightPreset).toHaveBeenCalledWith(2, { name: 'Việc lớn', points: 8, sort_order: 2, description: '', is_active: true }));
    expect(await screen.findByText('Đã cập nhật preset.')).toBeDefined();
  });

  it('xoá phải xác nhận: huỷ thì không gọi, đồng ý thì DELETE', async () => {
    vi.mocked(api.deleteWeightPreset).mockResolvedValueOnce({ ok: true, deleted: true });
    open();
    fireEvent.click(await screen.findByRole('button', { name: 'Xoá Việc nhỏ' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Huỷ' }));
    expect(api.deleteWeightPreset).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Xoá Việc nhỏ' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Xoá preset' }));
    await waitFor(() => expect(api.deleteWeightPreset).toHaveBeenCalledWith(1));
    expect(await screen.findByText('Đã xoá preset.')).toBeDefined();
  });

  it('bị DYC khoá khi sửa: banner nêu lý do và người khoá, hộp giữ nguyên để sửa lại', async () => {
    vi.mocked(api.updateWeightPreset).mockRejectedValueOnce(locked);
    open();
    fireEvent.click(await screen.findByRole('button', { name: 'Sửa Việc nhỏ' }));
    await screen.findByLabelText('Tên preset');
    fireEvent.click(screen.getByRole('button', { name: 'Lưu' }));
    const banner = await screen.findAllByText(/Cấu hình này đang bị DYC khoá\./);
    expect(banner.length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Lý do: Đang rà soát trọng số\./).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Người khoá: Nguyễn DYC\./).length).toBeGreaterThan(0);
  });

  it('bị khoá khi xoá: banner trên panel và toast', async () => {
    vi.mocked(api.deleteWeightPreset).mockRejectedValueOnce(locked);
    open();
    fireEvent.click(await screen.findByRole('button', { name: 'Xoá Việc nhỏ' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Xoá preset' }));
    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain('Cấu hình này đang bị DYC khoá.');
    expect(alert.textContent).toContain('Đang rà soát trọng số');
  });

  it('lỗi khác (404) hiện nguyên văn tiếng Việt, không có banner khoá', async () => {
    vi.mocked(api.deleteWeightPreset).mockRejectedValueOnce({ response: { status: 404, data: { error: 'Preset không tồn tại.' } } });
    open();
    fireEvent.click(await screen.findByRole('button', { name: 'Xoá Việc nhỏ' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Xoá preset' }));
    expect(await screen.findByText('Preset không tồn tại.')).toBeDefined();
    expect(screen.queryByText(/Cấu hình này đang bị DYC khoá\./)).toBeNull();
  });

  it('không có quyền đọc cấu hình: hiện câu lỗi của server', async () => {
    vi.mocked(api.fetchWeightPresets).mockRejectedValue({ response: { status: 403, data: { error: 'Bạn không có quyền với cấu hình này.' } } });
    open();
    expect(await screen.findByText('Bạn không có quyền với cấu hình này.')).toBeDefined();
    expect(screen.queryByRole('button', { name: 'Thêm preset' })).toBeNull();
  });
});

// web/src/core/api/admin.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiClient } from '../../shared/utils/api';
import {
  fetchWeightPresets, createWeightPreset, updateWeightPreset, deleteWeightPreset, settingLock, settingErrorMessage,
} from './admin';

vi.mock('../../shared/utils/api', () => ({ apiClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() } }));

const locked = {
  response: { status: 403, data: { error: 'Cấu hình này đang bị DYC khoá.', locked: true, reason: 'Đang rà soát', locked_by_name: 'Nguyễn DYC' } },
};

describe('api/admin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('gọi đúng endpoint /admin/weight-presets', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: [] });
    await fetchWeightPresets();
    expect(apiClient.get).toHaveBeenCalledWith('/admin/weight-presets');

    const body = { name: 'Cơ bản', points: 3, sort_order: 1, description: 'mô tả' };
    vi.mocked(apiClient.post).mockResolvedValueOnce({ data: { id: 1, ...body, is_active: 1 } });
    await createWeightPreset(body);
    expect(apiClient.post).toHaveBeenCalledWith('/admin/weight-presets', body);

    vi.mocked(apiClient.patch).mockResolvedValueOnce({ data: { ok: true } });
    await updateWeightPreset(1, { ...body, is_active: false });
    expect(apiClient.patch).toHaveBeenCalledWith('/admin/weight-presets/1', { ...body, is_active: false });

    vi.mocked(apiClient.delete).mockResolvedValueOnce({ data: { ok: true, deleted: true } });
    await deleteWeightPreset(1);
    expect(apiClient.delete).toHaveBeenCalledWith('/admin/weight-presets/1');
  });

  it('settingLock nhận ra 403 bị khoá và lấy lý do, người khoá', () => {
    expect(settingLock(locked)).toEqual({ message: 'Cấu hình này đang bị DYC khoá.', reason: 'Đang rà soát', lockedBy: 'Nguyễn DYC' });
  });

  it('settingLock trả null với lỗi khác', () => {
    expect(settingLock({ response: { status: 403, data: { error: 'Bạn không có quyền với cấu hình này.' } } })).toBeNull();
    expect(settingLock(new Error('x'))).toBeNull();
  });

  it('settingErrorMessage ghép lý do khi bị khoá, còn lại dùng apiErrorMessage', () => {
    expect(settingErrorMessage(locked)).toBe('Cấu hình này đang bị DYC khoá. Lý do: Đang rà soát. Người khoá: Nguyễn DYC.');
    expect(settingErrorMessage({ response: { status: 404, data: { error: 'Preset không tồn tại.' } } })).toBe('Preset không tồn tại.');
    expect(settingErrorMessage(new Error('Network Error'))).toBe('Không kết nối được máy chủ. Vui lòng thử lại.');
  });
});

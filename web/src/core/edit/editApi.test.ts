import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '../../shared/utils/api';
import { classifyBatchError, patchActivityBatch, patchTaskBatch } from './editApi';

const axiosErr = (status: number, data: unknown) => ({ response: { status, data } });

describe('editApi', () => {
  beforeEach(() => { vi.restoreAllMocks(); });

  it('patchTaskBatch gọi PATCH /tasks/:id/batch và trả dữ liệu', async () => {
    const spy = vi.spyOn(apiClient, 'patch').mockResolvedValue({ data: { changed: ['title'] } });
    const res = await patchTaskBatch(5, { changes: { title: 'B' }, base: { title: 'A' } });
    expect(spy).toHaveBeenCalledWith('/tasks/5/batch', { changes: { title: 'B' }, base: { title: 'A' } });
    expect(res).toEqual({ changed: ['title'] });
  });

  it('patchActivityBatch gọi PATCH /activities/:id/batch', async () => {
    const spy = vi.spyOn(apiClient, 'patch').mockResolvedValue({ data: { changed: [] } });
    await patchActivityBatch(7, { changes: {}, base: {} });
    expect(spy).toHaveBeenCalledWith('/activities/7/batch', { changes: {}, base: {} });
  });

  it('409 -> conflict kèm fields', () => {
    const r = classifyBatchError(axiosErr(409, { error: 'x', conflicts: ['title', 'deadline'] }));
    expect(r.kind).toBe('conflict');
    expect(r.fields).toEqual(['title', 'deadline']);
    expect(r.message).toMatch(/người khác/);
  });

  it('403 -> forbidden kèm fields', () => {
    const r = classifyBatchError(axiosErr(403, { forbidden: ['team_id'] }));
    expect(r).toMatchObject({ kind: 'forbidden', fields: ['team_id'] });
    expect(r.message).toBeTruthy();
  });

  it('400 -> validation dùng thông điệp máy chủ', () => {
    const r = classifyBatchError(axiosErr(400, { error: 'Tiêu đề không được để trống' }));
    expect(r.kind).toBe('validation');
    expect(r.message).toBe('Tiêu đề không được để trống');
  });

  it('lỗi mạng -> error', () => {
    const r = classifyBatchError(new Error('Network Error'));
    expect(r.kind).toBe('error');
    expect(r.message).toMatch(/kết nối/);
  });

  it('500 -> error', () => {
    expect(classifyBatchError(axiosErr(500, {})).kind).toBe('error');
  });
});

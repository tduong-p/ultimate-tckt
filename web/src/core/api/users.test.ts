// web/src/core/api/users.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiClient } from '../../shared/utils/api';
import { createUser, updateUser, deleteUser, bulkImportUsers, updateMyAccount } from './users';

vi.mock('../../shared/utils/api', () => ({ apiClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() } }));

describe('api/users', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('createUser: POST /users', async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({ data: { id: 5 } });
    const payload = { name: 'An', email: 'an@x.vn', role: 'member', auth_provider: 'local' as const, password: '12345678', team_ids: [1] };
    await expect(createUser(payload)).resolves.toEqual({ id: 5 });
    expect(apiClient.post).toHaveBeenCalledWith('/users', payload);
  });

  it('updateUser: PATCH /users/:id', async () => {
    vi.mocked(apiClient.patch).mockResolvedValueOnce({ data: { ok: true } });
    const payload = { name: 'An', phone: '', avatar_color: '#0052cc', role: 'member', team_ids: [1] };
    await updateUser(5, payload);
    expect(apiClient.patch).toHaveBeenCalledWith('/users/5', payload);
  });

  it('deleteUser: DELETE /users/:id và trả kết quả', async () => {
    vi.mocked(apiClient.delete).mockResolvedValueOnce({ data: { ok: true, deleted: false, deactivated: true } });
    await expect(deleteUser(5)).resolves.toEqual({ ok: true, deleted: false, deactivated: true });
    expect(apiClient.delete).toHaveBeenCalledWith('/users/5');
  });

  it('bulkImportUsers: POST /users/bulk-import {rows}', async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({ data: { ok: true, created: 2, skipped: 1 } });
    await expect(bulkImportUsers([{ name: 'A', email: 'a@x.vn' }])).resolves.toEqual({ ok: true, created: 2, skipped: 1 });
    expect(apiClient.post).toHaveBeenCalledWith('/users/bulk-import', { rows: [{ name: 'A', email: 'a@x.vn' }] });
  });

  it('updateMyAccount: PATCH /account, trả user', async () => {
    vi.mocked(apiClient.patch).mockResolvedValueOnce({ data: { user: { id: 1, name: 'A', email: 'n@x.vn', role: 'member' } } });
    const user = await updateMyAccount({ email: 'n@x.vn', phone: '', avatar_color: '#0052cc' });
    expect(user.email).toBe('n@x.vn');
    expect(apiClient.patch).toHaveBeenCalledWith('/account', { email: 'n@x.vn', phone: '', avatar_color: '#0052cc' });
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiClient } from '../../shared/utils/api';
import { createDocument, updateDocument, type DocumentPayload } from './documents';

vi.mock('../../shared/utils/api', () => ({ apiClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn() } }));

const payload: DocumentPayload = {
  name: 'Quy chế',
  link_url: 'https://example.com/a',
  description: 'Mô tả',
  applicable_year: 2026,
  issuing_team_id: 3,
  visibility: 'all_teams',
};

describe('documents api (ghi)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('createDocument: POST /documents với body đúng, trả {id}', async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({ data: { id: 9 } });
    await expect(createDocument(payload)).resolves.toEqual({ id: 9 });
    expect(apiClient.post).toHaveBeenCalledWith('/documents', payload);
  });

  it('updateDocument: PATCH /documents/:id với body đúng', async () => {
    vi.mocked(apiClient.patch).mockResolvedValueOnce({ data: { ok: true } });
    await expect(updateDocument(7, payload)).resolves.toEqual({ ok: true });
    expect(apiClient.patch).toHaveBeenCalledWith('/documents/7', payload);
  });
});

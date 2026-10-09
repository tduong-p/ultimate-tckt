import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiClient } from '../../shared/utils/api';
import { switchUnit } from './session';

vi.mock('../../shared/utils/api', () => ({ apiClient: { get: vi.fn(), post: vi.fn() } }));

describe('switchUnit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('gọi POST /session/unit với unit_id và trả session mới', async () => {
    const session = { user: { id: 1, name: 'A', email: 'a@x', role: 'member' }, units: { current: null, memberships: [] } };
    vi.mocked(apiClient.post).mockResolvedValueOnce({ data: session });
    await expect(switchUnit(7)).resolves.toEqual(session);
    expect(apiClient.post).toHaveBeenCalledWith('/session/unit', { unit_id: 7 });
  });
});

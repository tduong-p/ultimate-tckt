// web/src/core/features/people/invalidate.test.ts
import { describe, it, expect, vi } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import { invalidatePeople } from './invalidate';

describe('invalidatePeople', () => {
  it('làm mới Tổ, thành viên, mọi trang Tổ và bootstrap', async () => {
    const qc = new QueryClient();
    const spy = vi.spyOn(qc, 'invalidateQueries').mockResolvedValue(undefined);
    await invalidatePeople(qc);
    const keys = spy.mock.calls.map((c) => (c[0] as { queryKey: readonly unknown[] }).queryKey);
    expect(keys).toEqual([['core-teams'], ['core-members'], ['core-team'], ['core-bootstrap']]);
  });
});

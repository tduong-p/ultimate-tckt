import { describe, it, expect, vi } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import { invalidateTasks } from './taskKeys';

describe('invalidateTasks', () => {
  it('làm mới Việc của tôi, Tổng quan, danh sách và chi tiết hoạt động', async () => {
    const qc = new QueryClient();
    const spy = vi.spyOn(qc, 'invalidateQueries');
    await invalidateTasks(qc);
    const keys = spy.mock.calls.map((c) => (c[0] as { queryKey: readonly string[] }).queryKey[0]);
    expect(keys).toEqual(['core-my-tasks-today', 'core-bootstrap', 'core-activities', 'core-activity']);
  });
});

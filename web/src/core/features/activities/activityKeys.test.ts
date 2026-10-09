import { describe, it, expect, vi } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import { ACTIVITIES_KEY, activityDetailKey, forgetActivity, invalidateActivity } from './activityKeys';
import { BOOTSTRAP_KEY } from '../../queryKeys';

describe('activityKeys', () => {
  it('khoá chi tiết theo số', () => {
    expect(activityDetailKey('5')).toEqual(['core-activity', 5]);
  });

  it('invalidateActivity làm mới chi tiết, danh sách và bootstrap', async () => {
    const qc = new QueryClient();
    const spy = vi.spyOn(qc, 'invalidateQueries');
    await invalidateActivity(qc, 5);
    expect(spy).toHaveBeenCalledWith({ queryKey: ['core-activity', 5] });
    expect(spy).toHaveBeenCalledWith({ queryKey: ACTIVITIES_KEY });
    expect(spy).toHaveBeenCalledWith({ queryKey: BOOTSTRAP_KEY });
  });

  it('forgetActivity bỏ cache chi tiết và làm mới mọi khoá core-*', () => {
    const qc = new QueryClient();
    qc.setQueryData(['core-activity', 5], { activity: { id: 5 } });
    qc.setQueryData(['core-my-tasks'], []);
    forgetActivity(qc, 5);
    expect(qc.getQueryData(['core-activity', 5])).toBeUndefined();
    expect(qc.getQueryState(['core-my-tasks'])?.isInvalidated).toBe(true);
  });
});

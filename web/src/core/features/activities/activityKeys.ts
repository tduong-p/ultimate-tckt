import type { QueryClient } from '@tanstack/react-query';
import { BOOTSTRAP_KEY } from '../../queryKeys';

export const ACTIVITIES_KEY = ['core-activities'] as const;
export const activityDetailKey = (id: number | string) => ['core-activity', Number(id)] as const;

/** Sau thao tác ghi thành công: làm mới chi tiết, danh sách và số liệu Tổng quan. */
export function invalidateActivity(qc: QueryClient, id: number | string): Promise<unknown> {
  return Promise.all([
    qc.invalidateQueries({ queryKey: activityDetailKey(id) }),
    qc.invalidateQueries({ queryKey: ACTIVITIES_KEY }),
    qc.invalidateQueries({ queryKey: BOOTSTRAP_KEY }),
  ]);
}

/** Hoạt động bị xoá hẳn (từ chối, huỷ, xoá): bỏ cache chi tiết, làm mới mọi danh sách `core-*` (việc của hoạt động cũng mất). */
export function forgetActivity(qc: QueryClient, id: number | string): void {
  qc.removeQueries({ queryKey: activityDetailKey(id) });
  void qc.invalidateQueries({ predicate: (query) => String(query.queryKey[0]).startsWith('core-') });
}

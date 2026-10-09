import type { QueryClient } from '@tanstack/react-query';
import { BOOTSTRAP_KEY } from '../../queryKeys';
import { ACTIVITIES_KEY } from '../activities/activityKeys';

export const MY_TASKS_TODAY_KEY = ['core-my-tasks-today'] as const;
const ACTIVITY_DETAIL_PREFIX = ['core-activity'] as const;

/** Sau thao tác ghi lên công việc: làm mới Việc của tôi, Tổng quan, danh sách và mọi trang chi tiết hoạt động đang cache. */
export function invalidateTasks(qc: QueryClient): Promise<unknown> {
  return Promise.all([
    qc.invalidateQueries({ queryKey: MY_TASKS_TODAY_KEY }),
    qc.invalidateQueries({ queryKey: BOOTSTRAP_KEY }),
    qc.invalidateQueries({ queryKey: ACTIVITIES_KEY }),
    qc.invalidateQueries({ queryKey: ACTIVITY_DETAIL_PREFIX }),
  ]);
}

import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ACTIVITY_PREFIX, BOOTSTRAP_KEY, MY_TASKS_TODAY_KEY, TASK_KEY } from '../../queryKeys';

/** Làm mới mọi dữ liệu có thể đổi sau một thao tác công việc. */
export function useInvalidateTaskCaches() {
  const queryClient = useQueryClient();
  return useCallback(
    (taskId?: number) => {
      const keys: (readonly unknown[])[] = [BOOTSTRAP_KEY, MY_TASKS_TODAY_KEY, ['core-activities'], ACTIVITY_PREFIX];
      if (taskId !== undefined) keys.unshift(TASK_KEY(taskId));
      return Promise.all(keys.map((queryKey) => queryClient.invalidateQueries({ queryKey })));
    },
    [queryClient]
  );
}

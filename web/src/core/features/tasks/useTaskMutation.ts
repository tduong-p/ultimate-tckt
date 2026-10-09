import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiErrorMessage } from '../../api';
import { useToast } from '../../../shared/components/Toast';
import { invalidateTasks } from './taskKeys';

export interface TaskMutationOptions<V, R> {
  message: string | ((result: R, vars: V) => string);
  onDone?: (result: R, vars: V) => void;
}

/** Thao tác ghi lên một công việc: toast tiếng Việt (lỗi dịch qua apiErrorMessage), làm mới các cache liên quan. */
export function useTaskMutation<V = void, R = unknown>(fn: (vars: V) => Promise<R>, options: TaskMutationOptions<V, R>) {
  const qc = useQueryClient();
  const toast = useToast();
  return useMutation<R, unknown, V>({
    mutationFn: fn,
    onSuccess: (result, vars) => {
      void invalidateTasks(qc);
      toast.success(typeof options.message === 'function' ? options.message(result, vars) : options.message);
      options.onDone?.(result, vars);
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });
}

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { apiErrorMessage } from '../../api';
import { useToast } from '../../../shared/components/Toast';
import { forgetActivity, invalidateActivity } from './activityKeys';

export interface ActivityMutationOptions<V, R> {
  message: string | ((result: R, vars: V) => string);
  /** Thông báo khi hoạt động bị xoá hẳn (mặc định dùng `message`). */
  removedMessage?: string;
  /** Trả true khi server đã xoá hoạt động (từ chối, huỷ, xoá): chuyển về danh sách thay vì làm mới. */
  removed?: (result: R, vars: V) => boolean;
  onDone?: (result: R, vars: V) => void;
}

/** Mọi thao tác ghi của trang hoạt động: toast tiếng Việt, làm mới cache, xử lý hoạt động bị xoá. */
export function useActivityMutation<V = void, R = unknown>(
  activityId: number,
  fn: (vars: V) => Promise<R>,
  options: ActivityMutationOptions<V, R>
) {
  const qc = useQueryClient();
  const toast = useToast();
  const navigate = useNavigate();
  return useMutation<R, unknown, V>({
    mutationFn: fn,
    onSuccess: (result, vars) => {
      const text = typeof options.message === 'function' ? options.message(result, vars) : options.message;
      if (options.removed?.(result, vars)) {
        navigate('/activities');
        forgetActivity(qc, activityId);
        toast.success(options.removedMessage ?? text);
        return;
      }
      void invalidateActivity(qc, activityId);
      toast.success(text);
      options.onDone?.(result, vars);
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });
}

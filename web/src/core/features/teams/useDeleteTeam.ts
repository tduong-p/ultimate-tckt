import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiErrorMessage, deleteTeam } from '../../api';
import { useToast } from '../../../shared/components/Toast';
import { invalidatePeople } from '../people/invalidate';

/** Xoá Tổ. Server có thể chỉ lưu trữ (còn dữ liệu liên quan) nên báo hai câu khác nhau. */
export function useDeleteTeam(onDeleted?: () => void) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (teamId: number) => deleteTeam(teamId),
    onSuccess: (result) => {
      toast.success(result.deactivated ? 'Đã lưu trữ Tổ.' : 'Đã xoá Tổ thành công.');
      void invalidatePeople(queryClient);
      onDeleted?.();
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Không xoá được Tổ.')),
  });
}

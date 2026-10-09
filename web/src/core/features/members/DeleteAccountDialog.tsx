import React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiErrorMessage, deleteUser, type DeleteUserResult, type MemberItem } from '../../api';
import { ConfirmDialog } from '../../../shared/components/ConfirmDialog';
import { useToast } from '../../../shared/components/Toast';
import { invalidatePeople } from '../people/invalidate';

function resultMessage(result: DeleteUserResult): string {
  if (result.removed_from_managed_teams) return 'Đã gỡ tài khoản khỏi Tổ của bạn.';
  if (result.deactivated) return 'Đã vô hiệu hoá tài khoản để giữ lịch sử.';
  return 'Đã xoá tài khoản.';
}

export const DeleteAccountDialog: React.FC<{ member: MemberItem | null; onClose: () => void }> = ({ member, onClose }) => {
  const queryClient = useQueryClient();
  const toast = useToast();
  const mutation = useMutation({
    mutationFn: (userId: number) => deleteUser(userId),
    onSuccess: (result) => {
      toast.success(resultMessage(result));
      void invalidatePeople(queryClient);
      onClose();
    },
    onError: (err) => {
      toast.error(apiErrorMessage(err, 'Không xoá được tài khoản.'));
      onClose();
    },
  });
  return (
    <ConfirmDialog
      isOpen={member !== null}
      title="Xoá tài khoản"
      appearance="danger"
      confirmLabel="Xoá tài khoản"
      isLoading={mutation.isPending}
      onConfirm={() => member && mutation.mutate(member.id)}
      onCancel={onClose}
    >
      <p>
        Xoá tài khoản <strong>{member?.name}</strong>? Nếu tài khoản đã có lịch sử công việc, hệ thống chỉ vô hiệu hoá;
        Tổ trưởng chỉ gỡ được tài khoản khỏi Tổ của mình.
      </p>
    </ConfirmDialog>
  );
};

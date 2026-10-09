import React, { useId, useState } from 'react';
import { ModalTransition } from '@atlaskit/modal-dialog';
import Textfield from '@atlaskit/textfield';
import TextArea from '@atlaskit/textarea';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiErrorMessage, createTeam, updateTeam, type TeamItem } from '../../api';
import { useCapabilities } from '../../capabilities';
import { useToast } from '../../../shared/components/Toast';
import { FormDialog } from '../people/FormDialog';
import { FormField } from '../people/FormField';
import { invalidatePeople } from '../people/invalidate';

const COLOR_RE = /^#[0-9a-f]{6}$/i;
const DEFAULT_COLOR = '#1e3a8a';

export interface TeamFormModalProps {
  isOpen: boolean;
  /** Có `team` là sửa, không có là tạo. */
  team?: TeamItem | null;
  onClose: () => void;
}

export const TeamFormModal: React.FC<TeamFormModalProps> = ({ isOpen, team, onClose }) => (
  <ModalTransition>{isOpen && <TeamFormDialog team={team ?? null} onClose={onClose} />}</ModalTransition>
);

const TeamFormDialog: React.FC<{ team: TeamItem | null; onClose: () => void }> = ({ team, onClose }) => {
  const ids = { name: useId(), description: useId(), color: useId() };
  const caps = useCapabilities();
  const queryClient = useQueryClient();
  const toast = useToast();
  const isEdit = team !== null;
  // Server: chỉ admin sửa tên và mô tả; Tổ trưởng chỉ sửa màu (PATCH /api/teams/:id).
  const canEditText = caps.isExec;
  const [name, setName] = useState(team?.name ?? '');
  const [description, setDescription] = useState(team?.description ?? '');
  const [color, setColor] = useState(team?.color && COLOR_RE.test(team.color) ? team.color : DEFAULT_COLOR);
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: async () => {
      if (!isEdit) {
        await createTeam({ name: name.trim(), description: description.trim(), color });
      } else {
        await updateTeam(team.id, canEditText ? { name: name.trim(), description: description.trim(), color } : { color });
      }
    },
    onSuccess: () => {
      toast.success(isEdit ? 'Đã cập nhật Tổ.' : 'Đã tạo Tổ.');
      void invalidatePeople(queryClient);
      onClose();
    },
    onError: (err) => setError(apiErrorMessage(err, isEdit ? 'Không cập nhật được Tổ.' : 'Không tạo được Tổ.')),
  });

  const submit = () => {
    if (canEditText && !name.trim()) {
      setError('Vui lòng nhập tên Tổ.');
      return;
    }
    if (!COLOR_RE.test(color)) {
      setError('Màu của Tổ không hợp lệ.');
      return;
    }
    setError('');
    mutation.mutate();
  };

  return (
    <FormDialog
      title={isEdit ? `Sửa Tổ ${team.name}` : 'Tạo Tổ'}
      submitLabel={isEdit ? 'Lưu' : 'Tạo'}
      isSubmitting={mutation.isPending}
      error={error}
      onSubmit={submit}
      onClose={onClose}
    >
      {canEditText && (
        <>
          <FormField label="Tên Tổ" htmlFor={ids.name}>
            <Textfield id={ids.name} value={name} onChange={(e) => setName((e.target as HTMLInputElement).value)} />
          </FormField>
          <FormField label="Mô tả" htmlFor={ids.description}>
            <TextArea id={ids.description} value={description} minimumRows={2} onChange={(e) => setDescription(e.target.value)} />
          </FormField>
        </>
      )}
      <FormField label="Màu của Tổ" htmlFor={ids.color}>
        <input id={ids.color} type="color" value={color} onChange={(e) => setColor(e.target.value)} />
      </FormField>
    </FormDialog>
  );
};

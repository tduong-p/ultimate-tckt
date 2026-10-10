import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiErrorMessage, createTeam, updateTeam, type TeamItem } from '../../api';
import { useCapabilities } from '../../capabilities';
import { useToast } from '../../../shared/components/Toast';
import { Field } from '../../../ui';
import { PeopleFormDialog } from '../people/peopleKit';
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
  <>{isOpen && <TeamFormDialog team={team ?? null} onClose={onClose} />}</>
);

const TeamFormDialog: React.FC<{ team: TeamItem | null; onClose: () => void }> = ({ team, onClose }) => {
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
    <PeopleFormDialog
      title={isEdit ? `Sửa Tổ ${team.name}` : 'Tạo Tổ'}
      submitLabel={isEdit ? 'Lưu' : 'Tạo'}
      submitting={mutation.isPending}
      error={error}
      onSubmit={submit}
      onClose={onClose}
    >
      {canEditText && (
        <>
          <Field label="Tên Tổ">
            <input value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="Mô tả">
            <textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
          </Field>
        </>
      )}
      <Field label="Màu của Tổ">
        <input type="color" value={color} onChange={(e) => setColor(e.target.value)} />
      </Field>
    </PeopleFormDialog>
  );
};

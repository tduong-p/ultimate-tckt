import React, { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiErrorMessage, fetchMembers, fetchWeightPresets, logTask, type BoardTeam } from '../../api';
import { useToast } from '../../../shared/components/Toast';
import { LinkField } from '../../../shared/components/LinkField';
import { isHttpUrl } from '../../../shared/utils/url';
import { useInvalidateTaskCaches } from './useTaskCaches';
import { useCurrentUserId } from './taskPermissions';
import { TaskFormDialog } from './TaskFormDialog';
import { AreaField, ErrorText, SelectField, TextField } from './formFields';

export interface SelfLogModalProps {
  isOpen: boolean;
  activityId: number;
  activityTeams: BoardTeam[];
  onClose: () => void;
}

/** Tự ghi nhận việc đã làm (chỉ hoạt động approved/active). Trọng số là số nguyên 0–10 theo server. */
export const SelfLogModal: React.FC<SelfLogModalProps> = ({ isOpen, activityId, activityTeams, onClose }) => {
  const toast = useToast();
  const invalidate = useInvalidateTaskCaches();
  const userId = useCurrentUserId();
  const [title, setTitle] = useState('');
  const [teamId, setTeamId] = useState('');
  const [weight, setWeight] = useState('1');
  const [link, setLink] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');

  const presetsQuery = useQuery({ queryKey: ['core-weight-presets'], queryFn: fetchWeightPresets, enabled: isOpen });
  const membersQuery = useQuery({ queryKey: ['core-members'], queryFn: fetchMembers, enabled: isOpen });
  const presets = presetsQuery.data ?? [];

  useEffect(() => {
    if (isOpen) {
      setTitle('');
      setTeamId('');
      setWeight('1');
      setLink('');
      setDescription('');
      setError('');
    }
  }, [isOpen]);

  // Chọn sẵn Tổ của người dùng (nếu thuộc đúng một Tổ của hoạt động), hoặc Tổ duy nhất.
  useEffect(() => {
    if (!isOpen || teamId) return;
    if (activityTeams.length === 1) {
      setTeamId(String(activityTeams[0].team_id));
      return;
    }
    const me = (membersQuery.data ?? []).find((m) => m.id === userId);
    const mine = String(me?.team_ids ?? '')
      .split(',')
      .map(Number)
      .filter((id) => activityTeams.some((t) => t.team_id === id));
    if (mine.length === 1) setTeamId(String(mine[0]));
  }, [isOpen, teamId, activityTeams, membersQuery.data, userId]);

  const mutation = useMutation({
    mutationFn: () =>
      logTask(activityId, {
        title: title.trim(),
        team_id: Number(teamId),
        weight: Number(weight),
        link_url: link.trim() || undefined,
        description: description.trim() || undefined,
      }),
    onSuccess: async () => {
      toast.success('Đã ghi nhận công việc thành công. Đang chờ nghiệm thu.');
      await invalidate();
      onClose();
    },
    onError: (err) => setError(apiErrorMessage(err, 'Không ghi nhận được công việc.')),
  });

  const choosePreset = (value: string) => {
    const preset = presets.find((p) => String(p.id) === value);
    if (!preset) return;
    setWeight(String(preset.points));
    if (!title.trim()) setTitle(preset.name);
  };

  const submit = () => {
    const w = Number(weight);
    if (!title.trim()) {
      setError('Vui lòng nhập tên công việc.');
      return;
    }
    if (!teamId) {
      setError('Vui lòng chọn Tổ phụ trách.');
      return;
    }
    if (weight.trim() === '' || !Number.isInteger(w) || w < 0 || w > 10) {
      setError('Trọng số phải là số nguyên từ 0 đến 10.');
      return;
    }
    if (link.trim() && !isHttpUrl(link)) {
      setError('Liên kết minh chứng phải bắt đầu bằng http:// hoặc https://.');
      return;
    }
    setError('');
    mutation.mutate();
  };

  return (
    <TaskFormDialog
      isOpen={isOpen}
      title="Tự ghi nhận việc"
      submitLabel="Ghi nhận"
      submitting={mutation.isPending}
      onSubmit={submit}
      onClose={onClose}
    >
      <TextField label="Tên công việc" required value={title} onChange={setTitle} />
      <SelectField
        label="Tổ phụ trách"
        required
        value={teamId}
        onChange={setTeamId}
        placeholder="Chọn Tổ"
        options={activityTeams.map((t) => ({ value: String(t.team_id), label: t.name }))}
      />
      {presets.length > 0 && (
        <SelectField
          label="Mẫu trọng số"
          value=""
          onChange={choosePreset}
          placeholder="Chọn mẫu (không bắt buộc)"
          options={presets.map((p) => ({ value: String(p.id), label: `${p.name} (${p.points} điểm)` }))}
        />
      )}
      <TextField label="Trọng số (0–10)" type="number" min={0} max={10} step={1} value={weight} onChange={setWeight} />
      <LinkField label="Liên kết minh chứng" value={link} onChange={(v) => { setLink(v); setError(''); }} />
      <AreaField label="Mô tả" value={description} onChange={setDescription} />
      <ErrorText>{error}</ErrorText>
    </TaskFormDialog>
  );
};

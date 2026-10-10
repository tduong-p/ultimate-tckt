import React, { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Button, Dialog, Field, Select } from '../../../ui';
import { apiErrorMessage, createTask, fetchTeamMembers, type BoardTeam } from '../../api';
import { useCapabilities } from '../../capabilities';
import { useToast } from '../../../shared/components/Toast';
import { PeoplePicker } from '../../../shared/components/PeoplePicker';
import { useInvalidateTaskCaches } from './useTaskCaches';
import { PRIORITY_OPTIONS, STAGE_OPTIONS } from './taskLabels';
import './tasks.css';

export interface CreateTaskModalProps {
  isOpen: boolean;
  activityId: number;
  /** `event` có giai đoạn trước/trong/sau; `assigned` luôn là "Chung". */
  activityType?: string;
  activityTeams: BoardTeam[];
  onClose: () => void;
  onCreated?: (taskId: number) => void;
}

/** Giao việc (`POST /api/activities/:id/tasks`). Admin thấy mọi Tổ của hoạt động, người khác chỉ Tổ mình quản lý. */
export const CreateTaskModal: React.FC<CreateTaskModalProps> = ({
  isOpen,
  activityId,
  activityType,
  activityTeams,
  onClose,
  onCreated,
}) => {
  const caps = useCapabilities();
  const toast = useToast();
  const invalidate = useInvalidateTaskCaches();

  const [title, setTitle] = useState('');
  const [stage, setStage] = useState('before');
  const [teamId, setTeamId] = useState('');
  const [primaryId, setPrimaryId] = useState('');
  const [coIds, setCoIds] = useState<number[]>([]);
  const [startDate, setStartDate] = useState('');
  const [deadline, setDeadline] = useState('');
  const [priority, setPriority] = useState('medium');
  const [deliverable, setDeliverable] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');

  const teamOptions = useMemo(
    () =>
      activityTeams
        .filter((t) => caps.isExec || caps.canManageTeam(t.team_id))
        .map((t) => ({ value: String(t.team_id), label: t.name })),
    [activityTeams, caps]
  );
  const showStage = activityType === 'event';

  useEffect(() => {
    if (!isOpen) return;
    setTitle('');
    setStage('before');
    setPrimaryId('');
    setCoIds([]);
    setStartDate('');
    setDeadline('');
    setPriority('medium');
    setDeliverable('');
    setDescription('');
    setError('');
    setTeamId(teamOptions.length === 1 ? teamOptions[0].value : '');
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  // Dữ liệu gắn với key theo Tổ: kết quả về muộn của lần đổi Tổ trước nằm ở key cũ, không bao giờ hiện.
  const teamNumber = Number(teamId) || 0;
  const membersQuery = useQuery({
    queryKey: ['core-team-members', teamNumber],
    queryFn: () => fetchTeamMembers(teamNumber),
    enabled: isOpen && teamNumber > 0,
  });
  const members = teamNumber > 0 ? membersQuery.data?.members ?? [] : [];

  const changeTeam = (value: string) => {
    setTeamId(value);
    setPrimaryId('');
    setCoIds([]);
  };

  const changePrimary = (value: string) => {
    setPrimaryId(value);
    setCoIds((ids) => ids.filter((id) => id !== Number(value)));
  };

  const mutation = useMutation({
    mutationFn: () =>
      createTask(activityId, {
        title: title.trim(),
        description: description.trim(),
        stage: showStage ? stage : 'general',
        priority,
        team_id: teamNumber,
        start_date: startDate || null,
        deadline,
        deliverable: deliverable.trim(),
        primary_assignee_id: Number(primaryId),
        co_assignee_ids: coIds.filter((id) => id !== Number(primaryId)),
      }),
    onSuccess: async (created) => {
      toast.success('Đã giao việc');
      await invalidate();
      onCreated?.(created.id);
      onClose();
    },
    onError: (err) => setError(apiErrorMessage(err, 'Không giao được việc. Vui lòng kiểm tra lại thông tin.')),
  });

  const submit = () => {
    if (!title.trim()) {
      setError('Vui lòng nhập tiêu đề.');
      return;
    }
    if (!teamNumber) {
      setError('Vui lòng chọn Tổ phụ trách.');
      return;
    }
    if (!primaryId) {
      setError('Vui lòng chọn người phụ trách chính.');
      return;
    }
    if (!deadline) {
      setError('Vui lòng chọn hạn chót.');
      return;
    }
    if (startDate && startDate > deadline) {
      setError('Ngày bắt đầu phải trước hoặc bằng hạn chót.');
      return;
    }
    setError('');
    mutation.mutate();
  };

  const withPlaceholder = (placeholder: string, options: { value: string; label: string }[]) => [
    { value: '', label: placeholder },
    ...options,
  ];

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title="Giao việc"
      footer={(
        <>
          <Button onClick={onClose}>Huỷ</Button>
          {teamOptions.length > 0 && (
            <Button variant="primary" disabled={mutation.isPending} onClick={submit}>
              Giao việc
            </Button>
          )}
        </>
      )}
    >
      {teamOptions.length === 0 ? (
        <p role="alert">Bạn không quản lý Tổ nào của hoạt động này nên chưa giao việc được.</p>
      ) : (
        <div className="tk-form">
          <Field label="Tiêu đề *">
            <input className="tk-input tk-input--full" value={title} onChange={(e) => setTitle(e.target.value)} />
          </Field>
          {showStage && (
            <Field label="Giai đoạn">
              <Select value={stage} onChange={setStage} options={STAGE_OPTIONS} />
            </Field>
          )}
          <Field label="Tổ phụ trách *">
            <Select value={teamId} onChange={changeTeam} options={withPlaceholder('Chọn Tổ', teamOptions)} />
          </Field>
          {membersQuery.isError && (
            <p role="alert" className="tk-form-error">
              {apiErrorMessage(membersQuery.error, 'Không tải được thành viên của Tổ.')}
            </p>
          )}
          <Field label="Người phụ trách chính *">
            <Select
              value={primaryId}
              onChange={changePrimary}
              options={withPlaceholder('Chọn người', members.map((m) => ({ value: String(m.id), label: m.name })))}
              disabled={teamNumber === 0}
            />
          </Field>
          <PeoplePicker
            label="Đồng phụ trách"
            people={members}
            value={coIds}
            onChange={setCoIds}
            excludeIds={primaryId ? [Number(primaryId)] : []}
          />
          <Field label="Ngày bắt đầu">
            <input className="tk-input tk-input--full" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </Field>
          <Field label="Hạn chót *">
            <input className="tk-input tk-input--full" type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
          </Field>
          <Field label="Mức ưu tiên">
            <Select value={priority} onChange={setPriority} options={PRIORITY_OPTIONS} />
          </Field>
          <Field label="Sản phẩm cần nộp">
            <textarea className="tk-input tk-input--area" rows={2} value={deliverable} onChange={(e) => setDeliverable(e.target.value)} />
          </Field>
          <Field label="Mô tả">
            <textarea className="tk-input tk-input--area" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
          </Field>
        </div>
      )}
      {error && <p role="alert" className="tk-form-error">{error}</p>}
    </Dialog>
  );
};

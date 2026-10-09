import React, { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import Modal, { ModalBody, ModalFooter, ModalHeader, ModalTitle, ModalTransition } from '@atlaskit/modal-dialog';
import Button from '@atlaskit/button/new';
import { apiErrorMessage, createTask, fetchTeamMembers, type BoardTeam } from '../../api';
import { useCapabilities } from '../../capabilities';
import { useToast } from '../../../shared/components/Toast';
import { PeoplePicker } from '../../../shared/components/PeoplePicker';
import { useInvalidateTaskCaches } from './useTaskCaches';
import { AreaField, ErrorText, PRIORITY_OPTIONS, SelectField, STAGE_OPTIONS, TextField } from './formFields';

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

  return (
    <ModalTransition>
      {isOpen && (
        <Modal onClose={onClose} width="medium" shouldScrollInViewport>
          <ModalHeader>
            <ModalTitle>Giao việc</ModalTitle>
          </ModalHeader>
          <ModalBody>
            {teamOptions.length === 0 ? (
              <p role="alert">Bạn không quản lý Tổ nào của hoạt động này nên chưa giao việc được.</p>
            ) : (
              <>
                <TextField label="Tiêu đề" required value={title} onChange={setTitle} />
                {showStage && <SelectField label="Giai đoạn" value={stage} onChange={setStage} options={STAGE_OPTIONS} />}
                <SelectField
                  label="Tổ phụ trách"
                  required
                  value={teamId}
                  onChange={changeTeam}
                  options={teamOptions}
                  placeholder="Chọn Tổ"
                />
                {membersQuery.isError && (
                  <ErrorText>{apiErrorMessage(membersQuery.error, 'Không tải được thành viên của Tổ.')}</ErrorText>
                )}
                <SelectField
                  label="Người phụ trách chính"
                  required
                  value={primaryId}
                  onChange={changePrimary}
                  options={members.map((m) => ({ value: String(m.id), label: m.name }))}
                  placeholder="Chọn người"
                  disabled={teamNumber === 0}
                />
                <PeoplePicker
                  label="Đồng phụ trách"
                  people={members}
                  value={coIds}
                  onChange={setCoIds}
                  excludeIds={primaryId ? [Number(primaryId)] : []}
                />
                <TextField label="Ngày bắt đầu" type="date" value={startDate} onChange={setStartDate} />
                <TextField label="Hạn chót" type="date" required value={deadline} onChange={setDeadline} />
                <SelectField label="Mức ưu tiên" value={priority} onChange={setPriority} options={PRIORITY_OPTIONS} />
                <AreaField label="Sản phẩm cần nộp" value={deliverable} onChange={setDeliverable} rows={2} />
                <AreaField label="Mô tả" value={description} onChange={setDescription} />
              </>
            )}
            <ErrorText>{error}</ErrorText>
          </ModalBody>
          <ModalFooter>
            <Button appearance="subtle" onClick={onClose}>
              Huỷ
            </Button>
            {teamOptions.length > 0 && (
              <Button appearance="primary" isLoading={mutation.isPending} onClick={submit}>
                Giao việc
              </Button>
            )}
          </ModalFooter>
        </Modal>
      )}
    </ModalTransition>
  );
};

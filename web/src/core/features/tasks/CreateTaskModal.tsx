import React, { useEffect, useMemo, useState } from 'react';
import Modal, { ModalBody, ModalFooter, ModalHeader, ModalTitle, ModalTransition } from '@atlaskit/modal-dialog';
import Button from '@atlaskit/button/new';
import Textfield from '@atlaskit/textfield';
import TextArea from '@atlaskit/textarea';
import { createActivityTask, type ActivityDetail, type CreateTaskPayload } from '../../api';
import { PeoplePicker } from '../../../shared/components/PeoplePicker';
import { toVnDateKey } from '../../../shared/utils/date';
import { DateInput, ErrorText, FieldRow, NativeSelect } from '../activities/formBits';
import { useActivityMutation } from '../activities/useActivityMutation';
import { STAGE_LABELS } from '../activities/planStages';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  detail: ActivityDetail;
}

type Stage = NonNullable<CreateTaskPayload['stage']>;
type Priority = NonNullable<CreateTaskPayload['priority']>;

const PRIORITY_OPTIONS: { value: Priority; label: string }[] = [
  { value: 'medium', label: 'Trung bình' },
  { value: 'high', label: 'Cao' },
  { value: 'urgent', label: 'Khẩn cấp' },
  { value: 'low', label: 'Thấp' },
];

const EVENT_STAGE_OPTIONS: { value: Stage; label: string }[] = [
  { value: 'before', label: 'Trước sự kiện' },
  { value: 'during', label: 'Trong sự kiện' },
  { value: 'after', label: 'Sau sự kiện' },
];

export const CreateTaskModal: React.FC<Props> = ({ isOpen, onClose, detail }) => {
  const { activity, activityTeams } = detail;
  const isEvent = activity.type !== 'assigned';
  const defaultTeam = String((activityTeams.find((t) => t.role === 'primary') ?? activityTeams[0])?.team_id ?? '');
  const defaultStage: Stage = isEvent ? 'before' : 'general';

  const [title, setTitle] = useState('');
  const [teamId, setTeamId] = useState(defaultTeam);
  const [primary, setPrimary] = useState('');
  const [coAssignees, setCoAssignees] = useState<number[]>([]);
  const [stage, setStage] = useState<Stage>(defaultStage);
  const [priority, setPriority] = useState<Priority>('medium');
  const [startDate, setStartDate] = useState('');
  const [deadline, setDeadline] = useState('');
  const [deliverable, setDeliverable] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');

  // Chỉ đặt lại form khi mở modal; dữ liệu tải lại nền không được ghi đè phần đang nhập.
  useEffect(() => {
    if (isOpen) {
      setTitle('');
      setTeamId(defaultTeam);
      setPrimary('');
      setCoAssignees([]);
      setStage(defaultStage);
      setPriority('medium');
      setStartDate('');
      setDeadline(activity.deadline ? toVnDateKey(activity.deadline) : '');
      setDeliverable('');
      setDescription('');
      setError('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const members = useMemo(() => {
    const id = Number(teamId);
    return detail.people.filter((p) => p.team_ids.includes(id)).map((p) => ({ id: p.id, name: p.name }));
  }, [detail.people, teamId]);

  const create = useActivityMutation(activity.id, (payload: CreateTaskPayload) => createActivityTask(activity.id, payload), {
    message: 'Đã tạo nhiệm vụ.',
    onDone: onClose,
  });

  const changeTeam = (value: string) => {
    setTeamId(value);
    setPrimary('');
    setCoAssignees([]);
  };

  const submit = () => {
    const trimmed = title.trim();
    if (!trimmed) return setError('Vui lòng nhập tiêu đề nhiệm vụ.');
    if (!teamId) return setError('Vui lòng chọn Tổ phụ trách.');
    if (!primary) return setError('Vui lòng chọn người phụ trách chính.');
    if (!deadline) return setError('Vui lòng chọn hạn chót.');
    if (startDate && startDate > deadline) return setError('Ngày bắt đầu không được sau hạn chót.');
    setError('');
    create.mutate({
      title: trimmed,
      description: description.trim() || null,
      stage,
      priority,
      team_id: Number(teamId),
      primary_assignee_id: Number(primary),
      co_assignee_ids: coAssignees.filter((id) => id !== Number(primary)),
      start_date: startDate || null,
      deadline,
      deliverable: deliverable.trim() || null,
    });
  };

  const stageOptions = isEvent ? EVENT_STAGE_OPTIONS : [{ value: 'general' as Stage, label: STAGE_LABELS.general }];

  return (
    <ModalTransition>
      {isOpen && (
        <Modal onClose={onClose} width="large">
          <ModalHeader>
            <ModalTitle>Tạo nhiệm vụ</ModalTitle>
          </ModalHeader>
          <ModalBody>
            <FieldRow label="Tiêu đề *" htmlFor="create-task-title">
              <Textfield id="create-task-title" value={title} onChange={(e) => setTitle((e.target as HTMLInputElement).value)} />
            </FieldRow>
            <FieldRow label="Tổ phụ trách *" htmlFor="create-task-team">
              <NativeSelect
                id="create-task-team"
                value={teamId}
                options={activityTeams.map((t) => ({ value: String(t.team_id), label: t.name }))}
                onChange={changeTeam}
              />
            </FieldRow>
            <FieldRow label="Người phụ trách chính *" htmlFor="create-task-primary">
              <NativeSelect
                id="create-task-primary"
                value={primary}
                options={[{ value: '', label: members.length ? 'Chọn người phụ trách' : 'Tổ chưa có thành viên' }, ...members.map((m) => ({ value: String(m.id), label: m.name }))]}
                onChange={setPrimary}
              />
            </FieldRow>
            <PeoplePicker label="Người cùng phụ trách" people={members} value={coAssignees} onChange={setCoAssignees} excludeIds={primary ? [Number(primary)] : []} />
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 12 }}>
              <div style={{ flex: '1 1 180px' }}>
                <FieldRow label="Giai đoạn" htmlFor="create-task-stage">
                  <NativeSelect id="create-task-stage" value={stage} options={stageOptions} onChange={(v) => setStage(v as Stage)} />
                </FieldRow>
              </div>
              <div style={{ flex: '1 1 180px' }}>
                <FieldRow label="Mức ưu tiên" htmlFor="create-task-priority">
                  <NativeSelect id="create-task-priority" value={priority} options={PRIORITY_OPTIONS} onChange={(v) => setPriority(v as Priority)} />
                </FieldRow>
              </div>
              <div style={{ flex: '1 1 180px' }}>
                <FieldRow label="Ngày bắt đầu" htmlFor="create-task-start">
                  <DateInput id="create-task-start" value={startDate} onChange={setStartDate} />
                </FieldRow>
              </div>
              <div style={{ flex: '1 1 180px' }}>
                <FieldRow label="Hạn chót *" htmlFor="create-task-deadline">
                  <DateInput id="create-task-deadline" value={deadline} onChange={setDeadline} />
                </FieldRow>
              </div>
            </div>
            <FieldRow label="Sản phẩm bàn giao" htmlFor="create-task-deliverable">
              <Textfield id="create-task-deliverable" value={deliverable} onChange={(e) => setDeliverable((e.target as HTMLInputElement).value)} />
            </FieldRow>
            <FieldRow label="Mô tả" htmlFor="create-task-description">
              <TextArea id="create-task-description" minimumRows={3} value={description} onChange={(e) => setDescription((e.target as HTMLTextAreaElement).value)} />
            </FieldRow>
            {error && <ErrorText>{error}</ErrorText>}
          </ModalBody>
          <ModalFooter>
            <Button appearance="subtle" onClick={onClose}>
              Huỷ
            </Button>
            <Button appearance="primary" isLoading={create.isPending} onClick={submit}>
              Tạo nhiệm vụ
            </Button>
          </ModalFooter>
        </Modal>
      )}
    </ModalTransition>
  );
};

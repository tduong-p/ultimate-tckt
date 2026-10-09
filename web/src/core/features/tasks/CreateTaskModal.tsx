import React, { useState, useEffect, useMemo } from 'react';
import { token } from '@atlaskit/tokens';
import Button from '@atlaskit/button/new';
import Textfield from '@atlaskit/textfield';
import TextArea from '@atlaskit/textarea';
import Select from '@atlaskit/select';
import CrossIcon from '@atlaskit/icon/core/cross';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { ActivityItem, CreateTaskPayload } from '../../api';
import { fetchTeams, fetchMembers, fetchBootstrap, createActivityTask } from '../../api';
import { todayVnKey, toVnDateKey } from '../../../shared/utils/date';

export interface CreateTaskModalProps {
  activity: ActivityItem | null;
  isOpen: boolean;
  onClose: () => void;
  onTaskCreated?: (taskId: number) => void;
}

interface SelectOption<T = string | number> {
  label: string;
  value: T;
}

const STAGE_OPTIONS: SelectOption<'general' | 'before' | 'during' | 'after'>[] = [
  { label: 'Chung', value: 'general' },
  { label: 'Trước sự kiện', value: 'before' },
  { label: 'Trong sự kiện', value: 'during' },
  { label: 'Sau sự kiện', value: 'after' },
];

const PRIORITY_OPTIONS: SelectOption<'low' | 'medium' | 'high' | 'urgent'>[] = [
  { label: 'Trung bình', value: 'medium' },
  { label: 'Cao', value: 'high' },
  { label: 'Khẩn cấp', value: 'urgent' },
  { label: 'Thấp', value: 'low' },
];

export const CreateTaskModal: React.FC<CreateTaskModalProps> = ({
  activity,
  isOpen,
  onClose,
  onTaskCreated,
}) => {
  const queryClient = useQueryClient();

  const [title, setTitle] = useState('');
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);
  const [primaryAssigneeId, setPrimaryAssigneeId] = useState<number | null>(null);
  const [stage, setStage] = useState<'general' | 'before' | 'during' | 'after'>('general');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [startDate, setStartDate] = useState('');
  const [deadline, setDeadline] = useState('');
  const [deliverable, setDeliverable] = useState('');
  const [description, setDescription] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  const { data: teams = [] } = useQuery({
    queryKey: ['core-teams'],
    queryFn: fetchTeams,
    enabled: isOpen,
  });

  const { data: members = [] } = useQuery({
    queryKey: ['core-members'],
    queryFn: fetchMembers,
    enabled: isOpen,
  });

  const { data: bootstrap } = useQuery({
    queryKey: ['core-bootstrap'],
    queryFn: fetchBootstrap,
    enabled: isOpen,
  });

  // Filter available teams: executive sees all, others see teams they can manage
  const isExecutive = Boolean(bootstrap?.capabilities?.canCreateAccount);
  const availableTeams = useMemo(() => {
    return teams.filter((t) => isExecutive || Boolean(t.can_manage) || (activity && t.id === activity.team_id));
  }, [teams, isExecutive, activity]);

  // Initialize or reset form state when modal opens or activity changes
  const isInitializedRef = React.useRef(false);

  useEffect(() => {
    if (isOpen && activity && !isInitializedRef.current) {
      setTitle('');
      setDeliverable('');
      setDescription('');
      setValidationError(null);
      setStage('general');
      setPriority('medium');
      setStartDate(activity.start_date ? toVnDateKey(activity.start_date) : '');
      setDeadline(activity.deadline ? toVnDateKey(activity.deadline) : todayVnKey());

      const initialTeamId = activity.team_id || (teams[0] ? teams[0].id : null);
      setSelectedTeamId(initialTeamId);
      isInitializedRef.current = true;
    } else if (!isOpen) {
      isInitializedRef.current = false;
    }
  }, [isOpen, activity, teams]);

  useEffect(() => {
    if (isOpen && selectedTeamId === null && availableTeams.length > 0) {
      setSelectedTeamId(activity?.team_id || availableTeams[0].id);
    }
  }, [isOpen, selectedTeamId, availableTeams, activity]);

  // Members belonging to the selected team
  const teamMembers = useMemo(() => {
    if (!selectedTeamId) return [];
    return members.filter((m) => {
      const ids = String(m.team_ids || '')
        .split(',')
        .map((x) => Number(x.trim()))
        .filter(Boolean);
      return ids.includes(selectedTeamId);
    });
  }, [members, selectedTeamId]);

  // Auto-select primary assignee when team members change
  useEffect(() => {
    if (teamMembers.length > 0) {
      setPrimaryAssigneeId((prev) => {
        if (!prev || !teamMembers.some((m) => m.id === prev)) {
          return teamMembers[0].id;
        }
        return prev;
      });
    } else {
      setPrimaryAssigneeId(null);
    }
  }, [teamMembers]);

  const createMutation = useMutation({
    mutationFn: (payload: CreateTaskPayload) => {
      if (!activity) throw new Error('Không tìm thấy hoạt động.');
      return createActivityTask(activity.id, payload);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['core-activities'] });
      queryClient.invalidateQueries({ queryKey: ['core-my-tasks-today'] });
      queryClient.invalidateQueries({ queryKey: ['core-bootstrap'] });
      onTaskCreated?.(data.id);
      onClose();
    },
  });

  if (!isOpen || !activity) return null;

  const teamSelectOptions: SelectOption<number>[] = availableTeams.map((t) => ({
    label: t.name,
    value: t.id,
  }));

  const assigneeSelectOptions: SelectOption<number>[] = teamMembers.map((m) => ({
    label: `${m.name}${m.role ? ` (${m.role})` : ''}`,
    value: m.id,
  }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setValidationError('Vui lòng nhập tiêu đề nhiệm vụ.');
      return;
    }

    if (!selectedTeamId) {
      setValidationError('Vui lòng chọn tổ phụ trách.');
      return;
    }

    if (!primaryAssigneeId) {
      setValidationError('Vui lòng chọn người phụ trách chính.');
      return;
    }

    if (!deadline) {
      setValidationError('Vui lòng chọn hạn chót.');
      return;
    }

    if (startDate && startDate > deadline) {
      setValidationError('Ngày bắt đầu không được sau hạn chót.');
      return;
    }

    createMutation.mutate({
      title: trimmedTitle,
      team_id: selectedTeamId,
      primary_assignee_id: primaryAssigneeId,
      stage,
      priority,
      start_date: startDate || null,
      deadline,
      deliverable: deliverable.trim() || null,
      description: description.trim() || null,
    });
  };

  const serverError = (createMutation.error as any)?.response?.data?.error || createMutation.error?.message;
  const activeError = validationError || serverError;

  return (
    <div
      data-testid="create-task-modal-overlay"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(9, 30, 66, 0.54)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1100,
        padding: '20px',
      }}
      onClick={onClose}
    >
      <div
        data-testid="create-task-modal"
        style={{
          backgroundColor: token('elevation.surface.overlay', '#FFFFFF'),
          borderRadius: '8px',
          boxShadow: token(
            'elevation.shadow.overlay',
            '0 8px 16px -4px rgba(9, 30, 66, 0.25), 0 0 0 1px rgba(9, 30, 66, 0.08)'
          ),
          width: '100%',
          maxWidth: '640px',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '90vh',
          animation: 'fadeIn 0.15s ease-out',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '20px 24px 16px 24px',
            borderBottom: `1px solid ${token('color.border', '#DFE1E6')}`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
          }}
        >
          <div>
            <h2
              style={{
                margin: 0,
                fontSize: '18px',
                fontWeight: 600,
                color: token('color.text', '#172B4D'),
              }}
            >
              Thêm nhiệm vụ mới
            </h2>
            <div
              style={{
                marginTop: '4px',
                fontSize: '13px',
                color: token('color.text.subtle', '#6B778C'),
              }}
            >
              Hoạt động: <strong>{activity.title}</strong>
            </div>
          </div>
          <button
            type="button"
            data-testid="create-task-modal-close-header"
            onClick={onClose}
            aria-label="Đóng"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '4px',
              color: token('color.icon.subtle', '#6B778C'),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <CrossIcon label="Đóng" />
          </button>
        </div>

        {/* Modal Body */}
        <form
          onSubmit={handleSubmit}
          style={{
            display: 'flex',
            flexDirection: 'column',
            overflowY: 'auto',
            flex: 1,
          }}
        >
          <div
            style={{
              padding: '20px 24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            {activeError && (
              <div
                style={{
                  padding: '10px 14px',
                  backgroundColor: token('color.background.danger', '#FFEBE6'),
                  border: `1px solid ${token('color.border.danger', '#FFBDAD')}`,
                  borderRadius: '4px',
                  color: token('color.text.danger', '#BF2600'),
                  fontSize: '13px',
                }}
              >
                {activeError}
              </div>
            )}

            {/* Title field */}
            <div>
              <label
                htmlFor="task-title"
                style={{
                  display: 'block',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: token('color.text.subtle', '#6B778C'),
                  marginBottom: '4px',
                }}
              >
                Tiêu đề nhiệm vụ *
              </label>
              <Textfield
                id="task-title"
                name="title"
                value={title}
                onChange={(e) => setTitle((e.target as HTMLInputElement).value)}
                placeholder="Nhập tên nhiệm vụ cần thực hiện..."
                autoFocus
              />
            </div>

            {/* Team and Assignee row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label
                  htmlFor="task-team"
                  style={{
                    display: 'block',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: token('color.text.subtle', '#6B778C'),
                    marginBottom: '4px',
                  }}
                >
                  Tổ phụ trách *
                </label>
                <Select
                  inputId="task-team"
                  options={teamSelectOptions}
                  value={teamSelectOptions.find((t) => t.value === selectedTeamId) || null}
                  onChange={(opt) => setSelectedTeamId((opt as any)?.value || null)}
                  placeholder="Chọn tổ..."
                />
              </div>

              <div>
                <label
                  htmlFor="task-primary-assignee"
                  style={{
                    display: 'block',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: token('color.text.subtle', '#6B778C'),
                    marginBottom: '4px',
                  }}
                >
                  Người phụ trách chính *
                </label>
                <Select
                  inputId="task-primary-assignee"
                  options={assigneeSelectOptions}
                  value={assigneeSelectOptions.find((a) => a.value === primaryAssigneeId) || null}
                  onChange={(opt) => setPrimaryAssigneeId((opt as any)?.value || null)}
                  placeholder={teamMembers.length ? 'Chọn người phụ trách...' : 'Tổ chưa có thành viên'}
                  isDisabled={!teamMembers.length}
                />
              </div>
            </div>

            {/* Stage and Priority row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label
                  htmlFor="task-stage"
                  style={{
                    display: 'block',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: token('color.text.subtle', '#6B778C'),
                    marginBottom: '4px',
                  }}
                >
                  Giai đoạn
                </label>
                <Select
                  inputId="task-stage"
                  options={STAGE_OPTIONS}
                  value={STAGE_OPTIONS.find((s) => s.value === stage)}
                  onChange={(opt) => setStage((opt as any)?.value || 'general')}
                />
              </div>

              <div>
                <label
                  htmlFor="task-priority"
                  style={{
                    display: 'block',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: token('color.text.subtle', '#6B778C'),
                    marginBottom: '4px',
                  }}
                >
                  Độ ưu tiên
                </label>
                <Select
                  inputId="task-priority"
                  options={PRIORITY_OPTIONS}
                  value={PRIORITY_OPTIONS.find((p) => p.value === priority)}
                  onChange={(opt) => setPriority((opt as any)?.value || 'medium')}
                />
              </div>
            </div>

            {/* Dates row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label
                  htmlFor="task-start-date"
                  style={{
                    display: 'block',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: token('color.text.subtle', '#6B778C'),
                    marginBottom: '4px',
                  }}
                >
                  Ngày bắt đầu
                </label>
                <Textfield
                  id="task-start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate((e.target as HTMLInputElement).value)}
                />
              </div>

              <div>
                <label
                  htmlFor="task-deadline"
                  style={{
                    display: 'block',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: token('color.text.subtle', '#6B778C'),
                    marginBottom: '4px',
                  }}
                >
                  Hạn chót *
                </label>
                <Textfield
                  id="task-deadline"
                  type="date"
                  value={deadline}
                  onChange={(e) => setDeadline((e.target as HTMLInputElement).value)}
                />
              </div>
            </div>

            {/* Deliverable */}
            <div>
              <label
                htmlFor="task-deliverable"
                style={{
                  display: 'block',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: token('color.text.subtle', '#6B778C'),
                  marginBottom: '4px',
                }}
              >
                Sản phẩm bàn giao
              </label>
              <Textfield
                id="task-deliverable"
                value={deliverable}
                onChange={(e) => setDeliverable((e.target as HTMLInputElement).value)}
                placeholder="VD: Danh sách phê duyệt, File thiết kế banner, Biên bản nghiệm thu..."
              />
            </div>

            {/* Description */}
            <div>
              <label
                htmlFor="task-description"
                style={{
                  display: 'block',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: token('color.text.subtle', '#6B778C'),
                  marginBottom: '4px',
                }}
              >
                Mô tả chi tiết
              </label>
              <TextArea
                id="task-description"
                value={description}
                onChange={(e) => setDescription((e.target as HTMLTextAreaElement).value)}
                placeholder="Mô tả cụ thể yêu cầu công việc..."
                minimumRows={3}
              />
            </div>
          </div>

          {/* Modal Footer */}
          <div
            style={{
              padding: '16px 24px',
              borderTop: `1px solid ${token('color.border', '#DFE1E6')}`,
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '12px',
            }}
          >
            <Button appearance="subtle" onClick={onClose}>
              Hủy
            </Button>
            <Button
              appearance="primary"
              type="submit"
              isLoading={createMutation.isPending}
            >
              Tạo nhiệm vụ
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

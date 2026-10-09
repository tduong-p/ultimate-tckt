import React, { useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import Button from '@atlaskit/button/new';
import Lozenge from '@atlaskit/lozenge';
import { token } from '@atlaskit/tokens';
import { apiErrorMessage, fetchActivityBoard, updateTaskStatus, type TaskItem, type TaskTransitionStatus } from '../../api';
import { activityBoardKey } from '../../queryKeys';
import { useCapabilities } from '../../capabilities';
import { useToast } from '../../../shared/components/Toast';
import { formatVnDate, todayVnKey, toVnDateKey } from '../../../shared/utils/date';
import { getTaskPriorityAppearance, getTaskPriorityLabel } from './taskLabels';
import {
  canMoveTask,
  canReviewTask,
  canSubmitForReview,
  isAssignedTo,
  normalizeTaskStatus,
  useCurrentUserId,
} from './taskPermissions';
import { useInvalidateTaskCaches } from './useTaskCaches';
import { useTaskModal } from './TaskModalProvider';
import { SubmitReviewDialog } from './SubmitReviewDialog';
import { ReviewButtons } from './ReviewButtons';
import { ReviewDialog } from './ReviewDialog';
import { SelfLogModal } from './SelfLogModal';

const COLUMNS = [
  { status: 'todo', label: 'Cần làm' },
  { status: 'in_progress', label: 'Đang làm' },
  { status: 'review', label: 'Chờ duyệt' },
  { status: 'done', label: 'Hoàn thành' },
] as const;
type ColumnStatus = (typeof COLUMNS)[number]['status'];

/** Kéo-thả chỉ bật khi thiết bị có con trỏ chính xác; thiết bị cảm ứng dùng nút trên thẻ. */
function supportsPointerDrag(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(pointer: fine)').matches === true;
}

export const KanbanBoard: React.FC = () => {
  const { id } = useParams();
  const activityId = Number(id);
  const caps = useCapabilities();
  const userId = useCurrentUserId();
  const toast = useToast();
  const invalidate = useInvalidateTaskCaches();
  const { open } = useTaskModal();

  const query = useQuery({
    queryKey: activityBoardKey(activityId),
    queryFn: () => fetchActivityBoard(activityId),
    enabled: Number.isInteger(activityId) && activityId > 0,
  });
  const [submitTask, setSubmitTask] = useState<TaskItem | null>(null);
  const [reviewTask, setReviewTask] = useState<TaskItem | null>(null);
  const [selfLogOpen, setSelfLogOpen] = useState(false);
  const [overColumn, setOverColumn] = useState<string | null>(null);
  const dragId = useRef<number | null>(null);
  const dnd = supportsPointerDrag();

  const moveMutation = useMutation({
    mutationFn: (v: { id: number; status: TaskTransitionStatus }) => updateTaskStatus(v.id, v.status),
    onSuccess: () => {
      toast.success('Đã cập nhật trạng thái');
      return invalidate();
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Không đổi được trạng thái.')),
  });

  const data = query.data;
  const activity = data?.activity;
  const tasks = (data?.tasks ?? []).filter((t) => t.status !== 'cancelled');
  const isEventLead = userId !== null && activity?.event_lead_id === userId;
  const today = todayVnKey();

  const reviewable = (task: TaskItem) =>
    canReviewTask(task, { isExec: caps.isExec, manages: caps.canManageTeam(task.team_id), isEventLead });

  const handleDrop = (target: ColumnStatus) => {
    const task = tasks.find((t) => t.id === dragId.current);
    dragId.current = null;
    setOverColumn(null);
    if (!task) return;
    const from = normalizeTaskStatus(task.status);
    if (from === target) return;
    if (target === 'review') {
      if (canSubmitForReview(task, userId)) setSubmitTask(task);
      else toast.error('Chỉ người được giao việc mới nộp nghiệm thu được, khi việc đang ở "Cần làm" hoặc "Đang làm".');
      return;
    }
    if (target === 'done') {
      if (from !== 'review') toast.error('Công việc cần được nộp nghiệm thu trước khi duyệt.');
      else if (reviewable(task)) setReviewTask(task);
      else toast.error('Bạn không có quyền duyệt công việc này.');
      return;
    }
    if (from !== 'todo' && from !== 'in_progress') {
      toast.error('Chỉ chuyển được giữa "Cần làm" và "Đang làm".');
      return;
    }
    if (!canMoveTask(task, { userId, manages: caps.canManageTeam(task.team_id) })) {
      toast.error('Bạn không thể cập nhật công việc này.');
      return;
    }
    moveMutation.mutate({ id: task.id, status: target });
  };

  const renderCard = (task: TaskItem) => {
    const status = normalizeTaskStatus(task.status);
    const manages = caps.canManageTeam(task.team_id);
    const overdue = status !== 'done' && Boolean(task.deadline) && toVnDateKey(task.deadline) < today;
    return (
      <article
        key={task.id}
        draggable={dnd}
        onDragStart={(e) => {
          dragId.current = task.id;
          e.dataTransfer?.setData('text/plain', String(task.id));
        }}
        onDragEnd={() => {
          dragId.current = null;
          setOverColumn(null);
        }}
        style={{
          background: token('elevation.surface.raised', '#FFFFFF'),
          border: `1px solid ${token('color.border', '#DFE1E6')}`,
          borderRadius: 4,
          padding: 12,
          marginBottom: 8,
          cursor: dnd ? 'grab' : 'default',
        }}
      >
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 6 }}>
          <Lozenge appearance={getTaskPriorityAppearance(task.priority)}>{getTaskPriorityLabel(task.priority)}</Lozenge>
          {Boolean(task.is_self_logged) && <Lozenge appearance="new">Tự ghi nhận</Lozenge>}
          {task.weight !== undefined && task.weight !== null && Boolean(task.is_self_logged) && (
            <Lozenge>{`${task.weight}đ`}</Lozenge>
          )}
          {overdue && <Lozenge appearance="removed">Quá hạn</Lozenge>}
        </div>
        <button
          type="button"
          onClick={() => open(task.id)}
          style={{
            border: 'none',
            background: 'none',
            padding: 0,
            cursor: 'pointer',
            font: 'inherit',
            fontWeight: 600,
            textAlign: 'left',
            color: token('color.text', '#172B4D'),
          }}
        >
          {task.title}
        </button>
        <div style={{ fontSize: 12, color: token('color.text.subtle', '#626F86'), marginTop: 4 }}>
          {task.primary_assignee_name || 'Chưa giao'}
        </div>
        <div style={{ fontSize: 12, color: token('color.text.subtle', '#626F86'), display: 'flex', justifyContent: 'space-between', gap: 8 }}>
          <span>{`${Number(task.checklist_done || 0)}/${Number(task.checklist_total || 0)} việc con`}</span>
          <span>{formatVnDate(task.deadline)}</span>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
          {status === 'todo' && (isAssignedTo(task, userId) || manages) && (
            <Button spacing="compact" onClick={() => moveMutation.mutate({ id: task.id, status: 'in_progress' })}>
              Bắt đầu làm
            </Button>
          )}
          {canSubmitForReview(task, userId) && (
            <Button spacing="compact" appearance="primary" onClick={() => setSubmitTask(task)}>
              Nộp nghiệm thu
            </Button>
          )}
          {reviewable(task) && <ReviewButtons taskId={task.id} taskTitle={task.title} />}
        </div>
      </article>
    );
  };

  if (!Number.isInteger(activityId) || activityId < 1) return <p>Không tìm thấy hoạt động.</p>;

  return (
    <div style={{ paddingTop: 4 }}>
      <Link to={`/activity/${activityId}`}>← Quay lại hoạt động</Link>
      {query.isLoading && <p>Đang tải bảng công việc...</p>}
      {query.isError && (
        <p role="alert" style={{ color: token('color.text.danger', '#AE2E24') }}>
          {apiErrorMessage(query.error, 'Không tải được bảng công việc.')}
        </p>
      )}
      {activity && data && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', margin: '12px 0' }}>
            <div>
              <h1 style={{ fontSize: 24, margin: 0 }}>{activity.title}</h1>
              <p style={{ margin: '4px 0 0', color: token('color.text.subtle', '#626F86') }}>
                Bảng Kanban{dnd ? ' · Kéo thẻ để đổi trạng thái' : ''}
              </p>
            </div>
            {(activity.status === 'approved' || activity.status === 'active') && (
              <Button appearance="primary" onClick={() => setSelfLogOpen(true)}>
                Tự ghi nhận việc
              </Button>
            )}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12, alignItems: 'start' }}>
            {COLUMNS.map((col) => {
              const items = tasks.filter((t) => normalizeTaskStatus(t.status) === col.status);
              return (
                <section
                  key={col.status}
                  aria-label={col.label}
                  onDragOver={(e) => {
                    if (dnd) {
                      e.preventDefault();
                      setOverColumn(col.status);
                    }
                  }}
                  onDragLeave={() => setOverColumn((c) => (c === col.status ? null : c))}
                  onDrop={(e) => {
                    if (dnd) {
                      e.preventDefault();
                      handleDrop(col.status);
                    }
                  }}
                  style={{
                    background:
                      overColumn === col.status
                        ? token('color.background.selected', '#E9F2FF')
                        : token('color.background.neutral', '#F1F2F4'),
                    borderRadius: 4,
                    padding: 8,
                    minHeight: 120,
                  }}
                >
                  <h2 style={{ fontSize: 13, margin: '0 0 8px' }}>
                    {col.label} ({items.length})
                  </h2>
                  {items.length === 0 ? (
                    <p style={{ color: token('color.text.subtle', '#626F86'), fontSize: 13, margin: 0 }}>Trống</p>
                  ) : (
                    items.map(renderCard)
                  )}
                </section>
              );
            })}
          </div>
          <SelfLogModal
            isOpen={selfLogOpen}
            activityId={activityId}
            activityTeams={data.activityTeams}
            onClose={() => setSelfLogOpen(false)}
          />
        </>
      )}
      {submitTask && (
        <SubmitReviewDialog
          isOpen
          taskId={submitTask.id}
          taskTitle={submitTask.title}
          onClose={() => setSubmitTask(null)}
        />
      )}
      {reviewTask && (
        <ReviewDialog
          isOpen
          taskId={reviewTask.id}
          taskTitle={reviewTask.title}
          initialDecision="approve"
          onClose={() => setReviewTask(null)}
        />
      )}
    </div>
  );
};

import React, { useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Avatar, Badge, Button, PriorityIcon, StatusIcon, type Priority } from '../../../ui';
import { apiErrorMessage, fetchActivityBoard, updateTaskStatus, type TaskItem, type TaskTransitionStatus } from '../../api';
import { activityBoardKey } from '../../queryKeys';
import { useCapabilities } from '../../capabilities';
import { useToast } from '../../../shared/components/Toast';
import { formatVnDate, todayVnKey, toVnDateKey } from '../../../shared/utils/date';
import { getTaskPriorityLabel } from './taskLabels';
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
import './kanban.css';

const COLUMNS = [
  { status: 'todo', label: 'Cần làm' },
  { status: 'in_progress', label: 'Đang làm' },
  { status: 'review', label: 'Chờ duyệt' },
  { status: 'done', label: 'Hoàn thành' },
] as const;
type ColumnStatus = (typeof COLUMNS)[number]['status'];

const priorityOf = (p: string): Priority => (p === 'low' || p === 'medium' || p === 'high' || p === 'urgent' ? p : 'none');

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
        className={dnd ? 'kb-card kb-card--drag' : 'kb-card'}
        draggable={dnd}
        onDragStart={(e) => {
          dragId.current = task.id;
          e.dataTransfer?.setData('text/plain', String(task.id));
        }}
        onDragEnd={() => {
          dragId.current = null;
          setOverColumn(null);
        }}
      >
        <div className="kb-badges">
          <span className="kb-priority">
            <PriorityIcon priority={priorityOf(task.priority)} />
            {getTaskPriorityLabel(task.priority)}
          </span>
          {Boolean(task.is_self_logged) && <Badge tone="info">Tự ghi nhận</Badge>}
          {task.weight !== undefined && task.weight !== null && Boolean(task.is_self_logged) && <Badge>{`${task.weight}đ`}</Badge>}
          {overdue && <Badge tone="danger">Quá hạn</Badge>}
        </div>
        <button type="button" className="kb-card-title" onClick={() => open(task.id)}>
          {task.title}
        </button>
        <div className="kb-meta">
          {task.primary_assignee_name ? (
            <>
              <Avatar name={task.primary_assignee_name} size={16} />
              {task.primary_assignee_name}
            </>
          ) : (
            'Chưa giao'
          )}
        </div>
        <div className="kb-meta kb-meta--row">
          <span>{`${Number(task.checklist_done || 0)}/${Number(task.checklist_total || 0)} việc con`}</span>
          <span>{formatVnDate(task.deadline)}</span>
        </div>
        <div className="kb-actions">
          {status === 'todo' && (isAssignedTo(task, userId) || manages) && (
            <Button size="sm" onClick={() => moveMutation.mutate({ id: task.id, status: 'in_progress' })}>
              Bắt đầu làm
            </Button>
          )}
          {canSubmitForReview(task, userId) && (
            <Button size="sm" variant="primary" onClick={() => setSubmitTask(task)}>
              Nộp nghiệm thu
            </Button>
          )}
          {reviewable(task) && <ReviewButtons taskId={task.id} taskTitle={task.title} />}
        </div>
      </article>
    );
  };

  if (!Number.isInteger(activityId) || activityId < 1) return <p className="kb-state">Không tìm thấy hoạt động.</p>;

  return (
    <div className="kb">
      <Link to={`/activity/${activityId}`} className="kb-back">← Quay lại hoạt động</Link>
      {query.isLoading && <p className="kb-state">Đang tải bảng công việc...</p>}
      {query.isError && (
        <p role="alert" className="kb-state kb-state--error">
          {apiErrorMessage(query.error, 'Không tải được bảng công việc.')}
        </p>
      )}
      {activity && data && (
        <>
          <div className="kb-head">
            <div>
              <h1 className="kb-h1">{activity.title}</h1>
              <p className="kb-sub">Bảng Kanban{dnd ? ' · Kéo thẻ để đổi trạng thái' : ''}</p>
            </div>
            {(activity.status === 'approved' || activity.status === 'active') && (
              <Button variant="primary" onClick={() => setSelfLogOpen(true)}>
                Tự ghi nhận việc
              </Button>
            )}
          </div>
          <div className="kb-cols">
            {COLUMNS.map((col) => {
              const items = tasks.filter((t) => normalizeTaskStatus(t.status) === col.status);
              return (
                <section
                  key={col.status}
                  aria-label={col.label}
                  className={overColumn === col.status ? 'kb-col kb-col--over' : 'kb-col'}
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
                >
                  <h2 className="kb-col-title">
                    <StatusIcon status={col.status} size={12} />
                    {col.label} ({items.length})
                  </h2>
                  {items.length === 0 ? <p className="kb-empty">Trống</p> : items.map(renderCard)}
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

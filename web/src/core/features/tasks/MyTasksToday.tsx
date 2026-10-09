import React, { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { token } from '@atlaskit/tokens';
import Badge from '@atlaskit/badge';
import Button from '@atlaskit/button/new';
import Lozenge from '@atlaskit/lozenge';
import { LottieLoading } from '../../../shared/components/LottieLoading';
import InboxIcon from '@atlaskit/icon/core/inbox';
import { acknowledgeTask, apiErrorMessage, fetchMyTasksToday, TaskItem } from '../../api';
import { MY_TASKS_TODAY_KEY } from '../../queryKeys';
import { useToast } from '../../../shared/components/Toast';
import { formatVnDate } from '../../../shared/utils/date';
import { getTaskPriorityAppearance, getTaskPriorityLabel, getTaskStatusAppearance, getTaskStatusLabel } from './taskLabels';
import { isSubmittable } from './taskPermissions';
import { useInvalidateTaskCaches } from './useTaskCaches';
import { useTaskModal } from './TaskModalProvider';
import { TaskTitleButton } from './TaskRowControls';
import { SubmitReviewDialog } from './SubmitReviewDialog';
import { ReviewButtons } from './ReviewButtons';

interface RowProps {
  task: TaskItem;
  review: boolean;
  acked: boolean;
  ackPending: boolean;
  onAck: (id: number) => void;
  onSubmit: (task: TaskItem) => void;
}

const TaskCardItem: React.FC<RowProps> = ({ task, review, acked, ackPending, onAck, onSubmit }) => {
  const { open } = useTaskModal();
  return (
    <div
      style={{
        backgroundColor: token('elevation.surface', '#FFFFFF'),
        border: `1px solid ${token('color.border', '#DFE1E6')}`,
        borderRadius: '4px',
        padding: '12px 16px',
        marginBottom: '8px',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ fontSize: '14px', marginBottom: '4px' }}>
            <TaskTitleButton task={task} />
          </div>
          <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: token('color.text.subtle', '#6B778C'), flexWrap: 'wrap' }}>
            {task.activity_title && <span>Hoạt động: <Link to={`/activity/${task.activity_id}`}>{task.activity_title}</Link></span>}
            {task.team_name && <span>Tổ: {task.team_name}</span>}
            {task.deadline && <span>Hạn: {formatVnDate(task.deadline)}</span>}
            {task.assignee_name && <span>Phụ trách: {task.assignee_name}</span>}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          {task.priority && <Lozenge appearance={getTaskPriorityAppearance(task.priority)}>{getTaskPriorityLabel(task.priority)}</Lozenge>}
          <Lozenge appearance={getTaskStatusAppearance(task.status)}>{getTaskStatusLabel(task.status)}</Lozenge>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
        {review ? (
          <ReviewButtons taskId={task.id} taskTitle={task.title} />
        ) : (
          <>
            {!acked && <Button spacing="compact" isLoading={ackPending} onClick={() => onAck(task.id)}>Xác nhận</Button>}
            {isSubmittable(task.status) && <Button spacing="compact" appearance="primary" onClick={() => onSubmit(task)}>Nộp nghiệm thu</Button>}
          </>
        )}
        <Button spacing="compact" appearance="subtle" onClick={() => open(task.id)}>Xem chi tiết</Button>
      </div>
    </div>
  );
};

const TaskSection: React.FC<{
  title: string;
  count: number;
  badgeAppearance?: 'default' | 'primary' | 'important' | 'added' | 'removed';
  emptyMessage: string;
  tasks: TaskItem[];
  review?: boolean;
  acked: Set<number>;
  ackingId: number | null;
  onAck: (id: number) => void;
  onSubmit: (task: TaskItem) => void;
}> = ({ title, count, badgeAppearance = 'default', emptyMessage, tasks, review = false, acked, ackingId, onAck, onSubmit }) => (
  <div
    style={{
      backgroundColor: token('elevation.surface.raised', '#FFFFFF'),
      borderRadius: '8px',
      boxShadow: token('elevation.shadow.raised', '0 1px 1px rgba(9, 30, 66, 0.25), 0 0 1px rgba(9, 30, 66, 0.31)'),
      padding: '24px',
      marginBottom: '24px',
      border: `1px solid ${token('color.border', '#DFE1E6')}`,
    }}
  >
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
      <h2 style={{ fontSize: '16px', fontWeight: 600, margin: 0, color: token('color.text', '#172B4D') }}>{title}</h2>
      <Badge appearance={badgeAppearance}>{count}</Badge>
    </div>
    {tasks.length === 0 ? (
      <div
        style={{
          backgroundColor: token('color.background.neutral.subtle', '#F4F5F7'),
          borderRadius: '4px',
          padding: '16px 24px',
          border: `1px solid ${token('color.border', '#DFE1E6')}`,
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}
      >
        <div style={{ color: token('color.icon.subtle', '#6B778C'), display: 'flex' }}>
          <InboxIcon label="" size="small" />
        </div>
        <span style={{ fontSize: '14px', fontWeight: 500, color: token('color.text', '#172B4D') }}>{emptyMessage}</span>
      </div>
    ) : (
      <div>
        {tasks.map((task) => (
          <TaskCardItem
            key={task.id}
            task={task}
            review={review}
            acked={acked.has(task.id)}
            ackPending={ackingId === task.id}
            onAck={onAck}
            onSubmit={onSubmit}
          />
        ))}
      </div>
    )}
  </div>
);

export const MyTasksToday: React.FC = () => {
  const toast = useToast();
  const invalidate = useInvalidateTaskCaches();
  const { data, isLoading, isError } = useQuery({ queryKey: MY_TASKS_TODAY_KEY, queryFn: fetchMyTasksToday });
  // /api/my-tasks-today không trả acknowledged_at, nên nhớ cục bộ những việc vừa xác nhận.
  const [acked, setAcked] = useState<Set<number>>(new Set());
  const [submitTask, setSubmitTask] = useState<TaskItem | null>(null);

  const ackMutation = useMutation({
    mutationFn: (id: number) => acknowledgeTask(id),
    onSuccess: (_result, id) => {
      setAcked((prev) => new Set(prev).add(id));
      toast.success('Đã xác nhận nhận việc');
      return invalidate(id);
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Không xác nhận được. Vui lòng thử lại.')),
  });
  const ackingId = ackMutation.isPending ? (ackMutation.variables ?? null) : null;

  const dueToday = data?.dueToday || [];
  const overdue = data?.overdue || [];
  const pendingMyReview = data?.pendingMyReview || [];
  const common = { acked, ackingId, onAck: (id: number) => ackMutation.mutate(id), onSubmit: setSubmitTask };

  return (
    <div style={{ maxWidth: '1000px', margin: '0', paddingTop: '16px' }}>
      <h1 style={{ fontSize: '28px', fontWeight: 600, color: token('color.text', '#172B4D'), marginBottom: '8px' }}>Công việc hôm nay</h1>
      <p style={{ fontSize: '14px', color: token('color.text.subtle', '#5E6C84'), marginBottom: '32px' }}>
        Công việc đến hạn hôm nay, quá hạn, hoặc đang chờ bạn duyệt.
      </p>

      {isLoading ? (
        <LottieLoading message="Đang tải danh sách việc cần xử lý..." size={140} />
      ) : isError ? (
        <div style={{ color: token('color.text.danger', '#DE350B'), padding: '16px' }}>Lỗi tải danh sách công việc.</div>
      ) : (
        <>
          <TaskSection
            title="Đến hạn hôm nay"
            count={dueToday.length}
            emptyMessage="Không có việc đến hạn hôm nay"
            tasks={dueToday}
            {...common}
          />
          <TaskSection
            title="Quá hạn"
            count={overdue.length}
            badgeAppearance={overdue.length > 0 ? 'important' : 'default'}
            emptyMessage="Không có việc quá hạn"
            tasks={overdue}
            {...common}
          />
          <TaskSection
            title="Chờ bạn duyệt"
            count={pendingMyReview.length}
            badgeAppearance="primary"
            emptyMessage="Không có việc chờ bạn duyệt"
            tasks={pendingMyReview}
            review
            {...common}
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
    </div>
  );
};

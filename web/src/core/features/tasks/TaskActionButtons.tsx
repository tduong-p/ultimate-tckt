import React, { useState } from 'react';
import { Button } from '../../../ui';
import './tasks.css';
import { acknowledgeTask, reviewTask, updateTaskStatus, type TaskItem } from '../../api';
import { ReviewDecisionModal } from './ReviewDecisionModal';
import { SubmitReviewModal } from './SubmitReviewModal';
import { useTaskMutation } from './useTaskMutation';

export interface TaskActionButtonsProps {
  task: TaskItem;
  /** Người nghiệm thu: thấy nút Duyệt đạt / Yêu cầu làm lại / Bác bỏ khi việc ở trạng thái chờ duyệt. */
  canReview?: boolean;
}

type Dialog = 'submit' | 'reject' | 'cancel' | null;

/** Nút vòng đời của một việc. Server vẫn là nơi chặn cuối (người được giao / quản lý Tổ / người nghiệm thu). */
export const TaskActionButtons: React.FC<TaskActionButtonsProps> = ({ task, canReview = false }) => {
  const [dialog, setDialog] = useState<Dialog>(null);
  const close = () => setDialog(null);

  const ack = useTaskMutation(() => acknowledgeTask(task.id), { message: 'Đã nhận việc.' });
  const status = useTaskMutation((next: 'todo' | 'in_progress') => updateTaskStatus(task.id, next), {
    message: (_, next) => (next === 'in_progress' ? 'Đã bắt đầu làm.' : 'Đã tạm dừng.'),
  });
  const approve = useTaskMutation(() => reviewTask(task.id, { decision: 'approve' }), { message: 'Đã duyệt đạt công việc.' });
  const busy = ack.isPending || status.isPending || approve.isPending;

  return (
    <>
      <div className="tk-actions">
        {task.status === 'todo' && (
          <>
            <Button size="sm" disabled={busy} onClick={() => ack.mutate()}>
              Nhận việc
            </Button>
            <Button variant="primary" size="sm" disabled={busy} onClick={() => status.mutate('in_progress')}>
              Bắt đầu làm
            </Button>
          </>
        )}
        {task.status === 'in_progress' && (
          <>
            <Button variant="primary" size="sm" disabled={busy} onClick={() => setDialog('submit')}>
              Nộp nghiệm thu
            </Button>
            <Button size="sm" disabled={busy} onClick={() => status.mutate('todo')}>
              Tạm dừng
            </Button>
          </>
        )}
        {task.status === 'review' && canReview && (
          <>
            <Button variant="primary" size="sm" disabled={busy} onClick={() => approve.mutate()}>
              Duyệt đạt
            </Button>
            <Button size="sm" disabled={busy} onClick={() => setDialog('reject')}>
              Yêu cầu làm lại
            </Button>
            <Button variant="danger" size="sm" disabled={busy} onClick={() => setDialog('cancel')}>
              Bác bỏ
            </Button>
          </>
        )}
      </div>
      <SubmitReviewModal task={task} isOpen={dialog === 'submit'} onClose={close} />
      <ReviewDecisionModal task={task} decision="reject" isOpen={dialog === 'reject'} onClose={close} />
      <ReviewDecisionModal task={task} decision="cancel" isOpen={dialog === 'cancel'} onClose={close} />
    </>
  );
};

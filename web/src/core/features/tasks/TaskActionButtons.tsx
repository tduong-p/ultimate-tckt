import React, { useState } from 'react';
import Button from '@atlaskit/button/new';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { TaskItem } from '../../api';
import { acknowledgeTask, updateTaskStatus, reviewTask } from '../../api';
import { SubmitReviewModal } from './SubmitReviewModal';
import { ReviewDecisionModal } from './ReviewDecisionModal';

export interface TaskActionButtonsProps {
  task: TaskItem;
  canReview?: boolean;
  onActionComplete?: () => void;
}

export const TaskActionButtons: React.FC<TaskActionButtonsProps> = ({
  task,
  canReview = false,
  onActionComplete,
}) => {
  const queryClient = useQueryClient();
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['core-my-tasks-today'] });
    queryClient.invalidateQueries({ queryKey: ['core-bootstrap'] });
    queryClient.invalidateQueries({ queryKey: ['core-activities'] });
    onActionComplete?.();
  };

  const ackMutation = useMutation({
    mutationFn: () => acknowledgeTask(task.id),
    onSuccess: () => {
      setAcknowledged(true);
      invalidate();
    },
  });

  const statusMutation = useMutation({
    mutationFn: (nextStatus: 'todo' | 'in_progress') => updateTaskStatus(task.id, nextStatus),
    onSuccess: invalidate,
  });

  const approveMutation = useMutation({
    mutationFn: () => reviewTask(task.id, { decision: 'approve' }),
    onSuccess: invalidate,
  });

  const isPending =
    ackMutation.isPending || statusMutation.isPending || approveMutation.isPending;

  return (
    <>
      <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
        {/* Status: todo */}
        {task.status === 'todo' && (
          <>
            {!acknowledged && (
              <Button
                appearance="discovery"
                spacing="compact"
                isLoading={ackMutation.isPending}
                isDisabled={isPending}
                onClick={() => ackMutation.mutate()}
              >
                Nhận việc
              </Button>
            )}
            <Button
              appearance="primary"
              spacing="compact"
              isLoading={statusMutation.isPending}
              isDisabled={isPending}
              onClick={() => statusMutation.mutate('in_progress')}
            >
              Bắt đầu làm
            </Button>
          </>
        )}

        {/* Status: in_progress */}
        {task.status === 'in_progress' && (
          <>
            <Button
              appearance="primary"
              spacing="compact"
              isDisabled={isPending}
              onClick={() => setIsSubmitModalOpen(true)}
            >
              Nộp nghiệm thu
            </Button>
            <Button
              appearance="subtle"
              spacing="compact"
              isDisabled={isPending}
              onClick={() => statusMutation.mutate('todo')}
            >
              Tạm dừng
            </Button>
          </>
        )}

        {/* Status: review (dành cho người có quyền duyệt) */}
        {task.status === 'review' && canReview && (
          <>
            <Button
              appearance="primary"
              spacing="compact"
              isLoading={approveMutation.isPending}
              isDisabled={isPending}
              onClick={() => approveMutation.mutate()}
            >
              Duyệt đạt
            </Button>
            <Button
              appearance="warning"
              spacing="compact"
              isDisabled={isPending}
              onClick={() => setIsReviewModalOpen(true)}
            >
              Yêu cầu sửa
            </Button>
          </>
        )}
      </div>

      {isSubmitModalOpen && (
        <SubmitReviewModal
          task={task}
          isOpen={isSubmitModalOpen}
          onClose={() => setIsSubmitModalOpen(false)}
          onSuccess={invalidate}
        />
      )}

      {isReviewModalOpen && (
        <ReviewDecisionModal
          task={task}
          decision="reject"
          isOpen={isReviewModalOpen}
          onClose={() => setIsReviewModalOpen(false)}
          onSuccess={invalidate}
        />
      )}
    </>
  );
};

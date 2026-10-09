import React from 'react';
import { reviewTask, type TaskItem } from '../../api';
import { ReasonDialog } from '../../../shared/components/ReasonDialog';
import { useTaskMutation } from './useTaskMutation';

export interface ReviewDecisionModalProps {
  task: TaskItem;
  /** `reject`: yêu cầu làm lại. `cancel`: bác bỏ công việc. Cả hai bắt buộc có lý do. */
  decision: 'reject' | 'cancel';
  isOpen: boolean;
  onClose: () => void;
}

const COPY = {
  reject: { title: 'Yêu cầu làm lại công việc', label: 'Nội dung cần sửa', confirm: 'Yêu cầu làm lại', message: 'Đã yêu cầu làm lại công việc.' },
  cancel: { title: 'Bác bỏ công việc', label: 'Lý do bác bỏ', confirm: 'Bác bỏ', message: 'Đã bác bỏ công việc.' },
} as const;

export const ReviewDecisionModal: React.FC<ReviewDecisionModalProps> = ({ task, decision, isOpen, onClose }) => {
  const copy = COPY[decision];
  const review = useTaskMutation((feedback: string) => reviewTask(task.id, { decision, feedback }), { message: copy.message, onDone: onClose });
  return (
    <ReasonDialog
      isOpen={isOpen}
      title={`${copy.title}: ${task.title}`}
      label={copy.label}
      appearance={decision === 'cancel' ? 'danger' : 'primary'}
      confirmLabel={copy.confirm}
      isLoading={review.isPending}
      onSubmit={(reason) => review.mutate(reason)}
      onCancel={onClose}
    />
  );
};

import React from 'react';
import { Button, Dialog } from '../../../ui';
import { SubmitReviewForm } from './SubmitReviewForm';

export interface SubmitReviewDialogProps {
  isOpen: boolean;
  taskId: number;
  taskTitle: string;
  onClose: () => void;
}

export const SubmitReviewDialog: React.FC<SubmitReviewDialogProps> = ({ isOpen, taskId, taskTitle, onClose }) => (
  <Dialog
    open={isOpen}
    onOpenChange={(open) => { if (!open) onClose(); }}
    title={`Nộp nghiệm thu: ${taskTitle}`}
    footer={<Button onClick={onClose}>Đóng</Button>}
  >
    <SubmitReviewForm taskId={taskId} onDone={onClose} />
  </Dialog>
);

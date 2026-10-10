import React, { useEffect, useState } from 'react';
import { Field } from '../../../ui';
import { submitTaskReview, type SubmitTaskReviewPayload, type TaskItem } from '../../api';
import { isHttpUrl } from '../../../shared/utils/url';
import { ErrorText } from './formFields';
import { TaskFormDialog } from './TaskFormDialog';
import { useTaskMutation } from './useTaskMutation';

export interface SubmitReviewModalProps {
  task: TaskItem;
  isOpen: boolean;
  onClose: () => void;
}

export const SubmitReviewModal: React.FC<SubmitReviewModalProps> = ({ task, isOpen, onClose }) => {
  const [linkUrl, setLinkUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setLinkUrl('');
      setNotes('');
      setError('');
    }
  }, [isOpen]);

  const submit = useTaskMutation((payload: SubmitTaskReviewPayload) => submitTaskReview(task.id, payload), {
    message: 'Đã nộp nghiệm thu.',
    onDone: onClose,
  });

  const onSubmit = () => {
    const link = linkUrl.trim();
    if (link && !isHttpUrl(link)) {
      setError('Link minh chứng phải bắt đầu bằng http:// hoặc https://.');
      return;
    }
    setError('');
    submit.mutate({ link_url: link || undefined, notes: notes.trim() || undefined });
  };

  return (
    <TaskFormDialog
      isOpen={isOpen}
      title={`Nộp nghiệm thu: ${task.title}`}
      submitLabel="Gửi nghiệm thu"
      submitting={submit.isPending}
      onSubmit={onSubmit}
      onClose={onClose}
    >
      <Field label="Link minh chứng">
        <input value={linkUrl} placeholder="https://drive.google.com/..." onChange={(e) => setLinkUrl(e.target.value)} />
      </Field>
      <Field label="Ghi chú bàn giao">
        <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </Field>
      <ErrorText>{error}</ErrorText>
    </TaskFormDialog>
  );
};

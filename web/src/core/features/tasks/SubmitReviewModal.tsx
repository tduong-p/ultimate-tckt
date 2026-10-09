import React, { useEffect, useState } from 'react';
import Modal, { ModalBody, ModalFooter, ModalHeader, ModalTitle, ModalTransition } from '@atlaskit/modal-dialog';
import Button from '@atlaskit/button/new';
import Textfield from '@atlaskit/textfield';
import TextArea from '@atlaskit/textarea';
import { submitTaskReview, type SubmitTaskReviewPayload, type TaskItem } from '../../api';
import { isHttpUrl } from '../../../shared/utils/url';
import { ErrorText, FieldRow } from '../activities/formBits';
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
    <ModalTransition>
      {isOpen && (
        <Modal onClose={onClose} width="medium">
          <ModalHeader>
            <ModalTitle>{`Nộp nghiệm thu: ${task.title}`}</ModalTitle>
          </ModalHeader>
          <ModalBody>
            <FieldRow label="Link minh chứng" htmlFor="submit-review-link">
              <Textfield id="submit-review-link" value={linkUrl} placeholder="https://drive.google.com/..." onChange={(e) => setLinkUrl((e.target as HTMLInputElement).value)} />
            </FieldRow>
            <FieldRow label="Ghi chú bàn giao" htmlFor="submit-review-notes">
              <TextArea id="submit-review-notes" minimumRows={3} value={notes} onChange={(e) => setNotes((e.target as HTMLTextAreaElement).value)} />
            </FieldRow>
            {error && <ErrorText>{error}</ErrorText>}
          </ModalBody>
          <ModalFooter>
            <Button appearance="subtle" onClick={onClose}>
              Huỷ
            </Button>
            <Button appearance="primary" isLoading={submit.isPending} onClick={onSubmit}>
              Gửi nghiệm thu
            </Button>
          </ModalFooter>
        </Modal>
      )}
    </ModalTransition>
  );
};

import React, { useEffect, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import Modal, { ModalBody, ModalFooter, ModalHeader, ModalTitle, ModalTransition } from '@atlaskit/modal-dialog';
import Button from '@atlaskit/button/new';
import { apiErrorMessage, reviewTask, type ReviewDecision } from '../../api';
import { useToast } from '../../../shared/components/Toast';
import { useInvalidateTaskCaches } from './useTaskCaches';
import { AreaField, ErrorText } from './formFields';

export const REVIEW_DECISIONS: { value: ReviewDecision; label: string }[] = [
  { value: 'approve', label: 'Duyệt đạt' },
  { value: 'reject', label: 'Yêu cầu làm lại' },
  { value: 'cancel', label: 'Bác bỏ' },
];

const SUCCESS_MESSAGE: Record<ReviewDecision, string> = {
  approve: 'Đã duyệt đạt',
  reject: 'Đã yêu cầu làm lại',
  cancel: 'Đã bác bỏ công việc',
};

const REASON_REQUIRED: Record<'reject' | 'cancel', string> = {
  reject: 'Vui lòng nêu rõ lý do khi yêu cầu làm lại.',
  cancel: 'Vui lòng nêu rõ lý do khi bác bỏ.',
};

export interface ReviewDialogProps {
  isOpen: boolean;
  taskId: number;
  taskTitle: string;
  initialDecision?: ReviewDecision;
  onClose: () => void;
}

/** Hộp duyệt nghiệm thu. Yêu cầu làm lại và bác bỏ bắt buộc lý do, như server. */
export const ReviewDialog: React.FC<ReviewDialogProps> = ({
  isOpen,
  taskId,
  taskTitle,
  initialDecision = 'approve',
  onClose,
}) => {
  const toast = useToast();
  const invalidate = useInvalidateTaskCaches();
  const [decision, setDecision] = useState<ReviewDecision>(initialDecision);
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setDecision(initialDecision);
      setFeedback('');
      setError('');
    }
  }, [isOpen, initialDecision]);

  const mutation = useMutation({
    mutationFn: () => reviewTask(taskId, { decision, feedback: feedback.trim() }),
    onSuccess: async () => {
      toast.success(SUCCESS_MESSAGE[decision]);
      await invalidate(taskId);
      onClose();
    },
    onError: (err) => setError(apiErrorMessage(err, 'Không gửi được kết quả nghiệm thu.')),
  });

  const submit = () => {
    if (decision !== 'approve' && !feedback.trim()) {
      setError(REASON_REQUIRED[decision]);
      return;
    }
    setError('');
    mutation.mutate();
  };

  return (
    <ModalTransition>
      {isOpen && (
        <Modal onClose={onClose} width="small">
          <ModalHeader>
            <ModalTitle>{`Nghiệm thu: ${taskTitle}`}</ModalTitle>
          </ModalHeader>
          <ModalBody>
            <fieldset style={{ border: 'none', padding: 0, margin: 0 }}>
              <legend style={{ fontSize: 12, fontWeight: 600 }}>Kết quả</legend>
              {REVIEW_DECISIONS.map((d) => (
                <label key={d.value} style={{ display: 'block', padding: '4px 0' }}>
                  <input
                    type="radio"
                    name="review-decision"
                    value={d.value}
                    checked={decision === d.value}
                    onChange={() => {
                      setDecision(d.value);
                      setError('');
                    }}
                  />{' '}
                  {d.label}
                </label>
              ))}
            </fieldset>
            <AreaField label="Ghi chú" required={decision !== 'approve'} value={feedback} onChange={setFeedback} />
            <ErrorText>{error}</ErrorText>
          </ModalBody>
          <ModalFooter>
            <Button appearance="subtle" onClick={onClose}>
              Huỷ
            </Button>
            <Button
              appearance={decision === 'approve' ? 'primary' : decision === 'cancel' ? 'danger' : 'warning'}
              isLoading={mutation.isPending}
              onClick={submit}
            >
              Gửi kết quả
            </Button>
          </ModalFooter>
        </Modal>
      )}
    </ModalTransition>
  );
};

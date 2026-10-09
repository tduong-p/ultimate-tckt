import React from 'react';
import Modal, { ModalBody, ModalFooter, ModalHeader, ModalTitle, ModalTransition } from '@atlaskit/modal-dialog';
import Button from '@atlaskit/button/new';
import { SubmitReviewForm } from './SubmitReviewForm';

export interface SubmitReviewDialogProps {
  isOpen: boolean;
  taskId: number;
  taskTitle: string;
  onClose: () => void;
}

export const SubmitReviewDialog: React.FC<SubmitReviewDialogProps> = ({ isOpen, taskId, taskTitle, onClose }) => (
  <ModalTransition>
    {isOpen && (
      <Modal onClose={onClose} width="small">
        <ModalHeader>
          <ModalTitle>{`Nộp nghiệm thu: ${taskTitle}`}</ModalTitle>
        </ModalHeader>
        <ModalBody>
          <SubmitReviewForm taskId={taskId} onDone={onClose} />
        </ModalBody>
        <ModalFooter>
          <Button appearance="subtle" onClick={onClose}>
            Đóng
          </Button>
        </ModalFooter>
      </Modal>
    )}
  </ModalTransition>
);

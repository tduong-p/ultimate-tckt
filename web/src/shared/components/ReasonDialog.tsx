import React, { useEffect, useState } from 'react';
import Modal, { ModalBody, ModalFooter, ModalHeader, ModalTitle, ModalTransition } from '@atlaskit/modal-dialog';
import Button from '@atlaskit/button/new';
import TextArea from '@atlaskit/textarea';
import { token } from '@atlaskit/tokens';

export interface ReasonDialogProps {
  isOpen: boolean;
  title: string;
  label?: string;
  required?: boolean;
  confirmLabel?: string;
  appearance?: 'primary' | 'danger';
  isLoading?: boolean;
  onSubmit: (reason: string) => void;
  onCancel: () => void;
}

export const ReasonDialog: React.FC<ReasonDialogProps> = ({
  isOpen, title, label = 'Lý do', required = true, confirmLabel = 'Gửi', appearance = 'primary', isLoading = false, onSubmit, onCancel,
}) => {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  useEffect(() => { if (!isOpen) { setReason(''); setError(''); } }, [isOpen]);

  const submit = () => {
    const value = reason.trim();
    if (required && !value) {
      setError('Vui lòng nhập lý do.');
      return;
    }
    onSubmit(value);
  };

  return (
    <ModalTransition>
      {isOpen && (
        <Modal onClose={onCancel} width="small">
          <ModalHeader><ModalTitle>{title}</ModalTitle></ModalHeader>
          <ModalBody>
            <label htmlFor="reason-dialog-text">{label}{required ? ' *' : ''}</label>
            <TextArea id="reason-dialog-text" value={reason} onChange={(e) => { setReason(e.target.value); setError(''); }} minimumRows={3} />
            {error && <p role="alert" style={{ color: token('color.text.danger', '#AE2E24'), marginTop: 4 }}>{error}</p>}
          </ModalBody>
          <ModalFooter>
            <Button appearance="subtle" onClick={onCancel}>Huỷ</Button>
            <Button appearance={appearance} isLoading={isLoading} onClick={submit}>{confirmLabel}</Button>
          </ModalFooter>
        </Modal>
      )}
    </ModalTransition>
  );
};

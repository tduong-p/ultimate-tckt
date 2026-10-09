import React, { useEffect, useState } from 'react';
import Modal, { ModalBody, ModalFooter, ModalHeader, ModalTitle, ModalTransition } from '@atlaskit/modal-dialog';
import Button from '@atlaskit/button/new';
import Textfield from '@atlaskit/textfield';

export interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  children?: React.ReactNode;
  confirmLabel?: string;
  appearance?: 'primary' | 'danger';
  confirmText?: string;
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen, title, children, confirmLabel = 'Xác nhận', appearance = 'primary', confirmText, isLoading = false, onConfirm, onCancel,
}) => {
  const [typed, setTyped] = useState('');
  useEffect(() => { if (!isOpen) setTyped(''); }, [isOpen]);
  const blocked = confirmText !== undefined && typed.trim() !== confirmText.trim();

  return (
    <ModalTransition>
      {isOpen && (
        <Modal onClose={onCancel} width="small">
          <ModalHeader><ModalTitle appearance={appearance === 'danger' ? 'danger' : undefined}>{title}</ModalTitle></ModalHeader>
          <ModalBody>
            {children}
            {confirmText !== undefined && (
              <div style={{ marginTop: 12 }}>
                <label htmlFor="confirm-dialog-text">Gõ lại "{confirmText}" để xác nhận</label>
                <Textfield id="confirm-dialog-text" value={typed} onChange={(e) => setTyped((e.target as HTMLInputElement).value)} />
              </div>
            )}
          </ModalBody>
          <ModalFooter>
            <Button appearance="subtle" onClick={onCancel}>Huỷ</Button>
            <Button appearance={appearance} isDisabled={blocked} isLoading={isLoading} onClick={() => { if (!blocked) onConfirm(); }}>
              {confirmLabel}
            </Button>
          </ModalFooter>
        </Modal>
      )}
    </ModalTransition>
  );
};

import React, { useEffect, useState } from 'react';
import { Button, Dialog, Field } from '../../ui';

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
    <Dialog
      open={isOpen}
      onOpenChange={(open) => { if (!open) onCancel(); }}
      title={title}
      footer={(
        <>
          <Button onClick={onCancel}>Huỷ</Button>
          <Button
            variant={appearance === 'danger' ? 'danger' : 'primary'}
            disabled={blocked || isLoading}
            onClick={() => { if (!blocked) onConfirm(); }}
          >
            {confirmLabel}
          </Button>
        </>
      )}
    >
      <div>
        {children}
        {confirmText !== undefined && (
          <div style={{ marginTop: 12 }}>
            <Field label={`Gõ lại "${confirmText}" để xác nhận`}>
              <input
                id="confirm-dialog-text"
                type="text"
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
              />
            </Field>
          </div>
        )}
      </div>
    </Dialog>
  );
};

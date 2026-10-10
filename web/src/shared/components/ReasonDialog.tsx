import React, { useEffect, useState } from 'react';
import { Button, Dialog, Field } from '../../ui';

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
  isOpen,
  title,
  label = 'Lý do',
  required = true,
  confirmLabel = 'Gửi',
  appearance = 'primary',
  isLoading = false,
  onSubmit,
  onCancel,
}) => {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  useEffect(() => {
    if (!isOpen) {
      setReason('');
      setError('');
    }
  }, [isOpen]);

  const submit = () => {
    const value = reason.trim();
    if (required && !value) {
      setError('Vui lòng nhập lý do.');
      return;
    }
    onSubmit(value);
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onCancel();
      }}
      title={title}
      footer={(
        <>
          <Button onClick={onCancel}>Huỷ</Button>
          <Button
            variant={appearance === 'danger' ? 'danger' : 'primary'}
            disabled={isLoading}
            onClick={submit}
          >
            {confirmLabel}
          </Button>
        </>
      )}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <Field label={`${label}${required ? ' *' : ''}`} error={error || undefined}>
          <textarea
            id="reason-dialog-text"
            rows={3}
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              setError('');
            }}
          />
        </Field>
      </form>
    </Dialog>
  );
};

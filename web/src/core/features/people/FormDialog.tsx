import React, { useId } from 'react';
import { Button, Dialog } from '../../../ui';
import { FormError } from './FormField';

export interface FormDialogProps {
  title: string;
  children: React.ReactNode;
  submitLabel?: string;
  isSubmitting?: boolean;
  error?: string | null;
  onSubmit: () => void;
  onClose: () => void;
}

export const FormDialog: React.FC<FormDialogProps> = ({
  title, children, submitLabel = 'Lưu', isSubmitting = false, error, onSubmit, onClose,
}) => {
  const formId = useId();
  return (
    <Dialog
      open
      onOpenChange={(open) => { if (!open) onClose(); }}
      title={title}
      footer={(
        <>
          <Button onClick={onClose}>Huỷ</Button>
          <Button type="submit" form={formId} variant="primary" disabled={isSubmitting}>{submitLabel}</Button>
        </>
      )}
    >
      <form id={formId} noValidate className="ppl-form" onSubmit={(e) => { e.preventDefault(); onSubmit(); }}>
        {children}
        <FormError message={error ?? undefined} />
      </form>
    </Dialog>
  );
};

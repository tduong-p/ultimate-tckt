// Vỏ hộp thoại của phần việc con/tài liệu/nghiệm thu, dựng bằng kit mới (thay Modal/ConfirmDialog Atlaskit).
import React, { useId } from 'react';
import { Button, Dialog } from '../../../ui';
import './tasks.css';

export interface TaskFormDialogProps {
  isOpen: boolean;
  title: string;
  submitLabel: string;
  submitting?: boolean;
  submitVariant?: 'primary' | 'danger';
  onSubmit: () => void;
  onClose: () => void;
  children: React.ReactNode;
}

/** Hộp thoại có form: Enter hoặc nút gửi gọi `onSubmit`; khoá nút gửi khi đang gửi. */
export const TaskFormDialog: React.FC<TaskFormDialogProps> = ({
  isOpen, title, submitLabel, submitting = false, submitVariant = 'primary', onSubmit, onClose, children,
}) => {
  const formId = useId();
  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => { if (!open) onClose(); }}
      title={title}
      footer={(
        <>
          <Button onClick={onClose}>Huỷ</Button>
          <Button type="submit" form={formId} variant={submitVariant} disabled={submitting}>{submitLabel}</Button>
        </>
      )}
    >
      <form id={formId} noValidate className="tk-form" onSubmit={(e) => { e.preventDefault(); onSubmit(); }}>
        {children}
      </form>
    </Dialog>
  );
};

export interface TaskConfirmDialogProps {
  isOpen: boolean;
  title: string;
  confirmLabel: string;
  danger?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  children: React.ReactNode;
}

export const TaskConfirmDialog: React.FC<TaskConfirmDialogProps> = ({
  isOpen, title, confirmLabel, danger = false, loading = false, onConfirm, onCancel, children,
}) => (
  <Dialog
    open={isOpen}
    onOpenChange={(open) => { if (!open) onCancel(); }}
    title={title}
    footer={(
      <>
        <Button onClick={onCancel}>Huỷ</Button>
        <Button variant={danger ? 'danger' : 'primary'} disabled={loading} onClick={onConfirm}>{confirmLabel}</Button>
      </>
    )}
  >
    {children}
  </Dialog>
);

// Vỏ hộp thoại, trạng thái truy vấn và chọn có nhãn của Giao việc, dựng bằng kit mới (thay FormDialog/SelectField/ReasonDialog Atlaskit).
import React, { useEffect, useId, useState } from 'react';
import { Badge, Button, Dialog, Field, Select, type BadgeTone } from '../../../ui';
import { apiErrorMessage } from '../../api';
import type { LozengeTone } from '../dieuhanh/labels';
import '../people/people.css';
import './directives.css';

const TONE: Record<LozengeTone, BadgeTone> = {
  default: 'neutral', new: 'info', inprogress: 'info', moved: 'warning', success: 'success', removed: 'danger',
};

export const StatusBadge: React.FC<{ label: string; tone: LozengeTone }> = ({ label, tone }) => (
  <Badge tone={TONE[tone]}>{label}</Badge>
);

export const ErrorLine: React.FC<{ message: string }> = ({ message }) =>
  message ? <p role="alert" className="ppl-error">{message}</p> : null;

export const QueryStatus: React.FC<{ isLoading: boolean; error: unknown; onRetry: () => void }> = ({ isLoading, error, onRetry }) => {
  if (isLoading) return <p role="status" className="ppl-muted">Đang tải dữ liệu…</p>;
  if (!error) return null;
  return (
    <div role="alert">
      <p className="ppl-error">{apiErrorMessage(error, 'Không tải được dữ liệu.')}</p>
      <Button size="sm" onClick={onRetry}>Thử tải lại</Button>
    </div>
  );
};

export interface SelectOption { value: string; label: string }

export const SelectField: React.FC<{
  label: string; value: string; onChange: (value: string) => void; options: SelectOption[];
  placeholder?: string; required?: boolean; disabled?: boolean;
}> = ({ label, value, onChange, options, placeholder, required = false, disabled = false }) => (
  <Field label={`${label}${required ? ' *' : ''}`}>
    <Select
      value={value}
      disabled={disabled}
      onChange={onChange}
      options={placeholder !== undefined ? [{ value: '', label: placeholder }, ...options] : options}
    />
  </Field>
);

/** Hộp thoại biểu mẫu: Enter hoặc nút xác nhận gọi `onSubmit`; nút xác nhận khoá khi đang gửi hoặc `confirmDisabled`. */
export const DirFormDialog: React.FC<{
  isOpen: boolean; title: string; confirmLabel: string; isLoading?: boolean; confirmDisabled?: boolean; danger?: boolean;
  onSubmit: () => void; onCancel: () => void; children: React.ReactNode;
}> = ({ isOpen, title, confirmLabel, isLoading = false, confirmDisabled = false, danger = false, onSubmit, onCancel, children }) => {
  const formId = useId();
  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => { if (!open) onCancel(); }}
      title={title}
      footer={(
        <>
          <Button onClick={onCancel}>Huỷ</Button>
          <Button type="submit" form={formId} variant={danger ? 'danger' : 'primary'} disabled={isLoading || confirmDisabled}>{confirmLabel}</Button>
        </>
      )}
    >
      <form id={formId} noValidate className="ppl-form" onSubmit={(e) => { e.preventDefault(); onSubmit(); }}>
        {children}
      </form>
    </Dialog>
  );
};

/** Hộp nhập lý do/ghi chú (bắt buộc hoặc không); nhãn gồm " *" khi bắt buộc. */
export const ReasonFormDialog: React.FC<{
  isOpen: boolean; title: string; label?: string; required?: boolean; confirmLabel?: string; danger?: boolean; isLoading?: boolean;
  onSubmit: (reason: string) => void; onCancel: () => void;
}> = ({ isOpen, title, label = 'Lý do', required = true, confirmLabel = 'Gửi', danger = false, isLoading = false, onSubmit, onCancel }) => {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  useEffect(() => { if (!isOpen) { setReason(''); setError(''); } }, [isOpen]);
  const submit = () => {
    const value = reason.trim();
    if (required && !value) { setError('Vui lòng nhập lý do.'); return; }
    onSubmit(value);
  };
  return (
    <DirFormDialog isOpen={isOpen} title={title} confirmLabel={confirmLabel} danger={danger} isLoading={isLoading} onSubmit={submit} onCancel={onCancel}>
      <Field label={`${label}${required ? ' *' : ''}`}>
        <textarea rows={3} value={reason} onChange={(e) => { setReason(e.target.value); setError(''); }} />
      </Field>
      <ErrorLine message={error} />
    </DirFormDialog>
  );
};

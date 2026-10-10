import React, { useId } from 'react';
import { Badge, Button, Dialog, Field, Select, type BadgeTone } from '../../../ui';
import { apiErrorMessage } from '../../api';
import type { LozengeTone } from './labels';

const TONE_MAP: Record<LozengeTone, BadgeTone> = {
  default: 'neutral',
  new: 'info',
  inprogress: 'info',
  moved: 'warning',
  success: 'success',
  removed: 'danger',
};

export const FIELD_STYLE: React.CSSProperties = {
  width: '100%',
  padding: '6px 8px',
  borderRadius: 'var(--ui-radius)',
  border: '1px solid var(--ui-border-strong)',
  background: 'var(--ui-bg-main)',
  color: 'var(--ui-text)',
  fontSize: 12,
};

export const StatusLozenge: React.FC<{ label: string; tone: LozengeTone }> = ({ label, tone }) => (
  <Badge tone={TONE_MAP[tone] ?? 'neutral'}>{label}</Badge>
);

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

export const ErrorText: React.FC<{ message: string }> = ({ message }) =>
  message ? <p role="alert" style={{ color: 'var(--ui-pr-urgent)', marginTop: 8 }}>{message}</p> : null;

export const QueryStatus: React.FC<{ isLoading: boolean; error: unknown; onRetry: () => void }> = ({ isLoading, error, onRetry }) => {
  if (isLoading) return <p role="status" style={{ marginTop: 8, color: 'var(--ui-text-2)' }}>Đang tải dữ liệu…</p>;
  if (!error) return null;
  return (
    <div role="alert" style={{ marginTop: 8 }}>
      <ErrorText message={apiErrorMessage(error, 'Không tải được dữ liệu.')} />
      <Button size="sm" onClick={onRetry}>Thử tải lại</Button>
    </div>
  );
};

/** Hộp thoại biểu mẫu chuẩn của Giao việc/Trình: tiêu đề, thân, nút Huỷ + nút xác nhận. */
export const FormDialog: React.FC<{
  isOpen: boolean; title: string; confirmLabel: string; isLoading?: boolean; confirmDisabled?: boolean;
  onSubmit: () => void; onCancel: () => void; children: React.ReactNode;
}> = ({ isOpen, title, confirmLabel, isLoading = false, confirmDisabled = false, onSubmit, onCancel, children }) => {
  const formId = useId();
  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => { if (!open) onCancel(); }}
      title={title}
      footer={(
        <>
          <Button onClick={onCancel}>Huỷ</Button>
          <Button type="submit" form={formId} variant="primary" disabled={isLoading || confirmDisabled}>
            {confirmLabel}
          </Button>
        </>
      )}
    >
      <form id={formId} noValidate onSubmit={(e) => { e.preventDefault(); onSubmit(); }}>
        {children}
      </form>
    </Dialog>
  );
};

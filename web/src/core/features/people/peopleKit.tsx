// Vỏ hộp thoại, xác nhận và chọn Tổ bằng kit mới (thay FormDialog/ConfirmDialog/TeamCheckboxes Atlaskit cho Tổ và Thành viên).
import React, { useId } from 'react';
import { Button, Dialog } from '../../../ui';
import './people.css';

export interface PeopleFormDialogProps {
  title: string;
  submitLabel: string;
  submitting?: boolean;
  error?: string;
  onSubmit: () => void;
  onClose: () => void;
  children: React.ReactNode;
}

/** Hộp thoại có form: Enter hoặc nút gửi gọi `onSubmit`; lỗi hiện ngay trong hộp. Cha mount có điều kiện. */
export const PeopleFormDialog: React.FC<PeopleFormDialogProps> = ({
  title, submitLabel, submitting = false, error, onSubmit, onClose, children,
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
          <Button type="submit" form={formId} variant="primary" disabled={submitting}>{submitLabel}</Button>
        </>
      )}
    >
      <form id={formId} noValidate className="ppl-form" onSubmit={(e) => { e.preventDefault(); onSubmit(); }}>
        {children}
        {error && <p role="alert" className="ppl-error">{error}</p>}
      </form>
    </Dialog>
  );
};

export interface PeopleConfirmDialogProps {
  open: boolean;
  title: string;
  confirmLabel: string;
  danger?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  children: React.ReactNode;
}

export const PeopleConfirmDialog: React.FC<PeopleConfirmDialogProps> = ({
  open, title, confirmLabel, danger, loading, onConfirm, onCancel, children,
}) => (
  <Dialog
    open={open}
    onOpenChange={(next) => { if (!next) onCancel(); }}
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

export interface TeamChecksProps {
  teams: Array<{ id: number; name: string }>;
  value: number[];
  onChange: (ids: number[]) => void;
}

export const TeamChecks: React.FC<TeamChecksProps> = ({ teams, value, onChange }) => (
  <fieldset className="ppl-fieldset">
    <legend className="ppl-legend">Tổ</legend>
    {teams.length === 0 && <span className="ppl-muted">Chưa có Tổ nào để chọn.</span>}
    {teams.map((t) => (
      <label key={t.id} className="ppl-check">
        <input
          type="checkbox"
          checked={value.includes(t.id)}
          onChange={(e) => onChange(e.target.checked ? [...value, t.id] : value.filter((v) => v !== t.id))}
        />
        {t.name}
      </label>
    ))}
  </fieldset>
);

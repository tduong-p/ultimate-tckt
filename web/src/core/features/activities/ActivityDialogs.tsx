// Hộp thoại lý do / xác nhận cho thanh hành động hoạt động (kit mới, thay ReasonDialog/ConfirmDialog Atlaskit).
import React, { useEffect, useState } from 'react';
import { Button, Dialog } from '../../../ui';
import './activities.css';

interface BaseProps {
  open: boolean;
  title: string;
  confirmLabel: string;
  danger?: boolean;
  loading?: boolean;
  onCancel: () => void;
}

export const ActivityReasonDialog: React.FC<BaseProps & { label: string; onSubmit: (reason: string) => void }> = ({
  open, title, label, confirmLabel, danger, loading, onSubmit, onCancel,
}) => {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  useEffect(() => { if (!open) { setReason(''); setError(''); } }, [open]);
  const submit = () => {
    const value = reason.trim();
    if (!value) { setError('Vui lòng nhập lý do.'); return; }
    onSubmit(value);
  };
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => { if (!next) onCancel(); }}
      title={title}
      footer={(
        <>
          <Button onClick={onCancel}>Huỷ</Button>
          <Button variant={danger ? 'danger' : 'primary'} disabled={loading} onClick={submit}>{confirmLabel}</Button>
        </>
      )}
    >
      <label htmlFor="act-reason-text">{label} *</label>
      <textarea id="act-reason-text" className="act-textarea" value={reason} onChange={(e) => { setReason(e.target.value); setError(''); }} />
      {error && <p role="alert" className="act-field-error">{error}</p>}
    </Dialog>
  );
};

export const ActivityConfirmDialog: React.FC<BaseProps & { confirmText: string; children: React.ReactNode; onConfirm: () => void }> = ({
  open, title, confirmLabel, danger, loading, confirmText, children, onConfirm, onCancel,
}) => {
  const [typed, setTyped] = useState('');
  useEffect(() => { if (!open) setTyped(''); }, [open]);
  const blocked = typed.trim() !== confirmText.trim();
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => { if (!next) onCancel(); }}
      title={title}
      footer={(
        <>
          <Button onClick={onCancel}>Huỷ</Button>
          <Button variant={danger ? 'danger' : 'primary'} disabled={blocked || loading} onClick={() => { if (!blocked) onConfirm(); }}>{confirmLabel}</Button>
        </>
      )}
    >
      <p>{children}</p>
      <label htmlFor="act-confirm-text">Gõ lại "{confirmText}" để xác nhận</label>
      <input id="act-confirm-text" className="act-input act-input--wide" value={typed} onChange={(e) => setTyped(e.target.value)} />
    </Dialog>
  );
};

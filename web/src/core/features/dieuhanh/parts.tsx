import React, { useId } from 'react';
import Modal, { ModalBody, ModalFooter, ModalHeader, ModalTitle, ModalTransition } from '@atlaskit/modal-dialog';
import Button from '@atlaskit/button/new';
import Lozenge from '@atlaskit/lozenge';
import { token } from '@atlaskit/tokens';
import { apiErrorMessage } from '../../api';
import type { LozengeTone } from './labels';

export const FIELD_STYLE: React.CSSProperties = {
  width: '100%',
  padding: '8px 6px',
  borderRadius: 3,
  border: `1px solid ${token('color.border', '#DFE1E6')}`,
  background: token('elevation.surface', '#fff'),
  color: token('color.text', '#172B4D'),
  fontSize: 14,
};

export const StatusLozenge: React.FC<{ label: string; tone: LozengeTone }> = ({ label, tone }) => (
  <Lozenge appearance={tone}>{label}</Lozenge>
);

export interface SelectOption { value: string; label: string }

export const SelectField: React.FC<{
  label: string; value: string; onChange: (value: string) => void; options: SelectOption[];
  placeholder?: string; required?: boolean; disabled?: boolean;
}> = ({ label, value, onChange, options, placeholder, required = false, disabled = false }) => {
  const id = useId();
  return (
    <div style={{ marginTop: 12 }}>
      <label htmlFor={id}>{label}{required ? ' *' : ''}</label>
      <select id={id} value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)} style={FIELD_STYLE}>
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
};

export const ErrorText: React.FC<{ message: string }> = ({ message }) =>
  message ? <p role="alert" style={{ color: token('color.text.danger', '#AE2E24'), marginTop: 8 }}>{message}</p> : null;

export const QueryStatus: React.FC<{ isLoading: boolean; error: unknown; onRetry: () => void }> = ({ isLoading, error, onRetry }) => {
  if (isLoading) return <p role="status" style={{ marginTop: 8 }}>Đang tải dữ liệu…</p>;
  if (!error) return null;
  return <div role="alert" style={{ marginTop: 8 }}><ErrorText message={apiErrorMessage(error, 'Không tải được dữ liệu.')} /><Button appearance="subtle" onClick={onRetry}>Thử tải lại</Button></div>;
};

/** Hộp thoại biểu mẫu chuẩn của Giao việc/Trình: tiêu đề, thân, nút Huỷ + nút xác nhận. */
export const FormDialog: React.FC<{
  isOpen: boolean; title: string; confirmLabel: string; isLoading?: boolean; confirmDisabled?: boolean;
  onSubmit: () => void; onCancel: () => void; children: React.ReactNode;
}> = ({ isOpen, title, confirmLabel, isLoading = false, confirmDisabled = false, onSubmit, onCancel, children }) => (
  <ModalTransition>
    {isOpen && (
      <Modal onClose={onCancel} width="medium">
        <ModalHeader><ModalTitle>{title}</ModalTitle></ModalHeader>
        <ModalBody>{children}</ModalBody>
        <ModalFooter>
          <Button appearance="subtle" onClick={onCancel}>Huỷ</Button>
          <Button appearance="primary" isLoading={isLoading} isDisabled={confirmDisabled} onClick={onSubmit}>{confirmLabel}</Button>
        </ModalFooter>
      </Modal>
    )}
  </ModalTransition>
);

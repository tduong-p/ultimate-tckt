import React, { useId } from 'react';
import Textfield from '@atlaskit/textfield';
import TextArea from '@atlaskit/textarea';
import { token } from '@atlaskit/tokens';

import type { Option } from './taskLabels';
export type { Option } from './taskLabels';

export { PRIORITY_OPTIONS, STAGE_OPTIONS } from './taskLabels';

export const ATTACHMENT_KIND_OPTIONS: Option[] = [
  { value: 'clarification', label: 'Làm rõ' },
  { value: 'evidence', label: 'Minh chứng' },
  { value: 'issue', label: 'Vướng mắc' },
  { value: 'deliverable', label: 'Sản phẩm bàn giao' },
];

export const COMMENT_KIND_OPTIONS: Option[] = [
  { value: 'comment', label: 'Bình luận' },
  { value: 'progress', label: 'Tiến độ' },
  { value: 'issue', label: 'Vướng mắc' },
  { value: 'evidence', label: 'Minh chứng' },
];

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 12,
  fontWeight: 600,
  margin: '12px 0 4px',
  color: token('color.text.subtle', '#44546F'),
};

const selectStyle: React.CSSProperties = {
  width: '100%',
  padding: 8,
  borderRadius: 3,
  boxSizing: 'border-box',
  fontSize: 14,
  border: `1px solid ${token('color.border.input', '#8590A2')}`,
  background: token('color.background.input', '#FFFFFF'),
  color: token('color.text', '#172B4D'),
};

export const SelectField: React.FC<{
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  required?: boolean;
  placeholder?: string;
  disabled?: boolean;
}> = ({ label, value, onChange, options, required = false, placeholder, disabled = false }) => {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} style={labelStyle}>
        {label}
        {required ? ' *' : ''}
      </label>
      <select
        id={id}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        style={selectStyle}
      >
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
};

export const TextField: React.FC<{
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
  maxLength?: number;
  placeholder?: string;
  min?: number;
  max?: number;
  step?: number;
}> = ({ label, value, onChange, type = 'text', required = false, maxLength, placeholder, min, max, step }) => {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} style={labelStyle}>
        {label}
        {required ? ' *' : ''}
      </label>
      <Textfield
        id={id}
        type={type}
        value={value}
        maxLength={maxLength}
        placeholder={placeholder}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange((e.target as HTMLInputElement).value)}
      />
    </div>
  );
};

export const AreaField: React.FC<{
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  placeholder?: string;
  rows?: number;
}> = ({ label, value, onChange, required = false, placeholder, rows = 3 }) => {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} style={labelStyle}>
        {label}
        {required ? ' *' : ''}
      </label>
      <TextArea
        id={id}
        value={value}
        placeholder={placeholder}
        minimumRows={rows}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
};

export const ErrorText: React.FC<{ children?: React.ReactNode }> = ({ children }) =>
  children ? (
    <p role="alert" style={{ color: token('color.text.danger', '#AE2E24'), margin: '8px 0 0', fontSize: 13 }}>
      {children}
    </p>
  ) : null;

import React from 'react';
import { Field, Select } from '../../../ui';
import './tasks.css';

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

export const SelectField: React.FC<{
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  required?: boolean;
  placeholder?: string;
  disabled?: boolean;
}> = ({ label, value, onChange, options, required = false, placeholder, disabled = false }) => (
  <Field label={`${label}${required ? ' *' : ''}`}>
    <Select
      value={value}
      disabled={disabled}
      onChange={onChange}
      options={placeholder !== undefined ? [{ value: '', label: placeholder }, ...options] : options}
    />
  </Field>
);

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
}> = ({ label, value, onChange, type = 'text', required = false, maxLength, placeholder, min, max, step }) => (
  <Field label={`${label}${required ? ' *' : ''}`}>
    <input
      type={type}
      value={value}
      maxLength={maxLength}
      placeholder={placeholder}
      min={min}
      max={max}
      step={step}
      onChange={(e) => onChange(e.target.value)}
    />
  </Field>
);

export const AreaField: React.FC<{
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  placeholder?: string;
  rows?: number;
}> = ({ label, value, onChange, required = false, placeholder, rows = 3 }) => (
  <Field label={`${label}${required ? ' *' : ''}`}>
    <textarea value={value} placeholder={placeholder} rows={rows} onChange={(e) => onChange(e.target.value)} />
  </Field>
);

export const ErrorText: React.FC<{ children?: React.ReactNode }> = ({ children }) =>
  children ? (
    <p role="alert" className="tk-form-error">
      {children}
    </p>
  ) : null;

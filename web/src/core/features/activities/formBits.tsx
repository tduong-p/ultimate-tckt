import React from 'react';
import { token } from '@atlaskit/tokens';

export const ErrorText: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p role="alert" style={{ margin: '4px 0 0', color: token('color.text.danger', '#AE2E24') }}>
    {children}
  </p>
);

export const FieldRow: React.FC<{ label: string; htmlFor: string; children: React.ReactNode }> = ({ label, htmlFor, children }) => (
  <div style={{ marginBottom: 12 }}>
    <label htmlFor={htmlFor} style={{ display: 'block', fontWeight: 600, marginBottom: 4 }}>
      {label}
    </label>
    {children}
  </div>
);

const controlStyle: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '8px',
  font: 'inherit',
  borderRadius: 3,
  border: `1px solid ${token('color.border.input', '#8590A2')}`,
  background: token('color.background.input', '#FFFFFF'),
  color: token('color.text', '#172B4D'),
};

export interface SelectOption {
  value: string;
  label: string;
}

export const NativeSelect: React.FC<{ id: string; value: string; onChange: (value: string) => void; options: SelectOption[] }> = ({
  id,
  value,
  onChange,
  options,
}) => (
  <select id={id} value={value} onChange={(e) => onChange(e.target.value)} style={controlStyle}>
    {options.map((o) => (
      <option key={o.value} value={o.value}>
        {o.label}
      </option>
    ))}
  </select>
);

export const DateInput: React.FC<{ id: string; value: string; onChange: (value: string) => void }> = ({ id, value, onChange }) => (
  <input id={id} type="date" value={value} onChange={(e) => onChange(e.target.value)} style={controlStyle} />
);

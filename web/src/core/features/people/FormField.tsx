import React from 'react';
import { token } from '@atlaskit/tokens';

export const selectStyle: React.CSSProperties = {
  width: '100%',
  height: 32,
  padding: '0 8px',
  borderRadius: 3,
  border: `1px solid ${token('color.border', '#DFE1E6')}`,
  background: token('elevation.surface', '#fff'),
  color: token('color.text', '#172B4D'),
};

export const FormField: React.FC<{ label: string; htmlFor: string; hint?: string; children: React.ReactNode }> = ({
  label, htmlFor, hint, children,
}) => (
  <div style={{ marginBottom: 12 }}>
    <label htmlFor={htmlFor} style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4, color: token('color.text.subtle', '#5E6C84') }}>
      {label}
    </label>
    {children}
    {hint && <div style={{ fontSize: 12, marginTop: 4, color: token('color.text.subtle', '#5E6C84') }}>{hint}</div>}
  </div>
);

export const FormError: React.FC<{ message?: string }> = ({ message }) =>
  message ? (
    <p role="alert" style={{ margin: '8px 0 0', color: token('color.text.danger', '#AE2E24') }}>{message}</p>
  ) : null;

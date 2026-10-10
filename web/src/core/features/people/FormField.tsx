import React from 'react';

export const selectStyle: React.CSSProperties = {
  width: '100%',
  height: 32,
  padding: '0 8px',
  borderRadius: 'var(--ui-radius)',
  border: '1px solid var(--ui-border-strong)',
  background: 'var(--ui-bg-main)',
  color: 'var(--ui-text)',
  fontSize: 12,
  boxSizing: 'border-box',
};

export const FormField: React.FC<{ label: string; htmlFor: string; hint?: string; children: React.ReactNode }> = ({
  label, htmlFor, hint, children,
}) => (
  <div style={{ marginBottom: 12 }}>
    <label htmlFor={htmlFor} style={{ display: 'block', fontSize: 11, fontWeight: 500, marginBottom: 4, color: 'var(--ui-text-2)' }}>
      {label}
    </label>
    {children}
    {hint && <div style={{ fontSize: 11, marginTop: 4, color: 'var(--ui-text-faint)' }}>{hint}</div>}
  </div>
);

export const FormError: React.FC<{ message?: string }> = ({ message }) =>
  message ? (
    <p role="alert" style={{ margin: '8px 0 0', color: 'var(--ui-pr-urgent)', fontSize: 12 }}>{message}</p>
  ) : null;

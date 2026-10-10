import { cloneElement, useId, type ReactElement } from 'react';
import './tokens.css';
import './ui.css';

export interface FieldProps {
  label: string;
  error?: string;
  children: ReactElement;
}

export function Field({ label, error, children }: FieldProps) {
  const generatedId = useId();
  const inputId = children.props.id || generatedId;
  const errorId = `${inputId}-error`;

  const childAriaDescribedBy = children.props['aria-describedby'];
  const ariaDescribedBy = error
    ? [childAriaDescribedBy, errorId].filter(Boolean).join(' ')
    : childAriaDescribedBy;

  const clonedChild = cloneElement(children, {
    id: inputId,
    'aria-invalid': error ? true : children.props['aria-invalid'],
    'aria-describedby': ariaDescribedBy || undefined,
  });

  return (
    <div className="ui-field">
      <label className="ui-field-label" htmlFor={inputId}>
        {label}
      </label>
      {clonedChild}
      {error && (
        <p className="ui-field-error" role="alert" id={errorId}>
          {error}
        </p>
      )}
    </div>
  );
}

import type { SelectHTMLAttributes } from 'react';
import './tokens.css';
import './ui.css';

export interface SelectProps
  extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'onChange' | 'value'> {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}

export function Select({
  value,
  onChange,
  options,
  className,
  ...rest
}: SelectProps) {
  const cls = ['ui-select', className].filter(Boolean).join(' ');
  return (
    <select
      className={cls}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      {...rest}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

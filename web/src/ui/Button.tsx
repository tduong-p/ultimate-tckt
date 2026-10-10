import type { ButtonHTMLAttributes } from 'react';
import './tokens.css';
import './ui.css';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'danger';
  size?: 'sm' | 'md';
}

export function Button({ variant = 'ghost', size = 'md', className, type = 'button', ...rest }: ButtonProps) {
  const cls = ['ui-btn', `ui-btn-${variant}`, `ui-btn-${size}`, className].filter(Boolean).join(' ');
  return <button type={type} className={cls} {...rest} />;
}

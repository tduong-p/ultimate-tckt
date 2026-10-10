import React from 'react';
import { Field } from '../../ui';
import { isHttpUrl } from '../utils/url';

export const LINK_ERROR_MESSAGE = 'Liên kết phải bắt đầu bằng http:// hoặc https://.';

export interface LinkFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  isRequired?: boolean;
  placeholder?: string;
}

/** Ô nhập link; kiểm http(s) phía client, server vẫn kiểm lại. */
export const LinkField: React.FC<LinkFieldProps> = ({
  label,
  value,
  onChange,
  isRequired = false,
  placeholder = 'https://',
}) => {
  const invalid = value.trim() !== '' && !isHttpUrl(value);
  return (
    <Field
      label={`${label}${isRequired ? ' *' : ''}`}
      error={invalid ? LINK_ERROR_MESSAGE : undefined}
    >
      <input
        type="url"
        value={value}
        placeholder={placeholder}
        required={isRequired}
        onChange={(e) => onChange(e.target.value)}
      />
    </Field>
  );
};

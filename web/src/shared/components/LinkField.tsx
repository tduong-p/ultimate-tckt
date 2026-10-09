import React, { useId } from 'react';
import Textfield from '@atlaskit/textfield';
import { token } from '@atlaskit/tokens';
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
export const LinkField: React.FC<LinkFieldProps> = ({ label, value, onChange, isRequired = false, placeholder = 'https://' }) => {
  const id = useId();
  const invalid = value.trim() !== '' && !isHttpUrl(value);
  return (
    <div>
      <label htmlFor={id}>{label}{isRequired ? ' *' : ''}</label>
      <Textfield id={id} type="url" value={value} placeholder={placeholder} isInvalid={invalid} isRequired={isRequired}
        onChange={(e) => onChange((e.target as HTMLInputElement).value)} />
      {invalid && <p role="alert" style={{ color: token('color.text.danger', '#AE2E24'), marginTop: 4 }}>{LINK_ERROR_MESSAGE}</p>}
    </div>
  );
};

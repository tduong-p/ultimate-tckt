import React from 'react';
import { token } from '@atlaskit/tokens';

export interface TeamCheckboxesProps {
  teams: Array<{ id: number; name: string }>;
  value: number[];
  onChange: (ids: number[]) => void;
}

export const TeamCheckboxes: React.FC<TeamCheckboxesProps> = ({ teams, value, onChange }) => (
  <fieldset style={{ border: `1px solid ${token('color.border', '#DFE1E6')}`, borderRadius: 3, padding: '4px 12px 8px', margin: '0 0 12px' }}>
    <legend style={{ fontSize: 12, fontWeight: 600, padding: '0 4px', color: token('color.text.subtle', '#5E6C84') }}>Tổ</legend>
    {teams.length === 0 && <span style={{ fontSize: 13 }}>Chưa có Tổ nào để chọn.</span>}
    {teams.map((t) => {
      const inputId = `team-checkbox-${t.id}`;
      return (
        <div key={t.id}>
          <input
            id={inputId}
            type="checkbox"
            checked={value.includes(t.id)}
            onChange={(e) => onChange(e.target.checked ? [...value, t.id] : value.filter((v) => v !== t.id))}
          />{' '}
          <label htmlFor={inputId}>{t.name}</label>
        </div>
      );
    })}
  </fieldset>
);

import React, { useId, useMemo, useState } from 'react';
import Textfield from '@atlaskit/textfield';
import { token } from '@atlaskit/tokens';
import { normalizeSearch } from '../utils/text';

export interface PickerPerson { id: number; name: string; email?: string | null }

export interface PeoplePickerProps {
  label: string;
  people: PickerPerson[];
  value: number[];
  onChange: (ids: number[]) => void;
  placeholder?: string;
  excludeIds?: number[];
  maxResults?: number;
}

export const PeoplePicker: React.FC<PeoplePickerProps> = ({
  label, people, value, onChange, placeholder = 'Gõ tên hoặc email', excludeIds = [], maxResults = 8,
}) => {
  const inputId = useId();
  const [query, setQuery] = useState('');
  const selected = value.map((id) => people.find((p) => p.id === id)).filter((p): p is PickerPerson => Boolean(p));

  const matches = useMemo(() => {
    const q = normalizeSearch(query);
    if (!q) return [];
    const hidden = new Set([...value, ...excludeIds]);
    return people
      .filter((p) => !hidden.has(p.id))
      .filter((p) => normalizeSearch(`${p.name} ${p.email ?? ''}`).includes(q))
      .slice(0, maxResults);
  }, [query, people, value, excludeIds, maxResults]);

  const add = (id: number) => { onChange([...value, id]); setQuery(''); };
  const remove = (id: number) => onChange(value.filter((v) => v !== id));

  return (
    <div>
      <label htmlFor={inputId}>{label}</label>
      {selected.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, margin: '4px 0' }}>
          {selected.map((p) => (
            <span key={p.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 12, background: token('color.background.neutral', '#F1F2F4') }}>
              <span>{p.name}</span>
              <button type="button" aria-label={`Bỏ ${p.name}`} onClick={() => remove(p.id)} style={{ border: 'none', background: 'none', cursor: 'pointer' }}>×</button>
            </span>
          ))}
        </div>
      )}
      <Textfield id={inputId} value={query} placeholder={placeholder} onChange={(e) => setQuery((e.target as HTMLInputElement).value)} />
      {matches.length > 0 && (
        <ul role="listbox" aria-label={`Gợi ý ${label}`} style={{ listStyle: 'none', margin: 0, padding: 0, border: `1px solid ${token('color.border', '#DFE1E6')}` }}>
          {matches.map((p) => (
            <li key={p.id} role="option" aria-selected={false} tabIndex={0} onClick={() => add(p.id)} onKeyDown={(e) => { if (e.key === 'Enter') add(p.id); }} style={{ padding: '6px 8px', cursor: 'pointer' }}>
              {p.name}{p.email ? ` · ${p.email}` : ''}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

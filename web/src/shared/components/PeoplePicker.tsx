import React, { useId, useMemo, useState } from 'react';
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
      <label htmlFor={inputId} style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--ui-text-2)', marginBottom: 4 }}>
        {label}
      </label>
      {selected.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, margin: '4px 0' }}>
          {selected.map((p) => (
            <span
              key={p.id}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                padding: '2px 8px',
                borderRadius: 12,
                background: 'var(--ui-bg-subtle, #f1f2f4)',
                fontSize: 12,
                color: 'var(--ui-text)',
              }}
            >
              <span>{p.name}</span>
              <button
                type="button"
                aria-label={`Bỏ ${p.name}`}
                onClick={() => remove(p.id)}
                style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--ui-text-2)' }}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
      <input
        id={inputId}
        type="text"
        value={query}
        placeholder={placeholder}
        onChange={(e) => setQuery(e.target.value)}
        style={{
          width: '100%',
          height: 28,
          padding: '0 8px',
          border: '1px solid var(--ui-border-strong)',
          borderRadius: 'var(--ui-radius)',
          background: 'var(--ui-bg-main)',
          fontSize: 12,
          color: 'var(--ui-text)',
          boxSizing: 'border-box',
        }}
      />
      {matches.length > 0 && (
        <ul
          role="listbox"
          aria-label={`Gợi ý ${label}`}
          style={{
            listStyle: 'none',
            margin: '4px 0 0',
            padding: 0,
            border: '1px solid var(--ui-border)',
            borderRadius: 'var(--ui-radius)',
            background: 'var(--ui-bg-card)',
            boxShadow: 'var(--ui-shadow)',
          }}
        >
          {matches.map((p) => (
            <li
              key={p.id}
              role="option"
              aria-selected={false}
              tabIndex={0}
              onClick={() => add(p.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') add(p.id);
              }}
              style={{ padding: '6px 8px', cursor: 'pointer', fontSize: 12, color: 'var(--ui-text)' }}
            >
              {p.name}
              {p.email ? ` · ${p.email}` : ''}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

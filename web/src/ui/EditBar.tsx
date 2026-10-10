import { useEffect, useRef } from 'react';
import { Button } from './Button';
import './tokens.css';
import './ui.css';

export interface EditBarProps {
  dirty: boolean;
  /** Số trường đã đổi. */
  count: number;
  saving: boolean;
  onSave: () => void;
  onDiscard: () => void;
  error?: string;
  /** Khoá nút Lưu (và Mod+Enter) khi màn chưa cho lưu, ví dụ đang chờ xử lý xung đột. */
  saveDisabled?: boolean;
}

const TYPING_SELECTOR = 'input,textarea,select,[contenteditable=""],[contenteditable="true"]';
const IGNORE_SELECTOR = '[role=dialog],[role=menu],[role=listbox]';

/** Thanh Lưu/Hủy hiện khi có thay đổi chưa lưu. `Mod+Enter` lưu, `Escape` hủy (trừ khi đang trong hộp thoại/menu). */
export function EditBar({ dirty, count, saving, onSave, onDiscard, error, saveDisabled = false }: EditBarProps) {
  const latest = useRef({ onSave, onDiscard, saving, saveDisabled });
  latest.current = { onSave, onDiscard, saving, saveDisabled };

  useEffect(() => {
    if (!dirty) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented) return;
      const target = e.target instanceof Element ? e.target : null;
      if (target?.closest(IGNORE_SELECTOR)) return;
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        if (!latest.current.saving && !latest.current.saveDisabled) latest.current.onSave();
      } else if (e.key === 'Escape') {
        if (latest.current.saving || target?.closest(TYPING_SELECTOR)) return;
        e.preventDefault();
        latest.current.onDiscard();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [dirty]);

  if (!dirty) return null;
  return (
    <div className="ui-editbar" role="region" aria-label="Thay đổi chưa lưu">
      <span className="ui-editbar-text">{count} trường đã thay đổi</span>
      {error && <span className="ui-editbar-error" role="alert">{error}</span>}
      <span className="ui-editbar-actions">
        <Button onClick={onDiscard} disabled={saving}>Hủy</Button>
        <Button variant="primary" onClick={onSave} disabled={saving || saveDisabled} aria-busy={saving}>Lưu</Button>
      </span>
    </div>
  );
}

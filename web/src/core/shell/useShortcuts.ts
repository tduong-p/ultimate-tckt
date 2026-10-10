import { useEffect, useRef } from 'react';

export interface ShortcutHandlers {
  /** `c` */
  onCreate?: () => void;
  /** `/` */
  onSearch?: () => void;
  /** `g` rồi `i` trong vòng 1 giây */
  onGoInbox?: () => void;
}

const SEQUENCE_MS = 1000;

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable || target.getAttribute('contenteditable') === 'true' || target.getAttribute('contenteditable') === '') return true;
  return target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT';
}

/** Phím tắt toàn cục; bỏ qua khi đang gõ trong ô nhập hoặc có phím bổ trợ (Ctrl/Cmd/Alt). */
export function useShortcuts(handlers: ShortcutHandlers): void {
  const ref = useRef(handlers);
  ref.current = handlers;

  useEffect(() => {
    let lastG = 0;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey) return;
      if (isTypingTarget(e.target)) return;
      const key = e.key.toLowerCase();
      const now = Date.now();
      const gPending = lastG > 0 && now - lastG <= SEQUENCE_MS;
      lastG = 0;
      if (key === 'g') {
        lastG = now;
      } else if (key === 'i' && gPending) {
        ref.current.onGoInbox?.();
      } else if (key === 'c') {
        ref.current.onCreate?.();
      } else if (key === '/' && ref.current.onSearch) {
        e.preventDefault();
        ref.current.onSearch();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);
}

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import '../../ui/tokens.css';
import '../../ui/ui.css';

export interface ToastApi {
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

export type ToastTone = 'info' | 'success' | 'error';

interface ToastItem {
  id: number;
  message: string;
  tone: ToastTone;
}

const ToastContext = createContext<ToastApi | null>(null);

/** Thông báo ngắn góc màn hình bằng UI kit, tự ẩn sau 4 giây. */
export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const idRef = useRef(0);
  const timersRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
  }, []);

  const push = useCallback(
    (message: string, tone: ToastTone = 'info') => {
      const id = ++idRef.current;
      setToasts((prev) => [...prev, { id, message, tone }]);
      const timer = setTimeout(() => {
        dismiss(id);
      }, 4000);
      timersRef.current.set(id, timer);
    },
    [dismiss]
  );

  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      timers.forEach((t) => clearTimeout(t));
      timers.clear();
    };
  }, []);

  const api = useMemo<ToastApi>(
    () => ({
      success: (msg) => push(msg, 'success'),
      error: (msg) => push(msg, 'error'),
      info: (msg) => push(msg, 'info'),
    }),
    [push]
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="ui-toast-region" aria-live="polite">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`ui-toast ui-toast-${toast.tone}`}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export function useToast(): ToastApi {
  const api = useContext(ToastContext);
  if (!api) throw new Error('useToast phải dùng bên trong ToastProvider');
  return api;
}

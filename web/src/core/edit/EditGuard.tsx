import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Button, Dialog } from '../../ui';

interface GuardApi {
  register(id: symbol, dirty: boolean): void;
  unregister(id: symbol): void;
  confirmNavigate(go: () => void): void;
}

const GuardContext = createContext<GuardApi | null>(null);

/**
 * Chặn rời trang khi còn thay đổi chưa lưu. HashRouter không có `useBlocker`, nên ngoài `confirmNavigate`
 * (cho nút/link do màn tự điều khiển) provider còn nghe `hashchange`: khi dirty thì trả hash về chỗ cũ rồi hỏi.
 */
export function EditGuardProvider({ children }: { children: ReactNode }) {
  const dirtyIds = useRef(new Set<symbol>());
  const [pending, setPending] = useState<(() => void) | null>(null);
  const lastHash = useRef(typeof window === 'undefined' ? '' : window.location.hash);
  const reverting = useRef(false);
  const bypass = useRef(false);

  const isDirty = useCallback(() => dirtyIds.current.size > 0, []);

  const register = useCallback((id: symbol, dirty: boolean) => {
    if (dirty) dirtyIds.current.add(id);
    else dirtyIds.current.delete(id);
  }, []);
  const unregister = useCallback((id: symbol) => { dirtyIds.current.delete(id); }, []);

  const confirmNavigate = useCallback((go: () => void) => {
    if (!isDirty()) { go(); return; }
    setPending(() => go);
  }, [isDirty]);

  // Chặn ở pha capture, TRƯỚC khi React/router xử lý click: HashRouter nghe popstate (bắn trước hashchange)
  // nên nếu để hashchange chặn thì màn giữ nháp đã bị unmount.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      if (!isDirty()) return;
      const anchor = e.target instanceof Element ? e.target.closest('a[href^="#"]') : null;
      if (!anchor || (anchor.getAttribute('target') ?? '_self') !== '_self') return;
      const href = anchor.getAttribute('href') ?? '';
      if (href === window.location.hash) return;
      e.preventDefault();
      e.stopPropagation();
      setPending(() => () => { bypass.current = true; window.location.hash = href; });
    };
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, [isDirty]);

  useEffect(() => {
    const onHashChange = () => {
      const current = window.location.hash;
      if (reverting.current) { reverting.current = false; lastHash.current = current; return; }
      if (bypass.current) { bypass.current = false; lastHash.current = current; return; }
      if (!isDirty() || current === lastHash.current) { lastHash.current = current; return; }
      const target = current;
      reverting.current = true;
      window.location.hash = lastHash.current;
      setPending(() => () => { bypass.current = true; window.location.hash = target; });
    };
    // Giới hạn đã chấp nhận: đường dự phòng này (Back/Forward, gõ URL) chạy sau khi router đã đổi route nên màn có thể đã
    // unmount; việc trả hash còn thêm/đổi một mục lịch sử. Màn phải giữ phiên sửa ở component route-level hoặc cha sống qua đổi route.
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, [isDirty]);

  const api = useMemo<GuardApi>(() => ({ register, unregister, confirmNavigate }), [register, unregister, confirmNavigate]);

  const stay = () => setPending(null);
  const leave = () => {
    const go = pending;
    setPending(null);
    go?.();
    // `bypass` chỉ cho đúng một lần điều hướng; hashchange tự xoá, đây là lưới an toàn nếu hash không đổi.
    setTimeout(() => { bypass.current = false; }, 100);
  };

  return (
    <GuardContext.Provider value={api}>
      {children}
      <Dialog
        open={pending !== null}
        onOpenChange={(open) => { if (!open) stay(); }}
        title="Thay đổi chưa lưu"
        footer={(
          <>
            <Button onClick={stay}>Ở lại</Button>
            <Button variant="danger" onClick={leave}>Bỏ thay đổi</Button>
          </>
        )}
      >
        Bạn có thay đổi chưa lưu. Rời đi sẽ mất các thay đổi này.
      </Dialog>
    </GuardContext.Provider>
  );
}

/** Màn nào có nháp gọi hook này với cờ `dirty` của phiên sửa. */
export function useEditGuard(dirty: boolean): void {
  const ctx = useContext(GuardContext);
  const id = useRef(Symbol('edit-guard')).current;

  useEffect(() => {
    ctx?.register(id, dirty);
  }, [ctx, id, dirty]);
  useEffect(() => () => ctx?.unregister(id), [ctx, id]);

  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [dirty]);
}

/** Bọc một hành động điều hướng: dirty thì hỏi xác nhận trước khi chạy `go`. Ngoài provider thì chạy ngay. */
export function useConfirmNavigate(): (go: () => void) => void {
  const ctx = useContext(GuardContext);
  return useCallback((go) => (ctx ? ctx.confirmNavigate(go) : go()), [ctx]);
}

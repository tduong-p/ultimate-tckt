import { useCallback, useMemo, useRef, useState } from 'react';
import { classifyBatchError, type BatchError } from './editApi';

type Draft = Record<string, unknown>;

export type SaveResult = { ok: true } | ({ ok: false } & BatchError);

export interface EditSession<T> {
  /** Nháp nếu có, không thì bản gốc. */
  value<K extends keyof T>(key: K): T[K];
  set<K extends keyof T>(key: K, v: T[K]): void;
  dirty: boolean;
  changedKeys: (keyof T)[];
  save(): Promise<SaveResult>;
  discard(): void;
  saving: boolean;
}

export interface UseEditSessionOptions<T> {
  original: T;
  /** Danh sách trường được sửa (`editable[]` từ GET chi tiết). Trường khác bị `set` bỏ qua. */
  editable: string[];
  patch: (changes: Draft, base: Draft) => Promise<unknown>;
  /**
   * Gọi sau khi lưu thành công; nên trả promise của refetch để nháp chỉ bị xoá khi bản gốc mới đã về (không nháy giá trị cũ).
   * Lỗi trong `onSaved` bị bỏ qua: bản lưu đã thành công nên `save()` vẫn trả `{ok:true}`.
   *
   * Hợp đồng khi `save()` trả `conflict`: nháp được giữ, nhưng màn PHẢI refetch `original`.
   * "Lấy bản mới" = `discard()` + refetch; "Giữ của tôi" = refetch rồi `save()` lại — `base` luôn lấy từ `original` mới nhất.
   */
  onSaved?: () => void | Promise<unknown>;
}

export function deepEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const ka = Object.keys(a);
  const kb = Object.keys(b);
  if (ka.length !== kb.length) return false;
  return ka.every((k) => deepEqual((a as Draft)[k], (b as Draft)[k]));
}

export function useEditSession<T extends object>(opts: UseEditSessionOptions<T>): EditSession<T> {
  const { original } = opts;
  const [draft, setDraft] = useState<Draft>({});
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const inFlight = useRef<Promise<SaveResult> | null>(null);
  // Ghi ref lúc render là chủ ý: `save()` ổn định (không đổi identity) nhưng luôn đọc `original`/`patch` mới nhất.
  const latest = useRef(opts);
  latest.current = opts;

  // Chỉ giữ khoá còn khác bản gốc hiện tại (sửa lại về gốc, hoặc gốc mới đã bằng nháp thì rơi khỏi nháp).
  const effective = useMemo(() => {
    const out: Draft = {};
    for (const [k, v] of Object.entries(draft)) {
      if (!deepEqual(v, (original as Draft)[k])) out[k] = v;
    }
    return out;
  }, [draft, original]);
  const effectiveRef = useRef(effective);
  effectiveRef.current = effective;

  const changedKeys = Object.keys(effective) as (keyof T)[];

  const set = useCallback(<K extends keyof T>(key: K, v: T[K]) => {
    if (savingRef.current) return;
    if (!latest.current.editable.includes(key as string)) return;
    setDraft((d) => ({ ...d, [key as string]: v }));
  }, []);

  const value = useCallback(
    <K extends keyof T>(key: K): T[K] =>
      (key as string) in effective ? (effective[key as string] as T[K]) : original[key],
    [effective, original]
  );

  const discard = useCallback(() => {
    if (savingRef.current) return;
    setDraft({});
  }, []);

  const save = useCallback((): Promise<SaveResult> => {
    if (inFlight.current) return inFlight.current;
    const changes = effectiveRef.current;
    const keys = Object.keys(changes);
    if (keys.length === 0) return Promise.resolve({ ok: true });
    const base: Draft = {};
    for (const k of keys) base[k] = (latest.current.original as Draft)[k];

    savingRef.current = true;
    setSaving(true);
    const run = (async (): Promise<SaveResult> => {
      try {
        await latest.current.patch(changes, base);
      } catch (err) {
        savingRef.current = false;
        inFlight.current = null;
        setSaving(false);
        return { ok: false, ...classifyBatchError(err) };
      }
      try {
        await latest.current.onSaved?.();
      } catch {
        // bản lưu đã thành công; lỗi refetch không được biến thành lỗi lưu.
      }
      setDraft({});
      savingRef.current = false;
      inFlight.current = null;
      setSaving(false);
      return { ok: true };
    })();
    inFlight.current = run;
    return run;
  }, []);

  return { value, set, dirty: changedKeys.length > 0, changedKeys, save, discard, saving };
}

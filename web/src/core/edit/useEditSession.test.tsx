import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useEditSession } from './useEditSession';

interface T { title: string; deadline: string; ids: number[]; locked: string }
const orig: T = { title: 'A', deadline: '2026-10-10', ids: [1, 2], locked: 'L' };
const editable = ['title', 'deadline', 'ids'];

function setup(patch = vi.fn().mockResolvedValue(undefined), onSaved = vi.fn(), original: T = orig) {
  const hook = renderHook((p: { original: T }) => useEditSession<T>({ original: p.original, editable, patch, onSaved }), {
    initialProps: { original },
  });
  return { ...hook, patch, onSaved };
}

describe('useEditSession', () => {
  it('value trả nháp hoặc gốc; chỉ gửi trường đổi cùng base gốc', async () => {
    const { result, patch, onSaved } = setup();
    act(() => result.current.set('title', 'B'));
    expect(result.current.value('title')).toBe('B');
    expect(result.current.value('deadline')).toBe('2026-10-10');
    expect(result.current.dirty).toBe(true);
    expect(result.current.changedKeys).toEqual(['title']);
    let r: unknown;
    await act(async () => { r = await result.current.save(); });
    expect(r).toEqual({ ok: true });
    expect(patch).toHaveBeenCalledWith({ title: 'B' }, { title: 'A' });
    expect(onSaved).toHaveBeenCalled();
    expect(result.current.dirty).toBe(false);
  });

  it('sửa rồi trả về giá trị gốc -> dirty=false', () => {
    const { result } = setup();
    act(() => result.current.set('title', 'B'));
    act(() => result.current.set('title', 'A'));
    expect(result.current.dirty).toBe(false);
    expect(result.current.changedKeys).toEqual([]);
  });

  it('so sánh mảng theo cấu trúc', () => {
    const { result } = setup();
    act(() => result.current.set('ids', [1, 2]));
    expect(result.current.dirty).toBe(false);
    act(() => result.current.set('ids', [2, 1]));
    expect(result.current.dirty).toBe(true);
  });

  it('trường ngoài editable bị bỏ qua', () => {
    const { result } = setup();
    act(() => result.current.set('locked', 'X'));
    expect(result.current.dirty).toBe(false);
    expect(result.current.value('locked')).toBe('L');
  });

  it('409 giữ nháp và trả conflict', async () => {
    const patch = vi.fn().mockRejectedValue({ response: { status: 409, data: { conflicts: ['title'] } } });
    const { result, onSaved } = setup(patch);
    act(() => result.current.set('title', 'B'));
    let r: any;
    await act(async () => { r = await result.current.save(); });
    expect(r).toMatchObject({ ok: false, kind: 'conflict', fields: ['title'] });
    expect(result.current.value('title')).toBe('B');
    expect(result.current.dirty).toBe(true);
    expect(onSaved).not.toHaveBeenCalled();
    expect(result.current.saving).toBe(false);
  });

  it('discard trả về bản gốc', () => {
    const { result } = setup();
    act(() => result.current.set('title', 'B'));
    act(() => result.current.discard());
    expect(result.current.value('title')).toBe('A');
    expect(result.current.dirty).toBe(false);
  });

  it('không gửi hai lần khi đang lưu; set bị bỏ qua khi saving', async () => {
    let resolve!: () => void;
    const patch = vi.fn().mockImplementation(() => new Promise<void>((r) => { resolve = r; }));
    const { result } = setup(patch);
    act(() => result.current.set('title', 'B'));
    let p1!: Promise<unknown>; let p2!: Promise<unknown>;
    act(() => { p1 = result.current.save(); p2 = result.current.save(); });
    expect(result.current.saving).toBe(true);
    act(() => result.current.set('title', 'C'));
    expect(result.current.value('title')).toBe('B');
    await act(async () => { resolve(); await Promise.all([p1, p2]); });
    expect(patch).toHaveBeenCalledTimes(1);
    expect(await p2).toEqual({ ok: true });
  });

  it('original đổi khi đang dirty: giữ khoá còn khác, bỏ khoá đã bằng gốc mới', () => {
    const { result, rerender } = setup();
    act(() => { result.current.set('title', 'B'); result.current.set('deadline', '2026-11-01'); });
    rerender({ original: { ...orig, deadline: '2026-11-01', title: 'Z' } });
    expect(result.current.changedKeys).toEqual(['title']);
    expect(result.current.value('title')).toBe('B');
    expect(result.current.value('deadline')).toBe('2026-11-01');
  });

  it('lỗi 400/403 trả kind tương ứng và giữ nháp', async () => {
    const patch = vi.fn().mockRejectedValue({ response: { status: 403, data: { forbidden: ['title'] } } });
    const { result } = setup(patch);
    act(() => result.current.set('title', 'B'));
    let r: any;
    await act(async () => { r = await result.current.save(); });
    expect(r).toMatchObject({ ok: false, kind: 'forbidden', fields: ['title'] });
    expect(result.current.dirty).toBe(true);
  });

  it('save khi không dirty trả ok mà không gọi patch', async () => {
    const { result, patch } = setup();
    let r: any;
    await act(async () => { r = await result.current.save(); });
    expect(r).toEqual({ ok: true });
    expect(patch).not.toHaveBeenCalled();
  });

  it('sau conflict, original đổi (refetch) thì lưu lại mang base mới', async () => {
    const patch = vi.fn()
      .mockRejectedValueOnce({ response: { status: 409, data: { conflicts: ['title'] } } })
      .mockResolvedValue(undefined);
    const { result, rerender } = setup(patch);
    act(() => result.current.set('title', 'B'));
    await act(async () => { await result.current.save(); });
    rerender({ original: { ...orig, title: 'Z' } });
    expect(result.current.value('title')).toBe('B');
    await act(async () => { await result.current.save(); });
    expect(patch).toHaveBeenLastCalledWith({ title: 'B' }, { title: 'Z' });
  });

  it('onSaved bất đồng bộ xong rồi mới xoá nháp (không nháy về giá trị cũ)', async () => {
    let done!: () => void;
    const onSaved = vi.fn(() => new Promise<void>((r) => { done = r; }));
    const { result } = setup(vi.fn().mockResolvedValue(undefined), onSaved);
    act(() => result.current.set('title', 'B'));
    let p!: Promise<unknown>;
    act(() => { p = result.current.save(); });
    await act(async () => { await Promise.resolve(); await Promise.resolve(); });
    expect(result.current.value('title')).toBe('B');
    await act(async () => { done(); await p; });
    expect(result.current.dirty).toBe(false);
  });

  it('onSaved ném lỗi vẫn trả ok', async () => {
    const { result } = setup(vi.fn().mockResolvedValue(undefined), vi.fn((): void => { throw new Error('x'); }));
    act(() => result.current.set('title', 'B'));
    let r: unknown;
    await act(async () => { r = await result.current.save(); });
    expect(r).toEqual({ ok: true });
    expect(result.current.dirty).toBe(false);
  });
});

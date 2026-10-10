import { HashRouter, Link, Route, Routes } from 'react-router-dom';
import { useState } from 'react';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import '../../ui/test-setup';
import { EditGuardProvider, useEditGuard, useConfirmNavigate } from './EditGuard';

beforeAll(() => {
  window.HTMLElement.prototype.hasPointerCapture ??= () => false;
  window.HTMLElement.prototype.setPointerCapture ??= () => {};
  window.HTMLElement.prototype.releasePointerCapture ??= () => {};
});
afterEach(() => { window.location.hash = ''; });

function Screen({ dirty, onGo }: { dirty: boolean; onGo?: () => void }) {
  useEditGuard(dirty);
  const confirmNavigate = useConfirmNavigate();
  return <button onClick={() => confirmNavigate(onGo ?? (() => {}))}>đi</button>;
}

const wrap = (dirty: boolean, onGo?: () => void) =>
  render(<EditGuardProvider><Screen dirty={dirty} onGo={onGo} /></EditGuardProvider>);

describe('useEditGuard beforeunload', () => {
  it('đăng ký khi dirty, gỡ khi hết dirty', () => {
    const add = vi.spyOn(window, 'addEventListener');
    const remove = vi.spyOn(window, 'removeEventListener');
    const { rerender } = wrap(true);
    expect(add.mock.calls.some((c) => c[0] === 'beforeunload')).toBe(true);
    const ev = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(ev);
    expect(ev.defaultPrevented).toBe(true);
    rerender(<EditGuardProvider><Screen dirty={false} /></EditGuardProvider>);
    expect(remove.mock.calls.some((c) => c[0] === 'beforeunload')).toBe(true);
    const ev2 = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(ev2);
    expect(ev2.defaultPrevented).toBe(false);
    add.mockRestore(); remove.mockRestore();
  });

  it('gỡ khi unmount', () => {
    const { unmount } = wrap(true);
    unmount();
    const ev = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(ev);
    expect(ev.defaultPrevented).toBe(false);
  });
});

describe('confirmNavigate', () => {
  it('không dirty -> chạy ngay', async () => {
    const go = vi.fn();
    wrap(false, go);
    await userEvent.click(screen.getByText('đi'));
    expect(go).toHaveBeenCalled();
  });

  it('dirty -> hỏi; Ở lại không chạy, Bỏ thay đổi thì chạy', async () => {
    const go = vi.fn();
    wrap(true, go);
    await userEvent.click(screen.getByText('đi'));
    expect(go).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Ở lại' }));
    expect(go).not.toHaveBeenCalled();
    await userEvent.click(screen.getByText('đi'));
    await userEvent.click(screen.getByRole('button', { name: 'Bỏ thay đổi' }));
    expect(go).toHaveBeenCalledTimes(1);
  });
});

describe('hashchange guard', () => {
  async function changeHash(next: string) {
    await act(async () => {
      window.location.hash = next;
      await new Promise((r) => setTimeout(r, 20));
    });
  }

  it('dirty: hash bị trả lại và hỏi; Ở lại giữ nguyên hash cũ', async () => {
    window.location.hash = '#/a';
    wrap(true);
    await changeHash('#/b');
    expect(window.location.hash).toBe('#/a');
    await userEvent.click(screen.getByRole('button', { name: 'Ở lại' }));
    expect(window.location.hash).toBe('#/a');
  });

  it('Bỏ thay đổi áp dụng hash mới', async () => {
    window.location.hash = '#/a';
    wrap(true);
    await changeHash('#/b');
    await userEvent.click(screen.getByRole('button', { name: 'Bỏ thay đổi' }));
    await act(async () => { await new Promise((r) => setTimeout(r, 20)); });
    expect(window.location.hash).toBe('#/b');
  });

  it('không dirty: hash đổi bình thường, không hỏi', async () => {
    window.location.hash = '#/a';
    wrap(false);
    await changeHash('#/b');
    expect(window.location.hash).toBe('#/b');
    expect(screen.queryByRole('button', { name: 'Ở lại' })).toBeNull();
  });
});

describe('tích hợp HashRouter + Link', () => {
  function PageA() {
    const [text, setText] = useState('');
    useEditGuard(text !== '');
    return (
      <div>
        <input aria-label="nháp" value={text} onChange={(e) => setText(e.target.value)} />
        <Link to="/b">sang B</Link>
      </div>
    );
  }
  const app = () => render(
    <HashRouter>
      <EditGuardProvider>
        <Routes>
          <Route path="/b" element={<div>trang B</div>} />
          <Route path="*" element={<PageA />} />
        </Routes>
      </EditGuardProvider>
    </HashRouter>,
  );

  it('Ở lại: giữ nháp và route không đổi', async () => {
    window.location.hash = '#/';
    app();
    await userEvent.type(screen.getByLabelText('nháp'), 'abc');
    await userEvent.click(screen.getByText('sang B'));
    await userEvent.click(screen.getByRole('button', { name: 'Ở lại' }));
    expect(screen.getByLabelText('nháp')).toHaveValue('abc');
    expect(screen.queryByText('trang B')).toBeNull();
    expect(window.location.hash).toBe('#/');
  });

  it('Bỏ thay đổi: chuyển sang route mới', async () => {
    window.location.hash = '#/';
    app();
    await userEvent.type(screen.getByLabelText('nháp'), 'abc');
    await userEvent.click(screen.getByText('sang B'));
    await userEvent.click(screen.getByRole('button', { name: 'Bỏ thay đổi' }));
    expect(await screen.findByText('trang B')).toBeInTheDocument();
  });

  it('không dirty: Link đi thẳng', async () => {
    window.location.hash = '#/';
    app();
    await userEvent.click(screen.getByText('sang B'));
    expect(await screen.findByText('trang B')).toBeInTheDocument();
  });
});

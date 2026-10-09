import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { ToastProvider, useToast } from './Toast';

const Trigger = () => {
  const toast = useToast();
  return (
    <>
      <button onClick={() => toast.success('Đã lưu')}>ok</button>
      <button onClick={() => toast.error('Không lưu được')}>err</button>
    </>
  );
};

describe('Toast', () => {
  afterEach(cleanup);

  it('hiện thông báo thành công và lỗi', async () => {
    render(<ToastProvider><Trigger /></ToastProvider>);
    fireEvent.click(screen.getByText('ok'));
    expect(await screen.findByText('Đã lưu')).toBeDefined();
    fireEvent.click(screen.getByText('err'));
    expect(await screen.findByText('Không lưu được')).toBeDefined();
  });

  it('dùng ngoài provider thì báo lỗi rõ ràng', () => {
    // React ghi lỗi của error boundary ra console; đây là lỗi có chủ đích nên tắt log.
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const Bad = () => { useToast(); return null; };
    expect(() => render(<Bad />)).toThrow(/ToastProvider/);
    spy.mockRestore();
  });
});

import './test-setup';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider, useToast } from './Toast';

function TestConsumer() {
  const { push } = useToast();
  return (
    <div>
      <button type="button" onClick={() => push('Thông báo thường')}>
        Bắn Toast thường
      </button>
      <button type="button" onClick={() => push('Thao tác thành công', 'success')}>
        Bắn Toast thành công
      </button>
      <button type="button" onClick={() => push('Đã có lỗi xảy ra', 'error')}>
        Bắn Toast lỗi
      </button>
    </div>
  );
}

describe('Toast', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('hiển thị vùng thông báo role="status" và aria-live="polite"', () => {
    render(
      <ToastProvider>
        <div>Nội dung</div>
      </ToastProvider>
    );

    const region = screen.getByRole('status');
    expect(region).toBeInTheDocument();
    expect(region).toHaveClass('ui-toast-region');
    expect(region).toHaveAttribute('aria-live', 'polite');
  });

  it('bắn toast và tự động biến mất sau 4000ms', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

    render(
      <ToastProvider>
        <TestConsumer />
      </ToastProvider>
    );

    expect(screen.queryByText('Thao tác thành công')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Bắn Toast thành công' }));

    const toast = screen.getByText('Thao tác thành công');
    expect(toast).toBeInTheDocument();
    expect(toast).toHaveClass('ui-toast', 'ui-toast-success');

    // Tiến thêm 3999ms, toast vẫn còn
    act(() => {
      vi.advanceTimersByTime(3999);
    });
    expect(screen.getByText('Thao tác thành công')).toBeInTheDocument();

    // Đúng 4000ms, toast tự biến mất
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(screen.queryByText('Thao tác thành công')).not.toBeInTheDocument();
  });

  it('hỗ trợ các tone khác nhau (info, error)', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

    render(
      <ToastProvider>
        <TestConsumer />
      </ToastProvider>
    );

    await user.click(screen.getByRole('button', { name: 'Bắn Toast thường' }));
    await user.click(screen.getByRole('button', { name: 'Bắn Toast lỗi' }));

    const infoToast = screen.getByText('Thông báo thường');
    const errorToast = screen.getByText('Đã có lỗi xảy ra');

    expect(infoToast).toHaveClass('ui-toast-info');
    expect(errorToast).toHaveClass('ui-toast-error');
  });

  it('báo lỗi rõ ràng khi gọi useToast ngoài ToastProvider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<TestConsumer />)).toThrow(
      'useToast must be used within a ToastProvider'
    );
    spy.mockRestore();
  });
});

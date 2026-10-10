import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { ErrorBoundary } from './ErrorBoundary';

const Boom: React.FC<{ shouldThrow: boolean }> = ({ shouldThrow }) => {
  if (shouldThrow) {
    throw new Error('Lỗi kết xuất thử nghiệm');
  }
  return <div>Nội dung bình thường</div>;
};

describe('ErrorBoundary', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('hiển thị nội dung con khi không có lỗi', () => {
    render(
      <ErrorBoundary>
        <Boom shouldThrow={false} />
      </ErrorBoundary>
    );
    expect(screen.getByText('Nội dung bình thường')).toBeDefined();
  });

  it('bắt lỗi kết xuất, hiển thị thông báo tiếng Việt và cho phép thử lại', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { rerender } = render(
      <ErrorBoundary>
        <Boom shouldThrow={true} />
      </ErrorBoundary>
    );
    expect(screen.getByRole('alert')).toBeDefined();
    expect(screen.getByText('Đã xảy ra lỗi hiển thị')).toBeDefined();
    expect(screen.getByText(/Lỗi kết xuất thử nghiệm/)).toBeDefined();

    rerender(
      <ErrorBoundary>
        <Boom shouldThrow={false} />
      </ErrorBoundary>
    );
    fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }));
    expect(screen.getByText('Nội dung bình thường')).toBeDefined();
  });
});

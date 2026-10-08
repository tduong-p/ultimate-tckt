import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { LottieLoading } from './LottieLoading';

describe('LottieLoading Component', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders loading animation container with default message', () => {
    render(<LottieLoading />);

    expect(screen.getByTestId('lottie-loading')).toBeDefined();
    expect(screen.getByText('Đang tải...')).toBeDefined();
  });

  it('renders custom message and respects fullScreen prop', () => {
    render(<LottieLoading message="Đang kết nối hệ thống..." fullScreen />);

    const container = screen.getByTestId('lottie-loading');
    expect(container).toBeDefined();
    expect(screen.getByText('Đang kết nối hệ thống...')).toBeDefined();
    expect(container.style.position).toBe('fixed');
  });
});

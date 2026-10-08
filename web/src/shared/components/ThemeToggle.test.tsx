import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { ThemeToggle } from './ThemeToggle';

describe('ThemeToggle Component', () => {
  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  it('renders switch button with correct initial aria attributes for light mode', () => {
    render(<ThemeToggle theme="light" />);

    const switchBtn = screen.getByRole('switch', { name: /Chuyển sang chế độ tối/i });
    expect(switchBtn).toBeDefined();
    expect(switchBtn.getAttribute('aria-checked')).toBe('false');
    expect(screen.getByTestId('theme-toggle')).toBeDefined();
  });

  it('renders switch button with correct initial aria attributes for dark mode', () => {
    render(<ThemeToggle theme="dark" />);

    const switchBtn = screen.getByRole('switch', { name: /Chuyển sang chế độ sáng/i });
    expect(switchBtn).toBeDefined();
    expect(switchBtn.getAttribute('aria-checked')).toBe('true');
  });

  it('triggers onToggle callback and toggles mode when clicked', () => {
    const handleToggle = vi.fn();
    render(<ThemeToggle theme="light" onToggle={handleToggle} />);

    const switchBtn = screen.getByTestId('theme-toggle');
    fireEvent.click(switchBtn);

    expect(handleToggle).toHaveBeenCalledWith('dark');
  });

  it('operates in uncontrolled mode using internal useTheme', () => {
    render(<ThemeToggle />);

    const switchBtn = screen.getByTestId('theme-toggle');
    expect(switchBtn).toBeDefined();
    fireEvent.click(switchBtn);

    expect(switchBtn.getAttribute('aria-checked')).toBe('true');
  });
});

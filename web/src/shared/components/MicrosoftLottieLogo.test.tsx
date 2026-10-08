import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { MicrosoftLottieLogo } from './MicrosoftLottieLogo';

describe('MicrosoftLottieLogo Component', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders with default size and testid', () => {
    render(<MicrosoftLottieLogo />);

    const logo = screen.getByTestId('microsoft-lottie-logo');
    expect(logo).toBeDefined();
    expect(logo.style.width).toBe('22px');
    expect(logo.style.height).toBe('22px');
  });

  it('applies custom size and styles', () => {
    render(<MicrosoftLottieLogo size={28} style={{ opacity: 0.9 }} />);

    const logo = screen.getByTestId('microsoft-lottie-logo');
    expect(logo).toBeDefined();
    expect(logo.style.width).toBe('28px');
    expect(logo.style.height).toBe('28px');
    expect(logo.style.opacity).toBe('0.9');
  });
});

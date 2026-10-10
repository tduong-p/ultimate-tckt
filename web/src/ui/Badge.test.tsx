import './test-setup';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Badge, type BadgeTone } from './Badge';

describe('Badge', () => {
  it('mặc định hiển thị tone neutral và hiển thị nội dung children', () => {
    render(<Badge>Mặc định</Badge>);
    const badge = screen.getByText('Mặc định');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass('ui-badge', 'ui-badge-neutral');
  });

  const tones: BadgeTone[] = ['neutral', 'info', 'success', 'warning', 'danger'];

  it.each(tones)('áp dụng đúng class ui-badge-%s cho tone tương ứng', (tone) => {
    render(<Badge tone={tone}>Nhãn {tone}</Badge>);
    const badge = screen.getByText(`Nhãn ${tone}`);
    expect(badge).toHaveClass('ui-badge', `ui-badge-${tone}`);
  });
});

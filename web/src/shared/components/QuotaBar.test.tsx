import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { QuotaBar } from './QuotaBar';

describe('QuotaBar', () => {
  afterEach(cleanup);

  it('hiện dung lượng đã dùng trên 50 MB', () => {
    render(<QuotaBar usedBytes={13107200} />);
    expect(screen.getByText('Đã dùng 12,5 MB / 50 MB')).toBeDefined();
  });

  it('vượt hạn mức vẫn không vỡ thanh (giá trị tối đa 1)', () => {
    render(<QuotaBar usedBytes={60 * 1024 * 1024} />);
    expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('1');
  });
});

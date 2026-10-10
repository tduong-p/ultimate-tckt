import './test-setup';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PriorityIcon, type Priority } from './PriorityIcon';

describe('PriorityIcon', () => {
  const cases: { priority: Priority; label: string }[] = [
    { priority: 'none', label: 'Không ưu tiên' },
    { priority: 'low', label: 'Thấp' },
    { priority: 'medium', label: 'Trung bình' },
    { priority: 'high', label: 'Cao' },
    { priority: 'urgent', label: 'Khẩn cấp' },
  ];

  it.each(cases)(
    'hiển thị đúng aria-label tiếng Việt cho mức ưu tiên $priority',
    ({ priority, label }) => {
      render(<PriorityIcon priority={priority} />);
      const icon = screen.getByRole('img', { name: label });
      expect(icon).toBeInTheDocument();
      expect(icon).toHaveAttribute('width', '14');
      expect(icon).toHaveAttribute('height', '14');
    }
  );

  it('áp dụng kích thước tuỳ chỉnh', () => {
    render(<PriorityIcon priority="urgent" size={20} />);
    const icon = screen.getByRole('img', { name: 'Khẩn cấp' });
    expect(icon).toHaveAttribute('width', '20');
    expect(icon).toHaveAttribute('height', '20');
  });
});

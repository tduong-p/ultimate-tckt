import './test-setup';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { StatusIcon, type Status } from './StatusIcon';

describe('StatusIcon', () => {
  const cases: { status: Status; label: string }[] = [
    { status: 'todo', label: 'Cần làm' },
    { status: 'in_progress', label: 'Đang làm' },
    { status: 'review', label: 'Chờ duyệt' },
    { status: 'done', label: 'Hoàn thành' },
    { status: 'cancelled', label: 'Đã huỷ' },
  ];

  it.each(cases)(
    'hiển thị đúng aria-label tiếng Việt cho trạng thái $status',
    ({ status, label }) => {
      render(<StatusIcon status={status} />);
      const icon = screen.getByRole('img', { name: label });
      expect(icon).toBeInTheDocument();
      expect(icon).toHaveAttribute('width', '14');
      expect(icon).toHaveAttribute('height', '14');
    }
  );

  it('áp dụng kích thước tuỳ chỉnh', () => {
    render(<StatusIcon status="done" size={24} />);
    const icon = screen.getByRole('img', { name: 'Hoàn thành' });
    expect(icon).toHaveAttribute('width', '24');
    expect(icon).toHaveAttribute('height', '24');
  });

  it('hỗ trợ tiêu đề tuỳ chọn', () => {
    render(<StatusIcon status="todo" title="Việc cần hoàn thành sớm" />);
    const icon = screen.getByRole('img', { name: 'Việc cần hoàn thành sớm – Cần làm' });
    expect(icon).toBeInTheDocument();
  });
});

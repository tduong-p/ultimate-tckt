import './test-setup';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Button } from './Button';

describe('Button', () => {
  it('gọi onClick khi bấm', async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Lưu</Button>);
    await userEvent.click(screen.getByRole('button', { name: 'Lưu' }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('không gọi onClick khi disabled', async () => {
    const onClick = vi.fn();
    render(<Button disabled onClick={onClick}>Lưu</Button>);
    await userEvent.click(screen.getByRole('button', { name: 'Lưu' }));
    expect(onClick).not.toHaveBeenCalled();
  });

  it('mặc định type=button và áp variant/size', () => {
    render(<Button variant="danger" size="sm">Xoá</Button>);
    const b = screen.getByRole('button', { name: 'Xoá' });
    expect(b).toHaveAttribute('type', 'button');
    expect(b).toHaveClass('ui-btn-danger', 'ui-btn-sm');
  });

  it('nút chỉ có icon phải truyền aria-label để có tên truy cập', () => {
    render(<Button aria-label="Đóng"><svg aria-hidden="true" /></Button>);
    expect(screen.getByRole('button', { name: 'Đóng' })).toBeInTheDocument();
  });
});

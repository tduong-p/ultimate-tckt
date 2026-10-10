import './test-setup';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Avatar } from './Avatar';

describe('Avatar', () => {
  it('hiển thị chữ cái đầu khi không có src và có thuộc tính role="img" aria-label', () => {
    render(<Avatar name="Nguyễn Văn An" />);

    const avatar = screen.getByRole('img', { name: 'Nguyễn Văn An' });
    expect(avatar).toBeInTheDocument();
    expect(avatar).toHaveTextContent('VA');
    expect(avatar).toHaveClass('ui-avatar');
    expect(avatar).toHaveStyle({ width: '20px', height: '20px' });
  });

  it('xử lý chữ cái đầu cho tên một từ hoặc tên 2 từ', () => {
    const { rerender } = render(<Avatar name="Nam" />);
    expect(screen.getByRole('img', { name: 'Nam' })).toHaveTextContent('NA');

    rerender(<Avatar name="Trần Bình" />);
    expect(screen.getByRole('img', { name: 'Trần Bình' })).toHaveTextContent('TB');
  });

  it('tạo màu nền nhất quán (deterministic) theo tên', () => {
    const { container: c1 } = render(<Avatar name="Lê Hoàng" />);
    const bg1 = (c1.firstChild as HTMLElement).style.backgroundColor;

    const { container: c2 } = render(<Avatar name="Lê Hoàng" />);
    const bg2 = (c2.firstChild as HTMLElement).style.backgroundColor;

    expect(bg1).toBe(bg2);
  });

  it('hiển thị thẻ img với alt={name} khi có src', () => {
    render(<Avatar name="Lê Hoàng" src="https://example.com/avatar.png" size={32} />);

    const img = screen.getByRole('img', { name: 'Lê Hoàng' });
    expect(img.tagName).toBe('IMG');
    expect(img).toHaveAttribute('src', 'https://example.com/avatar.png');
    expect(img).toHaveAttribute('alt', 'Lê Hoàng');

    const wrapper = img.parentElement;
    expect(wrapper).toHaveStyle({ width: '32px', height: '32px' });
  });
});

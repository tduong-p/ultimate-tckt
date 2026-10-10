import './test-setup';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { Menu, type MenuItemDef } from './Menu';

describe('Menu', () => {
  beforeAll(() => {
    if (!window.HTMLElement.prototype.hasPointerCapture) {
      window.HTMLElement.prototype.hasPointerCapture = () => false;
      window.HTMLElement.prototype.setPointerCapture = () => {};
      window.HTMLElement.prototype.releasePointerCapture = () => {};
    }
    if (!window.HTMLElement.prototype.scrollIntoView) {
      window.HTMLElement.prototype.scrollIntoView = vi.fn();
    }
  });

  const sampleItems: MenuItemDef[] = [
    { id: '1', label: 'Chỉnh sửa', onSelect: vi.fn() },
    { id: '2', label: 'Nhân bản', onSelect: vi.fn() },
    { id: '3', label: 'Xoá', onSelect: vi.fn(), danger: true },
  ];

  it('mở menu khi bấm vào trigger và hiển thị các mục', async () => {
    render(<Menu trigger="Tuỳ chọn" items={sampleItems} label="Menu thao tác" />);
    const trigger = screen.getByRole('button', { name: 'Menu thao tác' });
    expect(trigger).toHaveAttribute('aria-haspopup', 'menu');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();

    await userEvent.click(trigger);
    const menu = screen.getByRole('menu', { name: 'Menu thao tác' });
    expect(menu).toBeInTheDocument();

    const items = screen.getAllByRole('menuitem');
    expect(items).toHaveLength(3);
    expect(items[0]).toHaveTextContent('Chỉnh sửa');
    expect(items[2]).toHaveClass('ui-menu-item-danger');
  });

  it('gọi onSelect và đóng menu khi chọn mục', async () => {
    const onSelectEdit = vi.fn();
    const items: MenuItemDef[] = [
      { id: '1', label: 'Chỉnh sửa', onSelect: onSelectEdit },
    ];
    render(<Menu trigger="Tuỳ chọn" items={items} label="Menu" />);
    await userEvent.click(screen.getByRole('button', { name: 'Menu' }));

    const item = screen.getByRole('menuitem', { name: 'Chỉnh sửa' });
    await userEvent.click(item);

    expect(onSelectEdit).toHaveBeenCalledOnce();
    await waitFor(() => {
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });
  });

  it('đóng menu khi nhấn Escape', async () => {
    render(<Menu trigger="Tuỳ chọn" items={sampleItems} label="Menu" />);
    await userEvent.click(screen.getByRole('button', { name: 'Menu' }));
    expect(screen.getByRole('menu')).toBeInTheDocument();

    await userEvent.keyboard('{Escape}');
    await waitFor(() => {
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });
  });

  it('hỗ trợ điều hướng bằng phím mũi tên lên/xuống', async () => {
    render(<Menu trigger="Tuỳ chọn" items={sampleItems} label="Menu" />);
    await userEvent.click(screen.getByRole('button', { name: 'Menu' }));

    const items = screen.getAllByRole('menuitem');
    items[0].focus();
    expect(items[0]).toHaveFocus();

    await userEvent.keyboard('{ArrowDown}');
    expect(items[1]).toHaveFocus();

    await userEvent.keyboard('{ArrowDown}');
    expect(items[2]).toHaveFocus();

    await userEvent.keyboard('{ArrowDown}');
    expect(items[0]).toHaveFocus();

    await userEvent.keyboard('{ArrowUp}');
    expect(items[2]).toHaveFocus();
  });
});

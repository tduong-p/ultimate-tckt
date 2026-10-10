import './test-setup';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Tabs, type TabDef } from './Tabs';

describe('Tabs', () => {
  const tabs: TabDef[] = [
    { value: 'all', label: 'Tất cả', count: 12 },
    { value: 'active', label: 'Đang xử lý', count: 5 },
    { value: 'done', label: 'Hoàn thành' },
  ];

  it('hiển thị danh sách các tab kèm số lượng đếm', () => {
    render(<Tabs value="all" onValueChange={vi.fn()} tabs={tabs} />);

    const tabElements = screen.getAllByRole('tab');
    expect(tabElements).toHaveLength(3);
    expect(tabElements[0]).toHaveTextContent('Tất cả');
    expect(tabElements[0]).toHaveTextContent('12');
    expect(tabElements[1]).toHaveTextContent('5');
    expect(tabElements[2]).toHaveTextContent('Hoàn thành');
  });

  it('gọi onValueChange khi bấm chuyển tab', async () => {
    const onValueChange = vi.fn();
    render(<Tabs value="all" onValueChange={onValueChange} tabs={tabs} />);

    const activeTab = screen.getByRole('tab', { name: /Đang xử lý/ });
    await userEvent.click(activeTab);

    expect(onValueChange).toHaveBeenCalledWith('active');
  });

  it('hiển thị trạng thái active cho tab hiện tại', () => {
    render(<Tabs value="active" onValueChange={vi.fn()} tabs={tabs} />);

    const activeTab = screen.getByRole('tab', { name: /Đang xử lý/ });
    expect(activeTab).toHaveAttribute('data-state', 'active');
  });

  it('hiển thị children bên dưới danh sách tab', () => {
    render(
      <Tabs value="all" onValueChange={vi.fn()} tabs={tabs}>
        <div data-testid="tab-content">Nội dung tab</div>
      </Tabs>
    );

    expect(screen.getByTestId('tab-content')).toBeInTheDocument();
  });
});

import './test-setup';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Select } from './Select';

describe('Select', () => {
  const options = [
    { value: 'opt1', label: 'Lựa chọn 1' },
    { value: 'opt2', label: 'Lựa chọn 2' },
    { value: 'opt3', label: 'Lựa chọn 3' },
  ];

  it('hiển thị danh sách lựa chọn và giá trị hiện tại', () => {
    render(
      <Select
        value="opt2"
        onChange={vi.fn()}
        options={options}
        aria-label="Chọn mục"
      />
    );

    const select = screen.getByRole('combobox', { name: 'Chọn mục' });
    expect(select).toBeInTheDocument();
    expect(select).toHaveValue('opt2');
    expect(select).toHaveClass('ui-select');

    const optElements = screen.getAllByRole('option');
    expect(optElements).toHaveLength(3);
    expect(optElements[0]).toHaveTextContent('Lựa chọn 1');
  });

  it('gọi onChange với giá trị mới khi người dùng chọn', async () => {
    const onChange = vi.fn();
    render(
      <Select
        value="opt1"
        onChange={onChange}
        options={options}
        aria-label="Chọn mục"
      />
    );

    const select = screen.getByRole('combobox', { name: 'Chọn mục' });
    await userEvent.selectOptions(select, 'opt3');

    expect(onChange).toHaveBeenCalledWith('opt3');
  });

  it('chuyển tiếp các thuộc tính disabled và className', () => {
    render(
      <Select
        value="opt1"
        onChange={vi.fn()}
        options={options}
        disabled
        className="custom-class"
        aria-label="Chọn mục vô hiệu"
      />
    );

    const select = screen.getByRole('combobox', { name: 'Chọn mục vô hiệu' });
    expect(select).toBeDisabled();
    expect(select).toHaveClass('ui-select', 'custom-class');
  });
});

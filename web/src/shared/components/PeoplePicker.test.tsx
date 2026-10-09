import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { PeoplePicker } from './PeoplePicker';

const people = [
  { id: 1, name: 'Nguyễn Văn An', email: 'an.nv@hust.edu.vn' },
  { id: 2, name: 'Đỗ Thị Bình', email: 'binh.dt@hust.edu.vn' },
  { id: 3, name: 'Trần Cường', email: 'cuong.t@hust.edu.vn' },
];

describe('PeoplePicker', () => {
  afterEach(cleanup);

  it('gõ không dấu vẫn tìm được, bấm gợi ý thì thêm người', () => {
    const onChange = vi.fn();
    render(<PeoplePicker label="Người phụ trách" people={people} value={[]} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText('Người phụ trách'), { target: { value: 'nguyen' } });
    fireEvent.click(screen.getByRole('option', { name: /Nguyễn Văn An/ }));
    expect(onChange).toHaveBeenCalledWith([1]);
  });

  it('gõ "do" ra "Đỗ", tìm cả theo email', () => {
    render(<PeoplePicker label="Người" people={people} value={[]} onChange={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Người'), { target: { value: 'do' } });
    expect(screen.getByRole('option', { name: /Đỗ Thị Bình/ })).toBeDefined();
    fireEvent.change(screen.getByLabelText('Người'), { target: { value: 'cuong.t' } });
    expect(screen.getByRole('option', { name: /Trần Cường/ })).toBeDefined();
  });

  it('người đã chọn hiện thành chip, có nút bỏ; không hiện lại trong gợi ý', () => {
    const onChange = vi.fn();
    render(<PeoplePicker label="Người" people={people} value={[1, 3]} onChange={onChange} />);
    expect(screen.getByText('Nguyễn Văn An')).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Bỏ Nguyễn Văn An' }));
    expect(onChange).toHaveBeenCalledWith([3]);
    fireEvent.change(screen.getByLabelText('Người'), { target: { value: 'n' } });
    expect(screen.queryByRole('option', { name: /Nguyễn Văn An/ })).toBeNull();
  });

  it('excludeIds không hiện trong gợi ý; ô trống thì không có gợi ý', () => {
    render(<PeoplePicker label="Người" people={people} value={[]} excludeIds={[2]} onChange={vi.fn()} />);
    expect(screen.queryAllByRole('option')).toHaveLength(0);
    fireEvent.change(screen.getByLabelText('Người'), { target: { value: 'binh' } });
    expect(screen.queryAllByRole('option')).toHaveLength(0);
  });
});

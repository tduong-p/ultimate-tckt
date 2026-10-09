import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { ReasonDialog } from './ReasonDialog';

describe('ReasonDialog', () => {
  afterEach(cleanup);

  it('bắt buộc: chỉ khoảng trắng thì không gửi và báo lỗi', () => {
    const onSubmit = vi.fn();
    render(<ReasonDialog isOpen title="Yêu cầu sửa" onSubmit={onSubmit} onCancel={vi.fn()} />);
    fireEvent.change(screen.getByLabelText(/Lý do/), { target: { value: '   ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Gửi' }));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText('Vui lòng nhập lý do.')).toBeDefined();
  });

  it('gửi lý do đã trim', () => {
    const onSubmit = vi.fn();
    render(<ReasonDialog isOpen title="Từ chối" onSubmit={onSubmit} onCancel={vi.fn()} />);
    fireEvent.change(screen.getByLabelText(/Lý do/), { target: { value: '  Thiếu kinh phí  ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Gửi' }));
    expect(onSubmit).toHaveBeenCalledWith('Thiếu kinh phí');
  });

  it('không bắt buộc thì gửi được chuỗi rỗng', () => {
    const onSubmit = vi.fn();
    render(<ReasonDialog isOpen required={false} title="Ghi chú" onSubmit={onSubmit} onCancel={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Gửi' }));
    expect(onSubmit).toHaveBeenCalledWith('');
  });
});

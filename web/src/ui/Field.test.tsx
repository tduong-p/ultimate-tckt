import './test-setup';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Field } from './Field';

describe('Field', () => {
  it('liên kết nhãn label với trường nhập qua htmlFor và id', () => {
    render(
      <Field label="Họ và tên">
        <input type="text" placeholder="Nhập tên" />
      </Field>
    );

    const input = screen.getByLabelText('Họ và tên');
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('id');
    expect(input).not.toHaveAttribute('aria-invalid');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('giữ nguyên id nếu phần tử con đã có id sẵn', () => {
    render(
      <Field label="Địa chỉ email">
        <input id="custom-email-id" type="email" />
      </Field>
    );

    const input = screen.getByLabelText('Địa chỉ email');
    expect(input).toHaveAttribute('id', 'custom-email-id');
  });

  it('hiển thị thông báo lỗi và gắn aria-invalid, aria-describedby khi có error', () => {
    render(
      <Field label="Mật khẩu" error="Mật khẩu quá ngắn">
        <input type="password" />
      </Field>
    );

    const input = screen.getByLabelText('Mật khẩu');
    const alert = screen.getByRole('alert');

    expect(alert).toHaveTextContent('Mật khẩu quá ngắn');
    expect(alert).toHaveClass('ui-field-error');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAttribute('aria-describedby', alert.id);
  });

  it('nối thêm id lỗi vào aria-describedby nếu phần tử con đã có aria-describedby trước đó', () => {
    render(
      <Field label="Ghi chú" error="Bắt buộc nhập">
        <input aria-describedby="hint-id" />
      </Field>
    );

    const input = screen.getByLabelText('Ghi chú');
    const alert = screen.getByRole('alert');

    expect(input).toHaveAttribute('aria-describedby', `hint-id ${alert.id}`);
  });
});

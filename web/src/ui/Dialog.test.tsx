import './test-setup';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { Dialog } from './Dialog';

describe('Dialog', () => {
  beforeAll(() => {
    if (!window.HTMLElement.prototype.hasPointerCapture) {
      window.HTMLElement.prototype.hasPointerCapture = () => false;
      window.HTMLElement.prototype.setPointerCapture = () => {};
      window.HTMLElement.prototype.releasePointerCapture = () => {};
    }
  });

  it('không hiển thị khi open=false', () => {
    render(
      <Dialog open={false} onOpenChange={vi.fn()} title="Tiêu đề hộp thoại">
        <div>Nội dung hộp thoại</div>
      </Dialog>
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('hiển thị hộp thoại, tiêu đề, nội dung và footer khi open=true', () => {
    render(
      <Dialog
        open={true}
        onOpenChange={vi.fn()}
        title="Tiêu đề hộp thoại"
        footer={<button type="button">Xác nhận</button>}
      >
        <div>Nội dung hộp thoại</div>
      </Dialog>
    );

    const dialog = screen.getByRole('dialog', { name: 'Tiêu đề hộp thoại' });
    expect(dialog).toBeInTheDocument();
    expect(screen.getByText('Nội dung hộp thoại')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Xác nhận' })).toBeInTheDocument();
  });

  it('gọi onOpenChange(false) khi bấm nút Đóng', async () => {
    const onOpenChange = vi.fn();
    render(
      <Dialog open={true} onOpenChange={onOpenChange} title="Thông báo">
        <div>Nội dung</div>
      </Dialog>
    );

    const closeBtn = screen.getByRole('button', { name: 'Đóng' });
    await userEvent.click(closeBtn);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('gọi onOpenChange(false) khi bấm phím Escape', async () => {
    const onOpenChange = vi.fn();
    render(
      <Dialog open={true} onOpenChange={onOpenChange} title="Thông báo">
        <div>Nội dung</div>
      </Dialog>
    );

    await userEvent.keyboard('{Escape}');
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});

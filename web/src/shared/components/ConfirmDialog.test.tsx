import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { ConfirmDialog } from './ConfirmDialog';

describe('ConfirmDialog', () => {
  afterEach(cleanup);

  it('không hiện khi isOpen=false', () => {
    render(<ConfirmDialog isOpen={false} title="Xoá?" onConfirm={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.queryByText('Xoá?')).toBeNull();
  });

  it('bấm xác nhận và huỷ gọi đúng callback', () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(<ConfirmDialog isOpen title="Xoá việc con?" onConfirm={onConfirm} onCancel={onCancel}>Không hoàn tác được.</ConfirmDialog>);
    expect(screen.getByText('Không hoàn tác được.')).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận' }));
    fireEvent.click(screen.getByRole('button', { name: 'Huỷ' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('confirmText: chỉ bật nút khi gõ đúng', () => {
    const onConfirm = vi.fn();
    render(<ConfirmDialog isOpen title="Xoá hoạt động" confirmText="Hội trại 2026" confirmLabel="Xoá vĩnh viễn" appearance="danger" onConfirm={onConfirm} onCancel={vi.fn()} />);
    const button = screen.getByRole('button', { name: 'Xoá vĩnh viễn' }) as HTMLButtonElement;
    fireEvent.click(button);
    expect(onConfirm).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText(/Gõ lại/), { target: { value: 'Hội trại 2026' } });
    fireEvent.click(screen.getByRole('button', { name: 'Xoá vĩnh viễn' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});

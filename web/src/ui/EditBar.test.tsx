import './test-setup';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { EditBar } from './EditBar';

const props = { count: 2, saving: false, onSave: vi.fn(), onDiscard: vi.fn() };

describe('EditBar', () => {
  it('ẩn khi không dirty', () => {
    render(<EditBar dirty={false} {...props} />);
    expect(screen.queryByRole('region', { name: 'Thay đổi chưa lưu' })).toBeNull();
  });

  it('hiện số trường đổi và nút Lưu/Hủy', async () => {
    const onSave = vi.fn(); const onDiscard = vi.fn();
    render(<EditBar dirty {...props} onSave={onSave} onDiscard={onDiscard} />);
    const region = screen.getByRole('region', { name: 'Thay đổi chưa lưu' });
    expect(region).toHaveTextContent('2');
    await userEvent.click(screen.getByRole('button', { name: 'Lưu' }));
    await userEvent.click(screen.getByRole('button', { name: 'Hủy' }));
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onDiscard).toHaveBeenCalledTimes(1);
  });

  it('Mod+Enter lưu, Escape hủy', async () => {
    const onSave = vi.fn(); const onDiscard = vi.fn();
    render(<EditBar dirty {...props} onSave={onSave} onDiscard={onDiscard} />);
    await userEvent.keyboard('{Control>}{Enter}{/Control}');
    expect(onSave).toHaveBeenCalledTimes(1);
    await userEvent.keyboard('{Meta>}{Enter}{/Meta}');
    expect(onSave).toHaveBeenCalledTimes(2);
    await userEvent.keyboard('{Escape}');
    expect(onDiscard).toHaveBeenCalledTimes(1);
  });

  it('bỏ qua phím khi focus trong dialog/menu hoặc đã preventDefault', async () => {
    const onSave = vi.fn(); const onDiscard = vi.fn();
    render(
      <>
        <EditBar dirty {...props} onSave={onSave} onDiscard={onDiscard} />
        <div role="dialog"><button>trong dialog</button></div>
      </>,
    );
    screen.getByText('trong dialog').focus();
    await userEvent.keyboard('{Escape}{Control>}{Enter}{/Control}');
    expect(onSave).not.toHaveBeenCalled();
    expect(onDiscard).not.toHaveBeenCalled();
  });

  it('không dirty thì phím không làm gì', async () => {
    const onSave = vi.fn();
    render(<EditBar dirty={false} {...props} onSave={onSave} />);
    await userEvent.keyboard('{Control>}{Enter}{/Control}');
    expect(onSave).not.toHaveBeenCalled();
  });

  it('khi saving: Lưu bị vô hiệu, aria-busy, phím Mod+Enter không lưu', async () => {
    const onSave = vi.fn();
    render(<EditBar dirty {...props} saving onSave={onSave} />);
    const btn = screen.getByRole('button', { name: 'Lưu' });
    expect(btn).toBeDisabled();
    expect(btn).toHaveAttribute('aria-busy', 'true');
    await userEvent.keyboard('{Control>}{Enter}{/Control}');
    expect(onSave).not.toHaveBeenCalled();
  });

  it('hiện lỗi với role=alert', () => {
    render(<EditBar dirty {...props} error="Dữ liệu đã đổi" />);
    expect(screen.getByRole('alert')).toHaveTextContent('Dữ liệu đã đổi');
  });

  it('Escape bị bỏ qua khi đang gõ trong input, Mod+Enter vẫn lưu', async () => {
    const onSave = vi.fn(); const onDiscard = vi.fn();
    render(<><EditBar dirty {...props} onSave={onSave} onDiscard={onDiscard} /><input aria-label="ô" /></>);
    screen.getByLabelText('ô').focus();
    await userEvent.keyboard('{Escape}');
    expect(onDiscard).not.toHaveBeenCalled();
    await userEvent.keyboard('{Control>}{Enter}{/Control}');
    expect(onSave).toHaveBeenCalledTimes(1);
  });
});

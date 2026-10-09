import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { LinkField, LINK_ERROR_MESSAGE } from './LinkField';

describe('LinkField', () => {
  afterEach(cleanup);

  it('báo lỗi khi link không phải http(s), không báo khi trống', () => {
    const { rerender } = render(<LinkField label="Link minh chứng" value="" onChange={vi.fn()} />);
    expect(screen.queryByText(LINK_ERROR_MESSAGE)).toBeNull();
    rerender(<LinkField label="Link minh chứng" value="drive.google.com/x" onChange={vi.fn()} />);
    expect(screen.getByText(LINK_ERROR_MESSAGE)).toBeDefined();
    rerender(<LinkField label="Link minh chứng" value="https://drive.google.com/x" onChange={vi.fn()} />);
    expect(screen.queryByText(LINK_ERROR_MESSAGE)).toBeNull();
  });

  it('gõ thì gọi onChange', () => {
    const onChange = vi.fn();
    render(<LinkField label="Link" value="" onChange={onChange} />);
    fireEvent.change(screen.getByLabelText('Link'), { target: { value: 'https://a.vn' } });
    expect(onChange).toHaveBeenCalledWith('https://a.vn');
  });
});

import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import React from 'react';
import { InboxView } from './InboxView';
import { INITIAL_CASES } from '../../data/ctdMockData';

describe('InboxView', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders title, subtitle, and KPI cards', () => {
    render(<InboxView cases={INITIAL_CASES} onSelectCase={() => {}} />);
    expect(screen.getByText('Hộp xử lý hồ sơ Đảng')).toBeDefined();
    expect(
      screen.getByText(
        'Tiếp nhận, kiểm tra và chuyển tiếp các hồ sơ kết nạp và chuyển Đảng chính thức trong toàn trường.'
      )
    ).toBeDefined();

    expect(screen.getByText('Hồ sơ trong đợt')).toBeDefined();
    expect(screen.getByText('184')).toBeDefined();
    expect(screen.getByText('Quá hạn SLA 7 ngày')).toBeDefined();
    expect(screen.getByText('23')).toBeDefined();
  });

  it('renders cases list in table', () => {
    render(<InboxView cases={INITIAL_CASES} onSelectCase={() => {}} />);
    expect(screen.getAllByText('Nguyễn Minh Anh').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Trần Quốc Bảo').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Lê Thu Hà').length).toBeGreaterThan(0);
  });

  it('filters cases when typing search query', () => {
    render(<InboxView cases={INITIAL_CASES} onSelectCase={() => {}} />);
    const searchInput = screen.getByPlaceholderText('Tìm theo tên hoặc MSSV...') as HTMLInputElement;

    fireEvent.change(searchInput, { target: { value: 'Minh Anh' } });
    expect(screen.getAllByText('Nguyễn Minh Anh').length).toBeGreaterThan(0);
    expect(screen.queryByText('Trần Quốc Bảo')).toBeNull();
  });

  it('triggers onSelectCase callback when clicking Thẩm định button', () => {
    const handleSelect = vi.fn();
    render(<InboxView cases={INITIAL_CASES} onSelectCase={handleSelect} />);

    const buttons = screen.getAllByText('Thẩm định');
    expect(buttons.length).toBeGreaterThan(0);

    fireEvent.click(buttons[0]);
    expect(handleSelect).toHaveBeenCalledWith(INITIAL_CASES[0].id);
  });
});

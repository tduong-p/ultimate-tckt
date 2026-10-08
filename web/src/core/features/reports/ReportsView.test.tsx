import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import React from 'react';
import { ReportsView } from './ReportsView';

describe('ReportsView', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders header title and subtitle', () => {
    render(<ReportsView />);
    expect(screen.getByText('Báo cáo')).toBeDefined();
    expect(
      screen.getByText(
        'Xuất dữ liệu hoạt động, công việc của Tổ và mức độ tham gia trong một khoảng thời gian.'
      )
    ).toBeDefined();
  });

  it('renders date inputs with default values and team selector', () => {
    render(<ReportsView />);
    const startInput = screen.getByLabelText('Ngày bắt đầu') as HTMLInputElement;
    const endInput = screen.getByLabelText('Ngày kết thúc') as HTMLInputElement;

    expect(startInput).toBeDefined();
    expect(startInput.value).toBe('09/08/2026');
    expect(endInput).toBeDefined();
    expect(endInput.value).toBe('10/08/2026');

    expect(screen.getByText('Tổ')).toBeDefined();
    expect(
      screen.getByText(
        'Tệp Excel gồm tổng hợp hoạt động và chi tiết công việc, tham gia của thành viên đối với các hoạt động diễn ra trong khoảng thời gian này.'
      )
    ).toBeDefined();
  });

  it('handles clicking the export button', () => {
    render(<ReportsView />);
    const exportBtn = screen.getByText('Xuất báo cáo Excel');
    expect(exportBtn).toBeDefined();

    fireEvent.click(exportBtn);
    expect(screen.getByText('Đang tạo tệp Excel...')).toBeDefined();
  });
});

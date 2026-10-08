import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import React from 'react';
import { CtdDashboardView } from './CtdDashboardView';

describe('CtdDashboardView', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders overview header and stage distribution', () => {
    render(<CtdDashboardView />);

    expect(screen.getByText('Toàn cảnh đợt xét Đảng 2026-2')).toBeDefined();
    expect(screen.getByText('Phân bổ hồ sơ theo các giai đoạn xét')).toBeDefined();
    expect(screen.getByText('Hồ sơ trễ hạn quy định (SLA Backlog)')).toBeDefined();
  });

  it('renders backlog items and allows urging', () => {
    render(<CtdDashboardView />);

    expect(screen.getByText('Vũ Khánh Linh')).toBeDefined();
    expect(screen.getByText('20211123')).toBeDefined();

    const urgeButtons = screen.getAllByText('Gửi đôn đốc');
    expect(urgeButtons.length).toBeGreaterThan(0);

    fireEvent.click(urgeButtons[0]);
    expect(screen.getByText('✓ Đã gửi đôn đốc')).toBeDefined();
  });

  it('handles export action', () => {
    render(<CtdDashboardView />);

    const exportBtn = screen.getByText('Xuất báo cáo tổng hợp');
    expect(exportBtn).toBeDefined();

    fireEvent.click(exportBtn);
    expect(screen.getByText('Đang tạo báo cáo...')).toBeDefined();
  });
});

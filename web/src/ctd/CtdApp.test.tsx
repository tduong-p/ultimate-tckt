import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import React from 'react';
import { CtdApp } from './main';

describe('CtdApp', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders CTD layout, inbox view and allows switching to student role', () => {
    render(<CtdApp />);

    expect(screen.getByText('Hồ sơ Công tác Đảng')).toBeDefined();
    expect(screen.getByText('Hộp xử lý hồ sơ Đảng')).toBeDefined();
    expect(screen.getAllByText('Nguyễn Minh Anh').length).toBeGreaterThan(0);

    // Switch role to Sinh viên
    const studentRoleBtn = screen.getByText('Sinh viên');
    expect(studentRoleBtn).toBeDefined();

    fireEvent.click(studentRoleBtn);
    expect(screen.getByText('Cổng nộp & theo dõi hồ sơ Đảng')).toBeDefined();
  });

  it('navigates from inbox to review case view when clicking Thẩm định', () => {
    render(<CtdApp />);

    const reviewButtons = screen.getAllByText('Thẩm định');
    expect(reviewButtons.length).toBeGreaterThan(0);

    fireEvent.click(reviewButtons[0]);
    expect(screen.getByText(/Quay lại danh sách hồ sơ/)).toBeDefined();
    expect(screen.getByText(/Danh mục giấy tờ hồ sơ/)).toBeDefined();
  });
});

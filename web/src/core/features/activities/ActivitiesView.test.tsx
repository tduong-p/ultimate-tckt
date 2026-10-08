import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import React from 'react';
import { ActivitiesView } from './ActivitiesView';

describe('ActivitiesView', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders the header title, subtitle and action button', () => {
    render(<ActivitiesView />);
    expect(screen.getByText('Hoạt động')).toBeDefined();
    expect(screen.getByText('Lập kế hoạch, phối hợp và theo dõi mọi hoạt động.')).toBeDefined();
    expect(screen.getByText('+ Đề xuất hoạt động')).toBeDefined();
  });

  it('renders search bar and activity card', () => {
    render(<ActivitiesView />);
    expect(screen.getByPlaceholderText('Tìm kiếm hoạt động...')).toBeDefined();
    expect(screen.getAllByText(/Triển khai tạo tài khoản chi đoàn K71/i)[0]).toBeDefined();
    expect(screen.getByText(/• Đã Duyệt/i)).toBeDefined();
  });

  it('opens CreateActivityModal when clicking + Đề xuất hoạt động button', () => {
    render(<ActivitiesView />);
    const button = screen.getByText('+ Đề xuất hoạt động');
    fireEvent.click(button);
    expect(screen.getByText('ĐỀ XUẤT MỚI')).toBeDefined();
  });
});

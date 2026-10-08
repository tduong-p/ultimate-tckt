import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import React from 'react';
import { ArchiveView } from './ArchiveView';

describe('ArchiveView', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders header title and subtitle', () => {
    render(<ArchiveView />);
    expect(screen.getByText('Kho lưu trữ hoạt động')).toBeDefined();
    expect(screen.getByText('Tìm kiếm kho tri thức chung của tổ chức.')).toBeDefined();
  });

  it('renders search input field with correct placeholder', () => {
    render(<ArchiveView />);
    const searchInput = screen.getByPlaceholderText(
      'Tìm hoạt động, kết quả và bài học trước đây...'
    ) as HTMLInputElement;
    expect(searchInput).toBeDefined();

    fireEvent.change(searchInput, { target: { value: 'Hội nghị' } });
    expect(searchInput.value).toBe('Hội nghị');
  });

  it('renders empty state card with icon, title, and description', () => {
    render(<ArchiveView />);
    expect(screen.getByText('Không tìm thấy hoạt động lưu trữ')).toBeDefined();
    expect(screen.getByText('Hoạt động hoàn thành sẽ được đưa vào kho lưu trữ.')).toBeDefined();
  });
});

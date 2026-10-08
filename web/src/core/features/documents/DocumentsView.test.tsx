import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import React from 'react';
import { DocumentsView } from './DocumentsView';

describe('DocumentsView', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders header title, subtitle and action button', () => {
    render(<DocumentsView />);
    expect(screen.getByText('Văn bản')).toBeDefined();
    expect(screen.getByText('Danh mục liên kết văn bản do các Tổ TCKT ban hành.')).toBeDefined();
    expect(screen.getByText('+ Thêm văn bản')).toBeDefined();
  });

  it('renders search input and empty state box', () => {
    render(<DocumentsView />);
    expect(screen.getByPlaceholderText('Tìm văn bản...')).toBeDefined();
    expect(screen.getByText('Không tìm thấy văn bản')).toBeDefined();
    expect(screen.getByText('Hãy thêm văn bản đầu tiên hoặc thay đổi bộ lọc.')).toBeDefined();
  });
});

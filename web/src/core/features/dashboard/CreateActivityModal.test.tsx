import React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { CreateActivityModal } from './CreateActivityModal';

afterEach(() => {
  cleanup();
});

describe('CreateActivityModal', () => {
  it('renders the modal with title and subtitle', () => {
    render(<CreateActivityModal onClose={() => {}} />);
    expect(screen.getByText('Đề xuất hoạt động')).toBeDefined();
    expect(screen.getByText('ĐỀ XUẤT MỚI')).toBeDefined();
    expect(screen.getByText('Chọn Tổ chủ trì và tất cả các Tổ phối hợp tham gia.')).toBeDefined();
  });

  it('renders form fields', () => {
    render(<CreateActivityModal onClose={() => {}} />);
    expect(screen.getByText('Tiêu đề')).toBeDefined();
    expect(screen.getByText('Tổ chủ trì')).toBeDefined();
    expect(screen.getByText('Ngày bắt đầu')).toBeDefined();
    expect(screen.getByText('Tạo đề xuất')).toBeDefined();
  });
});

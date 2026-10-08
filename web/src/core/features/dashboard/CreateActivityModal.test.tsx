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
});

import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import React from 'react';
import { TeamsView } from './TeamsView';

describe('TeamsView', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders header title and description', () => {
    render(<TeamsView />);
    expect(screen.getByText('Tổ')).toBeDefined();
    expect(screen.getByText('Những con người và đơn vị cùng tạo nên các hoạt động.')).toBeDefined();
  });

  it('renders all organization teams', () => {
    render(<TeamsView />);
    expect(screen.getByText('Phát triển Đảng và Chuyển đổi số')).toBeDefined();
    expect(screen.getByText('Tổ chức và Phát triển Đoàn')).toBeDefined();
    expect(screen.getByText('Giám sát, Kiểm tra và Điểm rèn luyện')).toBeDefined();
    expect(screen.getByText('Tuyên giáo - Truyền thông')).toBeDefined();
  });
});

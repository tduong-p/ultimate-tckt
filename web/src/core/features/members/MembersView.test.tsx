import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import React from 'react';
import { MembersView } from './MembersView';

describe('MembersView', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders header title, subtitle and action button', () => {
    render(<MembersView />);
    expect(screen.getByText('Thành viên')).toBeDefined();
    expect(screen.getByText("Recognize every member's participation.")).toBeDefined();
    expect(screen.getByText('+ Tạo tài khoản')).toBeDefined();
  });

  it('renders search input and member cards', () => {
    render(<MembersView />);
    expect(screen.getByPlaceholderText('Tìm thành viên...')).toBeDefined();
    expect(screen.getByText('Phạm Việt Bách')).toBeDefined();
    expect(screen.getByText('Cao Hương Quỳnh')).toBeDefined();
    expect(screen.getByText('Nguyễn Văn Gia Huy')).toBeDefined();
  });
});

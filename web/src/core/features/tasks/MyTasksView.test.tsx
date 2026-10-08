import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import React from 'react';
import { MyTasksView } from './MyTasksView';

describe('MyTasksView', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders page header title and subtitle', () => {
    render(<MyTasksView />);
    expect(screen.getByText('Công việc của tôi')).toBeDefined();
    expect(screen.getByText('Công việc được giao cho bạn và các Tổ của bạn.')).toBeDefined();
  });

  it('renders open tasks card with counter pill', () => {
    render(<MyTasksView />);
    expect(screen.getByText('Công việc đang mở')).toBeDefined();
    expect(screen.getByText('0 Công Việc')).toBeDefined();
  });

  it('renders empty state messages', () => {
    render(<MyTasksView />);
    expect(screen.getByText('Bạn đã hoàn thành tất cả')).toBeDefined();
    expect(screen.getByText('Không có công việc đang mở trong danh sách.')).toBeDefined();
  });
});

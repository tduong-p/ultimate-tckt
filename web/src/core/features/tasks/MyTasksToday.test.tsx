import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import React from 'react';
import { MyTasksToday } from './MyTasksToday';

describe('MyTasksToday', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders the page title and subtitle', () => {
    render(<MyTasksToday />);
    expect(screen.getByText('Công việc hôm nay')).toBeDefined();
    expect(screen.getByText('Công việc đến hạn hôm nay, quá hạn, hoặc đang chờ bạn duyệt.')).toBeDefined();
  });

  it('renders both empty cards for due today and overdue', () => {
    render(<MyTasksToday />);
    expect(screen.getByText('Đến hạn hôm nay')).toBeDefined();
    expect(screen.getByText('Không có việc đến hạn hôm nay')).toBeDefined();
    expect(screen.getByText('Quá hạn')).toBeDefined();
    expect(screen.getByText('Không có việc quá hạn')).toBeDefined();
  });
});

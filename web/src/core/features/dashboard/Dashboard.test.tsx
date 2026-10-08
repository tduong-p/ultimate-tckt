import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

afterEach(() => {
  cleanup();
});
import { Dashboard } from './Dashboard';

describe('Dashboard', () => {
  it('renders the greeting and header buttons', () => {
    render(<Dashboard />);
    expect(screen.getByText(/Xin chào Phạm Việt Bách/i)).toBeDefined();
    expect(screen.getByText('Đề xuất hoạt động')).toBeDefined();
  });

  it('renders 4 KPI cards', () => {
    render(<Dashboard />);
    expect(screen.getByText('Hoạt động đang diễn ra')).toBeDefined();
    expect(screen.getByText('Nhiệm vụ đang mở')).toBeDefined();
    expect(screen.getByText('Nhiệm vụ quá hạn')).toBeDefined();
    expect(screen.getByText('Hiệu suất hoàn thành')).toBeDefined();
  });
});
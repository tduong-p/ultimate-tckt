import React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { Dashboard } from './Dashboard';

afterEach(() => {
  cleanup();
});

describe('Dashboard', () => {
  it('renders the greeting and header buttons', () => {
    render(<Dashboard />);
    expect(screen.getByText(/Xin chào Phạm Việt Bách/i)).toBeDefined();
    expect(screen.getByText('+ Đề xuất hoạt động')).toBeDefined();
  });

  it('renders 4 KPI cards', () => {
    render(<Dashboard />);
    expect(screen.getAllByText('Hoạt động đang diễn ra').length).toBeGreaterThan(0);
    expect(screen.getByText('Nhiệm vụ đang mở')).toBeDefined();
    expect(screen.getByText('Nhiệm vụ quá hạn')).toBeDefined();
    expect(screen.getByText('Hiệu suất hoàn thành')).toBeDefined();
  });

  it('renders left column task widget', () => {
    render(<Dashboard />);
    expect(screen.getByText('Quản lý nhiệm vụ')).toBeDefined();
  });

  it('renders right column update widgets', () => {
    render(<Dashboard />);
    expect(screen.getByText('Lịch sự kiện & Deadline')).toBeDefined();
    expect(screen.getByText('Hoạt động đang diễn ra', { selector: 'h2' })).toBeDefined();
    expect(screen.getByText('Nhật ký hoạt động')).toBeDefined();
  });
});
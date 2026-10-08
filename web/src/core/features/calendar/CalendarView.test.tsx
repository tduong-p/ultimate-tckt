import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import React from 'react';
import { CalendarView } from './CalendarView';

describe('CalendarView', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders the header title and description', () => {
    render(<CalendarView />);
    expect(screen.getByText('Lịch chung')).toBeDefined();
    expect(screen.getByText('Lịch hoạt động và hạn chót công việc của các Tổ.')).toBeDefined();
  });

  it('renders month navigation and buttons', () => {
    render(<CalendarView />);
    expect(screen.getByText('Tháng 10 năm 2026')).toBeDefined();
    expect(screen.getByText('Hôm nay')).toBeDefined();
    expect(screen.getByText('Tháng')).toBeDefined();
    expect(screen.getByText('Danh sách')).toBeDefined();
  });

  it('renders days of week header', () => {
    render(<CalendarView />);
    const days = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
    days.forEach((day) => {
      expect(screen.getByText(day)).toBeDefined();
    });
  });
});

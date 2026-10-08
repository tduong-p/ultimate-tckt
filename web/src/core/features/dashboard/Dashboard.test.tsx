import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Dashboard } from './Dashboard';

describe('Dashboard', () => {
  it('renders the greeting and header buttons', () => {
    render(<Dashboard />);
    expect(screen.getByText(/Xin chào Phạm Việt Bách/i)).toBeDefined();
    expect(screen.getByText('Đề xuất hoạt động')).toBeDefined();
  });
});
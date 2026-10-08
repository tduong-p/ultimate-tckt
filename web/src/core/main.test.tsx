import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { App } from './main';

describe('Core App main entry', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders default view as dashboard', () => {
    const queryClient = new QueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    );

    expect(screen.getByText(/Xin chào Phạm Việt Bách/i)).toBeDefined();
    expect(screen.getByText('+ Đề xuất hoạt động')).toBeDefined();
    expect(screen.getByText('Quản lý nhiệm vụ')).toBeDefined();
  });
});

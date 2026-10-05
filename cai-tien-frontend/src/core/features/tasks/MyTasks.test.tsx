import React from 'react';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect } from 'vitest';
import { MyTasks } from './MyTasks';

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

describe('MyTasks', () => {
  it('renders loading state initially', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MyTasks />
      </QueryClientProvider>
    );
    expect(screen.getByText('Loading tasks...')).toBeDefined();
  });
});

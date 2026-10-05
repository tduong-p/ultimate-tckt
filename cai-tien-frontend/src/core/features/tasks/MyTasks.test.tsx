import React from 'react';
import { render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect } from 'vitest';
import { MyTasks } from './MyTasks';

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

describe('MyTasks', () => {
  it('renders without crashing', () => {
    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <MyTasks />
      </QueryClientProvider>
    );
    expect(container).toBeDefined();
  });
});

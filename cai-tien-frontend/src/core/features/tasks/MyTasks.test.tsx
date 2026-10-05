import React from 'react';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi } from 'vitest';
import { MyTasks } from './MyTasks';
import { apiClient } from '../../../shared/utils/api';

vi.mock('../../../shared/utils/api', () => ({
  apiClient: {
    get: vi.fn(),
  },
}));

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

describe('MyTasks', () => {
  it('renders loading state initially', () => {
    (apiClient.get as any).mockResolvedValue({ data: { dueToday: [], overdue: [], pendingMyReview: [] } });
    render(
      <QueryClientProvider client={queryClient}>
        <MyTasks />
      </QueryClientProvider>
    );
    expect(screen.getByText('Loading tasks...')).toBeDefined();
  });
});

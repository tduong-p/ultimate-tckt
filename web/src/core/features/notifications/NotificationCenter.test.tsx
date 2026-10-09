import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { NotificationCenter } from './NotificationCenter';
import { ToastProvider } from '../../../shared/components/Toast';
import * as api from '../../api';

vi.mock('../../api', async () => {
  const actual = await vi.importActual<typeof import('../../api')>('../../api');
  return { ...actual, fetchNotifications: vi.fn(), markNotificationSeen: vi.fn(), markAllNotificationsSeen: vi.fn() };
});

describe('NotificationCenter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  afterEach(cleanup);

  it('một lần tải: chuông có huy hiệu và popup hiện mục mới; chỉ gọi API một lần lúc khởi động', async () => {
    vi.mocked(api.fetchNotifications).mockResolvedValue({
      unread_count: 1,
      notifications: [
        { id: 1, kind: 'task_assigned', title: 'Công việc mới', body: 'Bạn được giao: Soạn kế hoạch', url: '/#activity/3', seen_at: null, created_at: '2026-10-09T01:00:00.000Z' },
      ],
    });
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={qc}>
        <ToastProvider>
          <MemoryRouter>
            <NotificationCenter />
          </MemoryRouter>
        </ToastProvider>
      </QueryClientProvider>
    );
    await waitFor(() => expect(screen.getByTestId('notification-badge').textContent).toBe('1'));
    const popups = screen.getByTestId('notification-popups');
    await waitFor(() => expect(within(popups).getByText('Công việc mới')).toBeDefined());
    expect(api.fetchNotifications).toHaveBeenCalledTimes(1);
  });
});

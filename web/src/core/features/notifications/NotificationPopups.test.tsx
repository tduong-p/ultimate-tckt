import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup, within, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { NotificationPopups } from './NotificationPopups';
import { NOTIFICATIONS_KEY } from './useNotifications';
import * as api from '../../api';

vi.mock('../../api', async () => {
  const actual = await vi.importActual<typeof import('../../api')>('../../api');
  return { ...actual, fetchNotifications: vi.fn(), markNotificationSeen: vi.fn() };
});

const item = (id: number, over: Partial<api.NotificationItem> = {}): api.NotificationItem => ({
  id,
  kind: 'k',
  title: `Tiêu đề ${id}`,
  body: `Nội dung ${id}`,
  url: `/#activity/${id}`,
  seen_at: null,
  created_at: '2026-10-09T01:00:00.000Z',
  ...over,
});

const Probe = () => <div data-testid="path">{useLocation().pathname}</div>;

function setup(initial: api.NotificationsResponse) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  qc.setQueryData(NOTIFICATIONS_KEY, initial);
  render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/dashboard']}>
        <NotificationPopups />
        <Routes><Route path="*" element={<Probe />} /></Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
  return qc;
}

const popupTitles = () =>
  within(screen.getByTestId('notification-popups')).queryAllByRole('button').map((b) => b.querySelector('strong')?.textContent);

describe('NotificationPopups', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.markNotificationSeen).mockResolvedValue({ ok: true });
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });
  afterEach(() => {
    vi.useRealTimers();
    cleanup();
  });

  it('chỉ báo tối đa 3 mục chưa xem mới nhất, cũ nhất ở trên', async () => {
    setup({ unread_count: 4, notifications: [item(4), item(3), item(2), item(1)] });
    await waitFor(() => expect(popupTitles()).toEqual(['Tiêu đề 2', 'Tiêu đề 3', 'Tiêu đề 4']));
  });

  it('không báo mục đã xem', async () => {
    setup({ unread_count: 1, notifications: [item(2), item(1, { seen_at: '2026-10-09T02:00:00Z' })] });
    await waitFor(() => expect(popupTitles()).toEqual(['Tiêu đề 2']));
  });

  it('không báo lặp mục đã báo khi tải lại, nhưng báo mục mới', async () => {
    const qc = setup({ unread_count: 1, notifications: [item(1)] });
    await waitFor(() => expect(popupTitles()).toEqual(['Tiêu đề 1']));
    await act(async () => {
      qc.setQueryData(NOTIFICATIONS_KEY, { unread_count: 1, notifications: [item(1)] });
    });
    expect(popupTitles()).toEqual(['Tiêu đề 1']);
    await act(async () => {
      qc.setQueryData(NOTIFICATIONS_KEY, { unread_count: 2, notifications: [item(2), item(1)] });
    });
    await waitFor(() => expect(popupTitles()).toEqual(['Tiêu đề 1', 'Tiêu đề 2']));
  });

  it('popup tự tắt sau 7 giây và không hiện lại', async () => {
    setup({ unread_count: 1, notifications: [item(1)] });
    await waitFor(() => expect(popupTitles()).toEqual(['Tiêu đề 1']));
    await vi.advanceTimersByTimeAsync(7_000);
    await waitFor(() => expect(popupTitles()).toEqual([]));
  });

  it('bấm popup: gỡ popup, đánh dấu đã xem, đi tới đường dẫn đã chuẩn hoá', async () => {
    const qc = setup({ unread_count: 1, notifications: [item(9, { url: '/#activity/12' })] });
    await waitFor(() => expect(popupTitles()).toEqual(['Tiêu đề 9']));
    fireEvent.click(within(screen.getByTestId('notification-popups')).getByRole('button'));
    await waitFor(() => expect(screen.getByTestId('path').textContent).toBe('/activity/12'));
    expect(api.markNotificationSeen).toHaveBeenCalledWith(9);
    expect(popupTitles()).toEqual([]);
    expect((qc.getQueryData(NOTIFICATIONS_KEY) as api.NotificationsResponse).unread_count).toBe(0);
  });

  it('popup của mục đã được đánh dấu xem ở nơi khác thì bấm không trừ huy hiệu hai lần', async () => {
    const qc = setup({ unread_count: 2, notifications: [item(2), item(1)] });
    await waitFor(() => expect(popupTitles()).toHaveLength(2));
    await act(async () => {
      qc.setQueryData(NOTIFICATIONS_KEY, {
        unread_count: 0,
        notifications: [item(2, { seen_at: '2026-10-09T03:00:00Z' }), item(1, { seen_at: '2026-10-09T03:00:00Z' })],
      });
    });
    fireEvent.click(within(screen.getByTestId('notification-popups')).getAllByRole('button')[0]);
    await waitFor(() => expect(screen.getByTestId('path').textContent).toContain('/activity/'));
    expect(api.markNotificationSeen).not.toHaveBeenCalled();
    expect((qc.getQueryData(NOTIFICATIONS_KEY) as api.NotificationsResponse).unread_count).toBe(0);
  });
});

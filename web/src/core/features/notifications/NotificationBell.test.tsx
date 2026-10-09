import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { NotificationBell } from './NotificationBell';
import { ToastProvider } from '../../../shared/components/Toast';
import * as api from '../../api';

vi.mock('../../api', async () => {
  const actual = await vi.importActual<typeof import('../../api')>('../../api');
  return { ...actual, fetchNotifications: vi.fn(), markNotificationSeen: vi.fn(), markAllNotificationsSeen: vi.fn() };
});

const item = (id: number, over: Partial<api.NotificationItem> = {}): api.NotificationItem => ({
  id,
  kind: 'comment_tag',
  title: 'You were tagged in a comment',
  body: 'Lan tagged you in “Hội nghị”.',
  url: '/#activity/12',
  email_status: null,
  push_status: null,
  seen_at: null,
  created_at: '2026-10-09T01:00:00.000Z',
  ...over,
});

const Probe = () => <div data-testid="path">{useLocation().pathname}</div>;

function setup(data: api.NotificationsResponse) {
  vi.mocked(api.fetchNotifications).mockResolvedValue(data);
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  render(
    <QueryClientProvider client={qc}>
      <ToastProvider>
        <MemoryRouter initialEntries={['/dashboard']}>
          <div data-testid="outside">ngoài</div>
          <NotificationBell />
          <Routes><Route path="*" element={<Probe />} /></Routes>
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>
  );
  return qc;
}

const bellButton = () => screen.getByRole('button', { name: /^Thông báo/ });
const badge = () => screen.queryByTestId('notification-badge');

describe('NotificationBell', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.markNotificationSeen).mockResolvedValue({ ok: true });
    vi.mocked(api.markAllNotificationsSeen).mockResolvedValue({ ok: true, marked_seen: 2 });
  });
  afterEach(() => {
    vi.useRealTimers();
    cleanup();
  });

  it('huy hiệu hiện số chưa xem, tối đa "99+", ẩn khi 0', async () => {
    setup({ notifications: [item(1)], unread_count: 7 });
    await waitFor(() => expect(badge()?.textContent).toBe('7'));
    cleanup();
    setup({ notifications: [item(1)], unread_count: 120 });
    await waitFor(() => expect(badge()?.textContent).toBe('99+'));
    cleanup();
    setup({ notifications: [item(1, { seen_at: '2026-10-09T02:00:00Z' })], unread_count: 0 });
    await waitFor(() => expect(api.fetchNotifications).toHaveBeenCalled());
    await waitFor(() => expect(badge()).toBeNull());
  });

  it('tải lại mỗi 60 giây', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    setup({ notifications: [], unread_count: 0 });
    await waitFor(() => expect(api.fetchNotifications).toHaveBeenCalledTimes(1));
    await vi.advanceTimersByTimeAsync(60_000);
    await waitFor(() => expect(vi.mocked(api.fetchNotifications).mock.calls.length).toBeGreaterThanOrEqual(2));
  });

  it('mở bảng: tải lại, gọi đánh dấu tất cả đã xem đúng một lần, huy hiệu về 0, hiện mục đã dịch', async () => {
    setup({
      notifications: [item(2, { email_status: 'success' }), item(1)],
      unread_count: 2,
    });
    await waitFor(() => expect(badge()?.textContent).toBe('2'));
    const callsBefore = vi.mocked(api.fetchNotifications).mock.calls.length;

    fireEvent.click(bellButton());

    const dialog = await screen.findByRole('dialog', { name: 'Thông báo' });
    expect(within(dialog).getByText('Lưu trong 7 ngày')).toBeDefined();
    expect(within(dialog).getAllByText('Bạn được gắn thẻ trong một bình luận')).toHaveLength(2);
    expect(within(dialog).getAllByText('Lan đã gắn thẻ bạn trong “Hội nghị”.')).toHaveLength(2);
    expect(within(dialog).getByText('Email: đã gửi')).toBeDefined();
    await waitFor(() => expect(api.markAllNotificationsSeen).toHaveBeenCalledTimes(1));
    expect(vi.mocked(api.fetchNotifications).mock.calls.length).toBeGreaterThan(callsBefore);
    await waitFor(() => expect(badge()).toBeNull());
    expect(within(dialog).getByTestId('notification-2').getAttribute('data-unread')).toBe('false');
  });

  it('mở bảng khi không còn mục chưa xem thì không gọi đánh dấu tất cả', async () => {
    setup({ notifications: [item(1, { seen_at: '2026-10-09T02:00:00Z' })], unread_count: 0 });
    await waitFor(() => expect(api.fetchNotifications).toHaveBeenCalled());
    fireEvent.click(bellButton());
    await screen.findByRole('dialog', { name: 'Thông báo' });
    await waitFor(() => expect(vi.mocked(api.fetchNotifications).mock.calls.length).toBeGreaterThanOrEqual(2));
    expect(api.markAllNotificationsSeen).not.toHaveBeenCalled();
  });

  it('trạng thái rỗng', async () => {
    setup({ notifications: [], unread_count: 0 });
    await waitFor(() => expect(api.fetchNotifications).toHaveBeenCalled());
    fireEvent.click(bellButton());
    expect(await screen.findByText('Chưa có thông báo.')).toBeDefined();
  });

  it('bấm một mục: đánh dấu mục đó, đóng bảng, đi tới đường dẫn đã chuẩn hoá', async () => {
    vi.mocked(api.markAllNotificationsSeen).mockImplementation(() => new Promise(() => {}));
    setup({ notifications: [item(5, { url: '/#activity/12' })], unread_count: 1 });
    await waitFor(() => expect(badge()?.textContent).toBe('1'));
    fireEvent.click(bellButton());
    const row = await screen.findByTestId('notification-5');
    fireEvent.click(row);
    await waitFor(() => expect(screen.getByTestId('path').textContent).toBe('/activity/12'));
    expect(api.markNotificationSeen).toHaveBeenCalledWith(5);
    expect(screen.queryByRole('dialog', { name: 'Thông báo' })).toBeNull();
    await waitFor(() => expect(badge()).toBeNull());
  });

  it('bấm mục đã xem: đi tới đường dẫn nhưng không gọi PATCH', async () => {
    setup({ notifications: [item(6, { seen_at: '2026-10-09T02:00:00Z', url: '/#teams' })], unread_count: 0 });
    await waitFor(() => expect(api.fetchNotifications).toHaveBeenCalled());
    fireEvent.click(bellButton());
    fireEvent.click(await screen.findByTestId('notification-6'));
    await waitFor(() => expect(screen.getByTestId('path').textContent).toBe('/teams'));
    expect(api.markNotificationSeen).not.toHaveBeenCalled();
  });

  it('thông báo không có url thì về Tổng quan', async () => {
    setup({ notifications: [item(7, { seen_at: '2026-10-09T02:00:00Z', url: null })], unread_count: 0 });
    await waitFor(() => expect(api.fetchNotifications).toHaveBeenCalled());
    fireEvent.click(bellButton());
    fireEvent.click(await screen.findByTestId('notification-7'));
    await waitFor(() => expect(screen.getByTestId('path').textContent).toBe('/dashboard'));
  });

  it('bấm ra ngoài hoặc nhấn Escape thì đóng bảng', async () => {
    setup({ notifications: [], unread_count: 0 });
    await waitFor(() => expect(api.fetchNotifications).toHaveBeenCalled());
    fireEvent.click(bellButton());
    await screen.findByRole('dialog', { name: 'Thông báo' });
    fireEvent.mouseDown(screen.getByTestId('outside'));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Thông báo' })).toBeNull());

    fireEvent.click(bellButton());
    await screen.findByRole('dialog', { name: 'Thông báo' });
    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Thông báo' })).toBeNull());
  });

  it('lỗi khi đánh dấu tất cả hiện toast tiếng Việt', async () => {
    vi.mocked(api.markAllNotificationsSeen).mockRejectedValueOnce({
      response: { status: 500, data: { error: 'Notification not found.' } },
    });
    setup({ notifications: [item(1)], unread_count: 1 });
    await waitFor(() => expect(badge()?.textContent).toBe('1'));
    fireEvent.click(bellButton());
    expect(await screen.findByText('Không tìm thấy thông báo.')).toBeDefined();
  });
});

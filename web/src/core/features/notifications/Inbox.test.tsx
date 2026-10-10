import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { Inbox } from './Inbox';
import { NOTIFICATIONS_KEY } from './useNotifications';
import { ToastProvider } from '../../../shared/components/Toast';
import * as api from '../../api';

vi.mock('../../api', async () => {
  const actual = await vi.importActual<typeof import('../../api')>('../../api');
  return { ...actual, fetchNotifications: vi.fn(), markNotificationSeen: vi.fn(), markAllNotificationsSeen: vi.fn() };
});

const n = (id: number, over: Partial<api.NotificationItem> = {}): api.NotificationItem => ({
  id, kind: 'task_assigned', title: `Tiêu đề ${id}`, body: `Nội dung ${id}`, url: '/#activity/12', seen_at: null, created_at: '2026-10-09T01:00:00.000Z', ...over,
});
const DATA: api.NotificationsResponse = {
  unread_count: 3,
  notifications: [
    n(1, { kind: 'comment_tag', title: 'You were tagged in a comment', body: 'Lan tagged you in “Hội nghị”.' }),
    n(2, { kind: 'task_review', title: 'Nghiệm thu', url: '/#activity/5' }),
    n(3, { kind: 'task_assigned' }),
    n(4, { kind: 'comment_tag', seen_at: '2026-10-09T02:00:00Z', title: 'Đã đọc nhắc tên' }),
  ],
};

const Probe = () => <div data-testid="path">{useLocation().pathname}</div>;

function setup(data: api.NotificationsResponse | null = DATA) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  if (data) qc.setQueryData(NOTIFICATIONS_KEY, data);
  const user = userEvent.setup();
  render(
    <QueryClientProvider client={qc}>
      <ToastProvider>
        <MemoryRouter initialEntries={['/inbox']}>
          <Routes>
            <Route path="/inbox" element={<Inbox />} />
            <Route path="*" element={<Probe />} />
          </Routes>
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>
  );
  return { qc, user };
}
const rows = () => screen.queryAllByRole('listitem');

beforeEach(() => { vi.clearAllMocks(); vi.mocked(api.markNotificationSeen).mockResolvedValue({ ok: true }); vi.mocked(api.markAllNotificationsSeen).mockResolvedValue({ ok: true, marked_seen: 3 }); });
afterEach(cleanup);

describe('Inbox', () => {
  it('liệt kê thông báo từ cache, dịch tiêu đề/nội dung tiếng Anh của Core', () => {
    setup();
    expect(rows()).toHaveLength(4);
    expect(screen.getByText('Bạn được gắn thẻ trong một bình luận')).toBeInTheDocument();
    expect(screen.getByText('Lan đã gắn thẻ bạn trong “Hội nghị”.')).toBeInTheDocument();
  });

  it('không tự gọi API tải thông báo (chỉ chuông poll)', () => {
    setup();
    expect(api.fetchNotifications).not.toHaveBeenCalled();
  });

  it('lọc Chưa đọc', async () => {
    const { user } = setup();
    await user.click(screen.getByRole('button', { name: 'Chưa đọc' }));
    expect(rows()).toHaveLength(3);
    expect(screen.queryByText('Đã đọc nhắc tên')).toBeNull();
  });

  it('lọc Nhắc tên', async () => {
    const { user } = setup();
    await user.click(screen.getByRole('button', { name: 'Nhắc tên' }));
    expect(rows()).toHaveLength(2);
  });

  it('lọc Duyệt', async () => {
    const { user } = setup();
    await user.click(screen.getByRole('button', { name: 'Duyệt' }));
    expect(rows()).toHaveLength(1);
    expect(screen.getByText('Nghiệm thu')).toBeInTheDocument();
  });

  it('bộ lọc kết hợp (Chưa đọc + Nhắc tên) và bấm lại để bỏ lọc', async () => {
    const { user } = setup();
    await user.click(screen.getByRole('button', { name: 'Chưa đọc' }));
    await user.click(screen.getByRole('button', { name: 'Nhắc tên' }));
    expect(rows()).toHaveLength(1);
    await user.click(screen.getByRole('button', { name: 'Nhắc tên' }));
    expect(rows()).toHaveLength(3);
  });

  it('trạng thái rỗng', async () => {
    const { user } = setup({ notifications: [], unread_count: 0 });
    expect(screen.getByText('Hộp thư trống.')).toBeInTheDocument();
    cleanup();
    const s = setup();
    await s.user.click(screen.getByRole('button', { name: 'Duyệt' }));
    await s.user.click(screen.getByRole('button', { name: 'Nhắc tên' }));
    expect(screen.getByText('Không có thông báo nào khớp bộ lọc.')).toBeInTheDocument();
    void user;
  });

  it('mở thông báo: đánh dấu đã xem, giảm huy hiệu và đi tới url đã đổi sang route', async () => {
    const { qc, user } = setup();
    await user.click(screen.getByRole('button', { name: /Nghiệm thu/ }));
    expect(api.markNotificationSeen).toHaveBeenCalledWith(2);
    await waitFor(() => expect(screen.getByTestId('path')).toHaveTextContent('/activity/5'));
    const cache = qc.getQueryData<api.NotificationsResponse>(NOTIFICATIONS_KEY)!;
    expect(cache.unread_count).toBe(2);
    expect(cache.notifications.find((x) => x.id === 2)?.seen_at).toBeTruthy();
  });

  it('mở thông báo đã đọc không gọi API đánh dấu', async () => {
    const { user } = setup();
    await user.click(screen.getByRole('button', { name: /Đã đọc nhắc tên/ }));
    expect(api.markNotificationSeen).not.toHaveBeenCalled();
  });

  it('Đánh dấu tất cả đã đọc', async () => {
    const { qc, user } = setup();
    await user.click(screen.getByRole('button', { name: 'Đánh dấu tất cả đã đọc' }));
    expect(api.markAllNotificationsSeen).toHaveBeenCalledTimes(1);
    const cache = qc.getQueryData<api.NotificationsResponse>(NOTIFICATIONS_KEY)!;
    expect(cache.unread_count).toBe(0);
    expect(cache.notifications.every((x) => x.seen_at)).toBe(true);
  });

  it('nút Đánh dấu tất cả bị khoá khi không còn thông báo chưa đọc', () => {
    setup({ ...DATA, unread_count: 0, notifications: [n(4, { seen_at: '2026-10-09T02:00:00Z' })] });
    expect(screen.getByRole('button', { name: 'Đánh dấu tất cả đã đọc' })).toBeDisabled();
  });

  it('chưa có dữ liệu thì hiện đang tải', () => {
    setup(null);
    expect(screen.getByRole('status')).toHaveTextContent('Đang tải');
  });

  it('thông báo chưa đọc có dấu hiệu nhận biết', () => {
    setup();
    const first = within(rows()[0]);
    expect(first.getByLabelText('Chưa đọc')).toBeInTheDocument();
  });
});

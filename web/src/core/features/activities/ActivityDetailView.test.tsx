// web/src/core/features/activities/ActivityDetailView.test.tsx
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { cleanup, screen, within } from '@testing-library/react';
import { ActivityDetailView } from './ActivityDetailView';
import { makeDetail, renderInApp } from './testUtils';
import * as api from '../../api';

vi.mock('../../api', async () => {
  const actual = await vi.importActual<typeof import('../../api')>('../../api');
  return { ...actual, fetchActivityDetail: vi.fn() };
});

const show = () => renderInApp(<ActivityDetailView />, { path: '/activity/5', routePath: '/activity/:id' });

describe('ActivityDetailView — thông tin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  afterEach(cleanup);

  it('hiện phần đầu, thông tin chung, Tổ, người tham gia, chi tiết và lịch sử đề án', async () => {
    vi.mocked(api.fetchActivityDetail).mockResolvedValue(
      makeDetail({
        participants: [{ activity_id: 5, user_id: 21, state: 'confirmed', responsibility: 'Hậu cần', name: 'Phạm Hậu Cần', role: 'member' }],
        proposalHistory: [
          {
            id: 1,
            action: 'request_changes',
            submitter_name: 'Trần Người Tạo',
            reviewer_name: 'Quản trị A',
            feedback_notes: 'Bổ sung dự toán',
            created_at: '2026-10-02T03:00:00.000Z',
          },
        ],
      })
    );
    show();

    expect(await screen.findByRole('heading', { level: 1, name: 'Ngày hội Kỹ thuật' })).toBeDefined();
    expect(screen.getByText('Ngày hội giới thiệu các câu lạc bộ kỹ thuật.')).toBeDefined();
    expect(screen.getByText('Đề xuất')).toBeDefined();
    expect(screen.getByText('Ưu tiên: Cao')).toBeDefined();

    const info = within(screen.getByTestId('section-info'));
    expect(info.getByText('Tuyên huấn, Truyền thông')).toBeDefined();
    expect(info.getByText('01/11/2026 – 30/11/2026')).toBeDefined();
    expect(info.getByText('Hội trường A')).toBeDefined();
    expect(info.getByText('Trần Người Tạo')).toBeDefined();
    expect(info.getByText('Lê Trưởng BTC')).toBeDefined();
    expect(info.getByRole('link', { name: 'Mở link đề án' }).getAttribute('href')).toBe('https://drive.example/de-an');

    const teams = within(screen.getByTestId('section-teams'));
    expect(teams.getByText('Chủ trì')).toBeDefined();
    expect(teams.getByText('Hỗ trợ truyền thông')).toBeDefined();

    const people = within(screen.getByTestId('section-participants'));
    expect(people.getByText('Phạm Hậu Cần')).toBeDefined();
    expect(people.getByText('Đã xác nhận')).toBeDefined();
    expect(people.getByText('Hậu cần')).toBeDefined();

    const history = within(screen.getByTestId('section-history'));
    expect(history.getByText('Yêu cầu sửa')).toBeDefined();
    expect(history.getByText('Bổ sung dự toán')).toBeDefined();
    expect(history.getByText(/Quản trị A/)).toBeDefined();
  });

  it('link đề án không phải http(s) thì không thành thẻ a', async () => {
    vi.mocked(api.fetchActivityDetail).mockResolvedValue(makeDetail({ activity: { proposal_document_url: 'javascript:alert(1)' } }));
    show();
    await screen.findByRole('heading', { level: 1 });
    expect(screen.queryByRole('link', { name: 'Mở link đề án' })).toBeNull();
  });

  it('"Yêu cầu bởi" chỉ hiện với hoạt động chỉ đạo (assigned)', async () => {
    vi.mocked(api.fetchActivityDetail).mockResolvedValue(makeDetail({ activity: { type: 'assigned', requested_by: 'Ban Thường vụ' } }));
    show();
    await screen.findByRole('heading', { level: 1 });
    expect(within(screen.getByTestId('section-details')).getByText('Ban Thường vụ')).toBeDefined();
    cleanup();

    vi.mocked(api.fetchActivityDetail).mockResolvedValue(makeDetail({ activity: { type: 'event', requested_by: 'Ban Thường vụ' } }));
    show();
    await screen.findByRole('heading', { level: 1 });
    expect(within(screen.getByTestId('section-details')).queryByText('Ban Thường vụ')).toBeNull();
  });

  it('404 từ server hiện "Không tìm thấy hoạt động hoặc bạn không có quyền xem."', async () => {
    vi.mocked(api.fetchActivityDetail).mockRejectedValue({ response: { status: 404, data: { error: 'Activity not found.' } } });
    show();
    expect(await screen.findByText('Không tìm thấy hoạt động hoặc bạn không có quyền xem.')).toBeDefined();
    expect(screen.getByRole('link', { name: /Danh sách hoạt động/ }).getAttribute('href')).toBe('#/activities');
  });

  it('lỗi khác hiện câu lỗi tiếng Việt, mất mạng hiện "Không kết nối được máy chủ"', async () => {
    vi.mocked(api.fetchActivityDetail).mockRejectedValue(new Error('Network Error'));
    show();
    expect(await screen.findByText('Không kết nối được máy chủ. Vui lòng thử lại.')).toBeDefined();
  });

  it('id không hợp lệ không gọi API', async () => {
    renderInApp(<ActivityDetailView />, { path: '/activity/abc', routePath: '/activity/:id' });
    expect(await screen.findByText('Không tìm thấy hoạt động hoặc bạn không có quyền xem.')).toBeDefined();
    expect(api.fetchActivityDetail).not.toHaveBeenCalled();
  });

  it('hiện dòng thời gian cập nhật và form đăng cập nhật', async () => {
    vi.mocked(api.fetchActivityDetail).mockResolvedValue(
      makeDetail({
        updates: [{ id: 1, kind: 'progress', body: 'Đã in xong tờ rơi', created_at: '2026-10-05T03:00:00.000Z', user_name: 'Trần Người Tạo', tagged_users: [] }],
      })
    );
    show();
    expect(await screen.findByText('Đã in xong tờ rơi')).toBeDefined();
    expect(screen.getByRole('button', { name: 'Đăng cập nhật' })).toBeDefined();
  });
});

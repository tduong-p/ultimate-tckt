import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { ActivityActions } from './ActivityActions';
import { makeDetail, renderInApp } from './testUtils';
import * as api from '../../api';

vi.mock('../../api', async () => {
  const actual = await vi.importActual<typeof import('../../api')>('../../api');
  return {
    ...actual,
    approveActivity: vi.fn(),
    requestActivityChanges: vi.fn(),
    rejectActivity: vi.fn(),
    submitActivity: vi.fn(),
    deleteActivity: vi.fn(),
    volunteerForActivity: vi.fn(),
    fetchBootstrap: vi.fn(),
    fetchTeams: vi.fn(),
    fetchMembers: vi.fn(),
  };
});

const show = (role: string, detail = makeDetail({ canManage: true }), children?: React.ReactNode) =>
  renderInApp(<ActivityActions detail={detail}>{children}</ActivityActions>, { role, userId: 3 });

const buttons = () => within(screen.getByTestId('activity-actions')).queryAllByRole('button').map((button) => button.textContent?.trim());

describe('ActivityActions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.approveActivity).mockResolvedValue({ ok: true });
    vi.mocked(api.requestActivityChanges).mockResolvedValue({ ok: true });
    vi.mocked(api.rejectActivity).mockResolvedValue({ ok: true, deleted: true });
    vi.mocked(api.submitActivity).mockResolvedValue({ ok: true });
    vi.mocked(api.deleteActivity).mockResolvedValue({ ok: true, id: 5, title: 'Ngày hội Kỹ thuật' });
    vi.mocked(api.volunteerForActivity).mockResolvedValue({ ok: true });
    vi.mocked(api.fetchBootstrap).mockResolvedValue({
      stats: { activeActivities: 0, openTasks: 0, overdueTasks: 0, completedMonth: 0 },
      upcoming: [], tasks: [], activity: [], teams: [],
      capabilities: { canCreateActivity: true, canCreateAccount: true },
    });
    vi.mocked(api.fetchTeams).mockResolvedValue([]);
    vi.mocked(api.fetchMembers).mockResolvedValue([]);
  });
  afterEach(cleanup);

  describe('quyền hiển thị', () => {
    it('admin thấy các thao tác duyệt và xoá đề án chờ duyệt', () => {
      show('admin');
      expect(buttons()).toEqual(['Duyệt', 'Yêu cầu sửa', 'Từ chối', 'Sửa', 'Xoá hoạt động', 'Đăng ký tham gia', 'Thêm người tham gia']);
    });

    it('người quản lý không phải admin được sửa và thêm người, nhưng không được duyệt hay xoá', () => {
      show('leader');
      expect(buttons()).toEqual(['Sửa', 'Đăng ký tham gia', 'Thêm người tham gia']);
    });

    it('người không quản lý không thấy nút thêm người tham gia', () => {
      show('member', makeDetail({ canManage: false }));
      expect(buttons()).toEqual(['Đăng ký tham gia']);
      expect(screen.queryByRole('button', { name: 'Thêm người tham gia' })).toBeNull();
    });

    it('người quản lý được nộp lại đề án cần sửa', () => {
      show('leader', makeDetail({ canManage: true, activity: { status: 'changes_requested' } }));
      expect(screen.getByRole('button', { name: 'Nộp lại' })).toBeDefined();
    });

    it('người đã đăng ký không được đăng ký lại; người từng từ chối được đăng ký', () => {
      show('member', makeDetail({ canManage: false, participants: [{ user_id: 3, state: 'volunteered', name: 'Tôi' }] }));
      expect(screen.queryByRole('button', { name: 'Đăng ký tham gia' })).toBeNull();
      cleanup();
      show('member', makeDetail({ canManage: false, participants: [{ user_id: 3, state: 'declined', name: 'Tôi' }] }));
      expect(screen.getByRole('button', { name: 'Đăng ký tham gia' })).toBeDefined();
    });

    it('hiển thị nút con trong thanh hành động', () => {
      show('member', makeDetail({ canManage: false }), <button type="button">Giao việc</button>);
      expect(within(screen.getByTestId('activity-actions')).getByRole('button', { name: 'Giao việc' })).toBeDefined();
    });
  });

  describe('thao tác', () => {
    it('duyệt đề án, thông báo và làm mới chi tiết', async () => {
      const { qc } = show('admin');
      const invalidate = vi.spyOn(qc, 'invalidateQueries');
      fireEvent.click(screen.getByRole('button', { name: 'Duyệt' }));
      await waitFor(() => expect(api.approveActivity).toHaveBeenCalledWith(5));
      expect(await screen.findByText('Đã duyệt hoạt động.')).toBeDefined();
      expect(invalidate).toHaveBeenCalledWith({ queryKey: ['core-activity', 5] });
    });

    it('hiện lỗi 409 từ server bằng tiếng Việt', async () => {
      vi.mocked(api.approveActivity).mockRejectedValue({ response: { status: 409, data: { error: 'Đề án không ở trạng thái chờ duyệt.' } } });
      show('admin');
      fireEvent.click(screen.getByRole('button', { name: 'Duyệt' }));
      expect(await screen.findByText('Đề án không ở trạng thái chờ duyệt.')).toBeDefined();
    });

    it('yêu cầu sửa bắt buộc lý do và gửi đúng nội dung', async () => {
      show('admin');
      fireEvent.click(screen.getByRole('button', { name: 'Yêu cầu sửa' }));
      const dialog = await screen.findByRole('dialog');
      fireEvent.click(within(dialog).getByRole('button', { name: 'Gửi yêu cầu' }));
      expect(within(dialog).getByText('Vui lòng nhập lý do.')).toBeDefined();
      expect(api.requestActivityChanges).not.toHaveBeenCalled();
      fireEvent.change(within(dialog).getByRole('textbox'), { target: { value: 'Thiếu dự toán' } });
      fireEvent.click(within(dialog).getByRole('button', { name: 'Gửi yêu cầu' }));
      await waitFor(() => expect(api.requestActivityChanges).toHaveBeenCalledWith(5, 'Thiếu dự toán'));
      expect(await screen.findByText('Đã gửi yêu cầu chỉnh sửa.')).toBeDefined();
      await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    });

    it('từ chối gửi lý do, xoá cache chi tiết và quay về danh sách', async () => {
      const { qc } = show('admin');
      qc.setQueryData(['core-activity', 5], makeDetail());
      fireEvent.click(screen.getByRole('button', { name: 'Từ chối' }));
      const dialog = await screen.findByRole('dialog');
      fireEvent.change(within(dialog).getByRole('textbox'), { target: { value: 'Trùng lịch' } });
      fireEvent.click(within(dialog).getByRole('button', { name: 'Từ chối và xoá' }));
      await waitFor(() => expect(api.rejectActivity).toHaveBeenCalledWith(5, 'Trùng lịch'));
      await waitFor(() => expect(screen.getByTestId('path').textContent).toBe('/activities'));
      expect(qc.getQueryData(['core-activity', 5])).toBeUndefined();
    });

    it('nộp lại đề án cần sửa', async () => {
      show('leader', makeDetail({ canManage: true, activity: { status: 'changes_requested' } }));
      fireEvent.click(screen.getByRole('button', { name: 'Nộp lại' }));
      await waitFor(() => expect(api.submitActivity).toHaveBeenCalledWith(5));
      expect(await screen.findByText('Đã nộp lại đề án.')).toBeDefined();
    });

    it('đăng ký tham gia', async () => {
      show('member', makeDetail({ canManage: false }));
      fireEvent.click(screen.getByRole('button', { name: 'Đăng ký tham gia' }));
      await waitFor(() => expect(api.volunteerForActivity).toHaveBeenCalledWith(5));
      expect(await screen.findByText('Đã đăng ký tham gia.')).toBeDefined();
    });

    it('xoá chỉ khi gõ đúng tiêu đề, rồi xoá cache và quay về danh sách', async () => {
      const { qc } = show('admin');
      qc.setQueryData(['core-activity', 5], makeDetail());
      fireEvent.click(screen.getByRole('button', { name: 'Xoá hoạt động' }));
      const dialog = await screen.findByRole('dialog');
      expect((within(dialog).getByRole('button', { name: 'Xoá vĩnh viễn' }) as HTMLButtonElement).disabled).toBe(true);
      fireEvent.change(within(dialog).getByLabelText(/Gõ lại/), { target: { value: 'Ngày hội Kỹ thuật' } });
      const confirm = within(dialog).getByRole('button', { name: 'Xoá vĩnh viễn' }) as HTMLButtonElement;
      expect(confirm.disabled).toBe(false);
      fireEvent.click(confirm);
      await waitFor(() => expect(api.deleteActivity).toHaveBeenCalledWith(5));
      await waitFor(() => expect(screen.getByTestId('path').textContent).toBe('/activities'));
      expect(qc.getQueryData(['core-activity', 5])).toBeUndefined();
    });

    it('mở được hộp thoại sửa và thêm người tham gia', async () => {
      show('admin');
      fireEvent.click(screen.getByRole('button', { name: 'Sửa' }));
      expect(await screen.findByText('Sửa hoạt động')).toBeDefined();
      fireEvent.click(screen.getByRole('button', { name: 'Huỷ' }));
      await waitFor(() => expect(screen.queryByText('Sửa hoạt động')).toBeNull());
      fireEvent.click(screen.getByRole('button', { name: 'Thêm người tham gia' }));
      expect(await screen.findByLabelText('Chọn người tham gia')).toBeDefined();
    });
  });
});

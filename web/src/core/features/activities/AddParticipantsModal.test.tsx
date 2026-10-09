import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { AddParticipantsModal } from './AddParticipantsModal';
import { makeDetail, renderInApp } from './testUtils';
import * as api from '../../api';

vi.mock('../../api', async () => {
  const actual = await vi.importActual<typeof import('../../api')>('../../api');
  return { ...actual, addActivityParticipants: vi.fn() };
});

const detail = makeDetail({
  canManage: true,
  people: [
    { id: 7, name: 'Phạm Hùng', team_id: 2, team_ids: [2], team_names: ['Tuyên huấn'] },
    { id: 8, name: 'Vũ Lan', team_id: 3, team_ids: [3], team_names: ['Truyền thông'] },
    { id: 21, name: 'Đã Có Mặt', team_id: 2, team_ids: [2], team_names: ['Tuyên huấn'] },
    { id: 22, name: 'Từng Từ Chối', team_id: 2, team_ids: [2], team_names: ['Tuyên huấn'] },
  ],
  participants: [
    { user_id: 21, state: 'confirmed', name: 'Đã Có Mặt' },
    { user_id: 22, state: 'declined', name: 'Từng Từ Chối' },
  ],
});

const show = (onClose = vi.fn()) => {
  const utils = renderInApp(<AddParticipantsModal isOpen onClose={onClose} detail={detail} />, { role: 'leader' });
  return { ...utils, onClose };
};
const search = (text: string) => fireEvent.change(screen.getByLabelText('Chọn người tham gia'), { target: { value: text } });

describe('AddParticipantsModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.addActivityParticipants).mockResolvedValue(undefined);
  });
  afterEach(cleanup);

  it('chọn người, gửi user_ids và vai trò mặc định, toast, đóng, làm mới cache', async () => {
    const { qc, onClose } = show();
    const spy = vi.spyOn(qc, 'invalidateQueries');
    search('hung');
    fireEvent.click(await screen.findByRole('option', { name: 'Phạm Hùng' }));
    search('lan');
    fireEvent.click(await screen.findByRole('option', { name: 'Vũ Lan' }));
    fireEvent.click(screen.getByRole('button', { name: 'Thêm' }));

    await waitFor(() => expect(api.addActivityParticipants).toHaveBeenCalledWith(5, { user_ids: [7, 8], responsibility: 'Người tham gia hoạt động' }));
    expect(await screen.findByText('Đã thêm người tham gia.')).toBeDefined();
    expect(onClose).toHaveBeenCalled();
    expect(spy).toHaveBeenCalledWith({ queryKey: ['core-activity', 5] });
  });

  it('gửi vai trò tự nhập (đã cắt khoảng trắng)', async () => {
    show();
    search('hung');
    fireEvent.click(await screen.findByRole('option', { name: 'Phạm Hùng' }));
    fireEvent.change(screen.getByLabelText('Vai trò'), { target: { value: '  Hậu cần  ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Thêm' }));
    await waitFor(() => expect(api.addActivityParticipants).toHaveBeenCalledWith(5, { user_ids: [7], responsibility: 'Hậu cần' }));
  });

  it('người đã tham gia không được gợi ý, người từng từ chối thì được', async () => {
    show();
    search('co mat');
    await waitFor(() => expect(screen.queryByRole('option', { name: 'Đã Có Mặt' })).toBeNull());
    search('tung');
    expect(await screen.findByRole('option', { name: 'Từng Từ Chối' })).toBeDefined();
  });

  it('lọc theo Tổ lấy từ các Tổ của hoạt động', async () => {
    show();
    fireEvent.change(screen.getByLabelText('Lọc theo Tổ'), { target: { value: '3' } });
    search('hung');
    await waitFor(() => expect(screen.queryByRole('option', { name: 'Phạm Hùng' })).toBeNull());
    search('lan');
    expect(await screen.findByRole('option', { name: 'Vũ Lan' })).toBeDefined();
  });

  it('chưa chọn ai thì báo lỗi và không gọi API', () => {
    show();
    fireEvent.click(screen.getByRole('button', { name: 'Thêm' }));
    expect(screen.getByText('Hãy chọn ít nhất một thành viên.')).toBeDefined();
    expect(api.addActivityParticipants).not.toHaveBeenCalled();
  });

  it('lỗi tiếng Anh của server hiện bằng tiếng Việt, modal vẫn mở', async () => {
    vi.mocked(api.addActivityParticipants).mockRejectedValue({
      response: { status: 403, data: { error: 'You may only add active members from teams you lead or teams on this activity.' } },
    });
    const { onClose } = show();
    search('hung');
    fireEvent.click(await screen.findByRole('option', { name: 'Phạm Hùng' }));
    fireEvent.click(screen.getByRole('button', { name: 'Thêm' }));
    expect(await screen.findByText('Bạn chỉ được thêm thành viên đang hoạt động thuộc Tổ bạn phụ trách hoặc Tổ của hoạt động này.')).toBeDefined();
    expect(onClose).not.toHaveBeenCalled();
  });
});

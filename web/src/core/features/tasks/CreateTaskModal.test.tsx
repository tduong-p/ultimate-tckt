import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { CreateTaskModal } from './CreateTaskModal';
import { makeDetail, renderInApp } from '../activities/testUtils';
import * as api from '../../api';

vi.mock('../../api', async () => {
  const actual = await vi.importActual<typeof import('../../api')>('../../api');
  return { ...actual, createActivityTask: vi.fn() };
});

const detail = makeDetail({
  canManage: true,
  people: [
    { id: 7, name: 'Phạm Hùng', team_id: 2, team_ids: [2], team_names: ['Tuyên huấn'] },
    { id: 8, name: 'Vũ Lan', team_id: 2, team_ids: [2], team_names: ['Tuyên huấn'] },
    { id: 9, name: 'Đỗ Minh', team_id: 3, team_ids: [3], team_names: ['Truyền thông'] },
  ],
});

const show = (d = detail, onClose = vi.fn()) => ({ onClose, ...renderInApp(<CreateTaskModal isOpen onClose={onClose} detail={d} />, { role: 'leader' }) });
const type = (label: string, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } });
const create = () => fireEvent.click(screen.getByRole('button', { name: 'Tạo nhiệm vụ' }));

describe('CreateTaskModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.createActivityTask).mockResolvedValue({ id: 99 });
  });
  afterEach(cleanup);

  it('mặc định Tổ chủ trì, giai đoạn Trước, hạn chót = hạn hoạt động, chỉ liệt kê thành viên của Tổ', () => {
    show();
    expect((screen.getByLabelText('Tổ phụ trách *') as HTMLSelectElement).value).toBe('2');
    expect((screen.getByLabelText('Giai đoạn') as HTMLSelectElement).value).toBe('before');
    expect((screen.getByLabelText('Hạn chót *') as HTMLInputElement).value).toBe('2026-11-30');
    const options = Array.from((screen.getByLabelText('Người phụ trách chính *') as HTMLSelectElement).options).map((o) => o.text);
    expect(options).toEqual(['Chọn người phụ trách', 'Phạm Hùng', 'Vũ Lan']);
  });

  it('gửi payload đúng, toast, đóng, làm mới chi tiết hoạt động', async () => {
    const { qc, onClose } = show();
    const spy = vi.spyOn(qc, 'invalidateQueries');
    type('Tiêu đề *', '  Chuẩn bị âm thanh ');
    type('Người phụ trách chính *', '7');
    type('Mức ưu tiên', 'high');
    type('Giai đoạn', 'during');
    type('Ngày bắt đầu', '2026-11-10');
    type('Sản phẩm bàn giao', 'Biên bản');
    create();

    await waitFor(() =>
      expect(api.createActivityTask).toHaveBeenCalledWith(5, {
        title: 'Chuẩn bị âm thanh',
        description: null,
        stage: 'during',
        priority: 'high',
        team_id: 2,
        primary_assignee_id: 7,
        co_assignee_ids: [],
        start_date: '2026-11-10',
        deadline: '2026-11-30',
        deliverable: 'Biên bản',
      })
    );
    expect(await screen.findByText('Đã tạo nhiệm vụ.')).toBeDefined();
    expect(onClose).toHaveBeenCalled();
    expect(spy).toHaveBeenCalledWith({ queryKey: ['core-activity', 5] });
  });

  it('đổi Tổ thì danh sách người phụ trách đổi theo và xoá lựa chọn cũ', () => {
    show();
    type('Người phụ trách chính *', '7');
    type('Tổ phụ trách *', '3');
    const select = screen.getByLabelText('Người phụ trách chính *') as HTMLSelectElement;
    expect(select.value).toBe('');
    expect(Array.from(select.options).map((o) => o.text)).toEqual(['Chọn người phụ trách', 'Đỗ Minh']);
  });

  it('thiếu tiêu đề / người phụ trách / hạn chót thì báo lỗi, không gọi API', () => {
    show();
    create();
    expect(screen.getByText('Vui lòng nhập tiêu đề nhiệm vụ.')).toBeDefined();
    type('Tiêu đề *', 'A');
    create();
    expect(screen.getByText('Vui lòng chọn người phụ trách chính.')).toBeDefined();
    type('Người phụ trách chính *', '7');
    type('Hạn chót *', '');
    create();
    expect(screen.getByText('Vui lòng chọn hạn chót.')).toBeDefined();
    type('Hạn chót *', '2026-11-05');
    type('Ngày bắt đầu', '2026-11-20');
    create();
    expect(screen.getByText('Ngày bắt đầu không được sau hạn chót.')).toBeDefined();
    expect(api.createActivityTask).not.toHaveBeenCalled();
  });

  it('hoạt động được giao (assigned) chỉ có giai đoạn Chung', () => {
    show(makeDetail({ canManage: true, activity: { type: 'assigned' }, people: detail.people }));
    const select = screen.getByLabelText('Giai đoạn') as HTMLSelectElement;
    expect(Array.from(select.options).map((o) => o.value)).toEqual(['general']);
  });

  it('lỗi server hiện thành toast, modal vẫn mở', async () => {
    vi.mocked(api.createActivityTask).mockRejectedValue({ response: { status: 403, data: { error: 'Bạn không thể giao việc cho ban này.' } } });
    const { onClose } = show();
    type('Tiêu đề *', 'A');
    type('Người phụ trách chính *', '7');
    create();
    expect(await screen.findByText('Bạn không thể giao việc cho ban này.')).toBeDefined();
    expect(onClose).not.toHaveBeenCalled();
  });
});

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { ReviewDecisionModal } from './ReviewDecisionModal';
import { renderInApp } from '../activities/testUtils';
import * as api from '../../api';

vi.mock('../../api', async () => {
  const actual = await vi.importActual<typeof import('../../api')>('../../api');
  return { ...actual, reviewTask: vi.fn() };
});

const task: api.TaskItem = { id: 77, activity_id: 5, team_id: 2, title: 'Chuẩn bị âm thanh', status: 'review', priority: 'high', deadline: '2026-11-20' };

describe('ReviewDecisionModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.reviewTask).mockResolvedValue({ ok: true });
  });
  afterEach(cleanup);

  it('yêu cầu làm lại: bắt buộc nhập lý do', () => {
    renderInApp(<ReviewDecisionModal task={task} decision="reject" isOpen onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Yêu cầu làm lại' }));
    expect(screen.getByText('Vui lòng nhập lý do.')).toBeDefined();
    expect(api.reviewTask).not.toHaveBeenCalled();
  });

  it('yêu cầu làm lại: gửi decision reject kèm feedback, toast, đóng', async () => {
    const onClose = vi.fn();
    renderInApp(<ReviewDecisionModal task={task} decision="reject" isOpen onClose={onClose} />);
    fireEvent.change(screen.getByLabelText(/Nội dung cần sửa/), { target: { value: 'Thiếu ảnh' } });
    fireEvent.click(screen.getByRole('button', { name: 'Yêu cầu làm lại' }));
    await waitFor(() => expect(api.reviewTask).toHaveBeenCalledWith(77, { decision: 'reject', feedback: 'Thiếu ảnh' }));
    expect(await screen.findByText('Đã yêu cầu làm lại công việc.')).toBeDefined();
    expect(onClose).toHaveBeenCalled();
  });

  it('bác bỏ: gửi decision cancel', async () => {
    renderInApp(<ReviewDecisionModal task={task} decision="cancel" isOpen onClose={vi.fn()} />);
    fireEvent.change(screen.getByLabelText(/Lý do bác bỏ/), { target: { value: 'Không cần nữa' } });
    fireEvent.click(screen.getByRole('button', { name: 'Bác bỏ' }));
    await waitFor(() => expect(api.reviewTask).toHaveBeenCalledWith(77, { decision: 'cancel', feedback: 'Không cần nữa' }));
    expect(await screen.findByText('Đã bác bỏ công việc.')).toBeDefined();
  });
});

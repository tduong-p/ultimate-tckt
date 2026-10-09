import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { CommentsSection } from './CommentsSection';
import { renderApp } from './testUtils';
import { TASK_KEY } from '../../queryKeys';
import * as api from '../../api';

vi.mock('../../api', async () => {
  const actual = await vi.importActual<typeof import('../../api')>('../../api');
  return { ...actual, postTaskComment: vi.fn() };
});

const updates = [
  { id: 1, kind: 'review_note', body: 'Đã duyệt đạt.', created_at: '2026-10-08T03:00:00Z', user_name: 'Cường' },
];

describe('CommentsSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.postTaskComment).mockResolvedValue({ id: 1 });
  });
  afterEach(cleanup);

  it('hiện dòng thời gian với nhãn loại bằng tiếng Việt', () => {
    renderApp(<CommentsSection taskId={5} activityId={9} updates={updates} />);
    expect(screen.getByText('Đã duyệt đạt.')).toBeDefined();
    expect(screen.getByText('Ghi chú nghiệm thu')).toBeDefined();
  });

  it('gửi bình luận gắn task_id và activity, làm mới cache', async () => {
    const { qc } = renderApp(<CommentsSection taskId={5} activityId={9} updates={[]} />);
    const spy = vi.spyOn(qc, 'invalidateQueries');
    fireEvent.click(screen.getByRole('button', { name: 'Gửi bình luận' }));
    expect(screen.getByText('Vui lòng nhập nội dung bình luận.')).toBeDefined();
    fireEvent.change(screen.getByLabelText('Loại cập nhật'), { target: { value: 'progress' } });
    fireEvent.change(screen.getByLabelText('Nội dung'), { target: { value: ' Xong 50% ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Gửi bình luận' }));
    await waitFor(() =>
      expect(api.postTaskComment).toHaveBeenCalledWith(9, { kind: 'progress', body: 'Xong 50%', task_id: 5 })
    );
    expect(await screen.findByText('Đã gửi bình luận')).toBeDefined();
    expect(spy).toHaveBeenCalledWith({ queryKey: TASK_KEY(5) });
  });
});

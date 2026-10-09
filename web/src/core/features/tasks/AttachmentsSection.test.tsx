import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { AttachmentsSection } from './AttachmentsSection';
import { renderApp } from './testUtils';
import { TASK_KEY } from '../../queryKeys';
import * as api from '../../api';

vi.mock('../../api', async () => {
  const actual = await vi.importActual<typeof import('../../api')>('../../api');
  return { ...actual, addTaskAttachment: vi.fn() };
});

const attachments = [
  {
    id: 1,
    task_id: 5,
    kind: 'evidence',
    label: 'Ảnh sân khấu',
    link_url: 'https://drive.example/a',
    original_name: null,
    mime_type: null,
    size_bytes: 0,
    created_at: '2026-10-08T03:00:00Z',
    user_name: 'An',
  },
  {
    id: 2,
    task_id: 5,
    kind: 'deliverable',
    label: 'Báo cáo.pdf',
    link_url: null,
    original_name: 'bc.pdf',
    mime_type: 'application/pdf',
    size_bytes: 1048576,
    created_at: '2026-10-08T03:00:00Z',
    user_name: 'Bình',
  },
];

describe('AttachmentsSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.addTaskAttachment).mockResolvedValue({ id: 3 });
  });
  afterEach(cleanup);

  it('link mở theo link, tệp đã lưu mở theo /api/task-attachments/:id/content; có thanh dung lượng', () => {
    renderApp(<AttachmentsSection taskId={5} taskTitle="A" attachments={attachments} canAttach />);
    expect((screen.getByRole('link', { name: /Ảnh sân khấu/ }) as HTMLAnchorElement).getAttribute('href')).toBe(
      'https://drive.example/a'
    );
    expect((screen.getByRole('link', { name: /Báo cáo\.pdf/ }) as HTMLAnchorElement).getAttribute('href')).toBe(
      '/api/task-attachments/2/content'
    );
    expect(screen.getByText(/Đã dùng 1 MB \/ 50 MB/)).toBeDefined();
  });

  it('thêm tài liệu: link bắt buộc, gửi đúng kind/label/link và làm mới cache', async () => {
    const { qc } = renderApp(<AttachmentsSection taskId={5} taskTitle="Việc A" attachments={[]} canAttach />);
    const spy = vi.spyOn(qc, 'invalidateQueries');
    fireEvent.click(screen.getByRole('button', { name: 'Thêm tài liệu' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Thêm' }));
    expect(screen.getByText('Vui lòng nhập liên kết.')).toBeDefined();
    expect(api.addTaskAttachment).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText('Loại'), { target: { value: 'issue' } });
    fireEvent.change(screen.getByLabelText('Tên hiển thị'), { target: { value: 'Biên bản' } });
    fireEvent.change(screen.getByLabelText(/Liên kết/), { target: { value: 'https://drive.example/b' } });
    fireEvent.click(screen.getByRole('button', { name: 'Thêm' }));
    await waitFor(() =>
      expect(api.addTaskAttachment).toHaveBeenCalledWith(5, {
        kind: 'issue',
        label: 'Biên bản',
        link_url: 'https://drive.example/b',
      })
    );
    expect(await screen.findByText('Đã thêm tài liệu')).toBeDefined();
    expect(spy).toHaveBeenCalledWith({ queryKey: TASK_KEY(5) });
  });

  it('không có quyền thì không có nút thêm', () => {
    renderApp(<AttachmentsSection taskId={5} taskTitle="A" attachments={[]} canAttach={false} />);
    expect(screen.queryByRole('button', { name: 'Thêm tài liệu' })).toBeNull();
  });

  it('lỗi 403 hiện tiếng Việt trong hộp', async () => {
    vi.mocked(api.addTaskAttachment).mockRejectedValueOnce({
      response: { status: 403, data: { error: 'Bạn không thể đính kèm vào công việc này.' } },
    });
    renderApp(<AttachmentsSection taskId={5} taskTitle="A" attachments={[]} canAttach />);
    fireEvent.click(screen.getByRole('button', { name: 'Thêm tài liệu' }));
    fireEvent.change(await screen.findByLabelText(/Liên kết/), { target: { value: 'https://x.example' } });
    fireEvent.click(screen.getByRole('button', { name: 'Thêm' }));
    expect(await screen.findByText('Bạn không thể đính kèm vào công việc này.')).toBeDefined();
  });
});

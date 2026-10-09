import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { ActivityUpdatesSection } from './ActivityUpdatesSection';
import { renderInApp } from './testUtils';
import * as api from '../../api';
import type { ActivityUpdate, TaggablePerson } from '../../api';

vi.mock('../../api', async () => {
  const actual = await vi.importActual<typeof import('../../api')>('../../api');
  return { ...actual, postActivityUpdate: vi.fn() };
});

const people: TaggablePerson[] = [
  { id: 7, name: 'Phạm Hùng', role: 'member' },
  { id: 8, name: 'Vũ Lan', role: 'leader' },
];

const updates: ActivityUpdate[] = [
  {
    id: 1,
    kind: 'comment',
    body: 'Đã chốt địa điểm',
    created_at: '2026-10-05T03:00:00.000Z',
    user_name: 'Trần Người Tạo',
    attachment_url: 'https://drive.example/dia-diem',
    tagged_users: [{ id: 7, name: 'Phạm Hùng' }],
  },
  { id: 2, kind: 'review_note', body: 'Duyệt đề án', created_at: '2026-10-04T03:00:00.000Z', user_name: 'Quản trị A', attachment_url: 'javascript:alert(1)', tagged_users: [] },
];

const show = (list: ActivityUpdate[] = []) =>
  renderInApp(<ActivityUpdatesSection activityId={5} updates={list} taggablePeople={people} />, { path: '/activity/5' });

const type = (label: string, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } });

describe('ActivityUpdatesSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.postActivityUpdate).mockResolvedValue({ ok: true, id: 9 });
  });
  afterEach(cleanup);

  it('dòng thời gian: loại, người đăng, thẻ @, link http; link lạ không thành thẻ a; rỗng thì có chữ', () => {
    show(updates);
    const section = within(screen.getByTestId('section-updates'));
    expect(section.getByText('Đã chốt địa điểm')).toBeDefined();
    expect(section.getAllByText('Bình luận')).toHaveLength(2);
    expect(section.getByText('Ghi chú duyệt')).toBeDefined();
    expect(section.getByText('@Phạm Hùng')).toBeDefined();
    expect(section.getAllByRole('link', { name: 'Mở link đính kèm' })).toHaveLength(1);
    expect(section.getByRole('link', { name: 'Mở link đính kèm' }).getAttribute('href')).toBe('https://drive.example/dia-diem');
    cleanup();
    show([]);
    expect(screen.getByText('Chưa có cập nhật nào.')).toBeDefined();
  });

  it('đăng bình luận có gắn thẻ: đúng endpoint và body, xoá form, toast, làm mới cache', async () => {
    const { qc } = show();
    const spy = vi.spyOn(qc, 'invalidateQueries');
    type('Nội dung cập nhật', 'Ổn rồi @Hùng');
    fireEvent.change(screen.getByLabelText('Gắn thẻ @'), { target: { value: 'hung' } });
    fireEvent.click(await screen.findByRole('option', { name: 'Phạm Hùng' }));
    fireEvent.click(screen.getByRole('button', { name: 'Đăng cập nhật' }));

    await waitFor(() => expect(api.postActivityUpdate).toHaveBeenCalledWith(5, { kind: 'comment', body: 'Ổn rồi @Hùng', tagged_user_ids: [7] }));
    expect(await screen.findByText('Đã đăng cập nhật.')).toBeDefined();
    expect((screen.getByLabelText('Nội dung cập nhật') as HTMLTextAreaElement).value).toBe('');
    expect(spy).toHaveBeenCalledWith({ queryKey: ['core-activity', 5] });
  });

  it('chọn loại khác thì ẩn ô gắn thẻ và gửi kèm link, không gửi tagged_user_ids', async () => {
    show();
    fireEvent.change(screen.getByLabelText('Loại cập nhật'), { target: { value: 'evidence' } });
    expect(screen.queryByLabelText('Gắn thẻ @')).toBeNull();
    type('Nội dung cập nhật', 'Ảnh hiện trường');
    type('Link đính kèm (không bắt buộc)', 'https://drive.example/anh');
    fireEvent.click(screen.getByRole('button', { name: 'Đăng cập nhật' }));
    await waitFor(() =>
      expect(api.postActivityUpdate).toHaveBeenCalledWith(5, { kind: 'evidence', body: 'Ảnh hiện trường', attachment_url: 'https://drive.example/anh' })
    );
  });

  it('nội dung rỗng hoặc link không hợp lệ thì chặn, không gọi API', () => {
    show();
    fireEvent.click(screen.getByRole('button', { name: 'Đăng cập nhật' }));
    expect(screen.getByText('Hãy nhập nội dung cập nhật.')).toBeDefined();
    type('Nội dung cập nhật', 'Có nội dung');
    type('Link đính kèm (không bắt buộc)', 'ftp://may-chu/tep');
    fireEvent.click(screen.getByRole('button', { name: 'Đăng cập nhật' }));
    expect(screen.getByText('Hãy sửa link đính kèm trước khi đăng.')).toBeDefined();
    expect(api.postActivityUpdate).not.toHaveBeenCalled();
  });

  it('lỗi tiếng Anh của server hiện bằng tiếng Việt và giữ nguyên nội dung đã gõ', async () => {
    vi.mocked(api.postActivityUpdate).mockRejectedValue({ response: { status: 400, data: { error: 'You cannot tag yourself.' } } });
    show();
    type('Nội dung cập nhật', 'Gắn nhầm chính mình');
    fireEvent.click(screen.getByRole('button', { name: 'Đăng cập nhật' }));
    expect(await screen.findByText('Bạn không thể gắn thẻ chính mình.')).toBeDefined();
    expect((screen.getByLabelText('Nội dung cập nhật') as HTMLTextAreaElement).value).toBe('Gắn nhầm chính mình');
  });
});

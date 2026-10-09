import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DocumentFormModal } from './DocumentFormModal';
import { ToastProvider } from '../../../shared/components/Toast';
import { LINK_ERROR_MESSAGE } from '../../../shared/components/LinkField';
import { todayVnKey } from '../../../shared/utils/date';
import * as api from '../../api';

vi.mock('../../api', async () => {
  const actual = await vi.importActual<typeof import('../../api')>('../../api');
  return { ...actual, createDocument: vi.fn(), updateDocument: vi.fn() };
});

const teams = [
  { id: 1, name: 'Tổ Tuyên huấn' },
  { id: 2, name: 'Tổ Sự kiện' },
];

const existing: api.DocumentItem = {
  id: 7,
  name: 'Quy chế cũ',
  link_url: 'https://example.com/cu',
  description: 'Mô tả cũ',
  applicable_year: 2025,
  issuing_team_id: 2,
  team_name: 'Tổ Sự kiện',
  visibility: 'all_teams',
};

function setup(props: Partial<React.ComponentProps<typeof DocumentFormModal>> = {}) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const invalidate = vi.spyOn(qc, 'invalidateQueries');
  const onClose = vi.fn();
  render(
    <QueryClientProvider client={qc}>
      <ToastProvider>
        <DocumentFormModal isOpen document={null} issueTeams={teams} onClose={onClose} {...props} />
      </ToastProvider>
    </QueryClientProvider>
  );
  return { onClose, invalidate };
}

const fill = (label: RegExp, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } });
const save = () => fireEvent.click(screen.getByRole('button', { name: 'Lưu văn bản' }));

describe('DocumentFormModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  afterEach(cleanup);

  it('thêm mới: gửi đúng body (đã trim), làm mới danh sách, toast và đóng hộp', async () => {
    vi.mocked(api.createDocument).mockResolvedValueOnce({ id: 11 });
    const { onClose, invalidate } = setup();
    fill(/Tên văn bản/, '  Quy chế mới  ');
    fill(/Liên kết văn bản/, 'https://example.com/moi');
    fill(/Năm áp dụng/, '2027');
    fill(/Tổ ban hành/, '1');
    fill(/Phạm vi xem/, 'all_teams');
    fill(/Mô tả/, ' Phạm vi áp dụng ');
    save();
    await waitFor(() =>
      expect(api.createDocument).toHaveBeenCalledWith({
        name: 'Quy chế mới',
        link_url: 'https://example.com/moi',
        description: 'Phạm vi áp dụng',
        applicable_year: 2027,
        issuing_team_id: 1,
        visibility: 'all_teams',
      })
    );
    expect(await screen.findByText('Đã thêm văn bản.')).toBeDefined();
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['core-documents'] });
    expect(onClose).toHaveBeenCalled();
  });

  it('mặc định: năm hiện tại theo giờ VN, phạm vi "Thành viên Tổ ban hành", chưa chọn Tổ khi có nhiều Tổ', () => {
    setup();
    expect((screen.getByLabelText(/Năm áp dụng/) as HTMLInputElement).value).toBe(todayVnKey().slice(0, 4));
    expect((screen.getByLabelText(/Phạm vi xem/) as HTMLSelectElement).value).toBe('issuing_team');
    expect((screen.getByLabelText(/Tổ ban hành/) as HTMLSelectElement).value).toBe('');
  });

  it('chỉ có một Tổ thì tự chọn Tổ đó', () => {
    setup({ issueTeams: [teams[0]] });
    expect((screen.getByLabelText(/Tổ ban hành/) as HTMLSelectElement).value).toBe('1');
  });

  it('sửa: điền sẵn dữ liệu, gửi PATCH tới đúng id', async () => {
    vi.mocked(api.updateDocument).mockResolvedValueOnce({ ok: true });
    setup({ document: existing });
    expect((screen.getByLabelText(/Tên văn bản/) as HTMLInputElement).value).toBe('Quy chế cũ');
    expect((screen.getByLabelText(/Tổ ban hành/) as HTMLSelectElement).value).toBe('2');
    fill(/Tên văn bản/, 'Quy chế sửa');
    save();
    await waitFor(() =>
      expect(api.updateDocument).toHaveBeenCalledWith(7, {
        name: 'Quy chế sửa',
        link_url: 'https://example.com/cu',
        description: 'Mô tả cũ',
        applicable_year: 2025,
        issuing_team_id: 2,
        visibility: 'all_teams',
      })
    );
    expect(await screen.findByText('Đã cập nhật văn bản.')).toBeDefined();
    expect(api.createDocument).not.toHaveBeenCalled();
  });

  it('sửa: Tổ hiện tại không nằm trong issueTeams vẫn có trong danh sách chọn', () => {
    setup({ document: existing, issueTeams: [teams[0]] });
    expect((screen.getByLabelText(/Tổ ban hành/) as HTMLSelectElement).value).toBe('2');
  });

  it('kiểm tra phía client: thiếu tên / link sai / năm sai / chưa chọn Tổ / thiếu mô tả thì không gọi API', () => {
    setup();
    save();
    expect(screen.getByRole('alert').textContent).toBe('Vui lòng nhập tên văn bản.');

    fill(/Tên văn bản/, 'A');
    fill(/Liên kết văn bản/, 'ftp://x');
    save();
    expect(screen.getAllByText(LINK_ERROR_MESSAGE).length).toBeGreaterThan(0);

    fill(/Liên kết văn bản/, 'https://x.vn');
    fill(/Năm áp dụng/, '1800');
    save();
    expect(screen.getByRole('alert').textContent).toBe('Năm áp dụng phải từ 1900 đến 2100.');

    fill(/Năm áp dụng/, '2026');
    save();
    expect(screen.getByRole('alert').textContent).toBe('Vui lòng chọn Tổ ban hành.');

    fill(/Tổ ban hành/, '1');
    save();
    expect(screen.getByRole('alert').textContent).toBe('Vui lòng nhập mô tả văn bản.');

    expect(api.createDocument).not.toHaveBeenCalled();
  });

  it('lỗi 403 của server hiện bằng tiếng Việt, hộp không đóng', async () => {
    vi.mocked(api.createDocument).mockRejectedValueOnce({
      response: { status: 403, data: { error: 'You may only issue documents for your teams.' } },
    });
    const { onClose } = setup({ issueTeams: [teams[0]] });
    fill(/Tên văn bản/, 'A');
    fill(/Liên kết văn bản/, 'https://x.vn');
    fill(/Mô tả/, 'B');
    save();
    expect(await screen.findByText('Bạn chỉ được ban hành văn bản cho các Tổ của mình.')).toBeDefined();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('người chưa thuộc Tổ nào: báo rõ và khoá nút Lưu', () => {
    setup({ issueTeams: [] });
    expect(screen.getByText('Bạn chưa thuộc Tổ nào nên chưa thể ban hành văn bản.')).toBeDefined();
    expect((screen.getByRole('button', { name: 'Lưu văn bản' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('đóng hộp khi bấm Huỷ', () => {
    const { onClose } = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Huỷ' }));
    expect(onClose).toHaveBeenCalled();
  });
});

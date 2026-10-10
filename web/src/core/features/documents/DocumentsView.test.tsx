import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DocumentsView } from './DocumentsView';
import { ToastProvider } from '../../../shared/components/Toast';
import * as api from '../../api';

vi.mock('../../api', async () => {
  const actual = await vi.importActual('../../api');
  return {
    ...actual,
    fetchDocuments: vi.fn(),
    createDocument: vi.fn(),
    updateDocument: vi.fn(),
  };
});

const mockDocumentsResponse: api.DocumentsResponse = {
  documents: [
    {
      id: 1,
      name: 'Quy chế Tổ chức và Hoạt động TCKT 2026',
      link_url: 'https://docs.google.com/document/d/example1',
      description: 'Quy chế chung áp dụng cho toàn bộ các Tổ chuyên trách.',
      applicable_year: 2026,
      issuing_team_id: 1,
      team_name: 'Tổ chức và Phát triển Đoàn',
      visibility: 'all_teams',
      can_edit: true,
      creator_name: 'Nguyễn Văn A',
      created_at: '2026-03-04T05:00:00.000Z',
    },
    {
      id: 2,
      name: 'Hướng dẫn Đánh giá Điểm Rèn luyện Học kỳ 1',
      link_url: 'https://docs.google.com/document/d/example2',
      description: 'Tiêu chí và biểu mẫu tự chấm điểm rèn luyện đoàn viên.',
      applicable_year: 2026,
      issuing_team_id: 2,
      team_name: 'Giám sát, Kiểm tra và Điểm rèn luyện',
      visibility: 'issuing_team',
    },
  ],
  filterTeams: [
    { id: 1, name: 'Tổ chức và Phát triển Đoàn' },
    { id: 2, name: 'Giám sát, Kiểm tra và Điểm rèn luyện' },
  ],
  issueTeams: [
    { id: 1, name: 'Tổ chức và Phát triển Đoàn' },
  ],
  years: [2026, 2025],
};

describe('DocumentsView', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
    vi.mocked(api.fetchDocuments).mockResolvedValue(mockDocumentsResponse);
  });

  afterEach(() => {
    cleanup();
  });

  const renderWithClient = (ui: React.ReactElement) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <ToastProvider>{ui}</ToastProvider>
      </QueryClientProvider>
    );
  };

  it('hiện tiêu đề, mô tả và nút "Thêm văn bản" cho mọi người dùng', async () => {
    renderWithClient(<DocumentsView />);
    expect(screen.getByText('Văn bản')).toBeDefined();
    expect(screen.getByText('Danh mục liên kết văn bản do các Tổ TCKT ban hành.')).toBeDefined();
    const add = await screen.findByRole('button', { name: 'Thêm văn bản' });
    await waitFor(() => expect((add as HTMLButtonElement).disabled).toBe(false));
  });

  it('liên kết "Mở liên kết" là một thẻ <a> duy nhất, không lồng <button>', async () => {
    const { container } = renderWithClient(<DocumentsView />);
    await screen.findByText('Quy chế Tổ chức và Hoạt động TCKT 2026');
    const links = screen.getAllByRole('link', { name: /Mở liên kết/ });
    expect(links.length).toBeGreaterThan(0);
    links.forEach((a) => {
      expect(a.getAttribute('href')).toMatch(/^https?:/);
      expect(a.getAttribute('target')).toBe('_blank');
      expect(a.getAttribute('rel')).toContain('noopener');
    });
    expect(container.querySelector('a button')).toBeNull();
  });

  it('fetches and renders documents list from API', async () => {
    renderWithClient(<DocumentsView />);

    expect(api.fetchDocuments).toHaveBeenCalled();
    expect(await screen.findByText('Quy chế Tổ chức và Hoạt động TCKT 2026')).toBeDefined();
    expect(screen.getByText('Hướng dẫn Đánh giá Điểm Rèn luyện Học kỳ 1')).toBeDefined();
    // Tên Tổ cũng là lựa chọn của bộ lọc (select gốc luôn render option), nên kiểm trong thẻ.
    expect(within(screen.getByTestId('document-item-1')).getByText('Tổ chức và Phát triển Đoàn')).toBeDefined();
    expect(screen.getAllByText('Tất cả các Tổ').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Nội bộ Tổ')).toBeDefined();
  });

  it('renders search input and empty state box when no documents exist', async () => {
    vi.mocked(api.fetchDocuments).mockResolvedValue({
      documents: [],
      filterTeams: [],
      issueTeams: [],
      years: [],
    });

    const { container } = renderWithClient(<DocumentsView />);

    expect(screen.getByPlaceholderText('Tìm văn bản...')).toBeDefined();
    expect(await screen.findByText('Không tìm thấy văn bản')).toBeDefined();
    expect(screen.getByText('Hãy thêm văn bản đầu tiên hoặc thay đổi bộ lọc.')).toBeDefined();

    // STRICT RULE: No checkbox icon or TaskIcon in empty states
    expect(container.querySelector('input[type="checkbox"]')).toBeNull();
    expect(container.querySelector('[data-testid="task-icon"]')).toBeNull();
  });

  it('triggers search when input value changes', async () => {
    renderWithClient(<DocumentsView />);

    const searchInput = screen.getByPlaceholderText('Tìm văn bản...') as HTMLInputElement;
    fireEvent.change(searchInput, { target: { value: 'quy chế' } });
    expect(searchInput.value).toBe('quy chế');

    await waitFor(() => {
      expect(api.fetchDocuments).toHaveBeenCalledWith(
        expect.objectContaining({ q: 'quy chế' })
      );
    });
  });

  it('chỉ gọi API một lần với từ khoá cuối khi gõ liên tục', async () => {
    renderWithClient(<DocumentsView />);
    await waitFor(() => expect(api.fetchDocuments).toHaveBeenCalledTimes(1));
    const input = screen.getByPlaceholderText('Tìm văn bản...');

    fireEvent.change(input, { target: { value: 'h' } });
    fireEvent.change(input, { target: { value: 'hộ' } });
    fireEvent.change(input, { target: { value: 'hội' } });

    await waitFor(() =>
      expect(api.fetchDocuments).toHaveBeenLastCalledWith(expect.objectContaining({ q: 'hội' }))
    );
    expect(api.fetchDocuments).toHaveBeenCalledTimes(2);
  });

  it('nút "Sửa" chỉ có ở văn bản can_edit; thẻ có dòng "Bởi … · ngày"', async () => {
    renderWithClient(<DocumentsView />);
    await screen.findByText('Quy chế Tổ chức và Hoạt động TCKT 2026');
    expect(screen.getAllByRole('button', { name: 'Sửa' })).toHaveLength(1);
    expect(screen.getByTestId('document-item-1').textContent).toContain('Bởi Nguyễn Văn A · 04/03/2026');
    expect(screen.getByTestId('document-item-2').textContent).not.toContain('Sửa');
  });

  it('bấm Sửa mở hộp điền sẵn dữ liệu của văn bản', async () => {
    renderWithClient(<DocumentsView />);
    await screen.findByText('Quy chế Tổ chức và Hoạt động TCKT 2026');
    fireEvent.click(screen.getByRole('button', { name: 'Sửa' }));
    expect(await screen.findByRole('heading', { name: 'Sửa văn bản' })).toBeDefined();
    expect((screen.getByLabelText(/Tên văn bản/) as HTMLInputElement).value).toBe('Quy chế Tổ chức và Hoạt động TCKT 2026');
  });

  it('thêm văn bản: gửi đúng body rồi tải lại danh sách', async () => {
    vi.mocked(api.createDocument).mockResolvedValueOnce({ id: 3 });
    renderWithClient(<DocumentsView />);
    const add = await screen.findByRole('button', { name: 'Thêm văn bản' });
    await waitFor(() => expect((add as HTMLButtonElement).disabled).toBe(false));
    fireEvent.click(add);
    await screen.findByRole('heading', { name: 'Thêm văn bản' });
    fireEvent.change(screen.getByLabelText(/Tên văn bản/), { target: { value: 'Kế hoạch mới' } });
    fireEvent.change(screen.getByLabelText(/Liên kết văn bản/), { target: { value: 'https://example.com/kh' } });
    fireEvent.change(screen.getByLabelText(/Năm áp dụng/), { target: { value: '2026' } });
    fireEvent.change(screen.getByLabelText(/Tổ ban hành/), { target: { value: '1' } });
    fireEvent.change(screen.getByLabelText(/Mô tả/), { target: { value: 'Kế hoạch năm' } });
    const callsBefore = vi.mocked(api.fetchDocuments).mock.calls.length;
    fireEvent.click(screen.getByRole('button', { name: 'Lưu văn bản' }));
    await waitFor(() =>
      expect(api.createDocument).toHaveBeenCalledWith({
        name: 'Kế hoạch mới',
        link_url: 'https://example.com/kh',
        description: 'Kế hoạch năm',
        applicable_year: 2026,
        issuing_team_id: 1,
        visibility: 'issuing_team',
      })
    );
    await waitFor(() => expect(vi.mocked(api.fetchDocuments).mock.calls.length).toBeGreaterThan(callsBefore));
  });

  it('lọc theo năm và Tổ gửi đúng tham số cho API', async () => {
    renderWithClient(<DocumentsView />);
    await screen.findByText('Quy chế Tổ chức và Hoạt động TCKT 2026');
    fireEvent.change(screen.getByLabelText('Lọc theo năm'), { target: { value: '2025' } });
    await waitFor(() => expect(api.fetchDocuments).toHaveBeenLastCalledWith(expect.objectContaining({ year: '2025' })));
    fireEvent.change(screen.getByLabelText('Lọc theo Tổ'), { target: { value: '2' } });
    await waitFor(() => expect(api.fetchDocuments).toHaveBeenLastCalledWith(expect.objectContaining({ year: '2025', team_id: '2' })));
  });
});

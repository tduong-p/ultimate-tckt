import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DocumentsView } from './DocumentsView';
import * as api from '../../api';

vi.mock('../../api', async () => {
  const actual = await vi.importActual('../../api');
  return {
    ...actual,
    fetchDocuments: vi.fn(),
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
        {ui}
      </QueryClientProvider>
    );
  };

  it('renders header title, subtitle and action button', () => {
    renderWithClient(<DocumentsView />);
    expect(screen.getByText('Văn bản')).toBeDefined();
    expect(screen.getByText('Danh mục liên kết văn bản do các Tổ TCKT ban hành.')).toBeDefined();
    expect(screen.getByText('+ Thêm văn bản')).toBeDefined();
  });

  it('fetches and renders documents list from API', async () => {
    renderWithClient(<DocumentsView />);

    expect(api.fetchDocuments).toHaveBeenCalled();
    expect(await screen.findByText('Quy chế Tổ chức và Hoạt động TCKT 2026')).toBeDefined();
    expect(screen.getByText('Hướng dẫn Đánh giá Điểm Rèn luyện Học kỳ 1')).toBeDefined();
    expect(screen.getByText('Tổ chức và Phát triển Đoàn')).toBeDefined();
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
});

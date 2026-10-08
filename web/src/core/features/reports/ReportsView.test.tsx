import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReportsView } from './ReportsView';
import * as api from '../../api';

vi.mock('../../api', async () => {
  const actual = await vi.importActual('../../api');
  return {
    ...actual,
    fetchTeams: vi.fn(),
    getReportExportUrl: vi.fn(actual.getReportExportUrl),
  };
});

const mockTeams: api.TeamItem[] = [
  { id: 1, name: 'Phát triển Đảng và Chuyển đổi số' },
  { id: 2, name: 'Tổ chức và Phát triển Đoàn' },
  { id: 3, name: 'Giám sát, Kiểm tra và Điểm rèn luyện' },
];

describe('ReportsView', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
    vi.mocked(api.fetchTeams).mockResolvedValue(mockTeams);
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

  it('renders header title and subtitle', () => {
    renderWithClient(<ReportsView />);
    expect(screen.getByText('Báo cáo')).toBeDefined();
    expect(
      screen.getByText(
        'Xuất dữ liệu hoạt động, công việc của Tổ và mức độ tham gia trong một khoảng thời gian.'
      )
    ).toBeDefined();
  });

  it('renders date inputs with default values and team selector', async () => {
    renderWithClient(<ReportsView />);
    const startInput = screen.getByLabelText('Ngày bắt đầu') as HTMLInputElement;
    const endInput = screen.getByLabelText('Ngày kết thúc') as HTMLInputElement;

    expect(startInput).toBeDefined();
    expect(startInput.value).toBe('09/08/2026');
    expect(endInput).toBeDefined();
    expect(endInput.value).toBe('10/08/2026');

    expect(screen.getByText('Tổ')).toBeDefined();
    expect(
      screen.getByText(
        'Tệp Excel gồm tổng hợp hoạt động và chi tiết công việc, tham gia của thành viên đối với các hoạt động diễn ra trong khoảng thời gian này.'
      )
    ).toBeDefined();

    await waitFor(() => {
      expect(api.fetchTeams).toHaveBeenCalled();
    });
  });

  it('handles clicking the export button and generates export URL', () => {
    renderWithClient(<ReportsView />);
    const exportBtn = screen.getByText('Xuất báo cáo Excel');
    expect(exportBtn).toBeDefined();

    fireEvent.click(exportBtn);
    expect(screen.getByText('Đang tạo tệp Excel...')).toBeDefined();
    expect(api.getReportExportUrl).toHaveBeenCalledWith(
      expect.objectContaining({
        start: '2026-08-09',
        end: '2026-08-10',
        lang: 'vi',
      })
    );
  });

  it('provides a direct download link matching getReportExportUrl', () => {
    renderWithClient(<ReportsView />);
    const directLink = screen.getByTestId('export-direct-link') as HTMLAnchorElement;
    expect(directLink).toBeDefined();
    expect(directLink.href).toContain('/api/reports/export');
    expect(directLink.href).toContain('start=2026-08-09');
    expect(directLink.href).toContain('end=2026-08-10');
  });
});

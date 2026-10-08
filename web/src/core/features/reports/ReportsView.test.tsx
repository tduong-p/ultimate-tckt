import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { MutationCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReportsView } from './ReportsView';
import * as api from '../../api';

vi.mock('../../api', async () => {
  const actual = await vi.importActual('../../api');
  return {
    ...actual,
    fetchTeams: vi.fn(),
    downloadReportExport: vi.fn(),
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
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-08T03:00:00.000Z'));
    URL.createObjectURL = vi.fn(() => 'blob:report');
    URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
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

  it('mặc định khoảng thời gian là tháng hiện tại theo giờ Việt Nam', () => {
    renderWithClient(<ReportsView />);
    expect((screen.getByLabelText('Ngày bắt đầu') as HTMLInputElement).value).toBe('01/10/2026');
    expect((screen.getByLabelText('Ngày kết thúc') as HTMLInputElement).value).toBe('08/10/2026');
    expect(screen.getByText('Tổ')).toBeDefined();
  });

  it('tải tệp qua API với khoảng thời gian đã chọn rồi báo thành công', async () => {
    vi.mocked(api.downloadReportExport).mockResolvedValue(new Blob(['xlsx']));
    renderWithClient(<ReportsView />);
    await waitFor(() => expect(api.fetchTeams).toHaveBeenCalled());

    fireEvent.click(screen.getByText('Xuất báo cáo Excel'));

    await waitFor(() =>
      expect(api.downloadReportExport).toHaveBeenCalledWith(
        expect.objectContaining({ start: '2026-10-01', end: '2026-10-08', lang: 'vi' })
      )
    );
    expect(await screen.findByText('Đã tải tệp Excel.')).toBeDefined();
    expect(URL.createObjectURL).toHaveBeenCalled();
  });

  it('hiện lỗi từ máy chủ thay vì báo thành công khi xuất thất bại', async () => {
    vi.mocked(api.downloadReportExport).mockRejectedValue(
      new Error('Bạn không có quyền xuất báo cáo của Tổ này.')
    );
    renderWithClient(<ReportsView />);

    fireEvent.click(screen.getByText('Xuất báo cáo Excel'));

    expect((await screen.findByRole('alert')).textContent).toContain(
      'Bạn không có quyền xuất báo cáo của Tổ này.'
    );
    expect(screen.queryByText('Đã tải tệp Excel.')).toBeNull();
  });

  it('báo lỗi 401 khi xuất cho lớp phiên (MutationCache) để quay về đăng nhập', async () => {
    const onMutationError = vi.fn();
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
      mutationCache: new MutationCache({ onError: onMutationError }),
    });
    const unauthorized = Object.assign(new Error('Vui lòng đăng nhập để tiếp tục.'), {
      response: { status: 401 },
    });
    vi.mocked(api.downloadReportExport).mockRejectedValue(unauthorized);
    renderWithClient(<ReportsView />);

    fireEvent.click(screen.getByText('Xuất báo cáo Excel'));

    await waitFor(() => expect(onMutationError).toHaveBeenCalled());
    expect(onMutationError.mock.calls[0][0]).toBe(unauthorized);
  });

  it('chỉ thu hồi URL tệp sau khi trình duyệt đã nhận lệnh tải', async () => {
    vi.mocked(api.downloadReportExport).mockResolvedValue(new Blob(['xlsx']));
    let revokedRightAfterClick: number | undefined;
    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => {
        queueMicrotask(() => {
          revokedRightAfterClick = vi.mocked(URL.revokeObjectURL).mock.calls.length;
        });
      });
    renderWithClient(<ReportsView />);

    fireEvent.click(screen.getByText('Xuất báo cáo Excel'));

    await waitFor(() => expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:report'));
    expect(revokedRightAfterClick).toBe(0);
    clickSpy.mockRestore();
  });
});

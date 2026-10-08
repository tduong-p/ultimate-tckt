import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CreateActivityModal } from './CreateActivityModal';
import * as api from '../../api';

vi.mock('../../api', async () => {
  const actual = await vi.importActual('../../api');
  return {
    ...actual,
    fetchTeams: vi.fn(),
    createActivity: vi.fn(),
  };
});

const mockTeams: api.TeamItem[] = [
  {
    id: 1,
    name: 'Phát triển Đảng và Chuyển đổi số',
    color: '#0052CC',
    is_active: 1,
  },
  {
    id: 2,
    name: 'Tuyên huấn và Sự kiện',
    color: '#00875A',
    is_active: 1,
  },
];

describe('CreateActivityModal', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    vi.mocked(api.fetchTeams).mockResolvedValue(mockTeams);
    vi.mocked(api.createActivity).mockResolvedValue({ id: 101 });
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

  it('renders the modal with title and subtitle when open', () => {
    renderWithClient(<CreateActivityModal isOpen={true} onClose={() => {}} />);
    expect(screen.getByText('Đề xuất hoạt động')).toBeDefined();
    expect(screen.getByText('ĐỀ XUẤT MỚI')).toBeDefined();
    expect(screen.getByText('Chọn Tổ chủ trì và tất cả các Tổ phối hợp tham gia.')).toBeDefined();
  });

  it('does not render content when closed', () => {
    const { container } = renderWithClient(<CreateActivityModal isOpen={false} onClose={() => {}} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders standard form fields and loads team options', async () => {
    renderWithClient(<CreateActivityModal isOpen={true} onClose={() => {}} />);
    expect(screen.getByText('Tiêu đề')).toBeDefined();
    expect(screen.getByText('Tổ chủ trì')).toBeDefined();
    expect(screen.getByText('Ngày bắt đầu')).toBeDefined();
    expect(screen.getByText('Tạo đề xuất')).toBeDefined();

    expect(api.fetchTeams).toHaveBeenCalled();
    // Checkboxes for participating teams should be rendered from teams data
    expect(await screen.findByText('Phát triển Đảng và Chuyển đổi số')).toBeDefined();
    expect(await screen.findByText('Tuyên huấn và Sự kiện')).toBeDefined();
  });

  const fillRequiredFields = () => {
    fireEvent.change(screen.getByPlaceholderText(/Ngày hội Kỹ thuật/i), {
      target: { value: 'Chiến dịch Mùa hè xanh 2026' },
    });
    fireEvent.change(screen.getByPlaceholderText(/Hoạt động hướng đến mục tiêu gì/i), {
      target: { value: 'Tổ chức các hoạt động tình nguyện ý nghĩa' },
    });
    fireEvent.change(screen.getByLabelText(/Hạn chung/i), { target: { value: '2026-11-30' } });
  };

  const chooseLeadTeam = async (name: string) => {
    const input = screen.getByLabelText(/Tổ chủ trì/i);
    fireEvent.focus(input);
    fireEvent.keyDown(input, { key: 'ArrowDown', keyCode: 40 });
    const option = await screen.findByRole('option', { name });
    fireEvent.click(option);
  };

  it('không gửi đề xuất khi chưa chọn Tổ chủ trì', async () => {
    renderWithClient(<CreateActivityModal isOpen={true} onClose={() => {}} />);
    await screen.findByText('Tuyên huấn và Sự kiện');
    fillRequiredFields();

    fireEvent.click(screen.getByRole('button', { name: /Tạo đề xuất/i }));

    expect(await screen.findByText('Vui lòng chọn Tổ chủ trì.')).toBeDefined();
    expect(api.createActivity).not.toHaveBeenCalled();
  });

  it('gửi đề xuất với đúng Tổ chủ trì đã chọn và đóng modal', async () => {
    const handleClose = vi.fn();
    renderWithClient(<CreateActivityModal isOpen={true} onClose={handleClose} />);
    await screen.findByText('Tuyên huấn và Sự kiện');
    fillRequiredFields();
    await chooseLeadTeam('Tuyên huấn và Sự kiện');

    fireEvent.click(screen.getByRole('button', { name: /Tạo đề xuất/i }));

    await waitFor(() => {
      expect(api.createActivity).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Chiến dịch Mùa hè xanh 2026',
          description: 'Tổ chức các hoạt động tình nguyện ý nghĩa',
          type: 'event',
          deadline: '2026-11-30',
          team_id: 2,
          team_ids: [2],
        })
      );
    });
    await waitFor(() => {
      expect(handleClose).toHaveBeenCalled();
    });
  });
});

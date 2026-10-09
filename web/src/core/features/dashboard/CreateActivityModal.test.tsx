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
    fetchBootstrap: vi.fn(),
    fetchMembers: vi.fn(),
    createActivity: vi.fn(),
  };
});

const mockTeams: api.TeamItem[] = [
  {
    id: 1,
    name: 'Phát triển Đảng và Chuyển đổi số',
    color: '#0052CC',
    is_active: 1,
    can_manage: 0,
  },
  {
    id: 2,
    name: 'Tuyên huấn và Sự kiện',
    color: '#00875A',
    is_active: 1,
    can_manage: 1,
  },
];

const mockMembers: api.MemberItem[] = [
  { id: 7, name: 'Lê Trưởng BTC', email: 'le@x.vn', role: 'member', is_active: 1 },
  { id: 8, name: 'Nghỉ Việc', email: 'nv@x.vn', role: 'member', is_active: 0 },
];

const bootstrapWith = (canCreateAccount: boolean): api.BootstrapData => ({
  stats: { activeActivities: 0, openTasks: 0, overdueTasks: 0, completedMonth: 0 },
  upcoming: [],
  tasks: [],
  activity: [],
  teams: [],
  capabilities: { canCreateActivity: true, canCreateAccount },
});

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
    vi.mocked(api.fetchMembers).mockResolvedValue(mockMembers);
    vi.mocked(api.fetchBootstrap).mockResolvedValue(bootstrapWith(true));
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

  const chooseOption = async (label: RegExp, name: string) => {
    const input = screen.getByLabelText(label);
    fireEvent.focus(input);
    fireEvent.keyDown(input, { key: 'ArrowDown', keyCode: 40 });
    fireEvent.click(await screen.findByRole('option', { name }));
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

  it('Tổ trưởng chỉ thấy Tổ mình quản lý, admin thấy mọi Tổ', async () => {
    vi.mocked(api.fetchBootstrap).mockResolvedValue(bootstrapWith(false));
    renderWithClient(<CreateActivityModal isOpen={true} onClose={() => {}} />);
    expect(await screen.findByText('Tuyên huấn và Sự kiện')).toBeDefined();
    expect(screen.queryByText('Phát triển Đảng và Chuyển đổi số')).toBeNull();
    cleanup();

    vi.mocked(api.fetchBootstrap).mockResolvedValue(bootstrapWith(true));
    renderWithClient(<CreateActivityModal isOpen={true} onClose={() => {}} />);
    expect(await screen.findByText('Phát triển Đảng và Chuyển đổi số')).toBeDefined();
    expect(await screen.findByText('Tuyên huấn và Sự kiện')).toBeDefined();
  });

  it('hiện lỗi từ backend khi tạo đề xuất thất bại', async () => {
    vi.mocked(api.createActivity).mockRejectedValue({
      response: { data: { error: 'Bạn chỉ được đề xuất cho Tổ mình phụ trách.' } },
    });
    renderWithClient(<CreateActivityModal isOpen={true} onClose={() => {}} />);
    await screen.findByText('Tuyên huấn và Sự kiện');
    fillRequiredFields();
    await chooseLeadTeam('Tuyên huấn và Sự kiện');
    fireEvent.click(screen.getByRole('button', { name: /Tạo đề xuất/i }));

    expect(await screen.findByText('Bạn chỉ được đề xuất cho Tổ mình phụ trách.')).toBeDefined();
  });

  it('dịch lỗi tiếng Anh của Core sang tiếng Việt', async () => {
    vi.mocked(api.createActivity).mockRejectedValue({
      response: {
        status: 403,
        data: { error: 'Team leaders and vice leaders may only propose work for teams they lead.' },
      },
    });
    renderWithClient(<CreateActivityModal isOpen={true} onClose={() => {}} />);
    await screen.findByText('Tuyên huấn và Sự kiện');
    fillRequiredFields();
    await chooseLeadTeam('Tuyên huấn và Sự kiện');
    fireEvent.click(screen.getByRole('button', { name: /Tạo đề xuất/i }));

    expect(
      await screen.findByText('Tổ trưởng/Tổ phó chỉ được đề xuất cho các Tổ mình phụ trách.')
    ).toBeDefined();
  });

  it('báo lỗi khi ngày bắt đầu sau hạn chung và không gửi', async () => {
    renderWithClient(<CreateActivityModal isOpen={true} onClose={() => {}} />);
    await screen.findByText('Tuyên huấn và Sự kiện');
    fillRequiredFields();
    fireEvent.change(screen.getByLabelText(/Ngày bắt đầu/i), { target: { value: '2026-12-15' } });
    await chooseLeadTeam('Tuyên huấn và Sự kiện');
    fireEvent.click(screen.getByRole('button', { name: /Tạo đề xuất/i }));

    expect(await screen.findByText('Ngày bắt đầu phải trước hoặc bằng hạn chung.')).toBeDefined();
    expect(api.createActivity).not.toHaveBeenCalled();
  });

  it('mở lại modal thì lỗi và dữ liệu form được xoá', async () => {
    const ui = (open: boolean) => (
      <QueryClientProvider client={queryClient}>
        <CreateActivityModal isOpen={open} onClose={() => {}} />
      </QueryClientProvider>
    );
    const { rerender } = render(ui(true));
    await screen.findByText('Tuyên huấn và Sự kiện');
    fireEvent.change(screen.getByPlaceholderText(/Ngày hội Kỹ thuật/i), { target: { value: 'Nháp cũ' } });
    fireEvent.click(screen.getByRole('button', { name: /Tạo đề xuất/i }));
    expect(await screen.findByText('Vui lòng nhập tiêu đề, mô tả và hạn chung.')).toBeDefined();

    rerender(ui(false));
    rerender(ui(true));

    await screen.findByText('Tuyên huấn và Sự kiện');
    expect(screen.queryByText('Vui lòng nhập tiêu đề, mô tả và hạn chung.')).toBeNull();
    expect((screen.getByPlaceholderText(/Ngày hội Kỹ thuật/i) as HTMLInputElement).value).toBe('');
  });

  it('mở lại modal sau lỗi máy chủ thì không còn hiện lỗi cũ', async () => {
    vi.mocked(api.createActivity).mockRejectedValue({
      response: { status: 400, data: { error: 'Complete all required fields and select at least one team.' } },
    });
    const ui = (open: boolean) => (
      <QueryClientProvider client={queryClient}>
        <CreateActivityModal isOpen={open} onClose={() => {}} />
      </QueryClientProvider>
    );
    const { rerender } = render(ui(true));
    await screen.findByText('Tuyên huấn và Sự kiện');
    fillRequiredFields();
    await chooseLeadTeam('Tuyên huấn và Sự kiện');
    fireEvent.click(screen.getByRole('button', { name: /Tạo đề xuất/i }));
    const serverMessage = 'Vui lòng điền đủ các trường bắt buộc và chọn ít nhất một Tổ.';
    expect(await screen.findByText(serverMessage)).toBeDefined();

    rerender(ui(false));
    rerender(ui(true));

    await screen.findByText('Tuyên huấn và Sự kiện');
    expect(screen.queryByText(serverMessage)).toBeNull();
  });

  it('gửi đủ các trường mở rộng của UI cũ, gồm Trưởng BTC', async () => {
    renderWithClient(<CreateActivityModal isOpen={true} onClose={() => {}} />);
    await screen.findByText('Tuyên huấn và Sự kiện');
    fillRequiredFields();
    await chooseLeadTeam('Tuyên huấn và Sự kiện');
    await chooseOption(/Trưởng Ban Tổ chức/i, 'Lê Trưởng BTC');
    fireEvent.change(screen.getByLabelText('Địa điểm'), { target: { value: 'Hội trường A' } });
    fireEvent.change(screen.getByLabelText('Được yêu cầu bởi'), { target: { value: 'Ban Thường vụ' } });
    fireEvent.change(screen.getByLabelText(/Hồ sơ hoạt động/), { target: { value: 'https://drive.example/de-an' } });
    fireEvent.click(screen.getByLabelText(/Hiển thị hoạt động này trên trang công khai/));
    fireEvent.change(screen.getByLabelText(/Liên kết ảnh công khai/), { target: { value: 'https://img.example/a.jpg' } });

    fireEvent.click(screen.getByRole('button', { name: /Tạo đề xuất/i }));

    await waitFor(() =>
      expect(api.createActivity).toHaveBeenCalledWith(
        expect.objectContaining({
          event_lead_id: 7,
          location: 'Hội trường A',
          requested_by: 'Ban Thường vụ',
          proposal_document_url: 'https://drive.example/de-an',
          public_image_url: 'https://img.example/a.jpg',
          is_public: true,
          priority: 'medium',
          type: 'event',
          team_id: 2,
          team_ids: [2],
        })
      )
    );
  });

  it('không chọn Trưởng BTC thì gửi event_lead_id null; người đã nghỉ không có trong danh sách', async () => {
    renderWithClient(<CreateActivityModal isOpen={true} onClose={() => {}} />);
    await screen.findByText('Tuyên huấn và Sự kiện');
    fillRequiredFields();
    await chooseLeadTeam('Tuyên huấn và Sự kiện');
    const input = screen.getByLabelText(/Trưởng Ban Tổ chức/i);
    fireEvent.focus(input);
    fireEvent.keyDown(input, { key: 'ArrowDown', keyCode: 40 });
    expect(await screen.findByRole('option', { name: 'Lê Trưởng BTC' })).toBeDefined();
    expect(screen.queryByRole('option', { name: 'Nghỉ Việc' })).toBeNull();
    fireEvent.keyDown(input, { key: 'Escape' });

    fireEvent.click(screen.getByRole('button', { name: /Tạo đề xuất/i }));
    await waitFor(() => expect(api.createActivity).toHaveBeenCalledWith(expect.objectContaining({ event_lead_id: null })));
  });

  it('Tổ chủ trì tự được đánh dấu và khoá trong danh sách Tổ tham gia', async () => {
    renderWithClient(<CreateActivityModal isOpen={true} onClose={() => {}} />);
    await screen.findByText('Tuyên huấn và Sự kiện');
    await chooseLeadTeam('Tuyên huấn và Sự kiện');
    const checkbox = screen.getByRole('checkbox', { name: 'Tuyên huấn và Sự kiện' }) as HTMLInputElement;
    expect(checkbox.checked).toBe(true);
    expect(checkbox.disabled).toBe(true);
  });

  it('link không phải http(s) thì báo lỗi và không gửi', async () => {
    renderWithClient(<CreateActivityModal isOpen={true} onClose={() => {}} />);
    await screen.findByText('Tuyên huấn và Sự kiện');
    fillRequiredFields();
    await chooseLeadTeam('Tuyên huấn và Sự kiện');
    fireEvent.change(screen.getByLabelText(/Hồ sơ hoạt động/), { target: { value: 'ftp://may-chu/de-an' } });
    fireEvent.click(screen.getByRole('button', { name: /Tạo đề xuất/i }));

    expect((await screen.findAllByText('Liên kết phải bắt đầu bằng http:// hoặc https://.')).length).toBeGreaterThan(0);
    expect(api.createActivity).not.toHaveBeenCalled();
  });

  it('link ảnh công khai không phải http(s) thì chặn tạo đề xuất', async () => {
    renderWithClient(<CreateActivityModal isOpen={true} onClose={() => {}} />);
    await screen.findByText('Tuyên huấn và Sự kiện');
    fillRequiredFields();
    await chooseLeadTeam('Tuyên huấn và Sự kiện');
    fireEvent.change(screen.getByLabelText(/Liên kết ảnh công khai/), { target: { value: 'ftp://may-chu/anh.jpg' } });
    fireEvent.click(screen.getByRole('button', { name: /Tạo đề xuất/i }));
    expect((await screen.findAllByText('Liên kết phải bắt đầu bằng http:// hoặc https://.')).length).toBeGreaterThan(0);
    expect(api.createActivity).not.toHaveBeenCalled();
  });

  it('tạo xong gọi onCreated với id mới sau khi đóng modal', async () => {
    const onClose = vi.fn();
    const onCreated = vi.fn();
    renderWithClient(<CreateActivityModal isOpen={true} onClose={onClose} onCreated={onCreated} />);
    await screen.findByText('Tuyên huấn và Sự kiện');
    fillRequiredFields();
    await chooseLeadTeam('Tuyên huấn và Sự kiện');
    fireEvent.click(screen.getByRole('button', { name: /Tạo đề xuất/i }));

    await waitFor(() => expect(onCreated).toHaveBeenCalledWith(101));
    expect(onClose).toHaveBeenCalled();
  });
});

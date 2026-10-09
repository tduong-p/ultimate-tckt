import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CreateTaskModal } from './CreateTaskModal';
import * as api from '../../api';

vi.mock('../../api', async () => {
  const actual = await vi.importActual('../../api');
  return {
    ...actual,
    fetchTeams: vi.fn(),
    fetchMembers: vi.fn(),
    fetchBootstrap: vi.fn(),
    createActivityTask: vi.fn(),
  };
});

const mockActivity: api.ActivityItem = {
  id: 10,
  title: 'Hội trại Tuổi trẻ Sáng tạo 2026',
  team_id: 1,
  team_name: 'Ban Phong Trào',
  status: 'approved',
  priority: 'high',
  deadline: '2026-10-25',
};

const mockTeams: api.TeamItem[] = [
  { id: 1, name: 'Ban Phong Trào', can_manage: true },
  { id: 2, name: 'Ban Tuyên Giáo', can_manage: false },
];

const mockMembers: api.MemberItem[] = [
  { id: 101, name: 'Nguyễn Văn A', email: 'a@hust.edu.vn', role: 'leader', team_ids: '1,2' },
  { id: 102, name: 'Trần Thị B', email: 'b@hust.edu.vn', role: 'member', team_ids: '1' },
  { id: 103, name: 'Lê Văn C', email: 'c@hust.edu.vn', role: 'member', team_ids: '2' },
];

describe('CreateTaskModal', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });

    vi.mocked(api.fetchTeams).mockResolvedValue(mockTeams);
    vi.mocked(api.fetchMembers).mockResolvedValue(mockMembers);
    vi.mocked(api.fetchBootstrap).mockResolvedValue({
      capabilities: { canCreateActivity: true, canCreateAccount: true },
      stats: { activeActivities: 1, openTasks: 1, overdueTasks: 0, completedMonth: 0 },
      upcoming: [],
      tasks: [],
      activity: [],
      teams: mockTeams,
    } as any);
  });

  afterEach(() => {
    cleanup();
  });

  const renderModal = (props: Partial<React.ComponentProps<typeof CreateTaskModal>> = {}) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <CreateTaskModal
          activity={mockActivity}
          isOpen={true}
          onClose={vi.fn()}
          {...props}
        />
      </QueryClientProvider>
    );
  };

  it('renders nothing when isOpen is false', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <CreateTaskModal activity={mockActivity} isOpen={false} onClose={vi.fn()} />
      </QueryClientProvider>
    );
    expect(screen.queryByTestId('create-task-modal')).toBeNull();
  });

  it('renders nothing when activity is null', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <CreateTaskModal activity={null} isOpen={true} onClose={vi.fn()} />
      </QueryClientProvider>
    );
    expect(screen.queryByTestId('create-task-modal')).toBeNull();
  });

  it('renders form elements and title with activity name', async () => {
    renderModal();

    expect(await screen.findByText(/Thêm nhiệm vụ mới/i)).toBeDefined();
    expect(screen.getByText(/Hội trại Tuổi trẻ Sáng tạo 2026/i)).toBeDefined();
    expect(screen.getByLabelText(/Tiêu đề nhiệm vụ/i)).toBeDefined();
    expect(screen.getByLabelText(/Tổ phụ trách/i)).toBeDefined();
    expect(screen.getByLabelText(/Người phụ trách chính/i)).toBeDefined();
    expect(screen.getByLabelText(/Hạn chót/i)).toBeDefined();
    expect(screen.getByRole('button', { name: /Tạo nhiệm vụ/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /Hủy/i })).toBeDefined();
  });

  it('shows error if submitted without title or required fields', async () => {
    renderModal();

    const submitBtn = await screen.findByRole('button', { name: /Tạo nhiệm vụ/i });
    fireEvent.click(submitBtn);

    expect(await screen.findByText(/Vui lòng nhập tiêu đề nhiệm vụ/i)).toBeDefined();
    expect(api.createActivityTask).not.toHaveBeenCalled();
  });

  it('submits form successfully with valid inputs', async () => {
    vi.mocked(api.createActivityTask).mockResolvedValue({ id: 99 });
    const onClose = vi.fn();
    const onTaskCreated = vi.fn();

    renderModal({ onClose, onTaskCreated });

    const titleInput = await screen.findByLabelText(/Tiêu đề nhiệm vụ/i);
    fireEvent.change(titleInput, { target: { value: 'Thiết kế backdrop sân khấu' } });

    const submitBtn = screen.getByRole('button', { name: /Tạo nhiệm vụ/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(api.createActivityTask).toHaveBeenCalledWith(10, expect.objectContaining({
        title: 'Thiết kế backdrop sân khấu',
        team_id: 1,
        primary_assignee_id: 101,
        deadline: '2026-10-25',
      }));
    });

    await waitFor(() => {
      expect(onTaskCreated).toHaveBeenCalledWith(99);
      expect(onClose).toHaveBeenCalled();
    });
  });

  it('displays server error message when createActivityTask fails', async () => {
    vi.mocked(api.createActivityTask).mockRejectedValue({
      response: { data: { error: 'Bạn không thể giao việc cho ban này.' } },
    });

    renderModal();

    const titleInput = await screen.findByLabelText(/Tiêu đề nhiệm vụ/i);
    fireEvent.change(titleInput, { target: { value: 'Thiết kế backdrop' } });

    const submitBtn = screen.getByRole('button', { name: /Tạo nhiệm vụ/i });
    fireEvent.click(submitBtn);

    expect(await screen.findByText('Bạn không thể giao việc cho ban này.')).toBeDefined();
  });

  it('validates start date cannot be after deadline', async () => {
    renderModal();

    const titleInput = await screen.findByLabelText(/Tiêu đề nhiệm vụ/i);
    fireEvent.change(titleInput, { target: { value: 'Nhiệm vụ kiểm tra ngày' } });

    const startDateInput = screen.getByLabelText(/Ngày bắt đầu/i);
    fireEvent.change(startDateInput, { target: { value: '2026-10-30' } });

    const deadlineInput = screen.getByLabelText(/Hạn chót/i);
    fireEvent.change(deadlineInput, { target: { value: '2026-10-20' } });

    const submitBtn = screen.getByRole('button', { name: /Tạo nhiệm vụ/i });
    fireEvent.click(submitBtn);

    expect(await screen.findByText(/Ngày bắt đầu không được sau hạn chót/i)).toBeDefined();
    expect(api.createActivityTask).not.toHaveBeenCalled();
  });
});

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TaskActionButtons } from './TaskActionButtons';
import * as api from '../../api';

vi.mock('../../api', async () => {
  const actual = await vi.importActual('../../api');
  return {
    ...actual,
    acknowledgeTask: vi.fn(),
    updateTaskStatus: vi.fn(),
    reviewTask: vi.fn(),
    submitTaskReview: vi.fn(),
  };
});

describe('TaskActionButtons', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
  });

  afterEach(() => {
    cleanup();
  });

  const renderButtons = (task: api.TaskItem, canReview = false) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <TaskActionButtons task={task} canReview={canReview} />
      </QueryClientProvider>
    );
  };

  it('renders Nhận việc and Bắt đầu làm when status is todo', async () => {
    vi.mocked(api.acknowledgeTask).mockResolvedValue({ ok: true });
    vi.mocked(api.updateTaskStatus).mockResolvedValue({ ok: true });

    const task: api.TaskItem = {
      id: 1,
      activity_id: 10,
      team_id: 2,
      title: 'Chuẩn bị phòng họp',
      status: 'todo',
      priority: 'medium',
      deadline: '2026-10-12',
    };

    renderButtons(task);

    const ackBtn = screen.getByRole('button', { name: /Nhận việc/i });
    expect(ackBtn).toBeDefined();

    fireEvent.click(ackBtn);
    await waitFor(() => {
      expect(api.acknowledgeTask).toHaveBeenCalledWith(1);
    });

    const startBtn = screen.getByRole('button', { name: /Bắt đầu làm/i });
    expect(startBtn).toBeDefined();

    fireEvent.click(startBtn);
    await waitFor(() => {
      expect(api.updateTaskStatus).toHaveBeenCalledWith(1, 'in_progress');
    });
  });

  it('renders Nộp nghiệm thu when status is in_progress and opens modal', async () => {
    const task: api.TaskItem = {
      id: 2,
      activity_id: 10,
      team_id: 2,
      title: 'Thiết kế banner',
      status: 'in_progress',
      priority: 'high',
      deadline: '2026-10-12',
    };

    renderButtons(task);

    const submitBtn = screen.getByRole('button', { name: /Nộp nghiệm thu/i });
    expect(submitBtn).toBeDefined();

    fireEvent.click(submitBtn);

    expect(await screen.findByTestId('submit-review-modal')).toBeDefined();
  });

  it('renders Duyệt đạt and Yêu cầu sửa when status is review and canReview is true', async () => {
    vi.mocked(api.reviewTask).mockResolvedValue({ ok: true });

    const task: api.TaskItem = {
      id: 3,
      activity_id: 10,
      team_id: 2,
      title: 'Kiểm tra kịch bản',
      status: 'review',
      priority: 'urgent',
      deadline: '2026-10-12',
    };

    renderButtons(task, true);

    const approveBtn = screen.getByRole('button', { name: /Duyệt đạt/i });
    expect(approveBtn).toBeDefined();

    fireEvent.click(approveBtn);
    await waitFor(() => {
      expect(api.reviewTask).toHaveBeenCalledWith(3, { decision: 'approve' });
    });

    const rejectBtn = screen.getByRole('button', { name: /Yêu cầu sửa/i });
    expect(rejectBtn).toBeDefined();

    fireEvent.click(rejectBtn);
    expect(await screen.findByTestId('review-decision-modal')).toBeDefined();
  });
});

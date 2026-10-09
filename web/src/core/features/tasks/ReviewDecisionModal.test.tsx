import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReviewDecisionModal } from './ReviewDecisionModal';
import * as api from '../../api';

vi.mock('../../api', async () => {
  const actual = await vi.importActual('../../api');
  return {
    ...actual,
    reviewTask: vi.fn(),
  };
});

const mockTask: api.TaskItem = {
  id: 301,
  activity_id: 1,
  team_id: 2,
  title: 'Duyệt bài truyền thông chào tân sinh viên',
  status: 'review',
  priority: 'high',
  deadline: '2026-10-18',
};

describe('ReviewDecisionModal', () => {
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

  const renderModal = (props: Partial<React.ComponentProps<typeof ReviewDecisionModal>> = {}) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <ReviewDecisionModal
          task={mockTask}
          decision="reject"
          isOpen={true}
          onClose={vi.fn()}
          {...props}
        />
      </QueryClientProvider>
    );
  };

  it('renders nothing when isOpen is false or task is null', () => {
    const { container: c1 } = render(
      <QueryClientProvider client={queryClient}>
        <ReviewDecisionModal task={mockTask} decision="reject" isOpen={false} onClose={vi.fn()} />
      </QueryClientProvider>
    );
    expect(c1.firstChild).toBeNull();

    const { container: c2 } = render(
      <QueryClientProvider client={queryClient}>
        <ReviewDecisionModal task={null} decision="reject" isOpen={true} onClose={vi.fn()} />
      </QueryClientProvider>
    );
    expect(c2.firstChild).toBeNull();
  });

  it('shows required feedback validation for reject', async () => {
    renderModal();

    const submitBtn = screen.getByRole('button', { name: /Xác nhận yêu cầu làm lại/i });
    fireEvent.click(submitBtn);

    expect(await screen.findByText(/Vui lòng nhập lý do\/nội dung yêu cầu làm lại/i)).toBeDefined();
    expect(api.reviewTask).not.toHaveBeenCalled();
  });

  it('submits feedback and calls reviewTask for reject', async () => {
    vi.mocked(api.reviewTask).mockResolvedValue({ ok: true });
    const onClose = vi.fn();
    const onSuccess = vi.fn();

    renderModal({ onClose, onSuccess });

    const feedbackInput = screen.getByPlaceholderText(/Nêu rõ những điểm cần sửa đổi/i);
    fireEvent.change(feedbackInput, { target: { value: 'Chỉnh lại hình ảnh đại diện và font chữ' } });

    const submitBtn = screen.getByRole('button', { name: /Xác nhận yêu cầu làm lại/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(api.reviewTask).toHaveBeenCalledWith(301, {
        decision: 'reject',
        feedback: 'Chỉnh lại hình ảnh đại diện và font chữ',
      });
      expect(onSuccess).toHaveBeenCalled();
      expect(onClose).toHaveBeenCalled();
    });
  });
});

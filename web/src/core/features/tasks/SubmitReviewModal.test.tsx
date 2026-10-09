import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SubmitReviewModal } from './SubmitReviewModal';
import * as api from '../../api';

vi.mock('../../api', async () => {
  const actual = await vi.importActual('../../api');
  return {
    ...actual,
    submitTaskReview: vi.fn(),
  };
});

const mockTask: api.TaskItem = {
  id: 201,
  activity_id: 1,
  team_id: 2,
  title: 'Soạn báo cáo tổng kết tháng',
  status: 'in_progress',
  priority: 'high',
  deadline: '2026-10-15',
};

describe('SubmitReviewModal', () => {
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

  const renderModal = (props: Partial<React.ComponentProps<typeof SubmitReviewModal>> = {}) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <SubmitReviewModal
          task={mockTask}
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
        <SubmitReviewModal task={mockTask} isOpen={false} onClose={vi.fn()} />
      </QueryClientProvider>
    );
    expect(c1.firstChild).toBeNull();

    const { container: c2 } = render(
      <QueryClientProvider client={queryClient}>
        <SubmitReviewModal task={null} isOpen={true} onClose={vi.fn()} />
      </QueryClientProvider>
    );
    expect(c2.firstChild).toBeNull();
  });

  it('renders title, inputs and submit button', () => {
    renderModal();

    expect(screen.getByText('Nộp nghiệm thu công việc')).toBeDefined();
    expect(screen.getByText(/Soạn báo cáo tổng kết tháng/)).toBeDefined();
    expect(screen.getByLabelText(/Link minh chứng/i)).toBeDefined();
    expect(screen.getByLabelText(/Ghi chú bàn giao/i)).toBeDefined();
    expect(screen.getByRole('button', { name: /Gửi nghiệm thu/i })).toBeDefined();
  });

  it('validates link format if provided', async () => {
    renderModal();

    const linkInput = screen.getByLabelText(/Link minh chứng/i);
    fireEvent.change(linkInput, { target: { value: 'invalid-url' } });

    const submitBtn = screen.getByRole('button', { name: /Gửi nghiệm thu/i });
    fireEvent.click(submitBtn);

    expect(await screen.findByText(/Link minh chứng phải bắt đầu bằng http:\/\/ hoặc https:\/\//i)).toBeDefined();
    expect(api.submitTaskReview).not.toHaveBeenCalled();
  });

  it('submits successfully with valid data', async () => {
    vi.mocked(api.submitTaskReview).mockResolvedValue({ ok: true });
    const onClose = vi.fn();
    const onSuccess = vi.fn();

    renderModal({ onClose, onSuccess });

    const linkInput = screen.getByLabelText(/Link minh chứng/i);
    fireEvent.change(linkInput, { target: { value: 'https://docs.google.com/document/d/123' } });

    const notesInput = screen.getByLabelText(/Ghi chú bàn giao/i);
    fireEvent.change(notesInput, { target: { value: 'Đã hoàn thành dự thảo' } });

    const submitBtn = screen.getByRole('button', { name: /Gửi nghiệm thu/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(api.submitTaskReview).toHaveBeenCalledWith(201, {
        link_url: 'https://docs.google.com/document/d/123',
        notes: 'Đã hoàn thành dự thảo',
      });
      expect(onSuccess).toHaveBeenCalled();
      expect(onClose).toHaveBeenCalled();
    });
  });
});

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ActivityDetailModal } from './ActivityDetailModal';
import type { ActivityItem } from '../../api';
import * as api from '../../api';

vi.mock('../../api', async () => {
  const actual = await vi.importActual<typeof import('../../api')>('../../api');
  return {
    ...actual,
    approveActivity: vi.fn(),
    rejectActivity: vi.fn(),
    requestChangesActivity: vi.fn(),
    submitActivityProposal: vi.fn(),
    fetchTeams: vi.fn().mockResolvedValue([]),
    fetchMembers: vi.fn().mockResolvedValue([]),
    fetchBootstrap: vi.fn().mockResolvedValue({ capabilities: {} }),
  };
});

describe('ActivityDetailModal', () => {
  const mockActivity: ActivityItem = {
    id: 101,
    title: 'Hội nghị khoa học sinh viên 2026',
    status: 'proposed',
    type: 'event',
    start_date: '2026-10-15',
    deadline: '2026-10-20',
    team_id: 1,
    team_name: 'Ban Học tập',
    team_color: '#0052CC',
    description: 'Tổ chức hội nghị báo cáo công trình khoa học',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders null when isOpen is false', () => {
    const { container } = render(
      <ActivityDetailModal activity={mockActivity} isOpen={false} onClose={vi.fn()} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders activity basic details when open', () => {
    render(<ActivityDetailModal activity={mockActivity} isOpen={true} onClose={vi.fn()} />);

    expect(screen.getByText('Hội nghị khoa học sinh viên 2026')).toBeDefined();
    expect(screen.getByText('#HĐ-101')).toBeDefined();
    expect(screen.getByText('Ban Học tập')).toBeDefined();
    expect(screen.getByText('Tổ chức hội nghị báo cáo công trình khoa học')).toBeDefined();
  });

  it('renders proposal decision buttons when status is proposed and canManageProposals is true', () => {
    render(
      <ActivityDetailModal
        activity={mockActivity}
        isOpen={true}
        onClose={vi.fn()}
        canManageProposals={true}
      />
    );

    expect(screen.getByRole('button', { name: 'Phê duyệt' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Yêu cầu sửa đổi' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Từ chối' })).toBeDefined();
  });

  it('calls approveActivity when Phê duyệt button is clicked', async () => {
    vi.mocked(api.approveActivity).mockResolvedValueOnce({ ok: true });
    const onProposalDecided = vi.fn();
    const onClose = vi.fn();

    render(
      <ActivityDetailModal
        activity={mockActivity}
        isOpen={true}
        onClose={onClose}
        canManageProposals={true}
        onProposalDecided={onProposalDecided}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Phê duyệt' }));

    await waitFor(() => {
      expect(api.approveActivity).toHaveBeenCalledWith(101);
      expect(onProposalDecided).toHaveBeenCalled();
      expect(onClose).toHaveBeenCalled();
    });
  });

  it('shows feedback form and calls requestChangesActivity when Yêu cầu sửa đổi is submitted', async () => {
    vi.mocked(api.requestChangesActivity).mockResolvedValueOnce({ ok: true });
    const onProposalDecided = vi.fn();
    const onClose = vi.fn();

    render(
      <ActivityDetailModal
        activity={mockActivity}
        isOpen={true}
        onClose={onClose}
        canManageProposals={true}
        onProposalDecided={onProposalDecided}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Yêu cầu sửa đổi' }));

    const textarea = screen.getByPlaceholderText(/Nhập nội dung cần điều chỉnh/i);
    expect(textarea).toBeDefined();

    fireEvent.change(textarea, { target: { value: 'Bổ sung danh sách diễn giả' } });
    fireEvent.click(screen.getByRole('button', { name: 'Gửi yêu cầu' }));

    await waitFor(() => {
      expect(api.requestChangesActivity).toHaveBeenCalledWith(101, 'Bổ sung danh sách diễn giả');
      expect(onProposalDecided).toHaveBeenCalled();
      expect(onClose).toHaveBeenCalled();
    });
  });

  it('shows feedback form and calls rejectActivity when Từ chối is submitted', async () => {
    vi.mocked(api.rejectActivity).mockResolvedValueOnce({ ok: true, deleted: true });
    const onProposalDecided = vi.fn();
    const onClose = vi.fn();

    render(
      <ActivityDetailModal
        activity={mockActivity}
        isOpen={true}
        onClose={onClose}
        canManageProposals={true}
        onProposalDecided={onProposalDecided}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Từ chối' }));

    const textarea = screen.getByPlaceholderText(/Nhập lý do từ chối/i);
    expect(textarea).toBeDefined();

    fireEvent.change(textarea, { target: { value: 'Trùng lịch với kỳ thi tập trung' } });
    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận từ chối' }));

    await waitFor(() => {
      expect(api.rejectActivity).toHaveBeenCalledWith(101, 'Trùng lịch với kỳ thi tập trung');
      expect(onProposalDecided).toHaveBeenCalled();
      expect(onClose).toHaveBeenCalled();
    });
  });

  it('renders resubmit button and calls submitActivityProposal when changes_requested', async () => {
    const activityChangesRequested: ActivityItem = {
      ...mockActivity,
      status: 'changes_requested',
    };
    vi.mocked(api.submitActivityProposal).mockResolvedValueOnce({ ok: true });
    const onProposalDecided = vi.fn();

    render(
      <ActivityDetailModal
        activity={activityChangesRequested}
        isOpen={true}
        onClose={vi.fn()}
        canManageActivity={true}
        onProposalDecided={onProposalDecided}
      />
    );

    const resubmitBtn = screen.getByRole('button', { name: 'Nộp lại đề xuất' });
    expect(resubmitBtn).toBeDefined();

    fireEvent.click(resubmitBtn);

    await waitFor(() => {
      expect(api.submitActivityProposal).toHaveBeenCalledWith(101);
      expect(onProposalDecided).toHaveBeenCalled();
    });
  });

  it('renders Thêm nhiệm vụ button when status is approved and canManageActivity is true', () => {
    const approvedActivity: ActivityItem = {
      ...mockActivity,
      status: 'approved',
    };
    const onOpenCreateTask = vi.fn();

    render(
      <ActivityDetailModal
        activity={approvedActivity}
        isOpen={true}
        onClose={vi.fn()}
        canManageActivity={true}
        onOpenCreateTask={onOpenCreateTask}
      />
    );

    const addTaskBtn = screen.getByRole('button', { name: '+ Thêm nhiệm vụ' });
    expect(addTaskBtn).toBeDefined();

    fireEvent.click(addTaskBtn);
    expect(onOpenCreateTask).toHaveBeenCalledWith(approvedActivity);
  });

  it('opens CreateTaskModal internally when onOpenCreateTask is not passed and Thêm nhiệm vụ is clicked', async () => {
    const qc = new QueryClient();
    const approvedActivity: ActivityItem = {
      ...mockActivity,
      status: 'approved',
    };

    render(
      <QueryClientProvider client={qc}>
        <ActivityDetailModal
          activity={approvedActivity}
          isOpen={true}
          onClose={vi.fn()}
          canManageActivity={true}
        />
      </QueryClientProvider>
    );

    const addTaskBtn = screen.getByRole('button', { name: '+ Thêm nhiệm vụ' });
    fireEvent.click(addTaskBtn);

    expect(await screen.findByTestId('create-task-modal')).toBeDefined();
  });
});

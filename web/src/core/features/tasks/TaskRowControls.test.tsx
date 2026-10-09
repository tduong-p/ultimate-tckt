import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { TaskCheckButton, TaskTitleButton } from './TaskRowControls';
import { TaskModalContext } from './TaskModalProvider';
import { renderApp, makeSession } from './testUtils';

const task = { id: 5, activity_id: 9, team_id: 2, title: 'Dựng sân khấu', status: 'in_progress', priority: 'high', deadline: '2026-10-31', assignee_ids: '7,8' };

const withModal = (open: ReturnType<typeof vi.fn>, ui: React.ReactElement) => (
  <TaskModalContext.Provider value={{ open, close: vi.fn() }}>{ui}</TaskModalContext.Provider>
);

describe('TaskRowControls', () => {
  afterEach(cleanup);

  it('bấm tiêu đề mở hộp công việc', () => {
    const open = vi.fn();
    renderApp(withModal(open, <TaskTitleButton task={task} />));
    fireEvent.click(screen.getByRole('button', { name: 'Dựng sân khấu' }));
    expect(open).toHaveBeenCalledWith(5);
  });

  it('nút tích bật với người được giao và mở hộp, cuộn tới phần nộp nghiệm thu', () => {
    const open = vi.fn();
    renderApp(withModal(open, <TaskCheckButton task={task} />), { session: makeSession({ id: 7 }) });
    fireEvent.click(screen.getByRole('button', { name: 'Nộp nghiệm thu: Dựng sân khấu' }));
    expect(open).toHaveBeenCalledWith(5, { focusSubmit: true });
  });

  it('nút tích tắt với người không được giao hoặc việc đã ở Chờ duyệt', () => {
    const open = vi.fn();
    renderApp(withModal(open, <TaskCheckButton task={task} />), { session: makeSession({ id: 99 }) });
    expect((screen.getByRole('button', { name: 'Chỉ xem: Dựng sân khấu' }) as HTMLButtonElement).disabled).toBe(true);
    cleanup();
    renderApp(withModal(open, <TaskCheckButton task={{ ...task, status: 'review' }} />), { session: makeSession({ id: 7 }) });
    expect((screen.getByRole('button', { name: 'Chỉ xem: Dựng sân khấu' }) as HTMLButtonElement).disabled).toBe(true);
  });
});

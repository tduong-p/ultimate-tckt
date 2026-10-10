import React from 'react';
import type { TaskItem } from '../../api';
import { useTaskModal } from './TaskModalProvider';
import { canSubmitForReview, useCurrentUserId } from './taskPermissions';
import './tasks.css';

/** Tiêu đề công việc bấm được, mở hộp chi tiết. */
export const TaskTitleButton: React.FC<{ task: Pick<TaskItem, 'id' | 'title'> }> = ({ task }) => {
  const { open } = useTaskModal();
  return (
    <button type="button" className="tk-title-btn" onClick={() => open(task.id)}>
      {task.title}
    </button>
  );
};

/** Nút tích: chỉ bật với người được giao khi việc còn todo/in_progress; mở hộp và cuộn tới phần nộp nghiệm thu. */
export const TaskCheckButton: React.FC<{ task: TaskItem }> = ({ task }) => {
  const { open } = useTaskModal();
  const userId = useCurrentUserId();
  const enabled = canSubmitForReview(task, userId);
  return (
    <button
      type="button"
      className="tk-circle-btn"
      disabled={!enabled}
      aria-label={enabled ? `Nộp nghiệm thu: ${task.title}` : `Chỉ xem: ${task.title}`}
      title={enabled ? 'Nộp nghiệm thu' : 'Chỉ xem'}
      onClick={() => open(task.id, { focusSubmit: true })}
    />
  );
};

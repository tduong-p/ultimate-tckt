import React from 'react';
import { token } from '@atlaskit/tokens';
import type { TaskItem } from '../../api';
import { useTaskModal } from './TaskModalProvider';
import { canSubmitForReview, useCurrentUserId } from './taskPermissions';

/** Tiêu đề công việc bấm được, mở hộp chi tiết. */
export const TaskTitleButton: React.FC<{ task: Pick<TaskItem, 'id' | 'title'> }> = ({ task }) => {
  const { open } = useTaskModal();
  return (
    <button
      type="button"
      onClick={() => open(task.id)}
      style={{
        border: 'none',
        background: 'none',
        padding: 0,
        cursor: 'pointer',
        font: 'inherit',
        fontWeight: 600,
        textAlign: 'left',
        color: token('color.link', '#0C66E4'),
      }}
    >
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
      disabled={!enabled}
      aria-label={enabled ? `Nộp nghiệm thu: ${task.title}` : `Chỉ xem: ${task.title}`}
      title={enabled ? 'Nộp nghiệm thu' : 'Chỉ xem'}
      onClick={() => open(task.id, { focusSubmit: true })}
      style={{
        width: 20,
        height: 20,
        borderRadius: '50%',
        flexShrink: 0,
        marginRight: 12,
        cursor: enabled ? 'pointer' : 'default',
        border: `2px solid ${token('color.border.bold', '#8590A2')}`,
        background: 'none',
        opacity: enabled ? 1 : 0.4,
      }}
    />
  );
};

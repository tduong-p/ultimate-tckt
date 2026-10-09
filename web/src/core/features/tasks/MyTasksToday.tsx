import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { token } from '@atlaskit/tokens';
import Badge from '@atlaskit/badge';
import Lozenge from '@atlaskit/lozenge';
import { LottieLoading } from '../../../shared/components/LottieLoading';
import InboxIcon from '@atlaskit/icon/core/inbox';
import { fetchMyTasksToday, TaskItem } from '../../api';
import { formatVnDate } from '../../../shared/utils/date';
import {
  getTaskPriorityAppearance,
  getTaskPriorityLabel,
  getTaskStatusAppearance,
  getTaskStatusLabel,
} from './taskLabels';
import { TaskActionButtons } from './TaskActionButtons';

const TaskCardItem: React.FC<{ task: TaskItem; canReview?: boolean }> = ({ task, canReview = false }) => (
  <div
    style={{
      backgroundColor: token('elevation.surface', '#FFFFFF'),
      border: `1px solid ${token('color.border', '#DFE1E6')}`,
      borderRadius: '4px',
      padding: '12px 16px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '8px',
      gap: '12px',
      flexWrap: 'wrap',
    }}
  >
    <div style={{ flex: 1, minWidth: '240px' }}>
      <div style={{ fontSize: '14px', fontWeight: 600, color: token('color.text', '#172B4D'), marginBottom: '4px' }}>
        {task.title}
      </div>
      <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: token('color.text.subtle', '#6B778C'), flexWrap: 'wrap' }}>
        {task.activity_title && <span>Hoạt động: {task.activity_title}</span>}
        {task.team_name && <span>Tổ: {task.team_name}</span>}
        {task.deadline && <span>Hạn: {formatVnDate(task.deadline)}</span>}
        {task.assignee_name && <span>Phụ trách: {task.assignee_name}</span>}
      </div>
    </div>
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0, flexWrap: 'wrap' }}>
      {task.priority && (
        <Lozenge appearance={getTaskPriorityAppearance(task.priority)}>
          {getTaskPriorityLabel(task.priority)}
        </Lozenge>
      )}
      <Lozenge appearance={getTaskStatusAppearance(task.status)}>
        {getTaskStatusLabel(task.status)}
      </Lozenge>
      <TaskActionButtons task={task} canReview={canReview} />
    </div>
  </div>
);

const TaskSection: React.FC<{
  title: string;
  count: number;
  badgeAppearance?: 'default' | 'primary' | 'important' | 'added' | 'removed';
  emptyMessage: string;
  tasks: TaskItem[];
  canReview?: boolean;
}> = ({ title, count, badgeAppearance = 'default', emptyMessage, tasks, canReview = false }) => (
  <div style={{
    backgroundColor: token('elevation.surface.raised', '#FFFFFF'),
    borderRadius: '8px',
    boxShadow: token('elevation.shadow.raised', '0 1px 1px rgba(9, 30, 66, 0.25), 0 0 1px rgba(9, 30, 66, 0.31)'),
    padding: '24px',
    marginBottom: '24px',
    border: `1px solid ${token('color.border', '#DFE1E6')}`
  }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
      <h2 style={{ fontSize: '16px', fontWeight: 600, margin: 0, color: token('color.text', '#172B4D') }}>
        {title}
      </h2>
      <Badge appearance={badgeAppearance}>{count}</Badge>
    </div>

    {tasks.length === 0 ? (
      <div style={{
        backgroundColor: token('color.background.neutral.subtle', '#F4F5F7'),
        borderRadius: '4px',
        padding: '16px 24px',
        border: `1px solid ${token('color.border', '#DFE1E6')}`,
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
      }}>
        <div style={{ color: token('color.icon.subtle', '#6B778C'), display: 'flex' }}>
          <InboxIcon label="" size="small" />
        </div>
        <span style={{ fontSize: '14px', fontWeight: 500, color: token('color.text', '#172B4D') }}>
          {emptyMessage}
        </span>
      </div>
    ) : (
      <div>
        {tasks.map(task => (
          <TaskCardItem key={task.id} task={task} canReview={canReview} />
        ))}
      </div>
    )}
  </div>
);

export const MyTasksToday: React.FC = () => {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['core-my-tasks-today'],
    queryFn: fetchMyTasksToday,
  });

  const dueToday = data?.dueToday || [];
  const overdue = data?.overdue || [];
  const pendingMyReview = data?.pendingMyReview || [];

  return (
    <div style={{ maxWidth: '1000px', margin: '0', paddingTop: '16px' }}>
      <h1 style={{ fontSize: '28px', fontWeight: 600, color: token('color.text', '#172B4D'), marginBottom: '8px' }}>
        Công việc hôm nay
      </h1>
      <p style={{ fontSize: '14px', color: token('color.text.subtle', '#5E6C84'), marginBottom: '32px' }}>
        Công việc đến hạn hôm nay, quá hạn, hoặc đang chờ bạn duyệt.
      </p>

      {isLoading ? (
        <LottieLoading message="Đang tải danh sách việc cần xử lý..." size={140} />
      ) : isError ? (
        <div style={{ color: token('color.text.danger', '#DE350B'), padding: '16px' }}>
          Lỗi tải danh sách công việc.
        </div>
      ) : (
        <>
          {/* Due Today Card */}
          <TaskSection
            title="Đến hạn hôm nay"
            count={dueToday.length}
            badgeAppearance="default"
            emptyMessage="Không có việc đến hạn hôm nay"
            tasks={dueToday}
          />

          {/* Overdue Card */}
          <TaskSection
            title="Quá hạn"
            count={overdue.length}
            badgeAppearance={overdue.length > 0 ? 'important' : 'default'}
            emptyMessage="Không có việc quá hạn"
            tasks={overdue}
          />

          {/* Pending Review Card */}
          <TaskSection
            title="Chờ duyệt"
            count={pendingMyReview.length}
            badgeAppearance="primary"
            emptyMessage="Không có việc chờ duyệt"
            tasks={pendingMyReview}
            canReview
          />
        </>
      )}
    </div>
  );
};

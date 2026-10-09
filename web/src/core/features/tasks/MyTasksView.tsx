import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { token } from '@atlaskit/tokens';
import Lozenge from '@atlaskit/lozenge';
import { LottieLoading } from '../../../shared/components/LottieLoading';
import InboxIcon from '@atlaskit/icon/core/inbox';
import { fetchBootstrap, fetchMyTasksToday, TaskItem } from '../../api';
import { formatVnDate, todayVnKey, toVnDateKey } from '../../../shared/utils/date';
import {
  getTaskPriorityAppearance,
  getTaskPriorityLabel,
  getTaskStatusAppearance,
  getTaskStatusLabel,
} from './taskLabels';
import { TaskActionButtons } from './TaskActionButtons';

type TaskGroup = { key: string; title: string; tasks: TaskItem[] };

const activeOnly = (t: TaskItem) => t.status !== 'done' && t.status !== 'cancelled';

export const MyTasksView: React.FC = () => {
  // Nguồn chính: bootstrap.tasks — cùng phạm vi SQL với stats.openTasks (mọi việc đang mở của
  // người dùng; Tổ trưởng/Tổ phó gồm cả việc của Tổ mình lead), gồm cả việc hạn tương lai.
  const bootstrapQuery = useQuery({
    queryKey: ['core-bootstrap'],
    queryFn: fetchBootstrap,
  });
  // Bổ sung: việc đang chờ người dùng duyệt (không nằm trong danh sách trên nếu không được giao).
  const todayQuery = useQuery({
    queryKey: ['core-my-tasks-today'],
    queryFn: fetchMyTasksToday,
  });

  const isLoading = bootstrapQuery.isLoading;
  const isError = bootstrapQuery.isError;

  const { groups, total } = useMemo(() => {
    const today = todayVnKey();
    const seen = new Set<number>();
    const overdue: TaskItem[] = [];
    const dueToday: TaskItem[] = [];
    const upcoming: TaskItem[] = [];
    (bootstrapQuery.data?.tasks || []).filter(activeOnly).forEach(t => {
      if (seen.has(t.id)) return;
      seen.add(t.id);
      const key = toVnDateKey(t.deadline);
      if (key && key < today) overdue.push(t);
      else if (key === today) dueToday.push(t);
      else upcoming.push(t);
    });
    const review = (todayQuery.data?.pendingMyReview || []).filter(activeOnly).filter(t => {
      if (seen.has(t.id)) return false;
      seen.add(t.id);
      return true;
    });
    const list: TaskGroup[] = [
      { key: 'overdue', title: 'Quá hạn', tasks: overdue },
      { key: 'today', title: 'Hôm nay', tasks: dueToday },
      { key: 'upcoming', title: 'Sắp tới', tasks: upcoming },
      { key: 'review', title: 'Chờ bạn duyệt', tasks: review },
    ].filter(g => g.tasks.length > 0);
    return { groups: list, total: seen.size };
  }, [bootstrapQuery.data, todayQuery.data]);

  return (
    <div style={{ maxWidth: '1000px', margin: '0', paddingTop: '4px' }}>
      {/* Page Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{
          margin: 0,
          fontSize: '24px',
          fontWeight: 600,
          color: token('color.text', '#172B4D'),
          letterSpacing: '-0.2px'
        }}>
          Công việc của tôi
        </h1>
        <p style={{
          margin: '6px 0 0 0',
          fontSize: '14px',
          color: token('color.text.subtle', '#5E6C84')
        }}>
          Công việc được giao cho bạn và các Tổ của bạn.
        </p>
      </div>

      {/* Open Tasks Card */}
      <div style={{
        backgroundColor: token('elevation.surface.raised', '#FFFFFF'),
        border: `1px solid ${token('color.border', '#DFE1E6')}`,
        borderRadius: '3px',
        boxShadow: token('elevation.shadow.raised', '0 1px 1px rgba(9, 30, 66, 0.25), 0 0 1px rgba(9, 30, 66, 0.31)'),
        padding: '24px'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px'
        }}>
          <h2 style={{
            fontSize: '16px',
            fontWeight: 600,
            margin: 0,
            color: token('color.text', '#172B4D')
          }}>
            Công việc đang mở
          </h2>
          <span style={{
            backgroundColor: token('color.background.neutral', '#DFE1E6'),
            borderRadius: '12px',
            padding: '3px 10px',
            fontSize: '12px',
            fontWeight: 500,
            color: token('color.text.subtle', '#42526E'),
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            <span>•</span>
            <span>{total} Công Việc</span>
          </span>
        </div>

        {isLoading ? (
          <LottieLoading message="Đang tải danh sách công việc..." size={140} />
        ) : isError ? (
          <div style={{ color: token('color.text.danger', '#DE350B'), padding: '16px' }}>
            Lỗi tải dữ liệu công việc.
          </div>
        ) : total === 0 ? (
          /* Empty state box */
          <div style={{
            backgroundColor: token('color.background.neutral.subtle', '#F4F5F7'),
            borderRadius: '4px',
            padding: '20px 24px',
            border: `1px solid ${token('color.border', '#DFE1E6')}`,
            display: 'flex',
            alignItems: 'center',
            gap: '16px'
          }}>
            <div style={{ color: token('color.icon.subtle', '#6B778C'), display: 'flex' }}>
              <InboxIcon label="" size="medium" />
            </div>
            <div>
              <div style={{
                fontSize: '14px',
                fontWeight: 600,
                color: token('color.text', '#172B4D'),
                marginBottom: '4px'
              }}>
                Bạn đã hoàn thành tất cả
              </div>
              <div style={{
                fontSize: '13px',
                color: token('color.text.subtle', '#5E6C84')
              }}>
                Không có công việc đang mở trong danh sách.
              </div>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {groups.map(group => (
              <section key={group.key} aria-label={group.title}>
                <h3 style={{ fontSize: '13px', fontWeight: 600, margin: '0 0 8px 0', color: token('color.text.subtle', '#5E6C84') }}>
                  {group.title} ({group.tasks.length})
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {group.tasks.map(task => (
                    <div
                      key={task.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '12px 16px',
                        backgroundColor: token('elevation.surface', '#FFFFFF'),
                        borderRadius: '4px',
                        border: `1px solid ${token('color.border', '#DFE1E6')}`,
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
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
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '12px', flexShrink: 0, flexWrap: 'wrap' }}>
                        {task.priority && (
                          <Lozenge appearance={getTaskPriorityAppearance(task.priority)}>
                            {getTaskPriorityLabel(task.priority)}
                          </Lozenge>
                        )}
                        <Lozenge appearance={getTaskStatusAppearance(task.status)}>
                          {getTaskStatusLabel(task.status)}
                        </Lozenge>
                        <TaskActionButtons task={task} canReview={group.key === 'review'} />
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

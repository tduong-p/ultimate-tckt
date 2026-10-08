import React, { useMemo } from 'react';
import { useQuery, QueryClient, QueryClientProvider, QueryClientContext } from '@tanstack/react-query';
import { token } from '@atlaskit/tokens';
import Lozenge from '@atlaskit/lozenge';
import { LottieLoading } from '../../../shared/components/LottieLoading';
import InboxIcon from '@atlaskit/icon/core/inbox';
import { fetchMyTasksToday, TaskItem } from '../../api';

const getStatusAppearance = (status: string) => {
  switch (status?.toLowerCase()) {
    case 'done':
      return 'success';
    case 'in_progress':
      return 'inprogress';
    case 'review':
      return 'moved';
    case 'cancelled':
    case 'overdue':
      return 'removed';
    default:
      return 'default';
  }
};

const getStatusLabel = (status: string) => {
  switch (status?.toLowerCase()) {
    case 'todo': return 'Cần làm';
    case 'in_progress': return 'Đang làm';
    case 'review': return 'Chờ duyệt';
    case 'done': return 'Đã xong';
    case 'cancelled': return 'Đã hủy';
    default: return status || 'Mới';
  }
};

const MyTasksViewContent: React.FC = () => {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['my-tasks-today'],
    queryFn: fetchMyTasksToday,
  });

  const openTasks = useMemo(() => {
    const taskMap = new Map<number, TaskItem>();
    (data?.dueToday || []).forEach(t => taskMap.set(t.id, t));
    (data?.overdue || []).forEach(t => taskMap.set(t.id, t));
    (data?.pendingMyReview || []).forEach(t => taskMap.set(t.id, t));
    return Array.from(taskMap.values()).filter(t => t.status !== 'done' && t.status !== 'cancelled');
  }, [data]);

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
            <span>{openTasks.length} Công Việc</span>
          </span>
        </div>

        {isLoading ? (
          <LottieLoading message="Đang tải danh sách công việc..." size={140} />
        ) : isError ? (
          <div style={{ color: token('color.text.danger', '#DE350B'), padding: '16px' }}>
            Lỗi tải dữ liệu công việc.
          </div>
        ) : openTasks.length === 0 ? (
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {openTasks.map(task => (
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
                    {task.deadline && <span>Hạn: {task.deadline.slice(0, 10)}</span>}
                    {task.assignee_name && <span>Phụ trách: {task.assignee_name}</span>}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '12px', flexShrink: 0 }}>
                  {task.priority && (
                    <Lozenge appearance={task.priority === 'urgent' || task.priority === 'high' ? 'removed' : 'default'}>
                      {task.priority}
                    </Lozenge>
                  )}
                  <Lozenge appearance={getStatusAppearance(task.status)}>
                    {getStatusLabel(task.status)}
                  </Lozenge>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const defaultViewQueryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

export const MyTasksView: React.FC = () => {
  const queryClient = React.useContext(QueryClientContext);

  if (!queryClient) {
    return (
      <QueryClientProvider client={defaultViewQueryClient}>
        <MyTasksViewContent />
      </QueryClientProvider>
    );
  }

  return <MyTasksViewContent />;
};

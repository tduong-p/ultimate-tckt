import React, { useState, useMemo } from 'react';
import { token } from '@atlaskit/tokens';
import Button from '@atlaskit/button/new';
import Select from '@atlaskit/select';
import Lozenge from '@atlaskit/lozenge';
import { LottieLoading } from '../../../shared/components/LottieLoading';
import InboxIcon from '@atlaskit/icon/core/inbox';
import {
  useQuery,
  QueryClient,
  QueryClientProvider,
  QueryClientContext,
} from '@tanstack/react-query';
import { fetchActivities, type ActivityItem } from '../../api';
import { CreateActivityModal } from '../dashboard/CreateActivityModal';

const defaultActivitiesQueryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

const formatDateDisplay = (dateStr?: string | null): string => {
  if (!dateStr) return '';
  try {
    const parts = dateStr.slice(0, 10).split('-');
    if (parts.length >= 3) {
      const year = parts[0];
      const month = parseInt(parts[1], 10);
      const day = parseInt(parts[2], 10);
      return `${String(day).padStart(2, '0')} thg ${month}, ${year}`;
    }
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      return `${String(d.getDate()).padStart(2, '0')} thg ${d.getMonth() + 1}, ${d.getFullYear()}`;
    }
  } catch {
    // fallback
  }
  return dateStr;
};

const getStatusLozenge = (status?: string) => {
  switch (status) {
    case 'approved':
      return <Lozenge appearance="success">• Đã Duyệt</Lozenge>;
    case 'active':
    case 'in_progress':
      return <Lozenge appearance="inprogress">• Đang diễn ra</Lozenge>;
    case 'completed':
      return <Lozenge appearance="success">• Hoàn thành</Lozenge>;
    case 'cancelled':
      return <Lozenge appearance="removed">• Đã hủy</Lozenge>;
    case 'proposed':
    default:
      return <Lozenge appearance="default">• Đề xuất</Lozenge>;
  }
};

const getTypeLabel = (type?: string): string => {
  if (type === 'event') return 'Sự kiện đơn vị';
  if (type === 'assigned') return 'Chỉ đạo cấp trên';
  return type || 'Sự kiện đơn vị';
};

export const ActivitiesViewContent: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  const { data: activities, isLoading, error } = useQuery({
    queryKey: ['core-activities', { q: searchQuery, status: statusFilter, type: typeFilter }],
    queryFn: () =>
      fetchActivities({
        q: searchQuery.trim() || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        type: typeFilter !== 'all' ? typeFilter : undefined,
      }),
  });

  const filteredActivities = useMemo(() => {
    if (!activities) return [];
    return activities.filter((act) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = act.title?.toLowerCase().includes(q);
        const matchDesc = act.description?.toLowerCase().includes(q);
        const matchTeam =
          act.team_name?.toLowerCase().includes(q) ||
          act.team_names?.toLowerCase().includes(q);
        if (!matchTitle && !matchDesc && !matchTeam) return false;
      }
      if (statusFilter !== 'all' && act.status !== statusFilter) {
        return false;
      }
      if (typeFilter !== 'all' && act.type !== typeFilter) {
        return false;
      }
      return true;
    });
  }, [activities, searchQuery, statusFilter, typeFilter]);

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', paddingTop: '4px' }}>
      {/* Header with Title and Action Button */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '24px',
        }}
      >
        <div>
          <h1
            style={{
              margin: 0,
              fontSize: '24px',
              fontWeight: 600,
              color: token('color.text', '#172B4D'),
              letterSpacing: '-0.2px',
            }}
          >
            Hoạt động
          </h1>
          <p
            style={{
              margin: '6px 0 0 0',
              fontSize: '14px',
              color: token('color.text.subtle', '#5E6C84'),
            }}
          >
            Lập kế hoạch, phối hợp và theo dõi mọi hoạt động.
          </p>
        </div>

        <Button appearance="primary" onClick={() => setIsModalOpen(true)}>
          + Đề xuất hoạt động
        </Button>
      </div>

      {/* Search and Filters Bar */}
      <div
        style={{
          display: 'flex',
          gap: '12px',
          alignItems: 'center',
          marginBottom: '28px',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ flex: '1 1 300px' }}>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm kiếm hoạt động..."
            style={{
              width: '100%',
              height: '38px',
              padding: '0 12px',
              border: `1px solid ${token('color.border', '#DFE1E6')}`,
              borderRadius: '4px',
              fontSize: '14px',
              color: token('color.text', '#172B4D'),
              backgroundColor: token('elevation.surface', '#FFFFFF'),
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        <div style={{ width: '180px' }}>
          <Select
            defaultValue={{ label: 'Tất cả trạng thái', value: 'all' }}
            options={[
              { label: 'Tất cả trạng thái', value: 'all' },
              { label: 'Đề xuất', value: 'proposed' },
              { label: 'Đã duyệt', value: 'approved' },
              { label: 'Đang diễn ra', value: 'active' },
              { label: 'Hoàn thành', value: 'completed' },
            ]}
            onChange={(opt: any) => setStatusFilter(opt?.value || 'all')}
          />
        </div>

        <div style={{ width: '220px' }}>
          <Select
            defaultValue={{ label: 'Tất cả loại', value: 'all' }}
            options={[
              { label: 'Tất cả loại', value: 'all' },
              { label: 'Sự kiện do đơn vị đề xuất', value: 'event' },
              { label: 'Chỉ đạo cấp trên', value: 'assigned' },
            ]}
            onChange={(opt: any) => setTypeFilter(opt?.value || 'all')}
          />
        </div>
      </div>

      {/* Activities Grid or Empty State */}
      {isLoading ? (
        <LottieLoading message="Đang tải danh sách hoạt động..." size={140} />
      ) : filteredActivities.length === 0 ? (
        <div
          style={{
            backgroundColor: token('elevation.surface.raised', '#FFFFFF'),
            border: `1px solid ${token('color.border', '#DFE1E6')}`,
            borderRadius: '6px',
            padding: '48px 24px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
          }}
        >
          <div style={{ color: token('color.icon.subtle', '#6B778C') }}>
            <InboxIcon label="" size="large" />
          </div>
          <div
            style={{
              fontSize: '16px',
              fontWeight: 600,
              color: token('color.text', '#172B4D'),
            }}
          >
            Chưa có hoạt động nào
          </div>
          <p
            style={{
              margin: 0,
              fontSize: '14px',
              color: token('color.text.subtle', '#5E6C84'),
              maxWidth: '440px',
              lineHeight: '1.4',
            }}
          >
            {searchQuery || statusFilter !== 'all' || typeFilter !== 'all'
              ? 'Không tìm thấy hoạt động phù hợp với bộ lọc hiện tại.'
              : 'Bắt đầu bằng cách tạo một đề xuất hoạt động mới cho tổ của bạn.'}
          </p>
          {!searchQuery && statusFilter === 'all' && typeFilter === 'all' && (
            <Button appearance="primary" onClick={() => setIsModalOpen(true)}>
              + Đề xuất hoạt động
            </Button>
          )}
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 420px))',
            gap: '20px',
          }}
        >
          {filteredActivities.map((activity: ActivityItem) => {
            const percent =
              activity.task_count && activity.task_count > 0
                ? Math.min(
                    100,
                    Math.round(((activity.done_count || 0) / activity.task_count) * 100)
                  )
                : 0;

            const accentColor =
              activity.team_color || token('color.background.brand.bold', '#0052CC');

            return (
              <div
                key={activity.id}
                style={{
                  backgroundColor: token('elevation.surface.raised', '#FFFFFF'),
                  border: `1px solid ${token('color.border', '#DFE1E6')}`,
                  borderRadius: '6px',
                  overflow: 'hidden',
                  boxShadow: token(
                    'elevation.shadow.raised',
                    '0 1px 1px rgba(9, 30, 66, 0.25), 0 0 1px rgba(9, 30, 66, 0.31)'
                  ),
                  display: 'flex',
                  flexDirection: 'column',
                  position: 'relative',
                }}
              >
                {/* Accent Bar */}
                <div
                  style={{
                    height: '4px',
                    backgroundColor: accentColor,
                    width: '100%',
                  }}
                />

                {/* Card Body */}
                <div
                  style={{
                    padding: '16px 18px',
                    display: 'flex',
                    flexDirection: 'column',
                    flex: 1,
                  }}
                >
                  {/* Header Tags & Status */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      gap: '8px',
                      marginBottom: '10px',
                    }}
                  >
                    <div
                      style={{
                        fontSize: '11px',
                        color: token('color.text.subtle', '#5E6C84'),
                        lineHeight: '1.4',
                        flex: 1,
                      }}
                    >
                      <span style={{ color: accentColor, marginRight: '4px' }}>•</span>
                      {activity.team_names || activity.team_name || 'Chung'}
                    </div>
                    {getStatusLozenge(activity.status)}
                  </div>

                  {/* Title */}
                  <h2
                    style={{
                      margin: '0 0 8px 0',
                      fontSize: '15px',
                      fontWeight: 600,
                      color: token('color.text', '#172B4D'),
                      lineHeight: '1.4',
                    }}
                  >
                    {activity.title}
                  </h2>

                  {/* Description Snippet */}
                  {activity.description && (
                    <p
                      style={{
                        margin: '0 0 16px 0',
                        fontSize: '13px',
                        color: token('color.text.subtle', '#5E6C84'),
                        lineHeight: '1.4',
                      }}
                    >
                      {activity.description}
                    </p>
                  )}

                  {/* Footer Metadata */}
                  <div
                    style={{
                      marginTop: 'auto',
                      paddingTop: '12px',
                      fontSize: '12px',
                      color: token('color.text.subtle', '#6B778C'),
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    <span>{getTypeLabel(activity.type)}</span>
                    <span>•</span>
                    <span>{activity.participant_count ?? 0} người</span>
                    {activity.deadline && (
                      <>
                        <span>•</span>
                        <span>{formatDateDisplay(activity.deadline)}</span>
                      </>
                    )}
                  </div>

                  {/* Progress Bar Line */}
                  <div
                    style={{
                      marginTop: '10px',
                      height: '4px',
                      backgroundColor: token('color.background.neutral', '#DFE1E6'),
                      borderRadius: '2px',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        width: `${percent}%`,
                        height: '100%',
                        backgroundColor: accentColor,
                        borderRadius: '2px',
                      }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Propose Activity Modal */}
      <CreateActivityModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
};

export const ActivitiesView: React.FC = () => {
  const queryClient = React.useContext(QueryClientContext);

  if (!queryClient) {
    return (
      <QueryClientProvider client={defaultActivitiesQueryClient}>
        <ActivitiesViewContent />
      </QueryClientProvider>
    );
  }

  return <ActivitiesViewContent />;
};

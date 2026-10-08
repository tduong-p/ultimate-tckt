import React, { useState } from 'react';
import { token } from '@atlaskit/tokens';
import Lozenge from '@atlaskit/lozenge';
import { LottieLoading } from '../../../shared/components/LottieLoading';
import InboxIcon from '@atlaskit/icon/core/inbox';
import {
  useQuery,
  QueryClient,
  QueryClientProvider,
  QueryClientContext,
} from '@tanstack/react-query';
import { fetchArchive, type ActivityItem } from '../../api';

const defaultArchiveQueryClient = new QueryClient({
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
      return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;
    }
  } catch {
    // fallback
  }
  return dateStr;
};

export const ArchiveViewContent: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');

  const { data: activities, isLoading, error } = useQuery({
    queryKey: ['core-archive', { q: searchQuery }],
    queryFn: () => fetchArchive({ q: searchQuery.trim() || undefined }),
  });

  const archiveList: ActivityItem[] = activities || [];

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', paddingTop: '4px' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1
          style={{
            margin: 0,
            fontSize: '24px',
            fontWeight: 600,
            color: token('color.text', '#172B4D'),
            letterSpacing: '-0.2px',
          }}
        >
          Kho lưu trữ hoạt động
        </h1>
        <p
          style={{
            margin: '6px 0 0 0',
            fontSize: '14px',
            color: token('color.text.subtle', '#5E6C84'),
          }}
        >
          Tìm kiếm kho tri thức chung của tổ chức.
        </p>
      </div>

      {/* Search Input Bar */}
      <div style={{ marginBottom: '24px' }}>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Tìm hoạt động, kết quả và bài học trước đây..."
          style={{
            width: '100%',
            height: '42px',
            padding: '0 16px',
            border: `1px solid ${token('color.border', '#DFE1E6')}`,
            borderRadius: '8px',
            fontSize: '14px',
            color: token('color.text', '#172B4D'),
            backgroundColor: token('elevation.surface', '#FFFFFF'),
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />
      </div>

      {/* Content Area */}
      {isLoading ? (
        <LottieLoading message="Đang tải dữ liệu lưu trữ..." size={140} />
      ) : error ? (
        <div
          style={{
            padding: '16px',
            backgroundColor: token('color.background.danger', '#FFEBE6'),
            color: token('color.text.danger', '#BF2600'),
            borderRadius: '4px',
          }}
        >
          Không thể tải kho lưu trữ hoạt động. Vui lòng thử lại sau.
        </div>
      ) : archiveList.length === 0 ? (
        /* Empty State Box */
        <div
          data-testid="archive-empty-state"
          style={{
            maxWidth: '480px',
            backgroundColor: token('elevation.surface.raised', '#FFFFFF'),
            border: `1px solid ${token('color.border', '#DFE1E6')}`,
            borderRadius: '8px',
            padding: '20px 24px',
            boxShadow: token(
              'elevation.shadow.raised',
              '0 1px 1px rgba(9, 30, 66, 0.25), 0 0 1px rgba(9, 30, 66, 0.31)'
            ),
            display: 'flex',
            gap: '14px',
            alignItems: 'flex-start',
          }}
        >
          <div
            style={{
              color: token('color.icon', '#42526E'),
              marginTop: '2px',
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <InboxIcon label="" />
          </div>
          <div>
            <div
              style={{
                fontSize: '15px',
                fontWeight: 600,
                color: token('color.text', '#172B4D'),
                marginBottom: '6px',
              }}
            >
              Không tìm thấy hoạt động lưu trữ
            </div>
            <div
              style={{
                fontSize: '13px',
                color: token('color.text.subtle', '#5E6C84'),
                lineHeight: 1.4,
              }}
            >
              Hoạt động hoàn thành sẽ được đưa vào kho lưu trữ.
            </div>
          </div>
        </div>
      ) : (
        /* Archive List */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {archiveList.map((item) => (
            <div
              key={item.id}
              data-testid={`archive-item-${item.id}`}
              style={{
                backgroundColor: token('elevation.surface.raised', '#FFFFFF'),
                border: `1px solid ${token('color.border', '#DFE1E6')}`,
                borderRadius: '8px',
                padding: '20px 24px',
                boxShadow: token(
                  'elevation.shadow.raised',
                  '0 1px 1px rgba(9, 30, 66, 0.25), 0 0 1px rgba(9, 30, 66, 0.31)'
                ),
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  gap: '12px',
                  marginBottom: '8px',
                  flexWrap: 'wrap',
                }}
              >
                <div>
                  <h3
                    style={{
                      margin: 0,
                      fontSize: '16px',
                      fontWeight: 600,
                      color: token('color.text', '#172B4D'),
                    }}
                  >
                    {item.title}
                  </h3>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      marginTop: '6px',
                      flexWrap: 'wrap',
                    }}
                  >
                    {item.team_name && (
                      <Lozenge appearance="inprogress">{item.team_name}</Lozenge>
                    )}
                    <Lozenge appearance="success">Hoàn thành</Lozenge>
                    {item.type && (
                      <Lozenge appearance="default">
                        {item.type === 'event' ? 'Sự kiện đơn vị' : 'Chỉ đạo cấp trên'}
                      </Lozenge>
                    )}
                    {item.deadline && (
                      <span
                        style={{
                          fontSize: '12px',
                          color: token('color.text.subtle', '#5E6C84'),
                        }}
                      >
                        Hạn chót: {formatDateDisplay(item.deadline)}
                      </span>
                    )}
                  </div>
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    fontSize: '13px',
                    color: token('color.text.subtle', '#5E6C84'),
                  }}
                >
                  {typeof item.participant_count === 'number' && (
                    <span>{item.participant_count} người tham gia</span>
                  )}
                  {typeof item.task_count === 'number' && (
                    <span>
                      {item.done_count ?? item.task_count}/{item.task_count} việc xong
                    </span>
                  )}
                </div>
              </div>

              {(item.result_summary || item.description) && (
                <p
                  style={{
                    margin: '8px 0 0 0',
                    fontSize: '14px',
                    color: token('color.text', '#172B4D'),
                    lineHeight: 1.5,
                  }}
                >
                  {item.result_summary || item.description}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export const ArchiveView: React.FC = () => {
  const queryClient = React.useContext(QueryClientContext);

  if (!queryClient) {
    return (
      <QueryClientProvider client={defaultArchiveQueryClient}>
        <ArchiveViewContent />
      </QueryClientProvider>
    );
  }

  return <ArchiveViewContent />;
};

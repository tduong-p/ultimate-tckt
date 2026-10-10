import React, { useState } from 'react';
import { token } from '@atlaskit/tokens';
import Button from '@atlaskit/button/new';
import Select from '@atlaskit/select';
import Lozenge from '@atlaskit/lozenge';
import { LottieLoading } from '../../../shared/components/LottieLoading';
import InboxIcon from '@atlaskit/icon/core/inbox';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { fetchActivities, fetchBootstrap, type ActivityItem } from '../../api';
import {
  ACTIVITY_STATUS_FILTER_OPTIONS,
  getActivityProgressPercent,
  getActivityStatusMeta,
  getActivityTypeLabel,
} from './activityLabels';
import { activityHref, goToActivity } from '../../navigation';
import { isHttpUrl } from '../../../shared/utils/url';
import { CreateActivityModal } from '../dashboard/CreateActivityModal';
import { toVnDateKey } from '../../../shared/utils/date';
import { useDebouncedValue } from '../../../shared/hooks/useDebouncedValue';

const formatDateDisplay = (dateStr?: string | null): string => {
  if (!dateStr) return '';
  try {
    const parts = toVnDateKey(dateStr).split('-');
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
  const meta = getActivityStatusMeta(status);
  return <Lozenge appearance={meta.appearance}>• {meta.label}</Lozenge>;
};

export const ActivitiesView: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  const debouncedQuery = useDebouncedValue(searchQuery.trim());

  const { data: activities = [], isLoading, error } = useQuery({
    queryKey: ['core-activities', { q: debouncedQuery, status: statusFilter, type: typeFilter }],
    queryFn: () =>
      fetchActivities({
        q: debouncedQuery || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        type: typeFilter !== 'all' ? typeFilter : undefined,
      }),
    placeholderData: keepPreviousData,
  });

  // Dùng chung cache với Dashboard.
  const { data: bootstrap } = useQuery({ queryKey: ['core-bootstrap'], queryFn: fetchBootstrap });
  const canCreateActivity = bootstrap?.capabilities?.canCreateActivity === true;

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', paddingTop: '4px' }}>
      {/* Header with Title and Action Button */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '12px',
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

        {canCreateActivity && (
          <Button appearance="primary" onClick={() => setIsModalOpen(true)}>
            + Đề xuất hoạt động
          </Button>
        )}
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
        <div style={{ flex: '1 1 260px' }}>
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

        <div className="mobile-w-full" style={{ width: '180px' }}>
          <Select
            defaultValue={{ label: 'Tất cả trạng thái', value: 'all' }}
            options={[
              { label: 'Tất cả trạng thái', value: 'all' },
              ...ACTIVITY_STATUS_FILTER_OPTIONS,
            ]}
            onChange={(opt: any) => setStatusFilter(opt?.value || 'all')}
          />
        </div>

        <div className="mobile-w-full" style={{ width: '220px' }}>
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
      ) : error ? (
        <div
          role="alert"
          style={{
            padding: '16px',
            backgroundColor: token('color.background.danger', '#FFEBE6'),
            color: token('color.text.danger', '#BF2600'),
            borderRadius: '4px',
          }}
        >
          Không thể tải danh sách hoạt động. Vui lòng thử lại sau.
        </div>
      ) : activities.length === 0 ? (
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
            <InboxIcon label="" />
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
          {canCreateActivity && !searchQuery && statusFilter === 'all' && typeFilter === 'all' && (
            <Button appearance="primary" onClick={() => setIsModalOpen(true)}>
              + Đề xuất hoạt động
            </Button>
          )}
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 340px), 1fr))',
            gap: '20px',
          }}
        >
          {activities.map((activity: ActivityItem) => {
            const percent = getActivityProgressPercent(activity);
            const teamLabel = activity.team_names || activity.team_name;
            const typeLabel = getActivityTypeLabel(activity.type);

            const accentColor =
              activity.team_color || token('color.background.brand.bold', '#0052CC');

            return (
              <div
                key={activity.id}
                data-testid={`activity-card-${activity.id}`}
                onClick={(e) => {
                  if ((e.target as HTMLElement).closest('a')) return;
                  goToActivity(activity.id);
                }}
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
                  cursor: 'pointer',
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
                      {teamLabel && (
                        <>
                          <span style={{ color: accentColor, marginRight: '4px' }}>•</span>
                          {teamLabel}
                        </>
                      )}
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
                    <a href={activityHref(activity.id)} style={{ color: 'inherit', textDecoration: 'none' }}>
                      {activity.title}
                    </a>
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

                  {activity.proposal_document_url && isHttpUrl(activity.proposal_document_url) && (
                    <a
                      href={activity.proposal_document_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ fontSize: '13px', color: token('color.link', '#0052CC'), marginBottom: '8px' }}
                    >
                      Hồ sơ đề án
                    </a>
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
                    {[
                      typeLabel,
                      typeof activity.participant_count === 'number'
                        ? `${activity.participant_count} người`
                        : null,
                      activity.deadline ? formatDateDisplay(activity.deadline) : null,
                    ]
                      .filter((part): part is string => !!part)
                      .map((part, index) => (
                        <React.Fragment key={part}>
                          {index > 0 && <span>•</span>}
                          <span>{part}</span>
                        </React.Fragment>
                      ))}
                  </div>

                  {/* Progress Bar Line */}
                  <div
                    role="progressbar"
                    aria-label="Tiến độ hoạt động"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={percent}
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
        onCreated={goToActivity}
      />
    </div>
  );
};

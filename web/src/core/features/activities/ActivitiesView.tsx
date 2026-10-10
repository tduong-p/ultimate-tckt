import React, { useState } from 'react';
import { Badge, Button, Select } from '../../../ui';
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
import { STATUS_TONE } from './ActivityInfoSections';
import './activities.css';
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

const STATUS_OPTIONS = [{ value: 'all', label: 'Tất cả trạng thái' }, ...ACTIVITY_STATUS_FILTER_OPTIONS];
const TYPE_OPTIONS = [
  { value: 'all', label: 'Tất cả loại' },
  { value: 'event', label: 'Sự kiện do đơn vị đề xuất' },
  { value: 'assigned', label: 'Chỉ đạo cấp trên' },
];
const FALLBACK_DOT = 'var(--ui-text-faint)';

const ActivityRow: React.FC<{ activity: ActivityItem }> = ({ activity }) => {
  const percent = getActivityProgressPercent(activity);
  const meta = getActivityStatusMeta(activity.status);
  const teamLabel = activity.team_names || activity.team_name;
  const parts = [
    teamLabel,
    getActivityTypeLabel(activity.type),
    typeof activity.participant_count === 'number' ? `${activity.participant_count} người` : null,
  ].filter((part): part is string => !!part);
  return (
    <li
      className="act-row"
      data-testid={`activity-card-${activity.id}`}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest('a')) return;
        goToActivity(activity.id);
      }}
    >
      <div className="act-row-main">
        <span className="act-row-dot" style={{ background: activity.team_color || FALLBACK_DOT }} aria-hidden="true" />
        <div className="act-row-body">
          <a className="act-row-title" href={activityHref(activity.id)}>{activity.title}</a>
          {parts.length > 0 && <span className="act-row-meta">{parts.join(' · ')}</span>}
        </div>
      </div>
      <Badge tone={STATUS_TONE[activity.status ?? 'proposed'] ?? 'neutral'}>{meta.label}</Badge>
      <div className="act-progress" role="progressbar" aria-label="Tiến độ hoạt động" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}>
        <span style={{ width: `${percent}%` }} />
      </div>
      {activity.deadline && <span className="act-row-date">{formatDateDisplay(activity.deadline)}</span>}
      {activity.proposal_document_url && isHttpUrl(activity.proposal_document_url) && (
        <a className="act-row-link" href={activity.proposal_document_url} target="_blank" rel="noopener noreferrer">Hồ sơ đề án</a>
      )}
    </li>
  );
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
  const filtered = Boolean(searchQuery) || statusFilter !== 'all' || typeFilter !== 'all';
  const createButton = (
    <Button variant="primary" onClick={() => setIsModalOpen(true)}>+ Đề xuất hoạt động</Button>
  );

  return (
    <div className="act">
      <div className="act-head">
        <div>
          <h1 className="act-h1">Hoạt động</h1>
          <p className="act-sub">Lập kế hoạch, phối hợp và theo dõi mọi hoạt động.</p>
        </div>
        {canCreateActivity && createButton}
      </div>

      <div className="act-filters">
        <input
          type="text"
          className="act-search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Tìm kiếm hoạt động..."
          aria-label="Tìm kiếm hoạt động"
        />
        <Select aria-label="Lọc theo trạng thái" value={statusFilter} options={STATUS_OPTIONS} onChange={setStatusFilter} />
        <Select aria-label="Lọc theo loại" value={typeFilter} options={TYPE_OPTIONS} onChange={setTypeFilter} />
      </div>

      {isLoading ? (
        <p className="act-state" role="status">Đang tải danh sách hoạt động...</p>
      ) : error ? (
        <div role="alert" className="act-state act-state--error">
          Không thể tải danh sách hoạt động. Vui lòng thử lại sau.
        </div>
      ) : activities.length === 0 ? (
        <div className="act-empty">
          <div className="act-empty-title">Chưa có hoạt động nào</div>
          <p className="act-empty-text">
            {filtered
              ? 'Không tìm thấy hoạt động phù hợp với bộ lọc hiện tại.'
              : 'Bắt đầu bằng cách tạo một đề xuất hoạt động mới cho tổ của bạn.'}
          </p>
          {canCreateActivity && !filtered && createButton}
        </div>
      ) : (
        <ul className="act-list">
          {activities.map((activity: ActivityItem) => (
            <ActivityRow key={activity.id} activity={activity} />
          ))}
        </ul>
      )}

      <CreateActivityModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onCreated={goToActivity} />
    </div>
  );
};

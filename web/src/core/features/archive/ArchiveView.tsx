import React, { useState } from 'react';
import { Badge } from '../../../ui';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { fetchArchive, type ActivityItem } from '../../api';
import { getActivityTypeLabel } from '../activities/activityLabels';
import { toVnDateKey } from '../../../shared/utils/date';
import { useDebouncedValue } from '../../../shared/hooks/useDebouncedValue';
import '../people/people.css';
import './archive.css';

const formatDateDisplay = (dateStr?: string | null): string => {
  if (!dateStr) return '';
  try {
    const parts = toVnDateKey(dateStr).split('-');
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

export const ArchiveView: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedQuery = useDebouncedValue(searchQuery.trim());

  const { data: activities, isLoading, error } = useQuery({
    queryKey: ['core-archive', { q: debouncedQuery }],
    queryFn: () => fetchArchive({ q: debouncedQuery || undefined }),
    placeholderData: keepPreviousData,
  });

  const archiveList: ActivityItem[] = activities || [];

  return (
    <div className="arc">
      <div className="ppl-head">
        <div>
          <h1 className="ppl-h1">Kho lưu trữ hoạt động</h1>
          <p className="ppl-sub">Tìm kiếm kho tri thức chung của tổ chức.</p>
        </div>
      </div>

      <input
        type="text"
        className="ppl-input arc-search"
        aria-label="Tìm trong kho lưu trữ"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder="Tìm hoạt động, kết quả và bài học trước đây..."
      />

      {isLoading ? (
        <p role="status" className="ppl-state">Đang tải dữ liệu lưu trữ...</p>
      ) : error ? (
        <p role="alert" className="ppl-state ppl-state--error">Không thể tải kho lưu trữ hoạt động. Vui lòng thử lại sau.</p>
      ) : archiveList.length === 0 ? (
        <div data-testid="archive-empty-state" className="ppl-empty">
          <div className="ppl-empty-title">Không tìm thấy hoạt động lưu trữ</div>
          <p className="ppl-empty-text">Hoạt động hoàn thành sẽ được đưa vào kho lưu trữ.</p>
        </div>
      ) : (
        <ul className="arc-list">
          {archiveList.map((item) => (
            <li key={item.id} data-testid={`archive-item-${item.id}`} className="arc-item">
              <div className="arc-top">
                <div>
                  <h3 className="arc-title">{item.title}</h3>
                  <div className="arc-badges">
                    {item.team_name && <Badge tone="info">{item.team_name}</Badge>}
                    <Badge tone="success">Hoàn thành</Badge>
                    {getActivityTypeLabel(item.type) && <Badge>{getActivityTypeLabel(item.type)}</Badge>}
                    {item.deadline && <span className="arc-deadline">Hạn chót: {formatDateDisplay(item.deadline)}</span>}
                  </div>
                </div>
                <div className="arc-stats">
                  {typeof item.participant_count === 'number' && <span>{item.participant_count} người tham gia</span>}
                  {typeof item.task_count === 'number' ? (
                    <span>{item.done_count ?? item.task_count}/{item.task_count} việc xong</span>
                  ) : (
                    typeof item.progress_percent === 'number' && <span>Tiến độ {item.progress_percent}%</span>
                  )}
                </div>
              </div>
              {(item.result_summary || item.description) && <p className="arc-summary">{item.result_summary || item.description}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

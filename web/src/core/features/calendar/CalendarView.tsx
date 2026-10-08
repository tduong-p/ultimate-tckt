import React, { useState, useMemo } from 'react';
import { token } from '@atlaskit/tokens';
import Button from '@atlaskit/button/new';
import Select from '@atlaskit/select';
import Lozenge from '@atlaskit/lozenge';
import Spinner from '@atlaskit/spinner';
import InboxIcon from '@atlaskit/icon/core/inbox';
import ChevronLeftIcon from '@atlaskit/icon/core/chevron-left';
import ChevronRightIcon from '@atlaskit/icon/core/chevron-right';
import {
  useQuery,
  QueryClient,
  QueryClientProvider,
  QueryClientContext,
} from '@tanstack/react-query';
import { fetchActivities, fetchTeams, type ActivityItem, type TeamItem } from '../../api';

interface CalendarCell {
  day: number;
  isCurrentMonth: boolean;
  isToday?: boolean;
  isoDate: string;
}

const defaultCalendarQueryClient = new QueryClient({
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

const getStatusLozenge = (status?: string) => {
  switch (status) {
    case 'approved':
      return <Lozenge appearance="success">Đã Duyệt</Lozenge>;
    case 'active':
    case 'in_progress':
      return <Lozenge appearance="inprogress">Đang diễn ra</Lozenge>;
    case 'completed':
      return <Lozenge appearance="success">Hoàn thành</Lozenge>;
    case 'cancelled':
      return <Lozenge appearance="removed">Đã hủy</Lozenge>;
    case 'proposed':
    default:
      return <Lozenge appearance="default">Đề xuất</Lozenge>;
  }
};

export const CalendarViewContent: React.FC = () => {
  const [viewMode, setViewMode] = useState<'month' | 'list'>('month');
  const [currentDate, setCurrentDate] = useState(() => new Date(2026, 9, 8)); // Oct 8, 2026
  const [selectedTeam, setSelectedTeam] = useState('all');

  // Days of week (Monday to Sunday)
  const weekDays = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

  const { data: activities, isLoading: isActivitiesLoading } = useQuery({
    queryKey: ['core-activities'],
    queryFn: () => fetchActivities(),
  });

  const { data: teams } = useQuery({
    queryKey: ['core-teams'],
    queryFn: fetchTeams,
  });

  const teamOptions = useMemo(() => {
    const list: TeamItem[] = teams || [];
    return [
      { label: 'Tất cả các Tổ', value: 'all' },
      ...list.map((t) => ({ label: t.name, value: String(t.id) })),
    ];
  }, [teams]);

  const filteredActivities = useMemo(() => {
    const list: ActivityItem[] = activities || [];
    if (selectedTeam === 'all') return list;
    return list.filter((act) => String(act.team_id) === String(selectedTeam));
  }, [activities, selectedTeam]);

  // Compute month title
  const monthName = `Tháng ${currentDate.getMonth() + 1} năm ${currentDate.getFullYear()}`;

  // Month navigation handlers
  const handlePrevMonth = () => {
    setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date(2026, 9, 8));
  };

  // Generate calendar grid cells (Monday-based)
  const calendarCells: CalendarCell[] = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDay = new Date(year, month, 1);
    const dayOfWeek = firstDay.getDay(); // 0 is Sun, 1 is Mon...
    const mondayOffset = (dayOfWeek + 6) % 7; // Mon is 0, Sun is 6

    const startDate = new Date(year, month, 1 - mondayOffset);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const totalCells = mondayOffset + daysInMonth > 35 ? 42 : 35;

    const cells: CalendarCell[] = [];
    const cur = new Date(startDate);

    for (let i = 0; i < totalCells; i++) {
      const cellYear = cur.getFullYear();
      const cellMonth = cur.getMonth();
      const cellDay = cur.getDate();
      const isCurrentMonth = cellMonth === month;
      const isToday = cellYear === 2026 && cellMonth === 9 && cellDay === 8;
      const isoDate = `${cellYear}-${String(cellMonth + 1).padStart(2, '0')}-${String(cellDay).padStart(2, '0')}`;

      cells.push({
        day: cellDay,
        isCurrentMonth,
        isToday,
        isoDate,
      });

      cur.setDate(cur.getDate() + 1);
    }

    return cells;
  }, [currentDate]);

  // Group activities by date (start_date or deadline)
  const activitiesByDate = useMemo(() => {
    const map = new Map<string, ActivityItem[]>();
    for (const act of filteredActivities) {
      const dates = new Set<string>();
      if (act.start_date) dates.add(act.start_date.slice(0, 10));
      if (act.deadline) dates.add(act.deadline.slice(0, 10));

      for (const d of dates) {
        if (!map.has(d)) map.set(d, []);
        map.get(d)!.push(act);
      }
    }
    return map;
  }, [filteredActivities]);

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', paddingTop: '4px' }}>
      {/* Page Header */}
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
          Lịch chung
        </h1>
        <p
          style={{
            margin: '6px 0 0 0',
            fontSize: '14px',
            color: token('color.text.subtle', '#5E6C84'),
          }}
        >
          Lịch hoạt động và hạn chót công việc của các Tổ.
        </p>
      </div>

      {/* Toolbar Controls */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          marginBottom: '16px',
        }}
      >
        {/* Left Toolbar: Month Navigation */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Button
            appearance="default"
            aria-label="Tháng trước"
            onClick={handlePrevMonth}
          >
            <ChevronLeftIcon label="" />
          </Button>

          <span
            style={{
              fontSize: '15px',
              fontWeight: 600,
              color: token('color.text', '#172B4D'),
              padding: '0 8px',
              minWidth: '150px',
              textAlign: 'center',
            }}
          >
            {monthName}
          </span>

          <Button
            appearance="default"
            aria-label="Tháng sau"
            onClick={handleNextMonth}
          >
            <ChevronRightIcon label="" />
          </Button>

          <Button appearance="default" onClick={handleToday}>
            Hôm nay
          </Button>
        </div>

        {/* Right Toolbar: Team Filter & View Switcher */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '220px' }}>
            <Select
              defaultValue={{ label: 'Tất cả các Tổ', value: 'all' }}
              options={teamOptions}
              onChange={(opt: any) => setSelectedTeam(opt?.value || 'all')}
              placeholder="Chọn Tổ"
            />
          </div>

          <div style={{ display: 'flex', gap: '4px' }}>
            <Button
              appearance={viewMode === 'month' ? 'primary' : 'default'}
              onClick={() => setViewMode('month')}
            >
              Tháng
            </Button>
            <Button
              appearance={viewMode === 'list' ? 'primary' : 'default'}
              onClick={() => setViewMode('list')}
            >
              Danh sách
            </Button>
          </div>
        </div>
      </div>

      {viewMode === 'month' ? (
        /* Calendar Month Grid */
        <div
          style={{
            backgroundColor: token('elevation.surface.raised', '#FFFFFF'),
            border: `1px solid ${token('color.border', '#DFE1E6')}`,
            borderRadius: '3px',
            overflow: 'hidden',
            boxShadow: token(
              'elevation.shadow.raised',
              '0 1px 1px rgba(9, 30, 66, 0.25), 0 0 1px rgba(9, 30, 66, 0.31)'
            ),
          }}
        >
          {/* Days of week header */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              borderBottom: `1px solid ${token('color.border', '#DFE1E6')}`,
              backgroundColor: token('elevation.surface', '#FAFBFC'),
            }}
          >
            {weekDays.map((day, idx) => (
              <div
                key={day}
                style={{
                  textAlign: 'center',
                  padding: '12px 0',
                  fontSize: '12px',
                  fontWeight: 700,
                  color: token('color.text.subtle', '#5E6C84'),
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  borderRight: idx < 6 ? `1px solid ${token('color.border', '#DFE1E6')}` : 'none',
                }}
              >
                {day}
              </div>
            ))}
          </div>

          {/* Month Grid Cells */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
            }}
          >
            {calendarCells.map((cell, idx) => {
              const isLastCol = (idx + 1) % 7 === 0;
              const isLastRow = idx >= calendarCells.length - 7;
              const dayActivities = activitiesByDate.get(cell.isoDate) || [];

              return (
                <div
                  key={idx}
                  data-testid={`calendar-cell-${cell.isoDate}`}
                  style={{
                    minHeight: '100px',
                    padding: '8px 10px',
                    backgroundColor: !cell.isCurrentMonth
                      ? token('color.background.neutral.subtle', '#F4F5F7')
                      : cell.isToday
                      ? token('color.background.selected', '#EBF3FF')
                      : token('elevation.surface', '#FFFFFF'),
                    borderRight: !isLastCol ? `1px solid ${token('color.border', '#DFE1E6')}` : 'none',
                    borderBottom: !isLastRow ? `1px solid ${token('color.border', '#DFE1E6')}` : 'none',
                    position: 'relative',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    {cell.isToday ? (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '24px',
                          height: '24px',
                          borderRadius: '50%',
                          backgroundColor: token('color.background.brand.bold', '#0052CC'),
                          color: '#FFFFFF',
                          fontSize: '12px',
                          fontWeight: 700,
                        }}
                      >
                        {cell.day}
                      </span>
                    ) : (
                      <span
                        style={{
                          fontSize: '13px',
                          fontWeight: cell.isCurrentMonth ? 600 : 400,
                          color: cell.isCurrentMonth
                            ? token('color.text', '#172B4D')
                            : token('color.text.disabled', '#A5ADBA'),
                        }}
                      >
                        {cell.day}
                      </span>
                    )}
                  </div>

                  {/* Activity badges for this day */}
                  {dayActivities.length > 0 && (
                    <div style={{ marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                      {dayActivities.slice(0, 2).map((act) => (
                        <div
                          key={act.id}
                          title={`${act.title} (${act.team_name || ''})`}
                          data-testid={`activity-pill-${act.id}`}
                          style={{
                            fontSize: '11px',
                            padding: '2px 5px',
                            borderRadius: '3px',
                            backgroundColor: act.team_color ? `${act.team_color}20` : '#EBF3FF',
                            color: act.team_color || '#0052CC',
                            borderLeft: `3px solid ${act.team_color || '#0052CC'}`,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            fontWeight: 500,
                            lineHeight: 1.3,
                          }}
                        >
                          {act.title}
                        </div>
                      ))}
                      {dayActivities.length > 2 && (
                        <span style={{ fontSize: '10px', color: token('color.text.subtle', '#5E6C84') }}>
                          +{dayActivities.length - 2} hoạt động
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Calendar List View */
        <div>
          {filteredActivities.length === 0 ? (
            <div
              data-testid="calendar-empty-state"
              style={{
                maxWidth: '560px',
                margin: '24px auto',
                backgroundColor: token('elevation.surface.raised', '#FFFFFF'),
                border: `1px solid ${token('color.border', '#DFE1E6')}`,
                borderRadius: '8px',
                padding: '20px 24px',
                display: 'flex',
                gap: '14px',
                alignItems: 'center',
                boxShadow: token(
                  'elevation.shadow.raised',
                  '0 1px 1px rgba(9, 30, 66, 0.25), 0 0 1px rgba(9, 30, 66, 0.31)'
                ),
              }}
            >
              <div style={{ color: token('color.icon', '#42526E'), flexShrink: 0 }}>
                <InboxIcon label="" />
              </div>
              <div>
                <div
                  style={{
                    fontSize: '15px',
                    fontWeight: 600,
                    color: token('color.text', '#172B4D'),
                    marginBottom: '4px',
                  }}
                >
                  Không có hoạt động
                </div>
                <div style={{ fontSize: '13px', color: token('color.text.subtle', '#5E6C84') }}>
                  Chưa có hoạt động nào được lên lịch cho khoảng thời gian này.
                </div>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {filteredActivities.map((act) => (
                <div
                  key={act.id}
                  data-testid={`list-activity-${act.id}`}
                  style={{
                    backgroundColor: token('elevation.surface.raised', '#FFFFFF'),
                    border: `1px solid ${token('color.border', '#DFE1E6')}`,
                    borderRadius: '6px',
                    padding: '16px 20px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '16px',
                    boxShadow: token(
                      'elevation.shadow.raised',
                      '0 1px 1px rgba(9, 30, 66, 0.25), 0 0 1px rgba(9, 30, 66, 0.31)'
                    ),
                  }}
                >
                  <div>
                    <h3
                      style={{
                        margin: 0,
                        fontSize: '15px',
                        fontWeight: 600,
                        color: token('color.text', '#172B4D'),
                      }}
                    >
                      {act.title}
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
                      {act.team_name && (
                        <Lozenge appearance="inprogress">{act.team_name}</Lozenge>
                      )}
                      {getStatusLozenge(act.status)}
                      <span
                        style={{
                          fontSize: '12px',
                          color: token('color.text.subtle', '#5E6C84'),
                        }}
                      >
                        Hạn chót: {formatDateDisplay(act.deadline)}
                      </span>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <span
                      style={{
                        fontSize: '13px',
                        fontWeight: 500,
                        color: token('color.text.subtle', '#5E6C84'),
                      }}
                    >
                      {act.type === 'event' ? 'Sự kiện' : 'Chỉ đạo'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export const CalendarView: React.FC = () => {
  const queryClient = React.useContext(QueryClientContext);

  if (!queryClient) {
    return (
      <QueryClientProvider client={defaultCalendarQueryClient}>
        <CalendarViewContent />
      </QueryClientProvider>
    );
  }

  return <CalendarViewContent />;
};

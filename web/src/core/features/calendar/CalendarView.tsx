import React, { useState, useMemo } from 'react';
import { token } from '@atlaskit/tokens';
import Button from '@atlaskit/button/new';
import Select from '@atlaskit/select';
import Lozenge from '@atlaskit/lozenge';
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
import { LottieLoading } from '../../../shared/components/LottieLoading';

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

const getStatusText = (status?: string): string => {
  switch (status) {
    case 'approved':
      return 'Đã duyệt';
    case 'active':
    case 'in_progress':
      return 'Đang diễn ra';
    case 'completed':
      return 'Hoàn thành';
    case 'cancelled':
      return 'Đã hủy';
    case 'proposed':
    default:
      return 'Đề xuất';
  }
};

// 16 distinct, high-contrast, beautiful accessible colors for Gantt activity bars
export const GANTT_COLORS = [
  { bg: '#0052CC', border: '#0747A6', text: '#FFFFFF' }, // Classic Blue
  { bg: '#00875A', border: '#006644', text: '#FFFFFF' }, // Deep Green
  { bg: '#FF5630', border: '#DE350B', text: '#FFFFFF' }, // Crimson Red
  { bg: '#6554C0', border: '#5243AA', text: '#FFFFFF' }, // Purple
  { bg: '#00B8D9', border: '#00A3BF', text: '#FFFFFF' }, // Teal / Cyan
  { bg: '#FF8B00', border: '#C25E00', text: '#FFFFFF' }, // Amber Orange
  { bg: '#36B37E', border: '#00875A', text: '#FFFFFF' }, // Mint Green
  { bg: '#8777D9', border: '#6554C0', text: '#FFFFFF' }, // Lavender
  { bg: '#EC4899', border: '#DB2777', text: '#FFFFFF' }, // Hot Pink
  { bg: '#0284C7', border: '#0369A1', text: '#FFFFFF' }, // Sky Blue
  { bg: '#F59E0B', border: '#D97706', text: '#FFFFFF' }, // Golden Amber
  { bg: '#10B981', border: '#059669', text: '#FFFFFF' }, // Emerald
  { bg: '#8B5CF6', border: '#7C3AED', text: '#FFFFFF' }, // Violet
  { bg: '#14B8A6', border: '#0D9488', text: '#FFFFFF' }, // Deep Teal
  { bg: '#F43F5E', border: '#E11D48', text: '#FFFFFF' }, // Rose Red
  { bg: '#6366F1', border: '#4F46E5', text: '#FFFFFF' }, // Indigo
];

const GANTT_MONTHS = ['Thg 1', 'Thg 2', 'Thg 3', 'Thg 4', 'Thg 5', 'Thg 6', 'Thg 7', 'Thg 8', 'Thg 9', 'Thg 10', 'Thg 11', 'Thg 12'];

interface GanttPosition {
  leftPercent: number;
  widthPercent: number;
  startDateDisplay: string;
  deadlineDisplay: string;
}

const calculateGanttPosition = (act: ActivityItem, year: number): GanttPosition => {
  const yearStart = new Date(year, 0, 1).getTime();
  const yearEnd = new Date(year, 11, 31, 23, 59, 59).getTime();
  const yearDuration = Math.max(1, yearEnd - yearStart);

  let startTs: number;
  let endTs: number;

  if (act.start_date && act.deadline) {
    startTs = new Date(act.start_date).getTime();
    endTs = new Date(act.deadline).getTime();
  } else if (act.start_date) {
    startTs = new Date(act.start_date).getTime();
    endTs = startTs + 14 * 24 * 60 * 60 * 1000;
  } else if (act.deadline) {
    endTs = new Date(act.deadline).getTime();
    startTs = endTs - 14 * 24 * 60 * 60 * 1000;
  } else {
    startTs = new Date(year, 9, 1).getTime(); // Oct 1 fallback
    endTs = startTs + 14 * 24 * 60 * 60 * 1000;
  }

  // Fallback for invalid parsed dates
  if (isNaN(startTs)) startTs = new Date(year, 9, 1).getTime();
  if (isNaN(endTs)) endTs = startTs + 14 * 24 * 60 * 60 * 1000;

  if (endTs < startTs) {
    endTs = startTs + 7 * 24 * 60 * 60 * 1000;
  }

  const clampedStart = Math.max(yearStart, Math.min(yearEnd, startTs));
  const clampedEnd = Math.max(yearStart, Math.min(yearEnd, endTs));

  const leftPercent = Math.max(0, Math.min(94, ((clampedStart - yearStart) / yearDuration) * 100));
  const rawWidth = ((clampedEnd - clampedStart) / yearDuration) * 100;
  const widthPercent = Math.min(100 - leftPercent, Math.max(7, rawWidth));

  return {
    leftPercent,
    widthPercent,
    startDateDisplay: formatDateDisplay(act.start_date || new Date(startTs).toISOString().slice(0, 10)),
    deadlineDisplay: formatDateDisplay(act.deadline || new Date(endTs).toISOString().slice(0, 10)),
  };
};

export const CalendarViewContent: React.FC = () => {
  const [viewMode, setViewMode] = useState<'month' | 'list' | 'gantt'>('month');
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
  const periodTitle = viewMode === 'gantt' ? `Năm ${currentDate.getFullYear()}` : monthName;

  // Navigation handlers
  const handlePrev = () => {
    if (viewMode === 'gantt') {
      setCurrentDate((prev) => new Date(prev.getFullYear() - 1, prev.getMonth(), 1));
    } else {
      setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
    }
  };

  const handleNext = () => {
    if (viewMode === 'gantt') {
      setCurrentDate((prev) => new Date(prev.getFullYear() + 1, prev.getMonth(), 1));
    } else {
      setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
    }
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
        {/* Left Toolbar: Period Navigation */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Button
            appearance="default"
            aria-label={viewMode === 'gantt' ? 'Năm trước' : 'Tháng trước'}
            onClick={handlePrev}
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
            {periodTitle}
          </span>

          <Button
            appearance="default"
            aria-label={viewMode === 'gantt' ? 'Năm sau' : 'Tháng sau'}
            onClick={handleNext}
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
            <Button
              appearance={viewMode === 'gantt' ? 'primary' : 'default'}
              onClick={() => setViewMode('gantt')}
            >
              Biểu đồ Gantt
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
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
      ) : viewMode === 'list' ? (
        /* Calendar List View */
        isActivitiesLoading ? (
          <LottieLoading message="Đang tải danh sách hoạt động..." size={140} />
        ) : filteredActivities.length === 0 ? (
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
          )
      ) : isActivitiesLoading ? (
        <LottieLoading message="Đang tải biểu đồ Gantt..." size={140} />
      ) : (
        /* Gantt Chart View */
        <div
          data-testid="gantt-chart-container"
          style={{
            backgroundColor: token('elevation.surface.raised', '#FFFFFF'),
            border: `1px solid ${token('color.border', '#DFE1E6')}`,
            borderRadius: '6px',
            overflow: 'hidden',
            boxShadow: token(
              'elevation.shadow.raised',
              '0 1px 1px rgba(9, 30, 66, 0.25), 0 0 1px rgba(9, 30, 66, 0.31)'
            ),
          }}
        >
          {/* Gantt Header */}
          <div
            style={{
              display: 'flex',
              borderBottom: `1px solid ${token('color.border', '#DFE1E6')}`,
              backgroundColor: token('elevation.surface', '#FAFBFC'),
            }}
          >
            {/* Task list column title */}
            <div
              style={{
                width: '280px',
                minWidth: '240px',
                padding: '12px 16px',
                fontWeight: 700,
                fontSize: '12px',
                color: token('color.text.subtle', '#5E6C84'),
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                borderRight: `1px solid ${token('color.border', '#DFE1E6')}`,
                boxSizing: 'border-box',
              }}
            >
              Danh sách hoạt động ({filteredActivities.length})
            </div>

            {/* 12 Months timeline header */}
            <div
              style={{
                flex: 1,
                display: 'grid',
                gridTemplateColumns: 'repeat(12, 1fr)',
              }}
            >
              {GANTT_MONTHS.map((m, idx) => (
                <div
                  key={m}
                  style={{
                    textAlign: 'center',
                    padding: '12px 0',
                    fontSize: '12px',
                    fontWeight: 700,
                    color:
                      idx === 9 && currentDate.getFullYear() === 2026
                        ? token('color.text.brand', '#0052CC')
                        : token('color.text.subtle', '#5E6C84'),
                    backgroundColor:
                      idx === 9 && currentDate.getFullYear() === 2026
                        ? token('color.background.selected', '#EBF3FF')
                        : 'transparent',
                    borderRight: idx < 11 ? `1px solid ${token('color.border', '#DFE1E6')}` : 'none',
                    letterSpacing: '0.3px',
                  }}
                >
                  {m}
                </div>
              ))}
            </div>
          </div>

          {/* Gantt Rows */}
          {filteredActivities.length === 0 ? (
            <div
              data-testid="calendar-empty-state"
              style={{
                padding: '48px 24px',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '12px',
              }}
            >
              <div style={{ color: token('color.icon', '#42526E') }}>
                <InboxIcon label="" />
              </div>
              <div style={{ fontSize: '14px', color: token('color.text.subtle', '#5E6C84') }}>
                Không có hoạt động nào trong danh sách.
              </div>
            </div>
          ) : (
            <div style={{ position: 'relative' }}>
              {filteredActivities.map((act, idx) => {
                const color = GANTT_COLORS[idx % GANTT_COLORS.length];
                const position = calculateGanttPosition(act, currentDate.getFullYear());

                return (
                  <div
                    key={act.id}
                    data-testid={`gantt-row-${act.id}`}
                    style={{
                      display: 'flex',
                      borderBottom: `1px solid ${token('color.border', '#DFE1E6')}`,
                      minHeight: '52px',
                      alignItems: 'center',
                      backgroundColor:
                        idx % 2 === 0
                          ? token('elevation.surface', '#FFFFFF')
                          : token('color.background.neutral.subtle', '#FAFBFC'),
                    }}
                  >
                    {/* Left Column: Activity Info */}
                    <div
                      style={{
                        width: '280px',
                        minWidth: '240px',
                        padding: '8px 16px',
                        borderRight: `1px solid ${token('color.border', '#DFE1E6')}`,
                        overflow: 'hidden',
                        boxSizing: 'border-box',
                      }}
                    >
                      <div
                        style={{
                          fontSize: '13px',
                          fontWeight: 600,
                          color: token('color.text', '#172B4D'),
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                        title={act.title}
                      >
                        {act.title}
                      </div>
                      <div
                        style={{
                          fontSize: '11px',
                          color: token('color.text.subtle', '#5E6C84'),
                          marginTop: '2px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        {act.team_name && <span>{act.team_name}</span>}
                        <span>•</span>
                        <span>{position.deadlineDisplay}</span>
                      </div>
                    </div>

                    {/* Right Column: Timeline track & Bar */}
                    <div
                      style={{
                        flex: 1,
                        height: '52px',
                        position: 'relative',
                        display: 'flex',
                        alignItems: 'center',
                      }}
                    >
                      {/* 12 Month vertical guide columns */}
                      <div
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                          display: 'grid',
                          gridTemplateColumns: 'repeat(12, 1fr)',
                          pointerEvents: 'none',
                        }}
                      >
                        {Array.from({ length: 12 }).map((_, mIdx) => (
                          <div
                            key={mIdx}
                            style={{
                              borderRight:
                                mIdx < 11 ? `1px solid ${token('color.border', '#F4F5F7')}` : 'none',
                              backgroundColor:
                                mIdx === 9 && currentDate.getFullYear() === 2026
                                  ? 'rgba(0, 82, 204, 0.03)'
                                  : 'transparent',
                            }}
                          />
                        ))}
                      </div>

                      {/* Today vertical line on the timeline if 2026 */}
                      {currentDate.getFullYear() === 2026 && (
                        <div
                          style={{
                            position: 'absolute',
                            top: 0,
                            bottom: 0,
                            left: `${
                              ((new Date(2026, 9, 8).getTime() - new Date(2026, 0, 1).getTime()) /
                                (new Date(2026, 11, 31, 23, 59, 59).getTime() -
                                  new Date(2026, 0, 1).getTime())) *
                              100
                            }%`,
                            width: '2px',
                            backgroundColor: token('color.border.brand', '#0052CC'),
                            zIndex: 1,
                            pointerEvents: 'none',
                          }}
                        />
                      )}

                      {/* The Color-Coded Activity Gantt Bar */}
                      <div
                        data-testid={`gantt-bar-${act.id}`}
                        style={{
                          position: 'absolute',
                          left: `${position.leftPercent}%`,
                          width: `${position.widthPercent}%`,
                          height: '28px',
                          backgroundColor: color.bg,
                          border: `1px solid ${color.border}`,
                          borderRadius: '14px',
                          color: color.text,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '11px',
                          fontWeight: 600,
                          padding: '0 8px',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          boxShadow: '0 1px 3px rgba(9, 30, 66, 0.25)',
                          cursor: 'pointer',
                          zIndex: 2,
                          boxSizing: 'border-box',
                        }}
                        title={`${act.title} (${getStatusText(act.status)})\n${act.team_name || ''}\nThời gian: ${position.startDateDisplay} - ${position.deadlineDisplay}`}
                      >
                        {getStatusText(act.status)}
                      </div>
                    </div>
                  </div>
                );
              })}
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

import React, { useState, useMemo } from 'react';
import { token } from '@atlaskit/tokens';
import Button from '@atlaskit/button/new';
import Select from '@atlaskit/select';
import Lozenge from '@atlaskit/lozenge';
import InboxIcon from '@atlaskit/icon/core/inbox';
import ChevronLeftIcon from '@atlaskit/icon/core/chevron-left';
import ChevronRightIcon from '@atlaskit/icon/core/chevron-right';
import { useQuery } from '@tanstack/react-query';
import { fetchActivities, fetchTeams, type ActivityItem, type TeamItem } from '../../api';
import { LottieLoading } from '../../../shared/components/LottieLoading';
import { goToActivity } from '../../navigation';
import {
  getActivityStatusMeta,
  getActivityTypeShortLabel,
  participatesInTeam,
} from '../activities/activityLabels';
import {
  formatVnDate,
  todayVnKey,
  toVnDateKey,
  vnDateKeyToLocalDate,
} from '../../../shared/utils/date';

interface CalendarCell {
  day: number;
  isCurrentMonth: boolean;
  isToday?: boolean;
  isoDate: string;
}

const getStatusLozenge = (status?: string) => {
  const meta = getActivityStatusMeta(status);
  return <Lozenge appearance={meta.appearance}>{meta.label}</Lozenge>;
};

const getStatusText = (status?: string): string => getActivityStatusMeta(status).text;

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

interface GanttPosition {
  leftPercent: number;
  widthPercent: number;
  startDateDisplay: string;
  deadlineDisplay: string;
}

const toKey = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const shiftKey = (key: string, days: number): string => {
  const d = vnDateKeyToLocalDate(key);
  d.setDate(d.getDate() + days);
  return toKey(d);
};

/** Vị trí thanh Gantt trong tháng; null nếu hoạt động không giao với tháng đang xem. */
const calculateGanttDayPosition = (
  act: ActivityItem,
  year: number,
  month: number,
  daysInMonth: number
): GanttPosition | null => {
  let startKey = toVnDateKey(act.start_date);
  let endKey = toVnDateKey(act.deadline);
  if (!startKey && !endKey) return null;
  if (!endKey) endKey = shiftKey(startKey, 2);
  if (!startKey) startKey = shiftKey(endKey, -3);
  if (endKey < startKey) endKey = startKey;

  const monthStartKey = toKey(new Date(year, month, 1));
  const monthEndKey = toKey(new Date(year, month, daysInMonth));
  if (endKey < monthStartKey || startKey > monthEndKey) return null;

  const startDay = startKey < monthStartKey ? 1 : vnDateKeyToLocalDate(startKey).getDate();
  const endDay = endKey > monthEndKey ? daysInMonth : vnDateKeyToLocalDate(endKey).getDate();

  const leftPercent = ((startDay - 1) / daysInMonth) * 100;
  const daySpan = endDay - startDay + 1;
  const widthPercent = Math.min(100 - leftPercent, Math.max(3.5, (daySpan / daysInMonth) * 100));

  return {
    leftPercent,
    widthPercent,
    startDateDisplay: formatVnDate(startKey),
    deadlineDisplay: formatVnDate(endKey),
  };
};

export const CalendarView: React.FC = () => {
  const [viewMode, setViewMode] = useState<'month' | 'list' | 'gantt'>('month');
  const [currentDate, setCurrentDate] = useState(() => vnDateKeyToLocalDate(todayVnKey()));
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
    const team = (teams || []).find((t) => String(t.id) === String(selectedTeam));
    return list.filter((act) =>
      team
        ? participatesInTeam(act, team)
        : String(act.team_id) === String(selectedTeam)
    );
  }, [activities, selectedTeam, teams]);

  const todayKey = todayVnKey();

  // Compute month title
  const monthName = `Tháng ${currentDate.getMonth() + 1} năm ${currentDate.getFullYear()}`;

  // Month navigation handlers
  const handlePrev = () => {
    setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNext = () => {
    setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const handleToday = () => {
    setCurrentDate(vnDateKeyToLocalDate(todayVnKey()));
  };

  // Generate calendar grid cells for Month view (Monday-based)
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
      const isoDate = `${cellYear}-${String(cellMonth + 1).padStart(2, '0')}-${String(cellDay).padStart(2, '0')}`;
      const isToday = isoDate === todayKey;

      cells.push({
        day: cellDay,
        isCurrentMonth,
        isToday,
        isoDate,
      });

      cur.setDate(cur.getDate() + 1);
    }

    return cells;
  }, [currentDate, todayKey]);

  // Generate days array for Gantt chart view (Days 1 to daysInMonth of current month)
  const ganttDays = useMemo(() => {
    const y = currentDate.getFullYear();
    const m = currentDate.getMonth();
    const count = new Date(y, m + 1, 0).getDate();
    const dowNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

    const days = [];
    for (let d = 1; d <= count; d++) {
      const dateObj = new Date(y, m, d);
      const dow = dateObj.getDay();
      const isWeekend = dow === 0 || dow === 6;
      const isToday = toKey(dateObj) === todayKey;
      days.push({
        day: d,
        dayOfWeek: dowNames[dow],
        isWeekend,
        isToday,
      });
    }
    return days;
  }, [currentDate, todayKey]);

  // Group activities by date (start_date or deadline)
  const activitiesByDate = useMemo(() => {
    const map = new Map<string, ActivityItem[]>();
    for (const act of filteredActivities) {
      const dates = new Set<string>();
      const startKey = toVnDateKey(act.start_date);
      const deadlineKey = toVnDateKey(act.deadline);
      if (startKey) dates.add(startKey);
      if (deadlineKey) dates.add(deadlineKey);

      for (const d of dates) {
        if (!map.has(d)) map.set(d, []);
        map.get(d)!.push(act);
      }
    }
    return map;
  }, [filteredActivities]);

  const ganttActivities = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    return filteredActivities.flatMap((act) => {
      const position = calculateGanttDayPosition(act, year, month, ganttDays.length);
      return position ? [{ act, position }] : [];
    });
  }, [filteredActivities, currentDate, ganttDays.length]);

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
            aria-label="Tháng trước"
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
            {monthName}
          </span>

          <Button
            appearance="default"
            aria-label="Tháng sau"
            onClick={handleNext}
          >
            <ChevronRightIcon label="" />
          </Button>

          <Button appearance="default" onClick={handleToday}>
            Hôm nay
          </Button>
        </div>

        {/* Right Toolbar: Team Filter & View Switcher */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div className="mobile-w-full" style={{ width: '220px' }}>
            <Select
              defaultValue={{ label: 'Tất cả các Tổ', value: 'all' }}
              options={teamOptions}
              onChange={(opt: any) => setSelectedTeam(opt?.value || 'all')}
              placeholder="Chọn Tổ"
            />
          </div>

          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
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
                  className="calendar-cell-responsive"
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
                          role="button"
                          tabIndex={0}
                          title={act.team_name ? `${act.title} (${act.team_name})` : act.title}
                          data-testid={`activity-pill-${act.id}`}
                          onClick={() => goToActivity(act.id)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              goToActivity(act.id);
                            }
                          }}
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
                            cursor: 'pointer',
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
                onClick={() => goToActivity(act.id)}
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
                  cursor: 'pointer',
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
                      Hạn chót: {formatVnDate(act.deadline)}
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
                    {getActivityTypeShortLabel(act.type)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )
      ) : isActivitiesLoading ? (
        <LottieLoading message="Đang tải biểu đồ Gantt..." size={140} />
      ) : (
        /* Monthly Day-by-Day Gantt Chart View */
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
          {/* Scrollable container for days of the month */}
          <div style={{ overflowX: 'auto', width: '100%' }}>
            <div style={{ minWidth: `${280 + ganttDays.length * 28}px` }}>
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
                  className="gantt-left-col"
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
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  Danh sách hoạt động ({ganttActivities.length})
                </div>

                {/* Day-by-day timeline header */}
                <div
                  style={{
                    flex: 1,
                    display: 'grid',
                    gridTemplateColumns: `repeat(${ganttDays.length}, 1fr)`,
                  }}
                >
                  {ganttDays.map((d, idx) => (
                    <div
                      key={d.day}
                      style={{
                        textAlign: 'center',
                        padding: '6px 0',
                        borderRight:
                          idx < ganttDays.length - 1
                            ? `1px solid ${token('color.border', '#DFE1E6')}`
                            : 'none',
                        backgroundColor: d.isToday
                          ? token('color.background.selected', '#EBF3FF')
                          : d.isWeekend
                          ? token('color.background.neutral.subtle', '#F4F5F7')
                          : 'transparent',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '2px',
                      }}
                    >
                      <span
                        style={{
                          fontSize: '10px',
                          color: d.isToday
                            ? token('color.text.brand', '#0052CC')
                            : token('color.text.subtlest', '#6B778C'),
                          fontWeight: d.isToday ? 700 : 500,
                        }}
                      >
                        {d.dayOfWeek}
                      </span>
                      {d.isToday ? (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '20px',
                            height: '20px',
                            borderRadius: '50%',
                            backgroundColor: token('color.background.brand.bold', '#0052CC'),
                            color: '#FFFFFF',
                            fontSize: '11px',
                            fontWeight: 700,
                          }}
                        >
                          {d.day}
                        </span>
                      ) : (
                        <span
                          style={{
                            fontSize: '12px',
                            fontWeight: 600,
                            color: d.isWeekend
                              ? token('color.text.subtle', '#5E6C84')
                              : token('color.text', '#172B4D'),
                          }}
                        >
                          {d.day}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Gantt Rows */}
              {ganttActivities.length === 0 ? (
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
                  {ganttActivities.map(({ act, position }, idx) => {
                    const color = GANTT_COLORS[idx % GANTT_COLORS.length];

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
                          className="gantt-left-col"
                          style={{
                            width: '280px',
                            minWidth: '240px',
                            padding: '8px 16px',
                            borderRight: `1px solid ${token('color.border', '#DFE1E6')}`,
                            overflow: 'hidden',
                            boxSizing: 'border-box',
                            flexShrink: 0,
                            cursor: 'pointer',
                          }}
                          onClick={() => goToActivity(act.id)}
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
                          {/* Daily vertical guide columns */}
                          <div
                            style={{
                              position: 'absolute',
                              top: 0,
                              left: 0,
                              right: 0,
                              bottom: 0,
                              display: 'grid',
                              gridTemplateColumns: `repeat(${ganttDays.length}, 1fr)`,
                              pointerEvents: 'none',
                            }}
                          >
                            {ganttDays.map((d, dIdx) => (
                              <div
                                key={dIdx}
                                style={{
                                  borderRight:
                                    dIdx < ganttDays.length - 1
                                      ? `1px solid ${token('color.border', '#F4F5F7')}`
                                      : 'none',
                                  backgroundColor: d.isWeekend
                                    ? 'rgba(9, 30, 66, 0.02)'
                                    : d.isToday
                                    ? 'rgba(0, 82, 204, 0.04)'
                                    : 'transparent',
                                }}
                              />
                            ))}
                          </div>

                          {/* Today vertical line on the timeline if October 2026 */}
                          {currentDate.getFullYear() === 2026 && currentDate.getMonth() === 9 && (
                            <div
                              style={{
                                position: 'absolute',
                                top: 0,
                                bottom: 0,
                                left: `${((8 - 1 + 0.5) / ganttDays.length) * 100}%`,
                                width: '2px',
                                backgroundColor: token('color.border.brand', '#0052CC'),
                                zIndex: 1,
                                pointerEvents: 'none',
                              }}
                            />
                          )}

                          {/* The Color-Coded Activity Gantt Bar */}
                          <div
                            role="button"
                            tabIndex={0}
                            data-testid={`gantt-bar-${act.id}`}
                            onClick={() => goToActivity(act.id)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                goToActivity(act.id);
                              }
                            }}
                            style={{
                              position: 'absolute',
                              left: `${position.leftPercent}%`,
                              width: `${position.widthPercent}%`,
                              minWidth: '72px',
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
          </div>
        </div>
      )}

    </div>
  );
};

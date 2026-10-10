import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Badge, Button, Select, type BadgeTone } from '../../../ui';
import { fetchActivities, fetchTeams, type ActivityItem, type TeamItem } from '../../api';
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
import '../people/people.css';
import './calendar.css';

interface CalendarCell {
  day: number;
  isCurrentMonth: boolean;
  isToday?: boolean;
  isoDate: string;
}

type ViewMode = 'month' | 'list' | 'gantt';

const VIEW_MODES: { mode: ViewMode; label: string }[] = [
  { mode: 'month', label: 'Tháng' },
  { mode: 'list', label: 'Danh sách' },
  { mode: 'gantt', label: 'Biểu đồ Gantt' },
];

const TONE: Record<string, BadgeTone> = {
  default: 'neutral',
  moved: 'warning',
  success: 'success',
  inprogress: 'info',
  removed: 'danger',
  new: 'info',
};

const WEEK_DAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
const DOW_NAMES = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
const PILLS_PER_DAY = 2;

const getStatusText = (status?: string): string => getActivityStatusMeta(status).text;

// 16 màu thanh Gantt, tương phản cao. Là dữ liệu hiển thị nên đặt inline.
export const GANTT_COLORS = [
  { bg: '#0052CC', border: '#0747A6', text: '#FFFFFF' },
  { bg: '#00875A', border: '#006644', text: '#FFFFFF' },
  { bg: '#FF5630', border: '#DE350B', text: '#FFFFFF' },
  { bg: '#6554C0', border: '#5243AA', text: '#FFFFFF' },
  { bg: '#00B8D9', border: '#00A3BF', text: '#FFFFFF' },
  { bg: '#FF8B00', border: '#C25E00', text: '#FFFFFF' },
  { bg: '#36B37E', border: '#00875A', text: '#FFFFFF' },
  { bg: '#8777D9', border: '#6554C0', text: '#FFFFFF' },
  { bg: '#EC4899', border: '#DB2777', text: '#FFFFFF' },
  { bg: '#0284C7', border: '#0369A1', text: '#FFFFFF' },
  { bg: '#F59E0B', border: '#D97706', text: '#FFFFFF' },
  { bg: '#10B981', border: '#059669', text: '#FFFFFF' },
  { bg: '#8B5CF6', border: '#7C3AED', text: '#FFFFFF' },
  { bg: '#14B8A6', border: '#0D9488', text: '#FFFFFF' },
  { bg: '#F43F5E', border: '#E11D48', text: '#FFFFFF' },
  { bg: '#6366F1', border: '#4F46E5', text: '#FFFFFF' },
];

interface GanttPosition {
  leftPercent: number;
  widthPercent: number;
  startDateDisplay: string;
  deadlineDisplay: string;
}

interface GanttDay {
  day: number;
  dayOfWeek: string;
  isWeekend: boolean;
  isToday: boolean;
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

const EmptyState: React.FC<{ title: string; text: string }> = ({ title, text }) => (
  <div data-testid="calendar-empty-state" className="cal-empty">
    <div className="cal-empty-title">{title}</div>
    <p className="cal-empty-text">{text}</p>
  </div>
);

const MonthGrid: React.FC<{ cells: CalendarCell[]; byDate: Map<string, ActivityItem[]> }> = ({ cells, byDate }) => (
  <div className="cal-grid">
    <div className="cal-week">
      {WEEK_DAYS.map((d) => (
        <div key={d} className="cal-wd">{d}</div>
      ))}
    </div>
    <div className="cal-cells">
      {cells.map((cell) => {
        const dayActivities = byDate.get(cell.isoDate) || [];
        const cls = ['cal-cell', !cell.isCurrentMonth && 'cal-cell--out', cell.isToday && 'cal-cell--today']
          .filter(Boolean)
          .join(' ');
        return (
          <div key={cell.isoDate} data-testid={`calendar-cell-${cell.isoDate}`} className={cls}>
            <span className="cal-day">{cell.day}</span>
            {dayActivities.length > 0 && (
              <div className="cal-pills">
                {dayActivities.slice(0, PILLS_PER_DAY).map((act) => (
                  <button
                    key={act.id}
                    type="button"
                    className="cal-pill"
                    title={act.team_name ? `${act.title} (${act.team_name})` : act.title}
                    data-testid={`activity-pill-${act.id}`}
                    onClick={() => goToActivity(act.id)}
                    style={act.team_color ? { backgroundColor: `${act.team_color}20`, borderLeftColor: act.team_color } : undefined}
                  >
                    {act.title}
                  </button>
                ))}
                {dayActivities.length > PILLS_PER_DAY && (
                  <span className="cal-more">+{dayActivities.length - PILLS_PER_DAY} hoạt động</span>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  </div>
);

const ActivityList: React.FC<{ activities: ActivityItem[] }> = ({ activities }) => (
  <div className="cal-list">
    {activities.map((act) => {
      const meta = getActivityStatusMeta(act.status);
      const typeLabel = getActivityTypeShortLabel(act.type);
      return (
        <button
          key={act.id}
          type="button"
          className="cal-item"
          data-testid={`list-activity-${act.id}`}
          onClick={() => goToActivity(act.id)}
        >
          <div>
            <h3 className="cal-item-title">{act.title}</h3>
            <div className="cal-item-meta">
              {act.team_name && <Badge tone="info">{act.team_name}</Badge>}
              <Badge tone={TONE[meta.appearance]}>{meta.label}</Badge>
              <span>Hạn chót: {formatVnDate(act.deadline)}</span>
            </div>
          </div>
          {typeLabel && <span className="cal-item-type">{typeLabel}</span>}
        </button>
      );
    })}
  </div>
);

interface GanttItem {
  act: ActivityItem;
  position: GanttPosition;
}

const GanttChart: React.FC<{ days: GanttDay[]; items: GanttItem[]; todayIndex: number }> = ({ days, items, todayIndex }) => {
  const cols = { gridTemplateColumns: `repeat(${days.length}, 1fr)` };
  return (
    <div data-testid="gantt-chart-container" className="cal-gantt">
      <div className="cal-gscroll">
        <div style={{ minWidth: `${280 + days.length * 28}px` }}>
          <div className="cal-ghead">
            <div className="cal-gtitle">Danh sách hoạt động ({items.length})</div>
            <div className="cal-gdays" style={cols}>
              {days.map((d) => (
                <div key={d.day} className={['cal-gd', d.isWeekend && 'cal-gd--we', d.isToday && 'cal-gd--today'].filter(Boolean).join(' ')}>
                  <span>{d.dayOfWeek}</span>
                  <b>{d.day}</b>
                </div>
              ))}
            </div>
          </div>
          {items.length === 0 ? (
            <EmptyState title="Không có hoạt động" text="Không có hoạt động nào trong danh sách." />
          ) : (
            <div className="cal-gbody">
              {items.map(({ act, position }, idx) => {
                const color = GANTT_COLORS[idx % GANTT_COLORS.length];
                return (
                  <div key={act.id} data-testid={`gantt-row-${act.id}`} className="cal-grow">
                    <button type="button" className="cal-glabel" title={act.title} onClick={() => goToActivity(act.id)}>
                      <span className="cal-gname">{act.title}</span>
                      <span className="cal-gsub">
                        {act.team_name ? `${act.team_name} • ` : ''}
                        {position.deadlineDisplay}
                      </span>
                    </button>
                    <div className="cal-gtrack">
                      <div className="cal-gguides" style={cols} aria-hidden="true">
                        {days.map((d) => (
                          <span key={d.day} className={d.isWeekend ? 'cal-gd--we' : undefined} />
                        ))}
                      </div>
                      <button
                        type="button"
                        className="cal-gbar"
                        data-testid={`gantt-bar-${act.id}`}
                        onClick={() => goToActivity(act.id)}
                        style={{
                          left: `${position.leftPercent}%`,
                          width: `${position.widthPercent}%`,
                          backgroundColor: color.bg,
                          borderColor: color.border,
                          color: color.text,
                        }}
                        title={`${act.title} (${getStatusText(act.status)})\n${act.team_name || ''}\nThời gian: ${position.startDateDisplay} - ${position.deadlineDisplay}`}
                      >
                        {getStatusText(act.status)}
                      </button>
                    </div>
                  </div>
                );
              })}
              {todayIndex >= 0 && (
                <div className="cal-gtoday" aria-hidden="true">
                  <div
                    className="cal-gtoday-line"
                    data-testid="gantt-today-line"
                    style={{ left: `${((todayIndex + 0.5) / days.length) * 100}%` }}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const CalendarView: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [currentDate, setCurrentDate] = useState(() => vnDateKeyToLocalDate(todayVnKey()));
  const [selectedTeam, setSelectedTeam] = useState('all');

  const { data: activities, isLoading: isActivitiesLoading, isError } = useQuery({
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
      team ? participatesInTeam(act, team) : String(act.team_id) === String(selectedTeam)
    );
  }, [activities, selectedTeam, teams]);

  const todayKey = todayVnKey();
  const monthName = `Tháng ${currentDate.getMonth() + 1} năm ${currentDate.getFullYear()}`;

  const shiftMonth = (delta: number) =>
    setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));

  // Lưới tháng, bắt đầu từ thứ Hai.
  const calendarCells: CalendarCell[] = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const mondayOffset = (new Date(year, month, 1).getDay() + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const totalCells = mondayOffset + daysInMonth > 35 ? 42 : 35;
    const cur = new Date(year, month, 1 - mondayOffset);

    const cells: CalendarCell[] = [];
    for (let i = 0; i < totalCells; i++) {
      const isoDate = toKey(cur);
      cells.push({ day: cur.getDate(), isCurrentMonth: cur.getMonth() === month, isToday: isoDate === todayKey, isoDate });
      cur.setDate(cur.getDate() + 1);
    }
    return cells;
  }, [currentDate, todayKey]);

  const ganttDays: GanttDay[] = useMemo(() => {
    const y = currentDate.getFullYear();
    const m = currentDate.getMonth();
    const count = new Date(y, m + 1, 0).getDate();
    return Array.from({ length: count }, (_, i) => {
      const dateObj = new Date(y, m, i + 1);
      const dow = dateObj.getDay();
      return { day: i + 1, dayOfWeek: DOW_NAMES[dow], isWeekend: dow === 0 || dow === 6, isToday: toKey(dateObj) === todayKey };
    });
  }, [currentDate, todayKey]);

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

  const ganttItems = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    return filteredActivities.flatMap((act) => {
      const position = calculateGanttDayPosition(act, year, month, ganttDays.length);
      return position ? [{ act, position }] : [];
    });
  }, [filteredActivities, currentDate, ganttDays.length]);

  const todayIndex = ganttDays.findIndex((d) => d.isToday);

  let content: React.ReactNode;
  if (viewMode === 'month') {
    content = <MonthGrid cells={calendarCells} byDate={activitiesByDate} />;
  } else if (isActivitiesLoading) {
    content = (
      <p className="cal-state" role="status">
        {viewMode === 'list' ? 'Đang tải danh sách hoạt động...' : 'Đang tải biểu đồ Gantt...'}
      </p>
    );
  } else if (viewMode === 'list') {
    content =
      filteredActivities.length === 0 ? (
        <EmptyState title="Không có hoạt động" text="Chưa có hoạt động nào được lên lịch cho khoảng thời gian này." />
      ) : (
        <ActivityList activities={filteredActivities} />
      );
  } else {
    content = <GanttChart days={ganttDays} items={ganttItems} todayIndex={todayIndex} />;
  }

  return (
    <div className="cal">
      <div className="ppl-head">
        <div>
          <h1 className="ppl-h1">Lịch chung</h1>
          <p className="ppl-sub">Lịch hoạt động và hạn chót công việc của các Tổ.</p>
        </div>
      </div>

      <div className="cal-bar">
        <div className="cal-nav">
          <Button aria-label="Tháng trước" onClick={() => shiftMonth(-1)}>‹</Button>
          <span className="cal-month">{monthName}</span>
          <Button aria-label="Tháng sau" onClick={() => shiftMonth(1)}>›</Button>
          <Button onClick={() => setCurrentDate(vnDateKeyToLocalDate(todayVnKey()))}>Hôm nay</Button>
        </div>
        <div className="cal-tools">
          <Select aria-label="Lọc theo Tổ" value={selectedTeam} onChange={setSelectedTeam} options={teamOptions} />
          <div className="cal-modes">
            {VIEW_MODES.map(({ mode, label }) => (
              <Button key={mode} aria-pressed={viewMode === mode} onClick={() => setViewMode(mode)}>
                {label}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {isError && <p className="cal-error" role="alert">Không tải được lịch hoạt động.</p>}
      {content}
    </div>
  );
};

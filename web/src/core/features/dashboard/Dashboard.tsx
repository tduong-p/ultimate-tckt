import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CreateActivityModal } from './CreateActivityModal';
import { Button, Badge } from '../../../ui';
import { fetchBootstrap, fetchMyTasksToday } from '../../api';
import type { TaskItem, ActivityItem, ActivityLogItem, BootstrapStats } from '../../api';
import { formatVnDate, toVnDateKey } from '../../../shared/utils/date';
import {
  getTaskPriorityLabel,
  getTaskStatusLabel,
} from '../tasks/taskLabels';
import { TaskCheckButton, TaskTitleButton } from '../tasks/TaskRowControls';

const DashboardIcon = () => (
  <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect width={7} height={9} x={3} y={3} rx={1} /><rect width={7} height={5} x={14} y={3} rx={1} />
    <rect width={7} height={9} x={14} y={12} rx={1} /><rect width={7} height={5} x={3} y={16} rx={1} />
  </svg>
);

const TaskIcon = () => (
  <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 2H2v20h20V12" /><path d="m9 11 3 3L22 4" />
  </svg>
);

const WarningIcon = () => (
  <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" /><line x1={12} x2={12} y1={9} y2={13} /><line x1={12} x2={12.01} y1={17} y2={17} />
  </svg>
);

const CheckCircleIcon = () => (
  <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

const ChevronRightIcon = () => (
  <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

const InboxIcon = () => (
  <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" /><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
  </svg>
);

interface KPICardsProps {
  stats?: BootstrapStats;
}

const KPICards: React.FC<KPICardsProps> = ({ stats }) => {
  const activeActivities = stats?.activeActivities ?? 0;
  const openTasks = stats?.openTasks ?? 0;
  const overdueTasks = stats?.overdueTasks ?? 0;
  const completedMonth = stats?.completedMonth ?? 0;

  const cardStyle: React.CSSProperties = {
    padding: '16px',
    backgroundColor: 'var(--ui-bg-card)',
    borderRadius: 'var(--ui-radius-sm, 4px)',
    border: '1px solid var(--ui-border)',
    boxShadow: 'var(--ui-shadow-sm)',
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
      {/* 1. Hoạt động đang diễn ra */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
          <div style={{ color: 'var(--ui-focus)' }}><DashboardIcon /></div>
          <Badge tone="success">Đang chạy</Badge>
        </div>
        <div style={{ fontSize: '24px', fontWeight: 600, color: 'var(--ui-text)' }}>{activeActivities}</div>
        <div style={{ fontSize: '12px', color: 'var(--ui-text-muted)', marginTop: '4px' }}>Hoạt động đang diễn ra</div>
      </div>
      
      {/* 2. Nhiệm vụ đang mở */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
          <div style={{ color: 'var(--ui-st-active, #d9a000)' }}><TaskIcon /></div>
          <Badge tone="neutral">Cần xử lý</Badge>
        </div>
        <div style={{ fontSize: '24px', fontWeight: 600, color: 'var(--ui-text)' }}>{openTasks}</div>
        <div style={{ fontSize: '12px', color: 'var(--ui-text-muted)', marginTop: '4px' }}>Nhiệm vụ đang mở</div>
      </div>
      
      {/* 3. Nhiệm vụ quá hạn */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
          <div style={{ color: 'var(--ui-danger)' }}><WarningIcon /></div>
          <Badge tone={overdueTasks > 0 ? 'danger' : 'success'}>
            {overdueTasks > 0 ? 'Quá hạn' : 'Đúng tiến độ'}
          </Badge>
        </div>
        <div style={{ fontSize: '24px', fontWeight: 600, color: 'var(--ui-text)' }}>{overdueTasks}</div>
        <div style={{ fontSize: '12px', color: 'var(--ui-text-muted)', marginTop: '4px' }}>Nhiệm vụ quá hạn</div>
      </div>
      
      {/* 4. Hoàn thành tháng này */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
          <div style={{ color: 'var(--ui-st-done, #2f9e5b)' }}><CheckCircleIcon /></div>
          <Badge tone="success">Tháng này</Badge>
        </div>
        <div style={{ fontSize: '24px', fontWeight: 600, color: 'var(--ui-text)' }}>{completedMonth}</div>
        <div style={{ fontSize: '12px', color: 'var(--ui-text-muted)', marginTop: '4px' }}>Hoàn thành tháng này</div>
        <div style={{ fontSize: '11px', color: 'var(--ui-text-muted)', marginTop: '4px' }}>Tính trên các hoạt động bạn xem được</div>
      </div>
    </div>
  );
};

const TaskListPanel: React.FC<{
  tasks: TaskItem[];
  searchQuery: string;
  emptyMessage?: string;
}> = ({ tasks, searchQuery, emptyMessage = 'Không tìm thấy công việc nào' }) => {
  const filtered = searchQuery.trim()
    ? tasks.filter(t => t.title.toLowerCase().includes(searchQuery.toLowerCase().trim()))
    : tasks;

  if (filtered.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 20px', color: 'var(--ui-text-muted)' }}>
        <div style={{ marginBottom: '16px', color: 'var(--ui-text-muted)' }}>
          <InboxIcon />
        </div>
        <p style={{ margin: 0, fontSize: '14px' }}>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {filtered.map(task => (
        <div
          key={task.id}
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '12px',
            backgroundColor: 'var(--ui-bg-subtle, var(--ui-bg-card))',
            borderRadius: 'var(--ui-radius-sm, 4px)',
            border: '1px solid var(--ui-border)',
          }}
        >
          <TaskCheckButton task={task} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '14px', marginBottom: '4px' }}>
              <TaskTitleButton task={task} />
            </div>
            <div style={{ fontSize: '12px', color: 'var(--ui-text-muted)', display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
              <span>{task.activity_title || task.team_name || 'Hoạt động'}</span>
              {task.deadline && <span>• Hạn: {formatVnDate(task.deadline)}</span>}
              {task.assignee_name && <span>• {task.assignee_name}</span>}
            </div>
          </div>
          <div style={{ marginLeft: '12px', display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0 }}>
            {task.priority && (
              <Badge tone="neutral">
                {getTaskPriorityLabel(task.priority)}
              </Badge>
            )}
            <Badge tone="neutral">
              {getTaskStatusLabel(task.status)}
            </Badge>
          </div>
        </div>
      ))}
    </div>
  );
};

interface TaskWidgetProps {
  tasks?: TaskItem[];
  dueToday?: TaskItem[];
  overdue?: TaskItem[];
}

const TaskWidget: React.FC<TaskWidgetProps> = ({ tasks = [], dueToday = [], overdue = [] }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState(0);

  const { allTasks, openTasks } = useMemo(() => {
    const taskMap = new Map<number, TaskItem>();
    tasks.forEach(t => taskMap.set(t.id, t));
    dueToday.forEach(t => taskMap.set(t.id, t));
    overdue.forEach(t => taskMap.set(t.id, t));

    const all = Array.from(taskMap.values());
    const open = all.filter(t => t.status !== 'done' && t.status !== 'cancelled');
    return { allTasks: all, openTasks: open };
  }, [tasks, dueToday, overdue]);
  const todayTasks = dueToday;
  const overdueTasks = overdue;

  const tabList = [
    { id: 'open', label: `Cần làm (${openTasks.length})`, tasks: openTasks },
    { id: 'today', label: `Hôm nay (${todayTasks.length})`, tasks: todayTasks },
    { id: 'overdue', label: `Quá hạn (${overdueTasks.length})`, tasks: overdueTasks },
    { id: 'all', label: `Tất cả (${allTasks.length})`, tasks: allTasks },
  ];

  return (
    <div style={{ flex: '1 1 60%', backgroundColor: 'var(--ui-bg-card)', border: '1px solid var(--ui-border)', borderRadius: 'var(--ui-radius-sm, 4px)', padding: '16px' }}>
      <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--ui-text)', marginTop: 0, marginBottom: '16px' }}>Quản lý nhiệm vụ</h2>
      <div style={{ marginBottom: '16px' }}>
        <input
          type="text"
          placeholder="Lọc theo tên..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--ui-border)', borderRadius: 'var(--ui-radius-sm, 4px)', fontSize: '14px', backgroundColor: 'var(--ui-bg-input, var(--ui-bg-card))', color: 'var(--ui-text)', boxSizing: 'border-box', outline: 'none' }}
        />
      </div>
      <div role="tablist" style={{ display: 'flex', gap: '4px', borderBottom: '1px solid var(--ui-border)', marginBottom: '16px' }}>
        {tabList.map((tab, idx) => (
          <button
            key={tab.id}
            role="tab"
            id={`tab-${tab.id}`}
            aria-controls={`panel-${tab.id}`}
            aria-selected={activeTab === idx}
            type="button"
            onClick={() => setActiveTab(idx)}
            style={{
              padding: '8px 12px',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              borderBottom: activeTab === idx ? '2px solid var(--ui-focus)' : '2px solid transparent',
              color: activeTab === idx ? 'var(--ui-text)' : 'var(--ui-text-muted)',
              fontWeight: activeTab === idx ? 600 : 400,
              fontSize: '14px',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div role="tabpanel" id={`panel-${tabList[activeTab].id}`} aria-labelledby={`tab-${tabList[activeTab].id}`}>
        <TaskListPanel tasks={tabList[activeTab].tasks} searchQuery={searchQuery} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--ui-border)' }}>
        <a href="#my-tasks" style={{ color: 'var(--ui-focus)', textDecoration: 'none', fontSize: '14px' }}>Xem toàn bộ công việc chi tiết &gt;</a>
        <span style={{ fontSize: '14px', color: 'var(--ui-text-muted)' }}>{allTasks.length} nhiệm vụ tổng thể</span>
      </div>
    </div>
  );
};

const formatEventDate = (dateStr?: string | null) => {
  if (!dateStr) return { month: 'THÁNG --', day: '--' };
  try {
    const parts = toVnDateKey(dateStr).split('-');
    if (parts.length >= 3) {
      return { month: `THÁNG ${parseInt(parts[1], 10)}`, day: parts[2] };
    }
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      return { month: `THÁNG ${d.getMonth() + 1}`, day: String(d.getDate()).padStart(2, '0') };
    }
  } catch {
    // fallback below
  }
  return { month: 'THÁNG --', day: '--' };
};

interface UpdatesWidgetsProps {
  upcoming?: ActivityItem[];
  activityLogs?: ActivityLogItem[];
}

const UpdatesWidgets: React.FC<UpdatesWidgetsProps> = ({ upcoming = [], activityLogs = [] }) => {
  const ongoingActivities = upcoming.filter(a => a.status === 'active' || a.status === 'approved').slice(0, 3);
  const upcomingEvents = upcoming.slice(0, 3);
  const recentLogs = activityLogs.slice(0, 7);

  const panelStyle: React.CSSProperties = {
    backgroundColor: 'var(--ui-bg-card)',
    borderRadius: 'var(--ui-radius-sm, 4px)',
    padding: '16px',
    border: '1px solid var(--ui-border)',
    boxShadow: 'var(--ui-shadow-sm)',
  };

  return (
    <div style={{ flex: '0 0 35%', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* 1. Calendar Widget */}
      <div style={panelStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 600, margin: 0, color: 'var(--ui-text)' }}>Lịch sự kiện & Deadline</h2>
          <a href="#calendar" style={{ fontSize: '12px', color: 'var(--ui-focus)', textDecoration: 'none' }}>Lịch đầy đủ &gt;</a>
        </div>
        {upcomingEvents.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {upcomingEvents.map(evt => {
              const { month, day } = formatEventDate(evt.deadline);
              return (
                <div key={evt.id} style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <div style={{ backgroundColor: 'var(--ui-bg-subtle, var(--ui-bg-hover))', borderRadius: '4px', textAlign: 'center', padding: '8px', minWidth: '48px' }}>
                    <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--ui-text-muted)' }}>{month}</div>
                    <div style={{ fontSize: '18px', fontWeight: 600, color: 'var(--ui-text)' }}>{day}</div>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--ui-text)', marginBottom: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {evt.title}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--ui-text-muted)' }}>
                      {evt.team_names || evt.team_name || 'TCKT'}
                    </div>
                  </div>
                  <div style={{ color: 'var(--ui-text-muted)' }}><ChevronRightIcon /></div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 16px', color: 'var(--ui-text-muted)' }}>
            <div style={{ marginBottom: '8px', color: 'var(--ui-text-muted)' }}>
              <InboxIcon />
            </div>
            <p style={{ margin: 0, fontSize: '13px' }}>Không có sự kiện sắp tới</p>
          </div>
        )}
      </div>

      {/* 2. Ongoing Activities Widget */}
      <div style={panelStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 600, margin: 0, color: 'var(--ui-text)' }}>Hoạt động đang diễn ra</h2>
          <a href="#activities" style={{ fontSize: '12px', color: 'var(--ui-focus)', textDecoration: 'none' }}>Tất cả &gt;</a>
        </div>
        {ongoingActivities.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {ongoingActivities.map(a => {
              const taskCount = a.task_count || 0;
              const doneCount = a.done_count || 0;
              const progress = taskCount > 0 ? doneCount / taskCount : 0;
              return (
                <div key={a.id}>
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                    <Badge tone={a.status === 'approved' ? 'success' : 'neutral'}>
                      {a.status === 'approved' ? 'Đã Duyệt' : 'Đang Diễn Ra'}
                    </Badge>
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--ui-text)', marginBottom: '12px' }}>
                    {a.title}
                  </div>
                  <div style={{ marginBottom: '12px' }}>
                    <div
                      role="progressbar"
                      aria-valuenow={Math.round(progress * 100)}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      style={{ width: '100%', height: '6px', background: 'var(--ui-bg-hover)', borderRadius: '3px', overflow: 'hidden' }}
                    >
                      <div style={{ width: `${Math.round(progress * 100)}%`, height: '100%', background: 'var(--ui-st-done, #2f9e5b)' }} />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '16px' }}>
                    <a href={`#board/${a.id}`} style={{ fontSize: '13px', color: 'var(--ui-focus)', textDecoration: 'none' }}>Bảng Kanban</a>
                    <a href={`#activity/${a.id}`} style={{ fontSize: '13px', color: 'var(--ui-focus)', textDecoration: 'none' }}>Chi tiết</a>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 16px', color: 'var(--ui-text-muted)' }}>
            <div style={{ marginBottom: '8px', color: 'var(--ui-text-muted)' }}>
              <InboxIcon />
            </div>
            <p style={{ margin: 0, fontSize: '13px' }}>Chưa có hoạt động đang chạy</p>
          </div>
        )}
      </div>

      {/* 3. Activity Stream Widget */}
      <div style={panelStyle}>
        <h2 style={{ fontSize: '16px', fontWeight: 600, margin: 0, marginBottom: '16px', color: 'var(--ui-text)' }}>Nhật ký hoạt động</h2>
        {recentLogs.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {recentLogs.map((item, idx) => (
              <div key={idx} style={{ display: 'flex', gap: '12px' }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--ui-bg-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: 13, color: 'var(--ui-text)', flexShrink: 0 }}>
                  {(item.user_name || 'T')[0]}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '14px', color: 'var(--ui-text)' }}>
                    <span style={{ fontWeight: 600 }}>{item.user_name}</span>{' '}
                    {item.kind && <Badge tone="neutral">{item.kind}</Badge>}
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--ui-text)', marginTop: '4px' }}>
                    {item.body}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--ui-text-muted)', marginTop: '4px' }}>
                    <a href={`#activity/${item.activity_id}`} style={{ color: 'var(--ui-focus)', textDecoration: 'none' }}>
                      {item.activity_title}
                    </a>
                    {item.created_at && ` • ${item.created_at}`}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 16px', color: 'var(--ui-text-muted)' }}>
            <div style={{ marginBottom: '8px', color: 'var(--ui-text-muted)' }}>
              <InboxIcon />
            </div>
            <p style={{ margin: 0, fontSize: '13px' }}>Chưa có nhật ký hoạt động nào</p>
          </div>
        )}
      </div>
    </div>
  );
};

interface DashboardProps {
  userName?: string;
  onNavigate?: (view: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ userName, onNavigate }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { data: bootstrapData } = useQuery({
    queryKey: ['core-bootstrap'],
    queryFn: fetchBootstrap,
  });

  const { data: myTasksData } = useQuery({
    queryKey: ['core-my-tasks-today'],
    queryFn: fetchMyTasksToday,
  });

  const openTasksCount = bootstrapData?.stats?.openTasks ?? 0;

  return (
    <div style={{ padding: '0', position: 'relative' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 600, color: 'var(--ui-text)' }}>
            Xin chào{userName ? ` ${userName}` : ''}! Có {openTasksCount} nhiệm vụ đang mở trong phạm vi của bạn.
          </h1>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {bootstrapData?.capabilities?.canCreateActivity && (
            <Button variant="primary" onClick={(e) => { e.stopPropagation(); setIsModalOpen(true); }}>
              + Đề xuất hoạt động
            </Button>
          )}
          <Button onClick={() => onNavigate?.('calendar')}>Lịch sự kiện</Button>
          <Button onClick={() => onNavigate?.('activities')}>Hoạt động</Button>
        </div>
      </div>

      <KPICards stats={bootstrapData?.stats} />

      <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start' }}>
        <TaskWidget
          tasks={bootstrapData?.tasks}
          dueToday={myTasksData?.dueToday}
          overdue={myTasksData?.overdue}
        />
        <CreateActivityModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onCreated={(id) => onNavigate?.(`activity/${id}`)}
        />
        <UpdatesWidgets
          upcoming={bootstrapData?.upcoming}
          activityLogs={bootstrapData?.activity}
        />
      </div>
    </div>
  );
};

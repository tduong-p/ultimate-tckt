import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CreateActivityModal } from './CreateActivityModal';
import Button from '@atlaskit/button/new';
import { token } from '@atlaskit/tokens';
import Tabs, { Tab, TabList, TabPanel } from '@atlaskit/tabs';
import Lozenge from '@atlaskit/lozenge';
import DashboardIcon from '@atlaskit/icon/core/dashboard';
import TaskIcon from '@atlaskit/icon/core/task';
import WarningIcon from '@atlaskit/icon/core/warning';
import CheckCircleIcon from '@atlaskit/icon/core/check-circle';
import ChevronRightIcon from '@atlaskit/icon/core/chevron-right';
import InboxIcon from '@atlaskit/icon/core/inbox';
import Avatar from '@atlaskit/avatar';
import ProgressBar from '@atlaskit/progress-bar';
import { fetchBootstrap, fetchMyTasksToday } from '../../api';
import type { TaskItem, ActivityItem, ActivityLogItem, BootstrapStats } from '../../api';
import { formatVnDate, todayVnKey, toVnDateKey } from '../../../shared/utils/date';

interface KPICardsProps {
  stats?: BootstrapStats;
  tasks?: TaskItem[];
}

const KPICards: React.FC<KPICardsProps> = ({ stats, tasks = [] }) => {
  const activeActivities = stats?.activeActivities ?? 0;
  const openTasks = stats?.openTasks ?? 0;
  const overdueTasks = stats?.overdueTasks ?? 0;
  const completedMonth = stats?.completedMonth ?? 0;

  const totalTasks = openTasks + completedMonth;
  const efficiencyPct = totalTasks > 0 ? Math.min(Math.round((completedMonth / totalTasks) * 100), 100) : 100;
  const totalWeights = tasks.reduce((sum, tk) => sum + Number(tk.weight || 1), 0);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
      {/* 1. Hoạt động đang diễn ra */}
      <div style={{ padding: '16px', backgroundColor: token('elevation.surface.raised', '#fff'), borderRadius: '3px', boxShadow: token('elevation.shadow.raised', '0 1px 1px rgba(9, 30, 66, 0.25), 0 0 1px rgba(9, 30, 66, 0.31)') }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
          <div style={{ color: token('color.icon.brand', '#0052CC') }}><DashboardIcon label="" /></div>
          <Lozenge appearance="success">Đang chạy</Lozenge>
        </div>
        <div style={{ fontSize: '24px', fontWeight: 600, color: token('color.text', '#172B4D') }}>{activeActivities}</div>
        <div style={{ fontSize: '12px', color: token('color.text.subtle', '#42526E'), marginTop: '4px' }}>Hoạt động đang diễn ra</div>
      </div>
      
      {/* 2. Nhiệm vụ đang mở */}
      <div style={{ padding: '16px', backgroundColor: token('elevation.surface.raised', '#fff'), borderRadius: '3px', boxShadow: token('elevation.shadow.raised', '0 1px 1px rgba(9, 30, 66, 0.25), 0 0 1px rgba(9, 30, 66, 0.31)') }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
          <div style={{ color: token('color.icon.warning', '#FF991F') }}><TaskIcon label="" /></div>
          <Lozenge appearance="inprogress">Cần xử lý</Lozenge>
        </div>
        <div style={{ fontSize: '24px', fontWeight: 600, color: token('color.text', '#172B4D') }}>{openTasks}</div>
        <div style={{ fontSize: '12px', color: token('color.text.subtle', '#42526E'), marginTop: '4px' }}>Nhiệm vụ đang mở</div>
      </div>
      
      {/* 3. Nhiệm vụ quá hạn */}
      <div style={{ padding: '16px', backgroundColor: token('elevation.surface.raised', '#fff'), borderRadius: '3px', boxShadow: token('elevation.shadow.raised', '0 1px 1px rgba(9, 30, 66, 0.25), 0 0 1px rgba(9, 30, 66, 0.31)') }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
          <div style={{ color: token('color.icon.danger', '#DE350B') }}><WarningIcon label="" /></div>
          <Lozenge appearance={overdueTasks > 0 ? 'removed' : 'success'}>
            {overdueTasks > 0 ? 'Quá hạn' : 'Đúng tiến độ'}
          </Lozenge>
        </div>
        <div style={{ fontSize: '24px', fontWeight: 600, color: token('color.text', '#172B4D') }}>{overdueTasks}</div>
        <div style={{ fontSize: '12px', color: token('color.text.subtle', '#42526E'), marginTop: '4px' }}>Nhiệm vụ quá hạn</div>
      </div>
      
      {/* 4. Hiệu suất hoàn thành */}
      <div style={{ padding: '16px', backgroundColor: token('elevation.surface.raised', '#fff'), borderRadius: '3px', boxShadow: token('elevation.shadow.raised', '0 1px 1px rgba(9, 30, 66, 0.25), 0 0 1px rgba(9, 30, 66, 0.31)') }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
          <div style={{ color: token('color.icon.success', '#36B37E') }}><CheckCircleIcon label="" /></div>
          <Lozenge appearance="success">{totalWeights}đ</Lozenge>
        </div>
        <div style={{ fontSize: '24px', fontWeight: 600, color: token('color.text', '#172B4D') }}>{efficiencyPct}%</div>
        <div style={{ fontSize: '12px', color: token('color.text.subtle', '#42526E'), marginTop: '4px' }}>Hiệu suất hoàn thành</div>
        <div style={{ marginTop: '8px', height: '4px', backgroundColor: token('color.background.neutral', '#DFE1E6'), borderRadius: '2px', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${efficiencyPct}%`, backgroundColor: token('color.background.success.bold', '#00875A') }}></div>
        </div>
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
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 20px', color: token('color.text.subtle', '#42526E') }}>
        <div style={{ marginBottom: '16px', color: token('color.icon.subtle', '#8993A4') }}>
          <InboxIcon label="" />
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
            backgroundColor: token('elevation.surface.sunken', '#FAFBFC'),
            borderRadius: '3px',
            border: `1px solid ${token('color.border', '#EBECF0')}`,
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '14px', fontWeight: 500, color: token('color.text', '#172B4D'), marginBottom: '4px' }}>
              {task.title}
            </div>
            <div style={{ fontSize: '12px', color: token('color.text.subtle', '#42526E'), display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
              <span>{task.activity_title || task.team_name || 'Hoạt động'}</span>
              {task.deadline && <span>• Hạn: {formatVnDate(task.deadline)}</span>}
              {task.assignee_name && <span>• {task.assignee_name}</span>}
            </div>
          </div>
          <div style={{ marginLeft: '12px', display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0 }}>
            {task.priority && (
              <Lozenge appearance={task.priority === 'urgent' || task.priority === 'high' ? 'removed' : 'default'}>
                {task.priority}
              </Lozenge>
            )}
            <Lozenge appearance={task.status === 'done' ? 'success' : task.status === 'in_progress' ? 'inprogress' : 'default'}>
              {task.status}
            </Lozenge>
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

  const { allTasks, openTasks, todayTasks, overdueTasks, doneTasks } = useMemo(() => {
    const taskMap = new Map<number, TaskItem>();
    tasks.forEach(t => taskMap.set(t.id, t));
    dueToday.forEach(t => taskMap.set(t.id, t));
    overdue.forEach(t => taskMap.set(t.id, t));

    const all = Array.from(taskMap.values());
    const open = all.filter(t => t.status !== 'done' && t.status !== 'cancelled');
    const done = all.filter(t => t.status === 'done');

    const today = dueToday.length > 0
      ? dueToday
      : all.filter(t => {
          if (!t.deadline) return false;
          return toVnDateKey(t.deadline) === todayVnKey();
        });

    const ovd = overdue.length > 0
      ? overdue
      : all.filter(t => {
          if (!t.deadline || t.status === 'done' || t.status === 'cancelled') return false;
          return toVnDateKey(t.deadline) < todayVnKey();
        });

    return {
      allTasks: all,
      openTasks: open,
      todayTasks: today,
      overdueTasks: ovd,
      doneTasks: done,
    };
  }, [tasks, dueToday, overdue]);

  return (
    <div style={{ flex: '1 1 60%', backgroundColor: token('elevation.surface', '#fff'), border: `1px solid ${token('color.border', '#DFE1E6')}`, borderRadius: '3px', padding: '16px' }}>
      <h2 style={{ fontSize: '18px', fontWeight: 600, color: token('color.text', '#172B4D'), marginTop: 0, marginBottom: '16px' }}>Quản lý nhiệm vụ</h2>
      <div style={{ marginBottom: '16px' }}>
        <input
          type="text"
          placeholder="Lọc theo tên..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ width: '100%', padding: '8px 6px', border: `2px solid ${token('color.border', '#DFE1E6')}`, borderRadius: '3px', fontSize: '14px', backgroundColor: token('elevation.surface', '#FAFBFC'), color: token('color.text', '#172B4D') }}
        />
      </div>
      <Tabs id="task-tabs">
        <TabList>
          <Tab>Cần làm ({openTasks.length})</Tab>
          <Tab>Hôm nay ({todayTasks.length})</Tab>
          <Tab>Quá hạn ({overdueTasks.length})</Tab>
          <Tab>Đã xong ({doneTasks.length})</Tab>
          <Tab>Tất cả ({allTasks.length})</Tab>
        </TabList>
        <TabPanel>
          <TaskListPanel tasks={openTasks} searchQuery={searchQuery} />
        </TabPanel>
        <TabPanel>
          <TaskListPanel tasks={todayTasks} searchQuery={searchQuery} />
        </TabPanel>
        <TabPanel>
          <TaskListPanel tasks={overdueTasks} searchQuery={searchQuery} />
        </TabPanel>
        <TabPanel>
          <TaskListPanel tasks={doneTasks} searchQuery={searchQuery} />
        </TabPanel>
        <TabPanel>
          <TaskListPanel tasks={allTasks} searchQuery={searchQuery} />
        </TabPanel>
      </Tabs>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '16px', paddingTop: '16px', borderTop: `1px solid ${token('color.border', '#DFE1E6')}` }}>
        <a href="#my-tasks" style={{ color: token('color.link', '#0052CC'), textDecoration: 'none', fontSize: '14px' }}>Xem toàn bộ công việc chi tiết &gt;</a>
        <span style={{ fontSize: '14px', color: token('color.text.subtle', '#42526E') }}>{allTasks.length} nhiệm vụ tổng thể</span>
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

  return (
    <div style={{ flex: '0 0 35%', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* 1. Calendar Widget */}
      <div style={{ backgroundColor: token('elevation.surface.raised', '#fff'), borderRadius: '3px', padding: '16px', boxShadow: token('elevation.shadow.raised', '0 1px 1px rgba(9, 30, 66, 0.25), 0 0 1px rgba(9, 30, 66, 0.31)') }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 600, margin: 0, color: token('color.text', '#172B4D') }}>Lịch sự kiện & Deadline</h2>
          <a href="#calendar" style={{ fontSize: '12px', color: token('color.link', '#0052CC'), textDecoration: 'none' }}>Lịch đầy đủ &gt;</a>
        </div>
        {upcomingEvents.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {upcomingEvents.map(evt => {
              const { month, day } = formatEventDate(evt.deadline);
              return (
                <div key={evt.id} style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <div style={{ backgroundColor: token('color.background.neutral', '#DFE1E6'), borderRadius: '4px', textAlign: 'center', padding: '8px', minWidth: '48px' }}>
                    <div style={{ fontSize: '10px', fontWeight: 600, color: token('color.text.subtle', '#42526E') }}>{month}</div>
                    <div style={{ fontSize: '18px', fontWeight: 600, color: token('color.text', '#172B4D') }}>{day}</div>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '14px', fontWeight: 500, color: token('color.text', '#172B4D'), marginBottom: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {evt.title}
                    </div>
                    <div style={{ fontSize: '12px', color: token('color.text.subtle', '#42526E') }}>
                      {evt.team_names || evt.team_name || 'TCKT'}
                    </div>
                  </div>
                  <div style={{ color: token('color.icon', '#42526E') }}><ChevronRightIcon label="Go" /></div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 16px', color: token('color.text.subtle', '#42526E') }}>
            <div style={{ marginBottom: '8px', color: token('color.icon.subtle', '#8993A4') }}>
              <InboxIcon label="" size="medium" />
            </div>
            <p style={{ margin: 0, fontSize: '13px' }}>Không có sự kiện sắp tới</p>
          </div>
        )}
      </div>

      {/* 2. Ongoing Activities Widget */}
      <div style={{ backgroundColor: token('elevation.surface.raised', '#fff'), borderRadius: '3px', padding: '16px', boxShadow: token('elevation.shadow.raised', '0 1px 1px rgba(9, 30, 66, 0.25), 0 0 1px rgba(9, 30, 66, 0.31)') }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 600, margin: 0, color: token('color.text', '#172B4D') }}>Hoạt động đang diễn ra</h2>
          <a href="#activities" style={{ fontSize: '12px', color: token('color.link', '#0052CC'), textDecoration: 'none' }}>Tất cả &gt;</a>
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
                    <Lozenge appearance={a.status === 'approved' ? 'success' : 'inprogress'}>
                      {a.status === 'approved' ? 'Đã Duyệt' : 'Đang Diễn Ra'}
                    </Lozenge>
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: 500, color: token('color.text', '#172B4D'), marginBottom: '12px' }}>
                    {a.title}
                  </div>
                  <div style={{ marginBottom: '12px' }}>
                    <ProgressBar value={progress} appearance="default" />
                  </div>
                  <div style={{ display: 'flex', gap: '16px' }}>
                    <a href={`#board/${a.id}`} style={{ fontSize: '13px', color: token('color.link', '#0052CC'), textDecoration: 'none' }}>Bảng Kanban</a>
                    <a href={`#activity/${a.id}`} style={{ fontSize: '13px', color: token('color.link', '#0052CC'), textDecoration: 'none' }}>Chi tiết</a>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 16px', color: token('color.text.subtle', '#42526E') }}>
            <div style={{ marginBottom: '8px', color: token('color.icon.subtle', '#8993A4') }}>
              <InboxIcon label="" size="medium" />
            </div>
            <p style={{ margin: 0, fontSize: '13px' }}>Chưa có hoạt động đang chạy</p>
          </div>
        )}
      </div>

      {/* 3. Activity Stream Widget */}
      <div style={{ backgroundColor: token('elevation.surface.raised', '#fff'), borderRadius: '3px', padding: '16px', boxShadow: token('elevation.shadow.raised', '0 1px 1px rgba(9, 30, 66, 0.25), 0 0 1px rgba(9, 30, 66, 0.31)') }}>
        <h2 style={{ fontSize: '16px', fontWeight: 600, margin: 0, marginBottom: '16px', color: token('color.text', '#172B4D') }}>Nhật ký hoạt động</h2>
        {recentLogs.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {recentLogs.map((item, idx) => (
              <div key={idx} style={{ display: 'flex', gap: '12px' }}>
                <Avatar size="medium" name={item.user_name || 'Thành viên'} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '14px', color: token('color.text', '#172B4D') }}>
                    <span style={{ fontWeight: 600 }}>{item.user_name}</span>{' '}
                    {item.kind && <Lozenge appearance="inprogress">{item.kind}</Lozenge>}
                  </div>
                  <div style={{ fontSize: '13px', color: token('color.text', '#172B4D'), marginTop: '4px' }}>
                    {item.body}
                  </div>
                  <div style={{ fontSize: '12px', color: token('color.text.subtle', '#42526E'), marginTop: '4px' }}>
                    <a href={`#activity/${item.activity_id}`} style={{ color: token('color.link', '#0052CC'), textDecoration: 'none' }}>
                      {item.activity_title}
                    </a>
                    {item.created_at && ` • ${item.created_at}`}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 16px', color: token('color.text.subtle', '#42526E') }}>
            <div style={{ marginBottom: '8px', color: token('color.icon.subtle', '#8993A4') }}>
              <InboxIcon label="" size="medium" />
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
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 600, color: token('color.text', '#172B4D') }}>
            Xin chào{userName ? ` ${userName}` : ''}! Bạn có {openTasksCount} nhiệm vụ cần làm.
          </h1>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button appearance="primary" onClick={(e) => { e.stopPropagation(); setIsModalOpen(true); }}>
            + Đề xuất hoạt động
          </Button>
          <Button appearance="default" onClick={() => onNavigate?.('calendar')}>Lịch sự kiện</Button>
          <Button appearance="default" onClick={() => onNavigate?.('activities')}>Hoạt động</Button>
        </div>
      </div>

      <KPICards stats={bootstrapData?.stats} tasks={bootstrapData?.tasks} />

      <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start' }}>
        <TaskWidget
          tasks={bootstrapData?.tasks}
          dueToday={myTasksData?.dueToday}
          overdue={myTasksData?.overdue}
        />
        <CreateActivityModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
        <UpdatesWidgets
          upcoming={bootstrapData?.upcoming}
          activityLogs={bootstrapData?.activity}
        />
      </div>
    </div>
  );
};

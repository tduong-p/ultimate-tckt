import React, { useState, useMemo } from 'react';
import { useQuery, QueryClient, QueryClientProvider, QueryClientContext } from '@tanstack/react-query';
import Spinner from '@atlaskit/spinner';
import Lozenge from '@atlaskit/lozenge';
import Avatar from '@atlaskit/avatar';
import Tabs, { Tab, TabList, TabPanel } from '@atlaskit/tabs';
import Button from '@atlaskit/button/new';
import { token } from '@atlaskit/tokens';

import StarStarredIcon from '@atlaskit/icon/core/star-starred';
import CrossIcon from '@atlaskit/icon/core/cross';
import InboxIcon from '@atlaskit/icon/core/inbox';

import { fetchMyTasksToday, TaskItem } from '../../api';

const getStatusAppearance = (status: string) => {
  switch (status?.toLowerCase()) {
    case 'chờ duyệt':
    case 'review':
      return 'moved';
    case 'quá hạn':
    case 'cancelled':
    case 'hủy':
      return 'removed';
    case 'đang làm':
    case 'in_progress':
      return 'inprogress';
    case 'đã nhận':
    case 'đã xong':
    case 'done':
      return 'success';
    case 'cần làm':
    case 'todo':
      return 'default';
    default:
      return 'default';
  }
};

const getStatusLabel = (status: string) => {
  switch (status?.toLowerCase()) {
    case 'todo': return 'CẦN LÀM';
    case 'in_progress': return 'ĐANG LÀM';
    case 'review': return 'CHỜ DUYỆT';
    case 'done': return 'ĐÃ XONG';
    case 'cancelled': return 'ĐÃ HỦY';
    default: return status?.toUpperCase() || 'MỚI';
  }
};

const PriorityDot: React.FC<{ priority?: string | number }> = ({ priority }) => {
  const p = String(priority).toLowerCase();
  let bgColor: string = token('color.background.brand.bold', '#0052CC');
  let label = '3';
  if (p === 'urgent' || p === '1' || p === 'khẩn cấp') {
    bgColor = token('color.background.danger.bold', '#DE350B');
    label = '1';
  } else if (p === 'high' || p === 'cao' || p === '2') {
    bgColor = token('color.background.warning.bold', '#FF991F');
    label = '2';
  } else {
    bgColor = token('color.background.brand.bold', '#0052CC');
    label = '3';
  }
  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '16px',
      height: '16px',
      borderRadius: '2px',
      backgroundColor: bgColor,
      color: token('color.text.inverse', '#fff'),
      fontSize: '10px',
      fontWeight: 'bold',
      flexShrink: 0,
      marginRight: '8px'
    }}>
      {label}
    </div>
  );
};

const MyTasksContent: React.FC = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['my-tasks-today'],
    queryFn: fetchMyTasksToday,
  });

  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const dueTodayRaw = useMemo(() => data?.dueToday || [], [data]);
  const overdueRaw = useMemo(() => data?.overdue || [], [data]);
  const pendingMyReviewRaw = useMemo(() => data?.pendingMyReview || [], [data]);

  const filterFn = (task: TaskItem) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      task.title.toLowerCase().includes(q) ||
      (task.activity_title && task.activity_title.toLowerCase().includes(q)) ||
      (task.team_name && task.team_name.toLowerCase().includes(q))
    );
  };

  const dueToday = useMemo(() => dueTodayRaw.filter(filterFn), [dueTodayRaw, searchQuery]);
  const overdue = useMemo(() => overdueRaw.filter(filterFn), [overdueRaw, searchQuery]);
  const pendingMyReview = useMemo(() => pendingMyReviewRaw.filter(filterFn), [pendingMyReviewRaw, searchQuery]);

  const totalTasks = dueTodayRaw.length + overdueRaw.length + pendingMyReviewRaw.length;

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
        <Spinner size="large" />
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ color: token('color.text.danger', '#DE350B'), padding: '16px' }}>
        Lỗi tải dữ liệu
      </div>
    );
  }

  const handleCreateTask = () => alert("Mở modal Tạo công việc");

  const renderTaskTable = (tasks: TaskItem[], emptyLabel: string) => {
    if (tasks.length === 0) {
      return (
        <div style={{
          backgroundColor: token('color.background.neutral.subtle', '#F4F5F7'),
          borderRadius: '4px',
          padding: '16px 20px',
          border: `1px solid ${token('color.border', '#DFE1E6')}`,
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <div style={{ color: token('color.icon.subtle', '#6B778C'), display: 'flex' }}>
            <InboxIcon label="" size="small" />
          </div>
          <span style={{ fontSize: '13px', color: token('color.text.subtle', '#5E6C84') }}>
            {emptyLabel}
          </span>
        </div>
      );
    }

    return (
      <div style={{ border: `1px solid ${token('color.border', '#DFE1E6')}`, borderRadius: '2px', backgroundColor: token('elevation.surface', '#fff') }}>
        {tasks.map(task => (
          <div
            key={task.id}
            data-testid={`task-row-${task.id}`}
            className={`task-row ${selectedTask?.id === task.id ? 'task-row-selected' : ''}`}
            onClick={() => setSelectedTask(task)}
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '10px 16px',
              borderBottom: `1px solid ${token('color.border', '#DFE1E6')}`,
              fontSize: '14px',
              color: token('color.text', '#172B4D'),
              cursor: 'pointer'
            }}
          >
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', fontWeight: 500, minWidth: '200px' }}>
              <PriorityDot priority={task.priority} />
              <span>{task.title}</span>
            </div>
            <div style={{ width: '120px', flexShrink: 0 }}>
              <Lozenge appearance={getStatusAppearance(task.status)}>
                {getStatusLabel(task.status)}
              </Lozenge>
            </div>
            <div style={{ width: '80px', display: 'flex', justifyContent: 'center', flexShrink: 0 }}>
              <Avatar size="small" appearance="circle" name={task.assignee_name || 'Đoàn viên'} />
            </div>
            <div style={{ width: '100px', textAlign: 'right', fontSize: '12px', color: token('color.text.subtle', '#42526E'), flexShrink: 0 }}>
              {task.deadline ? task.deadline.slice(0, 10) : '—'}
            </div>
          </div>
        ))}
        <div onClick={handleCreateTask} className="task-row" style={{ padding: '10px 16px', fontSize: '14px', color: token('color.text.subtle', '#42526E'), cursor: 'pointer' }}>
          + Tạo công việc
        </div>
      </div>
    );
  };

  return (
    <div style={{ padding: '0', position: 'relative' }}>
      <div className="mobile-col" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '2px', backgroundColor: token('color.background.brand.bold', '#0052CC'), display: 'flex', alignItems: 'center', justifyContent: 'center', color: token('color.text.inverse', '#fff'), fontSize: '20px', fontWeight: 'bold', flexShrink: 0 }}>
              N
            </div>
            <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 600, color: token('color.text', '#172B4D'), lineHeight: 1.2, display: 'flex', alignItems: 'center', gap: '8px' }}>
              Nhiệm vụ của tôi
              <div style={{ color: token('color.icon.warning', '#FF991F'), display: 'flex', marginTop: '2px', cursor: 'pointer' }} title="Project yêu thích">
                <StarStarredIcon label="Favorite" />
              </div>
            </h1>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '12px', marginTop: '12px', fontSize: '13px', color: token('color.text.subtle', '#42526E') }}>
            <span><strong style={{ color: token('color.text', '#172B4D') }}>{totalTasks}</strong> việc cần xử lý</span>
            <span style={{ color: token('color.text.subtlest', '#C1C7D0') }}>•</span>
            <span><strong style={{ color: token('color.text.danger', '#DE350B') }}>{overdueRaw.length}</strong> quá hạn</span>
            <span style={{ color: token('color.text.subtlest', '#C1C7D0') }}>•</span>
            <span><strong style={{ color: token('color.text', '#172B4D') }}>{dueTodayRaw.length}</strong> đến hạn hôm nay</span>
            <span style={{ color: token('color.text.subtlest', '#C1C7D0') }}>•</span>
            <span><strong style={{ color: token('color.text.success', '#006644') }}>{pendingMyReviewRaw.length}</strong> chờ duyệt</span>
          </div>
        </div>
      </div>

      <div className="mobile-col" style={{ display: 'flex', flexDirection: 'row', gap: '32px' }}>
        {/* LEFT CONTENT (Main List) */}
        <div style={{ flex: selectedTask ? '1 1 50%' : '1 1 100%', minWidth: 0, transition: 'all 0.3s ease' }}>
          <Tabs id="project-tabs" defaultSelected={2}>
            <TabList>
              <Tab>Dòng thời gian</Tab>
              <Tab>Kế hoạch</Tab>
              <Tab>Danh sách</Tab>
              <Tab>Bảng</Tab>
              <Tab>Thành viên</Tab>
            </TabList>
            <TabPanel><div style={{ padding: '16px', color: token('color.text', '#172B4D') }}>Chưa có dữ liệu Dòng thời gian</div></TabPanel>
            <TabPanel><div style={{ padding: '16px', color: token('color.text', '#172B4D') }}>Chưa có dữ liệu Kế hoạch</div></TabPanel>
            <TabPanel>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', paddingTop: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <div style={{ position: 'relative' }}>
                      <input
                        type="text"
                        placeholder="Tìm kiếm..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{
                          padding: '6px 12px',
                          border: `2px solid ${token('color.border', '#DFE1E6')}`,
                          borderRadius: '2px',
                          fontSize: '14px',
                          width: '200px',
                          backgroundColor: token('color.background.input', '#FAFBFC'),
                          color: token('color.text', '#172B4D'),
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <Button appearance="subtle">Bộ lọc: Tất cả</Button>
                      <Button appearance="subtle">Người thực hiện</Button>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <Button appearance="subtle">Tùy chọn hiển thị</Button>
                  </div>
                </div>

                {totalTasks === 0 ? (
                  <div style={{
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
                  }}>
                    <div style={{ color: token('color.icon.subtle', '#6B778C') }}>
                      <InboxIcon label="" size="medium" />
                    </div>
                    <div style={{ fontSize: '16px', fontWeight: 600, color: token('color.text', '#172B4D') }}>
                      Không có công việc nào cần xử lý
                    </div>
                    <p style={{ margin: 0, fontSize: '14px', color: token('color.text.subtle', '#5E6C84') }}>
                      Bạn đã hoàn thành tất cả nhiệm vụ hoặc chưa có công việc mới được giao.
                    </p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    {/* Quá hạn */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '8px', color: token('color.text', '#172B4D') }}>
                        Quá hạn <span style={{ color: token('color.text.danger', '#DE350B') }}>{overdue.length}</span>
                      </div>
                      <div style={{ overflowX: 'auto' }}>
                        <div style={{ minWidth: '600px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', padding: '8px 16px', borderBottom: `1px solid ${token('color.border', '#DFE1E6')}`, fontSize: '12px', color: token('color.text.subtlest', '#6B778C'), fontWeight: 600 }}>
                            <div style={{ flex: 1, minWidth: '200px' }}>Công việc</div>
                            <div style={{ width: '120px', flexShrink: 0 }}>Trạng thái</div>
                            <div style={{ width: '80px', flexShrink: 0, textAlign: 'center' }}>Nhân sự</div>
                            <div style={{ width: '100px', textAlign: 'right', flexShrink: 0 }}>Hạn</div>
                          </div>
                          {renderTaskTable(overdue, 'Không có việc quá hạn')}
                        </div>
                      </div>
                    </div>

                    {/* Đến hạn hôm nay */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '8px', color: token('color.text', '#172B4D') }}>
                        Đến hạn hôm nay <span style={{ color: token('color.text.subtle', '#42526E') }}>{dueToday.length}</span>
                      </div>
                      <div style={{ overflowX: 'auto' }}>
                        <div style={{ minWidth: '600px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', padding: '8px 16px', borderBottom: `1px solid ${token('color.border', '#DFE1E6')}`, fontSize: '12px', color: token('color.text.subtlest', '#6B778C'), fontWeight: 600 }}>
                            <div style={{ flex: 1, minWidth: '200px' }}>Công việc</div>
                            <div style={{ width: '120px', flexShrink: 0 }}>Trạng thái</div>
                            <div style={{ width: '80px', flexShrink: 0, textAlign: 'center' }}>Nhân sự</div>
                            <div style={{ width: '100px', textAlign: 'right', flexShrink: 0 }}>Hạn</div>
                          </div>
                          {renderTaskTable(dueToday, 'Không có việc đến hạn hôm nay')}
                        </div>
                      </div>
                    </div>

                    {/* Chờ duyệt */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '8px', color: token('color.text', '#172B4D') }}>
                        Chờ duyệt <span style={{ color: token('color.text.subtle', '#42526E') }}>{pendingMyReview.length}</span>
                      </div>
                      <div style={{ overflowX: 'auto' }}>
                        <div style={{ minWidth: '600px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', padding: '8px 16px', borderBottom: `1px solid ${token('color.border', '#DFE1E6')}`, fontSize: '12px', color: token('color.text.subtlest', '#6B778C'), fontWeight: 600 }}>
                            <div style={{ flex: 1, minWidth: '200px' }}>Công việc</div>
                            <div style={{ width: '120px', flexShrink: 0 }}>Trạng thái</div>
                            <div style={{ width: '80px', flexShrink: 0, textAlign: 'center' }}>Nhân sự</div>
                            <div style={{ width: '100px', textAlign: 'right', flexShrink: 0 }}>Hạn</div>
                          </div>
                          {renderTaskTable(pendingMyReview, 'Không có việc chờ duyệt')}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </TabPanel>
            <TabPanel><div style={{ padding: '16px', color: token('color.text', '#172B4D') }}>Chưa có dữ liệu Bảng</div></TabPanel>
            <TabPanel><div style={{ padding: '16px', color: token('color.text', '#172B4D') }}>Chưa có dữ liệu Thành viên</div></TabPanel>
          </Tabs>
        </div>

        {/* RIGHT SIDEBAR (Task Details Split Pane) */}
        {selectedTask && (
          <div className="mobile-w-full" style={{ flex: '0 0 50%', maxWidth: '500px', border: `1px solid ${token('color.border', '#DFE1E6')}`, borderRadius: '2px', backgroundColor: token('elevation.surface', '#fff'), display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '16px', borderBottom: `1px solid ${token('color.border', '#DFE1E6')}`, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: '12px', color: token('color.text.subtlest', '#6B778C'), marginBottom: '4px' }}>CV-{selectedTask.id}</div>
                <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 600, color: token('color.text', '#172B4D'), display: 'flex', alignItems: 'center' }}>
                  <PriorityDot priority={selectedTask.priority} /> {selectedTask.title}
                </h2>
              </div>
              <div style={{ cursor: 'pointer', padding: '4px', color: token('color.icon.subtle', '#6B778C') }} onClick={() => setSelectedTask(null)} title="Đóng">
                <CrossIcon label="Đóng" />
              </div>
            </div>
            <div style={{ padding: '16px', flex: 1, overflowY: 'auto' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                  <div style={{ width: '120px', color: token('color.text.subtle', '#42526E'), fontSize: '14px' }}>Hoạt động:</div>
                  <div style={{ fontSize: '14px', color: token('color.text', '#172B4D'), fontWeight: 500 }}>{selectedTask.activity_title || 'Chung'}</div>
                </div>
                {selectedTask.team_name && (
                  <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                    <div style={{ width: '120px', color: token('color.text.subtle', '#42526E'), fontSize: '14px' }}>Tổ phụ trách:</div>
                    <div style={{ fontSize: '14px', color: token('color.text', '#172B4D'), fontWeight: 500 }}>{selectedTask.team_name}</div>
                  </div>
                )}
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                  <div style={{ width: '120px', color: token('color.text.subtle', '#42526E'), fontSize: '14px' }}>Trạng thái:</div>
                  <div>
                    <Lozenge appearance={getStatusAppearance(selectedTask.status)}>
                      {getStatusLabel(selectedTask.status)}
                    </Lozenge>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                  <div style={{ width: '120px', color: token('color.text.subtle', '#42526E'), fontSize: '14px' }}>Người thực hiện:</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Avatar size="small" appearance="circle" name={selectedTask.assignee_name || 'Đoàn viên'} />
                    <span style={{ fontSize: '14px', color: token('color.text', '#172B4D') }}>{selectedTask.assignee_name || 'Chưa phân công'}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                  <div style={{ width: '120px', color: token('color.text.subtle', '#42526E'), fontSize: '14px' }}>Hạn chót:</div>
                  <div style={{ fontSize: '14px', color: token('color.text', '#172B4D') }}>{selectedTask.deadline || '—'}</div>
                </div>
                <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: `1px solid ${token('color.border', '#DFE1E6')}` }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 600, color: token('color.text', '#172B4D'), marginBottom: '8px' }}>Mô tả</h3>
                  <p style={{ fontSize: '14px', color: token('color.text', '#172B4D'), lineHeight: 1.5 }}>
                    {selectedTask.description || 'Chưa có nội dung mô tả chi tiết cho công việc này.'}
                  </p>
                </div>
              </div>
            </div>
            <div style={{ padding: '16px', borderTop: `1px solid ${token('color.border', '#DFE1E6')}`, display: 'flex', justifyContent: 'flex-end', gap: '8px', backgroundColor: token('color.background.neutral.subtle', '#FAFBFC') }}>
              <Button appearance="subtle" onClick={() => setSelectedTask(null)}>Đóng</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const defaultMyTasksQueryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

export const MyTasks: React.FC = () => {
  const queryClient = React.useContext(QueryClientContext);

  if (!queryClient) {
    return (
      <QueryClientProvider client={defaultMyTasksQueryClient}>
        <MyTasksContent />
      </QueryClientProvider>
    );
  }

  return <MyTasksContent />;
};
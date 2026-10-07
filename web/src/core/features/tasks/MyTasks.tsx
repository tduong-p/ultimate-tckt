import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Spinner from '@atlaskit/spinner';
import Lozenge from '@atlaskit/lozenge';
import Avatar from '@atlaskit/avatar';
import Tabs, { Tab, TabList, TabPanel } from '@atlaskit/tabs';
import Button from '@atlaskit/button/new';
import { token } from '@atlaskit/tokens';

import StarStarredIcon from '@atlaskit/icon/core/star-starred';
import CrossIcon from '@atlaskit/icon/core/cross';

interface Task {
  id: string;
  key: string;
  title: string;
  status: string;
  priority: 1 | 2 | 3;
  assignee: { name: string, initials: string, color: string };
  category: 'Cần bạn xử lý' | 'Sắp đến hạn';
  date: string;
  points: number;
  categoryType: string;
}

const fetchTasks = async (): Promise<Task[]> => {
  await new Promise(resolve => setTimeout(resolve, 500));
  return [
    { id: '1', key: 'TCK-31', title: 'Báo cáo tổng kết chương trình Mùa hè xanh', status: 'CHỜ DUYỆT', priority: 1, points: 5, categoryType: 'Soạn thảo văn bản', assignee: { name: 'Sofia Reyes', initials: 'SR', color: '#6554C0' }, category: 'Cần bạn xử lý', date: 'Hôm nay' },
    { id: '2', key: 'TCK-32', title: 'Ảnh minh chứng Đại hội chi đoàn', status: 'CHỜ DUYỆT', priority: 2, points: 2, categoryType: 'Kiểm tra giấy tờ', assignee: { name: 'Ethan Brooks', initials: 'EB', color: '#36B37E' }, category: 'Cần bạn xử lý', date: 'Hôm qua' },
    { id: '3', key: 'TCK-33', title: 'Danh sách tình nguyện viên Tiếp sức mùa thi', status: 'CHỜ DUYỆT', priority: 3, points: 3, categoryType: 'Khác', assignee: { name: 'Aisha Patel', initials: 'AP', color: '#DE350B' }, category: 'Cần bạn xử lý', date: 'Hôm qua' },
    { id: '4', key: 'TCK-27', title: 'Xác nhận địa điểm Đại hội', status: 'QUÁ HẠN', priority: 1, points: 8, categoryType: 'Họp', assignee: { name: 'Aisha Patel', initials: 'AP', color: '#DE350B' }, category: 'Cần bạn xử lý', date: '02/10' },
    { id: '5', key: 'TCK-29', title: 'Kiểm tra thiết bị âm thanh', status: 'ĐANG LÀM', priority: 2, points: 5, categoryType: 'Thực địa', assignee: { name: 'Daniel Kim', initials: 'DK', color: '#FF991F' }, category: 'Cần bạn xử lý', date: '05/10' },
    { id: '6', key: 'TCK-12', title: 'Chuẩn bị hồ sơ Đại hội chi đoàn', status: 'ĐÃ NHẬN', priority: 1, points: 3, categoryType: 'Soạn thảo văn bản', assignee: { name: 'Ethan Brooks', initials: 'EB', color: '#36B37E' }, category: 'Sắp đến hạn', date: '07/10' },
    { id: '7', key: 'TCK-14', title: 'Báo cáo nhanh chương trình Tiếp sức', status: 'ĐÃ NHẬN', priority: 3, points: 2, categoryType: 'Soạn thảo văn bản', assignee: { name: 'Sofia Reyes', initials: 'SR', color: '#6554C0' }, category: 'Sắp đến hạn', date: '08/10' },
    { id: '8', key: 'TCK-18', title: 'Liên hệ khách mời diễn đàn', status: 'CẦN LÀM', priority: 2, points: 5, categoryType: 'Họp', assignee: { name: 'Daniel Kim', initials: 'DK', color: '#FF991F' }, category: 'Sắp đến hạn', date: '08/10' },
    { id: '9', key: 'TCK-35', title: 'Task đã hoàn thành', status: 'ĐÃ XONG', priority: 3, points: 1, categoryType: 'Khác', assignee: { name: 'Sofia Reyes', initials: 'SR', color: '#6554C0' }, category: 'Cần bạn xử lý', date: '09/10' },
  ];
};

const getStatusAppearance = (status: string) => {
  switch (status) {
    case 'CHỜ DUYỆT': return 'inprogress';
    case 'QUÁ HẠN': return 'removed';
    case 'ĐANG LÀM': return 'inprogress';
    case 'ĐÃ NHẬN': return 'success';
    case 'CẦN LÀM': return 'default';
    case 'ĐÃ XONG': return 'success';
    default: return 'default';
  }
};

const PriorityDot: React.FC<{ priority: 1 | 2 | 3 }> = ({ priority }) => {
  const colors = { 1: token('color.background.danger.bold', '#DE350B'), 2: token('color.background.warning.bold', '#FF991F'), 3: token('color.background.brand.bold', '#0052CC') };
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '16px', height: '16px', borderRadius: '2px', backgroundColor: colors[priority], color: token('color.text.inverse', '#fff'), fontSize: '10px', fontWeight: 'bold', flexShrink: 0, marginRight: '8px' }}>
      {priority}
    </div>
  );
};

export const MyTasks: React.FC = () => {
  const { data: tasks, isLoading, error } = useQuery({ queryKey: ['my-tasks'], queryFn: fetchTasks });
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  if (isLoading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}><Spinner size="large" /></div>;
  if (error) return <div style={{ color: 'red' }}>Lỗi tải dữ liệu</div>;

  const handleCreateTask = () => alert("Mở modal Tạo công việc");
  

  const activeTasks = (tasks || []).filter(t => t.status !== 'ĐÃ XONG');
  const group1 = activeTasks.filter(t => t.category === 'Cần bạn xử lý');
  const group2 = activeTasks.filter(t => t.category === 'Sắp đến hạn');

  return (
    <div style={{ padding: '0', position: 'relative' }}>
      <div className="mobile-col" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '2px', backgroundColor: token('color.background.brand.bold', '#0052CC'), display: 'flex', alignItems: 'center', justifyContent: 'center', color: token('color.text.inverse', '#fff'), fontSize: '20px', fontWeight: 'bold', flexShrink: 0 }}>T</div>
            <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 600, color: token('color.text', '#172B4D'), lineHeight: 1.2, display: 'flex', alignItems: 'center', gap: '8px' }}>
              Tiếp sức mùa thi 
              <div style={{ color: token('color.icon.warning', '#FF991F'), display: 'flex', marginTop: '2px', cursor: 'pointer' }} title="Project yêu thích">
                <StarStarredIcon label="Favorite" />
              </div>
            </h1>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '12px', marginTop: '12px', fontSize: '13px', color: token('color.text.subtle', '#42526E') }}>
            <span><strong style={{ color: token('color.text', '#172B4D') }}>4</strong> hoạt động đang chạy</span>
            <span style={{ color: token('color.text.subtlest', '#C1C7D0') }}>•</span>
            <span><strong style={{ color: token('color.text', '#172B4D') }}>19</strong> việc đã nhận</span>
            <span style={{ color: token('color.text.subtlest', '#C1C7D0') }}>•</span>
            <span><strong style={{ color: token('color.text.danger', '#DE350B') }}>2</strong> quá hạn</span>
            <span style={{ color: token('color.text.subtlest', '#C1C7D0') }}>•</span>
            <span><strong style={{ color: token('color.text.success', '#006644') }}>52%</strong> hoàn thành</span>
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
                      <input type="text" placeholder="Tìm kiếm..." style={{ padding: '6px 12px', border: `2px solid ${token('color.border', '#DFE1E6')}`, borderRadius: '2px', fontSize: '14px', width: '200px', backgroundColor: token('color.background.input', '#FAFBFC'), color: token('color.text', '#172B4D'), boxSizing: 'border-box' }} />
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

                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  {/* Group 1 */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '8px', color: token('color.text', '#172B4D') }}>Cần bạn xử lý <span style={{ color: token('color.text.subtle', '#42526E') }}>{group1.length}</span></div>
                    <div style={{ overflowX: 'auto' }}>
                      <div style={{ minWidth: '600px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', padding: '8px 16px', borderBottom: `1px solid ${token('color.border', '#DFE1E6')}`, fontSize: '12px', color: token('color.text.subtlest', '#6B778C'), fontWeight: 600 }}>
                          
                          <div style={{ flex: 1, minWidth: '200px' }}>Công việc</div>
                          <div style={{ width: '100px', flexShrink: 0 }}>Trạng thái</div>
                          <div style={{ width: '60px', flexShrink: 0, textAlign: 'center' }}>Điểm</div>
                          <div style={{ width: '80px', flexShrink: 0, textAlign: 'center' }}>Nhân sự</div>
                          <div style={{ width: '80px', textAlign: 'right', flexShrink: 0 }}>Hạn</div>
                        </div>
                        <div style={{ border: `1px solid ${token('color.border', '#DFE1E6')}`, borderRadius: '2px', backgroundColor: token('elevation.surface', '#fff') }}>
                          {group1.map(task => (
                            <div key={task.id} className={`task-row ${selectedTask?.id === task.id ? 'task-row-selected' : ''}`} onClick={() => setSelectedTask(task)} style={{ display: 'flex', alignItems: 'center', padding: '10px 16px', borderBottom: `1px solid ${token('color.border', '#DFE1E6')}`, fontSize: '14px', color: token('color.text', '#172B4D'), cursor: 'pointer' }}>
                              
                              <div style={{ flex: 1, display: 'flex', alignItems: 'center', fontWeight: 500, minWidth: '200px' }}>
                                <PriorityDot priority={task.priority} />
                                {task.title}
                              </div>
                              <div style={{ width: '100px', flexShrink: 0 }}><Lozenge appearance={getStatusAppearance(task.status)}>{task.status}</Lozenge></div>
                              <div style={{ width: '60px', flexShrink: 0, textAlign: 'center' }}>
                                <div style={{ backgroundColor: token('color.background.neutral', '#DFE1E6'), borderRadius: '12px', padding: '2px 8px', fontSize: '12px', fontWeight: 'bold', color: token('color.text', '#172B4D'), display: 'inline-block' }}>{task.points}</div>
                              </div>
                              <div style={{ width: '80px', display: 'flex', justifyContent: 'center', flexShrink: 0 }}><Avatar size="small" appearance="circle" name={task.assignee.name} /></div>
                              <div style={{ width: '80px', textAlign: 'right', fontSize: '12px', color: token('color.text.subtle', '#42526E'), flexShrink: 0 }}>{task.date}</div>
                            </div>
                          ))}
                          <div onClick={handleCreateTask} className="task-row" style={{ padding: '10px 16px', fontSize: '14px', color: token('color.text.subtle', '#42526E'), cursor: 'pointer' }}>+ Tạo công việc</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Group 2 */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '8px', color: token('color.text', '#172B4D') }}>Sắp đến hạn <span style={{ color: token('color.text.subtle', '#42526E') }}>{group2.length}</span></div>
                    <div style={{ overflowX: 'auto' }}>
                      <div style={{ minWidth: '600px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', padding: '8px 16px', borderBottom: `1px solid ${token('color.border', '#DFE1E6')}`, fontSize: '12px', color: token('color.text.subtlest', '#6B778C'), fontWeight: 600 }}>
                          
                          <div style={{ flex: 1, minWidth: '200px' }}>Công việc</div>
                          <div style={{ width: '100px', flexShrink: 0 }}>Trạng thái</div>
                          <div style={{ width: '60px', flexShrink: 0, textAlign: 'center' }}>Điểm</div>
                          <div style={{ width: '80px', flexShrink: 0, textAlign: 'center' }}>Nhân sự</div>
                          <div style={{ width: '80px', textAlign: 'right', flexShrink: 0 }}>Hạn</div>
                        </div>
                        <div style={{ border: `1px solid ${token('color.border', '#DFE1E6')}`, borderRadius: '2px', backgroundColor: token('elevation.surface', '#fff') }}>
                          {group2.map(task => (
                            <div key={task.id} className={`task-row ${selectedTask?.id === task.id ? 'task-row-selected' : ''}`} onClick={() => setSelectedTask(task)} style={{ display: 'flex', alignItems: 'center', padding: '10px 16px', borderBottom: `1px solid ${token('color.border', '#DFE1E6')}`, fontSize: '14px', color: token('color.text', '#172B4D'), cursor: 'pointer' }}>
                              
                              <div style={{ flex: 1, display: 'flex', alignItems: 'center', fontWeight: 500, minWidth: '200px' }}>
                                <PriorityDot priority={task.priority} />
                                {task.title}
                              </div>
                              <div style={{ width: '100px', flexShrink: 0 }}><Lozenge appearance={getStatusAppearance(task.status)}>{task.status}</Lozenge></div>
                              <div style={{ width: '60px', flexShrink: 0, textAlign: 'center' }}>
                                <div style={{ backgroundColor: token('color.background.neutral', '#DFE1E6'), borderRadius: '12px', padding: '2px 8px', fontSize: '12px', fontWeight: 'bold', color: token('color.text', '#172B4D'), display: 'inline-block' }}>{task.points}</div>
                              </div>
                              <div style={{ width: '80px', display: 'flex', justifyContent: 'center', flexShrink: 0 }}><Avatar size="small" appearance="circle" name={task.assignee.name} /></div>
                              <div style={{ width: '80px', textAlign: 'right', fontSize: '12px', color: token('color.text.subtle', '#42526E'), flexShrink: 0 }}>{task.date}</div>
                            </div>
                          ))}
                          <div onClick={handleCreateTask} className="task-row" style={{ padding: '10px 16px', fontSize: '14px', color: token('color.text.subtle', '#42526E'), cursor: 'pointer' }}>+ Tạo công việc</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
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
                <div style={{ fontSize: '12px', color: token('color.text.subtlest', '#6B778C'), marginBottom: '4px' }}>{selectedTask.key}</div>
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
                  <div style={{ width: '100px', color: token('color.text.subtle', '#42526E'), fontSize: '14px' }}>Phân loại:</div>
                  <div style={{ fontSize: '14px', color: token('color.text', '#172B4D'), fontWeight: 500 }}>{selectedTask.categoryType}</div>
                </div>
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                  <div style={{ width: '100px', color: token('color.text.subtle', '#42526E'), fontSize: '14px' }}>Trạng thái:</div>
                  <div><Lozenge appearance={getStatusAppearance(selectedTask.status)}>{selectedTask.status}</Lozenge></div>
                </div>
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                  <div style={{ width: '100px', color: token('color.text.subtle', '#42526E'), fontSize: '14px' }}>Người thực hiện:</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Avatar size="small" appearance="circle" name={selectedTask.assignee.name} /> <span style={{ fontSize: '14px', color: token('color.text', '#172B4D') }}>{selectedTask.assignee.name}</span></div>
                </div>
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                  <div style={{ width: '100px', color: token('color.text.subtle', '#42526E'), fontSize: '14px' }}>Điểm:</div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: token('color.text', '#172B4D') }}>
                    <div style={{ backgroundColor: token('color.background.neutral', '#DFE1E6'), borderRadius: '12px', padding: '2px 8px', fontSize: '12px', fontWeight: 'bold', display: 'inline-block' }}>{selectedTask.points}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                  <div style={{ width: '100px', color: token('color.text.subtle', '#42526E'), fontSize: '14px' }}>Hạn chót:</div>
                  <div style={{ fontSize: '14px', color: token('color.text', '#172B4D') }}>{selectedTask.date}</div>
                </div>
                <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: `1px solid ${token('color.border', '#DFE1E6')}` }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 600, color: token('color.text', '#172B4D'), marginBottom: '8px' }}>Mô tả</h3>
                  <p style={{ fontSize: '14px', color: token('color.text', '#172B4D'), lineHeight: 1.5 }}>Đây là nội dung chi tiết của công việc. Bạn có thể xem các thông tin liên quan, đính kèm tài liệu và bình luận tại đây.</p>
                </div>
              </div>
            </div>
            <div style={{ padding: '16px', borderTop: `1px solid ${token('color.border', '#DFE1E6')}`, display: 'flex', justifyContent: 'flex-end', gap: '8px', backgroundColor: token('color.background.neutral.subtle', '#FAFBFC') }}>
              <Button appearance="subtle" onClick={() => setSelectedTask(null)}>Đóng</Button>
              <Button appearance="primary">Lưu thay đổi</Button>
            </div>
          </div>
        )}
      </div>


    </div>
  );
};
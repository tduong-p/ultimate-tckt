import React from 'react';
import { useQuery } from '@tanstack/react-query';
import Spinner from '@atlaskit/spinner';
import Flag from '@atlaskit/flag';
import Lozenge from '@atlaskit/lozenge';
import Button from '@atlaskit/button/new';

import { token } from '@atlaskit/tokens';

// --- DATA ---
interface Task {
  id: string;
  key: string;
  title: string;
  status: string;
  priority: 'High' | 'Medium' | 'Low';
  assignee: { name: string, initials: string, color: string };
  category: 'Cần bạn xử lý' | 'Sắp đến hạn';
  date: string;
}

const fetchTasks = async (): Promise<Task[]> => {
  await new Promise(resolve => setTimeout(resolve, 500));
  return [
    { id: '1', key: 'TCK-31', title: 'Báo cáo tổng kết chương trình Mùa hè xanh', status: 'CHỜ DUYỆT', priority: 'High', assignee: { name: 'Sofia Reyes', initials: 'SR', color: '#6554C0' }, category: 'Cần bạn xử lý', date: 'Hôm nay' },
    { id: '2', key: 'TCK-32', title: 'Ảnh minh chứng Đại hội chi đoàn', status: 'CHỜ DUYỆT', priority: 'Medium', assignee: { name: 'Ethan Brooks', initials: 'EB', color: '#36B37E' }, category: 'Cần bạn xử lý', date: 'Hôm qua' },
    { id: '3', key: 'TCK-33', title: 'Danh sách tình nguyện viên Tiếp sức mùa thi', status: 'CHỜ DUYỆT', priority: 'Low', assignee: { name: 'Aisha Patel', initials: 'AP', color: '#DE350B' }, category: 'Cần bạn xử lý', date: 'Hôm qua' },
    { id: '4', key: 'TCK-27', title: 'Xác nhận địa điểm Đại hội', status: 'QUÁ HẠN', priority: 'High', assignee: { name: 'Aisha Patel', initials: 'AP', color: '#DE350B' }, category: 'Cần bạn xử lý', date: '02/10' },
    { id: '5', key: 'TCK-29', title: 'Kiểm tra thiết bị âm thanh', status: 'ĐANG LÀM', priority: 'Medium', assignee: { name: 'Daniel Kim', initials: 'DK', color: '#FF991F' }, category: 'Cần bạn xử lý', date: '05/10' },
    { id: '6', key: 'TCK-12', title: 'Chuẩn bị hồ sơ Đại hội chi đoàn', status: 'ĐÃ NHẬN', priority: 'High', assignee: { name: 'Ethan Brooks', initials: 'EB', color: '#36B37E' }, category: 'Sắp đến hạn', date: '07/10' },
    { id: '7', key: 'TCK-14', title: 'Báo cáo nhanh chương trình Tiếp sức', status: 'ĐÃ DUYỆT', priority: 'High', assignee: { name: 'Sofia Reyes', initials: 'SR', color: '#6554C0' }, category: 'Sắp đến hạn', date: '08/10' },
    { id: '8', key: 'TCK-18', title: 'Liên hệ khách mời diễn đàn', status: 'CẦN LÀM', priority: 'High', assignee: { name: 'Daniel Kim', initials: 'DK', color: '#FF991F' }, category: 'Sắp đến hạn', date: '09/10' },
  ];
};

const renderStatus = (status: string) => {
  switch (status) {
    case 'QUÁ HẠN': return <Lozenge appearance="removed" isBold>{status}</Lozenge>;
    case 'CHỜ DUYỆT': return <Lozenge appearance="moved" isBold>{status}</Lozenge>;
    case 'ĐANG LÀM': return <Lozenge appearance="inprogress" isBold>{status}</Lozenge>;
    case 'ĐÃ NHẬN': return <Lozenge appearance="inprogress" isBold>{status}</Lozenge>;
    case 'CẦN LÀM': return <Lozenge appearance="default" isBold>{status}</Lozenge>;
    case 'ĐÃ DUYỆT': return <Lozenge appearance="success" isBold>{status}</Lozenge>;
    default: return <Lozenge>{status}</Lozenge>;
  }
};

export const MyTasks: React.FC = () => {
  const { data, isLoading, isError } = useQuery({ queryKey: ['myTasks'], queryFn: fetchTasks });

  if (isLoading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '50px' }}><Spinner size="xlarge" /></div>;
  if (isError) return <Flag appearance="error" id="error" title="Lỗi kết nối" description="Không thể tải danh sách công việc." />;

  const tasks = data || [];
  const groups = ['Cần bạn xử lý', 'Sắp đến hạn'];

  return (
    <div className="mobile-col mobile-gap-16 mobile-padding-16" style={{ display: 'flex', gap: '32px', padding: '0 24px', paddingBottom: '40px' }}>
      
      {/* Left Content */}
      <div style={{ flex: 1, minWidth: 0, overflowX: 'auto' }}>
        {/* Project Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px', marginTop: '16px' }}>
          <div style={{ width: '40px', height: '40px', backgroundColor: token('color.background.brand.bold', '#0052CC'), borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFF' }}>
            T
          </div>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 600, margin: 0, color: token('color.text', '#172B4D'), display: 'flex', alignItems: 'center', gap: '8px' }}>
              Tiếp sức mùa thi
              <span style={{ fontSize: '14px', color: token('color.text.subtle', '#5E6C84') }}>★</span>
            </h1>
          </div>
        </div>
        <div style={{ fontSize: '12px', color: token('color.text.subtle', '#5E6C84'), display: 'flex', gap: '16px', marginBottom: '24px' }}>
          <span><strong>6</strong> hoạt động đang chạy</span>
          <span><strong>18</strong> việc đã nhận</span>
          <span><strong style={{ color: token('color.text.danger', '#DE350B') }}>2</strong> quá hạn</span>
          <span><strong style={{ color: token('color.text.success', '#00875A') }}>57%</strong> hoàn thành</span>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '24px', borderBottom: `2px solid ${token('color.border', '#EBECF0')}`, marginBottom: '24px', fontSize: '14px', fontWeight: 500, color: token('color.text.subtle', '#5E6C84') }}>
          <div style={{ paddingBottom: '8px', cursor: 'pointer' }}>Dòng thời gian</div>
          <div style={{ paddingBottom: '8px', cursor: 'pointer' }}>Kế hoạch</div>
          <div style={{ paddingBottom: '8px', cursor: 'pointer', color: token('color.text.selected', '#0052CC'), borderBottom: `2px solid ${token('color.border.selected', '#0052CC')}`, marginBottom: '-2px' }}>Danh sách</div>
          <div style={{ paddingBottom: '8px', cursor: 'pointer' }}>Bảng</div>
          <div style={{ paddingBottom: '8px', cursor: 'pointer' }}>Thành viên</div>
        </div>

        {/* Toolbar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <input 
              type="text" 
              placeholder="Tìm kiếm..." 
              style={{ 
                width: '200px', 
                padding: '6px 12px', 
                borderRadius: '4px', 
                border: `1px solid ${token('color.border.input', '#DFE1E6')}`,
                backgroundColor: token('color.background.input', '#FAFBFC')
              }} 
            />
            <div style={{ display: 'flex', marginLeft: '8px', gap: '4px' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#6554C0', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 'bold' }}>SR</div>
              <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#36B37E', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 'bold' }}>EB</div>
              <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#DE350B', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 'bold' }}>AP</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button>Chia sẻ</Button>
            <Button>Bộ lọc</Button>
            <Button>Tùy chọn hiển thị</Button>
          </div>
        </div>

        {/* Grouped Table */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {groups.map(groupName => {
            const groupTasks = tasks.filter(t => t.category === groupName);
            if (groupTasks.length === 0) return null;
            return (
              <div key={groupName} style={{ border: `1px solid ${token('color.border', '#EBECF0')}`, borderRadius: '3px', backgroundColor: token('elevation.surface.raised', '#FFFFFF') }}>
                <div style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', backgroundColor: token('color.background.neutral.subtle', '#F4F5F7'), borderBottom: `1px solid ${token('color.border', '#EBECF0')}` }}>
                  <span style={{ fontWeight: 600, color: token('color.text', '#172B4D') }}>{groupName} <span style={{ backgroundColor: token('color.background.neutral', '#DFE1E6'), padding: '2px 8px', borderRadius: '12px', fontSize: '12px', marginLeft: '8px' }}>{groupTasks.length}</span></span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {groupTasks.map((task, index) => (
                    <div key={task.id} style={{ display: 'flex', alignItems: 'center', padding: '8px 16px', borderBottom: index < groupTasks.length - 1 ? `1px solid ${token('color.border', '#EBECF0')}` : 'none', fontSize: '14px', color: token('color.text', '#172B4D') }}>
                      <input type="checkbox" style={{ marginRight: '16px' }} />
                      <div style={{ display: 'flex', alignItems: 'center', width: '100px', flexShrink: 0, gap: '8px' }}>
                        <div style={{ width: '16px', height: '16px', backgroundColor: '#0052CC', borderRadius: '3px' }}></div>
                        <span style={{ color: token('color.text.subtlest', '#5E6C84') }}>{task.key}</span>
                      </div>
                      <div style={{ flex: 1, paddingRight: '16px', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {task.title}
                      </div>
                      <div style={{ width: '120px', flexShrink: 0 }}>
                        {renderStatus(task.status)}
                      </div>
                      <div style={{ width: '180px', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: task.assignee.color, color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 'bold' }}>{task.assignee.initials}</div>
                        <span>{task.assignee.name}</span>
                      </div>
                      <div style={{ width: '80px', flexShrink: 0, textAlign: 'right', color: task.date.includes('/') ? token('color.text.danger', '#DE350B') : 'inherit' }}>
                        {task.date}
                      </div>
                    </div>
                  ))}
                  <div style={{ padding: '8px 16px', color: token('color.text.subtle', '#5E6C84'), fontSize: '14px', cursor: 'pointer', borderTop: `1px solid ${token('color.border', '#EBECF0')}` }}>
                    + Tạo công việc
                  </div>
                </div>
              </div>
            );
          })}
        </div>

      </div>

      {/* Right Sidebar */}
      <div style={{ width: '260px', marginTop: '16px' }}>
        <div style={{ marginBottom: '24px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: token('color.text.subtlest', '#5E6C84'), textTransform: 'uppercase', marginBottom: '12px' }}>Bộ lọc</div>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '14px', color: token('color.text', '#172B4D') }}>
            <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>Hoạt động đang chạy</li>
            <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>Giao cho tôi</li>
            <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>Hạn trong tuần</li>
            <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>Đã hoàn thành</li>
          </ul>
        </div>
        
        <div style={{ marginBottom: '24px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: token('color.text.subtlest', '#5E6C84'), textTransform: 'uppercase', marginBottom: '12px' }}>Người thực hiện</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#6554C0', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 'bold' }}>SR</div>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#DE350B', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 'bold' }}>LH</div>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#36B37E', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 'bold' }}>EB</div>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#0052CC', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 'bold' }}>AP</div>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#FF991F', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 'bold' }}>DK</div>
          </div>
        </div>
      </div>

    </div>
  );
};

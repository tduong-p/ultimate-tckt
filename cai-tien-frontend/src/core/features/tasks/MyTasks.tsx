import React from 'react';
import { useQuery } from '@tanstack/react-query';
import DynamicTable from '@atlaskit/dynamic-table';
import Spinner from '@atlaskit/spinner';
import Flag from '@atlaskit/flag';
import Lozenge from '@atlaskit/lozenge';
import Button from '@atlaskit/button/new';
import Avatar from '@atlaskit/avatar';
import { token } from '@atlaskit/tokens';

// --- DATA ---
interface Task {
  id: number;
  title: string;
  status: string;
  priority: 'High' | 'Medium' | 'Low';
  assignee: string;
  category: 'dueToday' | 'overdue' | 'pendingMyReview';
}

const fetchTasks = async (): Promise<Task[]> => {
  await new Promise(resolve => setTimeout(resolve, 500));
  return [
    { id: 1, title: 'Báo cáo tài chính tháng 9', status: 'pending', priority: 'High', assignee: 'Nguyễn Văn A', category: 'overdue' },
    { id: 2, title: 'Review code module Auth', status: 'review', priority: 'Medium', assignee: 'Trần Thị B', category: 'pendingMyReview' },
    { id: 3, title: 'Tạo ticket hỗ trợ IT', status: 'in_progress', priority: 'Low', assignee: 'Lê Văn C', category: 'dueToday' },
    { id: 4, title: 'Họp giao ban tuần', status: 'todo', priority: 'Medium', assignee: 'Nguyễn Văn A', category: 'dueToday' },
  ];
};

const renderCategory = (category: string) => {
  switch (category) {
    case 'overdue': return <Lozenge appearance="removed">Quá hạn</Lozenge>;
    case 'dueToday': return <Lozenge appearance="new">Hôm nay</Lozenge>;
    case 'pendingMyReview': return <Lozenge appearance="moved">Chờ duyệt</Lozenge>;
    default: return null;
  }
};

const renderPriority = (priority: string) => {
  switch (priority) {
    case 'High': return <Lozenge appearance="removed" isBold>Cao</Lozenge>;
    case 'Medium': return <Lozenge appearance="inprogress" isBold>Vừa</Lozenge>;
    case 'Low': return <Lozenge appearance="success" isBold>Thấp</Lozenge>;
    default: return null;
  }
};

export const MyTasks: React.FC = () => {
  const { data, isLoading, isError } = useQuery({ queryKey: ['myTasks'], queryFn: fetchTasks });

  if (isLoading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '50px' }}><Spinner size="xlarge" /></div>;
  if (isError) return <Flag appearance="error" id="error" title="Lỗi kết nối" description="Không thể tải danh sách công việc." />;

  const head = {
    cells: [
      { key: 'category', content: 'Phân loại', isSortable: true, width: 15 },
      { key: 'title', content: 'Tên công việc', isSortable: true, width: 40 },
      { key: 'priority', content: 'Ưu tiên', isSortable: true, width: 10 },
      { key: 'assignee', content: 'Người thực hiện', isSortable: true, width: 20 },
      { key: 'status', content: 'Trạng thái', isSortable: false, width: 15 },
    ],
  };

  const rows = (data || []).map((task) => ({
    key: task.id.toString(),
    cells: [
      { key: `${task.id}-cat`, content: renderCategory(task.category) },
      { key: `${task.id}-title`, content: <span style={{ fontWeight: 500, color: token('color.link', '#0052CC') }}>{task.title}</span> },
      { key: `${task.id}-pri`, content: renderPriority(task.priority) },
      { key: `${task.id}-ass`, content: <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Avatar size="small" /> <span>{task.assignee}</span></div> },
      { key: `${task.id}-status`, content: task.status },
    ],
  }));

  return (
    <div style={{ padding: '0 24px', paddingBottom: '40px' }}>
      
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
          <div style={{ display: 'flex', marginLeft: '8px' }}>
            <Avatar size="small" />
            <Avatar size="small" />
            <Avatar size="small" />
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button>Chia sẻ</Button>
          <Button>Bộ lọc</Button>
          <Button>Tùy chọn hiển thị</Button>
        </div>
      </div>

      {/* Main Table Area */}
      <div style={{ backgroundColor: token('elevation.surface.raised', '#FFFFFF'), borderRadius: '3px', boxShadow: token('elevation.shadow.raised', '0 1px 1px rgba(9, 30, 66, 0.25), 0 0 1px rgba(9, 30, 66, 0.31)') }}>
        <DynamicTable head={head} rows={rows} rowsPerPage={10} defaultPage={1} emptyView={<div>Không có công việc nào</div>} />
      </div>

    </div>
  );
};

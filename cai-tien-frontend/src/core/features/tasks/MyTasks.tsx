import React from 'react';
import { useQuery } from '@tanstack/react-query';
import DynamicTable from '@atlaskit/dynamic-table';
import Spinner from '@atlaskit/spinner';
import Flag from '@atlaskit/flag';
import Lozenge from '@atlaskit/lozenge';

interface Task {
  id: number;
  title: string;
  status: string;
  category: 'dueToday' | 'overdue' | 'pendingMyReview';
}

const fetchTasks = async (): Promise<Task[]> => {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  return [
    { id: 1, title: 'Báo cáo tài chính tháng 9', status: 'pending', category: 'overdue' },
    { id: 2, title: 'Review code module Auth', status: 'review', category: 'pendingMyReview' },
    { id: 3, title: 'Tạo ticket hỗ trợ IT', status: 'in_progress', category: 'dueToday' },
    { id: 4, title: 'Họp giao ban tuần', status: 'todo', category: 'dueToday' },
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

export const MyTasks: React.FC = () => {
  const { data, isLoading, isError } = useQuery({ queryKey: ['myTasks'], queryFn: fetchTasks });

  if (isLoading) return <div><Spinner size="large" /> <span>Loading tasks...</span></div>;
  if (isError) return <Flag appearance="error" id="error" title="Lỗi kết nối" description="Không thể tải danh sách công việc. Vui lòng đăng nhập ở backend (port 3000)." />;

  const head = {
    cells: [
      { key: 'category', content: 'Phân loại', isSortable: true },
      { key: 'title', content: 'Tên công việc', isSortable: true },
      { key: 'status', content: 'Trạng thái', isSortable: false },
    ],
  };

  const rows = (data || []).map((task) => ({
    key: task.id.toString(),
    cells: [
      { key: `${task.id}-cat`, content: renderCategory(task.category) },
      { key: `${task.id}-title`, content: task.title },
      { key: `${task.id}-status`, content: task.status },
    ],
  }));

  return (
    <div>
      <h3>Công việc của tôi</h3>
      <DynamicTable head={head} rows={rows} rowsPerPage={10} defaultPage={1} loadingSpinnerSize="large" emptyView={<div>Không có công việc nào</div>} />
    </div>
  );
};

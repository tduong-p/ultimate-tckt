import React from 'react';
import { useQuery } from '@tanstack/react-query';
import DynamicTable from '@atlaskit/dynamic-table';
import Spinner from '@atlaskit/spinner';
import Flag from '@atlaskit/flag';
import Lozenge from '@atlaskit/lozenge';
import PageHeader from '@atlaskit/page-header';
import Breadcrumbs, { BreadcrumbsItem } from '@atlaskit/breadcrumbs';
import Button from '@atlaskit/button/new';
import Avatar from '@atlaskit/avatar';
import { token } from '@atlaskit/tokens';

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
      { key: 'assignee', content: 'Người giao', isSortable: true, width: 20 },
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

  const breadcrumbs = (
    <Breadcrumbs onExpand={() => {}}>
      <BreadcrumbsItem text="Trang chủ" key="home" />
      <BreadcrumbsItem text="Công việc" key="tasks" />
      <BreadcrumbsItem text="Của tôi" key="mytasks" />
    </Breadcrumbs>
  );

  const actions = (
    <Button appearance="primary">Tạo công việc</Button>
  );

  return (
    <div style={{ 
      backgroundColor: token('elevation.surface.raised', '#FFFFFF'), 
      padding: token('space.400', '32px'), 
      borderRadius: '8px', 
      boxShadow: token('elevation.shadow.raised', '0 1px 2px rgba(0,0,0,0.1)') 
    }}>
      <PageHeader breadcrumbs={breadcrumbs} actions={actions}>
        Công việc của tôi
      </PageHeader>
      
      <div style={{ marginTop: token('space.300', '24px') }}>
        <DynamicTable head={head} rows={rows} rowsPerPage={10} defaultPage={1} emptyView={<div>Không có công việc nào</div>} />
      </div>
    </div>
  );
};

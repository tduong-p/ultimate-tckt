import React from 'react';
import { useQuery } from '@tanstack/react-query';
import DynamicTable from '@atlaskit/dynamic-table';
import Spinner from '@atlaskit/spinner';
import Flag from '@atlaskit/flag';
import { apiClient } from '../../../shared/utils/api';

interface Task {
  id: number;
  title: string;
  status: string;
}

const fetchTasks = async (): Promise<Task[]> => {
  const { data } = await apiClient.get('/tasks/my-tasks');
  return data;
};

export const MyTasks: React.FC = () => {
  const { data, isLoading, isError } = useQuery({ queryKey: ['myTasks'], queryFn: fetchTasks });

  if (isLoading) return <div><Spinner size="large" /> <span>Loading tasks...</span></div>;

  if (isError) return <Flag appearance="error" id="error" title="Lỗi kết nối" description="Không thể tải danh sách công việc." />;

  const head = {
    cells: [
      { key: 'title', content: 'Tên công việc', isSortable: true },
      { key: 'status', content: 'Trạng thái', isSortable: false },
    ],
  };

  const rows = (data || []).map((task) => ({
    key: task.id.toString(),
    cells: [
      { key: task.id.toString(), content: task.title },
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

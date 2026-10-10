import React, { useMemo } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { Badge, Button, PriorityIcon, StatusIcon, Tabs, TabsContent, type Priority, type Status } from '../../../ui';
import { acknowledgeTask, apiErrorMessage, updateTaskStatus } from '../../api';
import { MY_TASKS_TODAY_KEY } from '../../queryKeys';
import { useToast } from '../../../shared/components/Toast';
import { formatVnDate, todayVnKey } from '../../../shared/utils/date';
import { getTaskStatusLabel } from '../tasks/taskLabels';
import { useInvalidateTaskCaches } from '../tasks/useTaskCaches';
import { useTaskModal } from '../tasks/TaskModalProvider';
import { fetchMyTaskList, groupMine, MINE_TABS, parseTab, type MineTab, type MineTask } from './mineTasks';
import './mine.css';

// Khoá nằm dưới tiền tố `core-my-tasks-today` để useInvalidateTaskCaches làm mới luôn hai danh sách này.
const MINE_KEY = [...MY_TASKS_TODAY_KEY, 'mine'] as const;
const REVIEW_KEY = [...MY_TASKS_TODAY_KEY, 'review'] as const;

const TAB_LABEL: Record<MineTab, string> = { today: 'Hôm nay', overdue: 'Quá hạn', review: 'Chờ tôi duyệt', all: 'Tất cả' };
const EMPTY_TEXT: Record<MineTab, string> = {
  today: 'Hôm nay không có việc nào đến hạn.',
  overdue: 'Không có việc quá hạn.',
  review: 'Không có việc nào chờ bạn duyệt.',
  all: 'Bạn không có việc nào đang mở.',
};

const toStatus = (s: string): Status => (s === 'in_progress' || s === 'review' || s === 'done' || s === 'cancelled' ? s : 'todo');
const toPriority = (p: string): Priority => (p === 'low' || p === 'medium' || p === 'high' || p === 'urgent' ? p : 'none');

interface RowProps {
  task: MineTask;
  tab: MineTab;
  today: string;
  busy: boolean;
  onOpen: (id: number) => void;
  onAck: (id: number) => void;
  onMove: (id: number, next: 'todo' | 'in_progress') => void;
}

const MineRow: React.FC<RowProps> = ({ task, tab, today, busy, onOpen, onAck, onMove }) => {
  const mineTab = tab !== 'review';
  const isNew = mineTab && !task.acknowledged_at && task.status !== 'review';
  const returned = Boolean(task.review_feedback) && task.status !== 'review' && task.status !== 'done';
  const overdue = Boolean(task.deadline) && task.deadline!.slice(0, 10) < today;
  const meta = [task.team_name, task.activity_title, task.assignee_name && `Phụ trách: ${task.assignee_name}`].filter(Boolean).join(' · ');
  return (
    <li className="mine-row">
      <button type="button" className="mine-row-main" onClick={() => onOpen(task.id)}>
        <StatusIcon status={toStatus(task.status)} title={getTaskStatusLabel(task.status)} />
        <span className="mine-row-body">
          <span className="mine-row-title">{task.title}</span>
          {meta && <span className="mine-row-meta">{meta}</span>}
        </span>
        {isNew && <Badge tone="info">Mới được giao</Badge>}
        {returned && <Badge tone="danger">Bị trả lại</Badge>}
        <PriorityIcon priority={toPriority(task.priority)} />
        {task.deadline && (
          <span className={`mine-row-date${overdue ? ' mine-row-date--late' : ''}`}>{formatVnDate(task.deadline)}</span>
        )}
      </button>
      {isNew && (
        <Button size="sm" aria-label="Xác nhận đã nhận việc" disabled={busy} onClick={() => onAck(task.id)}>Xác nhận</Button>
      )}
      {mineTab && (task.status === 'todo' || task.status === 'open') && (
        <Button size="sm" variant="primary" aria-label="Bắt đầu làm" disabled={busy} onClick={() => onMove(task.id, 'in_progress')}>Bắt đầu làm</Button>
      )}
      {mineTab && task.status === 'in_progress' && (
        <Button size="sm" aria-label="Tạm dừng" disabled={busy} onClick={() => onMove(task.id, 'todo')}>Tạm dừng</Button>
      )}
    </li>
  );
};

/** Màn "Việc của tôi": bốn tab Hôm nay · Quá hạn · Chờ tôi duyệt · Tất cả, tab nằm trên URL (`?tab=`). */
export const MineView: React.FC = () => {
  const toast = useToast();
  const { open } = useTaskModal();
  const invalidate = useInvalidateTaskCaches();
  const [params, setParams] = useSearchParams();
  const tab = parseTab(params.get('tab'));

  const mineQuery = useQuery({ queryKey: MINE_KEY, queryFn: () => fetchMyTaskList('mine') });
  const reviewQuery = useQuery({ queryKey: REVIEW_KEY, queryFn: () => fetchMyTaskList('review') });

  const ack = useMutation({
    mutationFn: (id: number) => acknowledgeTask(id),
    onSuccess: (_r, id) => {
      toast.success('Đã xác nhận nhận việc');
      return invalidate(id);
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Không xác nhận được. Vui lòng thử lại.')),
  });
  const move = useMutation({
    mutationFn: ({ id, next }: { id: number; next: 'todo' | 'in_progress' }) => updateTaskStatus(id, next),
    onSuccess: (_r, { id, next }) => {
      toast.success(next === 'in_progress' ? 'Đã bắt đầu làm.' : 'Đã tạm dừng.');
      return invalidate(id);
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });
  const busyId = ack.isPending ? (ack.variables ?? null) : move.isPending ? (move.variables?.id ?? null) : null;

  const today = todayVnKey();
  const groups = useMemo(() => groupMine(mineQuery.data ?? [], reviewQuery.data ?? [], today), [mineQuery.data, reviewQuery.data, today]);

  const tabs = MINE_TABS.map((value) => ({ value, label: TAB_LABEL[value], count: value === 'review' ? (reviewQuery.isSuccess ? groups[value].length : undefined) : mineQuery.isSuccess ? groups[value].length : undefined }));
  const list = groups[tab];
  const loading = mineQuery.isLoading || (tab === 'review' && reviewQuery.isLoading);
  const failed = mineQuery.isError || (tab === 'review' && reviewQuery.isError);

  const changeTab = (next: string) => setParams({ tab: next }, { replace: true });

  return (
    <div className="mine">
      <h1 className="mine-title">Việc của tôi</h1>
      <Tabs value={tab} onValueChange={changeTab} tabs={tabs}>
        <TabsContent value={tab} className="mine-panel">
          {loading ? (
            <p className="mine-state" role="status">Đang tải danh sách công việc…</p>
          ) : failed ? (
            <p className="mine-state mine-state--error" role="alert">Lỗi tải danh sách công việc.</p>
          ) : list.length === 0 ? (
            <p className="mine-state">{EMPTY_TEXT[tab]}</p>
          ) : (
            <ul className="mine-list" aria-label={TAB_LABEL[tab]}>
              {list.map((task) => (
                <MineRow key={task.id} task={task} tab={tab} today={today} busy={busyId === task.id} onOpen={open} onAck={(id) => ack.mutate(id)} onMove={(id, next) => move.mutate({ id, next })} />
              ))}
            </ul>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

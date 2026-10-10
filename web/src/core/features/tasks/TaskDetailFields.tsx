// Đầu trang chi tiết công việc + bảng thuộc tính; trường nằm trong editable[] mới có ô sửa, còn lại chỉ đọc.
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Badge, PriorityIcon, Select, type BadgeTone, type Priority } from '../../../ui';
import { fetchTeamMembers, fetchTeams } from '../../api';
import { TEAMS_KEY, teamMembersKey } from '../../queryKeys';
import type { EditSession } from '../../edit/useEditSession';
import { formatVnDate } from '../../../shared/utils/date';
import { getTaskPriorityLabel, getTaskStatusLabel, PRIORITY_OPTIONS } from './taskLabels';
import type { TaskDetailData, TaskDraftFields } from './taskEdit';
import './tasks.css';

type Session = EditSession<TaskDraftFields>;
interface Props {
  detail: TaskDetailData;
  session: Session;
  editable: ReadonlySet<string>;
  /** Trường vừa bị báo sai: gắn aria-invalid (data-edit-field để màn focus được). */
  invalid?: readonly string[];
}

const STATUS_TONE: Record<string, BadgeTone> = { done: 'success', in_progress: 'warning', review: 'info', cancelled: 'danger' };
const priorityOf = (p: string): Priority => (p === 'low' || p === 'medium' || p === 'high' || p === 'urgent' ? p : 'none');
const flag = (invalid: readonly string[] | undefined, key: string) => (invalid?.includes(key) ? true : undefined);

export const Row: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="tk-prop">
    <dt>{label}</dt>
    <dd>{children}</dd>
  </div>
);

export const TaskTitleBlock: React.FC<Pick<Props, 'detail' | 'session' | 'editable' | 'invalid'>> = ({ detail, session, editable, invalid }) => {
  const { task } = detail;
  return (
    <header>
      <h2 className="tk-title">
        {editable.has('title') ? (
          <input
            className="tk-title-input"
            aria-label="Tiêu đề công việc"
            data-edit-field="title"
            aria-invalid={flag(invalid, 'title')}
            value={session.value('title')}
            onChange={(e) => session.set('title', e.target.value)}
          />
        ) : (
          task.title
        )}
      </h2>
      <p className="tk-sub">
        <a href={`#/activity/${task.activity_id}`}>{task.activity_title}</a> · {task.team_name}
      </p>
      {editable.has('description') ? (
        <textarea
          className="tk-desc-input"
          aria-label="Mô tả"
          data-edit-field="description"
          aria-invalid={flag(invalid, 'description')}
          value={session.value('description')}
          onChange={(e) => session.set('description', e.target.value)}
        />
      ) : (
        task.description && <p className="tk-desc">{task.description}</p>
      )}
    </header>
  );
};

const TeamSelect: React.FC<{ session: Session; detail: TaskDetailData }> = ({ session, detail }) => {
  const { data } = useQuery({ queryKey: TEAMS_KEY, queryFn: fetchTeams });
  const current = session.value('team_id');
  const options = (data ?? []).filter((t) => t.is_active !== 0 && t.is_active !== false).map((t) => ({ value: String(t.id), label: t.name }));
  if (!options.some((o) => o.value === String(current))) {
    options.push({ value: String(current), label: detail.task.team_name ?? `Tổ #${current}` });
  }
  return <Select aria-label="Tổ" value={String(current)} options={options} onChange={(v) => session.set('team_id', Number(v))} />;
};

const AssigneeSelect: React.FC<{ session: Session; detail: TaskDetailData }> = ({ session, detail }) => {
  const teamId = session.value('team_id');
  const current = session.value('primary_assignee_id');
  const { data } = useQuery({ queryKey: teamMembersKey(teamId), queryFn: () => fetchTeamMembers(teamId), enabled: teamId > 0 });
  const options = (data?.members ?? []).map((m) => ({ value: String(m.id), label: m.name }));
  if (current && !options.some((o) => o.value === String(current))) {
    options.unshift({ value: String(current), label: detail.assignees.find((a) => a.user_id === current)?.name ?? `Người dùng #${current}` });
  }
  if (!current) options.unshift({ value: '', label: 'Chưa giao' });
  return (
    <Select
      aria-label="Người phụ trách chính"
      value={current ? String(current) : ''}
      options={options}
      onChange={(v) => { if (v) session.set('primary_assignee_id', Number(v)); }}
    />
  );
};

const DateField: React.FC<{ label: string; field: string; value: string; invalid?: boolean; onChange: (v: string) => void }> = ({ label, field, value, invalid, onChange }) => (
  <input className="tk-input" type="date" aria-label={label} data-edit-field={field} aria-invalid={invalid || undefined} value={value} onChange={(e) => onChange(e.target.value)} />
);

export const TaskProperties: React.FC<Props> = ({ detail, session, editable, invalid }) => {
  const { task, assignees } = detail;
  return (
    <dl className="tk-dl">
      <Row label="Trạng thái"><Badge tone={STATUS_TONE[task.status] ?? 'neutral'}>{getTaskStatusLabel(task.status)}</Badge></Row>
      <Row label="Tổ">{editable.has('team_id') ? <TeamSelect session={session} detail={detail} /> : task.team_name}</Row>
      {editable.has('primary_assignee_id') && <Row label="Người phụ trách chính"><AssigneeSelect session={session} detail={detail} /></Row>}
      <Row label="Người được giao">
        {assignees.length === 0 ? (
          'Chưa giao'
        ) : (
          <span className="tk-people">
            {assignees.map((a) => (
              <span key={a.user_id}>
                {a.name}
                {a.is_primary ? ' (chính)' : ''}
                {a.acknowledged_at ? ' ✓' : ' · chờ xác nhận'}
              </span>
            ))}
          </span>
        )}
      </Row>
      <Row label="Ngày bắt đầu">
        {editable.has('start_date') ? <DateField label="Ngày bắt đầu" field="start_date" value={session.value('start_date')} onChange={(v) => session.set('start_date', v)} /> : formatVnDate(task.start_date) || 'Chưa đặt'}
      </Row>
      <Row label="Hạn chót">
        {editable.has('deadline') ? <DateField label="Hạn chót" field="deadline" invalid={invalid?.includes('deadline')} value={session.value('deadline')} onChange={(v) => session.set('deadline', v)} /> : formatVnDate(task.deadline)}
      </Row>
      <Row label="Ưu tiên">
        {editable.has('priority') ? (
          <Select aria-label="Ưu tiên" value={session.value('priority')} options={PRIORITY_OPTIONS} onChange={(v) => session.set('priority', v)} />
        ) : (
          <>
            <PriorityIcon priority={priorityOf(task.priority)} />
            <span>{getTaskPriorityLabel(task.priority)}</span>
          </>
        )}
      </Row>
      {(editable.has('deliverable') || task.deliverable) && (
        <Row label="Sản phẩm cần nộp">
          {editable.has('deliverable') ? (
            <textarea className="tk-input tk-input--area" aria-label="Sản phẩm cần nộp" data-edit-field="deliverable" value={session.value('deliverable')} onChange={(e) => session.set('deliverable', e.target.value)} />
          ) : (
            task.deliverable
          )}
        </Row>
      )}
    </dl>
  );
};

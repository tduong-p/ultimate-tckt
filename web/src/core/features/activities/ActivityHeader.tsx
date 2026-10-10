// Đầu trang chi tiết + bảng thuộc tính; trường nằm trong editable[] mới có ô sửa, còn lại chỉ đọc (không icon sửa).
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Badge, PriorityIcon, Select, type Priority } from '../../../ui';
import { fetchMembers, fetchTeams, type ActivityItem, type ActivityTeamRow } from '../../api';
import type { EditSession } from '../../edit/useEditSession';
import { getActivityStatusMeta } from './activityLabels';
import { EDIT_PRIORITY_OPTIONS } from './editPayload';
import type { ActivityDraftFields } from './activityEdit';
import { Row, STATUS_TONE } from './ActivityInfoSections';
import { formatVnDate } from '../../../shared/utils/date';
import { isHttpUrl } from '../../../shared/utils/url';
import './activities.css';

type Session = EditSession<ActivityDraftFields>;
interface Props {
  activity: ActivityItem;
  teams: ActivityTeamRow[];
  session: Session;
  editable: ReadonlySet<string>;
  /** Trường vừa bị báo trống: gắn aria-invalid và data-edit-field để màn focus được. */
  invalid?: readonly string[];
}

const priorityOf = (p: string): Priority => (p === 'low' || p === 'medium' || p === 'high' || p === 'urgent' ? p : 'none');
const priorityLabel = (p: string) => EDIT_PRIORITY_OPTIONS.find((o) => o.value === p)?.label ?? p;

const flag = (invalid: readonly string[] | undefined, key: string) => (invalid?.includes(key) ? true : undefined);

export const ActivityTitleBlock: React.FC<Pick<Props, 'activity' | 'session' | 'editable' | 'invalid'>> = ({ activity, session, editable, invalid }) => (
  <header>
    <h1 className="act-title">
      {editable.has('title') ? (
        <input
          className="act-title-input"
          aria-label="Tiêu đề hoạt động"
          data-edit-field="title"
          aria-invalid={flag(invalid, 'title')}
          value={session.value('title')}
          onChange={(e) => session.set('title', e.target.value)}
        />
      ) : (
        activity.title
      )}
    </h1>
    {editable.has('description') ? (
      <textarea
        className="act-desc-input"
        aria-label="Mô tả"
        data-edit-field="description"
        aria-invalid={flag(invalid, 'description')}
        value={session.value('description')}
        onChange={(e) => session.set('description', e.target.value)}
      />
    ) : (
      activity.description && <p className="act-desc">{activity.description}</p>
    )}
  </header>
);

const TeamSelect: React.FC<{ session: Session; teams: ActivityTeamRow[] }> = ({ session, teams }) => {
  const { data } = useQuery({ queryKey: ['core-teams'], queryFn: fetchTeams });
  const active = (data ?? []).filter((t) => t.is_active !== 0 && t.is_active !== false).map((t) => ({ value: String(t.id), label: t.name }));
  const have = new Set(active.map((o) => o.value));
  const current = session.value('team_id');
  const extra = teams.filter((t) => !have.has(String(t.team_id))).map((t) => ({ value: String(t.team_id), label: `${t.name} (đã lưu trữ)` }));
  const options = data ? [...active, ...extra] : teams.map((t) => ({ value: String(t.team_id), label: t.name }));
  return <Select aria-label="Tổ điều phối" value={String(current)} options={options} onChange={(v) => session.set('team_id', Number(v))} />;
};

const LeadSelect: React.FC<{ session: Session; activity: ActivityItem }> = ({ session, activity }) => {
  const { data } = useQuery({ queryKey: ['core-members'], queryFn: fetchMembers });
  const current = session.value('event_lead_id');
  const options = [{ value: '', label: 'Không có' }].concat(
    (data ?? []).filter((m) => m.is_active !== 0 && m.is_active !== false).map((m) => ({ value: String(m.id), label: m.name }))
  );
  if (current && !options.some((o) => o.value === String(current))) {
    options.push({ value: String(current), label: activity.event_lead_name ?? `Người dùng #${current}` });
  }
  return (
    <Select
      aria-label="Trưởng Ban Tổ chức"
      value={current ? String(current) : ''}
      options={options}
      onChange={(v) => session.set('event_lead_id', v ? Number(v) : null)}
    />
  );
};

const DateField: React.FC<{ label: string; field: string; value: string; invalid?: boolean; onChange: (v: string) => void }> = ({ label, field, value, invalid, onChange }) => (
  <input className="act-input" type="date" aria-label={label} data-edit-field={field} aria-invalid={invalid || undefined} value={value} onChange={(e) => onChange(e.target.value)} />
);

export const ActivityProperties: React.FC<Props> = ({ activity, teams, session, editable, invalid }) => {
  const status = getActivityStatusMeta(activity.status);
  const start = formatVnDate(activity.start_date);
  const range = start ? `${start} – ${formatVnDate(activity.deadline)}` : formatVnDate(activity.deadline);
  const canDates = editable.has('start_date') || editable.has('deadline');
  return (
    <section data-testid="section-info" className="act-card">
      <h2 className="act-card-title">Thông tin chung</h2>
      <dl className="act-dl">
        <Row label="Trạng thái"><Badge tone={STATUS_TONE[activity.status] ?? 'neutral'}>{status.label}</Badge></Row>
        <Row label="Ưu tiên">
          {editable.has('priority') ? (
            <Select aria-label="Ưu tiên" value={session.value('priority')} options={EDIT_PRIORITY_OPTIONS} onChange={(v) => session.set('priority', v)} />
          ) : (
            <>
              <PriorityIcon priority={priorityOf(activity.priority)} />
              <span>{priorityLabel(activity.priority)}</span>
            </>
          )}
        </Row>
        <Row label="Thời gian">
          {canDates ? (
            <>
              {editable.has('start_date') ? <DateField label="Ngày bắt đầu" field="start_date" value={session.value('start_date')} onChange={(v) => session.set('start_date', v)} /> : <span>{start || '—'}</span>}
              <span aria-hidden="true">–</span>
              {editable.has('deadline') ? <DateField label="Hạn chót" field="deadline" invalid={invalid?.includes('deadline')} value={session.value('deadline')} onChange={(v) => session.set('deadline', v)} /> : <span>{formatVnDate(activity.deadline)}</span>}
            </>
          ) : (
            range
          )}
        </Row>
        <Row label="Địa điểm">{activity.location || '—'}</Row>
        <Row label="Các Tổ">{teams.map((t) => t.name).join(', ') || activity.team_name || '—'}</Row>
        {editable.has('team_id') && <Row label="Tổ điều phối"><TeamSelect session={session} teams={teams} /></Row>}
        <Row label="Người tạo">{activity.creator_name || '—'}</Row>
        <Row label="Trưởng BTC">
          {editable.has('event_lead_id') ? <LeadSelect session={session} activity={activity} /> : activity.event_lead_name || '—'}
        </Row>
        <Row label="Đề án">
          {activity.proposal_document_url && isHttpUrl(activity.proposal_document_url) ? (
            <a href={activity.proposal_document_url} target="_blank" rel="noopener noreferrer">Mở link đề án</a>
          ) : (
            '—'
          )}
        </Row>
      </dl>
    </section>
  );
};

// web/src/core/features/activities/ActivityInfoSections.tsx
import React from 'react';
import { Badge, type BadgeTone } from '../../../ui';
import type { ActivityItem, ActivityParticipant, ActivityTeamRow, ProposalHistoryItem } from '../../api';
import { getActivityTypeLabel } from './activityLabels';
import { formatVnDate } from '../../../shared/utils/date';
import './activities.css';

export const Card: React.FC<{ title: string; testId: string; children: React.ReactNode }> = ({ title, testId, children }) => (
  <section data-testid={testId} className="act-card">
    <h2 className="act-card-title">{title}</h2>
    {children}
  </section>
);

export const Row: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="act-prop">
    <dt>{label}</dt>
    <dd>{children}</dd>
  </div>
);

export const STATUS_TONE: Record<string, BadgeTone> = {
  proposed: 'neutral',
  changes_requested: 'warning',
  approved: 'success',
  active: 'info',
  completed: 'success',
  cancelled: 'danger',
};

const TEAM_ROLE_LABELS: Record<string, string> = { primary: 'Chủ trì', supporting: 'Phối hợp' };
const DEFAULT_RESPONSIBILITY_LABELS: Record<string, string> = {
  'Coordinates the activity': 'Điều phối hoạt động',
  'Supports the activity': 'Hỗ trợ hoạt động',
};

export const ActivityTeamsCard: React.FC<{ teams: ActivityTeamRow[] }> = ({ teams }) => (
  <Card title="Tổ tham gia" testId="section-teams">
    {teams.length === 0 ? (
      <p className="act-muted">Chưa có Tổ nào.</p>
    ) : (
      <ul className="act-list">
        {teams.map((t) => (
          <li key={t.team_id} className="act-li">
            <div className="act-li-head">
              <strong>{t.name}</strong>
              <Badge tone={t.role === 'primary' ? 'info' : 'neutral'}>{TEAM_ROLE_LABELS[t.role] ?? t.role}</Badge>
            </div>
            {t.responsibility && <div className="act-muted">{DEFAULT_RESPONSIBILITY_LABELS[t.responsibility] ?? t.responsibility}</div>}
          </li>
        ))}
      </ul>
    )}
  </Card>
);

const PARTICIPANT_STATE_LABELS: Record<string, string> = {
  confirmed: 'Đã xác nhận',
  volunteered: 'Tình nguyện',
  declined: 'Từ chối',
};

export const ActivityParticipantsCard: React.FC<{ participants: ActivityParticipant[] }> = ({ participants }) => (
  <Card title="Người tham gia" testId="section-participants">
    {participants.length === 0 ? (
      <p className="act-muted">Chưa có người tham gia.</p>
    ) : (
      <ul className="act-list">
        {participants.map((p) => (
          <li key={p.user_id} className="act-li">
            <div className="act-li-head">
              <strong>{p.name}</strong>
              <Badge tone={p.state === 'confirmed' ? 'success' : 'neutral'}>{PARTICIPANT_STATE_LABELS[p.state] ?? p.state}</Badge>
            </div>
            {p.responsibility && <div className="act-muted">{p.responsibility}</div>}
          </li>
        ))}
      </ul>
    )}
  </Card>
);

export const ActivityDetailsCard: React.FC<{ activity: ActivityItem }> = ({ activity }) => (
  <Card title="Chi tiết hoạt động" testId="section-details">
    <dl className="act-dl">
      <Row label="Loại">{getActivityTypeLabel(activity.type) ?? '—'}</Row>
      {activity.type === 'assigned' && <Row label="Yêu cầu bởi">{activity.requested_by || '—'}</Row>}
      <Row label="Ngày tạo">{formatVnDate(activity.created_at) || '—'}</Row>
      <Row label="Cập nhật lần cuối">{formatVnDate(activity.updated_at) || '—'}</Row>
      {activity.result_summary && <Row label="Kết quả">{activity.result_summary}</Row>}
    </dl>
  </Card>
);

const PROPOSAL_ACTION_LABELS: Record<string, string> = {
  submit: 'Nộp đề án',
  approve: 'Duyệt',
  reject: 'Từ chối',
  request_changes: 'Yêu cầu sửa',
};

export const ProposalHistoryCard: React.FC<{ history: ProposalHistoryItem[] }> = ({ history }) => (
  <Card title="Lịch sử đề án" testId="section-history">
    {history.length === 0 ? (
      <p className="act-muted">Chưa có lịch sử.</p>
    ) : (
      <ul className="act-list">
        {history.map((h) => (
          <li key={h.id} className="act-li">
            <div className="act-li-head">
              <Badge tone={h.action === 'approve' ? 'success' : h.action === 'reject' ? 'danger' : 'neutral'}>
                {PROPOSAL_ACTION_LABELS[h.action] ?? h.action}
              </Badge>
              <span>{h.reviewer_name ? `${h.submitter_name ?? ''} → ${h.reviewer_name}` : h.submitter_name}</span>
              <span className="act-muted">{formatVnDate(h.created_at)}</span>
            </div>
            {h.feedback_notes && <div style={{ whiteSpace: 'pre-wrap' }}>{h.feedback_notes}</div>}
          </li>
        ))}
      </ul>
    )}
  </Card>
);

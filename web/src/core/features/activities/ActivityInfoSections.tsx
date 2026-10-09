// web/src/core/features/activities/ActivityInfoSections.tsx
import React from 'react';
import Lozenge from '@atlaskit/lozenge';
import { token } from '@atlaskit/tokens';
import type { ActivityItem, ActivityParticipant, ActivityTeamRow, ProposalHistoryItem } from '../../api';
import { getActivityStatusMeta, getActivityTypeLabel } from './activityLabels';
import { getTaskPriorityAppearance, getTaskPriorityLabel } from '../tasks/taskLabels';
import { formatVnDate } from '../../../shared/utils/date';
import { isHttpUrl } from '../../../shared/utils/url';

export const Card: React.FC<{ title: string; testId: string; children: React.ReactNode }> = ({ title, testId, children }) => (
  <section
    data-testid={testId}
    style={{
      border: `1px solid ${token('color.border', '#DFE1E6')}`,
      borderRadius: 6,
      padding: 16,
      marginBottom: 16,
      background: token('elevation.surface.raised', '#FFFFFF'),
    }}
  >
    <h2 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 600 }}>{title}</h2>
    {children}
  </section>
);

const Row: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div style={{ display: 'flex', gap: 8, padding: '4px 0', flexWrap: 'wrap' }}>
    <dt style={{ width: 130, flexShrink: 0, color: token('color.text.subtle', '#5E6C84') }}>{label}</dt>
    <dd style={{ margin: 0, minWidth: 0, overflowWrap: 'anywhere' }}>{children}</dd>
  </div>
);

const dateRange = (activity: ActivityItem): string => {
  const start = formatVnDate(activity.start_date);
  const end = formatVnDate(activity.deadline);
  return start ? `${start} – ${end}` : end;
};

export const ActivityHero: React.FC<{ activity: ActivityItem }> = ({ activity }) => {
  const status = getActivityStatusMeta(activity.status);
  return (
    <header style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
        <Lozenge appearance={status.appearance}>{status.label}</Lozenge>
        <Lozenge appearance={getTaskPriorityAppearance(activity.priority)}>{`Ưu tiên: ${getTaskPriorityLabel(activity.priority)}`}</Lozenge>
      </div>
      <h1 style={{ margin: '0 0 8px', fontSize: 24, fontWeight: 600, overflowWrap: 'anywhere' }}>{activity.title}</h1>
      {activity.description && <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{activity.description}</p>}
    </header>
  );
};

export const ActivityGeneralInfo: React.FC<{ activity: ActivityItem; teams: ActivityTeamRow[] }> = ({ activity, teams }) => (
  <Card title="Thông tin chung" testId="section-info">
    <dl style={{ margin: 0 }}>
      <Row label="Các Tổ">{teams.map((t) => t.name).join(', ') || activity.team_name || '—'}</Row>
      <Row label="Thời gian">{dateRange(activity)}</Row>
      <Row label="Địa điểm">{activity.location || '—'}</Row>
      <Row label="Người tạo">{activity.creator_name || '—'}</Row>
      <Row label="Trưởng BTC">{activity.event_lead_name || '—'}</Row>
      <Row label="Đề án">
        {activity.proposal_document_url && isHttpUrl(activity.proposal_document_url) ? (
          <a href={activity.proposal_document_url} target="_blank" rel="noopener noreferrer">
            Mở link đề án
          </a>
        ) : (
          '—'
        )}
      </Row>
    </dl>
  </Card>
);

const TEAM_ROLE_LABELS: Record<string, string> = { primary: 'Chủ trì', supporting: 'Phối hợp' };
const DEFAULT_RESPONSIBILITY_LABELS: Record<string, string> = {
  'Coordinates the activity': 'Điều phối hoạt động',
  'Supports the activity': 'Hỗ trợ hoạt động',
};

export const ActivityTeamsCard: React.FC<{ teams: ActivityTeamRow[] }> = ({ teams }) => (
  <Card title="Tổ tham gia" testId="section-teams">
    {teams.length === 0 ? (
      <p style={{ margin: 0 }}>Chưa có Tổ nào.</p>
    ) : (
      <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
        {teams.map((t) => (
          <li key={t.team_id} style={{ padding: '4px 0' }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <strong>{t.name}</strong>
              <Lozenge appearance={t.role === 'primary' ? 'inprogress' : 'default'}>{TEAM_ROLE_LABELS[t.role] ?? t.role}</Lozenge>
            </div>
            {t.responsibility && <div style={{ color: token('color.text.subtle', '#5E6C84') }}>{DEFAULT_RESPONSIBILITY_LABELS[t.responsibility] ?? t.responsibility}</div>}
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
      <p style={{ margin: 0 }}>Chưa có người tham gia.</p>
    ) : (
      <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
        {participants.map((p) => (
          <li key={p.user_id} style={{ padding: '4px 0' }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <strong>{p.name}</strong>
              <Lozenge appearance={p.state === 'confirmed' ? 'success' : 'default'}>{PARTICIPANT_STATE_LABELS[p.state] ?? p.state}</Lozenge>
            </div>
            {p.responsibility && <div style={{ color: token('color.text.subtle', '#5E6C84') }}>{p.responsibility}</div>}
          </li>
        ))}
      </ul>
    )}
  </Card>
);

export const ActivityDetailsCard: React.FC<{ activity: ActivityItem }> = ({ activity }) => (
  <Card title="Chi tiết hoạt động" testId="section-details">
    <dl style={{ margin: 0 }}>
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
      <p style={{ margin: 0 }}>Chưa có lịch sử.</p>
    ) : (
      <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
        {history.map((h) => (
          <li key={h.id} style={{ padding: '6px 0' }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <Lozenge appearance={h.action === 'approve' ? 'success' : h.action === 'reject' ? 'removed' : 'default'}>
                {PROPOSAL_ACTION_LABELS[h.action] ?? h.action}
              </Lozenge>
              <span>{h.reviewer_name ? `${h.submitter_name ?? ''} → ${h.reviewer_name}` : h.submitter_name}</span>
              <span style={{ color: token('color.text.subtle', '#5E6C84') }}>{formatVnDate(h.created_at)}</span>
            </div>
            {h.feedback_notes && <div style={{ whiteSpace: 'pre-wrap' }}>{h.feedback_notes}</div>}
          </li>
        ))}
      </ul>
    )}
  </Card>
);

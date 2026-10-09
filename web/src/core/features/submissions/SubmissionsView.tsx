import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import Button from '@atlaskit/button/new';
import { token } from '@atlaskit/tokens';
import { apiErrorMessage, fetchSubmissions } from '../../api';
import { LottieLoading } from '../../../shared/components/LottieLoading';
import { formatVnDate } from '../../../shared/utils/date';
import { SUBMISSIONS_KEY } from '../dieuhanh/queryKeys';
import { useDhActor } from '../dieuhanh/useDhActor';
import { canCreateSubmission } from '../dieuhanh/permissions';
import { sourceText, submissionStatus } from '../dieuhanh/labels';
import { ErrorText, FIELD_STYLE, StatusLozenge } from '../dieuhanh/parts';
import { CreateSubmissionModal } from './CreateSubmissionModal';

type Direction = 'all' | 'received' | 'sent';
const CELL: React.CSSProperties = { padding: '8px 12px', textAlign: 'left', borderBottom: `1px solid ${token('color.border', '#DFE1E6')}` };
const STATUS_FILTERS = [
  ['all', 'Tất cả'], ['pending', 'Chờ phản hồi'], ['seen', 'Đã xem'], ['accepted', 'Đã chấp nhận'],
  ['revision_requested', 'Yêu cầu sửa'], ['withdrawn', 'Đã rút lại'],
] as const;

export const SubmissionsView: React.FC = () => {
  const actor = useDhActor();
  const [direction, setDirection] = useState<Direction>('all');
  const [status, setStatus] = useState('all');
  const [creating, setCreating] = useState(false);
  const { data, isLoading, error } = useQuery({ queryKey: SUBMISSIONS_KEY, queryFn: fetchSubmissions });

  const rows = useMemo(() => (data ?? []).filter((s) => {
    if (direction === 'received' && s.to_unit_id !== actor.unitId) return false;
    if (direction === 'sent' && s.from_unit_id !== actor.unitId) return false;
    if (status === 'all') return true;
    if (status === 'withdrawn') return Boolean(s.withdrawn_at);
    if (s.withdrawn_at) return false;
    return status === 'pending' ? s.response === null : s.response === status;
  }), [data, direction, status, actor.unitId]);

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', paddingTop: 4 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
        <h1 style={{ margin: 0 }}>Trình</h1>
        {canCreateSubmission(actor) && <Button appearance="primary" onClick={() => setCreating(true)}>Trình lên</Button>}
      </div>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 16 }}>
        <div>
          <label htmlFor="sub-direction">Hướng</label>
          <select id="sub-direction" value={direction} onChange={(e) => setDirection(e.target.value as Direction)} style={FIELD_STYLE}>
            <option value="all">Tất cả</option>
            <option value="received">Nhận về</option>
            <option value="sent">Đơn vị mình gửi</option>
          </select>
        </div>
        <div>
          <label htmlFor="sub-status">Trạng thái</label>
          <select id="sub-status" value={status} onChange={(e) => setStatus(e.target.value)} style={FIELD_STYLE}>
            {STATUS_FILTERS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </div>
      </div>
      {isLoading && <LottieLoading message="Đang tải danh sách trình..." size={80} />}
      {error && <ErrorText message={apiErrorMessage(error, 'Không tải được danh sách trình.')} />}
      {!isLoading && !error && rows.length === 0 && <p>Chưa có trình nào.</p>}
      {rows.length > 0 && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>{['Nguồn', 'Đơn vị gửi', 'Đơn vị nhận', 'Ngày trình', 'Trạng thái'].map((h) => <th key={h} style={CELL}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {rows.map((s) => {
                const st = submissionStatus(s);
                return (
                  <tr key={s.id}>
                    <td style={CELL}><Link to={`/submission/${s.id}`}>{sourceText(s)}</Link></td>
                    <td style={CELL}>{s.from_unit_name ?? `Đơn vị #${s.from_unit_id}`}</td>
                    <td style={CELL}>{s.to_unit_name ?? `Đơn vị #${s.to_unit_id}`}</td>
                    <td style={CELL}>{formatVnDate(s.created_at)}</td>
                    <td style={CELL}><StatusLozenge label={st.label} tone={st.tone} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <CreateSubmissionModal isOpen={creating} onClose={() => setCreating(false)} />
    </div>
  );
};

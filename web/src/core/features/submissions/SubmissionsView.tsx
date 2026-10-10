import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Button, Select } from '../../../ui';
import { apiErrorMessage, fetchSubmissions } from '../../api';
import { formatVnDate } from '../../../shared/utils/date';
import { SUBMISSIONS_KEY } from '../dieuhanh/queryKeys';
import { useDhActor } from '../dieuhanh/useDhActor';
import { canCreateSubmission } from '../dieuhanh/permissions';
import { sourceText, submissionStatus } from '../dieuhanh/labels';
import { ErrorText, StatusLozenge } from '../dieuhanh/parts';
import { CreateSubmissionModal } from './CreateSubmissionModal';
import '../people/people.css';
import './submissions.css';

type Direction = 'all' | 'received' | 'sent';
const DIRECTION_OPTIONS = [
  { value: 'all', label: 'Tất cả' },
  { value: 'received', label: 'Nhận về' },
  { value: 'sent', label: 'Đơn vị mình gửi' },
];
const STATUS_OPTIONS = [
  { value: 'all', label: 'Tất cả' },
  { value: 'pending', label: 'Chờ phản hồi' },
  { value: 'seen', label: 'Đã xem' },
  { value: 'accepted', label: 'Đã chấp nhận' },
  { value: 'revision_requested', label: 'Yêu cầu sửa' },
  { value: 'withdrawn', label: 'Đã rút lại' },
];

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
    <div className="sub">
      <div className="ppl-head">
        <h1 className="ppl-h1">Trình</h1>
        {canCreateSubmission(actor) && <Button variant="primary" onClick={() => setCreating(true)}>Trình lên</Button>}
      </div>
      <div className="sub-filters">
        <div className="sub-filter">
          <label htmlFor="sub-direction">Hướng</label>
          <Select id="sub-direction" value={direction} onChange={(v) => setDirection(v as Direction)} options={DIRECTION_OPTIONS} />
        </div>
        <div className="sub-filter">
          <label htmlFor="sub-status">Trạng thái</label>
          <Select id="sub-status" value={status} onChange={setStatus} options={STATUS_OPTIONS} />
        </div>
      </div>
      {isLoading && <p role="status" className="ppl-state">Đang tải danh sách trình...</p>}
      {error && <ErrorText message={apiErrorMessage(error, 'Không tải được danh sách trình.')} />}
      {!isLoading && !error && rows.length === 0 && <p className="ppl-muted">Chưa có trình nào.</p>}
      {rows.length > 0 && (
        <div className="sub-table-wrap">
          <table className="sub-table">
            <thead>
              <tr>{['Nguồn', 'Đơn vị gửi', 'Đơn vị nhận', 'Ngày trình', 'Trạng thái'].map((h) => <th key={h}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {rows.map((s) => {
                const st = submissionStatus(s);
                return (
                  <tr key={s.id}>
                    <td><Link className="sub-title-link" to={`/submission/${s.id}`}>{sourceText(s)}</Link></td>
                    <td>{s.from_unit_name ?? `Đơn vị #${s.from_unit_id}`}</td>
                    <td>{s.to_unit_name ?? `Đơn vị #${s.to_unit_id}`}</td>
                    <td>{formatVnDate(s.created_at)}</td>
                    <td><StatusLozenge label={st.label} tone={st.tone} /></td>
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

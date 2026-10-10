import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Button, Select } from '../../../ui';
import { apiErrorMessage, fetchDirectives } from '../../api';
import { formatVnDate } from '../../../shared/utils/date';
import { DIRECTIVES_KEY } from '../dieuhanh/queryKeys';
import { useDhActor } from '../dieuhanh/useDhActor';
import { canCreateDirective } from '../dieuhanh/permissions';
import { DIRECTIVE_STATUS, directiveStatus } from '../dieuhanh/labels';
import { ErrorLine, StatusBadge } from './dirKit';
import './directives.css';
import { CreateDirectiveModal } from './CreateDirectiveModal';

type Direction = 'all' | 'received' | 'sent';
const DIRECTION_OPTIONS = [
  { value: 'all', label: 'Tất cả' },
  { value: 'received', label: 'Nhận về' },
  { value: 'sent', label: 'Đơn vị mình gửi' },
];
const STATUS_OPTIONS = [
  { value: 'all', label: 'Tất cả' },
  ...Object.entries(DIRECTIVE_STATUS).map(([value, { label }]) => ({ value, label })),
];

export const DirectivesView: React.FC = () => {
  const actor = useDhActor();
  const [direction, setDirection] = useState<Direction>('all');
  const [status, setStatus] = useState('all');
  const [creating, setCreating] = useState(false);
  const { data, isLoading, error } = useQuery({ queryKey: DIRECTIVES_KEY, queryFn: fetchDirectives });

  const rows = useMemo(() => (data ?? []).filter((d) => {
    if (direction === 'received' && d.to_unit_id !== actor.unitId) return false;
    if (direction === 'sent' && d.from_unit_id !== actor.unitId) return false;
    return status === 'all' || d.status === status;
  }), [data, direction, status, actor.unitId]);

  return (
    <div className="dir">
      <div className="ppl-head">
        <h1 className="ppl-h1">Giao việc</h1>
        {canCreateDirective(actor) && <Button variant="primary" onClick={() => setCreating(true)}>Giao việc mới</Button>}
      </div>
      <div className="dir-filters">
        <div className="dir-filter">
          <label htmlFor="dir-direction">Hướng</label>
          <Select id="dir-direction" value={direction} onChange={(v) => setDirection(v as Direction)} options={DIRECTION_OPTIONS} />
        </div>
        <div className="dir-filter">
          <label htmlFor="dir-status">Trạng thái</label>
          <Select id="dir-status" value={status} onChange={setStatus} options={STATUS_OPTIONS} />
        </div>
      </div>
      {isLoading && <p role="status" className="ppl-state">Đang tải chỉ đạo...</p>}
      {error && <ErrorLine message={apiErrorMessage(error, 'Không tải được danh sách chỉ đạo.')} />}
      {!isLoading && !error && rows.length === 0 && <p className="ppl-muted">Chưa có chỉ đạo nào.</p>}
      {rows.length > 0 && (
        <div className="dir-table-wrap">
          <table className="dir-table">
            <thead>
              <tr>{['Tiêu đề', 'Đơn vị giao', 'Đơn vị nhận', 'Hạn', 'Trạng thái'].map((h) => <th key={h}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {rows.map((d) => {
                const s = directiveStatus(d.status);
                return (
                  <tr key={d.id}>
                    <td><Link className="dir-title-link" to={`/directive/${d.id}`}>{d.title}</Link></td>
                    <td>{d.from_unit_name ?? `Đơn vị #${d.from_unit_id}`}</td>
                    <td>{d.to_unit_name ?? `Đơn vị #${d.to_unit_id}`}</td>
                    <td>{formatVnDate(d.deadline) || '—'}</td>
                    <td><StatusBadge label={s.label} tone={s.tone} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <CreateDirectiveModal isOpen={creating} onClose={() => setCreating(false)} />
    </div>
  );
};

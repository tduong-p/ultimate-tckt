import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import Button from '@atlaskit/button/new';
import { token } from '@atlaskit/tokens';
import { apiErrorMessage, fetchDirectives } from '../../api';
import { LottieLoading } from '../../../shared/components/LottieLoading';
import { formatVnDate } from '../../../shared/utils/date';
import { DIRECTIVES_KEY } from '../dieuhanh/queryKeys';
import { useDhActor } from '../dieuhanh/useDhActor';
import { canCreateDirective } from '../dieuhanh/permissions';
import { DIRECTIVE_STATUS, directiveStatus } from '../dieuhanh/labels';
import { ErrorText, FIELD_STYLE, StatusLozenge } from '../dieuhanh/parts';
import { CreateDirectiveModal } from './CreateDirectiveModal';

type Direction = 'all' | 'received' | 'sent';
const CELL: React.CSSProperties = { padding: '8px 12px', textAlign: 'left', borderBottom: `1px solid ${token('color.border', '#DFE1E6')}` };

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
    <div style={{ maxWidth: 1200, margin: '0 auto', paddingTop: 4 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
        <h1 style={{ margin: 0 }}>Giao việc</h1>
        {canCreateDirective(actor) && <Button appearance="primary" onClick={() => setCreating(true)}>Giao việc mới</Button>}
      </div>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 16 }}>
        <div>
          <label htmlFor="dir-direction">Hướng</label>
          <select id="dir-direction" value={direction} onChange={(e) => setDirection(e.target.value as Direction)} style={FIELD_STYLE}>
            <option value="all">Tất cả</option>
            <option value="received">Nhận về</option>
            <option value="sent">Đơn vị mình gửi</option>
          </select>
        </div>
        <div>
          <label htmlFor="dir-status">Trạng thái</label>
          <select id="dir-status" value={status} onChange={(e) => setStatus(e.target.value)} style={FIELD_STYLE}>
            <option value="all">Tất cả</option>
            {Object.entries(DIRECTIVE_STATUS).map(([value, { label }]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </div>
      </div>
      {isLoading && <LottieLoading message="Đang tải chỉ đạo..." size={80} />}
      {error && <ErrorText message={apiErrorMessage(error, 'Không tải được danh sách chỉ đạo.')} />}
      {!isLoading && !error && rows.length === 0 && <p>Chưa có chỉ đạo nào.</p>}
      {rows.length > 0 && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>{['Tiêu đề', 'Đơn vị giao', 'Đơn vị nhận', 'Hạn', 'Trạng thái'].map((h) => <th key={h} style={CELL}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {rows.map((d) => {
                const s = directiveStatus(d.status);
                return (
                  <tr key={d.id}>
                    <td style={CELL}><Link to={`/directive/${d.id}`}>{d.title}</Link></td>
                    <td style={CELL}>{d.from_unit_name ?? `Đơn vị #${d.from_unit_id}`}</td>
                    <td style={CELL}>{d.to_unit_name ?? `Đơn vị #${d.to_unit_id}`}</td>
                    <td style={CELL}>{formatVnDate(d.deadline) || '—'}</td>
                    <td style={CELL}><StatusLozenge label={s.label} tone={s.tone} /></td>
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

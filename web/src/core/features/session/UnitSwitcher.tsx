import React, { useId } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { token } from '@atlaskit/tokens';
import { apiErrorMessage, switchUnit, type SessionData } from '../../api';
import { useCapabilities } from '../../capabilities';
import { SESSION_KEY } from '../../queryKeys';
import { useToast } from '../../../shared/components/Toast';

/** Chỉ hiện khi người dùng thuộc từ 2 đơn vị trở lên. Đổi xong thì bỏ mọi dữ liệu của đơn vị cũ. */
export const UnitSwitcher: React.FC = () => {
  const id = useId();
  const { unit, memberships } = useCapabilities();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const toast = useToast();

  const mutation = useMutation({
    mutationFn: (unitId: number) => switchUnit(unitId),
    onSuccess: (session: SessionData) => {
      queryClient.setQueryData(SESSION_KEY, session);
      queryClient.resetQueries({ predicate: (q) => q.queryKey[0] !== SESSION_KEY[0] });
      navigate('/dashboard');
      toast.success(`Đã chuyển sang ${session.units?.current?.name ?? 'đơn vị mới'}`);
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Không đổi được đơn vị.')),
  });

  if (memberships.length < 2) return null;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <label htmlFor={id} style={{ fontSize: 12 }}>Đơn vị</label>
      <select id={id} value={unit?.id ?? ''} disabled={mutation.isPending}
        onChange={(e) => { const next = Number(e.target.value); if (next && next !== unit?.id) mutation.mutate(next); }}
        style={{ padding: '4px 6px', borderRadius: 4, border: `1px solid ${token('color.border', '#DFE1E6')}`, background: token('elevation.surface', '#fff'), color: token('color.text', '#172B4D'), maxWidth: 180 }}>
        {!unit && <option value="" disabled>Chọn đơn vị</option>}
        {memberships.map((m) => <option key={m.unit_id} value={m.unit_id}>{m.name}</option>)}
      </select>
    </div>
  );
};

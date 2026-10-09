import React, { useState } from 'react';
import { token } from '@atlaskit/tokens';
import Button from '@atlaskit/button/new';
import InboxIcon from '@atlaskit/icon/core/inbox';
import { useQuery } from '@tanstack/react-query';
import { fetchTeams, type TeamItem } from '../../api';
import { useCapabilities } from '../../capabilities';
import { TEAMS_KEY } from '../../queryKeys';
import { LottieLoading } from '../../../shared/components/LottieLoading';
import { ConfirmDialog } from '../../../shared/components/ConfirmDialog';
import { TeamCard } from './TeamCard';
import { TeamFormModal } from './TeamFormModal';
import { useDeleteTeam } from './useDeleteTeam';

export const TeamsView: React.FC = () => {
  const caps = useCapabilities();
  const { data: teams, isLoading, isError } = useQuery({ queryKey: TEAMS_KEY, queryFn: fetchTeams });
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<TeamItem | null>(null);
  const [managing, setManaging] = useState<TeamItem | null>(null);
  const [deleting, setDeleting] = useState<TeamItem | null>(null);
  const deleteMutation = useDeleteTeam(() => setDeleting(null));

  if (isError) {
    return <div style={{ color: token('color.text.danger', '#DE350B'), padding: 16 }}>Lỗi tải dữ liệu Tổ</div>;
  }

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', paddingTop: 4 }}>
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 600, color: token('color.text', '#172B4D'), letterSpacing: '-0.2px' }}>Tổ</h1>
          <p style={{ margin: '6px 0 0 0', fontSize: 14, color: token('color.text.subtle', '#5E6C84') }}>
            Những con người và đơn vị cùng tạo nên các hoạt động.
          </p>
        </div>
        {caps.isExec && <Button appearance="primary" onClick={() => setCreating(true)}>Tạo Tổ</Button>}
      </div>

      {isLoading ? (
        <LottieLoading message="Đang tải danh sách tổ..." size={140} />
      ) : !teams || teams.length === 0 ? (
        <div style={{ backgroundColor: token('elevation.surface.raised', '#FFFFFF'), border: `1px solid ${token('color.border', '#DFE1E6')}`, borderRadius: 6, padding: '48px 24px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <div style={{ color: token('color.icon.subtle', '#6B778C') }}><InboxIcon label="" /></div>
          <div style={{ fontSize: 16, fontWeight: 600, color: token('color.text', '#172B4D') }}>Chưa có tổ nào</div>
          <p style={{ margin: 0, fontSize: 14, color: token('color.text.subtle', '#5E6C84') }}>Danh sách tổ hiện tại đang trống.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 20 }}>
          {teams.map((team) => (
            <TeamCard
              key={team.id}
              team={team}
              canManage={caps.isManager && (caps.canManageTeam(team.id) || Boolean(team.can_manage))}
              canDelete={caps.isExec}
              onEdit={() => setEditing(team)}
              onMembers={() => setManaging(team)}
              onDelete={() => setDeleting(team)}
            />
          ))}
        </div>
      )}

      <TeamFormModal isOpen={creating} onClose={() => setCreating(false)} />
      <TeamFormModal isOpen={editing !== null} team={editing} onClose={() => setEditing(null)} />
      <ConfirmDialog
        isOpen={deleting !== null}
        title={`Xoá Tổ ${deleting?.name ?? ''}`}
        appearance="danger"
        confirmLabel="Xoá Tổ"
        isLoading={deleteMutation.isPending}
        onConfirm={() => deleting && deleteMutation.mutate(deleting.id)}
        onCancel={() => setDeleting(null)}
      >
        <p>Tổ sẽ bị xoá nếu không còn dữ liệu liên quan, nếu còn thì được lưu trữ. Không thể hoàn tác.</p>
      </ConfirmDialog>
      {managing && null}
    </div>
  );
};

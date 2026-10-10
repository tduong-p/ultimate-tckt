import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '../../../ui';
import { fetchTeams, type TeamItem } from '../../api';
import { useCapabilities } from '../../capabilities';
import { TEAMS_KEY } from '../../queryKeys';
import { PeopleConfirmDialog } from '../people/peopleKit';
import { TeamCard } from './TeamCard';
import { TeamFormModal } from './TeamFormModal';
import { TeamMembersModal } from './TeamMembersModal';
import { useDeleteTeam } from './useDeleteTeam';
import './teams.css';

export const TeamsView: React.FC = () => {
  const caps = useCapabilities();
  const { data: teams, isLoading, isError } = useQuery({ queryKey: TEAMS_KEY, queryFn: fetchTeams });
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<TeamItem | null>(null);
  const [managing, setManaging] = useState<TeamItem | null>(null);
  const [deleting, setDeleting] = useState<TeamItem | null>(null);
  const deleteMutation = useDeleteTeam(() => setDeleting(null));

  if (isError) return <p className="ppl-state ppl-state--error">Lỗi tải dữ liệu Tổ</p>;

  return (
    <div className="team">
      <div className="ppl-head">
        <div>
          <h1 className="ppl-h1">Tổ</h1>
          <p className="ppl-sub">Những con người và đơn vị cùng tạo nên các hoạt động.</p>
        </div>
        {caps.isExec && <Button variant="primary" onClick={() => setCreating(true)}>Tạo Tổ</Button>}
      </div>

      {isLoading ? (
        <p className="ppl-state" role="status">Đang tải danh sách tổ...</p>
      ) : !teams || teams.length === 0 ? (
        <div className="ppl-empty">
          <div className="ppl-empty-title">Chưa có tổ nào</div>
          <p className="ppl-empty-text">Danh sách tổ hiện tại đang trống.</p>
        </div>
      ) : (
        <div className="team-grid">
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
      <PeopleConfirmDialog
        open={deleting !== null}
        title={`Xoá Tổ ${deleting?.name ?? ''}`}
        danger
        confirmLabel="Xoá Tổ"
        loading={deleteMutation.isPending}
        onConfirm={() => deleting && deleteMutation.mutate(deleting.id)}
        onCancel={() => setDeleting(null)}
      >
        <p>Tổ sẽ bị xoá nếu không còn dữ liệu liên quan, nếu còn thì được lưu trữ. Không thể hoàn tác.</p>
      </PeopleConfirmDialog>
      {managing && <TeamMembersModal teamId={managing.id} teamName={managing.name} onClose={() => setManaging(null)} />}
    </div>
  );
};

import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Badge, Button, Select, type BadgeTone } from '../../../ui';
import { fetchMembers, fetchTeams, type MemberItem, type TeamItem } from '../../api';
import { MEMBERS_KEY, TEAMS_KEY } from '../../queryKeys';
import { useCapabilities } from '../../capabilities';
import { useCurrentUser } from '../people/useCurrentUser';
import { getRoleLabel } from '../people/roleLabels';
import { CreateAccountModal } from './CreateAccountModal';
import { EditAccountModal } from './EditAccountModal';
import { DeleteAccountDialog } from './DeleteAccountDialog';
import '../people/people.css';
import './members.css';

const getInitials = (name?: string): string => {
  if (!name) return '??';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return parts.slice(-2).map((p) => p[0]).join('').toUpperCase();
};

const roleTone = (role?: string): BadgeTone => {
  switch (role) {
    case 'admin':
    case 'vice_admin':
      return 'warning';
    case 'leader':
    case 'Tổ Trưởng':
    case 'vice_leader':
    case 'Tổ Phó':
      return 'info';
    default:
      return 'neutral';
  }
};

const ROLE_OPTIONS = [
  { label: 'Tất cả vai trò', value: 'all' },
  { label: 'Tổ Trưởng', value: 'leader' },
  { label: 'Tổ Phó', value: 'vice_leader' },
  { label: 'Thành Viên', value: 'member' },
  { label: 'Trưởng Ban TCKT', value: 'admin' },
  { label: 'Phó Ban TCKT', value: 'vice_admin' },
];

export const MembersView: React.FC = () => {
  const caps = useCapabilities();
  const me = useCurrentUser();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<MemberItem | null>(null);
  const [deleting, setDeleting] = useState<MemberItem | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [teamFilter, setTeamFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');

  const { data: members, isLoading: isLoadingMembers, isError: isErrorMembers } = useQuery({
    queryKey: MEMBERS_KEY,
    queryFn: fetchMembers,
  });
  const { data: teams, isError: isErrorTeams } = useQuery({ queryKey: TEAMS_KEY, queryFn: fetchTeams });

  const teamOptions = useMemo(
    () => [
      { label: 'Tất cả các Tổ', value: 'all' },
      ...(teams ?? []).map((t: TeamItem) => ({ label: t.name, value: String(t.id) })),
    ],
    [teams]
  );

  const filteredMembers = useMemo(() => {
    if (!members) return [];
    return members.filter((member: MemberItem) => {
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch = !q || member.name?.toLowerCase().includes(q) || member.email?.toLowerCase().includes(q);

      const matchesRole =
        roleFilter === 'all' ||
        member.role === roleFilter ||
        getRoleLabel(member.role) === roleFilter ||
        (roleFilter === 'leader' && (member.role === 'leader' || member.role === 'Tổ Trưởng')) ||
        (roleFilter === 'vice_leader' && (member.role === 'vice_leader' || member.role === 'Tổ Phó')) ||
        (roleFilter === 'member' && (member.role === 'member' || member.role === 'Thành Viên'));

      let matchesTeam = true;
      if (teamFilter !== 'all') {
        const teamIds = (member.team_ids ? String(member.team_ids).split(',') : []).map((s) => s.trim());
        const selectedTeam = teams?.find((t) => String(t.id) === String(teamFilter));
        const selectedTeamName = selectedTeam?.name.toLowerCase();
        const legacyTeam = (member as { team?: string }).team;

        matchesTeam =
          teamIds.includes(String(teamFilter)) ||
          Boolean(selectedTeamName && member.teams?.toLowerCase().includes(selectedTeamName)) ||
          Boolean(member.teams?.toLowerCase().includes(teamFilter.toLowerCase())) ||
          Boolean(legacyTeam?.toLowerCase().includes(teamFilter.toLowerCase()));
      }

      return matchesSearch && matchesRole && matchesTeam;
    });
  }, [members, teams, searchQuery, roleFilter, teamFilter]);

  if (isErrorMembers || isErrorTeams) return <p className="ppl-state ppl-state--error">Lỗi tải dữ liệu thành viên</p>;

  return (
    <div className="mem">
      <div className="ppl-head">
        <div>
          <h1 className="ppl-h1">Thành viên</h1>
          <p className="ppl-sub">Ghi nhận sự tham gia của từng thành viên.</p>
        </div>
        {caps.isManager && <Button variant="primary" onClick={() => setCreating(true)}>Tạo tài khoản</Button>}
      </div>

      <div className="mem-filters">
        <input
          type="text"
          className="ppl-input mem-search"
          aria-label="Tìm thành viên"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Tìm thành viên..."
        />
        <Select aria-label="Lọc theo Tổ" value={teamFilter} onChange={setTeamFilter} options={teamOptions} />
        <Select aria-label="Lọc theo vai trò" value={roleFilter} onChange={setRoleFilter} options={ROLE_OPTIONS} />
      </div>

      {isLoadingMembers ? (
        <p className="ppl-state" role="status">Đang tải danh sách thành viên...</p>
      ) : filteredMembers.length === 0 ? (
        <div className="ppl-empty">
          <div className="ppl-empty-title">Không tìm thấy thành viên</div>
          <p className="ppl-empty-text">
            {searchQuery || teamFilter !== 'all' || roleFilter !== 'all'
              ? 'Không tìm thấy thành viên phù hợp với tiêu chí tìm kiếm hoặc bộ lọc hiện tại.'
              : 'Chưa có thành viên nào trong đơn vị.'}
          </p>
        </div>
      ) : (
        <ul className="mem-list">
          {filteredMembers.map((member: MemberItem) => {
            const legacy = member as { avatarColor?: string; initials?: string; team?: string; completedTasks?: number; canManage?: boolean };
            // Màu đại diện do người dùng chọn nên là dữ liệu, đặt inline.
            const avatarColor = member.avatar_color || legacy.avatarColor || '#6366f1';
            const initials = legacy.initials || getInitials(member.name);
            const teamName = member.teams || legacy.team || 'Chung';
            const completedTasks = member.completed_tasks ?? legacy.completedTasks ?? 0;
            const canManage = caps.isManager && Boolean(member.can_manage ?? legacy.canManage);

            return (
              <li key={member.id} className="mem-row">
                <span className="mem-avatar" aria-hidden="true" style={{ backgroundColor: avatarColor }}>{initials}</span>
                <div className="mem-main">
                  <span className="mem-name">{member.name}</span>
                  <span className="mem-meta">
                    <a href={`mailto:${member.email}`}>{member.email}</a> · {teamName}
                  </span>
                </div>
                <Badge tone={roleTone(member.role)}>{getRoleLabel(member.role)}</Badge>
                <span className="mem-done"><strong>{completedTasks}</strong> công việc đã hoàn thành</span>
                {canManage && (
                  <div className="mem-actions">
                    <Button size="sm" aria-label={`Sửa ${member.name}`} onClick={() => setEditing(member)}>Sửa</Button>
                    {member.id !== me?.id && (
                      <Button size="sm" variant="danger" aria-label={`Xoá ${member.name}`} onClick={() => setDeleting(member)}>Xoá</Button>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <CreateAccountModal isOpen={creating} onClose={() => setCreating(false)} />
      <EditAccountModal member={editing} onClose={() => setEditing(null)} />
      <DeleteAccountDialog member={deleting} onClose={() => setDeleting(null)} />
    </div>
  );
};

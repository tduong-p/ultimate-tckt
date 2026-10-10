import React, { useState, useMemo } from 'react';
import { token } from '@atlaskit/tokens';
import Select from '@atlaskit/select';
import Button from '@atlaskit/button/new';
import { LottieLoading } from '../../../shared/components/LottieLoading';
import InboxIcon from '@atlaskit/icon/core/inbox';
import { useQuery } from '@tanstack/react-query';
import { fetchMembers, fetchTeams, type MemberItem, type TeamItem } from '../../api';
import { MEMBERS_KEY, TEAMS_KEY } from '../../queryKeys';
import { useCapabilities } from '../../capabilities';
import { useCurrentUser } from '../people/useCurrentUser';
import { getRoleLabel, getRoleStyle } from '../people/roleLabels';
import { CreateAccountModal } from './CreateAccountModal';
import { EditAccountModal } from './EditAccountModal';
import { DeleteAccountDialog } from './DeleteAccountDialog';

const getInitials = (name?: string): string => {
  if (!name) return '??';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return parts.slice(-2).map((p) => p[0]).join('').toUpperCase();
};

const actionButtonStyle: React.CSSProperties = {
  padding: '2px 10px',
  fontSize: '11px',
  border: `1px solid ${token('color.border', '#DFE1E6')}`,
  borderRadius: '3px',
  backgroundColor: token('elevation.surface', '#FFFFFF'),
  cursor: 'pointer',
  color: token('color.text', '#172B4D'),
};

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

  const { data: teams, isError: isErrorTeams } = useQuery({
    queryKey: TEAMS_KEY,
    queryFn: fetchTeams,
  });

  const teamOptions = useMemo(() => {
    const options = [{ label: 'Tất cả các Tổ', value: 'all' }];
    if (teams) {
      teams.forEach((t: TeamItem) => {
        options.push({ label: t.name, value: String(t.id) });
      });
    }
    return options;
  }, [teams]);

  const roleOptions = [
    { label: 'Tất cả vai trò', value: 'all' },
    { label: 'Tổ Trưởng', value: 'leader' },
    { label: 'Tổ Phó', value: 'vice_leader' },
    { label: 'Thành Viên', value: 'member' },
    { label: 'Trưởng Ban TCKT', value: 'admin' },
    { label: 'Phó Ban TCKT', value: 'vice_admin' },
  ];

  const filteredMembers = useMemo(() => {
    if (!members) return [];
    return members.filter((member: MemberItem) => {
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        member.name?.toLowerCase().includes(q) ||
        member.email?.toLowerCase().includes(q);

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

        matchesTeam =
          teamIds.includes(String(teamFilter)) ||
          Boolean(selectedTeamName && member.teams?.toLowerCase().includes(selectedTeamName)) ||
          Boolean(member.teams?.toLowerCase().includes(teamFilter.toLowerCase())) ||
          Boolean((member as any).team?.toLowerCase().includes(teamFilter.toLowerCase()));
      }

      return matchesSearch && matchesRole && matchesTeam;
    });
  }, [members, teams, searchQuery, roleFilter, teamFilter]);

  if (isErrorMembers || isErrorTeams) {
    return (
      <div style={{ color: token('color.text.danger', '#DE350B'), padding: '16px' }}>
        Lỗi tải dữ liệu thành viên
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', paddingTop: '4px' }}>
      {/* Page Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '12px',
          marginBottom: '24px',
        }}
      >
        <div>
          <h1
            style={{
              margin: 0,
              fontSize: '24px',
              fontWeight: 600,
              color: token('color.text', '#172B4D'),
              letterSpacing: '-0.2px',
            }}
          >
            Thành viên
          </h1>
          <p
            style={{
              margin: '6px 0 0 0',
              fontSize: '14px',
              color: token('color.text.subtle', '#5E6C84'),
            }}
          >
            Ghi nhận sự tham gia của từng thành viên.
          </p>
        </div>
        {caps.isManager && (
          <Button appearance="primary" onClick={() => setCreating(true)}>
            Tạo tài khoản
          </Button>
        )}
      </div>

      {/* Toolbar: Search & Filters */}
      <div
        style={{
          display: 'flex',
          gap: '12px',
          alignItems: 'center',
          marginBottom: '24px',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ flex: '1 1 260px' }}>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm thành viên..."
            style={{
              width: '100%',
              height: '38px',
              padding: '0 12px',
              border: `1px solid ${token('color.border', '#DFE1E6')}`,
              borderRadius: '4px',
              fontSize: '14px',
              color: token('color.text', '#172B4D'),
              backgroundColor: token('elevation.surface', '#FFFFFF'),
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        <div className="mobile-w-full" style={{ width: '220px' }}>
          <Select
            defaultValue={{ label: 'Tất cả các Tổ', value: 'all' }}
            options={teamOptions}
            onChange={(opt: any) => setTeamFilter(opt?.value || 'all')}
          />
        </div>

        <div className="mobile-w-full" style={{ width: '180px' }}>
          <Select
            defaultValue={{ label: 'Tất cả vai trò', value: 'all' }}
            options={roleOptions}
            onChange={(opt: any) => setRoleFilter(opt?.value || 'all')}
          />
        </div>
      </div>

      {/* Members Grid or Empty State */}
      {isLoadingMembers ? (
        <LottieLoading message="Đang tải danh sách thành viên..." size={140} />
      ) : filteredMembers.length === 0 ? (
        <div
          style={{
            backgroundColor: token('elevation.surface.raised', '#FFFFFF'),
            border: `1px solid ${token('color.border', '#DFE1E6')}`,
            borderRadius: '6px',
            padding: '48px 24px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
          }}
        >
          <div style={{ color: token('color.icon.subtle', '#6B778C') }}>
            <InboxIcon label="" />
          </div>
          <div
            style={{
              fontSize: '16px',
              fontWeight: 600,
              color: token('color.text', '#172B4D'),
            }}
          >
            Không tìm thấy thành viên
          </div>
          <p
            style={{
              margin: 0,
              fontSize: '14px',
              color: token('color.text.subtle', '#5E6C84'),
              maxWidth: '440px',
              lineHeight: '1.4',
            }}
          >
            {searchQuery || teamFilter !== 'all' || roleFilter !== 'all'
              ? 'Không tìm thấy thành viên phù hợp với tiêu chí tìm kiếm hoặc bộ lọc hiện tại.'
              : 'Chưa có thành viên nào trong đơn vị.'}
          </p>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 300px), 1fr))',
            gap: '16px',
          }}
        >
          {filteredMembers.map((member: MemberItem) => {
            const roleStyle = getRoleStyle(member.role);
            const roleLabel = getRoleLabel(member.role);
            const avatarColor = member.avatar_color || (member as any).avatarColor || '#0052CC';
            const initials = (member as any).initials || getInitials(member.name);
            const teamName = member.teams || (member as any).team || 'Chung';
            const completedTasks = member.completed_tasks ?? (member as any).completedTasks ?? 0;
            const canManage = caps.isManager && Boolean(member.can_manage ?? (member as any).canManage);

            return (
              <div
                key={member.id}
                style={{
                  backgroundColor: token('elevation.surface.raised', '#FFFFFF'),
                  border: `1px solid ${token('color.border', '#DFE1E6')}`,
                  borderRadius: '4px',
                  padding: '16px',
                  boxShadow: token(
                    'elevation.shadow.raised',
                    '0 1px 1px rgba(9, 30, 66, 0.25), 0 0 1px rgba(9, 30, 66, 0.31)'
                  ),
                  display: 'flex',
                  gap: '14px',
                  alignItems: 'flex-start',
                }}
              >
                {/* Avatar Initials */}
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '50%',
                    backgroundColor: avatarColor,
                    color: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '13px',
                    fontWeight: 700,
                    flexShrink: 0,
                  }}
                >
                  {initials}
                </div>

                {/* Info Details */}
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div
                    style={{
                      fontSize: '14px',
                      fontWeight: 600,
                      color: token('color.text', '#172B4D'),
                      marginBottom: '4px',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {member.name}
                  </div>

                  {/* Role Pill & Team */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '6px',
                      marginBottom: '6px',
                      fontSize: '11px',
                    }}
                  >
                    <span
                      style={{
                        backgroundColor: roleStyle.bg,
                        color: roleStyle.color,
                        padding: '1px 8px',
                        borderRadius: '10px',
                        fontWeight: 600,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <span style={{ color: roleStyle.dot }}>•</span>
                      {roleLabel}
                    </span>
                    <span style={{ color: token('color.text.subtle', '#5E6C84') }}>
                      · {teamName}
                    </span>
                  </div>

                  {/* Task Stats */}
                  <div
                    style={{
                      fontSize: '12px',
                      color: token('color.text.subtle', '#5E6C84'),
                      marginBottom: '6px',
                    }}
                  >
                    <strong style={{ color: token('color.text', '#172B4D') }}>
                      {completedTasks}
                    </strong>{' '}
                    công việc đã hoàn thành
                  </div>

                  {/* Email */}
                  <div style={{ fontSize: '12px', marginBottom: canManage ? '10px' : '0' }}>
                    <a
                      href={`mailto:${member.email}`}
                      style={{
                        color: token('color.link', '#0052CC'),
                        textDecoration: 'none',
                      }}
                    >
                      {member.email}
                    </a>
                  </div>

                  {/* Actions (Sửa, Xóa) */}
                  {canManage && (
                    <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                      <button
                        type="button"
                        aria-label={`Sửa ${member.name}`}
                        onClick={() => setEditing(member)}
                        style={actionButtonStyle}
                      >
                        Sửa
                      </button>
                      {member.id !== me?.id && (
                        <button
                          type="button"
                          aria-label={`Xoá ${member.name}`}
                          onClick={() => setDeleting(member)}
                          style={actionButtonStyle}
                        >
                          Xoá
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <CreateAccountModal isOpen={creating} onClose={() => setCreating(false)} />
      <EditAccountModal member={editing} onClose={() => setEditing(null)} />
      <DeleteAccountDialog member={deleting} onClose={() => setDeleting(null)} />
    </div>
  );
};

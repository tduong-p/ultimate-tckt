import React, { useState, useMemo } from 'react';
import { token } from '@atlaskit/tokens';
import Button from '@atlaskit/button/new';
import Select from '@atlaskit/select';
import Spinner from '@atlaskit/spinner';
import InboxIcon from '@atlaskit/icon/core/inbox';
import {
  useQuery,
  QueryClient,
  QueryClientProvider,
  QueryClientContext,
} from '@tanstack/react-query';
import { fetchMembers, fetchTeams, type MemberItem, type TeamItem } from '../../api';

const getInitials = (name?: string): string => {
  if (!name) return '??';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return parts.slice(-2).map((p) => p[0]).join('').toUpperCase();
};

const getRoleLabel = (role?: string): string => {
  switch (role) {
    case 'admin':
      return 'Trưởng Ban TCKT';
    case 'vice_admin':
      return 'Phó Ban TCKT';
    case 'leader':
    case 'Tổ Trưởng':
      return 'Tổ Trưởng';
    case 'vice_leader':
    case 'Tổ Phó':
      return 'Tổ Phó';
    case 'member':
    case 'Thành Viên':
    default:
      return 'Thành Viên';
  }
};

const getRoleStyle = (role?: string) => {
  switch (role) {
    case 'admin':
    case 'vice_admin':
      return {
        bg: '#FFE380',
        color: '#172B4D',
        dot: '#FF8B00',
      };
    case 'leader':
    case 'Tổ Trưởng':
      return {
        bg: '#FFF0B3',
        color: '#825800',
        dot: '#FFAB00',
      };
    case 'vice_leader':
    case 'Tổ Phó':
      return {
        bg: '#DEEBFF',
        color: '#0747A6',
        dot: '#0052CC',
      };
    case 'member':
    case 'Thành Viên':
    default:
      return {
        bg: '#F4F5F7',
        color: '#42526E',
        dot: '#6B778C',
      };
  }
};

export const MembersViewContent: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [teamFilter, setTeamFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');

  const { data: members, isLoading: isLoadingMembers } = useQuery({
    queryKey: ['members'],
    queryFn: fetchMembers,
  });

  const { data: teams } = useQuery({
    queryKey: ['teams'],
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

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', paddingTop: '4px' }}>
      {/* Page Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
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
            Recognize every member's participation.
          </p>
        </div>

        <Button appearance="primary">+ Tạo tài khoản</Button>
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
        <div style={{ flex: '1 1 320px' }}>
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

        <div style={{ width: '220px' }}>
          <Select
            defaultValue={{ label: 'Tất cả các Tổ', value: 'all' }}
            options={teamOptions}
            onChange={(opt: any) => setTeamFilter(opt?.value || 'all')}
          />
        </div>

        <div style={{ width: '180px' }}>
          <Select
            defaultValue={{ label: 'Tất cả vai trò', value: 'all' }}
            options={roleOptions}
            onChange={(opt: any) => setRoleFilter(opt?.value || 'all')}
          />
        </div>
      </div>

      {/* Members Grid or Empty State */}
      {isLoadingMembers ? (
        <div
          style={{
            padding: '64px 24px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '16px',
          }}
        >
          <Spinner size="large" />
          <div style={{ fontSize: '14px', color: token('color.text.subtle', '#5E6C84') }}>
            Đang tải danh sách thành viên...
          </div>
        </div>
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
            <InboxIcon label="" size="large" />
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
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
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
            const canManage = Boolean(member.can_manage ?? (member as any).canManage);

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
                        style={{
                          padding: '2px 10px',
                          fontSize: '11px',
                          border: `1px solid ${token('color.border', '#DFE1E6')}`,
                          borderRadius: '3px',
                          backgroundColor: '#FFFFFF',
                          cursor: 'pointer',
                          color: token('color.text', '#172B4D'),
                        }}
                      >
                        Sửa
                      </button>
                      <button
                        type="button"
                        style={{
                          padding: '2px 10px',
                          fontSize: '11px',
                          border: `1px solid ${token('color.border', '#DFE1E6')}`,
                          borderRadius: '3px',
                          backgroundColor: '#FFFFFF',
                          cursor: 'pointer',
                          color: token('color.text', '#172B4D'),
                        }}
                      >
                        Xóa
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const defaultMembersQueryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

export const MembersView: React.FC = () => {
  const queryClient = React.useContext(QueryClientContext);

  if (!queryClient) {
    return (
      <QueryClientProvider client={defaultMembersQueryClient}>
        <MembersViewContent />
      </QueryClientProvider>
    );
  }

  return <MembersViewContent />;
};

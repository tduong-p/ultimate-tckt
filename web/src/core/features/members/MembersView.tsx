import React, { useState } from 'react';
import { token } from '@atlaskit/tokens';
import Button from '@atlaskit/button/new';
import Select from '@atlaskit/select';

interface Member {
  id: string;
  name: string;
  role: 'Tổ Trưởng' | 'Tổ Phó' | 'Thành Viên';
  team: string;
  completedTasks: number;
  email: string;
  initials: string;
  avatarColor: string;
  canManage?: boolean;
}

const membersData: Member[] = [
  {
    id: '1',
    name: 'Phạm Việt Bách',
    role: 'Tổ Trưởng',
    team: 'Phát triển Đảng và Chuyển đổi số',
    completedTasks: 0,
    email: 'bach.pv2414676@sis.hust.edu.vn',
    initials: 'VB',
    avatarColor: '#E00000'
  },
  {
    id: '2',
    name: 'Cao Hương Quỳnh',
    role: 'Tổ Phó',
    team: 'Phát triển Đảng và Chuyển đổi số',
    completedTasks: 0,
    email: 'quynh.ch238125@sis.hust.edu.vn',
    initials: 'HQ',
    avatarColor: '#006644'
  },
  {
    id: '3',
    name: 'Nguyễn Văn Gia Huy',
    role: 'Tổ Phó',
    team: 'Phát triển Đảng và Chuyển đổi số',
    completedTasks: 1,
    email: 'huy.nvg2516805@sis.hust.edu.vn',
    initials: 'GH',
    avatarColor: '#006644'
  },
  {
    id: '4',
    name: 'Đào Khánh Huyền',
    role: 'Thành Viên',
    team: 'Phát triển Đảng và Chuyển đổi số',
    completedTasks: 0,
    email: 'huyen.dk2513666@sis.hust.edu.vn',
    initials: 'KH',
    avatarColor: '#006644',
    canManage: true
  },
  {
    id: '5',
    name: 'Đỗ Nhật Quang',
    role: 'Thành Viên',
    team: 'Phát triển Đảng và Chuyển đổi số',
    completedTasks: 0,
    email: 'quang.dn2517103@sis.hust.edu.vn',
    initials: 'NQ',
    avatarColor: '#006644',
    canManage: true
  },
  {
    id: '6',
    name: 'Lê Quang Đăng',
    role: 'Thành Viên',
    team: 'Phát triển Đảng và Chuyển đổi số',
    completedTasks: 0,
    email: 'dang.lq2419678@sis.hust.edu.vn',
    initials: 'QĐ',
    avatarColor: '#006644',
    canManage: true
  },
  {
    id: '7',
    name: 'Ngô Đình Quảng Đức',
    role: 'Thành Viên',
    team: 'Phát triển Đảng và Chuyển đổi số',
    completedTasks: 0,
    email: 'duc.ndq2514474@sis.hust.edu.vn',
    initials: 'QĐ',
    avatarColor: '#006644',
    canManage: true
  },
  {
    id: '8',
    name: 'Nguyễn Trần Minh Trí',
    role: 'Thành Viên',
    team: 'Phát triển Đảng và Chuyển đổi số',
    completedTasks: 0,
    email: 'tri.ntm2400116@sis.hust.edu.vn',
    initials: 'MT',
    avatarColor: '#E00000',
    canManage: true
  },
  {
    id: '9',
    name: 'Phạm Nguyễn Bảo Anh',
    role: 'Thành Viên',
    team: 'Phát triển Đảng và Chuyển đổi số',
    completedTasks: 0,
    email: 'anh.pnb2413658@sis.hust.edu.vn',
    initials: 'BA',
    avatarColor: '#006644',
    canManage: true
  },
  {
    id: '10',
    name: 'Phạm Văn Minh',
    role: 'Thành Viên',
    team: 'Phát triển Đảng và Chuyển đổi số',
    completedTasks: 0,
    email: 'minh.pv233534@sis.hust.edu.vn',
    initials: 'VM',
    avatarColor: '#006644',
    canManage: true
  },
  {
    id: '11',
    name: 'Phan Hoàng Trung Nghĩa',
    role: 'Thành Viên',
    team: 'Phát triển Đảng và Chuyển đổi số',
    completedTasks: 1,
    email: 'nghia.pht2517099@sis.hust.edu.vn',
    initials: 'TN',
    avatarColor: '#36B37E',
    canManage: true
  },
  {
    id: '12',
    name: 'Phan Tuấn Dương',
    role: 'Thành Viên',
    team: 'Phát triển Đảng và Chuyển đổi số',
    completedTasks: 1,
    email: 'duong.pt2518749@sis.hust.edu.vn',
    initials: 'TD',
    avatarColor: '#006644',
    canManage: true
  },
  {
    id: '13',
    name: 'Tạ Minh Hiếu',
    role: 'Thành Viên',
    team: 'Phát triển Đảng và Chuyển đổi số',
    completedTasks: 0,
    email: 'hieu.tm2516096@sis.hust.edu.vn',
    initials: 'MH',
    avatarColor: '#006644',
    canManage: true
  },
  {
    id: '14',
    name: 'Vũ Hồng Phúc',
    role: 'Thành Viên',
    team: 'Phát triển Đảng và Chuyển đổi số',
    completedTasks: 0,
    email: 'phuc.vh2518784@sis.hust.edu.vn',
    initials: 'HP',
    avatarColor: '#006644',
    canManage: true
  },
  {
    id: '15',
    name: 'Vũ Thị Minh Anh',
    role: 'Thành Viên',
    team: 'Phát triển Đảng và Chuyển đổi số',
    completedTasks: 0,
    email: 'anh.vtm2513770@sis.hust.edu.vn',
    initials: 'MA',
    avatarColor: '#006644',
    canManage: true
  }
];

export const MembersView: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [teamFilter, setTeamFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');

  const filteredMembers = membersData.filter((member) => {
    const matchesSearch = member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === 'all' || member.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const getRoleStyle = (role: Member['role']) => {
    switch (role) {
      case 'Tổ Trưởng':
        return {
          bg: '#FFF0B3',
          color: '#825800',
          dot: '#FFAB00'
        };
      case 'Tổ Phó':
        return {
          bg: '#DEEBFF',
          color: '#0747A6',
          dot: '#0052CC'
        };
      case 'Thành Viên':
      default:
        return {
          bg: '#F4F5F7',
          color: '#42526E',
          dot: '#6B778C'
        };
    }
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', paddingTop: '4px' }}>
      {/* Page Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '24px'
      }}>
        <div>
          <h1 style={{
            margin: 0,
            fontSize: '24px',
            fontWeight: 600,
            color: token('color.text', '#172B4D'),
            letterSpacing: '-0.2px'
          }}>
            Thành viên
          </h1>
          <p style={{
            margin: '6px 0 0 0',
            fontSize: '14px',
            color: token('color.text.subtle', '#5E6C84')
          }}>
            Recognize every member's participation.
          </p>
        </div>

        <Button appearance="primary">
          + Tạo tài khoản
        </Button>
      </div>

      {/* Toolbar: Search & Filters */}
      <div style={{
        display: 'flex',
        gap: '12px',
        alignItems: 'center',
        marginBottom: '24px',
        flexWrap: 'wrap'
      }}>
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
              boxSizing: 'border-box'
            }}
          />
        </div>

        <div style={{ width: '180px' }}>
          <Select
            defaultValue={{ label: 'Tất cả các Tổ', value: 'all' }}
            options={[
              { label: 'Tất cả các Tổ', value: 'all' },
              { label: 'Phát triển Đảng và Chuyển đổi số', value: 'ptd_cds' }
            ]}
            onChange={(opt: any) => setTeamFilter(opt?.value || 'all')}
          />
        </div>

        <div style={{ width: '180px' }}>
          <Select
            defaultValue={{ label: 'Tất cả vai trò', value: 'all' }}
            options={[
              { label: 'Tất cả vai trò', value: 'all' },
              { label: 'Tổ Trưởng', value: 'Tổ Trưởng' },
              { label: 'Tổ Phó', value: 'Tổ Phó' },
              { label: 'Thành Viên', value: 'Thành Viên' }
            ]}
            onChange={(opt: any) => setRoleFilter(opt?.value || 'all')}
          />
        </div>
      </div>

      {/* Members Grid (3 columns) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
        gap: '16px'
      }}>
        {filteredMembers.map((member) => {
          const roleStyle = getRoleStyle(member.role);

          return (
            <div
              key={member.id}
              style={{
                backgroundColor: token('elevation.surface.raised', '#FFFFFF'),
                border: `1px solid ${token('color.border', '#DFE1E6')}`,
                borderRadius: '4px',
                padding: '16px',
                boxShadow: token('elevation.shadow.raised', '0 1px 1px rgba(9, 30, 66, 0.25), 0 0 1px rgba(9, 30, 66, 0.31)'),
                display: 'flex',
                gap: '14px',
                alignItems: 'flex-start'
              }}
            >
              {/* Avatar Initials */}
              <div style={{
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                backgroundColor: member.avatarColor,
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '13px',
                fontWeight: 700,
                flexShrink: 0
              }}>
                {member.initials}
              </div>

              {/* Info Details */}
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{
                  fontSize: '14px',
                  fontWeight: 600,
                  color: token('color.text', '#172B4D'),
                  marginBottom: '4px',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}>
                  {member.name}
                </div>

                {/* Role Pill & Team */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '6px',
                  marginBottom: '6px',
                  fontSize: '11px'
                }}>
                  <span style={{
                    backgroundColor: roleStyle.bg,
                    color: roleStyle.color,
                    padding: '1px 8px',
                    borderRadius: '10px',
                    fontWeight: 600,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    <span style={{ color: roleStyle.dot }}>•</span>
                    {member.role}
                  </span>
                  <span style={{ color: token('color.text.subtle', '#5E6C84') }}>
                    · {member.team}
                  </span>
                </div>

                {/* Task Stats */}
                <div style={{
                  fontSize: '12px',
                  color: token('color.text.subtle', '#5E6C84'),
                  marginBottom: '6px'
                }}>
                  <strong style={{ color: token('color.text', '#172B4D') }}>{member.completedTasks}</strong> công việc đã hoàn thành
                </div>

                {/* Email */}
                <div style={{ fontSize: '12px', marginBottom: member.canManage ? '10px' : '0' }}>
                  <a
                    href={`mailto:${member.email}`}
                    style={{
                      color: token('color.link', '#0052CC'),
                      textDecoration: 'none'
                    }}
                  >
                    {member.email}
                  </a>
                </div>

                {/* Actions (Sửa, Xóa) */}
                {member.canManage && (
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
                        color: token('color.text', '#172B4D')
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
                        color: token('color.text', '#172B4D')
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
    </div>
  );
};

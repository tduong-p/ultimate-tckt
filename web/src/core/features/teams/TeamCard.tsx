import React from 'react';
import { Link } from 'react-router-dom';
import { token } from '@atlaskit/tokens';
import type { TeamItem } from '../../api';

export interface TeamCardProps {
  team: TeamItem;
  canManage: boolean;
  canDelete: boolean;
  onEdit: () => void;
  onMembers: () => void;
  onDelete: () => void;
}

const actionStyle: React.CSSProperties = {
  padding: '2px 10px',
  fontSize: 12,
  border: `1px solid ${token('color.border', '#DFE1E6')}`,
  borderRadius: 3,
  background: token('elevation.surface', '#FFFFFF'),
  color: token('color.text', '#172B4D'),
  cursor: 'pointer',
};

const stat = (value: number, label: string) => (
  <div>
    <div style={{ fontSize: 20, fontWeight: 700, color: token('color.text', '#172B4D') }}>{value}</div>
    <div style={{ fontSize: 12, color: token('color.text.subtle', '#5E6C84') }}>{label}</div>
  </div>
);

export const TeamCard: React.FC<TeamCardProps> = ({ team, canManage, canDelete, onEdit, onMembers, onDelete }) => {
  const teamColor = team.color || '#0052CC';
  return (
    <div
      style={{
        backgroundColor: token('elevation.surface.raised', '#FFFFFF'),
        border: `1px solid ${token('color.border', '#DFE1E6')}`,
        borderRadius: 6,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div style={{ height: 4, backgroundColor: teamColor, width: '100%' }} />
      <div style={{ padding: 20, display: 'flex', flexDirection: 'column', flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: token('color.text', '#172B4D') }}>
            {canManage ? (
              <Link to={`/team/${team.id}`} style={{ color: 'inherit', textDecoration: 'none' }}>{team.name}</Link>
            ) : (
              team.name
            )}
          </h2>
          <span style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: teamColor, display: 'inline-block', flexShrink: 0 }} />
        </div>
        <p style={{ margin: '0 0 20px 0', fontSize: 13, color: token('color.text.subtle', '#5E6C84'), lineHeight: 1.45, flex: 1 }}>
          {team.description || ''}
        </p>
        <div style={{ display: 'flex', gap: 32, paddingTop: 16, borderTop: `1px solid ${token('color.border', '#DFE1E6')}`, marginBottom: canManage ? 16 : 0 }}>
          {stat(team.member_count ?? 0, 'thành viên')}
          {stat(team.active_count ?? 0, 'đang chạy')}
        </div>
        {canManage && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            <Link to={`/team/${team.id}`} style={{ ...actionStyle, textDecoration: 'none' }}>Xem hoạt động</Link>
            <button type="button" style={actionStyle} aria-label={`Quản lý thành viên ${team.name}`} onClick={onMembers}>Quản lý thành viên</button>
            <button type="button" style={actionStyle} aria-label={`Sửa ${team.name}`} onClick={onEdit}>Sửa</button>
            {canDelete && (
              <button type="button" style={{ ...actionStyle, color: token('color.text.danger', '#AE2E24') }} aria-label={`Xoá ${team.name}`} onClick={onDelete}>Xoá</button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

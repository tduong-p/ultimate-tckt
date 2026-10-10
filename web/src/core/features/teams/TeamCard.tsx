import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../../../ui';
import type { TeamItem } from '../../api';
import './teams.css';

export interface TeamCardProps {
  team: TeamItem;
  canManage: boolean;
  canDelete: boolean;
  onEdit: () => void;
  onMembers: () => void;
  onDelete: () => void;
}

const stat = (value: number, label: string) => (
  <div>
    <span className="team-stat-value">{value}</span>
    <span className="team-stat-label">{label}</span>
  </div>
);

export const TeamCard: React.FC<TeamCardProps> = ({ team, canManage, canDelete, onEdit, onMembers, onDelete }) => {
  // Màu của Tổ do người dùng chọn nên là dữ liệu, đặt inline.
  const teamColor = team.color || 'var(--ui-focus)';
  return (
    <article className="team-card">
      <div className="team-card-bar" style={{ backgroundColor: teamColor }} />
      <div className="team-card-body">
        <h2 className="team-card-title">
          <span className="team-dot" aria-hidden="true" style={{ backgroundColor: teamColor }} />
          {canManage ? <Link to={`/team/${team.id}`}>{team.name}</Link> : team.name}
        </h2>
        <p className="team-card-desc">{team.description || ''}</p>
        <div className="team-stats">
          {stat(team.member_count ?? 0, 'thành viên')}
          {stat(team.active_count ?? 0, 'đang chạy')}
        </div>
        {canManage && (
          <div className="team-actions">
            <Link className="ui-btn ui-btn-ghost ui-btn-sm" to={`/team/${team.id}`}>Xem hoạt động</Link>
            <Button size="sm" aria-label={`Quản lý thành viên ${team.name}`} onClick={onMembers}>Quản lý thành viên</Button>
            <Button size="sm" aria-label={`Sửa ${team.name}`} onClick={onEdit}>Sửa</Button>
            {canDelete && (
              <Button size="sm" variant="danger" aria-label={`Xoá ${team.name}`} onClick={onDelete}>Xoá</Button>
            )}
          </div>
        )}
      </div>
    </article>
  );
};

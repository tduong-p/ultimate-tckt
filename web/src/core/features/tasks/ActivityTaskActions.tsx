import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Button from '@atlaskit/button/new';
import type { BoardTeam } from '../../api';
import { CreateTaskModal } from './CreateTaskModal';
import { SelfLogModal } from './SelfLogModal';

export interface ActivityTaskActionsProps {
  activityId: number;
  activityType?: string;
  activityStatus: string;
  canManage: boolean;
  activityTeams: BoardTeam[];
}

/** Nút công việc ở đầu trang chi tiết hoạt động: Bảng Kanban, Giao việc, Tự ghi nhận việc. */
export const ActivityTaskActions: React.FC<ActivityTaskActionsProps> = ({
  activityId,
  activityType,
  activityStatus,
  canManage,
  activityTeams,
}) => {
  const [createOpen, setCreateOpen] = useState(false);
  const [selfLogOpen, setSelfLogOpen] = useState(false);
  const canSelfLog = activityStatus === 'approved' || activityStatus === 'active';
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
      <Link to={`/board/${activityId}`}>Bảng Kanban</Link>
      {canManage && (
        <Button appearance="primary" onClick={() => setCreateOpen(true)}>
          Giao việc
        </Button>
      )}
      {canSelfLog && <Button onClick={() => setSelfLogOpen(true)}>Tự ghi nhận việc</Button>}
      <CreateTaskModal
        isOpen={createOpen}
        activityId={activityId}
        activityType={activityType}
        activityTeams={activityTeams}
        onClose={() => setCreateOpen(false)}
      />
      <SelfLogModal
        isOpen={selfLogOpen}
        activityId={activityId}
        activityTeams={activityTeams}
        onClose={() => setSelfLogOpen(false)}
      />
    </div>
  );
};

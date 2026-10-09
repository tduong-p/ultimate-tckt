// web/src/core/features/activities/ActivityPlanSection.tsx
import React from 'react';
import Lozenge from '@atlaskit/lozenge';
import { token } from '@atlaskit/tokens';
import type { ActivityAttachment, ActivityTaskRow } from '../../api';
import { Card } from './ActivityInfoSections';
import { groupTasksByStage } from './planStages';
import { getTaskPriorityLabel, getTaskStatusAppearance, getTaskStatusLabel } from '../tasks/taskLabels';
import { QuotaBar } from '../../../shared/components/QuotaBar';
import { formatVnDate } from '../../../shared/utils/date';
import { isHttpUrl } from '../../../shared/utils/url';

import { TaskTitleButton } from '../tasks/TaskRowControls';
import { AddAttachmentButton } from '../tasks/AddAttachmentDialog';
import { isAssignedTo, useCurrentUserId } from '../tasks/taskPermissions';

/** Link mở tài liệu: link http(s) → chính nó; tệp trên server (không có link) → API nội dung; link lạ → null. */
export function attachmentHref(a: Pick<ActivityAttachment, 'id' | 'link_url'>): string | null {
  if (a.link_url) return isHttpUrl(a.link_url) ? a.link_url : null;
  return `/api/task-attachments/${a.id}/content`;
}

const attachmentLabel = (a: ActivityAttachment): string => a.label || a.original_name || a.link_url || `Tài liệu #${a.id}`;

const TaskAttachments: React.FC<{ items: ActivityAttachment[]; taskId: number; taskTitle: string; canAttach: boolean }> = ({
  items,
  taskId,
  taskTitle,
  canAttach,
}) => {
  if (items.length === 0 && !canAttach) return null;
  const used = items.reduce((sum, a) => sum + (a.size_bytes ?? 0), 0);
  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: token('color.text.subtle', '#5E6C84') }}>Tài liệu và link liên quan</div>
        {canAttach && <AddAttachmentButton taskId={taskId} taskTitle={taskTitle} />}
      </div>
      {items.length > 0 && (
        <ul style={{ margin: '4px 0', paddingLeft: 18 }}>
          {items.map((a) => {
            const href = attachmentHref(a);
            return (
              <li key={a.id}>
                {href ? (
                  <a href={href} target="_blank" rel="noopener noreferrer">
                    {attachmentLabel(a)}
                  </a>
                ) : (
                  <span>{attachmentLabel(a)}</span>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {items.length > 0 && <QuotaBar usedBytes={used} />}
    </div>
  );
};

const TaskRow: React.FC<{ task: ActivityTaskRow; attachments: ActivityAttachment[]; canManage?: boolean }> = ({ task, attachments, canManage }) => {
  const userId = useCurrentUserId();
  const canAttach = Boolean(canManage || isAssignedTo(task, userId));
  const start = formatVnDate(task.start_date);
  const range = start ? `${start} – ${formatVnDate(task.deadline)}` : formatVnDate(task.deadline);
  return (
    <li data-testid={`plan-task-${task.id}`} style={{ padding: '10px 0', borderTop: `1px solid ${token('color.border', '#DFE1E6')}` }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <TaskTitleButton task={task} />
        <Lozenge appearance={getTaskStatusAppearance(task.status)}>{getTaskStatusLabel(task.status)}</Lozenge>
        <span style={{ color: token('color.text.subtle', '#5E6C84') }}>Ưu tiên: {getTaskPriorityLabel(task.priority)}</span>
      </div>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', color: token('color.text.subtle', '#5E6C84'), marginTop: 4 }}>
        {task.team_name && <span>{task.team_name}</span>}
        <span>{task.primary_assignee_name || task.assignee_name || 'Chưa phân công'}</span>
        <span>{range}</span>
        {task.checklist_total ? <span>{`${task.checklist_done ?? 0}/${task.checklist_total} mục`}</span> : null}
      </div>
      {task.deliverable && <div style={{ marginTop: 4 }}>{task.deliverable}</div>}
      <TaskAttachments items={attachments} taskId={task.id} taskTitle={task.title} canAttach={canAttach} />
    </li>
  );
};

export const ActivityPlanSection: React.FC<{
  tasks: ActivityTaskRow[];
  attachments: ActivityAttachment[];
  activityType?: string | null;
  canManage?: boolean;
}> = ({ tasks, attachments, activityType, canManage }) => {
  const groups = groupTasksByStage(tasks, activityType);
  return (
    <Card title="Kế hoạch công việc" testId="section-plan">
      {groups.map((group) => (
        <div key={group.key} style={{ marginBottom: 12 }}>
          <h3 style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 600 }}>{group.label}</h3>
          {group.tasks.length === 0 ? (
            <p style={{ margin: 0, color: token('color.text.subtle', '#5E6C84') }}>Chưa có công việc</p>
          ) : (
            <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
              {group.tasks.map((t) => (
                <TaskRow key={t.id} task={t} attachments={attachments.filter((a) => a.task_id === t.id)} canManage={canManage} />
              ))}
            </ul>
          )}
        </div>
      ))}
    </Card>
  );
};

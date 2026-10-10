// web/src/core/features/activities/ActivityPlanSection.tsx
import React from 'react';
import { Badge, type BadgeTone } from '../../../ui';
import type { ActivityAttachment, ActivityTaskRow } from '../../api';
import { Card } from './ActivityInfoSections';
import { groupTasksByStage } from './planStages';
import { getTaskPriorityLabel, getTaskStatusLabel } from '../tasks/taskLabels';
import { QuotaBar } from '../../../shared/components/QuotaBar';
import { formatVnDate } from '../../../shared/utils/date';
import { isHttpUrl } from '../../../shared/utils/url';

import { TaskTitleButton } from '../tasks/TaskRowControls';
import { AddAttachmentButton } from '../tasks/AddAttachmentDialog';
import { isAssignedTo, useCurrentUserId } from '../tasks/taskPermissions';

const TASK_TONE: Record<string, BadgeTone> = { done: 'success', in_progress: 'info', review: 'warning', cancelled: 'danger' };

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
    <div className="act-attach">
      <div className="act-attach-head">
        <div className="act-attach-title">Tài liệu và link liên quan</div>
        {canAttach && <AddAttachmentButton taskId={taskId} taskTitle={taskTitle} />}
      </div>
      {items.length > 0 && (
        <ul className="act-attach-list">
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
    <li data-testid={`plan-task-${task.id}`} className="act-task">
      <div className="act-task-head">
        <TaskTitleButton task={task} />
        <Badge tone={TASK_TONE[String(task.status).toLowerCase()] ?? 'neutral'}>{getTaskStatusLabel(task.status)}</Badge>
        <span className="act-muted">Ưu tiên: {getTaskPriorityLabel(task.priority)}</span>
      </div>
      <div className="act-task-meta">
        {task.team_name && <span>{task.team_name}</span>}
        <span>{task.primary_assignee_name || task.assignee_name || 'Chưa phân công'}</span>
        <span>{range}</span>
        {task.checklist_total ? <span>{`${task.checklist_done ?? 0}/${task.checklist_total} mục`}</span> : null}
      </div>
      {task.deliverable && <div className="act-task-deliv">{task.deliverable}</div>}
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
        <div key={group.key} className="act-stage">
          <h3 className="act-stage-title">{group.label}</h3>
          {group.tasks.length === 0 ? (
            <p className="act-muted act-flat">Chưa có công việc</p>
          ) : (
            <ul className="act-list">
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

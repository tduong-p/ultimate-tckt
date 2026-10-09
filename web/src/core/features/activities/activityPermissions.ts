import type { ActivityDetail } from '../../api';

export interface ActivityActionFlags {
  /** Duyệt / Yêu cầu sửa / Từ chối. */
  canApprove: boolean;
  canResubmit: boolean;
  canEdit: boolean;
  /** Sửa Tổ, trạng thái, Trưởng BTC (chỉ admin). */
  canEditAdminFields: boolean;
  canDelete: boolean;
  canVolunteer: boolean;
  canAddParticipants: boolean;
}

export interface ActivityActionInput {
  isExec: boolean;
  userId: number | null;
  detail: Pick<ActivityDetail, 'activity' | 'participants' | 'canManage'>;
}

/** Bắt chước điều kiện server (core/src/routes/activities.js). Server vẫn là nơi chặn cuối. */
export function deriveActivityActions({ isExec, userId, detail }: ActivityActionInput): ActivityActionFlags {
  const status = detail.activity.status;
  const canManage = detail.canManage || isExec;
  const mine = userId === null ? undefined : detail.participants.find((p) => Number(p.user_id) === userId);
  return {
    canApprove: isExec && status === 'proposed',
    canResubmit: canManage && status === 'changes_requested',
    canEdit: canManage,
    canEditAdminFields: isExec,
    canDelete: isExec,
    canVolunteer: userId !== null && (!mine || mine.state === 'declined'),
    canAddParticipants: canManage,
  };
}

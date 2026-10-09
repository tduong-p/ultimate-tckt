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
  /** Tạo việc cho hoạt động (POST /api/activities/:id/tasks): cùng điều kiện quản lý hoạt động. */
  canCreateTask: boolean;
}

export interface ActivityActionInput {
  canWrite: boolean;
  isWriteExec: boolean;
  canManageWrite: boolean;
  userId: number | null;
  detail: Pick<ActivityDetail, 'activity' | 'participants' | 'canManage'>;
}

/** Bắt chước điều kiện server (core/src/routes/activities.js). Server vẫn là nơi chặn cuối. */
export function deriveActivityActions({ canWrite, isWriteExec, canManageWrite, userId, detail }: ActivityActionInput): ActivityActionFlags {
  const status = detail.activity.status;
  const canManage = canWrite && (canManageWrite || isWriteExec);
  const mine = userId === null ? undefined : detail.participants.find((p) => Number(p.user_id) === userId);
  return {
    canApprove: isWriteExec && status === 'proposed',
    canResubmit: canManage && status === 'changes_requested',
    canEdit: canManage,
    canEditAdminFields: isWriteExec,
    canDelete: isWriteExec,
    canVolunteer: canWrite && userId !== null && (!mine || mine.state === 'declined'),
    canAddParticipants: canManage,
    canCreateTask: canManage,
  };
}

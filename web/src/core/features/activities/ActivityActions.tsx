import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  approveActivity,
  deleteActivity,
  fetchSession,
  rejectActivity,
  requestActivityChanges,
  submitActivity,
  volunteerForActivity,
  type ActivityDetail,
} from '../../api';
import { useCapabilities } from '../../capabilities';
import { SESSION_KEY } from '../../queryKeys';
import { Button } from '../../../ui';
import { ActivityConfirmDialog, ActivityReasonDialog } from './ActivityDialogs';
import { deriveActivityActions } from './activityPermissions';
import { useActivityMutation } from './useActivityMutation';
import { EditActivityModal } from './EditActivityModal';
import { AddParticipantsModal } from './AddParticipantsModal';
import { CreateTaskModal } from '../tasks/CreateTaskModal';

type Dialog = 'changes' | 'reject' | 'delete' | 'edit' | 'participants' | 'task' | null;

/** Thanh hành động của trang hoạt động. `children` để gắn thêm nút khác (đợt 2). */
export const ActivityActions: React.FC<{ detail: ActivityDetail; children?: React.ReactNode }> = ({ detail, children }) => {
  const { canWriteActivities, isWriteExec, canLeadTeam, memberships } = useCapabilities();
  const { data: session } = useQuery({ queryKey: SESSION_KEY, queryFn: fetchSession });
  const id = detail.activity.id;
  const userId = session?.user?.id ?? null;
  const hasDyc = memberships.some((m) => m.kind === 'platform_owner');
  const canManageWrite = canWriteActivities && (isWriteExec || (!hasDyc && detail.canManage) ||
    (userId !== null && (Number(detail.activity.creator_id) === userId || Number(detail.activity.event_lead_id) === userId)) ||
    detail.activityTeams.some((team) => canLeadTeam(team.team_id)));
  const flags = deriveActivityActions({ canWrite: canWriteActivities, isWriteExec, canManageWrite, userId, detail });
  const [dialog, setDialog] = useState<Dialog>(null);
  const close = () => setDialog(null);

  const approve = useActivityMutation(id, () => approveActivity(id), { message: 'Đã duyệt hoạt động.' });
  const requestChanges = useActivityMutation(id, (feedback: string) => requestActivityChanges(id, feedback), {
    message: 'Đã gửi yêu cầu chỉnh sửa.',
    onDone: close,
  });
  const reject = useActivityMutation(id, (feedback: string) => rejectActivity(id, feedback), {
    message: 'Đã từ chối và xoá đề án.',
    removed: (result) => Boolean(result.deleted),
  });
  const resubmit = useActivityMutation(id, () => submitActivity(id), { message: 'Đã nộp lại đề án.' });
  const volunteer = useActivityMutation(id, () => volunteerForActivity(id), { message: 'Đã đăng ký tham gia.' });
  const remove = useActivityMutation(id, () => deleteActivity(id), { message: 'Đã xoá hoạt động.', removed: () => true });

  return (
    <div data-testid="activity-actions" className="act-actions">
      {flags.canApprove && (
        <>
          <Button variant="primary" disabled={approve.isPending} onClick={() => approve.mutate()}>
            Duyệt
          </Button>
          <Button onClick={() => setDialog('changes')}>Yêu cầu sửa</Button>
          <Button variant="danger" onClick={() => setDialog('reject')}>
            Từ chối
          </Button>
        </>
      )}
      {flags.canResubmit && (
        <Button variant="primary" disabled={resubmit.isPending} onClick={() => resubmit.mutate()}>
          Nộp lại
        </Button>
      )}
      {flags.canEdit && <Button onClick={() => setDialog('edit')}>Sửa khác</Button>}
      {flags.canDelete && (
        <Button variant="danger" onClick={() => setDialog('delete')}>
          Xoá hoạt động
        </Button>
      )}
      {flags.canVolunteer && (
        <Button disabled={volunteer.isPending} onClick={() => volunteer.mutate()}>
          Đăng ký tham gia
        </Button>
      )}
      {flags.canAddParticipants && <Button onClick={() => setDialog('participants')}>Thêm người tham gia</Button>}
      {flags.canCreateTask && <Button onClick={() => setDialog('task')}>Tạo nhiệm vụ</Button>}
      {children}

      <ActivityReasonDialog
        open={dialog === 'changes'}
        title="Yêu cầu chỉnh sửa đề án"
        label="Nội dung cần sửa"
        confirmLabel="Gửi yêu cầu"
        loading={requestChanges.isPending}
        onSubmit={(reason) => requestChanges.mutate(reason)}
        onCancel={close}
      />
      <ActivityReasonDialog
        open={dialog === 'reject'}
        title="Từ chối đề án"
        label="Lý do"
        danger
        confirmLabel="Từ chối và xoá"
        loading={reject.isPending}
        onSubmit={(reason) => reject.mutate(reason)}
        onCancel={close}
      />
      <ActivityConfirmDialog
        open={dialog === 'delete'}
        title="Xoá hoạt động?"
        danger
        confirmLabel="Xoá vĩnh viễn"
        confirmText={detail.activity.title}
        loading={remove.isPending}
        onConfirm={() => remove.mutate()}
        onCancel={close}
      >
        Hoạt động cùng toàn bộ công việc, tài liệu và cập nhật của nó sẽ bị xoá vĩnh viễn. Không thể hoàn tác.
      </ActivityConfirmDialog>
      <EditActivityModal isOpen={dialog === 'edit'} onClose={close} detail={detail} isAdmin={flags.canEditAdminFields} />
      <AddParticipantsModal isOpen={dialog === 'participants'} onClose={close} detail={detail} />
      <CreateTaskModal
        isOpen={dialog === 'task'}
        onClose={close}
        activityId={detail.activity.id}
        activityType={detail.activity.type}
        activityTeams={detail.activityTeams}
      />
    </div>
  );
};

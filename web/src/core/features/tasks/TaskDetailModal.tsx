import React, { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import Modal, { ModalBody, ModalFooter, ModalHeader, ModalTitle, ModalTransition } from '@atlaskit/modal-dialog';
import Button from '@atlaskit/button/new';
import Lozenge from '@atlaskit/lozenge';
import { token } from '@atlaskit/tokens';
import { acknowledgeTask, apiErrorMessage, cancelTask, fetchActivityBoard, fetchTask } from '../../api';
import { activityBoardKey, TASK_KEY } from '../../queryKeys';
import { useCapabilities } from '../../capabilities';
import { useToast } from '../../../shared/components/Toast';
import { ConfirmDialog } from '../../../shared/components/ConfirmDialog';
import { formatVnDate } from '../../../shared/utils/date';
import { getTaskPriorityLabel, getTaskStatusAppearance, getTaskStatusLabel } from './taskLabels';
import { canCancelSelfLogged, canReviewTask, canSubmitForReview, isAssignedTo, useCurrentUserId } from './taskPermissions';
import { useInvalidateTaskCaches } from './useTaskCaches';
import { ChecklistSection } from './ChecklistSection';
import { AttachmentsSection } from './AttachmentsSection';
import { CommentsSection } from './CommentsSection';
import { SubmitReviewForm } from './SubmitReviewForm';
import { ReviewButtons } from './ReviewButtons';
import { EditTaskDialog } from './EditTaskDialog';

const Fact: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div>
    <div style={{ fontSize: 12, color: token('color.text.subtle', '#626F86') }}>{label}</div>
    <div style={{ fontWeight: 600 }}>{children}</div>
  </div>
);

export interface TaskDetailModalProps {
  taskId: number;
  focusSubmit?: boolean;
  onClose: () => void;
}

/** Hộp chi tiết công việc (mở từ mọi danh sách và từ `#task/:id`). Mọi nút ẩn/hiện theo quyền như server. */
export const TaskDetailModal: React.FC<TaskDetailModalProps> = ({ taskId, focusSubmit = false, onClose }) => {
  const caps = useCapabilities();
  const userId = useCurrentUserId();
  const toast = useToast();
  const invalidate = useInvalidateTaskCaches();
  const submitRef = useRef<HTMLDivElement>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);

  const query = useQuery({ queryKey: TASK_KEY(taskId), queryFn: () => fetchTask(taskId) });
  const data = query.data;
  const task = data?.task;
  const manages = task ? caps.canManageTeam(task.team_id) : false;

  // GET /api/tasks/:id không trả event_lead_id: chỉ tải thêm khi cần biết người xem có phải Trưởng BTC không.
  const needsEventLead = Boolean(task && task.status === 'review' && !caps.isExec && !manages);
  const activityQuery = useQuery({
    queryKey: activityBoardKey(task?.activity_id ?? 0),
    queryFn: () => fetchActivityBoard(task!.activity_id),
    enabled: needsEventLead,
  });
  const isEventLead = userId !== null && activityQuery.data?.activity.event_lead_id === userId;

  useEffect(() => {
    if (focusSubmit && task) submitRef.current?.scrollIntoView?.({ behavior: 'smooth' });
  }, [focusSubmit, Boolean(task)]);

  const ackMutation = useMutation({
    mutationFn: () => acknowledgeTask(taskId),
    onSuccess: () => {
      toast.success('Đã xác nhận nhận việc');
      return invalidate(taskId);
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Không xác nhận được.')),
  });

  const cancelMutation = useMutation({
    mutationFn: () => cancelTask(taskId),
    onSuccess: async () => {
      toast.success('Đã rút lại công việc');
      await invalidate(taskId);
      setConfirmCancel(false);
      onClose();
    },
    onError: (err) => {
      setConfirmCancel(false);
      toast.error(apiErrorMessage(err, 'Không rút lại được công việc.'));
    },
  });

  const assigned = task ? isAssignedTo(task, userId) : false;
  const title = task?.title ?? 'Chi tiết công việc';

  return (
    <ModalTransition>
      <Modal onClose={onClose} width="large">
        <ModalHeader>
          <ModalTitle>{title}</ModalTitle>
        </ModalHeader>
        <ModalBody>
          {query.isLoading && <p>Đang tải công việc...</p>}
          {query.isError && (
            <p role="alert" style={{ color: token('color.text.danger', '#AE2E24') }}>
              {apiErrorMessage(query.error, 'Không tải được công việc.')}
            </p>
          )}
          {data && task && (
            <div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <Lozenge appearance={getTaskStatusAppearance(task.status)}>{getTaskStatusLabel(task.status)}</Lozenge>
                {Boolean(task.is_self_logged) && <Lozenge appearance="new">Tự ghi nhận</Lozenge>}
                {task.weight !== undefined && task.weight !== null && Boolean(task.is_self_logged) && (
                  <Lozenge>{`${task.weight}đ`}</Lozenge>
                )}
                {manages && (
                  <Button spacing="compact" onClick={() => setEditOpen(true)}>
                    Sửa
                  </Button>
                )}
              </div>
              <p style={{ margin: '8px 0', color: token('color.text.subtle', '#626F86') }}>
                <Link to={`/activity/${task.activity_id}`} onClick={onClose}>
                  {task.activity_title}
                </Link>{' '}
                · {task.team_name}
              </p>
              {task.description && <p style={{ whiteSpace: 'pre-wrap' }}>{task.description}</p>}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                  gap: 12,
                  margin: '12px 0',
                }}
              >
                <Fact label="Ngày bắt đầu">{formatVnDate(task.start_date) || 'Chưa đặt'}</Fact>
                <Fact label="Hạn chót">{formatVnDate(task.deadline)}</Fact>
                <Fact label="Ưu tiên">{getTaskPriorityLabel(task.priority)}</Fact>
                <Fact label="Người được giao">
                  {data.assignees.length === 0 ? (
                    'Chưa giao'
                  ) : (
                    data.assignees.map((a) => (
                      <div key={a.user_id} style={{ fontWeight: 400 }}>
                        {a.name}
                        {a.is_primary ? ' (chính)' : ''}
                        {a.acknowledged_at ? ' ✓' : ' · chờ xác nhận'}
                      </div>
                    ))
                  )}
                </Fact>
              </div>
              {task.deliverable && <Fact label="Sản phẩm cần nộp">{task.deliverable}</Fact>}

              {assigned && (
                <section aria-label="Xác nhận nhận việc" style={{ margin: '12px 0' }}>
                  {data.myAcknowledgedAt ? (
                    <p style={{ margin: 0 }}>Đã xác nhận · {formatVnDate(data.myAcknowledgedAt)}</p>
                  ) : (
                    <Button isLoading={ackMutation.isPending} onClick={() => ackMutation.mutate()}>
                      Xác nhận nhận việc
                    </Button>
                  )}
                </section>
              )}

              <ChecklistSection taskId={taskId} items={data.checklist ?? []} canUpdate={Boolean(data.canUpdate)} />
              <AttachmentsSection
                taskId={taskId}
                taskTitle={task.title}
                attachments={data.attachments ?? []}
                canAttach={Boolean(data.canUpdate)}
              />
              <CommentsSection taskId={taskId} activityId={task.activity_id} updates={data.updates ?? []} />

              {canSubmitForReview(task, userId) && (
                <div ref={submitRef} id="submit-review-box" style={{ marginTop: 16 }}>
                  <h3 style={{ fontSize: 14, margin: '0 0 4px' }}>Nộp nghiệm thu</h3>
                  <p style={{ margin: 0, fontSize: 13, color: token('color.text.subtle', '#626F86') }}>
                    Gửi liên kết minh chứng để Tổ trưởng hoặc Ban điều hành duyệt.
                  </p>
                  <SubmitReviewForm taskId={taskId} />
                </div>
              )}

              {canReviewTask(task, { isExec: caps.isExec, manages, isEventLead }) && (
                <div style={{ marginTop: 16 }}>
                  <h3 style={{ fontSize: 14, margin: '0 0 8px' }}>Nghiệm thu công việc</h3>
                  <ReviewButtons taskId={taskId} taskTitle={task.title} />
                </div>
              )}

              {canCancelSelfLogged(task, userId) && (
                <div style={{ marginTop: 16, textAlign: 'right' }}>
                  <Button appearance="danger" spacing="compact" onClick={() => setConfirmCancel(true)}>
                    Rút lại công việc này
                  </Button>
                </div>
              )}

              {manages && <EditTaskDialog isOpen={editOpen} task={task} onClose={() => setEditOpen(false)} />}
              <ConfirmDialog
                isOpen={confirmCancel}
                title="Rút lại công việc?"
                appearance="danger"
                confirmLabel="Rút lại"
                isLoading={cancelMutation.isPending}
                onConfirm={() => cancelMutation.mutate()}
                onCancel={() => setConfirmCancel(false)}
              >
                <p>Bạn có chắc muốn rút lại công việc tự ghi nhận này không?</p>
              </ConfirmDialog>
            </div>
          )}
        </ModalBody>
        <ModalFooter>
          <Button appearance="subtle" onClick={onClose}>
            Đóng
          </Button>
        </ModalFooter>
      </Modal>
    </ModalTransition>
  );
};

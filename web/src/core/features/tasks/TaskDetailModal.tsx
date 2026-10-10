// Chi tiết công việc dạng ngăn kéo bên phải (mở từ mọi danh sách và từ `#task/:id`), sửa tại chỗ + Lưu/Hủy.
// Phiên sửa nằm ở đây vì ngăn kéo sống suốt thời gian mở (TaskModalProvider giữ nó qua đổi route).
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Badge, Button, Dialog, EditBar } from '../../../ui';
import { acknowledgeTask, apiErrorMessage, cancelTask, fetchActivityBoard, fetchTask } from '../../api';
import { activityBoardKey, TASK_KEY } from '../../queryKeys';
import { useCapabilities } from '../../capabilities';
import { patchTaskBatch } from '../../edit/editApi';
import { useConfirmNavigate, useEditGuard } from '../../edit/EditGuard';
import { useEditSession } from '../../edit/useEditSession';
import { useToast } from '../../../shared/components/Toast';
import { formatVnDate } from '../../../shared/utils/date';
import { canCancelSelfLogged, canReviewTask, canSubmitForReview, isAssignedTo, useCurrentUserId } from './taskPermissions';
import { useInvalidateTaskCaches } from './useTaskCaches';
import {
  describeTaskFields,
  EMPTY_DRAFT,
  REQUIRED_FIELDS,
  TASK_FIELD_LABELS,
  toTaskDraftOriginal,
  type TaskDetailData,
  type TaskDraftFields,
} from './taskEdit';
import { TaskProperties, TaskTitleBlock } from './TaskDetailFields';
import { ChecklistSection } from './ChecklistSection';
import { AttachmentsSection } from './AttachmentsSection';
import { CommentsSection } from './CommentsSection';
import { SubmitReviewForm } from './SubmitReviewForm';
import { ReviewButtons } from './ReviewButtons';
import './tasks.css';

export interface TaskDetailModalProps {
  taskId: number;
  focusSubmit?: boolean;
  onClose: () => void;
}

type Notice = { kind: 'error'; message: string } | { kind: 'conflict'; fields: string[] };

const NO_FIELDS: string[] = [];
const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
const OVERLAY_SELECTOR = '[role=dialog],[role=menu],[role=listbox]';

/** Ngăn chi tiết công việc. Nút ẩn/hiện theo quyền như server; ô sửa theo `editable[]` của GET. */
export const TaskDetailModal: React.FC<TaskDetailModalProps> = ({ taskId, focusSubmit = false, onClose }) => {
  const caps = useCapabilities();
  const userId = useCurrentUserId();
  const toast = useToast();
  const qc = useQueryClient();
  const invalidate = useInvalidateTaskCaches();
  const confirmNavigate = useConfirmNavigate();
  const submitRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLElement>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [invalid, setInvalid] = useState<string[]>([]);

  const query = useQuery({ queryKey: TASK_KEY(taskId), queryFn: () => fetchTask(taskId) as Promise<TaskDetailData> });
  const data = query.data as TaskDetailData | undefined;
  const dataRef = useRef(data);
  dataRef.current = data;
  const task = data?.task;
  const manages = task ? caps.canManageTeam(task.team_id) : false;

  const editableList = data?.editable ?? NO_FIELDS;
  const editable = useMemo(() => new Set(editableList), [editableList]);
  const original = useMemo(() => (data ? toTaskDraftOriginal(data) : EMPTY_DRAFT), [data]);

  const session = useEditSession<TaskDraftFields>({
    original,
    editable: editableList,
    patch: (changes, base) => patchTaskBatch(taskId, { changes, base }),
    onSaved: () => invalidate(taskId),
  });
  useEditGuard(session.dirty);

  // Gõ lại nội dung thì bỏ cờ trống của trường đó.
  useEffect(() => {
    setInvalid((cur) => {
      const next = cur.filter((k) => !String(session.value(k as keyof TaskDraftFields) ?? '').trim());
      return next.length === cur.length ? cur : next;
    });
  }, [session]);

  // Đổi sang việc khác: bỏ nháp của việc cũ.
  const { discard } = session;
  useEffect(() => {
    discard();
    setNotice(null);
    setInvalid([]);
  }, [taskId, discard]);

  useEffect(() => {
    if (focusSubmit && task) submitRef.current?.scrollIntoView?.({ behavior: 'smooth' });
  }, [focusSubmit, Boolean(task)]);

  // GET /api/tasks/:id không trả event_lead_id: chỉ tải thêm khi cần biết người xem có phải Trưởng BTC không.
  const needsEventLead = Boolean(task && task.status === 'review' && !caps.isExec && !manages);
  const activityQuery = useQuery({
    queryKey: activityBoardKey(task?.activity_id ?? 0),
    queryFn: () => fetchActivityBoard(task!.activity_id),
    enabled: needsEventLead,
  });
  const isEventLead = userId !== null && activityQuery.data?.activity.event_lead_id === userId;

  const requestClose = () => confirmNavigate(onClose);
  // Esc đóng ngăn khi không có nháp (khi có nháp, EditBar dùng Esc để hủy). Bỏ qua khi đang có hộp thoại/menu khác.
  const closeRef = useRef(requestClose);
  closeRef.current = requestClose;
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.defaultPrevented || session.dirty) return;
      const target = e.target instanceof Element ? e.target : null;
      if (target?.closest(OVERLAY_SELECTOR) || document.querySelector(OVERLAY_SELECTOR)) return;
      closeRef.current();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [session.dirty]);

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

  /** Tải lại chi tiết và chờ tới khi `original` mới đã được render (base của lần lưu sau phải là bản mới). */
  const refreshOriginal = async () => {
    const fresh = await qc.fetchQuery({ queryKey: TASK_KEY(taskId), queryFn: () => fetchTask(taskId), staleTime: 0 });
    for (let i = 0; i < 40 && dataRef.current !== fresh; i += 1) await sleep(5);
    await sleep(0);
  };

  const save = async () => {
    const blanks = REQUIRED_FIELDS.filter((k) => session.changedKeys.includes(k) && !String(session.value(k) ?? '').trim());
    if (blanks.length) {
      setInvalid(blanks);
      setNotice({ kind: 'error', message: `${TASK_FIELD_LABELS[blanks[0]]} không được để trống.` });
      rootRef.current?.querySelector<HTMLElement>(`[data-edit-field="${blanks[0]}"]`)?.focus();
      return;
    }
    const start = session.value('start_date');
    const deadline = session.value('deadline');
    if (start && deadline && start > deadline) {
      setInvalid(['start_date']);
      setNotice({ kind: 'error', message: 'Ngày bắt đầu phải trước hoặc bằng hạn chót.' });
      rootRef.current?.querySelector<HTMLElement>('[data-edit-field="start_date"]')?.focus();
      return;
    }
    setInvalid([]);
    setNotice(null);
    const result = await session.save();
    if (result.ok) {
      toast.success('Đã lưu');
      return;
    }
    if (result.kind === 'conflict') {
      setNotice({ kind: 'conflict', fields: result.fields ?? [] });
      void invalidate(taskId);
      return;
    }
    if (result.kind === 'forbidden' && result.fields?.length) {
      setNotice({ kind: 'error', message: `Bạn không có quyền sửa: ${describeTaskFields(result.fields)}.` });
      return;
    }
    setNotice({ kind: 'error', message: result.message });
  };

  const takeTheirs = async () => {
    session.discard();
    setNotice(null);
    await refreshOriginal();
  };
  const keepMine = async () => {
    setNotice(null);
    await refreshOriginal();
    await save();
  };

  const assigned = task ? isAssignedTo(task, userId) : false;

  return (
    <>
      <div className="tk-backdrop" onClick={requestClose} aria-hidden="true" />
      <aside className="tk-drawer" aria-label="Chi tiết công việc" ref={rootRef}>
        <div className="tk-head">
          <span className="tk-head-label">Công việc</span>
          <Button onClick={requestClose}>Đóng</Button>
        </div>
        <div className="tk-body">
          {query.isLoading && <p className="tk-state" role="status">Đang tải công việc...</p>}
          {query.isError && <p role="alert" className="tk-state tk-state--error">{apiErrorMessage(query.error, 'Không tải được công việc.')}</p>}
          {data && task && (
            <div>
              <TaskTitleBlock detail={data} session={session} editable={editable} invalid={invalid} />
              <div className="tk-badges">
                {Boolean(task.is_self_logged) && <Badge tone="info">Tự ghi nhận</Badge>}
                {task.weight !== undefined && task.weight !== null && Boolean(task.is_self_logged) && <Badge>{`${task.weight}đ`}</Badge>}
              </div>
              <TaskProperties detail={data} session={session} editable={editable} invalid={invalid} />

              {assigned && (
                <section aria-label="Xác nhận nhận việc" className="tk-section">
                  {data.myAcknowledgedAt ? (
                    <p className="tk-muted">Đã xác nhận · {formatVnDate(data.myAcknowledgedAt)}</p>
                  ) : (
                    <Button variant="primary" disabled={ackMutation.isPending} onClick={() => ackMutation.mutate()}>
                      Xác nhận nhận việc
                    </Button>
                  )}
                </section>
              )}

              <ChecklistSection taskId={taskId} items={data.checklist ?? []} canUpdate={Boolean(data.canUpdate)} />
              <AttachmentsSection taskId={taskId} taskTitle={task.title} attachments={data.attachments ?? []} canAttach={Boolean(data.canUpdate)} />
              <CommentsSection taskId={taskId} activityId={task.activity_id} updates={data.updates ?? []} />

              {canSubmitForReview(task, userId) && (
                <div ref={submitRef} id="submit-review-box" className="tk-section">
                  <h3 className="tk-h3">Nộp nghiệm thu</h3>
                  <p className="tk-muted">Gửi liên kết minh chứng để Tổ trưởng hoặc Ban điều hành duyệt.</p>
                  <SubmitReviewForm taskId={taskId} />
                </div>
              )}

              {canReviewTask(task, { isExec: caps.isExec, manages, isEventLead }) && (
                <div className="tk-section">
                  <h3 className="tk-h3">Nghiệm thu công việc</h3>
                  <ReviewButtons taskId={taskId} taskTitle={task.title} />
                </div>
              )}

              {canCancelSelfLogged(task, userId) && (
                <div className="tk-section tk-right">
                  <Button variant="danger" size="sm" onClick={() => setConfirmCancel(true)}>
                    Rút lại công việc này
                  </Button>
                </div>
              )}

              {notice?.kind === 'conflict' && (
                <div className="tk-notice" role="alert">
                  <span>
                    {`Công việc đã bị người khác sửa${notice.fields.length ? ` (${describeTaskFields(notice.fields)})` : ''}. Bản mới nhất đã được tải về.`}
                  </span>
                  <span className="tk-notice-actions">
                    <Button onClick={() => void takeTheirs()}>Tải lại</Button>
                    <Button variant="primary" onClick={() => void keepMine()}>Giữ của tôi</Button>
                  </span>
                </div>
              )}

              <Dialog
                open={confirmCancel}
                onOpenChange={(open) => { if (!open) setConfirmCancel(false); }}
                title="Rút lại công việc?"
                footer={(
                  <>
                    <Button onClick={() => setConfirmCancel(false)}>Huỷ</Button>
                    <Button variant="danger" disabled={cancelMutation.isPending} onClick={() => cancelMutation.mutate()}>Rút lại</Button>
                  </>
                )}
              >
                <p>Bạn có chắc muốn rút lại công việc tự ghi nhận này không?</p>
              </Dialog>
            </div>
          )}
          <EditBar
            dirty={session.dirty}
            count={session.changedKeys.length}
            saving={session.saving}
            onSave={() => void save()}
            saveDisabled={notice?.kind === 'conflict'}
            onDiscard={() => { session.discard(); setNotice(null); setInvalid([]); }}
            error={notice?.kind === 'error' ? notice.message : undefined}
          />
        </div>
      </aside>
    </>
  );
};

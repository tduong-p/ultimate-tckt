import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Button } from '../../../ui';
import { apiErrorMessage, postTaskComment, type TaskCommentKind, type TaskUpdate } from '../../api';
import { useToast } from '../../../shared/components/Toast';
import { formatVnDate } from '../../../shared/utils/date';
import { useInvalidateTaskCaches } from './useTaskCaches';
import { getUpdateKindLabel } from './taskLabels';
import './tasks.css';
import { AreaField, COMMENT_KIND_OPTIONS, ErrorText, SelectField } from './formFields';

export const CommentsSection: React.FC<{ taskId: number; activityId: number; updates: TaskUpdate[] }> = ({
  taskId,
  activityId,
  updates,
}) => {
  const toast = useToast();
  const invalidate = useInvalidateTaskCaches();
  const [kind, setKind] = useState<TaskCommentKind>('comment');
  const [body, setBody] = useState('');
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: () => postTaskComment(activityId, { kind, body: body.trim(), task_id: taskId }),
    onSuccess: async () => {
      setBody('');
      toast.success('Đã gửi bình luận');
      await invalidate(taskId);
    },
    onError: (err) => setError(apiErrorMessage(err, 'Không gửi được bình luận.')),
  });

  const submit = () => {
    if (!body.trim()) {
      setError('Vui lòng nhập nội dung bình luận.');
      return;
    }
    setError('');
    mutation.mutate();
  };

  return (
    <section aria-label="Bình luận công việc">
      <h3 className="tk-h3 tk-sec-head">Bình luận</h3>
      {updates.length === 0 && <p className="tk-muted">Chưa có bình luận.</p>}
      {updates.map((u) => (
        <div key={u.id} className="tk-list-item">
          <strong>{u.user_name}</strong> <span className="tk-comment-kind">{getUpdateKindLabel(u.kind)}</span>
          <p className="tk-comment-body">{u.body}</p>
          <small className="tk-meta">{formatVnDate(u.created_at)}</small>
        </div>
      ))}
      <SelectField
        label="Loại cập nhật"
        value={kind}
        onChange={(v) => setKind(v as TaskCommentKind)}
        options={COMMENT_KIND_OPTIONS}
      />
      <AreaField
        label="Nội dung"
        value={body}
        onChange={(v) => {
          setBody(v);
          setError('');
        }}
      />
      <ErrorText>{error}</ErrorText>
      <div className="tk-section-actions">
        <Button disabled={mutation.isPending} onClick={submit}>
          Gửi bình luận
        </Button>
      </div>
    </section>
  );
};

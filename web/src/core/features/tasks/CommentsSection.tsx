import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import Button from '@atlaskit/button/new';
import { token } from '@atlaskit/tokens';
import { apiErrorMessage, postTaskComment, type TaskCommentKind, type TaskUpdate } from '../../api';
import { useToast } from '../../../shared/components/Toast';
import { formatVnDate } from '../../../shared/utils/date';
import { useInvalidateTaskCaches } from './useTaskCaches';
import { getUpdateKindLabel } from './taskLabels';
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
      <h3 style={{ fontSize: 14, margin: '16px 0 8px' }}>Bình luận</h3>
      {updates.length === 0 && (
        <p style={{ color: token('color.text.subtle', '#626F86'), margin: 0 }}>Chưa có bình luận.</p>
      )}
      {updates.map((u) => (
        <div key={u.id} style={{ padding: '6px 0', borderBottom: `1px solid ${token('color.border', '#DFE1E6')}` }}>
          <strong>{u.user_name}</strong> <span style={{ fontSize: 12 }}>{getUpdateKindLabel(u.kind)}</span>
          <p style={{ margin: '2px 0', whiteSpace: 'pre-wrap' }}>{u.body}</p>
          <small style={{ color: token('color.text.subtle', '#626F86') }}>{formatVnDate(u.created_at)}</small>
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
      <div style={{ marginTop: 8 }}>
        <Button isLoading={mutation.isPending} onClick={submit}>
          Gửi bình luận
        </Button>
      </div>
    </section>
  );
};

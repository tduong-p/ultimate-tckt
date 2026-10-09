import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import Button from '@atlaskit/button/new';
import { apiErrorMessage, submitTaskReview } from '../../api';
import { useToast } from '../../../shared/components/Toast';
import { LinkField, LINK_ERROR_MESSAGE } from '../../../shared/components/LinkField';
import { isHttpUrl } from '../../../shared/utils/url';
import { useInvalidateTaskCaches } from './useTaskCaches';
import { AreaField, ErrorText } from './formFields';

/** Form nộp nghiệm thu: link bắt buộc (server từ chối khi thiếu), ghi chú tuỳ chọn. */
export const SubmitReviewForm: React.FC<{ taskId: number; onDone?: () => void }> = ({ taskId, onDone }) => {
  const toast = useToast();
  const invalidate = useInvalidateTaskCaches();
  const [link, setLink] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: () => submitTaskReview(taskId, { link_url: link.trim(), notes: notes.trim() }),
    onSuccess: async () => {
      toast.success('Đã nộp nghiệm thu');
      await invalidate(taskId);
      setLink('');
      setNotes('');
      onDone?.();
    },
    onError: (err) => setError(apiErrorMessage(err, 'Không nộp được nghiệm thu. Vui lòng thử lại.')),
  });

  const submit = () => {
    if (!link.trim()) {
      setError('Vui lòng nhập liên kết minh chứng.');
      return;
    }
    if (!isHttpUrl(link)) {
      setError(LINK_ERROR_MESSAGE);
      return;
    }
    setError('');
    mutation.mutate();
  };

  return (
    <div>
      <LinkField
        label="Liên kết minh chứng"
        value={link}
        onChange={(v) => {
          setLink(v);
          setError('');
        }}
        isRequired
      />
      <AreaField label="Ghi chú" value={notes} onChange={setNotes} />
      <ErrorText>{error}</ErrorText>
      <div style={{ marginTop: 12 }}>
        <Button appearance="primary" isLoading={mutation.isPending} onClick={submit}>
          Nộp nghiệm thu
        </Button>
      </div>
    </div>
  );
};

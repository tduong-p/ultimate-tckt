import React, { useId, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiErrorMessage, bulkImportUsers } from '../../api';
import { useToast } from '../../../shared/components/Toast';
import { parseBulkImport } from '../people/bulkImport';
import { FormDialog } from '../people/FormDialog';
import { FormField } from '../people/FormField';
import { invalidatePeople } from '../people/invalidate';

export const BulkImportModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => (
  isOpen ? <BulkImportDialog onClose={onClose} /> : null
);

const BulkImportDialog: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const textId = useId();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [text, setText] = useState('');
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: () => bulkImportUsers(parseBulkImport(text)),
    onSuccess: (result) => {
      toast.success(`Đã tạo ${result.created}, bỏ qua ${result.skipped}.`);
      void invalidatePeople(queryClient);
      onClose();
    },
    onError: (err) => setError(apiErrorMessage(err, 'Không nhập được danh sách.')),
  });

  const submit = () => {
    if (parseBulkImport(text).length === 0) {
      setError('Danh sách thành viên trống.');
      return;
    }
    setError('');
    mutation.mutate();
  };

  return (
    <FormDialog title="Nhập danh sách hàng loạt" submitLabel="Nhập" isSubmitting={mutation.isPending} error={error} onSubmit={submit} onClose={onClose}>
      <FormField
        label="Danh sách (mỗi dòng: Tên,email)"
        htmlFor={textId}
        hint="Tài khoản được tạo là thành viên, đăng nhập SSO, chưa thuộc Tổ nào. Email sai hoặc đã có sẽ bị bỏ qua."
      >
        <textarea
          id={textId}
          value={text}
          rows={8}
          onChange={(e) => setText(e.target.value)}
          style={{
            width: '100%',
            padding: '8px 12px',
            borderRadius: 'var(--ui-radius-sm, 4px)',
            border: '1px solid var(--ui-border)',
            background: 'var(--ui-bg-input, var(--ui-bg-card))',
            color: 'var(--ui-text)',
            fontSize: '13px',
            fontFamily: 'monospace',
            boxSizing: 'border-box',
            outline: 'none',
            resize: 'vertical',
          }}
        />
      </FormField>
    </FormDialog>
  );
};

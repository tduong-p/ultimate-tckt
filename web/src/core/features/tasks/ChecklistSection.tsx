import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import Button from '@atlaskit/button/new';
import { token } from '@atlaskit/tokens';
import { addChecklistItem, apiErrorMessage, deleteChecklistItem, setChecklistItemDone, type ChecklistItem } from '../../api';
import { useToast } from '../../../shared/components/Toast';
import { ConfirmDialog } from '../../../shared/components/ConfirmDialog';
import { useInvalidateTaskCaches } from './useTaskCaches';
import { TextField, ErrorText } from './formFields';

export interface ChecklistSectionProps {
  taskId: number;
  items: ChecklistItem[];
  canUpdate: boolean;
}

/** Thêm, tích và xoá việc con; cả ba cùng điều kiện `canUpdate` (server: canTouchTask). Xoá phải xác nhận. */
export const ChecklistSection: React.FC<ChecklistSectionProps> = ({ taskId, items, canUpdate }) => {
  const toast = useToast();
  const invalidate = useInvalidateTaskCaches();
  const [title, setTitle] = useState('');
  const [error, setError] = useState('');
  const [pendingDelete, setPendingDelete] = useState<ChecklistItem | null>(null);
  const done = items.filter((i) => Boolean(i.is_done)).length;
  const fail = (err: unknown) => toast.error(apiErrorMessage(err, 'Không cập nhật được việc con.'));

  const addMutation = useMutation({
    mutationFn: (text: string) => addChecklistItem(taskId, text),
    onSuccess: () => {
      setTitle('');
      return invalidate(taskId);
    },
    onError: fail,
  });
  const toggleMutation = useMutation({
    mutationFn: (v: { id: number; done: boolean }) => setChecklistItemDone(taskId, v.id, v.done),
    onSuccess: () => invalidate(taskId),
    onError: fail,
  });
  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteChecklistItem(taskId, id),
    onSuccess: () => {
      setPendingDelete(null);
      toast.success('Đã xoá việc con');
      return invalidate(taskId);
    },
    onError: (err) => {
      setPendingDelete(null);
      fail(err);
    },
  });

  const add = () => {
    const text = title.trim();
    if (!text) {
      setError('Nội dung việc con là bắt buộc.');
      return;
    }
    setError('');
    addMutation.mutate(text);
  };

  return (
    <section aria-label="Việc con">
      <h3 style={{ fontSize: 14, margin: '16px 0 8px' }}>
        Việc con <span style={{ fontWeight: 400 }}>{items.length > 0 ? `${done}/${items.length}` : ''}</span>
      </h3>
      {items.length === 0 && <p style={{ color: token('color.text.subtle', '#626F86'), margin: 0 }}>Chưa có việc con.</p>}
      {items.map((item) => (
        <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}>
          <label style={{ flex: 1, display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              type="checkbox"
              checked={Boolean(item.is_done)}
              disabled={!canUpdate || toggleMutation.isPending}
              onChange={(e) => toggleMutation.mutate({ id: item.id, done: e.target.checked })}
            />
            <span>{item.title}</span>
          </label>
          {canUpdate && (
            <Button
              spacing="compact"
              appearance="subtle"
              aria-label={`Xoá việc con: ${item.title}`}
              onClick={() => setPendingDelete(item)}
            >
              Xoá
            </Button>
          )}
        </div>
      ))}
      {canUpdate && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 180 }}>
            <TextField
              label="Thêm việc con"
              value={title}
              maxLength={255}
              onChange={(v) => {
                setTitle(v);
                setError('');
              }}
            />
          </div>
          <Button isLoading={addMutation.isPending} onClick={add}>
            Thêm
          </Button>
        </div>
      )}
      <ErrorText>{error}</ErrorText>
      <ConfirmDialog
        isOpen={pendingDelete !== null}
        title="Xoá việc con?"
        appearance="danger"
        confirmLabel="Xoá"
        isLoading={deleteMutation.isPending}
        onConfirm={() => pendingDelete && deleteMutation.mutate(pendingDelete.id)}
        onCancel={() => setPendingDelete(null)}
      >
        <p>Bạn sắp xoá "{pendingDelete?.title}". Không hoàn tác được.</p>
      </ConfirmDialog>
    </section>
  );
};

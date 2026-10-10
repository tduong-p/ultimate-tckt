import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Button } from '../../../ui';
import { addChecklistItem, apiErrorMessage, deleteChecklistItem, setChecklistItemDone, type ChecklistItem } from '../../api';
import { useToast } from '../../../shared/components/Toast';
import { useInvalidateTaskCaches } from './useTaskCaches';
import { TextField, ErrorText } from './formFields';
import { TaskConfirmDialog } from './TaskFormDialog';
import './tasks.css';

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
      <h3 className="tk-h3 tk-sec-head">
        <span>
          Việc con <span className="tk-count">{items.length > 0 ? `${done}/${items.length}` : ''}</span>
        </span>
      </h3>
      {items.length === 0 && <p className="tk-muted">Chưa có việc con.</p>}
      {items.map((item) => (
        <div key={item.id} className="tk-check-row">
          <label className="tk-check-label">
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
              size="sm"
              aria-label={`Xoá việc con: ${item.title}`}
              onClick={() => setPendingDelete(item)}
            >
              Xoá
            </Button>
          )}
        </div>
      ))}
      {canUpdate && (
        <div className="tk-add-row">
          <TextField
            label="Thêm việc con"
            value={title}
            maxLength={255}
            onChange={(v) => {
              setTitle(v);
              setError('');
            }}
          />
          <Button disabled={addMutation.isPending} onClick={add}>
            Thêm
          </Button>
        </div>
      )}
      <ErrorText>{error}</ErrorText>
      <TaskConfirmDialog
        isOpen={pendingDelete !== null}
        title="Xoá việc con?"
        danger
        confirmLabel="Xoá"
        loading={deleteMutation.isPending}
        onConfirm={() => pendingDelete && deleteMutation.mutate(pendingDelete.id)}
        onCancel={() => setPendingDelete(null)}
      >
        <p>Bạn sắp xoá "{pendingDelete?.title}". Không hoàn tác được.</p>
      </TaskConfirmDialog>
    </section>
  );
};

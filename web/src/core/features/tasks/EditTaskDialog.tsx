import React, { useEffect, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import Modal, { ModalBody, ModalFooter, ModalHeader, ModalTitle, ModalTransition } from '@atlaskit/modal-dialog';
import Button from '@atlaskit/button/new';
import { token } from '@atlaskit/tokens';
import { apiErrorMessage, editTask } from '../../api';
import { useToast } from '../../../shared/components/Toast';
import { toVnDateKey } from '../../../shared/utils/date';
import { useInvalidateTaskCaches } from './useTaskCaches';
import { AreaField, ErrorText, PRIORITY_OPTIONS, SelectField, TextField } from './formFields';

export interface EditableTask {
  id: number;
  title: string;
  deadline: string;
  start_date?: string | null;
  priority: string;
  deliverable?: string | null;
}

/** Sửa đúng 4 trường server cho phép (`PATCH /api/tasks/:id`): hạn, ngày bắt đầu, ưu tiên, sản phẩm cần nộp. */
export const EditTaskDialog: React.FC<{ isOpen: boolean; task: EditableTask; onClose: () => void }> = ({
  isOpen,
  task,
  onClose,
}) => {
  const toast = useToast();
  const invalidate = useInvalidateTaskCaches();
  const [deadline, setDeadline] = useState('');
  const [startDate, setStartDate] = useState('');
  const [priority, setPriority] = useState('medium');
  const [deliverable, setDeliverable] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setDeadline(toVnDateKey(task.deadline));
    setStartDate(toVnDateKey(task.start_date));
    setPriority(task.priority || 'medium');
    setDeliverable(task.deliverable ?? '');
    setError('');
  }, [isOpen, task]);

  const mutation = useMutation({
    mutationFn: () =>
      editTask(task.id, {
        deadline,
        start_date: startDate || null,
        priority,
        deliverable: deliverable.trim() || null,
      }),
    onSuccess: async () => {
      toast.success('Đã cập nhật công việc');
      await invalidate(task.id);
      onClose();
    },
    onError: (err) => setError(apiErrorMessage(err, 'Không lưu được công việc.')),
  });

  const submit = () => {
    if (!deadline) {
      setError('Vui lòng chọn hạn chót.');
      return;
    }
    if (startDate && startDate > deadline) {
      setError('Ngày bắt đầu phải trước hoặc bằng hạn chót.');
      return;
    }
    setError('');
    mutation.mutate();
  };

  return (
    <ModalTransition>
      {isOpen && (
        <Modal onClose={onClose} width="small">
          <ModalHeader>
            <ModalTitle>{`Sửa công việc: ${task.title}`}</ModalTitle>
          </ModalHeader>
          <ModalBody>
            <p style={{ margin: 0, fontSize: 13, color: token('color.text.subtle', '#626F86') }}>
              Tiêu đề, mô tả và người được giao chưa sửa được.
            </p>
            <TextField label="Hạn chót" type="date" required value={deadline} onChange={setDeadline} />
            <TextField label="Ngày bắt đầu" type="date" value={startDate} onChange={setStartDate} />
            <SelectField label="Mức ưu tiên" value={priority} onChange={setPriority} options={PRIORITY_OPTIONS} />
            <AreaField label="Sản phẩm cần nộp" value={deliverable} onChange={setDeliverable} />
            <ErrorText>{error}</ErrorText>
          </ModalBody>
          <ModalFooter>
            <Button appearance="subtle" onClick={onClose}>
              Huỷ
            </Button>
            <Button appearance="primary" isLoading={mutation.isPending} onClick={submit}>
              Lưu
            </Button>
          </ModalFooter>
        </Modal>
      )}
    </ModalTransition>
  );
};

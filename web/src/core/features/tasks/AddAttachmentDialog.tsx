import React, { useEffect, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import Modal, { ModalBody, ModalFooter, ModalHeader, ModalTitle, ModalTransition } from '@atlaskit/modal-dialog';
import Button from '@atlaskit/button/new';
import { addTaskAttachment, apiErrorMessage, type TaskAttachmentKind } from '../../api';
import { useToast } from '../../../shared/components/Toast';
import { LinkField, LINK_ERROR_MESSAGE } from '../../../shared/components/LinkField';
import { isHttpUrl } from '../../../shared/utils/url';
import { useInvalidateTaskCaches } from './useTaskCaches';
import { ATTACHMENT_KIND_OPTIONS, ErrorText, SelectField, TextField } from './formFields';

export interface AddAttachmentDialogProps {
  isOpen: boolean;
  taskId: number;
  taskTitle: string;
  onClose: () => void;
}

/** Thêm tài liệu/minh chứng bằng link (không tải tệp). */
export const AddAttachmentDialog: React.FC<AddAttachmentDialogProps> = ({ isOpen, taskId, taskTitle, onClose }) => {
  const toast = useToast();
  const invalidate = useInvalidateTaskCaches();
  const [kind, setKind] = useState<TaskAttachmentKind>('clarification');
  const [label, setLabel] = useState('');
  const [link, setLink] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setKind('clarification');
      setLabel('');
      setLink('');
      setError('');
    }
  }, [isOpen]);

  const mutation = useMutation({
    mutationFn: () => addTaskAttachment(taskId, { kind, label: label.trim(), link_url: link.trim() }),
    onSuccess: async () => {
      toast.success('Đã thêm tài liệu');
      await invalidate(taskId);
      onClose();
    },
    onError: (err) => setError(apiErrorMessage(err, 'Không thêm được tài liệu.')),
  });

  const submit = () => {
    if (!link.trim()) {
      setError('Vui lòng nhập liên kết.');
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
    <ModalTransition>
      {isOpen && (
        <Modal onClose={onClose} width="small">
          <ModalHeader>
            <ModalTitle>{`Thêm tài liệu: ${taskTitle}`}</ModalTitle>
          </ModalHeader>
          <ModalBody>
            <SelectField
              label="Loại"
              value={kind}
              onChange={(v) => setKind(v as TaskAttachmentKind)}
              options={ATTACHMENT_KIND_OPTIONS}
            />
            <TextField label="Tên hiển thị" value={label} maxLength={180} onChange={setLabel} />
            <LinkField
              label="Liên kết"
              value={link}
              onChange={(v) => {
                setLink(v);
                setError('');
              }}
              isRequired
            />
            <ErrorText>{error}</ErrorText>
          </ModalBody>
          <ModalFooter>
            <Button appearance="subtle" onClick={onClose}>
              Huỷ
            </Button>
            <Button appearance="primary" isLoading={mutation.isPending} onClick={submit}>
              Thêm
            </Button>
          </ModalFooter>
        </Modal>
      )}
    </ModalTransition>
  );
};

/** Nút + hộp, dùng ở danh sách tài liệu theo từng việc của trang chi tiết hoạt động. */
export const AddAttachmentButton: React.FC<{ taskId: number; taskTitle: string }> = ({ taskId, taskTitle }) => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button spacing="compact" onClick={() => setOpen(true)}>
        Thêm tài liệu
      </Button>
      <AddAttachmentDialog isOpen={open} taskId={taskId} taskTitle={taskTitle} onClose={() => setOpen(false)} />
    </>
  );
};

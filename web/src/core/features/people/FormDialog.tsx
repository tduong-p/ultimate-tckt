import React from 'react';
import Modal, { ModalBody, ModalFooter, ModalHeader, ModalTitle } from '@atlaskit/modal-dialog';
import Button from '@atlaskit/button/new';
import { FormError } from './FormField';

export interface FormDialogProps {
  title: string;
  submitLabel: string;
  isSubmitting?: boolean;
  error?: string;
  onSubmit: () => void;
  onClose: () => void;
  width?: 'small' | 'medium' | 'large';
  children: React.ReactNode;
}

/** Vỏ modal có form: Enter hoặc nút gửi gọi `onSubmit`; lỗi hiện ngay trong hộp để người dùng sửa tiếp. Bọc ngoài bằng `ModalTransition`. */
export const FormDialog: React.FC<FormDialogProps> = ({
  title, submitLabel, isSubmitting = false, error, onSubmit, onClose, width = 'medium', children,
}) => (
  <Modal onClose={onClose} width={width}>
    <form noValidate onSubmit={(e) => { e.preventDefault(); onSubmit(); }}>
      <ModalHeader><ModalTitle>{title}</ModalTitle></ModalHeader>
      <ModalBody>
        {children}
        <FormError message={error} />
      </ModalBody>
      <ModalFooter>
        <Button appearance="subtle" onClick={onClose}>Huỷ</Button>
        <Button appearance="primary" type="submit" isLoading={isSubmitting}>{submitLabel}</Button>
      </ModalFooter>
    </form>
  </Modal>
);

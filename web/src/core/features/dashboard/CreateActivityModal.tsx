import React from 'react';
import Modal, { ModalBody, ModalHeader, ModalTitle, ModalTransition } from '@atlaskit/modal-dialog';
import { token } from '@atlaskit/tokens';

interface Props {
  onClose: () => void;
}

export const CreateActivityModal: React.FC<Props> = ({ onClose }) => {
  return (
    <ModalTransition>
      <Modal onClose={onClose} width="large">
        <ModalHeader>
          <div style={{ padding: '16px 24px 0 24px', width: '100%' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: token('color.text.brand', '#0052CC'), textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
              ĐỀ XUẤT MỚI
            </div>
            <ModalTitle>Đề xuất hoạt động</ModalTitle>
            <p style={{ marginTop: '8px', color: token('color.text.subtle', '#42526E'), fontSize: '14px' }}>
              Chọn Tổ chủ trì và tất cả các Tổ phối hợp tham gia.
            </p>
          </div>
        </ModalHeader>
        <ModalBody>
          <div>
            {/* Form will go here */}
          </div>
        </ModalBody>
      </Modal>
    </ModalTransition>
  );
};

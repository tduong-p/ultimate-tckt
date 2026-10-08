import React from 'react';
import Button from '@atlaskit/button/new';
import { token } from '@atlaskit/tokens';

export const Dashboard: React.FC = () => {
  return (
    <div style={{ padding: '0', position: 'relative' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 600, color: token('color.text', '#172B4D') }}>
            Xin chào Phạm Việt Bách! Bạn có 0 nhiệm vụ cần làm.
          </h1>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button appearance="primary">Đề xuất hoạt động</Button>
          <Button appearance="default">Lịch sự kiện</Button>
          <Button appearance="default">Hoạt động</Button>
        </div>
      </div>
    </div>
  );
};
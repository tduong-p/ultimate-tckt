import React from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '@atlaskit/button/new';

export const NotFoundView: React.FC = () => {
  const navigate = useNavigate();
  return (
    <div style={{ textAlign: 'center', padding: '48px 16px' }}>
      <h2>Không tìm thấy trang</h2>
      <p>Đường dẫn này không tồn tại hoặc đã bị đổi.</p>
      <Button appearance="primary" onClick={() => navigate('/dashboard')}>Về Tổng quan</Button>
    </div>
  );
};

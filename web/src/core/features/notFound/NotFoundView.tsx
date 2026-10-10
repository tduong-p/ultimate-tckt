import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../../ui';

export const NotFoundView: React.FC = () => {
  const navigate = useNavigate();
  return (
    <div style={{ textAlign: 'center', padding: '48px 16px', color: 'var(--ui-text)' }}>
      <h2 style={{ marginBottom: '8px' }}>Không tìm thấy trang</h2>
      <p style={{ color: 'var(--ui-text-muted)', marginBottom: '16px' }}>Đường dẫn này không tồn tại hoặc đã bị đổi.</p>
      <Button variant="primary" onClick={() => navigate('/dashboard')}>Về Tổng quan</Button>
    </div>
  );
};

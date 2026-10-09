import React from 'react';
import ProgressBar from '@atlaskit/progress-bar';
import { formatBytes } from '../utils/bytes';

export interface QuotaBarProps { usedBytes: number; limitBytes?: number }

export const QuotaBar: React.FC<QuotaBarProps> = ({ usedBytes, limitBytes = 50 * 1024 * 1024 }) => {
  const ratio = limitBytes > 0 ? Math.min(Math.max(usedBytes / limitBytes, 0), 1) : 0;
  return (
    <div>
      <ProgressBar value={ratio} ariaLabel="Dung lượng tài liệu đã dùng" />
      <p style={{ marginTop: 4 }}>Đã dùng {formatBytes(usedBytes)} / {formatBytes(limitBytes)}</p>
    </div>
  );
};

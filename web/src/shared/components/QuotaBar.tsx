import React from 'react';
import { formatBytes } from '../utils/bytes';

export interface QuotaBarProps { usedBytes: number; limitBytes?: number }

export const QuotaBar: React.FC<QuotaBarProps> = ({ usedBytes, limitBytes = 50 * 1024 * 1024 }) => {
  const ratio = limitBytes > 0 ? Math.min(Math.max(usedBytes / limitBytes, 0), 1) : 0;
  return (
    <div>
      <div
        role="progressbar"
        aria-label="Dung lượng tài liệu đã dùng"
        aria-valuenow={ratio}
        aria-valuemin={0}
        aria-valuemax={1}
        style={{
          width: '100%',
          height: 6,
          borderRadius: 'var(--ui-radius, 4px)',
          background: 'var(--ui-border, #dfe1e6)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${ratio * 100}%`,
            height: '100%',
            background: 'var(--ui-focus, #0052cc)',
            transition: 'width 0.2s ease',
          }}
        />
      </div>
      <p style={{ marginTop: 4, fontSize: 13, color: 'var(--ui-text-2, #5e6c84)' }}>
        Đã dùng {formatBytes(usedBytes)} / {formatBytes(limitBytes)}
      </p>
    </div>
  );
};

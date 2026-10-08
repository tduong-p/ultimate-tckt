import React, { useState } from 'react';
import { token } from '@atlaskit/tokens';
import InboxIcon from '@atlaskit/icon/core/inbox';

export const ArchiveView: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', paddingTop: '4px' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1
          style={{
            margin: 0,
            fontSize: '24px',
            fontWeight: 600,
            color: token('color.text', '#172B4D'),
            letterSpacing: '-0.2px',
          }}
        >
          Kho lưu trữ hoạt động
        </h1>
        <p
          style={{
            margin: '6px 0 0 0',
            fontSize: '14px',
            color: token('color.text.subtle', '#5E6C84'),
          }}
        >
          Tìm kiếm kho tri thức chung của tổ chức.
        </p>
      </div>

      {/* Search Input Bar */}
      <div style={{ marginBottom: '24px' }}>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Tìm hoạt động, kết quả và bài học trước đây..."
          style={{
            width: '100%',
            height: '42px',
            padding: '0 16px',
            border: `1px solid ${token('color.border', '#DFE1E6')}`,
            borderRadius: '8px',
            fontSize: '14px',
            color: token('color.text', '#172B4D'),
            backgroundColor: token('elevation.surface', '#FFFFFF'),
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />
      </div>

      {/* Empty State Box */}
      <div
        style={{
          maxWidth: '480px',
          backgroundColor: token('elevation.surface.raised', '#FFFFFF'),
          border: `1px solid ${token('color.border', '#DFE1E6')}`,
          borderRadius: '8px',
          padding: '20px 24px',
          boxShadow: token(
            'elevation.shadow.raised',
            '0 1px 1px rgba(9, 30, 66, 0.25), 0 0 1px rgba(9, 30, 66, 0.31)'
          ),
          display: 'flex',
          gap: '14px',
          alignItems: 'flex-start',
        }}
      >
        <div
          style={{
            color: token('color.icon', '#42526E'),
            marginTop: '2px',
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <InboxIcon label="" />
        </div>
        <div>
          <div
            style={{
              fontSize: '15px',
              fontWeight: 600,
              color: token('color.text', '#172B4D'),
              marginBottom: '6px',
            }}
          >
            Không tìm thấy hoạt động lưu trữ
          </div>
          <div
            style={{
              fontSize: '13px',
              color: token('color.text.subtle', '#5E6C84'),
              lineHeight: 1.4,
            }}
          >
            Hoạt động hoàn thành sẽ được đưa vào kho lưu trữ.
          </div>
        </div>
      </div>
    </div>
  );
};

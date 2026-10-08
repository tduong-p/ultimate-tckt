import React from 'react';
import { token } from '@atlaskit/tokens';
import TaskIcon from '@atlaskit/icon/core/task';

export const MyTasksView: React.FC = () => {
  return (
    <div style={{ maxWidth: '1000px', margin: '0', paddingTop: '4px' }}>
      {/* Page Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{
          margin: 0,
          fontSize: '24px',
          fontWeight: 600,
          color: token('color.text', '#172B4D'),
          letterSpacing: '-0.2px'
        }}>
          Công việc của tôi
        </h1>
        <p style={{
          margin: '6px 0 0 0',
          fontSize: '14px',
          color: token('color.text.subtle', '#5E6C84')
        }}>
          Công việc được giao cho bạn và các Tổ của bạn.
        </p>
      </div>

      {/* Open Tasks Card */}
      <div style={{
        backgroundColor: token('elevation.surface.raised', '#FFFFFF'),
        border: `1px solid ${token('color.border', '#DFE1E6')}`,
        borderRadius: '3px',
        boxShadow: token('elevation.shadow.raised', '0 1px 1px rgba(9, 30, 66, 0.25), 0 0 1px rgba(9, 30, 66, 0.31)'),
        padding: '24px'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px'
        }}>
          <h2 style={{
            fontSize: '16px',
            fontWeight: 600,
            margin: 0,
            color: token('color.text', '#172B4D')
          }}>
            Công việc đang mở
          </h2>
          <span style={{
            backgroundColor: token('color.background.neutral', '#DFE1E6'),
            borderRadius: '12px',
            padding: '3px 10px',
            fontSize: '12px',
            fontWeight: 500,
            color: token('color.text.subtle', '#42526E'),
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            <span>•</span>
            <span>0 Công Việc</span>
          </span>
        </div>

        {/* Empty state box */}
        <div style={{
          backgroundColor: token('color.background.neutral.subtle', '#F4F5F7'),
          borderRadius: '4px',
          padding: '20px 24px',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '14px',
          border: `1px solid ${token('color.border', '#DFE1E6')}`
        }}>
          <div style={{ color: token('color.icon', '#42526E'), display: 'flex', marginTop: '2px' }}>
            <TaskIcon label="Task" />
          </div>
          <div>
            <div style={{
              fontSize: '14px',
              fontWeight: 600,
              color: token('color.text', '#172B4D'),
              marginBottom: '4px'
            }}>
              Bạn đã hoàn thành tất cả
            </div>
            <div style={{
              fontSize: '13px',
              color: token('color.text.subtle', '#5E6C84')
            }}>
              Không có công việc đang mở trong danh sách.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

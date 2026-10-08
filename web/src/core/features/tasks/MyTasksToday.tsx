import React from 'react';
import { token } from '@atlaskit/tokens';
import Badge from '@atlaskit/badge';
import TaskIcon from '@atlaskit/icon/core/task';

export const MyTasksToday: React.FC = () => {
  return (
    <div style={{ maxWidth: '1000px', margin: '0', paddingTop: '16px' }}>
      <h1 style={{ fontSize: '28px', fontWeight: 600, color: token('color.text', '#172B4D'), marginBottom: '8px' }}>
        Công việc hôm nay
      </h1>
      <p style={{ fontSize: '14px', color: token('color.text.subtle', '#5E6C84'), marginBottom: '32px' }}>
        Công việc đến hạn hôm nay, quá hạn, hoặc đang chờ bạn duyệt.
      </p>

      {/* Due Today Card */}
      <div style={{
        backgroundColor: token('elevation.surface.raised', '#FFFFFF'),
        borderRadius: '8px',
        boxShadow: token('elevation.shadow.raised', '0 1px 1px rgba(9, 30, 66, 0.25), 0 0 1px rgba(9, 30, 66, 0.31)'),
        padding: '24px',
        marginBottom: '24px',
        border: `1px solid ${token('color.border', '#DFE1E6')}`
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 600, margin: 0, color: token('color.text', '#172B4D') }}>
            Đến hạn hôm nay
          </h2>
          <Badge appearance="default">0</Badge>
        </div>

        <div style={{
          backgroundColor: token('color.background.neutral.subtle', '#F4F5F7'),
          borderRadius: '4px',
          padding: '16px 24px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          border: `1px solid ${token('color.border', '#DFE1E6')}`
        }}>
          <div style={{ color: token('color.icon', '#42526E'), display: 'flex' }}>
            <TaskIcon label="Task" />
          </div>
          <span style={{ fontSize: '14px', fontWeight: 500, color: token('color.text', '#172B4D') }}>
            Không có việc đến hạn hôm nay
          </span>
        </div>
      </div>

      {/* Overdue Card */}
      <div style={{
        backgroundColor: token('elevation.surface.raised', '#FFFFFF'),
        borderRadius: '8px',
        boxShadow: token('elevation.shadow.raised', '0 1px 1px rgba(9, 30, 66, 0.25), 0 0 1px rgba(9, 30, 66, 0.31)'),
        padding: '24px',
        border: `1px solid ${token('color.border', '#DFE1E6')}`
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 600, margin: 0, color: token('color.text', '#172B4D') }}>
            Quá hạn
          </h2>
          <Badge appearance="default">0</Badge>
        </div>

        <div style={{
          backgroundColor: token('color.background.neutral.subtle', '#F4F5F7'),
          borderRadius: '4px',
          padding: '16px 24px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          border: `1px solid ${token('color.border', '#DFE1E6')}`
        }}>
          <div style={{ color: token('color.icon', '#42526E'), display: 'flex' }}>
            <TaskIcon label="Task" />
          </div>
          <span style={{ fontSize: '14px', fontWeight: 500, color: token('color.text', '#172B4D') }}>
            Không có việc quá hạn
          </span>
        </div>
      </div>
    </div>
  );
};

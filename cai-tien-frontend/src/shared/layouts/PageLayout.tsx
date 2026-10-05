import React from 'react';
import '@atlaskit/css-reset';
import { token } from '@atlaskit/tokens';
import Avatar from '@atlaskit/avatar';
import Button from '@atlaskit/button/new';

export const PageLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', backgroundColor: token('color.background.neutral.subtle', '#F4F5F7') }}>
      
      {/* Top Navigation */}
      <header style={{ 
        backgroundColor: token('elevation.surface', '#FFFFFF'), 
        padding: `0 ${token('space.200', '16px')}`, 
        height: '56px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: `1px solid ${token('color.border', '#EBECF0')}`,
        flexShrink: 0
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '24px', height: '24px', backgroundColor: token('color.background.brand.bold', '#0052CC'), borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFF', fontWeight: 'bold', fontSize: '14px' }}>P</div>
            <h1 style={{ color: token('color.text', '#172B4D'), margin: 0, fontSize: '18px', fontWeight: 600 }}>TCKT</h1>
          </div>
          <input 
            type="text" 
            placeholder="Tìm kiếm công việc, hoạt động..." 
            style={{ 
              width: '400px', 
              padding: '6px 12px', 
              borderRadius: '4px', 
              border: `1px solid ${token('color.border.input', '#DFE1E6')}`,
              backgroundColor: token('color.background.input', '#FAFBFC')
            }} 
          />
          <Button appearance="primary">+ Tạo mới</Button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Avatar size="small" />
        </div>
      </header>
      
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Left Sidebar */}
        <aside style={{ 
          width: '240px', 
          backgroundColor: token('color.background.neutral.subtle', '#F4F5F7'),
          borderRight: `1px solid ${token('color.border', '#EBECF0')}`,
          display: 'flex',
          flexDirection: 'column',
          padding: token('space.200', '16px'),
          overflowY: 'auto'
        }}>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <li style={{ padding: '8px 12px', fontWeight: 600, color: token('color.text.selected', '#0052CC'), backgroundColor: token('color.background.selected', '#DEEBFF'), borderRadius: '3px', cursor: 'pointer' }}>Công việc của tôi</li>
            <li style={{ padding: '8px 12px', color: token('color.text.subtle', '#5E6C84'), borderRadius: '3px', cursor: 'pointer' }}>Giao cho tôi</li>
            <li style={{ padding: '8px 12px', color: token('color.text.subtle', '#5E6C84'), borderRadius: '3px', cursor: 'pointer' }}>Gần đây</li>
            <li style={{ padding: '8px 12px', color: token('color.text.subtle', '#5E6C84'), borderRadius: '3px', cursor: 'pointer' }}>Đã gắn sao</li>
            <div style={{ height: '16px' }}></div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: token('color.text.subtlest', '#5E6C84'), textTransform: 'uppercase', marginBottom: '8px', paddingLeft: '12px' }}>Kế hoạch</div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: token('color.text.subtlest', '#5E6C84'), textTransform: 'uppercase', marginBottom: '8px', paddingLeft: '12px' }}>Hoạt động</div>
            <li style={{ padding: '8px 12px', color: token('color.text.subtle', '#5E6C84'), borderRadius: '3px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '16px', height: '16px', backgroundColor: '#36B37E', borderRadius: '3px' }}></div> Mùa hè xanh
            </li>
            <li style={{ padding: '8px 12px', fontWeight: 600, color: token('color.text.selected', '#0052CC'), backgroundColor: token('color.background.selected', '#DEEBFF'), borderRadius: '3px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '16px', height: '16px', backgroundColor: '#0052CC', borderRadius: '3px' }}></div> Tiếp sức mùa thi
            </li>
          </ul>
        </aside>

        {/* Main Content Area */}
        <main style={{ flex: 1, overflowY: 'auto', backgroundColor: token('elevation.surface', '#FFFFFF'), padding: token('space.400', '32px') }}>
          {children}
        </main>
      </div>
    </div>
  );
};

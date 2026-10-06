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
            <div style={{ width: '24px', height: '24px', backgroundColor: '#172B4D', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFF', fontWeight: 'bold', fontSize: '14px' }}>T</div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <h1 style={{ color: token('color.text', '#172B4D'), margin: 0, fontSize: '14px', fontWeight: 600, lineHeight: 1 }}>TCKT Activity Hub</h1>
              <span style={{ fontSize: '11px', color: token('color.text.subtle', '#5E6C84') }}>Ban Tổ chức - Kiểm tra</span>
            </div>
          </div>
          <input 
            type="text" 
            placeholder="Tìm kiếm nhanh..." 
            style={{ 
              width: '400px', 
              padding: '6px 12px', 
              borderRadius: '4px', 
              border: `1px solid ${token('color.border.input', '#DFE1E6')}`,
              backgroundColor: token('color.background.input', '#FAFBFC'),
              marginLeft: '16px'
            }} 
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Button appearance="primary">+ Đề xuất hoạt động</Button>
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
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
            <li style={{ padding: '8px 12px', fontWeight: 600, color: token('color.text.selected', '#0052CC'), backgroundColor: token('color.background.selected', '#DEEBFF'), borderRadius: '3px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>📊</span> Tổng quan
            </li>
            <li style={{ padding: '8px 12px', color: token('color.text.subtle', '#5E6C84'), borderRadius: '3px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>☀️</span> Việc hôm nay
            </li>
            <li style={{ padding: '8px 12px', color: token('color.text.subtle', '#5E6C84'), borderRadius: '3px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>📅</span> Lịch hoạt động
            </li>
            <li style={{ padding: '8px 12px', color: token('color.text.subtle', '#5E6C84'), borderRadius: '3px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>🗂️</span> Hoạt động & Dự án
            </li>
            <li style={{ padding: '8px 12px', color: token('color.text.subtle', '#5E6C84'), borderRadius: '3px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>✅</span> Công việc của tôi
            </li>
            <li style={{ padding: '8px 12px', color: token('color.text.subtle', '#5E6C84'), borderRadius: '3px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>👥</span> Các Tổ
            </li>
            <li style={{ padding: '8px 12px', color: token('color.text.subtle', '#5E6C84'), borderRadius: '3px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>👤</span> Thành viên
            </li>
            <li style={{ padding: '8px 12px', color: token('color.text.subtle', '#5E6C84'), borderRadius: '3px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>📄</span> Tài liệu
            </li>
            <li style={{ padding: '8px 12px', color: token('color.text.subtle', '#5E6C84'), borderRadius: '3px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>📈</span> Báo cáo
            </li>
            <li style={{ padding: '8px 12px', color: token('color.text.subtle', '#5E6C84'), borderRadius: '3px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>🗃️</span> Lưu trữ
            </li>

            <div style={{ height: '16px' }}></div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: token('color.text.subtlest', '#5E6C84'), textTransform: 'uppercase', marginBottom: '8px', paddingLeft: '12px' }}>SẮP CÓ</div>
            
            <li style={{ padding: '8px 12px', color: token('color.text.subtle', '#5E6C84'), borderRadius: '3px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><span>📤</span> Giao việc</div>
              <span style={{ fontSize: '11px', backgroundColor: '#DFE1E6', padding: '2px 6px', borderRadius: '12px', color: '#172B4D' }}>Sắp có</span>
            </li>
            <li style={{ padding: '8px 12px', color: token('color.text.subtle', '#5E6C84'), borderRadius: '3px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><span>📥</span> Trình</div>
              <span style={{ fontSize: '11px', backgroundColor: '#DFE1E6', padding: '2px 6px', borderRadius: '12px', color: '#172B4D' }}>Sắp có</span>
            </li>
            <li style={{ padding: '8px 12px', color: token('color.text.subtle', '#5E6C84'), borderRadius: '3px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><span>📝</span> Nhật ký trực ban</div>
              <span style={{ fontSize: '11px', backgroundColor: '#DFE1E6', padding: '2px 6px', borderRadius: '12px', color: '#172B4D' }}>Sắp có</span>
            </li>
          </ul>
          
          {/* Bottom Avatar Area */}
          <div style={{ borderTop: `1px solid ${token('color.border', '#EBECF0')}`, paddingTop: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Avatar size="medium" />
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '14px', fontWeight: 600, color: token('color.text', '#172B4D') }}>Phạm Việt Bách</span>
                <span style={{ fontSize: '12px', color: token('color.text.subtle', '#5E6C84') }}>Tổ trưởng</span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '4px' }}>
               <span style={{ cursor: 'pointer' }}>🔔</span>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main style={{ flex: 1, overflowY: 'auto', backgroundColor: token('elevation.surface', '#FFFFFF'), padding: token('space.400', '32px') }}>
          {children}
        </main>
      </div>
    </div>
  );
};

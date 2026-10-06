import React, { useState, useEffect } from 'react';
import '@atlaskit/css-reset';
import { token } from '@atlaskit/tokens';
import { setGlobalTheme } from '@atlaskit/tokens/set-global-theme';
import Avatar from '@atlaskit/avatar';
import Button from '@atlaskit/button/new';

// Icon imports
import MenuIcon from '@atlaskit/icon/core/menu';
import ThemeIcon from '@atlaskit/icon/core/theme';
import DashboardIcon from '@atlaskit/icon/core/dashboard';
import CheckCircleIcon from '@atlaskit/icon/core/check-circle';
import CalendarIcon from '@atlaskit/icon/core/calendar';
import FolderClosedIcon from '@atlaskit/icon/core/folder-closed';
import TaskIcon from '@atlaskit/icon/core/task';
import PeopleGroupIcon from '@atlaskit/icon/core/people-group';
import PersonIcon from '@atlaskit/icon/core/person';
import FileIcon from '@atlaskit/icon/core/file';
import ChartBarIcon from '@atlaskit/icon/core/chart-bar';
import ArchiveBoxIcon from '@atlaskit/icon/core/archive-box';
import SendIcon from '@atlaskit/icon/core/send';
import InboxIcon from '@atlaskit/icon/core/inbox';
import BookWithBookmarkIcon from '@atlaskit/icon/core/book-with-bookmark';
import NotificationIcon from '@atlaskit/icon/core/notification';

export const PageLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    setGlobalTheme({ colorMode: theme });
  }, [theme]);

  const toggleTheme = () => {
    setTheme(t => t === 'light' ? 'dark' : 'light');
  };

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
          {/* Hamburger Menu */}
          <div style={{ cursor: 'pointer', color: token('color.icon', '#42526E'), width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '3px' }} onClick={() => setSidebarOpen(!sidebarOpen)}>
            <MenuIcon label="Menu" />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '24px', height: '24px', backgroundColor: '#172B4D', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFF', fontWeight: 'bold', fontSize: '14px' }}>T</div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <h1 style={{ color: token('color.text', '#172B4D'), margin: 0, fontSize: '14px', fontWeight: 600, lineHeight: 1 }}>TCKT Activity Hub</h1>
              <span className="desktop-only" style={{ fontSize: '11px', color: token('color.text.subtle', '#5E6C84') }}>Ban Tổ chức - Kiểm tra</span>
            </div>
          </div>
          <input 
            type="text" 
            placeholder="Tìm kiếm nhanh..." 
            className="desktop-only"
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
          <div style={{ cursor: 'pointer', color: token('color.icon', '#42526E'), display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={toggleTheme}>
            <ThemeIcon label="Toggle Theme" />
          </div>
          <div className="desktop-only"><Button appearance="primary">+ Đề xuất hoạt động</Button></div>
          <div className="mobile-only"><Button appearance="primary">+</Button></div>
          <Avatar size="small" />
        </div>
      </header>
      
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Left Sidebar */}
        <aside className={`sidebar-container ${sidebarOpen ? 'open' : 'collapsed'}`} style={{ 
          backgroundColor: token('color.background.neutral.subtle', '#F4F5F7'),
          borderRight: `1px solid ${token('color.border', '#EBECF0')}`,
          display: 'flex',
          flexDirection: 'column',
          padding: token('space.200', '16px'),
          overflowY: 'auto',
          flexShrink: 0
        }}>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, width: '208px' }}>
            <li style={{ padding: '8px 12px', fontWeight: 600, color: token('color.text.selected', '#0052CC'), backgroundColor: token('color.background.selected', '#DEEBFF'), borderRadius: '3px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{color: token('color.icon.selected', '#0052CC'), display: 'flex'}}><DashboardIcon label="" size="small" /></div>
              Tổng quan
            </li>
            <li style={{ padding: '8px 12px', color: token('color.text.subtle', '#5E6C84'), borderRadius: '3px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{color: token('color.icon', '#42526E'), display: 'flex'}}><CheckCircleIcon label="" size="small" /></div>
              Việc hôm nay
            </li>
            <li style={{ padding: '8px 12px', color: token('color.text.subtle', '#5E6C84'), borderRadius: '3px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{color: token('color.icon', '#42526E'), display: 'flex'}}><CalendarIcon label="" size="small" /></div>
              Lịch hoạt động
            </li>
            <li style={{ padding: '8px 12px', color: token('color.text.subtle', '#5E6C84'), borderRadius: '3px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{color: token('color.icon', '#42526E'), display: 'flex'}}><FolderClosedIcon label="" size="small" /></div>
              Hoạt động & Dự án
            </li>
            <li style={{ padding: '8px 12px', color: token('color.text.subtle', '#5E6C84'), borderRadius: '3px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{color: token('color.icon', '#42526E'), display: 'flex'}}><TaskIcon label="" size="small" /></div>
              Công việc của tôi
            </li>
            <li style={{ padding: '8px 12px', color: token('color.text.subtle', '#5E6C84'), borderRadius: '3px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{color: token('color.icon', '#42526E'), display: 'flex'}}><PeopleGroupIcon label="" size="small" /></div>
              Các Tổ
            </li>
            <li style={{ padding: '8px 12px', color: token('color.text.subtle', '#5E6C84'), borderRadius: '3px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{color: token('color.icon', '#42526E'), display: 'flex'}}><PersonIcon label="" size="small" /></div>
              Thành viên
            </li>
            <li style={{ padding: '8px 12px', color: token('color.text.subtle', '#5E6C84'), borderRadius: '3px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{color: token('color.icon', '#42526E'), display: 'flex'}}><FileIcon label="" size="small" /></div>
              Tài liệu
            </li>
            <li style={{ padding: '8px 12px', color: token('color.text.subtle', '#5E6C84'), borderRadius: '3px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{color: token('color.icon', '#42526E'), display: 'flex'}}><ChartBarIcon label="" size="small" /></div>
              Báo cáo
            </li>
            <li style={{ padding: '8px 12px', color: token('color.text.subtle', '#5E6C84'), borderRadius: '3px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{color: token('color.icon', '#42526E'), display: 'flex'}}><ArchiveBoxIcon label="" size="small" /></div>
              Lưu trữ
            </li>

            <div style={{ height: '16px' }}></div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: token('color.text.subtlest', '#5E6C84'), textTransform: 'uppercase', marginBottom: '8px', paddingLeft: '12px' }}>SẮP CÓ</div>
            
            <li style={{ padding: '8px 12px', color: token('color.text.subtle', '#5E6C84'), borderRadius: '3px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}><div style={{color: token('color.icon', '#42526E'), display: 'flex'}}><SendIcon label="" size="small" /></div> Giao việc</div>
              <span style={{ fontSize: '11px', backgroundColor: '#DFE1E6', padding: '2px 6px', borderRadius: '12px', color: '#172B4D' }}>Sắp có</span>
            </li>
            <li style={{ padding: '8px 12px', color: token('color.text.subtle', '#5E6C84'), borderRadius: '3px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}><div style={{color: token('color.icon', '#42526E'), display: 'flex'}}><InboxIcon label="" size="small" /></div> Trình</div>
              <span style={{ fontSize: '11px', backgroundColor: '#DFE1E6', padding: '2px 6px', borderRadius: '12px', color: '#172B4D' }}>Sắp có</span>
            </li>
            <li style={{ padding: '8px 12px', color: token('color.text.subtle', '#5E6C84'), borderRadius: '3px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}><div style={{color: token('color.icon', '#42526E'), display: 'flex'}}><BookWithBookmarkIcon label="" size="small" /></div> Nhật ký trực ban</div>
              <span style={{ fontSize: '11px', backgroundColor: '#DFE1E6', padding: '2px 6px', borderRadius: '12px', color: '#172B4D' }}>Sắp có</span>
            </li>
          </ul>
          
          {/* Bottom Avatar Area */}
          <div style={{ borderTop: `1px solid ${token('color.border', '#EBECF0')}`, paddingTop: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '208px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Avatar size="medium" />
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '14px', fontWeight: 600, color: token('color.text', '#172B4D') }}>Phạm Việt Bách</span>
                <span style={{ fontSize: '12px', color: token('color.text.subtle', '#5E6C84') }}>Tổ trưởng</span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '4px' }}>
               <div style={{ cursor: 'pointer', color: token('color.icon', '#42526E'), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                 <NotificationIcon label="Notifications" />
               </div>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="mobile-no-padding" style={{ flex: 1, overflowY: 'auto', backgroundColor: token('elevation.surface', '#FFFFFF'), padding: token('space.400', '32px'), transition: 'all 0.3s ease' }}>
          {children}
        </main>
      </div>
    </div>
  );
};

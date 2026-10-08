import React from 'react';
import Button from '@atlaskit/button/new';
import { token } from '@atlaskit/tokens';
import Tabs, { Tab, TabList, TabPanel } from '@atlaskit/tabs';
import Lozenge from '@atlaskit/lozenge';
import DashboardIcon from '@atlaskit/icon/core/dashboard';
import TaskIcon from '@atlaskit/icon/core/task';
import WarningIcon from '@atlaskit/icon/core/warning';
import CheckCircleIcon from '@atlaskit/icon/core/check-circle';

const TaskWidget = () => (
  <div style={{ flex: '1 1 60%', backgroundColor: token('elevation.surface', '#fff'), border: `1px solid ${token('color.border', '#DFE1E6')}`, borderRadius: '3px', padding: '16px' }}>
    <h2 style={{ fontSize: '18px', fontWeight: 600, color: token('color.text', '#172B4D'), marginTop: 0, marginBottom: '16px' }}>Quản lý nhiệm vụ</h2>
    <Tabs id="task-tabs">
      <TabList>
        <Tab>Cần làm (0)</Tab>
        <Tab>Hôm nay (0)</Tab>
        <Tab>Quá hạn (0)</Tab>
        <Tab>Đã xong (0)</Tab>
        <Tab>Tất cả (0)</Tab>
      </TabList>
      <div style={{ marginTop: '16px', marginBottom: '16px' }}>
        <input type="text" placeholder="Lọc theo tên..." style={{ width: '100%', padding: '8px 6px', border: `2px solid ${token('color.border', '#DFE1E6')}`, borderRadius: '3px', fontSize: '14px', backgroundColor: token('elevation.surface', '#FAFBFC'), color: token('color.text', '#172B4D') }} />
      </div>
      <TabPanel>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 20px', color: token('color.text.subtle', '#42526E') }}>
          <div style={{ marginBottom: '16px' }}>
            <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="16" y="8" width="32" height="48" rx="4" fill={token('color.background.neutral', '#DFE1E6')}/>
              <path d="M24 24h16M24 32h16M24 40h8" stroke={token('color.icon.subtle', '#8993A4')} strokeWidth="4" strokeLinecap="round"/>
            </svg>
          </div>
          <p style={{ margin: 0, fontSize: '14px' }}>Không tìm thấy công việc nào</p>
        </div>
      </TabPanel>
      <TabPanel><p>Không tìm thấy công việc nào</p></TabPanel>
      <TabPanel><p>Không tìm thấy công việc nào</p></TabPanel>
      <TabPanel><p>Không tìm thấy công việc nào</p></TabPanel>
      <TabPanel><p>Không tìm thấy công việc nào</p></TabPanel>
    </Tabs>
    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '16px', paddingTop: '16px', borderTop: `1px solid ${token('color.border', '#DFE1E6')}` }}>
      <a href="#" style={{ color: token('color.link', '#0052CC'), textDecoration: 'none', fontSize: '14px' }}>Xem toàn bộ công việc chi tiết &gt;</a>
      <span style={{ fontSize: '14px', color: token('color.text.subtle', '#42526E') }}>0 nhiệm vụ tổng thể</span>
    </div>
  </div>
);

const KPICards = () => (
  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
    <div style={{ padding: '16px', backgroundColor: token('elevation.surface.raised', '#fff'), borderRadius: '3px', boxShadow: token('elevation.shadow.raised', '0 1px 1px rgba(9, 30, 66, 0.25), 0 0 1px rgba(9, 30, 66, 0.31)') }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
        <div style={{ color: token('color.icon.brand', '#0052CC') }}><DashboardIcon label="" /></div>
        <Lozenge appearance="success">Đang chạy</Lozenge>
      </div>
      <div style={{ fontSize: '24px', fontWeight: 600, color: token('color.text', '#172B4D') }}>1</div>
      <div style={{ fontSize: '12px', color: token('color.text.subtle', '#42526E'), marginTop: '4px' }}>Hoạt động đang diễn ra</div>
    </div>
    
    <div style={{ padding: '16px', backgroundColor: token('elevation.surface.raised', '#fff'), borderRadius: '3px', boxShadow: token('elevation.shadow.raised', '0 1px 1px rgba(9, 30, 66, 0.25), 0 0 1px rgba(9, 30, 66, 0.31)') }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
        <div style={{ color: token('color.icon.warning', '#FF991F') }}><TaskIcon label="" /></div>
        <Lozenge appearance="inprogress">Cần xử lý</Lozenge>
      </div>
      <div style={{ fontSize: '24px', fontWeight: 600, color: token('color.text', '#172B4D') }}>0</div>
      <div style={{ fontSize: '12px', color: token('color.text.subtle', '#42526E'), marginTop: '4px' }}>Nhiệm vụ đang mở</div>
    </div>
    
    <div style={{ padding: '16px', backgroundColor: token('elevation.surface.raised', '#fff'), borderRadius: '3px', boxShadow: token('elevation.shadow.raised', '0 1px 1px rgba(9, 30, 66, 0.25), 0 0 1px rgba(9, 30, 66, 0.31)') }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
        <div style={{ color: token('color.icon.danger', '#DE350B') }}><WarningIcon label="" /></div>
        <Lozenge appearance="removed">Quá hạn</Lozenge>
      </div>
      <div style={{ fontSize: '24px', fontWeight: 600, color: token('color.text', '#172B4D') }}>0</div>
      <div style={{ fontSize: '12px', color: token('color.text.subtle', '#42526E'), marginTop: '4px' }}>Nhiệm vụ quá hạn</div>
    </div>
    
    <div style={{ padding: '16px', backgroundColor: token('elevation.surface.raised', '#fff'), borderRadius: '3px', boxShadow: token('elevation.shadow.raised', '0 1px 1px rgba(9, 30, 66, 0.25), 0 0 1px rgba(9, 30, 66, 0.31)') }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
        <div style={{ color: token('color.icon.success', '#36B37E') }}><CheckCircleIcon label="" /></div>
        <Lozenge appearance="success">0đ</Lozenge>
      </div>
      <div style={{ fontSize: '24px', fontWeight: 600, color: token('color.text', '#172B4D') }}>100%</div>
      <div style={{ fontSize: '12px', color: token('color.text.subtle', '#42526E'), marginTop: '4px' }}>Hiệu suất hoàn thành</div>
      <div style={{ marginTop: '8px', height: '4px', backgroundColor: token('color.background.neutral', '#DFE1E6'), borderRadius: '2px', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: '100%', backgroundColor: token('color.background.success.bold', '#00875A') }}></div>
      </div>
    </div>
  </div>
);

export const Dashboard: React.FC = () => {
  return (
    <div style={{ padding: '0', position: 'relative' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 600, color: token('color.text', '#172B4D') }}>
            Xin chào Phạm Việt Bách! Bạn có 0 nhiệm vụ cần làm.
          </h1>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button appearance="primary">Đề xuất hoạt động</Button>
          <Button appearance="default">Lịch sự kiện</Button>
          <Button appearance="default">Hoạt động</Button>
        </div>
      </div>
      <KPICards />
      <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start' }}>
        <TaskWidget />
      </div>
    </div>
  );
};
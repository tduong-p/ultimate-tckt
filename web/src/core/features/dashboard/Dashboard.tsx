import React from 'react';
import Button from '@atlaskit/button/new';
import { token } from '@atlaskit/tokens';
import Lozenge from '@atlaskit/lozenge';
import DashboardIcon from '@atlaskit/icon/core/dashboard';
import TaskIcon from '@atlaskit/icon/core/task';
import WarningIcon from '@atlaskit/icon/core/warning';
import CheckCircleIcon from '@atlaskit/icon/core/check-circle';

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
    </div>
  );
};
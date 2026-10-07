import React, { useState, useEffect } from 'react';
import '@atlaskit/css-reset';
import { token } from '@atlaskit/tokens';
import { setGlobalTheme } from '@atlaskit/tokens/set-global-theme';
import Avatar from '@atlaskit/avatar';
import Lozenge from '@atlaskit/lozenge';
import { AtlassianIcon } from '@atlaskit/logo';

import { PageLayout as PageLayoutWrapper, Main, TopNavigation, LeftSidebar, Content } from '@atlaskit/page-layout';
import { AtlassianNavigation, ProductHome } from '@atlaskit/atlassian-navigation';
import { MenuGroup, ButtonItem, Section, HeadingItem } from '@atlaskit/menu';

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
import SettingsIcon from '@atlaskit/icon/core/settings';
import WarningIcon from '@atlaskit/icon/core/warning';
import NotificationIcon from '@atlaskit/icon/core/notification';
import AppSwitcherIcon from '@atlaskit/icon/core/app-switcher';

const CustomLogo = () => <span style={{ fontSize: '18px', fontWeight: 600, marginLeft: '4px', whiteSpace: 'nowrap' }}>TCKT Activity Hub</span>;

const ProductHomeExample = () => (
  <ProductHome icon={AtlassianIcon} logo={CustomLogo} />
);

export const PageLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  useEffect(() => { setGlobalTheme({ colorMode: theme }); }, [theme]);
  const toggleTheme = () => setTheme(t => t === 'light' ? 'dark' : 'light');

  return (
    <PageLayoutWrapper>
      <TopNavigation isFixed={true} id="confluence-navigation">
        <AtlassianNavigation
          label="Site navigation"
          primaryItems={[]}
          renderProductHome={ProductHomeExample}
          renderNotifications={() => (
            <div style={{ cursor: 'pointer', padding: '8px', color: token('color.icon', '#42526E') }}>
              <NotificationIcon label="Notifications" />
            </div>
          )}
          renderSettings={() => (
            <div onClick={toggleTheme} style={{ cursor: 'pointer', padding: '8px', color: token('color.icon', '#42526E') }}>
              <ThemeIcon label="Toggle Theme" />
            </div>
          )}
          renderProfile={() => <Avatar size="small" appearance="circle" />}
        />
      </TopNavigation>
      <Content>
        <LeftSidebar isFixed={true} width={240} id="project-navigation">
          <div style={{ backgroundColor: token('elevation.surface', '#fff'), height: '100%', borderRight: `1px solid ${token('color.border', '#DFE1E6')}`, display: 'flex', flexDirection: 'column' }}>
            <div style={{ flex: 1, overflowY: 'auto' }}>
              <MenuGroup>
                <Section>
                  <ButtonItem iconBefore={<DashboardIcon label="" />}>Tổng quan</ButtonItem>
                  <ButtonItem iconBefore={<CheckCircleIcon label="" />}>Việc hôm nay</ButtonItem>
                  <ButtonItem iconBefore={<CalendarIcon label="" />}>Lịch hoạt động</ButtonItem>
                  <ButtonItem iconBefore={<FolderClosedIcon label="" />}>Hoạt động & Dự án</ButtonItem>
                  <ButtonItem iconBefore={<TaskIcon label="" />}>Công việc của tôi</ButtonItem>
                  <ButtonItem iconBefore={<PeopleGroupIcon label="" />}>Các Tổ</ButtonItem>
                  <ButtonItem iconBefore={<PersonIcon label="" />}>Thành viên</ButtonItem>
                  <ButtonItem iconBefore={<FileIcon label="" />}>Tài liệu</ButtonItem>
                  <ButtonItem iconBefore={<ChartBarIcon label="" />}>Báo cáo</ButtonItem>
                  <ButtonItem iconBefore={<ArchiveBoxIcon label="" />}>Lưu trữ</ButtonItem>
                </Section>
                <Section>
                  <HeadingItem>SẮP CÓ</HeadingItem>
                  <ButtonItem iconBefore={<SendIcon label="" />} iconAfter={<Lozenge appearance="new">Sắp có</Lozenge>}>Giao việc</ButtonItem>
                  <ButtonItem iconBefore={<InboxIcon label="" />} iconAfter={<Lozenge appearance="new">Sắp có</Lozenge>}>Trình</ButtonItem>
                  <ButtonItem iconBefore={<BookWithBookmarkIcon label="" />} iconAfter={<Lozenge appearance="new">Sắp có</Lozenge>}>Nhật ký trực ban</ButtonItem>
                </Section>
              </MenuGroup>
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '32px', alignItems: 'center', padding: '16px', borderTop: `1px solid ${token('color.border', '#DFE1E6')}` }}>
              <div title="Cài đặt (Admin, ĐYC)" style={{ cursor: 'pointer', color: token('color.icon', '#42526E') }}>
                <SettingsIcon label="Cài đặt" />
              </div>
              <div title="Chuyển vai trò" style={{ cursor: 'pointer', color: token('color.icon', '#42526E') }}>
                <AppSwitcherIcon label="Chuyển vai trò" />
              </div>
              <div title="Báo Bug" style={{ cursor: 'pointer', color: token('color.icon', '#42526E') }}>
                <WarningIcon label="Báo Bug" />
              </div>
            </div>
          </div>
        </LeftSidebar>
        <Main>
          <div style={{ padding: token('space.400', '32px'), position: 'relative' }}>
            {children}
          </div>
        </Main>
      </Content>
    </PageLayoutWrapper>
  );
};
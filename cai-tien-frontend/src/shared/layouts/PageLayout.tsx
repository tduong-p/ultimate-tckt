import React, { useState, useEffect } from 'react';
import '@atlaskit/css-reset';
import { token } from '@atlaskit/tokens';
import { setGlobalTheme } from '@atlaskit/tokens/set-global-theme';
import Avatar from '@atlaskit/avatar';
import Badge from '@atlaskit/badge';

// Page Layout
import {
  PageLayout as PageLayoutWrapper,
  Main,
  TopNavigation,
  LeftSidebar,
  Content
} from '@atlaskit/page-layout';

// Atlassian Navigation
import {
  AtlassianNavigation,
  PrimaryButton,
  CustomProductHome,
} from '@atlaskit/atlassian-navigation';
import { AtlassianIcon, AtlassianLogo } from '@atlaskit/logo';

// Menu
import { Navigation, ButtonItem, Section, HeadingItem } from '@atlaskit/menu';

// Icons
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
import MenuIcon from '@atlaskit/icon/core/menu';

const ProductHome = () => (
  <CustomProductHome
    href="/"
    iconAlt="Atlassian Logo"
    logoAlt="Atlassian Logo"
    iconUrl="https://atlassian.design/favicon.ico"
    logoUrl="https://atlassian.design/favicon.ico"
    siteTitle="TCKT Activity Hub"
  />
);

export const PageLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  useEffect(() => {
    setGlobalTheme({ colorMode: theme });
  }, [theme]);

  const toggleTheme = () => {
    setTheme(t => t === 'light' ? 'dark' : 'light');
  };

  return (
    <PageLayoutWrapper>
      <TopNavigation
        isFixed={true}
        id="confluence-navigation"
      >
        <AtlassianNavigation
          label="Site navigation"
          primaryItems={[
            <PrimaryButton>Đề xuất hoạt động</PrimaryButton>
          ]}
          renderProductHome={ProductHome}
          renderSettings={() => (
            <div onClick={toggleTheme} style={{ cursor: 'pointer', padding: '8px' }}>
              <ThemeIcon label="Toggle Theme" />
            </div>
          )}
          renderProfile={() => <Avatar size="small" />}
        />
      </TopNavigation>
      <Content>
        <LeftSidebar
          isFixed={true}
          isCollapsed={isSidebarCollapsed}
          width={240}
          id="project-navigation"
          onResize={(state) => {
            if (state.isOpen !== !isSidebarCollapsed) {
              setIsSidebarCollapsed(!state.isOpen);
            }
          }}
        >
          <div style={{ padding: '16px', display: 'flex', justifyContent: 'flex-end', borderBottom: `1px solid ${token('color.border', '#EBECF0')}` }}>
             <div style={{ cursor: 'pointer', color: token('color.icon', '#42526E') }} onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}>
               <MenuIcon label="Toggle Sidebar" />
             </div>
          </div>
          <Navigation>
            <Section>
              <ButtonItem iconBefore={<DashboardIcon label="" size="medium" />}>Tổng quan</ButtonItem>
              <ButtonItem iconBefore={<CheckCircleIcon label="" size="medium" />}>Việc hôm nay</ButtonItem>
              <ButtonItem iconBefore={<CalendarIcon label="" size="medium" />}>Lịch hoạt động</ButtonItem>
              <ButtonItem iconBefore={<FolderClosedIcon label="" size="medium" />}>Hoạt động & Dự án</ButtonItem>
              <ButtonItem iconBefore={<TaskIcon label="" size="medium" />}>Công việc của tôi</ButtonItem>
              <ButtonItem iconBefore={<PeopleGroupIcon label="" size="medium" />}>Các Tổ</ButtonItem>
              <ButtonItem iconBefore={<PersonIcon label="" size="medium" />}>Thành viên</ButtonItem>
              <ButtonItem iconBefore={<FileIcon label="" size="medium" />}>Tài liệu</ButtonItem>
              <ButtonItem iconBefore={<ChartBarIcon label="" size="medium" />}>Báo cáo</ButtonItem>
              <ButtonItem iconBefore={<ArchiveBoxIcon label="" size="medium" />}>Lưu trữ</ButtonItem>
            </Section>
            <Section>
              <HeadingItem>SẮP CÓ</HeadingItem>
              <ButtonItem 
                iconBefore={<SendIcon label="" size="medium" />}
                elemAfter={<Badge>Sắp có</Badge>}
              >Giao việc</ButtonItem>
              <ButtonItem 
                iconBefore={<InboxIcon label="" size="medium" />}
                elemAfter={<Badge>Sắp có</Badge>}
              >Trình</ButtonItem>
              <ButtonItem 
                iconBefore={<BookWithBookmarkIcon label="" size="medium" />}
                elemAfter={<Badge>Sắp có</Badge>}
              >Nhật ký trực ban</ButtonItem>
            </Section>
          </Navigation>
        </LeftSidebar>
        <Main>
          <div style={{ padding: token('space.400', '32px') }}>
            {children}
          </div>
        </Main>
      </Content>
    </PageLayoutWrapper>
  );
};

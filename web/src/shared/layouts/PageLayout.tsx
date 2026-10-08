import React from 'react';
import '@atlaskit/css-reset';
import { token } from '@atlaskit/tokens';
import Avatar from '@atlaskit/avatar';
import Lozenge from '@atlaskit/lozenge';
import { AtlassianIcon } from '@atlaskit/logo';

import { PageLayout as PageLayoutWrapper, Main, TopNavigation, LeftSidebar, Content } from '@atlaskit/page-layout';
import { AtlassianNavigation, ProductHome } from '@atlaskit/atlassian-navigation';
import { MenuGroup, ButtonItem, Section, HeadingItem } from '@atlaskit/menu';

import { ThemeToggle } from '../components/ThemeToggle';
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
import LogOutIcon from '@atlaskit/icon/core/log-out';

const CustomLogo = () => <span style={{ fontSize: '18px', fontWeight: 600, marginLeft: '4px', whiteSpace: 'nowrap' }}>TCKT Activity Hub</span>;

const ProductHomeExample = () => (
  <ProductHome icon={AtlassianIcon} logo={CustomLogo} />
);

export interface PageLayoutProps {
  children: React.ReactNode;
  currentView?: string;
  onNavigate?: (view: string) => void;
  user?: {
    id?: number;
    name: string;
    email?: string;
    role?: string;
    avatar_color?: string;
  } | null;
  onLogout?: () => void;
  /** Hiện mục menu "Báo cáo" (chỉ người có quyền điều hành/đề xuất hoạt động). Mặc định ẩn. */
  canViewReports?: boolean;
}

export const PageLayout: React.FC<PageLayoutProps> = ({
  children,
  currentView = 'dashboard',
  onNavigate,
  user,
  onLogout,
  canViewReports = false,
}) => {
  return (
    <PageLayoutWrapper>
      <TopNavigation isFixed={true} id="confluence-navigation">
        <AtlassianNavigation
          label="Site navigation"
          primaryItems={[]}
          renderProductHome={ProductHomeExample}
          renderSettings={() => (
            <div style={{ display: 'flex', alignItems: 'center', padding: '0 6px' }}>
              <ThemeToggle size={52} />
            </div>
          )}
          renderProfile={() => (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Avatar size="small" appearance="circle" name={user?.name || 'User'} />
              {user && (
                <span style={{ fontSize: '12px', fontWeight: 600, color: token('color.text', '#172B4D') }}>
                  {user.name}
                </span>
              )}
              {onLogout && (
                <button
                  type="button"
                  onClick={onLogout}
                  aria-label="Đăng xuất tài khoản"
                  style={{
                    marginLeft: '6px',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '6px',
                    borderRadius: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    color: token('color.icon.danger', '#DE350B'),
                    transition: 'background-color 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = token('color.background.danger.subtle', '#FFEBE6');
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                  title="Đăng xuất"
                >
                  <LogOutIcon label="Đăng xuất" />
                </button>
              )}
            </div>
          )}
        />
      </TopNavigation>
      <Content>
        <LeftSidebar isFixed={true} width={240} id="project-navigation">
          <div style={{ backgroundColor: token('elevation.surface', '#fff'), height: '100%', borderRight: `1px solid ${token('color.border', '#DFE1E6')}`, display: 'flex', flexDirection: 'column' }}>
            <div style={{ flex: 1, overflowY: 'auto' }}>
              <MenuGroup>
                <Section>
                  <ButtonItem isSelected={currentView === 'dashboard'} onClick={() => onNavigate?.('dashboard')} iconBefore={<DashboardIcon label="" />}>Tổng quan</ButtonItem>
                  <ButtonItem isSelected={currentView === 'my-tasks-today'} onClick={() => onNavigate?.('my-tasks-today')} iconBefore={<CheckCircleIcon label="" />}>Việc hôm nay</ButtonItem>
                  <ButtonItem isSelected={currentView === 'calendar'} onClick={() => onNavigate?.('calendar')} iconBefore={<CalendarIcon label="" />}>Lịch hoạt động</ButtonItem>
                  <ButtonItem isSelected={currentView === 'activities'} onClick={() => onNavigate?.('activities')} iconBefore={<FolderClosedIcon label="" />}>Hoạt động & Dự án</ButtonItem>
                  <ButtonItem isSelected={currentView === 'my-tasks'} onClick={() => onNavigate?.('my-tasks')} iconBefore={<TaskIcon label="" />}>Công việc của tôi</ButtonItem>
                  <ButtonItem isSelected={currentView === 'teams'} onClick={() => onNavigate?.('teams')} iconBefore={<PeopleGroupIcon label="" />}>Các Tổ</ButtonItem>
                  <ButtonItem isSelected={currentView === 'members'} onClick={() => onNavigate?.('members')} iconBefore={<PersonIcon label="" />}>Thành viên</ButtonItem>
                  <ButtonItem isSelected={currentView === 'documents'} onClick={() => onNavigate?.('documents')} iconBefore={<FileIcon label="" />}>Tài liệu</ButtonItem>
                  {canViewReports && <ButtonItem isSelected={currentView === 'reports'} onClick={() => onNavigate?.('reports')} iconBefore={<ChartBarIcon label="" />}>Báo cáo</ButtonItem>}
                  <ButtonItem isSelected={currentView === 'archive'} onClick={() => onNavigate?.('archive')} iconBefore={<ArchiveBoxIcon label="" />}>Lưu trữ</ButtonItem>
                </Section>
                <Section>
                  <HeadingItem>SẮP CÓ</HeadingItem>
                  <ButtonItem iconBefore={<SendIcon label="" />} iconAfter={<Lozenge appearance="new">Sắp có</Lozenge>}>Giao việc</ButtonItem>
                  <ButtonItem iconBefore={<InboxIcon label="" />} iconAfter={<Lozenge appearance="new">Sắp có</Lozenge>}>Trình</ButtonItem>
                  <ButtonItem iconBefore={<BookWithBookmarkIcon label="" />} iconAfter={<Lozenge appearance="new">Sắp có</Lozenge>}>Nhật ký trực ban</ButtonItem>
                </Section>
              </MenuGroup>
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
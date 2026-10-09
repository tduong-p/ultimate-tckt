import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
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

const NAV_ITEMS = [
  { path: '/dashboard', label: 'Tổng quan', Icon: DashboardIcon },
  { path: '/my-tasks-today', label: 'Việc hôm nay', Icon: CheckCircleIcon },
  { path: '/calendar', label: 'Lịch hoạt động', Icon: CalendarIcon },
  { path: '/activities', label: 'Hoạt động & Dự án', Icon: FolderClosedIcon },
  { path: '/my-tasks', label: 'Công việc của tôi', Icon: TaskIcon },
  { path: '/teams', label: 'Các Tổ', Icon: PeopleGroupIcon },
  { path: '/people', label: 'Thành viên', Icon: PersonIcon },
  { path: '/documents', label: 'Tài liệu', Icon: FileIcon },
  { path: '/reports', label: 'Báo cáo', Icon: ChartBarIcon, managerOnly: true },
  { path: '/archive', label: 'Lưu trữ', Icon: ArchiveBoxIcon },
];

export interface PageLayoutProps {
  children: React.ReactNode;
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
  /** Phần tử đặt cạnh avatar trên thanh trên cùng (vd. bộ chọn đơn vị). */
  headerExtras?: React.ReactNode;
}

export const PageLayout: React.FC<PageLayoutProps> = ({
  children,
  user,
  onLogout,
  canViewReports = false,
  headerExtras,
}) => {
  const location = useLocation();
  const navigate = useNavigate();
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
              {headerExtras}
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
                  {NAV_ITEMS.filter((item) => !item.managerOnly || canViewReports).map(({ path, label, Icon }) => {
                    const selected = location.pathname === path || location.pathname.startsWith(`${path}/`);
                    return (
                      <ButtonItem key={path} isSelected={selected} aria-current={selected ? 'page' : undefined}
                        onClick={() => navigate(path)} iconBefore={<Icon label="" />}>{label}</ButtonItem>
                    );
                  })}
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
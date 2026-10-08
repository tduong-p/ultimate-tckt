import React, { useState, useEffect } from 'react';
import '@atlaskit/css-reset';
import { token } from '@atlaskit/tokens';
import { setGlobalTheme } from '@atlaskit/tokens/set-global-theme';
import Avatar from '@atlaskit/avatar';
import Lozenge from '@atlaskit/lozenge';
import Button from '@atlaskit/button/new';

import {
  PageLayout as PageLayoutWrapper,
  Main,
  TopNavigation,
  LeftSidebar,
  Content,
} from '@atlaskit/page-layout';
import { AtlassianNavigation, ProductHome } from '@atlaskit/atlassian-navigation';
import { AtlassianIcon } from '@atlaskit/logo';
import { MenuGroup, ButtonItem, Section, HeadingItem } from '@atlaskit/menu';

import ThemeIcon from '@atlaskit/icon/core/theme';
import InboxIcon from '@atlaskit/icon/core/inbox';
import ChartBarIcon from '@atlaskit/icon/core/chart-bar';
import FileIcon from '@atlaskit/icon/core/file';
import PersonIcon from '@atlaskit/icon/core/person';
import SendIcon from '@atlaskit/icon/core/send';
import NotificationIcon from '@atlaskit/icon/core/notification';
import AppSwitcherIcon from '@atlaskit/icon/core/app-switcher';
import ArrowRightIcon from '@atlaskit/icon/core/arrow-right';

const CtdLogo = () => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap' }}>
    <span
      style={{
        backgroundColor: '#DE350B',
        color: '#FFFFFF',
        fontWeight: 700,
        fontSize: '12px',
        padding: '2px 6px',
        borderRadius: '3px',
        letterSpacing: '0.5px',
      }}
    >
      CTD
    </span>
    <span
      style={{
        fontSize: '17px',
        fontWeight: 600,
        color: token('color.text', '#172B4D'),
      }}
    >
      Hồ sơ Công tác Đảng
    </span>
  </div>
);

interface CtdLayoutProps {
  children: React.ReactNode;
  currentView: string;
  onNavigate: (view: string) => void;
  currentRole: 'can_bo' | 'sinh_vien';
  onRoleChange: (role: 'can_bo' | 'sinh_vien') => void;
}

export const CtdLayout: React.FC<CtdLayoutProps> = ({
  children,
  currentView,
  onNavigate,
  currentRole,
  onRoleChange,
}) => {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    setGlobalTheme({ colorMode: theme });
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === 'light' ? 'dark' : 'light'));

  return (
    <PageLayoutWrapper>
      <TopNavigation isFixed={true} id="ctd-top-nav">
        <AtlassianNavigation
          label="CTD navigation"
          primaryItems={[]}
          renderProductHome={() => <ProductHome icon={AtlassianIcon} logo={CtdLogo} />}
          renderNotifications={() => (
            <div
              style={{
                cursor: 'pointer',
                padding: '8px',
                color: token('color.icon', '#42526E'),
              }}
            >
              <NotificationIcon label="Thông báo" />
            </div>
          )}
          renderSettings={() => (
            <div
              onClick={toggleTheme}
              style={{
                cursor: 'pointer',
                padding: '8px',
                color: token('color.icon', '#42526E'),
              }}
              title="Đổi giao diện Sáng / Tối"
            >
              <ThemeIcon label="Đổi theme" />
            </div>
          )}
          renderProfile={() => (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Button
                appearance="subtle"
                onClick={() => {
                  window.location.href = '/core.html';
                }}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
                  <span>Về Điều hành TCKT</span>
                  <ArrowRightIcon label="" />
                </span>
              </Button>
              <Avatar
                size="small"
                appearance="circle"
                name={currentRole === 'can_bo' ? 'Cán bộ TCKT' : 'Sinh viên'}
              />
            </div>
          )}
        />
      </TopNavigation>

      <Content>
        <LeftSidebar isFixed={true} width={250} id="ctd-sidebar">
          <div
            style={{
              backgroundColor: token('elevation.surface', '#fff'),
              height: '100%',
              borderRight: `1px solid ${token('color.border', '#DFE1E6')}`,
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Role switch toggle */}
            <div
              style={{
                padding: '12px 16px',
                borderBottom: `1px solid ${token('color.border', '#DFE1E6')}`,
                backgroundColor: token('elevation.surface.sunken', '#F4F5F7'),
              }}
            >
              <div
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  color: token('color.text.subtlest', '#7A869A'),
                  marginBottom: '8px',
                  letterSpacing: '0.5px',
                }}
              >
                Chế độ xem vai trò
              </div>
              <div style={{ display: 'flex', gap: '4px' }}>
                <Button
                  spacing="compact"
                  appearance={currentRole === 'can_bo' ? 'primary' : 'default'}
                  onClick={() => onRoleChange('can_bo')}
                >
                  Cán bộ
                </Button>
                <Button
                  spacing="compact"
                  appearance={currentRole === 'sinh_vien' ? 'primary' : 'default'}
                  onClick={() => onRoleChange('sinh_vien')}
                >
                  Sinh viên
                </Button>
              </div>
            </div>

            {/* Navigation links */}
            <div style={{ flex: 1, overflowY: 'auto' }}>
              <MenuGroup>
                {currentRole === 'can_bo' ? (
                  <Section>
                    <HeadingItem>QUẢN LÝ XÉT DUYỆT</HeadingItem>
                    <ButtonItem
                      isSelected={currentView === 'inbox'}
                      onClick={() => onNavigate('inbox')}
                      iconBefore={<InboxIcon label="" />}
                    >
                      Hộp xử lý hồ sơ
                    </ButtonItem>
                    <ButtonItem
                      isSelected={currentView === 'review'}
                      onClick={() => onNavigate('review')}
                      iconBefore={<FileIcon label="" />}
                    >
                      Thẩm định chi tiết
                    </ButtonItem>
                    <ButtonItem
                      isSelected={currentView === 'dashboard'}
                      onClick={() => onNavigate('dashboard')}
                      iconBefore={<ChartBarIcon label="" />}
                    >
                      Toàn cảnh đợt xét
                    </ButtonItem>
                  </Section>
                ) : (
                  <Section>
                    <HeadingItem>HỒ SƠ CỦA BẠN</HeadingItem>
                    <ButtonItem
                      isSelected={currentView === 'student-case'}
                      onClick={() => onNavigate('student-case')}
                      iconBefore={<PersonIcon label="" />}
                    >
                      Trạng thái hồ sơ
                    </ButtonItem>
                    <ButtonItem
                      isSelected={currentView === 'student-submit'}
                      onClick={() => onNavigate('student-submit')}
                      iconBefore={<SendIcon label="" />}
                    >
                      Nộp & Bổ sung giấy tờ
                    </ButtonItem>
                  </Section>
                )}
              </MenuGroup>
            </div>

            {/* Footer */}
            <div
              style={{
                padding: '14px 16px',
                borderTop: `1px solid ${token('color.border', '#DFE1E6')}`,
                fontSize: '12px',
                color: token('color.text.subtle', '#5E6C84'),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <span style={{ fontWeight: 600 }}>CTD v2.0</span>
                <span style={{ marginLeft: '6px' }}>
                  <Lozenge appearance={currentRole === 'can_bo' ? 'new' : 'success'}>
                    {currentRole === 'can_bo' ? 'Cán bộ' : 'Sinh viên'}
                  </Lozenge>
                </span>
              </div>
              <div
                title="Hệ thống điều hành TCKT"
                style={{ cursor: 'pointer', color: token('color.icon', '#42526E') }}
                onClick={() => {
                  window.location.href = '/core.html';
                }}
              >
                <AppSwitcherIcon label="" />
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

import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Avatar } from '../../ui';
import { Icon, type IconName } from './icons';
import { NotificationBell } from './NotificationBell';
import { UnitSwitcher } from './UnitSwitcher';

interface NavDef {
  path: string;
  /** Đích khi bấm, nếu khác `path` (vd. kèm query). */
  to?: string;
  label: string;
  icon: IconName;
  /** Các tiền tố route con cũng tô sáng mục này (vd. /activity/5 → Hoạt động). */
  alsoPaths?: string[];
  show?: boolean;
}

export interface SidebarProps {
  user: { name: string } | null;
  canViewReports: boolean;
  canViewDieuHanh: boolean;
  canViewAccounts: boolean;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  onOpenAccount?: () => void;
  onLogout?: () => void;
  onCreate?: () => void;
  onSearch?: () => void;
  open: boolean;
  onClose: () => void;
}

const matches = (pathname: string, prefix: string) => pathname === prefix || pathname.startsWith(`${prefix}/`);

export const Sidebar: React.FC<SidebarProps> = ({
  user, canViewReports, canViewDieuHanh, canViewAccounts, theme, onToggleTheme, onOpenAccount, onLogout,
  onCreate, onSearch, open, onClose,
}) => {
  const { pathname } = useLocation();
  const navigate = useNavigate();

  const isActive = (n: { path: string; alsoPaths?: string[] }) => [n.path, ...(n.alsoPaths ?? [])].some((p) => matches(pathname, p));
  const go = (path: string) => { navigate(path); onClose(); };

  const work: NavDef[] = [
    { path: '/dashboard', label: 'Tổng quan', icon: 'grid' },
    { path: '/activities', label: 'Hoạt động', icon: 'activity', alsoPaths: ['/activity'] },
    { path: '/documents', label: 'Văn bản', icon: 'document' },
    { path: '/directives', label: 'Giao việc', icon: 'directive', alsoPaths: ['/directive'], show: canViewDieuHanh },
    { path: '/submissions', label: 'Trình', icon: 'submission', alsoPaths: ['/submission'], show: canViewDieuHanh },
  ];
  const org: NavDef[] = [
    { path: '/teams', label: 'Các tổ', icon: 'users', alsoPaths: ['/team'] },
    { path: '/calendar', label: 'Lịch', icon: 'calendar' },
    { path: '/people', label: 'Thành viên', icon: 'user' },
  ];
  const admin: NavDef[] = [
    { path: '/reports', label: 'Báo cáo', icon: 'chart', show: canViewReports },
    { path: '/archive', label: 'Lưu trữ', icon: 'archive' },
    { path: '/accounts', label: 'Quản trị tài khoản', icon: 'shield', show: canViewAccounts },
  ];

  const item = (n: NavDef) => (
    <li key={n.path}>
      <button type="button" className="shell-nav-item" aria-current={isActive(n) ? 'page' : undefined} onClick={() => go(n.to ?? n.path)}>
        <Icon name={n.icon} />
        <span className="shell-nav-label">{n.label}</span>
      </button>
    </li>
  );
  const group = (title: string, items: NavDef[]) => {
    const visible = items.filter((n) => n.show !== false);
    if (visible.length === 0) return null;
    return (
      <>
        <h2 className="shell-nav-group">{title}</h2>
        <ul className="shell-nav-list">{visible.map(item)}</ul>
      </>
    );
  };

  return (
    <>
      <div className={`shell-scrim${open ? ' shell-scrim--on' : ''}`} onClick={onClose} aria-hidden="true" data-testid="shell-scrim" />
      <nav className={`shell-sidebar${open ? ' shell-sidebar--open' : ''}`} aria-label="Điều hướng chính" id="shell-sidebar">
        <div className="shell-sidebar-head">
          <button type="button" className="shell-org" aria-label="Về trang tổng quan" aria-current={matches(pathname, '/dashboard') ? 'page' : undefined} onClick={() => go('/dashboard')}>
            <span className="shell-org-mark">T</span>
            <span className="shell-org-name">TCKT</span>
          </button>
          <span className="shell-spacer" />
          {onSearch && (
            <button type="button" className="shell-icon-btn" aria-label="Tìm kiếm (/)" onClick={onSearch}><Icon name="search" /></button>
          )}
          {onCreate && (
            <button type="button" className="shell-icon-btn shell-icon-btn--outline" aria-label="Tạo mới (C)" onClick={onCreate}><Icon name="plus" /></button>
          )}
        </div>
        <UnitSwitcher />
        <div className="shell-sidebar-scroll">
          <ul className="shell-nav-list">
            <li><NotificationBell active={matches(pathname, '/inbox')} onClick={() => go('/inbox')} /></li>
            {item({ path: '/my-tasks', to: '/my-tasks?tab=today', alsoPaths: ['/my-tasks-today'], label: 'Việc của tôi', icon: 'mine' })}
          </ul>
          {group('Không gian làm việc', work)}
          {group('Tổ chức', org)}
          {group('Quản lý', admin)}
        </div>
        <div className="shell-sidebar-foot">
          {user && (
            <button type="button" className="shell-nav-item shell-account" aria-label="Tài khoản của tôi" title="Tài khoản của tôi" onClick={onOpenAccount} disabled={!onOpenAccount}>
              <Avatar name={user.name} size={18} />
              <span className="shell-nav-label">{user.name}</span>
            </button>
          )}
          <button
            type="button"
            className="shell-icon-btn"
            aria-label={theme === 'dark' ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối'}
            onClick={onToggleTheme}
          >
            <Icon name={theme === 'dark' ? 'sun' : 'moon'} />
          </button>
          {onLogout && (
            <button type="button" className="shell-icon-btn" aria-label="Đăng xuất tài khoản" title="Đăng xuất" onClick={onLogout}><Icon name="logout" /></button>
          )}
        </div>
      </nav>
    </>
  );
};

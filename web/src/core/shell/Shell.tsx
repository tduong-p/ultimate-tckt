import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../../ui/tokens.css';
import '../../ui/ui.css';
import './shell.css';
import { NotificationPopups } from '../features/notifications/NotificationPopups';
import { Icon } from './icons';
import { Sidebar } from './Sidebar';
import { useShortcuts } from './useShortcuts';
import { useTheme } from './useTheme';

export interface ShellProps {
  children: React.ReactNode;
  user: { name: string } | null;
  canViewReports?: boolean;
  canViewDieuHanh?: boolean;
  canViewAccounts?: boolean;
  onOpenAccount?: () => void;
  onLogout?: () => void;
  /** Phím `c` / nút "+". Không truyền thì không có phím tắt/nút tạo mới. */
  onCreate?: () => void;
  /** Phím `/` / nút tìm kiếm. Không truyền thì không có phím tắt/nút tìm. */
  onSearch?: () => void;
}

/** Khung ứng dụng: sidebar (drawer dưới 768px) + vùng nội dung. Thay PageLayout cũ. */
export const Shell: React.FC<ShellProps> = ({
  children, user, canViewReports = false, canViewDieuHanh = false, canViewAccounts = false,
  onOpenAccount, onLogout, onCreate, onSearch,
}) => {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  useShortcuts({ onCreate, onSearch, onGoInbox: () => navigate('/inbox') });

  useEffect(() => {
    if (!drawerOpen) return;
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') setDrawerOpen(false); };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [drawerOpen]);

  return (
    <div className="shell">
      <header className="shell-topbar">
        <button
          type="button"
          className="shell-icon-btn"
          aria-label={drawerOpen ? 'Đóng menu' : 'Mở menu'}
          aria-expanded={drawerOpen}
          aria-controls="shell-sidebar"
          onClick={() => setDrawerOpen((o) => !o)}
        >
          <Icon name="menu" />
        </button>
        <span className="shell-topbar-title">TCKT</span>
      </header>
      <Sidebar
        user={user}
        canViewReports={canViewReports}
        canViewDieuHanh={canViewDieuHanh}
        canViewAccounts={canViewAccounts}
        theme={theme}
        onToggleTheme={toggleTheme}
        onOpenAccount={onOpenAccount}
        onLogout={onLogout}
        onCreate={onCreate}
        onSearch={onSearch}
        open={drawerOpen}
        onClose={closeDrawer}
      />
      <main className="shell-main">
        <div className="shell-content">{children}</div>
      </main>
      <NotificationPopups />
    </div>
  );
};

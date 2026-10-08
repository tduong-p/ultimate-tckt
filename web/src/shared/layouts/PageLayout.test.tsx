import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { PageLayout } from './PageLayout';
import { describe, it, expect, vi, afterEach } from 'vitest';

describe('PageLayout', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders without crashing', () => {
    const { container } = render(<PageLayout><div>Test</div></PageLayout>);
    expect(container).toBeDefined();
  });

  it('renders user information when user prop is provided', () => {
    const mockUser = {
      name: 'Nguyễn Văn A',
      email: 'a.nv@hust.edu.vn',
      role: 'admin',
    };

    render(
      <PageLayout user={mockUser}>
        <div>Content</div>
      </PageLayout>
    );

    expect(screen.getAllByText('Nguyễn Văn A').length).toBeGreaterThan(0);
  });

  it('triggers onLogout callback when logout button is clicked', () => {
    const handleLogout = vi.fn();
    const mockUser = {
      name: 'Nguyễn Văn A',
      email: 'a.nv@hust.edu.vn',
      role: 'admin',
    };

    render(
      <PageLayout user={mockUser} onLogout={handleLogout}>
        <div>Content</div>
      </PageLayout>
    );

    const logoutBtn = screen.getByRole('button', { name: /Đăng xuất tài khoản/i });
    expect(logoutBtn).toBeDefined();
    // Verify only 1 logout element exists (header only, none in sidebar footer)
    expect(screen.getAllByTitle('Đăng xuất').length).toBe(1);

    fireEvent.click(logoutBtn);
    expect(handleLogout).toHaveBeenCalledTimes(1);
  });

  it('không hiện các nút chưa có chức năng (Cài đặt, Chuyển vai trò, Báo Bug, Thông báo)', () => {
    render(<PageLayout><div>Content</div></PageLayout>);
    expect(screen.queryByTitle('Cài đặt (Admin, ĐYC)')).toBeNull();
    expect(screen.queryByTitle('Chuyển vai trò')).toBeNull();
    expect(screen.queryByTitle('Báo Bug')).toBeNull();
    expect(screen.queryByLabelText('Notifications')).toBeNull();
    expect(screen.queryByLabelText('Thông báo')).toBeNull();
  });

  it('mục Báo cáo chỉ hiện khi canViewReports là true', () => {
    const { rerender } = render(<PageLayout><div>Content</div></PageLayout>);
    expect(screen.queryByText('Báo cáo')).toBeNull();

    rerender(<PageLayout canViewReports={false}><div>Content</div></PageLayout>);
    expect(screen.queryByText('Báo cáo')).toBeNull();

    rerender(<PageLayout canViewReports><div>Content</div></PageLayout>);
    expect(screen.getByText('Báo cáo')).toBeDefined();
  });

  it('bấm mục Báo cáo chuyển sang màn reports', () => {
    const onNavigate = vi.fn();
    render(<PageLayout canViewReports onNavigate={onNavigate}><div>Content</div></PageLayout>);
    fireEvent.click(screen.getByText('Báo cáo'));
    expect(onNavigate).toHaveBeenCalledWith('reports');
  });
});

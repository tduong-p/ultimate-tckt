import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { PageLayout } from './PageLayout';
import { describe, it, expect, vi, afterEach } from 'vitest';
import React, { useState } from 'react';
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from 'react-router-dom';

const LocationProbe = () => <div data-testid="path">{useLocation().pathname}</div>;
const StatefulHeaderExtra = () => {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount((value) => value + 1)}>header count {count}</button>;
};
const NavigateToTeams = () => {
  const navigate = useNavigate();
  return <button onClick={() => navigate('/teams')}>go to teams</button>;
};
const renderLayout = (ui: React.ReactElement, path = '/dashboard') =>
  render(<MemoryRouter initialEntries={[path]}>{ui}<Routes><Route path="*" element={<LocationProbe />} /></Routes></MemoryRouter>);

describe('PageLayout', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders without crashing', () => {
    const { container } = renderLayout(<PageLayout><div>Test</div></PageLayout>);
    expect(container).toBeDefined();
  });

  it('renders user information when user prop is provided', () => {
    const mockUser = {
      name: 'Nguyễn Văn A',
      email: 'a.nv@hust.edu.vn',
      role: 'admin',
    };

    renderLayout(
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

    renderLayout(
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
    renderLayout(<PageLayout><div>Content</div></PageLayout>);
    expect(screen.queryByTitle('Cài đặt (Admin, ĐYC)')).toBeNull();
    expect(screen.queryByTitle('Chuyển vai trò')).toBeNull();
    expect(screen.queryByTitle('Báo Bug')).toBeNull();
    expect(screen.queryByLabelText('Notifications')).toBeNull();
    expect(screen.queryByLabelText('Thông báo')).toBeNull();
  });

  it('mục Báo cáo chỉ hiện khi canViewReports là true', () => {
    renderLayout(<PageLayout><div>Content</div></PageLayout>);
    expect(screen.queryByText('Báo cáo')).toBeNull();
    cleanup();
    renderLayout(<PageLayout canViewReports><div>Content</div></PageLayout>);
    expect(screen.getByText('Báo cáo')).toBeDefined();
  });

  it('bấm mục Báo cáo chuyển sang #/reports', () => {
    renderLayout(<PageLayout canViewReports><div>Content</div></PageLayout>);
    fireEvent.click(screen.getByText('Báo cáo'));
    expect(screen.getByTestId('path').textContent).toBe('/reports');
  });

  it('mục Thành viên trỏ #/people và được đánh dấu khi đang ở đó', () => {
    renderLayout(<PageLayout><div>Content</div></PageLayout>, '/people');
    const item = screen.getByText('Thành viên').closest('button');
    expect(item?.getAttribute('aria-current')).toBe('page');
  });

  it('headerExtras được hiện trên thanh trên cùng', () => {
    renderLayout(<PageLayout headerExtras={<span>ô-chọn-đơn-vị</span>}><div>Content</div></PageLayout>);
    expect(screen.getByText('ô-chọn-đơn-vị')).toBeDefined();
  });

  it('giữ headerExtras được mount khi đổi route', () => {
    renderLayout(
      <PageLayout headerExtras={<StatefulHeaderExtra />}><NavigateToTeams /></PageLayout>
    );
    fireEvent.click(screen.getByRole('button', { name: 'header count 0' }));
    expect(screen.getByRole('button', { name: 'header count 1' })).toBeDefined();

    fireEvent.click(screen.getByRole('button', { name: 'go to teams' }));

    expect(screen.getByTestId('path').textContent).toBe('/teams');
    expect(screen.getByRole('button', { name: 'header count 1' })).toBeDefined();
  });
});

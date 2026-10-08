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
});

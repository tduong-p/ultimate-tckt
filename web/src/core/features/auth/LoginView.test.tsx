import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { LoginView } from './LoginView';
import * as api from '../../api';

vi.mock('../../api', async () => {
  const actual = await vi.importActual<typeof import('../../api')>('../../api');
  return {
    ...actual,
    loginUser: vi.fn(),
  };
});

describe('LoginView Component', () => {
  const mockOnLoginSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders left brand hero column with heading, eyebrow, and quote', () => {
    render(<LoginView onLoginSuccess={mockOnLoginSuccess} />);

    expect(screen.getByText(/TCKT/i)).toBeDefined();
    expect(screen.getByText(/CÙNG LÀM VIỆC · CÙNG GHI NHỚ/i)).toBeDefined();
    expect(screen.getByText(/Mỗi đóng góp\./i)).toBeDefined();
    expect(screen.getByText(/Một câu chuyện chung\./i)).toBeDefined();
    expect(screen.getByText(/Dành cho Đoàn Thanh niên & Hội Sinh viên/i)).toBeDefined();
    expect(screen.getByText('MA')).toBeDefined();
    expect(screen.getByText('HN')).toBeDefined();
    expect(screen.getByText('BC')).toBeDefined();
  });

  it('renders right sign-in panel with Microsoft HUST SSO link and local login form', () => {
    render(<LoginView onLoginSuccess={mockOnLoginSuccess} />);

    expect(screen.getByText(/CHÀO MỪNG TRỞ LẠI/i)).toBeDefined();
    expect(screen.getByText(/Đăng nhập vào không gian làm việc/i)).toBeDefined();

    const ssoBtn = screen.getByRole('link', { name: /Đăng nhập bằng tài khoản HUST/i });
    expect(ssoBtn).toBeDefined();
    expect(ssoBtn.getAttribute('href')).toBe('/auth/microsoft');

    expect(screen.getByText(/HOẶC SỬ DỤNG TÀI KHOẢN NỘI BỘ/i)).toBeDefined();
    expect(screen.getByLabelText(/Địa chỉ email/i)).toBeDefined();
    expect(screen.getByLabelText(/Mật khẩu/i)).toBeDefined();
    expect(screen.getByRole('button', { name: /Đăng nhập/i })).toBeDefined();
    expect(screen.getByTestId('theme-toggle')).toBeDefined();
    expect(screen.getByTestId('microsoft-lottie-logo')).toBeDefined();
  });

  it('submits credentials and calls onLoginSuccess on successful login', async () => {
    vi.mocked(api.loginUser).mockResolvedValueOnce({
      user: { id: 1, name: 'Admin', email: 'admin@hust.edu.vn', role: 'admin' },
    });

    render(<LoginView onLoginSuccess={mockOnLoginSuccess} />);

    const emailInput = screen.getByLabelText(/Địa chỉ email/i);
    const passwordInput = screen.getByLabelText(/Mật khẩu/i);
    const submitButton = screen.getByRole('button', { name: /Đăng nhập/i });

    fireEvent.change(emailInput, { target: { value: 'admin@hust.edu.vn' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(api.loginUser).toHaveBeenCalledWith({
        email: 'admin@hust.edu.vn',
        password: 'password123',
      });
      expect(mockOnLoginSuccess).toHaveBeenCalled();
    });
  });

  it('displays error message when authentication fails', async () => {
    vi.mocked(api.loginUser).mockRejectedValueOnce({
      response: { data: { error: 'Email or password is incorrect.' } },
      message: 'Request failed with status code 401',
    });

    render(<LoginView onLoginSuccess={mockOnLoginSuccess} />);

    const emailInput = screen.getByLabelText(/Địa chỉ email/i);
    const passwordInput = screen.getByLabelText(/Mật khẩu/i);
    const submitButton = screen.getByRole('button', { name: /Đăng nhập/i });

    fireEvent.change(emailInput, { target: { value: 'wrong@hust.edu.vn' } });
    fireEvent.change(passwordInput, { target: { value: 'wrongpass' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/Email or password is incorrect\./i)).toBeDefined();
      expect(mockOnLoginSuccess).not.toHaveBeenCalled();
    });
  });

  it('toggles language between Vietnamese and English', () => {
    render(<LoginView onLoginSuccess={mockOnLoginSuccess} />);

    const langBtn = screen.getByLabelText(/Chuyển đổi ngôn ngữ/i);
    expect(screen.getByText(/CÙNG LÀM VIỆC · CÙNG GHI NHỚ/i)).toBeDefined();

    fireEvent.click(langBtn);

    expect(screen.getByText(/WORK TOGETHER · REMEMBER TOGETHER/i)).toBeDefined();
    expect(screen.getByText(/Sign in to your workspace/i)).toBeDefined();
  });
});

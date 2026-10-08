import React, { useState } from 'react';
import Button from '@atlaskit/button/new';
import Textfield from '@atlaskit/textfield';
import { token } from '@atlaskit/tokens';
import { loginUser } from '../../api';
import { LottieLoading } from '../../../shared/components/LottieLoading';

interface LoginViewProps {
  onLoginSuccess?: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
  const [lang, setLang] = useState<'vi' | 'en'>('vi');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const toggleLang = () => {
    setLang((prev) => (prev === 'vi' ? 'en' : 'vi'));
  };

  const isVi = lang === 'vi';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setIsLoading(true);
    setErrorMessage(null);

    try {
      await loginUser({ email, password });
      if (onLoginSuccess) {
        onLoginSuccess();
      }
    } catch (err: any) {
      const msg =
        err?.response?.data?.error ||
        err?.message ||
        (isVi ? 'Đăng nhập thất bại. Vui lòng kiểm tra lại.' : 'Login failed. Please check credentials.');
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1.1fr) minmax(0, 0.9fr)',
        minHeight: '100vh',
        backgroundColor: token('elevation.surface', '#FFFFFF'),
        fontFamily: 'var(--ds-font-family, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif)',
      }}
      className="login-container-responsive"
    >
      {/* Left Column: Brand Hero Art */}
      <section
        style={{
          background: 'linear-gradient(145deg, #0f172a, #1e3a8a, #2563eb)',
          padding: '48px 6vw',
          color: '#FFFFFF',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          overflow: 'hidden',
        }}
        className="login-hero-col"
      >
        {/* Subtle decorative circles */}
        <div
          style={{
            position: 'absolute',
            width: '450px',
            height: '450px',
            borderRadius: '50%',
            border: '90px solid rgba(255, 255, 255, 0.035)',
            right: '-200px',
            top: '-180px',
            pointerEvents: 'none',
          }}
        />
        <div
          style={{
            position: 'absolute',
            width: '360px',
            height: '360px',
            borderRadius: '50%',
            border: '80px solid rgba(255, 255, 255, 0.035)',
            left: '-180px',
            bottom: '-180px',
            pointerEvents: 'none',
          }}
        />

        {/* Brand Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', position: 'relative', zIndex: 1 }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              backgroundColor: '#000000',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF',
              fontWeight: 800,
              fontSize: '18px',
            }}
          >
            T
          </div>
          <div style={{ fontSize: '18px', color: '#FFFFFF' }}>
            TCKT <strong>Activity Hub</strong>
          </div>
        </div>

        {/* Main Hero Copy */}
        <div
          style={{
            margin: 'auto 0',
            maxWidth: '560px',
            position: 'relative',
            zIndex: 1,
            paddingTop: '32px',
            paddingBottom: '32px',
          }}
        >
          <span
            style={{
              fontSize: '11px',
              fontWeight: 700,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: '#93C5FD',
              display: 'inline-block',
              marginBottom: '16px',
            }}
          >
            {isVi ? 'CÙNG LÀM VIỆC · CÙNG GHI NHỚ' : 'WORK TOGETHER · REMEMBER TOGETHER'}
          </span>
          <h1
            style={{
              fontSize: 'clamp(36px, 4.5vw, 64px)',
              fontWeight: 800,
              lineHeight: 1.1,
              letterSpacing: '-0.04em',
              margin: '0 0 20px 0',
              color: '#FFFFFF',
            }}
          >
            {isVi ? 'Mỗi đóng góp.' : 'Every contribution.'}
            <br />
            <span style={{ color: '#F4C270' }}>{isVi ? 'Một câu chuyện chung.' : 'One shared story.'}</span>
          </h1>
          <p
            style={{
              fontSize: '16px',
              lineHeight: 1.6,
              color: '#DBEAFE',
              margin: 0,
            }}
          >
            {isVi
              ? 'Lập kế hoạch hoạt động, phối hợp các Tổ và lưu giữ những đóng góp thúc đẩy cộng đồng sinh viên.'
              : 'Plan activities, coordinate teams, and preserve the work that moves our student community forward.'}
          </p>
        </div>

        {/* Footer Quote */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            position: 'relative',
            zIndex: 1,
            fontSize: '12px',
            color: '#BFDBFE',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                backgroundColor: '#F4C270',
                color: '#1E3A8A',
                fontSize: '9px',
                fontWeight: 700,
                display: 'grid',
                placeItems: 'center',
                border: '2px solid #1E40AF',
              }}
            >
              MA
            </span>
            <span
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                backgroundColor: '#F4C270',
                color: '#1E3A8A',
                fontSize: '9px',
                fontWeight: 700,
                display: 'grid',
                placeItems: 'center',
                border: '2px solid #1E40AF',
                marginLeft: '-6px',
              }}
            >
              HN
            </span>
            <span
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                backgroundColor: '#F4C270',
                color: '#1E3A8A',
                fontSize: '9px',
                fontWeight: 700,
                display: 'grid',
                placeItems: 'center',
                border: '2px solid #1E40AF',
                marginLeft: '-6px',
              }}
            >
              BC
            </span>
          </div>
          <span>{isVi ? 'Dành cho Đoàn Thanh niên & Hội Sinh viên' : 'Built for the Youth Union & Student Association'}</span>
        </div>
      </section>

      {/* Right Column: Sign-in Panel */}
      <section
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '40px 24px',
          position: 'relative',
          backgroundColor: token('elevation.surface', '#FFFFFF'),
        }}
      >
        {/* Top Language Toggle */}
        <div style={{ position: 'absolute', top: '24px', right: '24px' }}>
          <button
            type="button"
            onClick={toggleLang}
            aria-label="Chuyển đổi ngôn ngữ"
            style={{
              background: 'none',
              border: `1px solid ${token('color.border', '#DFE1E6')}`,
              borderRadius: '6px',
              padding: '6px 10px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 600,
              display: 'flex',
              gap: '4px',
              alignItems: 'center',
              color: token('color.text', '#172B4D'),
            }}
          >
            <span style={{ color: isVi ? token('color.text', '#172B4D') : token('color.text.subtlest', '#6B778C') }}>
              VN
            </span>
            <span style={{ color: token('color.border', '#DFE1E6') }}>|</span>
            <span style={{ color: !isVi ? token('color.text', '#172B4D') : token('color.text.subtlest', '#6B778C') }}>
              EN
            </span>
          </button>
        </div>

        {/* Form Container */}
        <div style={{ width: '100%', maxWidth: '380px', position: 'relative' }}>
          {isLoading && (
            <div
              style={{
                position: 'absolute',
                top: -16,
                left: -16,
                right: -16,
                bottom: -16,
                backgroundColor: 'rgba(255, 255, 255, 0.88)',
                backdropFilter: 'blur(3px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 20,
                borderRadius: '8px',
              }}
            >
              <LottieLoading size={140} message={isVi ? 'Đang xác thực thông tin...' : 'Signing in...'} />
            </div>
          )}
          <span
            style={{
              fontSize: '11px',
              fontWeight: 700,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: token('color.text.brand', '#0052CC'),
              display: 'inline-block',
              marginBottom: '8px',
            }}
          >
            {isVi ? 'CHÀO MỪNG TRỞ LẠI' : 'WELCOME BACK'}
          </span>
          <h2
            style={{
              fontSize: '26px',
              fontWeight: 800,
              color: token('color.text', '#172B4D'),
              margin: '0 0 6px 0',
              letterSpacing: '-0.02em',
            }}
          >
            {isVi ? 'Đăng nhập vào không gian làm việc' : 'Sign in to your workspace'}
          </h2>
          <p
            style={{
              fontSize: '14px',
              color: token('color.text.subtlest', '#6B778C'),
              margin: '0 0 24px 0',
            }}
          >
            {isVi ? 'Sử dụng tài khoản trường để tiếp tục.' : 'Use your school account to continue.'}
          </p>

          {/* Microsoft HUST SSO Button */}
          <a
            href="/auth/microsoft"
            role="link"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              width: '100%',
              boxSizing: 'border-box',
              padding: '10px 16px',
              borderRadius: '6px',
              backgroundColor: '#FFFFFF',
              border: `1px solid ${token('color.border', '#DFE1E6')}`,
              color: token('color.text', '#172B4D'),
              fontSize: '14px',
              fontWeight: 600,
              textDecoration: 'none',
              boxShadow: '0 1px 2px rgba(9, 30, 66, 0.08)',
              transition: 'background-color 0.15s ease',
            }}
          >
            {/* Microsoft 4-color Square Icon */}
            <svg width="18" height="18" viewBox="0 0 21 21" fill="none" aria-hidden="true">
              <rect x="1" y="1" width="9" height="9" fill="#F25022" />
              <rect x="11" y="1" width="9" height="9" fill="#7FBA00" />
              <rect x="1" y="11" width="9" height="9" fill="#00A4EF" />
              <rect x="11" y="11" width="9" height="9" fill="#FFB900" />
            </svg>
            <span>{isVi ? 'Đăng nhập bằng tài khoản HUST' : 'Sign in with Microsoft HUST'}</span>
          </a>

          {/* Divider */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              margin: '20px 0',
              color: token('color.text.subtlest', '#6B778C'),
              fontSize: '10px',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
            }}
          >
            <div style={{ flex: 1, height: '1px', backgroundColor: token('color.border', '#EBECF0') }} />
            <span>{isVi ? 'HOẶC SỬ DỤNG TÀI KHOẢN NỘI BỘ' : 'OR USE YOUR LOCAL ACCOUNT'}</span>
            <div style={{ flex: 1, height: '1px', backgroundColor: token('color.border', '#EBECF0') }} />
          </div>

          {/* Error Notice */}
          {errorMessage && (
            <div
              role="alert"
              aria-live="assertive"
              style={{
                backgroundColor: '#FFEBE6',
                border: '1px solid #FF8F73',
                borderRadius: '6px',
                padding: '10px 14px',
                color: '#BF2600',
                fontSize: '13px',
                lineHeight: 1.4,
                marginBottom: '16px',
              }}
            >
              {errorMessage}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '16px' }}>
              <label
                htmlFor="login-email"
                style={{
                  display: 'block',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: token('color.text.subtle', '#42526E'),
                  marginBottom: '6px',
                }}
              >
                {isVi ? 'Địa chỉ email' : 'Email address'}
              </label>
              <Textfield
                id="login-email"
                name="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                placeholder="vidu@hust.edu.vn"
                isRequired
              />
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label
                htmlFor="login-password"
                style={{
                  display: 'block',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: token('color.text.subtle', '#42526E'),
                  marginBottom: '6px',
                }}
              >
                {isVi ? 'Mật khẩu' : 'Password'}
              </label>
              <Textfield
                id="login-password"
                name="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                isRequired
              />
            </div>

            <Button
              type="submit"
              appearance="primary"
              shouldFitContainer
              isLoading={isLoading}
            >
              {isVi ? 'Đăng nhập →' : 'Sign in →'}
            </Button>
          </form>
        </div>
      </section>
    </div>
  );
};

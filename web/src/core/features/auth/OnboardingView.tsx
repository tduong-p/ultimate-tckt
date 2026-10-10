import React, { useState } from 'react';
import { Button } from '../../../ui';
import { acknowledgeFacultyNotice, apiErrorMessage, submitStudentClass, type SessionUser } from '../../api';

interface OnboardingViewProps {
  user: SessionUser;
  onDone: (user: SessionUser) => void;
}

function errorMessage(err: unknown): string {
  return apiErrorMessage(err, 'Không lưu được thông tin. Vui lòng thử lại.');
}

/** Bước bắt buộc sau đăng nhập cho tài khoản HUST (giống modal onboarding của UI cũ). */
export const OnboardingView: React.FC<OnboardingViewProps> = ({ user, onDone }) => {
  const [classNumber, setClassNumber] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isFaculty = user.onboarding?.type === 'faculty_notice';

  const run = async (action: () => Promise<SessionUser>) => {
    setError('');
    setIsSubmitting(true);
    try {
      onDone(await action());
    } catch (err) {
      setError(errorMessage(err));
      setIsSubmitting(false);
    }
  };

  const handleStudentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const value = classNumber.trim().replace(/\s+/g, ' ');
    if (!value) {
      setError('Vui lòng nhập số lớp.');
      return;
    }
    run(() => submitStudentClass(value));
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        backgroundColor: 'var(--ui-bg-page)',
      }}
    >
      <div
        role="dialog"
        aria-labelledby="onboarding-title"
        style={{
          width: '100%',
          maxWidth: '440px',
          padding: '32px',
          borderRadius: 'var(--ui-radius-lg, 8px)',
          backgroundColor: 'var(--ui-bg-card)',
          boxShadow: 'var(--ui-shadow-md)',
          border: '1px solid var(--ui-border)',
          color: 'var(--ui-text)',
        }}
      >
        {isFaculty ? (
          <>
            <h1 id="onboarding-title" style={{ margin: '0 0 12px', fontSize: '20px' }}>
              Chào mừng đến với TCKT Activity Hub
            </h1>
            <p style={{ margin: '0 0 24px', color: 'var(--ui-text-muted)' }}>
              Để được cấp quyền, phân công nhiệm vụ hoặc cần thêm thông tin, vui lòng liên hệ quản trị viên
              hoặc gửi email tới{' '}
              <a href="mailto:van.nguyendinh@hust.edu.vn">van.nguyendinh@hust.edu.vn</a>.
            </p>
            {error && (
              <p role="alert" style={{ color: 'var(--ui-danger)' }}>
                {error}
              </p>
            )}
            <Button
              variant="primary"
              style={{ width: '100%' }}
              disabled={isSubmitting}
              onClick={() => run(acknowledgeFacultyNotice)}
            >
              Tôi đã hiểu
            </Button>
          </>
        ) : (
          <form onSubmit={handleStudentSubmit} noValidate>
            <h1 id="onboarding-title" style={{ margin: '0 0 12px', fontSize: '20px' }}>
              Khai báo lớp của bạn
            </h1>
            <p style={{ margin: '0 0 16px', color: 'var(--ui-text-muted)' }}>
              Vui lòng khai báo số lớp. Hệ thống sẽ hỏi lại sau mỗi lần đăng nhập cho tới khi bạn hoàn tất.
            </p>
            <div
              style={{
                marginBottom: '16px',
                padding: '12px',
                borderRadius: 'var(--ui-radius-md, 6px)',
                backgroundColor: 'var(--ui-bg-subtle)',
              }}
            >
              <strong>{user.cohort || 'Chưa xác định khóa'}</strong>
              <div style={{ fontSize: '12px', color: 'var(--ui-text-muted)' }}>
                {user.entrance_year
                  ? `Năm nhập học ${user.entrance_year}`
                  : 'Suy ra từ email sinh viên HUST của bạn'}
              </div>
            </div>
            <label htmlFor="onboarding-class" style={{ display: 'block', fontWeight: 600, marginBottom: '6px' }}>
              Số lớp
            </label>
            <input
              id="onboarding-class"
              aria-label="Số lớp"
              maxLength={100}
              placeholder="VD: Điện 1, Điện tử 2"
              value={classNumber}
              onChange={(e) => setClassNumber(e.target.value)}
              autoFocus
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: 'var(--ui-radius-sm, 4px)',
                border: '1px solid var(--ui-border)',
                backgroundColor: 'var(--ui-bg-input, var(--ui-bg-card))',
                color: 'var(--ui-text)',
                fontSize: '14px',
                boxSizing: 'border-box',
                outline: 'none',
              }}
            />
            {error && (
              <p role="alert" style={{ color: 'var(--ui-danger)' }}>
                {error}
              </p>
            )}
            <div style={{ marginTop: '16px' }}>
              <Button type="submit" variant="primary" style={{ width: '100%' }} disabled={isSubmitting}>
                Lưu và tiếp tục
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { token } from '@atlaskit/tokens';
import Button from '@atlaskit/button/new';
import Textfield from '@atlaskit/textfield';
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
        backgroundColor: token('elevation.surface.sunken', '#F7F8F9'),
      }}
    >
      <div
        role="dialog"
        aria-labelledby="onboarding-title"
        style={{
          width: '100%',
          maxWidth: '440px',
          padding: '32px',
          borderRadius: '8px',
          backgroundColor: token('elevation.surface.raised', '#FFFFFF'),
          boxShadow: token('elevation.shadow.raised', '0 1px 1px rgba(9, 30, 66, 0.25)'),
          color: token('color.text', '#172B4D'),
        }}
      >
        {isFaculty ? (
          <>
            <h1 id="onboarding-title" style={{ margin: '0 0 12px', fontSize: '20px' }}>
              Chào mừng đến với TCKT Activity Hub
            </h1>
            <p style={{ margin: '0 0 24px', color: token('color.text.subtle', '#5E6C84') }}>
              Để được cấp quyền, phân công nhiệm vụ hoặc cần thêm thông tin, vui lòng liên hệ quản trị viên
              hoặc gửi email tới{' '}
              <a href="mailto:van.nguyendinh@hust.edu.vn">van.nguyendinh@hust.edu.vn</a>.
            </p>
            {error && (
              <p role="alert" style={{ color: token('color.text.danger', '#AE2E24') }}>
                {error}
              </p>
            )}
            <Button
              appearance="primary"
              shouldFitContainer
              isDisabled={isSubmitting}
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
            <p style={{ margin: '0 0 16px', color: token('color.text.subtle', '#5E6C84') }}>
              Vui lòng khai báo số lớp. Hệ thống sẽ hỏi lại sau mỗi lần đăng nhập cho tới khi bạn hoàn tất.
            </p>
            <div
              style={{
                marginBottom: '16px',
                padding: '12px',
                borderRadius: '6px',
                backgroundColor: token('color.background.neutral', '#F1F2F4'),
              }}
            >
              <strong>{user.cohort || 'Chưa xác định khóa'}</strong>
              <div style={{ fontSize: '12px', color: token('color.text.subtle', '#5E6C84') }}>
                {user.entrance_year
                  ? `Năm nhập học ${user.entrance_year}`
                  : 'Suy ra từ email sinh viên HUST của bạn'}
              </div>
            </div>
            <label htmlFor="onboarding-class" style={{ display: 'block', fontWeight: 600, marginBottom: '6px' }}>
              Số lớp
            </label>
            <Textfield
              id="onboarding-class"
              aria-label="Số lớp"
              maxLength={100}
              placeholder="VD: Điện 1, Điện tử 2"
              value={classNumber}
              onChange={(e) => setClassNumber((e.target as HTMLInputElement).value)}
              autoFocus
            />
            {error && (
              <p role="alert" style={{ color: token('color.text.danger', '#AE2E24') }}>
                {error}
              </p>
            )}
            <div style={{ marginTop: '16px' }}>
              <Button type="submit" appearance="primary" shouldFitContainer isDisabled={isSubmitting}>
                Lưu và tiếp tục
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

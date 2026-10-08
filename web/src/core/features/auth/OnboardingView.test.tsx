import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { OnboardingView } from './OnboardingView';
import * as api from '../../api';
import type { SessionUser } from '../../api';

vi.mock('../../api', async () => {
  const actual = await vi.importActual<typeof import('../../api')>('../../api');
  return { ...actual, submitStudentClass: vi.fn(), acknowledgeFacultyNotice: vi.fn() };
});

const student: SessionUser = {
  id: 5,
  name: 'Nguyễn Văn A',
  email: 'a.nv230001@sis.hust.edu.vn',
  role: 'member',
  cohort: 'K68',
  entrance_year: 2023,
  onboarding: { type: 'student_class', required: true },
};

const faculty: SessionUser = {
  id: 6,
  name: 'Trần Thị B',
  email: 'b.tran@hust.edu.vn',
  role: 'member',
  onboarding: { type: 'faculty_notice', required: true },
};

describe('OnboardingView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('sinh viên khai số lớp rồi được báo hoàn tất kèm user mới', async () => {
    const updated = { ...student, class_number: 'Điện 1', onboarding: { type: 'student_class' as const, required: false } };
    vi.mocked(api.submitStudentClass).mockResolvedValue(updated);
    const onDone = vi.fn();
    render(<OnboardingView user={student} onDone={onDone} />);

    expect(screen.getByText('K68')).toBeDefined();
    fireEvent.change(screen.getByLabelText('Số lớp'), { target: { value: '  Điện 1 ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Lưu và tiếp tục' }));

    await waitFor(() => expect(onDone).toHaveBeenCalledWith(updated));
    expect(api.submitStudentClass).toHaveBeenCalledWith('Điện 1');
  });

  it('không gửi khi chưa nhập số lớp', () => {
    render(<OnboardingView user={student} onDone={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Lưu và tiếp tục' }));

    expect(screen.getByRole('alert').textContent).toContain('Vui lòng nhập số lớp.');
    expect(api.submitStudentClass).not.toHaveBeenCalled();
  });

  it('hiện lỗi máy chủ khi khai lớp thất bại', async () => {
    vi.mocked(api.submitStudentClass).mockRejectedValue({
      response: { status: 400, data: { error: 'The entrance year could not be inferred from this student email address.' } },
    });
    render(<OnboardingView user={student} onDone={vi.fn()} />);

    fireEvent.change(screen.getByLabelText('Số lớp'), { target: { value: 'Điện 1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Lưu và tiếp tục' }));

    expect((await screen.findByRole('alert')).textContent).toContain('Không xác định được khóa');
  });

  it('giảng viên xác nhận thông báo', async () => {
    const updated = { ...faculty, onboarding: { type: 'faculty_notice' as const, required: false } };
    vi.mocked(api.acknowledgeFacultyNotice).mockResolvedValue(updated);
    const onDone = vi.fn();
    render(<OnboardingView user={faculty} onDone={onDone} />);

    fireEvent.click(screen.getByRole('button', { name: 'Tôi đã hiểu' }));

    await waitFor(() => expect(onDone).toHaveBeenCalledWith(updated));
  });
});

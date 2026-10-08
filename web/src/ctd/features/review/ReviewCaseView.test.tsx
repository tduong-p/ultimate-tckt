import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { ReviewCaseView } from './ReviewCaseView';
import { INITIAL_CASES } from '../../data/ctdMockData';

describe('ReviewCaseView', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders applicant information, stepper, and back button', () => {
    const handleBack = vi.fn();
    render(<ReviewCaseView caseData={INITIAL_CASES[0]} onBack={handleBack} />);

    expect(screen.getByText('Hồ sơ: Nguyễn Minh Anh')).toBeDefined();
    expect(screen.getByText('20215412')).toBeDefined();
    expect(screen.getByText('Quay lại danh sách hồ sơ')).toBeDefined();
    expect(screen.getByText('Tiến trình xử lý hồ sơ Đảng')).toBeDefined();

    fireEvent.click(screen.getByText('Quay lại danh sách hồ sơ'));
    expect(handleBack).toHaveBeenCalled();
  });

  it('renders documents table and handles document verdict changes', () => {
    render(<ReviewCaseView caseData={INITIAL_CASES[0]} onBack={() => {}} />);

    expect(screen.getByText('Đơn xin vào Đảng')).toBeDefined();
    expect(screen.getByText('Lý lịch của người xin vào Đảng')).toBeDefined();

    const okButtons = screen.getAllByText('Đạt');
    expect(okButtons.length).toBeGreaterThan(0);
    fireEvent.click(okButtons[0]);
  });

  it('handles approve action', () => {
    const handleUpdate = vi.fn();
    render(
      <ReviewCaseView
        caseData={INITIAL_CASES[1]}
        onBack={() => {}}
        onUpdateStatus={handleUpdate}
      />
    );

    const approveBtn = screen.getByText('Thông qua hồ sơ');
    expect(approveBtn).toBeDefined();

    fireEvent.click(approveBtn);
    expect(handleUpdate).toHaveBeenCalledWith(INITIAL_CASES[1].id, 'tckt_checking');
  });
});

import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { StudentCaseView } from './StudentCaseView';
import { INITIAL_CASES } from '../../data/ctdMockData';

describe('StudentCaseView', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders student case status and alert when supplement is needed', () => {
    render(<StudentCaseView myCase={INITIAL_CASES[0]} />);

    expect(screen.getByText('Cổng nộp & theo dõi hồ sơ Đảng')).toBeDefined();
    expect(screen.getByText('Yêu cầu bổ sung tài liệu')).toBeDefined();
    expect(screen.getByText('Tài liệu & Giấy tờ trong hồ sơ (7)')).toBeDefined();
  });

  it('switches between status view and submission form', () => {
    render(<StudentCaseView myCase={INITIAL_CASES[0]} />);

    const submitTab = screen.getByText('Nộp hồ sơ Đảng mới');
    expect(submitTab).toBeDefined();

    fireEvent.click(submitTab);
    expect(screen.getByText('Đăng ký nộp hồ sơ Đảng')).toBeDefined();
    expect(screen.getByText('Loại hồ sơ đăng ký *')).toBeDefined();
    expect(screen.getByText('Gửi hồ sơ xét duyệt')).toBeDefined();
  });

  it('handles re-upload action for supplement required document', () => {
    render(<StudentCaseView myCase={INITIAL_CASES[0]} />);

    const reuploadBtn = screen.getByText('Tải lên bản sửa đổi');
    expect(reuploadBtn).toBeDefined();

    fireEvent.click(reuploadBtn);
    expect(screen.getByText(/Đã tải lên tệp bổ sung thành công/)).toBeDefined();
  });
});

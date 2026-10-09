import { describe, it, expect } from 'vitest';
import { ApiError, apiErrorMessage, translateServerError, NETWORK_ERROR_MESSAGE, DEFAULT_ERROR_MESSAGE } from './errors';

const axiosLike = (status: number, error?: unknown) => ({ response: { status, data: error === undefined ? {} : { error } } });

describe('apiErrorMessage', () => {
  it('dịch câu tiếng Anh đã biết của Core', () => {
    expect(apiErrorMessage(axiosLike(403, 'You do not have permission for this action.'))).toBe(
      'Bạn không có quyền thực hiện thao tác này.'
    );
  });

  it('giữ nguyên câu lạ (kể cả câu tiếng Việt server đã trả)', () => {
    expect(apiErrorMessage(axiosLike(403, 'Bạn không thuộc đơn vị này.'))).toBe('Bạn không thuộc đơn vị này.');
  });

  it('không có response thì báo không kết nối được máy chủ', () => {
    expect(apiErrorMessage(new Error('Network Error'))).toBe(NETWORK_ERROR_MESSAGE);
  });

  it('có response nhưng không có error thì dùng fallback', () => {
    expect(apiErrorMessage(axiosLike(500))).toBe(DEFAULT_ERROR_MESSAGE);
    expect(apiErrorMessage(axiosLike(500), 'Không lưu được.')).toBe('Không lưu được.');
  });

  it('ApiError đã dịch sẵn thì trả nguyên message', () => {
    expect(apiErrorMessage(new ApiError('Khoảng thời gian báo cáo không hợp lệ.', 400))).toBe(
      'Khoảng thời gian báo cáo không hợp lệ.'
    );
  });

  it('bảng gộp đủ câu của báo cáo, tạo đề xuất và onboarding', () => {
    expect(translateServerError('Choose a valid report date range.')).toBe('Khoảng thời gian báo cáo không hợp lệ.');
    expect(translateServerError('Complete all required fields and select at least one team.')).toBe(
      'Vui lòng điền đủ các trường bắt buộc và chọn ít nhất một Tổ.'
    );
    expect(translateServerError('Class number is required and must not exceed 100 characters.')).toBe(
      'Số lớp là bắt buộc và không quá 100 ký tự.'
    );
  });

  it('dịch câu lỗi của văn bản và thông báo', () => {
    expect(translateServerError('Complete every document field with valid information.')).toBe(
      'Vui lòng điền đủ và đúng mọi trường của văn bản.'
    );
    expect(translateServerError('The issuing team is unavailable.')).toBe('Tổ ban hành không còn khả dụng.');
    expect(translateServerError('You may only issue documents for your teams.')).toBe(
      'Bạn chỉ được ban hành văn bản cho các Tổ của mình.'
    );
    expect(translateServerError('Document not found.')).toBe('Không tìm thấy văn bản.');
    expect(translateServerError('You cannot edit this document.')).toBe('Bạn không có quyền sửa văn bản này.');
    expect(translateServerError('Notification not found.')).toBe('Không tìm thấy thông báo.');
  });
});


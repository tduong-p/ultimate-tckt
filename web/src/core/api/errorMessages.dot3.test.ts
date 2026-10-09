// web/src/core/api/errorMessages.dot3.test.ts
import { describe, it, expect } from 'vitest';
import { translateServerError } from './errors';

describe('câu lỗi của route Tổ và tài khoản', () => {
  const cases: Array<[string, string]> = [
    ['You cannot manage this team.', 'Bạn không có quyền quản lý Tổ này.'],
    ['You cannot edit this team.', 'Bạn không có quyền sửa Tổ này.'],
    ['You cannot view this team overview.', 'Bạn không có quyền xem Tổ này.'],
    ['Team not found.', 'Không tìm thấy Tổ.'],
    ['Team name is required.', 'Vui lòng nhập tên Tổ.'],
    ['Choose a valid team color.', 'Màu của Tổ không hợp lệ.'],
    ['Choose a valid team role.', 'Vai trò trong Tổ không hợp lệ.'],
    ['Team membership not found.', 'Thành viên không thuộc Tổ này.'],
    ['User not found.', 'Không tìm thấy tài khoản.'],
    ['Team leaders and vice leaders may only add member accounts.', 'Tổ trưởng và Tổ phó chỉ được thêm tài khoản thành viên thường.'],
    ['You cannot edit this account.', 'Bạn không có quyền sửa tài khoản này.'],
    ['Account not found.', 'Không tìm thấy tài khoản.'],
    ['Only administrators can change a password or email.', 'Chỉ quản trị viên được đổi mật khẩu hoặc email.'],
    ['The account must remain in at least one team you lead.', 'Tài khoản phải còn thuộc ít nhất một Tổ do bạn phụ trách.'],
    ['A member must belong to at least one team.', 'Thành viên phải thuộc ít nhất một Tổ.'],
    ['Name, email and a valid avatar color are required.', 'Cần có tên, email và màu đại diện hợp lệ.'],
    ['You cannot delete your own signed-in account.', 'Bạn không thể xoá tài khoản đang đăng nhập.'],
    ['You cannot delete this account.', 'Bạn không có quyền xoá tài khoản này.'],
    ['A valid email and avatar color are required.', 'Cần có email và màu đại diện hợp lệ.'],
    ['Password must contain at least 8 characters.', 'Mật khẩu phải có ít nhất 8 ký tự.'],
  ];
  it.each(cases)('dịch "%s"', (english, vietnamese) => {
    expect(translateServerError(english)).toBe(vietnamese);
  });

  it('câu tiếng Việt server đã trả thì giữ nguyên', () => {
    expect(translateServerError('Cấu hình này đang bị DYC khoá.')).toBe('Cấu hình này đang bị DYC khoá.');
  });
});

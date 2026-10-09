import { describe, it, expect } from 'vitest';
import { translateServerError } from './errors';

const CASES: Array<[string, string]> = [
  ['You cannot manage this activity.', 'Bạn không có quyền quản lý hoạt động này.'],
  ['Activity not found.', 'Không tìm thấy hoạt động.'],
  ['Only administrators can change involved teams.', 'Chỉ quản trị viên được đổi các Tổ tham gia.'],
  ['Title, description and deadline cannot be empty.', 'Tiêu đề, mô tả và hạn chót không được để trống.'],
  ['Select involved teams and a coordinating team.', 'Hãy chọn các Tổ tham gia và một Tổ chủ trì.'],
  ['One or more selected teams are unavailable.', 'Có Tổ được chọn không còn khả dụng.'],
  [
    'A team with existing tasks cannot be removed. Reassign those tasks first.',
    'Không thể gỡ Tổ đang có công việc. Hãy chuyển các công việc đó trước.',
  ],
  ['A valid activity ID is required.', 'Mã hoạt động không hợp lệ.'],
  ['You cannot manage participants for this activity.', 'Bạn không có quyền quản lý người tham gia của hoạt động này.'],
  ['Select at least one member.', 'Hãy chọn ít nhất một thành viên.'],
  [
    'You may only add active members from teams you lead or teams on this activity.',
    'Bạn chỉ được thêm thành viên đang hoạt động thuộc Tổ bạn phụ trách hoặc Tổ của hoạt động này.',
  ],
  ['Invalid update type.', 'Loại cập nhật không hợp lệ.'],
  ['You cannot post this type of update.', 'Bạn không được đăng loại cập nhật này.'],
  ['The attachment must be a valid http:// or https:// link.', 'Liên kết đính kèm phải bắt đầu bằng http:// hoặc https://.'],
  ['The task does not belong to this activity.', 'Công việc không thuộc hoạt động này.'],
  ['Write an update first.', 'Hãy nhập nội dung cập nhật.'],
  ['You cannot tag yourself.', 'Bạn không thể gắn thẻ chính mình.'],
  ['One or more tagged people are unavailable.', 'Có người được gắn thẻ không còn khả dụng.'],
];

describe('bảng dịch lỗi của route hoạt động', () => {
  it.each(CASES)('%s', (english, vietnamese) => {
    expect(translateServerError(english)).toBe(vietnamese);
  });

  it('câu server đã trả tiếng Việt giữ nguyên', () => {
    expect(translateServerError('Đề án không ở trạng thái chờ duyệt.')).toBe('Đề án không ở trạng thái chờ duyệt.');
  });
});

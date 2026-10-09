// Bảng duy nhất dịch các câu lỗi tiếng Anh của Core sang tiếng Việt. Câu không có trong bảng được hiện nguyên văn.
export const VI_ERROR_MESSAGES: Record<string, string> = {
  // Chung
  'You do not have permission for this action.': 'Bạn không có quyền thực hiện thao tác này.',
  'Please sign in to continue.': 'Vui lòng đăng nhập để tiếp tục.',
  'Administrator access is required.': 'Chỉ quản trị viên được thực hiện thao tác này.',
  'No valid fields supplied.': 'Không có thông tin hợp lệ để lưu.',
  // Đăng nhập
  'Email or password is incorrect.': 'Email hoặc mật khẩu không đúng.',
  // Báo cáo
  'Choose a valid report date range.': 'Khoảng thời gian báo cáo không hợp lệ.',
  'No reportable teams are available.': 'Bạn chưa quản lý Tổ nào để xuất báo cáo.',
  'You cannot export a report for this team.': 'Bạn không có quyền xuất báo cáo của Tổ này.',
  // Tạo đề xuất hoạt động
  'Complete all required fields and select at least one team.':
    'Vui lòng điền đủ các trường bắt buộc và chọn ít nhất một Tổ.',
  'Team leaders and vice leaders may only propose work for teams they lead.':
    'Tổ trưởng/Tổ phó chỉ được đề xuất cho các Tổ mình phụ trách.',
  'The activity proposal document must be a valid http:// or https:// link.':
    'Liên kết văn bản đề xuất phải bắt đầu bằng http:// hoặc https://.',
  'The public image must be a valid http:// or https:// link.':
    'Liên kết ảnh công khai phải bắt đầu bằng http:// hoặc https://.',
  // Hoạt động: chi tiết, sửa, người tham gia, cập nhật (đợt 1)
  'You cannot manage this activity.': 'Bạn không có quyền quản lý hoạt động này.',
  'Activity not found.': 'Không tìm thấy hoạt động.',
  'Only administrators can change involved teams.': 'Chỉ quản trị viên được đổi các Tổ tham gia.',
  'Title, description and deadline cannot be empty.': 'Tiêu đề, mô tả và hạn chót không được để trống.',
  'Select involved teams and a coordinating team.': 'Hãy chọn các Tổ tham gia và một Tổ chủ trì.',
  'One or more selected teams are unavailable.': 'Có Tổ được chọn không còn khả dụng.',
  'A team with existing tasks cannot be removed. Reassign those tasks first.':
    'Không thể gỡ Tổ đang có công việc. Hãy chuyển các công việc đó trước.',
  'A valid activity ID is required.': 'Mã hoạt động không hợp lệ.',
  'You cannot manage participants for this activity.': 'Bạn không có quyền quản lý người tham gia của hoạt động này.',
  'Select at least one member.': 'Hãy chọn ít nhất một thành viên.',
  'You may only add active members from teams you lead or teams on this activity.':
    'Bạn chỉ được thêm thành viên đang hoạt động thuộc Tổ bạn phụ trách hoặc Tổ của hoạt động này.',
  'Invalid update type.': 'Loại cập nhật không hợp lệ.',
  'You cannot post this type of update.': 'Bạn không được đăng loại cập nhật này.',
  'The attachment must be a valid http:// or https:// link.': 'Liên kết đính kèm phải bắt đầu bằng http:// hoặc https://.',
  'The task does not belong to this activity.': 'Công việc không thuộc hoạt động này.',
  'Write an update first.': 'Hãy nhập nội dung cập nhật.',
  'You cannot tag yourself.': 'Bạn không thể gắn thẻ chính mình.',
  'One or more tagged people are unavailable.': 'Có người được gắn thẻ không còn khả dụng.',
  // Onboarding HUST
  'Class number is required and must not exceed 100 characters.': 'Số lớp là bắt buộc và không quá 100 ký tự.',
  'The entrance year could not be inferred from this student email address.':
    'Không xác định được khóa học từ email sinh viên này. Vui lòng liên hệ quản trị viên.',
  'This information is only for HUST student accounts.': 'Thông tin này chỉ dành cho tài khoản sinh viên HUST.',
  'This notice is only for HUST staff and faculty accounts.':
    'Thông báo này chỉ dành cho tài khoản cán bộ, giảng viên HUST.',
  // Công việc (đợt 2)
  'Task not found.': 'Không tìm thấy công việc.',
  'You cannot update this task.': 'Bạn không thể cập nhật công việc này.',
  'Attachment not found.': 'Không tìm thấy tài liệu.',
  'Stored file not found.': 'Không tìm thấy tệp đã lưu.',
  'You cannot manage this team.': 'Bạn không có quyền quản lý Tổ này.',
  // Tổ, thành viên Tổ, tài khoản (đợt 3)
  'You cannot edit this team.': 'Bạn không có quyền sửa Tổ này.',
  'You cannot view this team overview.': 'Bạn không có quyền xem Tổ này.',
  'Team not found.': 'Không tìm thấy Tổ.',
  'Team name is required.': 'Vui lòng nhập tên Tổ.',
  'Choose a valid team color.': 'Màu của Tổ không hợp lệ.',
  'Choose a valid team role.': 'Vai trò trong Tổ không hợp lệ.',
  'Team membership not found.': 'Thành viên không thuộc Tổ này.',
  'User not found.': 'Không tìm thấy tài khoản.',
  'Team leaders and vice leaders may only add member accounts.':
    'Tổ trưởng và Tổ phó chỉ được thêm tài khoản thành viên thường.',
  'You cannot edit this account.': 'Bạn không có quyền sửa tài khoản này.',
  'Account not found.': 'Không tìm thấy tài khoản.',
  'Only administrators can change a password or email.': 'Chỉ quản trị viên được đổi mật khẩu hoặc email.',
  'The account must remain in at least one team you lead.':
    'Tài khoản phải còn thuộc ít nhất một Tổ do bạn phụ trách.',
  'A member must belong to at least one team.': 'Thành viên phải thuộc ít nhất một Tổ.',
  'Name, email and a valid avatar color are required.': 'Cần có tên, email và màu đại diện hợp lệ.',
  'You cannot delete your own signed-in account.': 'Bạn không thể xoá tài khoản đang đăng nhập.',
  'You cannot delete this account.': 'Bạn không có quyền xoá tài khoản này.',
  'A valid email and avatar color are required.': 'Cần có email và màu đại diện hợp lệ.',
  'Password must contain at least 8 characters.': 'Mật khẩu phải có ít nhất 8 ký tự.',
};

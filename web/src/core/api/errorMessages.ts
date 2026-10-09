// Bảng duy nhất dịch các câu lỗi tiếng Anh của Core sang tiếng Việt. Câu không có trong bảng được hiện nguyên văn.
export const VI_ERROR_MESSAGES: Record<string, string> = {
  // Chung
  'You do not have permission for this action.': 'Bạn không có quyền thực hiện thao tác này.',
  'Please sign in to continue.': 'Vui lòng đăng nhập để tiếp tục.',
  'Administrator access is required.': 'Chỉ quản trị viên được thực hiện thao tác này.',
  'No valid fields supplied.': 'Không có thông tin hợp lệ để lưu.',
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
  // Onboarding HUST
  'Class number is required and must not exceed 100 characters.': 'Số lớp là bắt buộc và không quá 100 ký tự.',
  'The entrance year could not be inferred from this student email address.':
    'Không xác định được khóa học từ email sinh viên này. Vui lòng liên hệ quản trị viên.',
  'This information is only for HUST student accounts.': 'Thông tin này chỉ dành cho tài khoản sinh viên HUST.',
  'This notice is only for HUST staff and faculty accounts.':
    'Thông báo này chỉ dành cho tài khoản cán bộ, giảng viên HUST.',
};

// Nhãn và màu hiển thị chung cho trạng thái / mức ưu tiên của task Core.
// Trạng thái Core: open, in_progress, review, done, cancelled ('todo' chỉ còn trong dữ liệu cũ/test).

export type LozengeAppearance = 'default' | 'success' | 'inprogress' | 'moved' | 'removed' | 'new';

export const getTaskStatusLabel = (status?: string | null): string => {
  switch (status?.toLowerCase()) {
    case 'open':
    case 'todo':
      return 'Cần làm';
    case 'in_progress':
      return 'Đang làm';
    case 'review':
      return 'Chờ duyệt';
    case 'done':
      return 'Đã xong';
    case 'cancelled':
      return 'Đã hủy';
    default:
      return status || 'Mới';
  }
};

export const getTaskStatusAppearance = (status?: string | null): LozengeAppearance => {
  switch (status?.toLowerCase()) {
    case 'done':
      return 'success';
    case 'in_progress':
      return 'inprogress';
    case 'review':
      return 'moved';
    case 'cancelled':
      return 'removed';
    default:
      return 'default';
  }
};

export const getTaskPriorityLabel = (priority?: string | null): string => {
  switch (priority?.toLowerCase()) {
    case 'low':
      return 'Thấp';
    case 'medium':
      return 'Trung bình';
    case 'high':
      return 'Cao';
    case 'urgent':
      return 'Khẩn cấp';
    default:
      return priority || '';
  }
};

export const getTaskPriorityAppearance = (priority?: string | null): LozengeAppearance =>
  priority === 'urgent' || priority === 'high' ? 'removed' : 'default';

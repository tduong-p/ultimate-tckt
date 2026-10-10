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

const ATTACHMENT_KIND_LABELS: Record<string, string> = {
  clarification: 'Làm rõ',
  evidence: 'Minh chứng',
  issue: 'Vướng mắc',
  deliverable: 'Sản phẩm bàn giao',
};

export const getAttachmentKindLabel = (kind?: string | null): string => ATTACHMENT_KIND_LABELS[kind ?? ''] ?? kind ?? '';

const UPDATE_KIND_LABELS: Record<string, string> = {
  comment: 'Bình luận',
  progress: 'Tiến độ',
  issue: 'Vướng mắc',
  evidence: 'Minh chứng',
  review_note: 'Ghi chú nghiệm thu',
};

export const getUpdateKindLabel = (kind?: string | null): string => UPDATE_KIND_LABELS[kind ?? ''] ?? kind ?? '';


export interface Option {
  value: string;
  label: string;
}

export const PRIORITY_OPTIONS: Option[] = [
  { value: 'low', label: 'Thấp' },
  { value: 'medium', label: 'Trung bình' },
  { value: 'high', label: 'Cao' },
  { value: 'urgent', label: 'Khẩn cấp' },
];

export const STAGE_OPTIONS: Option[] = [
  { value: 'before', label: 'Trước sự kiện' },
  { value: 'during', label: 'Trong sự kiện' },
  { value: 'after', label: 'Sau sự kiện' },
  { value: 'general', label: 'Chung' },
];

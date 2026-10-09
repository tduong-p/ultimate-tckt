import { describe, it, expect } from 'vitest';
import {
  getTaskStatusLabel,
  getTaskPriorityLabel,
  getAttachmentKindLabel,
  getUpdateKindLabel,
} from './taskLabels';

describe('taskLabels', () => {
  it('dịch trạng thái task Core sang tiếng Việt', () => {
    expect(getTaskStatusLabel('open')).toBe('Cần làm');
    expect(getTaskStatusLabel('in_progress')).toBe('Đang làm');
    expect(getTaskStatusLabel('review')).toBe('Chờ duyệt');
    expect(getTaskStatusLabel('done')).toBe('Đã xong');
    expect(getTaskStatusLabel('cancelled')).toBe('Đã hủy');
  });

  it('dịch mức ưu tiên sang tiếng Việt', () => {
    expect(getTaskPriorityLabel('low')).toBe('Thấp');
    expect(getTaskPriorityLabel('medium')).toBe('Trung bình');
    expect(getTaskPriorityLabel('high')).toBe('Cao');
    expect(getTaskPriorityLabel('urgent')).toBe('Khẩn cấp');
  });

  it('nhãn loại tài liệu và loại cập nhật', () => {
    expect(getAttachmentKindLabel('deliverable')).toBe('Sản phẩm bàn giao');
    expect(getAttachmentKindLabel('lạ')).toBe('lạ');
    expect(getUpdateKindLabel('review_note')).toBe('Ghi chú nghiệm thu');
    expect(getUpdateKindLabel('comment')).toBe('Bình luận');
  });
});

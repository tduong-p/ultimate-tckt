import { describe, it, expect } from 'vitest';
import { deliveryLabel, notificationBody, notificationTitle } from './notificationText';

describe('notificationText', () => {
  it('dịch tiêu đề tiếng Anh đã biết, giữ nguyên tiêu đề tiếng Việt và câu lạ', () => {
    expect(notificationTitle('You were tagged in a comment')).toBe('Bạn được gắn thẻ trong một bình luận');
    expect(notificationTitle('New task response')).toBe('Phản hồi mới về công việc');
    expect(notificationTitle('Công việc mới')).toBe('Công việc mới');
    expect(notificationTitle('Something else')).toBe('Something else');
  });

  it('dịch nội dung theo mẫu của Core, giữ nguyên nội dung khác', () => {
    expect(notificationBody('Lan tagged you in “Hội nghị”.')).toBe('Lan đã gắn thẻ bạn trong “Hội nghị”.');
    expect(notificationBody('Minh responded to “Soạn kế hoạch”.')).toBe('Minh đã phản hồi về “Soạn kế hoạch”.');
    expect(notificationBody('Bạn được giao: Soạn kế hoạch')).toBe('Bạn được giao: Soạn kế hoạch');
  });

  it('nhãn trạng thái gửi', () => {
    expect(deliveryLabel('email', 'success')).toBe('Email: đã gửi');
    expect(deliveryLabel('email', 'pending')).toBe('Email: đang chờ');
    expect(deliveryLabel('email', 'failed')).toBe('Email: lỗi');
    expect(deliveryLabel('push', 'sent')).toBe('Push: đã gửi');
    expect(deliveryLabel('push', 'weird')).toBe('Push: weird');
  });
});

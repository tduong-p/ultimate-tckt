import { describe, it, expect, vi, afterEach } from 'vitest';
import { toVnDateKey, formatVnDate, todayVnKey, vnDateKeyToLocalDate } from './date';

describe('date utils (giờ Việt Nam)', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('quy đổi timestamp UTC của cột DATE (00:00 +07) về đúng ngày Việt Nam', () => {
    expect(toVnDateKey('2026-10-07T17:00:00.000Z')).toBe('2026-10-08');
  });

  it('giữ nguyên chuỗi ngày thuần YYYY-MM-DD', () => {
    expect(toVnDateKey('2026-10-08')).toBe('2026-10-08');
  });

  it('trả rỗng cho giá trị thiếu hoặc không hợp lệ', () => {
    expect(toVnDateKey(null)).toBe('');
    expect(toVnDateKey(undefined)).toBe('');
    expect(toVnDateKey('không phải ngày')).toBe('');
  });

  it('định dạng DD/MM/YYYY theo ngày Việt Nam', () => {
    expect(formatVnDate('2026-10-07T17:00:00.000Z')).toBe('08/10/2026');
    expect(formatVnDate(null)).toBe('');
  });

  it('hôm nay tính theo giờ Việt Nam, không theo UTC', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-08T18:30:00.000Z')); // 01:30 ngày 09/10 giờ VN
    expect(todayVnKey()).toBe('2026-10-09');
  });

  it('đổi khoá ngày thành Date local nửa đêm để tính lịch', () => {
    const d = vnDateKeyToLocalDate('2026-10-08');
    expect([d.getFullYear(), d.getMonth(), d.getDate()]).toEqual([2026, 9, 8]);
  });
});

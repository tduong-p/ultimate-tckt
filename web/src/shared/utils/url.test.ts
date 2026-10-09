import { describe, it, expect } from 'vitest';
import { isHttpUrl } from './url';

describe('isHttpUrl', () => {
  it('nhận http/https hợp lệ', () => {
    expect(isHttpUrl('https://drive.google.com/x')).toBe(true);
    expect(isHttpUrl(' http://a.vn ')).toBe(true);
  });
  it('từ chối giao thức khác, chuỗi rỗng, chuỗi không phải URL', () => {
    expect(isHttpUrl('javascript:alert(1)')).toBe(false);
    expect(isHttpUrl('ftp://a.vn')).toBe(false);
    expect(isHttpUrl('')).toBe(false);
    expect(isHttpUrl('drive.google.com')).toBe(false);
  });
});

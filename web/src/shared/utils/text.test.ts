import { describe, it, expect } from 'vitest';
import { normalizeSearch } from './text';

describe('normalizeSearch', () => {
  it('bỏ dấu tiếng Việt, đ→d, chữ thường', () => {
    expect(normalizeSearch('  Nguyễn Đức Ánh ')).toBe('nguyen duc anh');
  });
});

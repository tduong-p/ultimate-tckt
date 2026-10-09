import { describe, it, expect } from 'vitest';
import { formatBytes } from './bytes';

describe('formatBytes', () => {
  it('định dạng kiểu Việt Nam', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(1536)).toBe('1,5 KB');
    expect(formatBytes(50 * 1024 * 1024)).toBe('50 MB');
    expect(formatBytes(13107200)).toBe('12,5 MB');
  });
});

import { useEffect, useState } from 'react';

// Trả về `value` sau khi nó ngừng thay đổi `delayMs` ms — dùng cho ô tìm kiếm để không gọi API mỗi phím gõ.
export function useDebouncedValue<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}

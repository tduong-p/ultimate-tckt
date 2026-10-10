import { useCallback, useEffect, useState } from 'react';
import { applyGlobalTheme, getStoredTheme, type ThemeMode } from '../../shared/hooks/useTheme';

const MODES = ['light', 'dark'];

/** Thêm từ `light`/`dark` vào danh sách từ của data-theme, giữ nguyên phần Atlaskit (`dark:dark light:light ...`). */
function withMode(current: string, theme: ThemeMode): string {
  return [...current.split(/\s+/).filter((w) => w && !MODES.includes(w)), theme].join(' ');
}

/**
 * Giao diện sáng/tối của shell. applyGlobalTheme đổi token Atlaskit (và ghi localStorage `tckt_theme`) cho các màn cũ,
 * nhưng Atlaskit cũng dùng chính thuộc tính `data-theme` trên <html> (đặt bất đồng bộ, ghi đè). Token `--ui-*` khớp theo từ
 * (`[data-theme~='dark']`), nên ở đây ta thêm từ `light`/`dark` và dựng lại mỗi khi Atlaskit ghi đè.
 * Truy cập storage đã nằm trong try/catch của getStoredTheme/applyGlobalTheme.
 */
export function useTheme() {
  const [theme, setTheme] = useState<ThemeMode>(getStoredTheme);

  useEffect(() => {
    const root = document.documentElement;
    const sync = () => {
      const current = root.getAttribute('data-theme') ?? '';
      const next = withMode(current, theme);
      if (next !== current) root.setAttribute('data-theme', next);
    };
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(root, { attributes: true, attributeFilter: ['data-theme'] });
    applyGlobalTheme(theme);
    return () => observer.disconnect();
  }, [theme]);

  const toggleTheme = useCallback(() => setTheme((t) => (t === 'dark' ? 'light' : 'dark')), []);
  return { theme, toggleTheme };
}

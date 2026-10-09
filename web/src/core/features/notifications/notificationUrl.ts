/**
 * `url` của thông báo là hash cũ của Core (`/#activity/12`). Đổi thành đường dẫn của HashRouter (`/activity/12`).
 * Không có hash thì về Tổng quan, như UI cũ (`target.hash || '#dashboard'`).
 */
export function notificationRoute(url?: string | null): string {
  if (!url) return '/dashboard';
  let hash: string;
  try {
    hash = new URL(url, 'http://localhost').hash;
  } catch {
    return '/dashboard';
  }
  const path = hash.replace(/^#\/?/, '');
  return path ? `/${path}` : '/dashboard';
}

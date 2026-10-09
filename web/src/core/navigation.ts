/** Đường dẫn trong router (không có `#`). */
export const activityPath = (id: number | string): string => `/activity/${id}`;

/** Giá trị `href` cho thẻ `<a>`; dùng được ngoài ngữ cảnh Router (HashRouter nhận hash). */
export const activityHref = (id: number | string): string => `#${activityPath(id)}`;

/** Chuyển tới chi tiết hoạt động mà không cần `useNavigate`. */
export function goToActivity(id: number | string): void {
  window.location.hash = activityPath(id);
}

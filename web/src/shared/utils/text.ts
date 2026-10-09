/** Chuỗi để so khớp tìm kiếm: bỏ dấu tiếng Việt, đ→d, chữ thường. */
export function normalizeSearch(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();
}

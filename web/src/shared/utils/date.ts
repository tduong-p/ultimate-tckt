// Ngày nghiệp vụ tính theo giờ Việt Nam (bất biến #7, docs/ai/bat-bien.md).
// Core trả cột DATE dạng timestamp UTC (vd. 2026-10-07T17:00:00.000Z = 08/10 giờ VN),
// nên KHÔNG được cắt 10 ký tự đầu của chuỗi ISO.
const VN_TIME_ZONE = 'Asia/Ho_Chi_Minh';
const PLAIN_DATE = /^\d{4}-\d{2}-\d{2}$/;

const vnDateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: VN_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const keyOf = (date: Date): string => vnDateFormatter.format(date);

/** Khoá ngày YYYY-MM-DD theo giờ Việt Nam; rỗng nếu thiếu/không hợp lệ. */
export function toVnDateKey(value?: string | null): string {
  if (!value) return '';
  if (PLAIN_DATE.test(value)) return value;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : keyOf(date);
}

/** DD/MM/YYYY theo giờ Việt Nam; rỗng nếu thiếu/không hợp lệ. */
export function formatVnDate(value?: string | null): string {
  const key = toVnDateKey(value);
  if (!key) return '';
  const [y, m, d] = key.split('-');
  return `${d}/${m}/${y}`;
}

/** Hôm nay (YYYY-MM-DD) theo giờ Việt Nam. */
export function todayVnKey(): string {
  return keyOf(new Date());
}

/** Date local lúc nửa đêm của một khoá ngày, dùng cho tính toán lưới lịch. */
export function vnDateKeyToLocalDate(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

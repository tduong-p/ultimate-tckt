// "Hôm nay" theo giờ Việt Nam (UTC+7) dưới dạng chuỗi YYYY-MM-DD.
// CHỈ dùng cho: logging, sourceKey, UI display.
// KHÔNG dùng cho so sánh với DATETIME trong MySQL - dùng NOW()/CURDATE() thay vì truyền tham số.
function dateInVietnam(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(now);
  const value = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

module.exports = { dateInVietnam };

// Ngày/giờ theo giờ Việt Nam (UTC+7), dùng Intl nên không phụ thuộc TZ của server.
// CHỈ dùng cho: logging, sourceKey, UI display, và so sánh NGÀY LỊCH dạng chuỗi YYYY-MM-DD
// (cột DATE đọc bằng DATE_FORMAT). KHÔNG dùng cho so sánh với DATETIME/TIMESTAMP trong MySQL -
// dùng NOW()/CURDATE() hoặc tham số Date thay vì chuỗi ngày.
function partsInVietnam(now) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hourCycle: 'h23'
  }).formatToParts(now);
  return Object.fromEntries(parts.map(part => [part.type, part.value]));
}

function dateInVietnam(now = new Date()) {
  const value = partsInVietnam(now);
  return `${value.year}-${value.month}-${value.day}`;
}

// Giờ hiện tại theo VN, 0-23.
function hourInVietnam(now = new Date()) {
  return Number(partsInVietnam(now).hour) % 24;
}

// Ngày VN của `now` cộng `days` ngày, dạng YYYY-MM-DD.
function addDaysVietnam(now, days) {
  const [y, m, d] = dateInVietnam(now).split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

module.exports = { dateInVietnam, hourInVietnam, addDaysVietnam };

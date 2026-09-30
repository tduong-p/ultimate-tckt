// "Hôm nay" theo giờ Việt Nam (UTC+7). Server và MySQL chạy UTC nên không dùng CURDATE()/toISOString() cho ngày nghiệp vụ.
function dateInVietnam(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  const value = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

module.exports = { dateInVietnam };

---
doc_id: DEV-TZ-001
title: Múi giờ và xử lý thời gian
version: 1.1
status: active
audience: [dev, ai]
owner: DYC
updated: 2026-10-05
related_code: [core/app.js, core/src/config/database.js, core/src/date-vn.js, core/src/services/deadline-notifications.js, core/src/services/reminder-rules.js]
---

# Múi giờ và xử lý thời gian

## Quy ước

**Toàn bộ hệ thống sử dụng giờ Việt Nam (Asia/Ho_Chi_Minh, UTC+7) làm chuẩn duy nhất.**

Không có logic UTC ở bất kỳ lớp nào. Mọi giá trị thời gian — trong Node.js, MySQL connection, MySQL server, và cột `DATETIME`/`TIMESTAMP` — đều là giờ Việt Nam.

### Cấu hình

| Lớp | Cấu hình | File |
|-----|----------|------|
| **Node.js process** | `process.env.TZ = 'Asia/Ho_Chi_Minh'` | `core/app.js` (dòng đầu tiên) |
| **MySQL connection pool** | `timezone: '+07:00'` | `core/src/config/database.js` |
| **MySQL server** | `--default-time-zone='+07:00'` | `infra/ultimate-tckt-{env}/compose.yml` |
| **Docker container** | `TZ: Asia/Ho_Chi_Minh` | `infra/ultimate-tckt-{env}/compose.yml` |

### Nguyên tắc

1. **Mọi cột `DATETIME` và `TIMESTAMP` trong database lưu giờ Việt Nam**, không phải UTC.
2. **`new Date()` trong JavaScript tự động là giờ Việt Nam** (nhờ `process.env.TZ`).
3. **`NOW()` và `CURDATE()` trong MySQL trả về giờ Việt Nam** (nhờ `timezone` connection và `--default-time-zone` server).
4. **Không cần chuyển đổi timezone** giữa các lớp.

## Cách dùng đúng

### ✅ Trong SQL queries

**Dùng `NOW()` và `CURDATE()` trực tiếp trong query:**

```sql
-- So sánh với thời điểm hiện tại
SELECT * FROM tasks WHERE deadline < NOW();

-- So sánh với ngày hiện tại
SELECT * FROM tasks WHERE DATE(created_at) = CURDATE();

-- Tính khoảng cách thời gian
SELECT TIMESTAMPDIFF(HOUR, NOW(), deadline) FROM tasks;

-- Tính khoảng cách ngày
SELECT DATEDIFF(deadline, CURDATE()) FROM tasks;

-- Thêm khoảng thời gian
INSERT INTO notifications (expires_at) VALUES (DATE_ADD(NOW(), INTERVAL 7 DAY));
```

**Không truyền thời gian từ JavaScript vào query khi có thể dùng `NOW()`/`CURDATE()`:**

```javascript
// ✅ TỐT: MySQL làm nguồn thời gian
const [rows] = await db.execute(
  'SELECT * FROM tasks WHERE deadline < NOW()'
);

// ❌ KHÔNG CẦN: truyền từ JS
const now = new Date();
const [rows] = await db.execute(
  'SELECT * FROM tasks WHERE deadline < ?',
  [now]
);
```

Ngoại lệ: khi cần thời gian cụ thể cho testing, truyền tham số để kiểm soát.

### ✅ Trong JavaScript

**`new Date()` tự động là giờ Việt Nam:**

```javascript
const now = new Date();
console.log(now.toString());  // "Sun Oct 04 2026 15:30:00 GMT+0700 (Indochina Time)"

// Lưu vào DB
await db.execute(
  'INSERT INTO tasks (created_at) VALUES (?)',
  [now]
);
```

**Hoặc để MySQL tự điền:**

```javascript
// Tốt hơn: dùng DEFAULT CURRENT_TIMESTAMP trong schema
await db.execute(
  'INSERT INTO tasks (title) VALUES (?)',  // created_at tự điền
  ['Nhiệm vụ mới']
);
```

### ❌ KHÔNG làm

#### 1. Không dùng `.toISOString()` để lưu `DATETIME`

```javascript
// ❌ SAI: toISOString() trả về UTC!
const utcString = new Date().toISOString();  // "2026-10-04T08:30:00.000Z" (UTC)
await db.execute('INSERT INTO tasks (deadline) VALUES (?)', [utcString]);
// DB sẽ lưu 2026-10-04 08:30:00, không phải 15:30:00 VN!

// ✅ ĐÚNG: truyền Date object
const now = new Date();  // Đã là giờ VN
await db.execute('INSERT INTO tasks (deadline) VALUES (?)', [now]);

// ✅ HOẶC: dùng NOW()
await db.execute('INSERT INTO tasks (deadline) VALUES (NOW())');
```

#### 2. Không truyền `dateInVietnam()` vào query so sánh `DATETIME`

```javascript
// ❌ SAI: dateInVietnam() trả về string 'YYYY-MM-DD', không có giờ
const today = dateInVietnam();  // "2026-10-04"
const [rows] = await db.execute(
  'SELECT * FROM tasks WHERE deadline < ?',
  [today]  // So sánh DATETIME với DATE string → kết quả sai
);

// ✅ ĐÚNG: dùng CURDATE() trong SQL
const [rows] = await db.execute(
  'SELECT * FROM tasks WHERE deadline < CURDATE()'
);

// ✅ HOẶC: dùng DATE() để so sánh chỉ phần ngày
const [rows] = await db.execute(
  'SELECT * FROM tasks WHERE DATE(deadline) < CURDATE()'
);
```

#### 3. Không lấy giờ UTC rồi cộng +7

```javascript
// ❌ SAI: không cần logic chuyển đổi
const utc = new Date();
const vnTime = new Date(utc.getTime() + 7 * 3600 * 1000);  // Thừa!

// ✅ ĐÚNG: new Date() đã là giờ VN
const vnTime = new Date();
```

## Hàm `dateInVietnam()`

File: `core/src/date-vn.js`

```javascript
function dateInVietnam(now = new Date()) {
  // Trả về string 'YYYY-MM-DD' theo giờ Việt Nam
}
```

### Mục đích

Hàm này trả về **chuỗi ngày** (không có giờ) theo múi giờ Việt Nam, định dạng `YYYY-MM-DD`.

### Khi nào dùng

- **Tạo `sourceKey` cho notifications** (ví dụ: `task-overdue:123:456:2026-10-04`)
- **Logging và debug** (ghi ngày vào log file)
- **Hiển thị ngày cho người dùng** (UI)
- **Group by ngày** trong báo cáo JavaScript (không phải SQL)

### Khi nào KHÔNG dùng

- ❌ So sánh với `DATETIME` trong SQL queries (dùng `CURDATE()` hoặc `DATE()`)
- ❌ Lưu vào cột `DATETIME` (dùng `NOW()` hoặc `new Date()`)
- ❌ Tính khoảng cách thời gian (dùng `TIMESTAMPDIFF()` trong SQL)

### Ví dụ đúng

```javascript
// ✅ sourceKey cho notification
const today = dateInVietnam();
const sourceKey = `task-overdue:${taskId}:${userId}:${today}`;

// ✅ Log
logger.info(`Processing tasks for ${dateInVietnam()}`);

// ✅ Hiển thị
res.json({ report_date: dateInVietnam() });
```

### Ví dụ sai

```javascript
// ❌ So sánh với DATETIME
const today = dateInVietnam();
await db.execute('WHERE deadline < ?', [today]);  // Sai! Dùng CURDATE()

// ❌ Lưu vào DATETIME
const today = dateInVietnam();
await db.execute('INSERT INTO tasks (deadline) VALUES (?)', [today]);  // Sai! Thiếu giờ
```

## Ví dụ thực tế: nhắc hạn

Files: `core/src/services/deadline-notifications.js`, `core/src/services/reminder-rules.js`, `core/src/date-vn.js`

`tasks.deadline` là cột **`DATE`** (ngày 00:00, không có giờ). Vì vậy nhắc hạn tính theo **ngày lịch giờ VN**, không theo số giờ:

- Hạn là ngày mai (`addDaysVietnam(now, 1)`) → nhắc "1 ngày"; hạn là hôm nay (`dateInVietnam(now)`) → nhắc "hôm nay".
- So sánh bằng chuỗi `YYYY-MM-DD` trong Node (`deadlineWindow`), không dùng `TIMESTAMPDIFF(HOUR, …)`: với `DATE` thì "còn 4 giờ" hay
  "còn 24 giờ" vô nghĩa và lệch tuỳ giờ chạy scheduler.
- Chỉ gửi trong khung **07:00–21:59 giờ VN** (`isSendingHour`, dùng `hourInVietnam`); ngoài khung bỏ qua, lượt 15 phút sau xử lý tiếp.
- `task.unacknowledged` tính theo thời điểm giao (`assigned_at`, có giờ): từ 24 giờ đến dưới 168 giờ.
- Các hàm `findOverdueTasks`, `findUpcomingDeadlines`, `findUnacknowledgedAssignments` nhận `now` để test điều khiển được thời gian.

## Testing

### 1. Kiểm tra Node.js timezone

```bash
cd core
node -e "console.log('TZ:', process.env.TZ); console.log('Now:', new Date().toString());"
```

**Kết quả mong đợi:**
```
TZ: Asia/Ho_Chi_Minh
Now: Sun Oct 04 2026 15:30:00 GMT+0700 (Indochina Time)
```

### 2. Kiểm tra MySQL connection timezone

```bash
node -e "
const mysql = require('mysql2/promise');
const { createDatabase } = require('./src/config/database');
(async () => {
  const db = createDatabase({ 
    host: 'localhost', 
    user: 'root', 
    database: 'ultimate_tckt' 
  });
  const [rows] = await db.query('SELECT @@session.time_zone AS tz, NOW() AS now');
  console.log(rows[0]);
  process.exit(0);
})();
"
```

**Kết quả mong đợi:**
```
{ tz: '+07:00', now: 2026-10-04T15:30:00.000Z }
```

### 3. Kiểm tra MySQL server timezone

```bash
# Local
mysql -u root -e "SELECT @@global.time_zone, @@session.time_zone, NOW();"

# Production/Staging
ssh <vm>
docker exec -it ultimate-tckt-production-core-db-1 mysql -u root -p -e \
  "SELECT @@global.time_zone, @@session.time_zone, NOW();"
```

**Kết quả mong đợi:**
```
+--------------------+---------------------+---------------------+
| @@global.time_zone | @@session.time_zone | NOW()               |
+--------------------+---------------------+---------------------+
| +07:00             | +07:00              | 2026-10-04 15:30:00 |
+--------------------+---------------------+---------------------+
```

### 4. Test deadline notifications với dữ liệu giả

Chạy trong khung 07:00–21:59 giờ VN (ngoài khung scheduler không gửi).

```sql
-- Task hạn hôm nay (nhắc "hôm nay")
INSERT INTO tasks (
  activity_id, title, team_id, primary_assignee_id,
  assigned_by, status, deadline
) VALUES (
  1, 'Test hạn hôm nay', 1, 1, 1, 'todo', CURDATE()
);

-- Task hạn ngày mai (nhắc "1 ngày")
INSERT INTO tasks (
  activity_id, title, team_id, primary_assignee_id,
  assigned_by, status, deadline
) VALUES (
  1, 'Test hạn ngày mai', 1, 1, 1, 'todo',
  DATE_ADD(CURDATE(), INTERVAL 1 DAY)
);

-- Kiểm tra
SELECT 
  id, 
  title, 
  deadline,
  TIMESTAMPDIFF(HOUR, NOW(), deadline) AS hours_until,
  DATEDIFF(deadline, CURDATE()) AS days_until
FROM tasks 
WHERE title LIKE 'Test%';
```

**Kết quả mong đợi:**
```
+----+-------------------+---------------------+-------------+-------------+
| id | title             | deadline            | hours_until | days_until  |
+----+-------------------+---------------------+-------------+-------------+
|  X | Test hạn hôm nay  | 2026-10-04 00:00:00 |          -15 |           0 |
|  Y | Test hạn ngày mai | 2026-10-05 00:00:00 |           9 |           1 |
+----+-------------------+---------------------+-------------+-------------+
```

Sau đó chạy job notification:

```bash
cd core
node -e "
const { createDatabase } = require('./src/config/database');
const { runDeadlineNotifications } = require('./src/services/deadline-notifications');
(async () => {
  const db = createDatabase({ host: 'localhost', user: 'root', database: 'ultimate_tckt' });
  const notifier = { notify: (x) => console.log('Notification:', JSON.stringify(x, null, 2)) };
  const logger = { info: console.log, error: console.error };
  const result = await runDeadlineNotifications({ db, notifier, logger });
  console.log('Result:', result);
  process.exit(0);
})();
"
```

Phải thấy 2 notifications được tạo (với `notifier` giả như trên, `email_status` được ghi theo kết quả của nó).

## Troubleshooting

### Lỗi: Notification sai giờ (đến sớm/muộn 7 giờ)

**Nguyên nhân:** Một trong các lớp chưa set timezone đúng.

**Kiểm tra:**
1. `process.env.TZ` trong Node.js
2. `timezone` trong MySQL connection pool
3. MySQL server `@@global.time_zone`
4. Docker container `TZ` environment variable

### Lỗi: `TIMESTAMPDIFF` trả về giá trị âm bất thường

**Nguyên nhân:** So sánh giữa UTC và VN time.

**Giải pháp:** Dùng `NOW()` trong SQL thay vì truyền `new Date()` từ JS.

### Lỗi: Task "sắp đến hạn" không trigger notification

**Nguyên nhân:** Dữ liệu test có `deadline` là UTC.

**Giải pháp:** Tạo lại dữ liệu bằng `NOW()` hoặc `new Date()` sau khi set timezone.

## Deployment Checklist

Khi deploy timezone fix:

- [ ] `core/app.js` có `process.env.TZ = 'Asia/Ho_Chi_Minh'` ở dòng đầu
- [ ] `core/src/config/database.js` có `timezone: '+07:00'`
- [ ] Docker Compose có `TZ: Asia/Ho_Chi_Minh` cho service `core`
- [ ] Docker Compose có `--default-time-zone='+07:00'` cho `core-db`
- [ ] Test trên staging trước production
- [ ] Kiểm tra notification timing sau deploy 24-48 giờ
- [ ] Backup database trước deploy (phòng cần rollback)

## Migration Notes

**Không cần migrate dữ liệu cũ** nếu:
- Database đã chạy với timezone VN từ trước
- Dữ liệu `DATETIME` đã được nhập theo giờ VN

**Cần kiểm tra** nếu:
- Database trước đây chạy UTC
- Có dữ liệu `DATETIME` nhập từ UTC `.toISOString()`

Trong trường hợp đó, cần:
1. Audit dữ liệu hiện có (so sánh với log/backup)
2. Quyết định có cần convert (cộng 7 giờ) hay không
3. Viết migration script nếu cần

**Khuyến nghị:** Test kỹ trên staging với dữ liệu production snapshot trước.

## Tài liệu liên quan

- `docs/dev/kien-truc.md` — Tổng quan kiến trúc hệ thống
- `docs/dev/email-cron.md` — Email và notification scheduling
- `docs/playbooks/sua-loi.md` — Debug notification issues

## Lịch sử phiên bản

| Version | Ngày | Thay đổi | Người |
|---------|------|----------|-------|
| 1.0 | 2026-10-04 | Bản đầu - quy ước timezone toàn hệ thống, sau khi sửa lỗi deadline notification | DYC |
| 1.1 | 2026-10-05 | #49: nhắc hạn theo ngày lịch giờ VN (`tasks.deadline` là `DATE`), khung gửi 07:00–21:59, bỏ ví dụ `TIMESTAMPDIFF` 4h/24h | DYC |

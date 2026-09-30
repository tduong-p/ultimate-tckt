# Test Fixtures

Test data và database fixtures để development và testing local.

## ⚠️ Không dùng cho production

Thư mục này **KHÔNG** được copy vào Docker images. Chỉ dùng cho:
- Local development testing
- Unit/integration test setup
- Manual QA testing
- Database migration testing

## 📁 Cấu trúc

### `sql/mysql/`
Chỗ đặt dump MySQL của Core **ở máy mình** (mọi `*.sql` trong `tools/test-fixtures/sql/` bị git-ignore).
Repo là public: không commit dump, CSV hay dữ liệu người dùng thật.

- `backup_current.sql` — tên mặc định mà `restore-db.ps1` đọc; tự tạo bằng lệnh ở mục "Tạo backup mới".

### `sql/postgres/` (future)
SQL fixtures cho CTD service khi cần.

## 🚀 Sử dụng

### Load backup vào MySQL

```bash
# Option 1: MySQL command line
mysql -u root -p ultimate_tckt < tools/test-fixtures/sql/mysql/backup_current.sql

# Option 2: Trong MySQL console
mysql -u root -p
mysql> DROP DATABASE IF EXISTS ultimate_tckt;
mysql> CREATE DATABASE ultimate_tckt CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
mysql> USE ultimate_tckt;
mysql> source C:/Nguyen Tri/Code/TCKT/ultimate-tckt/tools/test-fixtures/sql/mysql/backup_current.sql;
```

### Tạo backup mới

```bash
# Full backup (schema + data)
mysqldump -u root -p ultimate_tckt > tools/test-fixtures/sql/mysql/backup_$(date +%Y%m%d).sql

# Windows PowerShell
mysqldump -u root -p ultimate_tckt > "tools/test-fixtures/sql/mysql/backup_$(Get-Date -Format yyyyMMdd).sql"

# Schema only (no data)
mysqldump -u root -p --no-data ultimate_tckt > tools/test-fixtures/sql/mysql/schema_only.sql

# Data only (no schema)
mysqldump -u root -p --no-create-info ultimate_tckt > tools/test-fixtures/sql/mysql/data_only.sql
```

### Kiểm tra backup file

```bash
# Xem 50 dòng đầu
Get-Content tools/test-fixtures/sql/mysql/backup_current.sql -Head 50

# Đếm số tables
Select-String "CREATE TABLE" tools/test-fixtures/sql/mysql/backup_current.sql | Measure-Object

# Xem size
Get-Item tools/test-fixtures/sql/mysql/backup_current.sql | Select-Object Name, Length
```

## 🔒 Bảo mật

### Files an toàn để commit vào Git:

✅ **Safe to commit:**
- `sample_data.sql` - Dummy data với fake info
- `schema_only.sql` - Database structure only

### Files KHÔNG commit:

❌ **Never commit:**
- `backup_*.sql` - Backups cá nhân (đã config trong .gitignore)
- Bất kỳ file nào chứa:
  - Real emails
  - Real passwords (kể cả hash)
  - Student IDs thật
  - Personal information
  - Production/staging data

### Sanitize data trước khi commit

Nếu muốn tạo `sample_data.sql` từ backup:

```sql
-- 1. Load backup vào database test
CREATE DATABASE tckt_test;
USE tckt_test;
source /path/to/backup_current.sql;

-- 2. Sanitize sensitive data
UPDATE users SET 
  email = CONCAT('user', id, '@example.com'),
  password_hash = '$2b$10$vG4lMlOx27NeDAbm3gBbdeg0ENIADakzjdR0OggZLZp7IpjPaMfK.',
  phone = NULL,
  class_number = NULL,
  faculty_notice_acknowledged_at = NULL;

-- 3. Export sanitized data
mysqldump -u root -p tckt_test > tools/test-fixtures/sql/mysql/sample_data.sql

-- 4. Drop test database
DROP DATABASE tckt_test;
```

## 🧪 Integration với tests

### Trong test scripts:

```javascript
// core/tests/helpers/db.js
import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function loadFixture(filename) {
  const sqlPath = path.resolve(
    __dirname,
    '../../..',  // Go to repo root
    'tools/test-fixtures/sql/mysql',
    filename
  );
  
  const { DB_USER, DB_PASSWORD, DB_NAME } = process.env;
  
  execSync(
    `mysql -u${DB_USER} -p${DB_PASSWORD} ${DB_NAME} < "${sqlPath}"`,
    { stdio: 'inherit' }
  );
}

// Usage in tests
import { loadFixture } from './helpers/db.js';

beforeAll(async () => {
  await loadFixture('sample_data.sql');
});
```

## 📚 Liên quan

- `core/db.sql` - Fresh database schema
- `core/src/config/migrate.js` - Migration runner
- `tools/database-inspecs/` - Schema inspection tools
- `docs/dev/db-migration.md` - Migration documentation

## 💡 Tips

### Nhanh chóng restore database

```bash
# Windows: Tạo script restore.ps1
@"
`$env:MYSQL_PWD="your_password"
mysql -u root ultimate_tckt < tools/test-fixtures/sql/mysql/backup_current.sql
Write-Host "Database restored successfully!"
"@ > restore-db.ps1

# Chạy: .\restore-db.ps1
```

### So sánh backups

```bash
# Nếu có 2 backups, so sánh schema
diff tools/test-fixtures/sql/mysql/backup_old.sql tools/test-fixtures/sql/mysql/backup_new.sql
```

### Export chỉ một số tables

```bash
# Export specific tables
mysqldump -u root -p ultimate_tckt users teams activities > partial_backup.sql
```

---
doc_id: OPS-TEST-001
title: Setup database test trên VPS
version: 1.0
status: active
audience: [dev, ops]
owner: DYC
updated: 2026-09-24
related_code: [infra/scripts/**, core/src/config/migrate.js]
---

# Setup database test trên VPS

Hướng dẫn tạo database riêng cho testing trên VPS (Oracle ARM VM), tránh ảnh hưởng đến staging/production.

## 1. Tổng quan

### 1.1 Tại sao cần database test trên VPS?

**Use cases:**
- Test migration trên môi trường giống production (arm64)
- Test với dữ liệu gần giống thật
- CI/CD testing trước khi deploy
- Load testing với data volume lớn
- Debug issues chỉ xảy ra trên VPS

**Không nên:**
- ❌ Test trên staging/production database (risk cao)
- ❌ Dùng chung database test với staging (data pollution)
- ❌ Test trực tiếp trên production (nguy hiểm)

### 1.2 Chiến lược

**Tạo database test riêng:**
```
Trên VPS có 3 loại database:
├── Production: ultimate_tckt_prod    (MySQL cổng 3307, Postgres không expose)
├── Staging: ultimate_tckt_staging     (MySQL cổng 3306, Postgres không expose)
└── Test: ultimate_tckt_test           (MySQL cổng 3308, Postgres cổng 5433)
```

**Isolate hoàn toàn:**
- User riêng
- Port riêng
- Không ảnh hưởng staging/production
- Có thể drop/recreate bất cứ lúc nào

---

## 2. Setup MySQL test database

### 2.1 Tạo database container riêng

**Option A: Docker container standalone (recommended)**

```bash
# SSH vào VPS
ssh ubuntu@168.107.68.32

# Tạo MySQL test container
docker run -d \
  --name mysql-test \
  --restart unless-stopped \
  -p 127.0.0.1:3308:3306 \
  -e MYSQL_ROOT_PASSWORD=test_root_password_change_me \
  -e MYSQL_DATABASE=ultimate_tckt_test \
  -e MYSQL_USER=test_user \
  -e MYSQL_PASSWORD=test_password_change_me \
  -v mysql-test-data:/var/lib/mysql \
  mysql:8 \
  --character-set-server=utf8mb4 \
  --collation-server=utf8mb4_unicode_ci

# Verify
docker ps | grep mysql-test
```

**Option B: Thêm vào docker-compose (nếu muốn quản lý tập trung)**

Tạo file `/opt/ultimate-tckt/test/docker-compose.yml`:

```yaml
version: '3.8'

services:
  mysql-test:
    image: mysql:8
    container_name: mysql-test
    restart: unless-stopped
    ports:
      - "127.0.0.1:3308:3306"
    environment:
      MYSQL_ROOT_PASSWORD: ${TEST_MYSQL_ROOT_PASSWORD}
      MYSQL_DATABASE: ultimate_tckt_test
      MYSQL_USER: ${TEST_MYSQL_USER}
      MYSQL_PASSWORD: ${TEST_MYSQL_PASSWORD}
    volumes:
      - mysql-test-data:/var/lib/mysql
    command:
      - --character-set-server=utf8mb4
      - --collation-server=utf8mb4_unicode_ci
  
  postgres-test:
    image: postgres:16
    container_name: postgres-test
    restart: unless-stopped
    ports:
      - "127.0.0.1:5433:5432"
    environment:
      POSTGRES_DB: ctd_test
      POSTGRES_USER: ${TEST_POSTGRES_USER}
      POSTGRES_PASSWORD: ${TEST_POSTGRES_PASSWORD}
    volumes:
      - postgres-test-data:/var/lib/postgresql/data

volumes:
  mysql-test-data:
  postgres-test-data:
```

Tạo `.env`:
```bash
cd /opt/ultimate-tckt/test
cat > .env <<'EOF'
TEST_MYSQL_ROOT_PASSWORD=your_secure_password_here
TEST_MYSQL_USER=test_user
TEST_MYSQL_PASSWORD=your_test_password_here
TEST_POSTGRES_USER=ctd_test
TEST_POSTGRES_PASSWORD=your_postgres_password_here
EOF
chmod 600 .env

# Start
docker-compose up -d
```

### 2.2 Verify connection

```bash
# From VPS
docker exec -it mysql-test mysql -u test_user -p ultimate_tckt_test
# Enter password: test_password_change_me

# Test query
mysql> SELECT DATABASE();
mysql> SHOW TABLES;
mysql> EXIT;
```

### 2.3 Run migration

```bash
# Clone repo to test directory (nếu chưa có)
cd /opt/ultimate-tckt
git clone https://github.com/tduong-p/ultimate-tckt.git test-repo
cd test-repo/core

# Create .env for test
cat > .env <<EOF
NODE_ENV=test
DB_HOST=127.0.0.1
DB_PORT=3308
DB_USER=test_user
DB_PASSWORD=test_password_change_me
DB_NAME=ultimate_tckt_test
SESSION_SECRET=$(openssl rand -hex 32)
SETTINGS_ENCRYPTION_KEY=$(openssl rand -base64 32)
EOF

# Install deps (nếu chưa có Node trên VPS, xem §6)
npm ci

# Run migration
npm run migrate

# Verify
docker exec -it mysql-test mysql -u test_user -p ultimate_tckt_test -e "SHOW TABLES;"
```

---

## 3. Setup Postgres test database

### 3.1 Tạo database container

```bash
# Standalone container
docker run -d \
  --name postgres-test \
  --restart unless-stopped \
  -p 127.0.0.1:5433:5432 \
  -e POSTGRES_DB=ctd_test \
  -e POSTGRES_USER=ctd_test \
  -e POSTGRES_PASSWORD=test_postgres_password_change_me \
  -v postgres-test-data:/var/lib/postgresql/data \
  postgres:16

# Verify
docker ps | grep postgres-test
```

### 3.2 Run Alembic migrations

```bash
cd /opt/ultimate-tckt/test-repo/services/ctd-api/backend

# Create .env
cat > .env <<EOF
APP_ENV=test
DATABASE_URL=postgresql+psycopg://ctd_test:test_postgres_password_change_me@127.0.0.1:5433/ctd_test
JWT_SECRET=$(openssl rand -hex 32)
EOF

# Install deps (cần Python 3.12 trên VPS, xem §6)
python3.12 -m venv .venv
.venv/bin/pip install -e .

# Run migrations
.venv/bin/alembic upgrade head

# Verify
docker exec -it postgres-test psql -U ctd_test -d ctd_test -c "\dt"
```

---

## 4. Connect từ máy local đến VPS test DB

### 4.1 SSH Tunnel (recommended)

**Forward MySQL:**
```bash
# Terminal 1: Tạo tunnel
ssh -L 3308:127.0.0.1:3308 ubuntu@168.107.68.32 -N

# Terminal 2: Connect từ local
mysql -h 127.0.0.1 -P 3308 -u test_user -p ultimate_tckt_test
```

**Forward Postgres:**
```bash
# Terminal 1
ssh -L 5433:127.0.0.1:5433 ubuntu@168.107.68.32 -N

# Terminal 2
psql postgresql://ctd_test:password@127.0.0.1:5433/ctd_test
```

### 4.2 Config local app to use VPS test DB

**Core:**
```bash
cd /path/to/local/repo/core
cat > .env.test <<EOF
DB_HOST=127.0.0.1
DB_PORT=3308  # Via SSH tunnel
DB_USER=test_user
DB_PASSWORD=test_password_change_me
DB_NAME=ultimate_tckt_test
SESSION_SECRET=$(openssl rand -hex 32)
SETTINGS_ENCRYPTION_KEY=$(openssl rand -base64 32)
EOF

# Run tests against VPS
NODE_ENV=test node --env-file=.env.test --test tests/**/*.test.js
```

**CTD:**
```bash
cd services/ctd-api/backend
cat > .env.test <<EOF
DATABASE_URL=postgresql+psycopg://ctd_test:password@127.0.0.1:5433/ctd_test
APP_ENV=test
JWT_SECRET=test_secret
EOF

# Run tests
TEST_DATABASE_URL=postgresql+psycopg://ctd_test:password@127.0.0.1:5433/ctd_test pytest
```

---

## 5. Load test data

### 5.1 Copy từ staging (với sanitization)

**MySQL (Core):**
```bash
# Trên VPS: Export từ staging
docker exec ultimate-tckt-staging-core-db-1 \
  mysqldump -u root -p"${STAGING_ROOT_PASSWORD}" ultimate_tckt \
  > /tmp/staging-dump.sql

# Sanitize (ẩn data nhạy cảm)
cat > /tmp/sanitize.sql <<'SQL'
-- Fake email addresses
UPDATE users SET email = CONCAT('user', id, '@test.example.com');

-- Fake passwords (bcrypt hash của "test123")
UPDATE users SET password = '$2a$10$abcdefghijklmnopqrstuv';

-- Clear session tokens
TRUNCATE TABLE sessions;

-- Clear file paths
UPDATE task_attachments SET file_path = CONCAT('test/', id, '.pdf');
UPDATE documents SET file_path = CONCAT('test/', id, '.docx');
SQL

# Import vào test DB
cat /tmp/staging-dump.sql /tmp/sanitize.sql | \
  docker exec -i mysql-test mysql -u test_user -p"test_password_change_me" ultimate_tckt_test

# Cleanup
rm /tmp/staging-dump.sql /tmp/sanitize.sql
```

**Postgres (CTD):**
```bash
# Export
docker exec ultimate-tckt-staging-ctd-db-1 \
  pg_dump -U ctd ctd \
  > /tmp/ctd-staging-dump.sql

# Sanitize
cat > /tmp/sanitize-ctd.sql <<'SQL'
-- Fake personal data
UPDATE app_user SET 
  email = CONCAT('user', id, '@test.example.com'),
  phone = '0900000000';

-- Clear OTP codes
UPDATE app_user SET otp_code = NULL, otp_expires_at = NULL;
SQL

# Import
cat /tmp/ctd-staging-dump.sql /tmp/sanitize-ctd.sql | \
  docker exec -i postgres-test psql -U ctd_test ctd_test

# Cleanup
rm /tmp/ctd-staging-dump.sql /tmp/sanitize-ctd.sql
```

### 5.2 Generate fake data

**Tạo script seed:**
```bash
cd /opt/ultimate-tckt/test-repo/core
cat > scripts/seed-test-data.js <<'EOF'
const db = require('./src/config/database');
const bcrypt = require('bcryptjs');

async function seed() {
  const connection = await db.connect();
  
  try {
    // Create test users
    const password = await bcrypt.hash('test123', 10);
    
    await connection.query(`
      INSERT INTO users (email, password, name, role, is_active) VALUES
      ('btv.lead@test.com', ?, 'BTV Lead', 'admin', 1),
      ('tckt.admin@test.com', ?, 'TCKT Admin', 'admin', 1),
      ('tckt.member@test.com', ?, 'TCKT Member', 'member', 1)
    `, [password, password, password]);
    
    // Create test activities
    // ... (more seed logic)
    
    console.log('Test data seeded successfully');
  } finally {
    connection.release();
  }
}

seed().catch(console.error);
EOF

# Run seed
DB_HOST=127.0.0.1 DB_PORT=3308 node scripts/seed-test-data.js
```

---

## 6. Install dependencies trên VPS (nếu cần)

### 6.1 Node.js 22

```bash
# Using nvm (recommended)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.5/install.sh | bash
source ~/.bashrc
nvm install 22
nvm use 22
node --version  # Should be v22.x.x
```

### 6.2 Python 3.12

```bash
# Ubuntu 24.04+
sudo apt update
sudo apt install -y python3.12 python3.12-venv python3-pip

# Verify
python3.12 --version
```

### 6.3 MySQL Client (nếu muốn connect từ host)

```bash
sudo apt install -y mysql-client-8.0
mysql --version
```

### 6.4 PostgreSQL Client

```bash
sudo apt install -y postgresql-client-16
psql --version
```

---

## 7. CI/CD Integration

### 7.1 GitHub Actions test workflow

```yaml
# .github/workflows/test-on-vps.yml
name: Test on VPS

on:
  push:
    branches: [staging, main]
  pull_request:
    branches: [staging]

jobs:
  test-vps:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup SSH
        uses: webfactory/ssh-agent@v0.8.0
        with:
          ssh-private-key: ${{ secrets.VPS_SSH_KEY }}
      
      - name: Setup test DB on VPS
        run: |
          ssh ubuntu@168.107.68.32 '
            # Ensure test DB is running
            docker ps | grep mysql-test || docker start mysql-test
            docker ps | grep postgres-test || docker start postgres-test
            
            # Reset databases
            docker exec mysql-test mysql -u root -p"$TEST_MYSQL_ROOT_PASSWORD" \
              -e "DROP DATABASE IF EXISTS ultimate_tckt_test; CREATE DATABASE ultimate_tckt_test;"
            
            docker exec postgres-test psql -U postgres \
              -c "DROP DATABASE IF EXISTS ctd_test; CREATE DATABASE ctd_test;"
          '
      
      - name: Run migrations via SSH
        run: |
          ssh ubuntu@168.107.68.32 '
            cd /opt/ultimate-tckt/test-repo
            git fetch && git checkout ${{ github.sha }}
            
            # Core migration
            cd core
            npm ci
            npm run migrate
            
            # CTD migration
            cd ../services/ctd-api/backend
            .venv/bin/alembic upgrade head
          '
      
      - name: Run tests via SSH tunnel
        run: |
          # Start SSH tunnel in background
          ssh -f -N -L 3308:127.0.0.1:3308 ubuntu@168.107.68.32
          ssh -f -N -L 5433:127.0.0.1:5433 ubuntu@168.107.68.32
          
          # Run core tests
          cd core
          DB_HOST=127.0.0.1 DB_PORT=3308 npm test
          
          # Run CTD tests
          cd ../services/ctd-api/backend
          TEST_DATABASE_URL=postgresql+psycopg://ctd_test:password@127.0.0.1:5433/ctd_test pytest
```

---

## 8. Maintenance

### 8.1 Reset test database

**Quick reset (drop all tables, re-run migration):**
```bash
# MySQL
docker exec -it mysql-test mysql -u root -p -e "
  DROP DATABASE ultimate_tckt_test;
  CREATE DATABASE ultimate_tckt_test;
  GRANT ALL ON ultimate_tckt_test.* TO 'test_user'@'%';
"

# Postgres
docker exec -it postgres-test psql -U postgres -c "
  DROP DATABASE ctd_test;
  CREATE DATABASE ctd_test OWNER ctd_test;
"

# Re-run migrations
cd /opt/ultimate-tckt/test-repo/core && npm run migrate
cd /opt/ultimate-tckt/test-repo/services/ctd-api/backend && .venv/bin/alembic upgrade head
```

### 8.2 Backup test data (nếu cần preserve)

```bash
# MySQL
docker exec mysql-test mysqldump -u test_user -p ultimate_tckt_test \
  > /opt/ultimate-tckt/backups/test-$(date +%Y%m%d-%H%M).sql

# Postgres
docker exec postgres-test pg_dump -U ctd_test ctd_test \
  > /opt/ultimate-tckt/backups/ctd-test-$(date +%Y%m%d-%H%M).sql
```

### 8.3 Clean up old test data

```bash
# Xóa backups cũ hơn 7 ngày
find /opt/ultimate-tckt/backups -name 'test-*.sql' -mtime +7 -delete
find /opt/ultimate-tckt/backups -name 'ctd-test-*.sql' -mtime +7 -delete
```

### 8.4 Monitor test DB resource usage

```bash
# Check container stats
docker stats mysql-test postgres-test --no-stream

# Check disk usage
docker exec mysql-test du -sh /var/lib/mysql
docker exec postgres-test du -sh /var/lib/postgresql/data

# Check connection count
docker exec mysql-test mysql -u root -p -e "SHOW PROCESSLIST;"
docker exec postgres-test psql -U postgres -c "SELECT count(*) FROM pg_stat_activity;"
```

---

## 9. Troubleshooting

### 9.1 Connection refused

**Problem:** `Can't connect to MySQL server on '127.0.0.1:3308'`

**Solution:**
```bash
# Check if container is running
docker ps | grep mysql-test

# Check port binding
docker port mysql-test

# Check logs
docker logs mysql-test --tail 50

# Restart container
docker restart mysql-test
```

### 9.2 Permission denied

**Problem:** `Access denied for user 'test_user'@'172.x.x.x'`

**Solution:**
```bash
# Grant permissions
docker exec mysql-test mysql -u root -p -e "
  GRANT ALL PRIVILEGES ON ultimate_tckt_test.* TO 'test_user'@'%';
  FLUSH PRIVILEGES;
"
```

### 9.3 Migration fails

**Problem:** `Migration error: Table 'users' already exists`

**Solution:**
```bash
# Check current schema
docker exec mysql-test mysql -u test_user -p ultimate_tckt_test -e "SHOW TABLES;"

# Drop and recreate
docker exec mysql-test mysql -u root -p -e "
  DROP DATABASE ultimate_tckt_test;
  CREATE DATABASE ultimate_tckt_test;
  GRANT ALL ON ultimate_tckt_test.* TO 'test_user'@'%';
"

# Re-run migration
cd /opt/ultimate-tckt/test-repo/core && npm run migrate
```

### 9.4 Out of disk space

**Problem:** `No space left on device`

**Solution:**
```bash
# Check disk usage
df -h

# Clean up Docker
docker system prune -a --volumes

# Or remove specific test volumes
docker volume rm mysql-test-data postgres-test-data

# Recreate containers
docker-compose -f /opt/ultimate-tckt/test/docker-compose.yml up -d
```

---

## 10. Best practices

### 10.1 Security

- ✅ Test DB chỉ bind `127.0.0.1` (không expose ra internet)
- ✅ Dùng mật khẩu mạnh khác với staging/production
- ✅ `.env` có quyền 600
- ✅ Không commit passwords vào repo
- ✅ Sanitize data khi copy từ production

### 10.2 Performance

- ✅ Reset DB thường xuyên (tránh dữ liệu rác)
- ✅ Không chạy test parallel nhiều process (race condition)
- ✅ Dùng transaction cho test (rollback sau test)
- ✅ Index đầy đủ như production

### 10.3 Development workflow

- ✅ Chạy test local trước (nhanh hơn)
- ✅ Test trên VPS khi:
  - Migration phức tạp
  - Performance issue
  - Bug chỉ xảy ra trên arm64
  - Load testing với data lớn

---

## 11. Quick reference

### Connect to test databases

```bash
# MySQL (from VPS)
docker exec -it mysql-test mysql -u test_user -p ultimate_tckt_test

# MySQL (from local via SSH tunnel)
ssh -L 3308:127.0.0.1:3308 ubuntu@168.107.68.32 -N &
mysql -h 127.0.0.1 -P 3308 -u test_user -p ultimate_tckt_test

# Postgres (from VPS)
docker exec -it postgres-test psql -U ctd_test ctd_test

# Postgres (from local via SSH tunnel)
ssh -L 5433:127.0.0.1:5433 ubuntu@168.107.68.32 -N &
psql postgresql://ctd_test:password@127.0.0.1:5433/ctd_test
```

### Common commands

```bash
# Start test databases
docker start mysql-test postgres-test

# Stop test databases
docker stop mysql-test postgres-test

# Restart
docker restart mysql-test postgres-test

# View logs
docker logs mysql-test -f
docker logs postgres-test -f

# Reset MySQL
docker exec mysql-test mysql -u root -p -e "
  DROP DATABASE IF EXISTS ultimate_tckt_test;
  CREATE DATABASE ultimate_tckt_test;
"

# Reset Postgres
docker exec postgres-test psql -U postgres -c "
  DROP DATABASE IF EXISTS ctd_test;
  CREATE DATABASE ctd_test OWNER ctd_test;
"

# Run migrations
cd /opt/ultimate-tckt/test-repo/core && npm run migrate
cd /opt/ultimate-tckt/test-repo/services/ctd-api/backend && .venv/bin/alembic upgrade head
```

---

## Lịch sử phiên bản

| Version | Ngày | Thay đổi | Người |
|---|---|---|---|
| 1.0 | 2026-09-24 | Bản đầu tiên - Setup DB test trên VPS | DYC |

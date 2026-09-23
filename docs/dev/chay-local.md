---
doc_id: DEV-LOCAL-001
title: Chạy dự án ở máy local
version: 1.0
status: active
audience: [dev, ai, onboarding]
owner: DYC
updated: 2026-09-24
related_code: [core/.env.example, services/ctd-api/backend/.env.example, .claude/launch.json]
---

# Chạy dự án ở máy local

Tài liệu này giúp dev mới dựng được Core và CTD chạy trên máy mình, không cần đụng VM staging/production.

## Core (Node/MySQL)

Cần MySQL 8 chạy local (`utf8mb4`), Node 22.

```bash
cd core
cp .env.example .env      # điền DB_*, sinh SESSION_SECRET và SETTINGS_ENCRYPTION_KEY bằng lệnh dưới
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"   # SESSION_SECRET
openssl rand -base64 32                                                     # SETTINGS_ENCRYPTION_KEY
npm ci
npm run migrate     # dựng/nâng schema idempotent — không import db.sql tay khi đã có DB đang chạy
npm start           # http://localhost:3000
```

Test cần một MySQL riêng (đặt qua `TEST_DB_HOST/PORT/USER/PASSWORD`, mặc định rơi về `DB_*` rồi `root@localhost`):

```bash
npm test
```

## CTD (FastAPI/Postgres)

Cần Postgres 16 chạy local, Python 3.12.

```bash
cd services/ctd-api/backend
cp .env.example .env      # APP_ENV=dev (mặc định) cho phép JWT_SECRET/OTP mặc định — KHÔNG dùng dev cho môi trường thật
python3.12 -m venv .venv
.venv/bin/pip install -e '.[dev]'
.venv/bin/alembic upgrade head
.venv/bin/python -m app.seeds        # dữ liệu mẫu (nếu cần)
.venv/bin/uvicorn app.main:app --reload --port 8000
```

Ở `APP_ENV=dev`, mã OTP đăng nhập cố định là `123456` (xem `app/infra/otp.py`) — chỉ dùng được khi `APP_ENV=dev`,
bị chặn ở mọi giá trị khác. Test cần một DB Postgres test riêng:

```bash
TEST_DATABASE_URL=postgresql+psycopg://postgres:postgres@localhost:5432/ctd_test .venv/bin/pytest
```

Frontend CTD (React/Vite), chạy riêng khi phát triển UI:

```bash
cd services/ctd-api/frontend
npm ci && npm run dev
```

## Chạy cả hai qua trình soạn thảo (`.claude/launch.json`)

File `.claude/launch.json` khai cấu hình `core-dev` (chạy `node app.js` trong `core/`, cổng 3000) cho công cụ
preview/dev-server tích hợp. Thêm cấu hình tương tự cho `ctd-api` (uvicorn, cổng 8000) khi cần preview cùng lúc.

## Dựng nhanh MySQL/Postgres bằng Docker (không cần cài native)

```bash
docker run -d --name dev-mysql -p 3306:3306 -e MYSQL_ALLOW_EMPTY_PASSWORD=yes -e MYSQL_DATABASE=ultimate_tckt mysql:8
docker run -d --name dev-postgres -p 5432:5432 -e POSTGRES_PASSWORD=postgres postgres:16
```

## Lịch sử phiên bản

| Version | Ngày | Thay đổi | Người |
|---|---|---|---|
| 1.0 | 2026-09-24 | Bản đầu (viết lại từ tài liệu cũ khi gộp monorepo) | DYC |

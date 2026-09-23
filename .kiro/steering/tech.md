# Tech

## Core + module Điều hành (repo này)
- Node 22, Express 5, MySQL 8 (`mysql2`), `express-session` + `express-mysql-session`, `bcryptjs`, `node-cron`, `nodemailer`, `exceljs`, `multer`, `helmet`.
- Test: `npm test` (dùng `node --test`, file ở `tests/**/*.test.js`). Viết test trước theo TDD.
- Migration: `npm run migrate` (`src/config/migrate.js`). Mọi thay đổi schema phải đi qua migration idempotent, không sửa DB bằng tay.
- Thông báo: dùng Rule Engine có sẵn (email rules, templates, deliveries). Cron Runner nằm trong `settings-cron`.
- Setting chứa secret được mã hóa bằng `SETTINGS_ENCRYPTION_KEY`.

## Frontend chung (sẽ tạo trong GĐ1)
- Thư mục `web/`: React 18 + TypeScript + Vite. Core phục vụ file tĩnh ở `/app`.
- Frontend cũ `public/` (JS thuần) chạy song song cho đến GĐ2. Không thêm tính năng mới vào đây.

## Module CTD (repo riêng `/Users/duongpt/Developer/CTD`)
- FastAPI, Python 3.12, SQLAlchemy 2.0, Alembic, PostgreSQL 16 (dùng tính năng riêng của Postgres). Test bằng pytest, cần Postgres thật.
- Nối với Core qua JWT bridge: HS256, `HUB_BRIDGE_SECRET`, `aud=ctd`, TTL 60 giây. Chỗ nối duy nhất là `backend/app/deps.py`.

## Hạ tầng (repo `/Users/duongpt/Developer/infra`)
- Một VM Oracle ARM. Mỗi môi trường (staging, production) là một Docker Compose project chứa `tckt-app`, `tckt-db`, `ctd-app`, `ctd-db`, cùng một mạng nội bộ. Core gọi CTD tại `http://ctd-app:8000`.
- Nginx trên host: `tckt-hub.duckdns.org` → 3001, `ctd-hoso.duckdns.org` → 8001.
- Push nhánh `staging`/`main` sẽ tự động deploy. Phải chạy test local trước khi push.

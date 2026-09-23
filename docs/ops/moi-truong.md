---
doc_id: OPS-ENV-001
title: Môi trường staging và production
version: 1.0
status: active
audience: [dev, ops, ai]
owner: DYC
updated: 2026-09-24
related_code: [infra/compose/**, infra/nginx/**, infra/.env.example]
---

# Môi trường staging và production

Tài liệu này mô tả hai môi trường chạy trên cùng một VM: tên miền, cổng, biến `.env`, và trạng thái email hiện tại.

## 1. Hai môi trường, một VM

`staging` và `production` chạy song song trên cùng một máy chủ (`168.107.68.32`), tách nhau hoàn toàn ở tầng Docker Compose (hai compose project riêng, hai bộ volume riêng, hai file `.env` riêng). Dữ liệu và secret của môi trường này không lẫn sang môi trường kia.

## 2. Tên miền

| Domain | Ứng dụng | Môi trường |
|---|---|---|
| `tckt-hub-staging.duckdns.org` | core (TCKT) | staging |
| `tckt-hub.duckdns.org` | core (TCKT) | production |
| `ctd-hoso-staging.duckdns.org` | ctd-api | staging |
| `ctd-hoso.duckdns.org` | ctd-api | production |

Nginx định tuyến theo `Host` header/SNI. Site config: `ultimate-tckt-<env>-core.conf`, `ultimate-tckt-<env>-ctd.conf` (nguồn tại `infra/nginx/<env>/{core,ctd}.conf`). SSL cấp bằng certbot.

## 3. Cổng host (chỉ bind `127.0.0.1`, không mở ra internet)

| Service | Staging | Production |
|---|---|---|
| core (app) | 3000 | 3001 |
| ctd-api (app) | 8000 | 8001 |
| core-db (MySQL) | 3306 | 3307 |

`ctd-db` (Postgres) không map port ra host, chỉ truy cập qua mạng nội bộ Docker (hoặc SSH tunnel + user riêng nếu cần — hiện chưa có script tạo user chỉ đọc cho Postgres, xem `docs/ops/truy-cap-db.md`).

## 4. Biến `.env` trên VM

File thật nằm ở `/opt/ultimate-tckt/<env>/infra/.env` (quyền 600), không commit vào repo. Mẫu không giá trị: `infra/.env.example`. Danh sách biến:

```
CORE_MYSQL_ROOT_PASSWORD, CORE_DB_NAME, CORE_DB_USER, CORE_DB_PASSWORD,
CORE_SESSION_SECRET, CORE_SETTINGS_ENCRYPTION_KEY, CORE_DEVOPS_EMAILS,
CTD_DB_NAME, CTD_DB_USER, CTD_DB_PASSWORD, CTD_JWT_SECRET
```

Tiền tố `CORE_*` thay cho `TCKT_*` cũ (giá trị giữ nguyên khi chuyển đổi, xem `docs/ops/chuyen-doi-ultimate-tckt.md`). Tiền tố `CTD_*` giữ nguyên. Không ghi giá trị thật vào bất kỳ tài liệu nào — chỉ ghi tên biến và nơi lưu.

**Lưu ý về `CORE_SETTINGS_ENCRYPTION_KEY`:** compose cũ (trước khi gộp monorepo) không khai báo biến này, nên trang **Setting → SMTP** trên core bị lỗi khi lưu cấu hình (khoá mã hoá không tồn tại). Compose mới (`infra/compose/docker-compose.<env>.yml`) đã thêm biến này bắt buộc (`${CORE_SETTINGS_ENCRYPTION_KEY:?}`) — thiếu biến thì container `core` không khởi động được thay vì âm thầm lỗi khi người dùng bấm Lưu. `bootstrap-vm.sh` tự sinh giá trị này (`openssl rand -base64 32`) nếu `.env` cũ chưa có. Mất khoá này = mất khả năng đọc lại cấu hình SMTP đã lưu trước đó (xem `docs/ai/bat-bien.md`).

## 5. Trạng thái email hiện tại

- **core**: `EMAIL_NOTIFICATIONS_ENABLED=false` trên cả staging và production — hệ thống hiện **không gửi email** thông báo nào, dù Rule Engine đã có sẵn.
- **ctd-api**: `MAILER_DRIVER=console` — email được ghi ra console log thay vì gửi thật.

Bật email thật thuộc điều kiện hoàn thành một giai đoạn sau (không nằm trong đợt gộp monorepo này).

## 6. `APP_ENV` của ctd-api (mới)

Compose mới truyền `APP_ENV=staging` hoặc `APP_ENV=production` cho `ctd-api` (biến này áp dụng cho cấu hình đọc ở `services/ctd-api/backend/app/config.py`, mặc định `app_env=dev` nếu không truyền). Hệ quả:

- Trước đây môi trường thật (staging/production) chạy ngầm định với `app_env=dev` — điều kiện chặn JWT secret mặc định trong `config.py` chỉ áp dụng khi `app_env != dev`, nên production từng có thể chạy với `JWT_SECRET` mặc định mà không bị chặn khởi động. Việc chưa từng áp `APP_ENV` khiến bất kỳ ai biết địa chỉ email của một tài khoản đều có thể đăng nhập bằng mã OTP phát triển cố định `123456` (đường tắt debug đúng ra chỉ nên tồn tại ở `app_env=dev`) — lỗ hổng này đã được đóng bằng cách gán đúng `APP_ENV` theo môi trường.
- Đăng nhập bằng mật khẩu (không qua OTP) không bị ảnh hưởng và vẫn hoạt động bình thường.
- OTP thật hiện chưa tới tay người dùng vì `MAILER_DRIVER=console` (mục 5) — cần bật mailer thật trước khi luồng OTP dùng được cho người dùng cuối.

## 7. Nginx và cấu hình

Nguồn cấu hình nginx theo môi trường: `infra/nginx/<env>/core.conf`, `infra/nginx/<env>/ctd.conf`. Cài lên VM (thành `/etc/nginx/sites-available/ultimate-tckt-<env>-{core,ctd}.conf` + symlink `sites-enabled`) qua `infra/scripts/apply-infra.sh <env>` — xem `docs/ops/deploy-va-nhanh.md`.

## Lịch sử phiên bản

| Version | Ngày | Thay đổi | Người |
|---|---|---|---|
| 1.0 | 2026-09-24 | Bản đầu (viết lại từ tài liệu cũ khi gộp monorepo) | DYC |

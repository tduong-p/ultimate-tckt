---
doc_id: OPS-PROP-001
title: Đề xuất cấp máy chủ và tên miền chính thức
version: 1.0
status: active
audience: [ops, ba]
owner: DYC
updated: 2026-09-24
related_code: []
---

# Đề xuất cấp máy chủ và tên miền chính thức

Tờ trình gửi Ban Chủ nhiệm/Lãnh đạo đơn vị và bộ phận CNTT — đề xuất cấp máy chủ ảo (VM) và subdomain chính thức cho hai ứng dụng: Cổng quản lý hoạt động TCKT (`core`) và hệ thống xét duyệt hồ sơ Đảng (`ctd-api`), thay cho hạ tầng thử nghiệm hiện tại.

## 1. Hiện trạng

### 1.1. Môi trường thử nghiệm

Hệ thống hiện chạy trên **một VM thử nghiệm** (Oracle Cloud Ampere arm64, 168.107.68.32, ~6 GB RAM), đồng thời cả hai môi trường **staging** và **production** trên cùng máy để phục vụ kiểm thử — quản lý bằng hai Docker Compose project riêng: `ultimate-tckt-staging` và `ultimate-tckt-production`.

### 1.2. Container đang chạy (8 container)

| Môi trường | Service | Công nghệ | Cổng (chỉ `127.0.0.1`) |
|---|---|---|---|
| Staging | `core` | Node.js 22, Express 5 | 3000 |
| Staging | `core-db` | MySQL 8 | 3306 |
| Staging | `ctd-api` | Python 3.12, FastAPI + React SPA | 8000 |
| Staging | `ctd-db` | PostgreSQL 16 | nội bộ (không map ra host) |
| Production | `core` | Node.js 22, Express 5 | 3001 |
| Production | `core-db` | MySQL 8 | 3307 |
| Production | `ctd-api` | Python 3.12, FastAPI + React SPA | 8001 |
| Production | `ctd-db` | PostgreSQL 16 | nội bộ |

### 1.3. Nginx và tên miền tạm (DuckDNS)

Nginx reverse proxy quản lý cổng 80/443, định tuyến theo `Host` header/SNI, cả 4 tên miền DuckDNS tạm thời đều trỏ về IP VM:

- `tckt-hub-staging.duckdns.org` → `127.0.0.1:3000`
- `tckt-hub.duckdns.org` → `127.0.0.1:3001`
- `ctd-hoso-staging.duckdns.org` → `127.0.0.1:8000`
- `ctd-hoso.duckdns.org` → `127.0.0.1:8001`

### 1.4. Tải và tài nguyên thực tế

- RAM: 8 container tiêu thụ khoảng 2 GiB (MySQL chiếm phần lớn do buffer pool mặc định lớn; Node.js và FastAPI mỗi bên vài trăm MiB tổng cộng).
- CPU: nhàn rỗi dưới 3%, khi có truy vấn thông thường dưới 15%.
- Đĩa: toàn bộ hệ thống hiện chỉ chiếm khoảng 8–9 GB trong dung lượng SSD sẵn có.

## 2. Đề xuất triển khai server mới — chỉ giữ production

Để tối ưu chi phí và đảm bảo tính ổn định, độc lập cho môi trường vận hành chính thức, đề xuất máy chủ mới **chỉ triển khai môi trường production**, môi trường staging tiếp tục dùng chung VM thử nghiệm hiện tại (hoặc một VM staging riêng nếu ngân sách cho phép — không bắt buộc trong đợt này).

### 2.1. Kiến trúc trên server mới (4 container production)

1. **`core`** — Node.js 22/Express 5, quản lý Kanban nhiệm vụ, Timeline/Gantt, duyệt đề án và nghiệm thu bàn giao (Review flow). Cổng nội bộ `127.0.0.1:3001`.
2. **`core-db`** — MySQL 8 (InnoDB, `utf8mb4_unicode_ci`), tinh chỉnh `innodb_buffer_pool_size` (128–256M) để giảm RAM tiêu thụ so với mặc định. Volume `core_mysql`.
3. **`ctd-api`** — Python 3.12/FastAPI/SQLAlchemy 2.0/Alembic, frontend React SPA (Vite + Tailwind). Số hoá quy trình xét kết nạp/chuyển Đảng chính thức, state machine cấu hình trong CSDL, nhật ký kiểm toán bất biến. Cổng nội bộ `127.0.0.1:8001`.
4. **`ctd-db`** — PostgreSQL 16. Volume `ctd_postgres`.

### 2.2. Định danh container (đã chuẩn hoá trong đợt gộp monorepo)

Tên compose project/service cũ (`seee-ctd-production-tckt-app-1`, tiền tố lai tạp do dùng chung project `seee-ctd` cho cả hai ứng dụng) đã được thay bằng định danh rõ nghĩa:

| Ứng dụng | Service | Compose project |
|---|---|---|
| Core (TCKT) | `core`, `core-db` | `ultimate-tckt-production` |
| CTD | `ctd-api`, `ctd-db` | `ultimate-tckt-production` |

Việc đổi tên này áp dụng ngay trên VM thử nghiệm hiện tại (xem `docs/ops/chuyen-doi-ultimate-tckt.md`), không chờ đến khi có server mới — server mới khi được cấp sẽ kế thừa đúng tên gọi này ngay từ đầu.

### 2.3. Nginx và tên miền chính thức đề xuất

Chuyển từ tên miền DuckDNS tạm sang subdomain chính thức của trường/viện:

- `tckt.seee.hust.edu.vn` → `core` production (`127.0.0.1:3001`)
- `ctd.seee.hust.edu.vn` → `ctd-api` production (`127.0.0.1:8001`)

Nginx quản lý cổng 80 (chuyển hướng HTTPS) và 443; chứng chỉ SSL cấp/gia hạn tự động qua Certbot.

### 2.4. CI/CD và vận hành bảo mật

- **Zero-build trên server**: ảnh Docker được build sẵn (arm64, buildx + QEMU) tại GitHub Actions và đẩy lên `ghcr.io`; máy chủ chỉ `pull` và `up -d` — không biên dịch mã nguồn.
- **CSDL không mở ra internet**: cổng MySQL/Postgres chỉ bind `127.0.0.1`; truy cập từ xa (khi cần) đi qua SSH tunnel + user chỉ đọc, xem `docs/ops/truy-cap-db.md`.
- **Lưu trữ bền vững**: tệp đính kèm (`core_uploads`) và tài liệu hồ sơ (`ctd_documents`) nằm trên Docker named volume riêng, không mất khi cập nhật container. Backup CSDL tự động, giữ 14 bản gần nhất (`docs/ops/backup-restore.md`).
- **Tác vụ định kỳ**: các cron job xử lý gửi thông báo/nhắc việc của `core` và `ctd-api` (xem `docs/dev/email-cron.md`) chạy như tiến trình nền hoặc bên trong container, không phụ thuộc vào cấu hình đặc thù của server thử nghiệm hiện tại.

## 3. Cấu hình đề xuất cho server mới

### 3.1. Căn cứ

Chỉ chạy 4 container production, sau khi tinh chỉnh MySQL: tổng RAM sử dụng thực tế ước tính khoảng 0.9–1.1 GiB (bao gồm hệ điều hành + Nginx).

### 3.2. Bảng cấu hình VM

| Thông số | Phương án 1 — Tối thiểu | Phương án 2 — Khuyến nghị | Ghi chú |
|---|---|---|---|
| vCPU | 2 | 2 | Đủ cho tải web API + CSDL quy mô vài trăm người dùng nội bộ |
| RAM | 2 GB | 4 GB (khuyến nghị) | 4 GB cho dư địa cache khi cao điểm nộp hồ sơ |
| Swap | 4 GB SSD | 4 GB SSD | Lớp đệm dự phòng khi tải đột biến |
| Ổ cứng | 40 GB SSD | 50–60 GB SSD | Hệ thống hiện dùng ~9 GB; đủ cho 3–5 năm lưu trữ |
| Hệ điều hành | Ubuntu 24.04 LTS / Debian 12 | như phương án 1 | 64-bit, tương thích Docker Engine |
| IP | 1 IPv4 công cộng | như phương án 1 | Dùng chung cho cả hai ứng dụng qua Nginx |
| Quyền truy cập | SSH `sudo` | như phương án 1 | Cho đầu mối kỹ thuật cấu hình hạ tầng |

Khuyến nghị ưu tiên **Phương án 2** cho độ ổn định lâu dài; Phương án 1 vẫn khả thi nếu cần tiết kiệm.

### 3.3. Subdomain và chính sách mở cổng

- Subdomain đề xuất: `tckt.seee.hust.edu.vn`, `ctd.seee.hust.edu.vn`.
- Mở từ internet: `80/TCP` (redirect HTTPS), `443/TCP`.
- Cổng quản trị: `22/TCP` (SSH), xác thực bắt buộc bằng khoá công khai, tắt đăng nhập mật khẩu; có thể giới hạn theo dải IP nội bộ/VPN nếu có.
- Chặn hoàn toàn từ internet: cổng CSDL (`3306`/`3307` MySQL tương ứng, `5432` Postgres) và mọi cổng ứng dụng nội bộ khác ngoài 80/443.
- Lưu lượng ra ngoài: cho phép `443` tới `ghcr.io` (kéo image) và dịch vụ gửi email khi được bật.

## 4. Kết luận và kiến nghị phê duyệt

Kính đề nghị Ban Chủ nhiệm/Lãnh đạo đơn vị và bộ phận quản trị hạ tầng xem xét, phê duyệt:

1. Cấp 01 máy chủ ảo theo cấu hình mục 3.2 (ưu tiên Phương án 2).
2. Cấp 01 địa chỉ IPv4 công cộng và quyền quản trị SSH (sudo) cho đầu mối kỹ thuật.
3. Tạo và trỏ 02 subdomain chính thức (`tckt.seee.hust.edu.vn`, `ctd.seee.hust.edu.vn`) về IP máy chủ mới.
4. Cử đầu mối kỹ thuật phối hợp cùng nhóm phát triển hoàn tất thiết lập trong 1–2 ngày làm việc.

## Lịch sử phiên bản

| Version | Ngày | Thay đổi | Người |
|---|---|---|---|
| 1.0 | 2026-09-24 | Bản đầu (viết lại từ tờ trình cũ `DE_XUAT_CAP_SERVER_VA_SUBDOMAIN.md`, cập nhật tên container/compose sang `ultimate-tckt-*`) | DYC |

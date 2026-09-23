---
doc_id: ADR-0011-001
title: Đổi tên hạ tầng seee → ultimate-tckt-*, chuyển volume
version: 1.0
status: active
audience: [dev, ai]
owner: DYC
updated: 2026-09-24
related_code: [infra/**]
---

# Đổi tên hạ tầng seee → ultimate-tckt-*, chuyển volume

Đây là ADR duy nhất ghi chi tiết tên hạ tầng cũ (`seee`), để tra cứu khi đọc
log/script cũ hoặc khi rà soát còn sót tên cũ ở đâu không.

## Bối cảnh

Hạ tầng ban đầu được đặt tên theo dự án cũ "SEEE Activity Hub", trước khi đổi
sang thương hiệu TCKT rồi gộp monorepo `ultimate-tckt`. Tên hạ tầng cũ rải rác
nhiều nơi: compose project, tên service, tên volume Docker, tên image GHCR,
thư mục trên VM, tên site Nginx, tên file khoá deploy.

## Quyết định

Đổi toàn bộ sang tiền tố `ultimate-tckt-*`:

| Thứ | Cũ | Mới |
|---|---|---|
| Compose project | `seee-ctd-staging` / `seee-ctd-production` | `ultimate-tckt-staging` / `ultimate-tckt-production` |
| Service | `tckt-app`, `tckt-db`, `ctd-app`, `ctd-db` | `core`, `core-db`, `ctd-api`, `ctd-db` |
| Volume | `tckt_mysql_data`, `tckt_uploads`, `ctd_postgres_data`, `ctd_documents` | `core_mysql`, `core_uploads`, `ctd_postgres`, `ctd_documents` |
| Image | `ghcr.io/tduong-p/tckt-activity-hub`, `…/ctd` | `ghcr.io/tduong-p/ultimate-tckt-core`, `…/ultimate-tckt-ctd-api` |
| Thư mục VM | `/opt/infra` | `/opt/ultimate-tckt/{staging,production,backups}` |
| Nginx site | `staging-tckt.conf`, `staging-ctd.conf`, … | `ultimate-tckt-staging-core.conf`, `ultimate-tckt-staging-ctd.conf`, … |
| Khoá deploy | `/tmp/infra-deploy.lock` | `/tmp/ultimate-tckt-<env>-deploy.lock` |
| Docker hostname nội bộ | `ctd-app:8000` | `ctd-api:8000` |

Dữ liệu (MySQL, Postgres, file upload/tài liệu) được chuyển từ volume tên cũ
sang volume tên mới bằng script chuyển đổi, không tạo mới rỗng. Giữ nguyên:
tên miền DuckDNS, cổng host, chứng chỉ Let's Encrypt, tên DB/user trong
`.env` (chỉ đổi tiền tố biến, ví dụ `TCKT_*` → `CORE_*`, giá trị giữ nguyên).

## Hệ quả

- Bất kỳ script/log/tài liệu nào còn nhắc `seee` hoặc `/opt/infra` là tàn dư
  cần dọn, không phải quy ước hiện hành.
- Chi tiết từng lệnh chuyển đổi (đếm dòng dữ liệu trước/sau, rollback) nằm ở
  `docs/ops/chuyen-doi-ultimate-tckt.md`.

## Lịch sử phiên bản

| Version | Ngày | Thay đổi | Người |
|---|---|---|---|
| 1.0 | 2026-09-24 | Bản đầu, nguồn: `docs/specs/2026-09-23-monorepo-ultimate-tckt-design.md` §4.1 (M7) | DYC |

---
doc_id: OPS-VPS-001
title: VPS — cài đặt và bố cục
version: 1.1
status: active
audience: [dev, ops, ai]
owner: DYC
updated: 2026-09-26
related_code: [infra/scripts/setup-vm.sh, infra/scripts/bootstrap-vm.sh]
---

# VPS — cài đặt và bố cục

Tài liệu này mô tả máy chủ, bố cục thư mục trên VM, và cách chuẩn bị một VM mới (hoặc thêm một checkout môi trường mới) từ đầu.

## 1. Máy chủ

- Oracle Cloud, Ampere (arm64), 1 OCPU, ~6 GB RAM, địa chỉ `168.107.68.32`, user `ubuntu`.
- Cả hai môi trường (`staging`, `production`) chạy trên cùng VM này, tách nhau ở tầng Docker Compose.
- Vì VM là arm64 còn GitHub Actions runner miễn phí là amd64, ảnh Docker được build arm64 bằng buildx + QEMU (xem `docs/ops/deploy-va-nhanh.md` mục 2).

## 2. Bố cục thư mục trên VM

```
/opt/ultimate-tckt/
├── staging/     git checkout nhánh staging (sparse-checkout: chỉ infra/), infra/.env (600)
├── production/  git checkout nhánh main    (sparse-checkout: chỉ infra/), infra/.env (600)
└── backups/     <env>-<yyyymmdd-hhmm>-{core,ctd}.sql.gz, nginx-<ts>/ (bản sao site trước khi apply-infra)
```

Mỗi checkout chỉ chứa `infra/` (sparse-checkout) — VM không cần mã nguồn ứng dụng, chỉ cần compose file, nginx config và script để pull image từ GHCR.

## 3. Deploy key (SSH) cho VM đọc repo GitHub

VM cần đọc (clone/pull) repo `tduong-p/ultimate-tckt` mà không cần quyền ghi. Tạo một cặp khoá SSH riêng, chỉ dùng cho việc này, chạy trên chính VM:

```bash
ssh-keygen -t ed25519 -f ~/.ssh/ultimate_tckt_deploy -N ''
```

Khai báo trong `~/.ssh/config` của user chạy deploy trên VM để git dùng đúng khoá này khi kết nối GitHub:

```
Host github.com
  IdentityFile ~/.ssh/ultimate_tckt_deploy
```

Dán nội dung `~/.ssh/ultimate_tckt_deploy.pub` vào GitHub repo → **Settings → Deploy keys → Add deploy key**, **không** tick "Allow write access" (chỉ đọc). Đây là bước tay, không có script tự động hoá — người thực hiện là chủ repo.

Lưu ý: đây là khoá khác với khoá CI dùng để SSH *vào* VM (xem `docs/ops/github.md` — `SSH_PRIVATE_KEY`); một khoá để VM đọc GitHub, một khoá để GitHub Actions ghi lệnh vào VM. Người SSH tay vào VM dùng khoá cá nhân riêng — xem [`ssh.md`](ssh.md).

## 4. Chuẩn bị VM lần đầu (`setup-vm.sh`)

`infra/scripts/setup-vm.sh` cài các gói nền tảng (Docker, Nginx, Certbot) và chuẩn bị thư mục gốc:

```bash
sudo mkdir -p /opt/ultimate-tckt/backups
sudo chown -R "$USER":"$USER" /opt/ultimate-tckt
```

Sau bước này, VM đã sẵn sàng nhưng **chưa có checkout nào** — chạy tiếp `bootstrap-vm.sh` cho từng môi trường (mục 5).

## 5. Tạo checkout môi trường + `.env` (`bootstrap-vm.sh`)

`infra/scripts/bootstrap-vm.sh <staging|production>` (nguồn dùng chung `infra/scripts/lib.sh`) làm hai việc, độc lập với nhau:

1. **Clone sparse nếu chưa có checkout:**
   ```bash
   git clone --filter=blob:none --sparse --branch <staging|main> git@github.com:tduong-p/ultimate-tckt.git /opt/ultimate-tckt/<env>
   git -C /opt/ultimate-tckt/<env> sparse-checkout set infra
   ```
2. **Sinh `infra/.env`** từ file `.env.<env>` cũ (biến `UT_OLD_ENV_DIR`, mặc định `/opt/infra`): đổi tiền tố `TCKT_` → `CORE_`, tự sinh `CORE_SETTINGS_ENCRYPTION_KEY` bằng `openssl rand -base64 32` nếu thiếu/rỗng, rồi kiểm đủ mọi biến bắt buộc theo `infra/.env.example`.
   - Thiếu biến bắt buộc → in danh sách biến thiếu ra stderr, **exit 2**, không ghi file (không bao giờ tạo `.env` nửa vời).
   - `infra/.env` đã tồn tại → không bao giờ ghi đè, chỉ in thông báo và exit 0 — chạy lại script này an toàn.
   - File ghi ra có quyền `600`.

Script **không đụng tới container đang chạy** — chạy `bootstrap-vm.sh` không gây gián đoạn dịch vụ hiện có.

## 6. Sau khi bootstrap xong

Chạy `infra/scripts/apply-infra.sh <env>` để cài nginx site và khởi động stack lần đầu (xem `docs/ops/deploy-va-nhanh.md`). Với việc chuyển đổi từ hạ tầng cũ sang tên mới (không phải VM mới hoàn toàn), xem quy trình đầy đủ ở `docs/ops/chuyen-doi-ultimate-tckt.md`.

## Lịch sử phiên bản

| Version | Ngày | Thay đổi | Người |
|---|---|---|---|
| 1.0 | 2026-09-24 | Bản đầu (viết lại từ tài liệu cũ khi gộp monorepo) | DYC |
| 1.1 | 2026-09-26 | Trỏ tới hướng dẫn SSH cá nhân `ssh.md` | DYC |

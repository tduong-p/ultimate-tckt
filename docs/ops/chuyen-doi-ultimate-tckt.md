---
doc_id: OPS-CUT-001
title: Runbook chuyển đổi sang hạ tầng ultimate-tckt
version: 1.1
status: active
audience: [ops, ai]
owner: DYC
updated: 2026-09-24
related_code: [infra/scripts/migrate-volumes.sh, infra/scripts/bootstrap-vm.sh]
---

# Runbook chuyển đổi sang hạ tầng ultimate-tckt

Tài liệu này là runbook từng lệnh để chuyển VM thử nghiệm hiện tại (stack cũ, project `seee-ctd-<env>`, thư mục `/opt/infra`) sang hạ tầng monorepo mới (project `ultimate-tckt-<env>`, thư mục `/opt/ultimate-tckt/<env>`), **không mất dữ liệu**. Đây là một trong số ít tài liệu được phép nhắc tên hạ tầng cũ (`seee-ctd-*`, `/opt/infra`) vì mục đích của chính nó là mô tả việc chuyển đổi từ tên cũ sang tên mới.

Làm theo thứ tự: **staging trước, production sau**. Mỗi bước đều có cách kiểm tra trước khi sang bước kế tiếp.

## 0. Điều kiện tiên quyết

### 0.1. Deploy key cho VM (đọc repo GitHub)

Trên chính VM, tạo một cặp khoá SSH riêng để VM đọc (clone/pull) repo mới:

```bash
ssh-keygen -t ed25519 -f ~/.ssh/ultimate_tckt_deploy -N ''
```

Thêm vào `~/.ssh/config` của user chạy deploy trên VM:

```
Host github.com
  IdentityFile ~/.ssh/ultimate_tckt_deploy
```

Dán nội dung `~/.ssh/ultimate_tckt_deploy.pub` vào GitHub repo `tduong-p/ultimate-tckt` → **Settings → Deploy keys → Add deploy key**, **không** tick "Allow write access". Đây là thao tác tay, chủ repo thực hiện.

### 0.2. Khoá CI (GitHub Actions SSH vào VM)

Tạo một cặp khoá **khác** (không dùng chung với deploy key ở 0.1) trên máy quản trị hoặc trên VM:

```bash
ssh-keygen -t ed25519 -f ./ultimate_tckt_ci -N ''
```

- Public key → thêm vào `~/.ssh/authorized_keys` của user SSH trên VM (user khai trong secret `SSH_USER`).
- Private key → dán vào GitHub Environment secret `SSH_PRIVATE_KEY` (cả Environment `staging` và `production`, xem `docs/ops/github.md`).

### 0.3. Kiểm tra trước khi bắt đầu

- Repo GitHub đã tồn tại, nhánh `main`/`staging` đã push, CI xanh (test + build), `DEPLOY_ENABLED=false`.
- `docs/ops/github.md` đã làm xong: Environments, secrets, ruleset.

## 1. Bootstrap VM (không đụng container đang chạy)

`/opt` thuộc root nên tạo thư mục gốc trước (một lần):

```bash
sudo mkdir -p /opt/ultimate-tckt && sudo chown ubuntu:ubuntu /opt/ultimate-tckt
```

Trên VM hiện tại, deploy key dùng host alias `github-ultimate-tckt` trong `~/.ssh/config`; khi đó thay URL clone bằng `git@github-ultimate-tckt:tduong-p/ultimate-tckt.git` và chạy bootstrap với `UT_REPO_URL=git@github-ultimate-tckt:tduong-p/ultimate-tckt.git`.

```bash
git clone --filter=blob:none --sparse --branch staging git@github.com:tduong-p/ultimate-tckt.git /tmp/ut
git -C /tmp/ut sparse-checkout set infra
bash /tmp/ut/infra/scripts/bootstrap-vm.sh staging
bash /tmp/ut/infra/scripts/bootstrap-vm.sh production
```

Kỳ vọng: in ra `Wrote /opt/ultimate-tckt/staging/infra/.env` và tương tự cho `production`. Chạy `docker ps` — container cũ `seee-ctd-*` vẫn đang chạy bình thường, chưa bị ảnh hưởng.

Nếu script báo thiếu biến (exit 2): bổ sung biến còn thiếu vào `/opt/infra/.env.<env>` cũ rồi chạy lại — script không bao giờ ghi `.env` nửa vời.

## 2. Chuyển từng môi trường

Lặp lại mục này cho `staging`, sau đó cho `production` (ở giờ ít người dùng, xem mục 2.7).

### 2.1. Đếm mốc dữ liệu (trước khi đụng gì)

Core (MySQL — 3 bảng đại diện: `users`, `activities`, `tasks`):

```bash
docker compose -p seee-ctd-<env> --env-file /opt/infra/.env.<env> -f /opt/infra/docker-compose.<env>.yml \
  exec -T tckt-db sh -c 'mysql -N -uroot -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE" -e "SELECT (SELECT COUNT(*) FROM users),(SELECT COUNT(*) FROM activities),(SELECT COUNT(*) FROM tasks)"'
```

CTD (Postgres — bảng `case`, tên bảng thật theo `services/ctd-api/backend/app/models/case.py`; cần trích dẫn vì `case` là từ khoá SQL):

```bash
docker compose -p seee-ctd-<env> --env-file /opt/infra/.env.<env> -f /opt/infra/docker-compose.<env>.yml \
  exec -T ctd-db sh -c 'psql -tA -U "$POSTGRES_USER" "$POSTGRES_DB" -c "SELECT COUNT(*) FROM \"case\""'
```

Ghi lại 4 con số này (users, activities, tasks, case) — dùng để so sánh lại ở bước 2.6.

Nên đếm chính xác **mọi bảng** của cả hai DB (lặp `SHOW TABLES` / `pg_tables` rồi `COUNT(*)` từng bảng), lưu vào `~/ut-cutover/<env>-before.txt`, và ở bước 2.6 so bằng `diff <(sort before) <(sort after)`. Lần chuyển staging đã làm vậy (37 bảng).

### 2.2. Backup stack cũ

```bash
UT_BACKUP_COMPOSE_ARGS="-p seee-ctd-<env> --env-file /opt/infra/.env.<env> -f /opt/infra/docker-compose.<env>.yml" \
  bash /opt/ultimate-tckt/<env>/infra/scripts/backup.sh <env>
```

Kỳ vọng: hai file `.sql.gz` mới trong `/opt/ultimate-tckt/backups/`.

### 2.3. Dừng stack cũ

```bash
docker compose -p seee-ctd-<env> --env-file /opt/infra/.env.<env> -f /opt/infra/docker-compose.<env>.yml stop
```

Dùng `stop`, không dùng `down -v` — tuyệt đối không thêm `-v` (xoá volume).

### 2.4. Chép dữ liệu sang volume mới

```bash
bash /opt/ultimate-tckt/<env>/infra/scripts/migrate-volumes.sh <env>
```

Script chép `seee-ctd-<env>_{tckt_mysql_data,tckt_uploads,ctd_postgres_data,ctd_documents}` sang `ultimate-tckt-<env>_{core_mysql,core_uploads,ctd_postgres,ctd_documents}`, **không xoá** volume cũ. Nếu volume đích đã có dữ liệu, script từ chối (exit 3) — không bao giờ ghi đè âm thầm; kiểm tra vì sao đích đã có dữ liệu (chạy trùng lần hai?) trước khi tiếp tục.

### 2.5. Khởi động stack mới

Đặt tag image (dùng đúng SHA vừa build trên CI cho lần push đầu tiên của repo mới):

```bash
export CORE_IMAGE_TAG=<sha12>
export CTD_API_IMAGE_TAG=<sha12>
bash /opt/ultimate-tckt/<env>/infra/scripts/apply-infra.sh <env> true
```

`apply_db=true` để lệnh này cũng `up -d` luôn `core-db`/`ctd-db` (lần đầu tiên stack mới khởi động, cần cả database).

### 2.6. Đếm mốc lại và so sánh

Chạy lại đúng hai câu lệnh ở mục 2.1, nhưng nhắm vào stack mới:

```bash
docker compose -p ultimate-tckt-<env> --env-file /opt/ultimate-tckt/<env>/infra/.env \
  -f /opt/ultimate-tckt/<env>/infra/compose/docker-compose.<env>.yml \
  exec -T core-db sh -c 'mysql -N -uroot -p"$CORE_MYSQL_ROOT_PASSWORD" "$CORE_DB_NAME" -e "SELECT (SELECT COUNT(*) FROM users),(SELECT COUNT(*) FROM activities),(SELECT COUNT(*) FROM tasks)"'

docker compose -p ultimate-tckt-<env> --env-file /opt/ultimate-tckt/<env>/infra/.env \
  -f /opt/ultimate-tckt/<env>/infra/compose/docker-compose.<env>.yml \
  exec -T ctd-db sh -c 'psql -tA -U "$CTD_DB_USER" "$CTD_DB_NAME" -c "SELECT COUNT(*) FROM \"case\""'
```

**Khớp với mục 2.1** → tiếp tục. Ngoại lệ đã biết: CTD tự seed tài khoản quản trị khi khởi động nếu `app_user` rỗng (log: "Đã seed … tài khoản quản trị"), nên `app_user` có thể tăng 0 → 1; tài khoản này có mật khẩu mặc định — chủ repo đổi ngay sau khi chuyển. **Lệch** → dừng ngay, không xoá gì, làm theo mục Rollback bên dưới — volume cũ vẫn còn nguyên nên không mất dữ liệu.

### 2.7. Gỡ nginx site cũ, dùng site mới

`apply-infra.sh` đã cài site mới (`ultimate-tckt-<env>-{core,ctd}.conf`). Gỡ site cũ khỏi `sites-enabled`:

```bash
sudo rm -f /etc/nginx/sites-enabled/<staging-tckt.conf|staging-ctd.conf|production-tckt.conf|production-ctd.conf>
sudo nginx -t && sudo systemctl reload nginx
```

(Tên file site cũ chính xác tuỳ theo cách đã cài trên VM thử nghiệm này — kiểm `ls /etc/nginx/sites-enabled/` trước khi xoá để chắc xoá đúng file, không xoá nhầm site mới vừa cài.)

### 2.8. Bật deploy tự động và xác nhận CI

```bash
gh variable set DEPLOY_ENABLED --body true
```

Push lên `staging` (hoặc merge PR `staging → main` cho production) một commit chạm cả `docs/ops/chuyen-doi-ultimate-tckt.md` (cập nhật Nhật ký chuyển đổi bên dưới, bump version) và một thay đổi nhỏ chạm `core/` + `services/ctd-api/` (ví dụ comment version trong Dockerfile) để kích hoạt cả hai job deploy.

Xác nhận: CI job `deploy-core`, `deploy-ctd-api` xanh.

### 2.9. Smoke check

- `https://tckt-hub-staging.duckdns.org` (hoặc `tckt-hub.duckdns.org` cho production) trả trang, `/api/health` trả OK.
- `https://ctd-hoso-staging.duckdns.org` (hoặc `ctd-hoso.duckdns.org`) trả trang, `/api/health` trả OK.
- Đăng nhập được (chủ repo tự nhập mật khẩu — không có agent nào nhập hộ mật khẩu).
- Dữ liệu cũ (hoạt động, nhiệm vụ, hồ sơ) hiển thị đúng như trước khi chuyển.

Với production: gián đoạn dự kiến 2–5 phút trong lúc dừng stack cũ + chép volume + khởi động stack mới.

## 3. Rollback (áp dụng từ bước 2.3 đến 2.8)

1. Dừng stack mới: `docker compose -p ultimate-tckt-<env> ... stop`.
2. Chạy lại `deploy.sh` của **stack cũ** với image cũ (nếu stack cũ đã dừng hẳn, khởi động lại bằng compose cũ thay vì `deploy.sh` mới):
   ```bash
   bash /opt/infra/scripts/deploy.sh <env> <tckt|ctd> <tag-cu>
   ```
3. Volume `seee-ctd-*` **chưa từng bị đụng tới** trong toàn bộ quy trình (chỉ đọc để chép sang volume mới) — dữ liệu cũ vẫn nguyên vẹn.
4. Khôi phục site nginx cũ từ bản sao mà `apply-infra.sh` lưu tự động ở `/opt/ultimate-tckt/backups/nginx-<ts>/`, rồi `nginx -t && systemctl reload nginx`.

## 4. Dọn dẹp sau khi ổn định (giữ 14 ngày)

Sau khi một môi trường chạy ổn định trên hạ tầng mới **14 ngày**, xoá thủ công (không có script tự động — cố ý, để có thời gian phát hiện vấn đề trước khi xoá vĩnh viễn):

- Thư mục `/opt/infra` (checkout cũ).
- Volume `seee-ctd-<env>_{tckt_mysql_data,tckt_uploads,ctd_postgres_data,ctd_documents}`.
- Image cũ trên VM (`docker image prune`) và trên GHCR (`tckt-activity-hub`, `ctd` — repo cũ, xem Task archive).

Ghi ngày xoá thực tế vào bảng Nhật ký bên dưới (bump version tài liệu này).

## Nhật ký chuyển đổi

| Môi trường | Ngày | Người | Ghi chú |
|---|---|---|---|
| staging | 2026-09-24 | Claude (theo uỷ quyền DYC) | Backup `staging-20260923-1840-*`. 37 bảng khớp, trừ `app_user` 0→1 (CTD seed admin). Image core `fd51e64975dd`, ctd-api `52da14bcdaac`. Health 200 qua domain; `app_env=staging` (OTP dev đã tắt). Đã gỡ `staging-{tckt,ctd}.conf`. Workflow deploy của 3 repo cũ đã tắt. |
| production | | | |

## Lịch sử phiên bản

| Version | Ngày | Thay đổi | Người |
|---|---|---|---|
| 1.0 | 2026-09-24 | Bản đầu (viết lại từ tài liệu cũ khi gộp monorepo) | DYC |
| 1.1 | 2026-09-24 | Ghi nhật ký chuyển staging; thêm bước tạo `/opt/ultimate-tckt`, host alias deploy key, đếm mọi bảng, ngoại lệ seed admin CTD | DYC |

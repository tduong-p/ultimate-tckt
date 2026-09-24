---
doc_id: OPS-DEPLOY-001
title: Deploy và nhánh git
version: 1.3
status: active
audience: [dev, ops, ai]
owner: DYC
updated: 2026-09-24
related_code: [.github/workflows/**, infra/scripts/deploy.sh, infra/scripts/apply-infra.sh, core/src/config/migrate-units.js]
---

# Deploy và nhánh git

Tài liệu này giúp dev và AI agent biết push vào nhánh nào thì lên môi trường nào, CI làm gì, và cách deploy/rollback thủ công khi cần.

## 1. Nhánh quyết định môi trường

| Nhánh | Môi trường | Ghi chú |
|---|---|---|
| `staging` | staging | Không bắt buộc review, nhưng ruleset bắt buộc check xanh nên thay đổi đi qua PR từ nhánh tính năng (xem `docs/ops/github.md` mục 4). |
| `main` | production | Chỉ nhận thay đổi qua Pull Request (ruleset chặn push thẳng, xem `docs/ops/github.md`). |

Luồng làm việc thường ngày:

```
làm trên staging / nhánh tính năng → PR vào staging → PR staging → main
```

Hotfix khẩn cấp: tạo nhánh từ `main` → PR vào `main` → merge ngược `main → staging` để hai nhánh không lệch nhau.

Không có bước duyệt thủ công riêng cho deploy — mỗi push (sau khi test xanh) là một lần deploy tự động, miễn là biến repo `DEPLOY_ENABLED == 'true'` (xem mục 4).

## 2. Pipeline CI (`.github/workflows/deploy.yml`)

Workflow chạy trên mọi push/PR vào `staging` và `main`, gồm các job:

1. **`changes`** — dùng `dorny/paths-filter@v3` để biết PR/commit này đụng vào `core/` (+ `web/`), `services/ctd-api/`, hay `infra/`; tính `tag` (12 ký tự đầu của SHA) và `env` (`staging` hoặc `production` theo nhánh).
2. **`test-core`** — chạy nếu `core/**` hoặc `web/**` đổi: dựng service MySQL 8, `cd core && npm ci && npm test`.
3. **`test-ctd`** — chạy nếu `services/ctd-api/**` đổi: dựng service Postgres 16, `pytest -q` trong `services/ctd-api/backend`.
4. **`build-core`** / **`build-ctd-api`** — chỉ chạy khi push (không chạy trên PR) và test tương ứng xanh: build image arm64 (buildx + QEMU vì runner là amd64, VM là Oracle Ampere arm64) và push lên GHCR với tag `ghcr.io/tduong-p/ultimate-tckt-core:<sha12>` / `ultimate-tckt-ctd-api:<sha12>`.
5. **`deploy-core`** / **`deploy-ctd-api`** — chỉ chạy khi push và biến repo `DEPLOY_ENABLED == 'true'`: SSH vào VM (`appleboy/ssh-action@v1.2.0`, dùng GitHub Environment tương ứng `staging`/`production`) và chạy:
   ```bash
   bash /opt/ultimate-tckt/<env>/infra/scripts/deploy.sh <env> <core|ctd-api> <tag>
   ```
6. **`infra`** — chạy khi `infra/**` đổi (push) hoặc chạy tay (`workflow_dispatch`), cũng cần `DEPLOY_ENABLED == 'true'`: SSH chạy `infra/scripts/apply-infra.sh <env> [apply_db]`. Tick `apply_db` khi kích hoạt thủ công để đồng thời cập nhật `core-db`/`ctd-db` (mặc định false — không đụng database).

Các job deploy/infra **không** dùng concurrency group của GitHub (GitHub huỷ job đang chờ khi job mới vào cùng group — deploy sẽ bị bỏ âm thầm). Việc tuần tự do `flock` trên VM đảm nhận (`/tmp/ultimate-tckt-<env>-deploy.lock`, chờ tối đa 180 giây). Thứ tự giữa `infra` và `deploy-*` khi cùng đổi trong một push không được đảm bảo (chấp nhận được vì cả hai đều `git pull` trước khi chạy).

Test bị `skip` do path filter (ví dụ PR chỉ đổi `docs/`) được GitHub tính là "thành công" nên không chặn merge — đây là lý do PR thuần tài liệu vẫn qua được required checks `test-core`/`test-ctd`.

## 3. `deploy.sh` làm gì

`infra/scripts/deploy.sh <staging|production> <core|ctd-api> <tag>` (nguồn dùng chung ở `infra/scripts/lib.sh`):

1. Lấy khoá `flock` của môi trường (`/tmp/ultimate-tckt-<env>-deploy.lock`) — tránh hai deploy chạy chồng.
2. `git pull --ff-only` đúng nhánh của môi trường đó (`staging` hoặc `main`).
3. `docker compose -p ultimate-tckt-<env> --env-file infra/.env -f infra/compose/docker-compose.<env>.yml pull <service>` rồi `up -d --no-deps <service>` — chỉ đụng đúng một service, service còn lại giữ tag đang chạy.
4. Kiểm tra `http://127.0.0.1:<port>/api/health` trả 200 trong tối đa 60 giây; không đạt thì script thoát khác 0 (CI đỏ), không coi là thành công.

## 4. Bật/tắt deploy tự động

Biến repo `DEPLOY_ENABLED` (GitHub → Settings → Variables):

- `false`: CI chỉ test + build image, không SSH vào VM. Dùng khi mới dựng repo hoặc đang tạm dừng deploy tự động.
- `true`: deploy tự động sau mỗi push đủ điều kiện vào `staging`.

Production cần thêm biến `PROD_DEPLOY_ENABLED == 'true'` (công tắc riêng, để có thể bật staging mà production vẫn tắt, vd trong lúc chuyển đổi).

## 5. Deploy/rollback thủ công

SSH vào VM rồi chạy trực tiếp script (dùng khi cần deploy một tag cụ thể ngoài luồng CI, ví dụ rollback):

```bash
ssh ubuntu@168.107.68.32
bash /opt/ultimate-tckt/<staging|production>/infra/scripts/deploy.sh <staging|production> <core|ctd-api> <tag-cu-hoac-moi>
```

Lấy `<tag>` từ tab Actions (SHA rút gọn của lần build cuối tốt) hoặc từ `git log --oneline` trên nhánh tương ứng. Xem thêm `docs/playbooks/rollback.md` và `docs/ops/su-co.md`.

## 6. Deploy GĐ1-A (nền tảng đa đơn vị)

GĐ1-A thêm migration `unit_memberships`/`org_units`/... (`core/src/config/migrate-units.js`, chạy tự động khi
`core` khởi động). Trước khi mở PR `staging → main`, làm đủ 4 bước sau trên staging — chỉ mở PR khi cả 4 đạt:

1. **Backup `core-db` trước khi merge vào `main`** (xem `docs/ops/backup-restore.md`):
   ```bash
   ssh ubuntu@168.107.68.32
   cd /opt/ultimate-tckt/production
   bash infra/scripts/backup.sh production
   ```
2. **Sau khi deploy lên staging, kiểm dữ liệu migration đã chạy đúng:**
   ```bash
   docker compose -p ultimate-tckt-staging exec core-db mysql -u<user> -p<pass> <db> \
     -e "SELECT COUNT(*) FROM unit_memberships; SELECT COUNT(*) FROM users; SELECT name FROM platform_migrations;"
   ```
   Điều kiện đạt: `unit_memberships` ≥ `users` (mỗi user cũ có ít nhất một membership TCKT), và danh sách
   `platform_migrations` có `multi_unit_backfill_v1`.
3. **Kiểm log không có lỗi auto-migrate:**
   ```bash
   docker compose -p ultimate-tckt-staging logs core | grep -i "migrat"
   ```
   Điều kiện đạt: không có dòng `Auto-migration failed`.
4. **Đăng nhập kiểm `req.session.user` có `units`:** một tài khoản TCKT thường và một tài khoản trong
   `CORE_DEVOPS_EMAILS` (được đảm bảo membership `dyc_admin`), gọi `GET /api/session` cho từng tài khoản, kiểm
   response có mảng `units` khớp membership mong đợi (TCKT thường: chỉ TCKT; tài khoản devops: có DYC).

Chỉ khi cả 4 bước trên đạt mới mở PR `staging → main`.

## 7. Xem log khi deploy

```bash
ssh ubuntu@168.107.68.32
cd /opt/ultimate-tckt/<staging|production>
docker compose -p ultimate-tckt-<env> --env-file infra/.env -f infra/compose/docker-compose.<env>.yml logs -f core
```

## Lịch sử phiên bản

| Version | Ngày | Thay đổi | Người |
|---|---|---|---|
| 1.0 | 2026-09-24 | Bản đầu (viết lại từ tài liệu cũ khi gộp monorepo) | DYC |
| 1.1 | 2026-09-24 | Staging: thay đổi đi qua PR vì ruleset bắt buộc check | DYC |
| 1.2 | 2026-09-24 | Bỏ concurrency group (flock trên VM), thêm công tắc `PROD_DEPLOY_ENABLED` | DYC |
| 1.3 | 2026-09-24 | Thêm mục 6 "Deploy GĐ1-A" (backup, kiểm migration `unit_memberships`, log auto-migrate, đăng nhập kiểm `units`) trước khi mở PR `staging → main`, GĐ1-A Task 9 | DYC |

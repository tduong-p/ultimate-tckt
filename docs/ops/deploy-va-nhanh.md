---
doc_id: OPS-DEPLOY-001
title: Deploy và nhánh git
version: 1.0
status: active
audience: [dev, ops, ai]
owner: DYC
updated: 2026-09-24
related_code: [.github/workflows/**, infra/scripts/deploy.sh, infra/scripts/apply-infra.sh]
---

# Deploy và nhánh git

Tài liệu này giúp dev và AI agent biết push vào nhánh nào thì lên môi trường nào, CI làm gì, và cách deploy/rollback thủ công khi cần.

## 1. Nhánh quyết định môi trường

| Nhánh | Môi trường | Ghi chú |
|---|---|---|
| `staging` | staging | Push thẳng được (không bắt buộc PR), CI vẫn chạy đầy đủ test trước khi deploy. |
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

Các job deploy/infra của cùng một môi trường dùng chung nhóm concurrency `vm-deploy-<env>` nên không chạy chồng lên nhau; thứ tự giữa `infra` và `deploy-*` khi cùng đổi trong một push không được đảm bảo (chấp nhận được vì cả hai đều `git pull` trước khi chạy).

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
- `true`: deploy tự động sau mỗi push đủ điều kiện.

## 5. Deploy/rollback thủ công

SSH vào VM rồi chạy trực tiếp script (dùng khi cần deploy một tag cụ thể ngoài luồng CI, ví dụ rollback):

```bash
ssh ubuntu@168.107.68.32
bash /opt/ultimate-tckt/<staging|production>/infra/scripts/deploy.sh <staging|production> <core|ctd-api> <tag-cu-hoac-moi>
```

Lấy `<tag>` từ tab Actions (SHA rút gọn của lần build cuối tốt) hoặc từ `git log --oneline` trên nhánh tương ứng. Xem thêm `docs/playbooks/rollback.md` và `docs/ops/su-co.md`.

## 6. Xem log khi deploy

```bash
ssh ubuntu@168.107.68.32
cd /opt/ultimate-tckt/<staging|production>
docker compose -p ultimate-tckt-<env> --env-file infra/.env -f infra/compose/docker-compose.<env>.yml logs -f core
```

## Lịch sử phiên bản

| Version | Ngày | Thay đổi | Người |
|---|---|---|---|
| 1.0 | 2026-09-24 | Bản đầu (viết lại từ tài liệu cũ khi gộp monorepo) | DYC |

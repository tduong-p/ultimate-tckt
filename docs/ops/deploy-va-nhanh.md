---
doc_id: OPS-DEPLOY-001
title: Deploy và nhánh git
version: 4.4
status: active
audience: [dev, ops, ai]
owner: DYC
updated: 2026-10-09
related_code: [.github/workflows/**, infra/scripts/deploy.sh, infra/scripts/apply-infra.sh, infra/scripts/backup.sh, infra/scripts/lib.sh]
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

Không có bước duyệt thủ công riêng cho deploy: push đủ điều kiện là deploy tự động, miễn là biến repo `DEPLOY_ENABLED == 'true'` (production cần thêm `PROD_DEPLOY_ENABLED == 'true'`, xem mục 4). Các job deploy ứng dụng (`deploy-core`, `deploy-ctd-api`, `deploy-noti`) chỉ chạy **sau khi** test và build của app đó xanh; riêng job `infra` chỉ cần `changes`, nên **không chờ test** — cấu hình nginx/compose có thể được áp lên production khi test còn đỏ (xem mục 2, job 6).

## 2. Pipeline CI (`.github/workflows/deploy.yml`)

Workflow chạy trên mọi push/PR vào `staging` và `main`, gồm các job:

1. **`changes`** — dùng `dorny/paths-filter@v3` để biết PR/commit này đụng vào `core/`, `web/`, `services/ctd-api/`, `services/noti-api/`, hay `infra/`; tính `tag` (12 ký tự đầu của SHA) và `env` (`staging` hoặc `production` theo nhánh).
2. **`test-core`** — chạy nếu `core/**` đổi: dựng service MySQL 8, `cd core && npm ci && npm test`.
   **`test-web`** — chạy nếu `web/**` đổi: `cd web && npm ci && npm test && npm run build` (`build` = `tsc && vite build`, nên lỗi kiểu cũng làm đỏ). Chưa có job build/deploy cho `web/`: image Core không chứa `web/`.
3. **`test-ctd`** — chạy nếu `services/ctd-api/**` đổi: dựng service Postgres 16, `pytest -q` trong `services/ctd-api/backend`.
   **`test-noti`** — tương tự cho `services/noti-api/**` (Postgres 16, database `noti_test`).
4. **`build-core`** / **`build-ctd-api`** / **`build-noti`** — chỉ chạy khi push (không chạy trên PR) và test tương ứng xanh: build image arm64 (buildx + QEMU vì runner là amd64, VM là Oracle Ampere arm64) và push lên GHCR với tag `ghcr.io/tduong-p/ultimate-tckt-core:<sha12>` / `ultimate-tckt-ctd-api:<sha12>` / `ultimate-tckt-noti:<sha12>`.
5. **`deploy-core`** / **`deploy-ctd-api`** — chỉ chạy khi push và biến repo `DEPLOY_ENABLED == 'true'`: SSH vào VM (`appleboy/ssh-action@v1.2.0`, dùng GitHub Environment tương ứng `staging`/`production`) và chạy:
   ```bash
   bash /opt/ultimate-tckt/<env>/infra/scripts/deploy.sh <env> <core|ctd-api> <tag>
   ```
   **`deploy-noti`** chạy cho staging luôn; production chỉ khi biến repo `PROD_NOTI_ENABLED == 'true'` (cùng `DEPLOY_ENABLED`), gọi `deploy.sh <env> noti <tag>`.
6. **`infra`** — chạy khi `infra/**` đổi (push) hoặc chạy tay (`workflow_dispatch`), cũng cần `DEPLOY_ENABLED == 'true'` (production: thêm `PROD_DEPLOY_ENABLED`): SSH chạy `infra/scripts/apply-infra.sh <env> [apply_db]`. Tick `apply_db` khi kích hoạt thủ công để đồng thời cập nhật `core-db`/`ctd-db` (mặc định false — không đụng database). Job này chỉ `needs: changes`, **không** chờ `test-*` hay `build-*` (phát hiện R14 của SPEC-REL-001): với `main`, cấu hình được áp ngay khi push dù test chưa xanh.

Các job deploy/infra **không** dùng concurrency group của GitHub (GitHub huỷ job đang chờ khi job mới vào cùng group — deploy sẽ bị bỏ âm thầm). Việc tuần tự do `flock` trên VM đảm nhận (`/tmp/ultimate-tckt-<env>-deploy.lock`, chờ tối đa 180 giây). Thứ tự giữa `infra` và `deploy-*` khi cùng đổi trong một push không được đảm bảo (chấp nhận được vì cả hai đều `git pull` trước khi chạy): `deploy-core`, `deploy-ctd-api` và `infra` của cùng một push chạy song song, và push chỉ coi là xong khi **cả ba** xanh.

Test bị `skip` do path filter (ví dụ PR chỉ đổi `docs/`) được GitHub tính là "thành công" nên không chặn merge — đây là lý do PR thuần tài liệu vẫn qua được required checks `test-core`/`test-ctd`/`test-web`.

## 3. `deploy.sh` làm gì

`infra/scripts/deploy.sh <staging|production> <core|ctd-api|noti> <tag>` (nguồn dùng chung ở `infra/scripts/lib.sh`):

1. Lấy khoá `flock` của môi trường (`/tmp/ultimate-tckt-<env>-deploy.lock`) — tránh hai deploy chạy chồng.
2. `git pull --ff-only` đúng nhánh của môi trường đó (`staging` hoặc `main`).
3. `docker compose -p ultimate-tckt-<env> --env-file infra/.env -f infra/compose/docker-compose.<env>.yml pull <service>` rồi `up -d --no-deps <service>` — chỉ đụng service của app đó (`noti` = `noti-api` + `noti-worker`), các app khác giữ tag đang chạy.
4. Kiểm tra `http://127.0.0.1:<port>/api/health` (Noti: `/v1/health`, cổng 8100 staging / 8101 production) trả 200 trong tối đa 60 giây; không đạt thì script thoát khác 0 (CI đỏ), không coi là thành công.

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

## 6. Xem log khi deploy

```bash
ssh ubuntu@168.107.68.32
docker logs -f ultimate-tckt-<staging|production>-core-1
```

`docker logs` chỉ cho thấy thông báo khởi động và lỗi in ra `console` (ví dụ migration lỗi rồi thoát). Log ứng dụng của Core (`core/src/logger.js`) ghi vào file `/app/log.md` **trong container** và mất khi container bị tạo lại: `docker exec ultimate-tckt-<env>-core-1 tail -n 100 /app/log.md`. Lệnh `docker compose` gõ tay cần nạp tag image trước (xem mục 7.0).

## 7. Phát hành đợt 1: `staging` → `main`

Runbook cho lần `staging → main` đầu tiên (SPEC-PILOT-001 §3; cổng và phát hiện lấy từ SPEC-REL-001). Merge vào `main` là production
tự deploy và **không có bước duyệt environment**, nên mọi kiểm tra phải xong **trước** khi bấm merge. Mục này mô tả code `staging`
tại thời điểm viết; việc nào còn làm tay vì chưa có script (rollback tự động khi health check lỗi, giữ tag GHCR, nginx giới hạn
upload…) đều được nêu rõ ở chỗ đó. Từ bước 7.2 đến hết 7.5, **đóng băng `staging`**: không merge thêm gì vào.

### 7.0 Công cụ dùng trong phiên SSH

Compose của cả hai môi trường đòi `${CORE_IMAGE_TAG:?}` và `${CTD_API_IMAGE_TAG:?}` (cả hai thêm `${NOTI_IMAGE_TAG:?}` từ khi production có Noti) cho **mọi**
lệnh `docker compose`, kể cả `exec` và `logs`. `deploy.sh` và `apply-infra.sh` tự nạp chúng; lệnh gõ tay và `backup.sh` thì không,
nên phải nạp trước bằng `ut_tags`. Dán các hàm sau một lần mỗi phiên:

```bash
ssh ubuntu@168.107.68.32
source /opt/ultimate-tckt/production/infra/scripts/lib.sh   # ut_compose, ut_current_tag, ut_health

ut_tags() {   # ut_tags <staging|production>: lấy tag image đang chạy để compose nội suy được
  export CORE_IMAGE_TAG="$(ut_current_tag "$1" core)"
  export CTD_API_IMAGE_TAG="$(ut_current_tag "$1" ctd-api)"
  export NOTI_IMAGE_TAG="$(ut_current_tag "$1" noti-api)"
  [ -n "$NOTI_IMAGE_TAG" ] || export NOTI_IMAGE_TAG=unset
}

core_sql() {  # core_sql <staging|production> '<câu SQL>': chạy SQL bằng root MySQL ngay trong container core-db
  ut_compose "$1" exec -T core-db sh -c 'mysql -uroot -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE" -e "$0"' "$2"
}
```

Mật khẩu và tên database nằm trong container `core-db` (`$MYSQL_ROOT_PASSWORD`, `$MYSQL_DATABASE`), không đi qua shell của host và
không bao giờ gõ ra màn hình; MySQL in cảnh báo "password on the command line" ra stderr là bình thường. Không gọi `ut_env_branch`,
`ut_lock`, `ut_die` trong phiên tương tác: chúng `exit` và đóng luôn phiên SSH. Container chưa chạy thì tag của nó rỗng và compose
báo thiếu biến: xem tag thật bằng `docker ps`.

Diễn tập hai hàm này trên staging (`ut_tags staging`, `core_sql staging 'SELECT COUNT(*) FROM users;'`) trước ngày phát hành.

### 7.1 Cổng phát hành

Chỉ mở PR `staging → main` khi **mọi** dòng dưới đây đã đạt (nguồn: SPEC-REL-001 §3).

| # | Điều kiện | Kiểm bằng |
|---|---|---|
| G1 | Bản sửa R1 (đổi `users.role` ở trang Tổ không đồng bộ membership TCKT) đã merge vào `staging` | 7.2 bước 2 |
| G2 | `npm run docs:check -- --base origin/main` xanh | 7.2 bước 3 |
| G3 | Production **giữ `CORE_DEVOPS_EMAILS` rỗng**, không có `users.is_devops = 1`, và **không có membership ngoài TCKT** cho tới khi xong nhóm B và C của PLAN-REL-001 | 7.2 bước 6, 7.5 bước 4 |
| G4 | Mục 7 này đã có trên `staging` và phần "Trước khi merge" (7.2) đã chạy xong | 7.2 |
| G5 | Checklist smoke (7.4) xanh trên **staging** | 7.2 bước 9 |
| G6 | PR merge bằng **merge commit** (không squash, không rebase) | 7.3, 7.5 bước 1 |
| O1 | #55: dump đã gỡ khỏi `main`, `CORE_SESSION_SECRET` đã xoay và Core đã khởi động lại **sau** khi xoay, không tài khoản đang hoạt động nào còn hash bị lộ | 7.2 bước 4 (4a, 4b) |
| O2 | #54: bản sửa seed đã chạy trên production, mật khẩu admin CTD đã đặt, mật khẩu mặc định bị từ chối kể cả sau khi khởi động lại container | 7.2 bước 4 (4c) |

Vì sao G3: sau phát hành quyền đọc từ membership. Không có DYC, BTV hay đơn vị khác thì các lỗ hổng phân quyền đã biết (R2–R9 của
SPEC-REL-001) không có ai để khai thác; migration chỉ tạo membership DYC khi `DEVOPS_EMAILS` có giá trị hoặc có `users.is_devops = 1`.
O1 và O2 là **việc vận hành trên VM**, không phải việc merge PR: PR #57 (CTD) và #58 (dump) chỉ đưa mã lên `main`, và phải ghi `Refs #54`/`Refs #55`,
không `Closes`, để GitHub không tự đóng issue khi việc ở VM chưa xong. Chỉ đóng #54, #55 khi đã có comment bằng chứng theo 7.2 bước 4.
Vì sao G6: squash/rebase tạo commit trên `main` mà `staging` không có, nên lần `staging → main` sau sẽ hiện lại toàn bộ diff cũ.

### 7.2 Trước khi merge (G1–G5)

**Trên máy dev**, trong bản sao sạch (không có thay đổi chưa commit):

1. Cập nhật tham chiếu và ghi lại commit sẽ phát hành:
   ```bash
   git fetch origin
   STAGING_SHA="$(git rev-parse origin/staging)"
   git log --oneline origin/staging..origin/main | wc -l    # phải là 0: staging đã chứa mọi thứ của main
   git log --oneline origin/main..origin/staging | wc -l    # số commit sẽ lên production
   ```
   Dòng đầu khác 0 nghĩa là `main` có commit mà `staging` chưa có (hotfix chưa merge ngược): dừng, làm theo
   `../playbooks/hotfix-production.md` bước 7 trước.
2. G1: bản sửa R1 đã vào `staging` và CI của `staging` xanh (tab Actions, lần chạy `deploy` mới nhất):
   ```bash
   gh api "repos/tduong-p/ultimate-tckt/commits/$STAGING_SHA/check-runs" --jq '.check_runs[] | select(.name=="test-core") | .conclusion'   # phải là success
   git grep -n 'does not recreate a removed TCKT membership' "$STAGING_SHA" -- core/tests/teams.mgmt.test.js | wc -l   # phải >= 4
   ```
   Bằng chứng là `test-core` xanh trên đúng `STAGING_SHA` kèm các test hồi quy của PLAN-REL-001 Task 1 (đồng bộ role/membership **và** không hồi sinh
   membership TCKT đã gỡ). Tìm thấy tên hàm trong `teams.js` không chứng minh hành vi và không còn được coi là bằng chứng G1.
3. G2: kiểm tài liệu so với `main` trên đúng commit sẽ merge:
   ```bash
   git switch --detach "$STAGING_SHA"
   npm run docs:check -- --base origin/main     # phải in "docs ok"
   git switch -
   ```
4. O1, O2 (#54, #55). Mã lên `main` bằng hai PR hotfix riêng; **mỗi merge vào `main` là một lần deploy production** (#57 đổi `services/ctd-api/**` nên
   build và deploy `ctd-api`; #58 không đổi gì được build). Ngay sau khi merge #57 phải làm 4c, không để cách đêm: bản `ctd-api` cũ trên production
   đặt mật khẩu admin CTD về mật khẩu mặc định công khai ở mỗi lần khởi động, và bản mới không đặt lại mật khẩu cho tới khi bạn đặt.
   - **4a. Mã trên `main`** (máy dev):
     ```bash
     git fetch origin
     git ls-tree origin/main -- tools/test-fixtures/sql/mysql/backup_current.sql | wc -l                  # phải là 0
     git show origin/main:services/ctd-api/backend/app/seeds/set_password.py > /dev/null && echo "có set_password"
     git show origin/main:services/ctd-api/backend/app/seeds/admin_seed.py | grep -c MOI_TRUONG_DEV      # phải >= 1
     ```
     Lịch sử git của repo public vẫn chứa dump: gỡ khỏi cây `main` không thu hồi được gì đã lộ, nên 4b mới là biện pháp thật.
   - **4b. Dump (#55): xoay session secret và vô hiệu hash bị lộ.** Trên VM, sao lưu `.env`, đặt `CORE_SESSION_SECRET` mới (chuỗi ngẫu nhiên, không dán vào đâu),
     khởi động lại Core bằng `deploy.sh` với tag đang chạy hoặc `ut_compose production up -d --no-deps core`, rồi nghiệm thu:
     ```bash
     E=/opt/ultimate-tckt/production/infra/.env
     stat -c 'env sửa lúc: %y' "$E"
     docker inspect -f 'core khởi động lúc: {{.State.StartedAt}}' ultimate-tckt-production-core-1    # phải SAU thời điểm env sửa
     printf %s "$(sed -n 's/^CORE_SESSION_SECRET=//p' "$E" | tail -n 1)" | sha256sum | cut -c1-8      # tám ký tự đầu: ghi vào issue, phải khác tám ký tự đã ghi trước khi xoay
     ```
     Chạy dòng `sha256sum` cả **trước** khi sửa `.env` để có dấu vân tay cũ mà so. Session cũ phải mất hiệu lực: dùng trình duyệt đã đăng nhập
     trước khi xoay, tải lại trang, phải bị đưa về màn hình đăng nhập.
     Rồi kiểm không tài khoản đang hoạt động nào còn hash bị lộ. **Trên máy dev**, gom hash từ mọi phiên bản của file dump trong lịch sử (hash trong repo public không phải bí mật):
     ```bash
     F=tools/test-fixtures/sql/mysql/backup_current.sql
     for c in $(git log --format=%H origin/main -- "$F"); do git show "$c:$F" 2>/dev/null; done \
       | grep -oE '\$2[aby]\$[0-9]{2}\$[./A-Za-z0-9]{53}' | sort -u > hashes.txt
     wc -l < hashes.txt                                   # số hash lộ; ghi vào issue
     sed "s/.*/'&'/" hashes.txt | paste -sd, - > hashes.in
     scp hashes.in ubuntu@168.107.68.32:/tmp/hashes.in    # rồi xoá hashes.txt, hashes.in ở máy dev
     ```
     **Trên VM** (đã `ut_tags production`):
     ```bash
     core_sql production "SELECT COUNT(*) AS con_hash_lo_dang_hoat_dong FROM users WHERE is_active = 1 AND password_hash IN ($(cat /tmp/hashes.in));"
     rm -f /tmp/hashes.in
     ```
     Kết quả phải là `0`. Khác 0: các tài khoản đó vẫn đăng nhập được bằng mật khẩu mà ai cũng thử bật được ngoại tuyến; khoá hoặc đổi mật khẩu từng tài khoản qua
     giao diện quản trị Core (không `UPDATE` tay), chạy lại truy vấn. Cũng phải đạt `tai_khoan_mau = 0` (bước 6 dưới đây).
   - **4c. Admin CTD (#54).** Sau khi #57 đã deploy, trên VM:
     ```bash
     ut_current_tag production ctd-api                      # phải bằng 12 ký tự đầu SHA merge của #57
     docker exec ultimate-tckt-production-ctd-api-1 python -c "import app.seeds.set_password" && echo "có set_password"
     CTD_ADMIN_EMAIL="$(sed -n 's/^ADMIN_EMAIL = "\(.*\)"$/\1/p' /opt/ultimate-tckt/production/services/ctd-api/backend/app/seeds/admin_seed.py)"
     docker exec -it ultimate-tckt-production-ctd-api-1 python -m app.seeds.set_password "$CTD_ADMIN_EMAIL"
     ```
     Nhập mật khẩu mới tại dấu nhắc, lưu vào kho mật khẩu của nhóm. Nghiệm thu (cả ba phải đạt): (1) đăng nhập CTD bằng mật khẩu mới thành công; (2) đăng nhập bằng
     giá trị `ADMIN_PASSWORD_DEFAULT` trong `admin_seed.py` bị từ chối; (3) `docker restart ultimate-tckt-production-ctd-api-1`, chờ `health` 200, rồi (1) và (2) vẫn
     đúng, chứng tỏ seed không đặt lại mật khẩu mỗi lần khởi động. Nếu `import` ở dòng hai lỗi `ModuleNotFoundError` thì container đang chạy image trước bản sửa:
     dừng, deploy lại tag có bản sửa, không tiếp tục.
   - **Ghi nhận.** Comment vào #54 và #55: thời điểm, người thực hiện, kết quả từng lệnh trên (số, không phải giá trị bí mật), và tám ký tự đầu của dấu vân tay secret.
     Không dán mật khẩu, hash hay email người dùng thật. Chỉ khi đủ bằng chứng mới đóng issue; các rủi ro còn lại (dữ liệu vẫn nằm trong lịch sử git public) ghi rõ trong comment.

**Trên VM** (SSH, nạp công cụ ở 7.0, rồi `ut_tags production`):

5. Ghi lại tag đang chạy để còn lùi được và kiểm image cũ còn trên VM:
   ```bash
   B=/opt/ultimate-tckt/backups
   ut_tags production
   echo "core=$CORE_IMAGE_TAG ctd-api=$CTD_API_IMAGE_TAG"
   docker image ls --format '{{.Repository}}:{{.Tag}}' | grep -E "ultimate-tckt-(core|ctd-api):($CORE_IMAGE_TAG|$CTD_API_IMAGE_TAG)$"   # phải ra 2 dòng
   if [ -n "$CORE_IMAGE_TAG" ] && [ -n "$CTD_API_IMAGE_TAG" ] && [ "$CORE_IMAGE_TAG" != latest ] && [ "$CTD_API_IMAGE_TAG" != latest ]; then
     printf 'core=%s\nctd-api=%s\n' "$CORE_IMAGE_TAG" "$CTD_API_IMAGE_TAG" > "$B/keep-production-pre-release1-tags.txt"
     echo "đã ghi $B/keep-production-pre-release1-tags.txt"
   else
     echo "KHÔNG ghi: tag rỗng hoặc latest -> dừng"
   fi
   ```
   Tag là `latest` hoặc rỗng, hoặc không đủ 2 dòng image: dừng — không có bản để lùi; hỏi trưởng module. Chép hai tag vào issue phát hành
   (tag không phải secret); 7.6 đọc lại chúng từ file `keep-production-pre-release1-tags.txt`. `ghcr-cleanup` chỉ giữ 40 bản mới nhất mỗi package
   (staging và production dùng chung), nên bản cũ có thể đã bị xoá khỏi GHCR; ảnh trong cache của VM mới là chỗ chắc chắn.
6. G3: kiểm `.env` production và dữ liệu hiện có.
   ```bash
   v="$(sed -n 's/^CORE_DEVOPS_EMAILS=//p' /opt/ultimate-tckt/production/infra/.env | tail -n 1 | tr -d "[:space:]\"'")"
   if [ -n "$v" ]; then echo "CORE_DEVOPS_EMAILS: CÓ giá trị -> chưa đạt G3"; else echo "CORE_DEVOPS_EMAILS: rỗng -> đạt G3"; fi
   unset v
   ```
   Có giá trị thì dừng và đưa ra họp; không in giá trị ra, không dán vào issue. Chỉ khi nhóm đồng ý mới đặt rỗng trong `.env`
   (sao lưu file trước, giữ quyền `600`, không đưa ra khỏi VM).
   ```bash
   core_sql production "SELECT COUNT(*) AS cot_is_devops FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'is_devops';"
   core_sql production "SELECT COUNT(*) AS tai_khoan_mau FROM users WHERE email = 'admin@example.com';"
   ```
   `cot_is_devops` phải là `0`. Nếu là `1`, migration sẽ tạo membership DYC cho mọi người có `is_devops = 1`: chạy
   `core_sql production "SELECT COUNT(*) FROM users WHERE is_devops = 1;"`, phải ra `0`, nếu không thì dừng. `tai_khoan_mau` phải là
   `0` (tài khoản mẫu của `core/db.sql`, hash mật khẩu của nó nằm trong git công khai; việc a4 của SPEC-PILOT-001); khác 0 thì dừng và
   đưa ra họp.
7. Mốc dữ liệu trước phát hành, ghi vào issue phát hành để so sau phát hành và sau rollback:
   ```bash
   core_sql production "SELECT (SELECT COUNT(*) FROM users) AS users, (SELECT COUNT(*) FROM teams) AS teams, (SELECT COUNT(*) FROM activities) AS activities, (SELECT COUNT(*) FROM tasks) AS tasks, (SELECT COUNT(*) FROM documents) AS documents, (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE()) AS so_bang;"
   core_sql production "SELECT role, COUNT(*) AS so_nguoi FROM users GROUP BY role;"
   ```
   Phải có ít nhất một `admin`: sau phát hành quyền đọc từ membership, mà membership TCKT được sao chép từ `users.role`.
8. Backup, kiểm backup, và giữ riêng một bản không bị xoay vòng:
   ```bash
   df -h /opt/ultimate-tckt | tail -n 1            # còn dư chỗ cho hai file dump
   bash /opt/ultimate-tckt/production/infra/scripts/backup.sh production
   B=/opt/ultimate-tckt/backups
   CORE_DUMP="$(ls -1t "$B"/production-*-core.sql.gz | head -n 1)"
   CTD_DUMP="$(ls -1t "$B"/production-*-ctd.sql.gz | head -n 1)"
   gunzip -t "$CORE_DUMP" && gunzip -t "$CTD_DUMP" && echo "gzip nguyên vẹn"
   gunzip -c "$CORE_DUMP" | tail -n 2                   # phải thấy "-- Dump completed on ..."
   gunzip -c "$CORE_DUMP" | grep -c '^CREATE TABLE'     # phải bằng so_bang ở bước 7
   gunzip -c "$CTD_DUMP" | tail -n 2                    # phải thấy "-- PostgreSQL database dump complete"
   cp -p "$CORE_DUMP" "$B/keep-production-pre-release1-core.sql.gz"
   cp -p "$CTD_DUMP" "$B/keep-production-pre-release1-ctd.sql.gz"
   ```
   `backup.sh` giữ 14 bản theo mẫu `production-*`; hai bản `keep-…` nằm ngoài mẫu nên không bị xoá. Dump chứa dữ liệu thật: không chép
   ra ngoài VM, không đưa vào repo (repo là public). Phải có `ut_tags production` (bước 5) trong phiên này, vì `backup.sh` dùng compose.
9. G5: chạy checklist 7.4 trên **staging** (miền `-staging`), sau khi các job deploy của lần chạy `deploy` mới nhất trên `staging`
   xanh. Ghi kết quả vào issue phát hành.

Bước nào không đạt thì dừng; không có ngoại lệ kiểu "merge rồi sửa sau".

### 7.3 Merge (G6)

1. Mở PR `staging → main` trên GitHub. Tiêu đề `release: đợt 1 (staging → main)`; mô tả liệt kê G1–G6, `STAGING_SHA`, tag cũ (bước 5)
   và link #54, #55.
2. Chờ check bắt buộc của ruleset `protect-main`: `changes`, `test-core`, `test-ctd`, `docs`.
3. Merge bằng nút **Create a merge commit**. Không "Squash and merge", không "Rebase and merge". Nếu nút mặc định đang là squash, đổi lại
   trước khi bấm.
4. Theo dõi tab Actions của lần chạy `deploy` trên `main`: `changes` → `test-*` → `build-core`, `build-ctd-api` → `deploy-core`,
   `deploy-ctd-api`; `infra` chạy song song và không chờ test (mục 1–2). `deploy-noti` chỉ chạy trên production khi `PROD_NOTI_ENABLED == 'true'`. Chờ **tất cả** xong
   rồi mới sang 7.5.
5. `deploy-core` đỏ vì health check quá 60 giây ở lần đầu (Core chạy migration trước khi mở cổng): đừng bấm deploy lại ngay; làm
   7.5 bước 2. Thấy dòng `TCKT Activity Hub running on port` thì Core đã lên bình thường: ghi nhận job đỏ, không rollback. Thấy lỗi
   migration hoặc container `Restarting` liên tục thì sang 7.6.

### 7.4 Checklist smoke

Chạy trên staging trước khi merge (G5) và trên production sau khi deploy. Dựa trên SPEC-PILOT-001 §7.3, chỉnh theo code hiện tại.

```bash
H=tckt-hub.duckdns.org            # staging: tckt-hub-staging.dyclub.tech
curl -fsS "https://$H/api/health"; echo
curl -fsS "https://$H/api/version"; echo
curl -fsS "https://ctd-hoso.duckdns.org/api/health"; echo     # staging: ctd-hoso-staging.dyclub.tech
```

1. Hai `health` trả 200. `/api/version` chỉ trả version của `core/package.json` và một chuỗi build cố định, **không** có SHA: kiểm bản đang
   chạy bằng tag container (`ut_current_tag <env> core` so với SHA, xem 7.5 bước 1).
2. Đăng nhập bằng một tài khoản member và một tài khoản admin của TCKT. Sau phát hành quyền đọc từ membership: không vào được hoặc
   nhận 403 nghĩa là thiếu membership (xem 7.5 bước 4).
3. Tạo đề xuất hoạt động → admin thấy thông báo trong app (chuông) → duyệt → người đề xuất thấy thông báo.
4. Giao task → nhận → nộp duyệt kèm ảnh → duyệt. Nginx chưa đặt `client_max_body_size` (R13, SPEC-REL-001): ảnh lớn hơn 1 MB nhận
   413. Cho tới khi R13 được sửa, thử với ảnh nhỏ hơn 1 MB và ghi 413 ở ảnh lớn là lỗi đã biết, không chặn đợt 1.
5. Xuất Excel báo cáo.
6. Không có lỗi mới trong log Core. Core ghi log vào file trong container, không phải stdout:
   ```bash
   C=ultimate-tckt-production-core-1               # staging: ultimate-tckt-staging-core-1
   docker exec "$C" sh -c 'grep -c " — ERROR" /app/log.md; true'    # số lỗi từ lúc container khởi động; phải là 0
   docker logs --since 10m "$C" 2>&1 | tail -n 20
   ```
   Trên production, bộ nhắc hạn ghi các dòng `info` mỗi 15 phút khi chưa nối Noti (key trống, R12): không phải lỗi.

### 7.5 Sau khi merge (production)

1. G6 và tag đã deploy. **Trên máy dev:**
   ```bash
   git fetch origin
   git merge-base --is-ancestor "$STAGING_SHA" origin/main && echo "G6 đạt: staging là tổ tiên của main" || echo "G6 HỎNG"
   git rev-list --parents -n 1 origin/main | wc -w        # 3 = một commit merge (commit + hai cha)
   git rev-parse --short=12 origin/main                   # = MERGE12
   ```
   Tag image là 12 ký tự đầu SHA của commit push, và chỉ dịch vụ nào có đường dẫn đổi trong lần push đó mới được build lại (bộ lọc `changes`, mục 2).
   Vì vậy **không** mặc định cả hai tag đều bằng `MERGE12`: #57 đã đưa `ctd-api` lên trước, nên sau khi staging và main đã đồng bộ, lần phát hành này có thể
   không đổi `ctd-api`. Xác định dịch vụ nào đổi (máy dev), rồi so với tag thật trên VM:
   ```bash
   git diff --quiet origin/main^1 origin/main -- core && echo "core: KHÔNG đổi, tag giữ nguyên bản trước" || echo "core: ĐỔI, tag phải = MERGE12"
   git diff --quiet origin/main^1 origin/main -- services/ctd-api && echo "ctd-api: KHÔNG đổi, tag giữ nguyên (tag của lần deploy #57)" || echo "ctd-api: ĐỔI, tag phải = MERGE12"
   ```
   **Trên VM:**
   ```bash
   ut_current_tag production core
   ut_current_tag production ctd-api
   ```
   Dịch vụ "ĐỔI" mà tag khác `MERGE12`: job build/deploy của nó chưa xong hoặc đỏ, xem tab Actions, chưa sang bước sau. Dịch vụ "KHÔNG đổi": tag phải trùng
   tag trước phát hành (đã ghi ở 7.2 bước 5, hoặc tag deploy của #57 với `ctd-api`).
2. Container và log khởi động:
   ```bash
   docker ps --filter name=ultimate-tckt-production --format '{{.Names}}  {{.Status}}'
   docker logs --tail 50 ultimate-tckt-production-core-1 2>&1 | grep -E 'running on port|rror'
   ```
   Bốn container (`core`, `ctd-api`, `core-db`, `ctd-db`) phải `Up`, không `Restarting`; phải thấy `TCKT Activity Hub running on port`.
   Thấy lỗi migration hoặc `Restarting` thì sang 7.6.
3. `health` qua miền thật: đoạn `curl` ở 7.4 với miền production.
4. G3 và dữ liệu sau migration:
   ```bash
   ut_tags production
   core_sql production "SELECT 'users' AS muc, COUNT(*) AS so FROM users UNION ALL SELECT 'org_units', COUNT(*) FROM org_units UNION ALL SELECT 'membership_TCKT', COUNT(*) FROM unit_memberships m JOIN org_units o ON o.id = m.unit_id WHERE o.code = 'TCKT' UNION ALL SELECT 'membership_ngoai_TCKT', COUNT(*) FROM unit_memberships m JOIN org_units o ON o.id = m.unit_id WHERE o.code <> 'TCKT';"
   core_sql production "SELECT name FROM platform_migrations ORDER BY name;"
   docker exec ultimate-tckt-production-core-1 sh -c 'if [ -n "$(printf %s "$DEVOPS_EMAILS" | tr -d "[:space:]")" ]; then echo "DEVOPS_EMAILS: CÓ giá trị -> G3 bị phá"; else echo "DEVOPS_EMAILS: rỗng -> đạt G3"; fi'
   ```
   Kỳ vọng: `org_units` = 7; `membership_TCKT` = `users` (và bằng `users` ở mốc 7.2 bước 7); `membership_ngoai_TCKT` = 0; ba marker
   `devops_to_dyc_membership_v1`, `dyc_bootstrap_from_env_v1`, `multi_unit_backfill_v1`; `DEVOPS_EMAILS` rỗng. `membership_ngoai_TCKT` khác 0 nghĩa là
   G3 bị phá: dừng mọi thao tác thêm thành viên, báo họp, xem 7.6.
5. Chạy checklist 7.4 trên **production**.
6. Xác nhận lại O2 sau phát hành (mật khẩu admin CTD đã đặt ở 7.2 bước 4c, không đặt lại ở đây): đăng nhập CTD bằng mật khẩu mới phải thành công, bằng
   mật khẩu mặc định phải bị từ chối, và container có `python -c "import app.seeds.set_password"` chạy được:
   ```bash
   docker exec ultimate-tckt-production-ctd-api-1 python -c "import app.seeds.set_password" && echo "ctd-api có bản sửa #54"
   ```
   Bước 4c chưa làm thì **dừng phát hành**, làm ngay 7.2 bước 4c.
7. Đồng bộ ngược bằng PR `main → staging` (`../playbooks/hotfix-production.md` bước 7) để `git log origin/staging..origin/main` về rỗng. Lưu ý: ngay sau khi merge commit `staging → main`, nhánh `origin/staging` chưa chứa commit merge này, do đó `main` CHƯA phải là tổ tiên của `staging`. Chỉ sau khi merge PR đồng bộ ngược `main → staging` thì hai nhánh mới hoàn toàn khớp lịch sử (`main` trở thành tổ tiên của `staging`).
8. Ghi kết quả vào issue phát hành: thời điểm, `MERGE12`, kết quả bước 1–6. Không dán secret, không dán email người dùng thật.

### 7.6 Rollback

| Triệu chứng | Làm |
|---|---|
| Core lỗi nhưng dữ liệu nguyên (500, container khởi động lại do lỗi code) | A: lùi image Core |
| Migration lỗi, Core không lên | Đọc log (7.5 bước 2). Migration chỉ thêm và chạy lại được, thường sửa tiến rồi deploy lại; cần dịch vụ ngay thì A. Hiếm khi phải restore DB |
| Dữ liệu sai hoặc mất sau phát hành | B: restore DB (nặng; mất dữ liệu ghi sau thời điểm backup) |
| `membership_ngoai_TCKT` khác 0 hoặc lộ dữ liệu giữa đơn vị | Dừng thao tác, báo họp; A nếu cần chặn đường vào |

**A. Lùi image (nhanh, không đụng DB).** Dùng tag đã ghi ở 7.2 bước 5 (đọc lại từ file, không gõ tay):

```bash
T=/opt/ultimate-tckt/backups/keep-production-pre-release1-tags.txt
OLD_CORE_TAG="$(sed -n 's/^core=//p' "$T")"
OLD_CTD_TAG="$(sed -n 's/^ctd-api=//p' "$T")"
echo "lùi Core về: $OLD_CORE_TAG"
[ -n "$OLD_CORE_TAG" ] || echo "không đọc được tag -> dừng, lấy tag từ issue phát hành"
bash /opt/ultimate-tckt/production/infra/scripts/deploy.sh production core "$OLD_CORE_TAG"
```

Nếu `deploy.sh` dừng vì không `pull` được tag cũ (GHCR đã dọn, R16), dùng ảnh còn trong cache của VM (cùng phiên, giữ `OLD_CORE_TAG`):

```bash
ut_tags production
export CORE_IMAGE_TAG="$OLD_CORE_TAG"
ut_compose production up -d --no-deps core
ut_health http://127.0.0.1:3001/api/health && echo "Core đã lên"
```

- Bản Core cũ chạy được trên DB đã migrate: migration chỉ thêm bảng/cột (luật pilot, SPEC-PILOT-001 §9.3) và `unit_id` có mặc định TCKT.
  Lùi image không cần restore DB.
- Lùi `ctd-api` cần kiểm trước, vì image **trước #54** vừa thiếu công cụ vừa không an toàn: nó **không có** `app.seeds.set_password` (module chỉ vào `main` qua #57,
  nên chạy lệnh đó sau khi lùi sẽ báo `No module named`), và seed cũ đặt mật khẩu admin CTD về mật khẩu mặc định công khai **ở mỗi lần container khởi động**
  (restart, khởi động lại máy, `deploy.sh`), nên mật khẩu đặt tay cũng bị xoá ở lần khởi động kế tiếp. Kiểm image đích **trước** khi lùi (image phải còn trên VM):
  ```bash
  T=/opt/ultimate-tckt/backups/keep-production-pre-release1-tags.txt
  OLD_CTD_TAG="$(sed -n 's/^ctd-api=//p' "$T")"
  docker run --rm "ghcr.io/tduong-p/ultimate-tckt-ctd-api:$OLD_CTD_TAG" python -c "import importlib.util as u,sys;sys.exit(0 if u.find_spec('app.seeds.set_password') else 1)" \
    && echo "image có bản sửa #54, lùi được" || echo "image TRƯỚC #54: KHÔNG lùi, xem dưới"
  ```
  Tag trong file được ghi **sau** 7.2 bước 4c nên bình thường đã có bản sửa. Nếu kiểm ra "TRƯỚC #54", thứ tự xử lý: (1) sửa tiến, `deploy.sh production ctd-api <tag của lần
  deploy #57 hoặc mới hơn>`; (2) chưa có bản sửa tiến thì `ut_compose production stop ctd-api` (CTD tạm ngừng, Core không bị ảnh hưởng) thay vì chạy bản cũ; (3) chỉ khi
  Trưởng nhóm phê duyệt bằng văn bản mới chạy bản cũ, và ngay sau đó đặt mật khẩu bằng lệnh một dòng dưới đây (mật khẩu nhập tại dấu nhắc, không vào lịch sử shell),
  chấp nhận rằng nó chỉ có hiệu lực tới lần khởi động kế tiếp và phải kiểm lại sau **mỗi** lần container khởi động lại:
  ```bash
  docker exec -it ultimate-tckt-production-ctd-api-1 python -c 'import getpass,sys;from app.db import SessionLocal;from app.infra.password import hash_password;from app.models.identity import User;p=getpass.getpass("Mat khau moi: ");assert len(p)>=8;db=SessionLocal();u=db.query(User).filter_by(email=sys.argv[1]).one();u.password_hash=hash_password(p);db.commit();print("da dat")' "$CTD_ADMIN_EMAIL"
  ```
  Đợt này không có migration Alembic.
- `main` vẫn chứa bản lỗi: push kế tiếp lên `main` sẽ deploy lại nó. Trước khi lùi, nhờ người có quyền admin repo đặt biến
  `PROD_DEPLOY_ENABLED` = `false` (GitHub → Settings → Variables), sửa tiến bằng hotfix (`../playbooks/hotfix-production.md`), rồi bật lại
  ngay trước khi merge hotfix.

**B. Restore DB (hiếm — phương án khắc phục sự cố khẩn cấp cuối cùng, CẤM CHẠY NHƯ BƯỚC KIỂM THỬ THƯỜNG QUY).**
Lệnh restore có `DROP DATABASE` là hành động rủi ro cao nhất làm mất toàn bộ dữ liệu phát sinh sau mốc backup. Tuyệt đối **cấm chạy lệnh này như một bước kiểm thử** trong quy trình phát hành thông thường; chỉ áp dụng khi xảy ra sự cố hỏng hóc dữ liệu nghiêm trọng không thể khắc phục và đã được Trưởng nhóm/Chỉ đạo phát hành phê duyệt bằng văn bản. Dump sau không xoá các bảng do migration mới tạo, nên **không** restore đè lên DB đã migrate: tạo lại DB trống rồi nạp:

```bash
ut_tags production
B=/opt/ultimate-tckt/backups
OLD_CORE_TAG="$(sed -n 's/^core=//p' "$B/keep-production-pre-release1-tags.txt")"
echo "bản cũ: $OLD_CORE_TAG"
# 1. Dừng Core để không ghi thêm
ut_compose production stop core
# 2. Backup trạng thái HIỆN TẠI, kể cả khi đang lỗi
bash /opt/ultimate-tckt/production/infra/scripts/backup.sh production
# 3. Tạo lại DB trống (user ứng dụng giữ nguyên quyền)
ut_compose production exec -T core-db sh -c 'mysql -uroot -p"$MYSQL_ROOT_PASSWORD" -e "DROP DATABASE \`$MYSQL_DATABASE\`; CREATE DATABASE \`$MYSQL_DATABASE\`;"'
# 4. Nạp bản trước phát hành (không có bảng của migration mới)
gunzip -c "$B/keep-production-pre-release1-core.sql.gz" | ut_compose production exec -T core-db sh -c 'mysql -uroot -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE"'
# 5. Chạy lại Core bản cũ
bash /opt/ultimate-tckt/production/infra/scripts/deploy.sh production core "$OLD_CORE_TAG"
```

Sau đó so mốc 7.2 bước 7 (`users`, `teams`, `activities`, `tasks`, `documents`: không nhiều hơn mốc; ít hơn chỉ vì dữ liệu ghi sau backup), chạy
checklist 7.4 và ghi vào issue. Chưa có script cho trình tự này và chưa có rollback tự động khi health check lỗi (R17): làm tay, từng bước,
kiểm kết quả giữa các bước. CTD không cần restore (không có migration trong đợt này).

**C. Không làm:**

- `git reset --hard`, `git checkout` lùi thư mục môi trường trên VM. Mã nguồn ở đó chỉ để lấy script và compose; lùi dịch vụ bằng tag image.
- `git revert` merge commit của đợt này trên `main`. Lần `staging → main` sau, Git coi các thay đổi đó đã được merge và **không mang lại**
  chúng. Cần gỡ code khỏi `main` thì sửa tiến bằng hotfix; nếu đã lỡ revert, phải revert chính commit revert trước khi phát hành lại.
- `docker compose down -v`, xoá volume `core_mysql` hoặc `ctd_postgres` (mất toàn bộ dữ liệu).
- Restore đè khi chưa backup trạng thái hiện tại, hoặc restore khi chưa dừng Core.
- Tuyệt đối không chạy lệnh `DROP DATABASE` trong B khi chưa có sự cố thực tế và phê duyệt bằng văn bản.

## Lịch sử phiên bản

| Version | Ngày | Thay đổi | Người |
|---|---|---|---|
| 1.0 | 2026-09-24 | Bản đầu (viết lại từ tài liệu cũ khi gộp monorepo) | DYC |
| 1.1 | 2026-09-24 | Staging: thay đổi đi qua PR vì ruleset bắt buộc check | DYC |
| 1.2 | 2026-09-24 | Bỏ concurrency group (flock trên VM), thêm công tắc `PROD_DEPLOY_ENABLED` | DYC |
| 2.0 | 2026-09-27 | Đồng bộ `main` = `staging`: nội dung theo bản `main` (chưa có code đa đơn vị GĐ1-A). Bản 1.4 trên `staging` mô tả GĐ1-A, lưu ở nhánh `archive/gd1a-staging` — NTMT làm lại ở PR sau | DYC |
| 3.0 | 2026-09-30 | Thêm mục 7: Runbook deploy GĐ1-A (backup DB, verify migration, test đăng nhập, rollback plan) | DYC |
| 3.1 | 2026-10-02 | Thêm Noti vào pipeline: `test-noti`/`build-noti`/`deploy-noti` (chỉ staging), `deploy.sh … noti` | DYC |
| 4.0 | 2026-10-03 | Viết lại mục 7 thành runbook phát hành đợt 1 (cổng G1–G6, backup/restore đúng đường dẫn và vào DB sạch, cổng/tên miền đúng, smoke, rollback không dùng `git reset`); mục 1–2: job `infra` không chờ test; mục 6: log Core nằm trong container | DYC |
| 4.1 | 2026-10-03 | Thêm O1/O2: nghiệm thu vận hành #55 (xoay secret, hash lộ) và #54 (set_password, kiểm sau restart); G1 dùng CI + test hồi quy; tag sau phát hành theo từng dịch vụ; rollback `ctd-api` kiểm image trước #54 | DYC |
| 4.2 | 2026-10-05 | `deploy-noti` chạy cho production khi `PROD_NOTI_ENABLED`; cổng Noti production 8101 (SPEC-MAIL-001) | DYC |
| 4.3 | 2026-10-07 | Tên miền staging trong lệnh smoke đổi sang `dyclub.tech` | DYC |
| 4.4 | 2026-10-09 | Thêm job `test-web` (filter `web` riêng); `web/**` không còn kích hoạt `test-core`/build Core | DYC |

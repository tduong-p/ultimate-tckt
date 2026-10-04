---
doc_id: PLAN-MAIL-001
title: Plan — bật email thật trên production (Core → Noti)
version: 1.2
status: active
audience: [dev, ai]
owner: DYC
updated: 2026-10-05
related_code: [infra/compose/docker-compose.production.yml, tools/tests/compose.test.js]
---

# Bật email thật trên production — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Core gửi email thật qua Noti tới người dùng production, đúng người, không trùng, không mất, tắt được trong vài phút, triển khai theo ba pha (A quan sát, B nhóm nhỏ, C toàn bộ).

**Architecture:** Thêm `noti-api` + `noti-worker` vào compose production giống staging (cùng image, database `noti` riêng trên `ctd-db` production, chỉ mở `127.0.0.1:8101`). Core nối bằng `NOTI_URL` cố định và `NOTI_API_KEY` lấy từ `CORE_NOTI_API_KEY` (trống = không gửi). Công tắc deploy Noti ở CI là biến repo `PROD_NOTI_ENABLED`. Allowlist người nhận bắt buộc khác rỗng ở cấp compose.

**Tech Stack:** Docker Compose, bash (`infra/scripts`), GitHub Actions (`deploy.yml`), Node test runner (`tools/tests`), Postgres 16, service Noti (FastAPI).

**Spec:** `docs/specs/2026-10-04-mail-production-design.md` (SPEC-MAIL-001). Quyết định liên quan: issue #49 (quyết định bằng văn bản 2026-10-03).

## Global Constraints

- **Việc liên module.** Quyết định ghi trong #63 ngày 2026-10-05: không cần họp team, production dùng SMTP M365 (Graph để sau, #68). Task 3–6 làm được.
- **Production luôn có `NOTI_RECIPIENT_ALLOWLIST` khác rỗng** (SPEC-MAIL-001 D8). Allowlist rỗng nghĩa là gửi cho mọi người.
- **Không secret trong repo, log, mô tả PR, comment issue.** Secret chỉ ở `/opt/ultimate-tckt/production/infra/.env` trên VM. Người vận hành tự nhập; agent không nhập mật khẩu hay key.
- **Cổng host của Noti production là `127.0.0.1:8101`** (staging dùng 8100; cả hai chạy trên cùng một VM).
- **Thứ tự bắt buộc:** làm tay trên VM (Task 3) **trước** khi merge compose (Task 4), vì compose dùng `${NOTI_DB_USER:?}`; thiếu biến thì mọi lệnh compose production lỗi.
- **Không deploy khi cổng M1–M3 còn đỏ** (M3 = tài khoản SMTP dịch vụ riêng, xem SPEC-MAIL-001) ở pha có gửi thật. Pha A (`console`) vẫn cần M4–M6.
- PR vào `staging` rồi `staging → main` bằng merge commit; không push thẳng `main`. Mỗi PR: cập nhật tài liệu liên quan, tăng `version`, `updated`, thêm dòng lịch sử, chạy `npm run docs:index`.
- Trước khi push: `cd core && npm test`, `npm run test:tools && npm run docs:check -- --base origin/staging`.

## Review Focus

1. **Allowlist rỗng trên production** → compose phải từ chối khởi động (`${NOTI_RECIPIENT_ALLOWLIST:?}`), không im lặng gửi cho mọi người. Test ở Task 4.
2. **Chạy lại `apply-infra.sh` khi Noti chưa từng deploy** → không được kéo image `unset`; hành vi hiện tại (chỉ bật Noti khi có tag đang chạy) phải còn nguyên. Kiểm ở Task 5.
3. **Staging và production cùng VM, cùng cổng** → xung đột cổng 8100 làm Noti production không lên. Test cổng ở Task 4.
4. **`CORE_NOTI_API_KEY` trống** → Core vẫn chạy, không gửi, không lỗi (công tắc tắt khẩn cấp). Kiểm ở Task 6 và 8.
5. **Thư tới địa chỉ ngoài allowlist** → phải bị chuyển về `NOTI_REDIRECT_TO` hoặc bị loại, **không** được gửi tới địa chỉ đó. Kiểm ở Task 7 (pha B).

## File Structure

- Modify `infra/compose/docker-compose.production.yml` — thêm `noti-api`, `noti-worker`; `NOTI_URL`/`NOTI_API_KEY` cho `core`.
- Modify `infra/scripts/lib.sh` — thêm `production:noti) echo 8101`.
- Modify `.github/workflows/deploy.yml` — `deploy-noti` chạy cho production khi `vars.PROD_NOTI_ENABLED == 'true'`.
- Modify `tools/tests/compose.test.js`, `tools/tests/infra-deploy.test.js`, `tools/tests/workflows.test.js` — đổi các test "production chưa có Noti" thành test cho hành vi mới (đỏ trước, xanh sau).
- Modify docs: `docs/ops/moi-truong.md`, `docs/ops/deploy-va-nhanh.md`, `docs/dev/noti.md`, `docs/dev/email-cron.md`, `docs/ai/bay-da-gap.md` (nếu gặp bẫy), `docs/specs/2026-10-03-phat-hanh-dot-1-design.md` (câu "production chưa có Noti").

---

### Task 0: ~~Xin IT cấp quyền Graph~~ — bỏ khỏi đợt này

Quyết định 2026-10-05: production dùng SMTP như staging. Việc xin quyền Graph và chuyển driver chuyển sang issue #68. M3 giờ là: tài khoản SMTP dịch vụ riêng, có người chịu trách nhiệm mật khẩu, xác nhận trong #63.

### Task 1: Kiểm kê #49 và tách thành việc nhỏ (M1, M2)

> **Trạng thái 2026-10-05: xong.** Cả hai phần của #49 (Core mục 1–9, bên trong Noti) đã sửa trong PR #66 (đã vào `staging` và `main` qua PR #67), #49 đã đóng. M1 và M2 đạt; bảng test bên dưới được thay bằng test trong PR đó. Hạng mục để sau: outbox bền phía Core, lọc admin theo đơn vị.

**Files:** không có file code. Kết quả là danh sách trong issue #49 và các sub-issue.

- [ ] **Step 1: Lấy danh sách mục.** Chạy `gh issue view 49 --json body -q .body` và lập bảng: mỗi mục 1–9 phần "Core → Noti" và mỗi mục phần "Bên trong Noti".
- [ ] **Step 2: Với từng mục, kiểm chứng hiện trạng trên `main`** bằng cách đọc code ở file được nêu trong issue (ví dụ `core/src/services/deadline-notifications.js`, `core/src/noti-sender.js`, `services/noti-api/noti/drivers/smtp.py`) và chạy test liên quan. Đánh dấu một trong ba trạng thái: **đã sửa** (kèm PR), **chưa sửa**, **không còn đúng**. Không suy ra từ tiêu đề issue; phải đọc code.
- [ ] **Step 3: Tạo một sub-issue cho mỗi mục "chưa sửa"** (nhãn `cross-module` nếu đổi hợp đồng dùng chung: `sourceKey`, dữ liệu template, thêm trạng thái Noti). Mỗi sub-issue ghi sẵn **test sẽ phải đỏ rồi xanh**:

| Mục #49 | Test phải có (đỏ trước khi sửa) |
|---|---|
| 1 Nhắc hạn sai giờ/trùng | Giả lập giờ `2026-10-05T17:30:00Z` (00:30 giờ VN) và `2026-10-05T19:30:00Z` (02:30 giờ VN) cho một task có hạn 2026-10-06: không có thư "24 giờ" lúc 00:30; chỉ **một** thư cho mỗi cửa sổ; `sourceKey` giống nhau giữa hai lần chạy cùng cửa sổ. |
| 2 Task `review` vẫn bị nhắc | Task `status='review'` không sinh nhắc hạn hay quá hạn. |
| 3 Tự nhận thư của chính mình | Người thao tác (`actorId`) không nằm trong người nhận cho `activity.proposed`, `activity.decided`, `task.assigned`, `task.review_requested`, `task.reviewed`. |
| 4 `task.unacknowledged` | Member/lead `is_active=0` không nhận; người giao việc không tự nhắc chính mình. |
| 5 `task.review_requested` thiếu người | Admin, vice_admin, event_lead cũng nhận; tổ chưa có lead thì admin nhận. |
| 6 Email không hợp lệ | Email `@x.test` bị loại ở Core, ghi cảnh báo; không gửi request bị Noti từ chối 400. |
| 7 Noti 5xx/timeout | Retry có giới hạn với 5xx/lỗi mạng; không retry 4xx; `sourceKey` ổn định nên gửi lại không tạo thư trùng. |
| 8 Ba lỗi nhỏ | `sourceKey` có mốc thời gian; không gắn link tới hoạt động đã xoá; `feedback` bị cắt ≤ giới hạn 64 KB của Noti. |
| 9 Dữ liệu template | `activity.proposed` gửi đủ type/deadline/priority; nhãn "24 giờ"/"4 giờ"; người nhận khi tạo và nộp lại đúng. |
| Noti: SMTP TLS | Test `starttls` truyền `ssl.create_default_context()`. |
| Noti: phân loại lỗi | MSAL tạm thời, Graph 401, SMTP 535 được coi là lỗi tạm thời/cấu hình, không `failed` ngay. |
| Noti: timeout + khoá | MSAL có timeout; lô gửi không vượt `LOCK_SECONDS` gây gửi trùng. |
| Noti: allowlist | Thư bị allowlist loại **không** có `status=sent`; `reply_to` cũng qua allowlist. |

- [ ] **Step 3b: Ghi lại** bảng trạng thái vào comment cuối của #49 (không đóng #49 cho tới khi M1 và M2 đủ).
- [ ] **Step 4: Cổng M1/M2 chỉ xanh khi** mọi dòng ở bảng trên là "đã sửa" và CI của `main` xanh. Cập nhật `docs/dev/email-cron.md` và `docs/dev/noti.md` theo từng PR sửa.

### Task 2: ~~Quyết định họp team~~ — đã chốt, không họp

Quyết định ghi ở #63 (2026-10-05): không cần họp team; production dùng SMTP; Graph làm sau (#68).

### Task 3: Chuẩn bị tay trên VM production (trước khi merge compose)

**Files:** `/opt/ultimate-tckt/production/infra/.env` trên VM (không phải repo). Người vận hành làm, agent chỉ kiểm.

**Consumes:** quyết định Task 2.
**Produces:** database `noti` + role `noti` trên `ctd-db` production; biến `NOTI_DB_*`, `NOTI_RECIPIENT_ALLOWLIST`, `NOTI_MAIL_DRIVER=console` trong `.env`.

- [ ] **Step 1: Backup trước khi đụng database.**

```bash
ssh ubuntu@168.107.68.32 'cd /opt/ultimate-tckt/production && bash infra/scripts/backup.sh production'
```
Expected: dòng `Backups written: …production-<ngày>-{core,ctd}.sql.gz`.

- [ ] **Step 2: Tạo role và database `noti`.** Người vận hành gõ mật khẩu (không đi qua chat, repo, hay log):

```bash
ssh -t ubuntu@168.107.68.32 'docker exec -it ultimate-tckt-production-ctd-db-1 sh -c "psql -U \"\$POSTGRES_USER\" -d \"\$POSTGRES_DB\""'
```
Trong `psql`:
```sql
CREATE ROLE noti LOGIN;
\password noti
CREATE DATABASE noti OWNER noti;
\q
```
- [ ] **Step 3: Thêm biến vào `.env` production** (chỉnh tay bằng `sudoedit`/`nano`, không dùng lệnh in giá trị ra màn hình):
  `NOTI_DB_NAME=noti`, `NOTI_DB_USER=noti`, `NOTI_DB_PASSWORD=<mật khẩu vừa đặt>`, `NOTI_MAIL_DRIVER=console`, `NOTI_RECIPIENT_ALLOWLIST=<một địa chỉ của người vận hành>`, `NOTI_REDIRECT_TO=<hộp thư của người phụ trách>`. Giữ `CORE_NOTI_API_KEY` **trống** cho tới Task 6.
- [ ] **Step 4: Kiểm tra chỉ tên biến, không in giá trị:**

```bash
ssh ubuntu@168.107.68.32 'grep -oE "^NOTI_[A-Z_]+=|^CORE_NOTI_API_KEY=" /opt/ultimate-tckt/production/infra/.env | sort'
```
Expected: có `NOTI_DB_NAME=`, `NOTI_DB_USER=`, `NOTI_DB_PASSWORD=`, `NOTI_MAIL_DRIVER=`, `NOTI_RECIPIENT_ALLOWLIST=`, `NOTI_REDIRECT_TO=`.

- [ ] **Step 5: Xác nhận Core và CTD production vẫn bình thường** (`curl -fsS https://tckt-hub.duckdns.org/api/health`, `https://ctd-hoso.duckdns.org/api/health`).

### Task 4: Thay đổi hạ tầng trong repo (TDD)

**Files:**
- Modify: `tools/tests/compose.test.js` (xoá test `production compose has no noti yet`, thêm test mới)
- Modify: `tools/tests/infra-deploy.test.js` (đổi test `deploy.sh production noti is refused…`)
- Modify: `tools/tests/workflows.test.js` (đổi test `deploy.yml: noti … deploy only to staging for now`)
- Modify: `infra/compose/docker-compose.production.yml`, `infra/scripts/lib.sh`, `.github/workflows/deploy.yml`

**Interfaces:**
- Produces: service compose `noti-api`, `noti-worker` ở production; `deploy.sh production noti <tag>` chạy được và kiểm `http://127.0.0.1:8101/v1/health`; biến repo `PROD_NOTI_ENABLED`.

- [ ] **Step 1: Viết test đỏ — compose** (thay test `production compose has no noti yet (staging first)` trong `tools/tests/compose.test.js`):

```js
test('production compose runs noti-api + noti-worker from one image, api on 127.0.0.1:8101', () => {
  const y = read('infra/compose/docker-compose.production.yml');
  assert.match(y, /^  noti-api:/m);
  assert.match(y, /^  noti-worker:/m);
  assert.equal((y.match(/ghcr\.io\/tduong-p\/ultimate-tckt-noti:\$\{NOTI_IMAGE_TAG:\?\}/g) || []).length, 2);
  assert.ok(y.includes('"127.0.0.1:8101:8000"'));
  assert.ok(!y.includes('8100'), 'cổng 8100 là của staging trên cùng VM');
  assert.match(y, /command: \["python", "-m", "noti\.worker"\]/);
  assert.match(y, /NOTI_DATABASE_URL: postgresql\+psycopg:\/\/\$\{NOTI_DB_USER:\?\}:\$\{NOTI_DB_PASSWORD:\?\}@ctd-db:5432\/\$\{NOTI_DB_NAME:\?\}/);
  assert.match(y, /NOTI_APP_BASE_URL: https:\/\/tckt-hub\.duckdns\.org/);
});

test('production noti refuses to start without a recipient allowlist (empty = mail to everyone)', () => {
  const y = read('infra/compose/docker-compose.production.yml');
  assert.match(y, /NOTI_RECIPIENT_ALLOWLIST: \$\{NOTI_RECIPIENT_ALLOWLIST:\?\}/);
});

test('production core reaches noti over the compose network; a missing key only disables sending', () => {
  const core = read('infra/compose/docker-compose.production.yml').split(/^  ctd-db:/m)[0];
  assert.match(core, /NOTI_URL: http:\/\/noti-api:8000/);
  assert.match(core, /NOTI_API_KEY: \$\{CORE_NOTI_API_KEY:-\}/);
});
```

- [ ] **Step 2: Viết test đỏ — deploy.sh** (thay test `deploy.sh production noti is refused…` trong `tools/tests/infra-deploy.test.js`):

```js
test('deploy.sh production noti pulls+ups both noti services and checks /v1/health on 8101', () => {
  const sb = makeSandbox();
  const r = sb.run('deploy.sh', ['production', 'noti', 'abc123def456']);
  assert.equal(r.status, 0, r.stderr);
  const c = sb.calls();
  assert.ok(c.some((l) => l.includes(' pull noti-api noti-worker')), c.join('\n'));
  assert.ok(c.some((l) => l.includes(' up -d --no-deps noti-api noti-worker')), c.join('\n'));
  assert.ok(c.some((l) => l.startsWith('curl ') && l.includes('127.0.0.1:8101/v1/health')));
});
```

- [ ] **Step 3: Viết test đỏ — workflow** (sửa test `deploy.yml: noti has test … deploy only to staging for now` trong `tools/tests/workflows.test.js`): đổi tên thành `…deploy to production only behind PROD_NOTI_ENABLED` và thay assert điều kiện `job`:

```js
  assert.ok(job.includes("vars.DEPLOY_ENABLED == 'true' &&"), job);
  assert.ok(job.includes("(needs.changes.outputs.env == 'staging' || vars.PROD_NOTI_ENABLED == 'true')"), job);
```

- [ ] **Step 4: Chạy test, xác nhận đỏ đúng lý do**

Run: `npm run test:tools`
Expected: FAIL ở ba test vừa viết (compose không có noti ở production; `deploy.sh production noti` bị từ chối; điều kiện workflow cũ). Các test khác xanh.

- [ ] **Step 5: Sửa `infra/scripts/lib.sh`** — thêm cổng production cho noti trong `ut_app_port`:

```bash
    production:core) echo 3001 ;; production:ctd-api) echo 8001 ;; production:noti) echo 8101 ;;
```

- [ ] **Step 6: Sửa `infra/compose/docker-compose.production.yml`.** Trong service `core`, thêm hai biến sau `EMAIL_NOTIFICATIONS_ENABLED` (giống staging):

```yaml
      NOTI_URL: http://noti-api:8000
      NOTI_API_KEY: ${CORE_NOTI_API_KEY:-}
```
Thêm hai service ngay trước khối `volumes:` cuối file (cùng mẫu staging; khác ở URL, cổng và allowlist bắt buộc):

```yaml
  # Noti (SPEC-NOTI-001, SPEC-MAIL-001): một image, hai service. Database `noti` riêng trên ctd-db production
  # (tạo tay một lần, xem docs/ops/moi-truong.md). Cổng 8101 vì staging dùng 8100 trên cùng VM.
  noti-api:
    image: ghcr.io/tduong-p/ultimate-tckt-noti:${NOTI_IMAGE_TAG:?}
    restart: unless-stopped
    depends_on:
      - ctd-db
    environment: &noti-env
      NOTI_DATABASE_URL: postgresql+psycopg://${NOTI_DB_USER:?}:${NOTI_DB_PASSWORD:?}@ctd-db:5432/${NOTI_DB_NAME:?}
      NOTI_APP_BASE_URL: https://tckt-hub.duckdns.org
      NOTI_MAIL_DRIVER: ${NOTI_MAIL_DRIVER:-console}
      NOTI_MAIL_FROM: ${NOTI_MAIL_FROM:-noti@example.invalid}
      NOTI_RECIPIENT_ALLOWLIST: ${NOTI_RECIPIENT_ALLOWLIST:?}
      NOTI_REDIRECT_TO: ${NOTI_REDIRECT_TO:-}
      NOTI_SMTP_HOST: ${NOTI_SMTP_HOST:-}
      NOTI_SMTP_PORT: ${NOTI_SMTP_PORT:-587}
      NOTI_SMTP_USER: ${NOTI_SMTP_USER:-}
      NOTI_SMTP_PASSWORD: ${NOTI_SMTP_PASSWORD:-}
      NOTI_GRAPH_TENANT: ${NOTI_GRAPH_TENANT:-}
      NOTI_GRAPH_CLIENT_ID: ${NOTI_GRAPH_CLIENT_ID:-}
      NOTI_GRAPH_CLIENT_SECRET: ${NOTI_GRAPH_CLIENT_SECRET:-}
    ports:
      - "127.0.0.1:8101:8000"

  noti-worker:
    image: ghcr.io/tduong-p/ultimate-tckt-noti:${NOTI_IMAGE_TAG:?}
    restart: unless-stopped
    depends_on:
      - noti-api
    command: ["python", "-m", "noti.worker"]
    environment: *noti-env
```

- [ ] **Step 7: Sửa `.github/workflows/deploy.yml`** — thay điều kiện job `deploy-noti` và comment phía trên nó:

```yaml
  # Noti chạy ở staging luôn; production chỉ khi biến repo PROD_NOTI_ENABLED = 'true' (SPEC-MAIL-001 D3).
  deploy-noti:
    needs: [changes, build-noti]
    if: >-
      github.event_name == 'push' &&
      vars.DEPLOY_ENABLED == 'true' &&
      (needs.changes.outputs.env == 'staging' || vars.PROD_NOTI_ENABLED == 'true')
```

- [ ] **Step 8: Chạy test, xác nhận xanh**

Run: `npm run test:tools`
Expected: PASS toàn bộ.

- [ ] **Step 9: Kiểm compose hợp lệ** (không cần VM):

```bash
cd infra/compose
CORE_IMAGE_TAG=t CTD_API_IMAGE_TAG=t NOTI_IMAGE_TAG=t CORE_MYSQL_ROOT_PASSWORD=x CORE_DB_NAME=x CORE_DB_USER=x CORE_DB_PASSWORD=x \
CORE_SESSION_SECRET=x CORE_SETTINGS_ENCRYPTION_KEY=x CTD_DB_NAME=x CTD_DB_USER=x CTD_DB_PASSWORD=x CTD_JWT_SECRET=x \
NOTI_DB_NAME=x NOTI_DB_USER=x NOTI_DB_PASSWORD=x NOTI_RECIPIENT_ALLOWLIST=dev@example.com \
docker compose -f docker-compose.production.yml config -q && echo OK
```
Expected: `OK`. Bỏ `NOTI_RECIPIENT_ALLOWLIST=…` rồi chạy lại: phải lỗi `required variable NOTI_RECIPIENT_ALLOWLIST is missing a value`. (Giá trị `x` chỉ để nội suy, không phải secret thật.)

- [ ] **Step 10: Cập nhật tài liệu** (`docs/ops/moi-truong.md` mục 4a thêm phần production + cổng 8101; `docs/ops/deploy-va-nhanh.md` bỏ câu "chỉ staging", thêm biến `PROD_NOTI_ENABLED`; `docs/dev/noti.md`; `SPEC-REL-001` câu "production chưa có Noti" thêm ghi chú theo SPEC-MAIL-001). Tăng version, `updated`, thêm dòng lịch sử, rồi:

```bash
npm run docs:index && npm run docs:check -- --base origin/staging
```
Expected: `docs ok`.

- [ ] **Step 11: Commit và mở PR vào `staging`.** **Chưa merge** cho tới khi Task 3 xong.

```bash
git add infra/compose/docker-compose.production.yml infra/scripts/lib.sh .github/workflows/deploy.yml tools/tests docs
git commit -m "feat(infra): run Noti on production behind PROD_NOTI_ENABLED, allowlist required"
```

### Task 5: Merge và deploy Noti lên production (pha A — console)

**Consumes:** Task 3 (VM đã có `NOTI_DB_*`, allowlist, driver `console`), Task 4 (PR đã duyệt).

- [ ] **Step 1: Xác nhận Task 3 xong** bằng lệnh ở Task 3 Step 4.
- [ ] **Step 2: Merge** PR Task 4 vào `staging`, kiểm staging vẫn chạy (health 200 Core, Noti). Rồi PR `staging → main` bằng **merge commit**. Job `infra` chạy `apply-infra.sh`: vì production chưa có tag Noti đang chạy, Noti **chưa** được bật (hành vi hiện tại), Core nhận `NOTI_URL` nhưng key trống nên chưa gửi gì.
- [ ] **Step 3: Đặt biến repo** (người có quyền): GitHub → Settings → Variables → `PROD_NOTI_ENABLED = true`.
- [ ] **Step 4: Lần deploy Noti đầu tiên** cần một tag image có sẵn. Dùng đúng tag đang chạy ở staging:

```bash
ssh ubuntu@168.107.68.32 'cd /opt/ultimate-tckt/staging && . infra/scripts/lib.sh && ut_current_tag staging noti-api'
ssh ubuntu@168.107.68.32 'bash /opt/ultimate-tckt/production/infra/scripts/deploy.sh production noti <tag-vừa-lấy>'
```
Expected: script kết thúc với health `http://127.0.0.1:8101/v1/health` 200.
- [ ] **Step 5: Xác nhận** `docker ps` có `ultimate-tckt-production-noti-api-1` và `…-noti-worker-1` cùng tag; `curl -fsS http://127.0.0.1:8101/v1/health` (trên VM) trả 200; Core health vẫn 200. Core **vẫn chưa** nối (key trống).
- [ ] **Step 6: Chạy lại `apply-infra.sh production`** (workflow `infra` hoặc tay) để chắc Noti nằm trong `APPS` và Core không bị tạo lại với tag sai. Kiểm tag Core/CTD không đổi.

### Task 6: Nối Core vào Noti ở pha A (quan sát)

- [ ] **Step 1: Tạo client key trên production.** Key chỉ hiện một lần; người vận hành ghi vào kho mật khẩu của nhóm, không dán vào chat/issue:

```bash
ssh -t ubuntu@168.107.68.32 'docker exec -it ultimate-tckt-production-noti-api-1 python -m noti.cli create-client core'
```
- [ ] **Step 2: Điền `CORE_NOTI_API_KEY=<key>` vào `.env` production** (sửa tay). Chạy:

```bash
ssh ubuntu@168.107.68.32 'bash /opt/ultimate-tckt/production/infra/scripts/apply-infra.sh production'
```
- [ ] **Step 3: Kiểm Core đã nối.** Thao tác một việc có thông báo (giao việc trên tài khoản người vận hành), rồi:

```bash
ssh ubuntu@168.107.68.32 'docker logs --since 5m ultimate-tckt-production-noti-worker-1 2>&1 | tail -n 20'
```
Expected: có dòng thể hiện email ở driver `console` cho đúng người nhận; không có lỗi.
- [ ] **Step 4: Diễn tập rollback (M6).** Xoá giá trị `CORE_NOTI_API_KEY`, chạy lại `apply-infra.sh production`, xác nhận Core health 200 và thao tác tiếp theo **không** sinh thư mới trong log Noti; rồi điền lại key và chạy lại. Ghi thời điểm và kết quả vào issue.

### Task 7: Pha A → B → C

**Pha A (quan sát, ≥ 3 ngày làm việc), mỗi ngày:**
- [ ] Chạy kiểm hàng đợi (không in địa chỉ email):

```bash
ssh ubuntu@168.107.68.32 'docker exec -i ultimate-tckt-production-ctd-db-1 sh -c "psql -U \"\$POSTGRES_USER\" -d noti -At" <<SQL
select status, count(*) from notification_recipients group by status order by 1;
select coalesce(round(extract(epoch from (now()-min(created_at)))/60),0) as oldest_pending_minutes
  from notifications n join notification_recipients r on r.notification_id=n.id where r.status=\$\$pending\$\$;
SQL'
```
Expected: `failed` = 0; `oldest_pending_minutes` < 15.
- [ ] Đọc log `noti-worker`, đối chiếu người nhận với sự kiện; ghi vào issue: không thư sai người, không trùng, không thư lúc 00:00–07:00 giờ VN với nhắc hạn.

**Pha B (nhóm nhỏ, ≥ 5 ngày làm việc), chỉ khi M1–M3 xanh và pha A đạt:**
- [ ] Đặt `.env`: `NOTI_MAIL_DRIVER=smtp`, `NOTI_SMTP_*` (người vận hành tự nhập mật khẩu), `NOTI_MAIL_FROM=<địa chỉ chính thức>`, `NOTI_RECIPIENT_ALLOWLIST=<3–5 địa chỉ cụ thể>`, `NOTI_REDIRECT_TO=<hộp thư người phụ trách>`. Chạy `deploy.sh production noti <tag đang chạy>`.
- [ ] **Kiểm Review Focus 5:** làm một sự kiện có người nhận **ngoài** allowlist; thư phải về `NOTI_REDIRECT_TO` hoặc bị loại, và **không** đến địa chỉ ngoài danh sách. Hỏi người nhận trong nhóm xác nhận đã nhận đúng thư, đúng giờ.
- [ ] Hằng ngày chạy truy vấn hàng đợi ở trên.

**Pha C (toàn bộ):**
- [ ] Chỉ mở khi pha B đạt và Trưởng nhóm duyệt bằng văn bản trong issue. Thông báo trước cho người dùng địa chỉ gửi chính thức (chống thư giả mạo).
- [ ] Đặt `NOTI_RECIPIENT_ALLOWLIST=hust.edu.vn`, chạy `deploy.sh production noti <tag đang chạy>`, rồi theo dõi 24 giờ bằng truy vấn hàng đợi. Ghi kết quả vào issue.

### Task 8: Quan sát, cảnh báo, backup (M5)

- [ ] **Step 1: Cảnh báo tối thiểu.** Thêm vào runbook (`docs/ops/deploy-va-nhanh.md`) lệnh truy vấn hàng đợi của Task 7 như mục kiểm tay hằng ngày, kèm ngưỡng (`pending` > 15 phút hoặc `failed` tăng). Nếu nhóm có kênh nhận cảnh báo, chuyển lệnh này thành cron gọi kênh đó; nếu chưa, ghi rõ là kiểm tay.
- [ ] **Step 2: Backup.** Xác nhận database `noti` nằm trong lịch sao lưu Postgres: kiểm `backup.sh` có dump cả database `noti`. Hiện `backup.sh` chỉ dump `$POSTGRES_DB`; nếu `noti` chưa được dump thì thêm vào `infra/scripts/backup.sh` (kèm test trong `tools/tests/infra-ops.test.js`) trong một PR riêng, rồi chạy `backup.sh production` và xác nhận có file `…-noti.sql.gz`.
- [ ] **Step 3: Công tắc tắt khẩn cấp** được ghi trong runbook (SPEC-MAIL-001 §7): xoá `CORE_NOTI_API_KEY` → `apply-infra.sh production`.

### Task 9: Đóng việc

- [ ] **Step 1:** Cập nhật issue liên module với bằng chứng M1–M6 và kết quả ba pha (không có secret, không có địa chỉ email thật).
- [ ] **Step 2:** Thêm bẫy mới gặp vào `docs/ai/bay-da-gap.md` (ví dụ xung đột cổng staging/production cùng VM, nếu gặp).
- [ ] **Step 3:** Chạy `npm run docs:index && npm run docs:check -- --base origin/staging`, rồi đóng issue khi pha C đạt tiêu chí SPEC-MAIL-001 §8.

## Self-Review

- **Phủ spec:** D1–D8 → Task 4–6 (compose, lib.sh, workflow, allowlist bắt buộc, key); M1/M2 → Task 1; M3 → Task 0; M4 → Task 3–5; M5 → Task 8; M6 → Task 6 Step 4; ba pha → Task 7; rollback → Task 6, 8.
- **Placeholder:** các chỗ `<…>` là giá trị do người vận hành cung cấp (tag, địa chỉ, key); không có mục nào để trống phần việc. Phần sửa #49 không thiết kế lại ở đây: nguồn thiết kế là mục "Phương án đề xuất" của #49 và bảng test ở Task 1.
- **Nhất quán:** cổng `8101` dùng thống nhất ở compose, `lib.sh`, test, runbook; biến `PROD_NOTI_ENABLED`, `CORE_NOTI_API_KEY`, `NOTI_RECIPIENT_ALLOWLIST` giữ nguyên tên.

## Lịch sử phiên bản

| Version | Ngày | Thay đổi | Người |
|---|---|---|---|
| 1.0 | 2026-10-04 | Bản đầu | DYC |
| 1.1 | 2026-10-05 | Task 1 (M1, M2) xong nhờ PR #66; ghi trạng thái | Claude |
| 1.2 | 2026-10-05 | Bỏ Task 0 và Task 2; production dùng SMTP; Graph chuyển sang #68 | Claude |

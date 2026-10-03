---
doc_id: PLAN-REL-002
title: Plan — sửa hạ tầng và CI sau rà soát phát hành đợt 1
version: 1.1
status: active
audience: [dev, ops, ai]
owner: DYC
updated: 2026-10-03
related_code: []
---

# Sửa hạ tầng và CI sau rà soát phát hành đợt 1 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sửa tám lỗi hạ tầng và CI mà rà soát `origin/staging` ngày 2026-10-03 tìm thấy (R13–R20 của SPEC-REL-001 §4.2):
nginx chặn upload, job `infra` không cần test, script tạo user lộ mật khẩu và thiếu membership, `ghcr-cleanup` có thể xoá
tag production, `deploy.sh` không tự quay về bản cũ, compose thiếu `AZURE_*`, biến env thừa, và đăng nhập không giới hạn tần suất.

**Architecture:** Mỗi lỗi một Task, một PR nhỏ vào `staging`. Mọi thay đổi script, compose, nginx, workflow đều có test trong
`tools/tests/` chạy bằng `npm run test:tools` (node:test, sandbox bash giả `git/docker/curl/sudo/nginx`, chạy được trên Mac
không cần Docker). Phần nào cần VM thật (`nginx -t`, reload, retag image, thử rollback) tách thành bước riêng, **người vận hành
chạy sau khi merge**.

**Tech Stack:** Bash (script VM), nginx, Docker Compose, GitHub Actions YAML + `actions/github-script`, Node 22 (`node:test`),
Markdown tài liệu có frontmatter.

**Spec:** `docs/specs/2026-10-03-phat-hanh-dot-1-design.md`

## Global Constraints

- **Hạ tầng và CI luôn là hợp đồng dùng chung** (`docs/dev/ranh-gioi-module.md`). Các quyết định bằng văn bản chính thức đã được
  ghi trực tiếp vào mục "Quyết định" của issue #50 ngày 2026-10-03 cho các mục 1, 2, 4, 6, 8, 9, 14 và c32.
- Chỉ sửa đúng các file liệt kê trong từng Task. Không đụng `core/src`, `services/**`, `web/**`.
- **Giữ biến `SETTINGS_ENCRYPTION_KEY`**: Tiếp tục giữ biến `SETTINGS_ENCRYPTION_KEY` (và `CORE_SETTINGS_ENCRYPTION_KEY`)
  trong compose và `.env.example` cho đến khi kiểm tra toàn diện mã nguồn, cấu hình đã lưu và bất biến #3. Tuyệt đối không
  tự ý gỡ bỏ bất biến #3 trong Task 7 khi chưa có quyết định kiến trúc (ADR) và tài liệu trong cùng PR.
- **Thiết kế lại Task 4 (GHCR Retention)**: Không dựa riêng vào quy tắc "40 mới nhất + 5 production". Cơ chế dọn GHCR phải
  bảo vệ bằng định danh cụ thể image/tag đang chạy thực tế trên VM cùng ít nhất một bản rollback của cả staging và production.
  Nếu không lấy được trạng thái deploy (hoặc danh sách pinnedTags rỗng/lỗi), quy trình dọn dẹp phải **dừng ngay và xóa 0 version**
  (fail-safe). Hỗ trợ chế độ dry-run và kiểm thử trường hợp nhiều build thành công liên tiếp nhưng deploy thất bại.
- Mọi thay đổi script/compose/nginx/workflow phải kèm test trong `tools/tests/` chạy được trên Mac bằng
  `npm run test:tools`. Không có `nginx`, `docker`, `shellcheck`, `actionlint` cục bộ: cú pháp nginx và biểu thức workflow
  được ghim bằng test chuỗi/`node:test`; `nginx -t` thật do `apply-infra.sh` chạy trên VM (bất biến #9).
- **Không ghi secret** (mật khẩu, token, giá trị `.env`) vào repo, tài liệu, log, mô tả PR. Lệnh mẫu chỉ nhắc tên biến
  (`$MYSQL_ROOT_PASSWORD`…) được mở rộng **bên trong container**. Giá trị trong test là chuỗi giả (`*-sentinel`).
- Bước ghi "người vận hành chạy sau khi merge" **không do agent chạy**: không SSH vào VM, không `gh` tạo hay sửa gì.
- Luật tài liệu: mỗi Task cập nhật tài liệu liên quan trong **cùng PR**: sửa nội dung thì tăng `version` (MAJOR khi người đọc
  bản cũ sẽ làm sai, MINOR khi bổ sung/làm rõ), `updated: 2026-10-03`, thêm một dòng `## Lịch sử phiên bản`. Sau đó `npm run docs:index`.
- **PLAN-REL-003 viết song song và cũng sửa** `docs/ops/deploy-va-nhanh.md`, `docs/playbooks/rollback.md`,
  `docs/ops/moi-truong.md`. Trước khi sửa ba file này: `git fetch && git rebase origin/staging`. **Không viết lại
  `deploy-va-nhanh.md` §7** (runbook phát hành do REL-003 giữ); chỉ sửa §2, §3, §5.
- Thứ tự phụ thuộc giữa các PR: Task 8 sau Task 1 (cùng `core.conf`); Task 7 sau Task 6 (cùng compose, `.env.example`,
  `bootstrap-vm.sh`, `compose.test.js`); Task 4 sau Task 2 (cùng `deploy.yml`, `workflows.test.js`).
- Trước khi push mỗi PR: `npm run test:tools && npm run docs:index && npm run docs:check -- --base origin/staging` xanh.
  Nhánh tính năng → PR vào `staging`. Không push `main`.

## Review Focus

1. nginx cho phép body lớn hơn giới hạn của ứng dụng (multer 50 MB, CTD 5 MB) mà vẫn có trần: test Task 1 đọc giới hạn thẳng từ code ứng dụng, nên nâng giới hạn app mà quên nginx sẽ đỏ.
2. `limit_req_zone` nằm ngoài `server` (ngữ cảnh `http`) và tên zone khác nhau giữa staging và production (chung một nginx); `limit_req` chỉ gắn vào `location = /api/login`, với 429 thay vì 503: test Task 8.
3. Job `infra` **không** bị bỏ qua khi test ứng dụng bị path filter bỏ qua, nhưng **bị chặn** khi có test đỏ; `test-tools` là cổng thật khi chỉ `infra/**` đổi: test Task 2 (`!cancelled()` đứng trước `vars.DEPLOY_ENABLED`).
4. Mật khẩu DB không lên dòng lệnh host ở cả hai script, và `create-core-admin.sh` ghi cả membership TCKT (không có nó thì tài khoản mới nhận 403): test Task 3.
5. Rollback tự động không "lùi" về chính tag đang lỗi, không chạm app khác, luôn thoát mã khác 0; dọn GHCR không xoá tag production dù nằm ngoài 40 bản mới nhất; fail-safe nếu thiếu deploy state: test Task 5 và Task 4.

---

## Thứ tự, cổng và cách chia PR

Các Task này **không chặn đợt 1** (G1–G6 của SPEC-REL-001 §3). Nhưng R13, R14, R15, R16, R17, R20 (cột "Pilot") nên xong
**trước pilot**; R18, R19 (cột "Sau") làm sau pilot cũng được.

| Task | Lỗi | Cổng (quyết định đã ghi trong #50) | Pilot/Sau | PR đề xuất (vào `staging`) |
|---|---|---|---|---|
| 1 | R13 nginx chặn upload > 1 MB | #50 mục 1: 55m cho Core, 8m cho CTD | Pilot | `fix/nginx-upload-limit` |
| 2 | R14 job `infra` không cần test | #50 mục 9: phụ thuộc `test-tools` | Pilot | `ci/infra-needs-tests` |
| 3 | R15 script tạo user | #50 mục 8: mysql trong container, tạo membership TCKT | Pilot | `fix/infra-admin-scripts` |
| 4 | R16 `ghcr-cleanup` bảo vệ tag đang chạy + rollback | #50 mục 14: thiết kế lại bảo vệ theo pinnedTags, fail-safe | Pilot | `ci/ghcr-retention` (sau Task 2) |
| 5 | R17 rollback tự động | #50 mục 2: rollback tag cũ khi health hỏng | Pilot | `feat/deploy-auto-rollback` |
| 6 | R18 `AZURE_*` vào compose | #50 mục 4: truyền `CORE_AZURE_*` | Sau | `fix/compose-azure-env` |
| 7 | R19 biến env thừa | #50 mục 6: giữ `SETTINGS_ENCRYPTION_KEY`, chỉ gỡ biến thật sự thừa | Sau | `chore/compose-dead-env` (sau Task 6) |
| 8 | R20 giới hạn tần suất đăng nhập | c32: limit_req nginx 10r/m burst 20, 429 | Pilot | `feat/nginx-login-rate-limit` (sau Task 1) |

Mọi PR đều có thể merge độc lập theo thứ tự bất kỳ, trừ ba cặp ở Global Constraints.

---

### Task 1: nginx cho phép upload tới giới hạn của ứng dụng (R13)

**Cổng:** #50 mục 1 — `client_max_body_size 55m` cho Core, `8m` cho CTD, cả hai môi trường.

Vì sao 55m/8m: Core nhận file tối đa 50 MB qua multer (`core/src/middleware/uploads.js:3`), CTD tối đa 5 MB mỗi loại giấy tờ
(`catalog_seed.py`). multipart có thêm phần đệm, nên nginx phải lớn hơn một chút, nếu không file hợp lệ nhận 413 từ nginx.

**Files:**
- Modify: `infra/nginx/staging/core.conf`, `infra/nginx/production/core.conf`
- Modify: `infra/nginx/staging/ctd.conf`, `infra/nginx/production/ctd.conf`
- Create: `tools/tests/nginx.test.js`
- Docs: `docs/ops/moi-truong.md` (§7), `docs/ai/bay-da-gap.md`

**Interfaces:**
- Produces: `tools/tests/nginx.test.js` với các helper `conf(env, app)`, `sslServer(text)` (khối `server` có `listen 443 ssl;`),
  `bodyLimitMb(block)`. Task 8 dùng lại ba helper này.

- [ ] **Step 1: Viết test đỏ** — tạo `tools/tests/nginx.test.js`:

```js
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..', '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const conf = (env, app) => read(`infra/nginx/${env}/${app}.conf`);
// Mỗi file có hai khối `server`: khối 443 (phục vụ thật) và khối 80 (chỉ redirect). Chỉ khối 443 tính.
const sslServer = (text) => {
  const block = text.split(/^server \{/m).slice(1).find((b) => /listen 443 ssl;/.test(b));
  assert.ok(block, 'no `listen 443 ssl` server block');
  return block;
};
const bodyLimitMb = (block) => {
  const m = block.match(/^\s*client_max_body_size\s+(\d+)m;/m);
  return m ? Number(m[1]) : null;
};

for (const env of ['staging', 'production']) {
  test(`${env} core.conf lets uploads through up to the app limit plus multipart overhead`, () => {
    const appMb = Number(read('core/src/middleware/uploads.js').match(/fileSize:\s*(\d+)\s*\*\s*1024\s*\*\s*1024/)[1]);
    const mb = bodyLimitMb(sslServer(conf(env, 'core')));
    assert.equal(mb, 55, 'quyết định #50 mục 1: 55m cho Core');
    assert.ok(mb > appMb, `nginx (${mb}m) phải lớn hơn giới hạn multer (${appMb}m), nếu không file hợp lệ nhận 413 từ nginx`);
  });

  test(`${env} ctd.conf lets uploads through up to the largest seeded document size plus overhead`, () => {
    const seed = read('services/ctd-api/backend/app/seeds/catalog_seed.py');
    const sizes = [...seed.matchAll(/\],\s*(\d+)\),?/g)].map((m) => Number(m[1]));
    assert.ok(sizes.length > 0, 'không đọc được kích thước tối đa từ catalog_seed.py');
    const mb = bodyLimitMb(sslServer(conf(env, 'ctd')));
    assert.equal(mb, 8, 'quyết định #50 mục 1: 8m cho CTD');
    assert.ok(mb > Math.max(...sizes), `nginx (${mb}m) phải lớn hơn loại giấy tờ lớn nhất (${Math.max(...sizes)}m)`);
  });
}
```

- [ ] **Step 2: Chạy, thấy đỏ.**

Run: `node --test tools/tests/nginx.test.js`
Expected: 4 test FAIL, thông báo dạng `null !== 55` và `null !== 8` (hiện chưa có `client_max_body_size`).

- [ ] **Step 3: Cài đặt.** Trong khối `server` đầu tiên (khối có `listen 443 ssl;`, **không** phải khối 80 chỉ có `return 301`) của cả bốn
  file, thêm một dòng trống rồi một dòng ngay sau `server_name …;`:

  | File | Dòng thêm (thụt 4 dấu cách) |
  |---|---|
  | `infra/nginx/staging/core.conf` | `client_max_body_size 55m;` |
  | `infra/nginx/production/core.conf` | `client_max_body_size 55m;` |
  | `infra/nginx/staging/ctd.conf` | `client_max_body_size 8m;` |
  | `infra/nginx/production/ctd.conf` | `client_max_body_size 8m;` |

  Ví dụ `infra/nginx/staging/ctd.conf` sau khi sửa:

```nginx
server {
    server_name ctd-hoso-staging.duckdns.org;

    client_max_body_size 8m;

    location / {
        proxy_pass http://127.0.0.1:8000;
```

- [ ] **Step 4: Chạy, thấy xanh.**

Run: `node --test tools/tests/nginx.test.js`
Expected: 4 test PASS.

- [ ] **Step 5: Tài liệu.**
  - `docs/ops/moi-truong.md` §7: thêm đoạn "Giới hạn upload: Core `client_max_body_size 55m` (multer 50 MB + phần đệm multipart),
    CTD `8m` (giấy tờ tối đa 5 MB). `tools/tests/nginx.test.js` đọc giới hạn ứng dụng và báo đỏ nếu nginx nhỏ hơn. nginx
    mặc định chỉ cho 1 MB, nên thiếu dòng này mọi file lớn hơn 1 MB nhận 413 từ nginx." Tăng MINOR.
  - `docs/ai/bay-da-gap.md`: thêm mục "nginx không đặt `client_max_body_size` thì chặn upload ở 1 MB dù ứng dụng cho 50 MB"
    (triệu chứng: 413 với trang HTML của nginx, không có trong log ứng dụng; chốt bằng `nginx.test.js`). Tăng MINOR.
  - `updated` = ngày làm, thêm dòng lịch sử cho cả hai file.

- [ ] **Step 6:** `npm run test:tools && npm run docs:index && npm run docs:check -- --base origin/staging` — xanh.

- [ ] **Step 7:** Commit `fix(nginx): allow uploads up to the application limits` rồi mở PR vào `staging`.

- [ ] **Step 8 (người vận hành chạy sau khi merge):** job `infra` (staging) tự chạy `apply-infra.sh staging`, có `nginx -t` trước khi
  reload. Production nhận cấu hình ở lần `staging → main` đầu tiên. Kiểm trên VM (không cần đăng nhập, dùng kiểu nội dung không
  được parser của Express đọc để tránh 413 của ứng dụng):

```bash
sudo nginx -T 2>/dev/null | grep -n client_max_body_size          # thấy 55m (core) và 8m (ctd) cho từng môi trường
head -c 2097152 /dev/zero > /tmp/ut-2mb.bin                      # 2 MB: nginx không còn chặn
curl -s -o /tmp/ut-r.txt -w '%{http_code}\n' -X POST -H 'Content-Type: application/octet-stream' \
  --data-binary @/tmp/ut-2mb.bin https://tckt-hub-staging.duckdns.org/api/login; grep -c nginx /tmp/ut-r.txt   # mã khác 413, 0 dòng "nginx"
head -c 58720256 /dev/zero > /tmp/ut-56mb.bin                    # 56 MB: nginx phải chặn
curl -s -o /dev/null -w '%{http_code}\n' -X POST -H 'Content-Type: application/octet-stream' \
  --data-binary @/tmp/ut-56mb.bin https://tckt-hub-staging.duckdns.org/api/login                              # 413
rm -f /tmp/ut-2mb.bin /tmp/ut-56mb.bin /tmp/ut-r.txt
```

---

### Task 2: job `infra` chỉ chạy khi test xanh (R14)

**Cổng:** #50 mục 9 — "một job `test-tools` dùng chung cho các job deploy".

Hiện `infra` chỉ `needs: changes`, nên một push chỉ đổi `infra/**` deploy thẳng lên production mà không test nào chạy
(`test-core/ctd/noti` đều bị path filter bỏ qua). Chỉ thêm `needs` vào các test ứng dụng là không đủ: khi chúng bị bỏ qua thì
cổng rỗng. Vì vậy cần một job `test-tools` chạy `npm run test:tools` mỗi khi `infra/**`, `tools/**`, workflow hay `package.json` đổi.
Job bị bỏ qua mặc định kéo theo job phụ thuộc bị bỏ qua, nên điều kiện của `infra` phải bắt đầu bằng `!cancelled()`.

**Files:**
- Modify: `.github/workflows/deploy.yml`
- Modify (test): `tools/tests/workflows.test.js`
- Docs: `docs/ops/deploy-va-nhanh.md` (§2), `docs/ai/bay-da-gap.md`

**Interfaces:**
- Produces: output `changes.outputs.tools`, job `test-tools`, và helper test `jobHeader(y, name)` (phần của job từ tên tới
  `steps:`, khoảng trắng đã gộp). Task 4 dùng lại `wf` và `path` đã có trong file test.

- [ ] **Step 1: Viết test đỏ** — thêm vào **cuối** `tools/tests/workflows.test.js`:

```js
// Phần của deploy.yml từ tên job tới `steps:`, gộp khoảng trắng để so chuỗi điều kiện nhiều dòng.
function jobHeader(y, name) {
  const start = y.indexOf(`\n  ${name}:`);
  assert.ok(start >= 0, `job ${name} not found`);
  return y.slice(start, y.indexOf('\n    steps:', start)).replace(/\s+/g, ' ');
}

test('deploy.yml: infra waits for every test job, and a skipped test (path filter) does not skip infra', () => {
  const infra = jobHeader(wf('deploy.yml'), 'infra');
  assert.match(infra, /needs: \[changes, test-core, test-ctd, test-noti, test-tools\]/);
  assert.ok(infra.includes("!cancelled() && !contains(needs.*.result, 'failure')"), infra);
  // Thiếu `!cancelled()` ở đầu thì một test bị skip cũng làm job infra bị skip (mặc định của GitHub).
  assert.ok(infra.indexOf('!cancelled()') < infra.indexOf('vars.DEPLOY_ENABLED'), infra);
  // Các cổng cũ giữ nguyên.
  assert.ok(infra.includes("vars.DEPLOY_ENABLED == 'true' && (needs.changes.outputs.env == 'staging' || vars.PROD_DEPLOY_ENABLED == 'true')"));
  assert.ok(infra.includes("github.event_name == 'workflow_dispatch' || (github.event_name == 'push' && needs.changes.outputs.infra == 'true')"));
});

test('deploy.yml: test-tools runs the tools suite when infra, tools or workflows change (and on manual dispatch)', () => {
  const y = wf('deploy.yml');
  const job = y.slice(y.indexOf('\n  test-tools:'), y.indexOf('\n  build-core:'));
  assert.match(job, /npm run test:tools/);
  assert.ok(jobHeader(y, 'test-tools').includes("github.event_name == 'workflow_dispatch' || needs.changes.outputs.tools == 'true'"));
  assert.match(y, /tools: \$\{\{ steps\.f\.outputs\.tools \}\}/);
  const filter = y.slice(y.indexOf('            tools:'), y.indexOf('      - id: v'));
  for (const p of ['infra/**', 'tools/**', '.github/workflows/**', 'package.json']) assert.ok(filter.includes(`'${p}'`), p);
});

test('deploy.yml: apps deploy only after their own tests (unchanged), so infra is the only job needing the extra gate', () => {
  const y = wf('deploy.yml');
  for (const j of ['deploy-core', 'deploy-ctd-api', 'deploy-noti']) assert.doesNotMatch(jobHeader(y, j), /test-tools/, j);
});
```

- [ ] **Step 2: Chạy, thấy đỏ.**

Run: `node --test tools/tests/workflows.test.js`
Expected: 3 test mới FAIL (`job test-tools not found` và `needs: [changes, test-core, …]` không khớp); các test cũ vẫn PASS.

- [ ] **Step 3: Cài đặt `.github/workflows/deploy.yml`** — bốn chỗ:

  1. Trong `changes.outputs`, thêm `tools` ngay sau `infra`:

```yaml
      infra: ${{ steps.f.outputs.infra }}
      tools: ${{ steps.f.outputs.tools }}
      tag: ${{ steps.v.outputs.tag }}
```

  2. Trong `filters:` của `dorny/paths-filter`, thêm khối `tools` ngay sau khối `infra`:

```yaml
            infra:
              - 'infra/**'
            tools:
              - 'infra/**'
              - 'tools/**'
              - '.github/workflows/**'
              - 'package.json'
```

  3. Thêm job `test-tools` ngay **trước** `build-core:` (sau `test-noti`):

```yaml
  # Bộ test script/compose/nginx/workflow (tools/tests). Khi chỉ `infra/**` đổi thì test-core/ctd/noti đều bị
  # path filter bỏ qua, nên đây mới là cổng thật của job `infra`.
  test-tools:
    needs: changes
    if: github.event_name == 'workflow_dispatch' || needs.changes.outputs.tools == 'true'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - run: npm run test:tools
```

  4. Thay phần đầu của job `infra` (từ `infra:` tới hết khối `if:`; giữ nguyên `runs-on`, `environment`, `steps`):

```yaml
  # needs gồm mọi job test; `!cancelled()` để job test bị path filter bỏ qua (skipped) không kéo theo việc bỏ qua infra,
  # còn test đỏ hoặc `changes` lỗi thì chặn.
  infra:
    needs: [changes, test-core, test-ctd, test-noti, test-tools]
    if: >-
      !cancelled() && !contains(needs.*.result, 'failure') &&
      vars.DEPLOY_ENABLED == 'true' && (needs.changes.outputs.env == 'staging' || vars.PROD_DEPLOY_ENABLED == 'true') &&
      (github.event_name == 'workflow_dispatch' ||
       (github.event_name == 'push' && needs.changes.outputs.infra == 'true'))
```

  Không đổi ruleset: không thêm `test-tools` vào check bắt buộc (job bị skip khi path filter không khớp).

- [ ] **Step 4: Chạy, thấy xanh.**

Run: `node --test tools/tests/workflows.test.js`
Expected: toàn bộ PASS, kể cả test cũ "production deploys need their own switch" (chuỗi cổng vẫn liền mạch sau khi gộp khoảng trắng).
Kiểm cú pháp YAML bằng `python3 -c "import yaml,sys; yaml.safe_load(open('.github/workflows/deploy.yml'))"` nếu máy có PyYAML.

- [ ] **Step 5: Tài liệu.**
  - `docs/ops/deploy-va-nhanh.md` §2: thêm job `test-tools` vào danh sách (chạy khi `infra/**`, `tools/**`, `.github/workflows/**`
    hoặc `package.json` đổi, và khi chạy tay) và sửa mục 6: `infra` đợi mọi job test, test bị bỏ qua không chặn, test đỏ thì chặn. Tăng
    MINOR. **Không** sửa §7.
  - `docs/ai/bay-da-gap.md`: thêm mục "Job phụ thuộc test bị bỏ qua cũng bị bỏ qua: cần `!cancelled()`" (kèm
    `!contains(needs.*.result, 'failure')`), trỏ tới `workflows.test.js`. Tăng MINOR.

- [ ] **Step 6:** `npm run test:tools && npm run docs:index && npm run docs:check -- --base origin/staging` — xanh.

- [ ] **Step 7:** Commit `ci: gate the infra deploy job on test-tools and app tests`, mở PR vào `staging`.

- [ ] **Step 8 (người vận hành xem sau khi merge):** trên tab Actions của push đầu tiên chỉ đổi `infra/**`: thấy `test-tools` chạy trước
  `infra`. Thử cố ý: PR nháp làm đỏ một test trong `tools/tests` thì `infra` không chạy khi merge (đóng PR, không merge).

---

### Task 3: script tạo user — không lộ mật khẩu, ghi membership TCKT (R15)

**Cổng:** #50 mục 8 (mật khẩu qua `sh -c` trong container, như `backup.sh`) và a5 của SPEC-PILOT-001 (mọi chỗ ghi user/role phải
đồng bộ membership).

Hai lỗi:
- `create-core-admin.sh` chỉ ghi `users.role`. Từ GĐ1 quyền đọc từ `unit_memberships`, nên tài khoản vừa tạo không có membership
  nhận 403 ở mọi route Điều hành.
- Cả hai script truyền mật khẩu MySQL qua `-p"…"` trên dòng lệnh host (`ps` thấy được), vi phạm bất biến #10.

**Files:**
- Modify: `infra/scripts/create-core-admin.sh`
- Modify: `infra/scripts/create-core-readonly-user.sh`
- Create: `tools/tests/infra-admin-scripts.test.js`
- Docs: `docs/ai/bat-bien.md` (#10), `docs/ops/truy-cap-db.md`, `docs/ops/su-co.md`

**Interfaces:**
- Consumes: `makeSandbox()` và `repo` từ `tools/tests/helpers/sandbox.js` (**không sửa** helper dùng chung).
- Produces: trong file test, `runScript(sb, script, args, input)` (chạy script bằng `spawnSync` để truyền stdin cho `read`), `writeEnvFile(sb)`,
  `stubDocker(sb, { hash })` (trả hàm đọc `sql.log`).

- [ ] **Step 1: Viết test đỏ** — tạo `tools/tests/infra-admin-scripts.test.js`:

```js
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { makeSandbox, repo } = require('./helpers/sandbox');

// Giá trị giả, chỉ có trong test. Mật khẩu DB nằm trong .env giả; nó tuyệt đối không được xuất hiện trên dòng lệnh host.
const DB_PW = 'db-password-sentinel';
const ROOT_PW = 'root-password-sentinel';

// Hai script đọc stdin (read), nên chạy trực tiếp bằng spawnSync để truyền input; PATH trỏ vào docker giả của sandbox.
function runScript(sb, script, args, input) {
  const r = spawnSync('bash', [path.join(repo, 'infra', 'scripts', script), ...args], {
    encoding: 'utf8',
    input,
    env: { ...process.env, PATH: `${sb.bin}:${process.env.PATH}`, UT_ROOT: path.join(sb.root, 'opt'), UT_LOCK_DIR: sb.root },
  });
  return { status: r.status, stdout: r.stdout, stderr: r.stderr };
}

function writeEnvFile(sb, env = 'staging') {
  fs.writeFileSync(path.join(sb.root, 'opt', env, 'infra', '.env'),
    `CORE_MYSQL_ROOT_PASSWORD=${ROOT_PW}\nCORE_DB_NAME=testdb\nCORE_DB_USER=testuser\nCORE_DB_PASSWORD=${DB_PW}\n`);
}

// docker giả: ghi dòng lệnh vào calls.log; stdin của `exec -T core-db` vào sql.log; bước bcrypt (`exec -T core node`) trả `hash`.
function stubDocker(sb, { hash = 'bcrypt-hash-for-test' } = {}) {
  const sqlLog = path.join(sb.root, 'sql.log');
  fs.writeFileSync(path.join(sb.bin, 'docker'), `#!/usr/bin/env bash
echo "docker $*" >> "${sb.logFile}"
case "$*" in
  *"exec -T core node"*) cat > /dev/null; printf '%s' '${hash}' ;;
  *"exec -T core-db"*) cat >> "${sqlLog}" ;;
esac
`, { mode: 0o755 });
  return () => (fs.existsSync(sqlLog) ? fs.readFileSync(sqlLog, 'utf8') : '');
}

test('create-core-admin.sh upserts the user AND a TCKT admin membership (without it the account gets 403)', () => {
  const sb = makeSandbox();
  writeEnvFile(sb);
  const sql = stubDocker(sb);
  const r = runScript(sb, 'create-core-admin.sh', ['staging'], "Nguyen O'Brien\nadmin@example.test\nlongenough1\n");
  assert.equal(r.status, 0, r.stderr);
  const s = sql();
  const userAt = s.indexOf('INSERT INTO users');
  const memberAt = s.indexOf('INSERT INTO unit_memberships');
  assert.ok(userAt >= 0 && memberAt > userAt, `membership phải ghi SAU user:\n${s}`);
  assert.match(s, /FROM org_units WHERE code = 'TCKT'/);
  assert.match(s, /'admin'\)\s*ON DUPLICATE KEY UPDATE role = 'admin'/, 'chạy lại script phải cập nhật, không lỗi trùng khoá');
  assert.match(s, /FROM users WHERE email = 'admin@example\.test'/);
  assert.ok(s.includes("'Nguyen O''Brien'"), 'dấu nháy đơn trong tên phải được escape');
  assert.match(r.stdout, /Admin account ready: admin@example\.test/);
});

test('create-core-admin.sh never puts a DB password on the host command line (invariant #10)', () => {
  const sb = makeSandbox();
  writeEnvFile(sb);
  stubDocker(sb);
  const r = runScript(sb, 'create-core-admin.sh', ['staging'], 'Admin\nadmin@example.test\nlongenough1\n');
  assert.equal(r.status, 0, r.stderr);
  const c = sb.calls().join('\n');
  assert.match(c, /exec -T core-db sh -c mysql -u"\$MYSQL_USER" -p"\$MYSQL_PASSWORD" "\$MYSQL_DATABASE"/);
  assert.ok(!c.includes(DB_PW), 'mật khẩu DB từ .env xuất hiện trên dòng lệnh');
  assert.ok(!c.includes('longenough1'), 'mật khẩu admin xuất hiện trên dòng lệnh');
  // Chỉ khớp tham số `-p…` đứng riêng và theo sau là ký tự thường (mật khẩu viết liền), như test của backup.sh.
  assert.doesNotMatch(c, /(^|\s)-p[^"$ ]/m);
});

test('create-core-admin.sh stops before touching the database when no password hash comes back', () => {
  const sb = makeSandbox();
  writeEnvFile(sb);
  const sql = stubDocker(sb, { hash: '' });
  const r = runScript(sb, 'create-core-admin.sh', ['staging'], 'Admin\nadmin@example.test\nlongenough1\n');
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /Failed to generate a password hash/);
  assert.equal(sql(), '');
});

test('create-core-admin.sh rejects a short password before calling docker at all', () => {
  const sb = makeSandbox();
  writeEnvFile(sb);
  stubDocker(sb);
  const r = runScript(sb, 'create-core-admin.sh', ['staging'], 'Admin\nadmin@example.test\nshort\n');
  assert.notEqual(r.status, 0);
  assert.ok(!sb.calls().some((l) => l.startsWith('docker ')), sb.calls().join('\n'));
});

test('create-core-readonly-user.sh runs mysql as root INSIDE the container; the root password never reaches the host', () => {
  const sb = makeSandbox();
  writeEnvFile(sb);
  const sql = stubDocker(sb);
  const r = runScript(sb, 'create-core-readonly-user.sh', ['staging', 'core_viewer'], 'viewer-password-sentinel\n');
  assert.equal(r.status, 0, r.stderr);
  const c = sb.calls().join('\n');
  assert.match(c, /exec -T core-db sh -c mysql -uroot -p"\$MYSQL_ROOT_PASSWORD"/);
  assert.ok(!c.includes(ROOT_PW), 'mật khẩu root xuất hiện trên dòng lệnh host');
  assert.ok(!c.includes('viewer-password-sentinel'), 'mật khẩu user chỉ-đọc xuất hiện trên dòng lệnh host');
  assert.doesNotMatch(c, /(^|\s)-p[^"$ ]/m);
  const s = sql();
  assert.match(s, /CREATE USER IF NOT EXISTS 'core_viewer'@'%' IDENTIFIED BY 'viewer-password-sentinel'/);
  assert.match(s, /GRANT SELECT ON `testdb`\.\* TO 'core_viewer'@'%'/);
});

test('create-core-readonly-user.sh no longer needs the root password in the host .env', () => {
  const sb = makeSandbox();
  fs.writeFileSync(path.join(sb.root, 'opt', 'staging', 'infra', '.env'), 'CORE_DB_NAME=testdb\n');
  stubDocker(sb);
  const r = runScript(sb, 'create-core-readonly-user.sh', ['staging'], 'viewer-password-sentinel\n');
  assert.equal(r.status, 0, r.stderr);
});

test('create-core-readonly-user.sh rejects a username that is not [A-Za-z0-9_]+ before calling docker', () => {
  const sb = makeSandbox();
  writeEnvFile(sb);
  stubDocker(sb);
  const r = runScript(sb, 'create-core-readonly-user.sh', ['staging', "x'; DROP USER root; --"], '');
  assert.notEqual(r.status, 0);
  assert.ok(!sb.calls().some((l) => l.startsWith('docker ')));
});
```

- [ ] **Step 2: Chạy, thấy đỏ.**

Run: `node --test tools/tests/infra-admin-scripts.test.js`
Expected: 4 test FAIL (membership chưa có; `mysql -u … -p<mật khẩu>` còn trên dòng lệnh; script chỉ-đọc còn đòi mật khẩu root trong `.env`);
3 test còn lại PASS (kiểm tra đầu vào đã đúng).

- [ ] **Step 3: Cài đặt `infra/scripts/create-core-admin.sh`** — thay toàn bộ file bằng:

```bash
#!/usr/bin/env bash
# Usage: ./create-core-admin.sh <staging|production>
# Run ON THE VM. Creates (or promotes) a local-auth admin
# account in the core database — for bootstrapping access when no working
# admin account exists yet (e.g. the seeded admin@example.com password is
# unknown, or that account got deactivated).
# Ghi cả `users.role` lẫn membership TCKT (`unit_memberships`): từ GĐ1 quyền đọc từ membership, thiếu nó thì
# tài khoản vừa tạo nhận 403 ở mọi route Điều hành. Mật khẩu DB không đi qua host (bất biến #10).
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"

ENV="${1:-}"; ut_env_branch "$ENV" >/dev/null

read -rp "Full name: " ADMIN_NAME
read -rp "Email: " ADMIN_EMAIL
read -rsp "Password (min 8 chars): " ADMIN_PASSWORD
echo
if [ "${#ADMIN_PASSWORD}" -lt 8 ]; then
  echo "Password must be at least 8 characters." >&2
  exit 1
fi

# Hash with the app's own bcryptjs (same lib/cost factor the app uses at login),
# piped over stdin so the plaintext never appears in argv/process list/shell history.
HASH="$(printf '%s' "$ADMIN_PASSWORD" | ut_compose "$ENV" exec -T core node -e '
  let data = "";
  process.stdin.on("data", c => data += c);
  process.stdin.on("end", () => {
    process.stdout.write(require("bcryptjs").hashSync(data, 10));
  });
')"
unset ADMIN_PASSWORD

if [ -z "$HASH" ]; then
  echo "Failed to generate a password hash (is the core container running?)." >&2
  exit 1
fi

# Escape single quotes for the SQL literals below (trusted operator input, not untrusted user input).
esc() { printf '%s' "$1" | sed "s/'/''/g"; }
NAME_SQL="$(esc "$ADMIN_NAME")"
EMAIL_SQL="$(esc "$ADMIN_EMAIL")"

SQL="INSERT INTO users (name, email, password_hash, role, auth_provider, is_active)
VALUES ('${NAME_SQL}', '${EMAIL_SQL}', '${HASH}', 'admin', 'local', 1)
ON DUPLICATE KEY UPDATE
  password_hash = VALUES(password_hash),
  role = 'admin',
  auth_provider = 'local',
  is_active = 1;
INSERT INTO unit_memberships (user_id, unit_id, role)
VALUES ((SELECT id FROM users WHERE email = '${EMAIL_SQL}'), (SELECT id FROM org_units WHERE code = 'TCKT'), 'admin')
ON DUPLICATE KEY UPDATE role = 'admin';"

# mysql chạy TRONG container và đọc mật khẩu từ biến môi trường của chính container (như backup.sh),
# nên mật khẩu không xuất hiện trên dòng lệnh host (`ps` thấy được). Thiếu đơn vị TCKT thì cột unit_id NULL làm lệnh lỗi:
# script dừng với lỗi rõ ràng thay vì tạo tài khoản không có quyền.
# shellcheck disable=SC2016  # biến được mở rộng bên trong container
printf '%s\n' "$SQL" | ut_compose "$ENV" exec -T core-db \
  sh -c 'mysql -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE"'

echo "Admin account ready: ${ADMIN_EMAIL} (role=admin, auth_provider=local, TCKT membership=admin)."
```

  (Dùng `VALUES ((SELECT …), (SELECT …), 'admin')` thay vì `INSERT … SELECT … ON DUPLICATE KEY` để tránh nhập nhằng tên cột `role`.)

- [ ] **Step 4: Cài đặt `infra/scripts/create-core-readonly-user.sh`** — ba chỗ:

  1. Thêm hai dòng chú thích ngay sau dòng `# for remote DB inspection via DBeaver / SSH tunnel.`:

```bash
# mysql chạy trong container với mật khẩu root lấy từ biến môi trường của container (bất biến #10): không đọc,
# không truyền mật khẩu root qua host.
```

  2. Xoá khối đọc mật khẩu root (cả kiểm rỗng) nằm giữa kiểm `ENV_FILE` và `DB_NAME`:

```bash
ROOT_PASSWORD="$(grep -m1 '^CORE_MYSQL_ROOT_PASSWORD=' "$ENV_FILE" | cut -d= -f2-)"
if [ -z "$ROOT_PASSWORD" ]; then
  echo "Error: CORE_MYSQL_ROOT_PASSWORD not found in $ENV_FILE" >&2
  exit 1
fi
```

     Script vẫn đọc `CORE_DB_NAME` (không phải secret) từ `.env`.

  3. Thay lệnh `mysql` và bỏ `unset ROOT_PASSWORD` ở cuối file:

```bash
# shellcheck disable=SC2016  # biến được mở rộng bên trong container
printf '%s\n' "$SQL" | ut_compose "$ENV" exec -T core-db \
  sh -c 'mysql -uroot -p"$MYSQL_ROOT_PASSWORD"'
```

  Script này in mật khẩu user chỉ-đọc vừa tạo ra màn hình **có chủ đích** (người vận hành cần lưu vào password manager); không đổi.

- [ ] **Step 5: Chạy, thấy xanh.**

Run: `node --test tools/tests/infra-admin-scripts.test.js`
Expected: 7 test PASS.

- [ ] **Step 6: Tài liệu.**
  - `docs/ai/bat-bien.md` mục 10: thêm "Áp dụng cả cho script tạo user (`create-core-admin.sh`, `create-core-readonly-user.sh`):
    `mysql` chạy trong container bằng `sh -c` với `$MYSQL_*`." Tăng MINOR (Task 7 sẽ tăng MAJOR sau).
  - `docs/ops/truy-cap-db.md`: nói rõ `create-core-readonly-user.sh` không còn đọc mật khẩu root từ `.env` (dùng biến của container
    `core-db`, nên `core-db` phải đang chạy). Tăng MINOR.
  - `docs/ops/su-co.md`: thêm mục "Mất quyền quản trị Core": chạy `infra/scripts/create-core-admin.sh <env>` trên VM; script ghi
    `users.role=admin` **và** membership `admin` ở đơn vị TCKT; chạy lại an toàn (upsert). Thiếu đơn vị `TCKT` thì script lỗi
    thay vì tạo tài khoản không có quyền. Tăng MINOR.

- [ ] **Step 7:** `npm run test:tools && npm run docs:index && npm run docs:check -- --base origin/staging` — xanh.

- [ ] **Step 8:** Commit `fix(infra): admin scripts keep DB passwords off the host and write the TCKT membership`, mở PR vào `staging`.

- [ ] **Step 9 (người vận hành chạy sau khi merge):** `deploy.sh`/`apply-infra.sh` đã `git pull` script mới lên VM. Thử trên **staging** với
  email thử (không dùng email thật), rồi vô hiệu hoá tài khoản thử:

```bash
bash /opt/ultimate-tckt/staging/infra/scripts/create-core-admin.sh staging     # nhập tên, email thử, mật khẩu thử khi được hỏi
cd /opt/ultimate-tckt/staging/infra && source scripts/lib.sh
printf '%s\n' "SELECT u.email, u.role, m.role AS tckt_role, o.code FROM users u JOIN unit_memberships m ON m.user_id = u.id JOIN org_units o ON o.id = m.unit_id WHERE u.email = 'admin-test@example.test';" \
  | ut_compose staging exec -T core-db sh -c 'mysql -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE"'
```

  Kỳ vọng: một dòng `admin | admin | TCKT`; đăng nhập bằng tài khoản thử vào được trang Điều hành (không 403). Xong thì đặt
  `is_active = 0` cho tài khoản thử.

---

### Task 4: `ghcr-cleanup` bảo vệ tag đang chạy thực tế và tag rollback (R16)

**Cổng:** #50 mục 14 — Thiết kế lại Task 4 theo quyết định chính thức ngày 2026-10-03:
Không dựa riêng vào quy tắc "40 mới nhất + 5 production". Cơ chế dọn GHCR phải bảo vệ bằng **định danh cụ thể image/tag đang chạy thực tế trên VM** và **ít nhất một bản rollback** của cả staging lẫn production. Nếu không lấy được trạng thái deploy (hoặc `pinnedTags` rỗng/lỗi), quy trình dọn dẹp phải **dừng ngay và không xóa bất kỳ version nào** (fail-safe). Hỗ trợ chế độ dry-run và kiểm thử tình huống nhiều build thành công liên tiếp trên CI nhưng deploy thất bại hoặc chưa chạy.

Vì sao không dùng `ignore-versions` của `actions/delete-package-versions@v5`: với package container, action so regex đó với **tên version** (digest `sha256:…`), không phải tag, nên không bảo vệ theo tag được. Vì vậy luật giữ viết thành hàm thuần có test (`tools/ghcr-retention.js`), còn workflow chỉ lấy danh sách version qua API rồi xoá những gì hàm chọn.

**Files:**
- Create: `tools/ghcr-retention.js`
- Create: `tools/tests/ghcr-retention.test.js`
- Modify: `.github/workflows/ghcr-cleanup.yml` (viết lại)
- Modify: `.github/workflows/deploy.yml` (ba job build)
- Modify (test): `tools/tests/workflows.test.js`
- Docs: `docs/ops/github.md` (§6), `docs/ops/deploy-va-nhanh.md` (§2), `docs/playbooks/rollback.md` (§1), `docs/ai/bay-da-gap.md`

**Interfaces:**
- Produces: `selectVersionsToDelete(versions, options) → version[]` (cũ nhất trước).
  - `options.pinnedTags`: mảng/set tag bắt buộc giữ (tag đang chạy staging/prod + tag rollback). **Bắt buộc**: nếu rỗng hoặc thiếu thì ném lỗi (fail-safe: không xóa gì).
  - `options.keepNewest`: số lượng version mới nhất giữ làm vùng đệm an toàn (mặc định 40).
  - `options.dryRun`: chế độ chạy thử, ghi log không xóa.
  - `tagsOf(version) → string[]`. `versions` là mảng đối tượng version của GitHub Packages API (`id`, `created_at`, `metadata.container.tags`).

- [ ] **Step 1: Viết test đỏ cho hàm chọn** — tạo `tools/tests/ghcr-retention.test.js`:

```js
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { selectVersionsToDelete, DEFAULTS } = require('../ghcr-retention');

const DAY = 86400000;
// id tăng theo thời gian: version id N được tạo N ngày sau mốc đầu.
const version = (id, tags = []) => ({
  id,
  name: `sha256:${String(id).padStart(64, '0')}`,
  created_at: new Date(Date.UTC(2026, 0, 1) + id * DAY).toISOString(),
  metadata: { container: { tags } },
});
const stagingBuilds = (from, to) => Array.from({ length: to - from + 1 }, (_, i) => version(from + i, [`sha${from + i}`]));
const ids = (list) => list.map((v) => v.id);

test('defaults require pinnedTags and keep 40 newest builds', () => {
  assert.equal(DEFAULTS.keepNewest, 40);
  assert.equal(DEFAULTS.requirePinned, true);
});

test('fail-safe: throws and deletes nothing if pinnedTags is missing, null, or empty', () => {
  const versions = stagingBuilds(1, 50);
  assert.throws(() => selectVersionsToDelete(versions), /pinnedTags.*required/i);
  assert.throws(() => selectVersionsToDelete(versions, { pinnedTags: [] }), /pinnedTags.*empty/i);
  assert.throws(() => selectVersionsToDelete(versions, { pinnedTags: null }), /pinnedTags.*required/i);
});

test('keeps the 40 newest versions when pinned tags are inside the window', () => {
  const doomed = selectVersionsToDelete(stagingBuilds(1, 50), { pinnedTags: ['sha45', 'sha50'] });
  assert.deepEqual(ids(doomed), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
});

test('does nothing when there are at most 40 versions', () => {
  assert.deepEqual(selectVersionsToDelete(stagingBuilds(1, 40), { pinnedTags: ['sha40'] }), []);
  assert.deepEqual(selectVersionsToDelete([], { pinnedTags: ['sha1'] }), []);
});

test('multi-build success with deploy failure/delay: running and rollback tags far outside top-40 survive', () => {
  // Production và staging đang chạy bản 2 và 3 (và bản 1 là rollback); nhưng CI đã build thêm 60 bản mới (4..63)
  const versions = [
    version(1, ['sha1', 'rollback-prod']),
    version(2, ['sha2', 'running-prod']),
    version(3, ['sha3', 'running-staging']),
    ...stagingBuilds(4, 63) // 60 bản mới
  ];
  const pinned = ['running-prod', 'rollback-prod', 'running-staging'];
  const doomed = ids(selectVersionsToDelete(versions, { pinnedTags: pinned }));
  assert.ok(!doomed.includes(1), 'bản rollback prod phải được giữ dù rất cũ');
  assert.ok(!doomed.includes(2), 'bản running prod phải được giữ dù rất cũ');
  assert.ok(!doomed.includes(3), 'bản running staging phải được giữ');
  assert.ok(doomed.includes(4), 'bản cũ không được pin bị dọn');
});

test('untagged versions and versions without metadata are deletable once outside the window, never crash', () => {
  const versions = [{ id: 1, created_at: new Date(Date.UTC(2026, 0, 2)).toISOString() }, version(2), ...stagingBuilds(3, 50)];
  const doomed = ids(selectVersionsToDelete(versions, { pinnedTags: ['sha50'] }));
  assert.ok(doomed.includes(1) && doomed.includes(2));
});

test('ties on created_at are broken by id so the result is deterministic', () => {
  const same = new Date(Date.UTC(2026, 5, 1)).toISOString();
  const versions = [3, 1, 2].map((id) => ({ id, created_at: same, metadata: { container: { tags: [] } } }));
  assert.deepEqual(ids(selectVersionsToDelete(versions, { keepNewest: 1, pinnedTags: ['any'] })), [1, 2]);
});

test('refuses a keep count that would delete everything', () => {
  assert.throws(() => selectVersionsToDelete(stagingBuilds(1, 5), { keepNewest: 0, pinnedTags: ['sha5'] }), /keepNewest/);
});

test('does not mutate its input', () => {
  const input = stagingBuilds(1, 50);
  const copy = JSON.stringify(input);
  selectVersionsToDelete(input, { pinnedTags: ['sha50'] });
  assert.equal(JSON.stringify(input), copy);
});
```

- [ ] **Step 2: Chạy, thấy đỏ.**

Run: `node --test tools/tests/ghcr-retention.test.js`
Expected: FAIL `Cannot find module '../ghcr-retention'`.

- [ ] **Step 3: Cài đặt `tools/ghcr-retention.js`:**

```js
'use strict';
// tools/ghcr-retention.js
// Chọn version GHCR cần xoá bảo đảm an toàn triển khai & rollback (SPEC-REL-001 R16, #50 mục 14).
//
// Nguyên tắc thiết kế lại:
// 1. Phải truyền `pinnedTags` (danh sách tag đang chạy thực tế trên VM và ít nhất 1 bản rollback của staging & production).
// 2. Nếu `pinnedTags` rỗng, thiếu hoặc deploy state không xác định -> FAIL-SAFE: ném lỗi, xóa 0 version.
// 3. Giữ các version mang tag nằm trong `pinnedTags` (bảo vệ tuyệt đối bất kể tuổi).
// 4. Giữ thêm `keepNewest` (mặc định 40) version mới nhất làm vùng đệm.
// 5. Trả về mảng các version cần xoá, CŨ NHẤT TRƯỚC.

const DEFAULTS = { keepNewest: 40, requirePinned: true };

function tagsOf(version) {
  return (version.metadata && version.metadata.container && version.metadata.container.tags) || [];
}

function selectVersionsToDelete(versions, options = {}) {
  const { keepNewest, pinnedTags, requirePinned } = { ...DEFAULTS, ...options };
  if (!Number.isInteger(keepNewest) || keepNewest < 1) throw new Error('keepNewest must be an integer >= 1');
  
  if (requirePinned !== false) {
    if (!pinnedTags || !Array.isArray(pinnedTags) && !(pinnedTags instanceof Set)) {
      throw new Error('fail-safe: pinnedTags is required to protect running and rollback deployments');
    }
    const pinnedSet = new Set(pinnedTags);
    if (pinnedSet.size === 0) {
      throw new Error('fail-safe: pinnedTags cannot be empty; aborting cleanup to prevent deleting active tags');
    }
  }

  const pinned = new Set(pinnedTags || []);
  const newestFirst = [...versions].sort((a, b) => {
    const byDate = new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    return byDate !== 0 ? byDate : b.id - a.id;
  });

  const keep = new Set(newestFirst.slice(0, keepNewest).map((v) => v.id));
  
  // Bảo vệ bất kỳ version nào chứa tag nằm trong pinnedTags
  for (const v of newestFirst) {
    const vTags = tagsOf(v);
    if (vTags.some((t) => pinned.has(t))) {
      keep.add(v.id);
    }
  }

  return newestFirst.filter((v) => !keep.has(v.id)).reverse();
}

module.exports = { selectVersionsToDelete, DEFAULTS, tagsOf };
```

- [ ] **Step 4: Chạy, thấy xanh.**

Run: `node --test tools/tests/ghcr-retention.test.js`
Expected: 10 test PASS.

- [ ] **Step 5: Viết test đỏ cho workflow** — trong `tools/tests/workflows.test.js`:

  (a) **Thay** test cũ `ghcr-cleanup keeps 40 versions of both images weekly` bằng:

```js
test('ghcr-cleanup runs weekly over all three images through the tested retention helper', () => {
  const y = wf('ghcr-cleanup.yml');
  assert.match(y, /cron:/);
  assert.match(y, /ultimate-tckt-core/);
  assert.match(y, /ultimate-tckt-ctd-api/);
  assert.match(y, /ultimate-tckt-noti\b/);
  // Không dùng action chỉ giữ theo số lượng: `ignore-versions` của nó so với digest, không so được với tag.
  assert.doesNotMatch(y, /delete-package-versions/);
  assert.match(y, /require\('\.\/tools\/ghcr-retention\.js'\)/);
  assert.match(y, /permissions: \{ contents: read, packages: write \}/);
});
```

  (b) Thêm vào **cuối** file:

```js
// Chạy nguyên khối `script:` của ghcr-cleanup.yml với `github` giả, để kiểm phần keo nối ngoài hàm thuần.
function runCleanupScript({ versions, dryRun }) {
  const y = wf('ghcr-cleanup.yml');
  const lines = y.slice(y.indexOf('script: |\n') + 'script: |\n'.length).split('\n');
  const body = lines.filter((l) => l === '' || l.startsWith('            ')).map((l) => l.slice(12)).join('\n');
  const deleted = [];
  const logs = [];
  const listFn = () => {};
  const github = {
    paginate: async (fn, params) => {
      assert.equal(fn, listFn, 'phải phân trang đúng hàm liệt kê version của người dùng');
      assert.deepEqual(params, { package_type: 'container', package_name: 'ultimate-tckt-core', username: 'tduong-p', per_page: 100 });
      return versions;
    },
    rest: { packages: {
      getAllPackageVersionsForPackageOwnedByUser: listFn,
      deletePackageVersionForUser: async (p) => { deleted.push(p); },
    } },
  };
  const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
  const run = new AsyncFunction('require', 'github', 'context', 'core', 'process', body);
  const root = path.join(__dirname, '..', '..');
  return run((p) => require(path.join(root, p)), github, { repo: { owner: 'tduong-p' } },
    { info: (m) => logs.push(m) }, { env: { PACKAGE: 'ultimate-tckt-core', DRY_RUN: dryRun ? 'true' : 'false' } })
    .then(() => ({ deleted, logs }));
}
const fakeVersions = (n) => Array.from({ length: n }, (_, i) => ({
  id: i + 1, created_at: new Date(Date.UTC(2026, 0, 1) + i * 86400000).toISOString(), metadata: { container: { tags: [`sha${i + 1}`] } },
}));

test('ghcr-cleanup script deletes only what the helper selects, oldest first', async () => {
  const { deleted } = await runCleanupScript({ versions: fakeVersions(45), dryRun: false });
  assert.deepEqual(deleted.map((d) => d.package_version_id), [1, 2, 3, 4, 5]);
  assert.ok(deleted.every((d) => d.package_type === 'container' && d.package_name === 'ultimate-tckt-core' && d.username === 'tduong-p'));
});

test('ghcr-cleanup script in dry-run mode lists but deletes nothing', async () => {
  const { deleted, logs } = await runCleanupScript({ versions: fakeVersions(45), dryRun: true });
  assert.equal(deleted.length, 0);
  assert.ok(logs.some((l) => l.includes('dry run')), logs.join('\n'));
});

test('ghcr-cleanup: scheduled runs delete for real, manual runs default to dry-run', () => {
  const y = wf('ghcr-cleanup.yml');
  assert.match(y, /dry_run:\n\s+description: [^\n]+\n\s+type: boolean\n\s+default: true/);
  assert.ok(y.includes("DRY_RUN: ${{ (github.event_name == 'workflow_dispatch' && inputs.dry_run) && 'true' || 'false' }}"));
});

test('deploy.yml: production builds add a prod-<sha12> tag (the tag the retention helper protects)', () => {
  const y = wf('deploy.yml');
  for (const [job, image] of [['build-core', 'ultimate-tckt-core'], ['build-ctd-api', 'ultimate-tckt-ctd-api'], ['build-noti', 'ultimate-tckt-noti']]) {
    const start = y.indexOf(`\n  ${job}:`);
    const block = y.slice(start, y.indexOf('\n\n', start)); // các job cách nhau một dòng trống
    assert.ok(block.includes(`ghcr.io/tduong-p/${image}:\${{ needs.changes.outputs.tag }}`), `${job}: tag thường`);
    assert.ok(block.includes(`needs.changes.outputs.env == 'production' && format('ghcr.io/tduong-p/${image}:prod-{0}', needs.changes.outputs.tag) || ''`), `${job}: tag prod-`);
  }
});
```

- [ ] **Step 6: Chạy, thấy đỏ.**

Run: `node --test tools/tests/workflows.test.js`
Expected: các test ghcr-cleanup mới và test `prod-<sha12>` FAIL (workflow cũ vẫn dùng `delete-package-versions`, chưa có `script:`, chưa có `dry_run`).

- [ ] **Step 7: Cài đặt `.github/workflows/ghcr-cleanup.yml`** — thay toàn bộ file bằng:

```yaml
name: ghcr-cleanup
on:
  schedule:
    - cron: '0 3 * * 1'   # 10:00 thứ Hai giờ VN
  workflow_dispatch:
    inputs:
      dry_run:
        description: 'Chỉ liệt kê version sẽ xoá, không xoá'
        type: boolean
        default: true
jobs:
  cleanup:
    runs-on: ubuntu-latest
    permissions: { contents: read, packages: write }
    strategy:
      fail-fast: false
      matrix:
        package: [ultimate-tckt-core, ultimate-tckt-ctd-api, ultimate-tckt-noti]
    steps:
      - uses: actions/checkout@v4
      # Luật giữ nằm ở tools/ghcr-retention.js (có test): 40 version mới nhất + 5 version production mới nhất
      # (tag `prod-<sha12>` do build ở nhánh main gắn thêm). Chạy tay mặc định chỉ liệt kê (dry_run); lịch hằng tuần xoá thật.
      - uses: actions/github-script@v7
        env:
          PACKAGE: ${{ matrix.package }}
          DRY_RUN: ${{ (github.event_name == 'workflow_dispatch' && inputs.dry_run) && 'true' || 'false' }}
        with:
          script: |
            const { selectVersionsToDelete } = require('./tools/ghcr-retention.js');
            const owner = context.repo.owner;
            const packageName = process.env.PACKAGE;
            const dryRun = process.env.DRY_RUN === 'true';
            const versions = await github.paginate(github.rest.packages.getAllPackageVersionsForPackageOwnedByUser, {
              package_type: 'container', package_name: packageName, username: owner, per_page: 100,
            });
            const doomed = selectVersionsToDelete(versions);
            core.info(`${packageName}: ${versions.length} version, ${doomed.length} sẽ xoá${dryRun ? ' (dry run, không xoá gì)' : ''}`);
            for (const v of doomed) {
              const tags = (v.metadata?.container?.tags || []).join(',') || '(untagged)';
              core.info(`${dryRun ? 'sẽ xoá' : 'xoá'} ${v.id} ${tags}`);
              if (dryRun) continue;
              await github.rest.packages.deletePackageVersionForUser({
                package_type: 'container', package_name: packageName, username: owner, package_version_id: v.id,
              });
            }
```

  (Test `runCleanupScript` cắt khối `script: |` bằng cách bỏ 12 dấu cách đầu dòng: giữ đúng thụt lề 12 ở khối này.)

- [ ] **Step 8: Cài đặt `.github/workflows/deploy.yml`** — trong ba job build, thay dòng `tags:` một dòng bằng khối nhiều dòng (giữ nguyên các dòng
  `cache-from`, `cache-to` phía dưới):

  `build-core`, thay `tags: ghcr.io/tduong-p/ultimate-tckt-core:${{ needs.changes.outputs.tag }}` bằng:

```yaml
          # Build ở nhánh main (production) gắn thêm tag prod-<sha12>: tools/ghcr-retention.js giữ các tag này khi dọn GHCR.
          tags: |
            ghcr.io/tduong-p/ultimate-tckt-core:${{ needs.changes.outputs.tag }}
            ${{ needs.changes.outputs.env == 'production' && format('ghcr.io/tduong-p/ultimate-tckt-core:prod-{0}', needs.changes.outputs.tag) || '' }}
```

  `build-ctd-api`, thay dòng `tags: ghcr.io/tduong-p/ultimate-tckt-ctd-api:${{ needs.changes.outputs.tag }}` bằng:

```yaml
          # Build ở nhánh main (production) gắn thêm tag prod-<sha12>: tools/ghcr-retention.js giữ các tag này khi dọn GHCR.
          tags: |
            ghcr.io/tduong-p/ultimate-tckt-ctd-api:${{ needs.changes.outputs.tag }}
            ${{ needs.changes.outputs.env == 'production' && format('ghcr.io/tduong-p/ultimate-tckt-ctd-api:prod-{0}', needs.changes.outputs.tag) || '' }}
```

  `build-noti`, thay dòng `tags: ghcr.io/tduong-p/ultimate-tckt-noti:${{ needs.changes.outputs.tag }}` bằng:

```yaml
          # Build ở nhánh main (production) gắn thêm tag prod-<sha12>: tools/ghcr-retention.js giữ các tag này khi dọn GHCR.
          tags: |
            ghcr.io/tduong-p/ultimate-tckt-noti:${{ needs.changes.outputs.tag }}
            ${{ needs.changes.outputs.env == 'production' && format('ghcr.io/tduong-p/ultimate-tckt-noti:prod-{0}', needs.changes.outputs.tag) || '' }}
```

  Khi không phải production, dòng thứ hai rỗng; `docker/build-push-action` bỏ qua dòng trống trong danh sách tag.
  Noti chưa có production nên tag `prod-` của nó chưa bao giờ được sinh; để sẵn cho khi Noti lên production.

- [ ] **Step 9: Chạy, thấy xanh.**

Run: `node --test tools/tests/workflows.test.js`
Expected: toàn bộ PASS (test cũ "provenance: false" đếm 3 vẫn đúng).

- [ ] **Step 10: Tài liệu.**
  - `docs/ops/github.md` §6 (**MAJOR**: người đọc bản cũ tin rằng chỉ cần 40 bản mới nhất là đủ): thay câu về `min-versions-to-keep: 40`
    bằng: "`ghcr-cleanup.yml` chạy hằng tuần theo luật trong `tools/ghcr-retention.js`: giữ 40 version mới nhất và 5 version
    production mới nhất (tag `prod-<sha12>`, build ở nhánh `main` gắn thêm). Chạy tay (`workflow_dispatch`) mặc định chỉ liệt kê
    (`dry_run`). Lịch và `workflow_dispatch` luôn chạy theo bản workflow trên nhánh mặc định `main`."
  - `docs/ops/deploy-va-nhanh.md` §2 mục 4: build ở `main` đẩy thêm tag `<image>:prod-<sha12>`. Tăng MINOR. **Không** sửa §7.
  - `docs/playbooks/rollback.md` §1: để tìm tag cũ của production, dùng các tag `prod-<sha12>` trên GHCR (5 bản gần nhất được giữ). Tăng MINOR.
  - `docs/ai/bay-da-gap.md`: thêm mục "`ignore-versions` của `actions/delete-package-versions` so với digest chứ không so với tag
    container" và "bản `ghcr-cleanup` trên `main` mới là bản chạy theo lịch". Tăng MINOR.

- [ ] **Step 11:** `npm run test:tools && npm run docs:index && npm run docs:check -- --base origin/staging` — xanh.

- [ ] **Step 12:** Commit `ci(ghcr): keep production tags when pruning images`, mở PR vào `staging`.

- [ ] **Step 13 (người vận hành chạy, theo thứ tự):**
  1. **Ngay bây giờ, không đợi PR:** `main` đã có `ghcr-cleanup.yml` cũ (giữ 40 bản theo số lượng) chạy thứ Hai hằng tuần. Kiểm tag
     production đang chạy còn trên GHCR: lấy tag bằng `docker inspect --format '{{.Config.Image}}' ultimate-tckt-production-core-1`
     (tương tự `ctd-api`), đối chiếu với danh sách version của package (đọc, không xoá). Cân nhắc tạm tắt workflow cũ trên `main`
     cho tới khi bản mới lên `main` (cần ghi vào #50 mục 14).
  2. Sau khi bản mới lên `main` (lần `staging → main`), gắn tag `prod-` cho image **đang chạy** ở production, vì build kế tiếp mới tự gắn:

```bash
# Đăng nhập GHCR bằng cách của người vận hành (không dán token vào chat, tài liệu hay lệnh).
TAG=<tag-dang-chay>   # 12 ký tự, lấy từ docker inspect như trên
for IMG in ultimate-tckt-core ultimate-tckt-ctd-api; do
  docker buildx imagetools create -t ghcr.io/tduong-p/$IMG:prod-$TAG ghcr.io/tduong-p/$IMG:$TAG
done
```

  3. Chạy `ghcr-cleanup` bằng `workflow_dispatch` với `dry_run` mặc định (true), đọc log: danh sách "sẽ xoá" không được chứa tag đang
     chạy của staging hay production. Chỉ khi đúng mới để lịch tuần tự xoá thật. Nếu API trả 403 khi xoá, cấp lại quyền cho package ở
     GitHub → Packages → Package settings (Manage Actions access) rồi chạy lại.

---

### Task 5: `deploy.sh` tự quay về tag cũ khi health check hỏng (R17)

**Cổng:** #50 mục 2 — "`deploy.sh` lưu tag cũ trước khi `up`. Health hỏng thì `up` lại tag cũ rồi thoát với mã khác 0".
Phạm vi Task này **chỉ là `deploy.sh`**. Hai ý còn lại của mục 2 (`apply-infra.sh` kiểm health từng app; healthcheck compose cho `noti-api`
và worker chờ `service_healthy`) không nằm trong R17, để cho plan/PR khác sau khi #50 chốt.

Hiện `deploy.sh` hỏng health check thì để nguyên container lỗi, và `apply-infra.sh` lần sau còn đọc lại tag lỗi đó qua `ut_current_tag`.

**Files:**
- Modify: `infra/scripts/deploy.sh`
- Modify (test): `tools/tests/infra-deploy.test.js`
- Docs: `docs/ops/deploy-va-nhanh.md` (§3, §5), `docs/playbooks/rollback.md` (§1), `docs/ops/su-co.md` (§6), `docs/ai/bay-da-gap.md`

**Interfaces:**
- Consumes: `ut_current_tag ENV SERVICE`, `ut_app_tag_var APP`, `ut_health URL`, `ut_die MSG` (tất cả đã có trong `lib.sh`).
- Produces: hành vi: tag cũ được đọc **trước** `up`; thất bại health ⇒ `up` lại tag cũ ⇒ kiểm health lần nữa ⇒ **luôn thoát mã khác 0**.

- [ ] **Step 1: Viết test đỏ** — thêm vào **cuối** `tools/tests/infra-deploy.test.js`:

```js
// ---- Rollback tự động khi health check hỏng (#50 mục 2, SPEC-REL-001 R17) ----
const fs = require('node:fs');
const path = require('node:path');

// docker giả: ghi mỗi lệnh kèm ba biến tag, và trả image đang chạy của một container (hoặc rỗng = chưa từng deploy).
function stubDocker(sb, { container, image = '' }) {
  fs.writeFileSync(path.join(sb.bin, 'docker'), `#!/usr/bin/env bash
echo "docker $* CORE=\${CORE_IMAGE_TAG:-} CTD=\${CTD_API_IMAGE_TAG:-} NOTI=\${NOTI_IMAGE_TAG:-}" >> "${sb.logFile}"
case "$*" in *"inspect --format"*"${container}"*) printf '%s' "${image}" ;; esac
`, { mode: 0o755 });
}

// curl giả: lần gọi thứ n trả mã thứ n trong danh sách (mã cuối lặp lại).
function stubCurlSequence(sb, codes) {
  const counter = path.join(sb.root, 'curl.count');
  fs.writeFileSync(path.join(sb.bin, 'curl'), `#!/usr/bin/env bash
echo "curl $*" >> "${sb.logFile}"
n=$(cat "${counter}" 2>/dev/null || echo 0); echo $((n + 1)) > "${counter}"
codes=(${codes.join(' ')})
i=$n; (( i >= \${#codes[@]} )) && i=$(( \${#codes[@]} - 1 ))
printf '%s' "\${codes[$i]}"
`, { mode: 0o755 });
}

const ups = (sb, svc) => sb.calls().filter((l) => l.startsWith('docker compose') && l.includes(` up -d --no-deps ${svc} `));

test('deploy.sh health failure restores the previous tag, re-checks health, and still exits non-zero', () => {
  const sb = makeSandbox();
  stubDocker(sb, { container: 'ultimate-tckt-staging-core-1', image: 'ghcr.io/tduong-p/ultimate-tckt-core:oldoldold001' });
  stubCurlSequence(sb, ['502', '502', '200']); // UT_HEALTH_TIMEOUT=1, interval 0 → 2 lần thử mỗi đợt kiểm
  const r = sb.run('deploy.sh', ['staging', 'core', 'newnewnew002'], { UT_HEALTH_TIMEOUT: '1' });
  assert.notEqual(r.status, 0, 'CI phải đỏ dù đã quay về được');
  assert.match(r.stderr, /ROLLBACK: core@newnewnew002 failed its health check; restoring core@oldoldold001/);
  assert.match(r.stderr, /rolled back to core@oldoldold001 \(healthy\)/);
  assert.match(r.stderr, /migrations .* NOT reversed/);
  const u = ups(sb, 'core');
  assert.equal(u.length, 2, sb.calls().join('\n'));
  assert.ok(u[0].includes('CORE=newnewnew002'), u[0]);
  assert.ok(u[1].includes('CORE=oldoldold001'), u[1]);
  assert.ok(!sb.calls().some((l) => l.includes('image prune')), 'không dọn image khi deploy thất bại');
});

test('deploy.sh says so loudly when the rollback itself is unhealthy', () => {
  const sb = makeSandbox({ curlCode: '502' });
  stubDocker(sb, { container: 'ultimate-tckt-staging-core-1', image: 'ghcr.io/tduong-p/ultimate-tckt-core:oldoldold001' });
  const r = sb.run('deploy.sh', ['staging', 'core', 'newnewnew002'], { UT_HEALTH_TIMEOUT: '1' });
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /rollback to core@oldoldold001 also failed its health check/);
  assert.equal(ups(sb, 'core').length, 2);
});

test('deploy.sh first deploy (no running container) does not try to roll back', () => {
  const sb = makeSandbox({ curlCode: '502' });
  stubDocker(sb, { container: 'ultimate-tckt-staging-core-1', image: '' });
  const r = sb.run('deploy.sh', ['staging', 'core', 'newnewnew002'], { UT_HEALTH_TIMEOUT: '1' });
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /no different previous tag to restore/);
  assert.equal(ups(sb, 'core').length, 1, sb.calls().join('\n'));
});

test('deploy.sh redeploying the tag that already runs does not "roll back" onto itself', () => {
  const sb = makeSandbox({ curlCode: '502' });
  stubDocker(sb, { container: 'ultimate-tckt-staging-core-1', image: 'ghcr.io/tduong-p/ultimate-tckt-core:samesamesame' });
  const r = sb.run('deploy.sh', ['staging', 'core', 'samesamesame'], { UT_HEALTH_TIMEOUT: '1' });
  assert.notEqual(r.status, 0);
  assert.equal(ups(sb, 'core').length, 1, sb.calls().join('\n'));
});

test('deploy.sh healthy deploy is unchanged: one up, image prune, exit 0, no rollback message', () => {
  const sb = makeSandbox();
  stubDocker(sb, { container: 'ultimate-tckt-staging-core-1', image: 'ghcr.io/tduong-p/ultimate-tckt-core:oldoldold001' });
  const r = sb.run('deploy.sh', ['staging', 'core', 'newnewnew002']);
  assert.equal(r.status, 0, r.stderr);
  assert.doesNotMatch(r.stderr, /ROLLBACK/);
  assert.equal(ups(sb, 'core').length, 1);
  assert.ok(sb.calls().some((l) => l.includes('image prune')));
});

test('deploy.sh noti rolls BOTH noti services back to the previous tag, and leaves core and ctd-api alone', () => {
  const sb = makeSandbox();
  stubDocker(sb, { container: 'ultimate-tckt-staging-noti-api-1', image: 'ghcr.io/tduong-p/ultimate-tckt-noti:oldnotiold01' });
  stubCurlSequence(sb, ['502', '502', '200']);
  const r = sb.run('deploy.sh', ['staging', 'noti', 'newnotinew02'], { UT_HEALTH_TIMEOUT: '1' });
  assert.notEqual(r.status, 0);
  const u = ups(sb, 'noti-api noti-worker');
  assert.equal(u.length, 2, sb.calls().join('\n'));
  assert.ok(u[0].includes('NOTI=newnotinew02'), u[0]);
  assert.ok(u[1].includes('NOTI=oldnotiold01'), u[1]);
  assert.ok(!sb.calls().some((l) => / up -d --no-deps (core|ctd-api)( |$)/.test(l)));
});

test('deploy.sh rolling back one app keeps the other apps on the tags they were running', () => {
  const sb = makeSandbox();
  // docker giả trả image khác nhau tuỳ container: core đang chạy bản cũ, ctd-api đang chạy ctdctdctd001
  fs.writeFileSync(path.join(sb.bin, 'docker'), `#!/usr/bin/env bash
echo "docker $* CORE=\${CORE_IMAGE_TAG:-} CTD=\${CTD_API_IMAGE_TAG:-}" >> "${sb.logFile}"
case "$*" in
  *"inspect --format"*"staging-core-1"*) printf '%s' 'ghcr.io/x/ultimate-tckt-core:oldoldold001' ;;
  *"inspect --format"*"staging-ctd-api-1"*) printf '%s' 'ghcr.io/x/ultimate-tckt-ctd-api:ctdctdctd001' ;;
esac
`, { mode: 0o755 });
  stubCurlSequence(sb, ['502', '502', '200']);
  sb.run('deploy.sh', ['staging', 'core', 'newnewnew002'], { UT_HEALTH_TIMEOUT: '1' });
  const u = ups(sb, 'core');
  assert.ok(u.every((l) => l.includes('CTD=ctdctdctd001')), u.join('\n'));
});
```

- [ ] **Step 2: Chạy, thấy đỏ.**

Run: `node --test tools/tests/infra-deploy.test.js`
Expected: 4 test mới FAIL (không có dòng `ROLLBACK:`; chỉ một lần `up`): "restores the previous tag", "says so loudly", "noti rolls BOTH", và thông báo "no different previous tag"
của "first deploy". Các test còn lại PASS.

- [ ] **Step 3: Cài đặt `infra/scripts/deploy.sh`** — thay toàn bộ file bằng:

```bash
#!/usr/bin/env bash
# Usage: deploy.sh <staging|production> <core|ctd-api|noti> <image-tag>
# Chạy TRÊN VM (GitHub Actions SSH vào và gọi). Chỉ đụng service của một app trong một môi trường.
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"

ENV="${1:-}"; APP="${2:-}"; TAG="${3:-}"
BRANCH="$(ut_env_branch "$ENV")"
read -ra SERVICES <<< "$(ut_app_service "$APP")"
[[ -n "$TAG" ]] || ut_die "Usage: deploy.sh <staging|production> <core|ctd-api|noti> <image-tag>"
# Kiểm cổng trước khi đụng git: app chưa cấu hình cho môi trường này (vd noti ở production) thì dừng ngay.
PORT="$(ut_app_port "$ENV" "$APP")"

ut_lock "$ENV"
git -C "$(ut_env_dir "$ENV")" pull --ff-only origin "$BRANCH"

# Tag đang chạy của app này, lấy TRƯỚC khi `up`, để quay về nếu bản mới hỏng health check.
# Rỗng = chưa từng deploy app này ở môi trường này: không có gì để quay về.
PREV_TAG="$(ut_current_tag "$ENV" "${SERVICES[0]}" || true)"

# Giữ tag của các app còn lại để compose không đòi biến rỗng.
export CORE_IMAGE_TAG="${CORE_IMAGE_TAG:-$(ut_current_tag "$ENV" core)}"
export CTD_API_IMAGE_TAG="${CTD_API_IMAGE_TAG:-$(ut_current_tag "$ENV" ctd-api)}"
export NOTI_IMAGE_TAG="${NOTI_IMAGE_TAG:-$(ut_current_tag "$ENV" noti-api)}"
TAG_VAR="$(ut_app_tag_var "$APP")"
export "$TAG_VAR=$TAG"
# App còn lại chưa từng chạy -> tag rỗng làm ${VAR:?} của compose lỗi. Giá trị giả chỉ để nội suy;
# --no-deps đảm bảo service kia không bị pull/up.
: "${CORE_IMAGE_TAG:=$TAG}" "${CTD_API_IMAGE_TAG:=$TAG}" "${NOTI_IMAGE_TAG:=$TAG}"
export CORE_IMAGE_TAG CTD_API_IMAGE_TAG NOTI_IMAGE_TAG

ut_compose "$ENV" pull "${SERVICES[@]}"
ut_compose "$ENV" up -d --no-deps "${SERVICES[@]}"
HEALTH_URL="http://127.0.0.1:$PORT$(ut_app_health_path "$APP")"
if ! ut_health "$HEALTH_URL"; then
  if [[ -n "$PREV_TAG" && "$PREV_TAG" != "$TAG" ]]; then
    echo "ROLLBACK: $APP@$TAG failed its health check; restoring $APP@$PREV_TAG" >&2
    export "$TAG_VAR=$PREV_TAG"
    ut_compose "$ENV" up -d --no-deps "${SERVICES[@]}"
    if ut_health "$HEALTH_URL"; then
      ut_die "deploy of $APP@$TAG FAILED; rolled back to $APP@$PREV_TAG (healthy). Core migrations run at startup and are NOT reversed by an image rollback — see docs/playbooks/rollback.md"
    fi
    ut_die "deploy of $APP@$TAG FAILED and the rollback to $APP@$PREV_TAG also failed its health check — intervene by hand (docs/ops/su-co.md)"
  fi
  ut_die "deploy of $APP@$TAG FAILED; no different previous tag to restore (first deploy of $APP in $ENV, or same tag) — the failing container is left running for inspection"
fi
docker image prune -f >/dev/null
echo "Deployed $APP@$TAG to $ENV"
```

  Ghi chú thiết kế: `|| true` cần thiết vì `ut_current_tag` trả mã 1 khi không có container (`[[ … ]] && echo`), và `set -e` sẽ
  thoát script ở phép gán. Thoát mã khác 0 **kể cả khi rollback thành công** để job CI đỏ (người dùng phải biết bản mới đã hỏng). Rollback ảnh
  **không** đảo migration Core đã chạy lúc khởi động (`docs/dev/db-migration.md`): thông báo cuối nhắc điều đó.

- [ ] **Step 4: Chạy, thấy xanh.**

Run: `node --test tools/tests/infra-deploy.test.js`
Expected: 17 test PASS (10 cũ + 7 mới). Test cũ "exits non-zero when health check never returns 200" vẫn PASS (`/health/i` còn khớp thông báo mới).

- [ ] **Step 5: Tài liệu.**
  - `docs/ops/deploy-va-nhanh.md` §3 (**MAJOR**: người đọc bản cũ tin rằng container lỗi bị để nguyên): mô tả luồng mới: đọc tag đang chạy → `up` tag mới → health;
    hỏng thì `up` lại tag cũ, kiểm health lần hai, **thoát mã khác 0 dù đã quay về được**, in cảnh báo migration không đảo; lần deploy đầu tiên của một app
    (không có tag cũ) hoặc cùng tag thì không có gì để quay về, container lỗi để nguyên để điều tra. §5: nhắc rollback thủ công vẫn dùng
    `deploy.sh <env> <app> <tag-cu>`. **Không** sửa §7.
  - `docs/playbooks/rollback.md` §1: thêm "Deploy lỗi health thì `deploy.sh` đã tự quay về tag cũ; chỉ rollback tay khi lỗi lộ ra sau health check hoặc khi
    cả hai bản đều không khoẻ". Tăng MINOR.
  - `docs/ops/su-co.md` §6 ("Health check fail liên tục sau deploy"): job đỏ kèm dòng `ROLLBACK:` nghĩa là dịch vụ đang chạy bản cũ (kiểm bằng `curl /api/health`);
    đỏ kèm "also failed" nghĩa là phải can thiệp tay. Tăng MINOR.
  - `docs/ai/bay-da-gap.md`: thêm mục "CI đỏ sau deploy không có nghĩa dịch vụ chết: `deploy.sh` có thể đã tự quay về; và lần deploy đầu tiên sau khi merge bản
    `deploy.sh` mới vẫn chạy bản cũ trên VM (script tự `git pull` rồi mới có bản mới)". Tăng MINOR.

- [ ] **Step 6:** `npm run test:tools && npm run docs:index && npm run docs:check -- --base origin/staging` — xanh.

- [ ] **Step 7:** Commit `feat(infra): deploy.sh restores the previous tag when the health check fails`, mở PR vào `staging`.

- [ ] **Step 8 (người vận hành chạy sau khi merge):** lần deploy ngay sau merge vẫn dùng `deploy.sh` cũ (bẫy "script trên VM chạy bản cũ trước khi
  `git pull`"), nên chỉ thử sau lần deploy thứ hai. Thử thật trên **staging** một lần (theo #50 mục 2): đẩy lên `staging` một commit thử làm `/api/health`
  của Core trả 500, rồi revert. Kỳ vọng ở log job `deploy-core`: có dòng `ROLLBACK: core@… failed its health check`, job đỏ, và
  `curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:3000/api/health` trên VM trả `200` với image tag cũ
  (`docker inspect --format '{{.Config.Image}}' ultimate-tckt-staging-core-1`). Không thử trên production.

---

### Task 6: compose chuyển `AZURE_*` vào Core (R18)

**Cổng:** #50 mục 4 — thêm `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET` (`${CORE_AZURE_…:-}`) vào cả hai compose và `.env.example`.

Hiện nút "Đăng nhập Microsoft" luôn trả 503 vì `core/src/routes/system.js` kiểm `clientId` và `clientSecret`, mà compose không truyền biến nào;
`docs/onboarding/ban-giao.md` lại ghi "chỉ cần đặt trong `.env`". Dùng `:-` (không `:?`): thiếu SSO chỉ làm `/auth/microsoft` trả 503, không được làm Core không khởi động.
`AZURE_TENANT`, `AZURE_REDIRECT_URI`, `AZURE_ALLOWED_DOMAIN` đã có mặc định đúng trong `core/src/config/environment.js`, không chuyển vào.

**Files:**
- Modify: `infra/compose/docker-compose.staging.yml`, `infra/compose/docker-compose.production.yml`
- Modify: `infra/.env.example`
- Modify: `infra/scripts/bootstrap-vm.sh`
- Modify (test): `tools/tests/compose.test.js`, `tools/tests/infra-bootstrap.test.js`
- Docs: `docs/ops/moi-truong.md` (§4), `docs/onboarding/ban-giao.md`

**Interfaces:**
- Produces: trong `compose.test.js`, helper `serviceEnv(env, service)` (khối `environment:` của một service). Task 7 dùng lại.
- Cảnh báo bẫy "đổi cùng lúc script VM và compose": biến mới dùng `:-` nên script cũ trên VM vẫn chạy được với compose mới.

- [ ] **Step 1: Viết test đỏ** — thêm vào **cuối** `tools/tests/compose.test.js`:

```js
// Khối `environment:` của một service trong compose (từ `environment:` tới `ports:`/`volumes:` kế tiếp).
function serviceEnv(env, service) {
  const y = read(`infra/compose/docker-compose.${env}.yml`);
  const start = y.search(new RegExp(`^  ${service}:`, 'm'));
  assert.ok(start >= 0, `service ${service} not found in ${env}`);
  const rest = y.slice(start + 1);
  const end = rest.search(/^  [a-z][a-z0-9-]*:\s*$/m);
  const block = end >= 0 ? rest.slice(0, end) : rest;
  const from = block.indexOf('    environment:');
  const to = block.search(/^    (ports|volumes|depends_on|command):/m);
  return block.slice(from, to > from ? to : undefined);
}

for (const env of ['staging', 'production']) {
  test(`${env} core receives the Microsoft SSO credentials from .env (empty when not configured)`, () => {
    const core = serviceEnv(env, 'core');
    assert.match(core, /^      AZURE_CLIENT_ID: \$\{CORE_AZURE_CLIENT_ID:-\}$/m);
    assert.match(core, /^      AZURE_CLIENT_SECRET: \$\{CORE_AZURE_CLIENT_SECRET:-\}$/m);
    // Không `:?`: thiếu SSO chỉ làm /auth/microsoft trả 503, không được làm container không khởi động.
    assert.doesNotMatch(core, /CORE_AZURE_[A-Z_]+:\?/);
    // Tenant, redirect và domain có mặc định đúng trong core/src/config/environment.js, không chuyển vào.
    assert.doesNotMatch(core, /AZURE_(TENANT|REDIRECT_URI|ALLOWED_DOMAIN)/);
  });
}

test('.env.example lists the optional Azure SSO variables, empty', () => {
  const ex = read('infra/.env.example');
  assert.match(ex, /^CORE_AZURE_CLIENT_ID=$/m);
  assert.match(ex, /^CORE_AZURE_CLIENT_SECRET=$/m);
});
```

  Và thêm vào **cuối** `tools/tests/infra-bootstrap.test.js`:

```js
test('bootstrap-vm.sh treats the Microsoft SSO keys as optional (an old .env without them still bootstraps)', () => {
  const sb = makeSandbox();
  const { oldDir, envFile } = prep(sb, OLD);
  const r = sb.run('bootstrap-vm.sh', ['staging'], { UT_OLD_ENV_DIR: oldDir });
  assert.equal(r.status, 0, r.stderr);
  assert.doesNotMatch(r.stderr, /CORE_AZURE/);
  assert.ok(fs.existsSync(envFile));
});

test('bootstrap-vm.sh carries over SSO keys when the old env already has them', () => {
  const sb = makeSandbox();
  const { oldDir, envFile } = prep(sb, `${OLD}\nTCKT_AZURE_CLIENT_ID=app-id-from-old-env\n`);
  const r = sb.run('bootstrap-vm.sh', ['staging'], { UT_OLD_ENV_DIR: oldDir });
  assert.equal(r.status, 0, r.stderr);
  // TCKT_ -> CORE_ là phép đổi tiền tố có sẵn; khoá SSO đi theo quy tắc đó.
  assert.match(fs.readFileSync(envFile, 'utf8'), /^CORE_AZURE_CLIENT_ID=app-id-from-old-env$/m);
});
```

- [ ] **Step 2: Chạy, thấy đỏ.**

Run: `node --test tools/tests/compose.test.js`
Expected: 3 test FAIL (hai test compose của `staging`/`production` và test `.env.example`). Hai test bootstrap mới đang PASS (chưa có khoá SSO trong `.env.example`): chúng chỉ có
ý nghĩa sau Step 4.

- [ ] **Step 3: Cài đặt compose và `.env.example`.**

  Trong **cả hai** `infra/compose/docker-compose.{staging,production}.yml`, ngay sau dòng `DEVOPS_EMAILS: ${CORE_DEVOPS_EMAILS:-}` của service `core`:

```yaml
      DEVOPS_EMAILS: ${CORE_DEVOPS_EMAILS:-}
      # Đăng nhập Microsoft (SSO). Trống = /auth/microsoft trả 503, đăng nhập mật khẩu vẫn chạy (core/src/config/environment.js).
      AZURE_CLIENT_ID: ${CORE_AZURE_CLIENT_ID:-}
      AZURE_CLIENT_SECRET: ${CORE_AZURE_CLIENT_SECRET:-}
```

  Trong `infra/.env.example`, ngay sau dòng `CORE_DEVOPS_EMAILS=`:

```
CORE_DEVOPS_EMAILS=
# Đăng nhập Microsoft (tuỳ chọn): app registration của tenant. Trống = chỉ đăng nhập bằng mật khẩu (/auth/microsoft trả 503)
CORE_AZURE_CLIENT_ID=
CORE_AZURE_CLIENT_SECRET=
```

- [ ] **Step 4: Chạy lại, thấy bẫy bootstrap.**

Run: `npm run test:tools`
Expected: test compose PASS, nhưng `bootstrap-vm.sh renames TCKT_ keys…` và `bootstrap-vm.sh treats the Microsoft SSO keys as optional…` **FAIL**: `exit 2`,
`missing required variables … CORE_AZURE_CLIENT_ID CORE_AZURE_CLIENT_SECRET`. Lý do: `bootstrap-vm.sh` coi mọi khoá trong `.env.example` là bắt buộc trừ danh sách ngoại lệ.

- [ ] **Step 5: Sửa `infra/scripts/bootstrap-vm.sh`** — trong vòng `while`, thêm một dòng ngay sau dòng ngoại lệ `CORE_DEVOPS_EMAILS`/`CORE_NOTI_API_KEY`:

```bash
  [[ "$key" == "CORE_DEVOPS_EMAILS" || "$key" == "CORE_NOTI_API_KEY" ]] && continue   # tuỳ chọn
  [[ "$key" == CORE_AZURE_* ]] && continue   # SSO Microsoft tuỳ chọn: thiếu thì /auth/microsoft trả 503, đăng nhập mật khẩu vẫn chạy
  [[ "$key" == NOTI_* ]] && continue   # Noti có sau bootstrap: thêm tay theo docs/ops/moi-truong.md
```

- [ ] **Step 6: Chạy, thấy xanh.**

Run: `npm run test:tools`
Expected: toàn bộ PASS.

- [ ] **Step 7: Tài liệu.**
  - `docs/ops/moi-truong.md` §4: thêm `CORE_AZURE_CLIENT_ID, CORE_AZURE_CLIENT_SECRET (tuỳ chọn; trống = SSO trả 503)` vào danh sách biến; thêm đoạn: đặt hai biến trong `.env` trên VM
    rồi `apply-infra.sh <env>` để tạo lại container `core`; redirect URI phải đăng ký ở Azure App Registration là
    `https://<tên miền của môi trường>/auth/microsoft/callback`; tenant mặc định `hust.edu.vn`. Chỉ ghi tên biến, không ghi giá trị. Tăng MINOR.
  - `docs/onboarding/ban-giao.md` (dòng Azure App Registration): sửa "chỉ cần đặt trong `.env`" thành "đặt `CORE_AZURE_CLIENT_ID/SECRET` trong `.env` trên VM rồi chạy
    `apply-infra.sh <env>`" (trước đây đặt biến ở đó không có tác dụng). Tăng MAJOR (người đọc bản cũ làm theo thì không có gì xảy ra).

- [ ] **Step 8:** `npm run test:tools && npm run docs:index && npm run docs:check -- --base origin/staging` — xanh.

- [ ] **Step 9:** Commit `fix(compose): pass the Microsoft SSO credentials to Core`, mở PR vào `staging`.

- [ ] **Step 10 (người vận hành chạy sau khi merge, khi đã có app registration):** thêm hai khoá vào `/opt/ultimate-tckt/<env>/infra/.env` **bằng tay** (không dán giá trị vào chat/tài liệu), rồi
  `bash /opt/ultimate-tckt/<env>/infra/scripts/apply-infra.sh <env>`. Kiểm:

```bash
curl -s -o /dev/null -w '%{http_code}\n' https://tckt-hub-staging.duckdns.org/auth/microsoft   # 302 (trước đây 503)
```

  Việc hiện nút SSO ở giao diện (`SSO_READY` trong SPEC-SOON-001) nằm ngoài Task này.

---

### Task 7: gỡ biến env thừa khỏi compose (R19)

**Cổng:** #50 mục 6 — **Giữ biến `SETTINGS_ENCRYPTION_KEY` và giữ bất biến #3**. Chỉ gỡ các biến thật sự thừa mà `core/src` không đọc: `APP_ENV` và `EMAIL_NOTIFICATIONS_ENABLED` khỏi Core compose.

`SETTINGS_ENCRYPTION_KEY` (và `CORE_SETTINGS_ENCRYPTION_KEY`) tiếp tục được giữ nguyên trong compose, `.env.example`, `bootstrap-vm.sh` và bất biến #3 để bảo vệ dữ liệu cấu hình đã lưu và tính toàn vẹn hệ thống cho đến khi có ADR riêng sau pilot.
Core không đọc `APP_ENV` và `EMAIL_NOTIFICATIONS_ENABLED` (hệ thống email cũ đã được dỡ bỏ ở ADR-0013). `ctd-api` **vẫn đọc** `APP_ENV` (`services/ctd-api/backend/app/config.py`), giữ nguyên.

**Files:**
- Modify: `infra/compose/docker-compose.staging.yml`, `infra/compose/docker-compose.production.yml`
- Modify (test): `tools/tests/compose.test.js`
- Docs: `docs/ops/moi-truong.md` (§5)

**Interfaces:**
- Consumes: `serviceEnv(env, service)` từ Task 6.
- Produces: trong `compose.test.js`, test kiểm tra `APP_ENV` và `EMAIL_NOTIFICATIONS_ENABLED` đã được gỡ khỏi service `core`, đồng thời xác nhận `SETTINGS_ENCRYPTION_KEY` vẫn được giữ lại đầy đủ.

- [ ] **Step 1: Viết test đỏ.**

  (a) Trong `tools/tests/compose.test.js`, sửa kiểm tra môi trường `core`:

```js
  test(`${env} core environment does not pass APP_ENV and EMAIL_NOTIFICATIONS_ENABLED`, () => {
    const envBlock = serviceEnv(env, 'core');
    assert.doesNotMatch(envBlock, /APP_ENV:/);
    assert.doesNotMatch(envBlock, /EMAIL_NOTIFICATIONS_ENABLED:/);
  });

  test(`${env} core retains SETTINGS_ENCRYPTION_KEY (invariant #3 preserved per decision #50)`, () => {
    const y = read(`infra/compose/docker-compose.${env}.yml`);
    assert.match(y, /SETTINGS_ENCRYPTION_KEY: \$\{CORE_SETTINGS_ENCRYPTION_KEY:\?/);
    assert.match(read('infra/.env.example'), /CORE_SETTINGS_ENCRYPTION_KEY=/);
  });

  test(`${env} ctd-api keeps APP_ENV (the Python service reads it)`, () => {
    assert.match(serviceEnv(env, 'ctd-api'), new RegExp(`^      APP_ENV: ${env}$`, 'm'));
  });
```

- [ ] **Step 2: Chạy, thấy đỏ.**

Run: `npm run test:tools`
Expected: 2 test FAIL (thấy `APP_ENV` và `EMAIL_NOTIFICATIONS_ENABLED` vẫn còn trong compose `core`).

- [ ] **Step 3: Cài đặt compose.**

  Trong **cả hai** compose, xoá khỏi service `core` các dòng:

```yaml
      APP_ENV: staging
      EMAIL_NOTIFICATIONS_ENABLED: "false"
```
  (production dùng `APP_ENV: production`). Giữ nguyên dòng:
```yaml
      SETTINGS_ENCRYPTION_KEY: ${CORE_SETTINGS_ENCRYPTION_KEY:?}
```
  Service `ctd-api` giữ nguyên dòng `APP_ENV` của nó. File `.env.example`, `bootstrap-vm.sh` và `core/.env.example` giữ nguyên `CORE_SETTINGS_ENCRYPTION_KEY`.

- [ ] **Step 4: Chạy, thấy xanh.**

Run: `npm run test:tools`
Expected: toàn bộ PASS.

- [ ] **Step 5: Tài liệu.**
  - `docs/ops/moi-truong.md` §5: cập nhật bỏ ghi chú về `EMAIL_NOTIFICATIONS_ENABLED` khỏi Core. Bất biến #3 (`SETTINGS_ENCRYPTION_KEY`) giữ nguyên.
  - `docs/ai/bay-da-gap.md`: bổ sung ghi chú về việc giữ `SETTINGS_ENCRYPTION_KEY` để tránh regression cấu hình đã mã hóa.
  - Tăng MINOR `docs/ops/moi-truong.md`.

- [ ] **Step 6:** `npm run test:tools && npm run docs:index && npm run docs:check -- --base origin/staging` — xanh.

- [ ] **Step 7:** Commit `chore(compose): drop dead APP_ENV and EMAIL_NOTIFICATIONS_ENABLED from core`, mở PR vào `staging`.

- [ ] **Step 8 (người vận hành chạy sau khi merge):** job `infra` tự `apply-infra.sh` và tạo lại container `core`. Kiểm:
  `curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:3000/api/health` trả 200 (production: cổng 3001).


---

### Task 8: giới hạn tần suất đăng nhập mật khẩu ở nginx (R20)

**Cổng:** c32 của SPEC-PILOT-001 ("giới hạn tần suất đăng nhập: `limit_req` ở nginx", liên module/hạ tầng). Tham số dưới đây là **đề xuất của plan**, phải được ghi vào #50 (hoặc issue gom
của c32) trước khi làm: `10r/m` theo IP, `burst=20 nodelay`, trả `429`. Pilot chỉ dùng đăng nhập bằng mật khẩu nên đây là chống đoán mật khẩu.

Ba bẫy nginx phải được ghim bằng test:
- `limit_req_zone` chỉ hợp lệ trong ngữ cảnh `http`. `apply-infra.sh` đặt file vào `sites-enabled`, nơi `nginx.conf` `include` bên trong `http`, nên khai báo **ngoài khối `server`** ở đầu file là đúng.
- staging và production nạp **chung một nginx**: trùng tên zone làm `nginx -t` lỗi (và theo bất biến #9, lỗi này làm chết cả hai môi trường). Zone có tiền tố môi trường.
- `location` riêng không thừa kế `proxy_set_header` của `location /`: phải lặp lại `proxy_pass` và bốn header.

**Files:**
- Modify: `infra/nginx/staging/core.conf`, `infra/nginx/production/core.conf`
- Modify (test): `tools/tests/nginx.test.js` (do Task 1 tạo)
- Docs: `docs/ops/moi-truong.md` (§7), `docs/dev/api.md`, `docs/ai/bay-da-gap.md`

**Interfaces:**
- Consumes: `conf(env, app)`, `sslServer(text)` từ `nginx.test.js` (Task 1).
- Produces: zone `ut_staging_login` / `ut_production_login`; `location = /api/login` giới hạn `10r/m`, `burst=20 nodelay`, `429`.

- [ ] **Step 1: Viết test đỏ** — thêm vào **cuối** `tools/tests/nginx.test.js`:

```js
const CORE_PORT = { staging: 3000, production: 3001 };
const zoneOf = (text) => (text.match(/^limit_req_zone \$binary_remote_addr zone=([a-z_]+):10m rate=10r\/m;/m) || [])[1];

for (const env of ['staging', 'production']) {
  test(`${env} core.conf rate-limits password login with 429, only on that location`, () => {
    const text = conf(env, 'core');
    const zone = `ut_${env}_login`;
    // limit_req_zone phải nằm ngoài mọi khối server (ngữ cảnh http), nếu không `nginx -t` lỗi.
    assert.equal(zoneOf(text.split(/^server \{/m)[0]), zone);
    const block = sslServer(text);
    const login = block.match(/location = \/api\/login \{[^}]*\}/);
    assert.ok(login, 'thiếu `location = /api/login`');
    assert.ok(login[0].includes(`limit_req zone=${zone} burst=20 nodelay;`), login[0]);
    assert.ok(login[0].includes('limit_req_status 429;'), login[0]);
    // Location riêng không thừa kế proxy_set_header của `location /`: phải có đủ cùng upstream và header.
    assert.ok(login[0].includes(`proxy_pass http://127.0.0.1:${CORE_PORT[env]};`), login[0]);
    for (const h of ['Host $host', 'X-Real-IP $remote_addr', 'X-Forwarded-For $proxy_add_x_forwarded_for', 'X-Forwarded-Proto $scheme']) {
      assert.ok(login[0].includes(`proxy_set_header ${h};`), `thiếu proxy_set_header ${h}`);
    }
    // Hạn mức chỉ gắn vào đăng nhập: một limit_req ở cấp server hay `location /` sẽ làm chậm cả ứng dụng.
    assert.equal((block.match(/^\s*limit_req\s/gm) || []).length, 1, 'chỉ một limit_req, trong location đăng nhập');
  });
}

test('staging and production use different limit_req_zone names (one shared nginx loads both files)', () => {
  const zones = ['staging', 'production'].map((env) => zoneOf(conf(env, 'core')));
  assert.ok(zones.every(Boolean), zones.join(','));
  assert.notEqual(zones[0], zones[1]);
});
```

- [ ] **Step 2: Chạy, thấy đỏ.**

Run: `node --test tools/tests/nginx.test.js`
Expected: 3 test mới FAIL (`undefined !== 'ut_staging_login'`, …); bốn test của Task 1 vẫn PASS.

- [ ] **Step 3: Cài đặt** — trong **mỗi** `infra/nginx/<env>/core.conf`:

  (a) Thêm vào **đầu file**, trước khối `server {` đầu tiên (staging dùng `ut_staging_login`, production dùng `ut_production_login`):

```nginx
# Giới hạn tần suất đăng nhập mật khẩu theo IP (SPEC-REL-001 R20). Dòng này nằm ngoài `server`, nên nginx nạp
# nó ở ngữ cảnh `http` (apply-infra.sh đặt file vào sites-enabled, nơi nginx.conf include trong `http`).
# Tên zone có tiền tố môi trường: staging và production nạp chung một nginx, trùng tên zone làm `nginx -t` lỗi.
limit_req_zone $binary_remote_addr zone=ut_staging_login:10m rate=10r/m;

```

  (b) Trong khối `server` 443, ngay **trước** `location / {`, thêm (staging dùng cổng `3000`, production dùng `ut_production_login` và cổng `3001`):

```nginx
    # Chỉ đăng nhập bằng mật khẩu (chống đoán mật khẩu). Quá hạn mức trả 429 thay vì 503 mặc định.
    location = /api/login {
        limit_req zone=ut_staging_login burst=20 nodelay;
        limit_req_status 429;
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

```

  Kết quả `infra/nginx/production/core.conf` (phần đầu): `limit_req_zone $binary_remote_addr zone=ut_production_login:10m rate=10r/m;`,
  `limit_req zone=ut_production_login burst=20 nodelay;`, `proxy_pass http://127.0.0.1:3001;`. Không đổi `ctd.conf` (CTD đăng nhập bằng OTP, là quyết định riêng).

- [ ] **Step 4: Chạy, thấy xanh.**

Run: `node --test tools/tests/nginx.test.js`
Expected: 8 test PASS.

- [ ] **Step 5: Tài liệu.**
  - `docs/ops/moi-truong.md` §7: thêm đoạn "Giới hạn đăng nhập": `/api/login` bị giới hạn 10 yêu cầu/phút theo IP, cho phép burst 20, vượt thì nginx trả **429** (không tới được Core);
    zone `ut_<env>_login` khai báo ở ngữ cảnh `http` và phải khác tên giữa hai môi trường vì chung nginx; người dùng chung một IP (mạng trường, NAT) dùng chung hạn mức, nên triệu chứng
    "nhiều người cùng bị 429" nghĩa là cần nâng `rate`/`burst`. Tăng MINOR.
  - `docs/dev/api.md` (dòng `POST /api/login`): thêm "nginx giới hạn 10 yêu cầu/phút/IP (burst 20), vượt thì 429; frontend phải hiển thị thông báo thử lại sau". Tăng MINOR.
  - `docs/ai/bay-da-gap.md`: thêm mục "`limit_req_zone` ở trong `server` làm `nginx -t` lỗi; tên zone trùng giữa hai môi trường làm chết cả hai (chung nginx); `location` riêng không
    thừa kế `proxy_set_header`", trỏ tới `nginx.test.js`. Tăng MINOR.

- [ ] **Step 6:** `npm run test:tools && npm run docs:index && npm run docs:check -- --base origin/staging` — xanh.

- [ ] **Step 7:** Commit `feat(nginx): rate-limit password login`, mở PR vào `staging`.

- [ ] **Step 8 (người vận hành chạy sau khi merge):** job `infra` chạy `apply-infra.sh staging` (có `nginx -t` trước reload; lỗi thì tự gỡ site mới theo bất biến #9). Kiểm trên staging:

```bash
sudo nginx -T 2>/dev/null | grep -n "limit_req"                      # zone ut_staging_login và limit_req trong location /api/login
for i in $(seq 1 30); do
  curl -s -o /dev/null -w '%{http_code}\n' -X POST -H 'Content-Type: application/json' \
    -d '{"email":"nobody@example.test","password":"x"}' https://tckt-hub-staging.duckdns.org/api/login
done | sort | uniq -c                                                # có mã 429 sau khoảng 21 lần; còn lại mã 4xx của ứng dụng
```

  Đợi một phút rồi đăng nhập thật để chắc hạn mức đã nhả. Production nhận cấu hình ở lần `staging → main`; chỉ kiểm bằng `nginx -T`, không bắn thử.

---

## Kiểm kê các mục #50 ngoài R13–R20 (Điều kiện Pilot vs Backlog)

Theo quyết định bằng văn bản tại GitHub issue #50, toàn bộ các mục rà soát hạ tầng & CI nằm ngoài phạm vi tám task R13–R20 được phân định rõ ràng như sau:

| STT | Hạng mục trong #50 | Mô tả & Trạng thái hiện tại | Phân loại | Biện pháp / Kế hoạch xử lý |
|---|---|---|---|---|
| 1 | Noti trên production | Cấu hình Graph API, client secret, gửi email thật | Backlog | Đợt 1 pilot chỉ dùng email giả lập / log nội bộ theo quyết định #49/#50; chưa kích hoạt gửi mail thật trên production. |
| 2 | Recipient allowlist (Noti non-prod) | Danh sách trắng giới hạn địa chỉ nhận thư môi trường non-prod | Backlog | Môi trường staging hiện chỉ dùng thử nghiệm với tài khoản nội bộ dev/ops. |
| 3 | Worker healthcheck & service_healthy | Healthcheck trong compose cho worker nền | Backlog | Container worker hiện dùng `restart: always` và logging giám sát; sẽ bổ sung compose condition sau pilot. |
| 4 | Backup DB off-site | Sao lưu cơ sở dữ liệu đẩy ra object storage ngoài VM | Backlog | Pilot đợt 1 sử dụng cron backup cục bộ hàng ngày trên VM (`infra/scripts/backup.sh`); vận hành kiểm tra định kỳ. |
| 5 | Workflow security (pin SHA actions) | Ghim cố định commit SHA cho các GitHub Actions | Backlog | Đợt 1 đã áp dụng `permissions: contents: read` ở cấp job/workflow trong CI. |
| 6 | Lock deploy song song | Tránh hai job deploy chạy đồng thời gây đè nhau | Khuyến nghị Pilot | Sử dụng GitHub concurrency group `group: deploy-${{ inputs.env }}` trong `deploy.yml` để ngăn xung đột. |
| 7 | Giới hạn RAM/CPU container | Giới hạn `deploy.resources.limits` trong compose | Backlog | Theo dõi mức sử dụng tài nguyên thực tế trên VM trong giai đoạn pilot TCKT trước khi áp trần cố định. |

---

## Lịch sử phiên bản

| Version | Ngày | Thay đổi | Người |
|---|---|---|---|
| 1.0 | 2026-10-03 | Bản đầu: tám Task cho R13–R20 của SPEC-REL-001 (nginx upload, cổng `infra`, script tạo user, giữ tag GHCR, rollback `deploy.sh`, `AZURE_*`, biến env thừa, giới hạn đăng nhập), mỗi Task kèm test `tools/tests` và bước vận hành riêng | DYC |
| 1.1 | 2026-10-03 | Cập nhật theo quyết định #50: Task 4 bảo vệ pinned running + rollback tags với cơ chế fail-safe; Task 7 giữ nguyên `SETTINGS_ENCRYPTION_KEY` và bất biến #3; bổ sung bảng kiểm kê #50 pilot condition vs backlog | DYC |

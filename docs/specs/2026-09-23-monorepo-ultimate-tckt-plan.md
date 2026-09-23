---
doc_id: SPEC-MONO-002
title: Kế hoạch triển khai — Gộp repo thành monorepo ultimate-tckt
version: 1.0
status: active
audience: [dev, ai]
owner: DYC
updated: 2026-09-24
related_code: []
---

# Monorepo `ultimate-tckt` Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Gộp `tckt-activity-hub` + `ctd` + `infra` thành repo `tduong-p/ultimate-tckt` với tên hạ tầng `ultimate-tckt-*`, CI test-trước-deploy, script VPS theo từng môi trường, và bộ tài liệu có version được CI kiểm soát; rồi chuyển VPS sang repo mới không mất dữ liệu.

**Architecture:** Repo local mới ở `~/Developer/ultimate-tckt`. Nhánh `staging` được dựng trước (nguồn: hub@staging, ctd@main, infra@main), mọi commit chung (đổi tên, infra, CI, tooling, docs) làm trên `staging`, rồi `main` = import nguồn main + cherry-pick các commit chung. Script VPS viết bằng bash, dùng chung `infra/scripts/lib.sh`, kiểm thử bằng `node:test` với các lệnh `docker`/`git`/`sudo`… được thay bằng stub trên `PATH`. Tooling tài liệu là script Node thuần (không dependency) ở `tools/docs-check/`.

**Tech Stack:** Bash, Docker Compose, Nginx, GitHub Actions (buildx arm64, `dorny/paths-filter@v3`, `appleboy/ssh-action@v1.2.0`, `actions/delete-package-versions@v5`), Node 22 (`node:test`), pandoc, Python 3.12/pytest, MySQL 8, Postgres 16.

**Spec:** `docs/specs/2026-09-23-monorepo-ultimate-tckt-design.md` (trong repo `tckt-activity-hub`, nhánh `staging`, commit `c5e3c80`). Spec đa đơn vị liên quan: `.kiro/specs/nen-tang-da-don-vi/`.

## Global Constraints

- Repo: `tduong-p/ultimate-tckt`, private; nhánh `main` = production, `staging` = staging.
- Không import lịch sử git; commit import ghi SHA nguồn.
- Thư mục gốc: `core/`, `services/ctd-api/`, `web/` (chưa tạo), `infra/`, `docs/`, `tools/`, `.github/`, `.kiro/`.
- Compose project: `ultimate-tckt-staging` / `ultimate-tckt-production`. Service: `core`, `core-db`, `ctd-api`, `ctd-db`. Volume: `core_mysql`, `core_uploads`, `ctd_postgres`, `ctd_documents`.
- Image: `ghcr.io/tduong-p/ultimate-tckt-core:<sha12>`, `ghcr.io/tduong-p/ultimate-tckt-ctd-api:<sha12>`. Biến tag: `CORE_IMAGE_TAG`, `CTD_API_IMAGE_TAG`.
- VM: `/opt/ultimate-tckt/{staging,production,backups}`; `.env` ở `/opt/ultimate-tckt/<env>/infra/.env`; khoá `/tmp/ultimate-tckt-<env>-deploy.lock`; nginx site `ultimate-tckt-<env>-{core,ctd}.conf`.
- Giữ nguyên: tên miền DuckDNS, cổng host (staging core 3000, ctd 8000, core-db 3306; production core 3001, ctd 8001, core-db 3307), chứng chỉ Let's Encrypt, tên DB/user DB trong `.env`.
- Tiền tố biến `.env` đổi `TCKT_*` → `CORE_*`, `CTD_*` giữ nguyên; giá trị giữ nguyên.
- Test phải xanh mới build/deploy; deploy chỉ chạy khi biến repo `DEPLOY_ENABLED == 'true'`.
- GHCR giữ 10 version mới nhất mỗi image. Volume cũ và `/opt/infra` giữ 14 ngày.
- Tài liệu: Markdown là bản gốc; frontmatter `doc_id, title, version (MAJOR.MINOR), status (draft|active|deprecated), audience, owner, updated, related_code`; mục `## Lịch sử phiên bản`; tag bộ `docs-vYYYY.MM.N`.
- Sau khi xong: `grep -ri seee` trong repo không còn kết quả, ngoại trừ file trong `docs/adr/` và `infra/scripts/migrate-volumes.sh` (script chuyển dữ liệu phải biết tên cũ).
- Không ghi secret/mật khẩu vào repo hay tài liệu.

## Review Focus

1. `migrate-volumes.sh` chạy lần hai (volume mới đã có dữ liệu) — phải từ chối ghi đè, không được chép chồng.
2. `.env` cũ thiếu biến bắt buộc hoặc có `SETTINGS_ENCRYPTION_KEY` rỗng — `bootstrap-vm.sh` phải báo tên biến thiếu và exit ≠ 0, không tạo `.env` nửa vời.
3. `deploy.sh` được gọi với env/app sai chính tả — phải exit ≠ 0 trước khi đụng docker hay git.
4. Health check fail sau `up -d` — `deploy.sh` exit ≠ 0 để CI đỏ (không im lặng coi là thành công).
5. `docs-check` gặp file chỉ đổi khoảng trắng cuối dòng hoặc chỉ đổi frontmatter `updated` — không đòi bump version cho thay đổi rỗng nội dung; nhưng đổi thân bài thì phải đòi.

Mỗi dòng trên có test tương ứng trong task sở hữu code (Task 6, 7, 5, 5, 9).

## File Structure

```
~/Developer/ultimate-tckt/
├── .gitignore  .editorconfig  README.md  AGENTS.md  CLAUDE.md  package.json
├── .claude/launch.json
├── .agents/skills/…                    (một bản, từ tckt-activity-hub)
├── .kiro/specs/nen-tang-da-don-vi/{requirements,design,tasks}.md
├── .kiro/steering/{product,structure,tech}.md
├── core/                               (tckt-activity-hub, bỏ docs/ và file md gốc)
│   └── .env.example                    (mới)
├── services/ctd-api/                   (ctd, bỏ docs/, BA/, .agents/, tools/)
├── infra/
│   ├── compose/docker-compose.{staging,production}.yml
│   ├── nginx/{staging,production}/{core,ctd}.conf
│   ├── scripts/{lib,deploy,apply-infra,backup,bootstrap-vm,migrate-volumes,setup-vm,create-core-admin,create-core-readonly-user}.sh
│   ├── seed/core-db.sql
│   └── .env.example
├── tools/
│   ├── docs-check/{frontmatter,rules,index,cli}.js
│   ├── docs-export/export.sh
│   └── tests/{infra-scripts,docs-check}.test.js + tests/stubs/
├── .github/
│   ├── workflows/{deploy,docs,ghcr-cleanup}.yml
│   ├── pull_request_template.md
│   └── CODEOWNERS
└── docs/ (Task 10–15)
```

---

## Phase A — Dựng repo local

### Task 1: Import nguồn vào nhánh `staging`

**Files:**
- Create: toàn bộ `~/Developer/ultimate-tckt/` từ 3 repo nguồn, `.gitignore`

**Interfaces:**
- Produces: repo git ở `~/Developer/ultimate-tckt`, nhánh `staging`, commit `chore: initial import (staging sources)`; thư mục `core/`, `services/ctd-api/`, `infra/`, `docs/legacy/{hub,ctd,infra}/`, `.kiro/`, `.agents/`.

Ghi chú nguồn (đã kiểm ngày 2026-09-23): `ctd@staging` (`81b46b3`) **cũ hơn** `ctd@main` (`551c16b`) 8 commit — nên nhánh `staging` mới lấy `ctd@main`, nếu không PR `staging → main` sẽ kéo CTD production lùi phiên bản. Hub: `main ⊂ staging`. Infra chỉ có `main`.

- [ ] **Step 1: Ghi SHA nguồn và kiểm cây sạch**

```bash
cd ~/Developer/deployment-package && git fetch -q origin && git rev-parse --short origin/staging origin/main
cd ~/Developer/CTD && git fetch -q origin && git rev-parse --short origin/main
cd ~/Developer/infra && git fetch -q origin && git rev-parse --short origin/main
```
Expected: 4 SHA in ra. Ghi lại làm `HUB_STG`, `HUB_MAIN`, `CTD_MAIN`, `INFRA_MAIN`. Nếu `origin/staging` của hub không chứa `c5e3c80` (spec) thì dùng SHA local `git rev-parse --short staging` và ledger Ruling (spec chưa push).

- [ ] **Step 2: Xuất cây sạch của từng nguồn (không kèm file untracked)**

```bash
SCR=$(mktemp -d)
git -C ~/Developer/deployment-package archive --format=tar staging | (mkdir -p $SCR/hub && tar -x -C $SCR/hub)
git -C ~/Developer/CTD archive --format=tar main | (mkdir -p $SCR/ctd && tar -x -C $SCR/ctd)
git -C ~/Developer/infra archive --format=tar main | (mkdir -p $SCR/infra && tar -x -C $SCR/infra)
ls $SCR/hub $SCR/ctd $SCR/infra
```
Expected: ba cây, hub có `src/ public/ tests/ db.sql Dockerfile`, ctd có `backend/ frontend/ Dockerfile`, infra có `docker-compose.*.yml nginx/ scripts/ seed/`.

- [ ] **Step 3: Dựng cây monorepo**

```bash
R=~/Developer/ultimate-tckt
mkdir -p $R/core $R/services/ctd-api $R/infra $R/docs/legacy/{hub,ctd,infra} && cd $R && git init -q -b staging
# core
( cd $SCR/hub && mv docs *.md .agents $R/docs/legacy/hub/ 2>/dev/null; rm -rf .github skills-lock.json )
mv $R/docs/legacy/hub/.agents $R/.agents
cp -a $SCR/hub/. $R/core/
# ctd-api
( cd $SCR/ctd && mv docs BA *.md $R/docs/legacy/ctd/ 2>/dev/null; rm -rf .github .agents .claude tools skills-lock.json start-dev.sh test-connection.sh frontend/tsconfig.tsbuildinfo )
cp -a $SCR/ctd/. $R/services/ctd-api/
# infra
( cd $SCR/infra && mv docs README.md $R/docs/legacy/infra/ ; rm -rf .github .DS_Store )
cp -a $SCR/infra/. $R/infra/
# kiro (bản local có quyết định mới, chưa commit ở nguồn)
cp -a ~/Developer/deployment-package/.kiro $R/.kiro
# tài liệu untracked của hub (tờ trình, tổng quan) -> legacy để Task 10 xử lý
cp ~/Developer/deployment-package/DE_XUAT_CAP_SERVER_VA_SUBDOMAIN.md $R/docs/legacy/hub/
cp -a ~/Developer/deployment-package/docs/{NEN_TANG_DA_DON_VI_TONG_QUAN.md,HUONG_DAN_LUONG_HE_THONG.md,images} $R/docs/legacy/hub/docs/
cp ~/Developer/deployment-package/docs/*.docx ~/Developer/deployment-package/docs/*.pdf $R/docs/legacy/hub/docs/
git -C ~/Developer/deployment-package show staging:.claude/launch.json > /dev/null 2>&1 || true
find $R -name .DS_Store -delete
ls $R $R/core $R/services/ctd-api $R/infra
```
Expected: `core/` có `src public tests db.sql Dockerfile package.json app.js`; không còn `core/docs`, `core/*.md`; `services/ctd-api/` có `backend frontend Dockerfile .env.example`; `infra/` có `docker-compose.*.yml nginx scripts seed`.

Ghi chú: `docs/legacy/` là khu tạm cho Task 10–15 đọc và viết lại; **bị xoá hoàn toàn ở Task 15**. CTD `docs/BAN-GIAO-DEV-TEAM.md` và `tools/` (untracked ở nguồn) **không** được chép — Task 10 hỏi chủ repo.

- [ ] **Step 4: Viết `.gitignore` gốc**

```gitignore
# deps / build
node_modules/
.venv/
__pycache__/
*.pyc
*.egg-info/
.pytest_cache/
dist/
*.tsbuildinfo
services/ctd-api/backend/static/
# runtime
.env
.env.*
!.env.example
core/storage/task-attachments/
*.log
log.md
# OS / tooling
.DS_Store
.worktrees/
.superpowers/
.claude/scheduled_tasks.lock
docs-export/
```

- [ ] **Step 5: Kiểm không có secret / file rác**

Run: `cd ~/Developer/ultimate-tckt && git add -A && git status --short | grep -Ei '\.env$|\.env\.|tsbuildinfo|node_modules|storage/|log\.md' ; git ls-files | wc -l`
Expected: dòng grep chỉ có `.env.example` (nếu có); không có `.env`, `node_modules`, `log.md`.

- [ ] **Step 6: Commit**

```bash
cd ~/Developer/ultimate-tckt && git commit -q -m "chore: initial import (staging sources)

Sources:
- core/            <- tduong-p/tckt-activity-hub@<HUB_STG>
- services/ctd-api <- tduong-p/ctd@<CTD_MAIN>
- infra/           <- tduong-p/infra@<INFRA_MAIN>
History lives in the archived source repos.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
(thay `<…>` bằng SHA thật từ Step 1).

---

### Task 2: Chạy được test của cả hai app từ vị trí mới + sửa test weight-presets

**Files:**
- Modify: `core/tests/weight-presets.test.js:44,51,59,64,71` (`label:` → `name:` trong body request)
- Create: `core/.env.example`

**Interfaces:**
- Consumes: cây từ Task 1.
- Produces: `cd core && npm test` xanh 94/94; `cd services/ctd-api/backend && pytest` xanh.

- [ ] **Step 1: Cài và chạy test core — thấy đỏ đúng một test**

Run: `cd ~/Developer/ultimate-tckt/core && npm ci --silent && npm test > /tmp/ut-core.log 2>&1; grep -E '^ℹ (tests|pass|fail)' /tmp/ut-core.log`
Expected: `tests 94`, `pass 93`, `fail 1` — test `executive can create, update, and delete weight presets` với `400 !== 201`.

- [ ] **Step 2: Sửa test cho khớp API (`POST/PATCH /api/admin/weight-presets` đọc `name`; cột DB vẫn là `label`)**

Trong `core/tests/weight-presets.test.js`, đổi 5 chỗ `body: { label: …` thành `body: { name: …`. Giữ nguyên dòng 75–76 (`SELECT label …` / `updated.label`) vì đó là cột DB.

- [ ] **Step 3: Chạy lại**

Run: `cd ~/Developer/ultimate-tckt/core && npm test > /tmp/ut-core.log 2>&1; grep -E '^ℹ (tests|pass|fail)' /tmp/ut-core.log`
Expected: `tests 94`, `pass 94`, `fail 0`.

- [ ] **Step 4: Chạy test CTD**

Run: `cd ~/Developer/ultimate-tckt/services/ctd-api/backend && python3.12 -m venv .venv && .venv/bin/pip install -q -e '.[dev]' 2>/dev/null || .venv/bin/pip install -q -e . pytest httpx; TEST_DATABASE_URL=postgresql+psycopg://postgres:postgres@localhost:5432/ctd_test .venv/bin/pytest -q > /tmp/ut-ctd.log 2>&1; tail -3 /tmp/ut-ctd.log`
Expected: dòng cuối dạng `N passed`, không `failed`/`error`. (Postgres local đã có DB `ctd_test`.)

- [ ] **Step 5: Tạo `core/.env.example`**

```dotenv
# Sao chép thành core/.env khi chạy local. KHÔNG commit .env.
NODE_ENV=development
PORT=3000
APP_BASE_URL=http://localhost:3000
DB_HOST=localhost
DB_PORT=3306
DB_NAME=ultimate_tckt
DB_USER=root
DB_PASSWORD=
SESSION_SECRET=doi-chuoi-nay-khi-chay-that
# Bắt buộc để lưu cấu hình SMTP (mã hoá AES-256-GCM). Sinh: openssl rand -base64 32
SETTINGS_ENCRYPTION_KEY=
# Email (phân tách bằng dấu phẩy) luôn có quyền devops/DYC.
DEVOPS_EMAILS=
EMAIL_NOTIFICATIONS_ENABLED=false
```

- [ ] **Step 6: Commit**

```bash
git add core/tests/weight-presets.test.js core/.env.example
git commit -q -m "fix(core): send name in weight-preset test requests; add core/.env.example

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Bỏ tên `seee` khỏi code và seed

**Files:**
- Modify: `core/src/config/environment.js:10,12` (default `seee_app` → `ultimate_tckt_app`, `seee_activity_hub` → `ultimate_tckt`)
- Move: `infra/seed/tckt-db.sql` → `infra/seed/core-db.sql`; đổi mọi `seee` trong file
- Modify: mọi chỗ còn `seee` trong `core/`, `services/ctd-api/`, `.kiro/`

**Interfaces:**
- Produces: `grep -rIi seee core services .kiro infra/seed` rỗng.

- [ ] **Step 1: Liệt kê (test đỏ)**

Run: `cd ~/Developer/ultimate-tckt && grep -rIil seee core services .kiro infra --exclude-dir=node_modules --exclude-dir=.venv`
Expected: có ít nhất `core/src/config/environment.js` và `infra/…` — danh sách này là việc phải làm.

- [ ] **Step 2: Sửa từng file trong danh sách**

- `core/src/config/environment.js`: `'seee_app'` → `'ultimate_tckt_app'`, `'seee_activity_hub'` → `'ultimate_tckt'`.
- `git mv infra/seed/tckt-db.sql infra/seed/core-db.sql`; trong file, tên DB/user `seee_*` giữ **chỉ** nếu là tên DB thật trên VM (spec: giữ tên DB) — seed chỉ chạy khi volume trống lần đầu, nên đổi comment/tên hiển thị, còn câu lệnh `CREATE DATABASE`/`USE` phải dùng biến compose (`MYSQL_DATABASE`) chứ không hardcode. Nếu file hardcode `USE seee_…;` thì xoá dòng `USE` (entrypoint MySQL đã chọn `MYSQL_DATABASE`).
- Các file khác trong danh sách (script infra sẽ được viết lại ở Task 5–7, bỏ qua ở đây).
- Ruling mẫu nếu gặp tên DB thật cố định: giữ nguyên + ghi ledger.

- [ ] **Step 3: Chạy lại grep và test core**

Run: `grep -rIil seee core services .kiro infra/seed --exclude-dir=node_modules --exclude-dir=.venv; cd core && npm test > /tmp/ut-core.log 2>&1; grep -E '^ℹ (pass|fail)' /tmp/ut-core.log`
Expected: grep không in gì; `pass 94`, `fail 0`.

- [ ] **Step 4: Commit**

```bash
git add -A core services .kiro infra/seed
git commit -q -m "refactor: drop seee naming from code defaults and seed

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Compose + nginx + `.env.example` theo tên mới

**Files:**
- Create: `infra/compose/docker-compose.staging.yml`, `infra/compose/docker-compose.production.yml`, `infra/.env.example`
- Move: `infra/nginx/<env>/tckt.conf` → `infra/nginx/<env>/core.conf` (nội dung giữ nguyên)
- Delete: `infra/docker-compose.staging.yml`, `infra/docker-compose.production.yml`
- Test: `tools/tests/compose.test.js`

**Interfaces:**
- Produces: service `core`, `core-db`, `ctd-api`, `ctd-db`; biến `.env`: `CORE_MYSQL_ROOT_PASSWORD, CORE_DB_NAME, CORE_DB_USER, CORE_DB_PASSWORD, CORE_SESSION_SECRET, CORE_SETTINGS_ENCRYPTION_KEY, CORE_DEVOPS_EMAILS, CTD_DB_NAME, CTD_DB_USER, CTD_DB_PASSWORD, CTD_JWT_SECRET`; tag `CORE_IMAGE_TAG`, `CTD_API_IMAGE_TAG`.

- [ ] **Step 1: Tạo `package.json` gốc (tooling)**

```json
{
  "name": "ultimate-tckt-tooling",
  "private": true,
  "engines": { "node": ">=22 <23" },
  "scripts": {
    "test:tools": "node --test tools/tests/",
    "docs:check": "node tools/docs-check/cli.js check",
    "docs:index": "node tools/docs-check/cli.js index"
  }
}
```

- [ ] **Step 2: Viết test compose (đỏ)**

`tools/tests/compose.test.js`:
```js
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..', '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

for (const env of ['staging', 'production']) {
  test(`${env} compose uses ultimate-tckt names and keeps host ports`, () => {
    const y = read(`infra/compose/docker-compose.${env}.yml`);
    for (const svc of ['core-db:', 'core:', 'ctd-db:', 'ctd-api:']) assert.match(y, new RegExp(`^  ${svc}`, 'm'), svc);
    assert.match(y, /ghcr\.io\/tduong-p\/ultimate-tckt-core:\$\{CORE_IMAGE_TAG:\?/);
    assert.match(y, /ghcr\.io\/tduong-p\/ultimate-tckt-ctd-api:\$\{CTD_API_IMAGE_TAG:\?/);
    for (const v of ['core_mysql', 'core_uploads', 'ctd_postgres', 'ctd_documents']) assert.match(y, new RegExp(`^  ${v}:`, 'm'), v);
    const ports = env === 'staging' ? ['3306:3306', '3000:3000', '8000:8000'] : ['3307:3306', '3001:3000', '8001:8000'];
    for (const p of ports) assert.ok(y.includes(`"127.0.0.1:${p}"`), p);
    assert.match(y, new RegExp(`APP_ENV: ${env}`));
    assert.match(y, /SETTINGS_ENCRYPTION_KEY: \$\{CORE_SETTINGS_ENCRYPTION_KEY:\?/);
    assert.doesNotMatch(y, /seee|tckt-app|ctd-app|TCKT_/i);
  });
  test(`${env} nginx has core.conf and ctd.conf`, () => {
    assert.ok(fs.existsSync(path.join(root, `infra/nginx/${env}/core.conf`)));
    assert.ok(fs.existsSync(path.join(root, `infra/nginx/${env}/ctd.conf`)));
    assert.ok(!fs.existsSync(path.join(root, `infra/nginx/${env}/tckt.conf`)));
  });
}
test('.env.example lists every variable the compose files use', () => {
  const ex = read('infra/.env.example');
  const used = new Set();
  for (const env of ['staging', 'production']) {
    for (const m of read(`infra/compose/docker-compose.${env}.yml`).matchAll(/\$\{([A-Z0-9_]+)/g)) used.add(m[1]);
  }
  for (const v of used) if (!v.endsWith('IMAGE_TAG')) assert.match(ex, new RegExp(`^${v}=`, 'm'), v);
});
```

Run: `cd ~/Developer/ultimate-tckt && node --test tools/tests/compose.test.js 2>&1 | grep -E '^ℹ (pass|fail)'`
Expected: `fail 5` (file chưa tồn tại).

- [ ] **Step 3: Viết `infra/compose/docker-compose.staging.yml`**

```yaml
# Stack staging. Chạy qua infra/scripts/lib.sh (compose project: ultimate-tckt-staging).
services:
  core-db:
    image: mysql:8
    restart: unless-stopped
    ports:
      - "127.0.0.1:3306:3306"
    environment:
      MYSQL_ROOT_PASSWORD: ${CORE_MYSQL_ROOT_PASSWORD:?}
      MYSQL_DATABASE: ${CORE_DB_NAME:?}
      MYSQL_USER: ${CORE_DB_USER:?}
      MYSQL_PASSWORD: ${CORE_DB_PASSWORD:?}
    volumes:
      - core_mysql:/var/lib/mysql
      - ../seed/core-db.sql:/docker-entrypoint-initdb.d/init.sql:ro

  core:
    image: ghcr.io/tduong-p/ultimate-tckt-core:${CORE_IMAGE_TAG:?}
    restart: unless-stopped
    depends_on:
      - core-db
    environment:
      NODE_ENV: production
      PORT: 3000
      DB_HOST: core-db
      DB_PORT: 3306
      DB_NAME: ${CORE_DB_NAME:?}
      DB_USER: ${CORE_DB_USER:?}
      DB_PASSWORD: ${CORE_DB_PASSWORD:?}
      SESSION_SECRET: ${CORE_SESSION_SECRET:?}
      SETTINGS_ENCRYPTION_KEY: ${CORE_SETTINGS_ENCRYPTION_KEY:?}
      DEVOPS_EMAILS: ${CORE_DEVOPS_EMAILS:-}
      APP_BASE_URL: https://tckt-hub-staging.duckdns.org
      APP_ENV: staging
      EMAIL_NOTIFICATIONS_ENABLED: "false"
    ports:
      - "127.0.0.1:3000:3000"
    volumes:
      - core_uploads:/app/storage/task-attachments

  ctd-db:
    image: postgres:16
    restart: unless-stopped
    environment:
      POSTGRES_DB: ${CTD_DB_NAME:?}
      POSTGRES_USER: ${CTD_DB_USER:?}
      POSTGRES_PASSWORD: ${CTD_DB_PASSWORD:?}
    volumes:
      - ctd_postgres:/var/lib/postgresql/data

  ctd-api:
    image: ghcr.io/tduong-p/ultimate-tckt-ctd-api:${CTD_API_IMAGE_TAG:?}
    restart: unless-stopped
    depends_on:
      - ctd-db
    environment:
      APP_ENV: staging
      DATABASE_URL: postgresql+psycopg://${CTD_DB_USER:?}:${CTD_DB_PASSWORD:?}@ctd-db:5432/${CTD_DB_NAME:?}
      JWT_SECRET: ${CTD_JWT_SECRET:?}
      MAILER_DRIVER: console
      STORAGE_DRIVER: local
      LOCAL_STORAGE_DIR: /app/storage/documents
    ports:
      - "127.0.0.1:8000:8000"
    volumes:
      - ctd_documents:/app/storage/documents

volumes:
  core_mysql:
  core_uploads:
  ctd_postgres:
  ctd_documents:
```

Ghi chú (ghi vào `docs/ops/` ở Task 13): so với compose cũ, thêm `APP_ENV`, `SETTINGS_ENCRYPTION_KEY`, `DEVOPS_EMAILS` — compose cũ thiếu `SETTINGS_ENCRYPTION_KEY`, nên trang Setting → SMTP trên staging hiện đang lỗi khi lưu. `APP_ENV` cho CTD bật chốt chặn JWT mặc định (`app/config.py`).

- [ ] **Step 4: Viết `infra/compose/docker-compose.production.yml`**

Giống hệt Step 3, chỉ khác: comment dòng 1 `production` / `ultimate-tckt-production`; `"127.0.0.1:3307:3306"`; `"127.0.0.1:3001:3000"`; `"127.0.0.1:8001:8000"`; `APP_BASE_URL: https://tckt-hub.duckdns.org`; hai dòng `APP_ENV: production`.

- [ ] **Step 5: Nginx + `.env.example` + xoá compose cũ**

```bash
cd ~/Developer/ultimate-tckt/infra
git mv nginx/staging/tckt.conf nginx/staging/core.conf
git mv nginx/production/tckt.conf nginx/production/core.conf
git rm -q docker-compose.staging.yml docker-compose.production.yml
```
`infra/.env.example`:
```dotenv
# /opt/ultimate-tckt/<env>/infra/.env trên VM. KHÔNG commit file thật.
# bootstrap-vm.sh sinh file này từ /opt/infra/.env.<env> cũ (đổi TCKT_* -> CORE_*).
CORE_MYSQL_ROOT_PASSWORD=
CORE_DB_NAME=
CORE_DB_USER=
CORE_DB_PASSWORD=
CORE_SESSION_SECRET=
# openssl rand -base64 32 — bootstrap tự sinh nếu thiếu
CORE_SETTINGS_ENCRYPTION_KEY=
CORE_DEVOPS_EMAILS=
CTD_DB_NAME=
CTD_DB_USER=
CTD_DB_PASSWORD=
CTD_JWT_SECRET=
```

- [ ] **Step 6: Chạy test**

Run: `cd ~/Developer/ultimate-tckt && node --test tools/tests/compose.test.js 2>&1 | grep -E '^ℹ (pass|fail)'`
Expected: `pass 5`, `fail 0`.

- [ ] **Step 7: Commit**

```bash
git add -A package.json tools/tests/compose.test.js infra
git commit -q -m "feat(infra): ultimate-tckt compose stacks, nginx names and .env template

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: `lib.sh` + `deploy.sh` (+ harness test script)

**Files:**
- Create: `infra/scripts/lib.sh`, `infra/scripts/deploy.sh` (ghi đè bản cũ)
- Create: `tools/tests/helpers/sandbox.js`, `tools/tests/infra-deploy.test.js`

**Interfaces:**
- Produces (`lib.sh`, được `source`):
  - `UT_ROOT` (mặc định `/opt/ultimate-tckt`), `UT_LOCK_DIR` (mặc định `/tmp`)
  - `ut_env_branch <env>` → in `staging`|`main`, exit 1 nếu env sai
  - `ut_app_service <app>` → `core`|`ctd-api`, exit 1 nếu sai
  - `ut_app_port <env> <app>` → 3000/8000/3001/8001
  - `ut_compose <env> <args…>` → `docker compose -p ultimate-tckt-<env> --env-file $UT_ROOT/<env>/infra/.env -f $UT_ROOT/<env>/infra/compose/docker-compose.<env>.yml <args…>`
  - `ut_lock <env>` → `flock` khoá `$UT_LOCK_DIR/ultimate-tckt-<env>-deploy.lock` (fd 200, chờ 180s)
  - `ut_health <url> [timeout_s=60]` → curl lặp mỗi 2s, 0 nếu HTTP 200
  - `ut_current_tag <env> <app>` → tag image của container đang chạy, rỗng nếu không có
- Produces (`deploy.sh <env> <app> <tag>`): exit 0 khi health OK.
- Produces (`sandbox.js`): `makeSandbox({ curlCode='200' }) → { root, bin, logFile, run(script, args, env) → {status, stdout, stderr}, calls() → string[] }` — stub `docker git sudo nginx systemctl certbot flock curl` ghi từng lệnh vào `logFile`.

- [ ] **Step 1: Viết sandbox helper**

`tools/tests/helpers/sandbox.js`:
```js
'use strict';
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const repo = path.join(__dirname, '..', '..', '..');

function makeSandbox({ curlCode = '200', dockerOut = {} } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ut-'));
  const bin = path.join(root, 'bin');
  const logFile = path.join(root, 'calls.log');
  fs.mkdirSync(bin);
  const stub = (name, body = '') => {
    fs.writeFileSync(path.join(bin, name),
      `#!/usr/bin/env bash\necho "${name} $*" >> "${logFile}"\n${body}\nexit 0\n`, { mode: 0o755 });
  };
  for (const n of ['git', 'sudo', 'nginx', 'systemctl', 'certbot', 'flock', 'gzip']) stub(n);
  stub('curl', `echo -n "${curlCode}"`);
  // docker: trả output theo khoá "docker <sub>" nếu được cấu hình
  const cases = Object.entries(dockerOut)
    .map(([k, v]) => `  *"${k}"*) printf '%s' ${JSON.stringify(v)} ;;`).join('\n');
  stub('docker', `case "$*" in\n${cases}\n  *) : ;;\nesac`);
  for (const env of ['staging', 'production']) {
    fs.mkdirSync(path.join(root, 'opt', env, 'infra', 'compose'), { recursive: true });
  }
  return {
    root,
    bin,
    logFile,
    run(script, args = [], env = {}) {
      const r = spawnSync('bash', [path.join(repo, 'infra', 'scripts', script), ...args], {
        encoding: 'utf8',
        env: { ...process.env, PATH: `${bin}:${process.env.PATH}`, UT_ROOT: path.join(root, 'opt'),
          UT_LOCK_DIR: root, UT_HEALTH_INTERVAL: '0', ...env },
      });
      return { status: r.status, stdout: r.stdout, stderr: r.stderr };
    },
    calls() { return fs.existsSync(logFile) ? fs.readFileSync(logFile, 'utf8').trim().split('\n') : []; },
  };
}
module.exports = { makeSandbox, repo };
```

- [ ] **Step 2: Viết test deploy (đỏ)**

`tools/tests/infra-deploy.test.js`:
```js
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { makeSandbox } = require('./helpers/sandbox');

test('deploy.sh staging core pulls staging branch then pulls+ups only core', () => {
  const sb = makeSandbox();
  const r = sb.run('deploy.sh', ['staging', 'core', 'abc123def456']);
  assert.equal(r.status, 0, r.stderr);
  const c = sb.calls();
  const gi = c.findIndex((l) => l.startsWith('git ') && l.includes('pull --ff-only origin staging'));
  const pi = c.findIndex((l) => l.includes('docker compose -p ultimate-tckt-staging') && l.includes(' pull core'));
  const ui = c.findIndex((l) => l.includes('docker compose -p ultimate-tckt-staging') && l.includes(' up -d --no-deps core'));
  assert.ok(gi >= 0 && pi > gi && ui > pi, c.join('\n'));
  assert.ok(c.some((l) => l.startsWith('curl ') && l.includes('127.0.0.1:3000/api/health')));
});

test('deploy.sh production ctd-api uses main branch and port 8001', () => {
  const sb = makeSandbox();
  const r = sb.run('deploy.sh', ['production', 'ctd-api', 'abc123def456']);
  assert.equal(r.status, 0, r.stderr);
  const c = sb.calls();
  assert.ok(c.some((l) => l.includes('pull --ff-only origin main')));
  assert.ok(c.some((l) => l.includes('-p ultimate-tckt-production') && l.includes('up -d --no-deps ctd-api')));
  assert.ok(c.some((l) => l.includes('127.0.0.1:8001/api/health')));
});

test('deploy.sh exports the right image tag variable', () => {
  const sb = makeSandbox();
  // stub docker in ra biến môi trường khi được gọi
  require('node:fs').writeFileSync(`${sb.bin}/docker`,
    `#!/usr/bin/env bash\necho "docker $* CORE=\${CORE_IMAGE_TAG:-} CTD=\${CTD_API_IMAGE_TAG:-}" >> "${sb.logFile}"\n`, { mode: 0o755 });
  sb.run('deploy.sh', ['staging', 'ctd-api', 'feedbeef0001']);
  assert.ok(sb.calls().some((l) => l.includes('up -d') && l.includes('CTD=feedbeef0001')));
});

for (const args of [['stagin', 'core', 't'], ['staging', 'tckt', 't'], ['staging', 'core']]) {
  test(`deploy.sh ${args.join(' ')} fails before touching git or docker`, () => {
    const sb = makeSandbox();
    const r = sb.run('deploy.sh', args);
    assert.notEqual(r.status, 0);
    assert.ok(!sb.calls().some((l) => /^(git|docker) /.test(l)), sb.calls().join('\n'));
  });
}

test('deploy.sh exits non-zero when health check never returns 200', () => {
  const sb = makeSandbox({ curlCode: '502' });
  const r = sb.run('deploy.sh', ['staging', 'core', 'abc'], { UT_HEALTH_TIMEOUT: '1' });
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /health/i);
});
```

Run: `cd ~/Developer/ultimate-tckt && node --test tools/tests/infra-deploy.test.js 2>&1 | grep -E '^ℹ (pass|fail)'`
Expected: `fail` ≥ 3 (deploy.sh cũ không có `lib.sh`, sai tên).

- [ ] **Step 3: Viết `infra/scripts/lib.sh`**

```bash
#!/usr/bin/env bash
# Hàm dùng chung cho mọi script VM. Được `source`, không chạy trực tiếp.
UT_ROOT="${UT_ROOT:-/opt/ultimate-tckt}"
UT_LOCK_DIR="${UT_LOCK_DIR:-/tmp}"
UT_HEALTH_INTERVAL="${UT_HEALTH_INTERVAL:-2}"

ut_die() { echo "ERROR: $*" >&2; exit 1; }

ut_env_branch() {
  case "${1:-}" in
    staging) echo staging ;;
    production) echo main ;;
    *) ut_die "ENV must be 'staging' or 'production', got: '${1:-}'" ;;
  esac
}

ut_app_service() {
  case "${1:-}" in
    core) echo core ;;
    ctd-api) echo ctd-api ;;
    *) ut_die "APP must be 'core' or 'ctd-api', got: '${1:-}'" ;;
  esac
}

ut_app_tag_var() {
  case "$1" in core) echo CORE_IMAGE_TAG ;; ctd-api) echo CTD_API_IMAGE_TAG ;; esac
}

ut_app_port() {
  case "$1:$2" in
    staging:core) echo 3000 ;; staging:ctd-api) echo 8000 ;;
    production:core) echo 3001 ;; production:ctd-api) echo 8001 ;;
    *) ut_die "no port for $1/$2" ;;
  esac
}

ut_env_dir() { echo "$UT_ROOT/$1"; }

ut_compose() {
  local env="$1"; shift
  local dir; dir="$(ut_env_dir "$env")/infra"
  docker compose -p "ultimate-tckt-$env" --env-file "$dir/.env" \
    -f "$dir/compose/docker-compose.$env.yml" "$@"
}

ut_lock() {
  exec 200>"$UT_LOCK_DIR/ultimate-tckt-$1-deploy.lock"
  flock -x -w 180 200 || ut_die "could not acquire deploy lock for $1"
}

ut_health() {
  local url="$1" timeout="${2:-${UT_HEALTH_TIMEOUT:-60}}" waited=0 code
  while :; do
    code="$(curl -s -o /dev/null -w '%{http_code}' "$url" || true)"
    [[ "$code" == "200" ]] && return 0
    (( waited >= timeout )) && { echo "ERROR: health check failed for $url (last HTTP $code)" >&2; return 1; }
    sleep "$UT_HEALTH_INTERVAL"; waited=$(( waited + (UT_HEALTH_INTERVAL > 0 ? UT_HEALTH_INTERVAL : 1) ))
  done
}

# Tag image của container đang chạy (để up các service khác mà không rơi về :latest).
ut_current_tag() {
  local img
  img="$(docker inspect --format '{{.Config.Image}}' "ultimate-tckt-$1-$2-1" 2>/dev/null || true)"
  [[ "$img" == *:* ]] && echo "${img##*:}"
}
```

- [ ] **Step 4: Viết `infra/scripts/deploy.sh`**

```bash
#!/usr/bin/env bash
# Usage: deploy.sh <staging|production> <core|ctd-api> <image-tag>
# Chạy TRÊN VM (GitHub Actions SSH vào và gọi). Chỉ đụng một service của một môi trường.
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"

ENV="${1:-}"; APP="${2:-}"; TAG="${3:-}"
BRANCH="$(ut_env_branch "$ENV")"
SERVICE="$(ut_app_service "$APP")"
[[ -n "$TAG" ]] || ut_die "Usage: deploy.sh <staging|production> <core|ctd-api> <image-tag>"

ut_lock "$ENV"
git -C "$(ut_env_dir "$ENV")" pull --ff-only origin "$BRANCH"

# Giữ tag của app còn lại để compose không đòi biến rỗng.
export CORE_IMAGE_TAG="${CORE_IMAGE_TAG:-$(ut_current_tag "$ENV" core)}"
export CTD_API_IMAGE_TAG="${CTD_API_IMAGE_TAG:-$(ut_current_tag "$ENV" ctd-api)}"
export "$(ut_app_tag_var "$APP")=$TAG"
# App còn lại chưa từng chạy -> tag rỗng làm ${VAR:?} của compose lỗi. Giá trị giả chỉ để nội suy;
# --no-deps đảm bảo service kia không bị pull/up.
: "${CORE_IMAGE_TAG:=$TAG}" "${CTD_API_IMAGE_TAG:=$TAG}"; export CORE_IMAGE_TAG CTD_API_IMAGE_TAG

ut_compose "$ENV" pull "$SERVICE"
ut_compose "$ENV" up -d --no-deps "$SERVICE"
ut_health "http://127.0.0.1:$(ut_app_port "$ENV" "$APP")/api/health"
docker image prune -f >/dev/null
echo "Deployed $APP@$TAG to $ENV"
```

- [ ] **Step 5: Chạy test**

Run: `node --test tools/tests/infra-deploy.test.js 2>&1 | grep -E '^ℹ (pass|fail)'`
Expected: `pass 7`, `fail 0`.

- [ ] **Step 6: Commit**

```bash
git add infra/scripts/lib.sh infra/scripts/deploy.sh tools/tests
git commit -q -m "feat(infra): per-environment deploy.sh with shared lib, lock and health check

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: `apply-infra.sh`, `backup.sh`, `migrate-volumes.sh`

**Files:**
- Create/overwrite: `infra/scripts/apply-infra.sh`, `infra/scripts/backup.sh`, `infra/scripts/migrate-volumes.sh`
- Test: `tools/tests/infra-ops.test.js`

**Interfaces:**
- Consumes: `lib.sh` (Task 5), `sandbox.js`.
- Produces:
  - `apply-infra.sh <env> [apply_db=false]`: git pull nhánh env; backup site nginx hiện có vào `$UT_ROOT/backups/nginx-<ts>/`; cài `infra/nginx/<env>/{core,ctd}.conf` thành `/etc/nginx/sites-available/ultimate-tckt-<env>-{core,ctd}.conf` + symlink; `nginx -t`; reload; `up -d [--no-deps] core ctd-api [core-db ctd-db]` với tag hiện tại.
  - `backup.sh <env>`: ghi `$UT_ROOT/backups/<env>-<yyyymmdd-hhmm>-core.sql.gz` và `-ctd.sql.gz`, giữ 14 bản mỗi loại. Biến `UT_BACKUP_PROJECT` (mặc định `ultimate-tckt-<env>`) cho phép backup stack cũ.
  - `migrate-volumes.sh <env>`: chép `seee-ctd-<env>_{tckt_mysql_data,tckt_uploads,ctd_postgres_data,ctd_documents}` → `ultimate-tckt-<env>_{core_mysql,core_uploads,ctd_postgres,ctd_documents}`; **từ chối** nếu volume đích đã tồn tại và không rỗng (exit 3).

- [ ] **Step 1: Viết test (đỏ)**

`tools/tests/infra-ops.test.js`:
```js
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { makeSandbox } = require('./helpers/sandbox');

test('apply-infra.sh staging installs only staging nginx sites, tests before reload', () => {
  const sb = makeSandbox();
  const r = sb.run('apply-infra.sh', ['staging']);
  assert.equal(r.status, 0, r.stderr);
  const c = sb.calls();
  assert.ok(c.some((l) => l.includes('sites-available/ultimate-tckt-staging-core.conf')));
  assert.ok(c.some((l) => l.includes('sites-available/ultimate-tckt-staging-ctd.conf')));
  assert.ok(!c.some((l) => l.includes('ultimate-tckt-production-')));
  const t = c.findIndex((l) => l === 'sudo nginx -t');
  const rl = c.findIndex((l) => l === 'sudo systemctl reload nginx');
  assert.ok(t >= 0 && rl > t, c.join('\n'));
  assert.ok(c.some((l) => l.includes('up -d --no-deps core ctd-api')));
  assert.ok(!c.some((l) => l.includes('core-db')));
});

test('apply-infra.sh production true also applies databases without --no-deps', () => {
  const sb = makeSandbox();
  const r = sb.run('apply-infra.sh', ['production', 'true']);
  assert.equal(r.status, 0, r.stderr);
  assert.ok(sb.calls().some((l) => l.includes('-p ultimate-tckt-production') && l.includes('up -d core ctd-api core-db ctd-db')));
});

test('backup.sh writes both dumps under backups/', () => {
  const sb = makeSandbox();
  const r = sb.run('backup.sh', ['staging']);
  assert.equal(r.status, 0, r.stderr);
  const c = sb.calls().join('\n');
  assert.match(c, /exec -T core-db mysqldump/);
  assert.match(c, /exec -T ctd-db pg_dump/);
  const files = fs.readdirSync(path.join(sb.root, 'opt', 'backups'));
  assert.ok(files.some((f) => /^staging-\d{8}-\d{4}-core\.sql\.gz$/.test(f)), files.join(','));
  assert.ok(files.some((f) => /^staging-\d{8}-\d{4}-ctd\.sql\.gz$/.test(f)), files.join(','));
});

test('migrate-volumes.sh copies each old volume into its new name', () => {
  const sb = makeSandbox({ dockerOut: { 'volume ls -q': 'seee-ctd-staging_tckt_mysql_data\nseee-ctd-staging_tckt_uploads\nseee-ctd-staging_ctd_postgres_data\nseee-ctd-staging_ctd_documents\n' } });
  const r = sb.run('migrate-volumes.sh', ['staging']);
  assert.equal(r.status, 0, r.stderr);
  const c = sb.calls().join('\n');
  for (const [o, n] of [['tckt_mysql_data', 'core_mysql'], ['tckt_uploads', 'core_uploads'], ['ctd_postgres_data', 'ctd_postgres'], ['ctd_documents', 'ctd_documents']]) {
    assert.match(c, new RegExp(`-v seee-ctd-staging_${o}:/from:ro -v ultimate-tckt-staging_${n}:/to`), o);
  }
});

test('migrate-volumes.sh refuses when a target volume already has data', () => {
  const sb = makeSandbox({ dockerOut: {
    'volume ls -q': 'seee-ctd-staging_tckt_mysql_data\nultimate-tckt-staging_core_mysql\n',
    'ls -A /to': 'ibdata1',
  } });
  const r = sb.run('migrate-volumes.sh', ['staging']);
  assert.equal(r.status, 3);
  assert.match(r.stderr, /already contains data/);
  assert.ok(!sb.calls().some((l) => l.includes('cp -a')));
});
```

Run: `node --test tools/tests/infra-ops.test.js 2>&1 | grep -E '^ℹ (pass|fail)'`
Expected: `fail 5`.

- [ ] **Step 2: `infra/scripts/apply-infra.sh`**

```bash
#!/usr/bin/env bash
# Usage: apply-infra.sh <staging|production> [apply_db: true|false]
# Chạy TRÊN VM khi infra/** đổi. Chỉ xử lý MỘT môi trường.
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"

ENV="${1:-}"; APPLY_DB="${2:-false}"
BRANCH="$(ut_env_branch "$ENV")"
DIR="$(ut_env_dir "$ENV")"
ut_lock "$ENV"
git -C "$DIR" pull --ff-only origin "$BRANCH"

TS="$(date -u +%Y%m%d-%H%M%S)"
BK="$UT_ROOT/backups/nginx-$TS"
mkdir -p "$BK"
sudo cp -a /etc/nginx/sites-available/. "$BK/" 2>/dev/null || true
for app in core ctd; do
  name="ultimate-tckt-$ENV-$app.conf"
  sudo cp "$DIR/infra/nginx/$ENV/$app.conf" "/etc/nginx/sites-available/$name"
  sudo ln -sf "/etc/nginx/sites-available/$name" "/etc/nginx/sites-enabled/$name"
done
sudo nginx -t || ut_die "nginx -t failed; previous sites saved in $BK — nginx NOT reloaded"
sudo systemctl reload nginx

export CORE_IMAGE_TAG="${CORE_IMAGE_TAG:-$(ut_current_tag "$ENV" core)}"
export CTD_API_IMAGE_TAG="${CTD_API_IMAGE_TAG:-$(ut_current_tag "$ENV" ctd-api)}"
if [[ "$APPLY_DB" == "true" ]]; then
  ut_compose "$ENV" up -d core ctd-api core-db ctd-db
else
  ut_compose "$ENV" up -d --no-deps core ctd-api
fi
echo "Infra applied to $ENV at $(git -C "$DIR" rev-parse --short HEAD)"
```

- [ ] **Step 3: `infra/scripts/backup.sh`**

```bash
#!/usr/bin/env bash
# Usage: backup.sh <staging|production>
# Dump MySQL (core) + Postgres (ctd) của một môi trường vào $UT_ROOT/backups/, giữ 14 bản mỗi loại.
# UT_BACKUP_PROJECT=seee-ctd-<env> để backup stack cũ trước khi chuyển (dùng file compose cũ qua UT_BACKUP_COMPOSE_ARGS).
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"

ENV="${1:-}"; ut_env_branch "$ENV" >/dev/null
OUT="$UT_ROOT/backups"; mkdir -p "$OUT"
TS="$(date -u +%Y%m%d-%H%M)"
if [[ -n "${UT_BACKUP_COMPOSE_ARGS:-}" ]]; then
  # shellcheck disable=SC2086
  dc() { docker compose $UT_BACKUP_COMPOSE_ARGS "$@"; }
  CORE_DB_SVC="${UT_BACKUP_CORE_DB_SVC:-tckt-db}"
else
  dc() { ut_compose "$ENV" "$@"; }
  CORE_DB_SVC=core-db
fi

dc exec -T "$CORE_DB_SVC" sh -c 'mysqldump --single-transaction --routines -uroot -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE"' \
  | gzip > "$OUT/$ENV-$TS-core.sql.gz"
dc exec -T ctd-db sh -c 'pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB"' \
  | gzip > "$OUT/$ENV-$TS-ctd.sql.gz"

for kind in core ctd; do
  ls -1t "$OUT"/"$ENV"-*-"$kind".sql.gz 2>/dev/null | tail -n +15 | xargs -r rm -f
done
echo "Backups written: $OUT/$ENV-$TS-{core,ctd}.sql.gz"
```

- [ ] **Step 4: `infra/scripts/migrate-volumes.sh`**

```bash
#!/usr/bin/env bash
# Usage: migrate-volumes.sh <staging|production>
# Chép dữ liệu từ volume stack cũ (seee-ctd-<env>) sang volume tên mới (ultimate-tckt-<env>).
# KHÔNG xoá volume cũ. Từ chối (exit 3) nếu volume đích đã có dữ liệu.
# Phải dừng stack cũ TRƯỚC khi chạy (xem docs/ops/cutover runbook).
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"

ENV="${1:-}"; ut_env_branch "$ENV" >/dev/null
OLD="seee-ctd-$ENV"; NEW="ultimate-tckt-$ENV"
PAIRS=("tckt_mysql_data:core_mysql" "tckt_uploads:core_uploads" "ctd_postgres_data:ctd_postgres" "ctd_documents:ctd_documents")
EXISTING="$(docker volume ls -q)"

for pair in "${PAIRS[@]}"; do
  to="${NEW}_${pair#*:}"
  if grep -qx "$to" <<<"$EXISTING"; then
    content="$(docker run --rm -v "$to:/to" alpine ls -A /to)"
    [[ -z "$content" ]] || { echo "ERROR: $to already contains data — refusing to overwrite" >&2; exit 3; }
  fi
done

for pair in "${PAIRS[@]}"; do
  from="${OLD}_${pair%%:*}"; to="${NEW}_${pair#*:}"
  if ! grep -qx "$from" <<<"$EXISTING"; then echo "skip: $from does not exist"; continue; fi
  docker volume create "$to" >/dev/null
  docker run --rm -v "$from:/from:ro" -v "$to:/to" alpine sh -c 'cp -a /from/. /to/'
  echo "copied $from -> $to"
done
```

- [ ] **Step 5: Chạy test**

Run: `node --test tools/tests/ 2>&1 | grep -E '^ℹ (pass|fail)'`
Expected: `fail 0` (compose 5 + deploy 7 + ops 5 = 17 pass).

- [ ] **Step 6: Commit**

```bash
git add infra/scripts tools/tests/infra-ops.test.js
git commit -q -m "feat(infra): per-env apply-infra, backup and guarded volume migration scripts

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: `bootstrap-vm.sh`, cập nhật `setup-vm.sh` và script tạo user

**Files:**
- Create: `infra/scripts/bootstrap-vm.sh`
- Modify: `infra/scripts/setup-vm.sh` (clone repo mới vào `/opt/ultimate-tckt/<env>`, bỏ `/opt/infra`)
- Move: `create-tckt-admin.sh` → `create-core-admin.sh`, `create-tckt-readonly-user.sh` → `create-core-readonly-user.sh` (đổi project/service/tên file compose bên trong sang `ut_compose`)
- Test: `tools/tests/infra-bootstrap.test.js`

**Interfaces:**
- Consumes: `lib.sh`.
- Produces: `bootstrap-vm.sh <env>` — (1) nếu chưa có `$UT_ROOT/<env>/.git`: `git clone --filter=blob:none --sparse --branch <branch> git@github.com:tduong-p/ultimate-tckt.git $UT_ROOT/<env>` rồi `git -C … sparse-checkout set infra`; (2) đọc `${UT_OLD_ENV_DIR:-/opt/infra}/.env.<env>`, đổi tiền tố `TCKT_` → `CORE_`, sinh `CORE_SETTINGS_ENCRYPTION_KEY` nếu thiếu/rỗng (`openssl rand -base64 32`), kiểm đủ khoá trong `infra/.env.example`, ghi `infra/.env` quyền 600; (3) exit 2 và liệt kê biến thiếu nếu thiếu — **không** ghi file khi thiếu; (4) không bao giờ ghi đè `infra/.env` đã có (in thông báo, exit 0).

Ghi chú: tạo deploy key là bước tay trong runbook (Task 13), không nằm trong script — cần người dán khoá lên GitHub.

- [ ] **Step 1: Viết test (đỏ)**

`tools/tests/infra-bootstrap.test.js`:
```js
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { makeSandbox, repo } = require('./helpers/sandbox');

const OLD = [
  'TCKT_MYSQL_ROOT_PASSWORD=r', 'TCKT_DB_NAME=seee_db', 'TCKT_DB_USER=u', 'TCKT_DB_PASSWORD=p',
  'TCKT_SESSION_SECRET=s', 'CTD_DB_NAME=c', 'CTD_DB_USER=cu', 'CTD_DB_PASSWORD=cp', 'CTD_JWT_SECRET=j',
].join('\n');

function prep(sb, oldEnv) {
  const oldDir = path.join(sb.root, 'old'); fs.mkdirSync(oldDir);
  fs.writeFileSync(path.join(oldDir, '.env.staging'), oldEnv);
  const infra = path.join(sb.root, 'opt', 'staging', 'infra');
  fs.mkdirSync(path.join(sb.root, 'opt', 'staging', '.git'));
  fs.copyFileSync(path.join(repo, 'infra', '.env.example'), path.join(infra, '.env.example'));
  return { oldDir, envFile: path.join(infra, '.env') };
}

test('bootstrap-vm.sh renames TCKT_ keys, keeps values, generates the settings key', () => {
  const sb = makeSandbox();
  const { oldDir, envFile } = prep(sb, OLD);
  const r = sb.run('bootstrap-vm.sh', ['staging'], { UT_OLD_ENV_DIR: oldDir });
  assert.equal(r.status, 0, r.stderr);
  const env = fs.readFileSync(envFile, 'utf8');
  assert.match(env, /^CORE_DB_NAME=seee_db$/m);
  assert.match(env, /^CTD_JWT_SECRET=j$/m);
  assert.match(env, /^CORE_SETTINGS_ENCRYPTION_KEY=.{20,}$/m);
  assert.doesNotMatch(env, /^TCKT_/m);
  assert.equal(fs.statSync(envFile).mode & 0o777, 0o600);
});

test('bootstrap-vm.sh lists missing keys, exits 2 and writes nothing', () => {
  const sb = makeSandbox();
  const { oldDir, envFile } = prep(sb, OLD.replace('CTD_JWT_SECRET=j', ''));
  const r = sb.run('bootstrap-vm.sh', ['staging'], { UT_OLD_ENV_DIR: oldDir });
  assert.equal(r.status, 2);
  assert.match(r.stderr, /CTD_JWT_SECRET/);
  assert.ok(!fs.existsSync(envFile));
});

test('bootstrap-vm.sh never overwrites an existing .env', () => {
  const sb = makeSandbox();
  const { oldDir, envFile } = prep(sb, OLD);
  fs.writeFileSync(envFile, 'KEEP=1\n');
  const r = sb.run('bootstrap-vm.sh', ['staging'], { UT_OLD_ENV_DIR: oldDir });
  assert.equal(r.status, 0);
  assert.equal(fs.readFileSync(envFile, 'utf8'), 'KEEP=1\n');
});

test('bootstrap-vm.sh clones sparse on the env branch when checkout is missing', () => {
  const sb = makeSandbox();
  const r = sb.run('bootstrap-vm.sh', ['production'], { UT_OLD_ENV_DIR: sb.root });
  const c = sb.calls().join('\n');
  assert.match(c, /git clone --filter=blob:none --sparse --branch main git@github\.com:tduong-p\/ultimate-tckt\.git .*\/opt\/production/);
  assert.match(c, /sparse-checkout set infra/);
  assert.notEqual(r.status, 0); // không có .env.production cũ -> dừng ở bước env
});
```

Run: `node --test tools/tests/infra-bootstrap.test.js 2>&1 | grep -E '^ℹ (pass|fail)'`
Expected: `fail 4`.

- [ ] **Step 2: Viết `infra/scripts/bootstrap-vm.sh`**

```bash
#!/usr/bin/env bash
# Usage: bootstrap-vm.sh <staging|production>
# Chạy MỘT LẦN trên VM khi chuyển sang repo ultimate-tckt. Không đụng container đang chạy.
# Yêu cầu trước: deploy key chỉ-đọc của VM đã được thêm vào repo (docs/ops runbook).
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"

ENV="${1:-}"; BRANCH="$(ut_env_branch "$ENV")"
DIR="$(ut_env_dir "$ENV")"
OLD_ENV="${UT_OLD_ENV_DIR:-/opt/infra}/.env.$ENV"

if [[ ! -d "$DIR/.git" ]]; then
  mkdir -p "$(dirname "$DIR")"
  git clone --filter=blob:none --sparse --branch "$BRANCH" git@github.com:tduong-p/ultimate-tckt.git "$DIR"
  git -C "$DIR" sparse-checkout set infra
fi

TARGET="$DIR/infra/.env"
if [[ -f "$TARGET" ]]; then echo "$TARGET already exists — leaving it untouched"; exit 0; fi
[[ -f "$OLD_ENV" ]] || ut_die "old env file not found: $OLD_ENV"

TMP="$(mktemp)"; trap 'rm -f "$TMP"' EXIT
sed -E 's/^TCKT_/CORE_/' "$OLD_ENV" > "$TMP"
if ! grep -Eq '^CORE_SETTINGS_ENCRYPTION_KEY=.+' "$TMP"; then
  sed -i.bak '/^CORE_SETTINGS_ENCRYPTION_KEY=/d' "$TMP" && rm -f "$TMP.bak"
  echo "CORE_SETTINGS_ENCRYPTION_KEY=$(openssl rand -base64 32)" >> "$TMP"
fi

missing=()
while IFS= read -r key; do
  [[ "$key" == "CORE_DEVOPS_EMAILS" ]] && continue   # tuỳ chọn
  grep -Eq "^${key}=.+" "$TMP" || missing+=("$key")
done < <(sed -nE 's/^([A-Z0-9_]+)=.*/\1/p' "$DIR/infra/.env.example")
if (( ${#missing[@]} )); then
  echo "ERROR: missing required variables in $OLD_ENV (after rename): ${missing[*]}" >&2
  exit 2
fi

install -m 600 "$TMP" "$TARGET"
echo "Wrote $TARGET"
```

Ghi chú: `sed -i.bak` (không phải `sed -i`) để chạy được cả trên macOS lẫn GNU. Test chạy trên macOS local; VM là Ubuntu.

- [ ] **Step 3: Cập nhật `setup-vm.sh`**

Thay khối "Cloning infra repo to /opt/infra" và "Enabling all Nginx sites" bằng:
```bash
echo "== Preparing /opt/ultimate-tckt =="
sudo mkdir -p /opt/ultimate-tckt/backups
sudo chown -R "$USER":"$USER" /opt/ultimate-tckt
echo "== Next: add this VM's deploy key to tduong-p/ultimate-tckt, then for each env run =="
echo "   bash <(curl -fsSL …) is NOT used — copy infra/scripts from a checkout and run:"
echo "   infra/scripts/bootstrap-vm.sh staging && infra/scripts/apply-infra.sh staging"
echo "   infra/scripts/bootstrap-vm.sh production && infra/scripts/apply-infra.sh production"
```
và đổi dòng usage/next-steps cuối file cho khớp (`/opt/ultimate-tckt/<env>/infra/.env`). Bỏ tham số `<github-owner>` (repo cố định `tduong-p/ultimate-tckt`).

- [ ] **Step 4: Đổi tên và sửa script tạo user**

```bash
git mv infra/scripts/create-tckt-admin.sh infra/scripts/create-core-admin.sh
git mv infra/scripts/create-tckt-readonly-user.sh infra/scripts/create-core-readonly-user.sh
```
Trong cả hai file: thêm `source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"`; thay mọi `docker compose -p seee-ctd-… --env-file … -f …` bằng `ut_compose "$ENV"`; `tckt-db` → `core-db`, `tckt-app` → `core`; `TCKT_` → `CORE_`; `/opt/infra` → `$(ut_env_dir "$ENV")`.

- [ ] **Step 5: Chạy toàn bộ test tools + kiểm tên cũ**

Run: `node --test tools/tests/ 2>&1 | grep -E '^ℹ (pass|fail)'; grep -rIn 'seee\|/opt/infra\|tckt-app\|ctd-app\|TCKT_' infra | grep -v 'migrate-volumes.sh\|bootstrap-vm.sh\|backup.sh'`
Expected: `pass 21`, `fail 0`; grep không in gì (ba file được loại trừ là nơi hợp lệ nhắc tên cũ: chuyển dữ liệu, đọc `.env` cũ, backup stack cũ).

- [ ] **Step 6: Commit**

```bash
git add -A infra tools/tests
git commit -q -m "feat(infra): bootstrap-vm for per-env checkouts and .env migration; rename core user scripts

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: GitHub Actions — deploy, ghcr-cleanup, PR template, CODEOWNERS

**Files:**
- Create: `.github/workflows/deploy.yml`, `.github/workflows/ghcr-cleanup.yml`, `.github/pull_request_template.md`, `.github/CODEOWNERS`
- Test: `tools/tests/workflows.test.js`

**Interfaces:**
- Consumes: `infra/scripts/deploy.sh <env> <app> <tag>`, `infra/scripts/apply-infra.sh <env> [apply_db]`.
- Produces: job id `changes`, `test-core`, `test-ctd`, `build-core`, `build-ctd-api`, `deploy-core`, `deploy-ctd-api`, `infra` (tên check dùng cho bảo vệ nhánh ở Task 17).

- [ ] **Step 1: Test (đỏ)** — `tools/tests/workflows.test.js`:
```js
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const wf = (n) => fs.readFileSync(path.join(__dirname, '..', '..', '.github', 'workflows', n), 'utf8');

test('deploy.yml wires test -> build -> deploy with gates', () => {
  const y = wf('deploy.yml');
  for (const j of ['changes', 'test-core', 'test-ctd', 'build-core', 'build-ctd-api', 'deploy-core', 'deploy-ctd-api', 'infra']) {
    assert.match(y, new RegExp(`^  ${j}:`, 'm'), j);
  }
  assert.match(y, /needs: \[changes, test-core\]/);
  assert.match(y, /needs: \[changes, test-ctd\]/);
  assert.match(y, /vars\.DEPLOY_ENABLED == 'true'/);
  assert.match(y, /platforms: linux\/arm64/);
  assert.match(y, /ultimate-tckt-core:\$\{\{ needs\.changes\.outputs\.tag \}\}/);
  assert.match(y, /ultimate-tckt-ctd-api:\$\{\{ needs\.changes\.outputs\.tag \}\}/);
  assert.match(y, /\/opt\/ultimate-tckt\/\$\{\{ needs\.changes\.outputs\.env \}\}\/infra\/scripts\/deploy\.sh/);
  assert.match(y, /group: vm-deploy-\$\{\{ needs\.changes\.outputs\.env \}\}/);
  assert.match(y, /image: mysql:8/);
  assert.match(y, /image: postgres:16/);
  assert.doesNotMatch(y, /seee|tckt-activity-hub|\/opt\/infra/);
});

test('ghcr-cleanup keeps 10 versions of both images weekly', () => {
  const y = wf('ghcr-cleanup.yml');
  assert.match(y, /cron:/);
  assert.match(y, /min-versions-to-keep: 10/);
  assert.match(y, /ultimate-tckt-core/);
  assert.match(y, /ultimate-tckt-ctd-api/);
});
```
Run: `node --test tools/tests/workflows.test.js 2>&1 | grep -E '^ℹ (pass|fail)'` → Expected: `fail 2`.

- [ ] **Step 2: `.github/workflows/deploy.yml`**

```yaml
name: deploy

on:
  push:
    branches: [staging, main]
  pull_request:
    branches: [staging, main]
  workflow_dispatch:
    inputs:
      apply_db:
        description: 'Infra: also apply database services (core-db / ctd-db)?'
        type: boolean
        default: false

jobs:
  changes:
    runs-on: ubuntu-latest
    outputs:
      core: ${{ steps.f.outputs.core }}
      ctd: ${{ steps.f.outputs.ctd }}
      infra: ${{ steps.f.outputs.infra }}
      tag: ${{ steps.v.outputs.tag }}
      env: ${{ steps.v.outputs.env }}
    steps:
      - uses: actions/checkout@v4
      - uses: dorny/paths-filter@v3
        id: f
        with:
          filters: |
            core:
              - 'core/**'
              - 'web/**'
            ctd:
              - 'services/ctd-api/**'
            infra:
              - 'infra/**'
      - id: v
        run: |
          echo "tag=${GITHUB_SHA::12}" >> "$GITHUB_OUTPUT"
          if [[ "${GITHUB_REF_NAME}" == "main" ]]; then echo "env=production" >> "$GITHUB_OUTPUT"; else echo "env=staging" >> "$GITHUB_OUTPUT"; fi

  test-core:
    needs: changes
    if: needs.changes.outputs.core == 'true'
    runs-on: ubuntu-latest
    services:
      mysql:
        image: mysql:8
        env:
          MYSQL_ROOT_PASSWORD: root
        ports: ['3306:3306']
        options: >-
          --health-cmd "mysqladmin ping -proot" --health-interval 5s --health-timeout 5s --health-retries 20
    defaults:
      run:
        working-directory: core
    env:
      TEST_DB_HOST: 127.0.0.1
      TEST_DB_PORT: 3306
      TEST_DB_USER: root
      TEST_DB_PASSWORD: root
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
          cache-dependency-path: core/package-lock.json
      - run: npm ci
      - run: npm test

  test-ctd:
    needs: changes
    if: needs.changes.outputs.ctd == 'true'
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: ctd_test
        ports: ['5432:5432']
        options: >-
          --health-cmd pg_isready --health-interval 5s --health-timeout 5s --health-retries 20
    defaults:
      run:
        working-directory: services/ctd-api/backend
    env:
      TEST_DATABASE_URL: postgresql+psycopg://postgres:postgres@localhost:5432/ctd_test
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.12'
      - run: pip install -e . pytest httpx
      - run: pytest -q

  build-core:
    needs: [changes, test-core]
    if: github.event_name == 'push' && needs.changes.outputs.core == 'true'
    runs-on: ubuntu-latest
    permissions: { contents: read, packages: write }
    steps:
      - uses: actions/checkout@v4
      - uses: docker/login-action@v3
        with: { registry: ghcr.io, username: '${{ github.actor }}', password: '${{ secrets.GITHUB_TOKEN }}' }
      - uses: docker/setup-qemu-action@v3
      - uses: docker/setup-buildx-action@v3
      # VM là Oracle Ampere A1 (arm64); runner miễn phí là amd64 -> build arm64 qua QEMU.
      - uses: docker/build-push-action@v6
        with:
          context: core
          platforms: linux/arm64
          push: true
          tags: ghcr.io/tduong-p/ultimate-tckt-core:${{ needs.changes.outputs.tag }}
          cache-from: type=gha,scope=core
          cache-to: type=gha,scope=core,mode=max

  build-ctd-api:
    needs: [changes, test-ctd]
    if: github.event_name == 'push' && needs.changes.outputs.ctd == 'true'
    runs-on: ubuntu-latest
    permissions: { contents: read, packages: write }
    steps:
      - uses: actions/checkout@v4
      - uses: docker/login-action@v3
        with: { registry: ghcr.io, username: '${{ github.actor }}', password: '${{ secrets.GITHUB_TOKEN }}' }
      - uses: docker/setup-qemu-action@v3
      - uses: docker/setup-buildx-action@v3
      - uses: docker/build-push-action@v6
        with:
          context: services/ctd-api
          platforms: linux/arm64
          push: true
          tags: ghcr.io/tduong-p/ultimate-tckt-ctd-api:${{ needs.changes.outputs.tag }}
          cache-from: type=gha,scope=ctd-api
          cache-to: type=gha,scope=ctd-api,mode=max

  deploy-core:
    needs: [changes, build-core]
    if: github.event_name == 'push' && vars.DEPLOY_ENABLED == 'true'
    runs-on: ubuntu-latest
    environment: ${{ needs.changes.outputs.env }}
    concurrency:
      group: vm-deploy-${{ needs.changes.outputs.env }}
      cancel-in-progress: false
    steps:
      - uses: appleboy/ssh-action@v1.2.0
        with:
          host: ${{ secrets.SSH_HOST }}
          username: ${{ secrets.SSH_USER }}
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          script: bash /opt/ultimate-tckt/${{ needs.changes.outputs.env }}/infra/scripts/deploy.sh ${{ needs.changes.outputs.env }} core ${{ needs.changes.outputs.tag }}

  deploy-ctd-api:
    needs: [changes, build-ctd-api]
    if: github.event_name == 'push' && vars.DEPLOY_ENABLED == 'true'
    runs-on: ubuntu-latest
    environment: ${{ needs.changes.outputs.env }}
    concurrency:
      group: vm-deploy-${{ needs.changes.outputs.env }}
      cancel-in-progress: false
    steps:
      - uses: appleboy/ssh-action@v1.2.0
        with:
          host: ${{ secrets.SSH_HOST }}
          username: ${{ secrets.SSH_USER }}
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          script: bash /opt/ultimate-tckt/${{ needs.changes.outputs.env }}/infra/scripts/deploy.sh ${{ needs.changes.outputs.env }} ctd-api ${{ needs.changes.outputs.tag }}

  infra:
    needs: changes
    if: >-
      vars.DEPLOY_ENABLED == 'true' &&
      (github.event_name == 'workflow_dispatch' ||
       (github.event_name == 'push' && needs.changes.outputs.infra == 'true'))
    runs-on: ubuntu-latest
    environment: ${{ needs.changes.outputs.env }}
    concurrency:
      group: vm-deploy-${{ needs.changes.outputs.env }}
      cancel-in-progress: false
    steps:
      - uses: appleboy/ssh-action@v1.2.0
        with:
          host: ${{ secrets.SSH_HOST }}
          username: ${{ secrets.SSH_USER }}
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          script: bash /opt/ultimate-tckt/${{ needs.changes.outputs.env }}/infra/scripts/apply-infra.sh ${{ needs.changes.outputs.env }} ${{ inputs.apply_db == true && 'true' || 'false' }}
```

Ghi chú: `infra` và `deploy-*` dùng chung group concurrency của môi trường nên không chạy chồng; khi cùng push đổi cả `infra/` lẫn app, thứ tự giữa chúng không đảm bảo — chấp nhận vì cả hai đều `git pull` trước và dùng tag hiện tại.

Ghi chú khi bảo vệ nhánh bắt buộc `test-core`/`test-ctd`: job bị `skip` do path filter được GitHub coi là thành công — không chặn PR chỉ đổi docs.

- [ ] **Step 3: `.github/workflows/ghcr-cleanup.yml`**

```yaml
name: ghcr-cleanup
on:
  schedule:
    - cron: '0 3 * * 1'   # 10:00 thứ Hai giờ VN
  workflow_dispatch:
jobs:
  cleanup:
    runs-on: ubuntu-latest
    permissions: { packages: write }
    strategy:
      matrix:
        package: [ultimate-tckt-core, ultimate-tckt-ctd-api]
    steps:
      # Giữ 10 bản mới nhất. Tag đang chạy luôn nằm trong 10 bản mới nhất vì mỗi deploy là một bản mới.
      - uses: actions/delete-package-versions@v5
        with:
          package-name: ${{ matrix.package }}
          package-type: container
          min-versions-to-keep: 10
```

- [ ] **Step 4: PR template và CODEOWNERS**

`.github/pull_request_template.md`:
```markdown
## Thay đổi gì, vì sao

## Tài liệu đã cập nhật
<!-- Liệt kê doc_id + version mới. Không cần tài liệu? Ghi "Docs: không cần vì …" và gắn nhãn no-docs-needed -->
-

## ADR mới (nếu có)
-

## Test đã chạy
- [ ] `cd core && npm test`
- [ ] `cd services/ctd-api/backend && pytest`
- [ ] `npm run test:tools && npm run docs:check`
```
`.github/CODEOWNERS`:
```
# Mặc định: DYC review mọi thứ. Thêm nhóm theo module khi có thành viên.
*                    @tduong-p
/core/               @tduong-p
/services/ctd-api/   @tduong-p
/infra/              @tduong-p
/docs/               @tduong-p
```

- [ ] **Step 5: Chạy test**

Run: `node --test tools/tests/ 2>&1 | grep -E '^ℹ (pass|fail)'`
Expected: `pass 23`, `fail 0`.

- [ ] **Step 6: Commit**

```bash
git add .github tools/tests/workflows.test.js
git commit -q -m "ci: monorepo deploy pipeline with test gates, path filters and GHCR cleanup

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Phase B — Hệ thống tài liệu

### Task 9: `docs-check` (frontmatter, bump version, index, link, tác động code)

**Files:**
- Create: `tools/docs-check/frontmatter.js`, `tools/docs-check/rules.js`, `tools/docs-check/index.js`, `tools/docs-check/cli.js`
- Test: `tools/tests/docs-check.test.js`

**Interfaces:**
- Produces:
  - `frontmatter.parse(text) → { data: object|null, body: string }` — YAML phẳng: `key: value`, `key: [a, b]`, bỏ comment `# …`.
  - `rules.validate(data, file) → string[]` (lỗi). Bắt buộc: `doc_id` khớp `/^[A-Z]+-[A-Z0-9]+-\d{3}$/`, `title`, `version` khớp `/^\d+\.\d+$/`, `status ∈ {draft, active, deprecated}`, `audience` mảng con của `{ba, dev, ops, onboarding, ai}` không rỗng, `owner`, `updated` dạng `YYYY-MM-DD`, `related_code` mảng (có thể rỗng); thân bài có `## Lịch sử phiên bản`.
  - `rules.compareVersions(a, b) → -1|0|1`.
  - `rules.bodyChanged(oldBody, newBody) → boolean` — so sau khi bỏ khoảng trắng cuối dòng và dòng trống thừa.
  - `rules.checkBump(oldText, newText, file) → string[]` — thân đổi mà `version` không tăng → lỗi; `updated` không đổi → lỗi; version tăng nhưng mục lịch sử không có dòng `| <version> |` → lỗi.
  - `rules.globToRegExp(glob) → RegExp` (`**` = mọi thứ, `*` = không chứa `/`).
  - `rules.docsImpact(changedFiles, docs) → string[]` — với mỗi file code đổi (không thuộc `docs/`) khớp `related_code` của một doc mà doc đó không nằm trong `changedFiles` → lỗi `"<code> changed but <doc_id> (<path>) was not updated"`.
  - `rules.brokenLinks(file, body, exists) → string[]` — link Markdown tương đối `](path)` / `](path#anchor)` không tồn tại.
  - `index.build(docs) → string` — nội dung `docs/README.md` (bảng theo nhóm thư mục).
  - CLI: `node tools/docs-check/cli.js index` ghi `docs/README.md`; `node tools/docs-check/cli.js check [--base <git-ref>] [--allow-no-docs]` exit 1 nếu có lỗi, in từng lỗi một dòng.
- Quy ước: bỏ qua `docs/ba/nguon/**` khi validate/bump (vẫn kiểm link tới chúng); `docs/README.md` và `docs/CHANGELOG.md` được sinh/ghi bởi tool nên không cần frontmatter.

- [ ] **Step 1: Viết test (đỏ)** — `tools/tests/docs-check.test.js`:
```js
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fm = require('../docs-check/frontmatter');
const rules = require('../docs-check/rules');
const { build } = require('../docs-check/index');

const doc = (over = {}, body = '# T\n\nNội dung.\n\n## Lịch sử phiên bản\n\n| Version | Ngày | Thay đổi | Người |\n|---|---|---|---|\n| 1.0 | 2026-09-23 | Bản đầu | DYC |\n') => {
  const d = { doc_id: 'DEV-ARCH-001', title: 'Kiến trúc', version: '1.0', status: 'active', audience: '[dev, ai]',
    owner: 'DYC', updated: '2026-09-23', related_code: '[core/src/policies/**]', ...over };
  return `---\n${Object.entries(d).map(([k, v]) => `${k}: ${v}`).join('\n')}\n---\n${body}`;
};

test('parse reads scalars, arrays and strips comments', () => {
  const { data, body } = fm.parse(doc({ version: '1.2   # MINOR' }));
  assert.equal(data.version, '1.2');
  assert.deepEqual(data.audience, ['dev', 'ai']);
  assert.deepEqual(data.related_code, ['core/src/policies/**']);
  assert.match(body, /^# T/);
});

test('parse returns data null without frontmatter', () => {
  assert.equal(fm.parse('# no fm\n').data, null);
});

test('validate accepts a good doc and reports each bad field', () => {
  const good = fm.parse(doc());
  assert.deepEqual(rules.validate(good.data, 'x.md', good.body), []);
  const bad = fm.parse(doc({ doc_id: 'arch', version: 'v1', status: 'live', audience: '[boss]', updated: '23/9' }, '# T\n'));
  const errs = rules.validate(bad.data, 'x.md', bad.body).join('\n');
  for (const k of ['doc_id', 'version', 'status', 'audience', 'updated', 'Lịch sử phiên bản']) assert.match(errs, new RegExp(k));
});

test('checkBump: body change without version bump fails', () => {
  const a = doc();
  const b = doc({}, doc().split('---\n')[2].replace('Nội dung.', 'Nội dung mới.'));
  assert.match(rules.checkBump(a, b, 'x.md').join('\n'), /version/);
});

test('checkBump: whitespace-only change needs no bump', () => {
  const a = doc();
  const b = a.replace('Nội dung.\n', 'Nội dung.   \n\n');
  assert.deepEqual(rules.checkBump(a, b, 'x.md'), []);
});

test('checkBump: bump with updated date and history row passes', () => {
  const a = doc();
  const body = doc().split('---\n')[2].replace('Nội dung.', 'Nội dung mới.') + '| 1.1 | 2026-09-24 | Sửa | DYC |\n';
  const b = doc({ version: '1.1', updated: '2026-09-24' }, body);
  assert.deepEqual(rules.checkBump(a, b, 'x.md'), []);
});

test('checkBump: bump without history row fails', () => {
  const b = doc({ version: '1.1', updated: '2026-09-24' }, doc().split('---\n')[2].replace('Nội dung.', 'Khác.'));
  assert.match(rules.checkBump(doc(), b, 'x.md').join('\n'), /Lịch sử/);
});

test('compareVersions orders numerically', () => {
  assert.equal(rules.compareVersions('1.10', '1.9'), 1);
  assert.equal(rules.compareVersions('2.0', '2.0'), 0);
  assert.equal(rules.compareVersions('1.0', '2.0'), -1);
});

test('docsImpact flags code changes whose doc did not change', () => {
  const docs = [{ path: 'docs/dev/rbac.md', data: { doc_id: 'DEV-RBAC-001', related_code: ['core/src/policies/**'] } }];
  assert.equal(rules.docsImpact(['core/src/policies/access.js'], docs).length, 1);
  assert.deepEqual(rules.docsImpact(['core/src/policies/access.js', 'docs/dev/rbac.md'], docs), []);
  assert.deepEqual(rules.docsImpact(['core/src/routes/tasks.js'], docs), []);
});

test('brokenLinks finds missing relative targets and ignores urls/anchors', () => {
  const body = '[a](../dev/ok.md) [b](missing.md#x) [c](https://x.y) [d](#top)';
  const exists = (p) => p.endsWith('docs/dev/ok.md');
  const errs = rules.brokenLinks('docs/ops/deploy.md', body, exists);
  assert.equal(errs.length, 1);
  assert.match(errs[0], /missing\.md/);
});

test('build renders a table row per doc grouped by folder', () => {
  const out = build([{ path: 'docs/dev/arch.md', data: { doc_id: 'DEV-ARCH-001', title: 'Kiến trúc', version: '1.0', status: 'active', audience: ['dev'], related_code: [] } }]);
  assert.match(out, /## dev/);
  assert.match(out, /\| \[DEV-ARCH-001\]\(dev\/arch\.md\) \| Kiến trúc \| 1\.0 \| active \| dev \|/);
});
```
Run: `node --test tools/tests/docs-check.test.js 2>&1 | grep -E '^ℹ (pass|fail)'` → Expected: `fail 11`.

- [ ] **Step 2: `tools/docs-check/frontmatter.js`**

```js
'use strict';
// YAML phẳng tối giản: "key: value" và "key: [a, b]". Đủ cho frontmatter tài liệu; không cần dependency.
function parseValue(raw) {
  const v = raw.replace(/\s+#.*$/, '').trim();
  if (v.startsWith('[') && v.endsWith(']')) {
    const inner = v.slice(1, -1).trim();
    return inner ? inner.split(',').map((s) => s.trim().replace(/^['"]|['"]$/g, '')) : [];
  }
  return v.replace(/^['"]|['"]$/g, '');
}

function parse(text) {
  const m = /^---\n([\s\S]*?)\n---\n?/.exec(text);
  if (!m) return { data: null, body: text };
  const data = {};
  for (const line of m[1].split('\n')) {
    const kv = /^([a-z_]+):\s*(.*)$/.exec(line);
    if (kv) data[kv[1]] = parseValue(kv[2]);
  }
  return { data, body: text.slice(m[0].length) };
}

module.exports = { parse };
```

- [ ] **Step 3: `tools/docs-check/rules.js`**

```js
'use strict';
const path = require('node:path');
const { parse } = require('./frontmatter');

const AUDIENCES = new Set(['ba', 'dev', 'ops', 'onboarding', 'ai']);
const STATUSES = new Set(['draft', 'active', 'deprecated']);
const HISTORY = '## Lịch sử phiên bản';

function validate(d, file, body = '') {
  const e = [];
  const req = (k, ok, msg) => { if (!ok) e.push(`${file}: ${k} ${msg}`); };
  req('doc_id', /^[A-Z]+-[A-Z0-9]+-\d{3}$/.test(d.doc_id || ''), 'must look like DEV-ARCH-001');
  req('title', !!d.title, 'is required');
  req('version', /^\d+\.\d+$/.test(d.version || ''), 'must be MAJOR.MINOR');
  req('status', STATUSES.has(d.status), 'must be draft|active|deprecated');
  req('audience', Array.isArray(d.audience) && d.audience.length > 0 && d.audience.every((a) => AUDIENCES.has(a)),
    'must be a non-empty list of ba|dev|ops|onboarding|ai');
  req('owner', !!d.owner, 'is required');
  req('updated', /^\d{4}-\d{2}-\d{2}$/.test(d.updated || ''), 'must be YYYY-MM-DD');
  req('related_code', Array.isArray(d.related_code), 'must be a list (may be empty)');
  req('body', body.includes(HISTORY), `must contain "${HISTORY}"`);
  return e;
}

function compareVersions(a, b) {
  const [a1, a2] = a.split('.').map(Number);
  const [b1, b2] = b.split('.').map(Number);
  return Math.sign(a1 - b1 || a2 - b2);
}

const normalize = (s) => s.split('\n').map((l) => l.replace(/\s+$/, '')).filter((l, i, arr) => l !== '' || arr[i - 1] !== '').join('\n').trim();
function bodyChanged(oldBody, newBody) { return normalize(oldBody) !== normalize(newBody); }

function checkBump(oldText, newText, file) {
  const o = parse(oldText); const n = parse(newText);
  if (!o.data || !n.data) return [];
  if (!bodyChanged(o.body, n.body)) return [];
  const e = [];
  if (compareVersions(n.data.version || '0.0', o.data.version || '0.0') <= 0) {
    e.push(`${file}: content changed but version was not increased (still ${n.data.version})`);
    return e;
  }
  if (n.data.updated === o.data.updated) e.push(`${file}: version bumped but updated date unchanged`);
  if (!new RegExp(`^\\|\\s*${n.data.version.replace('.', '\\.')}\\s*\\|`, 'm').test(n.body)) {
    e.push(`${file}: add a row for ${n.data.version} under "${HISTORY}"`);
  }
  return e;
}

function globToRegExp(glob) {
  const re = glob.split('**').map((part) => part.split('*').map((s) => s.replace(/[.+?^${}()|[\]\\]/g, '\\$&')).join('[^/]*')).join('.*');
  return new RegExp(`^${re}$`);
}

function docsImpact(changedFiles, docs) {
  const changed = new Set(changedFiles);
  const e = [];
  for (const f of changedFiles) {
    if (f.startsWith('docs/')) continue;
    for (const d of docs) {
      const globs = d.data.related_code || [];
      if (globs.some((g) => globToRegExp(g).test(f)) && !changed.has(d.path)) {
        e.push(`${f} changed but ${d.data.doc_id} (${d.path}) was not updated`);
      }
    }
  }
  return [...new Set(e)];
}

function brokenLinks(file, body, exists) {
  const e = [];
  for (const m of body.matchAll(/\]\(([^)\s]+)\)/g)) {
    const target = m[1];
    if (/^[a-z]+:/i.test(target) || target.startsWith('#')) continue;
    const p = path.normalize(path.join(path.dirname(file), target.split('#')[0]));
    if (!exists(p)) e.push(`${file}: broken link -> ${target}`);
  }
  return e;
}

module.exports = { validate, compareVersions, bodyChanged, checkBump, globToRegExp, docsImpact, brokenLinks };
```

- [ ] **Step 4: `tools/docs-check/index.js`**

```js
'use strict';
function build(docs) {
  const groups = new Map();
  for (const d of [...docs].sort((a, b) => a.path.localeCompare(b.path))) {
    const rel = d.path.replace(/^docs\//, '');
    const g = rel.includes('/') ? rel.split('/')[0] : '(gốc)';
    if (!groups.has(g)) groups.set(g, []);
    groups.get(g).push({ ...d, rel });
  }
  const out = [
    '# Bản đồ tài liệu',
    '',
    '> File này được sinh bởi `npm run docs:index` từ frontmatter. Không sửa tay.',
    '> Đọc `AGENTS.md` ở gốc repo để biết quy tắc cập nhật tài liệu.',
    '',
  ];
  for (const [g, list] of groups) {
    out.push(`## ${g}`, '', '| Tài liệu | Tiêu đề | Version | Trạng thái | Đối tượng |', '|---|---|---|---|---|');
    for (const d of list) {
      const a = (d.data.audience || []).join(', ');
      out.push(`| [${d.data.doc_id || d.rel}](${d.rel}) | ${d.data.title || ''} | ${d.data.version || ''} | ${d.data.status || 'source'} | ${a} |`);
    }
    out.push('');
  }
  return out.join('\n');
}
module.exports = { build };
```

- [ ] **Step 5: `tools/docs-check/cli.js`**

```js
#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { parse } = require('./frontmatter');
const rules = require('./rules');
const { build } = require('./index');

const ROOT = path.join(__dirname, '..', '..');
const GENERATED = new Set(['docs/README.md', 'docs/CHANGELOG.md']);
const isSource = (p) => p.startsWith('docs/ba/nguon/');

function walk(dir) {
  return fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true }).flatMap((e) => {
    const rel = `${dir}/${e.name}`;
    return e.isDirectory() ? walk(rel) : (e.name.endsWith('.md') ? [rel] : []);
  });
}

function loadDocs() {
  return walk('docs').filter((p) => !GENERATED.has(p)).map((p) => {
    const text = fs.readFileSync(path.join(ROOT, p), 'utf8');
    return { path: p, text, ...parse(text) };
  });
}

const git = (...a) => execFileSync('git', a, { cwd: ROOT, encoding: 'utf8' });

function cmdIndex() {
  const docs = loadDocs().filter((d) => d.data && !isSource(d.path));
  fs.writeFileSync(path.join(ROOT, 'docs/README.md'), build(docs) + '\n');
  console.log(`docs/README.md: ${docs.length} documents`);
}

function cmdCheck(args) {
  const base = args.includes('--base') ? args[args.indexOf('--base') + 1] : null;
  const allowNoDocs = args.includes('--allow-no-docs');
  const docs = loadDocs();
  const errors = [];
  const ids = new Map();
  for (const d of docs) {
    if (isSource(d.path)) continue;
    if (!d.data) { errors.push(`${d.path}: missing frontmatter`); continue; }
    errors.push(...rules.validate(d.data, d.path, d.body));
    if (ids.has(d.data.doc_id)) errors.push(`${d.path}: doc_id ${d.data.doc_id} also used by ${ids.get(d.data.doc_id)}`);
    ids.set(d.data.doc_id, d.path);
  }
  for (const f of [...walk('docs'), 'AGENTS.md', 'README.md'].filter((p) => fs.existsSync(path.join(ROOT, p)))) {
    const body = fs.readFileSync(path.join(ROOT, f), 'utf8');
    errors.push(...rules.brokenLinks(f, body, (p) => fs.existsSync(path.join(ROOT, p))));
  }
  const expectedIndex = build(docs.filter((d) => d.data && !isSource(d.path))) + '\n';
  const actualIndex = fs.existsSync(path.join(ROOT, 'docs/README.md')) ? fs.readFileSync(path.join(ROOT, 'docs/README.md'), 'utf8') : '';
  if (expectedIndex !== actualIndex) errors.push('docs/README.md is out of date — run: npm run docs:index');

  if (base) {
    const changed = git('diff', '--name-only', `${base}...HEAD`).split('\n').filter(Boolean);
    for (const f of changed.filter((p) => p.startsWith('docs/') && p.endsWith('.md') && !GENERATED.has(p) && !isSource(p))) {
      if (!fs.existsSync(path.join(ROOT, f))) continue;
      let old = '';
      try { old = git('show', `${base}:${f}`); } catch { continue; } // file mới
      errors.push(...rules.checkBump(old, fs.readFileSync(path.join(ROOT, f), 'utf8'), f));
    }
    if (!allowNoDocs) errors.push(...rules.docsImpact(changed, docs.filter((d) => d.data)));
  }

  for (const e of errors) console.error(e);
  if (errors.length) { console.error(`\n${errors.length} documentation problem(s).`); process.exit(1); }
  console.log(`docs ok: ${docs.length} files checked`);
}

const [cmd, ...rest] = process.argv.slice(2);
if (cmd === 'index') cmdIndex();
else if (cmd === 'check') cmdCheck(rest);
else { console.error('usage: cli.js index | check [--base <ref>] [--allow-no-docs]'); process.exit(2); }
```

- [ ] **Step 6: Chạy test**

Run: `node --test tools/tests/ 2>&1 | grep -E '^ℹ (pass|fail)'`
Expected: `pass 34`, `fail 0`.

- [ ] **Step 7: Commit**

```bash
git add tools/docs-check tools/tests/docs-check.test.js
git commit -q -m "feat(tools): docs-check for frontmatter, version bumps, index, links and code impact

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: Bảng xử lý tài liệu cũ — **DỪNG để chủ repo duyệt**

**Files:**
- Create: `docs/legacy/INVENTORY.md` (tạm, xoá ở Task 15)

**Interfaces:**
- Consumes: `docs/legacy/**` (Task 1), `.kiro/`, `core/`/`services/ctd-api/` README còn sót.
- Produces: bảng `| # | File nguồn | Hành động | Đích | Ghi chú |` với hành động ∈ `viết lại vào`, `rút thành ADR`, `chuyển vào ba/nguon`, `bỏ`. Được chủ repo duyệt (ghi `Duyệt: <ngày>` ở đầu file).

- [ ] **Step 1: Liệt kê mọi file**

Run: `cd ~/Developer/ultimate-tckt && find docs/legacy .kiro -type f \( -name '*.md' -o -name '*.docx' -o -name '*.pdf' \) | sort > /tmp/ut-docs.txt; wc -l < /tmp/ut-docs.txt`
Expected: ~60 dòng.

- [ ] **Step 2: Đọc từng file (đầu + mục lục) và điền bảng theo nguyên tắc spec §5.2**

Mặc định đã chốt trong spec (áp dụng, không hỏi lại):
- `superpowers/specs|plans` đã làm xong (hub: 2026-09-16 phase1, 09-17 role-refactoring, 09-18 production-frontend, 09-18 minimalist-ui, 09-21 email-cron; ctd: 09-15 he-thong-xet-duyet design + m0-m1 plans, 09-16 deploy-infra) → `rút thành ADR`.
- Spec đa đơn vị 2026-09-23 (`docs/superpowers/specs/…nen-tang-da-don-vi…`) → `bỏ` (bản hiệu lực là `.kiro/specs/nen-tang-da-don-vi/`, chuyển vào `docs/specs/` ở Task 12); spec monorepo + plan này → `viết lại vào docs/specs/` (giữ nguyên nội dung, thêm frontmatter).
- `TCKT_REQUIREMENTS_SPEC.md` → `viết lại vào docs/ba/` trừ mục B, I.
- 3 bản tờ trình (`DE_XUAT_CAP_SERVER_VA_SUBDOMAIN.md`, CTD `De-xuat-cap-server-va-subdomain.docx` + thư mục pdf) → giữ md hub, `viết lại vào docs/ops/de-xuat-ha-tang.md`; hai bản kia `bỏ`.
- CTD `3-WEEK-SPRINT.md`, `DAILY-TASKS.md`, `PARALLEL-WORKFLOW.md`, `DEVELOPMENT-ROADMAP.md` → `bỏ` (lịch sprint cũ; roadmap thay bằng `.kiro` tasks). `GETTING-STARTED.md`, `START-HERE.md` → `viết lại vào docs/onboarding/` + `docs/dev/chay-local.md`.
- docx/pdf stakeholder (`BA/**/*.docx`, `tai-lieu-goc/*`, `DAC_TA_NGHIEP_VU_QUAN_LY_TO.docx`) → `chuyển vào ba/nguon`.
- docx/pdf là bản xuất của md (`NEN_TANG_DA_DON_VI_TONG_QUAN.docx/.pdf`, `HUONG_DAN_LUONG_HE_THONG.docx`, `Tai_Lieu_Ky_Thuat.pdf`) → `bỏ` (CI tự xuất lại từ md). Riêng `Tai_Lieu_Ky_Thuat.pdf` nếu không có md tương ứng → `chuyển vào ba/nguon`.
- `DESIGN-notion.md` → `viết lại vào docs/dev/frontend.md` (phần design token còn dùng).
- `.agents/skills/**` → không phải tài liệu dự án, giữ nguyên ở `.agents/`, không vào bảng.

- [ ] **Step 3: Hỏi hai điểm còn mở cùng lúc với bảng**

1. CTD `docs/BAN-GIAO-DEV-TEAM.md` và `tools/create_server_proposal.py` (untracked ở `~/Developer/CTD`): đưa vào không? (bàn giao → viết lại vào `docs/onboarding/`, **bỏ mật khẩu**; tool → `tools/` hay bỏ).
2. Có file nào trong bảng chủ repo muốn đổi hành động.

**STOP:** gửi bảng cho chủ repo, chờ duyệt. Ghi `Duyệt: <ngày>` + các thay đổi vào đầu `INVENTORY.md`.

- [ ] **Step 4: Commit bảng đã duyệt**

```bash
git add docs/legacy/INVENTORY.md
git commit -q -m "docs: approved disposition table for legacy documents

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 11: Khung tài liệu — `AGENTS.md`, `CLAUDE.md`, steering, `README.md`, mẫu tài liệu, `docs/ai/`

**Files:**
- Create: `AGENTS.md`, `CLAUDE.md`, `README.md`, `docs/CHANGELOG.md`, `docs/_mau/tai-lieu.md` (mẫu — **không** nằm trong docs/ để khỏi bị check: đặt ở `tools/docs-check/template.md`), `docs/ai/bat-bien.md` (AI-INV-001), `docs/ai/bay-da-gap.md` (AI-PIT-001), `docs/ai/tim-o-dau.md` (AI-MAP-001), `docs/ai/kiem-tra.md` (AI-CHK-001)
- Modify: `.kiro/steering/{product,structure,tech}.md` (thay bằng lời trỏ + phần đặc thù Kiro)

**Interfaces:**
- Produces: luật §5.4 ở `AGENTS.md`; mẫu frontmatter ở `tools/docs-check/template.md`; `npm run docs:check` xanh.

- [ ] **Step 1: `AGENTS.md`** — nội dung đầy đủ:

```markdown
# AGENTS.md — luật làm việc cho mọi AI agent và dev

Repo `ultimate-tckt`: nền tảng đa đơn vị Đoàn Đại học — `core/` (Node/MySQL, Core + module Điều hành),
`services/ctd-api/` (FastAPI/Postgres, module Công tác Đảng), `web/` (frontend chung, sắp có),
`infra/` (compose, nginx, script VM), `docs/` (tài liệu có version).

## Trước khi làm bất cứ việc gì
1. Đọc `docs/README.md` (bản đồ tài liệu) và toàn bộ `docs/ai/`.
2. Tìm tài liệu có `related_code` trùng phần code sắp sửa; đọc chúng trước khi sửa.
3. Có tình huống quen thuộc (thêm tính năng, debug, hotfix, đổi schema…) → làm theo `docs/playbooks/`.

## Khi thay đổi (bắt buộc, CI chặn merge nếu thiếu)
1. Mọi thay đổi code/cấu hình/hạ tầng phải cập nhật tài liệu liên quan **trong cùng PR**.
2. Sửa nội dung một tài liệu → tăng `version` (MAJOR: người đọc bản cũ sẽ làm sai; MINOR: bổ sung/làm rõ),
   đổi `updated`, thêm một dòng vào `## Lịch sử phiên bản`.
3. Thêm/xoá/đổi tên tài liệu → chạy `npm run docs:index`.
4. Quyết định kiến trúc mới → thêm `docs/adr/NNNN-<slug>.md`. Không sửa ADR cũ; thay thế bằng ADR mới có `supersedes`.
5. Không tạo tài liệu ngoài cấu trúc trong `docs/README.md`. Không để hai tài liệu mô tả cùng một chuyện.
6. Thật sự không cần sửa tài liệu → nhãn PR `no-docs-needed` + dòng `Docs: không cần vì …` trong mô tả PR.

## Không bao giờ
- Phá bất biến trong `docs/ai/bat-bien.md`.
- Ghi secret, mật khẩu, token vào repo hoặc tài liệu.
- Push thẳng lên `main`. Luồng: `staging` → PR → `main`.
- Sửa file trong `docs/ba/nguon/` (bản gốc của stakeholder, chỉ đọc).

## Trước khi push
    cd core && npm test
    cd services/ctd-api/backend && pytest
    npm run test:tools && npm run docs:check -- --base origin/staging

## Sau khi xong một việc
- Có bẫy mới gặp → thêm vào `docs/ai/bay-da-gap.md`.
- Tình huống chưa có playbook → viết playbook mới trong `docs/playbooks/`.
```

- [ ] **Step 2: `CLAUDE.md`**

```markdown
# CLAUDE.md

Đọc và tuân thủ `AGENTS.md` — đó là luật chung cho mọi AI agent trong repo này.
Riêng Claude Code: spec/plan theo quy trình superpowers lưu ở `docs/specs/`
(không dùng `docs/superpowers/`), và phải có frontmatter như mọi tài liệu khác.
```

- [ ] **Step 3: `.kiro/steering/*.md`** — mỗi file giữ frontmatter `inclusion` của Kiro (nếu có) và thân:
```markdown
Luật chung: xem `AGENTS.md` ở gốc repo. Bản đồ tài liệu: `docs/README.md`.
Spec hiệu lực của Kiro: `.kiro/specs/nen-tang-da-don-vi/` (bản sao đọc được có frontmatter ở `docs/specs/`).
```
cộng lại tối đa 5 dòng đặc thù đang có (product/structure/tech) sau khi sửa tên thư mục theo cấu trúc mới.

- [ ] **Step 4: Mẫu tài liệu `tools/docs-check/template.md`**

```markdown
---
doc_id: NHOM-CHUDE-001
title: Tiêu đề
version: 1.0
status: draft
audience: [dev]
owner: DYC
updated: YYYY-MM-DD
related_code: []
---

# Tiêu đề

Một đoạn: tài liệu này giúp ai làm gì.

## Lịch sử phiên bản

| Version | Ngày | Thay đổi | Người |
|---|---|---|---|
| 1.0 | YYYY-MM-DD | Bản đầu | … |
```
Nhóm `doc_id`: `BA`, `DEV`, `OPS`, `PB` (playbook), `ONB`, `ADR`, `AI`, `SPEC`.

- [ ] **Step 5: Bốn tài liệu `docs/ai/`** (frontmatter theo mẫu, `audience: [ai, dev]`, `status: active`, version 1.0). Nội dung tối thiểu bắt buộc:
  - `bat-bien.md` (AI-INV-001, `related_code: [core/src/policies/**, core/src/middleware/auth.js, infra/**]`): mọi truy vấn đọc liên đơn vị đi qua `scopeFor` (GĐ1) / `activityScope` hiện tại; không trả dữ liệu ngoài phạm vi rồi lọc ở client; secret chỉ ở `.env` trên VM và GitHub Secrets; `SETTINGS_ENCRYPTION_KEY` mất = mất khả năng đọc SMTP đã lưu; không đổi tên compose project (đổi = volume trống); DB container chỉ restart qua `apply-infra.sh <env> true`; migration Hub idempotent (`npm run migrate`), CTD dùng Alembic; ngày giờ so theo ngày lịch địa phương, không cắt chuỗi UTC.
  - `bay-da-gap.md` (AI-PIT-001, `related_code: []`): lấy từ commit gần đây của hub — lệch ngày UTC/local khi slice ISO (`e4d0bb7`, `5f06c19`, `88fc946`), task `cancelled` phải bị loại khỏi thống kê (`b552065`, `6c80165`), activity `cancelled` bị hard-delete (`8b3342f`), upload file đang tắt, chỉ nhận link (`1b32165`), `emailEvents.emit` chạy sau khi pool đóng trong test gây log `Pool is closed`, test weight-presets gửi `label` thay vì `name`, image phải build arm64, `ctd@staging` từng cũ hơn `ctd@main`.
  - `tim-o-dau.md` (AI-MAP-001, `related_code: []`): bảng "cần X → xem file Y" cho route, policy, service email/cron, migration, schema `core/db.sql`, frontend `core/public/app.js`, CTD router/model/alembic/frontend features, compose, script VM, workflow CI.
  - `kiem-tra.md` (AI-CHK-001, `related_code: [.github/workflows/**, tools/**]`): lệnh test từng phần, cách chạy local (MySQL/Postgres), cách đọc CI, `docs:check`.

- [ ] **Step 6: `README.md` gốc** (không cần frontmatter — ngoài `docs/`): 1 đoạn mô tả, bảng thư mục, "Bắt đầu: đọc `AGENTS.md` → `docs/onboarding/ngay-1.md`", luồng nhánh `staging → PR → main`, bảng môi trường (tên miền staging/production) và lệnh test.

- [ ] **Step 7: `docs/CHANGELOG.md`**

```markdown
# Lịch sử bộ tài liệu

Mỗi mục ứng với một tag `docs-vYYYY.MM.N` được CI gắn khi merge vào `main`.
```

- [ ] **Step 8: Sinh index và kiểm**

Run: `npm run docs:index && npm run docs:check`
Expected: `docs ok: …`; exit 0.

- [ ] **Step 9: Commit**

```bash
git add AGENTS.md CLAUDE.md README.md .kiro/steering docs/ai docs/README.md docs/CHANGELOG.md tools/docs-check/template.md
git commit -q -m "docs: AGENTS.md rules, AI knowledge base and docs skeleton

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 12: `docs/adr/` + `docs/specs/`

**Files:**
- Create: `docs/adr/0001-…md` trở đi; `docs/specs/nen-tang-da-don-vi-{requirements,design,tasks}.md` (bản có frontmatter của `.kiro/specs/…`), `docs/specs/2026-09-23-monorepo-ultimate-tckt-design.md`, `docs/specs/2026-09-23-monorepo-ultimate-tckt-plan.md`

**Interfaces:**
- Produces: mỗi ADR có frontmatter `doc_id: ADR-<NNNN>-001` (ví dụ `ADR-0007-001`, khớp regex của docs-check), các mục `## Bối cảnh`, `## Quyết định`, `## Hệ quả`, `## Thay thế` (nếu có), `## Lịch sử phiên bản`; `status: active` hoặc `deprecated` (bị thay thế).

- [ ] **Step 1: Viết ADR theo danh sách** (nguồn trong ngoặc; mỗi file 15–40 dòng):
  - 0001 Stack Hub: Node 22/Express 5 + MySQL 8, frontend vanilla `public/app.js` (legacy hub phase1 plan)
  - 0002 RBAC 5 role TCKT + self-log công việc (09-17 role-refactoring spec)
  - 0003 Hệ thống frontend production / minimalist UI (09-18 specs)
  - 0004 Email Rule Engine + Cron runner + quyền devops (09-21 email-cron spec)
  - 0005 CTD: FastAPI + Postgres + Alembic, luồng xét duyệt hồ sơ (ctd 09-15 design)
  - 0006 Hạ tầng: 1 VM Oracle arm64, 2 môi trường, GHCR, nginx + certbot (ctd 09-16 deploy-infra)
  - 0007 Nền tảng đa đơn vị D1–D9 (.kiro design §1), ghi rõ D4 đảo ngược 2026-09-23: DYC tối cao
  - 0008 Quyền CTD của TCKT: từ tổ phó trở lên (2026-09-23)
  - 0009 Monorepo `ultimate-tckt`, bắt đầu sạch (M1–M4)
  - 0010 Checkout VM theo môi trường, CI SSH, test chặn deploy (M5–M6)
  - 0011 Đổi tên `seee` → `ultimate-tckt-*` + chuyển volume (M7) — nơi duy nhất ghi tên cũ
  - 0012 Hệ thống tài liệu Markdown + version + CI check (M8)
- [ ] **Step 2: Chuyển spec** — chép `.kiro/specs/nen-tang-da-don-vi/*.md` sang `docs/specs/nen-tang-da-don-vi-*.md` + frontmatter (`SPEC-UNIT-001/002/003`, `status: active`, `related_code: []`); thêm dòng đầu thân: "Bản gốc Kiro: `.kiro/specs/nen-tang-da-don-vi/`. Sửa ở đây rồi đồng bộ sang Kiro (hoặc ngược lại) trong cùng PR." Chép spec monorepo (từ repo cũ commit `c5e3c80`) và plan này sang `docs/specs/` + frontmatter (`SPEC-MONO-001`, `SPEC-MONO-002`), sửa tham chiếu `docs/superpowers/…` thành `docs/specs/…`.
- [ ] **Step 3:** Run: `npm run docs:index && npm run docs:check` → Expected: exit 0.
- [ ] **Step 4: Commit** `docs: ADRs for past decisions and active specs with frontmatter`.

---

### Task 13: `docs/ops/` (gồm runbook chuyển đổi) + `docs/dev/`

**Files (doc_id — nguồn — related_code):**
- `docs/ops/deploy-va-nhanh.md` — OPS-DEPLOY-001 — legacy infra README, staging-vs-production — `[.github/workflows/**, infra/scripts/deploy.sh, infra/scripts/apply-infra.sh]`
- `docs/ops/moi-truong.md` — OPS-ENV-001 — staging-vs-production + compose — `[infra/compose/**, infra/nginx/**, infra/.env.example]` (bảng tên miền, cổng, biến `.env`, trạng thái email: `EMAIL_NOTIFICATIONS_ENABLED=false`, `MAILER_DRIVER=console`; ghi chú compose cũ thiếu `SETTINGS_ENCRYPTION_KEY`)
- `docs/ops/vps.md` — OPS-VPS-001 — manual-setup-guide + setup-vm — `[infra/scripts/setup-vm.sh, infra/scripts/bootstrap-vm.sh]` (gồm cách tạo deploy key: `ssh-keygen -t ed25519 -f ~/.ssh/ultimate_tckt_deploy -N ''` + `~/.ssh/config` Host github.com IdentityFile, dán `.pub` vào *Settings → Deploy keys* (read-only))
- `docs/ops/backup-restore.md` — OPS-BAK-001 — `[infra/scripts/backup.sh]` (lệnh restore: `gunzip -c … | ut_compose <env> exec -T core-db sh -c 'mysql -uroot -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE"'`; tương tự `psql`)
- `docs/ops/truy-cap-db.md` — OPS-DB-001 — remote-db-access — `[infra/scripts/create-core-readonly-user.sh]`
- `docs/ops/github.md` — OPS-GH-001 — `[.github/**]` (checklist: Environments `staging`/`production` + secrets `SSH_HOST`, `SSH_USER`, `SSH_PRIVATE_KEY`; `production` deployment branch = `main`; biến repo `DEPLOY_ENABLED`; ruleset `main`: require PR, require checks `test-core`, `test-ctd`, `docs`, block force-push; ruleset `staging`: require checks, block force-push; nhãn `no-docs-needed`; quyền package GHCR private)
- `docs/ops/chuyen-doi-ultimate-tckt.md` — OPS-CUT-001 — spec §4.3 — `[infra/scripts/migrate-volumes.sh, infra/scripts/bootstrap-vm.sh]` — runbook từng lệnh cho Task 18–20, gồm lệnh đếm số dòng mốc:
  ```bash
  docker compose -p seee-ctd-staging --env-file /opt/infra/.env.staging -f /opt/infra/docker-compose.staging.yml \
    exec -T tckt-db sh -c 'mysql -N -uroot -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE" -e "SELECT (SELECT COUNT(*) FROM users),(SELECT COUNT(*) FROM activities),(SELECT COUNT(*) FROM tasks)"'
  docker compose -p seee-ctd-staging --env-file /opt/infra/.env.staging -f /opt/infra/docker-compose.staging.yml \
    exec -T ctd-db sh -c 'psql -tA -U "$POSTGRES_USER" "$POSTGRES_DB" -c "SELECT COUNT(*) FROM cases"'
  ```
  (tên bảng CTD kiểm lại trong `services/ctd-api/backend/app/models/` khi viết), và mục Rollback.
- `docs/ops/su-co.md` — OPS-INC-001 — `[]` (xem log `ut_compose <env> logs -f core`, container restart loop, nginx lỗi, hết dung lượng, rollback tag)
- `docs/ops/de-xuat-ha-tang.md` — OPS-PROP-001 — tờ trình hub — `[]` (cập nhật tên container sang `ultimate-tckt-*`)
- `docs/dev/kien-truc.md` — DEV-ARCH-001 — .kiro design §3–4 + hiện trạng — `[core/src/app.js, core/src/server.js, services/ctd-api/backend/app/main.py]`
- `docs/dev/chay-local.md` — DEV-LOCAL-001 — CTD GETTING-STARTED, hub README — `[core/.env.example, services/ctd-api/backend/.env.example, .claude/launch.json]`
- `docs/dev/quy-uoc-code.md` — DEV-CONV-001 — `[]`
- `docs/dev/db-migration.md` — DEV-DB-001 — `[core/db.sql, core/src/config/migrate.js, services/ctd-api/backend/alembic/**]`
- `docs/dev/test.md` — DEV-TEST-001 — QA_REGRESSION_GUIDE — `[core/tests/**, services/ctd-api/backend/tests/**, tools/tests/**]`
- `docs/dev/phan-quyen.md` — DEV-RBAC-001 — `[core/src/policies/**, core/src/middleware/auth.js, services/ctd-api/backend/app/deps.py]`
- `docs/dev/email-cron.md` — DEV-MAIL-001 — email-cron spec + hub README — `[core/src/services/email-*.js, core/src/services/cron-runner.js, core/src/routes/settings-*.js]`
- `docs/dev/frontend.md` — DEV-FE-001 — DESIGN-notion, thiet-ke-giao-dien — `[core/public/**, services/ctd-api/frontend/src/**]`
- `docs/dev/api.md` — DEV-API-001 — `[core/src/routes/**, services/ctd-api/backend/app/routers/**]` (bảng endpoint sinh bằng grep router hiện có)

- [ ] **Step 1:** Viết từng file từ nguồn legacy + đọc code hiện tại (mỗi khẳng định về code phải kiểm bằng `grep`/đọc file; tên mới `ultimate-tckt-*`). Frontmatter `version: 1.0`, `status: active`, `owner: DYC`, `updated: <ngày làm>`.
- [ ] **Step 2:** Run: `npm run docs:index && npm run docs:check` → Expected: exit 0.
- [ ] **Step 3: Commit** `docs: ops runbooks (incl. cutover) and developer guides`.

---

### Task 14: `docs/ba/`, `docs/playbooks/`, `docs/onboarding/`

**Files (doc_id — nguồn):**
- `docs/ba/tong-quan-nen-tang.md` — BA-OVW-001 — NEN_TANG_DA_DON_VI_TONG_QUAN.md, .kiro design §1–2
- `docs/ba/co-cau-don-vi-va-role.md` — BA-UNIT-001 — .kiro design §2, §6 (ghi rõ ĐT/LCĐ đang là dữ liệu giả)
- `docs/ba/dieu-hanh-use-case.md` — BA-OPS-001 — TCKT_REQUIREMENTS_SPEC (trừ B, I), HUONG_DAN_LUONG_HE_THONG.md, .kiro requirements R4–R6
- `docs/ba/ctd-use-case.md` — BA-CTD-001 — CTD boi-canh-du-an, BA/README, PHAN-TICH-KHOANG-CACH, ctd design spec, .kiro §8
- `docs/ba/danh-muc-giay-to-ctd.md` — BA-DOC-001 — CTD BA/GHI-CHU-DANH-MUC-GIAY-TO
- `docs/ba/thuat-ngu.md` — BA-GLOS-001 — tổng hợp (BTV, DYC, TCKT, ĐT/LCĐ, Trình, directive, submission, ops_log, …)
- `docs/ba/nguon/**` — chép các docx/pdf theo INVENTORY; thêm `docs/ba/nguon/README.md` không frontmatter (docs-check bỏ qua `nguon/`), liệt kê từng file gốc, ngày nhận, người cung cấp
- `docs/playbooks/them-tinh-nang.md` — PB-FEAT-001
- `docs/playbooks/them-module.md` — PB-MOD-001 (loại A/B, manifest, `unit_modules`, compose + CI khi loại B)
- `docs/playbooks/debug.md` — PB-DBG-001 (tái hiện local → log → test đỏ → sửa; xem log VM)
- `docs/playbooks/sua-loi.md` — PB-FIX-001 (test tái hiện trước, cập nhật `bay-da-gap.md`)
- `docs/playbooks/doi-schema.md` — PB-SCH-001 (Hub `db.sql` + migrate idempotent; CTD alembic revision)
- `docs/playbooks/doi-quyen.md` — PB-RBAC-001 (sửa policy + test chống rò rỉ + cập nhật BA-UNIT-001)
- `docs/playbooks/hotfix-production.md` — PB-HOT-001 (nhánh từ `main`, PR vào `main`, rồi merge ngược `main → staging`)
- `docs/playbooks/rollback.md` — PB-RB-001 (`deploy.sh <env> <app> <tag cũ>`, revert infra, restore backup)
- `docs/playbooks/nang-dependency.md` — PB-DEP-001
- `docs/onboarding/ngay-1.md` — ONB-D1-001 (quyền cần xin, clone, chạy local, chạy test)
- `docs/onboarding/tuan-1.md` — ONB-W1-001 (thứ tự đọc tài liệu, việc nhỏ đầu tiên, dùng AI agent với `AGENTS.md`)
- `docs/onboarding/ban-giao.md` — ONB-HO-001 (checklist khi rời dự án/giao cho thế hệ sau: quyền GitHub, VM, DuckDNS, secret nằm ở đâu — **không ghi giá trị**; nội dung từ CTD BAN-GIAO-DEV-TEAM nếu được duyệt ở Task 10, bỏ mật khẩu)

Mỗi playbook có các mục: `## Khi nào dùng`, `## Các bước`, `## Kiểm tra xong`, `## Tài liệu phải cập nhật`, `## Lịch sử phiên bản`. `audience: [dev, ai]` (playbook), `[ba]` (ba), `[onboarding, dev]` (onboarding).

- [ ] **Step 1:** Viết các file.
- [ ] **Step 2:** Run: `npm run docs:index && npm run docs:check` → Expected: exit 0.
- [ ] **Step 3: Commit** `docs: BA documents, playbooks and onboarding guides`.

---

### Task 15: Xoá `docs/legacy/`, workflow `docs.yml`, xuất Word/PDF, kiểm cuối

**Files:**
- Delete: `docs/legacy/`
- Create: `.github/workflows/docs.yml`, `tools/docs-export/export.sh`
- Modify: `tools/tests/workflows.test.js` (thêm test docs.yml)

**Interfaces:**
- Consumes: `cli.js check --base`, `pandoc`.
- Produces: job `docs` (tên check bắt buộc); trên push `main` có thay đổi `docs/**` → tag `docs-vYYYY.MM.N` + mục CHANGELOG; artifact `docs-export` (docx + pdf của `ba/`, `onboarding/`, `ops/`).

- [ ] **Step 1: Test (đỏ)** — thêm vào `tools/tests/workflows.test.js`:
```js
test('docs.yml checks every PR/push and tags docs on main', () => {
  const y = wf('docs.yml');
  assert.match(y, /^  docs:/m);
  assert.match(y, /docs:check -- --base/);
  assert.match(y, /no-docs-needed/);
  assert.match(y, /docs-v/);
  assert.match(y, /pandoc/);
});
```
Run: `node --test tools/tests/workflows.test.js 2>&1 | grep -E '^ℹ fail'` → Expected: `fail 1`.

- [ ] **Step 2: `tools/docs-export/export.sh`**

```bash
#!/usr/bin/env bash
# Xuất docs/{ba,onboarding,ops}/*.md ra docx (+pdf nếu có LaTeX) vào docs-export/, tên kèm version.
set -euo pipefail
cd "$(dirname "$0")/../.."
OUT=docs-export; rm -rf "$OUT"; mkdir -p "$OUT"
for f in docs/ba/*.md docs/onboarding/*.md docs/ops/*.md; do
  [[ -f "$f" ]] || continue
  id="$(sed -nE 's/^doc_id: *([^ ]+).*/\1/p' "$f" | head -1)"
  ver="$(sed -nE 's/^version: *([0-9.]+).*/\1/p' "$f" | head -1)"
  name="${id}_v${ver}"
  pandoc "$f" --from markdown+yaml_metadata_block -o "$OUT/$name.docx"
  if command -v xelatex >/dev/null; then
    pandoc "$f" --pdf-engine=xelatex -V mainfont="DejaVu Sans" -o "$OUT/$name.pdf" || echo "pdf skipped: $f"
  fi
done
ls "$OUT"
```

- [ ] **Step 3: `.github/workflows/docs.yml`**

```yaml
name: docs
on:
  pull_request:
    branches: [staging, main]
    types: [opened, synchronize, reopened, labeled, unlabeled]
  push:
    branches: [staging, main]
jobs:
  docs:
    runs-on: ubuntu-latest
    permissions: { contents: write }
    steps:
      - uses: actions/checkout@v4
        with: { fetch-depth: 0 }
      - uses: actions/setup-node@v4
        with: { node-version: 22 }
      - run: npm run test:tools
      - name: docs:check
        env:
          BASE: ${{ github.event_name == 'pull_request' && format('origin/{0}', github.base_ref) || github.event.before }}
          NO_DOCS: ${{ contains(github.event.pull_request.labels.*.name, 'no-docs-needed') }}
        run: |
          if [[ "$BASE" == "0000000000000000000000000000000000000000" || -z "$BASE" ]]; then npm run docs:check; exit; fi
          extra=""; [[ "$NO_DOCS" == "true" ]] && extra="--allow-no-docs"
          npm run docs:check -- --base "$BASE" $extra
      - name: Export Word/PDF
        run: |
          sudo apt-get update -qq && sudo apt-get install -y -qq pandoc >/dev/null
          bash tools/docs-export/export.sh
      - uses: actions/upload-artifact@v4
        with: { name: docs-export, path: docs-export/ }
      - name: Tag docs version on main
        if: github.event_name == 'push' && github.ref == 'refs/heads/main'
        run: |
          if git diff --quiet "${{ github.event.before }}" HEAD -- docs/ 2>/dev/null; then echo "no docs change"; exit 0; fi
          ym="$(date -u +%Y.%m)"
          n=$(( $(git tag -l "docs-v$ym.*" | wc -l) + 1 ))
          tag="docs-v$ym.$n"
          git config user.name "github-actions[bot]"; git config user.email "github-actions[bot]@users.noreply.github.com"
          changed="$(git diff --name-only "${{ github.event.before }}" HEAD -- docs/ | grep -v -e README.md -e CHANGELOG.md || true)"
          { echo; echo "## $tag — $(date -u +%F)"; echo;
            for f in $changed; do v="$(sed -nE 's/^version: *([0-9.]+).*/\1/p' "$f" 2>/dev/null | head -1)"; echo "- \`$f\` → ${v:-đã xoá}"; done; } >> docs/CHANGELOG.md
          git add docs/CHANGELOG.md
          git commit -m "docs: changelog for $tag [skip ci]"
          git tag "$tag"
          git push origin HEAD:main --follow-tags
```

Ghi chú: bảo vệ nhánh `main` chặn push trực tiếp — bot `github-actions` cần được thêm vào *bypass list* của ruleset `main` (ghi trong `docs/ops/github.md`, Task 13). Nếu chủ repo không muốn bypass, đổi bước này thành chỉ tạo tag (không commit CHANGELOG) và CHANGELOG được cập nhật tay trong PR — ledger Ruling.

- [ ] **Step 4: Xoá legacy và kiểm cuối**

```bash
git rm -rq docs/legacy
npm run docs:index
node --test tools/tests/ 2>&1 | grep -E '^ℹ (pass|fail)'
npm run docs:check
grep -rIil seee . --exclude-dir=node_modules --exclude-dir=.venv --exclude-dir=.git | grep -v -e '^./docs/adr/' -e 'migrate-volumes.sh' -e 'bootstrap-vm.sh' -e 'backup.sh' -e 'docs/ops/chuyen-doi-ultimate-tckt.md'
bash tools/docs-export/export.sh | tail -3
```
Expected: `fail 0`; `docs ok`; grep không in gì; export in tên file `.docx`.

Ruling sẵn: runbook chuyển đổi (`OPS-CUT-001`) và `backup.sh` hợp lệ khi nhắc tên cũ — cập nhật Global Constraints trong ledger.

- [ ] **Step 5: Commit** `ci(docs): docs check workflow, Word/PDF export and version tags; remove legacy docs`.

---

### Task 16: Dựng nhánh `main`

**Files:** không file mới — thao tác git.

**Interfaces:**
- Produces: nhánh `main` = import nguồn main (`core/` từ `tckt-activity-hub@main`) + mọi commit chung của `staging` từ Task 2 trở đi; `git diff main staging -- ':!core'` rỗng.

- [ ] **Step 1: Tạo commit import main trên nhánh mồ côi**

```bash
cd ~/Developer/ultimate-tckt
BASE=$(git rev-list --max-parents=0 staging)   # commit import staging (Task 1)
git checkout -q -b main "$BASE"
rm -rf core && mkdir core && git -C ~/Developer/deployment-package archive --format=tar main | tar -x -C core
( cd core && rm -rf docs *.md .agents .github skills-lock.json )
git add -A core && git commit -q -m "chore: import core from tckt-activity-hub@<HUB_MAIN> for production

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
Ghi chú: `main` bắt đầu từ commit import staging rồi lùi `core/` về bản main, để hai nhánh có tổ tiên chung (PR `staging → main` về sau hoạt động bình thường).

- [ ] **Step 2: Cherry-pick các commit chung**

```bash
git cherry-pick $(git rev-list --reverse "$BASE"..staging)
```
Expected: áp dụng sạch. Nếu xung đột ở `core/` (vd `core/tests/weight-presets.test.js` không tồn tại trên main hoặc khác nội dung): giải quyết bằng cách áp cùng ý nghĩa thay đổi lên bản main, ghi ledger Ruling cho từng file.

- [ ] **Step 3: Kiểm**

Run:
```bash
git diff --stat main staging -- . ':!core' | tail -1
cd core && npm ci --silent && npm test > /tmp/ut-main.log 2>&1; grep -E '^ℹ (pass|fail)' /tmp/ut-main.log; cd ..
node --test tools/tests/ 2>&1 | grep -E '^ℹ fail'; npm run docs:check
git checkout -q staging
```
Expected: diff ngoài `core/` rỗng (không in dòng thống kê); test core main `fail 0`; tools `fail 0`; `docs ok`.

- [ ] **Step 4:** Không commit thêm. Ledger ghi SHA đầu `main` và `staging`.

---

## Phase C — GitHub và VPS (mỗi task đều có điểm DỪNG)

### Task 17: Tạo repo GitHub, push, cấu hình — **DỪNG xin phép trước khi tạo repo**

- [ ] **Step 1: Hỏi chủ repo** — xác nhận tạo `tduong-p/ultimate-tckt` private và push `main` + `staging`. Chờ "đồng ý".
- [ ] **Step 2:**
```bash
cd ~/Developer/ultimate-tckt
gh repo create tduong-p/ultimate-tckt --private --description "Nền tảng đa đơn vị Đoàn Đại học — core, CTD, infra, docs"
git remote add origin https://github.com/tduong-p/ultimate-tckt.git
git push -u origin main staging
gh variable set DEPLOY_ENABLED --body false -R tduong-p/ultimate-tckt
gh label create no-docs-needed -R tduong-p/ultimate-tckt --color BFD4F2 --description "PR không cần cập nhật tài liệu (ghi lý do trong mô tả)"
```
Expected: repo tạo được; hai nhánh lên; biến và nhãn tạo xong.
- [ ] **Step 3: Kiểm CI** — `gh run list -R tduong-p/ultimate-tckt --limit 6` → Expected: các run `deploy` và `docs` của `main`/`staging` `completed success`; `deploy-*`, `infra` ở trạng thái skipped. `gh api /users/tduong-p/packages?package_type=container --jq '.[].name'` có `ultimate-tckt-core`, `ultimate-tckt-ctd-api`.
- [ ] **Step 4: Chủ repo làm theo `docs/ops/github.md`** (Environments + secrets chép từ repo cũ, rulesets, bypass cho bot docs). Claude có thể tạo Environment/ruleset qua `gh api` **nếu** chủ repo đồng ý; secret phải do chủ repo nhập (Claude không nhập secret).

### Task 18: Bootstrap VM — chủ repo chạy

- [ ] Chủ repo SSH vào VM, làm theo `docs/ops/vps.md` (deploy key) và `docs/ops/chuyen-doi-ultimate-tckt.md` mục Bootstrap:
```bash
git clone --filter=blob:none --sparse --branch staging git@github.com:tduong-p/ultimate-tckt.git /tmp/ut && git -C /tmp/ut sparse-checkout set infra
bash /tmp/ut/infra/scripts/bootstrap-vm.sh staging
bash /tmp/ut/infra/scripts/bootstrap-vm.sh production
```
Expected: `Wrote /opt/ultimate-tckt/staging/infra/.env`, tương tự production; container cũ vẫn chạy (`docker ps` còn `seee-ctd-*`).

### Task 19: Chuyển staging — **DỪNG: chủ repo chạy lệnh trên VM, Claude kiểm qua trình duyệt**

Theo `docs/ops/chuyen-doi-ultimate-tckt.md` mục Staging: đếm mốc → `UT_BACKUP_COMPOSE_ARGS="-p seee-ctd-staging --env-file /opt/infra/.env.staging -f /opt/infra/docker-compose.staging.yml" bash …/backup.sh staging` → `docker compose -p seee-ctd-staging … stop` → `migrate-volumes.sh staging` → đặt `CORE_IMAGE_TAG`/`CTD_API_IMAGE_TAG` = tag vừa build ở Task 17 → `apply-infra.sh staging true` → đếm mốc lại (khớp) → gỡ site nginx cũ `staging-tckt.conf`, `staging-ctd.conf` khỏi `sites-enabled` → `nginx -t && reload`.
Sau đó: `gh variable set DEPLOY_ENABLED --body true`, push lên `staging` một commit sửa `docs/ops/chuyen-doi-ultimate-tckt.md` ghi "staging đã chuyển <ngày>" (bump version) kèm một thay đổi chạm `core/` và `services/ctd-api/` (vd comment phiên bản trong Dockerfile) để kích hoạt cả hai deploy → CI deploy xanh.
Claude kiểm: `https://tckt-hub-staging.duckdns.org` và `https://ctd-hoso-staging.duckdns.org` trả trang, `/api/health` = ok, đăng nhập được (chủ repo đăng nhập — Claude không nhập mật khẩu), dữ liệu cũ hiển thị.

### Task 20: Chuyển production — **DỪNG: chủ repo chọn giờ, chạy lệnh; merge PR do chủ repo duyệt**

Giống Task 19 với `production`; sau đó mở PR `staging → main` **chỉ khi** chủ repo muốn đưa 18 commit Hub (Email + Cron) lên production cùng lúc — nếu không, production chạy code `main` hiện tại (đã có trong nhánh `main`), deploy bằng push nhỏ vào `main` qua PR từ một nhánh docs. Kiểm như Task 19 trên `tckt-hub.duckdns.org`, `ctd-hoso.duckdns.org`. Chủ repo đổi mật khẩu mặc định admin CTD production.

### Task 21: Archive repo cũ — **DỪNG xin phép**

- [ ] Hỏi chủ repo. Sau khi đồng ý: với mỗi repo cũ, `gh workflow disable deploy -R tduong-p/<repo>` (infra: `deploy-infra`), commit README "Đã chuyển sang tduong-p/ultimate-tckt" lên nhánh mặc định, `gh repo archive tduong-p/<repo> --yes`.
- [ ] Nhắc lịch: sau 14 ngày (ngày chuyển production + 14) chủ repo xoá `/opt/infra`, volume `seee-ctd-*`, image `tckt-activity-hub`/`ctd` trên VM và GHCR. Ghi ngày cụ thể vào `docs/ops/chuyen-doi-ultimate-tckt.md` (bump version).

---

## Self-review ghi chú (người viết plan)

- Spec §2 → Task 1, 3, 11; §2.1 → Task 1, 16 (đã sửa: `ctd@main` cho cả hai nhánh, lý do ở Task 1); §3 → Task 8, 15; §4.1–4.2 → Task 4–7; §4.3 → Task 17–21; §4.4 → Task 2, 13, 20; §5 → Task 9–15; §6 → kiểm ở Task 15, 16, 19, 20.
- Sai lệch so với spec, cần ledger khi thực thi: (1) spec §2.1 ghi `staging` lấy `ctd@staging` — plan dùng `ctd@main` vì `ctd@staging` cũ hơn; (2) spec §6 "`grep seee` chỉ còn ADR" — plan cho phép thêm `migrate-volumes.sh`, `bootstrap-vm.sh`, `backup.sh`, runbook chuyển đổi; (3) spec §5.1 đặt spec/plan ở `docs/specs/` — Claude Code superpowers mặc định `docs/superpowers/`, `CLAUDE.md` ghi đè.

## Lịch sử phiên bản

| Version | Ngày | Thay đổi | Người |
|---|---|---|---|
| 1.0 | 2026-09-24 | Bản có frontmatter, chép nguyên nội dung từ `docs/superpowers/plans/2026-09-23-monorepo-ultimate-tckt.md` (repo `deployment-package`, commit `4628367`) | DYC |

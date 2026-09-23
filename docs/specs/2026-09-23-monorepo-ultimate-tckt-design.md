---
doc_id: SPEC-MONO-001
title: Thiết kế — Gộp repo thành monorepo ultimate-tckt + hệ thống tài liệu
version: 1.0
status: active
audience: [dev, ai]
owner: DYC
updated: 2026-09-24
related_code: []
---

# Thiết kế: Gộp repo thành monorepo `ultimate-tckt` + hệ thống tài liệu

- **Ngày:** 2026-09-23
- **Phạm vi:** gộp `tduong-p/tckt-activity-hub`, `tduong-p/ctd`, `tduong-p/infra` vào một repo mới `tduong-p/ultimate-tckt`; đổi toàn bộ tên hạ tầng sang `ultimate-tckt-*`; xây lại bộ tài liệu có version.
- **Không thuộc phạm vi:** code của nền tảng đa đơn vị (GĐ1). Việc đó có spec riêng ở `.kiro/specs/nen-tang-da-don-vi/` và bắt đầu *sau khi* monorepo chạy ổn.

---

## 1. Quyết định đã chốt

| # | Quyết định |
|---|---|
| M1 | Repo mới là `tduong-p/ultimate-tckt`, private, đặt ở tài khoản cá nhân có GitHub Pro (Education). Khi cần phân quyền theo team thì chuyển sang Organization bằng *Transfer* |
| M2 | **Bắt đầu sạch.** Không import lịch sử git. Mỗi nhánh có một commit "initial import" ghi SHA nguồn của từng repo. Repo cũ được archive (chỉ đọc) để tra cứu lịch sử |
| M3 | Hai nhánh dài hạn: `main` = production, `staging` = staging. Vẫn một VPS (`168.107.68.32`) chạy cả hai môi trường |
| M4 | Cấu trúc thư mục: `core/`, `services/ctd-api/`, `web/`, `infra/`, `docs/` (§2) |
| M5 | Trên VPS, mỗi môi trường có một checkout riêng theo nhánh của nó. Thay đổi hạ tầng cũng đi theo luồng staging → main |
| M6 | CI giữ cách SSH vào VM (GitHub Actions làm, người không phải SSH). Phải test xanh mới được build và deploy |
| M7 | Bỏ tên `seee`. Mọi tên hạ tầng đồng bộ về `ultimate-tckt-*` (§4.1). Dữ liệu được chuyển sang volume tên mới |
| M8 | Tài liệu dùng Markdown làm bản gốc duy nhất. Word/PDF do CI tự xuất. Mỗi file có version riêng, cả bộ có tag version, và CI chặn merge khi tài liệu không được cập nhật (§5) |

Các quyết định đi kèm cho spec đa đơn vị (đã ghi vào `.kiro/specs/nen-tang-da-don-vi/design.md`):

- **D4:** DYC có quyền tối cao, đọc được mọi dữ liệu nghiệp vụ và có ghi `audit_logs`.
- **Quyền CTD trong TCKT:** từ tổ phó trở lên (`vice_leader`, `leader`, `vice_admin`, `admin`). `member` không có quyền.
- **Đơn vị ĐT/LCĐ:** GĐ1 dùng dữ liệu giả.

## 2. Cấu trúc repo

```
ultimate-tckt/
├── AGENTS.md                ← luật cho mọi AI agent (§5.4)
├── CLAUDE.md                ← trỏ sang AGENTS.md
├── README.md                ← vào repo đọc gì đầu tiên, chạy local, luồng nhánh
├── package.json             ← chỉ chứa script tooling cấp repo (docs:check, docs:index), không phải app
├── tools/docs-check/        ← script kiểm tra tài liệu (§5.5)
├── core/                    ← Hub hiện tại (Node 22/Express, MySQL): Core Platform + module Điều hành
│   ├── src/  public/  tests/  db.sql  package.json  Dockerfile
│   └── src/modules/         ← module loại A (chạy chung process) — tạo khi làm GĐ1
├── services/
│   └── ctd-api/             ← CTD hiện tại (FastAPI, Postgres) — module loại B
│       ├── backend/  frontend/  Dockerfile
├── web/                     ← frontend React chung (GĐ1 task 7) — chưa tạo trong đợt này
├── infra/
│   ├── compose/             ← docker-compose.staging.yml, docker-compose.production.yml
│   ├── nginx/{staging,production}/
│   ├── scripts/             ← deploy.sh, apply-infra.sh, bootstrap-vm.sh, migrate-volumes.sh, backup.sh, create-*.sh
│   └── seed/
├── docs/                    ← §5
├── .kiro/                   ← specs + steering (steering trỏ về AGENTS.md)
└── .github/
    ├── workflows/{deploy.yml, docs.yml, ghcr-cleanup.yml}
    ├── pull_request_template.md
    └── CODEOWNERS
```

**Thêm module về sau:**
- **Loại A** (mặc định): đặt ở `core/src/modules/<id>/`, chạy chung process và chung MySQL với Core.
- **Loại B**: đặt ở `services/<id>/`, có container và DB riêng, gọi qua gateway. Chỉ dùng khi đạt ≥2/3 tiêu chí §4.3 của spec đa đơn vị.

Dù loại nào, giao diện cũng nằm ở `web/src/modules/<id>/` và module phải khai báo manifest.

**Không đưa vào repo:** `node_modules`, `storage/`, `log.md`, `*.tsbuildinfo`, `__pycache__`, `.pytest_cache`, `.env*`, `.claude/scheduled_tasks.lock`. Bộ skill `.agents/skills/` chỉ giữ **một** bản ở gốc repo. `.claude/launch.json` được gộp thành một bản ở gốc, có cấu hình chạy cho cả `core` và `ctd-api`.

**CTD có file chưa commit** (`docs/BAN-GIAO-DEV-TEAM.md`, `tools/`): hỏi lại chủ repo trước khi đưa vào. File bàn giao có mật khẩu mặc định, nên nếu giữ thì phải xóa mật khẩu khỏi nội dung.

### 2.1 Nội dung ban đầu của hai nhánh

| Nhánh | `core/` | `services/ctd-api/` | `infra/` |
|---|---|---|---|
| `main` | `tckt-activity-hub@main` | `ctd@main` (`551c16b`) | `infra@main` (`451b4d9`) |
| `staging` | `tckt-activity-hub@staging` (`e99f090`, gồm Email + Cron) | `ctd@main` (`551c16b`) | `infra@main` |

**Sửa 2026-09-23:** `ctd@staging` (`81b46b3`) cũ hơn `ctd@main` 8 commit. Vì vậy nhánh `staging` mới cũng lấy `ctd@main`, để đảm bảo `main ⊆ staging` và PR `staging → main` không làm CTD production lùi phiên bản. Hệ quả: khi chuyển đổi, CTD staging được nâng lên bản của production.

Các commit chung (đổi tên, CI, infra mới, docs; §3–§5) được làm trên `staging` trước, sau đó cherry-pick sang `main`. Ở ngày chuyển đổi, Hub mỗi môi trường chạy đúng phiên bản code như trước; CTD staging được nâng như trên.

## 3. CI/CD

`.github/workflows/deploy.yml`, chạy khi push lên `staging` hoặc `main`:

1. **changes:** dùng path filter để quyết định việc cần chạy.
   - `core/**` hoặc `web/**` → cần job `core`.
   - `services/ctd-api/**` → cần job `ctd-api`.
   - `infra/**` → cần job `infra`.
   - Chỉ đổi `docs/**` → không deploy.
2. **test-core:** `npm ci && npm test` trong `core/`, dùng một MySQL 8 service tạm. **test-ctd:** chạy `pytest` trong `services/ctd-api/backend`, dùng một Postgres 16 service tạm. Test đỏ thì dừng.
3. **build-core / build-ctd-api:** buildx arm64 (QEMU), push `ghcr.io/tduong-p/ultimate-tckt-core:<sha12>` và `ultimate-tckt-ctd-api:<sha12>`.
4. **deploy-<app>:** chỉ chạy khi biến repo `DEPLOY_ENABLED == 'true'`. Nhánh `staging` dùng GitHub Environment `staging`, nhánh `main` dùng Environment `production` (Environment này chỉ nhận nhánh `main`). Job SSH vào VM và chạy
   `bash /opt/ultimate-tckt/<env>/infra/scripts/deploy.sh <env> <app> <tag>`.
   Deploy cùng một môi trường thì chạy nối tiếp nhau (`concurrency: vm-deploy-<env>`).
5. **infra:** khi `infra/**` thay đổi, SSH vào VM và chạy `apply-infra.sh <env>`. Có `workflow_dispatch` kèm tùy chọn `apply_db`.

**Workflow khác:**
- `docs.yml` chạy trên mọi PR và push (§5.5).
- `ghcr-cleanup.yml` chạy hằng tuần, mỗi image giữ 10 bản mới nhất, và không bao giờ xóa tag đang chạy trên VM.

**Bảo vệ nhánh:**
- `main`: chỉ nhận merge qua PR từ `staging`, các check `test-*` và `docs` bắt buộc phải xanh, không cho force-push.
- `staging`: cho push thẳng, nhưng `test-*` và `docs` vẫn bắt buộc; không cho force-push.

**Thay đổi so với hiện tại:** CTD không còn đường push thẳng `main` là lên production. Mọi thứ đi staging → PR → main.

## 4. VPS

### 4.1 Tên

| Thứ | Cũ | Mới |
|---|---|---|
| Compose project | `seee-ctd-staging` / `seee-ctd-production` | `ultimate-tckt-staging` / `ultimate-tckt-production` |
| Service | `tckt-app`, `tckt-db`, `ctd-app`, `ctd-db` | `core`, `core-db`, `ctd-api`, `ctd-db` |
| Volume (khai báo trong compose) | `tckt_mysql_data`, `tckt_uploads`, `ctd_postgres_data`, `ctd_documents` | `core_mysql`, `core_uploads`, `ctd_postgres`, `ctd_documents` → thực tế là `ultimate-tckt-<env>_core_mysql`, … |
| Image | `ghcr.io/tduong-p/tckt-activity-hub`, `…/ctd` | `ghcr.io/tduong-p/ultimate-tckt-core`, `…/ultimate-tckt-ctd-api` |
| Biến tag image | `TCKT_IMAGE_TAG`, `CTD_IMAGE_TAG` | `CORE_IMAGE_TAG`, `CTD_API_IMAGE_TAG` |
| Thư mục | `/opt/infra` | `/opt/ultimate-tckt/staging`, `/opt/ultimate-tckt/production`, `/opt/ultimate-tckt/backups` |
| Nginx site | `staging-tckt.conf`, `staging-ctd.conf`, … | `ultimate-tckt-staging-core.conf`, `ultimate-tckt-staging-ctd.conf`, … |
| Khóa deploy | `/tmp/infra-deploy.lock` | `/tmp/ultimate-tckt-<env>-deploy.lock` |
| Hostname trong mạng Docker | `ctd-app:8000` | `ctd-api:8000` (gateway GĐ1 dùng tên này) |

**Giữ nguyên:**
- Tên miền DuckDNS, cổng trên host (`3000/3001`, `3306/3307`, `8000/8001`), và chứng chỉ Let's Encrypt.
- Tên database và user DB trong `.env`. Các biến `.env` chỉ đổi phần tiền tố (`TCKT_*` → `CORE_*`), còn giá trị giữ nguyên.

### 4.2 Bố cục

```
/opt/ultimate-tckt/
├── staging/        git checkout nhánh staging (sparse: infra/), infra/.env
├── production/     git checkout nhánh main    (sparse: infra/), infra/.env
└── backups/        <env>-<yyyymmdd-hhmm>-{core.sql.gz,ctd.sql.gz}
```

- `deploy.sh <env> <app> <tag>`:
  1. lấy khóa `flock` của môi trường;
  2. `git pull --ff-only` đúng nhánh của môi trường đó;
  3. `docker compose -p ultimate-tckt-<env> --env-file infra/.env -f infra/compose/docker-compose.<env>.yml pull <svc>` rồi `up -d --no-deps <svc>`;
  4. kiểm tra health (HTTP 200 ở cổng của app, thử trong 60 giây), không đạt thì exit khác 0.
- `apply-infra.sh <env> [apply_db]`: như bản cũ, nhưng chỉ xử lý **một** môi trường và chỉ cài nginx của môi trường đó.
- `backup.sh <env>`: chạy `mysqldump` và `pg_dump` qua `docker compose exec`, nén gzip, giữ 14 bản mới nhất. Đây là nền cho việc backup tự động về sau.

### 4.3 Chuyển đổi

Làm theo thứ tự, **staging trước, production sau**:

1. Tạo repo, push `main` và `staging`. Biến `DEPLOY_ENABLED=false`, nên CI chỉ test và build. Kiểm tra: CI xanh, và GHCR có hai image mới.
2. Chủ repo tạo Environment `staging`/`production`, chép `SSH_HOST`, `SSH_USER`, `SSH_PRIVATE_KEY` sang, rồi bật bảo vệ nhánh theo checklist trong `docs/ops/`.
3. Chủ repo SSH vào VM **một lần** và chạy `bootstrap-vm.sh`. Script sẽ:
   - sinh deploy key chỉ đọc (chủ repo dán khóa công khai lên GitHub);
   - clone sparse vào hai thư mục;
   - chuyển `.env.<env>` cũ thành `infra/.env` với tên biến mới.
   Script không đụng tới container đang chạy.
4. **Staging:** chạy `migrate-volumes.sh staging`. Script sẽ:
   - (a) chạy `backup.sh`;
   - (b) ghi lại số dòng mốc: `users`, `activities`, `tasks`, và số hồ sơ CTD;
   - (c) dừng stack `seee-ctd-staging`;
   - (d) dùng container `alpine` chép `cp -a` từng volume cũ sang volume mới;
   - (e) khởi động stack `ultimate-tckt-staging`;
   - (f) so sánh số dòng mốc, lệch thì dừng và in hướng dẫn rollback;
   - (g) cài nginx mới, gỡ site cũ, `nginx -t`, reload.
5. Bật `DEPLOY_ENABLED=true`, push một commit lên `staging`, rồi xác nhận:
   - CI deploy xanh;
   - vào được `tckt-hub-staging` và `ctd-hoso-staging`;
   - đăng nhập được, và dữ liệu cũ vẫn thấy.
6. **Production:** vào giờ ít người dùng, chạy `migrate-volumes.sh production`. Sau đó mở PR `staging → main`, merge, rồi xác nhận giống bước 5. Gián đoạn dự kiến 2–5 phút.
7. Tắt workflow `deploy` ở 3 repo cũ, cập nhật README trỏ sang repo mới, rồi archive.
8. Sau 14 ngày chạy ổn, xóa `/opt/infra`, các volume `seee-ctd-*` và image cũ.

**Rollback** (từ bước 4 đến bước 7):
- dừng stack `ultimate-tckt-<env>`;
- chạy lại `bash /opt/infra/scripts/deploy.sh <env> <app> <tag cũ>` với image cũ;
- volume `seee-ctd-*` chưa bị đụng tới nên dữ liệu vẫn nguyên;
- khôi phục site nginx cũ, vì script lưu bản sao trong `backups/nginx-<ts>/`.

### 4.4 Việc kèm theo trong đợt này

- Sửa `tests/weight-presets.test.js`: test đang gửi `label`, trong khi API đọc `name`. Không sửa thì CI mới đỏ ngay lần đầu.
- Đổi mật khẩu mặc định của admin CTD ở production (chủ repo tự làm). Không ghi mật khẩu vào tài liệu.
- Ghi `EMAIL_NOTIFICATIONS_ENABLED`, `MAILER_DRIVER` vào `docs/ops/` như trạng thái hiện tại. Chưa bật email; việc đó thuộc điều kiện hoàn thành GĐ1.

## 5. Hệ thống tài liệu

### 5.1 Cấu trúc `docs/`

| Thư mục | Đối tượng | Nội dung |
|---|---|---|
| `README.md` | mọi người | **Bản đồ tài liệu:** mỗi file có `doc_id`, tiêu đề, đối tượng, version, trạng thái, `related_code`. Được sinh tự động từ frontmatter |
| `CHANGELOG.md` | mọi người | Lịch sử thay đổi của bộ tài liệu, theo tag `docs-v*` |
| `ba/` | BA, bên nghiệp vụ | Tổng quan nền tảng; cơ cấu đơn vị và role; use case theo module (Điều hành, CTD); luồng nghiệp vụ; thuật ngữ; danh mục giấy tờ CTD |
| `ba/nguon/` | BA | File gốc từ stakeholder (docx use case, kickoff, báo cáo dự án). Chỉ đọc, không có version của hệ thống này, liệt kê trong bản đồ với trạng thái `source` |
| `dev/` | dev | Kiến trúc tổng thể; chạy local; quy ước code; DB và migration; test; API; quyền (RBAC, `scopeFor`); email và cron; frontend |
| `ops/` | người vận hành | Deploy và luồng nhánh; staging so với production; VPS và bootstrap; backup/restore; truy cập DB từ xa; checklist GitHub (secrets, environments, bảo vệ nhánh); runbook sự cố |
| `playbooks/` | dev, AI | Hướng dẫn theo tình huống: thêm tính năng; thêm module loại A/B; debug (quy trình, xem log, tái hiện lỗi); sửa lỗi; đổi schema; đổi quyền; hotfix production; rollback; nâng dependency |
| `onboarding/` | dev mới, thế hệ sau | Ngày 1 (quyền truy cập, chạy local), tuần 1 (đọc gì, việc nhỏ đầu tiên), checklist bàn giao khi rời dự án |
| `adr/` | dev, AI | Mỗi quyết định một file `NNNN-<slug>.md` (bối cảnh, quyết định, hệ quả, thay thế ADR nào). Gồm D1–D9, M1–M8, và các quyết định rút ra từ spec cũ |
| `ai/` | AI agent | Bất biến không được phá; bẫy đã gặp; bản đồ "cần X thì tìm ở đâu"; cách chạy test và kiểm tra |
| `specs/` | dev | Spec và plan **đang còn hiệu lực**. Làm xong thì rút quyết định thành ADR, rồi chuyển file sang `status: deprecated` hoặc xóa |

Không đặt tài liệu ở đâu khác. Tài liệu kỹ thuật riêng của một app (ví dụ `services/ctd-api/README.md`) chỉ được là file ngắn trỏ về `docs/`.

### 5.2 Xử lý tài liệu cũ

Trong kế hoạch có một bước lập **bảng xử lý từng file** cho khoảng 60 file ở cả 3 repo, với các hành động: *viết lại vào X*, *rút thành ADR*, *chuyển vào `ba/nguon/`*, *bỏ*. Chủ repo duyệt bảng này rồi mới thực hiện. Nguyên tắc:

- Nội dung còn đúng thì viết lại vào đúng chỗ. Không copy nguyên file.
- Spec và plan đã làm xong (Phase 1, role refactor, production frontend, minimalist UI, email + cron, m0–m1 CTD, deploy-infra) được rút thành ADR, bản gốc thì bỏ vì vẫn còn trong repo cũ đã archive.
- Bỏ các file lỗi thời hoặc trùng lặp: 3 bản tờ trình còn 1 bản; bỏ `TCKT_REQUIREMENTS_SPEC.md` mục B và I (các mục khác viết lại vào `ba/`); bỏ các file sprint, daily-tasks, parallel-workflow của CTD; bỏ `log.md`; bỏ bản copy thứ hai của `.agents/skills`.
- Sau khi viết lại, nội dung phải khớp với code thật và tên mới (`ultimate-tckt-*`).

### 5.3 Version

**Frontmatter bắt buộc** cho mọi file `.md` trong `docs/`, trừ `ba/nguon/`:

```yaml
---
doc_id: DEV-ARCH-001        # <NHÓM>-<CHỦ ĐỀ>-<số>, không đổi suốt đời file
title: Kiến trúc tổng thể
version: 1.0                # MAJOR.MINOR
status: active              # draft | active | deprecated
audience: [dev, ai]         # ba | dev | ops | onboarding | ai
owner: DYC
updated: 2026-09-23
related_code: [core/src/policies/**, core/src/middleware/auth.js]
---
```

- **MAJOR:** đổi nghiệp vụ, luồng, cấu trúc hoặc cách vận hành, tức là người đã đọc bản cũ sẽ làm sai nếu không đọc lại.
- **MINOR:** bổ sung, làm rõ, sửa lỗi chữ hoặc ví dụ.
- Cuối mỗi file có mục `## Lịch sử phiên bản` dạng bảng `| Version | Ngày | Thay đổi | Người |`.
- **Version của cả bộ:** khi merge vào `main` mà có thay đổi trong `docs/`, CI gắn tag `docs-vYYYY.MM.N` và thêm một mục vào `docs/CHANGELOG.md` liệt kê các file và version đã đổi.
- Word/PDF: `docs.yml` dùng pandoc xuất `ba/`, `onboarding/` và `ops/` ra docx và pdf. File xuất ra là artifact của lần chạy CI, không commit vào repo. Tên file có kèm version, ví dụ `BA-UNIT-001_v1.2.docx`.

### 5.4 `AGENTS.md`: luật cho AI agent và dev

Luật cốt lõi, viết bằng câu mệnh lệnh ngắn:

1. Trước khi làm, đọc `docs/README.md` và các file `docs/ai/*`. Tìm tài liệu có `related_code` trùng với phần code sắp sửa.
2. Mọi thay đổi code, cấu hình hoặc hạ tầng phải cập nhật tài liệu liên quan **trong cùng PR**, tăng version theo §5.3, và ghi vào lịch sử phiên bản.
3. Ra một quyết định kiến trúc mới thì viết thêm một ADR. Không sửa ADR cũ; nếu cần thay thì viết ADR mới ghi rõ `supersedes`.
4. Không tạo tài liệu ngoài cấu trúc §5.1. Không để hai tài liệu cùng mô tả một chuyện.
5. Không phá các bất biến trong `docs/ai/invariants.md`. Ví dụ: mọi truy vấn đọc phải đi qua `scopeFor`; không ghi secret vào repo hay vào tài liệu; không push thẳng lên `main`.
6. Luồng làm việc: nhánh `staging` → PR → `main`. Chạy test và `npm run docs:check` trước khi push.
7. Gặp tình huống thì theo `docs/playbooks/`. Nếu chưa có playbook cho tình huống đó, làm xong thì viết thêm playbook.

`CLAUDE.md` và `.kiro/steering/*.md` chỉ chứa lời trỏ sang `AGENTS.md`, cộng phần đặc thù của công cụ đó (nếu có).

### 5.5 Kiểm tra tự động (`docs:check`, chạy trong `docs.yml`, chặn merge)

Kiểm tra được viết bằng script Node ở `tools/docs-check/`, không thêm dependency nặng:

1. File trong `docs/` (trừ `ba/nguon/`) phải có đủ frontmatter hợp lệ, và `doc_id` không trùng nhau.
2. File có nội dung thay đổi so với nhánh gốc thì `version` và `updated` phải tăng, và mục lịch sử phải có dòng mới.
3. `docs/README.md` phải trùng với bản sinh lại từ frontmatter. Có lệnh `npm run docs:index` để sinh lại.
4. Không có link nội bộ hỏng.
5. **Tác động lên tài liệu:** nếu PR sửa file khớp với `related_code` của một tài liệu mà tài liệu đó không đổi, check sẽ fail. Ngoại lệ là PR có nhãn `no-docs-needed`, và mô tả PR phải có dòng `Docs: không cần vì …`.

Ngoài ra còn có mẫu PR với các ô: *Tài liệu đã cập nhật*, *ADR mới (nếu có)*, *Test đã chạy*.

## 6. Kiểm thử và tiêu chí hoàn thành

- CI xanh trên cả `staging` và `main` của repo mới: test core, test ctd-api, và docs check.
- Sau khi chuyển đổi, ở mỗi môi trường: số dòng mốc khớp với trước khi chuyển; cả 4 tên miền trả 200; đăng nhập Hub và CTD được; tải được một file đính kèm cũ.
- `docker ps` không còn tên nào có `seee`. `grep -ri seee` trong repo mới không còn kết quả, trừ các ADR ghi lại lịch sử đổi tên.
- `docs/README.md` liệt kê mọi tài liệu. Không còn file nào ngoài cấu trúc. Tag `docs-v2026.09.1` đã được gắn.
- Một dev hoặc AI agent mới chỉ cần đọc `README.md` → `AGENTS.md` → `docs/onboarding/` là chạy được local và biết phải cập nhật tài liệu thế nào.

## 7. Thứ tự thực hiện

1. **Chuẩn bị** (ở các repo cũ): sửa test weight-presets; chốt danh sách file CTD chưa commit.
2. **Dựng monorepo trên máy local:** import, đổi tên, viết lại Dockerfile context, compose, script và CI. Chạy test local cho cả hai app.
3. **Tài liệu:** lập bảng xử lý và duyệt; viết lại bộ `docs/`, `AGENTS.md`, `tools/docs-check`, `docs.yml`. Runbook chuyển đổi nằm trong `docs/ops/` trước khi làm bước 5.
4. **Tạo repo GitHub và push** (chủ repo duyệt trước khi tạo). Cấu hình Environment và bảo vệ nhánh.
5. **Chuyển đổi** theo §4.3.
6. **Dọn dẹp:** archive repo cũ; sau 14 ngày xóa tài nguyên cũ.

## 8. Rủi ro

| Rủi ro | Giảm thiểu |
|---|---|
| Chép volume sai hoặc thiếu dữ liệu | Backup dump trước, so số dòng mốc, giữ volume cũ 14 ngày |
| `.env` sai tên biến sau khi đổi tiền tố | `bootstrap-vm.sh` kiểm tra đủ biến bắt buộc trước khi cho `up`. Lúc đó stack cũ vẫn đang chạy |
| Nginx lỗi làm sập cả hai môi trường (một nginx dùng chung) | Luôn `nginx -t` trước khi reload, lưu bản sao site cũ để khôi phục |
| Build arm64 qua QEMU chậm, tốn phút CI | Chỉ build app có thay đổi; bật cache buildx `type=gha` |
| Luật tài liệu quá chặt làm chậm việc | Có nhãn `no-docs-needed` kèm lý do; xem lại luật sau 1 tháng |

## Lịch sử phiên bản

| Version | Ngày | Thay đổi | Người |
|---|---|---|---|
| 1.0 | 2026-09-23 | Bản đầu, tổng hợp buổi brainstorm | DYC + Claude |

## Lịch sử phiên bản

| Version | Ngày | Thay đổi | Người |
|---|---|---|---|
| 1.0 | 2026-09-24 | Bản có frontmatter, chép nguyên nội dung từ `docs/superpowers/specs/2026-09-23-monorepo-ultimate-tckt-design.md` (repo `tckt-activity-hub`, nhánh `staging`, commit `c5e3c80`) | DYC |

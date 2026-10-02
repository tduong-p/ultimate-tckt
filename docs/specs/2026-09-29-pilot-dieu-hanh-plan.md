---
doc_id: PLAN-PILOT-001
title: Kế hoạch triển khai — MVP Điều hành dùng thử nội bộ (pilot)
version: 1.10
status: draft
audience: [dev, ai]
owner: DYC
updated: 2026-10-02
related_code: [core/src/**, core/public/**, core/tests/**, core/app.js, services/ctd-api/backend/app/seeds/**, services/ctd-api/backend/tests/**, tools/test-fixtures/**]
---

# MVP Điều hành pilot — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Đưa module Điều hành (Core) vào dùng thử nội bộ theo SPEC-PILOT-001 v1.1, qua các PR nhỏ vào `staging`.

**Architecture:** Mỗi PR là một nhánh từ `origin/staging`, chỉ chạm một module, có test tái hiện lỗi trước khi sửa.
Test chạy trong CI (`.github/workflows/deploy.yml`: `test-core` với MySQL 8, `test-ctd` với Postgres 16) — không
cài MySQL/Docker ở máy. Việc liên module không code ở đây; gom vào một issue để họp team.

**Tech Stack:** Node 22 + Express 5 + MySQL 8 (`node --test`), FastAPI + SQLAlchemy + Postgres 16 (`pytest`),
vanilla SPA `core/public/app.js`.

**Spec:** [2026-09-29-pilot-dieu-hanh-design.md](2026-09-29-pilot-dieu-hanh-design.md) (SPEC-PILOT-001 v1.1)

## Global Constraints

- Nhánh tính năng → PR vào `staging`. Không push thẳng `main`. Không viết lại lịch sử git.
- Không ghi mật khẩu, token, giá trị `.env` vào repo, tài liệu, log, mô tả PR. Repo là public.
- Hotfix 2026-10-02: `migrate-units.js` bị PR #44 làm mất bản sửa `330a27b` (unit_id theo kiểu `org_units.id`), đã khôi phục — xem `docs/ai/bay-da-gap.md`.
- Thông báo phải có bản trong app; không dựa vào `mailer.notify*` hay push (đang tắt). Cập nhật 2026-10-02: `mailer.js` đã gỡ;
  email đi qua `notifier.notify` → Noti (`docs/dev/email-cron.md`), vẫn không thay cho thông báo trong app.
- Không đổi dạng `/api/session`, schema, env, compose, nginx, CI trong các PR ở đây (liên module).
- Mỗi PR cập nhật tài liệu liên quan (bump `version`, `updated`, dòng lịch sử) và chạy
  `npm run docs:index && npm run docs:check -- --base origin/staging`.
- Commit kết thúc bằng `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- TDD qua CI: push commit chỉ chứa test mới trước, xác nhận CI **đỏ đúng lý do**, rồi mới push bản sửa. Gộp nhiều
  test đỏ trong một PR vào một lần push để giảm số lần chờ (~3 phút/lần).
- `staging` chưa có branch protection: tự kiểm CI xanh trước khi merge. Ai merge (Claude hay anh/chị) do anh/chị
  quyết định trước PR đầu tiên.

## Review Focus

- Trình duyệt thật: lỗi phía client (c17, c18) chỉ có test tĩnh — sau khi PR 3 lên staging phải mở "Việc hôm nay"
  bằng tài khoản có task quá hạn và mở "Quản lý thành viên" bằng tài khoản trưởng team.
- Admin CTD trên staging/production **vẫn giữ mật khẩu mặc định cũ** sau PR 2 (seed không còn ghi đè nhưng cũng
  không đổi) — phải chạy `set_password` ngay sau deploy (Task 2, bước cuối).
- DB mới tinh ở môi trường thật: admin CTD có `password_hash=NULL` → đăng nhập bằng mật khẩu bị từ chối cho tới khi
  chạy `set_password`; test `test_seed_moi_truong_that_khong_dat_mat_khau_mac_dinh` ghim hành vi này.
- Core khởi động khi MySQL chưa sẵn sàng: sau PR 3 container thoát và `restart: unless-stopped` khởi động lại —
  đúng ý, nhưng log sẽ có vài lỗi migration trước khi DB lên; ghi vào `docs/ops/su-co.md` để người trực không hoảng.
- File dump đã gỡ khỏi cây vẫn còn trong lịch sử git (quyết định 2026-09-29) — a4 xử lý bằng cách đặt lại mật khẩu,
  không phải bằng code.

---

## Lộ trình PR

Plan này viết chi tiết PR 1–3. Các PR sau có danh sách việc cố định ở đây; plan chi tiết của từng PR được viết
ngay trước khi làm (code thay đổi sau mỗi PR nên số dòng/đoạn trích phải lấy lại lúc đó), lưu thành file
`2026-MM-DD-pilot-pr<N>-<slug>-plan.md` trong `docs/specs/`.

| PR | Nhánh | Mục spec | Module | Plan |
|---|---|---|---|---|
| 0 | `docs/pilot-dieu-hanh-spec` | Spec + plan này | Tài liệu | — |
| 1 | `chore/pilot-a1-remove-dump` | a1 | Tài liệu & tooling | Task 1 |
| 2 | `fix/pilot-a2-ctd-admin-seed` | a2 | CTD | Task 2 |
| 3 | `fix/pilot-core-crashes` | c17, c18, c22 (phần Core) | Core | Task 3–4 |
| 4 | `fix/pilot-core-authz` | c3, c5, c6, c10, c19, c21, c23, c24 | Core | viết sau |
| 5 | `fix/pilot-core-inapp-notify` | c1, c16, c20, c25 | Core | viết sau |
| 6 | `fix/pilot-core-vn-date` | c4 | Core | viết sau |
| 7 | `fix/pilot-core-accounts` | c7, c9, c11, c28 | Core | viết sau |
| 8 | `fix/pilot-core-ui-numbers` | c26, c27, c29 | Core | viết sau |
| 9 | `feat/pilot-core-debug` | b1, b2, b4 | Core | viết sau |
| 10 | `docs/pilot-ops` | 7.3 checklist smoke vào `docs/ops/`, checklist a4, tài khoản test staging (7.2) | Tài liệu/vận hành | viết sau |
| — | Issue liên module | a3, a5, b1', b3, b5, b6, c2, c8, c12, c13, c22 (compose), c32 (nginx), c35 (compose), ADR email, lịch phát hành, branch protection `test-core` | Họp team | Task 5 |
| — | Nhóm 2 tuần đầu | c14, c15, c30, c31, c32 (Core), c33, c34, c35 (log) | Core | plan riêng sau khi mở pilot |

Thứ tự 4 → 8 theo mức độ chặn pilot; PR 4 và 7 cùng chạm `core/src/routes/users.js` nên làm tuần tự, không song song.

---

### Task 1: PR 1 — gỡ dump MySQL khỏi cây (a1)

**Files:**
- Delete from index: `tools/test-fixtures/sql/mysql/backup_current.sql` (giữ file ở máy, chỉ gỡ khỏi git)
- Modify: `.gitignore`
- Modify: `tools/test-fixtures/README.md:14-20`
- Modify: `docs/ai/kiem-tra.md:48` (+ frontmatter, lịch sử)

**Interfaces:** không có.

- [ ] **Step 1: Tạo nhánh từ staging**

```bash
git fetch origin
git switch -c chore/pilot-a1-remove-dump origin/staging
```

- [ ] **Step 2: Thêm rule ignore**

Thêm vào cuối `.gitignore`:

```gitignore
# Dump DB chỉ để ở máy — repo public, không commit dữ liệu thật (SPEC-PILOT-001 a1)
tools/test-fixtures/sql/**/*.sql
```

- [ ] **Step 3: Gỡ file khỏi index, giữ bản ở máy**

```bash
git rm --cached tools/test-fixtures/sql/mysql/backup_current.sql
git status --short
```

Expected: `D  tools/test-fixtures/sql/mysql/backup_current.sql`, `M .gitignore`; file vẫn còn trên đĩa và
`git status` không liệt kê nó là untracked.

- [ ] **Step 4: Sửa README fixtures**

Trong `tools/test-fixtures/README.md`, thay khối `### \`sql/mysql/\`` (dòng 14–20) bằng:

```markdown
### `sql/mysql/`
Chỗ đặt dump MySQL của Core **ở máy mình** (mọi `*.sql` trong `tools/test-fixtures/sql/` bị git-ignore).
Repo là public: không commit dump, CSV hay dữ liệu người dùng thật.

- `backup_current.sql` — tên mặc định mà `restore-db.ps1` đọc; tự tạo bằng lệnh ở mục "Tạo backup mới".
```

- [ ] **Step 5: Sửa `docs/ai/kiem-tra.md`**

Dòng 48 thành:

```markdown
- `sql/mysql/`: chỗ đặt dump MySQL **ở máy mình** — git-ignore, không commit (repo public)
```

Frontmatter: `version: 1.6`, `updated: 2026-09-29`. Thêm dòng cuối bảng lịch sử:

```markdown
| 1.6 | 2026-09-29 | Dump MySQL chỉ để ở máy (git-ignore), gỡ `backup_current.sql` khỏi repo | DYC |
```

- [ ] **Step 6: Kiểm tra**

```bash
git ls-files tools/test-fixtures/sql
npm run docs:index && npm run docs:check -- --base origin/staging
npm run test:tools
```

Expected: lệnh đầu không in gì; `docs ok`; test tools xanh.

- [ ] **Step 7: Commit, push, mở PR**

```bash
git add .gitignore tools/test-fixtures/README.md docs/ai/kiem-tra.md docs/README.md
git commit -m "chore(fixtures): stop tracking MySQL dump (pilot a1)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git push -u origin chore/pilot-a1-remove-dump
gh pr create --base staging --title "chore(fixtures): stop tracking MySQL dump (pilot a1)" --body "Gỡ dump MySQL khỏi cây, thêm rule ignore. Lịch sử git giữ nguyên theo quyết định 2026-09-29; mật khẩu cũ xử lý ở a4.

Docs: cập nhật docs/ai/kiem-tra.md.

🤖 Generated with [Claude Code](https://claude.com/claude-code)"
```

---

### Task 2: PR 2 — seed admin CTD không ghi đè mật khẩu + lệnh `set_password` (a2)

**Files:**
- Modify: `services/ctd-api/backend/app/seeds/admin_seed.py`
- Create: `services/ctd-api/backend/app/seeds/set_password.py`
- Create: `services/ctd-api/backend/tests/test_admin_seed.py`
- Modify: `docs/dev/chay-local.md` (lệnh `set_password`, frontmatter, lịch sử)
- Modify: `docs/ai/tim-o-dau.md` (hàng "Seed dữ liệu", frontmatter, lịch sử)

**Interfaces:**
- Produces: `seed_admin(db: Session, app_env: str | None = None) -> User` — `app_env=None` đọc `settings.app_env`.
- Produces: `set_password(db: Session, email: str, password: str) -> User` — `ValueError` khi mật khẩu < 8 ký tự,
  `LookupError` khi không có email; `main(argv: list[str]) -> int` cho `python -m app.seeds.set_password <email>`.

- [ ] **Step 1: Tạo nhánh**

```bash
git fetch origin
git switch -c fix/pilot-a2-ctd-admin-seed origin/staging
```

- [ ] **Step 2: Viết test đỏ** — `services/ctd-api/backend/tests/test_admin_seed.py`

```python
"""Seed admin chạy ở mỗi lần container khởi động: không được đặt lại mật khẩu,
và môi trường thật không bao giờ nhận mật khẩu mặc định công khai trong repo."""

import pytest

from app.infra.password import hash_password, verify_password
from app.models.identity import Role
from app.seeds.admin_seed import ADMIN_EMAIL, ADMIN_PASSWORD_DEFAULT, seed_admin
from app.seeds.set_password import set_password


def test_seed_giu_mat_khau_admin_da_co(db):
    admin = seed_admin(db, app_env="dev")
    admin.password_hash = hash_password("MatKhauRieng2026!")
    db.commit()

    again = seed_admin(db, app_env="production")

    assert verify_password("MatKhauRieng2026!", again.password_hash)
    assert not verify_password(ADMIN_PASSWORD_DEFAULT, again.password_hash)
    assert again.role == Role.QUAN_TRI
    assert again.is_active is True


def test_seed_moi_truong_that_khong_dat_mat_khau_mac_dinh(db):
    admin = seed_admin(db, app_env="production")
    assert admin.password_hash is None


def test_seed_dev_van_dat_mat_khau_mac_dinh(db):
    admin = seed_admin(db, app_env="dev")
    assert verify_password(ADMIN_PASSWORD_DEFAULT, admin.password_hash)


def test_set_password_doi_mat_khau(db):
    seed_admin(db, app_env="production")
    user = set_password(db, ADMIN_EMAIL.upper(), "MatKhauMoi2026!")
    assert verify_password("MatKhauMoi2026!", user.password_hash)


def test_set_password_tu_choi_mat_khau_ngan(db):
    seed_admin(db, app_env="production")
    with pytest.raises(ValueError):
        set_password(db, ADMIN_EMAIL, "ngan")


def test_set_password_bao_loi_khi_khong_co_email(db):
    with pytest.raises(LookupError):
        set_password(db, "khong-ton-tai@example.edu.vn", "MatKhauMoi2026!")
```

- [ ] **Step 3: Push test, xác nhận CI đỏ**

```bash
git add services/ctd-api/backend/tests/test_admin_seed.py
git commit -m "test(ctd): admin seed must not reset password (pilot a2)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git push -u origin fix/pilot-a2-ctd-admin-seed
gh pr create --draft --base staging --title "fix(ctd): admin seed keeps password + set_password CLI (pilot a2)" --body "Đang làm — xem SPEC-PILOT-001 a2.

🤖 Generated with [Claude Code](https://claude.com/claude-code)"
gh pr checks --watch
```

Expected: `test-ctd` đỏ với `ModuleNotFoundError: No module named 'app.seeds.set_password'` (lỗi import làm cả file
đỏ — đúng lý do).

- [ ] **Step 4: Sửa `admin_seed.py`** — thay toàn bộ file bằng:

```python
from sqlalchemy.orm import Session
from app.config import MOI_TRUONG_DEV, settings
from app.models.identity import Role, User
from app.infra.password import hash_password

ADMIN_EMAIL = "tckt.dtn@hust.edu.vn"
# Chỉ dùng ở APP_ENV=dev. Môi trường thật đặt mật khẩu bằng
# `python -m app.seeds.set_password <email>`.
ADMIN_PASSWORD_DEFAULT = "Dev@123"
ADMIN_FULL_NAME = "Quản trị viên Hệ thống"


def seed_admin(db: Session, app_env: str | None = None) -> User:
    """Đảm bảo có tài khoản quản trị cao nhất. Chạy ở mỗi lần khởi động nên
    không bao giờ đổi mật khẩu của tài khoản đã có."""
    env = app_env or settings.app_env
    user = db.query(User).filter_by(email=ADMIN_EMAIL).first()
    if user is None:
        user = User(
            email=ADMIN_EMAIL,
            full_name=ADMIN_FULL_NAME,
            role=Role.QUAN_TRI,
            password_hash=hash_password(ADMIN_PASSWORD_DEFAULT) if env == MOI_TRUONG_DEV else None,
            is_active=True,
            unit_id=None,
        )
        db.add(user)
    else:
        user.role = Role.QUAN_TRI
        user.is_active = True
        if not user.full_name:
            user.full_name = ADMIN_FULL_NAME

    db.commit()
    db.refresh(user)
    return user
```

- [ ] **Step 5: Tạo `set_password.py`**

```python
"""Đặt mật khẩu một tài khoản CTD từ dòng lệnh, không để mật khẩu lọt vào
lịch sử shell hay biến môi trường:

    python -m app.seeds.set_password <email>
"""

import getpass
import sys

from sqlalchemy.orm import Session

from app.db import SessionLocal
from app.infra.password import hash_password
from app.models.identity import User

DO_DAI_TOI_THIEU = 8


def set_password(db: Session, email: str, password: str) -> User:
    if len(password) < DO_DAI_TOI_THIEU:
        raise ValueError(f"Mật khẩu cần ít nhất {DO_DAI_TOI_THIEU} ký tự.")
    user = db.query(User).filter_by(email=email.strip().lower()).first()
    if user is None:
        raise LookupError(f"Không có tài khoản {email}.")
    user.password_hash = hash_password(password)
    db.commit()
    return user


def main(argv: list[str]) -> int:
    if len(argv) != 1:
        print("Cách dùng: python -m app.seeds.set_password <email>", file=sys.stderr)
        return 2
    password = getpass.getpass("Mật khẩu mới: ")
    if password != getpass.getpass("Nhập lại: "):
        print("Hai lần nhập không khớp.", file=sys.stderr)
        return 1
    with SessionLocal() as db:
        try:
            user = set_password(db, argv[0], password)
        except (ValueError, LookupError) as loi:
            print(loi, file=sys.stderr)
            return 1
    print(f"Đã đặt mật khẩu cho {user.email}.")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
```

- [ ] **Step 6: Tài liệu**

`docs/dev/chay-local.md`: sau dòng `.venv/bin/python -m app.seeds        # dữ liệu mẫu (nếu cần)` thêm

```bash
.venv/bin/python -m app.seeds.set_password tckt.dtn@hust.edu.vn   # đặt mật khẩu admin (bắt buộc ngoài APP_ENV=dev)
```

và một câu dưới khối lệnh: "Seed admin không bao giờ đổi mật khẩu tài khoản đã có; ngoài `APP_ENV=dev` tài khoản
mới được tạo **không có** mật khẩu cho tới khi chạy `set_password`." Frontmatter `version: 1.1`,
`updated: 2026-09-29`, lịch sử `| 1.1 | 2026-09-29 | Lệnh set_password; seed admin không ghi đè mật khẩu | DYC |`.

`docs/ai/tim-o-dau.md`: hàng "Seed dữ liệu" thêm `set_password.py`; `version: 2.1`, `updated: 2026-09-29`, lịch sử
`| 2.1 | 2026-09-29 | Thêm set_password.py vào hàng Seed dữ liệu | DYC |`.

- [ ] **Step 7: Push, xác nhận CI xanh**

```bash
git add services/ctd-api/backend/app/seeds docs/dev/chay-local.md docs/ai/tim-o-dau.md
npm run docs:index && npm run docs:check -- --base origin/staging
git add docs/README.md
git commit -m "fix(ctd): admin seed keeps existing password, add set_password CLI (pilot a2)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git push
gh pr checks --watch
```

Expected: `test-ctd` xanh (gồm `test_auth.py::test_dang_nhap_bang_mat_khau_admin` — CI không đặt `APP_ENV` nên là
`dev`). Sửa mô tả PR: bỏ "Đang làm", thêm mục **Sau khi deploy** (không kèm mật khẩu):

```text
Sau khi deploy staging và production, người vận hành chạy trên VM:
  docker compose ... exec ctd-api python -m app.seeds.set_password tckt.dtn@hust.edu.vn
(tên project/compose theo infra/scripts/lib.sh). Trước bước này admin CTD vẫn giữ mật khẩu mặc định cũ.
```

Rồi `gh pr ready`.

---

### Task 3: PR 3 — hai lỗi sập phía client (c17, c18)

**Files:**
- Modify: `core/tests/frontend.contract.test.js` (thêm 2 test cuối file)
- Modify: `core/public/app.js:919`, `core/public/app.js:941`, `core/public/app.js:1393`

**Interfaces:** không đổi API.

- [ ] **Step 1: Tạo nhánh**

```bash
git fetch origin
git switch -c fix/pilot-core-crashes origin/staging
```

- [ ] **Step 2: Viết test đỏ** — thêm vào cuối `core/tests/frontend.contract.test.js`:

```js
test('app.js never declares a local that calls a same-named helper (TDZ crash)', () => {
  const shadowing = [...assets['app.js'].matchAll(/\b(?:const|let)\s+([A-Za-z_$][\w$]*)\s*=\s*\1\s*\(/g)]
    .map(match => match[1]);
  assert.deepEqual(shadowing, []);
});

test('app.js does not call server-only role helpers', () => {
  for (const helper of ['isLeadership', 'isExecutive', 'managerOrEventLead']) {
    assert.doesNotMatch(assets['app.js'], new RegExp(`\\b${helper}\\s*\\(`), `${helper} only exists on the server`);
  }
});
```

- [ ] **Step 3: Sửa `myTasksToday`** (`core/public/app.js`)

Dòng 919:

```js
    const late=isOverdue(x.deadline)&&x.status!=='done';
```

Dòng 941 — đổi `${isOverdue?'late':''}` thành `${late?'late':''}`. Kiểm không còn dùng biến cục bộ cũ:

```bash
awk 'NR>=916 && NR<=960' core/public/app.js | grep -n "isOverdue"
```

Expected: chỉ còn dòng gọi hàm `isOverdue(x.deadline)`.

- [ ] **Step 4: Sửa `membersModal`** (`core/public/app.js:1393`)

Trong `const canRemove=isExec()||(isLeadership(state.user)&&…` thay `isLeadership(state.user)` bằng `canManage()`
(helper phía client ở `app.js:127`). Kiểm:

```bash
grep -c "isLeadership(" core/public/app.js
```

Expected: `0`.

- [ ] **Step 5: Commit** (push chung với Task 4)

```bash
git add core/tests/frontend.contract.test.js core/public/app.js
git commit -m "fix(core-ui): today page TDZ crash and members modal ReferenceError (pilot c17, c18)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

TDD qua CI cho task này: test tĩnh chạy được không cần DB — chạy trước khi sửa (bước 2 xong) bằng
`node --test core/tests/frontend.contract.test.js` ở máy (không cần MySQL), Expected: 2 test mới FAIL; sau bước 4
chạy lại, Expected: PASS.

---

### Task 4: PR 3 — không nuốt lỗi migration lúc khởi động (c22, phần Core)

**Files:**
- Create: `core/tests/runtime.startup.test.js`
- Modify: `core/src/runtime.js:7-16`, `core/src/runtime.js` (exports)
- Modify: `core/app.js` (catch)
- Modify: `docs/ops/su-co.md` mục 6 (+ frontmatter, lịch sử)

**Interfaces:**
- Produces: `migrateOnStartup(application, options) -> Promise<void>` export từ `core/src/runtime.js`;
  `options.autoMigrate === false` hoặc `!application.config.hasConfiguredDatabase` → bỏ qua; `options.migrateDatabase`
  (mặc định `migrateDatabase` của `config/migrate`) để test thay thế; lỗi migration được ghi log rồi **ném lại**.

- [ ] **Step 1: Viết test đỏ** — `core/tests/runtime.startup.test.js`

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const { migrateOnStartup } = require('../src/runtime');

test('a failed startup migration is rethrown, not swallowed', async () => {
  const failure = new Error('migration exploded');
  const application = { db: {}, config: { hasConfiguredDatabase: true } };
  await assert.rejects(
    migrateOnStartup(application, { migrateDatabase: async () => { throw failure; } }),
    failure
  );
});

test('startup migration is skipped without a configured database', async () => {
  let called = false;
  await migrateOnStartup({ db: {}, config: { hasConfiguredDatabase: false } }, { migrateDatabase: async () => { called = true; } });
  assert.equal(called, false);
});

test('startup migration can be disabled explicitly', async () => {
  let called = false;
  await migrateOnStartup({ db: {}, config: { hasConfiguredDatabase: true } }, { autoMigrate: false, migrateDatabase: async () => { called = true; } });
  assert.equal(called, false);
});
```

Chạy ở máy (không cần DB): `cd core && node --test tests/runtime.startup.test.js`.
Expected: FAIL — `migrateOnStartup is not a function`.

- [ ] **Step 2: Sửa `core/src/runtime.js`**

Thay đoạn dòng 7–16 (`async function start…` tới hết khối `if (options.autoMigrate…)`) bằng:

```js
async function migrateOnStartup(application, options = {}) {
  if (options.autoMigrate === false || !application.config.hasConfiguredDatabase) return;
  const migrate = options.migrateDatabase || migrateDatabase;
  try {
    await migrate(application.db, { logger });
  } catch (err) {
    // Chạy tiếp trên schema dở dang thì mọi request đăng nhập đều 500 (unit-context đọc bảng mới).
    // Thoát để container khởi động lại khi DB sẵn sàng.
    logger.error('Auto-migration failed during startup', err);
    throw err;
  }
}

async function start(options = {}) {
  const application = createApplication(options);
  await migrateOnStartup(application, options);
```

Cuối file: `module.exports = { start, migrateOnStartup };`

- [ ] **Step 3: Sửa `core/app.js`** — trong `catch`, thay `process.exitCode = 1;` bằng `process.exit(1);`
  (pool MySQL và session store còn mở sẽ giữ tiến trình sống nếu chỉ đặt `exitCode`).

- [ ] **Step 4: Chạy lại** `cd core && node --test tests/runtime.startup.test.js tests/frontend.contract.test.js`
  Expected: PASS.

- [ ] **Step 5: Tài liệu** — `docs/ops/su-co.md` mục 6, thêm gạch đầu dòng:

```markdown
- Core **thoát** nếu auto-migration lúc khởi động lỗi (từ SPEC-PILOT-001 c22); `restart: unless-stopped` sẽ khởi động
  lại. Vài dòng `Auto-migration failed during startup` ngay sau khi VM/MySQL khởi động là bình thường; lặp mãi thì
  đọc lỗi migration trong log và xem `docs/dev/db-migration.md`.
```

Frontmatter `version: 1.1`, `updated: 2026-09-29`, lịch sử
`| 1.1 | 2026-09-29 | Core thoát khi auto-migration lỗi | DYC |`.

- [ ] **Step 6: Push và xác nhận CI**

Vì test ở Task 3–4 chạy được ở máy không cần DB, "đỏ trước" đã xác nhận cục bộ ở Task 3 bước 5 và Task 4 bước 1;
CI chỉ cần xác nhận toàn bộ suite xanh.

```bash
npm run docs:index && npm run docs:check -- --base origin/staging
git add core/src/runtime.js core/app.js core/tests/runtime.startup.test.js docs/ops/su-co.md docs/README.md
git commit -m "fix(core): exit when startup migration fails (pilot c22)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git push -u origin fix/pilot-core-crashes
gh pr create --base staging --title "fix(core): today-page crash, members modal, exit on failed migration (pilot c17 c18 c22)" --body "SPEC-PILOT-001 c17, c18, c22 (phần Core; healthcheck compose nằm trong issue liên module).

Người dùng thử cần biết: trang \"Việc hôm nay\" và \"Quản lý thành viên\" của trưởng team hoạt động lại.

Docs: docs/ops/su-co.md.

🤖 Generated with [Claude Code](https://claude.com/claude-code)"
gh pr checks --watch
```

Expected: `test-core` và `docs` xanh.

- [ ] **Step 7: Smoke trên staging sau khi merge** (Review Focus dòng 1): đăng nhập staging bằng tài khoản test có
  task quá hạn → mở "Việc hôm nay" không lỗi; tài khoản trưởng team → "Quản lý thành viên" mở được modal. Chụp màn
  hình đính vào PR.

---

### Task 5: Soạn issue liên module (không code)

**Files:** không commit; nội dung issue soạn theo `.github/ISSUE_TEMPLATE/cross-module.md`, gửi anh/chị duyệt
trước khi tạo trên GitHub.

- [ ] **Step 1:** Đọc `.github/ISSUE_TEMPLATE/cross-module.md` và `docs/dev/ranh-gioi-module.md`.
- [ ] **Step 2:** Soạn một issue gồm, mỗi mục một dòng "đề xuất + module chủ + câu hỏi cần chốt": a3 backup tự
  động (gồm `core_uploads`), a5 đồng bộ `unit_memberships`, b1' xoay vòng log Docker, b3 `BUILD_SHA` trong CI,
  b5 chữ ký `services/audit.js`, b6 healthcheck CTD/compose, c2 `client_max_body_size 50m`, c8 field `sso_enabled`
  trong `/api/session`, c12 đọc lại `role`/`is_active` mỗi request, c13 trạng thái mềm khi từ chối đề xuất,
  c22 healthcheck `core-db` + `depends_on: service_healthy`, c32 `limit_req` đăng nhập ở nginx, c35 `mem_limit`,
  ADR tạm hoãn email (thay/bổ sung ADR-0004), lịch chốt đợt phát hành, branch protection bắt buộc `test-core`/`test-ctd`
  trên `staging` và `main`.
- [ ] **Step 3:** Gửi bản nháp cho anh/chị; chỉ `gh issue create` khi được đồng ý.

## Lịch sử phiên bản

| Version | Ngày | Thay đổi | Người |
|---|---|---|---|
| 1.2 | 2026-09-30 | Ghi nhận triển khai Task 2/a2 và cập nhật các tài liệu bị `related_code` tác động | DYC |
| 1.3 | 2026-09-30 | Ghi nhận triển khai Task 3–4/c17/c18/c22 và tài liệu bị `related_code` tác động | DYC |
| 1.1 | 2026-09-30 | Ghi nhận hoàn tất Task 1/a1: dump MySQL không còn được theo dõi trong git | DYC |
| 1.0 | 2026-09-29 | Bản đầu: lộ trình 10 PR, chi tiết PR 1–3 và issue liên module | DYC |
| 1.4 | 2026-09-30 | PR 4 đang làm: nhánh fix/pilot-core-authz, plan chi tiết ghi trong PR | DYC |
| 1.5 | 2026-09-30 | PR 6 (c4) làm ở nhánh fix/pilot-core-vn-date | DYC |
| 1.6 | 2026-09-30 | PR 8 xong (c26, c27 một phần, c29 CSS); PR 5 thông báo tạm hoãn | DYC |
| 1.7 | 2026-09-30 | Hotfix staging 502 (migrate unit_id) chèn trước PR 7 | DYC |
| 1.8 | 2026-10-01 | Xử lý conflict merge staging và cập nhật tài liệu | DYC |
| 1.9 | 2026-10-02 | Ghi chú: email đi qua Noti, không còn `mailer.notify*` | DYC |
| 1.10 | 2026-10-02 | Hotfix lần 2: khôi phục bản sửa unit_id bị PR #44 ghi đè | DYC |

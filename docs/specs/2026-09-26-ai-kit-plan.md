---
doc_id: SPEC-AIKIT-002
title: Kế hoạch triển khai — AI kit cho dev (repo chính)
version: 1.0
status: draft
audience: [dev, ai]
owner: DYC
updated: 2026-09-26
related_code: []
---

# AI kit cho dev (repo chính) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dựng baseline chung cho AI agent của mọi dev: git hook chặn lỗi nặng, hai lệnh `npm run ai:context` / `npm run ai:docs-todo`, ba skill `tckt-*`, hook và subagent riêng cho Claude Code, kèm đủ tài liệu, để dev và agent hiểu đúng repo và luôn cập nhật tài liệu.

**Architecture:** Kit có 4 tầng. Tầng trên hỏng thì tầng dưới vẫn chạy.
- **Tầng 0** — git hook Node thuần ở `tools/git-hooks/`. Cài bằng `npm run hooks:install`.
- **Tầng 1** — CLI `tools/ai-kit/`. Dùng lại loader và luật của `tools/docs-check/` (tách loader sang `load.js`, thêm `impactedDocs`) cùng bảng module máy đọc được `tools/ai-kit/modules.json`.
- **Tầng 2** — skill `SKILL.md` mỏng ở `.agents/skills/tckt-*/`, symlink sang `.claude/skills/`.
- **Tầng 3** — hook `PreToolUse`/`Stop` của Claude Code, gọi cùng logic của tầng 1.

Logic thuần nằm trong `lib.js`, còn IO (git, fs) nằm trong `repo.js`/script, để test được bằng fixture.

**Tech Stack:** Node 22 (built-in `node:test`, `node:child_process`, `node:fs`). Không thêm dependency. Git ≥ 2.28.

**Spec:** `docs/specs/2026-09-26-ai-kit-repobot-design.md` (SPEC-AIKIT-001), phần A (mục 4), mục 6 (phần C), mục 7 (test repo chính), mục 8 (tài liệu phần kit). Bot `repobot` (phần B) có plan riêng ở repo phụ, **không** thuộc plan này.

## Global Constraints

- **Cổng họp team:** kit đổi hợp đồng dùng chung, gồm luật `AGENTS.md`, `.agents/**`, `.claude/**`, `package.json` gốc và tooling. Chỉ bắt đầu Task 1 khi issue liên module (mẫu `.github/ISSUE_TEMPLATE/cross-module.md`) đã có mục "Quyết định họp team" được điền (Task 0).
- Node `>=22 <23` (theo `engines` của `package.json` gốc). Chỉ dùng module built-in `node:*`. **Không** thêm `dependencies`/`devDependencies`, **không** tạo `package-lock.json` ở gốc.
- Cài hook bằng `npm run hooks:install` (`git config core.hooksPath tools/git-hooks`), **không** dùng script `prepare`. Lý do: gốc repo không có dependency nên không ai chạy `npm install` ở gốc, và `npm install` sẽ sinh lockfile rác. Đây là chỗ lệch có chủ đích so với spec 4.1, và phải ghi lại trong ADR-0013 cùng `docs/dev/ai-kit.md`.
- Mọi lệnh `git` do code gọi đều thêm `-c core.quotepath=off`. Nếu thiếu, tên file tiếng Việt (vd. trong `docs/ba/nguon/`) bị git quote thành `"docs/ba/nguon/B\341\272..."` và lọt qua mọi kiểm tra.
- Thông báo cho người dùng viết bằng tiếng Việt. Tên hàm, biến, file và chuỗi test viết bằng tiếng Anh, theo code hiện có.
- Không ghi secret. Chuỗi giống secret trong test phải **ghép lúc chạy** (`'gh' + 'p_' + …`) để chính file test không bị `pre-commit` chặn. Tài liệu không viết đầy đủ dạng URL webhook Discord.
- Không sửa skill vendored trong `.agents/skills/` (chỉ tạo mới `tckt-*` và sửa `_superpowers/README.md`). Không sửa `docs/ba/nguon/**`. Không sửa ADR cũ.
- **Luật tài liệu** (`AGENTS.md` §4):
  - Mỗi tài liệu có sẵn chỉ tăng `version` **một lần cho cả nhánh**, lần sửa đầu tiên. Các task sau chỉ sửa nội dung, không tăng tiếp.
  - `updated` là ngày làm thật, và không được lùi.
  - Mỗi lần tăng phải thêm một dòng lịch sử.
  - Tài liệu mới bắt đầu ở `1.0`.
  - Thêm hoặc xoá tài liệu thì chạy `npm run docs:index`.
- Nhánh thực thi: `feat/ai-kit`, tách từ `origin/staging` **sau khi** PR spec/plan (`docs/ai-kit-repobot-spec`) đã merge. PR vào `staging`, không push `main`.
- Test đặt ở `tools/tests/*.test.js` (`node:test`), chạy bằng `npm run test:tools`. Mọi test tạo repo tạm dùng `tools/tests/helpers/git-repo.js` (Task 1).
- Glob trong `related_code` và `modules.json` chỉ dùng `*` và `**`. `globToRegExp` **không** hỗ trợ `{a,b}`, nên phải liệt kê từng file.

## Review Focus

1. **Tên file tiếng Việt hoặc có dấu cách** trong output git (quotepath, và tab cuối dòng `+++ b/…` khi tên có dấu cách). Hook và docs-todo phải nhận đúng tên. Test ở Task 1 (hook thật với `docs/ba/nguon/Bản gốc.docx`, diff có tên `x y.md`) và Task 4 (file chưa track `src/tài liệu.js`).
2. **Chạy từ thư mục con hoặc truyền đường dẫn tuyệt đối.** `npm run` đổi cwd về gốc, nên đường dẫn gốc lấy từ `INIT_CWD`. Claude Code truyền `file_path` tuyệt đối. Kết quả phải ra đúng đường dẫn tương đối với repo. Test ở Task 3 (CLI từ `core/`, đường dẫn tuyệt đối) và Task 6 (hook, file ngoài repo bị bỏ qua).
3. **Máy chưa có `origin/staging`** (clone mới, offline). Khi đó:
   - `pre-push` bỏ qua `docs:check` kèm cảnh báo.
   - `ai:docs-todo` báo lỗi rõ ràng, chỉ lệnh `git fetch`.
   - Hook `Stop` im lặng, không chặn agent.

   Test ở Task 1, 4 và 6.
4. **Xoá file:**
   - Xoá `.env` khỏi index: được phép.
   - Xoá bản gốc `nguon/`: bị chặn.
   - Push xoá nhánh `main`: không bị nhầm là push lên main.
   - Tài liệu mới hoặc bị xoá: nhắc `docs:index`.

   Test ở Task 1 và 4.
5. **Hook `Stop` nhắc lặp vô hạn.** Mỗi danh sách việc chỉ được nhắc một lần trong mỗi session, và `stop_hook_active` luôn cho dừng. Test ở Task 6.

---

## Cấu trúc file

| File | Trách nhiệm |
|---|---|
| `tools/git-hooks/lib.js` | Luật thuần của hook: mẫu secret, nhận diện `.env`, parse output git, `checkStaged`, `checkPush` |
| `tools/git-hooks/pre-commit`, `pre-push` | Script Node có shebang: gọi git, gọi `lib.js`, in lỗi, trả exit code |
| `tools/tests/helpers/git-repo.js` | Tạo repo git tạm cho test (không chạy hook toàn cục của máy) |
| `tools/docs-check/load.js` | `GENERATED`, `isSource`, `walk`, `loadDocs` — tách từ `cli.js` để `ai-kit` dùng lại |
| `tools/docs-check/rules.js` | Thêm `impactedDocs`; `docsImpact` viết lại trên nó |
| `tools/ai-kit/modules.json` | Bảng module + hợp đồng dùng chung máy đọc được (nguồn sự thật cho glob; `ranh-gioi-module.md` tóm tắt và trỏ tới) |
| `tools/ai-kit/lib.js` | Logic thuần: `classify`, `relatedDocs`, `context`, `formatContext`, `docsTodo`, `todoIsEmpty`, `formatTodo`, `today`, `guardEdit` |
| `tools/ai-kit/repo.js` | IO: `ROOT`, `loadMap`, `toRepoPath`, `gatherContext`, `gatherTodo` |
| `tools/ai-kit/cli.js` | `context <file…> [--json]`, `docs-todo [--base <ref>] [--strict]` |
| `tools/ai-kit/claude-hook.js` | `pre` / `stop` cho Claude Code (đọc JSON stdin, trả exit code/stdout/stderr) |
| `.agents/skills/tckt-{start,docs,explain}/SKILL.md` | Skill mỏng; `.claude/skills/tckt-*` là symlink |
| `.claude/settings.json`, `.claude/agents/bat-bien-reviewer.md` | Nối hook, subagent rà bất biến |
| `tools/tests/{git-hooks,ai-kit,kit-skills,claude-hook}.test.js` | Test |

---

### Task 0: Cổng họp team

**Files:**
- Modify: `docs/specs/2026-09-26-ai-kit-repobot-design.md` (frontmatter `status`, `version`, `updated`, lịch sử)

- [ ] **Step 1: Kiểm tra issue đã có quyết định**

Run: `gh issue list --label cross-module --state all --search "AI kit"`
Mở issue tìm được, rồi đọc mục `## Quyết định họp team`.
- Mục còn trống, hoặc không có issue: **dừng**. Báo người dùng: "Kit chạm hợp đồng dùng chung (AGENTS.md, .agents/**, .claude/**, package.json gốc) — cần raise họp team". Bản nháp issue nằm trong spec mục 11.
- Quyết định có điều chỉnh so với spec: cập nhật spec và plan này trước khi làm tiếp.

- [ ] **Step 2: Chuyển spec sang active**

Trong frontmatter của `docs/specs/2026-09-26-ai-kit-repobot-design.md`, đặt `status: active`, `version: 1.2` và `updated: <ngày làm>`. Thêm dòng lịch sử:

```markdown
| 1.2 | <ngày làm> | Họp team duyệt (issue #<số>) — chuyển active | DYC |
```

Trong frontmatter của plan này (`docs/specs/2026-09-26-ai-kit-plan.md`), đặt `status: active`. File này mới trong nhánh spec nên chưa cần tăng version nếu nhánh đó chưa merge. Nếu đã merge, tăng lên `1.1` và thêm dòng lịch sử tương tự.

- [ ] **Step 3: Tạo nhánh và kiểm tra**

```bash
git fetch origin staging
git switch -c feat/ai-kit origin/staging
npm run docs:index && npm run docs:check -- --base origin/staging
```
Expected: `docs ok: … files checked`

- [ ] **Step 4: Commit**

```bash
git add docs/specs/ docs/README.md
git commit -m "docs(specs): AI kit spec approved by team meeting"
```

---

### Task 1: Tầng 0 — git hook `pre-commit` / `pre-push`

**Files:**
- Create: `tools/tests/helpers/git-repo.js`
- Create: `tools/git-hooks/lib.js`
- Create: `tools/git-hooks/pre-commit`, `tools/git-hooks/pre-push` (thực thi được)
- Create: `tools/tests/git-hooks.test.js`
- Create: `docs/dev/ai-kit.md`
- Modify: `package.json` (thêm script `hooks:install`)
- Modify: `docs/ai/kiem-tra.md` (1.3 → 1.4), `docs/dev/test.md` (1.3 → 1.4), `docs/onboarding/ngay-1.md` (1.1 → 1.2), `docs/ai/bay-da-gap.md` (1.1 → 1.2)

**Interfaces:**
- Produces:
  - `require('./helpers/git-repo').makeGitRepo({ branch = 'staging' })` trả về `{ dir, git(...args): string, write(relPath, text), commitAll(msg), tryGit(...args): SpawnSyncReturns }`.
    - `dir` đã qua `realpath`.
    - Hook toàn cục bị tắt (`core.hooksPath` trỏ vào thư mục không tồn tại).
  - `require('../git-hooks/lib')` export:
    - `SECRET_PATTERNS: {name, re}[]`
    - `isEnvFile(p): boolean`
    - `parseNameStatus(text): {status, path}[]`
    - `addedLines(diff): {file, text}[]`
    - `checkStaged(entries, added): string[]`
    - `checkPush(stdin): string[]`
  - Task 6 dùng lại `isEnvFile`.

- [ ] **Step 1: Viết helper repo tạm**

`tools/tests/helpers/git-repo.js`:

```js
'use strict';
// Repo git tạm cho test tooling. Tắt hook toàn cục của máy để test không phụ thuộc cấu hình dev.
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync, spawnSync } = require('node:child_process');

function makeGitRepo({ branch = 'staging' } = {}) {
  const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'tckt-git-')));
  const git = (...a) => execFileSync('git', ['-c', 'core.quotepath=off', ...a], { cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  git('init', '-q', '-b', branch);
  git('config', 'user.email', 'test@example.invalid');
  git('config', 'user.name', 'test');
  git('config', 'commit.gpgsign', 'false');
  git('config', 'core.hooksPath', path.join(dir, '.no-hooks'));
  const write = (p, text) => {
    const f = path.join(dir, p);
    fs.mkdirSync(path.dirname(f), { recursive: true });
    fs.writeFileSync(f, text);
  };
  const commitAll = (msg = 'c') => { git('add', '-A'); git('commit', '-q', '--no-verify', '-m', msg); };
  const tryGit = (...a) => spawnSync('git', a, { cwd: dir, encoding: 'utf8' });
  return { dir, git, write, commitAll, tryGit };
}

module.exports = { makeGitRepo };
```

- [ ] **Step 2: Viết test (đỏ)**

`tools/tests/git-hooks.test.js`:

```js
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const hooks = require('../git-hooks/lib');
const { makeGitRepo } = require('./helpers/git-repo');

const ROOT = path.join(__dirname, '..', '..');
const HOOKS = path.join(ROOT, 'tools/git-hooks');
// Chuỗi giống secret được ghép lúc chạy để chính file test không bị pre-commit chặn.
const FAKE = {
  github: 'gh' + 'p_' + 'a1B2'.repeat(9),
  pat: 'github' + '_pat_' + 'x9'.repeat(30),
  key: '-----BEGIN ' + 'RSA PRIVATE KEY-----',
  aws: 'AK' + 'IA' + 'ABCDEFGHIJKLMNOP',
  slack: 'xo' + 'xb-' + '1234567890-abcdef',
  webhook: 'https://discord.com/api/' + 'webhooks/123/abc',
};

test('isEnvFile: .env files yes, examples and look-alikes no', () => {
  for (const p of ['.env', 'core/.env', 'infra/.env.staging', 'x/prod.env']) assert.ok(hooks.isEnvFile(p), p);
  for (const p of ['core/.env.example', 'infra/.env.staging.example', 'docs/env.md', 'src/environment.js']) assert.ok(!hooks.isEnvFile(p), p);
});

test('parseNameStatus keeps Vietnamese names; addedLines handles spaces, /dev/null and deletions', () => {
  assert.deepEqual(hooks.parseNameStatus('M\tcore/a.js\nA\tdocs/ba/nguon/Bản gốc.docx\n'), [
    { status: 'M', path: 'core/a.js' },
    { status: 'A', path: 'docs/ba/nguon/Bản gốc.docx' },
  ]);
  const diff = [
    'diff --git a/x y.md b/x y.md', '--- /dev/null', '+++ b/x y.md\t', '@@ -0,0 +1,2 @@', '+hello', '+world',
    'diff --git a/gone.md b/gone.md', '--- a/gone.md', '+++ /dev/null', '@@ -1 +0,0 @@', '-bye',
  ].join('\n');
  assert.deepEqual(hooks.addedLines(diff), [{ file: 'x y.md', text: 'hello' }, { file: 'x y.md', text: 'world' }]);
});

test('checkStaged blocks edits/deletes in docs/ba/nguon but allows new originals', () => {
  const e = hooks.checkStaged([
    { status: 'M', path: 'docs/ba/nguon/a.docx' },
    { status: 'D', path: 'docs/ba/nguon/b.docx' },
    { status: 'A', path: 'docs/ba/nguon/c.docx' },
  ], []);
  assert.equal(e.length, 2);
  assert.match(e[0], /a\.docx/);
  assert.match(e[1], /b\.docx/);
});

test('checkStaged blocks adding .env but allows deleting it and committing examples', () => {
  assert.equal(hooks.checkStaged([{ status: 'A', path: 'core/.env' }], []).length, 1);
  assert.deepEqual(hooks.checkStaged([{ status: 'D', path: 'core/.env' }, { status: 'M', path: 'core/.env.example' }], []), []);
});

test('checkStaged flags each secret kind once per file and never echoes the secret', () => {
  const added = Object.values(FAKE).map((s) => ({ file: 'src/a.js', text: `const x = "${s}";` }));
  added.push({ file: 'src/a.js', text: FAKE.github });
  const e = hooks.checkStaged([], added);
  assert.equal(e.length, Object.keys(FAKE).length);
  for (const s of Object.values(FAKE)) assert.ok(!e.join('\n').includes(s), 'secret leaked into message');
  assert.deepEqual(hooks.checkStaged([], [{ file: 'a.md', text: 'token GitHub bắt đầu bằng ghp_' }]), []);
});

test('checkPush blocks updating main, allows other branches and deleting main', () => {
  const sha = 'a'.repeat(40);
  const zero = '0'.repeat(40);
  assert.equal(hooks.checkPush(`refs/heads/x ${sha} refs/heads/main ${sha}\n`).length, 1);
  assert.deepEqual(hooks.checkPush(`refs/heads/x ${sha} refs/heads/feat/a ${zero}\n`), []);
  assert.deepEqual(hooks.checkPush(`(delete) ${zero} refs/heads/main ${sha}\n`), []);
  assert.deepEqual(hooks.checkPush(''), []);
});

function repoWithHooks() {
  const r = makeGitRepo();
  r.write('README.md', 'x\n');
  r.write('docs/ba/nguon/Bản gốc.docx', 'v1');
  r.commitAll('init');
  r.git('config', 'core.hooksPath', HOOKS);
  return r;
}

test('pre-commit hook: real commit of a .env file is blocked', () => {
  const r = repoWithHooks();
  r.write('core/.env', 'X=1\n');
  r.git('add', 'core/.env');
  const c = r.tryGit('commit', '-m', 'env');
  assert.notEqual(c.status, 0);
  assert.match(c.stderr, /core\/\.env/);
});

test('pre-commit hook: real commit editing a Vietnamese-named original is blocked', () => {
  const r = repoWithHooks();
  r.write('docs/ba/nguon/Bản gốc.docx', 'v2');
  r.git('add', 'docs/ba/nguon/Bản gốc.docx');
  const c = r.tryGit('commit', '-m', 'edit original');
  assert.notEqual(c.status, 0);
  assert.match(c.stderr, /Bản gốc\.docx/);
});

test('pre-commit hook: a normal commit passes', () => {
  const r = repoWithHooks();
  r.write('src/a.js', 'ok\n');
  r.git('add', 'src/a.js');
  assert.equal(r.tryGit('commit', '-m', 'ok').status, 0);
});

test('pre-push hook: main is blocked; other branches pass with a warning when origin/staging is missing', () => {
  const r = repoWithHooks();
  const sha = r.git('rev-parse', 'HEAD').trim();
  const run = (input) => spawnSync(process.execPath, [path.join(HOOKS, 'pre-push'), 'origin', 'x'], { cwd: r.dir, input, encoding: 'utf8' });
  assert.equal(run(`refs/heads/staging ${sha} refs/heads/main ${sha}\n`).status, 1);
  const ok = run(`refs/heads/f ${sha} refs/heads/f ${'0'.repeat(40)}\n`);
  assert.equal(ok.status, 0);
  assert.match(ok.stderr, /origin\/staging/);
});

test('hook scripts are executable', () => {
  for (const h of ['pre-commit', 'pre-push']) assert.ok(fs.statSync(path.join(HOOKS, h)).mode & 0o111, h);
});
```

- [ ] **Step 3: Chạy test để thấy đỏ**

Run: `node --test tools/tests/git-hooks.test.js`
Expected: FAIL với `Cannot find module '../git-hooks/lib'`

- [ ] **Step 4: Viết `tools/git-hooks/lib.js`**

```js
'use strict';
// Luật thuần của git hook (tầng 0 AI kit). Script pre-commit/pre-push chỉ gọi git rồi gọi các hàm này.
const path = require('node:path');

const SECRET_PATTERNS = [
  { name: 'token GitHub', re: /\bgh[pousr]_[A-Za-z0-9]{36,}/ },
  { name: 'token GitHub fine-grained', re: /\bgithub_pat_[A-Za-z0-9_]{40,}/ },
  { name: 'private key', re: /-----BEGIN [A-Z ]*PRIVATE KEY-----/ },
  { name: 'AWS access key', re: /\bAKIA[0-9A-Z]{16}\b/ },
  { name: 'token Slack', re: /\bxox[abprs]-[A-Za-z0-9-]{10,}/ },
  { name: 'webhook Discord/Slack', re: /https:\/\/(?:(?:canary\.|ptb\.)?discord(?:app)?\.com\/api\/webhooks|hooks\.slack\.com\/services)\/\S+/ },
];

function isEnvFile(p) {
  const b = path.posix.basename(p);
  if (b.endsWith('.example')) return false;
  return b === '.env' || b.startsWith('.env.') || b.endsWith('.env');
}

// Output của `git diff --name-status --no-renames`: "M\tpath".
function parseNameStatus(text) {
  return text.split('\n').filter(Boolean).map((l) => ({ status: l[0], path: l.slice(l.indexOf('\t') + 1) }));
}

// Dòng thêm mới trong unified diff. Git thêm tab cuối dòng "+++ b/…" khi tên file có dấu cách.
function addedLines(diff) {
  const out = [];
  let file = null;
  for (const l of diff.split('\n')) {
    if (l.startsWith('+++ ')) {
      file = l.startsWith('+++ /dev/null') ? null : l.slice(4).replace(/\t$/, '').replace(/^b\//, '');
      continue;
    }
    if (file && l.startsWith('+')) out.push({ file, text: l.slice(1) });
  }
  return out;
}

function checkStaged(entries, added) {
  const e = [];
  for (const { status, path: p } of entries) {
    if (p.startsWith('docs/ba/nguon/') && status !== 'A') {
      e.push(`${p}: docs/ba/nguon/ là bản gốc của stakeholder, chỉ đọc — không sửa/xoá (AGENTS.md §5)`);
    }
    if (isEnvFile(p) && status !== 'D') e.push(`${p}: không commit file .env — chỉ commit *.env.example (AGENTS.md §5)`);
  }
  const seen = new Set();
  for (const { file, text } of added) {
    for (const { name, re } of SECRET_PATTERNS) {
      const key = `${file}\n${name}`;
      if (seen.has(key) || !re.test(text)) continue;
      seen.add(key);
      e.push(`${file}: có dòng giống ${name} — xoá secret khỏi file (nội dung không in ra đây)`);
    }
  }
  return e;
}

// stdin của pre-push: "<local ref> <local sha> <remote ref> <remote sha>" mỗi dòng. sha toàn 0 = xoá nhánh.
function checkPush(stdin) {
  const hitsMain = stdin.split('\n').filter(Boolean).map((l) => l.split(' '))
    .some(([, localSha, remoteRef]) => remoteRef === 'refs/heads/main' && !/^0+$/.test(localSha));
  return hitsMain ? ['không push thẳng lên main — mở PR vào staging, rồi PR staging → main (AGENTS.md §5)'] : [];
}

module.exports = { SECRET_PATTERNS, isEnvFile, parseNameStatus, addedLines, checkStaged, checkPush };
```

- [ ] **Step 5: Viết hai script hook**

`tools/git-hooks/pre-commit`:

```js
#!/usr/bin/env node
'use strict';
// Cài: npm run hooks:install. Luật và test: tools/git-hooks/lib.js, tools/tests/git-hooks.test.js.
const { execFileSync } = require('node:child_process');
const { parseNameStatus, addedLines, checkStaged } = require('./lib');

const git = (...a) => execFileSync('git', ['-c', 'core.quotepath=off', ...a], { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });
const entries = parseNameStatus(git('diff', '--cached', '--name-status', '--no-renames'));
const added = addedLines(git('diff', '--cached', '-U0', '--no-color', '--no-ext-diff', '--no-renames'));
const errors = checkStaged(entries, added);
if (errors.length) {
  for (const e of errors) console.error(`✗ ${e}`);
  console.error('\nCommit bị chặn bởi tools/git-hooks/pre-commit (xem docs/dev/ai-kit.md).');
  process.exit(1);
}
```

`tools/git-hooks/pre-push`:

```js
#!/usr/bin/env node
'use strict';
// Cài: npm run hooks:install. Chặn push lên main; chạy docs:check so với origin/staging nếu có ref đó.
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync, spawnSync } = require('node:child_process');
const { checkPush } = require('./lib');

const errors = checkPush(fs.readFileSync(0, 'utf8'));
if (errors.length) {
  for (const e of errors) console.error(`✗ ${e}`);
  process.exit(1);
}
try {
  execFileSync('git', ['rev-parse', '--verify', '--quiet', 'origin/staging'], { stdio: 'ignore' });
} catch {
  console.error('pre-push: chưa có origin/staging — bỏ qua docs:check (chạy: git fetch origin staging)');
  process.exit(0);
}
const r = spawnSync(process.execPath, [path.join(__dirname, '..', 'docs-check', 'cli.js'), 'check', '--base', 'origin/staging'], { stdio: 'inherit' });
if (r.status !== 0) console.error('\nPush bị chặn: docs:check đỏ (xem docs/dev/ai-kit.md).');
process.exit(r.status ?? 1);
```

Run:
```bash
chmod +x tools/git-hooks/pre-commit tools/git-hooks/pre-push
```

- [ ] **Step 6: Thêm script `hooks:install` vào `package.json` gốc**

```json
{
  "name": "ultimate-tckt-tooling",
  "private": true,
  "engines": { "node": ">=22 <23" },
  "scripts": {
    "test:tools": "node --test tools/tests/*.test.js",
    "docs:check": "node tools/docs-check/cli.js check",
    "docs:index": "node tools/docs-check/cli.js index",
    "hooks:install": "git config core.hooksPath tools/git-hooks"
  }
}
```

- [ ] **Step 7: Chạy test để thấy xanh**

Run: `node --test tools/tests/git-hooks.test.js`
Expected: PASS toàn bộ (11 test)

- [ ] **Step 8: Viết `docs/dev/ai-kit.md` (mới)**

~~~markdown
---
doc_id: DEV-AIKIT-001
title: AI kit cho dev — baseline cho agent
version: 1.0
status: active
audience: [dev, ai]
owner: DYC
updated: <ngày làm>
related_code: [tools/git-hooks/**]
---

# AI kit cho dev — baseline cho agent

Tài liệu này giúp dev và AI agent (Claude Code, Antigravity, Codex, Cursor…) dùng đúng bộ công cụ chung của repo:
biết file sắp sửa thuộc module nào, phải đọc tài liệu nào, và không quên cập nhật tài liệu. Luật gốc vẫn là
`AGENTS.md`; kit chỉ giúp làm đúng luật đó. Thiết kế: `docs/specs/2026-09-26-ai-kit-repobot-design.md`,
quyết định: ADR-0013.

## Các tầng

| Tầng | Gồm | Ai được hưởng |
|---|---|---|
| 0 | `AGENTS.md`, git hook, CI | Mọi người, mọi agent |
| 1 | Lệnh `npm run ai:context`, `npm run ai:docs-todo` | Mọi agent chạy được lệnh shell |
| 2 | Skill `tckt-start`, `tckt-docs`, `tckt-explain` | Agent đọc được `SKILL.md` |
| 3 | Hook `PreToolUse`/`Stop` và subagent `bat-bien-reviewer` | Chỉ Claude Code |

Tầng trên hỏng hoặc agent không hỗ trợ thì tầng dưới vẫn chạy. CI (`.github/workflows/docs.yml`) là chốt cuối.

## Tầng 0 — git hook

Cài một lần sau khi clone (repo gốc không có dependency nên không dùng `npm install`/`prepare`):

```bash
npm run hooks:install
```

Lệnh này đặt `core.hooksPath` trỏ vào `tools/git-hooks/`. Gỡ: `git config --unset core.hooksPath`.

- `pre-commit` chặn:
  - Sửa hoặc xoá file đã có trong `docs/ba/nguon/**`. Thêm bản gốc mới thì được.
  - File `.env` (trừ `*.example`).
  - Dòng thêm vào khớp mẫu secret: token GitHub, private key, AWS key, token Slack, webhook Discord/Slack.

  Hook không in nội dung dòng bị nghi, để secret không lọt ra log.
- `pre-push` chặn push lên `main`, rồi chạy `docs:check --base origin/staging`. Nếu máy chưa có `origin/staging`,
  hook bỏ qua bước này kèm cảnh báo; chạy `git fetch origin staging` để có ref.
- Bị chặn nhầm (vd. chuỗi mẫu trong test): sửa để chuỗi không khớp mẫu, bằng cách ghép chuỗi lúc chạy. Chỉ dùng
  `--no-verify` khi chắc chắn, và ghi lý do trong PR.
- Luật nằm ở `tools/git-hooks/lib.js`, test ở `tools/tests/git-hooks.test.js`. Mọi lệnh git trong hook dùng
  `-c core.quotepath=off` để nhận đúng tên file tiếng Việt.

## Lịch sử phiên bản

| Version | Ngày | Thay đổi | Người |
|---|---|---|---|
| 1.0 | <ngày làm> | Bản đầu: các tầng của kit, git hook, lệnh `ai:*`, skill `tckt-*`, hook Claude Code | DYC |
~~~

- [ ] **Step 9: Cập nhật tài liệu có sẵn (mỗi tài liệu tăng version một lần)**

`docs/ai/kiem-tra.md`:
- Đặt `version: 1.4` và `updated: <ngày làm>`.
- Thêm dòng lịch sử `| 1.4 | <ngày làm> | Git hook của AI kit và lệnh ai:docs-todo | DYC |`.
- Thêm mục mới ngay trước `## Chạy local (khi cần MySQL/Postgres)`:

```markdown
## Git hook và AI kit

Sau khi clone, chạy `npm run hooks:install` một lần. `pre-commit` chặn file `docs/ba/nguon/**` đã có, file `.env`
và chuỗi giống secret; `pre-push` chặn push `main` và chạy `docs:check --base origin/staging`. Chi tiết và cách xử
lý khi bị chặn nhầm: `docs/dev/ai-kit.md`.
```

`docs/dev/test.md`:
- Đặt `version: 1.4` và `updated: <ngày làm>`.
- Thêm dòng lịch sử `| 1.4 | <ngày làm> | Test của AI kit (git hook, ai-kit, skill, hook Claude Code) và helper repo git tạm | DYC |`.
- Trong mục `## Test hạ tầng và tooling — tools/tests/`, thêm đoạn này ngay trước khối lệnh `npm run test:tools`:

```markdown
Test của AI kit: `tools/tests/git-hooks.test.js` (luật hook + hook chạy trên repo git thật). Test cần repo git tạm
dùng `tools/tests/helpers/git-repo.js` (`makeGitRepo` — tắt hook toàn cục của máy, `realpath` sẵn). Chuỗi giống
secret trong test phải ghép lúc chạy để không bị `pre-commit` chặn.
```

`docs/onboarding/ngay-1.md`:
- Đặt `version: 1.2` và `updated: <ngày làm>`.
- Thêm dòng lịch sử `| 1.2 | <ngày làm> | Cài git hook của AI kit sau khi clone | DYC |`.
- Trong mục 2, sửa khối lệnh thành:

```bash
git clone https://github.com/tduong-p/ultimate-tckt.git
cd ultimate-tckt
npm run hooks:install   # git hook của AI kit — xem docs/dev/ai-kit.md
```

`docs/ai/bay-da-gap.md`:
- Đặt `version: 1.2` và `updated: <ngày làm>`.
- Thêm dòng lịch sử `| 1.2 | <ngày làm> | Git quote tên file tiếng Việt | DYC |`.
- Thêm bullet này vào cuối danh sách, ngay trước `## Lịch sử phiên bản`:

```markdown
- **Git quote tên file tiếng Việt.** Mặc định (`core.quotepath=true`) `git diff --name-only`/`--name-status`
  in `docs/ba/nguon/Bản gốc.docx` thành `"docs/ba/nguon/B\341\272\243n g\341\273\221c.docx"`, nên mọi so khớp theo
  tiền tố/glob trượt mà không báo lỗi. Code gọi git (hook, `tools/ai-kit/`) luôn thêm `-c core.quotepath=off`; tên
  có dấu cách còn bị git thêm tab cuối dòng `+++ b/…` trong diff. Phát hiện khi thiết kế AI kit (2026-09-26).
```

- [ ] **Step 10: Kiểm tra toàn bộ**

```bash
npm run test:tools
npm run docs:index && npm run docs:check -- --base origin/staging
```
Expected: cả hai xanh.

- [ ] **Step 11: Commit (đánh dấu thực thi trong index của git)**

```bash
git add tools/git-hooks tools/tests/git-hooks.test.js tools/tests/helpers/git-repo.js package.json docs/
git update-index --chmod=+x tools/git-hooks/pre-commit tools/git-hooks/pre-push
git ls-files -s tools/git-hooks/pre-commit   # phải bắt đầu bằng 100755
git commit -m "feat(tools): git hooks blocking originals, .env, secrets and pushes to main"
npm run hooks:install
```

---

### Task 2: Tách loader của docs-check, thêm `impactedDocs`

**Files:**
- Create: `tools/docs-check/load.js`
- Modify: `tools/docs-check/cli.js` (bỏ `ROOT`-bound `walk`/`loadDocs`/`GENERATED`/`isSource`, dùng `load.js`)
- Modify: `tools/docs-check/rules.js:56-70` (thêm `impactedDocs`, viết lại `docsImpact`), `:88` (export)
- Test: `tools/tests/docs-check.test.js`

**Interfaces:**
- Produces:
  - `require('../docs-check/load')` export:
    - `GENERATED: Set<string>`
    - `isSource(p): boolean`
    - `walk(root, dir): string[]`
    - `loadDocs(root): {path, text, data, body}[]`

    `walk` trả `[]` khi thư mục không tồn tại. `loadDocs` bỏ `docs/README.md`/`docs/CHANGELOG.md` nhưng vẫn giữ file `docs/ba/nguon/*.md` (`data: null`).
  - `rules.impactedDocs(changedFiles, docs)` trả `{doc_id, path, files: string[], updated: boolean}[]`.
    - Bỏ qua file dưới `docs/` và tài liệu ADR.
    - Thứ tự kết quả theo lần đầu gặp tài liệu.

- [ ] **Step 1: Viết test (đỏ)**

Thêm vào đầu `tools/tests/docs-check.test.js`, sau các dòng `require` có sẵn:

```js
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { loadDocs, walk } = require('../docs-check/load');
```

Thêm vào cuối file:

```js
test('loadDocs reads docs/**/*.md except generated index files; walk tolerates missing dirs', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'docs-load-'));
  const w = (p, s) => { fs.mkdirSync(path.dirname(path.join(root, p)), { recursive: true }); fs.writeFileSync(path.join(root, p), s); };
  w('docs/dev/a.md', doc());
  w('docs/README.md', '# idx\n');
  w('docs/CHANGELOG.md', '# c\n');
  w('docs/ba/nguon/x.md', 'raw\n');
  w('docs/dev/img.png', '');
  const docs = loadDocs(root);
  assert.deepEqual(docs.map((d) => d.path).sort(), ['docs/ba/nguon/x.md', 'docs/dev/a.md']);
  assert.equal(docs.find((d) => d.path === 'docs/dev/a.md').data.doc_id, 'DEV-ARCH-001');
  assert.equal(docs.find((d) => d.path === 'docs/ba/nguon/x.md').data, null);
  assert.deepEqual(walk(root, 'nope'), []);
});

test('impactedDocs groups changed files per doc, skips ADRs, marks docs updated in the same change', () => {
  const docs = [
    { path: 'docs/dev/rbac.md', data: { doc_id: 'DEV-RBAC-001', related_code: ['core/src/policies/**'] } },
    { path: 'docs/adr/0012-x.md', data: { doc_id: 'ADR-0012-001', related_code: ['core/**'] } },
  ];
  assert.deepEqual(rules.impactedDocs(['core/src/policies/a.js', 'core/src/policies/b.js'], docs), [
    { doc_id: 'DEV-RBAC-001', path: 'docs/dev/rbac.md', files: ['core/src/policies/a.js', 'core/src/policies/b.js'], updated: false },
  ]);
  assert.equal(rules.impactedDocs(['core/src/policies/a.js', 'docs/dev/rbac.md'], docs)[0].updated, true);
  assert.deepEqual(rules.impactedDocs(['docs/dev/other.md'], docs), []);
});
```

- [ ] **Step 2: Chạy test để thấy đỏ**

Run: `node --test tools/tests/docs-check.test.js`
Expected: FAIL với `Cannot find module '../docs-check/load'`

- [ ] **Step 3: Viết `tools/docs-check/load.js`**

```js
'use strict';
// Đọc tài liệu trong docs/ — dùng chung cho docs-check và ai-kit.
const fs = require('node:fs');
const path = require('node:path');
const { parse } = require('./frontmatter');

const GENERATED = new Set(['docs/README.md', 'docs/CHANGELOG.md']);
const isSource = (p) => p.startsWith('docs/ba/nguon/');

function walk(root, dir) {
  const abs = path.join(root, dir);
  if (!fs.existsSync(abs)) return [];
  return fs.readdirSync(abs, { withFileTypes: true }).flatMap((e) => {
    const rel = `${dir}/${e.name}`;
    return e.isDirectory() ? walk(root, rel) : (e.name.endsWith('.md') ? [rel] : []);
  });
}

function loadDocs(root) {
  return walk(root, 'docs').filter((p) => !GENERATED.has(p)).map((p) => {
    const text = fs.readFileSync(path.join(root, p), 'utf8');
    return { path: p, text, ...parse(text) };
  });
}

module.exports = { GENERATED, isSource, walk, loadDocs };
```

- [ ] **Step 4: Cho `cli.js` dùng `load.js`**

Trong `tools/docs-check/cli.js`:
- Xoá dòng `const { parse } = require('./frontmatter');`.
- Xoá các định nghĩa `GENERATED`, `isSource`, `walk`, `loadDocs`, từ dòng `const GENERATED = …` đến hết hàm `loadDocs`.
- Thêm vào ngay sau dòng `const ROOT = …`:

```js
const load = require('./load');
const { GENERATED, isSource } = load;
const walk = (dir) => load.walk(ROOT, dir);
const loadDocs = () => load.loadDocs(ROOT);
```

Phần còn lại của `cli.js` giữ nguyên.

- [ ] **Step 5: Thêm `impactedDocs`, viết lại `docsImpact` trong `rules.js`**

Thay toàn bộ hàm `docsImpact` bằng:

```js
// Tài liệu có related_code khớp file code đã đổi. ADR bất biến: thay bằng ADR mới, không sửa.
function impactedDocs(changedFiles, docs) {
  const changed = new Set(changedFiles);
  const hits = new Map();
  for (const f of changedFiles) {
    if (f.startsWith('docs/')) continue;
    for (const d of docs) {
      if (d.path.startsWith('docs/adr/')) continue;
      const globs = [].concat(d.data.related_code || []);
      if (!globs.some((g) => globToRegExp(g).test(f))) continue;
      if (!hits.has(d.path)) hits.set(d.path, { doc_id: d.data.doc_id, path: d.path, files: [], updated: changed.has(d.path) });
      const h = hits.get(d.path);
      if (!h.files.includes(f)) h.files.push(f);
    }
  }
  return [...hits.values()];
}

function docsImpact(changedFiles, docs) {
  return impactedDocs(changedFiles, docs).filter((h) => !h.updated)
    .flatMap((h) => h.files.map((f) => `${f} changed but ${h.doc_id} (${h.path}) was not updated`));
}
```

Sửa dòng export:

```js
module.exports = { validate, compareVersions, bodyChanged, checkBump, globToRegExp, impactedDocs, docsImpact, brokenLinks };
```

- [ ] **Step 6: Chạy test và kiểm tra hồi quy**

```bash
node --test tools/tests/docs-check.test.js
npm run docs:index && npm run docs:check -- --base origin/staging
```
Expected:
- Test PASS, gồm cả test `docsImpact` cũ.
- `docs:index` không làm đổi `docs/README.md` (`git diff --stat docs/README.md` rỗng).
- `docs:check` xanh.

- [ ] **Step 7: Commit**

`docs/ai/kiem-tra.md` và `docs/dev/test.md` đã tăng version ở Task 1, nên task này không cần tăng lại. Nhánh đã cập nhật hai tài liệu có `related_code` khớp `tools/**`.

```bash
git add tools/docs-check tools/tests/docs-check.test.js
git commit -m "refactor(docs-check): shared doc loader and impactedDocs for ai-kit"
```

---

### Task 3: Tầng 1 — bảng module và `npm run ai:context`

**Files:**
- Create: `tools/ai-kit/modules.json`, `tools/ai-kit/lib.js`, `tools/ai-kit/repo.js`, `tools/ai-kit/cli.js`
- Create: `tools/tests/ai-kit.test.js`
- Modify: `package.json` (script `ai:context`)
- Modify: `docs/dev/ai-kit.md` (mục Tầng 1 + `related_code`), `docs/dev/ranh-gioi-module.md` (1.0 → 1.1), `docs/ai/tim-o-dau.md` (1.1 → 1.2)

**Interfaces:**
- Consumes: `rules.globToRegExp`, `load.loadDocs(root)` (Task 2).
- Produces:
  - `modules.json` có dạng `{ modules: {name, contract?, globs[]}[], contracts: {label, globs[]}[] }`. Module khớp trước thì thắng.
  - `lib.classify(file, map)` trả `{file, module: string|null, contracts: string[]}`.
  - `lib.relatedDocs(file, docs)` trả `{doc_id, path, title, invariant: boolean}[]`.
  - `lib.context(files, {map, docs})` trả `{items: {file, module, contracts, docs}[], modules: string[], verdict: 'lam-luon'|'raise', reasons: string[]}`.
  - `lib.formatContext(ctx)` trả `string`.
  - `repo.ROOT`
  - `repo.loadMap()`
  - `repo.toRepoPath(file, {root, cwd})` trả `string|null` (`null` khi file nằm ngoài repo).
  - `repo.gatherContext(files, {root, cwd})` trả `ctx`.

- [ ] **Step 1: Viết `tools/ai-kit/modules.json`**

```json
{
  "modules": [
    {
      "name": "Email & Cron",
      "globs": [
        "core/src/services/email-events.js", "core/src/services/email-condition-evaluator.js",
        "core/src/services/email-settings.js", "core/src/services/cron-runner.js",
        "core/src/routes/settings-email.js", "core/src/routes/settings-cron.js", "core/public/settings.js",
        "core/tests/routes.settings-*", "core/tests/services.cron-runner.test.js", "core/tests/services.email-*"
      ]
    },
    {
      "name": "Nền",
      "contract": "Nền: auth, session, đơn vị, membership, role, cấu hình (toàn bộ module Nền)",
      "globs": [
        "core/src/units/**", "core/src/middleware/**", "core/src/settings/**", "core/src/config/**", "core/src/auth/**",
        "core/src/services/audit.js", "core/src/routes/units.js", "core/src/routes/platform.js",
        "core/src/routes/index.js", "core/src/routes/utils.js", "core/src/routes/system.js",
        "core/src/app.js", "core/src/runtime.js", "core/src/server.js", "core/src/logger.js", "core/db.sql",
        "core/app.js", "core/package.json", "core/package-lock.json", "core/Dockerfile", "core/.dockerignore",
        "core/.gitignore", "core/.env.example",
        "core/tests/units.*", "core/tests/migrate*", "core/tests/settings*", "core/tests/system.health.test.js",
        "core/tests/helpers/**", "core/tests/helpers.fixtures.test.js"
      ]
    },
    {
      "name": "Điều hành",
      "globs": [
        "core/src/routes/activities.js", "core/src/routes/tasks.js", "core/src/routes/teams.js",
        "core/src/routes/documents.js", "core/src/routes/reports.js", "core/src/routes/users.js",
        "core/src/routes/notifications.js", "core/src/policies/**", "core/src/services/task-attachments.js",
        "core/src/services/deadline-notifications.js", "core/src/push.js", "core/public/**", "core/tests/**"
      ]
    },
    { "name": "CTD", "globs": ["services/ctd-api/**"] },
    { "name": "Web", "globs": ["web/**"] },
    { "name": "Hạ tầng & CI", "contract": "Hạ tầng & CI (compose, nginx, script VM, workflow)", "globs": ["infra/**", ".github/**"] },
    {
      "name": "Tài liệu & tooling",
      "globs": [
        "docs/**", "tools/**", "AGENTS.md", "CLAUDE.md", "GEMINI.md", "README.md", ".gitignore", "package.json",
        ".agents/**", ".claude/**", ".kiro/**"
      ]
    }
  ],
  "contracts": [
    { "label": "Schema DB và migration", "globs": ["core/db.sql", "core/src/config/migrate*.js", "services/ctd-api/backend/alembic/**"] },
    {
      "label": "Biến môi trường (.env.example)",
      "globs": ["core/.env.example", "infra/.env.example", "services/ctd-api/.env.example", "services/ctd-api/backend/.env.example"]
    },
    {
      "label": "Dependency dùng chung (khi thêm thư viện hoặc nâng major)",
      "globs": ["package.json", "core/package.json", "core/package-lock.json", "services/ctd-api/backend/pyproject.toml"]
    },
    { "label": "Test helper dùng chung", "globs": ["core/tests/helpers/**"] },
    { "label": "Bất biến, ADR, luật AGENTS.md", "globs": ["docs/ai/bat-bien.md", "docs/adr/**", "AGENTS.md", "CLAUDE.md", "GEMINI.md"] },
    {
      "label": "Luật và tooling dùng chung (docs-check, AI kit, skill, hook)",
      "globs": ["tools/docs-check/**", "tools/docs-export/**", "tools/ai-kit/**", "tools/git-hooks/**", ".agents/**", ".claude/settings.json"]
    }
  ]
}
```

- [ ] **Step 2: Viết test (đỏ)**

`tools/tests/ai-kit.test.js`:

```js
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const { execFileSync, spawnSync } = require('node:child_process');
const kit = require('../ai-kit/lib');
const repo = require('../ai-kit/repo');
const { globToRegExp } = require('../docs-check/rules');

const ROOT = path.join(__dirname, '..', '..');
const CLI = path.join(ROOT, 'tools/ai-kit/cli.js');
const MAP = repo.loadMap();

test('modules.json: every glob matches a real file (except planned web/**) and uses no braces', () => {
  const files = execFileSync('git', ['-c', 'core.quotepath=off', 'ls-files', '--cached', '--others', '--exclude-standard'], { cwd: ROOT, encoding: 'utf8' })
    .split('\n').filter(Boolean);
  const globs = [...MAP.modules.flatMap((m) => m.globs), ...MAP.contracts.flatMap((c) => c.globs)];
  for (const g of globs) {
    assert.ok(!/[{}]/.test(g), `${g}: globToRegExp không hỗ trợ {a,b} — liệt kê từng file`);
    if (g === 'web/**') continue;
    const re = globToRegExp(g);
    assert.ok(files.some((f) => re.test(f)), `${g} không khớp file nào`);
  }
});

test('classify: first matching module wins, contracts are collected', () => {
  const c = (f) => kit.classify(f, MAP);
  assert.deepEqual(c('core/src/routes/tasks.js'), { file: 'core/src/routes/tasks.js', module: 'Điều hành', contracts: [] });
  assert.equal(c('core/public/settings.js').module, 'Email & Cron');
  assert.equal(c('core/public/app.js').module, 'Điều hành');
  assert.equal(c('core/tests/units.leak.test.js').module, 'Nền');
  assert.equal(c('core/tests/services.email-events.test.js').module, 'Email & Cron');
  assert.equal(c('core/tests/tasks.review.test.js').module, 'Điều hành');
  assert.match(c('core/src/middleware/auth.js').contracts.join(), /Nền/);
  assert.equal(c('services/ctd-api/backend/alembic/versions/0001_x.py').module, 'CTD');
  assert.match(c('services/ctd-api/backend/alembic/versions/0001_x.py').contracts.join(), /Schema/);
  assert.match(c('core/tests/helpers/db.js').contracts.join(), /Test helper/);
  assert.equal(c('docs/dev/test.md').module, 'Tài liệu & tooling');
  assert.deepEqual(c('docs/dev/test.md').contracts, []);
  assert.match(c('docs/ai/bat-bien.md').contracts.join(), /Bất biến/);
  assert.equal(c('lung-tung.txt').module, null);
});

const DOCS = [
  { path: 'docs/ai/bat-bien.md', data: { doc_id: 'AI-INV-001', title: 'Bất biến', related_code: ['core/src/policies/**'] } },
  { path: 'docs/dev/rbac.md', data: { doc_id: 'DEV-RBAC-001', title: 'RBAC', related_code: ['core/src/policies/**'] } },
  { path: 'docs/ba/nguon/x.md', data: null },
];

test('context: one module (docs files do not count) without contract → làm luôn, lists docs and invariants', () => {
  const ctx = kit.context(['core/src/policies/access.js', 'docs/dev/rbac.md'], { map: MAP, docs: DOCS });
  assert.equal(ctx.verdict, 'lam-luon');
  assert.deepEqual(ctx.modules, ['Điều hành']);
  assert.deepEqual(ctx.items[0].docs.map((d) => [d.doc_id, d.invariant]), [['AI-INV-001', true], ['DEV-RBAC-001', false]]);
  const text = kit.formatContext(ctx);
  assert.match(text, /bất biến: đọc docs\/ai\/bat-bien\.md/);
  assert.match(text, /DEV-RBAC-001 docs\/dev\/rbac\.md/);
  assert.match(text, /Kết luận: làm luôn/);
});

test('context: two modules, a shared contract, or an unknown file → raise with reasons', () => {
  const two = kit.context(['core/src/routes/tasks.js', 'services/ctd-api/backend/app/main.py'], { map: MAP, docs: [] });
  assert.equal(two.verdict, 'raise');
  assert.match(two.reasons.join('\n'), /2 module/);
  const schema = kit.context(['core/db.sql'], { map: MAP, docs: [] });
  assert.equal(schema.verdict, 'raise');
  assert.match(schema.reasons.join('\n'), /Schema/);
  assert.match(kit.formatContext(schema), /PHẢI RAISE/);
  const unknown = kit.context(['lung-tung.txt'], { map: MAP, docs: [] });
  assert.equal(unknown.verdict, 'raise');
  assert.match(unknown.reasons.join('\n'), /không thuộc module nào/);
});

test('toRepoPath: relative to cwd, absolute, and outside the repo', () => {
  assert.equal(repo.toRepoPath('src/app.js', { root: ROOT, cwd: path.join(ROOT, 'core') }), 'core/src/app.js');
  assert.equal(repo.toRepoPath(path.join(ROOT, 'core/db.sql'), { root: ROOT, cwd: '/' }), 'core/db.sql');
  assert.equal(repo.toRepoPath('/etc/hosts', { root: ROOT, cwd: ROOT }), null);
});

test('ai:context CLI: caller directory via INIT_CWD, absolute paths, --json, usage error', () => {
  const run = (args, cwd) => spawnSync(process.execPath, [CLI, 'context', ...args], { cwd, encoding: 'utf8', env: { ...process.env, INIT_CWD: cwd } });
  const a = run(['src/routes/tasks.js'], path.join(ROOT, 'core'));
  assert.equal(a.status, 0, a.stderr);
  assert.match(a.stdout, /core\/src\/routes\/tasks\.js/);
  assert.match(a.stdout, /Điều hành/);
  const b = run([path.join(ROOT, 'core/db.sql'), '--json'], ROOT);
  const j = JSON.parse(b.stdout);
  assert.equal(j.verdict, 'raise');
  assert.equal(j.items[0].file, 'core/db.sql');
  assert.equal(run([], ROOT).status, 2);
});
```

- [ ] **Step 3: Chạy test để thấy đỏ**

Run: `node --test tools/tests/ai-kit.test.js`
Expected: FAIL với `Cannot find module '../ai-kit/lib'`

- [ ] **Step 4: Viết `tools/ai-kit/lib.js`**

```js
'use strict';
// Logic thuần của AI kit (tầng 1). IO nằm ở repo.js; test: tools/tests/ai-kit.test.js.
const { globToRegExp } = require('../docs-check/rules');

const INVARIANT_DOC = 'AI-INV-001';
const matches = (globs, f) => [].concat(globs || []).some((g) => globToRegExp(g).test(f));

function classify(file, map) {
  const mod = map.modules.find((m) => matches(m.globs, file)) || null;
  const contracts = mod && mod.contract ? [mod.contract] : [];
  for (const c of map.contracts) if (matches(c.globs, file) && !contracts.includes(c.label)) contracts.push(c.label);
  return { file, module: mod ? mod.name : null, contracts };
}

function relatedDocs(file, docs) {
  return docs.filter((d) => d.data && matches(d.data.related_code, file)).map((d) => ({
    doc_id: d.data.doc_id, path: d.path, title: d.data.title, invariant: d.data.doc_id === INVARIANT_DOC,
  }));
}

function context(files, { map, docs }) {
  const items = files.map((f) => ({ ...classify(f, map), docs: relatedDocs(f, docs) }));
  // Tài liệu đi kèm code của module nào cũng được: không tính là module thứ hai.
  const countable = items.filter((i) => !i.file.startsWith('docs/'));
  const modules = [...new Set((countable.length ? countable : items).map((i) => i.module).filter(Boolean))];
  const reasons = [];
  for (const i of items) if (!i.module) reasons.push(`${i.file}: không thuộc module nào trong tools/ai-kit/modules.json`);
  if (modules.length > 1) reasons.push(`chạm ${modules.length} module: ${modules.join(', ')}`);
  for (const i of items) for (const c of i.contracts) reasons.push(`${i.file}: hợp đồng dùng chung — ${c}`);
  return { items, modules, verdict: reasons.length ? 'raise' : 'lam-luon', reasons };
}

function formatContext(ctx) {
  const out = [];
  for (const i of ctx.items) {
    out.push(i.file, `  module: ${i.module || '(không rõ)'}`);
    if (i.contracts.length) out.push(`  hợp đồng dùng chung: ${i.contracts.join('; ')}`);
    const inv = i.docs.find((d) => d.invariant);
    if (inv) out.push(`  bất biến: đọc ${inv.path} trước khi sửa`);
    const rest = i.docs.filter((d) => !d.invariant);
    if (rest.length) out.push(`  tài liệu cần đọc: ${rest.map((d) => `${d.doc_id} ${d.path}`).join(', ')}`);
  }
  out.push('');
  if (ctx.verdict === 'raise') {
    out.push('Kết luận: PHẢI RAISE họp team trước khi code phần này (docs/dev/ranh-gioi-module.md):');
    for (const r of ctx.reasons) out.push(`  - ${r}`);
    out.push('Soạn issue theo .github/ISSUE_TEMPLATE/cross-module.md. Không chắc điều kiện của hợp đồng → vẫn raise.');
  } else {
    out.push(`Kết luận: làm luôn (một module: ${ctx.modules[0] || '—'}, không chạm hợp đồng dùng chung).`);
  }
  return out.join('\n');
}

module.exports = { classify, relatedDocs, context, formatContext };
```

- [ ] **Step 5: Viết `tools/ai-kit/repo.js`**

```js
'use strict';
// IO của AI kit: đọc git, fs, modules.json. Logic thuần ở lib.js.
const fs = require('node:fs');
const path = require('node:path');
const { loadDocs } = require('../docs-check/load');
const { context } = require('./lib');

const ROOT = path.join(__dirname, '..', '..');
const loadMap = () => JSON.parse(fs.readFileSync(path.join(__dirname, 'modules.json'), 'utf8'));

function toRepoPath(file, { root = ROOT, cwd = process.cwd() } = {}) {
  const rel = path.relative(fs.realpathSync(root), path.resolve(fs.realpathSync(cwd), file)).split(path.sep).join('/');
  return rel === '..' || rel.startsWith('../') || path.isAbsolute(rel) ? null : rel;
}

function gatherContext(files, { root = ROOT, cwd = process.cwd() } = {}) {
  const rels = files.map((f) => toRepoPath(f, { root, cwd }) ?? f);
  return context(rels, { map: loadMap(), docs: loadDocs(root).filter((d) => d.data) });
}

module.exports = { ROOT, loadMap, toRepoPath, gatherContext };
```

- [ ] **Step 6: Viết `tools/ai-kit/cli.js`**

```js
#!/usr/bin/env node
'use strict';
// npm run ai:context -- <file…> [--json]. Xem docs/dev/ai-kit.md.
const { formatContext } = require('./lib');
const repo = require('./repo');

const [cmd, ...args] = process.argv.slice(2);
// npm run đổi cwd về gốc repo; INIT_CWD là thư mục người dùng đang đứng.
const cwd = process.env.INIT_CWD || process.cwd();

if (cmd === 'context') {
  const files = args.filter((a) => a !== '--json');
  if (!files.length) {
    console.error('usage: npm run ai:context -- <file…> [--json]');
    process.exit(2);
  }
  const ctx = repo.gatherContext(files, { cwd });
  console.log(args.includes('--json') ? JSON.stringify(ctx, null, 2) : formatContext(ctx));
} else {
  console.error('usage: cli.js context <file…> [--json]');
  process.exit(2);
}
```

Thêm script vào `package.json` (sau `hooks:install`):

```json
    "ai:context": "node tools/ai-kit/cli.js context"
```

- [ ] **Step 7: Chạy test để thấy xanh**

Run: `node --test tools/tests/ai-kit.test.js`
Expected: PASS toàn bộ (6 test). Nếu test glob báo một glob "không khớp file nào", sửa glob trong `modules.json` cho đúng cây thư mục thật. Không được xoá test.

- [ ] **Step 8: Tài liệu**

`docs/dev/ai-kit.md`:
- Sửa `related_code: [tools/git-hooks/**, tools/ai-kit/**]`.
- Thêm mục mới ngay trước `## Lịch sử phiên bản`:

~~~markdown
## Tầng 1 — lệnh `ai:*`

Chạy được từ bất kỳ thư mục con nào; đường dẫn tương đối tính từ chỗ bạn đứng.

```bash
npm run ai:context -- core/src/routes/tasks.js core/db.sql
npm run ai:context -- $(git diff --name-only origin/staging...HEAD) --json
```

In ra với từng file: module (theo `tools/ai-kit/modules.json`), hợp đồng dùng chung bị chạm, bất biến liên quan
(`docs/ai/bat-bien.md` nếu khớp `related_code`), các tài liệu cần đọc. Dòng cuối là kết luận:
- **làm luôn** — mọi file (trừ file trong `docs/`) thuộc một module và không chạm hợp đồng dùng chung;
- **PHẢI RAISE** — chạm từ hai module trở lên, chạm hợp đồng, hoặc có file không thuộc module nào. Làm theo
  `docs/dev/ranh-gioi-module.md`. Hợp đồng có điều kiện (vd. "khi thêm thư viện") mà việc của bạn không thoả:
  vẫn hỏi trưởng module, ghi rõ lý do trong báo cáo.

`tools/ai-kit/modules.json` là nguồn sự thật cho glob module/hợp đồng. Module khớp trước thắng (vì vậy
`Email & Cron` đứng trước `Nền` và `Điều hành`). Chỉ dùng `*` và `**` — không hỗ trợ `{a,b}`; test
`tools/tests/ai-kit.test.js` bắt glob không khớp file nào. Đổi file này là đổi luật: raise họp team, và cập nhật
`docs/dev/ranh-gioi-module.md` cùng PR.
~~~

`docs/dev/ranh-gioi-module.md`:
- Đặt `version: 1.1` và `updated: <ngày làm>`.
- Sửa `related_code: [.github/CODEOWNERS, .github/ISSUE_TEMPLATE/**, core/src/routes/index.js, tools/ai-kit/modules.json]`.
- Thêm dòng lịch sử `| 1.1 | <ngày làm> | Bảng module máy đọc được ở tools/ai-kit/modules.json; lệnh ai:context | DYC |`.
- Thêm đoạn này ngay dưới tiêu đề `## Bảng module`, trước bảng:

```markdown
Bảng dưới là bản tóm tắt cho người đọc. Danh sách glob chính xác (máy đọc, dùng bởi `npm run ai:context`) nằm ở
`tools/ai-kit/modules.json`; hai nơi phải khớp tên module, và đổi một nơi thì sửa nơi kia trong cùng PR. Test ở
`core/tests/` đi theo module của code nó kiểm (xem `modules.json`).
```

- Thêm bullet này vào cuối danh sách `## Hợp đồng dùng chung (đổi là phải raise)`:

```markdown
- Luật và tooling dùng chung: `tools/docs-check/**`, `tools/docs-export/**`, `tools/ai-kit/**`, `tools/git-hooks/**`,
  `.agents/**`, `.claude/settings.json`, `.claude/agents/**`.
```

- Thêm bước này vào `## Quy tắc`, trước bước 1 hiện có, rồi đánh số lại:

```markdown
0. Không chắc file thuộc module nào: `npm run ai:context -- <file…>` (xem `docs/dev/ai-kit.md`).
```

`docs/ai/tim-o-dau.md`:
- Đặt `version: 1.2` và `updated: <ngày làm>`.
- Thêm dòng lịch sử `| 1.2 | <ngày làm> | Thêm mục AI kit | DYC |`.
- Thêm mục mới ngay trước `## Lịch sử phiên bản`:

```markdown
## AI kit (baseline cho agent)

| Cần gì | Xem ở đâu |
|---|---|
| Hướng dẫn kit | `docs/dev/ai-kit.md` |
| File thuộc module nào, phải đọc gì | `npm run ai:context -- <file…>`; dữ liệu ở `tools/ai-kit/modules.json` |
| Logic và CLI của kit | `tools/ai-kit/{lib,repo,cli}.js` |
| Git hook | `tools/git-hooks/{lib.js,pre-commit,pre-push}` |
```

- [ ] **Step 9: Kiểm tra toàn bộ**

```bash
npm run test:tools
npm run docs:index && npm run docs:check -- --base origin/staging
```

Thêm test mới (`ai-kit.test.js`) vào đoạn "Test của AI kit" trong `docs/dev/test.md`. Tài liệu này đã tăng version ở Task 1, chỉ sửa câu.

- [ ] **Step 10: Commit**

```bash
git add tools/ai-kit tools/tests/ai-kit.test.js package.json docs/
git commit -m "feat(tools): ai:context — module, shared contracts and docs to read per file"
```

---

### Task 4: Tầng 1 — `npm run ai:docs-todo`

**Files:**
- Modify: `tools/ai-kit/lib.js` (thêm `docsTodo`, `todoIsEmpty`, `formatTodo`, `today`)
- Modify: `tools/ai-kit/repo.js` (thêm `gatherTodo`)
- Modify: `tools/ai-kit/cli.js` (thêm lệnh `docs-todo`)
- Modify: `package.json` (script `ai:docs-todo`)
- Test: `tools/tests/ai-kit.test.js`
- Modify: `docs/dev/ai-kit.md`, `docs/ai/kiem-tra.md` (nội dung, không tăng lại)

**Interfaces:**
- Consumes:
  - `rules.impactedDocs`, `rules.checkBump`.
  - `load.GENERATED`, `load.isSource`, `load.loadDocs`.
  - `build` từ `tools/docs-check/index.js`.
  - `makeGitRepo` (Task 1).
- Produces:
  - `lib.docsTodo({changed: string[], docs, readBase: (path) => string|null, indexText: string})` trả `{mustUpdate: {doc_id, path, files}[], bumpProblems: string[], needIndex: boolean}`.
  - `lib.todoIsEmpty(todo)` trả `boolean`.
  - `lib.formatTodo(todo, today)` trả `string`.
  - `lib.today()` trả `'YYYY-MM-DD'` theo giờ máy.
  - `repo.gatherTodo({root, base = 'origin/staging'})` trả `todo`. Ném `Error` có chữ `git fetch origin staging` khi thiếu ref.

- [ ] **Step 1: Viết test (đỏ)**

Thêm vào đầu `tools/tests/ai-kit.test.js`, sau các dòng `require` có sẵn:

```js
const fm = require('../docs-check/frontmatter');
const { build } = require('../docs-check/index');
const { makeGitRepo } = require('./helpers/git-repo');

const BODY = '# X\n\nNội dung.\n\n## Lịch sử phiên bản\n\n| Version | Ngày | Thay đổi | Người |\n|---|---|---|---|\n| 1.0 | 2026-09-20 | Bản đầu | DYC |\n';
const mkText = (over = {}, body = BODY) => {
  const d = { doc_id: 'DEV-X-001', title: 'X', version: '1.0', status: 'active', audience: '[dev]', owner: 'DYC',
    updated: '2026-09-20', related_code: '[src/**]', ...over };
  return `---\n${Object.entries(d).map(([k, v]) => `${k}: ${v}`).join('\n')}\n---\n${body}`;
};
const mkDoc = (p, text) => ({ path: p, text, ...fm.parse(text) });
const indexOf = (docs) => build(docs.filter((d) => d.data)) + '\n';
```

Thêm vào cuối file:

```js
test('docsTodo: code change without doc change → must update, formatted with today', () => {
  const docs = [mkDoc('docs/dev/x.md', mkText())];
  const t = kit.docsTodo({ changed: ['src/a.js'], docs, readBase: () => null, indexText: indexOf(docs) });
  assert.deepEqual(t.mustUpdate, [{ doc_id: 'DEV-X-001', path: 'docs/dev/x.md', files: ['src/a.js'] }]);
  assert.deepEqual(t.bumpProblems, []);
  assert.equal(t.needIndex, false);
  const text = kit.formatTodo(t, '2026-09-26');
  assert.match(text, /DEV-X-001 docs\/dev\/x\.md/);
  assert.match(text, /updated: 2026-09-26/);
});

test('docsTodo: doc edited without a version bump → bump problem, not must-update', () => {
  const oldText = mkText();
  const docs = [mkDoc('docs/dev/x.md', mkText({}, BODY.replace('Nội dung.', 'Nội dung mới.')))];
  const t = kit.docsTodo({ changed: ['src/a.js', 'docs/dev/x.md'], docs, readBase: (p) => (p === 'docs/dev/x.md' ? oldText : null), indexText: indexOf(docs) });
  assert.deepEqual(t.mustUpdate, []);
  assert.match(t.bumpProblems.join('\n'), /version/);
});

test('docsTodo: stale index → needIndex; clean branch → empty', () => {
  const docs = [mkDoc('docs/dev/x.md', mkText())];
  assert.equal(kit.docsTodo({ changed: ['docs/dev/x.md'], docs, readBase: () => null, indexText: '' }).needIndex, true);
  const clean = kit.docsTodo({ changed: [], docs, readBase: () => null, indexText: indexOf(docs) });
  assert.ok(kit.todoIsEmpty(clean));
  assert.match(kit.formatTodo(clean, '2026-09-26'), /không còn việc/);
  assert.match(kit.today(), /^\d{4}-\d{2}-\d{2}$/);
});

function seededRepo() {
  const r = makeGitRepo();
  const docs = [mkDoc('docs/dev/x.md', mkText())];
  r.write('docs/dev/x.md', docs[0].text);
  r.write('docs/README.md', indexOf(docs));
  r.write('src/a.js', 'v1\n');
  r.commitAll('init');
  r.git('update-ref', 'refs/remotes/origin/staging', 'HEAD');
  r.git('checkout', '-q', '-b', 'feat/x');
  return r;
}

test('gatherTodo: committed + untracked changes (Vietnamese name with a space) against the merge base', () => {
  const r = seededRepo();
  r.write('src/a.js', 'v2\n');
  r.commitAll('c1');
  r.write('src/tài liệu.js', 'new\n');
  const t = repo.gatherTodo({ root: r.dir });
  assert.deepEqual(t.mustUpdate.map((m) => m.path), ['docs/dev/x.md']);
  assert.deepEqual(t.mustUpdate[0].files.sort(), ['src/a.js', 'src/tài liệu.js']);
  assert.equal(t.needIndex, false);
});

test('gatherTodo: deleting a doc → needIndex', () => {
  const r = seededRepo();
  r.git('rm', '-q', 'docs/dev/x.md');
  assert.equal(repo.gatherTodo({ root: r.dir }).needIndex, true);
});

test('gatherTodo and docs-todo CLI: missing base ref → clear error', () => {
  const r = makeGitRepo();
  r.write('a.txt', 'x');
  r.commitAll();
  assert.throws(() => repo.gatherTodo({ root: r.dir }), /git fetch origin staging/);
  const c = spawnSync(process.execPath, [CLI, 'docs-todo', '--base', 'refs/nope'], { cwd: ROOT, encoding: 'utf8' });
  assert.equal(c.status, 2);
  assert.match(c.stderr, /git fetch origin staging/);
});
```

- [ ] **Step 2: Chạy test để thấy đỏ**

Run: `node --test tools/tests/ai-kit.test.js`
Expected: FAIL với `kit.docsTodo is not a function`

- [ ] **Step 3: Thêm vào `tools/ai-kit/lib.js`**

Thêm `require` ở đầu file, ngay dưới dòng `require('../docs-check/rules')`. Dòng đó cũng phải đổi thành:

```js
const { globToRegExp, impactedDocs, checkBump } = require('../docs-check/rules');
const { GENERATED, isSource } = require('../docs-check/load');
const { build } = require('../docs-check/index');
```

Thêm các hàm này trước `module.exports`:

```js
function docsTodo({ changed, docs, readBase, indexText }) {
  const withData = docs.filter((d) => d.data);
  const mustUpdate = impactedDocs(changed, withData).filter((h) => !h.updated)
    .map(({ doc_id, path, files }) => ({ doc_id, path, files }));
  const byPath = new Map(docs.map((d) => [d.path, d]));
  const bumpProblems = [];
  for (const f of changed) {
    if (!f.startsWith('docs/') || !f.endsWith('.md') || GENERATED.has(f) || isSource(f)) continue;
    const cur = byPath.get(f);
    const old = cur ? readBase(f) : null;
    if (cur && old != null) bumpProblems.push(...checkBump(old, cur.text, f));
  }
  const expected = build(withData.filter((d) => !isSource(d.path))) + '\n';
  return { mustUpdate, bumpProblems, needIndex: expected !== indexText };
}

const todoIsEmpty = (t) => !t.mustUpdate.length && !t.bumpProblems.length && !t.needIndex;

function formatTodo(t, day) {
  if (todoIsEmpty(t)) return 'Tài liệu: không còn việc (docs-todo xanh).';
  const out = ['Tài liệu còn phải làm trước khi báo xong:'];
  for (const m of t.mustUpdate) {
    out.push(`- ${m.doc_id} ${m.path} — vì đã đổi: ${m.files.join(', ')}`);
    out.push(`    sửa nội dung cho khớp code, tăng version (một lần cho cả nhánh), updated: ${day}, thêm dòng vào "## Lịch sử phiên bản"`);
  }
  for (const p of t.bumpProblems) out.push(`- ${p}`);
  if (t.needIndex) out.push('- docs/README.md chưa khớp — chạy: npm run docs:index');
  return out.join('\n');
}

// Ngày theo giờ máy (không cắt chuỗi ISO UTC — xem docs/ai/bay-da-gap.md).
const today = () => new Date().toLocaleDateString('sv-SE');
```

Sửa export:

```js
module.exports = { classify, relatedDocs, context, formatContext, docsTodo, todoIsEmpty, formatTodo, today };
```

- [ ] **Step 4: Thêm `gatherTodo` vào `tools/ai-kit/repo.js`**

Thêm `require` và helper ngay dưới dòng `const ROOT = …`:

```js
const { execFileSync } = require('node:child_process');
const git = (root, ...a) => execFileSync('git', ['-c', 'core.quotepath=off', ...a], {
  cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 64 * 1024 * 1024,
});
const lines = (s) => s.split('\n').filter(Boolean);
```

Đổi dòng `const { context } = require('./lib');` thành `const { context, docsTodo } = require('./lib');`. Rồi thêm hàm này trước `module.exports`:

```js
// So với merge-base của base và HEAD — giống docs:check (base...HEAD) — cộng thay đổi chưa commit và file chưa track.
function gatherTodo({ root = ROOT, base = 'origin/staging' } = {}) {
  try {
    git(root, 'rev-parse', '--verify', '--quiet', `${base}^{commit}`);
  } catch {
    throw new Error(`không thấy ref ${base} — chạy: git fetch origin staging (hoặc truyền --base <ref>)`);
  }
  const mergeBase = git(root, 'merge-base', base, 'HEAD').trim();
  const changed = [...new Set([
    ...lines(git(root, 'diff', '--name-only', '--no-renames', mergeBase)),
    ...lines(git(root, 'ls-files', '--others', '--exclude-standard')),
  ])];
  const readBase = (p) => { try { return git(root, 'show', `${mergeBase}:${p}`); } catch { return null; } };
  const idx = path.join(root, 'docs/README.md');
  return docsTodo({ changed, docs: loadDocs(root), readBase, indexText: fs.existsSync(idx) ? fs.readFileSync(idx, 'utf8') : '' });
}
```

Sửa export:

```js
module.exports = { ROOT, loadMap, toRepoPath, gatherContext, gatherTodo };
```

- [ ] **Step 5: Thay toàn bộ `tools/ai-kit/cli.js`**

```js
#!/usr/bin/env node
'use strict';
// npm run ai:context -- <file…> [--json] | npm run ai:docs-todo [-- --base <ref>] [--strict]. Xem docs/dev/ai-kit.md.
const { formatContext, formatTodo, todoIsEmpty, today } = require('./lib');
const repo = require('./repo');

const [cmd, ...args] = process.argv.slice(2);
// npm run đổi cwd về gốc repo; INIT_CWD là thư mục người dùng đang đứng.
const cwd = process.env.INIT_CWD || process.cwd();

if (cmd === 'context') {
  const files = args.filter((a) => a !== '--json');
  if (!files.length) {
    console.error('usage: npm run ai:context -- <file…> [--json]');
    process.exit(2);
  }
  const ctx = repo.gatherContext(files, { cwd });
  console.log(args.includes('--json') ? JSON.stringify(ctx, null, 2) : formatContext(ctx));
} else if (cmd === 'docs-todo') {
  const base = args.includes('--base') ? args[args.indexOf('--base') + 1] : 'origin/staging';
  let todo;
  try {
    todo = repo.gatherTodo({ base });
  } catch (e) {
    console.error(e.message);
    process.exit(2);
  }
  console.log(formatTodo(todo, today()));
  if (args.includes('--strict') && !todoIsEmpty(todo)) process.exit(1);
} else {
  console.error('usage: cli.js context <file…> [--json] | docs-todo [--base <ref>] [--strict]');
  process.exit(2);
}
```

Thêm script vào `package.json` (sau `ai:context`):

```json
    "ai:docs-todo": "node tools/ai-kit/cli.js docs-todo"
```

- [ ] **Step 6: Chạy test để thấy xanh**

Run: `node --test tools/tests/ai-kit.test.js`
Expected: PASS toàn bộ (12 test)

Chạy thử trên nhánh thật: `npm run ai:docs-todo`. Nó phải liệt kê đúng những tài liệu mà `docs:check --base origin/staging` sẽ đòi, hoặc báo không còn việc.

- [ ] **Step 7: Tài liệu (nội dung, không tăng version lần nữa)**

Trong `docs/dev/ai-kit.md`, ở mục `## Tầng 1 — lệnh ai:*`, thêm đoạn này vào cuối mục:

~~~markdown
```bash
npm run ai:docs-todo                      # so với origin/staging
npm run ai:docs-todo -- --base origin/main --strict   # --strict: exit 1 nếu còn việc
```

So với merge-base của `origin/staging` và `HEAD`, **cộng** thay đổi chưa commit và file chưa track — tức đúng những
gì PR sẽ chứa nếu bạn commit hết. In ra: tài liệu **phải** cập nhật (vì `related_code` khớp file đã đổi) kèm việc
cần làm (sửa nội dung, tăng version một lần cho cả nhánh, `updated`, dòng lịch sử), lỗi tăng version của tài liệu
đã sửa, và nhắc `npm run docs:index` khi `docs/README.md` lệch. Chưa có `origin/staging`: chạy
`git fetch origin staging`. Dùng chung luật với `docs:check` (`tools/docs-check/rules.js`), nên docs-todo xanh
thì phần tác động/version của `docs:check` cũng xanh.
~~~

Trong `docs/ai/kiem-tra.md`, ở mục `## Git hook và AI kit` (thêm ở Task 1), thêm câu:

```markdown
Trước khi báo xong, `npm run ai:docs-todo` liệt kê tài liệu còn phải cập nhật theo đúng luật của `docs:check`.
```

- [ ] **Step 8: Kiểm tra toàn bộ và commit**

```bash
npm run test:tools
npm run docs:index && npm run docs:check -- --base origin/staging
git add tools/ai-kit tools/tests/ai-kit.test.js package.json docs/
git commit -m "feat(tools): ai:docs-todo — docs to update before finishing, same rules as docs:check"
```

---

### Task 5: Tầng 2 — skill `tckt-start`, `tckt-docs`, `tckt-explain`

**Files:**
- Create: `.agents/skills/tckt-start/SKILL.md`, `.agents/skills/tckt-docs/SKILL.md`, `.agents/skills/tckt-explain/SKILL.md`
- Create (symlink): `.claude/skills/tckt-start`, `.claude/skills/tckt-docs`, `.claude/skills/tckt-explain`
- Create: `tools/tests/kit-skills.test.js`
- Modify: `.agents/skills/_superpowers/README.md`, `docs/dev/ai-kit.md`

**Interfaces:**
- Consumes: script `ai:context`, `ai:docs-todo`, `docs:index`, `docs:check` trong `package.json`; `frontmatter.parse`.
- Produces: skill có tên `tckt-start`, `tckt-docs`, `tckt-explain`. Task 6 nhắc tên `tckt-docs` trong thông báo của hook `Stop`.

- [ ] **Step 1: Viết test (đỏ)**

`tools/tests/kit-skills.test.js`:

```js
'use strict';
// Skill tckt-* là của repo (không phải bản vendored). Test giữ cho skill không lệch khỏi code và tài liệu thật.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { parse } = require('../docs-check/frontmatter');

const ROOT = path.join(__dirname, '..', '..');
const SKILLS = path.join(ROOT, '.agents/skills');
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
const kit = fs.readdirSync(SKILLS).filter((n) => n.startsWith('tckt-')).sort();

test('kit ships exactly the three repo skills', () => {
  assert.deepEqual(kit, ['tckt-docs', 'tckt-explain', 'tckt-start']);
});

for (const name of kit) {
  test(`${name}: frontmatter, Claude Code symlink, references that exist`, () => {
    const file = path.join(SKILLS, name, 'SKILL.md');
    const text = fs.readFileSync(file, 'utf8');
    const { data } = parse(text);
    assert.equal(data.name, name);
    assert.ok(data.description && data.description.length > 40, 'description must say when to use the skill');
    const link = path.join(ROOT, '.claude/skills', name);
    assert.ok(fs.lstatSync(link).isSymbolicLink(), `${link} must be a symlink`);
    assert.equal(fs.realpathSync(path.join(link, 'SKILL.md')), fs.realpathSync(file));
    for (const m of text.matchAll(/npm run ([a-z:-]+)/g)) assert.ok(pkg.scripts[m[1]], `${name}: npm run ${m[1]} không có trong package.json`);
    for (const m of text.matchAll(/`((?:docs|tools|\.github|\.agents)\/[^`*<>\s]+)`/g)) {
      assert.ok(fs.existsSync(path.join(ROOT, m[1])), `${name}: ${m[1]} không tồn tại`);
    }
  });
}
```

- [ ] **Step 2: Chạy test để thấy đỏ**

Run: `node --test tools/tests/kit-skills.test.js`
Expected: FAIL ở `kit ships exactly the three repo skills` (danh sách rỗng)

- [ ] **Step 3: Viết ba skill**

`.agents/skills/tckt-start/SKILL.md`:

~~~markdown
---
name: tckt-start
description: Dùng khi bắt đầu bất kỳ việc nào trong repo ultimate-tckt (tính năng, sửa lỗi, refactor, tài liệu) để biết file sắp sửa thuộc module nào, có chạm hợp đồng dùng chung không, và phải đọc tài liệu nào trước khi sửa.
---

# tckt-start — trước khi sửa

Luật gốc là `AGENTS.md` và `docs/dev/ranh-gioi-module.md`; skill này chỉ chỉ cách áp dụng, không thay luật.

1. Liệt kê các file dự định sửa (đoán trước cũng được, bổ sung dần khi làm).
2. Chạy `npm run ai:context -- <file…>` (thêm `--json` nếu cần đọc bằng máy).
3. Đọc hết tài liệu lệnh liệt kê. Có dòng "bất biến" → đọc `docs/ai/bat-bien.md` trước khi viết dòng code nào.
4. Theo kết luận:
   - **làm luôn** → tiếp quy trình Superpowers (brainstorming → writing-plans → …).
   - **PHẢI RAISE** → dừng phần đó. Soạn nháp issue theo `.github/ISSUE_TEMPLATE/cross-module.md` (điền đủ các
     mục) và báo người dùng đúng câu: "Việc này ảnh hưởng module X / hợp đồng Y — cần raise họp team". Không code
     phần liên module trước khi issue có quyết định.
5. Tình huống quen thuộc (thêm tính năng, sửa lỗi, hotfix, đổi schema, đổi quyền…) → làm theo playbook tương ứng
   trong `docs/playbooks/`.
6. Thêm file mới giữa chừng → chạy lại bước 2 cho file đó.
~~~

`.agents/skills/tckt-docs/SKILL.md`:

~~~markdown
---
name: tckt-docs
description: Dùng khi sắp kết thúc một việc trong repo ultimate-tckt — trước khi commit, push hoặc báo xong — và khi viết hay tạo tài liệu trong docs/, để biết tài liệu nào phải cập nhật và cập nhật đúng luật version.
---

# tckt-docs — làm gì cũng phải docs lại

Luật gốc: `AGENTS.md` mục 4. Skill này là cách làm từng bước.

1. Chạy `npm run ai:docs-todo` (so với `origin/staging`; đổi base: `npm run ai:docs-todo -- --base <ref>`).
2. Với mỗi tài liệu "phải cập nhật":
   - sửa **nội dung** cho khớp code mới (không chỉ tăng số);
   - tăng `version` một lần cho cả nhánh — MAJOR nếu người đọc bản cũ sẽ làm sai, MINOR nếu bổ sung/làm rõ;
   - `updated` = hôm nay; thêm một dòng vào `## Lịch sử phiên bản`.
3. Cần tài liệu mới:
   - trước hết tìm tài liệu cùng chủ đề: xem `docs/README.md` và `grep -ril "<chủ đề>" docs`. Có rồi → sửa nó,
     không viết bản song song;
   - chỉ tạo mới khi thật sự chưa có, đặt đúng thư mục theo `docs/README.md`, frontmatter đủ trường như tài liệu
     cùng thư mục, `related_code` trỏ glob có thật; ghi lý do tạo mới trong báo cáo cuối việc.
4. Chạy `npm run docs:index` rồi `npm run docs:check -- --base origin/staging` — phải xanh.
5. Không sửa `docs/ba/nguon/**`. Không sửa ADR cũ — quyết định mới thì thêm ADR mới có `supersedes`.
6. Kết thúc bằng báo cáo cuối việc (bắt buộc):

   ```
   Đã chạm module: …
   Bất biến liên quan: … (hoặc: không)
   Tài liệu đã cập nhật: … (hoặc: Docs: không cần vì …)
   ```
~~~

`.agents/skills/tckt-explain/SKILL.md`:

~~~markdown
---
name: tckt-explain
description: Dùng khi người mới cần hiểu một module hoặc một phần của repo ultimate-tckt, hoặc khi cần giải thích một PR hay một nhánh đã chạm những gì.
---

# tckt-explain — dẫn đường trong repo

Chỉ nói điều có trong code hoặc tài liệu; luôn dẫn đường dẫn file thật. Không biết thì nói không biết và chỉ tài
liệu nên đọc.

## Tham quan một module

1. Chọn module trong `docs/dev/ranh-gioi-module.md`.
2. Chạy `npm run ai:context -- <vài file tiêu biểu của module>`.
3. Đọc mục tương ứng trong `docs/ai/tim-o-dau.md` và test ở `docs/dev/test.md`.
4. Trình bày: code ở đâu, tài liệu nào mô tả nó, bất biến nào áp vào, test ở đâu, và hợp đồng dùng chung nào
   không được tự đổi.

## Giải thích một PR hoặc nhánh

1. Lấy danh sách file: `git diff --name-only origin/staging...HEAD` (hoặc `gh pr diff <số> --name-only`).
2. Chạy `npm run ai:context -- <các file đó>` và `npm run ai:docs-todo`.
3. Tóm tắt: module nào, hợp đồng dùng chung nào bị chạm (có issue họp team chưa), tài liệu nào đã/chưa cập nhật,
   bất biến nào cần reviewer để ý.
~~~

- [ ] **Step 4: Tạo symlink cho Claude Code**

```bash
mkdir -p .claude/skills
for s in tckt-start tckt-docs tckt-explain; do ln -s ../../.agents/skills/$s .claude/skills/$s; done
ls -l .claude/skills
```
Expected: ba symlink trỏ về `../../.agents/skills/tckt-*`.

- [ ] **Step 5: Chạy test để thấy xanh**

Run: `node --test tools/tests/kit-skills.test.js`
Expected: PASS (4 test)

- [ ] **Step 6: Xác minh agent khác đọc được skill (thủ công, ghi kết quả vào tài liệu)**

- Codex, trong repo: hỏi "liệt kê skill đang có". Phải thấy `tckt-start`, vì Codex đọc `.agents/skills/`.
- Antigravity (`agy`), trong repo: hỏi tương tự. Theo `_superpowers/README.md`, Antigravity đọc `.agents/skills/`.
- Cursor: kiểm xem có nhận skill trong `.agents/skills/` hoặc `.claude/skills/` không.
  - Không nhận: **không** thêm thư mục mới trong plan này. Ghi "Cursor: chỉ tầng 0–1 + `AGENTS.md`" vào tài liệu. Đề xuất thêm symlink là việc sau.

Ghi kết quả thật (agent, phiên bản, thấy/không thấy) vào bảng ở Step 7. Không tự điền nếu chưa thử.

- [ ] **Step 7: Tài liệu**

Trong `.agents/skills/_superpowers/README.md`, thêm bullet này vào cuối danh sách:

```markdown
- Thư mục `tckt-*` (`tckt-start`, `tckt-docs`, `tckt-explain`) **không** phải bản vendored: là skill của repo
  (AI kit), được sửa như code thường, có test ở `tools/tests/kit-skills.test.js`; Claude Code đọc qua symlink
  `.claude/skills/tckt-*`. Xem `docs/dev/ai-kit.md`.
```

`docs/dev/ai-kit.md`:
- Sửa `related_code: [tools/git-hooks/**, tools/ai-kit/**, .agents/skills/tckt-*/**, .claude/**]`.
- Thêm mục mới ngay trước `## Lịch sử phiên bản`:

~~~markdown
## Tầng 2 — skill `tckt-*`

| Skill | Khi nào | Làm gì |
|---|---|---|
| `tckt-start` | Bắt đầu một việc | `ai:context` → "làm luôn" hay "phải raise"; nếu raise, soạn nháp issue liên module |
| `tckt-docs` | Sắp xong, trước commit/push; khi viết tài liệu | `ai:docs-todo` → sửa tài liệu đúng luật; tìm tài liệu trùng trước khi tạo mới; báo cáo cuối việc |
| `tckt-explain` | Người mới; giải thích PR | Tham quan module hoặc tóm tắt PR đã chạm gì |

Gốc ở `.agents/skills/tckt-*/SKILL.md`; Claude Code đọc qua symlink `.claude/skills/tckt-*` (máy Windows cần
`git config core.symlinks true` trước khi clone). Skill mỏng: gọi lệnh tầng 1 và trỏ tới playbook, không chép luật.
Thêm skill mới: tạo `.agents/skills/tckt-<tên>/SKILL.md` (frontmatter `name` = tên thư mục, `description` nói rõ
khi nào dùng), symlink sang `.claude/skills/`, chạy `npm run test:tools` — test bắt lệnh `npm run` và đường dẫn
không tồn tại.

| Agent | Đọc skill ở | Đã thử |
|---|---|---|
| Claude Code | `.claude/skills/` (symlink) | <kết quả Step 6> |
| Codex | `.agents/skills/` | <kết quả Step 6> |
| Antigravity | `.agents/skills/` | <kết quả Step 6> |
| Cursor | <kết quả Step 6> | <kết quả Step 6> |
~~~

Trong `docs/dev/test.md`, thêm `kit-skills.test.js` vào đoạn "Test của AI kit". Không tăng version.

- [ ] **Step 8: Kiểm tra toàn bộ và commit**

```bash
npm run test:tools
npm run docs:index && npm run docs:check -- --base origin/staging
git add .agents/skills/tckt-start .agents/skills/tckt-docs .agents/skills/tckt-explain .agents/skills/_superpowers/README.md .claude/skills tools/tests/kit-skills.test.js docs/
git commit -m "feat(ai-kit): tckt-start, tckt-docs, tckt-explain skills"
```

---

### Task 6: Tầng 3 — hook Claude Code và subagent `bat-bien-reviewer`

**Files:**
- Modify: `tools/ai-kit/lib.js` (thêm `guardEdit`)
- Create: `tools/ai-kit/claude-hook.js`
- Modify: `.claude/settings.json`
- Create: `.claude/agents/bat-bien-reviewer.md`
- Modify: `tools/ai-kit/modules.json` (contract thêm `.claude/agents/**`)
- Create: `tools/tests/claude-hook.test.js`
- Modify: `docs/dev/ai-kit.md`, `docs/dev/test.md` (nội dung)

**Interfaces:**
- Consumes:
  - `isEnvFile` (Task 1).
  - `repo.gatherContext`, `repo.gatherTodo`, `repo.ROOT`.
  - `lib.formatContext`, `lib.formatTodo`, `lib.todoIsEmpty`, `lib.today`.
- Produces:
  - `lib.guardEdit(rel, exists)` trả `string|null` (lý do chặn).
  - `require('../ai-kit/claude-hook')` export:
    - `pre(input, {root, cacheDir})` trả `{code, stdout?, stderr?}`.
    - `stop(input, {root, base, cacheDir})` trả `{code, stderr?}`.

- [ ] **Step 1: Viết test (đỏ)**

`tools/tests/claude-hook.test.js`:

```js
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { pre, stop } = require('../ai-kit/claude-hook');
const { makeGitRepo } = require('./helpers/git-repo');

const ROOT = path.join(__dirname, '..', '..');
const tmp = () => fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'tckt-hook-')));
const edit = (file, session = 's1') => ({ session_id: session, cwd: ROOT, tool_input: { file_path: file } });

test('pre blocks edits to existing originals, vendored skills and .env files', () => {
  const root = tmp();
  fs.mkdirSync(path.join(root, 'docs/ba/nguon'), { recursive: true });
  fs.writeFileSync(path.join(root, 'docs/ba/nguon/Bản gốc.docx'), 'x');
  const r = pre({ session_id: 's', cwd: root, tool_input: { file_path: path.join(root, 'docs/ba/nguon/Bản gốc.docx') } }, { root, cacheDir: tmp() });
  assert.equal(r.code, 2);
  assert.match(r.stderr, /chỉ đọc/);
  assert.equal(pre(edit('.agents/skills/brainstorming/SKILL.md'), { cacheDir: tmp() }).code, 2);
  assert.equal(pre(edit('core/.env'), { cacheDir: tmp() }).code, 2);
});

test('pre allows new originals, repo skills, the vendoring README and env examples', () => {
  const root = tmp();
  assert.equal(pre({ session_id: 's', cwd: root, tool_input: { file_path: 'docs/ba/nguon/moi.docx' } }, { root, cacheDir: tmp() }).code, 0);
  for (const f of ['.agents/skills/tckt-docs/SKILL.md', '.agents/skills/_superpowers/README.md', 'core/.env.example']) {
    assert.equal(pre(edit(f), { cacheDir: tmp() }).code, 0, f);
  }
});

test('pre adds module context once per file per session (absolute or relative path)', () => {
  const cacheDir = tmp();
  const first = pre(edit(path.join(ROOT, 'core/src/routes/tasks.js')), { cacheDir });
  const out = JSON.parse(first.stdout).hookSpecificOutput;
  assert.equal(out.hookEventName, 'PreToolUse');
  assert.match(out.additionalContext, /Điều hành/);
  assert.equal(pre(edit('core/src/routes/tasks.js'), { cacheDir }).stdout, undefined);
  assert.ok(pre(edit('core/src/routes/tasks.js', 's2'), { cacheDir }).stdout);
});

test('pre ignores tool calls without a path and files outside the repo', () => {
  assert.deepEqual(pre({ tool_input: {} }, { cacheDir: tmp() }), { code: 0 });
  assert.deepEqual(pre(edit('/etc/hosts'), { cacheDir: tmp() }), { code: 0 });
});

function staleRepo() {
  const r = makeGitRepo();
  r.write('docs/dev/x.md', [
    '---', 'doc_id: DEV-X-001', 'title: X', 'version: 1.0', 'status: active', 'audience: [dev]', 'owner: DYC',
    'updated: 2026-09-20', 'related_code: [src/**]', '---', '# X', '', '## Lịch sử phiên bản', '',
    '| Version | Ngày | Thay đổi | Người |', '|---|---|---|---|', '| 1.0 | 2026-09-20 | Bản đầu | DYC |', '',
  ].join('\n'));
  r.write('src/a.js', 'v1\n');
  r.commitAll('init');
  r.git('update-ref', 'refs/remotes/origin/staging', 'HEAD');
  r.write('src/a.js', 'v2\n');
  return r;
}

test('stop reminds once per distinct todo per session, and always lets go when stop_hook_active', () => {
  const r = staleRepo();
  const cacheDir = tmp();
  const input = { session_id: 's1', stop_hook_active: false };
  const first = stop(input, { root: r.dir, cacheDir });
  assert.equal(first.code, 2);
  assert.match(first.stderr, /docs\/dev\/x\.md/);
  assert.match(first.stderr, /Docs: không cần vì/);
  assert.equal(stop(input, { root: r.dir, cacheDir }).code, 0);
  assert.equal(stop({ ...input, stop_hook_active: true }, { root: r.dir, cacheDir: tmp() }).code, 0);
});

test('stop stays quiet without a base ref', () => {
  const r = makeGitRepo();
  r.write('a.txt', 'x');
  r.commitAll();
  assert.equal(stop({ session_id: 's' }, { root: r.dir, cacheDir: tmp() }).code, 0);
});

test('.claude/settings.json wires both hooks; bat-bien-reviewer agent exists', () => {
  const s = JSON.parse(fs.readFileSync(path.join(ROOT, '.claude/settings.json'), 'utf8'));
  assert.equal(s.enabledPlugins['superpowers@claude-plugins-official'], true);
  assert.match(s.hooks.PreToolUse[0].matcher, /Edit/);
  const cmds = [...s.hooks.PreToolUse, ...s.hooks.Stop].flatMap((e) => e.hooks.map((h) => h.command));
  assert.deepEqual(cmds, [
    'node "$CLAUDE_PROJECT_DIR"/tools/ai-kit/claude-hook.js pre',
    'node "$CLAUDE_PROJECT_DIR"/tools/ai-kit/claude-hook.js stop',
  ]);
  const agent = fs.readFileSync(path.join(ROOT, '.claude/agents/bat-bien-reviewer.md'), 'utf8');
  assert.match(agent, /^---\nname: bat-bien-reviewer\n/);
});
```

- [ ] **Step 2: Chạy test để thấy đỏ**

Run: `node --test tools/tests/claude-hook.test.js`
Expected: FAIL với `Cannot find module '../ai-kit/claude-hook'`

- [ ] **Step 3: Thêm `guardEdit` vào `tools/ai-kit/lib.js`**

Thêm dòng `require` này ở đầu file:

```js
const { isEnvFile } = require('../git-hooks/lib');
```

Thêm hàm này trước `module.exports`:

```js
// Lý do chặn agent sửa file (null = cho sửa). Cùng luật với pre-commit, nhưng chặn sớm hơn — lúc agent định sửa.
function guardEdit(rel, exists) {
  if (rel.startsWith('docs/ba/nguon/') && exists) {
    return `${rel}: docs/ba/nguon/ là bản gốc của stakeholder, chỉ đọc (AGENTS.md §5). Viết nội dung mới vào docs/ba/*.md.`;
  }
  const skill = /^\.agents\/skills\/([^/]+)\//.exec(rel);
  if (skill && !skill[1].startsWith('tckt-') && rel !== '.agents/skills/_superpowers/README.md') {
    return `${rel}: skill vendored, không sửa (AGENTS.md §5). Skill của repo đặt ở .agents/skills/tckt-*/.`;
  }
  if (isEnvFile(rel)) return `${rel}: file .env chứa secret — agent không sửa; người dùng tự sửa tay nếu cần.`;
  return null;
}
```

Sửa export thành:

```js
module.exports = { classify, relatedDocs, context, formatContext, docsTodo, todoIsEmpty, formatTodo, today, guardEdit };
```

- [ ] **Step 4: Viết `tools/ai-kit/claude-hook.js`**

```js
#!/usr/bin/env node
'use strict';
// Hook Claude Code (tầng 3 AI kit). Nối trong .claude/settings.json. Xem docs/dev/ai-kit.md.
//   pre  (PreToolUse Edit|Write|MultiEdit|NotebookEdit): chặn file cấm (exit 2), còn lại thêm ngữ cảnh module một lần/file/session.
//   stop (Stop): còn tài liệu phải cập nhật → exit 2 nhắc một lần cho mỗi danh sách việc; stop_hook_active → luôn cho dừng.
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { guardEdit, formatContext, formatTodo, todoIsEmpty, today } = require('./lib');
const repo = require('./repo');

const cacheFile = (dir, kind, session) => path.join(dir, `tckt-ai-kit-${kind}-${String(session || 'none').replace(/[^\w-]/g, '_')}`);
const readCache = (f) => { try { return fs.readFileSync(f, 'utf8'); } catch { return null; } };

function pre(input, { root = repo.ROOT, cacheDir = os.tmpdir() } = {}) {
  const ti = input.tool_input || {};
  const fp = ti.file_path || ti.notebook_path;
  if (!fp) return { code: 0 };
  const rel = repo.toRepoPath(fp, { root, cwd: input.cwd || root });
  if (!rel) return { code: 0 };
  const block = guardEdit(rel, fs.existsSync(path.join(root, rel)));
  if (block) return { code: 2, stderr: block };
  const cache = cacheFile(cacheDir, 'pre', input.session_id);
  const seen = JSON.parse(readCache(cache) || '[]');
  if (seen.includes(rel)) return { code: 0 };
  fs.writeFileSync(cache, JSON.stringify([...seen, rel]));
  const ctx = repo.gatherContext([rel], { root, cwd: root });
  const additionalContext = `[AI kit] ${formatContext(ctx)}`;
  return { code: 0, stdout: JSON.stringify({ hookSpecificOutput: { hookEventName: 'PreToolUse', additionalContext } }) };
}

function stop(input, { root = repo.ROOT, base = 'origin/staging', cacheDir = os.tmpdir() } = {}) {
  if (input.stop_hook_active) return { code: 0 };
  let todo;
  try { todo = repo.gatherTodo({ root, base }); } catch { return { code: 0 }; }
  if (todoIsEmpty(todo)) return { code: 0 };
  const text = formatTodo(todo, today());
  const cache = cacheFile(cacheDir, 'stop', input.session_id);
  if (readCache(cache) === text) return { code: 0 };
  fs.writeFileSync(cache, text);
  return {
    code: 2,
    stderr: `[AI kit] ${text}\nCập nhật tài liệu theo skill tckt-docs. Nếu thật sự không cần, ghi "Docs: không cần vì …" trong báo cáo cuối việc.`,
  };
}

if (require.main === module) {
  let input = {};
  try { input = JSON.parse(fs.readFileSync(0, 'utf8') || '{}'); } catch { /* stdin không phải JSON: bỏ qua */ }
  let r = { code: 0 };
  try {
    r = process.argv[2] === 'pre' ? pre(input) : process.argv[2] === 'stop' ? stop(input) : r;
  } catch (e) {
    r = { code: 0, stderr: `[AI kit] hook lỗi, bỏ qua: ${e.message}` }; // lỗi của kit không được chặn công việc
  }
  if (r.stdout) process.stdout.write(r.stdout);
  if (r.stderr) process.stderr.write(`${r.stderr}\n`);
  process.exit(r.code);
}

module.exports = { pre, stop };
```

- [ ] **Step 5: Nối hook và thêm subagent**

`.claude/settings.json`:

```json
{
  "enabledPlugins": {
    "superpowers@claude-plugins-official": true
  },
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Edit|Write|MultiEdit|NotebookEdit",
        "hooks": [{ "type": "command", "command": "node \"$CLAUDE_PROJECT_DIR\"/tools/ai-kit/claude-hook.js pre" }]
      }
    ],
    "Stop": [
      {
        "hooks": [{ "type": "command", "command": "node \"$CLAUDE_PROJECT_DIR\"/tools/ai-kit/claude-hook.js stop" }]
      }
    ]
  }
}
```

`.claude/agents/bat-bien-reviewer.md`:

~~~markdown
---
name: bat-bien-reviewer
description: Rà diff của nhánh hiện tại với từng bất biến trong docs/ai/bat-bien.md. Dùng trước khi mở PR, khi review cuối nhánh, hoặc khi diff chạm policies, middleware, audit, units hay infra.
tools: Read, Grep, Glob, Bash
model: opus
---

Bạn là reviewer **chỉ đọc** cho repo ultimate-tckt. Không sửa file, không commit, không push.

1. Lấy diff: `git diff origin/staging...HEAD` (người gọi có thể đưa base khác). Có thay đổi chưa commit thì xem
   thêm `git diff`.
2. Đọc toàn bộ `docs/ai/bat-bien.md`.
3. Với **từng** bất biến, kết luận một trong: **Giữ**, **Vi phạm**, **Không liên quan**. Với Giữ/Vi phạm, dẫn
   `file:dòng` trong diff làm bằng chứng; không đoán — không đủ bằng chứng thì ghi "Cần người kiểm" và nói thiếu gì.
4. Kiểm thêm: thay đổi có chạm hợp đồng dùng chung không (`npm run ai:context -- <file…>`), và tài liệu còn thiếu
   (`npm run ai:docs-todo`).

Trả về bảng `| # | Bất biến | Kết luận | Bằng chứng |`, rồi danh sách vi phạm cần sửa trước khi merge (rỗng thì ghi
"Không có vi phạm").
~~~

Trong `tools/ai-kit/modules.json`, thêm `".claude/agents/**"` vào cuối mảng `globs` của contract `"Luật và tooling dùng chung (docs-check, AI kit, skill, hook)"`.

- [ ] **Step 6: Chạy test để thấy xanh**

```bash
node --test tools/tests/claude-hook.test.js
npm run test:tools
```
Expected: PASS toàn bộ.

- [ ] **Step 7: Thử thật trong Claude Code**

Mở phiên Claude Code mới trong repo. Chạy `/hooks` trong terminal `claude` để xem hai hook đã được nạp chưa. Sau đó thử:
- Nhờ sửa `docs/ba/nguon/<một file có sẵn>`. Phải bị chặn, kèm thông báo "chỉ đọc".
- Nhờ sửa một dòng comment trong `core/src/routes/tasks.js`. Transcript phải có ngữ cảnh `[AI kit] … module: Điều hành`.
- Kết thúc lượt. Hook `Stop` phải nhắc tài liệu còn thiếu một lần. Lượt sau cùng danh sách việc thì không nhắc lại.

Hoàn tác thay đổi thử: `git checkout -- core/src/routes/tasks.js`.

- [ ] **Step 8: Tài liệu**

Thêm mục mới vào `docs/dev/ai-kit.md`, ngay trước `## Lịch sử phiên bản`:

~~~markdown
## Tầng 3 — Claude Code

Khai báo trong `.claude/settings.json`, code ở `tools/ai-kit/claude-hook.js` (dùng lại logic tầng 1):

- `PreToolUse` (Edit/Write/MultiEdit/NotebookEdit): chặn sửa file đã có trong `docs/ba/nguon/**`, skill vendored
  trong `.agents/skills/` (trừ `tckt-*` và `_superpowers/README.md`), file `.env`. File khác: thêm kết quả
  `ai:context` vào ngữ cảnh — một lần cho mỗi file trong một session.
- `Stop`: còn tài liệu phải cập nhật → nhắc agent (một lần cho mỗi danh sách việc trong session; agent vẫn dừng được
  nếu ghi "Docs: không cần vì …"). Chưa có `origin/staging` → im lặng.
- Lỗi trong hook không chặn công việc (in cảnh báo rồi cho qua); git hook và CI vẫn gác phía sau.
- Subagent `bat-bien-reviewer` (`.claude/agents/`): rà diff với từng bất biến, chỉ đọc. Gọi trước khi mở PR hoặc
  khi review cuối nhánh.
- Tắt tạm cho một máy: đặt `"disableAllHooks": true` trong `.claude/settings.local.json` (không commit).

Agent khác (Antigravity, Codex, Cursor): plan này không nối hook riêng; dùng tầng 0–2 và báo cáo cuối việc trong
`AGENTS.md`. Agent nào có cơ chế hook tương đương thì gọi `npm run ai:context`/`npm run ai:docs-todo` — thêm vào
đây khi đã thử thật.
~~~

Trong `docs/dev/test.md`, thêm `claude-hook.test.js` vào đoạn "Test của AI kit", gồm cả kiểm tra nối `.claude/settings.json`.

- [ ] **Step 9: Kiểm tra toàn bộ và commit**

```bash
npm run test:tools
npm run docs:index && npm run docs:check -- --base origin/staging
git add tools/ai-kit tools/tests/claude-hook.test.js .claude/settings.json .claude/agents docs/
git commit -m "feat(ai-kit): Claude Code PreToolUse/Stop hooks and bat-bien-reviewer subagent"
```

---

### Task 7: ADR-0013, luật `AGENTS.md`, thông báo GitHub → Discord (phần C)

**Files:**
- Create: `docs/adr/0013-ai-kit-va-repobot.md`
- Modify: `AGENTS.md` (§1, §2, §6, §7, dòng phiên bản luật)
- Modify: `docs/ops/github.md` (1.4 → 1.5)

**Interfaces:**
- Consumes: mọi thứ các task trước đã tạo (chỉ trỏ tới, không đổi code).
- Produces: luật mới "báo cáo cuối việc bắt buộc" và "cài kit", ADR-0013.

- [ ] **Step 1: Viết ADR**

`docs/adr/0013-ai-kit-va-repobot.md`:

~~~markdown
---
doc_id: ADR-0013-001
title: AI kit chia tầng cho dev và bot repobot ở repo phụ
version: 1.0
status: active
audience: [dev, ai, ops]
owner: DYC
updated: <ngày làm>
related_code: [tools/ai-kit/**, tools/git-hooks/**, .agents/skills/tckt-*/**, .claude/**]
---

# AI kit chia tầng cho dev và bot repobot ở repo phụ

## Bối cảnh

Team dùng lẫn nhiều AI agent (Claude Code, Antigravity, Codex, Cursor). Luật trong `AGENTS.md` chỉ là chữ: agent
và dev mới hay không đọc đúng tài liệu đúng lúc, sửa code mà quên tài liệu, hoặc tự làm việc liên module. BA cần
hỏi đáp và cập nhật tài liệu nghiệp vụ nhanh mà không mở repo. Thiết kế đầy đủ: SPEC-AIKIT-001
(`docs/specs/2026-09-26-ai-kit-repobot-design.md`), đã qua họp team (issue liên module).

## Quyết định

1. **AI kit chia 4 tầng**, tầng trên hỏng thì tầng dưới vẫn chạy: (0) `AGENTS.md` + git hook + CI; (1) CLI
   `npm run ai:context` / `ai:docs-todo` dùng lại luật của `tools/docs-check/`; (2) skill mỏng `tckt-*` ở
   `.agents/skills/`, symlink sang `.claude/skills/`; (3) hook và subagent riêng của Claude Code. Logic chỉ nằm ở
   tầng 1; tầng 2–3 gọi lại, không viết lại.
2. **Bảng module máy đọc được** ở `tools/ai-kit/modules.json` là nguồn sự thật cho glob; `ranh-gioi-module.md` tóm
   tắt và trỏ tới.
3. **Git hook cài bằng `npm run hooks:install`** (`core.hooksPath`), không dùng `prepare`: gốc repo không có
   dependency, `npm install` ở gốc chỉ sinh lockfile rác và không ai chạy nó.
4. **Báo cáo cuối việc bắt buộc** cho mọi agent (module / bất biến / tài liệu, hoặc "Docs: không cần vì …").
5. **Bot Discord `repobot` ở repo phụ**, chỉ giải đáp repo và sửa/tạo `docs/ba/*.md` qua PR vào `staging`, không
   merge. Chạy `agy` headless chính thức bằng subscription Antigravity của chủ repo; **không** dùng proxy
   subscription bên thứ ba (vd. OmniRoute). Git/gh do code bot giữ, không giao cho LLM. Chi tiết trong plan bot.
6. **Thông báo PR/commit** dùng webhook GitHub → Discord có sẵn, không viết code.

## Hệ quả

- Đổi `modules.json`, skill, hook hoặc luật báo cáo là đổi hợp đồng dùng chung: raise họp team.
- Dev mới phải chạy `npm run hooks:install` sau khi clone (`docs/onboarding/ngay-1.md`).
- Agent không có skill/hook vẫn được hưởng tầng 0–1; CI (`docs.yml`) vẫn là chốt cuối.
- Hook chỉ giảm lỗi, không thay review: `--no-verify` vẫn bỏ qua được git hook — CI và reviewer bắt phần còn lại.
- Rủi ro subscription dùng chung (điều khoản Antigravity) còn mở — ghi ở mục 10 của spec, xử lý trong plan bot.

## Lịch sử phiên bản

| Version | Ngày | Thay đổi | Người |
|---|---|---|---|
| 1.0 | <ngày làm> | Bản đầu | DYC |
~~~

- [ ] **Step 2: Sửa `AGENTS.md`**

Ở §2 "Trước khi làm bất cứ việc gì", thêm hai bước vào cuối danh sách đánh số:

```markdown
5. Lần đầu trên máy: `npm run hooks:install` (git hook của AI kit — `docs/dev/ai-kit.md`).
6. Liệt kê file sắp sửa rồi chạy `npm run ai:context -- <file…>` (skill `tckt-start`): biết module, hợp đồng dùng
   chung, bất biến và tài liệu phải đọc. Kết luận "PHẢI RAISE" → làm theo §3.
```

Ở §6 "Trước khi push", thêm dòng này vào cuối khối lệnh:

```
    npm run ai:docs-todo
```

Ở §7 "Sau khi xong một việc", thêm bullet này lên đầu danh sách:

```markdown
- **Báo cáo cuối việc (bắt buộc với mọi agent)** — kết thúc bằng đúng ba dòng:
  `Đã chạm module: …` / `Bất biến liên quan: … (hoặc: không)` / `Tài liệu đã cập nhật: … (hoặc: Docs: không cần vì …)`.
  Skill `tckt-docs` chỉ cách làm.
```

Thay dòng phiên bản luật cuối file bằng:

```markdown
Phiên bản luật: 2.1 (<ngày làm>) — thêm AI kit (hooks:install, ai:context, ai:docs-todo) và báo cáo cuối việc bắt buộc.
```

Kiểm tra link: `AGENTS.md` được `docs:check` kiểm link hỏng. Chỉ dùng đường dẫn trong backtick, không dùng link markdown tới file chưa có.

- [ ] **Step 3: Phần C — thông báo PR/commit sang Discord (`docs/ops/github.md`)**

Trong `docs/ops/github.md`:
- Đặt `version: 1.5` và `updated: <ngày làm>`.
- Thêm dòng lịch sử `| 1.5 | <ngày làm> | Thông báo PR/commit sang Discord bằng webhook GitHub | DYC |`.
- Thêm mục mới ngay trước `## Lịch sử phiên bản`:

```markdown
## 8. Thông báo PR/commit sang Discord

Dùng webhook có sẵn, không có code hay bot nào:

1. Discord → cài đặt channel thông báo → Integrations → Webhooks → New Webhook → sao chép URL. **URL này là
   secret** (ai có nó đều gửi được tin vào channel): không dán vào repo, tài liệu, issue hay PR.
2. GitHub → Settings → Webhooks → Add webhook:
   - Payload URL: URL vừa sao chép, thêm `/github` vào cuối (endpoint tương thích GitHub của Discord);
   - Content type: `application/json`; không đặt Secret;
   - Events: chọn "Let me select individual events" → Pushes, Pull requests, Pull request reviews.
3. Kiểm: tab "Recent Deliveries" của webhook trả 2xx; mở một PR nháp → channel nhận tin.

Lộ URL: xoá webhook trên Discord, tạo lại, sửa Payload URL trên GitHub. Tắt thông báo: xoá webhook trong Settings.
GitHub App và ruleset nhánh `bot/*` cho bot `repobot` sẽ ghi ở đây khi làm plan bot.
```

- [ ] **Step 4: Chủ repo cấu hình webhook (việc tay)**

Đây là việc tay của chủ repo, không phải của agent. Báo người dùng làm theo mục 8 vừa viết. Agent **không** tự tạo webhook, và không nhận URL webhook qua chat.

- [ ] **Step 5: Kiểm tra toàn bộ và commit**

```bash
npm run test:tools
npm run docs:index && npm run docs:check -- --base origin/staging
git add docs/ AGENTS.md
git commit -m "docs: ADR-0013 AI kit, AGENTS.md end-of-task report rule, GitHub→Discord notifications"
```

---

### Task 8: Kiểm tra cuối nhánh và mở PR

**Files:** không tạo file mới (chỉ sửa nếu review tìm ra lỗi)

- [ ] **Step 1: Chạy đủ kiểm tra theo `AGENTS.md` §6**

```bash
npm run test:tools
npm run ai:docs-todo
npm run docs:index && npm run docs:check -- --base origin/staging
```

Kit không chạm `core/` hay `services/`, nên không bắt buộc chạy `cd core && npm test` và pytest của CTD. Nếu `ai:context` trên diff cho thấy có chạm hai thư mục đó thì phải chạy cả hai.

- [ ] **Step 2: Tự kiểm bằng chính kit**

```bash
npm run ai:context -- $(git diff --name-only origin/staging...HEAD)
```
Expected: kết luận "PHẢI RAISE" với các lý do: hợp đồng luật/tooling, dependency (`package.json`) và bất biến/ADR/`AGENTS.md`. Đúng như issue họp team đã duyệt. Nếu thấy lý do nào **không** có trong issue, dừng lại và báo người dùng.

- [ ] **Step 3: Review cuối nhánh**

Dùng skill `superpowers:requesting-code-review` với model mạnh nhất. Gọi thêm subagent `bat-bien-reviewer` trên diff. Reviewer tập trung vào 5 mục ở phần Review Focus và các Global Constraints (không dependency, `quotepath`, không lộ secret).

- [ ] **Step 4: Ghi bẫy mới (nếu có)**

Trong lúc làm có gặp bẫy chưa ghi thì thêm vào `docs/ai/bay-da-gap.md`. Tài liệu này đã tăng version ở Task 1, chỉ cần sửa nội dung.

- [ ] **Step 5: Mở PR vào `staging`**

Dùng skill `superpowers:finishing-a-development-branch`. Mô tả PR gồm:
- Số issue liên module.
- Danh sách tầng đã làm.
- Kết quả thử agent ở Task 5 Step 6.
- Báo cáo cuối việc theo mẫu mới.
- Dòng nhắc dev chạy `npm run hooks:install`.

Không ghi URL webhook hay secret nào. PR cần reviewer là chủ các module bị chạm (xem `.github/CODEOWNERS`).

## Lịch sử phiên bản

| Version | Ngày | Thay đổi | Người |
|---|---|---|---|
| 1.0 | 2026-09-26 | Bản đầu: plan kit 4 tầng (Task 0–8) theo SPEC-AIKIT-001 | DYC (soạn cùng Claude) |

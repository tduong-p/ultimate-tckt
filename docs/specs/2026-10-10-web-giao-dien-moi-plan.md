---
doc_id: PLAN-WEB-003
title: Kế hoạch triển khai — Giao diện web mới (Linear-style) thay Atlaskit
version: 1.0
status: draft
audience: [dev, ai]
owner: DYC
updated: 2026-10-10
related_code: [web/src/core/**, web/src/shared/**, web/package.json, core/src/routes/tasks.js, core/src/routes/activities.js, core/src/routes/notifications.js]
---

# Giao diện web mới (Linear-style) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Thay toàn bộ lớp trình bày của `web/` (trừ `web/src/ctd/`) bằng giao diện Linear-style tự viết trên Radix, kèm sửa trực tiếp có Save/Discard, giữ nguyên URL/hash route, trong một nhánh dài, cutover một lần.

**Architecture:** `web/src/ui/` (token CSS + component Radix) và shell 3 pane thay Atlaskit. Core thêm `GET /api/tasks`, `PATCH /api/{tasks,activities}/:id/batch` (quyền theo trường, 409 theo `base`, một transaction, thông báo gộp sau commit), `editable[]` trong GET chi tiết, bộ lọc thông báo. Frontend dùng `useEditSession` + `EditBar` + navigation guard. Từng màn viết lại lần lượt rồi gỡ Atlaskit.

**Tech Stack:** React 18, TS, Vite, react-query, HashRouter, `@radix-ui/react-{popover,dialog,tabs}`, `@testing-library/user-event`, Playwright (smoke); Core Node/MySQL, `node:test`.

**Spec:** `docs/specs/2026-10-10-web-giao-dien-moi-design.md` (SPEC-WEB-004). Prototype giao diện đã duyệt: `web/src/prototype/` (chỉ tham chiếu, không ship).

## Global Constraints

- Không Tailwind, không shadcn, không đổi React 18; gỡ hết `@atlaskit/*` và `@compiled/react` ở Task 14.
- `web/src/ctd/` ngoài phạm vi. Không làm Gantt, "Nhật ký trực ban".
- HashRouter và mọi URL/hash route cũ giữ nguyên; `#/my-tasks-today` và `#/my-tasks` redirect vào tab tương ứng của "Việc của tôi".
- Ma trận quyền sửa — Task: tiêu đề/mô tả = tổ trưởng/tổ phó, `admin`/`vice_admin`, và người được giao task đó; người phụ trách, tổ, deadline, start_date, priority, deliverable = tổ trưởng/tổ phó trở lên. Activity: tiêu đề/mô tả = `admin`/`vice_admin` và `event_lead`; `event_lead_id` và tổ = `admin`/`vice_admin`. DYC chỉ đọc (INV-AUTH-001).
- Batch lỗi quyền → 403 kèm danh sách trường bị cấm; `base` lệch → 409; không có cột `updated_at` nên so `base` theo giá trị từng trường.
- Thông báo chỉ gửi sau commit; bỏ người thực hiện; `sourceKey` = id + mốc lưu; sự kiện mới `task.updated`/`activity.updated`; người mới được thêm nhận `task.assigned`.
- Core test chạy trên CI (không có MySQL local) — gộp lô test đỏ mỗi lần push.
- Trước push: `cd web && npm test && npm run build`, `cd core && npm test`, `npm run test:tools`, `npm run docs:index && npm run docs:check -- --base origin/staging`. Không push `main`; commit kết thúc bằng `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.
- Spec/plan ở `docs/specs/`; sửa tài liệu phải tăng `version`, `updated`, thêm dòng lịch sử; không sửa ADR cũ.
- Phân công: **[AGY]** = giao `agy` (`agy -p "<prompt tự chứa>" --mode accept-edits --model gemini-3.8-flash-high`), prompt chỉ cho sửa trong thư mục nêu rõ; Claude BẮT BUỘC chạy `tsc`/test và đọc `git diff` trước khi chấp nhận. **[CLAUDE]** = Claude tự làm (quyền, thông báo, mẫu dùng chung, review).

## Review Focus

1. Hai người sửa cùng task rồi cùng Save → người sau nhận 409, không ghi đè im lặng, form giữ nguyên bản nháp.
2. Người được giao (không phải tổ trưởng) gửi batch có `deadline` → 403 liệt kê `deadline`, KHÔNG lưu cả các trường được phép (tất cả hoặc không gì).
3. Batch rỗng hoặc chỉ giá trị trùng bản gốc → 200 không đổi gì, không gửi thông báo.
4. Người dùng rời trang/đổi route/đóng tab khi có thay đổi chưa lưu → hỏi xác nhận; Discard trả đúng giá trị gốc.
5. Người sửa là người nhận duy nhất → không tự nhận thông báo; thay người phụ trách → chỉ người mới nhận `task.assigned`.
6. Màn hình hẹp 360px: sidebar thành drawer, EditBar không che nội dung; phím tắt không kích hoạt khi đang gõ trong input.
7. `GET /api/tasks` không lộ việc của đơn vị/tổ ngoài `scopeFor`.

---

## Phần A — Core (làm trước, [CLAUDE])

### Task 1: `PATCH /api/tasks/:id/batch`

**Files:**
- Create: `core/src/services/task-batch.js`
- Modify: `core/src/routes/tasks.js` (đăng ký route ngay sau `PATCH /api/tasks/:id`)
- Test: `core/tests/tasks.batch.test.js`

**Interfaces:**
- Produces: `applyTaskBatch(context, { actor, taskId, changes, base }) → { status, body }`; `taskEditableFields(context, actor, task) → string[]` (dùng ở Task 3).
- Trường hợp lệ: `title, description, primary_assignee_id, co_assignee_ids, team_id, deadline, start_date, priority, deliverable`. Nhóm "nhẹ" = `title, description`.

- [ ] **Step 1: Viết test thất bại** (`core/tests/tasks.batch.test.js`, cùng khung `setup()` như `tasks.review.test.js`, thêm `third` là thành viên khác trong tổ)

```js
test('assignee may edit title/description but not deadline; batch is all-or-nothing', async () => {
  const ctx = await setup();
  try {
    await ctx.client.login(ctx.member.email, ctx.member.password);
    const ok = await ctx.client.request('PATCH', `/api/tasks/${ctx.taskId}/batch`, { body: { changes: { title: 'Tên mới' }, base: {} } });
    assert.equal(ok.status, 200);
    const bad = await ctx.client.request('PATCH', `/api/tasks/${ctx.taskId}/batch`, { body: { changes: { title: 'Tên khác', deadline: '2030-01-01' }, base: {} } });
    assert.equal(bad.status, 403);
    assert.deepEqual(bad.body.forbidden, ['deadline']);
    const [[t]] = await ctx.pool.query('SELECT title FROM tasks WHERE id=?', [ctx.taskId]);
    assert.equal(t.title, 'Tên mới');
  } finally { await ctx.close(); await ctx.teardown(); }
});

test('stale base returns 409 and writes nothing', async () => {
  const ctx = await setup();
  try {
    await ctx.client.login(ctx.leader.email, ctx.leader.password);
    const res = await ctx.client.request('PATCH', `/api/tasks/${ctx.taskId}/batch`, { body: { changes: { title: 'X' }, base: { title: 'không khớp' } } });
    assert.equal(res.status, 409);
    assert.deepEqual(res.body.conflicts, ['title']);
  } finally { await ctx.close(); await ctx.teardown(); }
});

test('no-op batch is 200 and sends no notification', async () => {
  const ctx = await setup();
  try {
    await ctx.client.login(ctx.leader.email, ctx.leader.password);
    const [[t]] = await ctx.pool.query('SELECT title FROM tasks WHERE id=?', [ctx.taskId]);
    const res = await ctx.client.request('PATCH', `/api/tasks/${ctx.taskId}/batch`, { body: { changes: { title: t.title }, base: { title: t.title } } });
    assert.equal(res.status, 200);
    assert.deepEqual(res.body.changed, []);
  } finally { await ctx.close(); await ctx.teardown(); }
});

test('priority outside enum is 400; empty title is 400', async () => {
  const ctx = await setup();
  try {
    await ctx.client.login(ctx.leader.email, ctx.leader.password);
    assert.equal((await ctx.client.request('PATCH', `/api/tasks/${ctx.taskId}/batch`, { body: { changes: { priority: 'x' }, base: {} } })).status, 400);
    assert.equal((await ctx.client.request('PATCH', `/api/tasks/${ctx.taskId}/batch`, { body: { changes: { title: '  ' }, base: {} } })).status, 400);
  } finally { await ctx.close(); await ctx.teardown(); }
});
```

- [ ] **Step 2: Chạy để thấy fail** — `cd core && node --test tests/tasks.batch.test.js` (cần MySQL; nếu không có thì đẩy lên CI, kỳ vọng 404 ở mọi case).

- [ ] **Step 3: Cài đặt `core/src/services/task-batch.js`**

```js
const FIELD_LABEL = { title: 'Tiêu đề', description: 'Mô tả', primary_assignee_id: 'Người phụ trách', co_assignee_ids: 'Người phối hợp', team_id: 'Tổ', deadline: 'Hạn', start_date: 'Ngày bắt đầu', priority: 'Ưu tiên', deliverable: 'Sản phẩm bàn giao' };
const LIGHT = ['title', 'description'];
const SCALAR = ['title', 'description', 'primary_assignee_id', 'team_id', 'deadline', 'start_date', 'priority', 'deliverable'];
const PRIORITIES = ['low', 'medium', 'high', 'urgent'];

async function taskEditableFields(context, actor, task) {
  const manages = context.isLeadership(actor) || await context.canManageTeam(actor, task.team_id);
  if (manages) return Object.keys(FIELD_LABEL);
  return task.assigned_to_me ? LIGHT : [];
}

function normalize(field, value) {
  if (value === undefined) return undefined;
  if (field === 'co_assignee_ids') return [...new Set((value || []).map(Number))].sort((a, b) => a - b);
  if (value === '' || value === null) return null;
  return typeof value === 'string' ? value.trim() : value;
}

async function applyTaskBatch(context, { actor, taskId, changes, base }) {
  const { db } = context;
  const [rows] = await db.execute('SELECT t.*,EXISTS(SELECT 1 FROM task_assignees ta WHERE ta.task_id=t.id AND ta.user_id=?) assigned_to_me FROM tasks t WHERE t.id=?', [actor.id, taskId]);
  const task = rows[0];
  if (!task) return { status: 404, body: { error: 'Không tìm thấy công việc.' } };
  const editable = await taskEditableFields(context, actor, task);
  const keys = Object.keys(changes || {});
  const unknown = keys.filter((k) => !FIELD_LABEL[k]);
  if (unknown.length) return { status: 400, body: { error: 'Trường không hợp lệ.', fields: unknown } };
  const forbidden = keys.filter((k) => !editable.includes(k));
  if (forbidden.length) return { status: 403, body: { error: 'Bạn không có quyền sửa các trường này.', forbidden } };
  const [coRows] = await db.execute('SELECT user_id FROM task_assignees WHERE task_id=? AND is_primary=0 ORDER BY user_id', [taskId]);
  const current = { ...task, co_assignee_ids: coRows.map((r) => r.user_id) };
  const next = {};
  for (const k of keys) next[k] = normalize(k, changes[k]);
  if (next.title !== undefined && !next.title) return { status: 400, body: { error: 'Tiêu đề không được để trống.' } };
  if (next.priority !== undefined && !PRIORITIES.includes(next.priority)) return { status: 400, body: { error: 'Mức ưu tiên không hợp lệ.' } };
  const changed = keys.filter((k) => JSON.stringify(normalize(k, current[k])) !== JSON.stringify(next[k]));
  const conflicts = changed.filter((k) => k in (base || {}) && JSON.stringify(normalize(k, base[k])) !== JSON.stringify(normalize(k, current[k])));
  if (conflicts.length) return { status: 409, body: { error: 'Dữ liệu đã được người khác thay đổi.', conflicts } };
  if (!changed.length) return { status: 200, body: { changed: [] } };
  const conn = await db.getConnection();
  const addedAssignees = [];
  try {
    await conn.beginTransaction();
    const scalar = changed.filter((k) => SCALAR.includes(k));
    if (scalar.length) await conn.execute(`UPDATE tasks SET ${scalar.map((k) => `${k}=?`).join(',')} WHERE id=?`, [...scalar.map((k) => next[k]), taskId]);
    if (changed.includes('primary_assignee_id') || changed.includes('co_assignee_ids')) {
      const primary = next.primary_assignee_id !== undefined ? next.primary_assignee_id : task.primary_assignee_id;
      const co = (next.co_assignee_ids !== undefined ? next.co_assignee_ids : current.co_assignee_ids).filter((id) => id !== primary);
      const before = new Set([task.primary_assignee_id, ...current.co_assignee_ids].filter(Boolean));
      const after = [primary, ...co].filter(Boolean);
      await conn.execute('DELETE FROM task_assignees WHERE task_id=? AND user_id NOT IN (' + (after.map(() => '?').join(',') || 'NULL') + ')', [taskId, ...after]);
      for (const id of after) {
        await conn.execute('INSERT INTO task_assignees(task_id,user_id,is_primary) VALUES(?,?,?) ON DUPLICATE KEY UPDATE is_primary=VALUES(is_primary)', [taskId, id, id === primary ? 1 : 0]);
        if (!before.has(id)) addedAssignees.push(id);
      }
    }
    await conn.commit();
  } catch (error) { await conn.rollback(); throw error; } finally { conn.release(); }
  return { status: 200, body: { changed }, notify: { task, changed, addedAssignees } };
}

module.exports = { applyTaskBatch, taskEditableFields, FIELD_LABEL };
```

Route trong `tasks.js`:

```js
router.patch('/api/tasks/:id/batch', auth, asyncRoute(async (req, res) => {
  if (!(await visibleTask(req.actor, req.params.id))) return res.status(404).json({ error: 'Không tìm thấy công việc.' });
  const result = await applyTaskBatch(context, { actor: req.actor, taskId: Number(req.params.id), changes: req.body.changes, base: req.body.base });
  if (result.notify) await notifyTaskUpdated(context, req.actor, result.notify); // Task 4
  res.status(result.status).json(result.body);
}));
```

(`visibleTask` = kiểm tra `visibleActivity(req.actor, task.activity_id)` giống `GET /api/tasks/:id`; nếu helper chưa có thì viết inline cùng cách.)

- [ ] **Step 4: Chạy lại test** — kỳ vọng PASS (local hoặc CI).
- [ ] **Step 5: Commit** — `git add core/src/services/task-batch.js core/src/routes/tasks.js core/tests/tasks.batch.test.js && git commit -m "feat(core): PATCH /api/tasks/:id/batch with per-field permission"`

### Task 2: `PATCH /api/activities/:id/batch`

**Files:** Create `core/src/services/activity-batch.js`; Modify `core/src/routes/activities.js`; Test `core/tests/activities.batch.test.js`.

**Interfaces:** Produces `applyActivityBatch(context, { actor, activityId, changes, base })` và `activityEditableFields(context, actor, activity) → string[]`. Trường: `title, description, deadline, start_date, priority` (nhóm nhẹ chỉ `title, description` cho `event_lead`), `team_id, event_lead_id` (chỉ `admin`/`vice_admin`).

- [ ] **Step 1: Test** — (a) `event_lead` sửa `title` → 200, sửa `team_id` → 403 `forbidden:['team_id']`; (b) `admin` đổi `event_lead_id` → 200; (c) DYC → 403 mọi trường; (d) `base` lệch → 409.
- [ ] **Step 2:** chạy, thấy 404/FAIL.
- [ ] **Step 3: Cài đặt** theo đúng cấu trúc Task 1 (cùng thứ tự: 404 → trường lạ 400 → forbidden 403 → validate 400 → changed → conflicts 409 → transaction). Tái dùng logic validate hiện có của `PATCH /api/activities/:id` (activities.js dòng ~99) bằng cách rút phần chung ra hàm trong `activity-batch.js`; KHÔNG sửa hành vi PATCH cũ. Quyền: `isExecutive(actor)` → toàn bộ; `activity.event_lead_id === actor.id` → `['title','description','deadline','start_date','priority']` rút còn `['title','description']` theo ma trận; còn lại `[]`.
- [ ] **Step 4:** chạy test PASS.
- [ ] **Step 5: Commit** — `feat(core): PATCH /api/activities/:id/batch`.

### Task 3: `editable[]` trong GET chi tiết + `GET /api/tasks`

**Files:** Modify `core/src/routes/tasks.js` (GET `/api/tasks/:id` và route mới `GET /api/tasks`), `core/src/routes/activities.js` (GET `/api/activities/:id`); Test `core/tests/tasks.list.test.js`, mở rộng `core/tests/frontend.contract.test.js`.

**Interfaces:** `GET /api/tasks/:id` thêm `editable: string[]` (từ `taskEditableFields`); `GET /api/activities/:id` thêm `editable` (từ `activityEditableFields`). `GET /api/tasks?mine=1&status=&team_id=&from=&to=&overdue=1&pending_review=1` trả mảng `{id,title,status,priority,deadline,team_id,team_name,activity_id,activity_title,primary_assignee_id,assignee_name,acknowledged_at,review_feedback}`, luôn qua `scopeFor`/`visibleActivity`.

- [ ] **Step 1: Test** — member chỉ thấy việc trong phạm vi; `mine=1` chỉ việc được giao; `overdue=1` lọc deadline < hôm nay và status không `done|cancelled`; user đơn vị B không thấy việc đơn vị A (Review Focus 7, theo mẫu `units.leak.test.js`); `editable` của assignee = `['title','description']`, của tổ trưởng chứa `deadline`.
- [ ] **Step 2:** chạy, FAIL.
- [ ] **Step 3: Cài đặt** — SQL join `tasks t JOIN activities a`, áp điều kiện phạm vi lấy từ cùng helper mà `GET /api/activities` dùng (`activityScope`); `ORDER BY deadline IS NULL, deadline, id`; `LIMIT 500`.
- [ ] **Step 4:** PASS. **Step 5: Commit** `feat(core): GET /api/tasks and editable[] on detail`.

### Task 4: Thông báo `task.updated` / `activity.updated` + bộ lọc inbox

**Files:** Create `core/src/services/batch-notify.js`; Modify `core/src/noti-sender.js` (LABELS), `core/src/routes/notifications.js`, `services/noti-api/templates/task.updated/`, `services/noti-api/templates/activity.updated/` (sao chép cấu trúc từ `task.reviewed/`), `docs/dev/email-cron.md`, `docs/dev/api.md`; Test `core/tests/batch.notify.test.js`, `core/tests/notifications.routes.test.js` (mở rộng).

**Interfaces:** `notifyTaskUpdated(context, actor, { task, changed, addedAssignees })`, `notifyActivityUpdated(...)`. Sự kiện: `{ event: 'task.updated', sourceKey: 'task.updated:<id>:<epochSeconds>', recipients, payload: { title, changed: [nhãn tiếng Việt], actorName } }`. Người nhận = người được giao + trưởng/phó tổ + `event_lead` trừ actor; mỗi người trong `addedAssignees` nhận `task.assigned` thay vì `task.updated`. `GET /api/notifications` thêm `unread=1`, `kind=<prefix|exact>`, và trả `task_id`, `activity_id`.

- [ ] **Step 1: Test** — (a) sửa tiêu đề + deadline → một thông báo gộp liệt kê 2 trường, actor không nhận; (b) thêm assignee mới → người đó nhận `task.assigned`, không nhận `task.updated`; (c) batch no-op → không có thông báo; (d) `GET /api/notifications?unread=1&kind=task.` lọc đúng và có `task_id`. Dùng fake notifier giống `notifier.test.js`.
- [ ] **Step 2:** FAIL. **Step 3:** cài đặt (gửi sau commit, bọc try/catch để lỗi Noti không làm hỏng response — ghi log, theo cách `notifier.js` hiện làm). Template Noti: subject `"{actorName} đã cập nhật: {title}"`, body liệt kê `changed`.
- [ ] **Step 4:** PASS + `npm run test:tools`. **Step 5: Commit** `feat(core): consolidated update notifications and inbox filters`.

---

## Phần B — Nền giao diện (`web/src/ui/`)

### Task 5: Token, Button, Menu, Dialog, Tabs, Toast, Avatar, StatusIcon, PriorityIcon, Badge, Field — **[AGY]**

**Files:** Create `web/src/ui/{tokens.css,Button.tsx,Menu.tsx,Dialog.tsx,Tabs.tsx,Select.tsx,Toast.tsx,Avatar.tsx,StatusIcon.tsx,PriorityIcon.tsx,Badge.tsx,Field.tsx,index.ts}` và `*.test.tsx` cạnh từng file; cài `@radix-ui/react-popover @radix-ui/react-dialog @radix-ui/react-tabs @testing-library/user-event`.

**Interfaces (Claude định nghĩa, agy làm theo):**
`Button({variant:'primary'|'ghost'|'danger', size:'sm'|'md', ...button})`; `Menu({trigger, items:{id,label,onSelect,danger?}[]})`; `Dialog({open,onOpenChange,title,children,footer})`; `Tabs({value,onValueChange,tabs:{value,label,count?}[]})`; `Avatar({name,src?,size})`; `StatusIcon({status:'todo'|'in_progress'|'review'|'done'|'cancelled'})`; `PriorityIcon({priority})`; `Badge({tone,children})`; `Field({label,error?,children})`; `useToast()→{push(msg,tone)}`.

- [ ] **Step 1 [CLAUDE]:** viết `web/src/ui/index.ts` + file kiểu dáng kiểm thử mẫu cho `Button`.
- [ ] **Step 2 [AGY]:** prompt — "Trong `web/src/ui/` cài các component theo chữ ký trong plan §Task 5, lấy giao diện từ `web/src/prototype/prototype.css` và `ui.tsx` (chép token màu/khoảng cách sang `tokens.css`, hỗ trợ dark qua `[data-theme=dark]`). Mỗi component có test Testing Library (role/label, user-event). Không sửa file ngoài `web/src/ui/` và `web/package.json`."
- [ ] **Step 3 [CLAUDE]:** `cd web && npx tsc --noEmit && npx vitest run src/ui`; đọc `git diff`; chạy axe trên Dialog/Menu/Tabs.
- [ ] **Step 4: Commit** `feat(web): ui kit on radix`.

### Task 6: Shell — Sidebar, layout 3 pane, chuông, UnitSwitcher, phím tắt, theme — **[AGY] + review [CLAUDE]**

**Files:** Create `web/src/core/shell/{Shell.tsx,Sidebar.tsx,NotificationBell.tsx,UnitSwitcher.tsx,useShortcuts.ts,useTheme.ts}` + test; Modify `web/src/core/App.tsx` (đổi shell cũ).

**Interfaces:** Sidebar mục: Hộp thư (badge chưa đọc) · Việc của tôi · Hoạt động · Văn bản · Giao việc · Trình · Các tổ · Tài khoản · chuyển giao diện. Route cũ giữ; `useShortcuts` bỏ qua khi `event.target` là input/textarea/contenteditable; `c`=tạo mới, `/`=tìm, `g i`=Hộp thư. Theme dùng `localStorage['tckt_theme']` như cũ (bọc try/catch). Polling thông báo vẫn chỉ ở `useNotifications` (60s).

- [ ] Step 1 [CLAUDE]: viết test hành vi: phím `c` trong input không mở dialog (Review Focus 6); drawer ở 360px; `aria-current` đúng route.
- [ ] Step 2 [AGY]: cài đặt theo `web/src/prototype/Sidebar.tsx` + `prototype.css`, nối vào hook/route thật (đọc `web/src/core/shell/*` và `web/src/core/App.tsx` hiện có để giữ route).
- [ ] Step 3 [CLAUDE]: `tsc`, `vitest`, kiểm tra thủ công bằng preview ở 360/768/1440 (đặt entry tạm trong `.claude/launch.json`, hoàn lại sau). Step 4: Commit.

---

## Phần C — Chỉnh sửa trực tiếp (**[CLAUDE]**, mẫu dùng chung)

### Task 7: `useEditSession`, `EditBar`, navigation guard

**Files:** Create `web/src/ui/EditBar.tsx`, `web/src/core/edit/{useEditSession.ts,EditGuard.tsx,editApi.ts}` + test.

**Interfaces:**
```ts
type Draft = Record<string, unknown>;
interface EditSession<T> {
  value<K extends keyof T>(key: K): T[K];          // nháp nếu có, không thì bản gốc
  set<K extends keyof T>(key: K, v: T[K]): void;
  dirty: boolean; changedKeys: (keyof T)[];
  save(): Promise<{ ok: true } | { ok: false; kind: 'conflict' | 'forbidden' | 'validation' | 'error'; fields?: string[]; message: string }>;
  discard(): void; saving: boolean;
}
useEditSession<T>({ original: T, editable: string[], patch: (changes, base) => Promise<void>, onSaved?: () => void }): EditSession<T>
```
`save()` gửi `{changes: <chỉ trường đổi>, base: <giá trị gốc của đúng các trường đó>}`; lỗi 409 giữ nguyên nháp và trả `conflict`; `useEditGuard(dirty)` chặn `beforeunload` và đổi route (HashRouter: chặn qua context `EditGuardProvider.confirmNavigate`, vì không có `useBlocker`). `EditBar` hiện khi `dirty`, nút Lưu/Hủy, phím `Mod+Enter`/`Esc`.

- [ ] Step 1: test hook — chỉ gửi trường đổi; sửa rồi sửa lại về giá trị gốc → `dirty=false`; 409 giữ nháp; discard trả gốc; `beforeunload` đăng ký khi dirty và gỡ khi hết dirty; trường ngoài `editable` → `set` bị bỏ qua.
- [ ] Step 2: FAIL. Step 3: cài đặt. Step 4: PASS. Step 5: Commit.

---

## Phần D — Màn hình (mỗi task: **[AGY]** viết + test, **[CLAUDE]** nghiệm thu)

Mỗi task dùng cùng quy trình: (1) Claude viết danh sách hành vi cũ cần giữ (đọc test cũ `*.test.tsx` cạnh màn); (2) agy viết lại màn trong thư mục màn đó bằng `web/src/ui/`, dịch test sang `userEvent`, giữ chuỗi tiếng Việt, route, query key; (3) Claude chạy `tsc`, `vitest <thư mục>`, đọc diff, kiểm tra 360/1440; (4) commit riêng từng màn. Prompt agy luôn nêu: thư mục được phép sửa, file tham chiếu prototype, "không đổi API client `web/src/core/api/*` và `queryKeys`".

### Task 8: Việc của tôi (tabs Hôm nay · Quá hạn · Chờ tôi duyệt · Tất cả) + Hộp thư
**Files:** `web/src/core/features/tasks/{MyTasksView,MyTasksToday}*` → `web/src/core/features/mine/`; `web/src/core/features/notifications/Inbox.tsx` (filter Chưa đọc/Nhắc tên/Duyệt); redirect `#/my-tasks-today`→`#/my-tasks?tab=today`, `#/my-tasks`→tab `all`. Dùng `GET /api/tasks`. Test: redirect, mỗi tab đúng dữ liệu, `notificationRoute()` vẫn map đúng `url` cũ.

### Task 9: Hoạt động (danh sách + chi tiết, sửa trực tiếp)
**Files:** `web/src/core/features/activities/**`. Chi tiết dùng `useEditSession` với `editable` từ GET; trường không sửa được hiển thị chỉ đọc (không có icon sửa). Test: `event_lead` thấy sửa tiêu đề không thấy tổ; DYC chỉ đọc; Save → gọi `/batch` một lần; 403 hiện trường bị cấm.

### Task 10: Công việc (chi tiết task, Kanban, tạo/sửa) — sửa trực tiếp
**Files:** `web/src/core/features/tasks/**` (`TaskDetailModal`, `EditTaskDialog`, `KanbanBoard`…). Xoá `EditTaskDialog` sau khi chi tiết sửa trực tiếp thay thế. Test: ma trận quyền task (assignee chỉ tiêu đề/mô tả), EditBar xuất hiện/biến mất, Save hiển thị toast và làm mới query, 409 hiện thông báo "đã bị người khác sửa" kèm nút Tải lại.

### Task 11: Lịch, Tổ, Thành viên
**Files:** `web/src/core/features/{calendar,teams,members}/**`.

### Task 12: Văn bản, Chỉ đạo (Giao việc), Trình, Báo cáo, Lưu trữ
**Files:** `web/src/core/features/{documents,directives,submissions,reports,archive}/**` (tên thư mục thật xác nhận bằng `ls web/src/core/features` khi bắt đầu).

### Task 13: Tài khoản, Đăng nhập, Onboarding, các dialog chung
**Files:** `web/src/core/features/{account,auth,onboarding}/**`, `web/src/shared/**` còn dùng Atlaskit.

---

## Phần E — Cutover

### Task 14: Gỡ Atlaskit, dọn phụ thuộc — **[AGY] + [CLAUDE]**

- [ ] Step 1 [CLAUDE]: `grep -rln "@atlaskit\|@compiled" web/src --include=*.ts --include=*.tsx | grep -v src/ctd` — kỳ vọng rỗng ngoài `ctd`. Nếu `ctd` còn dùng Atlaskit thì GIỮ các gói đó và ghi vào spec (ctd ngoài phạm vi) thay vì gỡ.
- [ ] Step 2 [AGY]: xoá import/đoạn cấu hình Atlaskit còn sót, `web/src/prototype/`, `web/prototype*.html`, `web/spikes/` (chỉ thư mục chưa commit — xác nhận với `git status` trước khi xoá).
- [ ] Step 3 [CLAUDE]: gỡ khỏi `web/package.json` các gói không còn dùng; `cd web && npm install && npm test && npm run build`; kiểm tra kích thước bundle giảm; chạy `core/tests/web-cutover.test.js` và `tools/tests/workflows.test.js`.
- [ ] Step 4: Playwright smoke (đăng nhập → Việc của tôi → mở task → sửa tiêu đề → Lưu) trên preview.

### Task 15: Tài liệu và ADR — **[CLAUDE]**

- [ ] ADR `docs/adr/0017-giao-dien-web-radix-thay-atlaskit.md` (supersedes 0016). Cập nhật: `docs/dev/frontend.md`, SPEC-WEB-003 (đánh dấu thay thế), `docs/dev/kien-truc.md`, `docs/dev/test.md`, `docs/dev/chay-local.md`, `docs/dev/phan-quyen.md` (ma trận sửa trực tiếp), `docs/dev/api.md` (endpoint mới), `docs/ai/bay-da-gap.md`, `docs/ai/tim-o-dau.md`, `docs/dev/email-cron.md`; đánh dấu `deprecated` các cặp spec/plan 2026-10-08 và `web-dot-0..6`; đổi SPEC-WEB-004/PLAN-WEB-003 sang `active`. Mỗi file: tăng `version`, `updated`, thêm dòng lịch sử.
- [ ] `npm run docs:index && npm run docs:check -- --base origin/staging` xanh (commit trước khi chạy `--base`).
- [ ] Mở PR vào `staging`; sau khi `staging → main` đồng bộ, thêm `test-web` vào ruleset `protect-main` (xem ghi chú bộ nhớ dự án).

### Task 16: Review cuối nhánh — **[CLAUDE]**

- [ ] Review toàn nhánh bằng model mạnh nhất (`code-reviewer` + `security-reviewer` cho Task 1–4, `typescript-reviewer` cho web); xử lý CRITICAL/HIGH; kiểm tra 7 mục Review Focus đều có test.

---

## Self-review

- **Độ phủ spec:** §3 UI → T5–6; §4 inline edit/quyền/batch/thông báo → T1–4, T7, T9–10; §5 endpoint khác → T3–4; §6 màn hình → T8–13; §7 test → mọi task + T14 smoke; §8 phụ thuộc → T5, T14; §10 tài liệu → T15; §11 rủi ro → Review Focus.
- **Placeholder:** Task 11–13 chỉ liệt kê phạm vi và dùng quy trình chung ở đầu Phần D; tên thư mục cần xác nhận bằng `ls` khi bắt đầu (ghi rõ ở T12). Đây là chủ ý vì các màn lặp cùng khuôn.
- **Nhất quán kiểu:** `taskEditableFields`/`activityEditableFields` (T1/T2) được dùng ở T3; `useEditSession` (T7) được dùng ở T9/T10; `forbidden`/`conflicts` trong body khớp `save()` kind `forbidden`/`conflict`.

## Lịch sử phiên bản

| Version | Ngày | Thay đổi | Người |
|---|---|---|---|
| 1.0 | 2026-10-10 | Bản đầu: kế hoạch 16 task, phân công agy/Claude | DYC |

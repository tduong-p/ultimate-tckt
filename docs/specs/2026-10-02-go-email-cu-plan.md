---
doc_id: PLAN-EMAILGO-001
title: Kế hoạch gỡ module email cũ và OneSignal của Core
version: 3.1
status: active
audience: [dev, ai]
owner: DYC
updated: 2026-10-10
related_code: [core/src/mailer.js, core/src/push.js, core/src/notifier.js, core/src/app.js, core/src/runtime.js, core/src/config/validate.js, core/src/routes/*.js, core/src/services/deadline-notifications.js, core/public/app.js, core/public/index.html, core/tests/**, core/src/config/database.js]
---

# Gỡ email cũ và OneSignal — Implementation Plan

> Frontend Core cũ giữ tại `/legacy/` trong lúc chuyển tiếp; tiền tố asset legacy được cập nhật trong cùng lần cutover. SPEC-WEB-003 §5 là nguồn mô tả duy nhất cho phục vụ frontend và rollback.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Xoá toàn bộ code gửi email hardcode (Gmail/nodemailer) **và** OneSignal của Core trên `staging`, đưa mọi điểm phát thông báo ra ngoài về **một facade** `core/src/notifier.js` (lúc viết plan chưa gửi gì), để khi service Noti sẵn sàng chỉ phải gắn sender. Đã làm: `core/src/noti-sender.js`, xem `docs/specs/2026-10-02-core-noti-sender-plan.md`.

**Architecture:** `core/src/mailer.js` trộn gửi email (Gmail) với gửi push OneSignal trong cùng các hàm `notify*`. Plan xoá cả hai kênh. Mỗi điểm gọi cũ được thay bằng đúng một lời gọi `notifier.notify({ event, recipient, data, sourceKey })`; `event` trùng tên template của Noti (SPEC-NOTI-001 §9), `sourceKey` là chuỗi sẽ thành `dedupe_key`. Thông báo trong ứng dụng (bảng `notifications`, chuông) **không đổi**.

**Tech Stack:** Node 20+, Express, MySQL, `node:test`.

**Lưu ý:** `core/src/config/migrate-units.js` được sửa riêng (hotfix `unit_id` theo kiểu `org_units.id`, 2026-10-02), không thuộc plan này.

**Spec:** `docs/specs/2026-10-02-noti-service-design.md` (SPEC-NOTI-001 v1.1, §9 và §17). Hiện trạng đối chiếu: `origin/staging` @ `88a859c`.

## Global Constraints

- Nhánh làm việc xuất phát từ `origin/staging`, tên đề xuất `refactor/remove-legacy-email` (nhánh hiện tại `docs/plan-remove-legacy-email` chỉ để tài liệu); PR vào `staging`, không push `main`.
- Phạm vi code: **chỉ** `core/`. `services/ctd-api` (`mailer.py`, `MAILER_DRIVER`) **không** thuộc plan này.
- **Không đổi schema**: cột `notifications.email_status` và `push_status` **giữ nguyên** (đổi schema là việc liên module); chỉ ngừng ghi `'pending'`. Dạng JSON của `GET /api/notifications` không đổi (hai field đó giờ luôn `null`).
- Thông báo trong ứng dụng, scheduler nhắc hạn và truy vấn của nó không đổi hành vi.
- Test DB (`createTestDatabase`) chỉ chạy trên CI (memory "Tests run in CI"); test thuần chạy được local bằng `cd core && node --test tests/<file>`.
- Tài liệu: mỗi lần sửa doc phải tăng `version`, đặt `updated: 2026-10-02`, thêm dòng "Lịch sử phiên bản"; cuối cùng chạy `npm run docs:index && npm run docs:check -- --base origin/staging`.
- Commit message dạng `type(scope): ...`, kết thúc bằng dòng `Co-Authored-By` theo hướng dẫn của phiên.

## Phạm vi và việc phải raise họp team

Plan này sửa `core/src/app.js`, `core/src/runtime.js`, `core/src/config/validate.js`, `core/package.json` và chính sách CSP. Theo `docs/dev/ranh-gioi-module.md` các file này thuộc module **Nền** (hợp đồng dùng chung) → **phải có quyết định họp team trước khi code Task 2 trở đi**.

| Việc | Module | Làm trong plan này? |
|---|---|---|
| Issue liên module: xoá email + OneSignal (sửa `app.js`, `runtime.js`, `config`, `package.json`, CSP), cập nhật dòng "Email & Cron" của `ranh-gioi-module.md` | Nền | Task 0 soạn issue; **chờ duyệt** |
| Tạo `notifier.js`, sửa `routes/*`, `services/deadline-notifications.js`, xoá `mailer.js`/`push.js`, gỡ OneSignal ở `public/` | Core + Điều hành | Có (Task 1–3), sau khi issue được duyệt |
| Tài liệu và ADR-0013 | docs | Có (Task 5) |
| Xoá `EMAIL_NOTIFICATIONS_ENABLED` khỏi `infra/compose/docker-compose.{staging,production}.yml` | infra | **Không** — đưa vào cùng issue Task 0; biến thừa vô hại |
| Service Noti, ADR Noti (`supersedes: 0004`), compose/DB/secret của Noti | mới + infra | Không — theo SPEC-NOTI-001 §13, plan riêng |
| Cột `email_status`/`push_status` | schema | Không — giữ nguyên, bàn khi làm Noti |

## Review Focus

1. **Điểm gọi bị sót** — còn chỗ gọi `mailer.*`/`push.queuePush` làm Core sập khi khởi động. Task 2 grep chặn.
2. **Lời gọi facade làm hỏng request** — mọi `notify` phải không bao giờ ném lỗi hay treo (Task 1 test: lỗi, hết giờ, event sai).
3. **Scheduler phụ thuộc `inserted`** — nếu Noti chết lúc dòng trong app được tạo thì thư không bao giờ được gửi lại; facade được gọi cho **mọi** mục tìm thấy, Noti dedupe theo `sourceKey` (Task 2 test).
4. **`email_status`/`push_status` kẹt `'pending'`** — INSERT task_response không được đặt `'pending'` nữa (Task 2 test).
5. **UI còn gọi endpoint đã chết / SDK đã gỡ** — `/api/push/config` và `/api/email/test` phải 404; đăng nhập/đăng xuất không còn gọi hàm push (Task 3 test và grep).
6. **Dữ liệu thiếu ở điểm gọi** — người nhận không có email, người nhận đã `is_active=0`, thiếu trường (xem bảng ở Task 2): facade bỏ qua người không có email và ghi log, không ném lỗi.

## File Structure

| File | Hành động | Trách nhiệm |
|---|---|---|
| `core/src/notifier.js` | Tạo | `createNotifier({ logger, sender?, timeoutMs? })` → `{ notify(event) }`, không bao giờ ném lỗi |
| `core/tests/notifier.test.js` | Tạo | Test thuần cho facade |
| `core/tests/config.validate.test.js` | Tạo | `warnAboutConfiguration` không cần `mailer`/`push` |
| `core/tests/notifications.no-legacy.test.js` | Tạo | Test DB: `*_status` NULL; `/api/email/test` và `/api/push/config` 404 |
| `core/src/app.js` | Sửa | Dựng `notifier`; bỏ `mailer`, `push`; bỏ CSP onesignal |
| `core/src/runtime.js` | Sửa | Bỏ `mailer`, `push` khỏi scheduler |
| `core/src/config/validate.js` | Sửa | Bỏ cảnh báo Gmail và push |
| `core/src/routes/{activities,tasks}.js` | Sửa | Thay lời gọi cũ bằng `notifier.notify` |
| `core/src/routes/{documents,teams,users,reports}.js` | Sửa | Đổi tên `mailer` → `notifier` trong destructure `context` (nếu có) |
| `core/src/routes/system.js` | Sửa | Xoá `/api/email/test`, `/api/push/config` |
| `core/src/services/deadline-notifications.js` | Sửa | Thay `push`/`mailer` bằng `notifier` |
| `core/public/{app.js,index.html}` | Sửa | Xoá toàn bộ phần OneSignal và nút "Test email" |
| `core/public/OneSignalSDKWorker.js`, `core/src/mailer.js`, `core/src/push.js` | **Xoá** | — |
| `core/.env.example`, `core/package.json`, `core/package-lock.json` | Sửa | Bỏ `ONESIGNAL_*`, `nodemailer` |
| `core/tests/{services.deadline-notifications,units.leak}.test.js` | Sửa | Theo hợp đồng mới |

---

### Task 0: Soạn issue liên module và chờ quyết định họp (không code)

**Files:** không có file code; nội dung issue theo `.github/ISSUE_TEMPLATE/cross-module.md`.

- [ ] **Step 1: Soạn issue**

Nội dung đề xuất:
- Quyết định đã có: bỏ hẳn module email cũ và OneSignal của Core (người dùng chốt 2026-10-02); email mới sẽ do service **Noti** (SPEC-NOTI-001) đảm nhận.
- Phần chạm module Nền: `core/src/app.js` (context, CSP: bỏ `cdn.onesignal.com`, `*.onesignal.com`, `onesignal.com`), `core/src/runtime.js`, `core/src/config/validate.js` (bỏ cảnh báo Gmail/push), `core/package.json` (gỡ `nodemailer`).
- Phần infra: xoá `EMAIL_NOTIFICATIONS_ENABLED: "false"` khỏi `infra/compose/docker-compose.{staging,production}.yml:35` (không còn code nào đọc). `CORE_SETTINGS_ENCRYPTION_KEY` **giữ nguyên** (mã hoá cài đặt khác của Core; không phụ thuộc email).
- Tài liệu: thêm dòng module và sửa dòng "Email & Cron" trong `docs/dev/ranh-gioi-module.md` (các file ghi ở đó không tồn tại trên staging).
- Hành vi người dùng thấy: mất push web (vốn đã tắt trên VM vì `ONESIGNAL_*` chưa có trong compose), mất nút "Test email" của quản trị; chuông trong ứng dụng không đổi.
- Rủi ro: thấp; rollback bằng revert PR. Khoảng trống: không có email nào từ Core cho tới khi Noti xong (trên VM email vốn đang tắt).

- [ ] **Step 2: Báo người dùng/trưởng module** để đưa vào họp. Chỉ sang Task 1 khi issue ghi quyết định "đồng ý".

---

### Task 1: Facade `notifier` có test

**Files:**
- Create: `core/src/notifier.js`
- Test: `core/tests/notifier.test.js`

**Interfaces:**
- Produces: `createNotifier({ logger, sender = null, timeoutMs = 5000 })` trả `{ notify(event) }`.
  `event = { event: string, recipient: { id, name, email }, data: object, sourceKey: string }`.
  `notify` luôn trả `Promise<{ delivered: boolean, reason?: string }>` và **không bao giờ reject**. `sender` (tuỳ chọn) là `async (event) => void`; chưa có sender → `{ delivered: false, reason: 'no-sender' }`.

- [ ] **Step 1: Viết test thất bại**

Tạo `core/tests/notifier.test.js`:

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const { createNotifier } = require('../src/notifier');

const logs = [];
const logger = { debug: m => logs.push(['debug', m]), warn: m => logs.push(['warn', m]), error: m => logs.push(['error', m]), info: () => {} };
const valid = { event: 'task.assigned', recipient: { id: 7, name: 'An', email: 'an@hust.edu.vn' }, data: { task: { id: 1 } }, sourceKey: 'task-assigned:1:7' };

test('without a sender nothing is delivered and nothing throws', async () => {
  const result = await createNotifier({ logger }).notify(valid);
  assert.deepEqual(result, { delivered: false, reason: 'no-sender' });
});

test('a valid event reaches the sender unchanged', async () => {
  const seen = [];
  const result = await createNotifier({ logger, sender: async e => { seen.push(e); } }).notify(valid);
  assert.equal(result.delivered, true);
  assert.deepEqual(seen, [valid]);
});

test('an event without recipient email or sourceKey is skipped, never sent, never thrown', async () => {
  const seen = [];
  const notifier = createNotifier({ logger, sender: async e => { seen.push(e); } });
  const noEmail = await notifier.notify({ ...valid, recipient: { id: 7, name: 'An', email: null } });
  const noKey = await notifier.notify({ ...valid, sourceKey: '' });
  const noEvent = await notifier.notify({ ...valid, event: '' });
  assert.deepEqual([noEmail.reason, noKey.reason, noEvent.reason], ['invalid-event', 'invalid-event', 'invalid-event']);
  assert.equal(seen.length, 0);
});

test('a throwing sender is contained', async () => {
  const notifier = createNotifier({ logger, sender: async () => { throw new Error('boom'); } });
  const result = await notifier.notify(valid);
  assert.deepEqual(result, { delivered: false, reason: 'sender-error' });
});

test('a hanging sender is cut off by the timeout', async () => {
  const notifier = createNotifier({ logger, timeoutMs: 20, sender: () => new Promise(() => {}) });
  const result = await notifier.notify(valid);
  assert.deepEqual(result, { delivered: false, reason: 'timeout' });
});
```

- [ ] **Step 2: Chạy test, xác nhận thất bại**

Run: `cd core && node --test tests/notifier.test.js`
Expected: FAIL với `Cannot find module '../src/notifier'`.

- [ ] **Step 3: Cài đặt tối thiểu**

Tạo `core/src/notifier.js`:

```js
'use strict';

function isValid(event) {
  return Boolean(event && event.event && event.sourceKey && event.recipient && event.recipient.email);
}

function createNotifier({ logger, sender = null, timeoutMs = 5000 }) {
  async function notify(event) {
    if (!isValid(event)) {
      logger.warn(`Skipped notification ${event && event.event}: missing event, sourceKey or recipient email.`);
      return { delivered: false, reason: 'invalid-event' };
    }
    if (!sender) {
      logger.debug(`Notification ${event.event} (${event.sourceKey}) not sent: no sender configured.`);
      return { delivered: false, reason: 'no-sender' };
    }
    let timer;
    try {
      const timeout = new Promise((_resolve, reject) => { timer = setTimeout(() => reject(Object.assign(new Error('timeout'), { code: 'NOTIFY_TIMEOUT' })), timeoutMs); });
      await Promise.race([sender(event), timeout]);
      return { delivered: true };
    } catch (error) {
      logger.error(`Notification ${event.event} (${event.sourceKey}) failed.`, error);
      return { delivered: false, reason: error.code === 'NOTIFY_TIMEOUT' ? 'timeout' : 'sender-error' };
    } finally {
      clearTimeout(timer);
    }
  }
  return { notify };
}

module.exports = { createNotifier };
```

- [ ] **Step 4: Chạy test, xác nhận đạt**

Run: `cd core && node --test tests/notifier.test.js`
Expected: PASS (5 test).

- [ ] **Step 5: Commit**

```bash
git add core/src/notifier.js core/tests/notifier.test.js
git commit -m "feat(core): notifier facade for outgoing notifications"
```

---

### Task 2: Thay điểm gọi, xoá `mailer.js` và `push.js`, sửa scheduler

> Chỉ làm sau khi Task 0 được duyệt (sửa `app.js`, `runtime.js`, `config`).

**Files:**
- Modify: `core/src/app.js:22-23,32,38,42,76`, `core/src/runtime.js:3,30-31`, `core/src/config/validate.js:8-9`
- Modify: `core/src/routes/activities.js` (create ở dòng 58, resubmit 71, participants 108, INSERT 138, tag push 145, response 153-155, assigned 198, decision 227, submit-review 329)
- Modify: `core/src/routes/tasks.js:107,141`
- Modify: `core/src/routes/{documents,teams,users,reports,system}.js` (destructure `context`)
- Modify: `core/src/services/deadline-notifications.js:44,59-60,72-73,86`
- Modify: `core/tests/services.deadline-notifications.test.js`, `core/tests/units.leak.test.js:22`
- Delete: `core/src/mailer.js`, `core/src/push.js`
- Test: `core/tests/config.validate.test.js`, `core/tests/notifications.no-legacy.test.js`

**Interfaces:**
- Consumes: `createNotifier({ logger })` (Task 1).
- Produces: `context.notifier` thay `context.mailer` và `context.push`; `runDeadlineNotifications({ db, notifier, logger, now })`; `startDeadlineNotificationScheduler({ db, notifier, logger })`; `warnAboutConfiguration(config)`.

**Bảng sự kiện** (mọi điểm gọi dùng `notifier.notify(...)`, không `await` trong luồng request, đặt trong `try/catch` có sẵn):

| Điểm gọi | `event` | `sourceKey` | `data` | Khoảng trống dữ liệu cần xử lý |
|---|---|---|---|---|
| tạo hoạt động (`activities.js:58`) và nộp lại đề án (`:71`) | `activity.proposed` | `activity-proposed:${activityId}:${admin.id}:${proposalId}` (`proposalId` = `insertId` của `activity_proposals`; ở luồng tạo mới dùng `create`) | `{ actor, activity: { id, title, path } }` | `:71` chỉ SELECT `id,status,title`: `type/deadline/priority` là biến tuỳ chọn, chưa gửi |
| thêm người tham gia (`:108`) | `activity.participant_added` | `activity-participant:${activityId}:${user.id}` | `{ actor, responsibility, activity: { id, title, path, deadline } }` | — |
| phản hồi công việc (`:155`) | `task.response` | `task-response:${updateId}:${owner.id}` (cùng chuỗi `source_key` đang có cho người giao) | `{ actor, response: { kind, body }, task: { id, title, path }, activity: { title } }` | — |
| giao việc (`:198`) | `task.assigned` | `task-assigned:${taskId}:${assignedUser.id}` (đúng `source_key` đang có) | `{ actor, task: { id, title, path, deadline }, activity: { title } }` | — |
| quyết định đề án (`:227`) | `activity.decided` | `activity-decided:${activity.id}:${decisionRef}:${creator.id}` (`decisionRef` = `insertId` của `activity_proposals`, hoặc `deleted` khi bị từ chối và xoá) | `{ actor, action, feedback, activity: { id, title } }` | đề án bị xoá cứng **trước** khi gửi: dùng đối tượng `activity` đã SELECT từ trước, không truy vấn lại |
| nộp nghiệm thu (`:329`, `tasks.js:107`) | `task.review_requested` | `task-review:${task.id}:${reviewer.id}:${submittedAt}` (`submittedAt = Date.now()` lấy một lần ở đầu request; nghiệp vụ đã chặn nộp lặp bằng `409`) | `{ actor, task: { id, title, path }, activity: { title } }` | `tasks.js:107` thiếu `activity_title` và lọc `is_active=1`: bổ sung cả hai vào truy vấn |
| kết quả nghiệm thu (`tasks.js:141`) | `task.reviewed` | `task-reviewed:${task.id}:${assignedUser.id}:${decision}:${reviewedAt}` | `{ actor, decision, feedback, task: { id, title, path } }` | truy vấn `task_assignees` thiếu lọc `is_active=1`: thêm `AND u.is_active=1` |
| sắp đến hạn (scheduler) | `task.deadline_soon` | đúng `sourceKey` của `insertNotificationOnce` (`task-deadline-${window}:${taskId}:${userId}:${today}`) | `{ window, task: { id, title, path, deadline }, activity: { title } }` | — |
| quá hạn (scheduler) | `task.overdue` | `task-overdue:${taskId}:${userId}:${today}` | như trên không có `window` | — |
| chưa xác nhận (scheduler) | `task.unacknowledged` | `task-unacknowledged:${taskId}:${memberId}` | `{ memberName, task: { id, title, path }, activity: { title } }` | `lead_email` có thể NULL: facade bỏ qua và ghi log |

`path` là đường dẫn tương đối kiểu `/#activity/${activityId}` (Noti tự nối `base_url`, SPEC-NOTI-001 §5). `recipient` luôn là `{ id, name, email }` từ truy vấn sẵn có.

Hai việc không phải email nhưng đi cùng: **bỏ push gắn thẻ bình luận** (`activities.js:145`, `push.queuePush('comment tag …')`) — thông báo thẻ tên chưa có template; ghi vào mục "việc để sau" của Noti; và **ngừng ghi `'pending'`** cho `email_status`/`push_status` trong INSERT task_response (`:138`).

- [ ] **Step 1: Viết test thất bại**

Tạo `core/tests/config.validate.test.js`:

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const { warnAboutConfiguration } = require('../src/config/validate');

test('production startup needs no mailer or push service and never warns about them', () => {
  const warnings = [];
  const original = console.warn;
  console.warn = message => warnings.push(String(message));
  try {
    assert.doesNotThrow(() => warnAboutConfiguration({ isProduction: true, sessionSecret: 'x'.repeat(40) }));
  } finally { console.warn = original; }
  assert.equal(warnings.some(message => /email|gmail|push|onesignal/i.test(message)), false);
});
```

Tạo `core/tests/notifications.no-legacy.test.js`:

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const { createTestDatabase } = require('./helpers/db');
const { startTestServer } = require('./helpers/server');
const { createTeam, createUser, createActivity, createTask } = require('./helpers/fixtures');

test('a task response creates the in-app notification without marking any delivery status', async () => {
  const { pool, teardown } = await createTestDatabase();
  const { client, close } = await startTestServer(pool);
  try {
    const teamId = await createTeam(pool);
    const leader = await createUser(pool, { role: 'leader', team_id: teamId, is_lead: true });
    const member = await createUser(pool, { role: 'member', team_id: teamId });
    const activityId = await createActivity(pool, { team_id: teamId, creator_id: leader.id, status: 'approved' });
    const taskId = await createTask(pool, { activity_id: activityId, team_id: teamId, primary_assignee_id: member.id, assigned_by: leader.id });
    await client.login(member.email, member.password);

    const posted = await client.request('POST', `/api/activities/${activityId}/updates`, { body: { body: 'Đã xong bản nháp', kind: 'progress', task_id: taskId } });
    assert.equal(posted.status, 201);

    const [[row]] = await pool.query("SELECT email_status, push_status FROM notifications WHERE user_id=? AND kind='task_response'", [leader.id]);
    assert.equal(row.email_status, null);
    assert.equal(row.push_status, null);
  } finally { await close(); await teardown(); }
});

test('the legacy test-email and push-config endpoints are gone', async () => {
  const { pool, teardown } = await createTestDatabase();
  const { client, close } = await startTestServer(pool);
  try {
    const admin = await createUser(pool, { role: 'admin' });
    await client.login(admin.email, admin.password);
    const email = await client.request('POST', '/api/email/test', { body: { to: 'a@example.com' } });
    const push = await client.request('GET', '/api/push/config');
    assert.equal(email.status, 404);
    assert.equal(push.status, 404);
  } finally { await close(); await teardown(); }
});
```

> Nếu cổng legacy trả 401/403 trước 404 cho người dùng `admin` thiếu membership đơn vị, dùng đúng helper tạo người dùng có membership như `core/tests/units.legacy-gate.test.js`; điều cần khoá là "không còn 200/502 từ handler cũ".

Sửa `core/tests/services.deadline-notifications.test.js`: thay `const push = require('../src/push')` bằng một notifier giả và gọi `runDeadlineNotifications({ db: pool, notifier, logger })`:

```js
const sent = [];
const notifier = { notify: async event => { sent.push(event); return { delivered: true }; } };
```

Thêm kiểm tra: sau lần chạy thứ nhất `sent` có đủ các `event` `task.deadline_soon`/`task.overdue`/`task.unacknowledged` với `sourceKey` bằng `source_key` của bảng `notifications`; sau lần chạy **thứ hai** (không tạo thêm dòng mới, `created === 0`) `notifier.notify` **vẫn được gọi lại** với cùng `sourceKey` (Noti sẽ dedupe).

Xoá dòng `/^\/api\/push\/config$/,` ở `core/tests/units.leak.test.js:22` (route không còn).

- [ ] **Step 2: Chạy test, xác nhận thất bại**

Local: `cd core && node --test tests/config.validate.test.js` → FAIL (`Cannot read properties of undefined (reading 'mailer')` hoặc cảnh báo còn nhắc email/push). Các test DB xác nhận đỏ trên CI, gom chung một lượt (memory: không chạy từng test).

- [ ] **Step 3: Cài đặt**

3a. `core/src/app.js`: thay `const mailer = require('./mailer');` và `const push = require('./push');` bằng `const { createNotifier } = require('./notifier');`; trong `createApplication`, trước `const context = {`: `const notifier = createNotifier({ logger });`; đổi `warnAboutConfiguration(runtimeConfig, { mailer, push });` → `warnAboutConfiguration(runtimeConfig);`; đổi `logger, mailer, push,` → `logger, notifier,`; xoá khỏi `scriptSrc` các mục `"https://cdn.onesignal.com", "https://*.onesignal.com"` và khỏi `connectSrc` các mục `"https://cdn.onesignal.com", "https://*.onesignal.com", "https://onesignal.com"`.

3b. `core/src/runtime.js`: xoá `const push = require('./push');` (dòng 3) và `const mailer = require('./mailer');` (dòng 30); đổi lời gọi thành `startDeadlineNotificationScheduler({ db: application.db, notifier: application.context.notifier, logger })` — nếu `application` không lộ `context`, dựng `createNotifier({ logger })` ngay tại đây (một chỗ duy nhất, ghi chú vì sao).

3c. `core/src/config/validate.js`: xoá hai dòng 8 và 9 (cảnh báo mailer và push) và tham số `services` nếu không còn dùng.

3d. Đổi tên trong destructure `context` của `documents.js`, `teams.js`, `users.js`, `reports.js`, `system.js`: bỏ `mailer`, `push` (nếu có), không thêm `notifier` cho file không dùng. Sửa tay từng file, **không** dùng `sed` toàn cục (các router có dòng rất dài, `mailer` còn là chuỗi trong tên hàm).

3e. `activities.js`, `tasks.js`: thay từng lời gọi theo bảng trên, ví dụ giao việc:

```js
notifier.notify({
  event: 'task.assigned',
  recipient: assignedUser,
  data: { actor: req.actor.name, task: { id: taskId, title, path: `/#activity/${req.params.id}`, deadline }, activity: { title: activity.title } },
  sourceKey: `task-assigned:${taskId}:${assignedUser.id}`
});
```

INSERT task_response (`activities.js:138`): bỏ hai cột `email_status,push_status` và hai giá trị `'pending','pending'`; bỏ `recordStatus`/`tracksDelivery` (dòng 153-155) và gọi `notifier.notify` như bảng.

3f. `core/src/services/deadline-notifications.js`: chữ ký `runDeadlineNotifications({ db, notifier, logger, now = new Date() })`; trong mỗi vòng, gọi `notifier.notify(...)` **ngoài** khối `if (inserted)` (giữ `created += 1` trong `if (inserted)`); xoá hai lệnh `push.queuePush` và ba lệnh `mailer.*`. Với `unacknowledged`, giữ `if (!item.lead_id) continue;`.

3g. `git rm core/src/mailer.js core/src/push.js`.

- [ ] **Step 4: Chạy kiểm tra**

```bash
cd core
node --test tests/notifier.test.js tests/config.validate.test.js
node -e "require('./src/app')"
git grep -nI "mailer\|queuePush\|require('./push')\|context.push" -- src tests
```

Expected: test PASS; `require` không lỗi; grep không còn kết quả trong `src/` và `tests/` (riêng `public/` xử lý ở Task 3).

- [ ] **Step 5: Commit**

```bash
git add -A core/src core/tests
git commit -m "refactor(core): route all outgoing notifications through notifier, drop mailer and OneSignal server code"
```

---

### Task 3: Gỡ OneSignal và "Test email" ở frontend, env, dependency

**Files:**
- Modify: `core/src/routes/system.js:38,41` (xoá hai route nếu Task 2 chưa xoá)
- Modify: `core/public/index.html:99` (xoá thẻ `<script …OneSignalSDK.page.js>`)
- Modify: `core/public/app.js:136-166` (xoá `setupPushNotifications`, `logoutPushUser`, `logoutPushUserWithTimeout`), dòng 168 (`init`: bỏ `setupPushNotifications().catch(...)`), dòng 172 (`#logout`: bỏ `await logoutPushUserWithTimeout();`), `:1404-1405` (xoá `testEmailModal` và nút)
- Delete: `core/public/OneSignalSDKWorker.js`
- Modify: `core/.env.example:21-23` (xoá khối "Web push" và hai biến `ONESIGNAL_*`)
- Modify: `core/package.json`, `core/package-lock.json` (gỡ `nodemailer`)

**Interfaces:** không có.

- [ ] **Step 1:** Test đã có ở Task 2 (`notifications.no-legacy.test.js`: hai route trả 404). Thêm vào `core/tests/frontend.contract.test.js` một kiểm tra thuần đọc file: `public/app.js` và `public/index.html` không chứa `OneSignal`, `setupPushNotifications`, `testEmailModal`, `api/email/test`; `public/OneSignalSDKWorker.js` không tồn tại.

- [ ] **Step 2:** Chạy `cd core && node --test tests/frontend.contract.test.js` → FAIL (còn các chuỗi trên).

- [ ] **Step 3: Cài đặt** theo danh sách file ở trên. Sau khi xoá, đoạn `init` và `#logout` còn:

```js
// #logout
$('#logout')?.addEventListener('click',async()=>{await api('/api/logout',{method:'POST'});location.reload()});
```

Gỡ dependency: `cd core && npm uninstall nodemailer`.

- [ ] **Step 4: Chạy kiểm tra**

```bash
cd core
git grep -nI -i "onesignal\|nodemailer\|testEmail\|api/email\|api/push\|GMAIL_\|setupPush\|logoutPush" -- src public tests package.json package-lock.json .env.example
node -e "require('./src/app')" && node --test tests/frontend.contract.test.js tests/notifier.test.js tests/config.validate.test.js
```

Expected: grep chỉ có thể còn trong `tests/frontend.contract.test.js` (chính các chuỗi kiểm tra); mọi test chạy được đều PASS.

- [ ] **Step 5: Commit**

```bash
git add -A core/src core/public core/package.json core/package-lock.json core/.env.example core/tests
git commit -m "chore(core): remove OneSignal client, test-email UI/endpoint and nodemailer"
```

---

### Task 4: Đẩy CI và xử lý test đỏ một lượt

- [ ] **Step 1:** `git branch -m refactor/remove-legacy-email` rồi `git push -u origin refactor/remove-legacy-email`, mở PR vào `staging`.
- [ ] **Step 2:** Đọc CI, gom mọi test đỏ rồi sửa một lượt (không sửa từng test một). Chú ý: `services.deadline-notifications`, `notifications.no-legacy`, `units.leak`, `tasks.review`, `activities.*`, `pilot.*`, `frontend.contract`.
- [ ] **Step 3:** Xác nhận CI xanh; ghi kết quả vào mô tả PR cùng dòng "Docs: …" nếu cần.

---

### Task 5: Cập nhật tài liệu và ADR (cùng PR)

**Files:**
- Modify: `docs/dev/email-cron.md` (→ 4.0), `docs/ai/tim-o-dau.md:23,33`, `docs/ops/moi-truong.md:55-60,68`, `docs/dev/api.md:30,60-61`, `docs/dev/developer-3-interface.md:405,435-454`, `docs/playbooks/them-tinh-nang.md:42`, `docs/ba/dieu-hanh-use-case.md:30,71`, `docs/ops/de-xuat-ha-tang.md:86`, `docs/dev/kien-truc.md:20`, `docs/dev/frontend.md:21`, `docs/dev/ranh-gioi-module.md` (dòng "Email & Cron"), `docs/ai/bay-da-gap.md`
- Create: `docs/adr/0013-go-email-cu-va-onesignal.md`
- Modify: `docs/specs/2026-10-02-go-email-cu-plan.md` (`status: active` khi hoàn tất), `docs/specs/2026-10-02-noti-service-design.md` (`related_code` trỏ `services/noti-api/**` khi thư mục có)
- Không sửa: `docs/planning/*` (lịch sử kế hoạch, nhắc OneSignal là bối cảnh cũ)

- [ ] **Step 1: Viết lại `docs/dev/email-cron.md` → version 4.0 (MAJOR)** gồm đúng:
1. **Trạng thái hiện tại:** Core không có module email và không có push OneSignal; chỉ có thông báo trong ứng dụng (bảng `notifications`, chuông, scheduler nhắc hạn 15 phút) và facade `core/src/notifier.js` chưa gửi gì.
2. **Điểm tích hợp cho Noti** — bảng "Bảng sự kiện" ở Task 2 (sự kiện, nơi gọi, `sourceKey`, dữ liệu), kèm "khi Noti sẵn sàng chỉ đổi thân `notifier.notify` thành `POST /v1/notifications`" (SPEC-NOTI-001 §17).
3. **Khoảng trống đã biết:** cột `email_status`/`push_status` còn trong schema nhưng luôn `NULL`; thẻ tên trong bình luận không còn push; không có email nào cho tới khi Noti xong.
4. **Ghi chú lịch sử:** Rule Engine/cron động chỉ có ở nhánh `archive/gd1a-staging`, chưa từng có trên `staging`; các mục cũ về phân quyền và khoá cấu hình bị bỏ vì mô tả code không tồn tại.
5. Dòng lịch sử `| 4.0 | 2026-10-02 | Gỡ module email cũ và OneSignal; viết lại theo hiện trạng staging; thêm bảng điểm tích hợp | DYC |` và `related_code` chỉ gồm glob có thật.

- [ ] **Step 2: Sửa các tài liệu còn lại** (mỗi file tăng version, `updated: 2026-10-02`, thêm dòng lịch sử)

| File | Sửa |
|---|---|
| `docs/ai/tim-o-dau.md` | Dòng email/rule engine → `core/src/notifier.js` + `docs/dev/email-cron.md` + SPEC-NOTI-001; xoá dòng Push OneSignal (hoặc ghi "đã gỡ") |
| `docs/ops/moi-truong.md` §5 | Core không còn gửi email và không còn `ONESIGNAL_*`; giữ phần `ctd-api`; `EMAIL_NOTIFICATIONS_ENABLED` ghi "không còn tác dụng, chờ issue infra" |
| `docs/dev/api.md` | Xoá `POST /api/email/test` (dòng 30), `/api/admin/email/*` (60-61), `/api/push/config` |
| `docs/dev/developer-3-interface.md` | Ví dụ `mailer.notifyDirectiveReceived` → ví dụ `notifier.notify(...)` |
| `docs/playbooks/them-tinh-nang.md` | Dòng 42: "thông báo mới: gọi `notifier.notify`; email do Noti đảm nhận sau" |
| `docs/ba/dieu-hanh-use-case.md` | Dòng 30, 71: không còn nói Rule Engine gửi mail; email là hạng mục Noti |
| `docs/ops/de-xuat-ha-tang.md`, `docs/dev/kien-truc.md` | Bỏ nhắc cron email/rule engine của Core |
| `docs/dev/frontend.md:21` | `notifications.js` là chuông trong ứng dụng, không phải OneSignal |
| `docs/dev/ranh-gioi-module.md` | Sửa dòng "Email & Cron" (các file không tồn tại) và thêm dòng module Noti — **chỉ sau khi issue Task 0 được duyệt** |
| `docs/ai/bay-da-gap.md` | Bẫy mới: "`mailer.notify*` cũ gửi cả email lẫn push; scheduler gắn email vào `inserted` nên mất thư nếu gửi lỗi — facade gọi cho mọi mục, Noti dedupe" |

- [ ] **Step 3: Thêm ADR 0013** `docs/adr/0013-go-email-cu-va-onesignal.md` (frontmatter như ADR 0012; `status: active`; **không** đặt `supersedes`, vì ADR-0004 sẽ bị supersede bởi ADR Noti riêng). Nội dung: bối cảnh (mailer Gmail hardcode, tắt trên cả hai môi trường, OneSignal chưa cấu hình trên VM, tài liệu lệch code), quyết định (gỡ cả hai, thay bằng facade `notifier`), hệ quả (không còn email/push từ Core cho tới khi Noti xong; chuông trong app giữ nguyên).

- [ ] **Step 4: Chạy kiểm tra tài liệu**

```bash
npm run docs:index && npm run docs:check -- --base origin/staging
```

Expected: xanh. Không sửa tay `docs/README.md`.

- [ ] **Step 5: Commit**

```bash
git add docs
git commit -m "docs: legacy email and OneSignal removal — rewrite email-cron, add ADR-0013"
```

---

### Task 6: Kiểm chứng cuối trước khi báo xong

- [ ] **Step 1: Quét sạch dấu vết**

```bash
git grep -nI -i "nodemailer\|mailer\b\|GMAIL_\|MAIL_FROM_NAME\|sendTestEmail\|onesignal\|queuePush" -- core ':!core/package-lock.json' ':!core/node_modules' ':!core/tests/frontend.contract.test.js'
```

Expected: không có kết quả (`docs/specs/`, `docs/planning/`, `docs/adr/0004` được phép còn nhắc).

- [ ] **Step 2: Chạy bộ kiểm trước khi push (AGENTS.md §6)**

```bash
cd core && npm test
cd .. && npm run test:tools && npm run docs:check -- --base origin/staging
```

`npm test` có test DB → xác nhận qua CI. `services/ctd-api` không đổi nên không cần pytest.

- [ ] **Step 3: Kiểm chứng trên staging sau deploy** (người có quyền VM): đăng nhập, giao một việc → chuông hiện thông báo; trang "Nhân sự" không còn nút "Test email"; log container core không còn cảnh báo Gmail/push; Console trình duyệt không có lỗi tải OneSignal.

---

## Self-Review

- **Độ phủ so với "bỏ hoàn toàn email cũ và OneSignal":** `mailer.js`, `push.js` (T2), mọi điểm gọi + scheduler (T2), cảnh báo config (T2), endpoint/UI test + SDK + worker + env + dependency (T3), tài liệu/ADR (T5), phần Nền và infra (T0, tách vì liên module). `services/ctd-api/mailer.py` loại trừ có chủ đích.
- **Placeholder:** không có TBD; các chỗ phụ thuộc môi trường (cổng legacy 401/403, `application.context` ở runtime) đã ghi cách xử lý.
- **Nhất quán tên:** `createNotifier`, `notifier.notify`, `context.notifier`, các `event` trùng bảng template SPEC-NOTI-001 §9 (`activity.proposed`, `activity.participant_added`, `activity.decided`, `task.assigned`, `task.response`, `task.review_requested`, `task.reviewed`, `task.deadline_soon`, `task.overdue`, `task.unacknowledged`).
- **Review Focus:** 1 → T2 grep; 2 → T1 test; 3 → T2 test scheduler; 4 → T2 test DB; 5 → T2/T3 test + grep; 6 → T1 test `invalid-event` + bảng khoảng trống.

## Lịch sử phiên bản

| Version | Ngày | Thay đổi | Người |
|---|---|---|---|
| 2.1 | 2026-10-02 | Đã thực hiện xong (PR #42, CI xanh); chuyển sang active | DYC |
| 2.0 | 2026-10-02 | Viết lại: bỏ cả OneSignal, thay `push-notifier` bằng facade `notifier` chung; tách việc module Nền/infra thành Task 0; bảng sự kiện và khoảng trống dữ liệu từng điểm gọi; scheduler không phụ thuộc `inserted`; sửa lệnh grep/`sed` sai | DYC |
| 1.0 | 2026-10-02 | Bản đầu (hướng tách push-only, đã bị thay) | DYC |
| 2.5 | 2026-10-03 | Ghi chú: `frontend.contract.test.js` thêm test màn hình "Đang phát triển" (SPEC-SOON-001); test chặn UI email cũ giữ nguyên | DYC |
| 2.2 | 2026-10-02 | Facade nay đã có sender sang Noti (PLAN-NOTI-002); không cần đổi thân facade | DYC |
| 2.3 | 2026-10-02 | Ghi chú: migration unit_id đã hotfix, không liên quan plan này | DYC |
| 2.4 | 2026-10-02 | Tăng version khi đồng bộ chỉ mục tài liệu (merge `479c05f`); nội dung không đổi | DYC |
| 2.6 | 2026-10-03 | Sửa hai dòng lịch sử 2.3 và 2.4 bị lỗi mã hoá và nằm nhầm trong bảng phạm vi; khôi phục dòng 2.2, 2.3 bị mất | DYC |
| 2.7 | 2026-10-04 | Thêm core/src/config/database.js vào related_code - cấu hình timezone | DYC |
| 2.8 | 2026-10-08 | Ghi nhận hotfix PR #79: `GET /api/teams` truyền tham số SQL đúng thứ tự (`user_id` cho `can_manage` trước, scope đơn vị sau); trước đó trả rỗng cho mọi tài khoản có id khác unit id; phạm vi kế hoạch không đổi | DYC |
| 2.9 | 2026-10-08 | Ghi nhận hotfix PR #81: trang chi tiết hoạt động tra khung Participants bằng `#participants-head` thay vì qua nút `#volunteer` (nút ẩn khi người xem đã tham gia → lỗi `null.closest`, trang trắng); asset `?v=2.10.1`; phạm vi không đổi | DYC |
| 2.10 | 2026-10-09 | Xác nhận nhánh web đợt 5 không thay đổi hành vi gửi email/OneSignal của kế hoạch này | DYC |
| 3.0 | 2026-10-10 | Liên kết tới hợp đồng phục vụ UI cũ tại `/legacy/` sau cutover frontend Core | DYC |
| 3.1 | 2026-10-10 | Xác nhận bản vá bảo mật #99 trên Core (`directives`, `submissions`, `system`, `tasks`, `Dockerfile`) không thay đổi phạm vi gỡ email cũ | DYC |


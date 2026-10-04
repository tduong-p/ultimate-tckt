---
doc_id: PLAN-NOTI-003
title: Kế hoạch — sửa phần Core của #49 (thông báo Core → Noti)
version: 1.1
status: active
audience: [dev, ai]
owner: TCKT
updated: 2026-10-05
related_code: [core/src/services/deadline-notifications.js, core/src/notifier.js, core/src/noti-sender.js, core/src/routes/activities.js, core/src/routes/tasks.js, core/src/routes/users.js, core/src/date-vn.js]
---

# Sửa phần Core của #49 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** thư Core → Noti không còn gửi sai giờ, trùng, sai người hay mất (mục 1–9 phần Core của #49).

**Architecture:** quy tắc giờ giấc/khoá tách thành hàm thuần (`services/reminder-rules.js`) để test không cần MySQL;
scheduler dùng chúng và dùng cột có sẵn `notifications.email_status` làm trạng thái gửi. Facade `notifier.js` gánh các
luật chung (bỏ người thực hiện, email sai, retry có giới hạn). Route chỉ truyền thêm `actorId` và dữ liệu, người nhận
nghiệm thu gom vào một helper.

**Tech Stack:** Node 22, mysql2, `node:test`.

**Spec:** `docs/specs/2026-10-05-core-noti-49-design.md` (SPEC-NOTI-002 v1.1). Đọc kèm `docs/dev/email-cron.md`.

## Global Constraints

- Không đổi schema, không sửa `services/noti-api/**`, không sửa `core/tests/helpers/**` (hợp đồng dùng chung).
- Khung giờ scheduler: giờ VN 07:00–21:59; ngoài khung không tạo thông báo.
- Nhãn `window`: `"1 ngày"` (hạn = ngày mai), `"hôm nay"` (hạn = hôm nay).
- Khoá: `task-deadline-1d:<task>:<user>:<YYYY-MM-DD hạn>`, `task-deadline-today:<task>:<user>:<YYYY-MM-DD hạn>`,
  `task-overdue:<task>:<user>:<YYYY-MM-DD hôm nay VN>`, `task-unacknowledged:<task>:<member>:<epoch giây assigned_at>`.
- Chưa xác nhận: 24 giờ ≤ tuổi giao việc < 168 giờ.
- Trạng thái task bị loại khỏi mọi nhắc: `review`, `done`, `cancelled`.
- Retry: tối đa 3 lần thử, nghỉ `[1000, 3000]` ms (mặc định), chỉ với lỗi `transient` hoặc timeout.
- Tên miền dành riêng bị chặn: `.local`, `.localhost`, `.test`, `.invalid`, `.example`.
- Cắt `feedback` và `response.body` còn 4000 ký tự.
- Không ghi địa chỉ email đầy đủ hay API key vào log.
- Máy dev hiện không có MySQL: test thuần chạy tại chỗ; test cần DB (`createTestDatabase`) chạy trên CI job `core`
  (MySQL 8) hoặc máy có MySQL theo `docs/ai/kiem-tra.md`. Trước khi chạy: `cd core && npm ci`.

## Review Focus

- Chạy scheduler đúng 22:00 hoặc 06:59 giờ VN → không tạo gì; 07:00 → tạo (Task 3, `isSendingHour`).
- Hạn bị dời sau khi đã nhắc → nhắc lại theo hạn mới, không nhắc lại theo hạn cũ (Task 4, test dời hạn).
- Noti chết lâu hơn mọi lượt retry → thư giữ `pending` và được gửi ở lần chạy sau, không mất (Task 4).
- Người nộp nghiệm thu chính là lead duy nhất của tổ → không tự nhận thư; chuyển admin/vice_admin (Task 5).
- Email người dùng hợp lệ nhưng hoa/thường hoặc có khoảng trắng đầu cuối → vẫn hợp lệ sau `trim().toLowerCase()` (Task 1).

---

### Task 1: Helper email + kiểm email khi tạo/sửa user

**Files:**
- Create: `core/src/email.js`
- Modify: `core/src/routes/users.js` (POST `/api/users` ~dòng 25–52, bulk-import dòng 68, PATCH dòng 84)
- Test: `core/tests/email.test.js` (thuần), `core/tests/users.test.js` (DB)

**Interfaces:**
- Produces: `isDeliverableEmail(email: string): boolean` — nhận chuỗi đã hoặc chưa chuẩn hoá; tự `trim().toLowerCase()`.
  `emailDomain(email: string): string` — phần sau `@` (dùng để log).

- [ ] **Step 1: Test thuần** `core/tests/email.test.js`:
  - đúng: `an@hust.edu.vn`, `  An@HUST.edu.vn `, `user123@example.com`, `a.b+c@sis.hust.edu.vn`
  - sai: `''`, `null`, `an`, `an@`, `@hust.edu.vn`, `an@hust`, `an @hust.edu.vn`, `a@b@hust.edu.vn`,
    `x@tckt.local`, `x@foo.localhost`, `x@a.test`, `x@a.invalid`, `x@a.example`
  - `emailDomain('An@Hust.edu.vn') === 'hust.edu.vn'`
- [ ] **Step 2:** `cd core && node --test tests/email.test.js` → FAIL (module không tồn tại).
- [ ] **Step 3:** Viết `core/src/email.js` (regex cú pháp `^[^\s@]+@[^\s@]+\.[^\s@]+$` + chặn đuôi dành riêng).
- [ ] **Step 4:** Chạy lại → PASS.
- [ ] **Step 5: Test DB** thêm vào `core/tests/users.test.js` theo mẫu `withServer` sẵn có:
  `admin creating or editing a user with an undeliverable email gets 400` — POST `/api/users` với `x@tckt.local` → 400,
  body `{ error: 'Email không hợp lệ.' }`; PATCH user có sẵn đổi email sang `bad@` → 400; email gốc không đổi.
- [ ] **Step 6:** Sửa `users.js`: POST và PATCH trả 400 `Email không hợp lệ.` khi `!isDeliverableEmail(email)`;
  bulk-import thay regex dòng 68 bằng `isDeliverableEmail`.
- [ ] **Step 7:** `node --test tests/email.test.js` PASS; `tests/users.test.js` chạy ở máy có MySQL/CI.
- [ ] **Step 8:** Commit `fix(core): validate user email format (#49 mục 6)`.

### Task 2: Sender — cờ `transient`, cắt `feedback`, nhãn đề án

**Files:**
- Modify: `core/src/noti-sender.js`
- Test: `core/tests/noti-sender.test.js` (thuần)

**Interfaces:**
- Produces: lỗi do `createNotiSender(...)` ném có `error.transient === true` khi: fetch lỗi/abort, HTTP ≥ 500, HTTP 429.
  Lỗi 4xx khác: `transient` không có. `error.status` = mã HTTP (nếu có).

- [ ] **Step 1: Test** thêm vào `noti-sender.test.js`:
  - `5xx, 429 and network failures are transient; 400/401/413 are not` — fetch giả trả 500, 503, 429 → `rejects` với
    `err.transient === true`; 400, 401, 413 → `err.transient` khác `true`; fetch ném `TypeError` → `transient === true`.
  - `a long decision feedback is cut to 4000 characters` — `toNotiPayload` event `task.reviewed`, `feedback` 5000 ký tự
    → `payload.data.feedback.length === 4000`, kết thúc bằng `…`. Tương tự `activity.decided`.
  - `activity.proposed priority and type get Vietnamese labels` — `priority: 'urgent'` → `'Khẩn cấp'`, `'low'` → `'Thấp'`,
    `type: 'event'` → `'Tổ đề xuất'`, `'assigned'` → `'Lãnh đạo giao'`, `'xyz'` giữ nguyên.
  - Cập nhật mảng `callSites` theo dữ liệu mới: `activity.proposed` có `type/deadline/priority`; `task.deadline_soon`
    `window: '1 ngày'`, key `task-deadline-1d:5:7:2026-10-14`; `task.unacknowledged` key `task-unacknowledged:5:8:1791000000`;
    thêm một `activity.decided` không có `activity.path`.
- [ ] **Step 2:** `node --test tests/noti-sender.test.js` → các test mới FAIL.
- [ ] **Step 3:** Sửa `noti-sender.js`: `LABELS` hỗ trợ nhiều trường mỗi event (`activity.proposed`: `activity.priority`,
  `activity.type`); hàm cắt áp cho `response.body` và `feedback` (`MAX_TEXT = 4000`); gắn `transient`/`status` vào lỗi.
- [ ] **Step 4:** Chạy lại → PASS toàn file.
- [ ] **Step 5:** Commit `fix(core): mark transient Noti errors, cut feedback, label proposals (#49 mục 7, 8, 9)`.

### Task 3: Facade notifier — bỏ người thực hiện, email sai, retry

**Files:**
- Modify: `core/src/notifier.js`
- Test: `core/tests/notifier.test.js` (thuần)

**Interfaces:**
- Consumes: `isDeliverableEmail`, `emailDomain` (Task 1); `error.transient` (Task 2).
- Produces: `createNotifier({ logger, sender = null, timeoutMs = 5000, retryDelaysMs = [1000, 3000], sleep })`.
  `notify(event)` với event `{ event, recipient: { id, name, email }, data, sourceKey, actorId? }` trả
  `{ delivered: true }` hoặc `{ delivered: false, reason, retryable? }`; `reason` ∈ `self | invalid-email | invalid-event |
  no-sender | timeout | sender-error`; `retryable: true` chỉ khi lần thử cuối là `transient`/timeout.
  Thứ tự kiểm: `invalid-event` → `self` → `invalid-email` → `no-sender`.

- [ ] **Step 1: Test** thêm vào `notifier.test.js` (dùng `retryDelaysMs: [0, 0]`):
  - `the actor never receives a mail about their own action` — `actorId: 7`, `recipient.id: 7` → `{ delivered:false, reason:'self' }`, sender không được gọi; `actorId: '7'` (chuỗi) cũng bị bỏ.
  - `an undeliverable email is skipped with a warning that has no full address` — `x@tckt.local` → `reason:'invalid-email'`; log warn chứa `tckt.local`, không chứa `x@tckt.local`.
  - `transient failures are retried up to 3 attempts then reported retryable` — sender ném `{transient:true}` 3 lần → gọi 3 lần, `{ delivered:false, reason:'sender-error', retryable:true }`.
  - `a transient failure followed by success is delivered` — lần 1 ném transient, lần 2 OK → `delivered:true`, gọi 2 lần.
  - `a non-transient failure is not retried` — ném `Error('Noti responded 400')` → gọi 1 lần, `retryable` không có.
  - `a hanging attempt times out and is retried` — `timeoutMs: 20`, sender treo → gọi 3 lần, `reason:'timeout', retryable:true`.
  - Các test cũ giữ nguyên và vẫn PASS.
- [ ] **Step 2:** `node --test tests/notifier.test.js` → FAIL.
- [ ] **Step 3:** Sửa `notifier.js`. `sleep` mặc định `ms => new Promise(r => setTimeout(r, ms))`. Không đổi `app.js`
  (dùng mặc định).
- [ ] **Step 4:** Chạy lại → PASS.
- [ ] **Step 5:** Commit `fix(core): notifier drops self/undeliverable recipients and retries transient errors (#49 mục 3, 6, 7)`.

### Task 4: Scheduler nhắc hạn theo ngày lịch + trạng thái gửi

**Files:**
- Create: `core/src/services/reminder-rules.js`
- Modify: `core/src/date-vn.js`, `core/src/services/deadline-notifications.js`
- Test: `core/tests/reminder-rules.test.js` (thuần), `core/tests/services.deadline-notifications.test.js` (DB, viết lại)

**Interfaces:**
- Consumes: kết quả `notify` (Task 3).
- Produces:
  - `date-vn.js`: `hourInVietnam(now: Date): number` (0–23); `addDaysVietnam(now: Date, days: number): string` (YYYY-MM-DD).
  - `reminder-rules.js`:
    - `isSendingHour(now: Date): boolean` — `7 <= hourInVietnam(now) <= 21`.
    - `deadlineWindow(deadlineDay: string, now: Date): null | { code: '1d' | 'today', label: '1 ngày' | 'hôm nay' }`.
    - `isUnacknowledgedDue(assignedAt: Date, now: Date): boolean` — `24h <= now - assignedAt < 168h`.
    - `sourceKeys`: `{ deadline(code, taskId, userId, deadlineDay), overdue(taskId, userId, todayVn), unacknowledged(taskId, memberId, assignedAt: Date) }` → chuỗi đúng mẫu Global Constraints.
    - `emailStatusFor(result): 'success' | 'failed' | 'pending' | null` — delivered → `success`; `retryable` → `pending`; `no-sender` → `null`; còn lại → `failed`.
  - `deadline-notifications.js`: giữ export `runDeadlineNotifications({ db, notifier, logger, now })` trả `{ date, created, skipped? }`; `skipped: 'outside-hours'` khi ngoài khung.

- [ ] **Step 1: Test thuần** `reminder-rules.test.js` (giờ VN = UTC+7; ví dụ 2030-06-15T00:00:00Z là 07:00 VN):
  - `isSendingHour`: `2030-06-14T23:59:00Z` (06:59) false; `2030-06-15T00:00:00Z` (07:00) true; `2030-06-15T14:59:00Z` (21:59) true; `2030-06-15T15:00:00Z` (22:00) false.
  - `deadlineWindow`: now `2030-06-15T02:00:00Z` (09:00 ngày 15): `'2030-06-16'` → `{code:'1d',label:'1 ngày'}`; `'2030-06-15'` → `{code:'today',label:'hôm nay'}`; `'2030-06-17'` và `'2030-06-14'` → `null`. Now `2030-06-14T17:30:00Z` (00:30 ngày 15): `'2030-06-15'` → `today` (ngày theo VN, không theo UTC).
  - `isUnacknowledgedDue`: tuổi 23h59 false, 24h true, 167h59 true, 168h false.
  - `sourceKeys.unacknowledged(5, 8, new Date('2026-10-01T03:00:00Z')) === 'task-unacknowledged:5:8:1790823600'`.
  - `emailStatusFor`: bốn trường hợp như interface.
- [ ] **Step 2:** `node --test tests/reminder-rules.test.js` → FAIL.
- [ ] **Step 3:** Viết `date-vn.js` (thêm hai hàm, dùng `Intl` như `dateInVietnam`) và `reminder-rules.js`.
- [ ] **Step 4:** Chạy lại → PASS.
- [ ] **Step 5: Test DB** viết lại `services.deadline-notifications.test.js`. Mỗi test truyền `now` cố định trong khung
  giờ (ví dụ `new Date('2030-06-15T02:00:00Z')`), đặt `deadline` bằng chuỗi `addDaysVietnam(now, n)` và `assigned_at`
  bằng `Date` tính từ `now`. Notifier giả ghi lại event và trả kết quả cấu hình được. Các test:
  - `outside sending hours nothing is created or sent` — now 22:00 VN, task hạn ngày mai → `skipped:'outside-hours'`, 0 dòng, 0 event.
  - `deadline tomorrow sends one "1 ngày" reminder; today sends one "hôm nay"; reruns do not resend` — chạy 2 lần → mỗi user đúng 1 event mỗi loại, `data.window` đúng nhãn, `sourceKey` đúng mẫu; dòng `email_status='success'`.
  - `moving the deadline sends a reminder for the new date only` — chạy, đổi `deadline` sang ngày mai khác (+1), chạy với now +1 ngày → 1 event key hạn mới; key hạn cũ không xuất hiện lần hai.
  - `tasks in review, done or cancelled are never reminded` — ba task hạn ngày mai + một task quá hạn ở `review` → 0 event.
  - `unacknowledged: inactive lead or member, self-assigned, older than 7 days are skipped` — 4 tình huống → 0 event; một tình huống hợp lệ (30h) → 1 event key có epoch.
  - `a transient Noti failure keeps the row pending and the next run sends it` — notifier trả `{delivered:false,reason:'sender-error',retryable:true}` lần đầu, `{delivered:true}` lần sau → lần 1 `pending`, lần 2 gọi lại đúng 1 lần và thành `success`; lần 3 không gọi.
  - `permanent skips and no-sender are never retried` — trả `reason:'self'` → `failed`; `reason:'no-sender'` → `NULL`; chạy lại → không gọi thêm.
- [ ] **Step 6:** Viết lại `deadline-notifications.js`:
  - Đầu hàm: xoá thông báo hết hạn; `if (!isSendingHour(now)) return { date, created: 0, skipped: 'outside-hours' }`.
  - Truy vấn nhắc hạn: `DATE_FORMAT(t.deadline,'%Y-%m-%d') AS deadline_day … WHERE t.status NOT IN ('review','done','cancelled') AND t.deadline IN (?, ?)` với `[today, tomorrow]`; window từ `deadlineWindow`.
  - Trễ hạn: `t.deadline < ?` với `today`, loại cùng ba trạng thái.
  - Chưa xác nhận: `member.is_active=1`, `lead.is_active=1`, `t.assigned_by <> ta.user_id`, trả `ta.assigned_at`; lọc tuổi bằng `isUnacknowledgedDue` trong Node.
  - Mỗi mục: `INSERT IGNORE … email_status='pending'`; rồi `SELECT email_status` của `(user_id, source_key)`; chỉ khi `pending` mới `await notifier.notify(...)` và `UPDATE notifications SET email_status=? WHERE user_id=? AND source_key=?` theo `emailStatusFor`. Gửi tuần tự (`await`) để không bắn hàng loạt request đồng thời.
  - Nội dung trong app: `"<task>" trong "<activity>" sẽ đến hạn vào ngày mai (DD/MM).` / `"<task>" trong "<activity>" đến hạn hôm nay.`
  - Giữ export và chữ ký `findOverdueTasks(db, now)`, `findUpcomingDeadlines(db, now)` (dùng ở
    `tests/pilot.vn-date.test.js`; `findUpcomingDeadlines` trả task hạn hôm nay hoặc ngày mai theo giờ VN, kèm
    `deadline_day`), `startDeadlineNotificationScheduler` (dùng ở `runtime.js`), `dateInVietnam`. `pilot.vn-date.test.js` phải PASS không sửa.
- [ ] **Step 7:** `node --test tests/reminder-rules.test.js` PASS; test DB chạy ở máy có MySQL/CI.
- [ ] **Step 8:** Commit `fix(core): calendar-day deadline reminders, sending hours, delivery status (#49 mục 1, 2, 4, 8a)`.

### Task 5: Route — `actorId`, người nhận nghiệm thu, dữ liệu đề án

**Files:**
- Create: `core/src/services/notification-recipients.js`
- Modify: `core/src/routes/activities.js` (dòng 58 tạo đề án, 70–71 nộp lại, 152 response, 195 giao việc, 224–226 quyết định, 321–332 log-task), `core/src/routes/tasks.js` (104–109 nộp nghiệm thu, 144 nghiệm thu)
- Test: `core/tests/notifications.routes.test.js` (DB, mới)

**Interfaces:**
- Produces: `findReviewRecipients(db, { teamId: number, activityId: number, actorId: number }): Promise<Array<{id, name, email}>>` —
  lead/vice-lead đang hoạt động của tổ ∪ event_lead đang hoạt động của hoạt động, bỏ `actorId`, khử trùng theo `id`;
  rỗng → mọi user `role IN ('admin','vice_admin') AND is_active=1` trừ `actorId`.

- [ ] **Step 1: Test** `notifications.routes.test.js`. Không sửa `tests/helpers/server.js`; trong file tự dựng server
  ghi lại event:
  ```js
  const { createApplication } = require('../src/app');
  // Giống testConfig trong helpers/server.js; cần notiSender ghi lại nên không dùng startTestServer.
  function startRecordingServer(db) { const sent = []; const { app } = createApplication({ db, config: { packageInfo: require('../package.json'), isProduction: false, hasConfiguredDatabase: false, sessionSecret: 'test-secret', microsoftSso: { tenant: 'hust.edu.vn', clientId: '', clientSecret: '', redirectUri: '', allowedDomain: 'hust.edu.vn' } }, notiSender: async e => { sent.push(e); } }); /* listen như helpers/server.js; trả { client, close, sent } */ }
  ```
  Kèm `waitFor(fn, ms = 2000)` chờ event (route gửi sau khi trả response). Các test:
  - `review request reaches team leads and the event lead, never the submitter` — tổ có lead L, hoạt động event_lead E; member nộp → event `task.review_requested` tới L và E, không tới member.
  - `a lead submitting their own task with no other reviewer falls back to admins` — lead duy nhất tự nộp → tới admin, không tới lead.
  - `self-logged task notifies the same reviewers in mail and in-app` — log-task → `notifications` kind `task_review` cho đúng tập người nhận như event.
  - `rejecting a proposal sends activity.decided without a link` — admin từ chối → `data.activity.path` không có; duyệt → có path.
  - `proposal mails carry type, deadline and priority and go to admin and vice_admin` — tạo đề án và nộp lại → cả admin và vice_admin nhận; `data.activity.type/deadline/priority` có mặt.
  - `a leader assigning a task to themselves gets no mail` — giao việc cho chính mình → không có `task.assigned` tới leader.
- [ ] **Step 2:** Chạy ở máy có MySQL/CI → FAIL.
- [ ] **Step 3:** Viết `notification-recipients.js`; dùng ở `tasks.js` submit-review và `activities.js` log-task (thay truy vấn lead/vice-lead; thông báo trong app của log-task dùng cùng danh sách).
- [ ] **Step 4:** Mọi `notifier.notify` trong `routes/**` thêm `actorId: req.actor.id`.
- [ ] **Step 5:** `activity.decided`: truy vấn creator thêm `AND is_active=1`; khi `nextStatus === 'cancelled'` bỏ `path` khỏi `data.activity`.
- [ ] **Step 6:** `activity.proposed` (tạo + nộp lại): người nhận `role IN ('admin','vice_admin') AND is_active=1`; `data.activity` thêm `type`, `deadline`, `priority` (lúc nộp lại đọc từ bảng `activities`).
- [ ] **Step 7:** `grep -n "notifier.notify" core/src/routes/*.js` → mọi dòng có `actorId`. Chạy `node --test tests/noti-sender.test.js tests/notifier.test.js` PASS.
- [ ] **Step 8:** Commit `fix(core): route notifications skip the actor, reach every reviewer, carry proposal data (#49 mục 3, 5, 8b, 9)`.

### Task 6: Dọn dẹp, tài liệu, kiểm tra cuối

**Files:**
- Delete: `core/test-debug.js`
- Modify: `docs/dev/email-cron.md` (bảng "Điểm tích hợp", đoạn "Scheduler gọi facade cho mọi mục", "Khoảng trống đã biết"),
  `docs/ai/bay-da-gap.md` (mục "`mailer.notify*` cũ…": cách mới dùng `email_status`; thêm bẫy `DATE` = 00:00 làm nhắc hạn sai giờ),
  `docs/dev/mui-gio.md` (nhắc hạn theo ngày lịch, khung giờ 07:00–21:59), `docs/specs/2026-10-02-noti-service-design.md`
  (SPEC-NOTI-001) chỉ nếu có mô tả khoá Core cũ, `docs/specs/2026-10-05-core-noti-49-plan.md` (đánh dấu xong).
  Mỗi tài liệu sửa: tăng `version` (MINOR), `updated: <ngày làm>`, thêm dòng lịch sử.

- [ ] **Step 1:** `git rm core/test-debug.js`.
- [ ] **Step 2:** Sửa tài liệu như trên.
- [ ] **Step 3:** `npm run docs:index && npm run docs:check -- --base origin/staging` → `docs ok`.
- [ ] **Step 4:** `cd core && node --test tests/email.test.js tests/noti-sender.test.js tests/notifier.test.js tests/reminder-rules.test.js` → PASS; `npm test` đầy đủ ở máy có MySQL hoặc CI job `core` xanh trên PR.
- [ ] **Step 5:** Commit `docs: cập nhật email-cron, bẫy, múi giờ theo bản sửa #49; xoá test-debug.js`.
- [ ] **Step 6:** Mở PR vào `staging`, mô tả liệt kê mục 1–9 đã sửa, ghi "phần Noti của #49 chưa làm (cổng M2 #63)",
  yêu cầu reviewer DYC và TCKT; không đóng #49.

## Lịch sử phiên bản

| Version | Ngày | Thay đổi |
|---|---|---|
| 1.0 | 2026-10-05 | Bản đầu. |
| 1.1 | 2026-10-05 | Task 1–6 đã làm xong trên nhánh `fix/core-noti-49` (còn mở PR vào `staging`). |

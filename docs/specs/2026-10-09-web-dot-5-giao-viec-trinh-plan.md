---
doc_id: PLAN-WEBP5-001
title: Kế hoạch triển khai — web/ đợt 5 (Giao việc và Trình)
version: 1.0
status: active
audience: [dev, ai]
owner: DYC
updated: 2026-10-09
related_code: []
---

# web/ đợt 5 — Giao việc (chỉ đạo) và Trình Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Làm thật hai màn "Giao việc" (`#/directives`, `#/directive/:id`) và "Trình" (`#/submissions`, `#/submission/:id`) trên `web/`, dùng API `/api/directives` và `/api/submissions` đã có, kèm hai sửa lỗi nhỏ phía Core mà đợt này bắt buộc phải có để API dùng được thật.

**Architecture:** Hai task Core đầu tiên (a) nạp `modules` vào `req.unit` và `session.units.current` — hiện không ai nạp nên cổng `dieu-hanh` của `/api/directives` và `/api/submissions` trả 403 cho mọi người trừ DYC; (b) thêm tên đơn vị/người vào dữ liệu trả về và một endpoint danh sách đơn vị nhận. Phần `web/` thêm: tầng API (`directives.ts`, `submissions.ts`), một file bảng điều kiện quyền thuần (`permissions.ts`, chép từ code route), các màn và hộp thoại trong `web/src/core/features/{dieuhanh,directives,submissions}/`, rồi nối route + menu.

**Tech Stack:** Core: Node/Express + MySQL, `node --test`. Web: React 18, TypeScript, Vite, Vitest + jsdom + @testing-library/react 14, @tanstack/react-query 5, react-router-dom 6.30, Atlaskit (`modal-dialog`, `button/new`, `textfield`, `textarea`, `lozenge`, `icon/core/*`).

**Spec:** `docs/specs/2026-10-09-web-hoan-thien-thay-the-design.md` (SPEC-WEB-003, mục 3.4 và 4.7). Đợt này phụ thuộc đợt 0 (đã xong trên nhánh `feature/web-hoan-thien-spec`). Độc lập với đợt 1–4.

## Global Constraints

- Chỉ tiếng Việt trong giao diện. Không có ô tải tệp (đợt này không có tệp nào).
- Việc chạm `core/` giới hạn ở đúng hai task 1–2 (người dùng đã miễn họp team cho chương trình này; ghi rõ trong PR). **Chỉ thêm**: không đổi hành vi hay mã lỗi của endpoint đang có, ngoài việc cổng `dieu-hanh` bắt đầu cho đơn vị có module đi qua (đúng ý định thiết kế).
- Core test dùng MySQL thật và chạy trên CI (không có MySQL local). Local chỉ chạy được `node --test tests/directives.test.js` (mock). Theo thoả thuận của repo: gom test đỏ, đẩy một lần cho cả task 1–2 rồi đọc CI.
- Quyền hiển thị nút **chép từ code route** (`core/src/routes/directives.js`, `submissions.js`), tính theo `req.unitRole` + `req.unit` (INV-AUTH-001), không dùng `users.role`. Bảng điều kiện nằm ở Task 4 và là nguồn duy nhất cho mọi màn của đợt này; màn không tự viết điều kiện vai trò.
- Mục menu "Giao việc" và "Trình" chỉ hiện khi đơn vị hiện tại có module `dieu-hanh` (hoặc là đơn vị `platform_owner`, vì server cho DYC qua cổng). Route không đạt điều kiện này → về `#/dashboard`.
- Dữ liệu ngày dùng `formatVnDate`/`todayVnKey` (`web/src/shared/utils/date.ts`), không cắt chuỗi ISO (bất biến 7).
- Lỗi API hiện qua `apiErrorMessage(err)`; không tự dịch lại câu tiếng Việt server đã trả.
- Thao tác ghi dùng `useMutation`; thành công thì `invalidateQueries` theo `DIRECTIVES_KEY`/`SUBMISSIONS_KEY`; lỗi hiện `toast.error`.
- Kiểm tra trước khi báo xong: `cd web && npm test && npm run build`; `npm run test:tools`; `npm run docs:index && npm run docs:check -- --base origin/staging` (sau khi commit); `cd core && npm test` xanh trên CI.
- Commit kết thúc bằng `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.

## Review Focus

- **Lỗi nền đã phát hiện:** `req.unit` không có `modules`, nên với người dùng thật `GET /api/directives` trả 403 "Forbidden" (test cũ chỉ qua vì tự gán `modules` vào mock). Test thật ở Task 1 phải đỏ trước khi sửa.
- Rò rỉ: `VPD` (không có `dieu-hanh`) vẫn 403 trên `GET /api/directives/units`; `units.leak.test.js` phải xanh (Task 2).
- Nút ẩn/hiện đúng bảng điều kiện: Tiếp nhận chỉ cho admin/vice_admin của **đơn vị nhận**; Đánh giá chỉ BTV/DYC; Rút lại chỉ admin/vice_admin của **đơn vị gửi** khi chưa có phản hồi (Task 4, 6, 8).
- Server không kiểm `to_unit_id` khi tiếp nhận/nộp/gắn hoạt động và không kiểm `withdrawn_at` khi phản hồi trình — UI chặt hơn server (ghi ở "Quyết định"), nhưng server vẫn là nơi chặn cuối.
- Lỗi 403/400 của server hiện bằng tiếng Việt, không treo hộp thoại (Task 6, 7, 8).

## Quyết định (spec để ngỏ hoặc lệch code)

1. **Spec nói "API đã có" nhưng cổng module hỏng trong thực tế** (xem Architecture). Sửa ở Task 1; không có task này thì đợt 5 không dùng được trên staging.
2. **Dữ liệu trả về chỉ có id** (`from_unit_id`, `owner_user_id`…). Task 2 thêm các trường tên (`from_unit_name`, `to_unit_name`, `created_by_name`, `owner_name`, `submitted_by_name`, `responded_by_name`, `source_title`) — chỉ thêm trường, không đổi trường cũ. Thêm `GET /api/directives/units` (đơn vị có module `dieu-hanh`) vì `GET /api/units` chỉ trả đơn vị của chính người dùng, BTV không thấy được TCKT để giao việc.
3. **Menu**: hiện cho mọi vai trò của đơn vị có `dieu-hanh` (server cho mọi vai trò đọc); phần "vai trò phù hợp" của spec được thực hiện ở mức từng nút.
4. **UI chặt hơn server ở chỗ server bỏ ngỏ**: nút Tiếp nhận / Gắn hoạt động / Nộp kết quả chỉ hiện khi `directive.to_unit_id` là đơn vị hiện tại; Gắn hoạt động và Nộp kết quả cho admin/vice_admin/leader/vice_leader hoặc người phụ trách (`owner_user_id`). Nút Đánh giá chỉ khi `status='submitted'`.
5. **Nộp kết quả của chỉ đạo** chọn nguồn từ các hoạt động đã gắn với chỉ đạo (`detail.activities`), vì `ops_log` chưa có API (đợt 6) và `report` không có bản ghi để chọn. Chưa gắn hoạt động nào thì nút Nộp kết quả vẫn hiện nhưng hộp thoại báo "Hãy gắn ít nhất một hoạt động trước".
6. **Tạo trình** từ trang "Trình" chọn nguồn `activity`. Nguồn `ops_log` (đợt 6) và các nơi khác dùng thành phần `CreateSubmissionButton` truyền `preset` (`sourceType`, `sourceId`, `label`) — đợt 6 chỉ cần gắn nút này vào nhật ký, không viết lại hộp thoại.
7. **Trình có `directive_id`**: server không đổi trạng thái chỉ đạo khi phản hồi trình (chỉ `POST /directives/:id/respond` đổi). Theo spec, trang Trình vẫn cho chọn `accepted`/`revision_requested` khi có `directive_id`, kèm dòng gợi ý "Để kết thúc chỉ đạo, đánh giá tại trang Giao việc"; sau khi phản hồi cả hai cache đều được làm mới. Không đổi server.
8. **Rút lại trình**: chỉ admin/vice_admin của đơn vị gửi khi chưa có phản hồi và chưa rút (server chỉ kiểm vai trò + `response IS NULL`). Trình đã rút bị ẩn nút phản hồi (server không chặn).
9. Trạng thái `pending` được server nhận cho Tiếp nhận nhưng không có trong ENUM; UI chỉ coi `sent` là chờ tiếp nhận (kèm `pending` trong hàm điều kiện cho khớp server).
10. Thanh tiến độ (`progress_percent` trong `docs/ba/dieu-hanh-use-case.md`) chưa có ở API → không làm.
11. Nâng cấp `PageLayout`: thêm prop `canViewDieuHanh` (giống `canViewReports`) và `alsoPaths` cho mục menu để `#/directive/7` tô sáng "Giao việc". Đợt 6 dùng lại cơ chế này cho "Nhật ký trực ban"; mục "SẮP CÓ" chỉ còn "Nhật ký trực ban" cho tới khi đợt 6 xong. Nếu đợt khác sửa `PageLayout.tsx`, gộp tay khi rebase.

---

## File Structure

| File | Trách nhiệm |
|---|---|
| `core/src/middleware/unit-context.js` (sửa) | `loadUnitModules`; `req.unit.modules` |
| `core/src/routes/system.js` (sửa) | `POST /api/session/unit` cũng trả `modules` |
| `core/src/routes/dieu-hanh-names.js` (mới) | Gắn tên đơn vị/người/hoạt động vào dòng chỉ đạo và trình |
| `core/src/routes/directives.js`, `submissions.js` (sửa) | Dùng helper tên; thêm `GET /api/directives/units` |
| `core/tests/dieu-hanh.access.test.js` (mới) | Test thật: cổng module qua session thật |
| `core/tests/dieu-hanh.names.test.js` (mới) | Test thật: tên + danh sách đơn vị + rò rỉ |
| `web/src/core/api/dieuHanhTypes.ts` (mới) | Kiểu `Directive`, `Submission`, … |
| `web/src/core/api/directives.ts`, `submissions.ts` (mới) | Hàm gọi API |
| `web/src/core/api/types.ts`, `errorMessages.ts`, `index.ts` (sửa) | `SessionUnit.modules`, dịch "Forbidden", re-export |
| `web/src/core/features/dieuhanh/permissions.ts` (mới) | Bảng điều kiện quyền (thuần) |
| `web/src/core/features/dieuhanh/useDhActor.ts` (mới) | Hook người thao tác |
| `web/src/core/features/dieuhanh/labels.ts` (mới) | Nhãn trạng thái, nguồn |
| `web/src/core/features/dieuhanh/queryKeys.ts` (mới) | Key cache |
| `web/src/core/features/dieuhanh/parts.tsx` (mới) | `StatusLozenge`, `SelectField`, `FormDialog`, `ErrorText` |
| `web/src/core/features/dieuhanh/testUtils.tsx` (mới) | `renderDh` cho test |
| `web/src/core/features/directives/DirectivesView.tsx`, `CreateDirectiveModal.tsx` (mới) | Danh sách + tạo chỉ đạo |
| `web/src/core/features/directives/DirectiveDialogs.tsx`, `DirectiveDetailView.tsx` (mới) | Chi tiết + 3 hộp thoại |
| `web/src/core/features/submissions/SubmissionsView.tsx`, `CreateSubmissionModal.tsx`, `CreateSubmissionButton.tsx` (mới) | Danh sách + tạo trình |
| `web/src/core/features/submissions/SubmissionDetailView.tsx` (mới) | Chi tiết + phản hồi + rút lại |
| `web/src/shared/layouts/PageLayout.tsx` (sửa) | Menu Giao việc/Trình theo module |
| `web/src/core/AppRoutes.tsx`, `main.tsx` (sửa) | Route + chặn module |

Mọi lệnh web chạy trong `web/` (một file: `npx vitest run <đường dẫn>`). Mọi lệnh Core chạy trong `core/`.

---

### Task 1: Core — nạp `modules` vào ngữ cảnh đơn vị và session

**Files:**
- Modify: `core/src/middleware/unit-context.js`, `core/src/routes/system.js`
- Test: `core/tests/dieu-hanh.access.test.js` (mới)

**Interfaces:**
- Produces: `loadUnitModules(db, unitId): Promise<string[]>` (export từ `unit-context.js`); `req.unit.modules: string[]`; `GET /api/session` và `POST /api/session/unit` trả `units.current.modules`.

- [ ] **Step 1: Viết test hỏng (DB thật)**

```js
// core/tests/dieu-hanh.access.test.js
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { createTestDatabase } = require('./helpers/db');
const { startTestServer } = require('./helpers/server');
const { createUser, unitIdByCode } = require('./helpers/fixtures');

test('BTV có module dieu-hanh: session trả modules và /api/directives qua cổng', async () => {
  const { pool, teardown } = await createTestDatabase();
  const { client, close } = await startTestServer(pool);
  try {
    const btv = await createUser(pool, { role: 'member', units: [['BTV', 'btv_lead']] });
    await client.login(btv.email, btv.password);
    const session = await client.request('GET', '/api/session');
    assert.equal(session.json.units.current.code, 'BTV');
    assert.ok(session.json.units.current.modules.includes('dieu-hanh'));
    const list = await client.request('GET', '/api/directives');
    assert.equal(list.status, 200);
    assert.deepEqual(list.json.data, []);
    const subs = await client.request('GET', '/api/submissions');
    assert.equal(subs.status, 200);
  } finally { await close(); await teardown(); }
});

test('đơn vị không có dieu-hanh (VPD) vẫn 403, modules không chứa dieu-hanh', async () => {
  const { pool, teardown } = await createTestDatabase();
  const { client, close } = await startTestServer(pool);
  try {
    const vpd = await createUser(pool, { role: 'member', units: [['VPD', 'officer']] });
    await client.login(vpd.email, vpd.password);
    const session = await client.request('GET', '/api/session');
    assert.ok(!session.json.units.current.modules.includes('dieu-hanh'));
    assert.equal((await client.request('GET', '/api/directives')).status, 403);
    assert.equal((await client.request('GET', '/api/submissions')).status, 403);
  } finally { await close(); await teardown(); }
});

test('đổi đơn vị sang TCKT thì POST /api/session/unit trả modules mới và qua cổng', async () => {
  const { pool, teardown } = await createTestDatabase();
  const { client, close } = await startTestServer(pool);
  try {
    const user = await createUser(pool, { role: 'admin', units: [['VPD', 'officer'], ['TCKT', 'admin']] });
    await client.login(user.email, user.password);
    assert.equal((await client.request('GET', '/api/directives')).status, 403);
    const switched = await client.request('POST', '/api/session/unit', { body: { unit_id: await unitIdByCode(pool, 'TCKT') } });
    assert.equal(switched.status, 200);
    assert.ok(switched.json.units.current.modules.includes('dieu-hanh'));
    assert.equal((await client.request('GET', '/api/directives')).status, 200);
  } finally { await close(); await teardown(); }
});
```

- [ ] **Step 2: Chạy, xác nhận hỏng**

Không có MySQL local: để Step 4 đẩy lên CI. Dự kiến đỏ: `Cannot read properties of undefined (reading 'includes')` ở `modules` và `403 !== 200` ở `/api/directives`.

- [ ] **Step 3: Viết code**

`core/src/middleware/unit-context.js` — thêm hàm sau `legacyRole` (trước `createUnitContextMiddleware`):

```js
/**
 * Module đang bật của một đơn vị (bảng unit_modules).
 * Cổng của /api/directives và /api/submissions đọc `req.unit.modules`.
 * @param {import('mysql2/promise').Pool} db
 * @param {number} unitId
 * @returns {Promise<string[]>}
 */
async function loadUnitModules(db, unitId) {
  const [rows] = await db.execute('SELECT module_id FROM unit_modules WHERE unit_id = ? ORDER BY module_id', [unitId]);
  return rows.map(r => r.module_id);
}
```

Trong middleware, thay dòng `req.unit = { id: current.unit_id, code: current.code, name: current.name, kind: current.kind };` bằng:

```js
      req.unit = {
        id: current.unit_id, code: current.code, name: current.name, kind: current.kind,
        modules: await loadUnitModules(db, current.unit_id)
      };
```

Sửa `module.exports` thành `module.exports = { createUnitContext, createUnitContextMiddleware, legacyRole, sessionView, loadUnitModules };`.

`core/src/routes/system.js`:
- Dòng import: `const { sessionView } = require('../middleware/unit-context');` → `const { sessionView, loadUnitModules } = require('../middleware/unit-context');`
- Route đổi đơn vị chuyển sang `asyncRoute` và nạp modules:

```js
router.post('/api/session/unit', auth, asyncRoute(async (req, res) => {
  const unitId = Number(req.body.unit_id);
  const m = req.memberships.find(x => x.unit_id === unitId);
  if (!m) {
    return res.status(403).json({ error: 'Bạn không thuộc đơn vị này.' });
  }

  // Update session và request context
  req.session.current_unit_id = unitId;
  req.unit = { id: m.unit_id, code: m.code, name: m.name, kind: m.kind, modules: await loadUnitModules(db, m.unit_id) };
  req.unitRole = m.role;

  // Return updated session view
  const view = sessionView(req);
  res.json({ ...view, user: withHustIdentity(view.user) });
}));
```

- [ ] **Step 4: Kiểm tra không vỡ test cũ, rồi gom đẩy CI cùng Task 2**

```bash
grep -rn "deepEqual" tests | grep -i "current\|json.unit\b\|req.unit"
```
Expected: không dòng nào so sánh nguyên đối tượng `unit`; nếu có, thêm `modules` vào giá trị mong đợi. Chạy `node --test tests/directives.test.js` (mock, local) — Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add core/src/middleware/unit-context.js core/src/routes/system.js core/tests/dieu-hanh.access.test.js
git commit -m "fix(core): nạp modules vào req.unit và session để cổng dieu-hanh hoạt động"
```

---

### Task 2: Core — tên đơn vị/người trong chỉ đạo, trình và danh sách đơn vị nhận

**Files:**
- Create: `core/src/routes/dieu-hanh-names.js`
- Modify: `core/src/routes/directives.js`, `core/src/routes/submissions.js`
- Test: `core/tests/dieu-hanh.names.test.js` (mới)

**Interfaces:**
- Consumes: `req.unit.modules` (Task 1).
- Produces:
  - `withDirectiveNames(db, rows)` thêm `from_unit_name`, `to_unit_name`, `created_by_name`, `owner_name`.
  - `withSubmissionNames(db, rows)` thêm `from_unit_name`, `to_unit_name`, `submitted_by_name`, `responded_by_name`, `source_title` (chỉ khi `source_type='activity'`, còn lại `null`).
  - `GET /api/directives` → `{ data }` (đã có tên); `GET /api/directives/:id` → chỉ đạo + `submissions` (có tên) + `activities`; `GET /api/submissions` → `{ data }`; `GET /api/submissions/:id` → một dòng (có tên).
  - `GET /api/directives/units` → `{ data: [{ id, code, name, kind }] }`: đơn vị đang hoạt động có module `dieu-hanh`. Đặt **trước** `/api/directives/:id`.

- [ ] **Step 1: Viết test hỏng (DB thật)**

```js
// core/tests/dieu-hanh.names.test.js
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { createTestDatabase } = require('./helpers/db');
const { startTestServer } = require('./helpers/server');
const { createUser, createTeam, createActivity, unitIdByCode } = require('./helpers/fixtures');

async function unitName(pool, code) {
  const [[row]] = await pool.execute('SELECT name FROM org_units WHERE code=?', [code]);
  return row.name;
}

test('danh sách và chi tiết chỉ đạo có tên đơn vị và người; trình có source_title', async () => {
  const { pool, teardown } = await createTestDatabase();
  const { client, close } = await startTestServer(pool);
  try {
    const btv = await createUser(pool, { name: 'Lê BTV', role: 'member', units: [['BTV', 'btv_lead']] });
    const tcktAdmin = await createUser(pool, { name: 'Trần Admin', role: 'admin' });
    const tcktId = await unitIdByCode(pool, 'TCKT');

    await client.login(btv.email, btv.password);
    const created = await client.request('POST', '/api/directives', { body: { to_unit_id: tcktId, title: 'Chỉ đạo A', deadline: '2026-12-01' } });
    assert.equal(created.status, 201);
    const directiveId = created.json.id;

    const list = await client.request('GET', '/api/directives');
    assert.equal(list.status, 200);
    assert.equal(list.json.data[0].from_unit_name, await unitName(pool, 'BTV'));
    assert.equal(list.json.data[0].to_unit_name, await unitName(pool, 'TCKT'));
    assert.equal(list.json.data[0].created_by_name, 'Lê BTV');
    assert.equal(list.json.data[0].owner_name, null);

    await client.login(tcktAdmin.email, tcktAdmin.password);
    assert.equal((await client.request('POST', `/api/directives/${directiveId}/acknowledge`, { body: { owner_user_id: tcktAdmin.id } })).status, 200);
    const teamId = await createTeam(pool);
    const activityId = await createActivity(pool, { team_id: teamId, creator_id: tcktAdmin.id, status: 'approved', title: 'Hoạt động gắn chỉ đạo' });
    assert.equal((await client.request('POST', `/api/directives/${directiveId}/link-activity`, { body: { activity_id: activityId } })).status, 200);
    const submitted = await client.request('POST', `/api/directives/${directiveId}/submit`, { body: { source_type: 'activity', source_id: activityId, note: 'Đã xong' } });
    assert.equal(submitted.status, 201);

    const detail = await client.request('GET', `/api/directives/${directiveId}`);
    assert.equal(detail.status, 200);
    assert.equal(detail.json.owner_name, 'Trần Admin');
    assert.equal(detail.json.activities.length, 1);
    assert.equal(detail.json.submissions[0].source_title, 'Hoạt động gắn chỉ đạo');
    assert.equal(detail.json.submissions[0].submitted_by_name, 'Trần Admin');

    const sub = await client.request('GET', `/api/submissions/${submitted.json.id}`);
    assert.equal(sub.json.from_unit_name, await unitName(pool, 'TCKT'));
    assert.equal(sub.json.source_title, 'Hoạt động gắn chỉ đạo');
    const subs = await client.request('GET', '/api/submissions');
    assert.equal(subs.json.data[0].to_unit_name, await unitName(pool, 'BTV'));
  } finally { await close(); await teardown(); }
});

test('GET /api/directives/units chỉ trả đơn vị có dieu-hanh; VPD bị 403; DYC không bị 403', async () => {
  const { pool, teardown } = await createTestDatabase();
  const { client, close } = await startTestServer(pool);
  try {
    const btv = await createUser(pool, { role: 'member', units: [['BTV', 'btv_lead']] });
    const vpd = await createUser(pool, { role: 'member', units: [['VPD', 'officer']] });
    const dyc = await createUser(pool, { role: 'admin', units: [['DYC', 'dyc_admin']] });

    await client.login(btv.email, btv.password);
    const res = await client.request('GET', '/api/directives/units');
    assert.equal(res.status, 200);
    const codes = res.json.data.map(u => u.code);
    assert.ok(codes.includes('TCKT') && codes.includes('BTV'));
    assert.ok(!codes.includes('VPD'));
    assert.deepEqual(Object.keys(res.json.data[0]).sort(), ['code', 'id', 'kind', 'name']);

    await client.login(vpd.email, vpd.password);
    assert.equal((await client.request('GET', '/api/directives/units')).status, 403);
    await client.login(dyc.email, dyc.password);
    assert.notEqual((await client.request('GET', '/api/directives/units')).status, 403);
  } finally { await close(); await teardown(); }
});
```

- [ ] **Step 2: Chạy, xác nhận hỏng**

`node --test tests/directives.test.js` (local, mock) vẫn xanh ở trạng thái hiện tại. Test mới đỏ trên CI: `from_unit_name` undefined và `/api/directives/units` bị `/:id` bắt (404 "Không tìm thấy chỉ đạo").

- [ ] **Step 3: Viết code**

```js
// core/src/routes/dieu-hanh-names.js
'use strict';

/** Map id → giá trị của `column` trong `table` (table/column là hằng trong code, không đến từ người dùng). */
async function labelMap(db, table, column, ids) {
  const unique = [...new Set(ids.filter(id => id !== null && id !== undefined))];
  if (!unique.length) return new Map();
  const [rows] = await db.execute(
    `SELECT id, ${column} AS label FROM ${table} WHERE id IN (${unique.map(() => '?').join(',')})`,
    unique
  );
  return new Map((rows || []).map(r => [r.id, r.label]));
}

/** Gắn tên đơn vị gửi/nhận, người tạo và người phụ trách vào các dòng chỉ đạo. */
async function withDirectiveNames(db, rows) {
  if (!rows.length) return rows;
  const units = await labelMap(db, 'org_units', 'name', rows.flatMap(r => [r.from_unit_id, r.to_unit_id]));
  const users = await labelMap(db, 'users', 'name', rows.flatMap(r => [r.created_by, r.owner_user_id]));
  return rows.map(r => ({
    ...r,
    from_unit_name: units.get(r.from_unit_id) ?? null,
    to_unit_name: units.get(r.to_unit_id) ?? null,
    created_by_name: users.get(r.created_by) ?? null,
    owner_name: users.get(r.owner_user_id) ?? null
  }));
}

/** Gắn tên đơn vị, người nộp/phản hồi và tiêu đề hoạt động nguồn vào các dòng trình. */
async function withSubmissionNames(db, rows) {
  if (!rows.length) return rows;
  const units = await labelMap(db, 'org_units', 'name', rows.flatMap(r => [r.from_unit_id, r.to_unit_id]));
  const users = await labelMap(db, 'users', 'name', rows.flatMap(r => [r.submitted_by, r.responded_by]));
  const activities = await labelMap(db, 'activities', 'title', rows.filter(r => r.source_type === 'activity').map(r => r.source_id));
  return rows.map(r => ({
    ...r,
    from_unit_name: units.get(r.from_unit_id) ?? null,
    to_unit_name: units.get(r.to_unit_id) ?? null,
    submitted_by_name: users.get(r.submitted_by) ?? null,
    responded_by_name: users.get(r.responded_by) ?? null,
    source_title: r.source_type === 'activity' ? (activities.get(r.source_id) ?? null) : null
  }));
}

module.exports = { withDirectiveNames, withSubmissionNames };
```

`core/src/routes/directives.js`:
- Sau dòng `const express = require('express');` thêm `const { withDirectiveNames, withSubmissionNames } = require('./dieu-hanh-names');`
- Danh sách: thay `res.json({ data: rows });` (trong `GET /api/directives`) bằng `res.json({ data: await withDirectiveNames(db, rows) });`
- Thêm route **ngay sau** handler `GET /api/directives` và trước `POST /api/directives/:id`-các route có tham số (đặt trước `GET /api/directives/:id`):

```js
  // GET /api/directives/units — đơn vị có module dieu-hanh (đích của Giao việc/Trình)
  router.get('/api/directives/units', asyncRoute(async (req, res) => {
    const [rows] = await db.execute(
      `SELECT u.id, u.code, u.name, u.kind
       FROM org_units u
       WHERE u.is_active = 1
         AND EXISTS (SELECT 1 FROM unit_modules m WHERE m.unit_id = u.id AND m.module_id = 'dieu-hanh')
       ORDER BY u.code`
    );
    res.json({ data: rows });
  }));
```
- Chi tiết: thay `res.json({ ...directive, submissions, activities });` bằng:

```js
    const [named] = await withDirectiveNames(db, [directive]);
    res.json({ ...named, submissions: await withSubmissionNames(db, submissions), activities });
```

`core/src/routes/submissions.js`:
- Sau `const express = require('express');` thêm `const { withSubmissionNames } = require('./dieu-hanh-names');`
- Danh sách: `res.json({ data: rows });` → `res.json({ data: await withSubmissionNames(db, rows) });`
- Chi tiết: `res.json(rows[0]);` (trong `GET /api/submissions/:id`) → `res.json((await withSubmissionNames(db, [rows[0]]))[0]);`

- [ ] **Step 4: Chạy**

Local: `node --test tests/directives.test.js` — Expected: PASS (mock trả `[[]]` cho truy vấn tên nên tên là `null`). Rồi đẩy nhánh và đọc CI cho Task 1 + 2: `dieu-hanh.access`, `dieu-hanh.names`, `units.leak`, `directives` đều xanh.

- [ ] **Step 5: Commit**

```bash
git add core/src/routes core/tests/dieu-hanh.names.test.js
git commit -m "feat(core): thêm tên đơn vị/người vào chỉ đạo và trình, endpoint đơn vị nhận"
```

---

### Task 3: Web — kiểu dữ liệu và tầng API cho chỉ đạo và trình

**Files:**
- Create: `web/src/core/api/dieuHanhTypes.ts`, `directives.ts`, `submissions.ts`
- Test: `web/src/core/api/dieuHanh.test.ts`
- Modify: `web/src/core/api/types.ts` (`SessionUnit.modules`), `errorMessages.ts` (dịch `Forbidden`), `index.ts` (re-export)

**Interfaces:**
- Produces (xem code): kiểu `Directive`, `DirectiveDetail`, `DirectiveActivity`, `Submission`, `DieuHanhUnit`, `UnitMember`; hàm `fetchDirectives`, `fetchDirective`, `fetchDieuHanhUnits`, `createDirective`, `acknowledgeDirective`, `linkDirectiveActivity`, `submitDirectiveResult`, `respondDirective`, `fetchUnitMembers`, `fetchSubmissions`, `fetchSubmission`, `createSubmission`, `respondSubmission`, `withdrawSubmission`.

- [ ] **Step 1: Viết test hỏng**

```ts
// web/src/core/api/dieuHanh.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiClient } from '../../shared/utils/api';
import {
  acknowledgeDirective, createDirective, createSubmission, fetchDieuHanhUnits, fetchDirective, fetchDirectives,
  fetchSubmission, fetchSubmissions, fetchUnitMembers, linkDirectiveActivity, respondDirective, respondSubmission,
  submitDirectiveResult, withdrawSubmission,
} from './index';
import { apiErrorMessage } from './errors';

vi.mock('../../shared/utils/api', () => ({ apiClient: { get: vi.fn(), post: vi.fn() } }));

const get = vi.mocked(apiClient.get);
const post = vi.mocked(apiClient.post);

describe('API Giao việc và Trình', () => {
  beforeEach(() => vi.clearAllMocks());

  it('danh sách bóc lớp { data }', async () => {
    get.mockResolvedValueOnce({ data: { data: [{ id: 1 }] } });
    await expect(fetchDirectives()).resolves.toEqual([{ id: 1 }]);
    expect(get).toHaveBeenCalledWith('/directives');
    get.mockResolvedValueOnce({ data: { data: [{ id: 2 }] } });
    await expect(fetchSubmissions()).resolves.toEqual([{ id: 2 }]);
    expect(get).toHaveBeenLastCalledWith('/submissions');
    get.mockResolvedValueOnce({ data: { data: [{ id: 3, code: 'TCKT' }] } });
    await expect(fetchDieuHanhUnits()).resolves.toEqual([{ id: 3, code: 'TCKT' }]);
    expect(get).toHaveBeenLastCalledWith('/directives/units');
  });

  it('chi tiết và thành viên đơn vị', async () => {
    get.mockResolvedValueOnce({ data: { id: 7, submissions: [], activities: [] } });
    await expect(fetchDirective(7)).resolves.toMatchObject({ id: 7 });
    expect(get).toHaveBeenLastCalledWith('/directives/7');
    get.mockResolvedValueOnce({ data: { id: 9 } });
    await fetchSubmission(9);
    expect(get).toHaveBeenLastCalledWith('/submissions/9');
    get.mockResolvedValueOnce({ data: [{ user_id: 1, name: 'A', email: 'a@x', role: 'admin' }] });
    await expect(fetchUnitMembers(2)).resolves.toHaveLength(1);
    expect(get).toHaveBeenLastCalledWith('/units/2/members');
  });

  it('tạo, tiếp nhận, gắn hoạt động, nộp kết quả, đánh giá chỉ đạo đúng endpoint và body', async () => {
    post.mockResolvedValue({ data: { id: 5 } });
    await createDirective({ to_unit_id: 2, title: 'T', body: 'B', deadline: '2026-12-01' });
    expect(post).toHaveBeenLastCalledWith('/directives', { to_unit_id: 2, title: 'T', body: 'B', deadline: '2026-12-01' });
    await acknowledgeDirective(5, 8);
    expect(post).toHaveBeenLastCalledWith('/directives/5/acknowledge', { owner_user_id: 8 });
    await acknowledgeDirective(5);
    expect(post).toHaveBeenLastCalledWith('/directives/5/acknowledge', {});
    await linkDirectiveActivity(5, 11);
    expect(post).toHaveBeenLastCalledWith('/directives/5/link-activity', { activity_id: 11 });
    await submitDirectiveResult(5, { source_type: 'activity', source_id: 11, note: 'xong' });
    expect(post).toHaveBeenLastCalledWith('/directives/5/submit', { source_type: 'activity', source_id: 11, note: 'xong' });
    await respondDirective(5, { response: 'revision_requested', response_note: 'Thiếu số liệu' });
    expect(post).toHaveBeenLastCalledWith('/directives/5/respond', { response: 'revision_requested', response_note: 'Thiếu số liệu' });
  });

  it('tạo, phản hồi, rút lại trình đúng endpoint và body', async () => {
    post.mockResolvedValue({ data: { id: 6 } });
    await createSubmission({ to_unit_id: 1, source_type: 'activity', source_id: 3, directive_id: 5, note: 'n' });
    expect(post).toHaveBeenLastCalledWith('/submissions', { to_unit_id: 1, source_type: 'activity', source_id: 3, directive_id: 5, note: 'n' });
    await respondSubmission(6, { response: 'seen' });
    expect(post).toHaveBeenLastCalledWith('/submissions/6/respond', { response: 'seen' });
    await withdrawSubmission(6);
    expect(post).toHaveBeenLastCalledWith('/submissions/6/withdraw', {});
  });

  it('403 "Forbidden" của cổng module hiện bằng tiếng Việt', () => {
    expect(apiErrorMessage({ response: { status: 403, data: { error: 'Forbidden' } } })).toBe(
      'Đơn vị hiện tại chưa bật module Điều hành.'
    );
  });
});
```

- [ ] **Step 2: Chạy, xác nhận hỏng**

Run: `npx vitest run src/core/api/dieuHanh.test.ts` — Expected: FAIL (không có export `fetchDirectives`…).

- [ ] **Step 3: Viết code**

```ts
// web/src/core/api/dieuHanhTypes.ts
export type DirectiveStatus = 'sent' | 'acknowledged' | 'in_progress' | 'submitted' | 'accepted' | 'revision_requested';
export type SubmissionSource = 'activity' | 'ops_log' | 'report';
export type SubmissionResponse = 'seen' | 'revision_requested' | 'accepted';

/** Dòng bảng `directives` (core/src/routes/directives.js) kèm các trường tên do `dieu-hanh-names.js` thêm. */
export interface Directive {
  id: number;
  from_unit_id: number;
  to_unit_id: number;
  title: string;
  body: string | null;
  deadline: string | null;
  status: DirectiveStatus | string;
  created_by: number | null;
  owner_user_id: number | null;
  acknowledged_at: string | null;
  created_at: string;
  updated_at: string;
  from_unit_name?: string | null;
  to_unit_name?: string | null;
  created_by_name?: string | null;
  owner_name?: string | null;
}

/** Dòng bảng `submissions` kèm các trường tên. */
export interface Submission {
  id: number;
  from_unit_id: number;
  to_unit_id: number;
  source_type: SubmissionSource;
  source_id: number;
  directive_id: number | null;
  note: string | null;
  submitted_by: number | null;
  response: SubmissionResponse | null;
  response_note: string | null;
  responded_by: number | null;
  responded_at: string | null;
  withdrawn_at: string | null;
  created_at: string;
  from_unit_name?: string | null;
  to_unit_name?: string | null;
  submitted_by_name?: string | null;
  responded_by_name?: string | null;
  source_title?: string | null;
}

/** Hoạt động gắn với chỉ đạo (`SELECT * FROM activities WHERE directive_id = ?`). */
export interface DirectiveActivity {
  id: number;
  title: string;
  status: string;
  deadline?: string | null;
}

export interface DirectiveDetail extends Directive {
  submissions: Submission[];
  activities: DirectiveActivity[];
}

export interface DieuHanhUnit {
  id: number;
  code: string;
  name: string;
  kind: string;
}

/** Phần tử của GET /api/units/:id/members. */
export interface UnitMember {
  user_id: number;
  name: string;
  email: string;
  role: string;
}

export interface CreateDirectivePayload {
  to_unit_id: number;
  title: string;
  body?: string;
  deadline: string;
}

export interface SubmitDirectivePayload {
  source_type: SubmissionSource;
  source_id: number;
  note?: string;
}

export interface RespondDirectivePayload {
  response: 'accepted' | 'revision_requested';
  response_note?: string;
}

export interface CreateSubmissionPayload {
  to_unit_id: number;
  source_type: SubmissionSource;
  source_id: number;
  directive_id?: number;
  note?: string;
}

export interface RespondSubmissionPayload {
  response: SubmissionResponse;
  response_note?: string;
}
```

```ts
// web/src/core/api/directives.ts
import { apiClient } from '../../shared/utils/api';
import type {
  CreateDirectivePayload, DieuHanhUnit, Directive, DirectiveDetail, RespondDirectivePayload, SubmitDirectivePayload, UnitMember,
} from './dieuHanhTypes';

/** GET /api/directives — chỉ đạo đơn vị hiện tại gửi hoặc nhận. */
export async function fetchDirectives(): Promise<Directive[]> {
  const response = await apiClient.get<{ data: Directive[] }>('/directives');
  return response.data.data;
}

/** GET /api/directives/:id — kèm `submissions` và `activities`. */
export async function fetchDirective(id: number): Promise<DirectiveDetail> {
  const response = await apiClient.get<DirectiveDetail>(`/directives/${id}`);
  return response.data;
}

/** GET /api/directives/units — đơn vị có module dieu-hanh (đích của chỉ đạo và trình). */
export async function fetchDieuHanhUnits(): Promise<DieuHanhUnit[]> {
  const response = await apiClient.get<{ data: DieuHanhUnit[] }>('/directives/units');
  return response.data.data;
}

/** POST /api/directives — chỉ BTV (hoặc DYC). */
export async function createDirective(payload: CreateDirectivePayload): Promise<Directive> {
  const response = await apiClient.post<Directive>('/directives', payload);
  return response.data;
}

/** POST /api/directives/:id/acknowledge — tiếp nhận, có thể chọn người phụ trách. */
export async function acknowledgeDirective(id: number, ownerUserId?: number): Promise<Directive> {
  const response = await apiClient.post<Directive>(`/directives/${id}/acknowledge`, ownerUserId ? { owner_user_id: ownerUserId } : {});
  return response.data;
}

/** POST /api/directives/:id/link-activity */
export async function linkDirectiveActivity(id: number, activityId: number): Promise<Directive> {
  const response = await apiClient.post<Directive>(`/directives/${id}/link-activity`, { activity_id: activityId });
  return response.data;
}

/** POST /api/directives/:id/submit — nộp kết quả (tạo một submission gửi ngược lên đơn vị giao). */
export async function submitDirectiveResult(id: number, payload: SubmitDirectivePayload) {
  const response = await apiClient.post(`/directives/${id}/submit`, payload);
  return response.data;
}

/** POST /api/directives/:id/respond — BTV/DYC đánh giá kết quả. */
export async function respondDirective(id: number, payload: RespondDirectivePayload): Promise<Directive> {
  const response = await apiClient.post<Directive>(`/directives/${id}/respond`, payload);
  return response.data;
}

/** GET /api/units/:id/members — thành viên của đơn vị mình (chọn người phụ trách). */
export async function fetchUnitMembers(unitId: number): Promise<UnitMember[]> {
  const response = await apiClient.get<UnitMember[]>(`/units/${unitId}/members`);
  return response.data;
}
```

```ts
// web/src/core/api/submissions.ts
import { apiClient } from '../../shared/utils/api';
import type { CreateSubmissionPayload, RespondSubmissionPayload, Submission } from './dieuHanhTypes';

/** GET /api/submissions — trình đơn vị hiện tại gửi hoặc nhận. */
export async function fetchSubmissions(): Promise<Submission[]> {
  const response = await apiClient.get<{ data: Submission[] }>('/submissions');
  return response.data.data;
}

/** GET /api/submissions/:id */
export async function fetchSubmission(id: number): Promise<Submission> {
  const response = await apiClient.get<Submission>(`/submissions/${id}`);
  return response.data;
}

/** POST /api/submissions — admin/vice_admin hoặc BTV. */
export async function createSubmission(payload: CreateSubmissionPayload): Promise<Submission> {
  const response = await apiClient.post<Submission>('/submissions', payload);
  return response.data;
}

/** POST /api/submissions/:id/respond — BTV/DYC. */
export async function respondSubmission(id: number, payload: RespondSubmissionPayload): Promise<Submission> {
  const response = await apiClient.post<Submission>(`/submissions/${id}/respond`, payload);
  return response.data;
}

/** POST /api/submissions/:id/withdraw — rút lại khi chưa có phản hồi. */
export async function withdrawSubmission(id: number): Promise<Submission> {
  const response = await apiClient.post<Submission>(`/submissions/${id}/withdraw`, {});
  return response.data;
}
```

`web/src/core/api/index.ts` — thêm ba dòng cuối:
```ts
export * from './dieuHanhTypes';
export * from './directives';
export * from './submissions';
```

`web/src/core/api/types.ts` — trong `SessionUnit` thêm trường (do Task 1 của Core):
```ts
  /** Module đang bật của đơn vị (vd. 'dieu-hanh', 'ctd'); do `unit-context.js` nạp. */
  modules?: string[];
```

`web/src/core/api/errorMessages.ts` — thêm vào bảng `VI_ERROR_MESSAGES` mục "Chung":
```ts
  'Forbidden': 'Đơn vị hiện tại chưa bật module Điều hành.',
```

- [ ] **Step 4: Chạy**

Run: `npx vitest run src/core/api && npx tsc --noEmit -p .` — Expected: PASS, không lỗi kiểu.

- [ ] **Step 5: Commit**

```bash
git add web/src/core/api
git commit -m "feat(web): tầng API Giao việc và Trình, dịch lỗi cổng module"
```

---

### Task 4: Web — bảng điều kiện quyền, nhãn, hook người thao tác

**Files:**
- Create: `web/src/core/features/dieuhanh/permissions.ts`, `useDhActor.ts`, `labels.ts`, `queryKeys.ts`
- Test: `web/src/core/features/dieuhanh/permissions.test.ts`

**Interfaces:**
- Consumes: `Capabilities` (đợt 0), kiểu `Directive`, `Submission` (Task 3).
- Produces: xem code. Bảng điều kiện chép từ code route:

| Thao tác | Server kiểm (route) | UI hiện khi |
|---|---|---|
| Tạo chỉ đạo | `unitRole` ∈ btv_lead/btv_member hoặc DYC | y hệt |
| Tiếp nhận | `unitRole` ∈ admin/vice_admin hoặc DYC; status ∈ sent/pending | `to_unit_id` = đơn vị hiện tại, `unitRole` ∈ admin/vice_admin, status ∈ sent/pending |
| Gắn hoạt động | status ∈ acknowledged/in_progress | `to_unit_id` = đơn vị hiện tại, (admin/vice_admin/leader/vice_leader hoặc người phụ trách), status như server |
| Nộp kết quả | status ∈ acknowledged/in_progress/revision_requested | như Gắn hoạt động, status như server |
| Đánh giá chỉ đạo | BTV hoặc DYC; status = submitted | y hệt, thêm `from_unit_id` = đơn vị hiện tại (hoặc DYC) |
| Tạo trình | `unitRole` ∈ admin/vice_admin/btv_lead/btv_member (DYC không) | y hệt |
| Phản hồi trình | BTV hoặc DYC | y hệt, thêm `to_unit_id` = đơn vị hiện tại (hoặc DYC), chưa rút, chưa có `accepted`/`revision_requested` |
| Rút lại trình | `unitRole` ∈ admin/vice_admin; `response` null | thêm `from_unit_id` = đơn vị hiện tại, chưa rút |

- [ ] **Step 1: Viết test hỏng**

```ts
// web/src/core/features/dieuhanh/permissions.test.ts
import { describe, it, expect } from 'vitest';
import type { Directive, Submission } from '../../api';
import {
  canAcknowledgeDirective, canCreateDirective, canCreateSubmission, canLinkActivity, canRespondDirective,
  canRespondSubmission, canSubmitDirective, canWithdrawSubmission, deriveDhActor, submissionResponseOptions, unitHasDieuHanh,
  type DhActor,
} from './permissions';

const actor = (over: Partial<DhActor> = {}): DhActor => ({ userId: 5, unitId: 2, unitKind: 'department', unitRole: 'admin', hasDieuHanh: true, ...over });
const directive = (over: Partial<Directive> = {}): Directive => ({
  id: 1, from_unit_id: 1, to_unit_id: 2, title: 'T', body: null, deadline: null, status: 'sent', created_by: 9, owner_user_id: null,
  acknowledged_at: null, created_at: '', updated_at: '', ...over,
});
const submission = (over: Partial<Submission> = {}): Submission => ({
  id: 1, from_unit_id: 2, to_unit_id: 1, source_type: 'activity', source_id: 3, directive_id: null, note: null, submitted_by: 5,
  response: null, response_note: null, responded_by: null, responded_at: null, withdrawn_at: null, created_at: '', ...over,
});
const btv = actor({ unitId: 1, unitKind: 'standing_committee', unitRole: 'btv_lead' });
const dyc = actor({ unitId: 9, unitKind: 'platform_owner', unitRole: 'dyc_admin' });

describe('unitHasDieuHanh / deriveDhActor', () => {
  it('đơn vị có module hoặc platform_owner thì có; không có thì không', () => {
    expect(unitHasDieuHanh({ kind: 'department', modules: ['dieu-hanh', 'ctd'] })).toBe(true);
    expect(unitHasDieuHanh({ kind: 'platform_owner', modules: [] })).toBe(true);
    expect(unitHasDieuHanh({ kind: 'office', modules: ['ctd'] })).toBe(false);
    expect(unitHasDieuHanh({ kind: 'office' })).toBe(false);
    expect(unitHasDieuHanh(null)).toBe(false);
  });

  it('lấy đơn vị, vai trò đơn vị và id người dùng', () => {
    const a = deriveDhActor({ unit: { id: 2, code: 'TCKT', name: 'x', kind: 'department', modules: ['dieu-hanh'] }, unitRole: 'leader' }, 5);
    expect(a).toEqual({ userId: 5, unitId: 2, unitKind: 'department', unitRole: 'leader', hasDieuHanh: true });
  });
});

describe('chỉ đạo', () => {
  it('tạo: chỉ BTV và DYC', () => {
    expect(canCreateDirective(btv)).toBe(true);
    expect(canCreateDirective(dyc)).toBe(true);
    expect(canCreateDirective(actor())).toBe(false);
  });

  it('tiếp nhận: admin/vice_admin của đơn vị nhận, trạng thái chờ', () => {
    expect(canAcknowledgeDirective(actor(), directive())).toBe(true);
    expect(canAcknowledgeDirective(actor({ unitRole: 'vice_admin' }), directive({ status: 'sent' }))).toBe(true);
    expect(canAcknowledgeDirective(actor({ unitRole: 'leader' }), directive())).toBe(false);
    expect(canAcknowledgeDirective(actor({ unitId: 3 }), directive())).toBe(false);
    expect(canAcknowledgeDirective(actor(), directive({ status: 'acknowledged' }))).toBe(false);
    expect(canAcknowledgeDirective(btv, directive())).toBe(false);
  });

  it('gắn hoạt động và nộp kết quả: quản lý đơn vị nhận hoặc người phụ trách, đúng trạng thái', () => {
    const d = directive({ status: 'acknowledged', owner_user_id: 5 });
    expect(canLinkActivity(actor({ unitRole: 'leader' }), d)).toBe(true);
    expect(canLinkActivity(actor({ unitRole: 'member' }), d)).toBe(true);
    expect(canLinkActivity(actor({ unitRole: 'member' }), directive({ status: 'acknowledged', owner_user_id: 8 }))).toBe(false);
    expect(canLinkActivity(actor(), directive({ status: 'sent' }))).toBe(false);
    expect(canLinkActivity(actor({ unitId: 3 }), d)).toBe(false);
    expect(canSubmitDirective(actor(), directive({ status: 'revision_requested' }))).toBe(true);
    expect(canSubmitDirective(actor(), directive({ status: 'submitted' }))).toBe(false);
  });

  it('đánh giá: BTV (đơn vị giao) hoặc DYC, khi đã nộp', () => {
    const d = directive({ status: 'submitted' });
    expect(canRespondDirective(btv, d)).toBe(true);
    expect(canRespondDirective(dyc, d)).toBe(true);
    expect(canRespondDirective(actor(), d)).toBe(false);
    expect(canRespondDirective(btv, directive({ status: 'in_progress' }))).toBe(false);
    expect(canRespondDirective(actor({ ...btv, unitId: 7 }), d)).toBe(false);
  });
});

describe('trình', () => {
  it('tạo: admin/vice_admin hoặc BTV, DYC thì không', () => {
    expect(canCreateSubmission(actor())).toBe(true);
    expect(canCreateSubmission(btv)).toBe(true);
    expect(canCreateSubmission(dyc)).toBe(false);
    expect(canCreateSubmission(actor({ unitRole: 'leader' }))).toBe(false);
  });

  it('phản hồi: BTV/DYC phía nhận, chưa rút, chưa có kết luận cuối', () => {
    expect(canRespondSubmission(btv, submission())).toBe(true);
    expect(canRespondSubmission(btv, submission({ response: 'seen' }))).toBe(true);
    expect(canRespondSubmission(btv, submission({ response: 'accepted' }))).toBe(false);
    expect(canRespondSubmission(btv, submission({ withdrawn_at: '2026-10-01T00:00:00Z' }))).toBe(false);
    expect(canRespondSubmission(actor(), submission())).toBe(false);
    expect(canRespondSubmission(dyc, submission())).toBe(true);
  });

  it('chỉ cho chọn "Chấp nhận/Yêu cầu sửa" khi có directive_id', () => {
    expect(submissionResponseOptions(submission())).toEqual(['seen']);
    expect(submissionResponseOptions(submission({ directive_id: 4 }))).toEqual(['seen', 'accepted', 'revision_requested']);
  });

  it('rút lại: admin/vice_admin của đơn vị gửi, chưa phản hồi, chưa rút', () => {
    expect(canWithdrawSubmission(actor(), submission())).toBe(true);
    expect(canWithdrawSubmission(actor({ unitRole: 'leader' }), submission())).toBe(false);
    expect(canWithdrawSubmission(actor({ unitId: 3 }), submission())).toBe(false);
    expect(canWithdrawSubmission(actor(), submission({ response: 'seen' }))).toBe(false);
    expect(canWithdrawSubmission(actor(), submission({ withdrawn_at: '2026-10-01T00:00:00Z' }))).toBe(false);
  });
});
```

- [ ] **Step 2: Chạy, xác nhận hỏng**

Run: `npx vitest run src/core/features/dieuhanh/permissions.test.ts` — Expected: FAIL (không resolve `./permissions`).

- [ ] **Step 3: Viết code**

```ts
// web/src/core/features/dieuhanh/permissions.ts
import type { Capabilities } from '../../capabilities';
import type { Directive, SessionUnit, Submission, SubmissionResponse } from '../../api';

/** Ai đang thao tác: đơn vị hiện tại + vai trò đơn vị (INV-AUTH-001: không dùng users.role). */
export interface DhActor {
  userId: number | null;
  unitId: number | null;
  unitKind: string | null;
  unitRole: string | null;
  hasDieuHanh: boolean;
}

const BTV_ROLES = ['btv_lead', 'btv_member'];
const UNIT_ADMIN_ROLES = ['admin', 'vice_admin'];
const UNIT_LEAD_ROLES = [...UNIT_ADMIN_ROLES, 'leader', 'vice_leader'];

/** Cổng của server: đơn vị có module `dieu-hanh`, hoặc là DYC (platform_owner). */
export function unitHasDieuHanh(unit: Pick<SessionUnit, 'kind' | 'modules'> | null | undefined): boolean {
  if (!unit) return false;
  return unit.kind === 'platform_owner' || Boolean(unit.modules?.includes('dieu-hanh'));
}

export function deriveDhActor(caps: Pick<Capabilities, 'unit' | 'unitRole'>, userId: number | null): DhActor {
  return {
    userId,
    unitId: caps.unit?.id ?? null,
    unitKind: caps.unit?.kind ?? null,
    unitRole: caps.unitRole,
    hasDieuHanh: unitHasDieuHanh(caps.unit),
  };
}

const inRoles = (a: DhActor, roles: string[]) => a.unitRole !== null && roles.includes(a.unitRole);
const isBtv = (a: DhActor) => inRoles(a, BTV_ROLES);
const isDyc = (a: DhActor) => a.unitKind === 'platform_owner';
const isUnitAdmin = (a: DhActor) => inRoles(a, UNIT_ADMIN_ROLES);
const isReceiver = (a: DhActor, d: Directive) => a.unitId !== null && d.to_unit_id === a.unitId;
/** Người làm việc của đơn vị nhận: quản lý đơn vị hoặc người phụ trách chỉ đạo. */
const worksOn = (a: DhActor, d: Directive) =>
  isReceiver(a, d) && (inRoles(a, UNIT_LEAD_ROLES) || (a.userId !== null && d.owner_user_id === a.userId));

export const canCreateDirective = (a: DhActor) => isBtv(a) || isDyc(a);

export const canAcknowledgeDirective = (a: DhActor, d: Directive) =>
  isReceiver(a, d) && isUnitAdmin(a) && ['sent', 'pending'].includes(d.status);

export const canLinkActivity = (a: DhActor, d: Directive) =>
  worksOn(a, d) && ['acknowledged', 'in_progress'].includes(d.status);

export const canSubmitDirective = (a: DhActor, d: Directive) =>
  worksOn(a, d) && ['acknowledged', 'in_progress', 'revision_requested'].includes(d.status);

export const canRespondDirective = (a: DhActor, d: Directive) =>
  (isBtv(a) || isDyc(a)) && d.status === 'submitted' && (isDyc(a) || (a.unitId !== null && d.from_unit_id === a.unitId));

export const canCreateSubmission = (a: DhActor) => isUnitAdmin(a) || isBtv(a);

export const canRespondSubmission = (a: DhActor, s: Submission) =>
  (isBtv(a) || isDyc(a)) &&
  (isDyc(a) || (a.unitId !== null && s.to_unit_id === a.unitId)) &&
  !s.withdrawn_at &&
  (s.response === null || s.response === 'seen');

/** `accepted`/`revision_requested` chỉ khi trình gắn với một chỉ đạo (SPEC-WEB-003 mục 4.7). */
export const submissionResponseOptions = (s: Submission): SubmissionResponse[] =>
  s.directive_id ? ['seen', 'accepted', 'revision_requested'] : ['seen'];

export const canWithdrawSubmission = (a: DhActor, s: Submission) =>
  isUnitAdmin(a) && a.unitId !== null && s.from_unit_id === a.unitId && s.response === null && !s.withdrawn_at;
```

`SessionUnit` được export từ `'../../api'` qua `types.ts` (đã có `export *`); thêm `SubmissionResponse` đã nằm trong `dieuHanhTypes` (Task 3).

```ts
// web/src/core/features/dieuhanh/useDhActor.ts
import { useQuery } from '@tanstack/react-query';
import { fetchSession } from '../../api';
import { useCapabilities } from '../../capabilities';
import { SESSION_KEY } from '../../queryKeys';
import { deriveDhActor, type DhActor } from './permissions';

export function useDhActor(): DhActor {
  const caps = useCapabilities();
  const { data: session } = useQuery({ queryKey: SESSION_KEY, queryFn: fetchSession });
  return deriveDhActor(caps, session?.user?.id ?? null);
}
```

```ts
// web/src/core/features/dieuhanh/queryKeys.ts
export const DIRECTIVES_KEY = ['directives'] as const;
export const DIRECTIVE_KEY = (id: number) => ['directives', id] as const;
export const SUBMISSIONS_KEY = ['submissions'] as const;
export const SUBMISSION_KEY = (id: number) => ['submissions', id] as const;
export const DH_UNITS_KEY = ['dieu-hanh-units'] as const;
```

```ts
// web/src/core/features/dieuhanh/labels.ts
import type { Submission, SubmissionResponse, SubmissionSource } from '../../api';

export type LozengeTone = 'default' | 'inprogress' | 'moved' | 'new' | 'removed' | 'success';

export const DIRECTIVE_STATUS: Record<string, { label: string; tone: LozengeTone }> = {
  sent: { label: 'Đã gửi', tone: 'new' },
  acknowledged: { label: 'Đã tiếp nhận', tone: 'inprogress' },
  in_progress: { label: 'Đang thực hiện', tone: 'inprogress' },
  submitted: { label: 'Đã nộp kết quả', tone: 'moved' },
  accepted: { label: 'Đã chấp nhận', tone: 'success' },
  revision_requested: { label: 'Yêu cầu sửa', tone: 'removed' },
};

export const directiveStatus = (status: string) => DIRECTIVE_STATUS[status] ?? { label: status, tone: 'default' as LozengeTone };

export const SOURCE_LABEL: Record<SubmissionSource, string> = {
  activity: 'Hoạt động',
  ops_log: 'Nhật ký trực ban',
  report: 'Báo cáo',
};

export const RESPONSE_LABEL: Record<SubmissionResponse, string> = {
  seen: 'Đã xem',
  accepted: 'Chấp nhận',
  revision_requested: 'Yêu cầu sửa',
};

export function submissionStatus(s: Pick<Submission, 'response' | 'withdrawn_at'>): { label: string; tone: LozengeTone } {
  if (s.withdrawn_at) return { label: 'Đã rút lại', tone: 'default' };
  if (s.response === 'accepted') return { label: 'Đã chấp nhận', tone: 'success' };
  if (s.response === 'revision_requested') return { label: 'Yêu cầu sửa', tone: 'removed' };
  if (s.response === 'seen') return { label: 'Đã xem', tone: 'inprogress' };
  return { label: 'Chờ phản hồi', tone: 'new' };
}

/** Tên nguồn của một trình: tiêu đề hoạt động nếu có, không thì "Loại #id". */
export function sourceText(s: Pick<Submission, 'source_type' | 'source_id' | 'source_title'>): string {
  return s.source_title ? `${SOURCE_LABEL[s.source_type]}: ${s.source_title}` : `${SOURCE_LABEL[s.source_type]} #${s.source_id}`;
}
```

- [ ] **Step 4: Chạy**

Run: `npx vitest run src/core/features/dieuhanh && npx tsc --noEmit -p .` — Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add web/src/core/features/dieuhanh
git commit -m "feat(web): bảng điều kiện quyền Giao việc và Trình, hook người thao tác, nhãn"
```

---

### Task 5: Web — phần dùng chung, danh sách Giao việc và hộp tạo chỉ đạo

**Files:**
- Create: `web/src/core/features/dieuhanh/parts.tsx`, `testUtils.tsx`, `web/src/core/features/directives/DirectivesView.tsx`, `CreateDirectiveModal.tsx`
- Test: `web/src/core/features/directives/DirectivesView.test.tsx`

**Interfaces:**
- Consumes: Task 3, 4.
- Produces: `StatusLozenge({label,tone})`, `SelectField`, `FormDialog`, `ErrorText`, `FIELD_STYLE` (parts); `renderDh(ui, opts)`, `TCKT_UNIT`, `BTV_UNIT` (testUtils); `DirectivesView`, `CreateDirectiveModal({isOpen,onClose})`.

- [ ] **Step 1: Viết test hỏng**

```tsx
// web/src/core/features/directives/DirectivesView.test.tsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, fireEvent, waitFor, cleanup, within } from '@testing-library/react';
import { DirectivesView } from './DirectivesView';
import { BTV_UNIT, renderDh, TCKT_UNIT } from '../dieuhanh/testUtils';
import * as api from '../../api';

vi.mock('../../api', async () => {
  const actual = await vi.importActual<typeof import('../../api')>('../../api');
  return { ...actual, fetchDirectives: vi.fn(), fetchDieuHanhUnits: vi.fn(), createDirective: vi.fn() };
});

const row = (over: Partial<api.Directive> = {}): api.Directive => ({
  id: 7, from_unit_id: 1, to_unit_id: 2, title: 'Báo cáo quý IV', body: null, deadline: '2026-12-01', status: 'sent',
  created_by: 9, owner_user_id: null, acknowledged_at: null, created_at: '2026-10-01T03:00:00.000Z', updated_at: '',
  from_unit_name: 'Ban Thường vụ', to_unit_name: 'Ban TCKT', ...over,
});

describe('DirectivesView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.fetchDirectives).mockResolvedValue([
      row(),
      row({ id: 8, title: 'Việc đơn vị mình gửi', from_unit_id: 2, to_unit_id: 3, from_unit_name: 'Ban TCKT', to_unit_name: 'Ban khác', status: 'accepted' }),
    ]);
    vi.mocked(api.fetchDieuHanhUnits).mockResolvedValue([
      { id: 1, code: 'BTV', name: 'Ban Thường vụ', kind: 'standing_committee' },
      { id: 2, code: 'TCKT', name: 'Ban TCKT', kind: 'department' },
    ]);
  });
  afterEach(cleanup);

  it('liệt kê chỉ đạo với đơn vị gửi/nhận, hạn và trạng thái; tiêu đề dẫn tới trang chi tiết', async () => {
    renderDh(<DirectivesView />, { path: '/directives' });
    const link = await screen.findByRole('link', { name: 'Báo cáo quý IV' });
    expect(link.getAttribute('href')).toBe('/directive/7');
    const tr = link.closest('tr') as HTMLElement;
    expect(within(tr).getByText('Ban Thường vụ')).toBeDefined();
    expect(within(tr).getByText('01/12/2026')).toBeDefined();
    expect(within(tr).getByText('Đã gửi')).toBeDefined();
  });

  it('lọc theo hướng: "Nhận về" chỉ còn chỉ đạo gửi tới đơn vị hiện tại', async () => {
    renderDh(<DirectivesView />, { path: '/directives' });
    await screen.findByText('Báo cáo quý IV');
    fireEvent.change(screen.getByLabelText('Hướng'), { target: { value: 'received' } });
    expect(screen.getByText('Báo cáo quý IV')).toBeDefined();
    expect(screen.queryByText('Việc đơn vị mình gửi')).toBeNull();
  });

  it('nút "Giao việc mới" ẩn với TCKT admin, hiện với BTV', async () => {
    renderDh(<DirectivesView />, { path: '/directives', unit: TCKT_UNIT, role: 'admin' });
    await screen.findByText('Báo cáo quý IV');
    expect(screen.queryByRole('button', { name: 'Giao việc mới' })).toBeNull();
    cleanup();
    renderDh(<DirectivesView />, { path: '/directives', unit: BTV_UNIT, role: 'btv_lead' });
    expect(await screen.findByRole('button', { name: 'Giao việc mới' })).toBeDefined();
  });

  it('BTV tạo chỉ đạo: gửi đúng body, làm mới danh sách, chuyển tới trang chi tiết', async () => {
    vi.mocked(api.createDirective).mockResolvedValueOnce(row({ id: 21 }));
    const { qc } = renderDh(<DirectivesView />, { path: '/directives', unit: BTV_UNIT, role: 'btv_lead' });
    await screen.findByText('Báo cáo quý IV');
    fireEvent.click(screen.getByRole('button', { name: 'Giao việc mới' }));
    const dialog = await screen.findByRole('dialog');
    await within(dialog).findByRole('option', { name: 'Ban TCKT' });
    // Đơn vị hiện tại (BTV) không nằm trong danh sách nhận
    expect(within(dialog).queryByRole('option', { name: 'Ban Thường vụ' })).toBeNull();
    fireEvent.change(within(dialog).getByLabelText(/Đơn vị nhận/), { target: { value: '2' } });
    fireEvent.change(within(dialog).getByLabelText(/Tiêu đề/), { target: { value: '  Tổng kết năm  ' } });
    fireEvent.change(within(dialog).getByLabelText(/Nội dung/), { target: { value: 'Nộp trước hạn' } });
    fireEvent.change(within(dialog).getByLabelText(/Hạn hoàn thành/), { target: { value: '2026-12-31' } });
    const spy = vi.spyOn(qc, 'invalidateQueries');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Giao việc' }));
    await waitFor(() => expect(api.createDirective).toHaveBeenCalledWith({ to_unit_id: 2, title: 'Tổng kết năm', body: 'Nộp trước hạn', deadline: '2026-12-31' }));
    await waitFor(() => expect(spy).toHaveBeenCalledWith({ queryKey: ['directives'] }));
  });

  it('thiếu trường bắt buộc thì không gọi API và báo lỗi', async () => {
    renderDh(<DirectivesView />, { path: '/directives', unit: BTV_UNIT, role: 'btv_lead' });
    fireEvent.click(await screen.findByRole('button', { name: 'Giao việc mới' }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Giao việc' }));
    expect(within(dialog).getByText('Chọn đơn vị nhận, nhập tiêu đề và hạn hoàn thành.')).toBeDefined();
    expect(api.createDirective).not.toHaveBeenCalled();
  });

  it('lỗi server hiện bằng tiếng Việt trong hộp thoại', async () => {
    vi.mocked(api.createDirective).mockRejectedValueOnce({ response: { status: 403, data: { error: 'Chỉ BTV mới có quyền tạo chỉ đạo.' } } });
    renderDh(<DirectivesView />, { path: '/directives', unit: BTV_UNIT, role: 'btv_lead' });
    fireEvent.click(await screen.findByRole('button', { name: 'Giao việc mới' }));
    const dialog = await screen.findByRole('dialog');
    await within(dialog).findByRole('option', { name: 'Ban TCKT' });
    fireEvent.change(within(dialog).getByLabelText(/Đơn vị nhận/), { target: { value: '2' } });
    fireEvent.change(within(dialog).getByLabelText(/Tiêu đề/), { target: { value: 'X' } });
    fireEvent.change(within(dialog).getByLabelText(/Hạn hoàn thành/), { target: { value: '2026-12-31' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Giao việc' }));
    expect(await within(dialog).findByText('Chỉ BTV mới có quyền tạo chỉ đạo.')).toBeDefined();
  });

  it('403 Forbidden của danh sách hiện thông báo module', async () => {
    vi.mocked(api.fetchDirectives).mockRejectedValue({ response: { status: 403, data: { error: 'Forbidden' } } });
    renderDh(<DirectivesView />, { path: '/directives' });
    expect(await screen.findByText('Đơn vị hiện tại chưa bật module Điều hành.')).toBeDefined();
  });
});
```

- [ ] **Step 2: Chạy, xác nhận hỏng**

Run: `npx vitest run src/core/features/directives/DirectivesView.test.tsx` — Expected: FAIL (không resolve `./DirectivesView`, `../dieuhanh/testUtils`).

- [ ] **Step 3: Viết code**

```tsx
// web/src/core/features/dieuhanh/testUtils.tsx
import React from 'react';
import { render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ToastProvider } from '../../../shared/components/Toast';
import { BOOTSTRAP_KEY, SESSION_KEY } from '../../queryKeys';

export interface TestUnit { id: number; code: string; name: string; kind: string; modules?: string[] }
export const TCKT_UNIT: TestUnit = { id: 2, code: 'TCKT', name: 'Ban TCKT', kind: 'department', modules: ['dieu-hanh', 'ctd'] };
export const BTV_UNIT: TestUnit = { id: 1, code: 'BTV', name: 'Ban Thường vụ', kind: 'standing_committee', modules: ['dieu-hanh'] };

export interface DhTestOptions {
  path: string;
  /** Mẫu route của `ui` (mặc định mọi đường dẫn). */
  route?: string;
  unit?: TestUnit;
  /** Vai trò đơn vị (membership.role). */
  role?: string;
  userId?: number;
}

/** Render một màn của Giao việc/Trình với session + bootstrap đã nạp sẵn, router và toast. */
export function renderDh(ui: React.ReactElement, { path, route = '*', unit = TCKT_UNIT, role = 'admin', userId = 5 }: DhTestOptions) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity }, mutations: { retry: false } } });
  qc.setQueryData(SESSION_KEY, {
    user: { id: userId, name: 'Tôi', email: 't@x', role: 'member' },
    units: { current: unit, memberships: [{ unit_id: unit.id, code: unit.code, name: unit.name, kind: unit.kind, role }] },
  });
  qc.setQueryData(BOOTSTRAP_KEY, { stats: {}, upcoming: [], tasks: [], activity: [], teams: [], capabilities: { canCreateActivity: false, canCreateAccount: false } });
  const utils = render(
    <QueryClientProvider client={qc}>
      <ToastProvider>
        <MemoryRouter initialEntries={[path]}>
          <Routes><Route path={route} element={ui} /></Routes>
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>
  );
  return { qc, ...utils };
}
```

```tsx
// web/src/core/features/dieuhanh/parts.tsx
import React, { useId } from 'react';
import Modal, { ModalBody, ModalFooter, ModalHeader, ModalTitle, ModalTransition } from '@atlaskit/modal-dialog';
import Button from '@atlaskit/button/new';
import Lozenge from '@atlaskit/lozenge';
import { token } from '@atlaskit/tokens';
import type { LozengeTone } from './labels';

export const FIELD_STYLE: React.CSSProperties = {
  width: '100%',
  padding: '8px 6px',
  borderRadius: 3,
  border: `1px solid ${token('color.border', '#DFE1E6')}`,
  background: token('elevation.surface', '#fff'),
  color: token('color.text', '#172B4D'),
  fontSize: 14,
};

export const StatusLozenge: React.FC<{ label: string; tone: LozengeTone }> = ({ label, tone }) => (
  <Lozenge appearance={tone}>{label}</Lozenge>
);

export interface SelectOption { value: string; label: string }

export const SelectField: React.FC<{
  label: string; value: string; onChange: (value: string) => void; options: SelectOption[];
  placeholder?: string; required?: boolean; disabled?: boolean;
}> = ({ label, value, onChange, options, placeholder, required = false, disabled = false }) => {
  const id = useId();
  return (
    <div style={{ marginTop: 12 }}>
      <label htmlFor={id}>{label}{required ? ' *' : ''}</label>
      <select id={id} value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)} style={FIELD_STYLE}>
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
};

export const ErrorText: React.FC<{ message: string }> = ({ message }) =>
  message ? <p role="alert" style={{ color: token('color.text.danger', '#AE2E24'), marginTop: 8 }}>{message}</p> : null;

/** Hộp thoại biểu mẫu chuẩn của Giao việc/Trình: tiêu đề, thân, nút Huỷ + nút xác nhận. */
export const FormDialog: React.FC<{
  isOpen: boolean; title: string; confirmLabel: string; isLoading?: boolean; confirmDisabled?: boolean;
  onSubmit: () => void; onCancel: () => void; children: React.ReactNode;
}> = ({ isOpen, title, confirmLabel, isLoading = false, confirmDisabled = false, onSubmit, onCancel, children }) => (
  <ModalTransition>
    {isOpen && (
      <Modal onClose={onCancel} width="medium">
        <ModalHeader><ModalTitle>{title}</ModalTitle></ModalHeader>
        <ModalBody>{children}</ModalBody>
        <ModalFooter>
          <Button appearance="subtle" onClick={onCancel}>Huỷ</Button>
          <Button appearance="primary" isLoading={isLoading} isDisabled={confirmDisabled} onClick={onSubmit}>{confirmLabel}</Button>
        </ModalFooter>
      </Modal>
    )}
  </ModalTransition>
);
```

```tsx
// web/src/core/features/directives/CreateDirectiveModal.tsx
import React, { useEffect, useId, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import Textfield from '@atlaskit/textfield';
import TextArea from '@atlaskit/textarea';
import { apiErrorMessage, createDirective, fetchDieuHanhUnits } from '../../api';
import { useToast } from '../../../shared/components/Toast';
import { todayVnKey } from '../../../shared/utils/date';
import { DH_UNITS_KEY, DIRECTIVES_KEY } from '../dieuhanh/queryKeys';
import { useDhActor } from '../dieuhanh/useDhActor';
import { ErrorText, FIELD_STYLE, FormDialog, SelectField } from '../dieuhanh/parts';

export const CreateDirectiveModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const actor = useDhActor();
  const navigate = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();
  const titleId = useId();
  const bodyId = useId();
  const deadlineId = useId();
  const [toUnit, setToUnit] = useState('');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [deadline, setDeadline] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) { setToUnit(''); setTitle(''); setBody(''); setDeadline(''); setError(''); }
  }, [isOpen]);

  const { data: units = [] } = useQuery({ queryKey: DH_UNITS_KEY, queryFn: fetchDieuHanhUnits, enabled: isOpen });
  const options = units.filter((u) => u.id !== actor.unitId).map((u) => ({ value: String(u.id), label: u.name }));

  const mutation = useMutation({
    mutationFn: createDirective,
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: DIRECTIVES_KEY });
      toast.success('Đã giao việc.');
      onClose();
      navigate(`/directive/${created.id}`);
    },
    onError: (err) => setError(apiErrorMessage(err, 'Không giao được việc.')),
  });

  const submit = () => {
    if (!toUnit || !title.trim() || !deadline) {
      setError('Chọn đơn vị nhận, nhập tiêu đề và hạn hoàn thành.');
      return;
    }
    setError('');
    mutation.mutate({ to_unit_id: Number(toUnit), title: title.trim(), body: body.trim() || undefined, deadline });
  };

  return (
    <FormDialog isOpen={isOpen} title="Giao việc mới" confirmLabel="Giao việc" isLoading={mutation.isPending} onSubmit={submit} onCancel={onClose}>
      <SelectField label="Đơn vị nhận" required value={toUnit} onChange={setToUnit} options={options} placeholder="Chọn đơn vị" />
      <div style={{ marginTop: 12 }}>
        <label htmlFor={titleId}>Tiêu đề *</label>
        <Textfield id={titleId} value={title} maxLength={200} onChange={(e) => setTitle((e.target as HTMLInputElement).value)} />
      </div>
      <div style={{ marginTop: 12 }}>
        <label htmlFor={bodyId}>Nội dung</label>
        <TextArea id={bodyId} value={body} minimumRows={3} onChange={(e) => setBody(e.target.value)} />
      </div>
      <div style={{ marginTop: 12 }}>
        <label htmlFor={deadlineId}>Hạn hoàn thành *</label>
        <input id={deadlineId} type="date" min={todayVnKey()} value={deadline} onChange={(e) => setDeadline(e.target.value)} style={FIELD_STYLE} />
      </div>
      <ErrorText message={error} />
    </FormDialog>
  );
};
```

```tsx
// web/src/core/features/directives/DirectivesView.tsx
import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import Button from '@atlaskit/button/new';
import { token } from '@atlaskit/tokens';
import { apiErrorMessage, fetchDirectives } from '../../api';
import { LottieLoading } from '../../../shared/components/LottieLoading';
import { formatVnDate } from '../../../shared/utils/date';
import { DIRECTIVES_KEY } from '../dieuhanh/queryKeys';
import { useDhActor } from '../dieuhanh/useDhActor';
import { canCreateDirective } from '../dieuhanh/permissions';
import { DIRECTIVE_STATUS, directiveStatus } from '../dieuhanh/labels';
import { ErrorText, FIELD_STYLE, StatusLozenge } from '../dieuhanh/parts';
import { CreateDirectiveModal } from './CreateDirectiveModal';

type Direction = 'all' | 'received' | 'sent';
const CELL: React.CSSProperties = { padding: '8px 12px', textAlign: 'left', borderBottom: `1px solid ${token('color.border', '#DFE1E6')}` };

export const DirectivesView: React.FC = () => {
  const actor = useDhActor();
  const [direction, setDirection] = useState<Direction>('all');
  const [status, setStatus] = useState('all');
  const [creating, setCreating] = useState(false);
  const { data, isLoading, error } = useQuery({ queryKey: DIRECTIVES_KEY, queryFn: fetchDirectives });

  const rows = useMemo(() => (data ?? []).filter((d) => {
    if (direction === 'received' && d.to_unit_id !== actor.unitId) return false;
    if (direction === 'sent' && d.from_unit_id !== actor.unitId) return false;
    return status === 'all' || d.status === status;
  }), [data, direction, status, actor.unitId]);

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', paddingTop: 4 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
        <h1 style={{ margin: 0 }}>Giao việc</h1>
        {canCreateDirective(actor) && <Button appearance="primary" onClick={() => setCreating(true)}>Giao việc mới</Button>}
      </div>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 16 }}>
        <div>
          <label htmlFor="dir-direction">Hướng</label>
          <select id="dir-direction" value={direction} onChange={(e) => setDirection(e.target.value as Direction)} style={FIELD_STYLE}>
            <option value="all">Tất cả</option>
            <option value="received">Nhận về</option>
            <option value="sent">Đơn vị mình gửi</option>
          </select>
        </div>
        <div>
          <label htmlFor="dir-status">Trạng thái</label>
          <select id="dir-status" value={status} onChange={(e) => setStatus(e.target.value)} style={FIELD_STYLE}>
            <option value="all">Tất cả</option>
            {Object.entries(DIRECTIVE_STATUS).map(([value, { label }]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </div>
      </div>
      {isLoading && <LottieLoading message="Đang tải chỉ đạo..." size={80} />}
      {error && <ErrorText message={apiErrorMessage(error, 'Không tải được danh sách chỉ đạo.')} />}
      {!isLoading && !error && rows.length === 0 && <p>Chưa có chỉ đạo nào.</p>}
      {rows.length > 0 && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>{['Tiêu đề', 'Đơn vị giao', 'Đơn vị nhận', 'Hạn', 'Trạng thái'].map((h) => <th key={h} style={CELL}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {rows.map((d) => {
                const s = directiveStatus(d.status);
                return (
                  <tr key={d.id}>
                    <td style={CELL}><Link to={`/directive/${d.id}`}>{d.title}</Link></td>
                    <td style={CELL}>{d.from_unit_name ?? `Đơn vị #${d.from_unit_id}`}</td>
                    <td style={CELL}>{d.to_unit_name ?? `Đơn vị #${d.to_unit_id}`}</td>
                    <td style={CELL}>{formatVnDate(d.deadline) || '—'}</td>
                    <td style={CELL}><StatusLozenge label={s.label} tone={s.tone} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <CreateDirectiveModal isOpen={creating} onClose={() => setCreating(false)} />
    </div>
  );
};
```

Ghi chú: `LottieLoading` nhận `message`/`size` như `DocumentsView` đang dùng (kiểm chữ ký thật tại `web/src/shared/components/LottieLoading.tsx` trước khi viết; nếu không có `size`, bỏ prop đó).

- [ ] **Step 4: Chạy**

Run: `npx vitest run src/core/features/directives/DirectivesView.test.tsx && npx tsc --noEmit -p .` — Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add web/src/core/features/dieuhanh web/src/core/features/directives
git commit -m "feat(web): danh sách Giao việc và hộp tạo chỉ đạo"
```

---

### Task 6: Web — chi tiết chỉ đạo và các hộp thoại tiếp nhận, gắn hoạt động, nộp kết quả, đánh giá

**Files:**
- Create: `web/src/core/features/directives/DirectiveDialogs.tsx`, `DirectiveDetailView.tsx`
- Test: `web/src/core/features/directives/DirectiveDetailView.test.tsx`

**Interfaces:**
- Consumes: Task 3–5, `ReasonDialog` (đợt 0).
- Produces: `AcknowledgeDialog`, `LinkActivityDialog`, `SubmitResultDialog` (props ở code), `DirectiveDetailView` (đọc `:id` từ route `/directive/:id`).

- [ ] **Step 1: Viết test hỏng**

```tsx
// web/src/core/features/directives/DirectiveDetailView.test.tsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, fireEvent, waitFor, cleanup, within } from '@testing-library/react';
import { DirectiveDetailView } from './DirectiveDetailView';
import { BTV_UNIT, renderDh, TCKT_UNIT } from '../dieuhanh/testUtils';
import * as api from '../../api';

vi.mock('../../api', async () => {
  const actual = await vi.importActual<typeof import('../../api')>('../../api');
  return {
    ...actual, fetchDirective: vi.fn(), fetchUnitMembers: vi.fn(), fetchActivities: vi.fn(),
    acknowledgeDirective: vi.fn(), linkDirectiveActivity: vi.fn(), submitDirectiveResult: vi.fn(), respondDirective: vi.fn(),
  };
});

const detail = (over: Partial<api.DirectiveDetail> = {}): api.DirectiveDetail => ({
  id: 7, from_unit_id: 1, to_unit_id: 2, title: 'Báo cáo quý IV', body: 'Nộp trước hạn', deadline: '2026-12-01', status: 'sent',
  created_by: 9, owner_user_id: null, acknowledged_at: null, created_at: '2026-10-01T03:00:00.000Z', updated_at: '',
  from_unit_name: 'Ban Thường vụ', to_unit_name: 'Ban TCKT', created_by_name: 'Lê BTV', owner_name: null,
  submissions: [], activities: [], ...over,
});
const at = (unit = TCKT_UNIT, role = 'admin') => renderDh(<DirectiveDetailView />, { path: '/directive/7', route: '/directive/:id', unit, role });

describe('DirectiveDetailView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.fetchDirective).mockResolvedValue(detail());
    vi.mocked(api.fetchUnitMembers).mockResolvedValue([
      { user_id: 5, name: 'Tôi', email: 't@x', role: 'admin' },
      { user_id: 8, name: 'Nguyễn Văn B', email: 'b@x', role: 'member' },
    ]);
    vi.mocked(api.fetchActivities).mockResolvedValue([
      { id: 31, title: 'Hội nghị A', status: 'approved', deadline: '2026-11-30' } as api.ActivityItem,
      { id: 32, title: 'Việc đã huỷ', status: 'cancelled', deadline: '2026-11-30' } as api.ActivityItem,
    ]);
  });
  afterEach(cleanup);

  it('hiện thông tin chỉ đạo và tên người/đơn vị', async () => {
    at();
    expect(await screen.findByRole('heading', { name: 'Báo cáo quý IV' })).toBeDefined();
    expect(screen.getByText('Ban Thường vụ')).toBeDefined();
    expect(screen.getByText('Nộp trước hạn')).toBeDefined();
    expect(screen.getByText('Lê BTV')).toBeDefined();
    expect(screen.getByText('01/12/2026')).toBeDefined();
  });

  it('TCKT admin tiếp nhận: chọn người phụ trách, gọi API, làm mới cache', async () => {
    vi.mocked(api.acknowledgeDirective).mockResolvedValueOnce({} as api.Directive);
    const { qc } = at();
    fireEvent.click(await screen.findByRole('button', { name: 'Tiếp nhận' }));
    const dialog = await screen.findByRole('dialog');
    await within(dialog).findByRole('option', { name: /Nguyễn Văn B/ });
    fireEvent.change(within(dialog).getByLabelText('Người phụ trách'), { target: { value: '8' } });
    const spy = vi.spyOn(qc, 'invalidateQueries');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Tiếp nhận' }));
    await waitFor(() => expect(api.acknowledgeDirective).toHaveBeenCalledWith(7, 8));
    await waitFor(() => expect(spy).toHaveBeenCalledWith({ queryKey: ['directives'] }));
  });

  it('chặn: BTV (đơn vị giao) không thấy Tiếp nhận; TCKT leader cũng không', async () => {
    at(BTV_UNIT, 'btv_lead');
    await screen.findByRole('heading', { name: 'Báo cáo quý IV' });
    expect(screen.queryByRole('button', { name: 'Tiếp nhận' })).toBeNull();
    cleanup();
    at(TCKT_UNIT, 'leader');
    await screen.findByRole('heading', { name: 'Báo cáo quý IV' });
    expect(screen.queryByRole('button', { name: 'Tiếp nhận' })).toBeNull();
  });

  it('gắn hoạt động: chỉ liệt kê hoạt động còn hiệu lực chưa gắn, gọi đúng API', async () => {
    vi.mocked(api.fetchDirective).mockResolvedValue(detail({ status: 'acknowledged', owner_user_id: 5 }));
    vi.mocked(api.linkDirectiveActivity).mockResolvedValueOnce({} as api.Directive);
    at();
    fireEvent.click(await screen.findByRole('button', { name: 'Gắn hoạt động' }));
    const dialog = await screen.findByRole('dialog');
    await within(dialog).findByRole('option', { name: 'Hội nghị A' });
    expect(within(dialog).queryByRole('option', { name: 'Việc đã huỷ' })).toBeNull();
    fireEvent.change(within(dialog).getByLabelText(/Hoạt động/), { target: { value: '31' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Gắn' }));
    await waitFor(() => expect(api.linkDirectiveActivity).toHaveBeenCalledWith(7, 31));
  });

  it('nộp kết quả: nguồn là hoạt động đã gắn; chưa gắn thì báo và khoá nút', async () => {
    vi.mocked(api.fetchDirective).mockResolvedValue(detail({ status: 'in_progress', owner_user_id: 5, activities: [{ id: 31, title: 'Hội nghị A', status: 'approved' }] }));
    vi.mocked(api.submitDirectiveResult).mockResolvedValueOnce({});
    at();
    fireEvent.click(await screen.findByRole('button', { name: 'Nộp kết quả' }));
    let dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText('Ghi chú'), { target: { value: 'Đã xong' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Nộp' }));
    await waitFor(() => expect(api.submitDirectiveResult).toHaveBeenCalledWith(7, { source_type: 'activity', source_id: 31, note: 'Đã xong' }));
    cleanup();
    vi.mocked(api.fetchDirective).mockResolvedValue(detail({ status: 'in_progress', owner_user_id: 5, activities: [] }));
    at();
    fireEvent.click(await screen.findByRole('button', { name: 'Nộp kết quả' }));
    dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Hãy gắn ít nhất một hoạt động trước.')).toBeDefined();
  });

  it('BTV đánh giá: yêu cầu sửa bắt buộc lý do; chấp nhận không bắt buộc', async () => {
    vi.mocked(api.fetchDirective).mockResolvedValue(detail({ status: 'submitted' }));
    vi.mocked(api.respondDirective).mockResolvedValue({} as api.Directive);
    at(BTV_UNIT, 'btv_lead');
    fireEvent.click(await screen.findByRole('button', { name: 'Yêu cầu sửa' }));
    let dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Gửi yêu cầu' }));
    expect(api.respondDirective).not.toHaveBeenCalled();
    fireEvent.change(within(dialog).getByLabelText(/Lý do/), { target: { value: 'Thiếu số liệu' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Gửi yêu cầu' }));
    await waitFor(() => expect(api.respondDirective).toHaveBeenCalledWith(7, { response: 'revision_requested', response_note: 'Thiếu số liệu' }));
    cleanup();
    at(BTV_UNIT, 'btv_lead');
    fireEvent.click(await screen.findByRole('button', { name: 'Chấp nhận' }));
    dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Chấp nhận' }));
    await waitFor(() => expect(api.respondDirective).toHaveBeenLastCalledWith(7, { response: 'accepted', response_note: undefined }));
  });

  it('chặn: TCKT admin không thấy nút đánh giá', async () => {
    vi.mocked(api.fetchDirective).mockResolvedValue(detail({ status: 'submitted' }));
    at();
    await screen.findByRole('heading', { name: 'Báo cáo quý IV' });
    expect(screen.queryByRole('button', { name: 'Chấp nhận' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Yêu cầu sửa' })).toBeNull();
  });

  it('lỗi server khi tiếp nhận hiện bằng tiếng Việt', async () => {
    vi.mocked(api.acknowledgeDirective).mockRejectedValueOnce({ response: { status: 400, data: { error: 'Chỉ đạo không ở trạng thái chờ tiếp nhận.' } } });
    at();
    fireEvent.click(await screen.findByRole('button', { name: 'Tiếp nhận' }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Tiếp nhận' }));
    expect(await screen.findByText('Chỉ đạo không ở trạng thái chờ tiếp nhận.')).toBeDefined();
  });

  it('liệt kê hoạt động liên kết và kết quả đã nộp với đường dẫn tới trang chi tiết', async () => {
    vi.mocked(api.fetchDirective).mockResolvedValue(detail({
      status: 'submitted',
      activities: [{ id: 31, title: 'Hội nghị A', status: 'approved' }],
      submissions: [{
        id: 44, from_unit_id: 2, to_unit_id: 1, source_type: 'activity', source_id: 31, directive_id: 7, note: 'Đã xong', submitted_by: 5,
        response: null, response_note: null, responded_by: null, responded_at: null, withdrawn_at: null, created_at: '2026-10-05T03:00:00.000Z',
        source_title: 'Hội nghị A',
      }],
    }));
    at();
    expect((await screen.findByRole('link', { name: 'Hội nghị A' })).getAttribute('href')).toBe('/activity/31');
    expect(screen.getByRole('link', { name: /Hoạt động: Hội nghị A/ }).getAttribute('href')).toBe('/submission/44');
  });
});
```

- [ ] **Step 2: Chạy, xác nhận hỏng**

Run: `npx vitest run src/core/features/directives/DirectiveDetailView.test.tsx` — Expected: FAIL (không resolve `./DirectiveDetailView`).

- [ ] **Step 3: Viết code**

```tsx
// web/src/core/features/directives/DirectiveDialogs.tsx
import React, { useEffect, useId, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import TextArea from '@atlaskit/textarea';
import { fetchActivities, fetchUnitMembers, type Directive, type DirectiveDetail } from '../../api';
import { ErrorText, FormDialog, SelectField } from '../dieuhanh/parts';

/** Tiếp nhận chỉ đạo, có thể chọn người phụ trách trong đơn vị mình (mặc định: người đang thao tác). */
export const AcknowledgeDialog: React.FC<{
  isOpen: boolean; unitId: number; defaultOwnerId: number | null; isLoading: boolean;
  onSubmit: (ownerUserId: number | undefined) => void; onCancel: () => void;
}> = ({ isOpen, unitId, defaultOwnerId, isLoading, onSubmit, onCancel }) => {
  const [owner, setOwner] = useState('');
  useEffect(() => { if (isOpen) setOwner(defaultOwnerId ? String(defaultOwnerId) : ''); }, [isOpen, defaultOwnerId]);
  const { data: members = [] } = useQuery({ queryKey: ['dieu-hanh-members', unitId], queryFn: () => fetchUnitMembers(unitId), enabled: isOpen });
  return (
    <FormDialog isOpen={isOpen} title="Tiếp nhận chỉ đạo" confirmLabel="Tiếp nhận" isLoading={isLoading}
      onSubmit={() => onSubmit(owner ? Number(owner) : undefined)} onCancel={onCancel}>
      <SelectField label="Người phụ trách" value={owner} onChange={setOwner} placeholder="Tôi (người tiếp nhận)"
        options={members.map((m) => ({ value: String(m.user_id), label: `${m.name} (${m.role})` }))} />
    </FormDialog>
  );
};

/** Gắn một hoạt động của đơn vị mình vào chỉ đạo (chưa huỷ, chưa gắn). */
export const LinkActivityDialog: React.FC<{
  isOpen: boolean; directive: DirectiveDetail; isLoading: boolean; onSubmit: (activityId: number) => void; onCancel: () => void;
}> = ({ isOpen, directive, isLoading, onSubmit, onCancel }) => {
  const [activityId, setActivityId] = useState('');
  useEffect(() => { if (!isOpen) setActivityId(''); }, [isOpen]);
  const { data: activities = [] } = useQuery({ queryKey: ['dieu-hanh-activities'], queryFn: () => fetchActivities(), enabled: isOpen });
  const linked = new Set(directive.activities.map((a) => a.id));
  const options = activities
    .filter((a) => a.status !== 'cancelled' && !linked.has(a.id))
    .map((a) => ({ value: String(a.id), label: a.title }));
  return (
    <FormDialog isOpen={isOpen} title="Gắn hoạt động vào chỉ đạo" confirmLabel="Gắn" isLoading={isLoading}
      confirmDisabled={!activityId} onSubmit={() => onSubmit(Number(activityId))} onCancel={onCancel}>
      <SelectField label="Hoạt động" required value={activityId} onChange={setActivityId} options={options} placeholder="Chọn hoạt động" />
    </FormDialog>
  );
};

/** Nộp kết quả: nguồn là một hoạt động đã gắn với chỉ đạo (ops_log/báo cáo chưa có để chọn). */
export const SubmitResultDialog: React.FC<{
  isOpen: boolean; directive: DirectiveDetail; isLoading: boolean;
  onSubmit: (payload: { source_type: 'activity'; source_id: number; note?: string }) => void; onCancel: () => void;
}> = ({ isOpen, directive, isLoading, onSubmit, onCancel }) => {
  const noteId = useId();
  const [source, setSource] = useState('');
  const [note, setNote] = useState('');
  useEffect(() => {
    if (isOpen) { setSource(directive.activities.length === 1 ? String(directive.activities[0].id) : ''); setNote(''); }
  }, [isOpen, directive.activities]);
  const empty = directive.activities.length === 0;
  return (
    <FormDialog isOpen={isOpen} title="Nộp kết quả chỉ đạo" confirmLabel="Nộp" isLoading={isLoading} confirmDisabled={empty || !source}
      onSubmit={() => onSubmit({ source_type: 'activity', source_id: Number(source), note: note.trim() || undefined })} onCancel={onCancel}>
      {empty && <ErrorText message="Hãy gắn ít nhất một hoạt động trước." />}
      <SelectField label="Hoạt động làm kết quả" required value={source} onChange={setSource} disabled={empty}
        options={directive.activities.map((a) => ({ value: String(a.id), label: a.title }))} placeholder="Chọn hoạt động" />
      <div style={{ marginTop: 12 }}>
        <label htmlFor={noteId}>Ghi chú</label>
        <TextArea id={noteId} value={note} minimumRows={3} onChange={(e) => setNote(e.target.value)} />
      </div>
    </FormDialog>
  );
};

export type DirectiveForDialogs = Directive;
```

(Dòng `export type DirectiveForDialogs` có thể bỏ nếu `Directive` không dùng ở nơi khác trong file; nếu `tsc` báo import thừa `Directive`, xoá cả hai.)

```tsx
// web/src/core/features/directives/DirectiveDetailView.tsx
import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Button from '@atlaskit/button/new';
import { token } from '@atlaskit/tokens';
import {
  acknowledgeDirective, apiErrorMessage, fetchDirective, linkDirectiveActivity, respondDirective, submitDirectiveResult,
} from '../../api';
import { LottieLoading } from '../../../shared/components/LottieLoading';
import { ReasonDialog } from '../../../shared/components/ReasonDialog';
import { useToast } from '../../../shared/components/Toast';
import { formatVnDate } from '../../../shared/utils/date';
import { DIRECTIVE_KEY, DIRECTIVES_KEY, SUBMISSIONS_KEY } from '../dieuhanh/queryKeys';
import { useDhActor } from '../dieuhanh/useDhActor';
import {
  canAcknowledgeDirective, canLinkActivity, canRespondDirective, canSubmitDirective,
} from '../dieuhanh/permissions';
import { directiveStatus, sourceText, submissionStatus } from '../dieuhanh/labels';
import { ErrorText, StatusLozenge } from '../dieuhanh/parts';
import { AcknowledgeDialog, LinkActivityDialog, SubmitResultDialog } from './DirectiveDialogs';

type Dialog = null | 'ack' | 'link' | 'submit' | 'accept' | 'revise';

const Info: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div style={{ marginBottom: 8 }}>
    <div style={{ fontSize: 12, color: token('color.text.subtle', '#5E6C84') }}>{label}</div>
    <div>{children}</div>
  </div>
);

export const DirectiveDetailView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const directiveId = Number(id);
  const actor = useDhActor();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [dialog, setDialog] = useState<Dialog>(null);

  const { data: d, isLoading, error } = useQuery({
    queryKey: DIRECTIVE_KEY(directiveId),
    queryFn: () => fetchDirective(directiveId),
    enabled: Number.isInteger(directiveId),
  });

  const done = (message: string) => {
    setDialog(null);
    toast.success(message);
    queryClient.invalidateQueries({ queryKey: DIRECTIVES_KEY });
    queryClient.invalidateQueries({ queryKey: SUBMISSIONS_KEY });
  };
  const fail = (err: unknown) => {
    setDialog(null);
    toast.error(apiErrorMessage(err));
  };

  const ack = useMutation({ mutationFn: (owner?: number) => acknowledgeDirective(directiveId, owner), onSuccess: () => done('Đã tiếp nhận chỉ đạo.'), onError: fail });
  const link = useMutation({ mutationFn: (activityId: number) => linkDirectiveActivity(directiveId, activityId), onSuccess: () => done('Đã gắn hoạt động.'), onError: fail });
  const submit = useMutation({
    mutationFn: (payload: { source_type: 'activity'; source_id: number; note?: string }) => submitDirectiveResult(directiveId, payload),
    onSuccess: () => done('Đã nộp kết quả.'), onError: fail,
  });
  const respond = useMutation({
    mutationFn: (payload: { response: 'accepted' | 'revision_requested'; response_note?: string }) => respondDirective(directiveId, payload),
    onSuccess: (_r, vars) => done(vars.response === 'accepted' ? 'Đã chấp nhận kết quả.' : 'Đã yêu cầu sửa.'), onError: fail,
  });

  if (isLoading) return <LottieLoading message="Đang tải chỉ đạo..." size={80} />;
  if (error || !d) return <ErrorText message={apiErrorMessage(error, 'Không tải được chỉ đạo.')} />;

  const status = directiveStatus(d.status);
  return (
    <div style={{ maxWidth: 960, margin: '0 auto' }}>
      <p><Link to="/directives">← Danh sách chỉ đạo</Link></p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <h1 style={{ margin: 0 }}>{d.title}</h1>
        <StatusLozenge label={status.label} tone={status.tone} />
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '16px 0' }}>
        {canAcknowledgeDirective(actor, d) && <Button appearance="primary" onClick={() => setDialog('ack')}>Tiếp nhận</Button>}
        {canLinkActivity(actor, d) && <Button onClick={() => setDialog('link')}>Gắn hoạt động</Button>}
        {canSubmitDirective(actor, d) && <Button appearance="primary" onClick={() => setDialog('submit')}>Nộp kết quả</Button>}
        {canRespondDirective(actor, d) && (
          <>
            <Button appearance="primary" onClick={() => setDialog('accept')}>Chấp nhận</Button>
            <Button appearance="danger" onClick={() => setDialog('revise')}>Yêu cầu sửa</Button>
          </>
        )}
      </div>

      <Info label="Đơn vị giao">{d.from_unit_name ?? `Đơn vị #${d.from_unit_id}`}</Info>
      <Info label="Đơn vị nhận">{d.to_unit_name ?? `Đơn vị #${d.to_unit_id}`}</Info>
      <Info label="Hạn hoàn thành">{formatVnDate(d.deadline) || '—'}</Info>
      <Info label="Người giao">{d.created_by_name ?? '—'}</Info>
      <Info label="Người phụ trách">{d.owner_name ?? 'Chưa có'}</Info>
      {d.acknowledged_at && <Info label="Tiếp nhận lúc">{formatVnDate(d.acknowledged_at)}</Info>}
      {d.body && <Info label="Nội dung"><span style={{ whiteSpace: 'pre-wrap' }}>{d.body}</span></Info>}

      <h2 style={{ marginTop: 24 }}>Hoạt động liên kết</h2>
      {d.activities.length === 0 ? <p>Chưa gắn hoạt động nào.</p> : (
        <ul>{d.activities.map((a) => <li key={a.id}><Link to={`/activity/${a.id}`}>{a.title}</Link> ({a.status})</li>)}</ul>
      )}

      <h2 style={{ marginTop: 24 }}>Kết quả đã nộp</h2>
      {d.submissions.length === 0 ? <p>Chưa nộp kết quả.</p> : (
        <ul>
          {d.submissions.map((s) => {
            const st = submissionStatus(s);
            return (
              <li key={s.id} style={{ marginBottom: 8 }}>
                <Link to={`/submission/${s.id}`}>{sourceText(s)}</Link>{' '}
                <StatusLozenge label={st.label} tone={st.tone} />
                {s.note && <div>Ghi chú: {s.note}</div>}
                {s.response_note && <div>Phản hồi: {s.response_note}</div>}
              </li>
            );
          })}
        </ul>
      )}

      <AcknowledgeDialog isOpen={dialog === 'ack'} unitId={d.to_unit_id} defaultOwnerId={actor.userId} isLoading={ack.isPending}
        onSubmit={(owner) => ack.mutate(owner)} onCancel={() => setDialog(null)} />
      <LinkActivityDialog isOpen={dialog === 'link'} directive={d} isLoading={link.isPending}
        onSubmit={(activityId) => link.mutate(activityId)} onCancel={() => setDialog(null)} />
      <SubmitResultDialog isOpen={dialog === 'submit'} directive={d} isLoading={submit.isPending}
        onSubmit={(payload) => submit.mutate(payload)} onCancel={() => setDialog(null)} />
      <ReasonDialog isOpen={dialog === 'accept'} title="Chấp nhận kết quả" label="Ghi chú" required={false} confirmLabel="Chấp nhận"
        isLoading={respond.isPending} onSubmit={(note) => respond.mutate({ response: 'accepted', response_note: note || undefined })}
        onCancel={() => setDialog(null)} />
      <ReasonDialog isOpen={dialog === 'revise'} title="Yêu cầu sửa" confirmLabel="Gửi yêu cầu" appearance="danger"
        isLoading={respond.isPending} onSubmit={(note) => respond.mutate({ response: 'revision_requested', response_note: note })}
        onCancel={() => setDialog(null)} />
    </div>
  );
};
```

Ghi chú test: nút "Chấp nhận" trên trang và trong hộp thoại cùng tên; test dùng `within(dialog)` cho nút trong hộp thoại, và `screen.findByRole('button', { name: 'Chấp nhận' })` trước khi mở hộp (khi đó chỉ có một). Nếu Atlaskit đánh `aria-hidden` phần còn lại của trang khi mở modal, `getByRole` ngoài `dialog` sẽ không thấy nút trang — đúng ý.

- [ ] **Step 4: Chạy**

Run: `npx vitest run src/core/features/directives && npx tsc --noEmit -p .` — Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add web/src/core/features/directives
git commit -m "feat(web): chi tiết chỉ đạo, tiếp nhận, gắn hoạt động, nộp kết quả, đánh giá"
```

---

### Task 7: Web — danh sách Trình và hộp tạo trình (kèm nút dùng lại cho đợt 6)

**Files:**
- Create: `web/src/core/features/submissions/SubmissionsView.tsx`, `CreateSubmissionModal.tsx`, `CreateSubmissionButton.tsx`
- Test: `web/src/core/features/submissions/SubmissionsView.test.tsx`

**Interfaces:**
- Consumes: Task 3–5.
- Produces:
  - `CreateSubmissionModal({ isOpen, onClose, preset? })` với `SubmissionPreset = { sourceType: SubmissionSource; sourceId: number; label: string }`.
  - `CreateSubmissionButton({ preset })`: nút "Trình lên…" tự ẩn khi người dùng không có quyền tạo trình hoặc đơn vị không có `dieu-hanh`. **Đợt 6 dùng nút này cho nhật ký trực ban** (`sourceType: 'ops_log'`).
  - `SubmissionsView`.

- [ ] **Step 1: Viết test hỏng**

```tsx
// web/src/core/features/submissions/SubmissionsView.test.tsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, fireEvent, waitFor, cleanup, within } from '@testing-library/react';
import { SubmissionsView } from './SubmissionsView';
import { CreateSubmissionButton } from './CreateSubmissionButton';
import { BTV_UNIT, renderDh, TCKT_UNIT } from '../dieuhanh/testUtils';
import * as api from '../../api';

vi.mock('../../api', async () => {
  const actual = await vi.importActual<typeof import('../../api')>('../../api');
  return {
    ...actual, fetchSubmissions: vi.fn(), fetchDieuHanhUnits: vi.fn(), fetchActivities: vi.fn(), fetchDirectives: vi.fn(), createSubmission: vi.fn(),
  };
});

const sub = (over: Partial<api.Submission> = {}): api.Submission => ({
  id: 44, from_unit_id: 2, to_unit_id: 1, source_type: 'activity', source_id: 31, directive_id: null, note: null, submitted_by: 5,
  response: null, response_note: null, responded_by: null, responded_at: null, withdrawn_at: null, created_at: '2026-10-05T03:00:00.000Z',
  from_unit_name: 'Ban TCKT', to_unit_name: 'Ban Thường vụ', source_title: 'Hội nghị A', ...over,
});

describe('SubmissionsView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.fetchSubmissions).mockResolvedValue([
      sub(),
      sub({ id: 45, source_title: 'Hội nghị B', response: 'accepted' }),
      sub({ id: 46, source_title: 'Hội nghị C', withdrawn_at: '2026-10-06T03:00:00.000Z' }),
    ]);
    vi.mocked(api.fetchDieuHanhUnits).mockResolvedValue([
      { id: 1, code: 'BTV', name: 'Ban Thường vụ', kind: 'standing_committee' },
      { id: 2, code: 'TCKT', name: 'Ban TCKT', kind: 'department' },
    ]);
    vi.mocked(api.fetchActivities).mockResolvedValue([
      { id: 31, title: 'Hội nghị A', status: 'approved' } as api.ActivityItem,
      { id: 33, title: 'Đề xuất chưa duyệt', status: 'proposed' } as api.ActivityItem,
    ]);
    vi.mocked(api.fetchDirectives).mockResolvedValue([
      { id: 7, from_unit_id: 1, to_unit_id: 2, title: 'Báo cáo quý IV', status: 'in_progress' } as api.Directive,
      { id: 8, from_unit_id: 1, to_unit_id: 2, title: 'Đã xong rồi', status: 'accepted' } as api.Directive,
    ]);
  });
  afterEach(cleanup);

  it('liệt kê trình với nguồn, đơn vị và trạng thái; dòng dẫn tới trang chi tiết', async () => {
    renderDh(<SubmissionsView />, { path: '/submissions' });
    const link = await screen.findByRole('link', { name: 'Hoạt động: Hội nghị A' });
    expect(link.getAttribute('href')).toBe('/submission/44');
    const tr = link.closest('tr') as HTMLElement;
    expect(within(tr).getByText('Chờ phản hồi')).toBeDefined();
    expect(within(tr).getByText('Ban Thường vụ')).toBeDefined();
    const rows = screen.getAllByRole('row');
    expect(rows.some((r) => within(r).queryByText('Đã rút lại'))).toBe(true);
    expect(rows.some((r) => within(r).queryByText('Đã chấp nhận'))).toBe(true);
  });

  it('lọc theo trạng thái "Chờ phản hồi" loại bỏ trình đã trả lời và đã rút', async () => {
    renderDh(<SubmissionsView />, { path: '/submissions' });
    await screen.findByText('Hoạt động: Hội nghị A');
    fireEvent.change(screen.getByLabelText('Trạng thái'), { target: { value: 'pending' } });
    expect(screen.getByText('Hoạt động: Hội nghị A')).toBeDefined();
    expect(screen.queryByText('Hoạt động: Hội nghị B')).toBeNull();
    expect(screen.queryByText('Hoạt động: Hội nghị C')).toBeNull();
  });

  it('nút "Trình lên" chỉ cho admin/BTV; leader không thấy', async () => {
    renderDh(<SubmissionsView />, { path: '/submissions', unit: TCKT_UNIT, role: 'leader' });
    await screen.findByText('Hoạt động: Hội nghị A');
    expect(screen.queryByRole('button', { name: 'Trình lên' })).toBeNull();
    cleanup();
    renderDh(<SubmissionsView />, { path: '/submissions', unit: TCKT_UNIT, role: 'admin' });
    expect(await screen.findByRole('button', { name: 'Trình lên' })).toBeDefined();
  });

  it('tạo trình từ hoạt động, gắn chỉ đạo đang thực hiện; gửi đúng body và làm mới cache', async () => {
    vi.mocked(api.createSubmission).mockResolvedValueOnce(sub({ id: 60 }));
    const { qc } = renderDh(<SubmissionsView />, { path: '/submissions', unit: TCKT_UNIT, role: 'admin' });
    fireEvent.click(await screen.findByRole('button', { name: 'Trình lên' }));
    const dialog = await screen.findByRole('dialog');
    await within(dialog).findByRole('option', { name: 'Ban Thường vụ' });
    expect(within(dialog).queryByRole('option', { name: 'Ban TCKT' })).toBeNull();
    await within(dialog).findByRole('option', { name: 'Hội nghị A' });
    expect(within(dialog).queryByRole('option', { name: 'Đề xuất chưa duyệt' })).toBeNull();
    fireEvent.change(within(dialog).getByLabelText(/Đơn vị nhận/), { target: { value: '1' } });
    expect(within(dialog).getByRole('option', { name: 'Báo cáo quý IV' })).toBeDefined();
    expect(within(dialog).queryByRole('option', { name: 'Đã xong rồi' })).toBeNull();
    fireEvent.change(within(dialog).getByLabelText(/Hoạt động/), { target: { value: '31' } });
    fireEvent.change(within(dialog).getByLabelText(/Gắn với chỉ đạo/), { target: { value: '7' } });
    fireEvent.change(within(dialog).getByLabelText('Ghi chú'), { target: { value: ' Gửi anh xem ' } });
    const spy = vi.spyOn(qc, 'invalidateQueries');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Trình' }));
    await waitFor(() => expect(api.createSubmission).toHaveBeenCalledWith({
      to_unit_id: 1, source_type: 'activity', source_id: 31, directive_id: 7, note: 'Gửi anh xem',
    }));
    await waitFor(() => expect(spy).toHaveBeenCalledWith({ queryKey: ['submissions'] }));
  });

  it('thiếu đơn vị nhận hoặc nguồn thì không gọi API', async () => {
    renderDh(<SubmissionsView />, { path: '/submissions', unit: TCKT_UNIT, role: 'admin' });
    fireEvent.click(await screen.findByRole('button', { name: 'Trình lên' }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Trình' }));
    expect(within(dialog).getByText('Chọn đơn vị nhận và hoạt động cần trình.')).toBeDefined();
    expect(api.createSubmission).not.toHaveBeenCalled();
  });
});

describe('CreateSubmissionButton (dùng cho nhật ký trực ban ở đợt 6)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.fetchDieuHanhUnits).mockResolvedValue([{ id: 1, code: 'BTV', name: 'Ban Thường vụ', kind: 'standing_committee' }]);
    vi.mocked(api.fetchDirectives).mockResolvedValue([]);
    vi.mocked(api.fetchActivities).mockResolvedValue([]);
  });
  afterEach(cleanup);
  const preset = { sourceType: 'ops_log' as const, sourceId: 12, label: 'Ca trực 08/10' };

  it('ẩn khi không có quyền tạo trình hoặc đơn vị không có module', () => {
    renderDh(<CreateSubmissionButton preset={preset} />, { path: '/', role: 'member' });
    expect(screen.queryByRole('button', { name: /Trình lên/ })).toBeNull();
    cleanup();
    renderDh(<CreateSubmissionButton preset={preset} />, { path: '/', unit: { ...TCKT_UNIT, modules: ['ctd'] }, role: 'admin' });
    expect(screen.queryByRole('button', { name: /Trình lên/ })).toBeNull();
  });

  it('hiện cho admin: mở hộp với nguồn cố định và gửi source_type ops_log', async () => {
    vi.mocked(api.createSubmission).mockResolvedValueOnce(sub({ id: 70, source_type: 'ops_log', source_id: 12 }));
    renderDh(<CreateSubmissionButton preset={preset} />, { path: '/', role: 'admin' });
    fireEvent.click(screen.getByRole('button', { name: /Trình lên/ }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Nhật ký trực ban: Ca trực 08/10')).toBeDefined();
    expect(within(dialog).queryByLabelText(/Hoạt động/)).toBeNull();
    await within(dialog).findByRole('option', { name: 'Ban Thường vụ' });
    fireEvent.change(within(dialog).getByLabelText(/Đơn vị nhận/), { target: { value: '1' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Trình' }));
    await waitFor(() => expect(api.createSubmission).toHaveBeenCalledWith({ to_unit_id: 1, source_type: 'ops_log', source_id: 12 }));
  });

  it('BTV (đơn vị khác) cũng thấy nút', () => {
    renderDh(<CreateSubmissionButton preset={preset} />, { path: '/', unit: BTV_UNIT, role: 'btv_member' });
    expect(screen.getByRole('button', { name: /Trình lên/ })).toBeDefined();
  });
});
```

- [ ] **Step 2: Chạy, xác nhận hỏng**

Run: `npx vitest run src/core/features/submissions/SubmissionsView.test.tsx` — Expected: FAIL (không resolve `./SubmissionsView`).

- [ ] **Step 3: Viết code**

```tsx
// web/src/core/features/submissions/CreateSubmissionModal.tsx
import React, { useEffect, useId, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import TextArea from '@atlaskit/textarea';
import {
  apiErrorMessage, createSubmission, fetchActivities, fetchDieuHanhUnits, fetchDirectives, type SubmissionSource,
} from '../../api';
import { useToast } from '../../../shared/components/Toast';
import { DH_UNITS_KEY, DIRECTIVES_KEY, SUBMISSIONS_KEY } from '../dieuhanh/queryKeys';
import { useDhActor } from '../dieuhanh/useDhActor';
import { SOURCE_LABEL } from '../dieuhanh/labels';
import { ErrorText, FormDialog, SelectField } from '../dieuhanh/parts';

/** Nguồn đã biết sẵn (vd. một nhật ký trực ban); không có thì chọn một hoạt động. */
export interface SubmissionPreset { sourceType: SubmissionSource; sourceId: number; label: string }

const OPEN_DIRECTIVE = ['acknowledged', 'in_progress', 'revision_requested'];
const SUBMITTABLE_ACTIVITY = ['approved', 'active', 'completed'];

export const CreateSubmissionModal: React.FC<{ isOpen: boolean; onClose: () => void; preset?: SubmissionPreset }> = ({ isOpen, onClose, preset }) => {
  const actor = useDhActor();
  const navigate = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();
  const noteId = useId();
  const [toUnit, setToUnit] = useState('');
  const [activityId, setActivityId] = useState('');
  const [directiveId, setDirectiveId] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) { setToUnit(''); setActivityId(''); setDirectiveId(''); setNote(''); setError(''); }
  }, [isOpen]);

  const { data: units = [] } = useQuery({ queryKey: DH_UNITS_KEY, queryFn: fetchDieuHanhUnits, enabled: isOpen });
  const { data: activities = [] } = useQuery({ queryKey: ['dieu-hanh-activities'], queryFn: () => fetchActivities(), enabled: isOpen && !preset });
  const { data: directives = [] } = useQuery({ queryKey: DIRECTIVES_KEY, queryFn: fetchDirectives, enabled: isOpen });

  const unitOptions = units.filter((u) => u.id !== actor.unitId).map((u) => ({ value: String(u.id), label: u.name }));
  const activityOptions = activities.filter((a) => SUBMITTABLE_ACTIVITY.includes(a.status)).map((a) => ({ value: String(a.id), label: a.title }));
  const directiveOptions = directives
    .filter((d) => d.to_unit_id === actor.unitId && String(d.from_unit_id) === toUnit && OPEN_DIRECTIVE.includes(d.status))
    .map((d) => ({ value: String(d.id), label: d.title }));

  const mutation = useMutation({
    mutationFn: createSubmission,
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: SUBMISSIONS_KEY });
      queryClient.invalidateQueries({ queryKey: DIRECTIVES_KEY });
      toast.success('Đã trình.');
      onClose();
      navigate(`/submission/${created.id}`);
    },
    onError: (err) => setError(apiErrorMessage(err, 'Không trình được.')),
  });

  const submit = () => {
    const sourceId = preset ? preset.sourceId : Number(activityId);
    if (!toUnit || !sourceId) {
      setError(preset ? 'Chọn đơn vị nhận.' : 'Chọn đơn vị nhận và hoạt động cần trình.');
      return;
    }
    setError('');
    mutation.mutate({
      to_unit_id: Number(toUnit),
      source_type: preset?.sourceType ?? 'activity',
      source_id: sourceId,
      ...(directiveId ? { directive_id: Number(directiveId) } : {}),
      ...(note.trim() ? { note: note.trim() } : {}),
    });
  };

  return (
    <FormDialog isOpen={isOpen} title="Trình lên đơn vị khác" confirmLabel="Trình" isLoading={mutation.isPending} onSubmit={submit} onCancel={onClose}>
      <SelectField label="Đơn vị nhận" required value={toUnit} onChange={(v) => { setToUnit(v); setDirectiveId(''); }}
        options={unitOptions} placeholder="Chọn đơn vị" />
      {preset ? (
        <p style={{ marginTop: 12 }}>{SOURCE_LABEL[preset.sourceType]}: {preset.label}</p>
      ) : (
        <SelectField label="Hoạt động" required value={activityId} onChange={setActivityId} options={activityOptions} placeholder="Chọn hoạt động" />
      )}
      <SelectField label="Gắn với chỉ đạo (không bắt buộc)" value={directiveId} onChange={setDirectiveId}
        options={directiveOptions} placeholder="Không gắn" disabled={!toUnit} />
      <div style={{ marginTop: 12 }}>
        <label htmlFor={noteId}>Ghi chú</label>
        <TextArea id={noteId} value={note} minimumRows={3} onChange={(e) => setNote(e.target.value)} />
      </div>
      <ErrorText message={error} />
    </FormDialog>
  );
};
```

```tsx
// web/src/core/features/submissions/CreateSubmissionButton.tsx
import React, { useState } from 'react';
import Button from '@atlaskit/button/new';
import { useDhActor } from '../dieuhanh/useDhActor';
import { canCreateSubmission } from '../dieuhanh/permissions';
import { CreateSubmissionModal, type SubmissionPreset } from './CreateSubmissionModal';

/** Nút "Trình lên…" đặt cạnh một hoạt động / nhật ký trực ban. Tự ẩn khi không có quyền hoặc đơn vị không có module Điều hành. */
export const CreateSubmissionButton: React.FC<{ preset: SubmissionPreset }> = ({ preset }) => {
  const actor = useDhActor();
  const [open, setOpen] = useState(false);
  if (!actor.hasDieuHanh || !canCreateSubmission(actor)) return null;
  return (
    <>
      <Button onClick={() => setOpen(true)}>Trình lên…</Button>
      <CreateSubmissionModal isOpen={open} onClose={() => setOpen(false)} preset={preset} />
    </>
  );
};
```

```tsx
// web/src/core/features/submissions/SubmissionsView.tsx
import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import Button from '@atlaskit/button/new';
import { token } from '@atlaskit/tokens';
import { apiErrorMessage, fetchSubmissions } from '../../api';
import { LottieLoading } from '../../../shared/components/LottieLoading';
import { formatVnDate } from '../../../shared/utils/date';
import { SUBMISSIONS_KEY } from '../dieuhanh/queryKeys';
import { useDhActor } from '../dieuhanh/useDhActor';
import { canCreateSubmission } from '../dieuhanh/permissions';
import { sourceText, submissionStatus } from '../dieuhanh/labels';
import { ErrorText, FIELD_STYLE, StatusLozenge } from '../dieuhanh/parts';
import { CreateSubmissionModal } from './CreateSubmissionModal';

type Direction = 'all' | 'received' | 'sent';
const CELL: React.CSSProperties = { padding: '8px 12px', textAlign: 'left', borderBottom: `1px solid ${token('color.border', '#DFE1E6')}` };
const STATUS_FILTERS = [
  ['all', 'Tất cả'], ['pending', 'Chờ phản hồi'], ['seen', 'Đã xem'], ['accepted', 'Đã chấp nhận'],
  ['revision_requested', 'Yêu cầu sửa'], ['withdrawn', 'Đã rút lại'],
] as const;

export const SubmissionsView: React.FC = () => {
  const actor = useDhActor();
  const [direction, setDirection] = useState<Direction>('all');
  const [status, setStatus] = useState('all');
  const [creating, setCreating] = useState(false);
  const { data, isLoading, error } = useQuery({ queryKey: SUBMISSIONS_KEY, queryFn: fetchSubmissions });

  const rows = useMemo(() => (data ?? []).filter((s) => {
    if (direction === 'received' && s.to_unit_id !== actor.unitId) return false;
    if (direction === 'sent' && s.from_unit_id !== actor.unitId) return false;
    if (status === 'all') return true;
    if (status === 'withdrawn') return Boolean(s.withdrawn_at);
    if (s.withdrawn_at) return false;
    return status === 'pending' ? s.response === null : s.response === status;
  }), [data, direction, status, actor.unitId]);

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', paddingTop: 4 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
        <h1 style={{ margin: 0 }}>Trình</h1>
        {canCreateSubmission(actor) && <Button appearance="primary" onClick={() => setCreating(true)}>Trình lên</Button>}
      </div>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 16 }}>
        <div>
          <label htmlFor="sub-direction">Hướng</label>
          <select id="sub-direction" value={direction} onChange={(e) => setDirection(e.target.value as Direction)} style={FIELD_STYLE}>
            <option value="all">Tất cả</option>
            <option value="received">Nhận về</option>
            <option value="sent">Đơn vị mình gửi</option>
          </select>
        </div>
        <div>
          <label htmlFor="sub-status">Trạng thái</label>
          <select id="sub-status" value={status} onChange={(e) => setStatus(e.target.value)} style={FIELD_STYLE}>
            {STATUS_FILTERS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </div>
      </div>
      {isLoading && <LottieLoading message="Đang tải danh sách trình..." size={80} />}
      {error && <ErrorText message={apiErrorMessage(error, 'Không tải được danh sách trình.')} />}
      {!isLoading && !error && rows.length === 0 && <p>Chưa có trình nào.</p>}
      {rows.length > 0 && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>{['Nguồn', 'Đơn vị gửi', 'Đơn vị nhận', 'Ngày trình', 'Trạng thái'].map((h) => <th key={h} style={CELL}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {rows.map((s) => {
                const st = submissionStatus(s);
                return (
                  <tr key={s.id}>
                    <td style={CELL}><Link to={`/submission/${s.id}`}>{sourceText(s)}</Link></td>
                    <td style={CELL}>{s.from_unit_name ?? `Đơn vị #${s.from_unit_id}`}</td>
                    <td style={CELL}>{s.to_unit_name ?? `Đơn vị #${s.to_unit_id}`}</td>
                    <td style={CELL}>{formatVnDate(s.created_at)}</td>
                    <td style={CELL}><StatusLozenge label={st.label} tone={st.tone} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <CreateSubmissionModal isOpen={creating} onClose={() => setCreating(false)} />
    </div>
  );
};
```

- [ ] **Step 4: Chạy**

Run: `npx vitest run src/core/features/submissions && npx tsc --noEmit -p .` — Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add web/src/core/features/submissions
git commit -m "feat(web): danh sách Trình, hộp tạo trình và nút Trình lên dùng lại được"
```

---

### Task 8: Web — chi tiết trình, phản hồi và rút lại

**Files:**
- Create: `web/src/core/features/submissions/SubmissionDetailView.tsx`
- Test: `web/src/core/features/submissions/SubmissionDetailView.test.tsx`

**Interfaces:**
- Consumes: Task 3–5, `ConfirmDialog` (đợt 0).
- Produces: `SubmissionDetailView` (route `/submission/:id`).

- [ ] **Step 1: Viết test hỏng**

```tsx
// web/src/core/features/submissions/SubmissionDetailView.test.tsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, fireEvent, waitFor, cleanup, within } from '@testing-library/react';
import { SubmissionDetailView } from './SubmissionDetailView';
import { BTV_UNIT, renderDh, TCKT_UNIT } from '../dieuhanh/testUtils';
import * as api from '../../api';

vi.mock('../../api', async () => {
  const actual = await vi.importActual<typeof import('../../api')>('../../api');
  return { ...actual, fetchSubmission: vi.fn(), respondSubmission: vi.fn(), withdrawSubmission: vi.fn() };
});

const sub = (over: Partial<api.Submission> = {}): api.Submission => ({
  id: 44, from_unit_id: 2, to_unit_id: 1, source_type: 'activity', source_id: 31, directive_id: null, note: 'Gửi anh xem', submitted_by: 5,
  response: null, response_note: null, responded_by: null, responded_at: null, withdrawn_at: null, created_at: '2026-10-05T03:00:00.000Z',
  from_unit_name: 'Ban TCKT', to_unit_name: 'Ban Thường vụ', submitted_by_name: 'Trần Admin', source_title: 'Hội nghị A', ...over,
});
const at = (unit = TCKT_UNIT, role = 'admin') => renderDh(<SubmissionDetailView />, { path: '/submission/44', route: '/submission/:id', unit, role });

describe('SubmissionDetailView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.fetchSubmission).mockResolvedValue(sub());
  });
  afterEach(cleanup);

  it('hiện nguồn (có link), đơn vị, người nộp, ghi chú và trạng thái', async () => {
    at();
    expect((await screen.findByRole('link', { name: 'Hội nghị A' })).getAttribute('href')).toBe('/activity/31');
    expect(screen.getByText('Ban Thường vụ')).toBeDefined();
    expect(screen.getByText('Trần Admin')).toBeDefined();
    expect(screen.getByText('Gửi anh xem')).toBeDefined();
    expect(screen.getByText('Chờ phản hồi')).toBeDefined();
  });

  it('nguồn ops_log dẫn tới #/ops-log/:id', async () => {
    vi.mocked(api.fetchSubmission).mockResolvedValue(sub({ source_type: 'ops_log', source_id: 12, source_title: null }));
    at();
    expect((await screen.findByRole('link', { name: 'Nhật ký trực ban #12' })).getAttribute('href')).toBe('/ops-log/12');
  });

  it('TCKT admin (đơn vị gửi) rút lại được khi chưa phản hồi; gọi API và làm mới cache', async () => {
    vi.mocked(api.withdrawSubmission).mockResolvedValueOnce(sub());
    const { qc } = at();
    fireEvent.click(await screen.findByRole('button', { name: 'Rút lại' }));
    const dialog = await screen.findByRole('dialog');
    const spy = vi.spyOn(qc, 'invalidateQueries');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Rút lại' }));
    await waitFor(() => expect(api.withdrawSubmission).toHaveBeenCalledWith(44));
    await waitFor(() => expect(spy).toHaveBeenCalledWith({ queryKey: ['submissions'] }));
  });

  it('chặn: đã có phản hồi, đã rút, hoặc không phải admin đơn vị gửi thì không có nút Rút lại', async () => {
    vi.mocked(api.fetchSubmission).mockResolvedValue(sub({ response: 'seen' }));
    at();
    await screen.findByText('Đã xem');
    expect(screen.queryByRole('button', { name: 'Rút lại' })).toBeNull();
    cleanup();
    vi.mocked(api.fetchSubmission).mockResolvedValue(sub({ withdrawn_at: '2026-10-06T03:00:00.000Z' }));
    at();
    await screen.findByText('Đã rút lại');
    expect(screen.queryByRole('button', { name: 'Rút lại' })).toBeNull();
    cleanup();
    vi.mocked(api.fetchSubmission).mockResolvedValue(sub());
    at(TCKT_UNIT, 'leader');
    await screen.findByText('Chờ phản hồi');
    expect(screen.queryByRole('button', { name: 'Rút lại' })).toBeNull();
  });

  it('BTV phản hồi: trình không có chỉ đạo chỉ có "Đã xem"; gửi đúng body', async () => {
    vi.mocked(api.respondSubmission).mockResolvedValue(sub({ response: 'seen' }));
    at(BTV_UNIT, 'btv_lead');
    fireEvent.click(await screen.findByRole('button', { name: 'Phản hồi' }));
    const dialog = await screen.findByRole('dialog');
    const select = within(dialog).getByLabelText(/Phản hồi/) as HTMLSelectElement;
    expect(Array.from(select.options).map((o) => o.value)).toEqual(['seen']);
    fireEvent.click(within(dialog).getByRole('button', { name: 'Gửi phản hồi' }));
    await waitFor(() => expect(api.respondSubmission).toHaveBeenCalledWith(44, { response: 'seen', response_note: undefined }));
  });

  it('trình có chỉ đạo: thêm "Chấp nhận" và "Yêu cầu sửa"; yêu cầu sửa bắt buộc lý do', async () => {
    vi.mocked(api.fetchSubmission).mockResolvedValue(sub({ directive_id: 7 }));
    vi.mocked(api.respondSubmission).mockResolvedValue(sub());
    const { qc } = at(BTV_UNIT, 'btv_lead');
    fireEvent.click(await screen.findByRole('button', { name: 'Phản hồi' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText(/đánh giá tại trang Giao việc/)).toBeDefined();
    fireEvent.change(within(dialog).getByLabelText(/Phản hồi/), { target: { value: 'revision_requested' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Gửi phản hồi' }));
    expect(within(dialog).getByText('Vui lòng nhập lý do.')).toBeDefined();
    expect(api.respondSubmission).not.toHaveBeenCalled();
    fireEvent.change(within(dialog).getByLabelText(/Lý do/), { target: { value: 'Thiếu minh chứng' } });
    const spy = vi.spyOn(qc, 'invalidateQueries');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Gửi phản hồi' }));
    await waitFor(() => expect(api.respondSubmission).toHaveBeenCalledWith(44, { response: 'revision_requested', response_note: 'Thiếu minh chứng' }));
    await waitFor(() => expect(spy).toHaveBeenCalledWith({ queryKey: ['directives'] }));
  });

  it('chặn: TCKT admin (bên gửi) không có nút Phản hồi; BTV không có khi đã rút', async () => {
    at();
    await screen.findByText('Chờ phản hồi');
    expect(screen.queryByRole('button', { name: 'Phản hồi' })).toBeNull();
    cleanup();
    vi.mocked(api.fetchSubmission).mockResolvedValue(sub({ withdrawn_at: '2026-10-06T03:00:00.000Z' }));
    at(BTV_UNIT, 'btv_lead');
    await screen.findByText('Đã rút lại');
    expect(screen.queryByRole('button', { name: 'Phản hồi' })).toBeNull();
  });

  it('lỗi server hiện bằng tiếng Việt', async () => {
    vi.mocked(api.withdrawSubmission).mockRejectedValueOnce({ response: { status: 400, data: { error: 'Không thể rút lại submission đã có phản hồi.' } } });
    at();
    fireEvent.click(await screen.findByRole('button', { name: 'Rút lại' }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Rút lại' }));
    expect(await screen.findByText('Không thể rút lại submission đã có phản hồi.')).toBeDefined();
  });

  it('hiện phản hồi đã có kèm người trả lời', async () => {
    vi.mocked(api.fetchSubmission).mockResolvedValue(sub({ response: 'revision_requested', response_note: 'Thiếu minh chứng', responded_by_name: 'Lê BTV', responded_at: '2026-10-06T03:00:00.000Z' }));
    at();
    expect(await screen.findByText('Thiếu minh chứng')).toBeDefined();
    expect(screen.getByText('Lê BTV')).toBeDefined();
  });
});
```

- [ ] **Step 2: Chạy, xác nhận hỏng**

Run: `npx vitest run src/core/features/submissions/SubmissionDetailView.test.tsx` — Expected: FAIL (không resolve `./SubmissionDetailView`).

- [ ] **Step 3: Viết code**

```tsx
// web/src/core/features/submissions/SubmissionDetailView.tsx
import React, { useEffect, useId, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Button from '@atlaskit/button/new';
import TextArea from '@atlaskit/textarea';
import { token } from '@atlaskit/tokens';
import {
  apiErrorMessage, fetchSubmission, respondSubmission, withdrawSubmission, type Submission, type SubmissionResponse,
} from '../../api';
import { ConfirmDialog } from '../../../shared/components/ConfirmDialog';
import { LottieLoading } from '../../../shared/components/LottieLoading';
import { useToast } from '../../../shared/components/Toast';
import { formatVnDate } from '../../../shared/utils/date';
import { DIRECTIVES_KEY, SUBMISSION_KEY, SUBMISSIONS_KEY } from '../dieuhanh/queryKeys';
import { useDhActor } from '../dieuhanh/useDhActor';
import { canRespondSubmission, canWithdrawSubmission, submissionResponseOptions } from '../dieuhanh/permissions';
import { RESPONSE_LABEL, SOURCE_LABEL, submissionStatus } from '../dieuhanh/labels';
import { ErrorText, FormDialog, SelectField, StatusLozenge } from '../dieuhanh/parts';

const Info: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div style={{ marginBottom: 8 }}>
    <div style={{ fontSize: 12, color: token('color.text.subtle', '#5E6C84') }}>{label}</div>
    <div>{children}</div>
  </div>
);

const RespondDialog: React.FC<{
  isOpen: boolean; submission: Submission; isLoading: boolean;
  onSubmit: (payload: { response: SubmissionResponse; response_note?: string }) => void; onCancel: () => void;
}> = ({ isOpen, submission, isLoading, onSubmit, onCancel }) => {
  const noteId = useId();
  const [response, setResponse] = useState<SubmissionResponse>('seen');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  useEffect(() => { if (isOpen) { setResponse('seen'); setNote(''); setError(''); } }, [isOpen]);
  const options = submissionResponseOptions(submission);
  const submit = () => {
    if (response === 'revision_requested' && !note.trim()) { setError('Vui lòng nhập lý do.'); return; }
    onSubmit({ response, response_note: note.trim() || undefined });
  };
  return (
    <FormDialog isOpen={isOpen} title="Phản hồi trình" confirmLabel="Gửi phản hồi" isLoading={isLoading} onSubmit={submit} onCancel={onCancel}>
      <SelectField label="Phản hồi" value={response} onChange={(v) => { setResponse(v as SubmissionResponse); setError(''); }}
        options={options.map((value) => ({ value, label: RESPONSE_LABEL[value] }))} />
      <div style={{ marginTop: 12 }}>
        <label htmlFor={noteId}>{response === 'revision_requested' ? 'Lý do *' : 'Ghi chú'}</label>
        <TextArea id={noteId} value={note} minimumRows={3} onChange={(e) => { setNote(e.target.value); setError(''); }} />
      </div>
      {submission.directive_id && (
        <p style={{ marginTop: 8, color: token('color.text.subtle', '#5E6C84') }}>
          Trình này thuộc một chỉ đạo. Để kết thúc chỉ đạo, đánh giá tại trang Giao việc.
        </p>
      )}
      <ErrorText message={error} />
    </FormDialog>
  );
};

export const SubmissionDetailView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const submissionId = Number(id);
  const actor = useDhActor();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [dialog, setDialog] = useState<null | 'respond' | 'withdraw'>(null);

  const { data: s, isLoading, error } = useQuery({
    queryKey: SUBMISSION_KEY(submissionId),
    queryFn: () => fetchSubmission(submissionId),
    enabled: Number.isInteger(submissionId),
  });

  const done = (message: string) => {
    setDialog(null);
    toast.success(message);
    queryClient.invalidateQueries({ queryKey: SUBMISSIONS_KEY });
    queryClient.invalidateQueries({ queryKey: DIRECTIVES_KEY });
  };
  const fail = (err: unknown) => { setDialog(null); toast.error(apiErrorMessage(err)); };

  const respond = useMutation({
    mutationFn: (payload: { response: SubmissionResponse; response_note?: string }) => respondSubmission(submissionId, payload),
    onSuccess: () => done('Đã gửi phản hồi.'), onError: fail,
  });
  const withdraw = useMutation({ mutationFn: () => withdrawSubmission(submissionId), onSuccess: () => done('Đã rút lại.'), onError: fail });

  if (isLoading) return <LottieLoading message="Đang tải..." size={80} />;
  if (error || !s) return <ErrorText message={apiErrorMessage(error, 'Không tải được trình.')} />;

  const st = submissionStatus(s);
  const sourceName = s.source_title ?? `${SOURCE_LABEL[s.source_type]} #${s.source_id}`;
  const sourcePath = s.source_type === 'activity' ? `/activity/${s.source_id}` : s.source_type === 'ops_log' ? `/ops-log/${s.source_id}` : null;

  return (
    <div style={{ maxWidth: 960, margin: '0 auto' }}>
      <p><Link to="/submissions">← Danh sách trình</Link></p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <h1 style={{ margin: 0 }}>Trình #{s.id}</h1>
        <StatusLozenge label={st.label} tone={st.tone} />
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '16px 0' }}>
        {canRespondSubmission(actor, s) && <Button appearance="primary" onClick={() => setDialog('respond')}>Phản hồi</Button>}
        {canWithdrawSubmission(actor, s) && <Button appearance="danger" onClick={() => setDialog('withdraw')}>Rút lại</Button>}
      </div>

      <Info label={`Nguồn (${SOURCE_LABEL[s.source_type]})`}>{sourcePath ? <Link to={sourcePath}>{sourceName}</Link> : sourceName}</Info>
      <Info label="Đơn vị gửi">{s.from_unit_name ?? `Đơn vị #${s.from_unit_id}`}</Info>
      <Info label="Đơn vị nhận">{s.to_unit_name ?? `Đơn vị #${s.to_unit_id}`}</Info>
      <Info label="Người trình">{s.submitted_by_name ?? '—'}</Info>
      <Info label="Ngày trình">{formatVnDate(s.created_at)}</Info>
      {s.directive_id && <Info label="Chỉ đạo"><Link to={`/directive/${s.directive_id}`}>Xem chỉ đạo #{s.directive_id}</Link></Info>}
      {s.note && <Info label="Ghi chú"><span style={{ whiteSpace: 'pre-wrap' }}>{s.note}</span></Info>}
      {s.response && (
        <>
          <h2 style={{ marginTop: 24 }}>Phản hồi</h2>
          <Info label="Kết quả">{RESPONSE_LABEL[s.response]}</Info>
          {s.response_note && <Info label="Nội dung"><span style={{ whiteSpace: 'pre-wrap' }}>{s.response_note}</span></Info>}
          <Info label="Người phản hồi">{s.responded_by_name ?? '—'}</Info>
          {s.responded_at && <Info label="Lúc">{formatVnDate(s.responded_at)}</Info>}
        </>
      )}
      {s.withdrawn_at && <Info label="Đã rút lại lúc">{formatVnDate(s.withdrawn_at)}</Info>}

      <RespondDialog isOpen={dialog === 'respond'} submission={s} isLoading={respond.isPending}
        onSubmit={(payload) => respond.mutate(payload)} onCancel={() => setDialog(null)} />
      <ConfirmDialog isOpen={dialog === 'withdraw'} title="Rút lại trình" confirmLabel="Rút lại" appearance="danger"
        isLoading={withdraw.isPending} onConfirm={() => withdraw.mutate()} onCancel={() => setDialog(null)}>
        Đơn vị nhận sẽ không thể phản hồi trình này nữa. Chỉ rút lại được khi chưa có phản hồi.
      </ConfirmDialog>
    </div>
  );
};
```

- [ ] **Step 4: Chạy**

Run: `npx vitest run src/core/features/submissions && npx tsc --noEmit -p .` — Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add web/src/core/features/submissions
git commit -m "feat(web): chi tiết trình, phản hồi và rút lại"
```

---

### Task 9: Web — nối menu, route và chặn theo module

**Files:**
- Modify: `web/src/shared/layouts/PageLayout.tsx`, `web/src/core/AppRoutes.tsx`, `web/src/core/main.tsx`
- Test: `web/src/shared/layouts/PageLayout.test.tsx` (thêm ca), `web/src/core/AppRoutes.test.tsx` (thêm ca)

**Interfaces:**
- Consumes: `unitHasDieuHanh` (Task 4); các màn của Task 5–8.
- Produces: `PageLayout` prop `canViewDieuHanh?: boolean`; mục menu `dieuHanhOnly`, `alsoPaths`; route `/directives`, `/directive/:id`, `/submissions`, `/submission/:id`.

- [ ] **Step 1: Viết test hỏng**

Thêm vào `web/src/shared/layouts/PageLayout.test.tsx` (trong `describe('PageLayout')`):

```tsx
  it('hiện "Giao việc" và "Trình" chỉ khi canViewDieuHanh, bấm thì điều hướng', () => {
    renderLayout(<PageLayout><div>x</div></PageLayout>);
    expect(screen.queryByText('Giao việc')).toBeNull();
    expect(screen.queryByText('Trình')).toBeNull();
    cleanup();
    renderLayout(<PageLayout canViewDieuHanh><div>x</div></PageLayout>);
    fireEvent.click(screen.getByText('Giao việc'));
    expect(screen.getByTestId('path').textContent).toBe('/directives');
    fireEvent.click(screen.getByText('Trình'));
    expect(screen.getByTestId('path').textContent).toBe('/submissions');
  });

  it('đang ở trang chi tiết chỉ đạo thì "Giao việc" được tô sáng', () => {
    renderLayout(<PageLayout canViewDieuHanh><div>x</div></PageLayout>, '/directive/7');
    expect(screen.getByText('Giao việc').closest('[aria-current="page"]')).not.toBeNull();
  });

  it('mục "Sắp có" không còn Giao việc/Trình', () => {
    renderLayout(<PageLayout><div>x</div></PageLayout>);
    expect(screen.getByText('Nhật ký trực ban')).toBeDefined();
    expect(screen.queryByText('Giao việc')).toBeNull();
  });
```

Thêm vào `web/src/core/AppRoutes.test.tsx`: mock bốn màn ở đầu file (cạnh các `vi.mock` hiện có) và sửa `renderAt` nhận đơn vị:

```tsx
vi.mock('./features/directives/DirectivesView', () => ({ DirectivesView: () => <div>màn-giao-việc</div> }));
vi.mock('./features/directives/DirectiveDetailView', () => ({ DirectiveDetailView: () => <div>màn-chi-tiết-chỉ-đạo</div> }));
vi.mock('./features/submissions/SubmissionsView', () => ({ SubmissionsView: () => <div>màn-trình</div> }));
vi.mock('./features/submissions/SubmissionDetailView', () => ({ SubmissionDetailView: () => <div>màn-chi-tiết-trình</div> }));

function renderWithUnit(path: string, modules: string[] | undefined) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
  const unit = { id: 2, code: 'TCKT', name: 'Ban TCKT', kind: 'department', modules };
  qc.setQueryData(SESSION_KEY, {
    user: { id: 1, name: 'A', email: 'a@x', role: 'member' },
    units: { current: unit, memberships: [{ unit_id: 2, code: 'TCKT', name: 'Ban TCKT', kind: 'department', role: 'admin' }] },
  });
  qc.setQueryData(BOOTSTRAP_KEY, { stats: {}, upcoming: [], tasks: [], activity: [], teams: [], capabilities: { canCreateActivity: false, canCreateAccount: false } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[path]}><AppRoutes userName="A" /></MemoryRouter>
    </QueryClientProvider>
  );
}
```

và thêm ca trong `describe('AppRoutes')`:

```tsx
  it('đơn vị có module dieu-hanh mở được bốn route Giao việc/Trình', () => {
    for (const [path, text] of [
      ['/directives', 'màn-giao-việc'], ['/directive/7', 'màn-chi-tiết-chỉ-đạo'],
      ['/submissions', 'màn-trình'], ['/submission/44', 'màn-chi-tiết-trình'],
    ]) {
      renderWithUnit(path, ['dieu-hanh']);
      expect(screen.getByText(text)).toBeDefined();
      cleanup();
    }
  });

  it('đơn vị không có module dieu-hanh gõ tay các route đó thì về Tổng quan, không render màn', () => {
    for (const path of ['/directives', '/directive/7', '/submissions', '/submission/44']) {
      renderWithUnit(path, ['ctd']);
      expect(screen.queryByText(/màn-giao-việc|màn-chi-tiết-chỉ-đạo|màn-trình|màn-chi-tiết-trình/)).toBeNull();
      expect(screen.getByText('màn-tổng-quan')).toBeDefined();
      cleanup();
    }
  });
```

- [ ] **Step 2: Chạy, xác nhận hỏng**

Run: `npx vitest run src/shared/layouts/PageLayout.test.tsx src/core/AppRoutes.test.tsx` — Expected: FAIL (không có prop `canViewDieuHanh`; route trả "Không tìm thấy trang").

- [ ] **Step 3: Viết code**

`web/src/shared/layouts/PageLayout.tsx`:
- Bỏ import `SendIcon`/`InboxIcon`? Không — vẫn dùng cho mục menu mới, giữ nguyên import.
- Mở rộng `NAV_ITEMS` (thêm sau mục `/archive`):

```tsx
  { path: '/directives', label: 'Giao việc', Icon: SendIcon, dieuHanhOnly: true, alsoPaths: ['/directive'] },
  { path: '/submissions', label: 'Trình', Icon: InboxIcon, dieuHanhOnly: true, alsoPaths: ['/submission'] },
```
Kiểu của mảng: khai báo `type NavItem = { path: string; label: string; Icon: React.ComponentType<{ label: string }>; managerOnly?: boolean; dieuHanhOnly?: boolean; alsoPaths?: string[] };` và `const NAV_ITEMS: NavItem[] = [...]` (nếu `Icon` của Atlaskit không khớp kiểu `React.ComponentType<{label:string}>`, dùng `typeof DashboardIcon`).
- Prop mới trong `PageLayoutProps` và danh sách tham số:

```tsx
  /** Hiện mục menu "Giao việc" và "Trình" (đơn vị hiện tại có module dieu-hanh). Mặc định ẩn. */
  canViewDieuHanh?: boolean;
```
- Bộ lọc và tô sáng:

```tsx
{NAV_ITEMS.filter((item) => (!item.managerOnly || canViewReports) && (!item.dieuHanhOnly || canViewDieuHanh)).map(({ path, label, Icon, alsoPaths }) => {
  const selected = [path, ...(alsoPaths ?? [])].some((p) => location.pathname === p || location.pathname.startsWith(`${p}/`));
```
- Xoá hai dòng `ButtonItem` "Giao việc" và "Trình" trong mục `SẮP CÓ` (giữ "Nhật ký trực ban").

`web/src/core/AppRoutes.tsx`:

```tsx
import { DirectivesView } from './features/directives/DirectivesView';
import { DirectiveDetailView } from './features/directives/DirectiveDetailView';
import { SubmissionsView } from './features/submissions/SubmissionsView';
import { SubmissionDetailView } from './features/submissions/SubmissionDetailView';
import { unitHasDieuHanh } from './features/dieuhanh/permissions';
```
Trong thân `AppRoutes`: `const dieuHanh = unitHasDieuHanh(caps.unit);` và thêm trước route `*`:

```tsx
      <Route path="/directives" element={dieuHanh ? <DirectivesView /> : <ToDashboard />} />
      <Route path="/directive/:id" element={dieuHanh ? <DirectiveDetailView /> : <ToDashboard />} />
      <Route path="/submissions" element={dieuHanh ? <SubmissionsView /> : <ToDashboard />} />
      <Route path="/submission/:id" element={dieuHanh ? <SubmissionDetailView /> : <ToDashboard />} />
```

`web/src/core/main.tsx` — trong `SignedInShell`: import `unitHasDieuHanh` từ `'./features/dieuhanh/permissions'` và đổi dòng `PageLayout` thành:

```tsx
    <PageLayout user={user} onLogout={onLogout} canViewReports={caps.isManager} canViewDieuHanh={unitHasDieuHanh(caps.unit)} headerExtras={<UnitSwitcher />}>
```

- [ ] **Step 4: Chạy toàn bộ web**

Run: `npm test && npx tsc --noEmit -p . && npm run build` — Expected: xanh. (Test cũ của `PageLayout` kiểm "không hiện nút chưa có chức năng" vẫn đúng.)

- [ ] **Step 5: Commit**

```bash
git add web/src/shared/layouts web/src/core/AppRoutes.tsx web/src/core/AppRoutes.test.tsx web/src/core/main.tsx
git commit -m "feat(web): nối menu và route Giao việc/Trình, chặn theo module dieu-hanh"
```

---

### Task 10: Tài liệu, kiểm tra và PR

**Files:**
- Modify: `docs/dev/api.md` (endpoint mới `GET /api/directives/units`; các trường tên trong `directives`/`submissions`; `units.current.modules` trong `GET /api/session` và `POST /api/session/unit`; bump)
- Modify: `docs/dev/phan-quyen.md` (bảng điều kiện nút Giao việc/Trình của Task 4, cổng `dieu-hanh` đọc `req.unit.modules` do `unit-context.js` nạp; bump)
- Modify: `docs/dev/frontend.md` (route `#/directives`, `#/directive/:id`, `#/submissions`, `#/submission/:id`; cấu trúc `features/{dieuhanh,directives,submissions}`; `CreateSubmissionButton` cho nơi khác dùng; bump)
- Modify: `docs/ba/dieu-hanh-use-case.md` (mục 7: không còn "chưa có code" cho Giao việc/Trình — nay có UI trên `web/`; nêu rõ phần chưa có: tiến độ `progress_percent`, nguồn `report`; bump)
- Modify: `docs/ai/bay-da-gap.md` (bẫy mới: test mock tự gán `req.unit.modules` che mất việc cổng module không được nạp; luôn có một test qua session thật cho cổng quyền; bump)
- Modify: `docs/specs/2026-10-09-web-hoan-thien-thay-the-design.md` (mục 4.7: ghi các quyết định 2, 4–8 của plan này; bump MINOR; ghi đợt 5 xong khi merge)
- Modify (nếu `docs:check` báo `related_code` trùng): mọi tài liệu khác mà file Core/web đã sửa nằm trong `related_code`.

- [ ] **Step 1: Viết nội dung tài liệu**

Mỗi tài liệu đã sửa: tăng `version` (MINOR cho bổ sung; MAJOR cho `phan-quyen.md` nếu đổi điều kiện người đọc bản cũ sẽ làm sai — ở đây chỉ bổ sung nên MINOR), `updated: 2026-10-09`, thêm một dòng `## Lịch sử phiên bản`. Không tạo tài liệu mới; không sửa `docs/README.md` tay.

- [ ] **Step 2: Chạy kiểm tra**

```bash
cd web && npm test && npm run build && cd ..
npm run test:tools
npm run docs:index
git add -A docs && git commit -m "docs: web/ đợt 5 — Giao việc và Trình, cổng module dieu-hanh"
npm run docs:check -- --base origin/staging
```
Expected: mọi lệnh xanh (`docs:check` chạy sau commit, cây sạch). `cd core && npm test` không chạy local — xác nhận xanh trên CI của PR.

- [ ] **Step 3: Push và mở PR vào `staging`**

```bash
git push -u origin HEAD
gh pr create --base staging --title "web/: đợt 5 — Giao việc và Trình (kèm sửa cổng module Core)" --body "…"
```
Mô tả PR: tóm tắt hai phần Core (sửa `req.unit.modules`, thêm tên + `GET /api/directives/units`; người dùng đã miễn họp team) và phần `web/`; mục "Kiểm tra" liệt kê lệnh đã chạy; nêu rõ test Core chạy trên CI; dòng `Docs:` nếu có tài liệu không cần sửa; kết thúc bằng `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.

- [ ] **Step 4: Việc sau đợt này (ghi vào mô tả PR, không làm ở đây)**

- Đợt 6: gắn `CreateSubmissionButton` (`sourceType: 'ops_log'`) vào chi tiết nhật ký; thêm mục menu "Nhật ký trực ban" theo cơ chế `dieuHanhOnly` và gỡ mục `SẮP CÓ`.
- Có thể gắn `CreateSubmissionButton` (`sourceType: 'activity'`) vào chi tiết hoạt động (đợt 1) — ngoài phạm vi spec đợt này.
- Server chưa kiểm `to_unit_id` ở `acknowledge`/`submit`/`link-activity` và `GET /api/directives/:id`, `GET /api/submissions/:id` không lọc theo đơn vị (đơn vị có `dieu-hanh` đọc được chỉ đạo/trình của đơn vị khác nếu biết id). Đề xuất họp team vá phía server; UI đã chặt hơn.

---

## Lịch sử phiên bản

| Version | Ngày | Thay đổi | Người |
|---|---|---|---|
| 1.0 | 2026-10-09 | Bản đầu: kế hoạch đợt 5 của SPEC-WEB-003 (Giao việc và Trình) | DYC |

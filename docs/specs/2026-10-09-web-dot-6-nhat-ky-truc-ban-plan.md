---
doc_id: PLAN-WEBP6-001
title: Kế hoạch triển khai — web/ đợt 6 (Nhật ký trực ban: backend Core rồi UI)
version: 1.0
status: active
audience: [dev, ai]
owner: DYC
updated: 2026-10-09
related_code: []
---

# web/ đợt 6 — Nhật ký trực ban Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Làm thật mục "Nhật ký trực ban" (SPEC-WEB-003, mục 4.8): API Core `/api/ops-logs` (đọc, tạo, sửa, điểm danh, thông báo khi vắng, đọc chéo đơn vị theo luật) rồi màn `web/` `#/ops-logs` (danh sách có lọc, tạo/sửa có điểm danh từng người, chi tiết, nút "Trình").

**Architecture:** Backend: một router mới `core/src/routes/ops-logs.js` đứng sau `auth` + cổng `requireDieuHanh` (middleware thuần, đọc `req.unit.modules`). Để cổng đó (và cổng cũ của `directives`/`submissions`) chạy được thật, Task 2 thêm mảng `modules` vào `req.unit` và vào `GET /api/session` (xem "Phát hiện" bên dưới). Bảng `ops_logs`, `ops_log_attendance` đã có trong `core/src/config/migrate-units.js` nên **không đổi schema**. Giờ lưu và trả là giờ địa phương Việt Nam, dạng chuỗi không múi giờ `YYYY-MM-DDTHH:mm:ss` (tránh lỗi UTC của bất biến #7). Web: thư mục `web/src/core/features/ops-logs/`, API ở `web/src/core/api/opsLogs.ts`, quyền thêm vào `deriveCapabilities` (`hasDieuHanh`, `canWriteOpsLog`).

**Tech Stack:** Core: Node 22, Express 5, mysql2, `node --test` với MySQL thật (`core/tests/helpers/`). Web: React 18, TypeScript, Vite, Vitest + jsdom + @testing-library/react 14, @tanstack/react-query 5, react-router-dom 6.30, Atlaskit (`button/new`, `lozenge`, `tokens`).

**Spec:** `docs/specs/2026-10-09-web-hoan-thien-thay-the-design.md` (SPEC-WEB-003, mục 4.8, 4.7, 6, 7). Yêu cầu nghiệp vụ: `docs/specs/nen-tang-da-don-vi-requirements.md` Requirement 6. Task gốc: `docs/specs/nen-tang-da-don-vi-tasks.md` task 12.

## Interface giả định từ đợt 5 (mục 4.7, "Giao việc và Trình")

Chỉ phần UI (Task 9) cần đợt 5. Phần backend (Task 2–6) và web nền/danh sách/form (Task 7, 8, 10) **không phụ thuộc** đợt 5. Task 9 giả định đợt 5 đã merge các thứ sau; mọi chỗ dùng chúng nằm gọn trong MỘT file adapter `web/src/core/features/ops-logs/submitAdapter.tsx`, nên nếu tên thật khác thì chỉ sửa file đó.

1. `web/src/core/features/submissions/SubmitDialog.tsx` xuất `SubmitDialog` với props:
   ```ts
   interface SubmitDialogProps {
     isOpen: boolean;
     sourceType: 'activity' | 'ops_log' | 'report';
     sourceId: number;
     sourceTitle: string;           // hiện trong hộp thoại
     onClose: () => void;
     onSubmitted?: () => void;      // gọi sau khi POST /api/submissions thành công
   }
   ```
   Hộp này tự lo: chọn đơn vị nhận (`to_unit_id`), ô ghi chú, gọi `createSubmission` (`POST /api/submissions`), báo toast thành công/lỗi.
2. `web/src/core/api/submissions.ts` (đợt 5) — đợt 6 **không** import trực tiếp; chỉ `SubmitDialog` dùng.
3. Quyền hiện nút "Trình" **không** lấy từ đợt 5 mà chép từ code server `core/src/routes/submissions.js` (`POST /api/submissions`): chỉ `admin`, `vice_admin`, `btv_lead`, `btv_member`. (Lưu ý: `leader`/`vice_leader` ghi được nhật ký nhưng **không** Trình được; DYC cũng không.)

Nếu Task 1 phát hiện đợt 5 chưa merge: làm Task 2–8 và 10, 11, 12 trước, để Task 9 sau khi đợt 5 merge. Không tự viết lại hộp Trình.

## Phát hiện khi đọc code (ảnh hưởng đợt 5 và 6)

- `core/src/routes/directives.js` và `submissions.js` kiểm module bằng `req.unit.modules`, nhưng `createUnitContextMiddleware` (`core/src/middleware/unit-context.js`) và `POST /api/session/unit` (`core/src/routes/system.js`) chỉ đặt `{id, code, name, kind}`. Hậu quả: ngoài DYC (kind `platform_owner`, được cho qua), **mọi người** nhận 403 "Forbidden" ở hai route này khi chạy thật. `core/tests/directives.test.js` không bắt được vì giả lập `req.unit.modules`. Task 2 sửa tận gốc bằng cách điền `modules`, kèm test chạy server thật.
- `POST /api/submissions` không kiểm `source_id` có tồn tại/thuộc đơn vị gửi. Đợt này không đổi (ngoài phạm vi); UI chỉ gửi `source_id` của nhật ký đang xem.
- Phiên (`/api/session`) chưa cho web biết đơn vị có bật `dieu-hanh` hay không. Task 2 thêm `modules` (thêm trường, tương thích ngược) để web ẩn/hiện menu "Nhật ký trực ban".

## Global Constraints

- Chỉ tiếng Việt trong giao diện và trong lỗi do route mới trả; không có nút đổi ngôn ngữ.
- Chỉ dùng link cho tài liệu; không làm ô tải tệp.
- Việc chạm `core/` chỉ gồm: API nhật ký trực ban (spec 4.8) và thêm `modules` vào `req.unit`/session (điều kiện để cổng Điều hành chạy thật). Không đổi schema, không đổi route `directives`/`submissions`, không đổi bất biến.
- Tuân theo `docs/playbooks/doi-quyen.md` (quyền qua `req.actor`/`req.unitRole`/`req.unit`, INV-AUTH-001; DYC đọc dữ liệu đơn vị khác phải `recordAudit` `cross_unit_read`, INV-AUDIT-001; route GET mới phải qua `core/tests/units.leak.test.js`, INV-LEAK-001; test "chống rò rỉ" cho vai trò bị chặn).
- `docs/playbooks/doi-schema.md` **không áp dụng** (không có migration). Ghi rõ trong mô tả PR: "Schema: không đổi, `ops_logs`/`ops_log_attendance` có sẵn từ `migrate-units.js`".
- Thông báo không được làm lỗi request (bất biến #5 / `docs/ai/bat-bien.md`): ghi thông báo vắng nằm trong `try/catch`, chỉ log lỗi.
- Giờ: lưu `DATETIME` giờ Việt Nam, trả `YYYY-MM-DDTHH:mm:ss` không múi giờ (dùng `DATE_FORMAT`). Web hiển thị bằng cắt chuỗi theo định dạng đã biết, **không** dùng `new Date()` trên chuỗi này (bất biến #7).
- Test Core cần MySQL; người dùng chạy qua CI (không có MySQL local). Gom các lần đỏ: commit từng task, **push một lần sau Task 6** rồi xem CI; lệnh chạy local nếu có MySQL được ghi kèm.
- Web: mỗi thao tác ghi có test Vitest kiểm đúng endpoint + body, nút ẩn/hiện theo quyền (một ca được, một ca bị chặn), lỗi server hiện tiếng Việt, cache làm mới sau khi thành công (mục 7 của spec).
- Trước khi báo xong: `cd web && npm test && npm run build`; `cd core && npm test` (CI); `npm run test:tools`; `npm run docs:index && npm run docs:check -- --base origin/staging` (chạy **sau** commit).
- Commit kết thúc bằng `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.

## Quyết định (spec để ngỏ)

1. **Cổng**: `requireDieuHanh` đọc `req.unit.modules` (đã điền từ DB), cho qua nếu `req.unit.kind === 'platform_owner'`. Lỗi 403: `Đơn vị hiện tại chưa bật chức năng Điều hành.` (spec chỉ nói "cùng cổng như directives").
2. **Vai trò ghi** (`POST`): `leader`, `vice_leader`, `admin`, `vice_admin`, `btv_lead`, `btv_member`, hoặc đơn vị `platform_owner` (DYC). Còn lại 403 `Bạn không có quyền ghi nhật ký trực ban.`
3. **Vai trò sửa** (`PATCH`): chỉ trong đơn vị của nhật ký, người có quyền ghi **và** (là người ghi **hoặc** là quản trị đơn vị theo `isUnitAdmin(kind, role)` của `core/src/units/catalog.js`: `admin`, `vice_admin`, `btv_lead`, `dyc_admin`). Nhật ký đơn vị khác → 404; đủ đơn vị nhưng không đủ quyền → 403.
4. **Đọc chéo đơn vị** (`GET /:id`): cho phép khi (a) chính sách `unit_visibility_policies` của đơn vị xem với đơn vị sở hữu là `full_readonly`, hoặc (b) có submission `source_type='ops_log'`, `source_id` = id, `to_unit_id` = đơn vị xem, chưa rút (`withdrawn_at IS NULL`), hoặc (c) người xem thuộc đơn vị `platform_owner` (DYC, chỉ đọc; **bắt buộc** `recordAudit` `cross_unit_read`, `targetType='ops_log'`). Ngoài ra 404. Người xem nhật ký đơn vị khác không thấy danh sách `submissions` và `can_edit=false`. `GET /api/ops-logs` (danh sách) luôn chỉ của đơn vị hiện tại.
5. **Thông báo vắng**: dòng `notifications` `kind='ops_log.absent_recorded'`, `url='/#ops-log/<id>'` (theo kiểu `/#activity/<id>` mà route khác đang dùng; hash `#ops-log/<id>` đúng như spec và web chuẩn hoá thành `#/ops-log/<id>`), hết hạn sau 30 ngày. Tạo khi `absent` mới tạo, hoặc khi người đó vừa đổi từ trạng thái khác sang `absent`. Giữ `absent`→`absent` không tạo thêm. `source_key` có dấu thời gian để đổi `absent`→`present`→`absent` lại thông báo lại.
6. **Trạng thái `absent_excused`** (vắng có phép) không phát thông báo (spec chỉ nói `absent`).
7. **Route web**: danh sách `/ops-logs`, tạo `/ops-logs/new`, chi tiết `/ops-log/:id` (khớp link `#ops-log/:id` trong thông báo), sửa `/ops-log/:id/edit`. Menu "Nhật ký trực ban" thành mục điều hướng thật, hiện khi `hasDieuHanh`; bỏ khỏi nhóm "SẮP CÓ".
8. **Phản hồi API**: danh sách `{ data: [...] }` (giống `directives`); chi tiết là đối tượng phẳng; `POST`/`PATCH` trả chi tiết (nên web chuyển thẳng sang trang chi tiết). Chi tiết có thêm `can_edit` và `is_own_unit` do server tính, để UI không phải đoán `isUnitAdmin`.
9. **Giới hạn**: tối đa 300 người điểm danh/nhật ký; `limit` danh sách mặc định 100, tối đa 200.

## Review Focus

- Test **chống rò rỉ**: `member` ghi → 403; người đơn vị khác (không policy, không Trình) đọc chi tiết → 404; Trình rồi rút → 404 lại — Task 3–6.
- DYC đọc nhật ký đơn vị khác để lại bản ghi `audit_logs` — Task 6.
- Ghi nhật ký + điểm danh trong một transaction; điểm danh sai thì không tạo nhật ký — Task 4.
- Thông báo vắng chỉ cho người **mới** vắng; lỗi thông báo không làm hỏng request — Task 4, 5.
- Nút "Trình" chỉ hiện đúng vai trò mà server cho (`admin`/`vice_admin`/BTV), không hiện cho `leader` — Task 9.
- Giờ không bị lệch múi giờ: API trả chuỗi `YYYY-MM-DDTHH:mm:ss`, web không dùng `new Date()` trên nó — Task 3, 7.

---

## File Structure

| File | Trách nhiệm |
|---|---|
| `core/src/units/memberships.js` (sửa) | `listMemberships` trả thêm `modules: string[]` |
| `core/src/middleware/unit-context.js` (sửa) | `req.unit.modules` |
| `core/src/routes/system.js` (sửa) | `POST /api/session/unit` điền `modules` |
| `core/src/middleware/dieu-hanh-gate.js` (mới) | `requireDieuHanh` |
| `core/src/routes/ops-logs.js` (mới) | API nhật ký trực ban |
| `core/src/routes/index.js` (sửa) | Đăng ký router |
| `core/tests/units.modules.test.js` (mới) | `modules` trong session + cổng Điều hành chạy thật |
| `core/tests/ops-logs.test.js` (mới) | Test API (MySQL thật) |
| `web/src/core/api/types.ts` (sửa) | `SessionUnit.modules`, `SessionMembership.modules` |
| `web/src/core/api/opsLogs.ts` (mới), `index.ts` (sửa) | Gọi API nhật ký |
| `web/src/core/queryKeys.ts` (sửa) | `OPS_LOGS_KEY`, `opsLogDetailKey` |
| `web/src/core/capabilities.ts` (sửa) | `modules`, `hasDieuHanh`, `canWriteOpsLog` |
| `web/src/core/features/ops-logs/opsLogLabels.ts` (mới) | Nhãn loại/điểm danh, định dạng giờ |
| `web/src/core/features/ops-logs/testUtils.tsx` (mới) | Hàm dựng test dùng chung |
| `web/src/core/features/ops-logs/OpsLogsView.tsx` (mới) | Danh sách + lọc |
| `web/src/core/features/ops-logs/OpsLogDetailView.tsx` (mới) | Chi tiết + Sửa + Trình |
| `web/src/core/features/ops-logs/submitAdapter.tsx` (mới) | Nối với `SubmitDialog` của đợt 5 |
| `web/src/core/features/ops-logs/OpsLogFormView.tsx` (mới) | Tạo/sửa + điểm danh |
| `web/src/core/AppRoutes.tsx` (sửa) | 4 route mới |
| `web/src/shared/layouts/PageLayout.tsx` (sửa) | Mục menu thật, prop `canViewDieuHanh` |
| `web/src/core/main.tsx` (sửa) | Truyền `canViewDieuHanh` |

Lệnh chạy một test web: `cd web && npx vitest run <đường dẫn>`. Lệnh chạy một test Core (khi có MySQL): `cd core && node --test --test-concurrency=1 tests/<file>.test.js`.

---

### Task 1: Tiền kiểm đợt 5 và mở nhánh

**Files:** không sửa code.

- [ ] **Step 1: Mở nhánh từ `staging` mới nhất**

```bash
git fetch origin && git switch -c feature/web-dot-6-nhat-ky-truc-ban origin/staging
```

- [ ] **Step 2: Kiểm các giả định (chỉ đọc)**

```bash
ls web/src/core/features/submissions/SubmitDialog.tsx 2>&1 | head -1
grep -n "sourceType\|sourceId\|sourceTitle\|onSubmitted" web/src/core/features/submissions/SubmitDialog.tsx 2>&1 | head
grep -rn "hasDieuHanh\|canViewDieuHanh\|modules" web/src/core/capabilities.ts web/src/shared/layouts/PageLayout.tsx web/src/core/api/types.ts 2>&1 | head
grep -n "modules" core/src/middleware/unit-context.js core/src/units/memberships.js | head
```

Kết quả và việc làm:
- `SubmitDialog.tsx` tồn tại với 4 prop như trên → Task 9 làm bình thường. Chữ ký khác → ghi lại chữ ký thật, Task 9 chỉ sửa `submitAdapter.tsx`.
- `SubmitDialog.tsx` không tồn tại → làm Task 2–8, 10–12 trước (Task 11 vẫn làm được vì route chi tiết dùng file Task 9 → **làm Task 9 trước Task 11**; nếu đợt 5 chưa merge thì dừng ở Task 8, 10 và báo người dùng chờ đợt 5).
- `hasDieuHanh`/`canViewDieuHanh`/`modules` đã có (đợt 5 làm trước): dùng lại tên đó, **bỏ** phần tương ứng ở Task 2 (backend `modules`), Task 7 (capabilities) và Task 11 (PageLayout) nếu đã có; chỉ thêm `canWriteOpsLog`.

- [ ] **Step 3: Không commit** (chưa có thay đổi).

---

### Task 2: `modules` trên đơn vị hiện tại và cổng `requireDieuHanh`

**Files:**
- Modify: `core/src/units/memberships.js` (hàm `listMemberships`), `core/src/middleware/unit-context.js`, `core/src/routes/system.js`
- Create: `core/src/middleware/dieu-hanh-gate.js`
- Test: `core/tests/units.modules.test.js`

**Interfaces:**
- Produces: mỗi phần tử `req.memberships` và `units.memberships[]` của `/api/session` có `modules: string[]`; `req.unit.modules: string[]`; `units.current.modules`; `requireDieuHanh(req, res, next)` (middleware thuần, không truy vấn DB).

- [ ] **Step 1: Viết test hỏng**

```js
// core/tests/units.modules.test.js
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { createTestDatabase } = require('./helpers/db');
const { startTestServer } = require('./helpers/server');
const { createUser, addMembership, unitIdByCode } = require('./helpers/fixtures');
const { requireDieuHanh } = require('../src/middleware/dieu-hanh-gate');

async function enableDieuHanh(pool, code) {
  await pool.execute('INSERT IGNORE INTO unit_modules(unit_id, module_id) VALUES (?, ?)', [await unitIdByCode(pool, code), 'dieu-hanh']);
}

function runGate(unit) {
  const req = { unit };
  let status = null;
  let body = null;
  let passed = false;
  const res = { status(code) { status = code; return this; }, json(payload) { body = payload; return this; } };
  requireDieuHanh(req, res, () => { passed = true; });
  return { status, body, passed };
}

test('requireDieuHanh: cho qua đơn vị có module và DYC, chặn đơn vị thiếu module hoặc không có đơn vị', () => {
  assert.equal(runGate({ id: 1, kind: 'department', modules: ['dieu-hanh', 'ctd'] }).passed, true);
  assert.equal(runGate({ id: 9, kind: 'platform_owner', modules: [] }).passed, true);
  const noModule = runGate({ id: 2, kind: 'office', modules: ['ctd'] });
  assert.equal(noModule.passed, false);
  assert.equal(noModule.status, 403);
  assert.equal(noModule.body.error, 'Đơn vị hiện tại chưa bật chức năng Điều hành.');
  assert.equal(runGate({ id: 2, kind: 'office' }).status, 403);
  assert.equal(runGate(null).status, 403);
});

test('session trả modules của đơn vị hiện tại và của từng membership; đổi đơn vị cũng đúng', async () => {
  const { pool, teardown } = await createTestDatabase();
  const { client, close } = await startTestServer(pool);
  try {
    await enableDieuHanh(pool, 'TCKT');
    const user = await createUser(pool, { role: 'leader', units: [['TCKT', 'leader']] });
    await addMembership(pool, user.id, 'VPD', 'officer');
    await client.login(user.email, user.password);

    const session = await client.request('GET', '/api/session');
    assert.equal(session.status, 200);
    assert.ok(session.json.units.current.modules.includes('dieu-hanh'));
    const vpd = session.json.units.memberships.find(m => m.code === 'VPD');
    assert.ok(Array.isArray(vpd.modules));
    assert.ok(!vpd.modules.includes('dieu-hanh'));

    const vpdId = await unitIdByCode(pool, 'VPD');
    const switched = await client.request('POST', '/api/session/unit', { body: { unit_id: vpdId } });
    assert.equal(switched.status, 200);
    assert.equal(switched.json.units.current.code, 'VPD');
    assert.ok(!switched.json.units.current.modules.includes('dieu-hanh'));
  } finally {
    await close();
    await teardown();
  }
});

test('cổng Điều hành của directives/submissions chạy thật: BTV vào được, VPD bị 403', async () => {
  const { pool, teardown } = await createTestDatabase();
  const { client, close } = await startTestServer(pool);
  try {
    await enableDieuHanh(pool, 'BTV');
    const btv = await createUser(pool, { units: [['BTV', 'btv_lead']] });
    const vpd = await createUser(pool, { units: [['VPD', 'officer']] });

    await client.login(btv.email, btv.password);
    assert.equal((await client.request('GET', '/api/directives')).status, 200);
    assert.equal((await client.request('GET', '/api/submissions')).status, 200);

    await client.login(vpd.email, vpd.password);
    assert.equal((await client.request('GET', '/api/directives')).status, 403);
    assert.equal((await client.request('GET', '/api/submissions')).status, 403);
  } finally {
    await close();
    await teardown();
  }
});
```

- [ ] **Step 2: Chạy, xác nhận hỏng**

Run (cần MySQL local; nếu không có, bỏ qua và để CI báo): `cd core && node --test --test-concurrency=1 tests/units.modules.test.js`
Expected: FAIL — `Cannot find module '../src/middleware/dieu-hanh-gate'`.

- [ ] **Step 3: Viết cổng**

```js
// core/src/middleware/dieu-hanh-gate.js
'use strict';

/**
 * Cổng của module Điều hành: đơn vị hiện tại phải bật `dieu-hanh` (req.unit.modules do
 * createUnitContextMiddleware điền từ unit_modules). DYC (platform_owner) luôn được qua.
 * Đặt sau `auth`. Không truy vấn DB.
 */
function requireDieuHanh(req, res, next) {
  const unit = req.unit;
  if (unit && unit.kind === 'platform_owner') return next();
  const modules = Array.isArray(unit && unit.modules) ? unit.modules : [];
  if (!unit || !modules.includes('dieu-hanh')) {
    return res.status(403).json({ error: 'Đơn vị hiện tại chưa bật chức năng Điều hành.' });
  }
  return next();
}

module.exports = { requireDieuHanh };
```

- [ ] **Step 4: `listMemberships` trả `modules`**

Trong `core/src/units/memberships.js` thay thân `listMemberships`:

```js
async function listMemberships(db, userId) {
  const [rows] = await db.execute(
    `SELECT m.unit_id, u.code, u.name, u.kind, m.role,
            COALESCE((SELECT GROUP_CONCAT(um.module_id ORDER BY um.module_id SEPARATOR ',')
                      FROM unit_modules um WHERE um.unit_id = u.id), '') AS modules_csv
     FROM unit_memberships m
     JOIN org_units u ON u.id = m.unit_id AND u.is_active = 1
     WHERE m.user_id = ?
     ORDER BY m.id`,
    [userId]
  );
  return rows.map(({ modules_csv: modulesCsv, ...membership }) => ({
    ...membership,
    modules: modulesCsv ? modulesCsv.split(',') : []
  }));
}
```
Và thêm `@property {string[]} modules — module đang bật cho đơn vị` vào typedef `Membership` ở đầu file.

- [ ] **Step 5: Điền `modules` vào `req.unit`**

`core/src/middleware/unit-context.js`:
```js
// cũ
      req.unit = { id: current.unit_id, code: current.code, name: current.name, kind: current.kind };
// mới
      req.unit = { id: current.unit_id, code: current.code, name: current.name, kind: current.kind, modules: current.modules };
```
`core/src/routes/system.js` (`POST /api/session/unit`):
```js
// cũ
  req.unit = { id: m.unit_id, code: m.code, name: m.name, kind: m.kind };
// mới
  req.unit = { id: m.unit_id, code: m.code, name: m.name, kind: m.kind, modules: m.modules };
```

- [ ] **Step 6: Chạy lại** — cả file test này và `tests/units.*.test.js`, `tests/directives.test.js`, `tests/middleware.unit-context.test.js`, `tests/units.leak.test.js`. Expected: PASS (nếu không có MySQL: để CI ở Task 6).

- [ ] **Step 7: Commit**

```bash
git add core/src/middleware/dieu-hanh-gate.js core/src/units/memberships.js core/src/middleware/unit-context.js core/src/routes/system.js core/tests/units.modules.test.js
git commit -m "feat(core): req.unit.modules và cổng requireDieuHanh chạy thật"
```

---

### Task 3: API đọc nhật ký (danh sách, chi tiết cùng đơn vị)

**Files:**
- Create: `core/src/routes/ops-logs.js`, `core/tests/ops-logs.test.js`
- Modify: `core/src/routes/index.js`

**Interfaces:**
- Produces: `GET /api/ops-logs?from=&to=&type=&limit=` → `{ data: OpsLogSummary[] }`; `GET /api/ops-logs/:id` → chi tiết. `createOpsLogRoutes(context)`.
- `OpsLogSummary`: `{ id, unit_id, unit_name, type, title, started_at, ended_at, location, recorded_by, recorded_by_name, created_at, counts:{present,late,absent_excused,absent}, attendance_total }`. Chi tiết = Summary + `content`, `attendance:[{user_id,name,status,note}]`, `submissions:[{id,to_unit_id,to_unit_name,response,response_note,created_at,withdrawn_at}]`, `is_own_unit`, `can_edit`.

- [ ] **Step 1: Viết test hỏng** (cũng là khung cho Task 4–6; các `describe` sau được thêm vào cùng file)

```js
// core/tests/ops-logs.test.js
'use strict';
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { createTestDatabase } = require('./helpers/db');
const { startTestServer } = require('./helpers/server');
const { createUser, unitIdByCode } = require('./helpers/fixtures');

let pool;
let teardown;
let client;
let close;
const U = {};

async function enableDieuHanh(code) {
  await pool.execute('INSERT IGNORE INTO unit_modules(unit_id, module_id) VALUES (?, ?)', [await unitIdByCode(pool, code), 'dieu-hanh']);
}
async function as(user) { await client.login(user.email, user.password); }
const get = path => client.request('GET', path);
const post = (path, body) => client.request('POST', path, { body });
const patch = (path, body) => client.request('PATCH', path, { body });

const sample = (attendance = [], extra = {}) => ({
  type: 'duty_shift',
  title: 'Trực ban tối thứ Tư',
  started_at: '2026-10-07T18:00',
  ended_at: '2026-10-07T21:00',
  location: 'Phòng 101',
  content: 'Không có sự cố.',
  attendance,
  ...extra
});

// Chèn thẳng vào DB (dùng cho test đọc, không phụ thuộc route ghi).
async function seedLog({ unit = 'TCKT', type = 'duty_shift', title = 'Nhật ký mẫu', startedAt = '2026-10-07 18:00:00', recordedBy = null, attendance = [] } = {}) {
  const unitId = await unitIdByCode(pool, unit);
  const [result] = await pool.execute(
    'INSERT INTO ops_logs(unit_id, type, title, started_at, ended_at, location, content, recorded_by) VALUES (?,?,?,?,?,?,?,?)',
    [unitId, type, title, startedAt, null, 'Phòng 101', 'Nội dung', recordedBy]
  );
  for (const [userId, status, note] of attendance) {
    await pool.execute('INSERT INTO ops_log_attendance(ops_log_id, user_id, status, note) VALUES (?,?,?,?)', [result.insertId, userId, status, note || null]);
  }
  return result.insertId;
}

before(async () => {
  ({ pool, teardown } = await createTestDatabase());
  ({ client, close } = await startTestServer(pool));
  await enableDieuHanh('TCKT');
  await enableDieuHanh('BTV');
  U.leader = await createUser(pool, { role: 'leader', name: 'Tổ trưởng Lan', units: [['TCKT', 'leader']] });
  U.leader2 = await createUser(pool, { role: 'leader', name: 'Tổ trưởng Mai', units: [['TCKT', 'leader']] });
  U.admin = await createUser(pool, { role: 'admin', name: 'Quản trị Hùng', units: [['TCKT', 'admin']] });
  U.m1 = await createUser(pool, { role: 'member', name: 'Thành viên An', units: [['TCKT', 'member']] });
  U.m2 = await createUser(pool, { role: 'member', name: 'Thành viên Bình', units: [['TCKT', 'member']] });
  U.m3 = await createUser(pool, { role: 'member', name: 'Thành viên Cường', units: [['TCKT', 'member']] });
  U.vpd = await createUser(pool, { role: 'member', name: 'Cán bộ VPĐ', units: [['VPD', 'officer']] });
  U.btv = await createUser(pool, { role: 'member', name: 'BTV Dũng', units: [['BTV', 'btv_lead']] });
  U.dyc = await createUser(pool, { role: 'member', name: 'DYC Quản trị', units: [['DYC', 'dyc_admin']] });
});

after(async () => {
  await close();
  await teardown();
});

describe('GET /api/ops-logs — cổng và danh sách', () => {
  it('chưa đăng nhập 401; đơn vị không bật Điều hành 403 (cả đọc và ghi)', async () => {
    await client.request('POST', '/api/logout');
    assert.equal((await get('/api/ops-logs')).status, 401);
    await as(U.vpd);
    assert.equal((await get('/api/ops-logs')).status, 403);
    assert.equal((await get('/api/ops-logs/1')).status, 403);
    assert.equal((await post('/api/ops-logs', sample())).status, 403);
  });

  it('chỉ trả nhật ký của đơn vị hiện tại, mới nhất trước, kèm tên người ghi và số điểm danh', async () => {
    const older = await seedLog({ title: 'Cũ', startedAt: '2026-10-01 18:00:00', recordedBy: U.leader.id, attendance: [[U.m1.id, 'present']] });
    const newer = await seedLog({
      title: 'Mới', type: 'meeting', startedAt: '2026-10-05 08:00:00', recordedBy: U.leader.id,
      attendance: [[U.m1.id, 'present'], [U.m2.id, 'late'], [U.m3.id, 'absent']]
    });
    await seedLog({ unit: 'BTV', title: 'Của BTV', startedAt: '2026-10-06 08:00:00' });

    await as(U.leader);
    const res = await get('/api/ops-logs');
    assert.equal(res.status, 200);
    const mine = res.json.data.filter(row => [older, newer].includes(row.id));
    assert.deepEqual(mine.map(row => row.id), [newer, older]);
    assert.ok(!res.json.data.some(row => row.title === 'Của BTV'));
    assert.equal(mine[0].recorded_by_name, 'Tổ trưởng Lan');
    assert.deepEqual(mine[0].counts, { present: 1, late: 1, absent_excused: 0, absent: 1 });
    assert.equal(mine[0].attendance_total, 3);
    assert.equal(mine[0].started_at, '2026-10-05T08:00:00');
  });

  it('lọc theo loại và khoảng ngày (ngày cuối tính trọn ngày); đầu vào sai trả 400', async () => {
    await as(U.leader);
    const meetings = await get('/api/ops-logs?type=meeting');
    assert.ok(meetings.json.data.length >= 1);
    assert.ok(meetings.json.data.every(row => row.type === 'meeting'));

    const oneDay = await get('/api/ops-logs?from=2026-10-05&to=2026-10-05');
    assert.ok(oneDay.json.data.some(row => row.title === 'Mới'));
    assert.ok(!oneDay.json.data.some(row => row.title === 'Cũ'));

    assert.equal((await get('/api/ops-logs?type=khac')).status, 400);
    assert.equal((await get('/api/ops-logs?from=2026-13-40')).status, 400);
    assert.equal((await get('/api/ops-logs?from=hôm-qua')).status, 400);
  });
});

describe('GET /api/ops-logs/:id — cùng đơn vị', () => {
  it('trả điểm danh có tên, số lượng, can_edit theo vai trò, is_own_unit', async () => {
    const id = await seedLog({
      title: 'Chi tiết', recordedBy: U.leader.id,
      attendance: [[U.m1.id, 'present'], [U.m2.id, 'absent', 'Ốm']]
    });

    await as(U.leader);
    const asRecorder = await get(`/api/ops-logs/${id}`);
    assert.equal(asRecorder.status, 200);
    assert.equal(asRecorder.json.title, 'Chi tiết');
    assert.equal(asRecorder.json.content, 'Nội dung');
    assert.equal(asRecorder.json.is_own_unit, true);
    assert.equal(asRecorder.json.can_edit, true);
    assert.deepEqual(asRecorder.json.counts, { present: 1, late: 0, absent_excused: 0, absent: 1 });
    assert.deepEqual(asRecorder.json.attendance.map(a => [a.name, a.status, a.note]), [
      ['Thành viên An', 'present', null],
      ['Thành viên Bình', 'absent', 'Ốm']
    ]);
    assert.deepEqual(asRecorder.json.submissions, []);

    await as(U.leader2);
    assert.equal((await get(`/api/ops-logs/${id}`)).json.can_edit, false);
    await as(U.admin);
    assert.equal((await get(`/api/ops-logs/${id}`)).json.can_edit, true);
    await as(U.m1);
    assert.equal((await get(`/api/ops-logs/${id}`)).json.can_edit, false);
  });

  it('id không có hoặc không phải số thì 404', async () => {
    await as(U.leader);
    assert.equal((await get('/api/ops-logs/99999999')).status, 404);
    assert.equal((await get('/api/ops-logs/abc')).status, 404);
    assert.equal((await get('/api/ops-logs/0')).status, 404);
  });
});
```

- [ ] **Step 2: Chạy, xác nhận hỏng**

Run: `cd core && node --test --test-concurrency=1 tests/ops-logs.test.js` — Expected: FAIL (404 vì route chưa có / `data` undefined). (Không có MySQL: bỏ qua, CI ở Task 6.)

- [ ] **Step 3: Viết router (phần đọc)**

```js
// core/src/routes/ops-logs.js
'use strict';
const express = require('express');
const { requireDieuHanh } = require('../middleware/dieu-hanh-gate');
const { isUnitAdmin } = require('../units/catalog');

const TYPES = ['duty_shift', 'meeting', 'other'];
const STATUSES = ['present', 'late', 'absent_excused', 'absent'];
const WRITE_ROLES = ['leader', 'vice_leader', 'admin', 'vice_admin', 'btv_lead', 'btv_member'];
const DATETIME_RE = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?$/;

const pad = n => String(n).padStart(2, '0');

/** 'YYYY-MM-DD[T ]HH:mm[:ss]' (giờ địa phương) -> 'YYYY-MM-DD HH:mm:ss', hoặc null nếu không hợp lệ. */
function parseDateTime(value) {
  if (typeof value !== 'string') return null;
  const match = DATETIME_RE.exec(value.trim());
  if (!match) return null;
  const [year, month, day, hour, minute, second] = [match[1], match[2], match[3], match[4], match[5], match[6] ?? '00'].map(Number);
  const probe = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
  const real = probe.getUTCFullYear() === year && probe.getUTCMonth() === month - 1 && probe.getUTCDate() === day;
  if (!real || hour > 23 || minute > 59 || second > 59) return null;
  return `${year}-${pad(month)}-${pad(day)} ${pad(hour)}:${pad(minute)}:${pad(second)}`;
}

/** 'YYYY-MM-DD' -> 'YYYY-MM-DD 00:00:00' hoặc null. */
function parseDateOnly(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  return parseDateTime(`${value} 00:00`);
}

const parseId = raw => {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
};

const countsOf = rows => {
  const counts = { present: 0, late: 0, absent_excused: 0, absent: 0 };
  for (const row of rows) counts[row.status] += 1;
  return counts;
};

const LOG_SELECT = `SELECT l.id, l.unit_id, un.name AS unit_name, l.type, l.title,
    DATE_FORMAT(l.started_at, '%Y-%m-%dT%H:%i:%s') AS started_at,
    DATE_FORMAT(l.ended_at, '%Y-%m-%dT%H:%i:%s') AS ended_at,
    l.location, l.content, l.recorded_by, rb.name AS recorded_by_name, l.created_at
  FROM ops_logs l
  JOIN org_units un ON un.id = l.unit_id
  LEFT JOIN users rb ON rb.id = l.recorded_by`;

function createOpsLogRoutes(context) {
  const { asyncRoute, db, auth } = context;
  const router = express.Router();

  router.use('/api/ops-logs', auth, requireDieuHanh);

  const notFound = res => res.status(404).json({ error: 'Không tìm thấy nhật ký.' });

  async function loadLog(id) {
    const [rows] = await db.execute(`${LOG_SELECT} WHERE l.id = ?`, [id]);
    return rows[0] || null;
  }

  async function buildDetail(log, req, own) {
    const [attendance] = await db.execute(
      `SELECT a.user_id, u.name, a.status, a.note
       FROM ops_log_attendance a JOIN users u ON u.id = a.user_id
       WHERE a.ops_log_id = ? ORDER BY u.name, a.user_id`,
      [log.id]
    );
    let submissions = [];
    if (own) {
      [submissions] = await db.execute(
        `SELECT s.id, s.to_unit_id, tu.name AS to_unit_name, s.response, s.response_note, s.created_at, s.withdrawn_at
         FROM submissions s JOIN org_units tu ON tu.id = s.to_unit_id
         WHERE s.source_type = 'ops_log' AND s.source_id = ? AND s.from_unit_id = ?
         ORDER BY s.created_at DESC, s.id DESC`,
        [log.id, log.unit_id]
      );
    }
    return {
      ...log,
      is_own_unit: own,
      can_edit: own && canEdit(req, log),
      counts: countsOf(attendance),
      attendance_total: attendance.length,
      attendance,
      submissions
    };
  }

  const canWrite = req => req.unit.kind === 'platform_owner' || WRITE_ROLES.includes(req.unitRole);
  const canEdit = (req, log) =>
    Number(log.unit_id) === Number(req.unit.id) && canWrite(req) &&
    (Number(log.recorded_by) === Number(req.actor.id) || isUnitAdmin(req.unit.kind, req.unitRole));

  // GET /api/ops-logs
  router.get('/api/ops-logs', asyncRoute(async (req, res) => {
    const where = ['l.unit_id = ?'];
    const params = [req.unit.id];

    if (req.query.type !== undefined && req.query.type !== '') {
      if (!TYPES.includes(req.query.type)) return res.status(400).json({ error: 'Loại nhật ký không hợp lệ.' });
      where.push('l.type = ?');
      params.push(req.query.type);
    }
    if (req.query.from !== undefined && req.query.from !== '') {
      const from = parseDateOnly(req.query.from);
      if (!from) return res.status(400).json({ error: 'Ngày bắt đầu lọc không hợp lệ.' });
      where.push('l.started_at >= ?');
      params.push(from);
    }
    if (req.query.to !== undefined && req.query.to !== '') {
      const to = parseDateOnly(req.query.to);
      if (!to) return res.status(400).json({ error: 'Ngày kết thúc lọc không hợp lệ.' });
      where.push('l.started_at < DATE_ADD(CAST(? AS DATETIME), INTERVAL 1 DAY)');
      params.push(to);
    }
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 100, 1), 200);

    const countOf = status => `(SELECT COUNT(*) FROM ops_log_attendance a WHERE a.ops_log_id = l.id AND a.status = '${status}')`;
    const [rows] = await db.execute(
      `SELECT l.id, l.unit_id, un.name AS unit_name, l.type, l.title,
              DATE_FORMAT(l.started_at, '%Y-%m-%dT%H:%i:%s') AS started_at,
              DATE_FORMAT(l.ended_at, '%Y-%m-%dT%H:%i:%s') AS ended_at,
              l.location, l.recorded_by, rb.name AS recorded_by_name, l.created_at,
              ${countOf('present')} AS present_count, ${countOf('late')} AS late_count,
              ${countOf('absent_excused')} AS absent_excused_count, ${countOf('absent')} AS absent_count
       FROM ops_logs l
       JOIN org_units un ON un.id = l.unit_id
       LEFT JOIN users rb ON rb.id = l.recorded_by
       WHERE ${where.join(' AND ')}
       ORDER BY l.started_at DESC, l.id DESC
       LIMIT ${limit}`,
      params
    );
    res.json({
      data: rows.map(({ present_count: present, late_count: late, absent_excused_count: absentExcused, absent_count: absent, ...row }) => ({
        ...row,
        counts: { present: Number(present), late: Number(late), absent_excused: Number(absentExcused), absent: Number(absent) },
        attendance_total: Number(present) + Number(late) + Number(absentExcused) + Number(absent)
      }))
    });
  }));

  // GET /api/ops-logs/:id  (đọc chéo đơn vị: thêm ở Task 6; tới lúc đó đơn vị khác nhận 404)
  router.get('/api/ops-logs/:id', asyncRoute(async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return notFound(res);
    const log = await loadLog(id);
    if (!log) return notFound(res);
    const own = Number(log.unit_id) === Number(req.unit.id);
    if (!own) return notFound(res);
    res.json(await buildDetail(log, req, own));
  }));

  return router;
}

module.exports = { createOpsLogRoutes };
```

- [ ] **Step 4: Đăng ký route** — `core/src/routes/index.js`:

```js
// thêm cạnh các require khác
const { createOpsLogRoutes } = require('./ops-logs');
// thêm sau dòng app.use(createSubmissionRoutes(context));
  app.use(createOpsLogRoutes(context));
```

- [ ] **Step 5: Chạy lại** `tests/ops-logs.test.js` — Expected: PASS (nhóm "cổng và danh sách", "cùng đơn vị").

- [ ] **Step 6: Commit**

```bash
git add core/src/routes/ops-logs.js core/src/routes/index.js core/tests/ops-logs.test.js
git commit -m "feat(core): API đọc nhật ký trực ban (danh sách, chi tiết)"
```

---

### Task 4: `POST /api/ops-logs` — tạo, điểm danh, thông báo vắng

**Files:**
- Modify: `core/src/routes/ops-logs.js`
- Test: `core/tests/ops-logs.test.js` (thêm `describe`)

**Interfaces:**
- Produces: `POST /api/ops-logs` body `{type, title, started_at, ended_at?, location?, content?, attendance:[{user_id, status, note?}]}` → `201` chi tiết. Lỗi: 400 (đầu vào), 403 (`Bạn không có quyền ghi nhật ký trực ban.`). Hàm nội bộ dùng lại ở Task 5: `parseFields(body, existing)`, `parseAttendance(unitId, list)`, `insertAttendance(conn, logId, rows)`, `notifyAbsent(logId, title, startedAt, userIds)`.

- [ ] **Step 1: Viết test hỏng** — thêm vào cuối `core/tests/ops-logs.test.js`:

```js
async function absentNotifications(userId) {
  const [rows] = await pool.execute(
    "SELECT kind, url, title FROM notifications WHERE user_id = ? AND kind = 'ops_log.absent_recorded' ORDER BY id",
    [userId]
  );
  return rows;
}

describe('POST /api/ops-logs', () => {
  it('member 403; leader tạo được kèm điểm danh; lưu đủ và trả chi tiết', async () => {
    await as(U.m1);
    assert.equal((await post('/api/ops-logs', sample())).status, 403);

    await as(U.leader);
    const res = await post('/api/ops-logs', sample([
      { user_id: U.m1.id, status: 'present' },
      { user_id: U.m2.id, status: 'late', note: 'Kẹt xe' },
      { user_id: U.m3.id, status: 'absent_excused', note: 'Xin phép' }
    ]));
    assert.equal(res.status, 201);
    assert.equal(res.json.title, 'Trực ban tối thứ Tư');
    assert.equal(res.json.started_at, '2026-10-07T18:00:00');
    assert.equal(res.json.ended_at, '2026-10-07T21:00:00');
    assert.equal(res.json.recorded_by_name, 'Tổ trưởng Lan');
    assert.equal(res.json.can_edit, true);
    assert.deepEqual(res.json.counts, { present: 1, late: 1, absent_excused: 1, absent: 0 });
    const [[row]] = await pool.execute('SELECT unit_id, recorded_by FROM ops_logs WHERE id = ?', [res.json.id]);
    assert.equal(row.unit_id, await unitIdByCode(pool, 'TCKT'));
    assert.equal(row.recorded_by, U.leader.id);
    assert.deepEqual(await absentNotifications(U.m3.id), []); // vắng có phép: không thông báo
  });

  it('admin và BTV ghi được; vice_leader cũng; DYC ghi được cho đơn vị DYC', async () => {
    await as(U.admin);
    assert.equal((await post('/api/ops-logs', sample())).status, 201);
    await as(U.btv);
    assert.equal((await post('/api/ops-logs', sample([], { type: 'meeting' }))).status, 201);
    await as(U.dyc);
    assert.equal((await post('/api/ops-logs', sample([], { type: 'other' }))).status, 201);
  });

  it('mỗi dòng absent tạo đúng một thông báo cho người đó, url #ops-log/:id', async () => {
    await as(U.leader);
    const res = await post('/api/ops-logs', sample([
      { user_id: U.m1.id, status: 'present' },
      { user_id: U.m2.id, status: 'absent', note: 'Không báo' }
    ]));
    assert.equal(res.status, 201);
    const notes = await absentNotifications(U.m2.id);
    assert.equal(notes.length, 1);
    assert.equal(notes[0].url, `/#ops-log/${res.json.id}`);
    assert.equal(notes[0].title, 'Bạn được ghi vắng mặt');
    assert.deepEqual(await absentNotifications(U.m1.id), []);
  });

  it('kiểm tra đầu vào: 400 với thông điệp tiếng Việt, và không tạo nhật ký nào', async () => {
    await as(U.leader);
    const [[before]] = await pool.execute('SELECT COUNT(*) n FROM ops_logs');
    const cases = [
      [sample([], { type: 'khac' }), 'Loại nhật ký không hợp lệ.'],
      [sample([], { title: '   ' }), 'Tiêu đề là bắt buộc và không quá 200 ký tự.'],
      [sample([], { title: 'x'.repeat(201) }), 'Tiêu đề là bắt buộc và không quá 200 ký tự.'],
      [sample([], { started_at: '07/10/2026 18:00' }), 'Thời điểm bắt đầu không hợp lệ.'],
      [sample([], { started_at: '2026-02-30T10:00' }), 'Thời điểm bắt đầu không hợp lệ.'],
      [sample([], { ended_at: '2026-10-07T17:00' }), 'Thời điểm kết thúc không hợp lệ hoặc trước thời điểm bắt đầu.'],
      [sample([], { location: 'x'.repeat(201) }), 'Địa điểm không quá 200 ký tự.'],
      [sample([], { attendance: 'tất cả' }), 'Danh sách điểm danh không hợp lệ.'],
      [sample([{ user_id: U.m1.id, status: 'co-mat' }]), 'Trạng thái điểm danh không hợp lệ.'],
      [sample([{ user_id: 'abc', status: 'present' }]), 'Danh sách điểm danh không hợp lệ.'],
      [sample([{ user_id: U.m1.id, status: 'present' }, { user_id: U.m1.id, status: 'late' }]), 'Một người chỉ được điểm danh một lần.'],
      [sample([{ user_id: U.vpd.id, status: 'present' }]), 'Người được điểm danh phải là thành viên của đơn vị.'],
      [sample([{ user_id: 99999999, status: 'present' }]), 'Người được điểm danh phải là thành viên của đơn vị.']
    ];
    for (const [body, message] of cases) {
      const res = await post('/api/ops-logs', body);
      assert.equal(res.status, 400, message);
      assert.equal(res.json.error, message);
    }
    const [[after]] = await pool.execute('SELECT COUNT(*) n FROM ops_logs');
    assert.equal(after.n, before.n);
  });

  it('ended_at, location, content, attendance là tuỳ chọn', async () => {
    await as(U.leader);
    const res = await post('/api/ops-logs', { type: 'other', title: 'Họp nhanh', started_at: '2026-10-08 09:30' });
    assert.equal(res.status, 201);
    assert.equal(res.json.ended_at, null);
    assert.equal(res.json.location, null);
    assert.equal(res.json.attendance_total, 0);
  });
});
```

- [ ] **Step 2: Chạy, xác nhận hỏng** — Expected: FAIL (POST trả 404).

- [ ] **Step 3: Thêm vào `ops-logs.js`**

Trong thân `createOpsLogRoutes`, ngay sau khai báo `notFound`, thêm (cùng `const { asyncRoute, db, auth } = context;` đổi thành có `logger`):

```js
// đổi dòng đầu của hàm:
  const { asyncRoute, db, auth, logger } = context;
```

Thêm các hàm sau `canEdit` và trước `router.get('/api/ops-logs', ...)`:

```js
  const INVALID = Symbol('invalid');
  const textOrNull = (value, max) => {
    if (value === null || value === undefined) return null;
    const text = String(value).trim();
    if (!text) return null;
    return text.length > max ? INVALID : text;
  };

  /** Hợp nhất body với bản ghi cũ (PATCH) rồi kiểm tra. Trả { error } hoặc { value }. */
  function parseFields(body, existing) {
    const has = key => Object.hasOwn(body, key);
    const type = has('type') ? body.type : existing?.type;
    if (!TYPES.includes(type)) return { error: 'Loại nhật ký không hợp lệ.' };

    const title = String(has('title') ? body.title ?? '' : existing?.title ?? '').trim();
    if (!title || title.length > 200) return { error: 'Tiêu đề là bắt buộc và không quá 200 ký tự.' };

    const startedAt = parseDateTime(has('started_at') ? body.started_at : existing?.started_at);
    if (!startedAt) return { error: 'Thời điểm bắt đầu không hợp lệ.' };

    let endedAt = null;
    const rawEnd = has('ended_at') ? body.ended_at : existing?.ended_at;
    if (rawEnd !== null && rawEnd !== undefined && rawEnd !== '') {
      endedAt = parseDateTime(rawEnd);
      if (!endedAt || endedAt < startedAt) return { error: 'Thời điểm kết thúc không hợp lệ hoặc trước thời điểm bắt đầu.' };
    }

    const location = textOrNull(has('location') ? body.location : existing?.location, 200);
    if (location === INVALID) return { error: 'Địa điểm không quá 200 ký tự.' };
    const content = textOrNull(has('content') ? body.content : existing?.content, 20000);
    if (content === INVALID) return { error: 'Nội dung quá dài (tối đa 20000 ký tự).' };

    return { value: { type, title, startedAt, endedAt, location, content } };
  }

  /** Kiểm tra danh sách điểm danh. Trả { error } hoặc { rows: [{user_id, status, note}] }. */
  async function parseAttendance(unitId, list) {
    if (!Array.isArray(list) || list.length > 300) return { error: 'Danh sách điểm danh không hợp lệ.' };
    const rows = [];
    const seen = new Set();
    for (const item of list) {
      const userId = Number(item?.user_id);
      if (!item || typeof item !== 'object' || !Number.isInteger(userId) || userId <= 0) return { error: 'Danh sách điểm danh không hợp lệ.' };
      if (!STATUSES.includes(item.status)) return { error: 'Trạng thái điểm danh không hợp lệ.' };
      if (seen.has(userId)) return { error: 'Một người chỉ được điểm danh một lần.' };
      seen.add(userId);
      const note = textOrNull(item.note, 255);
      if (note === INVALID) return { error: 'Ghi chú điểm danh không quá 255 ký tự.' };
      rows.push({ user_id: userId, status: item.status, note });
    }
    if (rows.length) {
      const [members] = await db.query('SELECT user_id FROM unit_memberships WHERE unit_id = ? AND user_id IN (?)', [unitId, rows.map(r => r.user_id)]);
      if (members.length !== rows.length) return { error: 'Người được điểm danh phải là thành viên của đơn vị.' };
    }
    return { rows };
  }

  async function insertAttendance(conn, logId, rows) {
    for (const row of rows) {
      await conn.execute('INSERT INTO ops_log_attendance(ops_log_id, user_id, status, note) VALUES (?,?,?,?)', [logId, row.user_id, row.status, row.note]);
    }
  }

  const vnStamp = startedAt => {
    const [date, time] = String(startedAt).replace('T', ' ').split(' ');
    const [y, m, d] = date.split('-');
    return `${time.slice(0, 5)} ${d}/${m}/${y}`;
  };

  /** Thông báo trong ứng dụng cho người vừa bị ghi vắng. Không bao giờ làm hỏng request. */
  async function notifyAbsent(logId, title, startedAt, userIds) {
    for (const userId of userIds) {
      try {
        await db.execute(
          `INSERT INTO notifications(user_id, kind, title, body, url, source_key, expires_at)
           VALUES (?, 'ops_log.absent_recorded', ?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 30 DAY))`,
          [
            userId,
            'Bạn được ghi vắng mặt',
            `Bạn được ghi vắng mặt trong “${title}” (${vnStamp(startedAt)}).`.slice(0, 500),
            `/#ops-log/${logId}`,
            `ops-log-absent:${logId}:${userId}:${Date.now()}`
          ]
        );
      } catch (error) {
        if (logger) logger.error(`Unable to create absent notification for ops log ${logId}, user ${userId}.`, error);
      }
    }
  }
```

Thêm route `POST` trước `return router;`:

```js
  // POST /api/ops-logs
  router.post('/api/ops-logs', asyncRoute(async (req, res) => {
    if (!canWrite(req)) return res.status(403).json({ error: 'Bạn không có quyền ghi nhật ký trực ban.' });
    const fields = parseFields(req.body || {}, null);
    if (fields.error) return res.status(400).json({ error: fields.error });
    const attendance = await parseAttendance(req.unit.id, req.body.attendance ?? []);
    if (attendance.error) return res.status(400).json({ error: attendance.error });

    const { type, title, startedAt, endedAt, location, content } = fields.value;
    const conn = await db.getConnection();
    let logId;
    try {
      await conn.beginTransaction();
      const [result] = await conn.execute(
        'INSERT INTO ops_logs(unit_id, type, title, started_at, ended_at, location, content, recorded_by) VALUES (?,?,?,?,?,?,?,?)',
        [req.unit.id, type, title, startedAt, endedAt, location, content, req.actor.id]
      );
      logId = result.insertId;
      await insertAttendance(conn, logId, attendance.rows);
      await conn.commit();
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }

    await notifyAbsent(logId, title, startedAt, attendance.rows.filter(r => r.status === 'absent').map(r => r.user_id));
    const log = await loadLog(logId);
    res.status(201).json(await buildDetail(log, req, true));
  }));
```

- [ ] **Step 4: Chạy lại** `tests/ops-logs.test.js` — Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add core/src/routes/ops-logs.js core/tests/ops-logs.test.js
git commit -m "feat(core): tạo nhật ký trực ban, điểm danh và thông báo khi vắng"
```

---

### Task 5: `PATCH /api/ops-logs/:id` — sửa và thay danh sách điểm danh

**Files:**
- Modify: `core/src/routes/ops-logs.js`
- Test: `core/tests/ops-logs.test.js` (thêm `describe`)

**Interfaces:**
- Produces: `PATCH /api/ops-logs/:id`, body gồm bất kỳ trường nào của POST (chỉ trường có mặt được đổi; `attendance` có mặt thì **thay toàn bộ**). Trả chi tiết. 404 (không thuộc đơn vị hiện tại), 403 (`Bạn không có quyền sửa nhật ký này.`), 400.

- [ ] **Step 1: Viết test hỏng**

```js
describe('PATCH /api/ops-logs/:id', () => {
  async function createBy(user, attendance) {
    await as(user);
    const res = await post('/api/ops-logs', sample(attendance));
    assert.equal(res.status, 201);
    return res.json.id;
  }

  it('người ghi đổi trường và thay toàn bộ điểm danh; chỉ người MỚI vắng được thông báo', async () => {
    const id = await createBy(U.leader, [
      { user_id: U.m1.id, status: 'present' },
      { user_id: U.m2.id, status: 'absent' }
    ]);
    assert.equal((await absentNotifications(U.m2.id)).length >= 1, true);
    const m2Before = (await absentNotifications(U.m2.id)).length;
    const m3Before = (await absentNotifications(U.m3.id)).length;

    const res = await patch(`/api/ops-logs/${id}`, {
      title: 'Trực ban (đã sửa)',
      attendance: [
        { user_id: U.m2.id, status: 'absent' },   // vẫn vắng: không thông báo lại
        { user_id: U.m3.id, status: 'absent' }    // mới vắng: thông báo
      ]
    });
    assert.equal(res.status, 200);
    assert.equal(res.json.title, 'Trực ban (đã sửa)');
    assert.equal(res.json.started_at, '2026-10-07T18:00:00'); // không đổi
    assert.deepEqual(res.json.attendance.map(a => a.user_id).sort(), [U.m2.id, U.m3.id].sort());
    assert.equal((await absentNotifications(U.m2.id)).length, m2Before);
    assert.equal((await absentNotifications(U.m3.id)).length, m3Before + 1);
    const [rows] = await pool.execute('SELECT user_id FROM ops_log_attendance WHERE ops_log_id = ?', [id]);
    assert.equal(rows.length, 2);
  });

  it('đổi từ có mặt sang vắng thì thông báo; không gửi attendance thì giữ nguyên điểm danh', async () => {
    const id = await createBy(U.leader, [{ user_id: U.m1.id, status: 'present' }]);
    const before = (await absentNotifications(U.m1.id)).length;
    await as(U.leader);
    const keep = await patch(`/api/ops-logs/${id}`, { location: 'Phòng 202' });
    assert.equal(keep.status, 200);
    assert.equal(keep.json.location, 'Phòng 202');
    assert.equal(keep.json.attendance.length, 1);
    assert.equal((await absentNotifications(U.m1.id)).length, before);

    const absent = await patch(`/api/ops-logs/${id}`, { attendance: [{ user_id: U.m1.id, status: 'absent' }] });
    assert.equal(absent.status, 200);
    assert.equal((await absentNotifications(U.m1.id)).length, before + 1);
  });

  it('quyền: leader khác 403, member 403, admin đơn vị 200, người đơn vị khác 404', async () => {
    const id = await createBy(U.leader, []);
    await as(U.leader2);
    assert.equal((await patch(`/api/ops-logs/${id}`, { title: 'Sửa trái phép' })).status, 403);
    await as(U.m1);
    assert.equal((await patch(`/api/ops-logs/${id}`, { title: 'Sửa trái phép' })).status, 403);
    await as(U.btv);
    assert.equal((await patch(`/api/ops-logs/${id}`, { title: 'Sửa trái phép' })).status, 404);
    await as(U.admin);
    const ok = await patch(`/api/ops-logs/${id}`, { title: 'Quản trị sửa' });
    assert.equal(ok.status, 200);
    assert.equal(ok.json.title, 'Quản trị sửa');
  });

  it('đầu vào sai trả 400 và dữ liệu cũ không đổi (kể cả điểm danh)', async () => {
    const id = await createBy(U.leader, [{ user_id: U.m1.id, status: 'present' }]);
    await as(U.leader);
    const badAttendance = await patch(`/api/ops-logs/${id}`, { title: 'Không được lưu', attendance: [{ user_id: U.vpd.id, status: 'present' }] });
    assert.equal(badAttendance.status, 400);
    assert.equal(badAttendance.json.error, 'Người được điểm danh phải là thành viên của đơn vị.');
    const badEnd = await patch(`/api/ops-logs/${id}`, { ended_at: '2026-10-07T10:00' });
    assert.equal(badEnd.status, 400);
    assert.equal((await patch(`/api/ops-logs/${id}`, {})).status, 400);
    assert.equal((await patch(`/api/ops-logs/${id}`, { type: 'khac' })).status, 400);

    const detail = await get(`/api/ops-logs/${id}`);
    assert.equal(detail.json.title, 'Trực ban tối thứ Tư');
    assert.equal(detail.json.attendance.length, 1);
    assert.equal((await patch('/api/ops-logs/99999999', { title: 'x' })).status, 404);
  });

  it('xoá ended_at bằng null', async () => {
    const id = await createBy(U.leader, []);
    await as(U.leader);
    const res = await patch(`/api/ops-logs/${id}`, { ended_at: null });
    assert.equal(res.status, 200);
    assert.equal(res.json.ended_at, null);
  });
});
```

- [ ] **Step 2: Chạy, xác nhận hỏng** — Expected: FAIL (PATCH 404).

- [ ] **Step 3: Thêm route** trước `return router;`:

```js
  // PATCH /api/ops-logs/:id
  router.patch('/api/ops-logs/:id', asyncRoute(async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return notFound(res);
    const log = await loadLog(id);
    if (!log || Number(log.unit_id) !== Number(req.unit.id)) return notFound(res);
    if (!canEdit(req, log)) return res.status(403).json({ error: 'Bạn không có quyền sửa nhật ký này.' });

    const body = req.body || {};
    const editable = ['type', 'title', 'started_at', 'ended_at', 'location', 'content', 'attendance'];
    if (!editable.some(key => Object.hasOwn(body, key))) return res.status(400).json({ error: 'Không có thông tin hợp lệ để lưu.' });

    const fields = parseFields(body, log);
    if (fields.error) return res.status(400).json({ error: fields.error });
    let attendance = null;
    if (Object.hasOwn(body, 'attendance')) {
      attendance = await parseAttendance(req.unit.id, body.attendance);
      if (attendance.error) return res.status(400).json({ error: attendance.error });
    }

    const { type, title, startedAt, endedAt, location, content } = fields.value;
    let newlyAbsent = [];
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();
      await conn.execute(
        'UPDATE ops_logs SET type = ?, title = ?, started_at = ?, ended_at = ?, location = ?, content = ? WHERE id = ?',
        [type, title, startedAt, endedAt, location, content, id]
      );
      if (attendance) {
        const [previous] = await conn.execute('SELECT user_id, status FROM ops_log_attendance WHERE ops_log_id = ?', [id]);
        const before = new Map(previous.map(row => [Number(row.user_id), row.status]));
        newlyAbsent = attendance.rows.filter(r => r.status === 'absent' && before.get(r.user_id) !== 'absent').map(r => r.user_id);
        await conn.execute('DELETE FROM ops_log_attendance WHERE ops_log_id = ?', [id]);
        await insertAttendance(conn, id, attendance.rows);
      }
      await conn.commit();
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }

    await notifyAbsent(id, title, startedAt, newlyAbsent);
    res.json(await buildDetail(await loadLog(id), req, true));
  }));
```

- [ ] **Step 4: Chạy lại** `tests/ops-logs.test.js` — Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add core/src/routes/ops-logs.js core/tests/ops-logs.test.js
git commit -m "feat(core): sửa nhật ký trực ban và thay danh sách điểm danh"
```

---

### Task 6: Đọc chéo đơn vị, audit DYC, test rò rỉ — rồi push để CI chạy

**Files:**
- Modify: `core/src/routes/ops-logs.js`
- Test: `core/tests/ops-logs.test.js` (thêm `describe`)

**Interfaces:**
- Consumes: `recordAudit` (`core/src/services/audit.js`).
- Produces: luật đọc chéo đơn vị cho `GET /api/ops-logs/:id` (Quyết định 4).

- [ ] **Step 1: Viết test hỏng**

```js
describe('GET /api/ops-logs/:id — đọc chéo đơn vị (Requirement 6.3)', () => {
  let logId;
  let tcktId;
  let btvId;

  before(async () => {
    tcktId = await unitIdByCode(pool, 'TCKT');
    btvId = await unitIdByCode(pool, 'BTV');
    logId = await seedLog({ title: 'Nhật ký TCKT', recordedBy: U.leader.id, attendance: [[U.m1.id, 'present']] });
  });

  it('mặc định (mức summary hoặc không có chính sách, chưa Trình) → 404', async () => {
    await as(U.btv);
    assert.equal((await get(`/api/ops-logs/${logId}`)).status, 404);
  });

  it('chính sách full_readonly cho xem, không có can_edit và không lộ danh sách Trình', async () => {
    await pool.execute(
      `INSERT INTO unit_visibility_policies(viewer_unit_id, owner_unit_id, level) VALUES (?, ?, 'full_readonly')
       ON DUPLICATE KEY UPDATE level = VALUES(level)`,
      [btvId, tcktId]
    );
    await as(U.btv);
    const res = await get(`/api/ops-logs/${logId}`);
    assert.equal(res.status, 200);
    assert.equal(res.json.is_own_unit, false);
    assert.equal(res.json.can_edit, false);
    assert.equal(res.json.attendance.length, 1);
    assert.deepEqual(res.json.submissions, []);
    // danh sách vẫn chỉ của đơn vị hiện tại
    assert.ok(!(await get('/api/ops-logs')).json.data.some(row => row.id === logId));

    await pool.execute(
      "UPDATE unit_visibility_policies SET level = 'summary' WHERE viewer_unit_id = ? AND owner_unit_id = ?",
      [btvId, tcktId]
    );
    assert.equal((await get(`/api/ops-logs/${logId}`)).status, 404);
  });

  it('đã Trình tới đơn vị xem thì xem được; rút lại thì 404 trở lại', async () => {
    const [result] = await pool.execute(
      "INSERT INTO submissions(from_unit_id, to_unit_id, source_type, source_id, note) VALUES (?, ?, 'ops_log', ?, 'Trình nhật ký')",
      [tcktId, btvId, logId]
    );
    await as(U.btv);
    assert.equal((await get(`/api/ops-logs/${logId}`)).status, 200);

    // Người gửi thấy danh sách Trình trong chi tiết
    await as(U.leader);
    const own = await get(`/api/ops-logs/${logId}`);
    assert.equal(own.json.submissions.length, 1);
    assert.equal(own.json.submissions[0].to_unit_name.length > 0, true);
    assert.equal(own.json.submissions[0].response, null);

    await pool.execute('UPDATE submissions SET withdrawn_at = NOW() WHERE id = ?', [result.insertId]);
    await as(U.btv);
    assert.equal((await get(`/api/ops-logs/${logId}`)).status, 404);
  });

  it('Trình tới đơn vị khác không mở quyền cho đơn vị thứ ba (BTV vẫn 404)', async () => {
    const other = await seedLog({ title: 'Chỉ trình cho VPĐ', recordedBy: U.leader.id });
    const vpdId = await unitIdByCode(pool, 'VPD');
    await pool.execute(
      "INSERT INTO submissions(from_unit_id, to_unit_id, source_type, source_id) VALUES (?, ?, 'ops_log', ?)",
      [tcktId, vpdId, other]
    );
    await as(U.btv);
    assert.equal((await get(`/api/ops-logs/${other}`)).status, 404);
  });

  it('DYC đọc được nhật ký đơn vị khác và để lại audit cross_unit_read', async () => {
    await as(U.dyc);
    const res = await get(`/api/ops-logs/${logId}`);
    assert.equal(res.status, 200);
    assert.equal(res.json.can_edit, false);
    const [audits] = await pool.execute(
      "SELECT actor_id, action, target_type, target_id, owner_unit_id FROM audit_logs WHERE action = 'cross_unit_read' AND target_type = 'ops_log' AND target_id = ?",
      [String(logId)]
    );
    assert.equal(audits.length >= 1, true);
    assert.equal(audits[0].actor_id, U.dyc.id);
    assert.equal(audits[0].owner_unit_id, tcktId);
  });

  it('DYC không sửa được nhật ký đơn vị khác (404), và không ghi audit khi đọc nhật ký của chính đơn vị DYC', async () => {
    await as(U.dyc);
    assert.equal((await patch(`/api/ops-logs/${logId}`, { title: 'DYC sửa' })).status, 404);
    const [[beforeRow]] = await pool.execute("SELECT COUNT(*) n FROM audit_logs WHERE action = 'cross_unit_read' AND target_type = 'ops_log'");
    const own = await post('/api/ops-logs', sample());
    assert.equal(own.status, 201);
    assert.equal((await get(`/api/ops-logs/${own.json.id}`)).status, 200);
    const [[afterRow]] = await pool.execute("SELECT COUNT(*) n FROM audit_logs WHERE action = 'cross_unit_read' AND target_type = 'ops_log'");
    assert.equal(afterRow.n, beforeRow.n);
  });
});
```

- [ ] **Step 2: Chạy, xác nhận hỏng** — Expected: FAIL (full_readonly/Trình/DYC vẫn 404).

- [ ] **Step 3: Thêm đọc chéo vào route**

Thêm import đầu file: `const { recordAudit } = require('../services/audit');`

Thêm hàm trong `createOpsLogRoutes` (trước `router.get('/api/ops-logs', ...)`):

```js
  /** Đơn vị xem != đơn vị sở hữu: 'platform' | 'policy' | 'submitted' | null. */
  async function foreignAccess(req, log) {
    if (req.unit.kind === 'platform_owner') return 'platform';
    const [policy] = await db.execute(
      "SELECT 1 FROM unit_visibility_policies WHERE viewer_unit_id = ? AND owner_unit_id = ? AND level = 'full_readonly'",
      [req.unit.id, log.unit_id]
    );
    if (policy.length) return 'policy';
    const [submitted] = await db.execute(
      "SELECT 1 FROM submissions WHERE source_type = 'ops_log' AND source_id = ? AND to_unit_id = ? AND withdrawn_at IS NULL LIMIT 1",
      [log.id, req.unit.id]
    );
    return submitted.length ? 'submitted' : null;
  }
```

Thay route `GET /api/ops-logs/:id`:

```js
  // GET /api/ops-logs/:id
  router.get('/api/ops-logs/:id', asyncRoute(async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return notFound(res);
    const log = await loadLog(id);
    if (!log) return notFound(res);
    const own = Number(log.unit_id) === Number(req.unit.id);
    if (!own) {
      const access = await foreignAccess(req, log);
      if (!access) return notFound(res);
      if (access === 'platform') {
        // INV-AUDIT-001: DYC đọc dữ liệu đơn vị khác phải có audit
        await recordAudit(db, {
          actorId: req.actor.id,
          actorUnitId: req.unit.id,
          action: 'cross_unit_read',
          targetType: 'ops_log',
          targetId: id,
          ownerUnitId: log.unit_id
        });
      }
    }
    res.json(await buildDetail(log, req, own));
  }));
```

- [ ] **Step 4: Chạy lại toàn bộ file** `tests/ops-logs.test.js` — Expected: PASS.

- [ ] **Step 5: Kiểm tra rò rỉ (INV-LEAK-001)** — `units.leak.test.js` tự quét `router.get(...)` trong `core/src/routes/*.js`, nên `/api/ops-logs` và `/api/ops-logs/1` tự được kiểm: VPĐ phải 403, DYC không 403 (DYC nhận 200/404). Chạy:

`cd core && node --test --test-concurrency=1 tests/units.leak.test.js tests/units.modules.test.js tests/ops-logs.test.js tests/directives.test.js`
Expected: PASS. Không có MySQL local: bước 6.

- [ ] **Step 6: Commit rồi push một lần để CI chạy cả bộ test Core**

```bash
git add core/src/routes/ops-logs.js core/tests/ops-logs.test.js
git commit -m "feat(core): đọc chéo đơn vị nhật ký trực ban theo chính sách/Trình, audit DYC"
git push -u origin feature/web-dot-6-nhat-ky-truc-ban
```
Xem CI job `test-core`; sửa tới khi xanh (gom các lỗi đỏ vào một lần push). Phần web (Task 7 trở đi) làm tiếp trong lúc chờ.

---

### Task 7: Web nền — kiểu, API, query key, quyền, nhãn, test util

**Files:**
- Modify: `web/src/core/api/types.ts` (`SessionUnit`, `SessionMembership`), `web/src/core/api/index.ts`, `web/src/core/queryKeys.ts`, `web/src/core/capabilities.ts`, `web/src/core/capabilities.test.tsx`
- Create: `web/src/core/api/opsLogs.ts`, `web/src/core/features/ops-logs/opsLogLabels.ts`, `web/src/core/features/ops-logs/opsLogLabels.test.ts`, `web/src/core/features/ops-logs/testUtils.tsx`

**Interfaces:**
- Produces:
  - Kiểu: `OpsLogType`, `AttendanceStatus`, `AttendanceCounts`, `OpsLogSummary`, `OpsLogDetail`, `OpsLogAttendanceRow`, `OpsLogSubmission`, `OpsLogPayload`, `OpsLogFilterParams`, `UnitMember`.
  - Hàm: `fetchOpsLogs(params?)`, `fetchOpsLog(id)`, `createOpsLog(payload)`, `updateOpsLog(id, payload)`, `fetchUnitMembers(unitId)`.
  - `OPS_LOGS_KEY`, `opsLogDetailKey(id)`.
  - `Capabilities` thêm `modules: string[]`, `hasDieuHanh: boolean`, `canWriteOpsLog: boolean`.
  - `opsLogLabels`: `OPS_LOG_TYPE_LABELS`, `ATTENDANCE_LABELS`, `ATTENDANCE_STATUSES`, `formatOpsDateTime(v)`, `toDateTimeInput(v)`, `summarizeCounts(counts)`.
  - Test util: `renderOps(ui, opts)`, `Probe`.

- [ ] **Step 1: Viết test hỏng**

```ts
// web/src/core/features/ops-logs/opsLogLabels.test.ts
import { describe, it, expect } from 'vitest';
import { ATTENDANCE_LABELS, OPS_LOG_TYPE_LABELS, formatOpsDateTime, summarizeCounts, toDateTimeInput } from './opsLogLabels';

describe('opsLogLabels', () => {
  it('nhãn tiếng Việt cho loại và trạng thái điểm danh', () => {
    expect(OPS_LOG_TYPE_LABELS.duty_shift).toBe('Trực ban');
    expect(OPS_LOG_TYPE_LABELS.meeting).toBe('Họp ban');
    expect(ATTENDANCE_LABELS.present).toBe('Có mặt');
    expect(ATTENDANCE_LABELS.absent).toBe('Vắng không phép');
  });

  it('formatOpsDateTime cắt chuỗi giờ Việt Nam, không đi qua Date/UTC', () => {
    expect(formatOpsDateTime('2026-10-07T18:05:00')).toBe('18:05 07/10/2026');
    expect(formatOpsDateTime('2026-10-07T00:30:00')).toBe('00:30 07/10/2026');
    expect(formatOpsDateTime(null)).toBe('');
    expect(formatOpsDateTime('rác')).toBe('');
  });

  it('toDateTimeInput cho ô datetime-local', () => {
    expect(toDateTimeInput('2026-10-07T18:05:00')).toBe('2026-10-07T18:05');
    expect(toDateTimeInput(null)).toBe('');
  });

  it('summarizeCounts bỏ số 0, nhưng luôn nói rõ khi chưa điểm danh', () => {
    expect(summarizeCounts({ present: 5, late: 1, absent_excused: 0, absent: 2 })).toBe('Có mặt 5 · Đến muộn 1 · Vắng không phép 2');
    expect(summarizeCounts({ present: 0, late: 0, absent_excused: 0, absent: 0 })).toBe('Chưa điểm danh');
  });
});
```

Thêm vào `web/src/core/capabilities.test.tsx`, trong `describe('deriveCapabilities', ...)`:

```tsx
  it('hasDieuHanh theo modules của đơn vị hiện tại; DYC luôn có', () => {
    const withModules = (kind: string, modules?: string[]): SessionData => ({
      user: { id: 1, name: 'A', email: 'a@hust.edu.vn', role: 'member' },
      units: {
        current: { id: 2, code: 'U', name: 'U', kind, modules },
        memberships: [{ unit_id: 2, code: 'U', name: 'U', kind, role: 'leader', modules }],
      },
    });
    expect(deriveCapabilities(withModules('department', ['dieu-hanh', 'ctd']), bootstrap()).hasDieuHanh).toBe(true);
    expect(deriveCapabilities(withModules('office', ['ctd']), bootstrap()).hasDieuHanh).toBe(false);
    expect(deriveCapabilities(withModules('office', undefined), bootstrap()).hasDieuHanh).toBe(false);
    expect(deriveCapabilities(withModules('platform_owner', []), bootstrap()).hasDieuHanh).toBe(true);
    expect(deriveCapabilities(undefined, undefined).hasDieuHanh).toBe(false);
  });

  it('canWriteOpsLog: leader trở lên ở đơn vị có Điều hành; member, officer hoặc thiếu module thì không', () => {
    const at = (role: string, kind = 'department', modules: string[] = ['dieu-hanh']): SessionData => ({
      user: { id: 1, name: 'A', email: 'a@hust.edu.vn', role: 'member' },
      units: {
        current: { id: 2, code: 'U', name: 'U', kind, modules },
        memberships: [{ unit_id: 2, code: 'U', name: 'U', kind, role, modules }],
      },
    });
    for (const role of ['leader', 'vice_leader', 'admin', 'vice_admin']) {
      expect(deriveCapabilities(at(role), bootstrap()).canWriteOpsLog).toBe(true);
    }
    expect(deriveCapabilities(at('btv_member', 'standing_committee'), bootstrap()).canWriteOpsLog).toBe(true);
    expect(deriveCapabilities(at('dyc_admin', 'platform_owner', []), bootstrap()).canWriteOpsLog).toBe(true);
    expect(deriveCapabilities(at('member'), bootstrap()).canWriteOpsLog).toBe(false);
    expect(deriveCapabilities(at('leader', 'department', ['ctd']), bootstrap()).canWriteOpsLog).toBe(false);
    expect(deriveCapabilities(at('officer', 'office', ['dieu-hanh']), bootstrap()).canWriteOpsLog).toBe(false);
  });
```

- [ ] **Step 2: Chạy, xác nhận hỏng**

Run: `cd web && npx vitest run src/core/features/ops-logs/opsLogLabels.test.ts src/core/capabilities.test.tsx`
Expected: FAIL (không tìm thấy `./opsLogLabels`; `hasDieuHanh` undefined).

- [ ] **Step 3: Sửa kiểu session** — `web/src/core/api/types.ts`:

```ts
export interface SessionUnit {
  id: number;
  code: string;
  name: string;
  kind: string;
  /** Module đang bật cho đơn vị (Core điền từ unit_modules), ví dụ `['dieu-hanh', 'ctd']`. */
  modules?: string[];
}

/** Phần tử `units.memberships` do `sessionView` trả về (core/src/middleware/unit-context.js). */
export interface SessionMembership {
  unit_id: number;
  code: string;
  name: string;
  kind: string;
  role: string;
  modules?: string[];
}
```
(thay hai khai báo hiện có, giữ nguyên phần còn lại của file.)

- [ ] **Step 4: Quyền** — `web/src/core/capabilities.ts`. Thêm hằng và trường:

```ts
const OPS_LOG_WRITE_ROLES = ['leader', 'vice_leader', 'admin', 'vice_admin', 'btv_lead', 'btv_member'];
```
Trong `interface Capabilities` thêm:
```ts
  /** Module bật cho đơn vị hiện tại. */
  modules: string[];
  /** Đơn vị hiện tại có module Điều hành (hoặc là DYC, kind `platform_owner`). Server là nơi chặn cuối. */
  hasDieuHanh: boolean;
  /** Được ghi nhật ký trực ban (`POST /api/ops-logs`): vai trò `leader` trở lên, BTV, DYC. */
  canWriteOpsLog: boolean;
```
Trong `deriveCapabilities`, sau dòng tính `unitRole`:
```ts
  const membership = unit ? memberships.find((m) => m.unit_id === unit.id) : undefined;
  const modules = membership?.modules ?? unit?.modules ?? [];
  const isPlatformOwner = unit?.kind === 'platform_owner';
  const hasDieuHanh = isPlatformOwner || modules.includes('dieu-hanh');
  const canWriteOpsLog = hasDieuHanh && (isPlatformOwner || (unitRole !== null && OPS_LOG_WRITE_ROLES.includes(unitRole)));
```
(đổi dòng `const unitRole = ...` để dùng `membership?.role ?? null`), rồi trong đối tượng trả về thêm `modules, hasDieuHanh, canWriteOpsLog,`.

- [ ] **Step 5: Query key** — thêm vào `web/src/core/queryKeys.ts`:

```ts
export const OPS_LOGS_KEY = ['core-ops-logs'] as const;
export const opsLogDetailKey = (id: number) => [...OPS_LOGS_KEY, 'detail', id] as const;
```

- [ ] **Step 6: API**

```ts
// web/src/core/api/opsLogs.ts
import { apiClient } from '../../shared/utils/api';

export type OpsLogType = 'duty_shift' | 'meeting' | 'other';
export type AttendanceStatus = 'present' | 'late' | 'absent_excused' | 'absent';

export interface AttendanceCounts {
  present: number;
  late: number;
  absent_excused: number;
  absent: number;
}

/** Giờ là giờ Việt Nam dạng `YYYY-MM-DDTHH:mm:ss`, KHÔNG có múi giờ (xem core/src/routes/ops-logs.js). */
export interface OpsLogSummary {
  id: number;
  unit_id: number;
  unit_name: string;
  type: OpsLogType;
  title: string;
  started_at: string;
  ended_at: string | null;
  location: string | null;
  recorded_by: number | null;
  recorded_by_name: string | null;
  created_at: string;
  counts: AttendanceCounts;
  attendance_total: number;
}

export interface OpsLogAttendanceRow {
  user_id: number;
  name: string;
  status: AttendanceStatus;
  note: string | null;
}

export interface OpsLogSubmission {
  id: number;
  to_unit_id: number;
  to_unit_name: string;
  response: 'seen' | 'revision_requested' | 'accepted' | null;
  response_note: string | null;
  created_at: string;
  withdrawn_at: string | null;
}

export interface OpsLogDetail extends OpsLogSummary {
  content: string | null;
  attendance: OpsLogAttendanceRow[];
  submissions: OpsLogSubmission[];
  is_own_unit: boolean;
  can_edit: boolean;
}

export interface OpsLogPayload {
  type: OpsLogType;
  title: string;
  started_at: string;
  ended_at?: string | null;
  location?: string | null;
  content?: string | null;
  attendance: { user_id: number; status: AttendanceStatus; note?: string }[];
}

export interface OpsLogFilterParams {
  type?: OpsLogType | '';
  from?: string;
  to?: string;
}

export interface UnitMember {
  user_id: number;
  name: string;
  email: string;
  role: string;
}

/** Endpoint: GET /api/ops-logs */
export async function fetchOpsLogs(params?: OpsLogFilterParams): Promise<OpsLogSummary[]> {
  const response = await apiClient.get<{ data: OpsLogSummary[] }>('/ops-logs', { params });
  return response.data.data;
}

/** Endpoint: GET /api/ops-logs/:id */
export async function fetchOpsLog(id: number): Promise<OpsLogDetail> {
  const response = await apiClient.get<OpsLogDetail>(`/ops-logs/${id}`);
  return response.data;
}

/** Endpoint: POST /api/ops-logs */
export async function createOpsLog(payload: OpsLogPayload): Promise<OpsLogDetail> {
  const response = await apiClient.post<OpsLogDetail>('/ops-logs', payload);
  return response.data;
}

/** Endpoint: PATCH /api/ops-logs/:id (có `attendance` thì thay toàn bộ danh sách) */
export async function updateOpsLog(id: number, payload: Partial<OpsLogPayload>): Promise<OpsLogDetail> {
  const response = await apiClient.patch<OpsLogDetail>(`/ops-logs/${id}`, payload);
  return response.data;
}

/** Thành viên của một đơn vị (để chọn người điểm danh). Endpoint: GET /api/units/:id/members */
export async function fetchUnitMembers(unitId: number): Promise<UnitMember[]> {
  const response = await apiClient.get<UnitMember[]>(`/units/${unitId}/members`);
  return response.data;
}
```
Thêm `export * from './opsLogs';` vào `web/src/core/api/index.ts`.

- [ ] **Step 7: Nhãn và định dạng giờ**

```ts
// web/src/core/features/ops-logs/opsLogLabels.ts
import type { AttendanceCounts, AttendanceStatus, OpsLogType } from '../../api';

export const OPS_LOG_TYPE_LABELS: Record<OpsLogType, string> = {
  duty_shift: 'Trực ban',
  meeting: 'Họp ban',
  other: 'Khác',
};

export const ATTENDANCE_LABELS: Record<AttendanceStatus, string> = {
  present: 'Có mặt',
  late: 'Đến muộn',
  absent_excused: 'Vắng có phép',
  absent: 'Vắng không phép',
};

export const ATTENDANCE_STATUSES: AttendanceStatus[] = ['present', 'late', 'absent_excused', 'absent'];

const NAIVE_DATETIME = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/;

/**
 * Core trả giờ Việt Nam không múi giờ (`YYYY-MM-DDTHH:mm:ss`). Cắt chuỗi, KHÔNG dùng `new Date()`
 * để không bị lệch múi giờ (bất biến #7, docs/ai/bat-bien.md).
 */
export function formatOpsDateTime(value?: string | null): string {
  const match = value ? NAIVE_DATETIME.exec(value) : null;
  return match ? `${match[4]}:${match[5]} ${match[3]}/${match[2]}/${match[1]}` : '';
}

/** Giá trị cho ô `datetime-local` (`YYYY-MM-DDTHH:mm`). */
export function toDateTimeInput(value?: string | null): string {
  const match = value ? NAIVE_DATETIME.exec(value) : null;
  return match ? `${match[1]}-${match[2]}-${match[3]}T${match[4]}:${match[5]}` : '';
}

export function summarizeCounts(counts: AttendanceCounts): string {
  const parts = ATTENDANCE_STATUSES.filter((status) => counts[status] > 0).map((status) => `${ATTENDANCE_LABELS[status]} ${counts[status]}`);
  return parts.length ? parts.join(' · ') : 'Chưa điểm danh';
}
```

- [ ] **Step 8: Hàm dựng test dùng chung**

```tsx
// web/src/core/features/ops-logs/testUtils.tsx
import React from 'react';
import { render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { ToastProvider } from '../../../shared/components/Toast';
import { BOOTSTRAP_KEY, SESSION_KEY } from '../../queryKeys';

export const Probe = () => <div data-testid="path">{useLocation().pathname}</div>;

export interface RenderOpts {
  unitRole?: string;
  kind?: string;
  modules?: string[];
  path?: string;
  /** Mẫu route của màn đang test, ví dụ '/ops-log/:id'. */
  route?: string;
}

/** Dựng màn với phiên đã đăng nhập ở đơn vị id=1; mọi đường dẫn khác hiện `Probe` để kiểm điều hướng. */
export function renderOps(ui: React.ReactElement, opts: RenderOpts = {}) {
  const { unitRole = 'leader', kind = 'department', modules = ['dieu-hanh'], path = '/ops-logs', route = '/ops-logs' } = opts;
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity }, mutations: { retry: false } } });
  qc.setQueryData(SESSION_KEY, {
    user: { id: 7, name: 'Người dùng', email: 'a@hust.edu.vn', role: 'member' },
    units: {
      current: { id: 1, code: 'TCKT', name: 'Ban TCKT', kind, modules },
      memberships: [{ unit_id: 1, code: 'TCKT', name: 'Ban TCKT', kind, role: unitRole, modules }],
    },
  });
  qc.setQueryData(BOOTSTRAP_KEY, {
    stats: { activeActivities: 0, openTasks: 0, overdueTasks: 0, completedMonth: 0 },
    upcoming: [], tasks: [], activity: [], teams: [],
    capabilities: { canCreateActivity: false, canCreateAccount: false },
  });
  render(
    <QueryClientProvider client={qc}>
      <ToastProvider>
        <MemoryRouter initialEntries={[path]}>
          <Routes>
            <Route path={route} element={ui} />
            <Route path="*" element={<Probe />} />
          </Routes>
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>
  );
  return qc;
}
```

- [ ] **Step 9: Chạy lại** `npx vitest run src/core/features/ops-logs src/core/capabilities.test.tsx` rồi `npx tsc --noEmit -p .` — Expected: PASS.

- [ ] **Step 10: Commit**

```bash
git add web/src/core/api web/src/core/queryKeys.ts web/src/core/capabilities.ts web/src/core/capabilities.test.tsx web/src/core/features/ops-logs
git commit -m "feat(web): nền cho nhật ký trực ban (API, quyền, nhãn, giờ Việt Nam)"
```

---

### Task 8: Danh sách nhật ký (`OpsLogsView`)

**Files:**
- Create: `web/src/core/features/ops-logs/OpsLogsView.tsx`
- Test: `web/src/core/features/ops-logs/OpsLogsView.test.tsx`

**Interfaces:**
- Consumes: `fetchOpsLogs`, `useCapabilities().canWriteOpsLog`, `OPS_LOGS_KEY`, nhãn Task 7.
- Produces: `OpsLogsView` (route `/ops-logs`): bộ lọc Loại / Từ ngày / Đến ngày, bảng, nút "Ghi nhật ký" (khi `canWriteOpsLog`) → `/ops-logs/new`, tiêu đề dẫn tới `/ops-log/:id`.

- [ ] **Step 1: Viết test hỏng**

```tsx
// web/src/core/features/ops-logs/OpsLogsView.test.tsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { OpsLogsView } from './OpsLogsView';
import { renderOps } from './testUtils';
import * as api from '../../api';

vi.mock('../../api', async () => {
  const actual = await vi.importActual<typeof import('../../api')>('../../api');
  return { ...actual, fetchOpsLogs: vi.fn() };
});

const rows: api.OpsLogSummary[] = [
  {
    id: 11, unit_id: 1, unit_name: 'Ban TCKT', type: 'meeting', title: 'Họp ban tuần 41',
    started_at: '2026-10-05T08:00:00', ended_at: null, location: 'Phòng 101',
    recorded_by: 3, recorded_by_name: 'Tổ trưởng Lan', created_at: '2026-10-05T01:00:00.000Z',
    counts: { present: 5, late: 1, absent_excused: 0, absent: 2 }, attendance_total: 8,
  },
  {
    id: 10, unit_id: 1, unit_name: 'Ban TCKT', type: 'duty_shift', title: 'Trực ban tối thứ Tư',
    started_at: '2026-10-01T18:00:00', ended_at: '2026-10-01T21:00:00', location: null,
    recorded_by: null, recorded_by_name: null, created_at: '2026-10-01T10:00:00.000Z',
    counts: { present: 0, late: 0, absent_excused: 0, absent: 0 }, attendance_total: 0,
  },
];

describe('OpsLogsView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.fetchOpsLogs).mockResolvedValue(rows);
  });
  afterEach(cleanup);

  it('hiện danh sách với giờ Việt Nam, loại, người ghi và số điểm danh', async () => {
    renderOps(<OpsLogsView />);
    expect(await screen.findByText('Họp ban tuần 41')).toBeDefined();
    expect(screen.getByText('08:00 05/10/2026')).toBeDefined();
    expect(screen.getByText('Tổ trưởng Lan')).toBeDefined();
    expect(screen.getByText('Có mặt 5 · Đến muộn 1 · Vắng không phép 2')).toBeDefined();
    expect(screen.getByText('Chưa điểm danh')).toBeDefined();
    expect(screen.getByRole('link', { name: 'Trực ban tối thứ Tư' }).getAttribute('href')).toBe('/ops-log/10');
  });

  it('đổi bộ lọc gọi lại API với đúng tham số', async () => {
    renderOps(<OpsLogsView />);
    await screen.findByText('Họp ban tuần 41');
    fireEvent.change(screen.getByLabelText('Loại'), { target: { value: 'meeting' } });
    await waitFor(() => expect(api.fetchOpsLogs).toHaveBeenLastCalledWith(expect.objectContaining({ type: 'meeting' })));
    fireEvent.change(screen.getByLabelText('Từ ngày'), { target: { value: '2026-10-01' } });
    fireEvent.change(screen.getByLabelText('Đến ngày'), { target: { value: '2026-10-07' } });
    await waitFor(() =>
      expect(api.fetchOpsLogs).toHaveBeenLastCalledWith(expect.objectContaining({ type: 'meeting', from: '2026-10-01', to: '2026-10-07' }))
    );
  });

  it('khoảng ngày ngược thì báo lỗi và không gọi API với khoảng đó', async () => {
    renderOps(<OpsLogsView />);
    await screen.findByText('Họp ban tuần 41');
    vi.mocked(api.fetchOpsLogs).mockClear();
    fireEvent.change(screen.getByLabelText('Từ ngày'), { target: { value: '2026-10-09' } });
    fireEvent.change(screen.getByLabelText('Đến ngày'), { target: { value: '2026-10-01' } });
    expect(await screen.findByText('Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.')).toBeDefined();
    expect(api.fetchOpsLogs).not.toHaveBeenCalledWith(expect.objectContaining({ from: '2026-10-09', to: '2026-10-01' }));
  });

  it('danh sách trống thì có thông báo', async () => {
    vi.mocked(api.fetchOpsLogs).mockResolvedValue([]);
    renderOps(<OpsLogsView />);
    expect(await screen.findByText('Chưa có nhật ký nào.')).toBeDefined();
  });

  it('lỗi server hiện bằng tiếng Việt', async () => {
    vi.mocked(api.fetchOpsLogs).mockRejectedValue({ response: { status: 403, data: { error: 'Đơn vị hiện tại chưa bật chức năng Điều hành.' } } });
    renderOps(<OpsLogsView />);
    expect(await screen.findByText('Đơn vị hiện tại chưa bật chức năng Điều hành.')).toBeDefined();
  });

  it('leader thấy nút Ghi nhật ký và bấm sang trang tạo; member không thấy', async () => {
    renderOps(<OpsLogsView />, { unitRole: 'leader' });
    await screen.findByText('Họp ban tuần 41');
    fireEvent.click(screen.getByRole('button', { name: 'Ghi nhật ký' }));
    expect((await screen.findByTestId('path')).textContent).toBe('/ops-logs/new');
    cleanup();

    renderOps(<OpsLogsView />, { unitRole: 'member' });
    await screen.findByText('Họp ban tuần 41');
    expect(screen.queryByRole('button', { name: 'Ghi nhật ký' })).toBeNull();
  });
});
```

- [ ] **Step 2: Chạy, xác nhận hỏng** — `npx vitest run src/core/features/ops-logs/OpsLogsView.test.tsx` → FAIL (không có `./OpsLogsView`).

- [ ] **Step 3: Viết màn**

```tsx
// web/src/core/features/ops-logs/OpsLogsView.tsx
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import Button from '@atlaskit/button/new';
import Lozenge from '@atlaskit/lozenge';
import { token } from '@atlaskit/tokens';
import { apiErrorMessage, fetchOpsLogs, type OpsLogType } from '../../api';
import { useCapabilities } from '../../capabilities';
import { OPS_LOGS_KEY } from '../../queryKeys';
import { LottieLoading } from '../../../shared/components/LottieLoading';
import { OPS_LOG_TYPE_LABELS, formatOpsDateTime, summarizeCounts } from './opsLogLabels';

const fieldStyle: React.CSSProperties = {
  padding: '6px 8px',
  borderRadius: 4,
  border: `1px solid ${token('color.border', '#DFE1E6')}`,
  background: token('elevation.surface', '#fff'),
  color: token('color.text', '#172B4D'),
};

export const OpsLogsView: React.FC = () => {
  const navigate = useNavigate();
  const caps = useCapabilities();
  const [type, setType] = useState<OpsLogType | ''>('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const invalidRange = Boolean(from && to && from > to);

  const params = { type: type || undefined, from: from || undefined, to: to || undefined };
  const { data, isLoading, error } = useQuery({
    queryKey: [...OPS_LOGS_KEY, 'list', params],
    queryFn: () => fetchOpsLogs(params),
    enabled: !invalidRange,
    placeholderData: keepPreviousData,
  });

  const logs = data ?? [];

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 600, color: token('color.text', '#172B4D') }}>Nhật ký trực ban</h1>
          <p style={{ margin: '6px 0 0', fontSize: 14, color: token('color.text.subtle', '#5E6C84') }}>
            Ghi lại các buổi trực ban, họp ban và điểm danh từng người.
          </p>
        </div>
        {caps.canWriteOpsLog && (
          <Button appearance="primary" onClick={() => navigate('/ops-logs/new')}>Ghi nhật ký</Button>
        )}
      </div>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: 16 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label htmlFor="ops-filter-type">Loại</label>
          <select id="ops-filter-type" style={fieldStyle} value={type} onChange={(e) => setType(e.target.value as OpsLogType | '')}>
            <option value="">Tất cả</option>
            {(Object.keys(OPS_LOG_TYPE_LABELS) as OpsLogType[]).map((key) => (
              <option key={key} value={key}>{OPS_LOG_TYPE_LABELS[key]}</option>
            ))}
          </select>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label htmlFor="ops-filter-from">Từ ngày</label>
          <input id="ops-filter-from" type="date" style={fieldStyle} value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label htmlFor="ops-filter-to">Đến ngày</label>
          <input id="ops-filter-to" type="date" style={fieldStyle} value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
      </div>

      {invalidRange && <p role="alert" style={{ color: token('color.text.danger', '#AE2E24') }}>Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.</p>}
      {error && <p role="alert" style={{ color: token('color.text.danger', '#AE2E24') }}>{apiErrorMessage(error, 'Không tải được nhật ký trực ban.')}</p>}
      {isLoading && !data && <LottieLoading message="Đang tải nhật ký..." size={120} />}

      {!isLoading && !error && !invalidRange && logs.length === 0 && <p>Chưa có nhật ký nào.</p>}

      {logs.length > 0 && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: `2px solid ${token('color.border', '#DFE1E6')}` }}>
                <th style={{ padding: 8 }}>Thời gian</th>
                <th style={{ padding: 8 }}>Loại</th>
                <th style={{ padding: 8 }}>Tiêu đề</th>
                <th style={{ padding: 8 }}>Địa điểm</th>
                <th style={{ padding: 8 }}>Người ghi</th>
                <th style={{ padding: 8 }}>Điểm danh</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} style={{ borderBottom: `1px solid ${token('color.border', '#DFE1E6')}` }}>
                  <td style={{ padding: 8, whiteSpace: 'nowrap' }}>{formatOpsDateTime(log.started_at)}</td>
                  <td style={{ padding: 8 }}><Lozenge>{OPS_LOG_TYPE_LABELS[log.type]}</Lozenge></td>
                  <td style={{ padding: 8 }}><Link to={`/ops-log/${log.id}`}>{log.title}</Link></td>
                  <td style={{ padding: 8 }}>{log.location ?? ''}</td>
                  <td style={{ padding: 8 }}>{log.recorded_by_name ?? ''}</td>
                  <td style={{ padding: 8 }}>{summarizeCounts(log.counts)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
```

- [ ] **Step 4: Chạy lại** test + `npx tsc --noEmit -p .` — Expected: PASS. (Nếu `LottieLoading` cần props khác, đọc `web/src/shared/components/LottieLoading.tsx` và dùng đúng chữ ký; `DocumentsView.tsx` là ví dụ dùng.)

- [ ] **Step 5: Commit**

```bash
git add web/src/core/features/ops-logs/OpsLogsView.tsx web/src/core/features/ops-logs/OpsLogsView.test.tsx
git commit -m "feat(web): danh sách nhật ký trực ban có bộ lọc"
```

---

### Task 9: Chi tiết nhật ký, nút Sửa và nút Trình

**Files:**
- Create: `web/src/core/features/ops-logs/submitAdapter.tsx`, `web/src/core/features/ops-logs/OpsLogDetailView.tsx`
- Test: `web/src/core/features/ops-logs/OpsLogDetailView.test.tsx`

**Interfaces:**
- Consumes: `fetchOpsLog`, `opsLogDetailKey`, `SubmitDialog` (đợt 5, xem "Interface giả định").
- Produces:
  - `submitAdapter.tsx`: `OPS_LOG_SUBMIT_ROLES`, `canSubmitOpsLog(unitRole: string | null): boolean`, `OpsLogSubmitDialog` (props `{ isOpen, opsLogId, title, onClose, onSubmitted }`).
  - `OpsLogDetailView` (route `/ops-log/:id`).

- [ ] **Step 1: Viết test hỏng**

```tsx
// web/src/core/features/ops-logs/OpsLogDetailView.test.tsx
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { OpsLogDetailView } from './OpsLogDetailView';
import { canSubmitOpsLog } from './submitAdapter';
import { renderOps } from './testUtils';
import * as api from '../../api';

vi.mock('../../api', async () => {
  const actual = await vi.importActual<typeof import('../../api')>('../../api');
  return { ...actual, fetchOpsLog: vi.fn() };
});

// Hộp Trình thật thuộc đợt 5; ở đây chỉ kiểm cách đợt 6 gọi nó.
vi.mock('../submissions/SubmitDialog', () => ({
  SubmitDialog: (props: { isOpen: boolean; sourceType: string; sourceId: number; sourceTitle: string; onClose: () => void; onSubmitted?: () => void }) =>
    props.isOpen ? (
      <div role="dialog">
        hộp-trình {props.sourceType}:{props.sourceId}:{props.sourceTitle}
        <button type="button" onClick={props.onSubmitted}>giả-lập-trình-xong</button>
      </div>
    ) : null,
}));

const detail = (over: Partial<api.OpsLogDetail> = {}): api.OpsLogDetail => ({
  id: 7, unit_id: 1, unit_name: 'Ban TCKT', type: 'duty_shift', title: 'Trực ban tối thứ Tư',
  started_at: '2026-10-07T18:00:00', ended_at: '2026-10-07T21:00:00', location: 'Phòng 101',
  content: 'Không có sự cố.', recorded_by: 3, recorded_by_name: 'Tổ trưởng Lan', created_at: '2026-10-07T10:00:00.000Z',
  counts: { present: 1, late: 0, absent_excused: 0, absent: 1 }, attendance_total: 2,
  attendance: [
    { user_id: 11, name: 'Thành viên An', status: 'present', note: null },
    { user_id: 12, name: 'Thành viên Bình', status: 'absent', note: 'Không báo' },
  ],
  submissions: [], is_own_unit: true, can_edit: true,
  ...over,
});

const at = { path: '/ops-log/7', route: '/ops-log/:id' };

describe('OpsLogDetailView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.fetchOpsLog).mockResolvedValue(detail());
  });
  afterEach(cleanup);

  it('hiện thông tin, giờ Việt Nam và bảng điểm danh', async () => {
    renderOps(<OpsLogDetailView />, { ...at, unitRole: 'leader' });
    expect(await screen.findByRole('heading', { name: 'Trực ban tối thứ Tư' })).toBeDefined();
    expect(api.fetchOpsLog).toHaveBeenCalledWith(7);
    expect(screen.getByText('18:00 07/10/2026 – 21:00 07/10/2026')).toBeDefined();
    expect(screen.getByText('Phòng 101')).toBeDefined();
    expect(screen.getByText('Không có sự cố.')).toBeDefined();
    expect(screen.getByText('Thành viên Bình')).toBeDefined();
    expect(screen.getByText('Vắng không phép')).toBeDefined();
    expect(screen.getByText('Không báo')).toBeDefined();
    expect(screen.getByText('Có mặt 1 · Vắng không phép 1')).toBeDefined();
  });

  it('can_edit và có quyền ghi thì có nút Sửa → /ops-log/7/edit; không can_edit thì không có', async () => {
    renderOps(<OpsLogDetailView />, { ...at, unitRole: 'leader' });
    fireEvent.click(await screen.findByRole('button', { name: 'Sửa' }));
    expect((await screen.findByTestId('path')).textContent).toBe('/ops-log/7/edit');
    cleanup();

    vi.mocked(api.fetchOpsLog).mockResolvedValue(detail({ can_edit: false }));
    renderOps(<OpsLogDetailView />, { ...at, unitRole: 'leader' });
    await screen.findByRole('heading', { name: 'Trực ban tối thứ Tư' });
    expect(screen.queryByRole('button', { name: 'Sửa' })).toBeNull();
  });

  it('nút Trình: chỉ admin/vice_admin/BTV thấy; leader không thấy (server từ chối)', async () => {
    renderOps(<OpsLogDetailView />, { ...at, unitRole: 'admin' });
    await screen.findByRole('heading', { name: 'Trực ban tối thứ Tư' });
    expect(screen.getByRole('button', { name: 'Trình' })).toBeDefined();
    cleanup();

    renderOps(<OpsLogDetailView />, { ...at, unitRole: 'leader' });
    await screen.findByRole('heading', { name: 'Trực ban tối thứ Tư' });
    expect(screen.queryByRole('button', { name: 'Trình' })).toBeNull();

    expect(canSubmitOpsLog('admin')).toBe(true);
    expect(canSubmitOpsLog('vice_admin')).toBe(true);
    expect(canSubmitOpsLog('btv_lead')).toBe(true);
    expect(canSubmitOpsLog('btv_member')).toBe(true);
    for (const role of ['leader', 'vice_leader', 'member', 'officer', 'dyc_admin', null]) {
      expect(canSubmitOpsLog(role)).toBe(false);
    }
  });

  it('bấm Trình mở hộp với source_type ops_log; trình xong thì tải lại chi tiết', async () => {
    renderOps(<OpsLogDetailView />, { ...at, unitRole: 'admin' });
    fireEvent.click(await screen.findByRole('button', { name: 'Trình' }));
    expect(await screen.findByText(/hộp-trình ops_log:7:Trực ban tối thứ Tư/)).toBeDefined();
    expect(api.fetchOpsLog).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'giả-lập-trình-xong' }));
    await waitFor(() => expect(api.fetchOpsLog).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('nhật ký đơn vị khác (xem theo chính sách/Trình): có nhãn chỉ xem, không Sửa, không Trình', async () => {
    vi.mocked(api.fetchOpsLog).mockResolvedValue(detail({ is_own_unit: false, can_edit: false, unit_name: 'Ban Thường vụ' }));
    renderOps(<OpsLogDetailView />, { ...at, unitRole: 'admin' });
    expect(await screen.findByText('Nhật ký của Ban Thường vụ (chỉ xem).')).toBeDefined();
    expect(screen.queryByRole('button', { name: 'Sửa' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Trình' })).toBeNull();
  });

  it('liệt kê nơi đã Trình và trạng thái', async () => {
    vi.mocked(api.fetchOpsLog).mockResolvedValue(detail({
      submissions: [
        { id: 1, to_unit_id: 2, to_unit_name: 'Ban Thường vụ', response: 'accepted', response_note: null, created_at: '2026-10-08T01:00:00.000Z', withdrawn_at: null },
        { id: 2, to_unit_id: 3, to_unit_name: 'Văn phòng Đoàn', response: null, response_note: null, created_at: '2026-10-08T02:00:00.000Z', withdrawn_at: '2026-10-08T03:00:00.000Z' },
      ],
    }));
    renderOps(<OpsLogDetailView />, { ...at, unitRole: 'admin' });
    expect(await screen.findByText('Ban Thường vụ — Đã chấp nhận')).toBeDefined();
    expect(screen.getByText('Văn phòng Đoàn — Đã rút lại')).toBeDefined();
  });

  it('lỗi 404 hiện thông điệp tiếng Việt', async () => {
    vi.mocked(api.fetchOpsLog).mockRejectedValue({ response: { status: 404, data: { error: 'Không tìm thấy nhật ký.' } } });
    renderOps(<OpsLogDetailView />, { ...at });
    expect(await screen.findByText('Không tìm thấy nhật ký.')).toBeDefined();
  });
});
```

- [ ] **Step 2: Chạy, xác nhận hỏng** — FAIL (không có `./OpsLogDetailView`).

- [ ] **Step 3: Adapter với đợt 5** (chỗ duy nhất đụng `SubmitDialog`)

```tsx
// web/src/core/features/ops-logs/submitAdapter.tsx
import React from 'react';
import { SubmitDialog } from '../submissions/SubmitDialog';

/**
 * Vai trò được Trình, chép từ core/src/routes/submissions.js (POST /api/submissions):
 * chỉ cán bộ quản trị TCKT (admin, vice_admin) và BTV. Leader ghi được nhật ký nhưng KHÔNG Trình được.
 */
export const OPS_LOG_SUBMIT_ROLES = ['admin', 'vice_admin', 'btv_lead', 'btv_member'];

export function canSubmitOpsLog(unitRole: string | null): boolean {
  return unitRole !== null && OPS_LOG_SUBMIT_ROLES.includes(unitRole);
}

export interface OpsLogSubmitDialogProps {
  isOpen: boolean;
  opsLogId: number;
  title: string;
  onClose: () => void;
  onSubmitted: () => void;
}

/** Nối với hộp "Trình" của đợt 5 (SPEC-WEB-003 mục 4.7) với `source_type='ops_log'`. */
export const OpsLogSubmitDialog: React.FC<OpsLogSubmitDialogProps> = ({ isOpen, opsLogId, title, onClose, onSubmitted }) => (
  <SubmitDialog isOpen={isOpen} sourceType="ops_log" sourceId={opsLogId} sourceTitle={title} onClose={onClose} onSubmitted={onSubmitted} />
);
```

- [ ] **Step 4: Màn chi tiết**

```tsx
// web/src/core/features/ops-logs/OpsLogDetailView.tsx
import React, { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Button from '@atlaskit/button/new';
import Lozenge from '@atlaskit/lozenge';
import { token } from '@atlaskit/tokens';
import { apiErrorMessage, fetchOpsLog, type OpsLogSubmission } from '../../api';
import { useCapabilities } from '../../capabilities';
import { OPS_LOGS_KEY, opsLogDetailKey } from '../../queryKeys';
import { LottieLoading } from '../../../shared/components/LottieLoading';
import { ATTENDANCE_LABELS, OPS_LOG_TYPE_LABELS, formatOpsDateTime, summarizeCounts } from './opsLogLabels';
import { OpsLogSubmitDialog, canSubmitOpsLog } from './submitAdapter';

function submissionState(submission: OpsLogSubmission): string {
  if (submission.withdrawn_at) return 'Đã rút lại';
  switch (submission.response) {
    case 'seen': return 'Đã xem';
    case 'revision_requested': return 'Yêu cầu sửa';
    case 'accepted': return 'Đã chấp nhận';
    default: return 'Chờ phản hồi';
  }
}

export const OpsLogDetailView: React.FC = () => {
  const { id } = useParams();
  const logId = Number(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const caps = useCapabilities();
  const [submitOpen, setSubmitOpen] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: opsLogDetailKey(logId),
    queryFn: () => fetchOpsLog(logId),
    enabled: Number.isInteger(logId) && logId > 0,
  });

  if (error) {
    return (
      <div>
        <p role="alert" style={{ color: token('color.text.danger', '#AE2E24') }}>{apiErrorMessage(error, 'Không tải được nhật ký.')}</p>
        <Link to="/ops-logs">Về danh sách nhật ký</Link>
      </div>
    );
  }
  if (isLoading || !data) return <LottieLoading message="Đang tải nhật ký..." size={120} />;

  const timeRange = data.ended_at ? `${formatOpsDateTime(data.started_at)} – ${formatOpsDateTime(data.ended_at)}` : formatOpsDateTime(data.started_at);
  const showEdit = data.can_edit && caps.canWriteOpsLog;
  const showSubmit = data.is_own_unit && canSubmitOpsLog(caps.unitRole);

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <p style={{ margin: '0 0 8px' }}><Link to="/ops-logs">← Nhật ký trực ban</Link></p>
      {!data.is_own_unit && (
        <p style={{ padding: 8, borderRadius: 4, background: token('color.background.information', '#E9F2FF') }}>Nhật ký của {data.unit_name} (chỉ xem).</p>
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 600, color: token('color.text', '#172B4D') }}>{data.title}</h1>
          <p style={{ margin: '6px 0 0' }}><Lozenge>{OPS_LOG_TYPE_LABELS[data.type]}</Lozenge></p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {showEdit && <Button onClick={() => navigate(`/ops-log/${data.id}/edit`)}>Sửa</Button>}
          {showSubmit && <Button appearance="primary" onClick={() => setSubmitOpen(true)}>Trình</Button>}
        </div>
      </div>

      <dl style={{ display: 'grid', gridTemplateColumns: 'max-content 1fr', gap: '6px 16px', margin: '16px 0' }}>
        <dt>Thời gian</dt><dd style={{ margin: 0 }}>{timeRange}</dd>
        {data.location && (<><dt>Địa điểm</dt><dd style={{ margin: 0 }}>{data.location}</dd></>)}
        {data.recorded_by_name && (<><dt>Người ghi</dt><dd style={{ margin: 0 }}>{data.recorded_by_name}</dd></>)}
      </dl>

      {data.content && <p style={{ whiteSpace: 'pre-wrap' }}>{data.content}</p>}

      <h2 style={{ fontSize: 18, marginTop: 24 }}>Điểm danh</h2>
      <p>{summarizeCounts(data.counts)}</p>
      {data.attendance.length > 0 && (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: `2px solid ${token('color.border', '#DFE1E6')}` }}>
              <th style={{ padding: 8 }}>Họ tên</th>
              <th style={{ padding: 8 }}>Trạng thái</th>
              <th style={{ padding: 8 }}>Ghi chú</th>
            </tr>
          </thead>
          <tbody>
            {data.attendance.map((row) => (
              <tr key={row.user_id} style={{ borderBottom: `1px solid ${token('color.border', '#DFE1E6')}` }}>
                <td style={{ padding: 8 }}>{row.name}</td>
                <td style={{ padding: 8 }}>{ATTENDANCE_LABELS[row.status]}</td>
                <td style={{ padding: 8 }}>{row.note ?? ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {data.submissions.length > 0 && (
        <>
          <h2 style={{ fontSize: 18, marginTop: 24 }}>Đã trình</h2>
          <ul>
            {data.submissions.map((submission) => (
              <li key={submission.id}>{submission.to_unit_name} — {submissionState(submission)}</li>
            ))}
          </ul>
        </>
      )}

      <OpsLogSubmitDialog
        isOpen={submitOpen}
        opsLogId={data.id}
        title={data.title}
        onClose={() => setSubmitOpen(false)}
        onSubmitted={() => {
          setSubmitOpen(false);
          queryClient.invalidateQueries({ queryKey: OPS_LOGS_KEY });
        }}
      />
    </div>
  );
};
```

- [ ] **Step 5: Chạy lại** test + `npx tsc --noEmit -p .` — Expected: PASS. Nếu chữ ký `SubmitDialog` của đợt 5 khác, chỉ sửa `submitAdapter.tsx` (và `vi.mock` trong test cho khớp tên prop).

- [ ] **Step 6: Commit**

```bash
git add web/src/core/features/ops-logs/submitAdapter.tsx web/src/core/features/ops-logs/OpsLogDetailView.tsx web/src/core/features/ops-logs/OpsLogDetailView.test.tsx
git commit -m "feat(web): chi tiết nhật ký trực ban, nút Sửa và Trình"
```

---

### Task 10: Tạo/sửa nhật ký có điểm danh (`OpsLogFormView`)

**Files:**
- Create: `web/src/core/features/ops-logs/OpsLogFormView.tsx`
- Test: `web/src/core/features/ops-logs/OpsLogFormView.test.tsx`

**Interfaces:**
- Consumes: `fetchUnitMembers`, `fetchOpsLog`, `createOpsLog`, `updateOpsLog`, `PeoplePicker` (đợt 0: props `label, people, value, onChange`), `useToast`, `apiErrorMessage`.
- Produces: `OpsLogFormView` — route `/ops-logs/new` (tạo) và `/ops-log/:id/edit` (sửa, dựa vào `useParams().id`). Lưu xong chuyển `/ops-log/<id>`.

- [ ] **Step 1: Viết test hỏng**

```tsx
// web/src/core/features/ops-logs/OpsLogFormView.test.tsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { OpsLogFormView } from './OpsLogFormView';
import { renderOps } from './testUtils';
import * as api from '../../api';
import { opsLogDetailKey } from '../../queryKeys';

vi.mock('../../api', async () => {
  const actual = await vi.importActual<typeof import('../../api')>('../../api');
  return { ...actual, fetchUnitMembers: vi.fn(), fetchOpsLog: vi.fn(), createOpsLog: vi.fn(), updateOpsLog: vi.fn() };
});

const members: api.UnitMember[] = [
  { user_id: 11, name: 'Nguyễn Văn An', email: 'an@hust.edu.vn', role: 'member' },
  { user_id: 12, name: 'Đỗ Thị Bình', email: 'binh@hust.edu.vn', role: 'member' },
  { user_id: 13, name: 'Trần Cường', email: 'cuong@hust.edu.vn', role: 'leader' },
];

const saved = { id: 9 } as api.OpsLogDetail;
const create = { path: '/ops-logs/new', route: '/ops-logs/new' };

function fillBasics() {
  fireEvent.change(screen.getByLabelText('Tiêu đề'), { target: { value: 'Trực ban tối thứ Tư' } });
  fireEvent.change(screen.getByLabelText('Bắt đầu'), { target: { value: '2026-10-07T18:00' } });
}

function addPerson(query: string, optionName: RegExp) {
  fireEvent.change(screen.getByLabelText('Thành viên điểm danh'), { target: { value: query } });
  fireEvent.click(screen.getByRole('option', { name: optionName }));
}

describe('OpsLogFormView — tạo mới', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.fetchUnitMembers).mockResolvedValue(members);
    vi.mocked(api.createOpsLog).mockResolvedValue(saved);
  });
  afterEach(cleanup);

  it('tải thành viên của đơn vị hiện tại; chọn người, đặt trạng thái, lưu đúng body rồi sang trang chi tiết', async () => {
    renderOps(<OpsLogFormView />, create);
    await waitFor(() => expect(api.fetchUnitMembers).toHaveBeenCalledWith(1));
    fillBasics();
    fireEvent.change(screen.getByLabelText('Loại'), { target: { value: 'meeting' } });
    fireEvent.change(screen.getByLabelText('Địa điểm'), { target: { value: 'Phòng 101' } });
    addPerson('nguyen', /Nguyễn Văn An/);
    addPerson('do', /Đỗ Thị Bình/);
    fireEvent.change(screen.getByLabelText('Trạng thái Đỗ Thị Bình'), { target: { value: 'absent' } });
    fireEvent.change(screen.getByLabelText('Ghi chú Đỗ Thị Bình'), { target: { value: 'Không báo' } });
    expect(screen.getByText('Người vắng không phép sẽ nhận thông báo trong ứng dụng.')).toBeDefined();

    fireEvent.click(screen.getByRole('button', { name: 'Lưu nhật ký' }));
    await waitFor(() => expect(api.createOpsLog).toHaveBeenCalledTimes(1));
    expect(api.createOpsLog).toHaveBeenCalledWith({
      type: 'meeting',
      title: 'Trực ban tối thứ Tư',
      started_at: '2026-10-07T18:00',
      ended_at: null,
      location: 'Phòng 101',
      content: null,
      attendance: [
        { user_id: 11, status: 'present' },
        { user_id: 12, status: 'absent', note: 'Không báo' },
      ],
    });
    expect((await screen.findByTestId('path')).textContent).toBe('/ops-log/9');
  });

  it('"Thêm cả đơn vị" thêm mọi thành viên, mặc định Có mặt; "Có mặt tất cả" đặt lại', async () => {
    renderOps(<OpsLogFormView />, create);
    await waitFor(() => expect(api.fetchUnitMembers).toHaveBeenCalled());
    fillBasics();
    fireEvent.click(await screen.findByRole('button', { name: 'Thêm cả đơn vị' }));
    expect((screen.getByLabelText('Trạng thái Trần Cường') as HTMLSelectElement).value).toBe('present');
    fireEvent.change(screen.getByLabelText('Trạng thái Trần Cường'), { target: { value: 'late' } });
    fireEvent.click(screen.getByRole('button', { name: 'Có mặt tất cả' }));
    expect((screen.getByLabelText('Trạng thái Trần Cường') as HTMLSelectElement).value).toBe('present');
    fireEvent.click(screen.getByRole('button', { name: 'Lưu nhật ký' }));
    await waitFor(() => expect(api.createOpsLog).toHaveBeenCalled());
    expect(vi.mocked(api.createOpsLog).mock.calls[0][0].attendance).toHaveLength(3);
  });

  it('thiếu tiêu đề hoặc giờ bắt đầu, hoặc kết thúc trước bắt đầu thì báo lỗi và không gọi API', async () => {
    renderOps(<OpsLogFormView />, create);
    await waitFor(() => expect(api.fetchUnitMembers).toHaveBeenCalled());
    fireEvent.click(screen.getByRole('button', { name: 'Lưu nhật ký' }));
    expect(await screen.findByText('Vui lòng nhập tiêu đề.')).toBeDefined();

    fireEvent.change(screen.getByLabelText('Tiêu đề'), { target: { value: 'Họp' } });
    fireEvent.click(screen.getByRole('button', { name: 'Lưu nhật ký' }));
    expect(await screen.findByText('Vui lòng chọn thời điểm bắt đầu.')).toBeDefined();

    fireEvent.change(screen.getByLabelText('Bắt đầu'), { target: { value: '2026-10-07T18:00' } });
    fireEvent.change(screen.getByLabelText('Kết thúc'), { target: { value: '2026-10-07T17:00' } });
    fireEvent.click(screen.getByRole('button', { name: 'Lưu nhật ký' }));
    expect(await screen.findByText('Thời điểm kết thúc phải sau thời điểm bắt đầu.')).toBeDefined();
    expect(api.createOpsLog).not.toHaveBeenCalled();
  });

  it('lỗi server hiện toast tiếng Việt và giữ nguyên trang', async () => {
    vi.mocked(api.createOpsLog).mockRejectedValue({ response: { status: 403, data: { error: 'Bạn không có quyền ghi nhật ký trực ban.' } } });
    renderOps(<OpsLogFormView />, create);
    await waitFor(() => expect(api.fetchUnitMembers).toHaveBeenCalled());
    fillBasics();
    fireEvent.click(screen.getByRole('button', { name: 'Lưu nhật ký' }));
    expect(await screen.findByText('Bạn không có quyền ghi nhật ký trực ban.')).toBeDefined();
    expect(screen.queryByTestId('path')).toBeNull();
  });

  it('thành công thì làm mới cache nhật ký', async () => {
    const qc = renderOps(<OpsLogFormView />, create);
    qc.setQueryData(['core-ops-logs', 'list', {}], []);
    await waitFor(() => expect(api.fetchUnitMembers).toHaveBeenCalled());
    fillBasics();
    fireEvent.click(screen.getByRole('button', { name: 'Lưu nhật ký' }));
    await screen.findByTestId('path');
    expect(qc.getQueryState(['core-ops-logs', 'list', {}])?.isInvalidated).toBe(true);
  });

  it('member (không có quyền ghi) chỉ thấy thông báo, không có form', async () => {
    renderOps(<OpsLogFormView />, { ...create, unitRole: 'member' });
    expect(await screen.findByText('Bạn không có quyền ghi nhật ký trực ban.')).toBeDefined();
    expect(screen.queryByLabelText('Tiêu đề')).toBeNull();
  });
});

describe('OpsLogFormView — sửa', () => {
  const existing: api.OpsLogDetail = {
    id: 7, unit_id: 1, unit_name: 'Ban TCKT', type: 'duty_shift', title: 'Trực ban cũ',
    started_at: '2026-10-07T18:00:00', ended_at: '2026-10-07T21:00:00', location: 'Phòng 101', content: 'Ghi chú cũ',
    recorded_by: 7, recorded_by_name: 'Tôi', created_at: '2026-10-07T10:00:00.000Z',
    counts: { present: 1, late: 0, absent_excused: 0, absent: 1 }, attendance_total: 2,
    attendance: [
      { user_id: 11, name: 'Nguyễn Văn An', status: 'present', note: null },
      { user_id: 12, name: 'Đỗ Thị Bình', status: 'absent', note: 'Ốm' },
    ],
    submissions: [], is_own_unit: true, can_edit: true,
  };
  const edit = { path: '/ops-log/7/edit', route: '/ops-log/:id/edit' };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.fetchUnitMembers).mockResolvedValue(members);
    vi.mocked(api.fetchOpsLog).mockResolvedValue(existing);
    vi.mocked(api.updateOpsLog).mockResolvedValue({ ...existing });
  });
  afterEach(cleanup);

  it('điền sẵn dữ liệu cũ; sửa rồi PATCH đúng body (thay toàn bộ điểm danh) và về trang chi tiết', async () => {
    renderOps(<OpsLogFormView />, edit);
    expect(((await screen.findByLabelText('Tiêu đề')) as HTMLInputElement).value).toBe('Trực ban cũ');
    expect((screen.getByLabelText('Bắt đầu') as HTMLInputElement).value).toBe('2026-10-07T18:00');
    expect((screen.getByLabelText('Trạng thái Đỗ Thị Bình') as HTMLSelectElement).value).toBe('absent');
    expect((screen.getByLabelText('Ghi chú Đỗ Thị Bình') as HTMLInputElement).value).toBe('Ốm');

    fireEvent.change(screen.getByLabelText('Tiêu đề'), { target: { value: 'Trực ban mới' } });
    fireEvent.click(screen.getByRole('button', { name: 'Bỏ Nguyễn Văn An' }));
    fireEvent.click(screen.getByRole('button', { name: 'Lưu nhật ký' }));
    await waitFor(() => expect(api.updateOpsLog).toHaveBeenCalledTimes(1));
    expect(api.updateOpsLog).toHaveBeenCalledWith(7, {
      type: 'duty_shift',
      title: 'Trực ban mới',
      started_at: '2026-10-07T18:00',
      ended_at: '2026-10-07T21:00',
      location: 'Phòng 101',
      content: 'Ghi chú cũ',
      attendance: [{ user_id: 12, status: 'absent', note: 'Ốm' }],
    });
    expect(api.createOpsLog).not.toHaveBeenCalled();
    expect((await screen.findByTestId('path')).textContent).toBe('/ops-log/7');
  });

  it('không có quyền sửa (can_edit=false) thì không hiện form', async () => {
    vi.mocked(api.fetchOpsLog).mockResolvedValue({ ...existing, can_edit: false });
    renderOps(<OpsLogFormView />, edit);
    expect(await screen.findByText('Bạn không có quyền sửa nhật ký này.')).toBeDefined();
    expect(screen.queryByLabelText('Tiêu đề')).toBeNull();
  });
});
```

- [ ] **Step 2: Chạy, xác nhận hỏng** — FAIL (không có `./OpsLogFormView`).

- [ ] **Step 3: Viết màn**

```tsx
// web/src/core/features/ops-logs/OpsLogFormView.tsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Button from '@atlaskit/button/new';
import { token } from '@atlaskit/tokens';
import {
  apiErrorMessage, createOpsLog, fetchOpsLog, fetchUnitMembers, updateOpsLog,
  type AttendanceStatus, type OpsLogPayload, type OpsLogType,
} from '../../api';
import { useCapabilities } from '../../capabilities';
import { OPS_LOGS_KEY, opsLogDetailKey } from '../../queryKeys';
import { PeoplePicker } from '../../../shared/components/PeoplePicker';
import { useToast } from '../../../shared/components/Toast';
import { LottieLoading } from '../../../shared/components/LottieLoading';
import { ATTENDANCE_LABELS, ATTENDANCE_STATUSES, OPS_LOG_TYPE_LABELS, toDateTimeInput } from './opsLogLabels';

interface FormState {
  type: OpsLogType;
  title: string;
  startedAt: string;
  endedAt: string;
  location: string;
  content: string;
}

interface Row { user_id: number; status: AttendanceStatus; note: string }

const EMPTY: FormState = { type: 'duty_shift', title: '', startedAt: '', endedAt: '', location: '', content: '' };

const fieldStyle: React.CSSProperties = {
  padding: '6px 8px',
  borderRadius: 4,
  border: `1px solid ${token('color.border', '#DFE1E6')}`,
  background: token('elevation.surface', '#fff'),
  color: token('color.text', '#172B4D'),
  width: '100%',
  boxSizing: 'border-box',
};

const Field: React.FC<{ id: string; label: string; children: React.ReactNode }> = ({ id, label, children }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 12 }}>
    <label htmlFor={id}>{label}</label>
    {children}
  </div>
);

export const OpsLogFormView: React.FC = () => {
  const { id } = useParams();
  const editId = id ? Number(id) : null;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const toast = useToast();
  const caps = useCapabilities();
  const unitId = caps.unit?.id ?? null;

  const [form, setForm] = useState<FormState>(EMPTY);
  const [rows, setRows] = useState<Row[]>([]);
  const [formError, setFormError] = useState('');
  const initialized = useRef(false);

  const membersQuery = useQuery({
    queryKey: [...OPS_LOGS_KEY, 'members', unitId],
    queryFn: () => fetchUnitMembers(unitId as number),
    enabled: unitId !== null && caps.canWriteOpsLog,
  });
  const detailQuery = useQuery({
    queryKey: opsLogDetailKey(editId ?? 0),
    queryFn: () => fetchOpsLog(editId as number),
    enabled: editId !== null && caps.canWriteOpsLog,
  });

  useEffect(() => {
    const detail = detailQuery.data;
    if (!detail || initialized.current) return;
    initialized.current = true;
    setForm({
      type: detail.type,
      title: detail.title,
      startedAt: toDateTimeInput(detail.started_at),
      endedAt: toDateTimeInput(detail.ended_at),
      location: detail.location ?? '',
      content: detail.content ?? '',
    });
    setRows(detail.attendance.map((a) => ({ user_id: a.user_id, status: a.status, note: a.note ?? '' })));
  }, [detailQuery.data]);

  const people = useMemo(
    () => (membersQuery.data ?? []).map((m) => ({ id: m.user_id, name: m.name, email: m.email })),
    [membersQuery.data]
  );
  const nameOf = (userId: number) =>
    people.find((p) => p.id === userId)?.name ?? detailQuery.data?.attendance.find((a) => a.user_id === userId)?.name ?? `Người #${userId}`;

  const save = useMutation({
    mutationFn: (payload: OpsLogPayload) => (editId === null ? createOpsLog(payload) : updateOpsLog(editId, payload)),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: OPS_LOGS_KEY });
      toast.success('Đã lưu nhật ký trực ban.');
      navigate(`/ops-log/${result.id}`);
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Không lưu được nhật ký.')),
  });

  if (!caps.canWriteOpsLog) {
    return <p role="alert">Bạn không có quyền ghi nhật ký trực ban.</p>;
  }
  if (editId !== null) {
    if (detailQuery.error) return <p role="alert">{apiErrorMessage(detailQuery.error, 'Không tải được nhật ký.')}</p>;
    if (!detailQuery.data) return <LottieLoading message="Đang tải nhật ký..." size={120} />;
    if (!detailQuery.data.can_edit) return <p role="alert">Bạn không có quyền sửa nhật ký này.</p>;
  }

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((prev) => ({ ...prev, [key]: value }));
  const setPeople = (ids: number[]) =>
    setRows((prev) => ids.map((userId) => prev.find((r) => r.user_id === userId) ?? { user_id: userId, status: 'present', note: '' }));
  const updateRow = (userId: number, patch: Partial<Row>) => setRows((prev) => prev.map((r) => (r.user_id === userId ? { ...r, ...patch } : r)));
  const hasAbsent = rows.some((r) => r.status === 'absent');

  const submit = () => {
    if (!form.title.trim()) return setFormError('Vui lòng nhập tiêu đề.');
    if (!form.startedAt) return setFormError('Vui lòng chọn thời điểm bắt đầu.');
    if (form.endedAt && form.endedAt < form.startedAt) return setFormError('Thời điểm kết thúc phải sau thời điểm bắt đầu.');
    setFormError('');
    save.mutate({
      type: form.type,
      title: form.title.trim(),
      started_at: form.startedAt,
      ended_at: form.endedAt || null,
      location: form.location.trim() || null,
      content: form.content.trim() || null,
      attendance: rows.map((r) => ({ user_id: r.user_id, status: r.status, ...(r.note.trim() ? { note: r.note.trim() } : {}) })),
    });
  };

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <p style={{ margin: '0 0 8px' }}><Link to={editId === null ? '/ops-logs' : `/ops-log/${editId}`}>← Quay lại</Link></p>
      <h1 style={{ margin: '0 0 16px', fontSize: 24, fontWeight: 600, color: token('color.text', '#172B4D') }}>
        {editId === null ? 'Ghi nhật ký trực ban' : 'Sửa nhật ký trực ban'}
      </h1>

      <Field id="ops-type" label="Loại">
        <select id="ops-type" style={fieldStyle} value={form.type} onChange={(e) => set('type', e.target.value as OpsLogType)}>
          {(Object.keys(OPS_LOG_TYPE_LABELS) as OpsLogType[]).map((key) => <option key={key} value={key}>{OPS_LOG_TYPE_LABELS[key]}</option>)}
        </select>
      </Field>
      <Field id="ops-title" label="Tiêu đề">
        <input id="ops-title" style={fieldStyle} maxLength={200} value={form.title} onChange={(e) => set('title', e.target.value)} />
      </Field>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 220 }}>
          <Field id="ops-start" label="Bắt đầu">
            <input id="ops-start" type="datetime-local" style={fieldStyle} value={form.startedAt} onChange={(e) => set('startedAt', e.target.value)} />
          </Field>
        </div>
        <div style={{ flex: 1, minWidth: 220 }}>
          <Field id="ops-end" label="Kết thúc">
            <input id="ops-end" type="datetime-local" style={fieldStyle} value={form.endedAt} onChange={(e) => set('endedAt', e.target.value)} />
          </Field>
        </div>
      </div>
      <Field id="ops-location" label="Địa điểm">
        <input id="ops-location" style={fieldStyle} maxLength={200} value={form.location} onChange={(e) => set('location', e.target.value)} />
      </Field>
      <Field id="ops-content" label="Nội dung">
        <textarea id="ops-content" style={{ ...fieldStyle, minHeight: 100 }} value={form.content} onChange={(e) => set('content', e.target.value)} />
      </Field>

      <h2 style={{ fontSize: 18, marginTop: 24 }}>Điểm danh</h2>
      {membersQuery.error && <p role="alert">{apiErrorMessage(membersQuery.error, 'Không tải được danh sách thành viên.')}</p>}
      <PeoplePicker label="Thành viên điểm danh" people={people} value={rows.map((r) => r.user_id)} onChange={setPeople} />
      <div style={{ display: 'flex', gap: 8, margin: '8px 0' }}>
        <Button onClick={() => setPeople(people.map((p) => p.id))}>Thêm cả đơn vị</Button>
        <Button isDisabled={rows.length === 0} onClick={() => setRows((prev) => prev.map((r) => ({ ...r, status: 'present' })))}>Có mặt tất cả</Button>
      </div>

      {rows.length > 0 && (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <tbody>
            {rows.map((row) => {
              const name = nameOf(row.user_id);
              return (
                <tr key={row.user_id} style={{ borderBottom: `1px solid ${token('color.border', '#DFE1E6')}` }}>
                  <td style={{ padding: 8 }}>{name}</td>
                  <td style={{ padding: 8 }}>
                    <select aria-label={`Trạng thái ${name}`} style={fieldStyle} value={row.status} onChange={(e) => updateRow(row.user_id, { status: e.target.value as AttendanceStatus })}>
                      {ATTENDANCE_STATUSES.map((status) => <option key={status} value={status}>{ATTENDANCE_LABELS[status]}</option>)}
                    </select>
                  </td>
                  <td style={{ padding: 8 }}>
                    <input aria-label={`Ghi chú ${name}`} style={fieldStyle} maxLength={255} placeholder="Ghi chú" value={row.note} onChange={(e) => updateRow(row.user_id, { note: e.target.value })} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
      {hasAbsent && <p style={{ color: token('color.text.subtle', '#5E6C84') }}>Người vắng không phép sẽ nhận thông báo trong ứng dụng.</p>}

      {formError && <p role="alert" style={{ color: token('color.text.danger', '#AE2E24') }}>{formError}</p>}
      <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
        <Button appearance="primary" isLoading={save.isPending} onClick={submit}>Lưu nhật ký</Button>
        <Button appearance="subtle" onClick={() => navigate(editId === null ? '/ops-logs' : `/ops-log/${editId}`)}>Huỷ</Button>
      </div>
    </div>
  );
};
```

- [ ] **Step 4: Chạy lại** test + `npx tsc --noEmit -p .` — Expected: PASS. Ghi chú kiểm tra:
  - Test "làm mới cache" dùng key `['core-ops-logs','list',{}]` tiền tố trùng `OPS_LOGS_KEY` nên `invalidateQueries` đánh dấu `isInvalidated`.
  - Test sửa: `Bỏ Nguyễn Văn An` là nút × của chip `PeoplePicker` (aria-label `Bỏ <tên>`; tên lấy từ danh sách `people`, nên mock `fetchUnitMembers` phải có người đó — đã có).
  - Test tạo: sau khi `navigate`, route `/ops-log/9` rơi vào `Probe` nên `testid=path` xuất hiện; trong test lỗi server thì **không** có `Probe` (vẫn ở form).

- [ ] **Step 5: Commit**

```bash
git add web/src/core/features/ops-logs/OpsLogFormView.tsx web/src/core/features/ops-logs/OpsLogFormView.test.tsx
git commit -m "feat(web): tạo/sửa nhật ký trực ban kèm điểm danh từng người"
```

---

### Task 11: Nối route và menu

**Files:**
- Modify: `web/src/core/AppRoutes.tsx`, `web/src/shared/layouts/PageLayout.tsx`, `web/src/shared/layouts/PageLayout.test.tsx`, `web/src/core/main.tsx`
- Test: `web/src/core/AppRoutes.opsLogs.test.tsx` (mới)

**Interfaces:**
- Consumes: `useCapabilities().hasDieuHanh`, `.canWriteOpsLog`; ba màn Task 8–10.
- Produces: route `/ops-logs`, `/ops-logs/new`, `/ops-log/:id`, `/ops-log/:id/edit`; `PageLayout` prop `canViewDieuHanh?: boolean` (mặc định `false`).

- [ ] **Step 1: Viết test hỏng**

```tsx
// web/src/core/AppRoutes.opsLogs.test.tsx
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppRoutes } from './AppRoutes';
import { BOOTSTRAP_KEY, SESSION_KEY } from './queryKeys';

vi.mock('./features/dashboard/Dashboard', () => ({ Dashboard: () => <div>màn-tổng-quan</div> }));
vi.mock('./features/ops-logs/OpsLogsView', () => ({ OpsLogsView: () => <div>màn-danh-sách-nhật-ký</div> }));
vi.mock('./features/ops-logs/OpsLogDetailView', () => ({ OpsLogDetailView: () => <div>màn-chi-tiết-nhật-ký</div> }));
vi.mock('./features/ops-logs/OpsLogFormView', () => ({ OpsLogFormView: () => <div>màn-form-nhật-ký</div> }));

function renderAt(path: string, unitRole: string, modules: string[] = ['dieu-hanh'], kind = 'department') {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
  qc.setQueryData(SESSION_KEY, {
    user: { id: 1, name: 'A', email: 'a@x', role: 'member' },
    units: {
      current: { id: 1, code: 'TCKT', name: 'TCKT', kind, modules },
      memberships: [{ unit_id: 1, code: 'TCKT', name: 'TCKT', kind, role: unitRole, modules }],
    },
  });
  qc.setQueryData(BOOTSTRAP_KEY, { stats: {}, upcoming: [], tasks: [], activity: [], teams: [], capabilities: { canCreateActivity: false, canCreateAccount: false } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[path]}>
        <AppRoutes userName="A" />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('AppRoutes — nhật ký trực ban', () => {
  afterEach(cleanup);

  it('đơn vị có Điều hành mở được danh sách và chi tiết (link #ops-log/12 trong thông báo)', () => {
    renderAt('/ops-logs', 'member');
    expect(screen.getByText('màn-danh-sách-nhật-ký')).toBeDefined();
    cleanup();
    renderAt('/ops-log/12', 'member');
    expect(screen.getByText('màn-chi-tiết-nhật-ký')).toBeDefined();
  });

  it('đơn vị không có Điều hành gõ tay #/ops-logs hoặc #/ops-log/12 thì về Tổng quan', () => {
    renderAt('/ops-logs', 'officer', ['ctd'], 'office');
    expect(screen.queryByText('màn-danh-sách-nhật-ký')).toBeNull();
    expect(screen.getByText('màn-tổng-quan')).toBeDefined();
    cleanup();
    renderAt('/ops-log/12', 'officer', ['ctd'], 'office');
    expect(screen.getByText('màn-tổng-quan')).toBeDefined();
  });

  it('leader mở được form tạo/sửa; member bị đưa về danh sách', () => {
    renderAt('/ops-logs/new', 'leader');
    expect(screen.getByText('màn-form-nhật-ký')).toBeDefined();
    cleanup();
    renderAt('/ops-log/12/edit', 'leader');
    expect(screen.getByText('màn-form-nhật-ký')).toBeDefined();
    cleanup();
    renderAt('/ops-logs/new', 'member');
    expect(screen.queryByText('màn-form-nhật-ký')).toBeNull();
    expect(screen.getByText('màn-danh-sách-nhật-ký')).toBeDefined();
    cleanup();
    renderAt('/ops-log/12/edit', 'member');
    expect(screen.getByText('màn-danh-sách-nhật-ký')).toBeDefined();
  });
});
```

Thêm vào cuối `describe('PageLayout', ...)` trong `web/src/shared/layouts/PageLayout.test.tsx` (trước dấu `});` đóng):

```tsx
  it('mục "Nhật ký trực ban" là mục điều hướng thật, chỉ hiện khi đơn vị có Điều hành', () => {
    renderLayout(<PageLayout canViewDieuHanh><div>Content</div></PageLayout>);
    fireEvent.click(screen.getByText('Nhật ký trực ban'));
    expect(screen.getByTestId('path').textContent).toBe('/ops-logs');
    cleanup();

    renderLayout(<PageLayout><div>Content</div></PageLayout>);
    expect(screen.queryByText('Nhật ký trực ban')).toBeNull();
  });
```

- [ ] **Step 2: Chạy, xác nhận hỏng** — `npx vitest run src/core/AppRoutes.opsLogs.test.tsx src/shared/layouts/PageLayout.test.tsx` → FAIL.

- [ ] **Step 3: Route** — `web/src/core/AppRoutes.tsx`: thêm import

```tsx
import { OpsLogsView } from './features/ops-logs/OpsLogsView';
import { OpsLogDetailView } from './features/ops-logs/OpsLogDetailView';
import { OpsLogFormView } from './features/ops-logs/OpsLogFormView';
```
và trước `<Route path="*" ...>`:

```tsx
      <Route path="/ops-logs" element={caps.hasDieuHanh ? <OpsLogsView /> : <ToDashboard />} />
      <Route path="/ops-logs/new" element={caps.canWriteOpsLog ? <OpsLogFormView /> : <Navigate to="/ops-logs" replace />} />
      <Route path="/ops-log/:id" element={caps.hasDieuHanh ? <OpsLogDetailView /> : <ToDashboard />} />
      <Route path="/ops-log/:id/edit" element={caps.canWriteOpsLog ? <OpsLogFormView /> : <Navigate to="/ops-logs" replace />} />
```
(`/ops-log/:id` khớp link `#ops-log/:id` trong thông báo vắng; đợt 0 đã chuẩn hoá `#ops-log/12` → `/ops-log/12`.)

- [ ] **Step 4: Menu** — `web/src/shared/layouts/PageLayout.tsx`:
  1. Trong `NAV_ITEMS`, thêm sau mục `/archive`:
     ```tsx
       { path: '/ops-logs', label: 'Nhật ký trực ban', Icon: BookWithBookmarkIcon, dieuHanhOnly: true },
     ```
     Và đổi khai báo mảng thành kiểu có hai cờ tuỳ chọn: `const NAV_ITEMS: { path: string; label: string; Icon: React.ComponentType<{ label: string }>; managerOnly?: boolean; dieuHanhOnly?: boolean }[] = [ ... ]`.
  2. Thêm prop `canViewDieuHanh?: boolean` vào `PageLayoutProps` (comment: `Hiện mục Điều hành (đơn vị hiện tại bật module dieu-hanh). Mặc định ẩn.`), nhận trong tham số với mặc định `false`.
  3. Đổi bộ lọc: `NAV_ITEMS.filter((item) => (!item.managerOnly || canViewReports) && (!item.dieuHanhOnly || canViewDieuHanh))`.
  4. Xoá dòng `<ButtonItem ...>Nhật ký trực ban</ButtonItem>` khỏi nhóm "SẮP CÓ" (giữ "Giao việc" và "Trình" — đợt 5 sẽ xử lý).

- [ ] **Step 5: Truyền quyền** — `web/src/core/main.tsx`, trong `SignedInShell`:

```tsx
    <PageLayout user={user} onLogout={onLogout} canViewReports={caps.isManager} canViewDieuHanh={caps.hasDieuHanh} headerExtras={<UnitSwitcher />}>
```

- [ ] **Step 6: Chạy toàn bộ web**

Run: `cd web && npm test && npx tsc --noEmit -p . && npm run build` — Expected: xanh. Nếu `main.test.tsx`/`PageLayout.test.tsx` có test cũ kiểm nhóm "SẮP CÓ" còn đủ ba mục thì sửa kỳ vọng thành hai mục (Giao việc, Trình).

- [ ] **Step 7: Commit**

```bash
git add web/src/core/AppRoutes.tsx web/src/core/AppRoutes.opsLogs.test.tsx web/src/shared/layouts web/src/core/main.tsx
git commit -m "feat(web): route và menu Nhật ký trực ban (ẩn khi đơn vị không có Điều hành)"
```

---

### Task 12: Tài liệu, kiểm tra và PR

**Files:**
- Modify: `docs/dev/api.md` (related_code `core/src/routes/**`: thêm mục "Nhật ký trực ban" cho 4 endpoint, ghi `modules` mới trong `GET /api/session` và `POST /api/session/unit`; bump MINOR; lịch sử)
- Modify: `docs/dev/phan-quyen.md` (related_code có `unit-context.js`: bảng vai trò ghi/sửa/đọc chéo nhật ký, `req.unit.modules` và `requireDieuHanh`; bump MINOR; lịch sử)
- Modify: `docs/dev/frontend.md` (mục `web/`: thêm `features/ops-logs`, `hasDieuHanh`/`canWriteOpsLog`, prop `canViewDieuHanh`; bump MINOR; lịch sử)
- Modify: `docs/specs/2026-10-09-web-hoan-thien-thay-the-design.md` (mục 6: đợt 6 xong; mục 4.8: ghi các quyết định 1–9; bump; lịch sử)
- Modify: `docs/specs/nen-tang-da-don-vi-tasks.md` (đánh dấu `[x]` task 12; bump; lịch sử)
- Modify: `docs/ai/bay-da-gap.md` (thêm bẫy: `req.unit.modules` từng không được điền nên cổng Điều hành của `directives`/`submissions` luôn 403 ngoài DYC dù test giả lập xanh; bump; lịch sử)
- Modify (nếu bảng vai trò nói về quyền theo đơn vị): `docs/ba/co-cau-don-vi-va-role.md` — thêm một dòng "Nhật ký trực ban: `leader` trở lên và BTV ghi; người ghi hoặc quản trị đơn vị sửa; đơn vị khác chỉ đọc khi `full_readonly` hoặc đã được Trình"; bump; lịch sử
- Không đổi: `docs/dev/db-migration.md`, `docs/playbooks/doi-schema.md` (không đổi schema)

- [ ] **Step 1: Viết nội dung `docs/dev/api.md`** — thêm mục `### Nhật ký trực ban (`/api/ops-logs`)` gồm bảng:

| Route | Quyền | Ghi chú |
|---|---|---|
| `GET /api/ops-logs?from=&to=&type=&limit=` | đơn vị có `dieu-hanh` (hoặc DYC) | Chỉ đơn vị hiện tại; mới nhất trước; `{ data: [...] }` có `counts`, `attendance_total`, `recorded_by_name` |
| `GET /api/ops-logs/:id` | như trên | Cùng đơn vị, hoặc đơn vị khác khi `full_readonly`/đã Trình/DYC (ghi `audit_logs` `cross_unit_read`); còn lại 404. Có `attendance`, `submissions`, `can_edit`, `is_own_unit` |
| `POST /api/ops-logs` | `leader`, `vice_leader`, `admin`, `vice_admin`, BTV, DYC | Body `{type,title,started_at,ended_at?,location?,content?,attendance:[{user_id,status,note?}]}`; một transaction; `absent` tạo thông báo `ops_log.absent_recorded` |
| `PATCH /api/ops-logs/:id` | người ghi hoặc quản trị đơn vị, trong đơn vị của nhật ký | `attendance` có mặt thì thay toàn bộ |

Ghi rõ: giờ là `YYYY-MM-DDTHH:mm:ss` giờ Việt Nam không múi giờ; mã lỗi 400/403/404 và thông điệp; `units.current.modules` và `units.memberships[].modules` là trường mới của `/api/session`.

- [ ] **Step 2: Sửa các tài liệu còn lại như liệt kê** (bump version, `updated: 2026-10-09`, dòng `## Lịch sử phiên bản`). Với `docs/ai/bay-da-gap.md` viết ngắn: triệu chứng (403 "Forbidden" ở `/api/directives`, `/api/submissions` với cả TCKT/BTV), nguyên nhân (`req.unit` không có `modules`), cách tránh (test route Điều hành bằng server thật `startTestServer`, không chỉ giả lập `req.unit`).

- [ ] **Step 3: Chạy kiểm tra đầy đủ**

```bash
cd web && npm test && npm run build && cd ..
npm run test:tools
npm run docs:index
git add -A docs && git commit -m "docs: web/ đợt 6 — API nhật ký trực ban, quyền, bẫy modules"
npm run docs:check -- --base origin/staging
```
Expected: xanh. `docs:check` phải chạy **sau** commit.

- [ ] **Step 4: Kiểm Core qua CI** — `git push`, chờ job `test-core`, `test-web` xanh (bao gồm `units.leak.test.js`, `units.modules.test.js`, `ops-logs.test.js`, `directives.test.js`). Nếu đỏ: gom các lỗi, sửa, push một lần.

- [ ] **Step 5: Mở PR vào `staging`**

```bash
gh pr create --base staging --title "web/: đợt 6 — Nhật ký trực ban (API Core + UI)" --body "…"
```
Mô tả PR: tóm tắt 3 phần (API `/api/ops-logs`; `modules` trên đơn vị hiện tại làm cổng Điều hành chạy thật, sửa luôn 403 của `directives`/`submissions`; UI `#/ops-logs`); mục "Schema: không đổi"; mục "Docs" liệt kê tài liệu đã cập nhật; mục "Cần smoke trên staging": (1) TCKT `leader` tạo nhật ký có người vắng → người đó thấy thông báo trong chuông và bấm mở đúng `#/ops-log/:id`, (2) `admin` bấm Trình tới BTV → BTV mở được nhật ký, rút lại thì 404, (3) `member` không thấy nút Ghi nhật ký, (4) đơn vị không có Điều hành không thấy menu; kết thúc bằng `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.

---

## Lịch sử phiên bản

| Version | Ngày | Thay đổi | Người |
|---|---|---|---|
| 1.0 | 2026-10-09 | Bản đầu: kế hoạch đợt 6 của SPEC-WEB-003 (API nhật ký trực ban rồi UI) | DYC |

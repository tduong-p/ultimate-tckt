---
doc_id: SPEC-UNIT-005
title: Kế hoạch triển khai — GĐ1-A2 Nền phần 2
version: 1.0
status: active
audience: [dev, ai]
owner: DYC
updated: 2026-09-24
related_code: []
---

# GĐ1-A2: Nền phần 2 (registry, gateway, bridge, shell, phạm vi xem, CI chống rò rỉ) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dựng xong phần nền dùng chung còn lại để các lane chạy song song được: shell biết module nào hiện cho ai (registry + menu), Core chuyển tiếp an toàn sang CTD bằng JWT bridge và nhận event ngược về, CTD nhận người từ Hub, có khung `web/` ở `/app`, có `scopeFor` + `toSummaryView` + API mức xem, và CI chặn merge khi dữ liệu rò sang đơn vị khác.

**Architecture:** Đây là **hợp đồng dùng chung** theo `docs/dev/ranh-gioi-module.md` (module Nền + Hạ tầng & CI). Vì mọi lane đều gọi vào đây, phần này làm **tập trung, trước** các lane: Điều hành backend (mục 9, 10, 12, 13), Frontend (14, 15, UI của 8), CTD (17–20), Email & Cron (24). Mỗi task có khối **Produces** ghi đúng hợp đồng lane sẽ dùng; đổi hợp đồng đó sau khi merge là việc phải raise. Registry là danh sách manifest tĩnh trong code (`core/src/registry/`). Gateway là middleware Express ở `/m/:module/api/v1/*` ký JWT HS256 bằng `node:crypto` và stream request/response sang upstream. `/internal/events` nhận event từ module bằng JWT cùng secret nhưng `aud=core`. CTD thêm nhánh xác thực bridge trong `deps.py` và router `/api/v1`. `scopeFor` sinh mệnh đề SQL (không gọi truy vấn hộ route); `readScoped` áp serializer và ghi audit. Shell `web/` là Vite build tĩnh, Core phục vụ ở `/app`.

**Tech Stack:** Core: Node 22, Express 5, mysql2, MySQL 8, `node --test`. CTD: FastAPI, SQLAlchemy 2, Alembic, Postgres, pyjwt, pytest. Web: Vite 5, React 18, TypeScript 5.

**Spec:** `.kiro/specs/nen-tang-da-don-vi/design.md` (+ `requirements.md`, `tasks.md`), bản phân lane `docs/specs/2026-09-24-gd1-phan-lane.md` (Lane 0). Plan này phủ `tasks.md` mục **5**, **6**, **7 (chỉ khung)**, **11 (chỉ backend)**, **16 (tối thiểu)**, **21**, **22**, **23**. Plan trước: `docs/specs/2026-09-24-gd1a-core-da-don-vi-plan.md` (GĐ1-A: mục 1–4 + backend 8).

**Ngoài phạm vi (ghi rõ để lane không chờ nhầm):**
- Mục 17 (bảng ánh xạ role Core → CTD): plan này chỉ để một hàm `map_hub_role` trả `None`, đánh dấu **MẶC ĐỊNH TẠM**. Lane C thay.
- Mục 7 phần chuông thông báo và bộ UI dùng chung: dời sang GĐ1-D (Lane B). Ở đây chỉ có layout, đăng nhập, chuyển đơn vị, menu.
- Mục 11 phần trang Setting → Phạm vi xem liên đơn vị: dời sang GĐ1-D (Lane B). Ở đây chỉ có API.
- Màn hình module (Điều hành, CTD) trong `web/`: Lane B và Lane C.

## Global Constraints

- Đơn vị/role theo `kind` như GĐ1-A: `platform_owner` DYC (`dyc_admin`, `dyc_engineer`); `standing_committee` BTV (`btv_lead`, `btv_member`); `department` TCKT (`admin`, `vice_admin`, `leader`, `vice_leader`, `member`); `office` VP Đoàn (`officer`); `party_cell` Chi bộ (`observer`); `grassroots` ĐT/LCĐ (`officer`, dữ liệu giả `DEMO-*`).
- `unit_modules` seed: TCKT, BTV: `dieu-hanh` + `ctd`; VP Đoàn, Chi bộ, `DEMO-*`: `ctd`; DYC: không có dòng nào (D4: DYC là admin global).
- Quyền luôn tính theo **đơn vị đang chọn** (`req.unit`, `req.unitRole`), không theo "có membership ở đâu đó", trừ các chỗ GĐ1-A đã chốt dùng `hasDycMembership` (legacy gate, setting).
- JWT bridge: HS256, secret `HUB_BRIDGE_SECRET`, `aud=ctd`, TTL đúng 60 giây, `iss='ultimate-tckt-core'`. Event về Core: cùng secret, `aud=core`, `iss=<module id>`, TTL ≤ 60 giây.
- Tên service trong compose là `ctd-api` (bất biến 8 cấm `ctd-app`). Upstream CTD trong Docker network: `http://ctd-api:8000`. Core trong Docker network: `http://core:3000`.
- Không thêm dependency mới vào `core/package.json` hay `services/ctd-api/backend/pyproject.toml` (thêm thư viện = raise theo `ranh-gioi-module.md`). `web/package.json` là package mới, dùng đúng các phiên bản CTD frontend đang dùng.
- Không ghi secret, mật khẩu hay giá trị `.env` thật vào repo, tài liệu hay test. Secret trong test là chuỗi giả, có chữ `test`.
- Không sửa `docs/ba/nguon/` và `.agents/skills/`.
- Tài liệu: mỗi task cập nhật tài liệu liên quan trong cùng commit. **Ruling ghi trong plan:** mỗi tài liệu chỉ tăng `version` **một lần cho cả nhánh GĐ1-A2** — task đầu tiên chạm tài liệu đó tăng version + thêm dòng lịch sử "GĐ1-A2: …", task sau chỉ bổ sung nội dung và mở rộng đúng dòng lịch sử đó. Lý do: docs-check chỉ so với `origin/staging`, nhiều lần bump trong một PR chỉ sinh nhiễu lịch sử.
- Lệnh kiểm:
  - Core: `cd core && npm test`
  - CTD: `cd services/ctd-api/backend && .venv/bin/pytest` (worktree mới chưa có `.venv`: `python3.12 -m venv .venv && .venv/bin/pip install -e '.[dev]'` như `docs/dev/chay-local.md`)
  - Web: `cd web && npm run build && npm test`
  - Tooling: `npm run test:tools` ở gốc repo
  - Tài liệu: `npm run docs:index && npm run docs:check -- --base origin/staging` ở gốc repo (bỏ qua dòng stderr bắt đầu bằng `fatal:`)

## Review Focus

1. **Gateway bị dùng để vượt quyền sang CTD** — ví dụ đơn vị chưa bật module, TCKT `member` (sinh viên SSO), cookie session lọt sang upstream, hoặc đường dẫn `..%2F` thoát khỏi `/api/v1`. Kỳ vọng: 401/403/404/400 đúng như bảng ở Task 2; upstream không bao giờ nhận `Cookie`; claim `exp - iat = 60`. Test: `core/tests/units.gateway.test.js` (Task 2).
2. **Token giả mạo được CTD chấp nhận** — token local CTD bị sửa `iss` để đi nhánh bridge, token bridge hết hạn, sai `aud`, sai chữ ký, hay secret chưa đặt. Kỳ vọng: tất cả 401; token local cũ vẫn chạy ở `/api/me`; người mới từ Hub không có quyền gì (`chua_co_quyen`, không có unit, `/api/cases` trả `[]`, tạo hồ sơ bị 400). Test: `services/ctd-api/backend/tests/test_hub_bridge.py` (Task 4).
3. **`scopeFor` để lộ tài nguyên hoặc trường ngoài mức xem** — BTV mức `summary` thấy task, checklist, ops_log, hoặc thấy activity có trường ngoài 9 trường tổng quan; mục đã Trình vẫn thấy sau khi rút. Kỳ vọng: ma trận mức × loại tài nguyên khớp design §6.2; khoá của activity tổng quan đúng bằng `SUMMARY_KEYS`. Test: `core/tests/units.scope.test.js` (Task 5).
4. **Người không phải admin đơn vị sở hữu đổi được mức xem**, hoặc đổi được khi DYC đã khoá. Kỳ vọng: 403 cho BTV, TCKT `leader`, DYC; 403 kèm `reason` khi có khoá; mỗi lần đổi có `audit_logs` `visibility.update` với `previous_level`. Test: `core/tests/units.visibility.test.js` (Task 5).
5. **Route GET mới do lane thêm sau này lọt khỏi test chống rò rỉ.** Kỳ vọng: mọi route GET phải được phân loại (allowlist / cấu hình nền / nghiệp vụ); route chưa phân loại làm test fail; BTV mức `summary` không thấy khoá ngoài danh sách hay id task/checklist/ops_log của TCKT; DYC đọc route nghiệp vụ không bị 403 và mỗi lượt có `audit_logs`. Test: `core/tests/units.leak.test.js` (Task 5) + guard CI `tools/tests/workflows.test.js` (Task 7).

---

## File Structure

| File | Trách nhiệm |
|---|---|
| `core/src/registry/manifest-schema.js` (mới) | `validateManifest`, `itemVisibleTo` |
| `core/src/registry/manifests/dieu-hanh.js`, `core/src/registry/manifests/ctd.js` (mới) | Manifest tĩnh của hai module |
| `core/src/registry/index.js` (mới) | `listModules`, `getModule`, `canUseModule`, `menuFor`, `unitHasModule`, `buildRegistry` |
| `core/src/routes/shell.js` (mới) | `GET /api/shell/menu` |
| `core/src/gateway/bridge-token.js` (mới) | `signJwt`, `verifyJwt`, `signBridgeToken`, `TokenError`, `BRIDGE_ISSUER`, `TTL_SECONDS` |
| `core/src/gateway/proxy.js` (mới) | `createGateway` — middleware `/m/:module/api/v1/*` |
| `core/src/routes/internal-events.js` (mới) | `POST /internal/events` |
| `core/src/units/scope.js` (mới) | `LEVELS`, `viewerFromReq`, `scopeFor`, `readScoped` |
| `core/src/units/summary-view.js` (mới) | `SUMMARY_KEYS`, `CROSS_UNIT_KEYS`, `toSummaryView` |
| `core/src/routes/visibility.js` (mới) | API mức xem `/api/units/:id/visibility*` |
| `core/src/settings/catalog.js` | Thêm mẫu key `visibility.<OWNER>.<VIEWER>`, `settingEntry`, `visibilitySettingKey` |
| `core/src/routes/platform.js` | Dùng `settingEntry` khi tạo khoá |
| `core/src/config/environment.js` | Thêm `bridge` |
| `core/src/config/migrate-units.js` | Thêm bảng `module_events` |
| `core/src/web-shell.js` (mới) | Phục vụ `web/dist` ở `/app` |
| `core/src/app.js`, `core/src/routes/index.js` | Nối gateway, bỏ body parser cho `/m/`, nối route mới, nối `/app` |
| `core/tests/helpers/server.js` | `startTestServer(db, { config, webDistDir })`, `request(..., { rawBody })` |
| `core/Dockerfile`, `core/Dockerfile.dockerignore` (mới), `core/.dockerignore` (xoá) | Build multi-stage có `web/dist`, context gốc repo |
| `web/**` (mới) | Shell Vite + React 18 + TS |
| `services/ctd-api/backend/app/infra/hub_bridge.py` (mới) | `verify_bridge_token`, `is_bridge_token`, `sign_event_token` |
| `services/ctd-api/backend/app/services/hub_users.py` (mới) | `map_hub_role` (mặc định tạm), `sync_hub_user` |
| `services/ctd-api/backend/app/api/v1.py`, `app/schemas/v1.py` (mới) | Router `/api/v1`, `GET /api/v1/me` |
| `services/ctd-api/backend/app/deps.py`, `app/config.py`, `app/main.py`, `app/models/identity.py` | Nhánh bridge, cấu hình, router, cột + role mới |
| `services/ctd-api/backend/alembic/versions/5b1e2c3d4f60_them_hub_id.py` (mới) | `app_user.hub_user_id`, `unit.hub_unit_id` |
| `infra/compose/docker-compose.{staging,production}.yml`, `infra/.env.example`, `infra/scripts/bootstrap-vm.sh`, `infra/nginx/{staging,production}/core.conf` | Biến bridge, chặn `/internal/` |
| `.github/workflows/deploy.yml` | Build/test `web` trong `test-core`, build image từ gốc repo |
| `tools/tests/{compose,infra-bootstrap,workflows}.test.js` | Kiểm biến, bootstrap, bước web, guard CI chống rò rỉ |
| `core/tests/units.{registry,menu,bridge-token,gateway,internal-events,scope,visibility,leak,web-shell}.test.js` | Test Task 1–6 (`units.leak.test.js` viết lại ở Task 5) |
| `.kiro/specs/nen-tang-da-don-vi/tasks.md`, `docs/specs/nen-tang-da-don-vi-tasks.md` | Đánh dấu mục đã xong (Task 7) |

---

### Task 1: Module registry, manifest và API menu (spec mục 5)

**Files:**
- Create: `core/src/registry/manifest-schema.js`, `core/src/registry/manifests/dieu-hanh.js`, `core/src/registry/manifests/ctd.js`, `core/src/registry/index.js`, `core/src/routes/shell.js`
- Modify: `core/src/routes/index.js`, `core/tests/units.leak.test.js` (thêm `/api/shell/menu` vào `OUTSIDER_ALLOW`)
- Test: `core/tests/units.registry.test.js`, `core/tests/units.menu.test.js`
- Docs: `docs/dev/api.md`, `docs/dev/kien-truc.md`, `docs/dev/ranh-gioi-module.md`, `docs/playbooks/them-module.md`, `docs/ba/co-cau-don-vi-va-role.md`, `docs/ai/bat-bien.md`, `docs/dev/test.md`

**Interfaces:**
- Consumes: `UNIT_ROLES`, `SEED_UNIT_MODULES` (`core/src/units/catalog.js`); bảng `unit_modules(unit_id, module_id)`; `req.unit`, `req.unitRole` (`loadUnitContext`); `auth`, `asyncRoute` (context).
- Produces (hợp đồng cho Lane B, Lane C và mọi module sau này):
  - Dạng manifest (mỗi module một file `core/src/registry/manifests/<id>.js`, `module.exports = {…}`):
    ```js
    {
      id: 'ctd',                                  // /^[a-z][a-z0-9-]{1,39}$/, trùng module_id trong unit_modules
      name: 'Công tác Đảng',
      api: { kind: 'gateway', audience: 'ctd' },  // hoặc { kind: 'in_process' } (API nằm sẵn trong Core /api/*)
      menu: [{
        id: 'ho-so', label: 'Hồ sơ Đảng',
        path: '/app/m/ctd/ho-so',                  // bắt buộc bắt đầu bằng /app/m/<id>/
        icon: 'folder', order: 10,                 // order: số nguyên, sắp tăng dần
        visible_to: [{ unit_kind: 'grassroots', roles: ['officer'] }, { unit_kind: 'platform_owner', roles: '*' }]
      }]
    }
    ```
  - `validateManifest(m) → string[]` (rỗng = hợp lệ); `itemVisibleTo(item, unitKind, role) → boolean`.
  - `listModules() → Manifest[]` (thứ tự khai báo), `getModule(id) → Manifest | null`, `canUseModule(manifest, unitKind, role) → boolean` (có ít nhất một mục menu nhìn thấy), `menuFor(db, unit, role) → Promise<MenuModule[]>`, `unitHasModule(db, unit, moduleId) → Promise<boolean>`, `buildRegistry(manifests) → Map` (ném lỗi khi manifest sai hoặc trùng id — app không khởi động được với manifest hỏng).
  - `GET /api/shell/menu` (auth) → 200 `{ unit: {id, code, name, kind}, role: string, modules: [{ id, name, items: [{ id, label, path, icon, order }] }] }`; 401 chưa đăng nhập; 403 chưa thuộc đơn vị nào (từ `auth`). Module không còn mục nào nhìn thấy thì bị bỏ khỏi `modules`.
  - Quy tắc hiện: đơn vị đang chọn **đã bật** module trong `unit_modules` **và** `(req.unit.kind, req.unitRole)` khớp `visible_to` của mục.
- **Ruling ghi trong plan:** đơn vị DYC (`platform_owner`) **bỏ qua** `unit_modules` (DYC không có dòng seed nào; D4 cho DYC quyền global) nhưng vẫn chỉ thấy mục có `unit_kind: 'platform_owner'` trong `visible_to`. Lý do: không phải seed thêm `unit_modules` cho DYC mỗi khi có module mới, và manifest vẫn quyết định DYC thấy màn nào.
- **Ruling ghi trong plan:** mục CTD `ho-so` cho TCKT chỉ gồm `admin`, `vice_admin`, `leader`, `vice_leader` — **không** có `member`. Lý do: ADR-0008 (quyền CTD từ tổ phó trở lên) và Req 7.3 — sinh viên đăng nhập SSO lần đầu thành TCKT `member` (GĐ1-A Task 8) nên phải không thấy tab CTD.
- **Ruling ghi trong plan:** danh sách mục menu ban đầu dưới đây là bản nháp để shell có dữ liệu; lane sở hữu module được sửa **nội dung** manifest của mình (nhãn, icon, thêm/bớt mục) mà không phải raise, nhưng đổi **dạng** manifest (`manifest-schema.js`) hay dạng response `/api/shell/menu` là đổi hợp đồng dùng chung.
- **Ruling ghi trong plan:** `/api/shell/menu` vào `OUTSIDER_ALLOW` của test chống rò rỉ. Lý do: nó chỉ trả menu của chính đơn vị người gọi đang chọn, không chứa dữ liệu nghiệp vụ của đơn vị khác.

- [ ] **Step 1: Write the failing tests**

`core/tests/units.registry.test.js`:

```js
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { validateManifest, itemVisibleTo } = require('../src/registry/manifest-schema');
const { buildRegistry, listModules, getModule, canUseModule } = require('../src/registry');
const { SEED_UNIT_MODULES } = require('../src/units/catalog');

const good = () => ({
  id: 'thu-nghiem', name: 'Thử nghiệm', api: { kind: 'in_process' },
  menu: [{ id: 'mot', label: 'Một', path: '/app/m/thu-nghiem/mot', icon: 'dot', order: 1, visible_to: [{ unit_kind: 'office', roles: ['officer'] }] }]
});

test('validateManifest accepts a well-formed manifest and rejects each broken field', () => {
  assert.deepEqual(validateManifest(good()), []);
  const breakers = [
    m => { m.id = 'Có dấu'; },
    m => { m.name = ''; },
    m => { m.api = { kind: 'gateway' }; },
    m => { m.api = { kind: 'ftp' }; },
    m => { m.menu = []; },
    m => { m.menu[0].path = '/app/m/khac/mot'; },
    m => { m.menu[0].order = 'một'; },
    m => { m.menu[0].visible_to = []; },
    m => { m.menu[0].visible_to = [{ unit_kind: 'office', roles: ['admin'] }]; },
    m => { m.menu[0].visible_to = [{ unit_kind: 'khong-co', roles: '*' }]; },
    m => { m.menu.push({ ...m.menu[0] }); }
  ];
  for (const breakIt of breakers) {
    const m = good();
    breakIt(m);
    assert.ok(validateManifest(m).length > 0, `should reject ${JSON.stringify(m)}`);
  }
});

test('buildRegistry refuses invalid or duplicate manifests', () => {
  assert.throws(() => buildRegistry([{ ...good(), menu: [] }]), /Invalid module manifest thu-nghiem/);
  assert.throws(() => buildRegistry([good(), good()]), /Duplicate module id thu-nghiem/);
  assert.equal(buildRegistry([good()]).get('thu-nghiem').name, 'Thử nghiệm');
});

test('shipped registry: dieu-hanh (in_process) and ctd (gateway, audience ctd) cover every seeded module id', () => {
  assert.deepEqual(listModules().map(m => m.id), ['dieu-hanh', 'ctd']);
  assert.deepEqual(getModule('dieu-hanh').api, { kind: 'in_process' });
  assert.deepEqual(getModule('ctd').api, { kind: 'gateway', audience: 'ctd' });
  assert.equal(getModule('khong-co'), null);
  for (const ids of Object.values(SEED_UNIT_MODULES)) for (const id of ids) assert.ok(getModule(id), `seeded module ${id} has no manifest`);
});

test('ctd is usable by unit officers, TCKT vice_leader and above, VP Đoàn, Chi bộ, BTV, DYC — never by a TCKT member', () => {
  const ctd = getModule('ctd');
  const allowed = [
    ['grassroots', 'officer'], ['department', 'admin'], ['department', 'vice_admin'], ['department', 'leader'],
    ['department', 'vice_leader'], ['office', 'officer'], ['party_cell', 'observer'],
    ['standing_committee', 'btv_member'], ['platform_owner', 'dyc_engineer']
  ];
  for (const [kind, role] of allowed) assert.ok(canUseModule(ctd, kind, role), `${kind}/${role}`);
  assert.equal(canUseModule(ctd, 'department', 'member'), false);
  assert.equal(itemVisibleTo(ctd.menu.find(i => i.id === 'ho-so'), 'standing_committee', 'btv_lead'), false);
});
```

`core/tests/units.menu.test.js`:

```js
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { createTestDatabase } = require('./helpers/db');
const { startTestServer } = require('./helpers/server');
const { createUser, unitIdByCode } = require('./helpers/fixtures');

const shape = menu => Object.fromEntries(menu.modules.map(m => [m.id, m.items.map(i => i.id)]));
const TCKT_DH = ['hom-nay', 'hoat-dong', 'viec-cap-tren-giao', 'nhat-ky'];

test('menu = manifest items the current (kind, role) may see, only for modules the unit enabled (Req 7.1–7.3)', async () => {
  const { pool, teardown } = await createTestDatabase();
  const { client, close } = await startTestServer(pool);
  try {
    assert.equal((await client.request('GET', '/api/shell/menu')).status, 401);
    const cases = [
      [[['TCKT', 'member']], { 'dieu-hanh': TCKT_DH }],
      [[['TCKT', 'leader']], { 'dieu-hanh': TCKT_DH, ctd: ['ho-so'] }],
      [[['DEMO-DT-01', 'officer']], { ctd: ['ho-so'] }],
      [[['VPD', 'officer']], { ctd: ['ho-so'] }],
      [[['CHIBO', 'observer']], { ctd: ['ho-so'] }],
      [[['BTV', 'btv_member']], { 'dieu-hanh': ['viec-da-giao', 'ho-so-duoc-trinh', 'tong-quan'], ctd: ['so-lieu'] }],
      [[['DYC', 'dyc_engineer']], { 'dieu-hanh': ['hoat-dong', 'viec-cap-tren-giao', 'nhat-ky', 'viec-da-giao', 'ho-so-duoc-trinh', 'tong-quan'], ctd: ['ho-so', 'so-lieu'] }]
    ];
    for (const [units, expected] of cases) {
      const u = await createUser(pool, { units });
      await client.login(u.email, u.password);
      const r = await client.request('GET', '/api/shell/menu');
      assert.equal(r.status, 200);
      assert.deepEqual(shape(r.json), expected, JSON.stringify(units));
      assert.equal(r.json.unit.code, units[0][0]);
      assert.equal(r.json.role, units[0][1]);
      for (const m of r.json.modules) for (const i of m.items) assert.deepEqual(Object.keys(i).sort(), ['icon', 'id', 'label', 'order', 'path']);
    }
  } finally { await close(); await teardown(); }
});

test('disabling a module for a unit hides it at once; switching unit switches the menu', async () => {
  const { pool, teardown } = await createTestDatabase();
  const { client, close } = await startTestServer(pool);
  try {
    const u = await createUser(pool, { units: [['TCKT', 'leader'], ['DEMO-DT-01', 'officer']] });
    await client.login(u.email, u.password);
    assert.deepEqual(shape((await client.request('GET', '/api/shell/menu')).json).ctd, ['ho-so']);
    await pool.execute("DELETE FROM unit_modules WHERE unit_id=? AND module_id='ctd'", [await unitIdByCode(pool, 'TCKT')]);
    assert.equal(shape((await client.request('GET', '/api/shell/menu')).json).ctd, undefined);
    const dt = await unitIdByCode(pool, 'DEMO-DT-01');
    assert.equal((await client.request('POST', '/api/session/unit', { body: { unit_id: dt } })).status, 200);
    assert.deepEqual(shape((await client.request('GET', '/api/shell/menu')).json), { ctd: ['ho-so'] });
  } finally { await close(); await teardown(); }
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd core && node --test tests/units.registry.test.js tests/units.menu.test.js`
Expected: FAIL — `Cannot find module '../src/registry/manifest-schema'`.

- [ ] **Step 3: Write minimal implementation**

`core/src/registry/manifest-schema.js`:

```js
'use strict';
const { UNIT_ROLES } = require('../units/catalog');

const ID = /^[a-z][a-z0-9-]{1,39}$/;
const API_KINDS = ['gateway', 'in_process'];

function validateManifest(m) {
  if (!m || typeof m !== 'object') return ['manifest must be an object'];
  const errors = [];
  if (!ID.test(m.id || '')) errors.push(`id must match ${ID}`);
  if (!m.name || typeof m.name !== 'string') errors.push('name is required');
  if (!m.api || !API_KINDS.includes(m.api.kind)) errors.push('api.kind must be gateway or in_process');
  if (m.api?.kind === 'gateway' && !m.api.audience) errors.push('gateway module needs api.audience');
  if (!Array.isArray(m.menu) || !m.menu.length) errors.push('menu must be a non-empty array');
  const seen = new Set();
  for (const item of Array.isArray(m.menu) ? m.menu : []) {
    const at = `menu ${item?.id}`;
    if (!ID.test(item?.id || '')) errors.push(`${at}: id must match ${ID}`);
    if (seen.has(item?.id)) errors.push(`${at}: duplicate id`);
    seen.add(item?.id);
    if (!item?.label) errors.push(`${at}: label is required`);
    if (typeof item?.path !== 'string' || !item.path.startsWith(`/app/m/${m.id}/`)) errors.push(`${at}: path must start with /app/m/${m.id}/`);
    if (!item?.icon) errors.push(`${at}: icon is required`);
    if (!Number.isInteger(item?.order)) errors.push(`${at}: order must be an integer`);
    if (!Array.isArray(item?.visible_to) || !item.visible_to.length) { errors.push(`${at}: visible_to must be a non-empty array`); continue; }
    for (const rule of item.visible_to) {
      const roles = UNIT_ROLES[rule?.unit_kind];
      if (!roles) { errors.push(`${at}: unknown unit_kind ${rule?.unit_kind}`); continue; }
      if (rule.roles === '*') continue;
      if (!Array.isArray(rule.roles) || !rule.roles.length || rule.roles.some(r => !roles.includes(r))) {
        errors.push(`${at}: roles for ${rule.unit_kind} must be '*' or a subset of ${roles.join(',')}`);
      }
    }
  }
  return errors;
}

function itemVisibleTo(item, unitKind, role) {
  return item.visible_to.some(r => r.unit_kind === unitKind && (r.roles === '*' || r.roles.includes(role)));
}

module.exports = { validateManifest, itemVisibleTo };
```

`core/src/registry/manifests/dieu-hanh.js`:

```js
'use strict';
// Nội dung menu do module Điều hành sở hữu; dạng manifest là hợp đồng dùng chung (manifest-schema.js).
const TCKT = { unit_kind: 'department', roles: '*' };
const BTV = { unit_kind: 'standing_committee', roles: '*' };
const DYC = { unit_kind: 'platform_owner', roles: '*' };
const item = (id, label, icon, order, visible_to) => ({ id, label, path: `/app/m/dieu-hanh/${id}`, icon, order, visible_to });

module.exports = {
  id: 'dieu-hanh',
  name: 'Điều hành',
  api: { kind: 'in_process' },
  menu: [
    item('hom-nay', 'Việc hôm nay', 'today', 10, [TCKT]),
    item('hoat-dong', 'Hoạt động', 'activity', 20, [TCKT, DYC]),
    item('viec-cap-tren-giao', 'Việc cấp trên giao', 'inbox', 30, [TCKT, DYC]),
    item('nhat-ky', 'Nhật ký', 'journal', 40, [TCKT, DYC]),
    item('viec-da-giao', 'Việc đã giao', 'send', 50, [BTV, DYC]),
    item('ho-so-duoc-trinh', 'Hồ sơ được trình', 'folder', 60, [BTV, DYC]),
    item('tong-quan', 'Tổng quan', 'chart', 70, [BTV, DYC])
  ]
};
```

`core/src/registry/manifests/ctd.js`:

```js
'use strict';
// Nội dung menu do module CTD sở hữu. TCKT `member` cố ý KHÔNG có (ADR-0008, Req 7.3).
module.exports = {
  id: 'ctd',
  name: 'Công tác Đảng',
  api: { kind: 'gateway', audience: 'ctd' },
  menu: [
    {
      id: 'ho-so', label: 'Hồ sơ Đảng', path: '/app/m/ctd/ho-so', icon: 'folder', order: 10,
      visible_to: [
        { unit_kind: 'grassroots', roles: ['officer'] },
        { unit_kind: 'department', roles: ['admin', 'vice_admin', 'leader', 'vice_leader'] },
        { unit_kind: 'office', roles: ['officer'] },
        { unit_kind: 'party_cell', roles: ['observer'] },
        { unit_kind: 'platform_owner', roles: '*' }
      ]
    },
    {
      id: 'so-lieu', label: 'Số liệu', path: '/app/m/ctd/so-lieu', icon: 'chart', order: 20,
      visible_to: [{ unit_kind: 'standing_committee', roles: '*' }, { unit_kind: 'platform_owner', roles: '*' }]
    }
  ]
};
```

`core/src/registry/index.js`:

```js
'use strict';
const { validateManifest, itemVisibleTo } = require('./manifest-schema');

const MANIFESTS = [require('./manifests/dieu-hanh'), require('./manifests/ctd')];

function buildRegistry(manifests) {
  const byId = new Map();
  for (const m of manifests) {
    const errors = validateManifest(m);
    if (errors.length) throw new Error(`Invalid module manifest ${m?.id}: ${errors.join('; ')}`);
    if (byId.has(m.id)) throw new Error(`Duplicate module id ${m.id}`);
    byId.set(m.id, Object.freeze(m));
  }
  return byId;
}

const registry = buildRegistry(MANIFESTS);
const listModules = () => [...registry.values()];
const getModule = id => registry.get(id) || null;
const canUseModule = (manifest, unitKind, role) => manifest.menu.some(i => itemVisibleTo(i, unitKind, role));
const isPlatformOwner = unit => unit?.kind === 'platform_owner';

async function enabledModuleIds(db, unitId) {
  const [rows] = await db.execute('SELECT module_id FROM unit_modules WHERE unit_id=?', [unitId]);
  return new Set(rows.map(r => r.module_id));
}

async function unitHasModule(db, unit, moduleId) {
  if (!unit) return false;
  if (isPlatformOwner(unit)) return true; // DYC bỏ qua unit_modules (D4)
  return (await enabledModuleIds(db, unit.id)).has(moduleId);
}

async function menuFor(db, unit, role) {
  if (!unit) return [];
  const enabled = isPlatformOwner(unit) ? null : await enabledModuleIds(db, unit.id);
  return listModules()
    .filter(m => enabled === null || enabled.has(m.id))
    .map(m => ({
      id: m.id,
      name: m.name,
      items: m.menu
        .filter(i => itemVisibleTo(i, unit.kind, role))
        .sort((a, b) => a.order - b.order)
        .map(({ id, label, path, icon, order }) => ({ id, label, path, icon, order }))
    }))
    .filter(m => m.items.length);
}

module.exports = { buildRegistry, listModules, getModule, canUseModule, menuFor, unitHasModule };
```

`core/src/routes/shell.js`:

```js
'use strict';
const express = require('express');
const { menuFor } = require('../registry');

function createShellRoutes(context) {
  const { db, auth, asyncRoute } = context;
  const router = express.Router();
  router.get('/api/shell/menu', auth, asyncRoute(async (req, res) => {
    res.json({ unit: req.unit, role: req.unitRole, modules: await menuFor(db, req.unit, req.unitRole) });
  }));
  return router;
}

module.exports = { createShellRoutes };
```

`core/src/routes/index.js` — thêm `const { createShellRoutes } = require('./shell');` và `app.use(createShellRoutes(context));` sau `createUnitRoutes`.

`core/tests/units.leak.test.js` — thêm vào cuối mảng `OUTSIDER_ALLOW` phần tử `/^\/api\/shell\/menu$/` với comment `// menu của chính đơn vị người gọi đang chọn — không chứa dữ liệu nghiệp vụ`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd core && node --test tests/units.registry.test.js tests/units.menu.test.js tests/units.leak.test.js`
Expected: PASS 8/8

- [ ] **Step 5: Run full suite**

Run: `cd core && npm test > /tmp/core.log 2>&1; grep -E "^ℹ (tests|pass|fail)" /tmp/core.log`
Expected: `fail 0`

- [ ] **Step 6: Docs**

- `docs/dev/api.md`: mục mới "Shell" — `GET /api/shell/menu` (dạng response, 401/403, quy tắc hiện). Bump + dòng lịch sử "GĐ1-A2: …".
- `docs/dev/kien-truc.md`: thêm `core/src/registry/` (manifest tĩnh, `buildRegistry` chạy lúc load module nên manifest hỏng làm app không khởi động). Bump.
- `docs/dev/ranh-gioi-module.md`: bảng module — Nền thêm `core/src/registry/{index,manifest-schema}.js`, `core/src/routes/shell.js`; Điều hành thêm `core/src/registry/manifests/dieu-hanh.js`; CTD thêm `core/src/registry/manifests/ctd.js`. Thêm vào mục "Hợp đồng dùng chung": dạng manifest + response `/api/shell/menu`. Bump.
- `docs/playbooks/them-module.md`: bước mới "Khai manifest": tạo `core/src/registry/manifests/<id>.js`, thêm vào `MANIFESTS`, seed `unit_modules` trong `core/src/units/catalog.js`, chạy `units.registry.test.js`. Bump.
- `docs/ba/co-cau-don-vi-va-role.md`: bảng "Ai thấy tab nào" (theo hai manifest; TCKT `member` không thấy CTD; DYC thấy mọi module). Bump.
- `docs/ai/bat-bien.md`: không đổi bất biến; chỉ ghi `/api/shell/menu` trong danh sách allowlist của bất biến 13. Bump.
- `docs/dev/test.md`: liệt kê `units.registry.test.js`, `units.menu.test.js`. Bump.

- [ ] **Step 7: Commit**

```bash
npm run docs:index && npm run docs:check -- --base origin/staging
git add core/src/registry core/src/routes/shell.js core/src/routes/index.js core/tests docs/
git commit -m "feat(core): module registry, manifests and shell menu API"
```

---

### Task 2: JWT bridge và gateway `/m/:module/api/v1/*` (spec mục 6, phần gateway)

**Files:**
- Create: `core/src/gateway/bridge-token.js`, `core/src/gateway/proxy.js`
- Modify: `core/src/app.js`, `core/src/config/environment.js`, `core/.env.example`, `core/tests/helpers/server.js`, `infra/compose/docker-compose.staging.yml`, `infra/compose/docker-compose.production.yml`, `infra/.env.example`, `infra/scripts/bootstrap-vm.sh`, `tools/tests/compose.test.js`, `tools/tests/infra-bootstrap.test.js`
- Test: `core/tests/units.bridge-token.test.js`, `core/tests/units.gateway.test.js`
- Docs: `docs/dev/api.md`, `docs/dev/kien-truc.md`, `docs/dev/phan-quyen.md`, `docs/dev/ranh-gioi-module.md`, `docs/dev/chay-local.md`, `docs/dev/test.md`, `docs/ops/moi-truong.md`, `docs/ops/deploy-va-nhanh.md`, `docs/ops/vps.md`, `docs/ops/chuyen-doi-ultimate-tckt.md`, `docs/playbooks/them-module.md`, `docs/ai/bat-bien.md`, `docs/ai/kiem-tra.md`

**Interfaces:**
- Consumes: `getModule`, `canUseModule`, `unitHasModule` (Task 1); `req.session.user` (`{id, email, name, …}`), `req.memberships`, `req.unit`, `req.unitRole`; `recordAudit`.
- Produces (hợp đồng cho Lane C và mọi module `gateway`):
  - Claim JWT bridge (HS256, header `{"alg":"HS256","typ":"JWT"}`), đúng thứ tự khoá sau:
    `iss: 'ultimate-tckt-core'`, `aud: <manifest.api.audience>` (CTD: `'ctd'`), `sub: String(core user id)`, `email`, `name`, `unit_id` (id `org_units` của **đơn vị đang chọn**), `unit_code`, `unit_name`, `unit_kind`, `role` (role của membership đó), `iat`, `exp = iat + 60`, `jti` (UUID v4).
  - `signJwt(payload, secret) → string`; `verifyJwt(token, secret, { audience, now, maxTtlSeconds = 60 }) → claims` ném `TokenError` khi: sai định dạng, `alg` ≠ HS256, sai chữ ký, hết hạn, `exp - iat > maxTtlSeconds`, `iat` ở tương lai quá 5 giây, sai `aud`, secret rỗng. `signBridgeToken({ secret, audience, user, unit, role, now = Date.now(), jti }) → string`. Hằng `BRIDGE_ISSUER`, `TTL_SECONDS = 60`.
  - Gateway: `ALL /m/:module/api/v1/<rest>?<query>` → `${bridge.upstreams[module]}/api/v1/<rest>?<query>`, method giữ nguyên, body stream nguyên byte, response (status, header, body) stream nguyên trừ header hop-by-hop, `content-encoding`, `content-length`, `set-cookie`.
    | Điều kiện | Kết quả |
    |---|---|
    | Chưa đăng nhập | 401 `{ error }` |
    | Không có membership | 403 |
    | Module không có trong registry hoặc `api.kind` ≠ `gateway` | 404 |
    | Đơn vị đang chọn chưa bật module (DYC bỏ qua) | 403 |
    | `(unit.kind, unitRole)` không khớp `visible_to` mục nào | 403 |
    | Đoạn path giải mã ra `.`/`..` hoặc chứa `/`, `\`, hoặc `%` hỏng | 400 |
    | `HUB_BRIDGE_SECRET` hoặc upstream chưa cấu hình | 503 |
    | Upstream chưa trả header sau `bridge.timeoutMs` (mặc định 15000) | 504 |
    | Không kết nối được upstream | 502 |
  - Header chuyển lên upstream: chỉ `authorization: Bearer <bridge JWT>`, `x-forwarded-for`, và nếu có: `content-type`, `accept`, `accept-language`, `if-none-match`, `if-modified-since`, `range`. **Không bao giờ** chuyển `cookie` hay `authorization` gốc.
  - DYC (đơn vị đang chọn là `platform_owner`) gọi qua gateway → `audit_logs` `action = cross_unit_read` (GET/HEAD) hoặc `cross_unit_write`, `target_type = 'gateway'`, `target_id = '<METHOD> /m/<module>/api/v1/<path không query>'`, `owner_unit_id = NULL`, `meta.module`.
  - Cấu hình: `config.bridge = { secret, upstreams: { ctd }, timeoutMs }` từ env `HUB_BRIDGE_SECRET`, `CTD_API_URL` (local mặc định `http://localhost:8000`; compose `http://ctd-api:8000`). `context.bridge` có sẵn cho route (Task 3 dùng).
  - Test helper: `startTestServer(db, { config, webDistDir })` (`config` gộp đè lên `testConfig`); `client.request(method, path, { body, rawBody, headers })` trả thêm `text`, `headers`.
- **Ruling ghi trong plan:** tự ký/kiểm HS256 bằng `node:crypto` (HMAC-SHA256 + `timingSafeEqual`), **không** thêm `jsonwebtoken`/`jose`. Lý do: thêm dependency vào `core/package.json` phải raise; HS256 với một bộ claim cố định chỉ vài chục dòng, và test vector vàng dưới đây được pyjwt 2.x giải mã được (kiểm chéo ở Task 4).
- **Ruling ghi trong plan:** `express.json` và `express.urlencoded` **bỏ qua** request có path bắt đầu bằng `/m/`. Lý do: gateway phải chuyển body nguyên byte (multipart upload hồ sơ, JSON lớn hơn 1 MB); nếu parser đã đọc stream thì không còn gì để chuyển.
- **Ruling ghi trong plan:** trong compose, `HUB_BRIDGE_SECRET` dùng `${HUB_BRIDGE_SECRET:-}` (tuỳ chọn), không dùng `:?`. Lý do: VM đã bootstrap trước đây không có biến này; nếu bắt buộc thì lần deploy đầu sau merge làm `docker compose up` fail và **cả Core** không lên. Thiếu secret chỉ làm gateway trả 503 (và CTD từ chối token bridge — Task 4). `bootstrap-vm.sh` tự sinh cho VM mới; VM cũ thêm tay theo runbook ở Step 8.
- **Ruling ghi trong plan:** timeout chỉ tính tới lúc upstream trả header; sau đó body stream không bị cắt. Lý do: tải file hồ sơ lớn có thể lâu hơn 15 giây.
- **Ruling ghi trong plan:** gateway kiểm quyền **module-level** (bật module + `visible_to`); quyền chi tiết trong module (hồ sơ nào, thao tác nào) do upstream quyết theo claim `unit_*`/`role`. Lý do: Core không biết nghiệp vụ CTD; nhân đôi luật sẽ lệch nhau.

- [ ] **Step 1: Write the failing tests**

`core/tests/units.bridge-token.test.js`:

```js
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { signJwt, verifyJwt, signBridgeToken, TokenError, BRIDGE_ISSUER, TTL_SECONDS } = require('../src/gateway/bridge-token');

const SECRET = 'golden-test-secret-khong-dung-that';
const NOW = 1790000000000;
// Vector vàng: CTD (services/ctd-api/backend/tests/test_hub_bridge.py) giải mã đúng chuỗi này bằng pyjwt.
const GOLDEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJ1bHRpbWF0ZS10Y2t0LWNvcmUiLCJhdWQiOiJjdGQiLCJzdWIiOiI0MiIsImVtYWlsIjoiY2FuLmJvQGV4YW1wbGUuZWR1LnZuIiwibmFtZSI6IkPDoW4gQuG7mSBN4bqrdSIsInVuaXRfaWQiOjcsInVuaXRfY29kZSI6IkRFTU8tRFQtMDEiLCJ1bml0X25hbWUiOiJbROG7ryBsaeG7h3UgZ2nhuqNdIMSQb8OgbiB0csaw4budbmcgMDEiLCJ1bml0X2tpbmQiOiJncmFzc3Jvb3RzIiwicm9sZSI6Im9mZmljZXIiLCJpYXQiOjE3OTAwMDAwMDAsImV4cCI6MTc5MDAwMDA2MCwianRpIjoiMDAwMDAwMDAtMDAwMC00MDAwLTgwMDAtMDAwMDAwMDAwMDAxIn0.FsN_pxaY-w8C7tLkBMNfpd80-VkeFf9YwWX_PIEt6aw';

const golden = () => signBridgeToken({
  secret: SECRET, audience: 'ctd', now: NOW, jti: '00000000-0000-4000-8000-000000000001', role: 'officer',
  user: { id: 42, email: 'can.bo@example.edu.vn', name: 'Cán Bộ Mẫu', password_hash: 'không được lọt vào token' },
  unit: { id: 7, code: 'DEMO-DT-01', name: '[Dữ liệu giả] Đoàn trường 01', kind: 'grassroots' }
});

test('signBridgeToken reproduces the golden vector byte for byte', () => {
  assert.equal(golden(), GOLDEN);
  assert.equal(BRIDGE_ISSUER, 'ultimate-tckt-core');
  assert.equal(TTL_SECONDS, 60);
});

test('verifyJwt accepts the golden token inside its 60s window and returns the claims', () => {
  const claims = verifyJwt(GOLDEN, SECRET, { audience: 'ctd', now: NOW + 30000 });
  assert.equal(claims.sub, '42');
  assert.equal(claims.unit_kind, 'grassroots');
  assert.equal(claims.exp - claims.iat, 60);
  assert.equal(claims.password_hash, undefined);
});

test('verifyJwt rejects expired, wrong audience, wrong secret, tampered, alg none, over-long TTL, future iat, malformed, empty secret', () => {
  const bad = [
    () => verifyJwt(GOLDEN, SECRET, { audience: 'ctd', now: NOW + 61000 }),
    () => verifyJwt(GOLDEN, SECRET, { audience: 'core', now: NOW }),
    () => verifyJwt(GOLDEN, 'sai-secret-test', { audience: 'ctd', now: NOW }),
    () => verifyJwt(GOLDEN.replace(/\.[^.]+\./, `.${Buffer.from('{"sub":"1","aud":"ctd","iat":1790000000,"exp":1790000060}').toString('base64url')}.`), SECRET, { audience: 'ctd', now: NOW }),
    () => verifyJwt(`${Buffer.from('{"alg":"none"}').toString('base64url')}.${GOLDEN.split('.')[1]}.`, SECRET, { audience: 'ctd', now: NOW }),
    () => verifyJwt(signJwt({ aud: 'ctd', iat: 1790000000, exp: 1790003600 }, SECRET), SECRET, { audience: 'ctd', now: NOW }),
    () => verifyJwt(signJwt({ aud: 'ctd', iat: 1790000100, exp: 1790000130 }, SECRET), SECRET, { audience: 'ctd', now: NOW }),
    () => verifyJwt('khong.phai.jwt', SECRET, { audience: 'ctd', now: NOW }),
    () => verifyJwt(GOLDEN, '', { audience: 'ctd', now: NOW })
  ];
  for (const [i, fn] of bad.entries()) assert.throws(fn, TokenError, `case ${i}`);
  assert.throws(() => signJwt({}, ''), /HUB_BRIDGE_SECRET/);
});
```

`core/tests/units.gateway.test.js`:

```js
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { createTestDatabase } = require('./helpers/db');
const { startTestServer } = require('./helpers/server');
const { createUser, unitIdByCode } = require('./helpers/fixtures');
const { verifyJwt } = require('../src/gateway/bridge-token');

const SECRET = 'bridge-test-secret-khong-dung-that';
const bridgeConfig = (url, extra = {}) => ({ bridge: { secret: SECRET, upstreams: { ctd: url }, timeoutMs: 300, ...extra } });

function startUpstream(handler) {
  const calls = [];
  const server = http.createServer(async (req, res) => {
    const chunks = [];
    for await (const c of req) chunks.push(c);
    const call = { method: req.method, url: req.url, headers: req.headers, body: Buffer.concat(chunks) };
    calls.push(call);
    await handler(call, res);
  });
  return new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve({
    url: `http://127.0.0.1:${server.address().port}`,
    calls,
    close: () => new Promise(r => { server.closeAllConnections(); server.close(r); })
  })));
}
const okJson = (status = 200, extraHeaders = {}) => (call, res) => {
  res.writeHead(status, { 'Content-Type': 'application/json', ...extraHeaders });
  res.end(JSON.stringify({ ok: true, size: call.body.length }));
};

test('forwards /m/ctd/api/v1/* with a 60s bridge JWT for the current unit; never forwards the cookie', async () => {
  const { pool, teardown } = await createTestDatabase();
  const up = await startUpstream(okJson(201, { 'X-Upstream': 'ctd', 'Set-Cookie': 'x=1' }));
  const { client, close } = await startTestServer(pool, { config: bridgeConfig(up.url) });
  try {
    const u = await createUser(pool, { name: 'Cán bộ Đoàn', units: [['DEMO-DT-01', 'officer']] });
    await client.login(u.email, u.password);
    const r = await client.request('POST', '/m/ctd/api/v1/cases?status=draft', { body: { case_type: 'ket_nap' } });
    assert.equal(r.status, 201);
    assert.deepEqual(r.json, { ok: true, size: '{"case_type":"ket_nap"}'.length });
    assert.equal(r.headers.get('x-upstream'), 'ctd');
    assert.equal(r.headers.get('set-cookie'), null);
    const call = up.calls[0];
    assert.equal(call.method, 'POST');
    assert.equal(call.url, '/api/v1/cases?status=draft');
    assert.equal(call.headers.cookie, undefined);
    assert.equal(call.headers['content-type'], 'application/json');
    assert.equal(call.body.toString(), '{"case_type":"ket_nap"}');
    const claims = verifyJwt(call.headers.authorization.replace(/^Bearer /, ''), SECRET, { audience: 'ctd' });
    assert.equal(claims.iss, 'ultimate-tckt-core');
    assert.equal(claims.sub, String(u.id));
    assert.equal(claims.email, u.email);
    assert.equal(claims.name, 'Cán bộ Đoàn');
    assert.equal(claims.unit_id, await unitIdByCode(pool, 'DEMO-DT-01'));
    assert.equal(claims.unit_code, 'DEMO-DT-01');
    assert.equal(claims.unit_kind, 'grassroots');
    assert.equal(claims.role, 'officer');
    assert.equal(claims.exp - claims.iat, 60);
    assert.match(claims.jti, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  } finally { await close(); await up.close(); await teardown(); }
});

test('body is streamed untouched: a 1.5 MB JSON (over the 1 MB parser limit) arrives byte for byte', async () => {
  const { pool, teardown } = await createTestDatabase();
  const up = await startUpstream(okJson());
  const { client, close } = await startTestServer(pool, { config: bridgeConfig(up.url) });
  try {
    const u = await createUser(pool, { units: [['DEMO-DT-01', 'officer']] });
    await client.login(u.email, u.password);
    const big = JSON.stringify({ blob: 'x'.repeat(1_500_000) });
    const r = await client.request('PUT', '/m/ctd/api/v1/documents/1', { rawBody: big, headers: { 'Content-Type': 'application/json' } });
    assert.equal(r.status, 200);
    assert.equal(up.calls[0].body.toString(), big);
  } finally { await close(); await up.close(); await teardown(); }
});

test('refuses: 401 no session, 403 no membership / module off / role not allowed, 404 unknown or in-process module, 400 escaping path', async () => {
  const { pool, teardown } = await createTestDatabase();
  const up = await startUpstream(okJson());
  const { client, close } = await startTestServer(pool, { config: bridgeConfig(up.url) });
  try {
    assert.equal((await client.request('GET', '/m/ctd/api/v1/cases')).status, 401);
    const nobody = await createUser(pool, { units: [] });
    await client.login(nobody.email, nobody.password);
    assert.equal((await client.request('GET', '/m/ctd/api/v1/cases')).status, 403);
    const member = await createUser(pool, { units: [['TCKT', 'member']] });
    await client.login(member.email, member.password);
    assert.equal((await client.request('GET', '/m/ctd/api/v1/cases')).status, 403);
    const officer = await createUser(pool, { units: [['DEMO-DT-01', 'officer']] });
    await client.login(officer.email, officer.password);
    assert.equal((await client.request('GET', '/m/khong-co/api/v1/cases')).status, 404);
    assert.equal((await client.request('GET', '/m/dieu-hanh/api/v1/activities')).status, 404);
    assert.equal((await client.request('GET', '/m/ctd/api/v1/..%2Fadmin')).status, 400);
    assert.equal((await client.request('GET', '/m/ctd/api/v1/a%5C..%5Cb')).status, 400);
    assert.equal((await client.request('GET', '/m/ctd/api/v1/%E0%A4%A')).status, 400);
    await pool.execute("DELETE FROM unit_modules WHERE unit_id=? AND module_id='ctd'", [await unitIdByCode(pool, 'DEMO-DT-01')]);
    assert.equal((await client.request('GET', '/m/ctd/api/v1/cases')).status, 403);
    assert.equal(up.calls.length, 0, 'nothing may reach the upstream');
  } finally { await close(); await up.close(); await teardown(); }
});

test('503 without secret, 502 when the upstream is down, 504 when it does not answer in time', async () => {
  const { pool, teardown } = await createTestDatabase();
  const slow = await startUpstream(async (_call, res) => { await new Promise(r => setTimeout(r, 1500)); res.end('{}'); });
  const noSecret = await startTestServer(pool, { config: bridgeConfig(slow.url, { secret: '' }) });
  const down = await startTestServer(pool, { config: bridgeConfig('http://127.0.0.1:9') });
  const late = await startTestServer(pool, { config: bridgeConfig(slow.url) });
  try {
    const u = await createUser(pool, { units: [['DEMO-DT-01', 'officer']] });
    for (const [srv, status] of [[noSecret, 503], [down, 502], [late, 504]]) {
      await srv.client.login(u.email, u.password);
      assert.equal((await srv.client.request('GET', '/m/ctd/api/v1/cases')).status, status);
    }
  } finally { await noSecret.close(); await down.close(); await late.close(); await slow.close(); await teardown(); }
});

test('DYC calls through the gateway are audited as cross-unit read/write; unit users are not', async () => {
  const { pool, teardown } = await createTestDatabase();
  const up = await startUpstream(okJson());
  const { client, close } = await startTestServer(pool, { config: bridgeConfig(up.url) });
  try {
    const dyc = await createUser(pool, { units: [['DYC', 'dyc_engineer']] });
    await client.login(dyc.email, dyc.password);
    assert.equal((await client.request('GET', '/m/ctd/api/v1/cases?status=forwarded')).status, 200);
    assert.equal((await client.request('POST', '/m/ctd/api/v1/cases', { body: {} })).status, 200);
    const [rows] = await pool.query('SELECT action, target_type, target_id, owner_unit_id FROM audit_logs WHERE actor_id=? ORDER BY id', [dyc.id]);
    assert.deepEqual(rows.map(r => [r.action, r.target_type, r.target_id, r.owner_unit_id]), [
      ['cross_unit_read', 'gateway', 'GET /m/ctd/api/v1/cases', null],
      ['cross_unit_write', 'gateway', 'POST /m/ctd/api/v1/cases', null]
    ]);
    const officer = await createUser(pool, { units: [['DEMO-DT-01', 'officer']] });
    await client.login(officer.email, officer.password);
    await client.request('GET', '/m/ctd/api/v1/cases');
    const [[{ c }]] = await pool.query('SELECT COUNT(*) c FROM audit_logs WHERE actor_id=?', [officer.id]);
    assert.equal(c, 0);
  } finally { await close(); await up.close(); await teardown(); }
});
```

Thêm vào `tools/tests/compose.test.js` (cuối file):

```js
for (const env of ['staging', 'production']) {
  test(`${env}: core and ctd-api share HUB_BRIDGE_SECRET (optional); services reach each other by name`, () => {
    const y = read(`infra/compose/docker-compose.${env}.yml`);
    assert.equal((y.match(/HUB_BRIDGE_SECRET: \$\{HUB_BRIDGE_SECRET:-\}/g) || []).length, 2);
    assert.match(y, /CTD_API_URL: http:\/\/ctd-api:8000/);
    assert.match(y, /HUB_EVENTS_URL: http:\/\/core:3000\/internal\/events/);
  });
}
```

`tools/tests/infra-bootstrap.test.js` — trong test `bootstrap-vm.sh renames TCKT_ keys, keeps values, generates the settings key`, thêm ngay sau dòng `assert.match(env, /^CORE_SETTINGS_ENCRYPTION_KEY=.{20,}$/m);`:

```js
  assert.match(env, /^HUB_BRIDGE_SECRET=.{20,}$/m);
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd core && node --test tests/units.bridge-token.test.js tests/units.gateway.test.js`
Expected: FAIL — `Cannot find module '../src/gateway/bridge-token'`.

Run: `npm run test:tools`
Expected: FAIL — `HUB_BRIDGE_SECRET` chưa có trong compose / bootstrap.

- [ ] **Step 3: Write minimal implementation**

`core/src/gateway/bridge-token.js`:

```js
'use strict';
const crypto = require('node:crypto');

const BRIDGE_ISSUER = 'ultimate-tckt-core';
const TTL_SECONDS = 60;
const CLOCK_SKEW_SECONDS = 5;

class TokenError extends Error {}

const b64json = obj => Buffer.from(JSON.stringify(obj)).toString('base64url');
const hmac = (secret, data) => crypto.createHmac('sha256', secret).update(data).digest();

function signJwt(payload, secret) {
  if (!secret) throw new Error('HUB_BRIDGE_SECRET is not set');
  const head = b64json({ alg: 'HS256', typ: 'JWT' });
  const body = b64json(payload);
  return `${head}.${body}.${hmac(secret, `${head}.${body}`).toString('base64url')}`;
}

function verifyJwt(token, secret, { audience, now = Date.now(), maxTtlSeconds = TTL_SECONDS } = {}) {
  if (!secret) throw new TokenError('secret not set');
  const parts = String(token || '').split('.');
  if (parts.length !== 3) throw new TokenError('malformed');
  const [head, body, sig] = parts;
  let header;
  let payload;
  try {
    header = JSON.parse(Buffer.from(head, 'base64url').toString('utf8'));
    payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
  } catch {
    throw new TokenError('malformed');
  }
  if (header?.alg !== 'HS256') throw new TokenError('alg');
  const expected = hmac(secret, `${head}.${body}`);
  const given = Buffer.from(sig, 'base64url');
  if (given.length !== expected.length || !crypto.timingSafeEqual(given, expected)) throw new TokenError('signature');
  const t = Math.floor(now / 1000);
  if (!Number.isInteger(payload?.exp) || !Number.isInteger(payload?.iat)) throw new TokenError('iat/exp');
  if (payload.exp <= t) throw new TokenError('expired');
  if (payload.iat > t + CLOCK_SKEW_SECONDS) throw new TokenError('iat in future');
  if (payload.exp - payload.iat > maxTtlSeconds) throw new TokenError('ttl');
  if (audience !== undefined && payload.aud !== audience) throw new TokenError('audience');
  return payload;
}

function signBridgeToken({ secret, audience, user, unit, role, now = Date.now(), jti = crypto.randomUUID() }) {
  const iat = Math.floor(now / 1000);
  return signJwt({
    iss: BRIDGE_ISSUER,
    aud: audience,
    sub: String(user.id),
    email: user.email,
    name: user.name,
    unit_id: unit.id,
    unit_code: unit.code,
    unit_name: unit.name,
    unit_kind: unit.kind,
    role,
    iat,
    exp: iat + TTL_SECONDS,
    jti
  }, secret);
}

module.exports = { signJwt, verifyJwt, signBridgeToken, TokenError, BRIDGE_ISSUER, TTL_SECONDS };
```

`core/src/gateway/proxy.js`:

```js
'use strict';
const { Readable } = require('node:stream');
const { getModule, canUseModule, unitHasModule } = require('../registry');
const { signBridgeToken } = require('./bridge-token');
const { recordAudit } = require('../services/audit');

const FORWARD_REQUEST_HEADERS = ['content-type', 'accept', 'accept-language', 'if-none-match', 'if-modified-since', 'range'];
const DROP_RESPONSE_HEADERS = new Set(['connection', 'keep-alive', 'transfer-encoding', 'content-encoding', 'content-length', 'set-cookie', 'trailer', 'upgrade']);
const READ = new Set(['GET', 'HEAD']);

// Trả phần sau /m/<id>/api/v1 (gồm query) hoặc null nếu có đoạn path thoát ra ngoài.
function upstreamSuffix(originalUrl, moduleId) {
  const rest = originalUrl.slice(`/m/${moduleId}/api/v1`.length);
  const q = rest.indexOf('?');
  const pathPart = q === -1 ? rest : rest.slice(0, q);
  const query = q === -1 ? '' : rest.slice(q);
  if (pathPart && !pathPart.startsWith('/')) return null;
  for (const seg of pathPart.split('/').slice(1)) {
    let decoded;
    try { decoded = decodeURIComponent(seg); } catch { return null; }
    if (decoded === '.' || decoded === '..' || decoded.includes('/') || decoded.includes('\\')) return null;
  }
  return `${pathPart}${query}`;
}

function createGateway({ db, bridge, logger }) {
  return async function gateway(req, res, next) {
    try {
      if (!req.session?.user) return res.status(401).json({ error: 'Chưa đăng nhập.' });
      if (!req.memberships?.length || !req.unit) return res.status(403).json({ error: 'Tài khoản chưa thuộc đơn vị nào.' });
      const mod = getModule(req.params.module);
      if (!mod || mod.api.kind !== 'gateway') return res.status(404).json({ error: 'Không có module này.' });
      if (!(await unitHasModule(db, req.unit, mod.id))) return res.status(403).json({ error: 'Đơn vị đang chọn chưa bật module này.' });
      if (!canUseModule(mod, req.unit.kind, req.unitRole)) return res.status(403).json({ error: 'Vai trò hiện tại không dùng được module này.' });
      const suffix = upstreamSuffix(req.originalUrl, mod.id);
      if (suffix === null) return res.status(400).json({ error: 'Đường dẫn không hợp lệ.' });
      const upstream = bridge?.upstreams?.[mod.id];
      if (!bridge?.secret || !upstream) return res.status(503).json({ error: 'Module chưa được cấu hình kết nối.' });

      if (req.unit.kind === 'platform_owner') {
        await recordAudit(db, {
          actorId: req.session.user.id,
          actorUnitId: req.unit.id,
          action: READ.has(req.method) ? 'cross_unit_read' : 'cross_unit_write',
          targetType: 'gateway',
          targetId: `${req.method} /m/${mod.id}/api/v1${suffix.split('?')[0]}`,
          ownerUnitId: null,
          meta: { module: mod.id }
        });
      }

      const token = signBridgeToken({ secret: bridge.secret, audience: mod.api.audience, user: req.session.user, unit: req.unit, role: req.unitRole });
      const headers = { authorization: `Bearer ${token}` };
      if (req.ip) headers['x-forwarded-for'] = req.ip;
      for (const h of FORWARD_REQUEST_HEADERS) if (req.headers[h]) headers[h] = req.headers[h];
      const hasBody = !READ.has(req.method);

      const controller = new AbortController();
      let timedOut = false;
      const timer = setTimeout(() => { timedOut = true; controller.abort(); }, bridge.timeoutMs || 15000);
      let upstreamRes;
      try {
        upstreamRes = await fetch(`${upstream}/api/v1${suffix}`, {
          method: req.method,
          headers,
          body: hasBody ? Readable.toWeb(req) : undefined,
          duplex: hasBody ? 'half' : undefined,
          redirect: 'manual',
          signal: controller.signal
        });
      } catch (error) {
        logger?.warn?.(`Gateway ${mod.id} ${timedOut ? 'timeout' : 'upstream error'}: ${error.message}`);
        return res.status(timedOut ? 504 : 502).json({ error: timedOut ? 'Module phản hồi quá lâu.' : 'Không kết nối được module.' });
      } finally {
        clearTimeout(timer);
      }

      res.status(upstreamRes.status);
      upstreamRes.headers.forEach((value, key) => { if (!DROP_RESPONSE_HEADERS.has(key)) res.setHeader(key, value); });
      if (!upstreamRes.body || req.method === 'HEAD') return res.end();
      Readable.fromWeb(upstreamRes.body).on('error', () => res.destroy()).pipe(res);
    } catch (error) {
      next(error);
    }
  };
}

module.exports = { createGateway, upstreamSuffix };
```

`core/src/config/environment.js` — thêm trước `module.exports`:

```js
const bridge = {
  secret: process.env.HUB_BRIDGE_SECRET || '',
  upstreams: { ctd: String(process.env.CTD_API_URL || 'http://localhost:8000').replace(/\/$/, '') },
  timeoutMs: 15000
};
```

và thêm `bridge,` vào object `module.exports`.

`core/src/app.js`:
1. `const { createGateway } = require('./gateway/proxy');`
2. Thay hai dòng body parser bằng:
   ```js
   // Gateway /m/* chuyển body nguyên byte sang module — không được để parser đọc mất stream.
   const unlessModuleProxy = mw => (req, res, next) => (req.path.startsWith('/m/') ? next() : mw(req, res, next));
   app.use(unlessModuleProxy(express.json({ limit: '1mb' })));
   app.use(unlessModuleProxy(express.urlencoded({ extended: false })));
   ```
3. Ngay sau `app.use(createUnitContext(db));`:
   ```js
   app.all('/m/:module/api/v1{/*rest}', createGateway({ db, bridge: runtimeConfig.bridge, logger }));
   ```
4. Trong object `context` thêm `bridge: runtimeConfig.bridge,`.

`core/tests/helpers/server.js` — thay `makeClient.request` và `startTestServer`:

```js
  async function request(method, urlPath, { body, rawBody, headers = {} } = {}) {
    const raw = rawBody !== undefined;
    const response = await fetch(`${baseUrl}${urlPath}`, {
      method,
      headers: { ...(raw ? {} : { 'Content-Type': 'application/json' }), ...(cookie ? { Cookie: cookie } : {}), ...headers },
      body: raw ? rawBody : (body !== undefined ? JSON.stringify(body) : undefined)
    });
    const setCookie = response.headers.get('set-cookie');
    if (setCookie) cookie = setCookie.split(';')[0];
    const text = await response.text();
    let json = null;
    try { json = text ? JSON.parse(text) : null; } catch { json = null; }
    return { status: response.status, json, text, headers: response.headers };
  }
```

```js
function startTestServer(db, options = {}) {
  const config = { ...testConfig, ...(options.config || {}) };
  const { app } = createApplication({ db, config, webDistDir: options.webDistDir });
  const server = http.createServer(app);
  return new Promise(resolve => {
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      const baseUrl = `http://127.0.0.1:${port}`;
      resolve({ baseUrl, client: makeClient(baseUrl), close: () => new Promise(r => { server.closeAllConnections(); server.close(r); }) });
    });
  });
}
```

`core/.env.example` — thêm cuối file:

```
# JWT bridge sang module (CTD) và nhận event từ module. Để trống = gateway /m/* trả 503.
# Phải trùng HUB_BRIDGE_SECRET của CTD. Sinh: openssl rand -base64 32
HUB_BRIDGE_SECRET=
CTD_API_URL=http://localhost:8000
```

`infra/compose/docker-compose.staging.yml` và `docker-compose.production.yml`:
- service `core` → `environment:` thêm
  ```yaml
      HUB_BRIDGE_SECRET: ${HUB_BRIDGE_SECRET:-}
      CTD_API_URL: http://ctd-api:8000
  ```
- service `ctd-api` → `environment:` thêm
  ```yaml
      HUB_BRIDGE_SECRET: ${HUB_BRIDGE_SECRET:-}
      HUB_EVENTS_URL: http://core:3000/internal/events
  ```

`infra/.env.example` — thêm cuối file:

```
# openssl rand -base64 32 — dùng chung cho core và ctd-api (JWT bridge + event). Bootstrap tự sinh nếu thiếu.
HUB_BRIDGE_SECRET=
```

`infra/scripts/bootstrap-vm.sh` — ngay sau khối sinh `CORE_SETTINGS_ENCRYPTION_KEY`:

```bash
if ! grep -Eq '^HUB_BRIDGE_SECRET=.+' "$TMP"; then
  sed -i.bak '/^HUB_BRIDGE_SECRET=/d' "$TMP" && rm -f "$TMP.bak"
  echo "HUB_BRIDGE_SECRET=$(openssl rand -base64 32)" >> "$TMP"
fi
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd core && node --test tests/units.bridge-token.test.js tests/units.gateway.test.js`
Expected: PASS 8/8

Run: `npm run test:tools`
Expected: `fail 0`

- [ ] **Step 5: Run full suite**

Run: `cd core && npm test > /tmp/core.log 2>&1; grep -E "^ℹ (tests|pass|fail)" /tmp/core.log`
Expected: `fail 0`

- [ ] **Step 6: Docs**

- `docs/dev/api.md`: mục "Gateway module" — đường dẫn, bảng lỗi, header được chuyển, claim JWT bridge (bảng khoá + ý nghĩa), audit DYC. Mở rộng dòng lịch sử GĐ1-A2.
- `docs/dev/kien-truc.md`: sơ đồ middleware mới: helmet → body parser (trừ `/m/`) → session → static → `loadUnitContext` → **gateway `/m/:module/api/v1/*`** → `legacyGate` → routes. Mở rộng dòng lịch sử.
- `docs/dev/phan-quyen.md`: mục "Quyền qua gateway" (module-level ở Core, chi tiết ở module; DYC có audit). Bump.
- `docs/dev/ranh-gioi-module.md`: Nền thêm `core/src/gateway/**`; hợp đồng dùng chung thêm "claim JWT bridge". Mở rộng dòng lịch sử.
- `docs/dev/chay-local.md`: đặt `HUB_BRIDGE_SECRET` giống nhau ở `core/.env` và `services/ctd-api/backend/.env` để thử tab CTD local; không đặt thì `/m/ctd/*` trả 503. Bump.
- `docs/dev/test.md`: `startTestServer(db, { config, webDistDir })`, `rawBody`; hai file test mới. Mở rộng dòng lịch sử.
- `docs/ops/moi-truong.md` §4: thêm `HUB_BRIDGE_SECRET` (core + ctd-api, tuỳ chọn, thiếu → 503/401), `CTD_API_URL`, `HUB_EVENTS_URL` (giá trị cố định trong compose). Bump.
- `docs/ops/deploy-va-nhanh.md`: mục "Deploy GĐ1-A2": trước khi merge vào `staging`/`main`, trên VM chạy `grep -q '^HUB_BRIDGE_SECRET=.' /opt/ultimate-tckt/<env>/infra/.env || echo "HUB_BRIDGE_SECRET=$(openssl rand -base64 32)" >> /opt/ultimate-tckt/<env>/infra/.env` (mỗi môi trường một secret riêng; không chép secret giữa môi trường, không dán vào chat/issue). Bump.
- `docs/ops/vps.md`, `docs/ops/chuyen-doi-ultimate-tckt.md`: bootstrap tự sinh `HUB_BRIDGE_SECRET`. Bump.
- `docs/playbooks/them-module.md`: module kiểu `gateway` cần: manifest `api.audience`, upstream trong `config.bridge.upstreams`, biến URL trong compose theo tên service, kiểm token bridge ở module. Mở rộng dòng lịch sử.
- `docs/ai/bat-bien.md`: bất biến mới "Gateway không bao giờ chuyển `Cookie` sang module; module chỉ tin JWT bridge `aud` của mình". Mở rộng dòng lịch sử.
- `docs/ai/kiem-tra.md`: `npm run test:tools` kiểm biến bridge trong compose/bootstrap. Bump.

- [ ] **Step 7: Commit**

```bash
npm run docs:index && npm run docs:check -- --base origin/staging
git add core/src core/tests core/.env.example infra/ tools/tests docs/
git commit -m "feat(core): JWT bridge and module gateway /m/:module/api/v1"
```

- [ ] **Step 8: Runbook trước khi deploy (không phải code)**

Ghi vào mô tả PR: "Trước khi merge, DYC thêm `HUB_BRIDGE_SECRET` vào `infra/.env` trên VM của từng môi trường (lệnh ở `docs/ops/deploy-va-nhanh.md` mục Deploy GĐ1-A2). Thiếu thì Core vẫn chạy, chỉ tab CTD trả 503."

---

### Task 3: `POST /internal/events` — module gửi event về Core (spec mục 6, phần event)

**Files:**
- Create: `core/src/routes/internal-events.js`
- Modify: `core/src/routes/index.js`, `core/src/config/migrate-units.js` (bảng `module_events`), `infra/nginx/staging/core.conf`, `infra/nginx/production/core.conf`
- Test: `core/tests/units.internal-events.test.js`
- Docs: `docs/dev/api.md`, `docs/dev/db-migration.md`, `docs/playbooks/doi-schema.md`, `docs/ops/moi-truong.md`, `docs/ops/deploy-va-nhanh.md`, `docs/ai/bat-bien.md`, `docs/dev/test.md`, `docs/dev/ranh-gioi-module.md`

**Interfaces:**
- Consumes: `verifyJwt`, `TokenError` (Task 2); `getModule` (Task 1); `context.bridge` (Task 2); `emailEvents.getEvent`, `emailEvents.emit`.
- Produces (hợp đồng cho Lane C mục 20 và Lane E mục 24):
  - `POST /internal/events`, header `Authorization: Bearer <JWT>`; JWT HS256 cùng `HUB_BRIDGE_SECRET`, `iss = <module id có api.kind 'gateway'>` (CTD: `'ctd'`), `aud = 'core'`, `iat`, `exp`, `exp - iat ≤ 60`.
  - Body JSON: `{ type, idempotency_key, occurred_at, payload }`.
    - `type`: `^[a-z][a-z0-9-]*(\.[a-z0-9_]+)+$`, tối đa 80 ký tự, **bắt đầu bằng `<iss>.`** (vd. `ctd.case_forwarded`).
    - `idempotency_key`: `^[A-Za-z0-9._:-]{1,100}$`, duy nhất theo `(source_module, idempotency_key)`.
    - `occurred_at`: chuỗi ISO 8601 parse được.
    - `payload`: object JSON (không phải mảng), `JSON.stringify(payload)` ≤ 65536 byte.
  - Kết quả: 202 `{ id, duplicate: false }` lần đầu; 200 `{ id, duplicate: true }` khi trùng khoá (không phát lại email); 400 `{ error }` sai body; 401 thiếu/sai token hoặc `iss` không phải module gateway; 413 payload quá lớn; 503 Core chưa có `HUB_BRIDGE_SECRET`.
  - Bảng `module_events(id, source_module, type, idempotency_key, occurred_at, payload, received_at, dispatched_at)`, UNIQUE `(source_module, idempotency_key)`.
  - Nếu `type` đã được đăng ký bằng `registerEmailEvent(type, …)` thì Core gọi `emailEvents.emit(db, type, payload, { logger })` và ghi `dispatched_at`; chưa đăng ký thì chỉ lưu. Lane E đăng ký event `ctd.*` ở mục 24 là email chạy mà không phải sửa route này.
  - Từ trong Docker network, CTD gọi `http://core:3000/internal/events` (biến `HUB_EVENTS_URL`, Task 2). Từ Internet, nginx trả 404 cho mọi `/internal/`.
- **Ruling ghi trong plan:** namespace của `type` bắt buộc là id module phát (`iss`). Lý do: một module không được giả event của module khác hay của Core (`activity.*`, `system.*`) để kích hoạt rule email.
- **Ruling ghi trong plan:** mọi event hợp lệ đều được lưu, kể cả loại chưa đăng ký; chỉ loại đã `registerEmailEvent` mới được dispatch. Lý do: CTD (Lane C) có thể phát event trước khi Lane E làm xong rule; lưu lại để phát lại/đối soát, không làm CTD phải retry vô hạn.
- **Ruling ghi trong plan:** chặn `/internal/` ở nginx (cả hai môi trường) thay vì chỉ dựa vào JWT. Lý do: phòng thủ hai lớp; endpoint này chỉ dành cho service trong cùng Docker network.
- **Ruling ghi trong plan:** dùng **một** `HUB_BRIDGE_SECRET` cho cả hai chiều, phân biệt bằng `aud` (`ctd` chiều đi, `core` chiều về) và `iss`. Lý do: bớt một secret phải xoay vòng trên VM; token chiều đi không dùng được ở chiều về vì sai `aud`, và ngược lại (có test ở đây và Task 4).

- [ ] **Step 1: Write the failing test**

`core/tests/units.internal-events.test.js`:

```js
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { createTestDatabase } = require('./helpers/db');
const { startTestServer } = require('./helpers/server');
const { signJwt, signBridgeToken } = require('../src/gateway/bridge-token');
const emailEvents = require('../src/services/email-events');

const SECRET = 'events-test-secret-khong-dung-that';
const config = { bridge: { secret: SECRET, upstreams: { ctd: 'http://127.0.0.1:9' }, timeoutMs: 300 } };
const now = () => Math.floor(Date.now() / 1000);
const token = (claims = {}) => signJwt({ iss: 'ctd', aud: 'core', iat: now(), exp: now() + 60, jti: 'test-jti', ...claims }, SECRET);
const event = (over = {}) => ({ type: 'ctd.case_forwarded', idempotency_key: 'case-1:forwarded', occurred_at: '2026-09-24T08:00:00Z', payload: { case_id: 1 }, ...over });
const post = (client, body, bearer = token()) => client.request('POST', '/internal/events', { body, headers: bearer === null ? {} : { Authorization: `Bearer ${bearer}` } });

test('stores a valid event once (202), a replay is a duplicate (200), unregistered types are not dispatched', async () => {
  const { pool, teardown } = await createTestDatabase();
  const { client, close } = await startTestServer(pool, { config });
  try {
    const first = await post(client, event());
    assert.equal(first.status, 202);
    assert.equal(first.json.duplicate, false);
    const again = await post(client, event({ payload: { case_id: 999 } }));
    assert.equal(again.status, 200);
    assert.deepEqual(again.json, { id: first.json.id, duplicate: true });
    const [rows] = await pool.query('SELECT source_module, type, idempotency_key, payload, dispatched_at FROM module_events');
    assert.equal(rows.length, 1);
    assert.equal(rows[0].source_module, 'ctd');
    assert.equal(rows[0].type, 'ctd.case_forwarded');
    assert.deepEqual(rows[0].payload, { case_id: 1 });
    assert.equal(rows[0].dispatched_at, null);
  } finally { await close(); await teardown(); }
});

test('registered event types are dispatched to the email rule engine exactly once', async () => {
  const { pool, teardown } = await createTestDatabase();
  const { client, close } = await startTestServer(pool, { config });
  const originalEmit = emailEvents.emit;
  const emitted = [];
  emailEvents.emit = (_db, key, payload) => { emitted.push([key, payload]); };
  emailEvents.registerEmailEvent('ctd.test_dispatch', { fields: [] });
  try {
    assert.equal((await post(client, event({ type: 'ctd.test_dispatch', idempotency_key: 'd-1' }))).status, 202);
    assert.equal((await post(client, event({ type: 'ctd.test_dispatch', idempotency_key: 'd-1' }))).status, 200);
    assert.deepEqual(emitted, [['ctd.test_dispatch', { case_id: 1 }]]);
    const [[row]] = await pool.query("SELECT dispatched_at FROM module_events WHERE idempotency_key='d-1'");
    assert.notEqual(row.dispatched_at, null);
  } finally { emailEvents.emit = originalEmit; await close(); await teardown(); }
});

test('rejects bad tokens (401), foreign namespaces and bad bodies (400), oversized payloads (413)', async () => {
  const { pool, teardown } = await createTestDatabase();
  const { client, close } = await startTestServer(pool, { config });
  try {
    const bridgeToCtd = signBridgeToken({ secret: SECRET, audience: 'ctd', role: 'officer', user: { id: 1, email: 'a@example.edu.vn', name: 'A' }, unit: { id: 7, code: 'X', name: 'X', kind: 'grassroots' } });
    for (const bearer of [null, 'khong.phai.jwt', bridgeToCtd, token({ iss: 'dieu-hanh' }), token({ iss: 'khong-co' }),
      token({ iat: now() - 120, exp: now() - 60 }), token({ exp: now() + 3600 }), signJwt({ iss: 'ctd', aud: 'core', iat: now(), exp: now() + 60 }, 'sai-secret-test')]) {
      assert.equal((await post(client, event(), bearer)).status, 401, String(bearer).slice(0, 20));
    }
    for (const body of [
      event({ type: 'activity.approved' }), event({ type: 'ctd' }), event({ type: `ctd.${'x'.repeat(80)}` }),
      event({ idempotency_key: '' }), event({ idempotency_key: 'có dấu' }), event({ idempotency_key: 'k'.repeat(101) }),
      event({ occurred_at: 'hôm qua' }), event({ occurred_at: undefined }),
      event({ payload: [1, 2] }), event({ payload: 'chuỗi' }), event({ payload: null })
    ]) {
      assert.equal((await post(client, body)).status, 400, JSON.stringify(body).slice(0, 60));
    }
    assert.equal((await post(client, event({ payload: { blob: 'x'.repeat(70000) } }))).status, 413);
    const [[{ c }]] = await pool.query('SELECT COUNT(*) c FROM module_events');
    assert.equal(c, 0);
  } finally { await close(); await teardown(); }
});

test('503 when Core has no HUB_BRIDGE_SECRET', async () => {
  const { pool, teardown } = await createTestDatabase();
  const { client, close } = await startTestServer(pool, { config: { bridge: { ...config.bridge, secret: '' } } });
  try {
    assert.equal((await post(client, event())).status, 503);
  } finally { await close(); await teardown(); }
});
```

Thêm vào `tools/tests/compose.test.js` (cuối file):

```js
for (const env of ['staging', 'production']) {
  test(`${env}: nginx never exposes /internal/ from the Internet`, () => {
    assert.match(read(`infra/nginx/${env}/core.conf`), /location \/internal\/ \{\s*return 404;\s*\}/);
  });
}
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd core && node --test tests/units.internal-events.test.js`
Expected: FAIL — `POST /internal/events` trả 404 (chưa có route).

Run: `npm run test:tools`
Expected: FAIL — `core.conf` chưa có `location /internal/`.

- [ ] **Step 3: Write minimal implementation**

`core/src/config/migrate-units.js` — thêm phần tử cuối mảng `TABLES` (sau `ops_log_attendance`):

```js
  ['module_events', `CREATE TABLE module_events (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    source_module VARCHAR(40) NOT NULL,
    type VARCHAR(80) NOT NULL,
    idempotency_key VARCHAR(100) NOT NULL,
    occurred_at DATETIME NOT NULL,
    payload JSON NOT NULL,
    received_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    dispatched_at DATETIME NULL,
    UNIQUE KEY module_events_idem (source_module, idempotency_key),
    INDEX module_events_type (type, received_at)) ${T}`]
```

`core/src/routes/internal-events.js`:

```js
'use strict';
const express = require('express');
const { verifyJwt } = require('../gateway/bridge-token');
const { getModule } = require('../registry');

const TYPE_RE = /^[a-z][a-z0-9-]*(\.[a-z0-9_]+)+$/;
const KEY_RE = /^[A-Za-z0-9._:-]{1,100}$/;
const MAX_PAYLOAD_BYTES = 65536;

// Chuỗi ISO 8601 → DATETIME UTC 'YYYY-MM-DD HH:MM:SS' cho MySQL; null nếu không hợp lệ.
function isoToDatetime(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T/.test(value)) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 19).replace('T', ' ');
}

function createInternalEventRoutes(context) {
  const { db, asyncRoute, bridge, emailEvents, logger } = context;
  const router = express.Router();

  router.post('/internal/events', asyncRoute(async (req, res) => {
    if (!bridge?.secret) return res.status(503).json({ error: 'HUB_BRIDGE_SECRET chưa được cấu hình.' });
    const m = /^Bearer (.+)$/.exec(req.get('authorization') || '');
    if (!m) return res.status(401).json({ error: 'Thiếu token.' });
    let claims;
    try { claims = verifyJwt(m[1], bridge.secret, { audience: 'core' }); } catch { return res.status(401).json({ error: 'Token không hợp lệ.' }); }
    const source = getModule(claims.iss);
    if (!source || source.api.kind !== 'gateway') return res.status(401).json({ error: 'Nguồn event không hợp lệ.' });

    const { type, idempotency_key: key, occurred_at: occurredAt, payload } = req.body || {};
    if (typeof type !== 'string' || type.length > 80 || !TYPE_RE.test(type) || !type.startsWith(`${source.id}.`)) {
      return res.status(400).json({ error: `type phải có dạng ${source.id}.<tên>.` });
    }
    if (typeof key !== 'string' || !KEY_RE.test(key)) return res.status(400).json({ error: 'idempotency_key không hợp lệ.' });
    const occurred = isoToDatetime(occurredAt);
    if (!occurred) return res.status(400).json({ error: 'occurred_at phải là thời điểm ISO 8601.' });
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return res.status(400).json({ error: 'payload phải là object.' });
    const json = JSON.stringify(payload);
    if (Buffer.byteLength(json) > MAX_PAYLOAD_BYTES) return res.status(413).json({ error: 'payload quá lớn.' });

    let id;
    try {
      const [result] = await db.execute(
        'INSERT INTO module_events(source_module,type,idempotency_key,occurred_at,payload) VALUES (?,?,?,?,?)',
        [source.id, type, key, occurred, json]
      );
      id = result.insertId;
    } catch (error) {
      if (error.code !== 'ER_DUP_ENTRY') throw error;
      const [[row]] = await db.execute('SELECT id FROM module_events WHERE source_module=? AND idempotency_key=?', [source.id, key]);
      return res.status(200).json({ id: row.id, duplicate: true });
    }

    if (emailEvents.getEvent(type)) {
      emailEvents.emit(db, type, payload, { logger });
      await db.execute('UPDATE module_events SET dispatched_at=NOW() WHERE id=?', [id]);
    }
    res.status(202).json({ id, duplicate: false });
  }));

  return router;
}

module.exports = { createInternalEventRoutes };
```

`core/src/routes/index.js` — thêm `const { createInternalEventRoutes } = require('./internal-events');` và `app.use(createInternalEventRoutes(context));` ở cuối `registerRoutes`.

`infra/nginx/staging/core.conf` và `infra/nginx/production/core.conf` — trong khối `server` có `listen 443 ssl`, thêm **trước** `location / {`:

```nginx
    # /internal/* chỉ dành cho service trong Docker network (ctd-api → core:3000).
    location /internal/ { return 404; }

```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd core && node --test tests/units.internal-events.test.js`
Expected: PASS 4/4

Run: `npm run test:tools`
Expected: `fail 0`

- [ ] **Step 5: Run full suite**

Run: `cd core && npm test > /tmp/core.log 2>&1; grep -E "^ℹ (tests|pass|fail)" /tmp/core.log`
Expected: `fail 0`

- [ ] **Step 6: Docs**

- `docs/dev/api.md`: mục "`POST /internal/events`" (claim, body, bảng mã trả về, quy tắc namespace, lưu và dispatch). Mở rộng dòng lịch sử GĐ1-A2.
- `docs/dev/db-migration.md`, `docs/playbooks/doi-schema.md`: bảng `module_events` (tạo trong `migrate-units.js`, không backfill). Bump.
- `docs/ops/moi-truong.md`: nginx chặn `/internal/`; CTD gọi Core qua `HUB_EVENTS_URL`. Mở rộng dòng lịch sử.
- `docs/ops/deploy-va-nhanh.md`: `apply-infra` phải chạy để nginx nhận `location /internal/`. Mở rộng dòng lịch sử.
- `docs/ai/bat-bien.md`: "event từ module phải có `type` bắt đầu bằng `<iss>.`; `/internal/` không bao giờ mở ra Internet". Mở rộng dòng lịch sử.
- `docs/dev/test.md`: test mới. Mở rộng dòng lịch sử.
- `docs/dev/ranh-gioi-module.md`: hợp đồng dùng chung thêm "định dạng event `/internal/events`". Mở rộng dòng lịch sử.

- [ ] **Step 7: Commit**

```bash
npm run docs:index && npm run docs:check -- --base origin/staging
git add core/src core/tests infra/nginx tools/tests docs/
git commit -m "feat(core): /internal/events endpoint for module events"
```

---

### Task 4: CTD nhận JWT bridge và `/api/v1` (spec mục 16, bản tối thiểu)

**Files:**
- Create: `services/ctd-api/backend/app/infra/hub_bridge.py`, `services/ctd-api/backend/app/services/hub_users.py`, `services/ctd-api/backend/app/api/v1.py`, `services/ctd-api/backend/app/schemas/v1.py`, `services/ctd-api/backend/alembic/versions/5b1e2c3d4f60_them_hub_id.py`
- Modify: `services/ctd-api/backend/app/config.py`, `services/ctd-api/backend/app/deps.py`, `services/ctd-api/backend/app/main.py`, `services/ctd-api/backend/app/models/identity.py`, `services/ctd-api/backend/.env.example`, `services/ctd-api/backend/tests/test_config.py`
- Test: `services/ctd-api/backend/tests/test_hub_bridge.py`
- Docs: `docs/playbooks/doi-quyen.md`, `docs/dev/phan-quyen.md`, `docs/dev/api.md`, `docs/playbooks/doi-schema.md`, `docs/dev/db-migration.md`, `docs/dev/kien-truc.md`, `docs/playbooks/them-module.md`, `docs/dev/test.md`, `docs/dev/chay-local.md`

**Interfaces:**
- Consumes: claim JWT bridge (Task 2), vector vàng ở `core/tests/units.bridge-token.test.js`; hợp đồng `/internal/events` (Task 3).
- Produces (cho Lane C mục 17–20):
  - `app.infra.hub_bridge`: `HUB_ISSUER = "ultimate-tckt-core"`, `AUDIENCE = "ctd"`, `MODULE_ID = "ctd"`, `MAX_TTL_SECONDS = 60`, `BridgeTokenError`, `is_bridge_token(token) -> bool`, `verify_bridge_token(token, secret=None) -> dict`, `sign_event_token(now=None, secret=None) -> str` (JWT `iss="ctd"`, `aud="core"`, TTL 60 giây — Lane C dùng để gọi `HUB_EVENTS_URL`).
  - `app.services.hub_users`: `map_hub_role(claims) -> Role | None` (**MẶC ĐỊNH TẠM**: luôn `None`; Lane C mục 17 thay bằng bảng ánh xạ), `sync_hub_user(db, claims) -> User`.
  - `deps.current_user` nhận **cả hai** loại token: token local CTD (như cũ) và JWT bridge (`iss = HUB_ISSUER`). Bridge sai/hết hạn/sai `aud`/secret chưa đặt → 401 `"Phiên Hub không hợp lệ."`.
  - Cột mới: `app_user.hub_user_id` (INT NULL UNIQUE — id user bên Core), `unit.hub_unit_id` (INT NULL UNIQUE — id `org_units` bên Core; Lane C mục 17 điền). Role mới `Role.CHUA_CO_QUYEN = "chua_co_quyen"`.
  - Router `/api/v1` (đích của gateway `/m/ctd/api/v1/*`): trong task này chỉ có `GET /api/v1/me` → `{ id, hub_user_id, email, full_name, role, unit_id }`. Lane C thêm các route `/api/v1/*` khác vào `app/api/v1.py` (hoặc router con include vào đó).
  - Cấu hình: `HUB_BRIDGE_SECRET` (rỗng = từ chối mọi token bridge), `HUB_EVENTS_URL` (rỗng = chưa gửi event).
- **Ruling ghi trong plan:** tạo router mới `/api/v1` thay vì đổi prefix các router hiện có. Lý do: frontend CTD cũ và sinh viên đăng nhập OTP vẫn gọi `/api/*`; design §8.1 yêu cầu `/api/v1` cho đường qua Hub, và chưa mục nào trong `tasks.md` nhận việc đổi prefix — đổi ở đây sẽ phá frontend CTD mà không có lane nào sửa.
- **Ruling ghi trong plan:** chọn nhánh xác thực bằng cách đọc `iss` **chưa kiểm chữ ký**; sau đó nhánh bridge kiểm đầy đủ bằng `HUB_BRIDGE_SECRET`. Lý do: đọc `iss` chỉ để chọn khoá; token local giả `iss` sẽ bị kiểm bằng khoá bridge và fail (có test), còn token bridge không bao giờ được kiểm bằng `JWT_SECRET`.
- **Ruling ghi trong plan:** user từ Hub trùng email với user CTD cũ chưa có `hub_user_id` thì **nhận luôn** user đó (gắn `hub_user_id`, giữ role/unit cũ). Lý do: cán bộ đã dùng CTD trước khi gộp không mất hồ sơ và quyền; email phía Core đã được xác thực (SSO HUST hoặc do admin tạo). Nếu email đã thuộc user khác có `hub_user_id` thì user mới dùng email giữ chỗ `hub-<id>@hub.invalid` để không va UNIQUE.
- **Ruling ghi trong plan:** user mới từ Hub nhận role `chua_co_quyen`, `unit_id = NULL` cho tới mục 17 — kể cả khi đã có `unit.hub_unit_id` khớp claim. Lý do: brief chỉ giao mục 16 tối thiểu; gán quyền theo đoán sẽ mở dữ liệu CCCD/lý lịch trước khi bảng ánh xạ được duyệt. Hệ quả: `/api/v1/me` chạy, `/api/cases` trả `[]` (`visible_cases` rơi vào `where(False)`), tạo hồ sơ trả 400.
- **Ruling ghi trong plan:** ngoài dev, `HUB_BRIDGE_SECRET` không được trùng `JWT_SECRET`. Lý do: trùng khoá thì ai có token bridge (Core) cũng ký được token local CTD với `sub` tuỳ ý, vượt qua toàn bộ ánh xạ role.

- [ ] **Step 1: Write the failing tests**

`services/ctd-api/backend/tests/test_hub_bridge.py`:

```python
"""JWT bridge Core → CTD (mục 16): chỉ token Hub hợp lệ mới vào được, người mới
từ Hub chưa có quyền gì cho tới khi có bảng ánh xạ role (mục 17)."""

import time

import jwt
import pytest

from app.config import settings
from app.deps import create_token
from app.infra import hub_bridge
from app.models.identity import Role, Unit, UnitKind, User

SECRET = "bridge-test-secret-khong-dung-that"
GOLDEN_SECRET = "golden-test-secret-khong-dung-that"
# Cùng chuỗi với core/tests/units.bridge-token.test.js — Core ký, CTD phải đọc được.
GOLDEN = (
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9."
    "eyJpc3MiOiJ1bHRpbWF0ZS10Y2t0LWNvcmUiLCJhdWQiOiJjdGQiLCJzdWIiOiI0MiIsImVtYWlsIjoiY2FuLmJvQGV4YW1wbGUuZWR1LnZuIiwibmFtZSI6IkPDoW4gQuG7mSBN4bqrdSIsInVuaXRfaWQiOjcsInVuaXRfY29kZSI6IkRFTU8tRFQtMDEiLCJ1bml0X25hbWUiOiJbROG7ryBsaeG7h3UgZ2nhuqNdIMSQb8OgbiB0csaw4budbmcgMDEiLCJ1bml0X2tpbmQiOiJncmFzc3Jvb3RzIiwicm9sZSI6Im9mZmljZXIiLCJpYXQiOjE3OTAwMDAwMDAsImV4cCI6MTc5MDAwMDA2MCwianRpIjoiMDAwMDAwMDAtMDAwMC00MDAwLTgwMDAtMDAwMDAwMDAwMDAxIn0."
    "FsN_pxaY-w8C7tLkBMNfpd80-VkeFf9YwWX_PIEt6aw"
)


@pytest.fixture(autouse=True)
def _secret(monkeypatch):
    monkeypatch.setattr(settings, "hub_bridge_secret", SECRET)


def _bridge(secret: str = SECRET, **over) -> str:
    now = int(time.time())
    claims = {
        "iss": "ultimate-tckt-core", "aud": "ctd", "sub": "42",
        "email": "can.bo@example.edu.vn", "name": "Cán Bộ Mẫu",
        "unit_id": 7, "unit_code": "DEMO-DT-01", "unit_name": "Đoàn trường 01", "unit_kind": "grassroots",
        "role": "officer", "iat": now, "exp": now + 60, "jti": "test-jti",
    }
    claims.update(over)
    return jwt.encode(claims, secret, algorithm="HS256")


def _h(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def test_token_hub_hop_le_tao_user_mot_lan_va_chua_co_quyen(client, db):
    r1 = client.get("/api/v1/me", headers=_h(_bridge()))
    r2 = client.get("/api/v1/me", headers=_h(_bridge(name="Tên Mới")))
    assert r1.status_code == 200 and r2.status_code == 200
    assert r1.json()["id"] == r2.json()["id"]
    body = r2.json()
    assert body["hub_user_id"] == 42
    assert body["email"] == "can.bo@example.edu.vn"
    assert body["full_name"] == "Tên Mới"
    assert body["role"] == "chua_co_quyen"
    assert body["unit_id"] is None
    assert db.query(User).filter(User.hub_user_id == 42).count() == 1


def test_nguoi_chua_co_quyen_khong_thay_ho_so_va_khong_tao_duoc(client, db):
    db.add(Unit(name="Đoàn trường 01", kind=UnitKind.DOAN_TRUONG, hub_unit_id=7))
    db.commit()
    assert client.get("/api/cases", headers=_h(_bridge())).json() == []
    assert client.post("/api/cases", headers=_h(_bridge()), json={"case_type": "ket_nap"}).status_code == 400
    assert db.query(User).filter(User.hub_user_id == 42).one().unit_id is None


def test_nhan_user_cu_trung_email_giu_nguyen_role(client, db):
    db.add(User(email="can.bo@example.edu.vn", full_name="Cũ", role=Role.TCKT))
    db.commit()
    body = client.get("/api/v1/me", headers=_h(_bridge())).json()
    assert body["role"] == "tckt"
    assert body["hub_user_id"] == 42
    assert db.query(User).count() == 1


def test_email_da_thuoc_user_hub_khac_thi_dung_email_giu_cho(client, db):
    db.add(User(email="can.bo@example.edu.vn", role=Role.TCKT, hub_user_id=41))
    db.commit()
    body = client.get("/api/v1/me", headers=_h(_bridge())).json()
    assert body["email"] == "hub-42@hub.invalid"


@pytest.mark.parametrize(
    "token",
    [
        pytest.param(lambda: _bridge(iat=int(time.time()) - 120, exp=int(time.time()) - 60), id="het-han"),
        pytest.param(lambda: _bridge(aud="core"), id="sai-aud"),
        pytest.param(lambda: _bridge(secret="sai-secret-test"), id="sai-chu-ky"),
        pytest.param(lambda: _bridge(exp=int(time.time()) + 3600), id="ttl-qua-dai"),
        pytest.param(lambda: jwt.encode({"iss": "ultimate-tckt-core", "sub": "1", "exp": int(time.time()) + 60}, settings.jwt_secret, algorithm="HS256"), id="token-local-gia-iss"),
    ],
)
def test_token_bridge_khong_hop_le_bi_401(client, token):
    r = client.get("/api/v1/me", headers=_h(token()))
    assert r.status_code == 401
    assert r.json()["detail"] == "Phiên Hub không hợp lệ."


def test_chua_dat_secret_thi_tu_choi_moi_token_bridge(client, monkeypatch):
    monkeypatch.setattr(settings, "hub_bridge_secret", "")
    assert client.get("/api/v1/me", headers=_h(_bridge(secret=""))).status_code == 401
    assert client.get("/api/v1/me", headers=_h(_bridge())).status_code == 401


def test_token_local_van_chay(client, db):
    user = User(email="sv@sis.hust.edu.vn", full_name="Sinh Viên", role=Role.SINH_VIEN)
    db.add(user)
    db.commit()
    r = client.get("/api/me", headers=_h(create_token(user)))
    assert r.status_code == 200
    assert r.json()["role"] == "sinh_vien"


def test_doc_duoc_vector_vang_core_ky():
    claims = jwt.decode(
        GOLDEN, GOLDEN_SECRET, algorithms=["HS256"], audience="ctd",
        issuer="ultimate-tckt-core", options={"verify_exp": False},
    )
    assert claims["sub"] == "42"
    assert claims["name"] == "Cán Bộ Mẫu"
    assert claims["unit_name"] == "[Dữ liệu giả] Đoàn trường 01"
    assert claims["exp"] - claims["iat"] == 60
    assert hub_bridge.is_bridge_token(GOLDEN)


def test_token_event_ve_core():
    token = hub_bridge.sign_event_token()
    claims = jwt.decode(token, SECRET, algorithms=["HS256"], audience="core", issuer="ctd")
    assert claims["exp"] - claims["iat"] == 60
    assert claims["jti"]
    with pytest.raises(hub_bridge.BridgeTokenError):
        hub_bridge.sign_event_token(secret="")
```

Thêm vào cuối `services/ctd-api/backend/tests/test_config.py`:

```python
def test_moi_truong_that_khong_duoc_dung_chung_secret_bridge_va_jwt():
    with pytest.raises(ValidationError) as loi:
        _settings(app_env="production", jwt_secret="mot-chuoi-bi-mat-that-su-dai", hub_bridge_secret="mot-chuoi-bi-mat-that-su-dai")
    assert "HUB_BRIDGE_SECRET" in str(loi.value)
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd services/ctd-api/backend && .venv/bin/pytest tests/test_hub_bridge.py tests/test_config.py -q`
Expected: FAIL — `ImportError: cannot import name 'hub_bridge' from 'app.infra'`.

- [ ] **Step 3: Write minimal implementation**

`app/config.py` — thêm trường sau `jwt_ttl_minutes`:

```python
    # JWT bridge từ Core (gateway /m/ctd/api/v1/*) và event về Core. Rỗng = từ chối mọi token bridge.
    hub_bridge_secret: str = ""
    hub_events_url: str = ""
```

và trong `_chan_secret_mac_dinh`, trước `return self`:

```python
        if self.app_env != MOI_TRUONG_DEV and self.hub_bridge_secret and self.hub_bridge_secret == self.jwt_secret:
            raise ValueError(
                "HUB_BRIDGE_SECRET không được trùng JWT_SECRET: trùng thì token bridge của Core "
                "ký được cả token đăng nhập CTD."
            )
```

`app/models/identity.py`:
- import thêm `Integer` từ `sqlalchemy`.
- `Role` thêm `CHUA_CO_QUYEN = "chua_co_quyen"` (docstring một dòng: "User từ Hub chưa được ánh xạ role — không thấy và không làm được gì.").
- `Unit` thêm `hub_unit_id: Mapped[int | None] = mapped_column(Integer, unique=True, default=None, nullable=True)`.
- `User` thêm `hub_user_id: Mapped[int | None] = mapped_column(Integer, unique=True, default=None, nullable=True)`.

`alembic/versions/5b1e2c3d4f60_them_hub_id.py`:

```python
"""them_hub_id

Revision ID: 5b1e2c3d4f60
Revises: 0cbbe74bc1b1
Create Date: 2026-09-24 09:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '5b1e2c3d4f60'
down_revision: Union[str, Sequence[str], None] = '0cbbe74bc1b1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Liên kết user/đơn vị CTD với id bên Core (JWT bridge)."""
    op.add_column("app_user", sa.Column("hub_user_id", sa.Integer(), nullable=True))
    op.create_unique_constraint("uq_app_user_hub_user_id", "app_user", ["hub_user_id"])
    op.add_column("unit", sa.Column("hub_unit_id", sa.Integer(), nullable=True))
    op.create_unique_constraint("uq_unit_hub_unit_id", "unit", ["hub_unit_id"])


def downgrade() -> None:
    op.drop_constraint("uq_unit_hub_unit_id", "unit", type_="unique")
    op.drop_column("unit", "hub_unit_id")
    op.drop_constraint("uq_app_user_hub_user_id", "app_user", type_="unique")
    op.drop_column("app_user", "hub_user_id")
```

`app/infra/hub_bridge.py`:

```python
"""JWT bridge giữa Core (Hub) và CTD. Core ký token 60 giây cho mỗi request qua
gateway (aud=ctd); CTD ký token cùng secret để gửi event về Core (aud=core)."""

from datetime import datetime, timezone
from uuid import uuid4

import jwt

from app.config import settings

HUB_ISSUER = "ultimate-tckt-core"
AUDIENCE = "ctd"
MODULE_ID = "ctd"
MAX_TTL_SECONDS = 60
ALGORITHM = "HS256"


class BridgeTokenError(Exception):
    pass


def _key(secret: str | None) -> str:
    key = settings.hub_bridge_secret if secret is None else secret
    if not key:
        raise BridgeTokenError("HUB_BRIDGE_SECRET chưa được cấu hình.")
    return key


def is_bridge_token(token: str) -> bool:
    """Chỉ để chọn nhánh xác thực — KHÔNG phải kiểm tra. Nhánh bridge kiểm lại đầy đủ."""
    try:
        return jwt.decode(token, options={"verify_signature": False}).get("iss") == HUB_ISSUER
    except jwt.PyJWTError:
        return False


def verify_bridge_token(token: str, secret: str | None = None) -> dict:
    key = _key(secret)
    try:
        claims = jwt.decode(
            token, key, algorithms=[ALGORITHM], audience=AUDIENCE, issuer=HUB_ISSUER,
            options={"require": ["exp", "iat", "sub", "aud", "iss"]},
        )
    except jwt.PyJWTError as exc:
        raise BridgeTokenError(str(exc)) from exc
    if claims["exp"] - claims["iat"] > MAX_TTL_SECONDS:
        raise BridgeTokenError("Token bridge sống quá 60 giây.")
    return claims


def sign_event_token(now: datetime | None = None, secret: str | None = None) -> str:
    key = _key(secret)
    t = int((now or datetime.now(timezone.utc)).timestamp())
    return jwt.encode(
        {"iss": MODULE_ID, "aud": "core", "iat": t, "exp": t + MAX_TTL_SECONDS, "jti": str(uuid4())},
        key, algorithm=ALGORITHM,
    )
```

`app/services/hub_users.py`:

```python
"""Đồng bộ người dùng từ claim JWT bridge sang bảng app_user của CTD."""

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.identity import Role, User


def map_hub_role(claims: dict) -> Role | None:
    """MẶC ĐỊNH TẠM (GĐ1-A2): chưa ánh xạ role Core → CTD. Mục 17 (Lane C) thay bằng
    bảng ánh xạ theo design §8.1. Trả None = user mới nhận Role.CHUA_CO_QUYEN."""
    return None


def _email_taken(db: Session, email: str, except_id: int | None = None) -> bool:
    query = select(User.id).where(User.email == email)
    if except_id is not None:
        query = query.where(User.id != except_id)
    return db.scalars(query).first() is not None


def sync_hub_user(db: Session, claims: dict) -> User:
    hub_id = int(claims["sub"])
    email = str(claims.get("email") or "").strip().lower()
    name = str(claims.get("name") or "")

    user = db.scalars(select(User).where(User.hub_user_id == hub_id)).first()
    if user is None and email:
        user = db.scalars(select(User).where(User.email == email, User.hub_user_id.is_(None))).first()
        if user is not None:
            user.hub_user_id = hub_id
    if user is None:
        if not email or _email_taken(db, email):
            email = f"hub-{hub_id}@hub.invalid"
        user = User(email=email, full_name=name, role=map_hub_role(claims) or Role.CHUA_CO_QUYEN, hub_user_id=hub_id)
        db.add(user)
    else:
        if name:
            user.full_name = name
        if email and email != user.email and not _email_taken(db, email, except_id=user.id):
            user.email = email
    db.commit()
    return user
```

`app/deps.py` — thêm import và nhánh bridge ở đầu `current_user`, ngay sau khi tách `token`:

```python
from app.infra.hub_bridge import BridgeTokenError, is_bridge_token, verify_bridge_token
from app.services.hub_users import sync_hub_user
```

```python
    if is_bridge_token(token):
        try:
            claims = verify_bridge_token(token)
        except BridgeTokenError:
            raise HTTPException(status_code=401, detail="Phiên Hub không hợp lệ.")
        user = sync_hub_user(db, claims)
        if not user.is_active:
            raise HTTPException(status_code=401, detail="Tài khoản không hợp lệ.")
        return user
```

`app/schemas/v1.py`:

```python
from pydantic import BaseModel


class HubMeOut(BaseModel):
    id: int
    hub_user_id: int | None
    email: str
    full_name: str
    role: str
    unit_id: int | None
```

`app/api/v1.py`:

```python
"""Router cho đường đi qua Hub: gateway Core chuyển /m/ctd/api/v1/* thành /api/v1/*.
Lane C (mục 17–20) thêm route nghiệp vụ vào đây."""

from fastapi import APIRouter, Depends

from app.deps import current_user
from app.models.identity import User
from app.schemas.v1 import HubMeOut

router = APIRouter(prefix="/api/v1", tags=["v1"])


@router.get("/me", response_model=HubMeOut)
def me(user: User = Depends(current_user)) -> HubMeOut:
    return HubMeOut(
        id=user.id, hub_user_id=user.hub_user_id, email=user.email,
        full_name=user.full_name, role=user.role.value, unit_id=user.unit_id,
    )
```

`app/main.py`: `from app.api import auth, cases, documents, v1` và `app.include_router(v1.router)` sau `documents.router`.

`services/ctd-api/backend/.env.example` — thêm sau `JWT_TTL_MINUTES`:

```
# JWT bridge từ Core. Phải trùng HUB_BRIDGE_SECRET của core/.env; KHÁC JWT_SECRET.
# Để trống = CTD từ chối mọi request đi qua Hub (đăng nhập OTP cũ vẫn chạy).
HUB_BRIDGE_SECRET=
# Nơi gửi event về Core. Local: http://localhost:3000/internal/events
HUB_EVENTS_URL=
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd services/ctd-api/backend && .venv/bin/pytest tests/test_hub_bridge.py tests/test_config.py tests/test_migrations.py -q`
Expected: PASS (16 test trong `test_hub_bridge.py` tính cả 5 trường hợp parametrize, 4 trong `test_config.py`, 1 trong `test_migrations.py`)

- [ ] **Step 5: Run full suite**

Run: `cd services/ctd-api/backend && .venv/bin/pytest -q`
Expected: tất cả pass

Run: `cd services/ctd-api/backend && .venv/bin/alembic upgrade head && .venv/bin/alembic downgrade -1 && .venv/bin/alembic upgrade head`
Expected: không lỗi (DB local theo `docs/dev/chay-local.md`)

- [ ] **Step 6: Docs**

- `docs/playbooks/doi-quyen.md`: "CTD có hai đường xác thực"; role `chua_co_quyen`; `map_hub_role` là chỗ duy nhất Lane C sửa ở mục 17. Ghi rõ: **`create_draft` hiện không kiểm role**, chỉ chặn nhờ `unit_id = NULL` — mục 17 gán `unit_id` thì phải thêm kiểm role cùng lúc. Bump.
- `docs/dev/phan-quyen.md`: mục CTD: nhánh bridge, nhận user theo email, người mới không có quyền. Mở rộng dòng lịch sử GĐ1-A2.
- `docs/dev/api.md`: CTD `GET /api/v1/me`; `/api/*` cũ giữ cho frontend CTD và OTP. Mở rộng dòng lịch sử.
- `docs/playbooks/doi-schema.md`, `docs/dev/db-migration.md`: revision `5b1e2c3d4f60`. Mở rộng dòng lịch sử.
- `docs/dev/kien-truc.md`: luồng Core → CTD (gateway ký, `deps.current_user` kiểm) và CTD → Core (`sign_event_token` → `HUB_EVENTS_URL`). Mở rộng dòng lịch sử.
- `docs/playbooks/them-module.md`: module gateway phải kiểm `iss`/`aud`/TTL như `hub_bridge.py`. Mở rộng dòng lịch sử.
- `docs/dev/test.md`: `test_hub_bridge.py`, vector vàng dùng chung hai phía (đổi thứ tự claim ở Core là test cả hai phía fail). Mở rộng dòng lịch sử.
- `docs/dev/chay-local.md`: `HUB_BRIDGE_SECRET` ở `.env` CTD, `HUB_EVENTS_URL=http://localhost:3000/internal/events`. Mở rộng dòng lịch sử.

- [ ] **Step 7: Commit**

```bash
npm run docs:index && npm run docs:check -- --base origin/staging
git add services/ctd-api/backend docs/
git commit -m "feat(ctd): accept Hub bridge JWT and add /api/v1 router"
```

---

### Task 5: `scopeFor`, `toSummaryView`, API mức xem và test chống rò rỉ (spec mục 11 backend, 21, 22)

**Files:**
- Create: `core/src/units/scope.js`, `core/src/units/summary-view.js`, `core/src/routes/visibility.js`
- Modify: `core/src/settings/catalog.js`, `core/src/routes/platform.js`, `core/src/routes/index.js`, `core/tests/units.leak.test.js` (viết lại)
- Test: `core/tests/units.scope.test.js`, `core/tests/units.visibility.test.js`, `core/tests/units.leak.test.js`
- Docs: `docs/ai/bat-bien.md`, `docs/dev/phan-quyen.md`, `docs/dev/kien-truc.md`, `docs/dev/api.md`, `docs/dev/email-cron.md`, `docs/ba/co-cau-don-vi-va-role.md`, `docs/dev/test.md`, `docs/dev/ranh-gioi-module.md`

**Interfaces:**
- Consumes: bảng `unit_visibility_policies`, `submissions`, `setting_locks`, `audit_logs` (GĐ1-A); `recordAudit`; `isUnitAdmin`; `req.unit`, `req.unitRole`.
- Produces (cho Lane A mục 9, 10, 12, 13 và Lane B mục 14, 15):
  - `core/src/units/scope.js`: `LEVELS = ['summary','tasks_readonly','full_readonly']`; `viewerFromReq(req) → { userId, unitId, unitKind, role, isDyc }`; `async scopeFor(db, viewer, type, { alias }) → { select, where, params, levels, viewer, resourceType }`; `async readScoped(db, scope, rows) → rows đã serialize`. `type` ∈ `activities`, `tasks`, `task_assignees`, `task_checklists`, `task_attachments`, `updates`, `ops_logs`, `ops_log_attendance`, `directives`, `submissions`; loại khác → throw.
  - Cách dùng bắt buộc trong route liên đơn vị: `const s = await scopeFor(db, viewerFromReq(req), 'activities', { alias: 'a' }); const [rows] = await db.query(\`SELECT a.* ${s.select} FROM activities a WHERE ${s.where} AND …\`, [...s.params, …]); res.json(await readScoped(db, s, rows));`. Route **không** tự viết điều kiện đơn vị và **không** trả row thô.
  - Ma trận (design §6.2; "chủ" = đơn vị sở hữu dòng):
    | Loại | Đơn vị chủ | Mức tối thiểu để đơn vị khác thấy |
    |---|---|---|
    | `activities` | `unit_id` | `summary` (dưới `tasks_readonly` chỉ nhận `SUMMARY_KEYS`); không có policy → không thấy, kể cả mục đã Trình |
    | `tasks`, `task_assignees` | qua activity | `tasks_readonly` |
    | `task_checklists`, `task_attachments`, `updates` | qua task/activity | `full_readonly` |
    | `ops_logs` | `unit_id` | `full_readonly`, hoặc mục đã Trình (chưa rút) cho người xem khi có policy |
    | `ops_log_attendance` | qua ops_log | `full_readonly` |
    | `directives` | `from_unit_id` | bên gửi hoặc bên nhận |
    | `submissions` | `from_unit_id` | bên gửi; bên nhận khi `withdrawn_at IS NULL` |
    DYC (đơn vị đang chọn `platform_owner`): thấy tất cả, **mỗi lần đọc** ghi `audit_logs`. Không có đơn vị: không thấy gì.
  - `core/src/units/summary-view.js`: `SUMMARY_KEYS = ['id','title','status','priority','start_date','deadline','progress_percent','event_lead','directive_id']`; `toSummaryView(row)`; `CROSS_UNIT_KEYS = { directives: [...], submissions: [...] }` — khoá được trả cho bên kia của chỉ đạo/hồ sơ trình.
  - Audit của `readScoped`: mỗi đơn vị chủ khác đơn vị người xem → **một** dòng `cross_unit_read`, `target_type = <type>`, `target_id` = id nếu đúng 1 dòng, ngược lại `NULL`; `meta = { ids: <≤100 id>, count }`.
  - API mức xem:
    - `GET /api/units/:id/visibility` → `{ owner: {id, code, name, kind}, levels: LEVELS, policies: [{ viewer_unit_id, viewer_code, viewer_name, level, updated_by, updated_at, lock: null | { reason } }] }`. Được đọc khi đơn vị đang chọn là `:id` hoặc là DYC (DYC ghi `cross_unit_read`, `target_type 'visibility_policy'`). Khác → 403.
    - `PUT /api/units/:id/visibility/:viewerId` `{ level }` → 200 policy mới. Chỉ khi đơn vị đang chọn là `:id` **và** `isUnitAdmin(kind, role)`; 404 đơn vị lạ; 400 `viewerId = id` hoặc `level` sai; 403 `{ error, locked: true, reason }` nếu có `setting_locks.setting_key = 'visibility.<OWNER_CODE>.<VIEWER_CODE>'` (toàn cục hoặc `unit_id = :id`). Ghi `audit_logs` `visibility.update`, `meta { viewer_unit_id, level, previous_level }`.
    - `DELETE /api/units/:id/visibility/:viewerId` → 200 `{ ok: true }`; 404 nếu chưa có; cùng quyền/khoá như PUT; audit `visibility.remove`.
  - `settings/catalog.js`: `settingEntry(key)` (tra `SETTINGS` rồi tới mẫu `visibility.<A>.<B>` → `{ managed_by: 'unit' }`), `visibilitySettingKey(ownerCode, viewerCode)`. DYC khoá bằng `POST /api/platform/setting-locks` có sẵn.
  - `core/tests/units.leak.test.js`: mảng `OUTSIDER_ALLOW`, `PLATFORM_GET`, `SCOPED_GET` (rỗng — lane thêm route liên đơn vị vào đây), `BUSINESS`; hàm `findLeaks(body, { allowedKeys, forbiddenIds })`.
- **Ruling ghi trong plan:** `scopeFor` nằm ở `core/src/units/scope.js`, không ở `core/src/policies/access.js` như bất biến 1 đang ghi. Lý do: `policies/access.js` thuộc module Điều hành (Lane A); `scopeFor` là hợp đồng Nền dùng chung cho mọi module. Bất biến 1 sửa theo.
- **Ruling ghi trong plan:** DYC được xác định theo **đơn vị đang chọn** (`req.unit.kind === 'platform_owner'`), không theo "có membership DYC". Lý do: Global Constraints — quyền tính theo đơn vị đang chọn; DYC kiêm TCKT đang chọn TCKT thì đọc như TCKT, không sinh audit giả.
- **Ruling ghi trong plan:** activity của đơn vị khác luôn qua `toSummaryView` khi mức < `tasks_readonly`, **kể cả** activity đã được Trình. Lý do: Trình không phải là nâng mức xem; bên nhận xem chi tiết qua bản ghi `submissions`, không qua bảng gốc.
- **Ruling ghi trong plan:** phần mở rộng "mục đã Trình" chỉ áp dụng khi người xem **có policy** với đơn vị chủ, và chỉ cho `activities`, `ops_logs` (không cho bảng con). Lý do: design §6.2 hàng "không có policy" không liệt kê mục đã Trình; bảng con của ops_log (điểm danh) chứa dữ liệu cá nhân.
- **Ruling ghi trong plan:** đơn vị chủ của `directives`/`submissions` (cho audit và cho `levels`) là `from_unit_id`. Lý do: bên tạo là bên sở hữu; bên nhận chỉ là một bên tham gia.
- **Ruling ghi trong plan:** mỗi lần đọc sinh **một** audit cho **mỗi** đơn vị chủ khác, kể cả người xem không phải DYC (BTV đọc tổng quan TCKT). Lý do: Req 7.x yêu cầu truy vết mọi đọc liên đơn vị; gộp theo đơn vị chủ giữ số dòng tỉ lệ với request chứ không với số row.
- **Ruling ghi trong plan:** RBAC **trong** đơn vị (ai trong TCKT thấy task nào) vẫn là việc của route/lane; `scopeFor` chỉ quyết ranh giới **giữa** đơn vị. Lý do: tránh nhân đôi `policies/access.js`.
- **Ruling ghi trong plan:** chỉ admin của đơn vị sở hữu (đang chọn đơn vị đó) được đổi mức xem; DYC **không** sửa được, chỉ khoá được. Lý do: Req 3.6/3.7; D4 "DYC toàn quyền" được hiểu là toàn quyền đọc + khoá, để quyết định chia sẻ dữ liệu luôn thuộc đơn vị chủ.
- **Ruling ghi trong plan:** đơn vị người xem không đọc được policy của đơn vị chủ; DYC đọc được và bị audit. Lý do: danh sách ai được xem là cấu hình của đơn vị chủ.
- **Ruling ghi trong plan:** trang Setting → Phạm vi xem dời sang GĐ1-D (Lane B); task này chỉ có API. Lý do: brief mục 11 chỉ backend.
- **Ruling ghi trong plan:** mọi route GET phải được xếp vào đúng một nhóm của test chống rò rỉ; route chưa xếp làm test fail. Lý do: Review Focus 5 — lane thêm route mới không được âm thầm lọt khỏi kiểm tra.
- **Ruling ghi trong plan:** mục 21 và 22 làm ở đây (Lane 0) theo bản phân lane, dù brief chỉ nêu mục 23. Lý do: CI gate mục 23 (Task 7) cần có test để gác.

- [ ] **Step 1: Write the failing tests**

`core/tests/units.scope.test.js`:

```js
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { createTestDatabase } = require('./helpers/db');
const { createUser, createTeam, createActivity, createTask, unitIdByCode } = require('./helpers/fixtures');
const { scopeFor, readScoped, LEVELS } = require('../src/units/scope');
const { SUMMARY_KEYS } = require('../src/units/summary-view');

const ALIAS = { activities: 'a', tasks: 't', task_checklists: 'c', ops_logs: 'o', directives: 'd', submissions: 's' };
async function visible(pool, viewer, type) {
  const a = ALIAS[type];
  const s = await scopeFor(pool, viewer, type, { alias: a });
  const [rows] = await pool.query(`SELECT ${a}.* ${s.select} FROM ${type} ${a} WHERE ${s.where} ORDER BY ${a}.id`, s.params);
  return readScoped(pool, s, rows);
}
const viewer = (userId, unitId, unitKind) => ({ userId, unitId, unitKind, role: null, isDyc: unitKind === 'platform_owner' });
const setLevel = (pool, ids, level) => pool.execute('UPDATE unit_visibility_policies SET level=? WHERE viewer_unit_id=? AND owner_unit_id=?', [level, ids.BTV, ids.TCKT]);
const audits = async (pool, actorId) => (await pool.query('SELECT action, target_type, target_id, owner_unit_id, meta FROM audit_logs WHERE actor_id=? ORDER BY id', [actorId]))[0];

async function seed(pool) {
  const ids = {};
  for (const c of ['DYC', 'BTV', 'TCKT', 'VPD']) ids[c] = await unitIdByCode(pool, c);
  const lead = await createUser(pool, { name: 'Trưởng Sự Kiện', role: 'leader' });
  const team = await createTeam(pool);
  const act = await createActivity(pool, { team_id: team, creator_id: lead.id, event_lead_id: lead.id, status: 'active' });
  for (const status of ['done', 'todo', 'cancelled']) await createTask(pool, { activity_id: act, team_id: team, status });
  const [[{ id: taskId }]] = await pool.query('SELECT MIN(id) id FROM tasks WHERE activity_id=?', [act]);
  await pool.execute('INSERT INTO task_checklists(task_id,title) VALUES (?,?)', [taskId, 'Mục kiểm']);
  const [ol] = await pool.execute("INSERT INTO ops_logs(unit_id,type,title,started_at) VALUES (?,'meeting','Họp giao ban',NOW())", [ids.TCKT]);
  const btv = await createUser(pool, { units: [['BTV', 'btv_lead']] });
  const vpd = await createUser(pool, { units: [['VPD', 'officer']] });
  const dyc = await createUser(pool, { units: [['DYC', 'dyc_engineer']] });
  return { ids, act, opsLogId: ol.insertId, lead, btv, vpd, dyc };
}

test('BTV at summary: activities reduced to exactly SUMMARY_KEYS (progress 50, event lead name); no tasks, checklists or ops logs', async () => {
  const { pool, teardown } = await createTestDatabase();
  try {
    const f = await seed(pool);
    const v = viewer(f.btv.id, f.ids.BTV, 'standing_committee');
    const acts = await visible(pool, v, 'activities');
    assert.equal(acts.length, 1);
    assert.deepEqual(Object.keys(acts[0]).sort(), [...SUMMARY_KEYS].sort());
    assert.equal(acts[0].progress_percent, 50);
    assert.equal(acts[0].event_lead, 'Trưởng Sự Kiện');
    for (const type of ['tasks', 'task_checklists', 'ops_logs']) assert.deepEqual(await visible(pool, v, type), [], type);
    const rows = await audits(pool, f.btv.id);
    assert.deepEqual(rows.map(r => [r.action, r.target_type, Number(r.target_id), r.owner_unit_id]), [['cross_unit_read', 'activities', f.act, f.ids.TCKT]]);
    assert.deepEqual(rows[0].meta, { ids: [f.act], count: 1 });
  } finally { await teardown(); }
});

test('level matrix: tasks_readonly opens tasks and the full activity; full_readonly opens checklists and ops logs', async () => {
  const { pool, teardown } = await createTestDatabase();
  try {
    const f = await seed(pool);
    const v = viewer(f.btv.id, f.ids.BTV, 'standing_committee');
    const counts = async () => Object.fromEntries(await Promise.all(['tasks', 'task_checklists', 'ops_logs'].map(async t => [t, (await visible(pool, v, t)).length])));
    await setLevel(pool, f.ids, 'tasks_readonly');
    assert.deepEqual(await counts(), { tasks: 3, task_checklists: 0, ops_logs: 0 });
    const [act] = await visible(pool, v, 'activities');
    assert.equal(act.description, 'Mô tả thử nghiệm');
    assert.equal(Object.keys(act).some(k => k.startsWith('_scope')), false);
    await setLevel(pool, f.ids, 'full_readonly');
    assert.deepEqual(await counts(), { tasks: 3, task_checklists: 1, ops_logs: 1 });
    assert.deepEqual(LEVELS, ['summary', 'tasks_readonly', 'full_readonly']);
  } finally { await teardown(); }
});

test('no policy sees nothing; submitted ops log is visible at summary until withdrawn; directives by party', async () => {
  const { pool, teardown } = await createTestDatabase();
  try {
    const f = await seed(pool);
    const btv = viewer(f.btv.id, f.ids.BTV, 'standing_committee');
    const vpd = viewer(f.vpd.id, f.ids.VPD, 'office');
    assert.deepEqual(await visible(pool, vpd, 'activities'), []);
    const [sub] = await pool.execute("INSERT INTO submissions(from_unit_id,to_unit_id,source_type,source_id) VALUES (?,?,'ops_log',?)", [f.ids.TCKT, f.ids.BTV, f.opsLogId]);
    await pool.execute("INSERT INTO submissions(from_unit_id,to_unit_id,source_type,source_id) VALUES (?,?,'ops_log',?)", [f.ids.TCKT, f.ids.VPD, f.opsLogId]);
    assert.equal((await visible(pool, btv, 'ops_logs')).length, 1);
    assert.deepEqual(await visible(pool, vpd, 'ops_logs'), [], 'no policy → submitted items stay hidden');
    await pool.execute('UPDATE submissions SET withdrawn_at=NOW() WHERE id=?', [sub.insertId]);
    assert.deepEqual(await visible(pool, btv, 'ops_logs'), []);
    assert.deepEqual(await visible(pool, btv, 'submissions'), [], 'withdrawn submission hidden from receiver');
    await pool.execute("INSERT INTO directives(from_unit_id,to_unit_id,title) VALUES (?,?,'Chỉ đạo')", [f.ids.BTV, f.ids.TCKT]);
    const tckt = viewer(f.lead.id, f.ids.TCKT, 'department');
    assert.equal((await visible(pool, btv, 'directives')).length, 1);
    assert.equal((await visible(pool, tckt, 'directives')).length, 1);
    assert.deepEqual(await visible(pool, vpd, 'directives'), []);
  } finally { await teardown(); }
});

test('DYC sees everything and is audited; own-unit reads are not audited; no unit sees nothing; unknown type throws', async () => {
  const { pool, teardown } = await createTestDatabase();
  try {
    const f = await seed(pool);
    const dyc = viewer(f.dyc.id, f.ids.DYC, 'platform_owner');
    assert.equal((await visible(pool, dyc, 'task_checklists')).length, 1);
    const [act] = await visible(pool, dyc, 'activities');
    assert.equal(act.description, 'Mô tả thử nghiệm', 'DYC gets the full row');
    assert.deepEqual((await audits(pool, f.dyc.id)).map(r => [r.action, r.target_type, r.owner_unit_id]), [
      ['cross_unit_read', 'task_checklists', f.ids.TCKT], ['cross_unit_read', 'activities', f.ids.TCKT]
    ]);
    assert.equal((await visible(pool, viewer(f.lead.id, f.ids.TCKT, 'department'), 'tasks')).length, 3);
    assert.deepEqual(await audits(pool, f.lead.id), []);
    assert.deepEqual(await visible(pool, viewer(f.lead.id, null, null), 'activities'), []);
    await assert.rejects(scopeFor(pool, dyc, 'users'), /Unknown scoped resource/);
  } finally { await teardown(); }
});
```

`core/tests/units.visibility.test.js`:

```js
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { createTestDatabase } = require('./helpers/db');
const { startTestServer } = require('./helpers/server');
const { createUser, unitIdByCode } = require('./helpers/fixtures');
const { scopeFor } = require('../src/units/scope');

test('only an admin of the owner unit changes visibility; it applies at once and is audited', async () => {
  const { pool, teardown } = await createTestDatabase();
  const { client, close } = await startTestServer(pool);
  try {
    const TCKT = await unitIdByCode(pool, 'TCKT');
    const BTV = await unitIdByCode(pool, 'BTV');
    const url = `/api/units/${TCKT}/visibility/${BTV}`;
    for (const units of [[['BTV', 'btv_lead']], [['TCKT', 'leader']], [['DYC', 'dyc_admin']]]) {
      const u = await createUser(pool, { units });
      await client.login(u.email, u.password);
      assert.equal((await client.request('PUT', url, { body: { level: 'full_readonly' } })).status, 403, units[0].join('/'));
    }
    const admin = await createUser(pool, { units: [['TCKT', 'admin']] });
    await client.login(admin.email, admin.password);
    assert.equal((await client.request('PUT', url, { body: { level: 'bat_ky' } })).status, 400);
    assert.equal((await client.request('PUT', `/api/units/${TCKT}/visibility/${TCKT}`, { body: { level: 'summary' } })).status, 400);
    assert.equal((await client.request('PUT', `/api/units/${TCKT}/visibility/999999`, { body: { level: 'summary' } })).status, 404);
    const r = await client.request('PUT', url, { body: { level: 'tasks_readonly' } });
    assert.equal(r.status, 200);
    assert.equal(r.json.level, 'tasks_readonly');
    const s = await scopeFor(pool, { userId: null, unitId: BTV, unitKind: 'standing_committee', isDyc: false }, 'tasks', { alias: 't' });
    assert.ok(s.params.includes(TCKT), 'scopeFor sees the new level immediately');
    const vice = await createUser(pool, { units: [['TCKT', 'vice_admin']] });
    await client.login(vice.email, vice.password);
    assert.equal((await client.request('DELETE', url)).status, 200);
    assert.equal((await client.request('DELETE', url)).status, 404);
    const [rows] = await pool.query("SELECT action, meta FROM audit_logs WHERE action LIKE 'visibility.%' ORDER BY id");
    assert.deepEqual(rows.map(x => x.action), ['visibility.update', 'visibility.remove']);
    assert.deepEqual(rows[0].meta, { viewer_unit_id: BTV, level: 'tasks_readonly', previous_level: 'summary' });
  } finally { await close(); await teardown(); }
});

test('DYC can lock a visibility key; locked change is 403 with reason; the viewer unit cannot read the policy, DYC reads are audited', async () => {
  const { pool, teardown } = await createTestDatabase();
  const { client, close } = await startTestServer(pool);
  try {
    const TCKT = await unitIdByCode(pool, 'TCKT');
    const BTV = await unitIdByCode(pool, 'BTV');
    const dyc = await createUser(pool, { units: [['DYC', 'dyc_admin']] });
    await client.login(dyc.email, dyc.password);
    assert.equal((await client.request('POST', '/api/platform/setting-locks', { body: { setting_key: 'visibility.TCKT.BTV', unit_id: TCKT, reason: 'Chờ BTV duyệt' } })).status, 201);
    const view = await client.request('GET', `/api/units/${TCKT}/visibility`);
    assert.equal(view.status, 200);
    assert.deepEqual(view.json.policies.map(p => [p.viewer_code, p.level, p.lock?.reason]), [['BTV', 'summary', 'Chờ BTV duyệt']]);
    const [[{ c }]] = await pool.query("SELECT COUNT(*) c FROM audit_logs WHERE actor_id=? AND action='cross_unit_read' AND target_type='visibility_policy'", [dyc.id]);
    assert.equal(c, 1);
    const admin = await createUser(pool, { units: [['TCKT', 'admin']] });
    await client.login(admin.email, admin.password);
    const locked = await client.request('PUT', `/api/units/${TCKT}/visibility/${BTV}`, { body: { level: 'full_readonly' } });
    assert.equal(locked.status, 403);
    assert.deepEqual([locked.json.locked, locked.json.reason], [true, 'Chờ BTV duyệt']);
    const btv = await createUser(pool, { units: [['BTV', 'btv_lead']] });
    await client.login(btv.email, btv.password);
    assert.equal((await client.request('GET', `/api/units/${TCKT}/visibility`)).status, 403);
  } finally { await close(); await teardown(); }
});
```

`core/tests/units.leak.test.js` (viết lại toàn bộ):

```js
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { createTestDatabase } = require('./helpers/db');
const { startTestServer } = require('./helpers/server');
const { createUser, createTeam, createActivity, createTask, unitIdByCode } = require('./helpers/fixtures');
const { LEGACY_PREFIXES } = require('../src/middleware/legacy-gate');
const { SUMMARY_KEYS } = require('../src/units/summary-view');

const ROUTES_DIR = path.join(__dirname, '..', 'src', 'routes');

// Mọi route GET /api/* phải thuộc đúng một nhóm dưới đây. Route mới chưa xếp nhóm → test fail.
// 1. Người ngoài đọc được: không chứa dữ liệu nghiệp vụ của đơn vị khác.
//    /api/platform/setting-locks tự scope trong handler (xem units.settings-guard.test.js).
//    /api/shell/menu chỉ trả menu của chính đơn vị người gọi đang chọn.
const OUTSIDER_ALLOW = [/^\/api\/session$/, /^\/api\/version$/, /^\/api\/health$/, /^\/api\/push\/config$/, /^\/api\/notifications/, /^\/api\/units$/, /^\/api\/platform\/setting-locks$/, /^\/api\/shell\/menu$/];
// 2. Cấu hình nền: chỉ DYC/admin; người ngoài phải 403; DYC không bị 403 (không bắt buộc audit).
const PLATFORM_GET = [
  /^\/api\/admin\//,               // cấu hình email/cron/preset — managed by DYC (settingGuard)
  /^\/api\/units\/:id\/members$/   // danh sách thành viên — chỉ thành viên đơn vị hoặc DYC
];
// 3. Route liên đơn vị đi qua scopeFor/readScoped. Lane thêm route vào đây khi làm mục 9, 10, 12, 13.
const SCOPED_GET = [];
// 4. Nghiệp vụ: người ngoài 403 (hoặc qua SCOPED_GET); DYC đọc được và mỗi lượt đúng MỘT dòng audit.
const BUSINESS = [...LEGACY_PREFIXES.map(p => new RegExp(`^${p}(/|$)`)), ...SCOPED_GET, /^\/api\/units\/:id\/visibility$/];

const TASK_ID = 910001;
const CHECKLIST_ID = 920001;
const OPS_LOG_ID = 930001;

function getPaths() {
  const found = new Set();
  for (const file of fs.readdirSync(ROUTES_DIR).filter(f => f.endsWith('.js'))) {
    const src = fs.readFileSync(path.join(ROUTES_DIR, file), 'utf8');
    for (const m of src.matchAll(/router\.get\(\s*['"`](\/api\/[^'"`]+)['"`]/g)) found.add(m[1]);
  }
  return [...found].sort();
}
const materialize = (p, tcktId) => p.replace(/^\/api\/units\/:id/, `/api/units/${tcktId}`).replace(/:[A-Za-z_]+/g, '1');
const groupOf = p => [['allow', OUTSIDER_ALLOW], ['platform', PLATFORM_GET], ['scoped', SCOPED_GET], ['business', BUSINESS]]
  .filter(([, list]) => list.some(rx => rx.test(p))).map(([g]) => g);

// Duyệt toàn bộ body: khoá ngoài allowedKeys (với object có id) hoặc id bị cấm → rò rỉ.
function findLeaks(body, { allowedKeys = null, forbiddenIds = {} } = {}) {
  const leaks = [];
  const walk = (node, where) => {
    if (Array.isArray(node)) return node.forEach((x, i) => walk(x, `${where}[${i}]`));
    if (!node || typeof node !== 'object') return;
    if (allowedKeys && 'id' in node) for (const k of Object.keys(node)) if (!allowedKeys.includes(k)) leaks.push(`${where}.${k}`);
    for (const [key, ids] of Object.entries(forbiddenIds)) if (ids.includes(Number(node[key]))) leaks.push(`${where}.${key}=${node[key]}`);
    for (const [k, v] of Object.entries(node)) walk(v, `${where}.${k}`);
  };
  walk(body, '$');
  return leaks;
}

async function seedTcktData(pool) {
  const lead = await createUser(pool, { role: 'leader' });
  const team = await createTeam(pool);
  const act = await createActivity(pool, { team_id: team, creator_id: lead.id, event_lead_id: lead.id, status: 'active' });
  const taskId = await createTask(pool, { activity_id: act, team_id: team });
  await pool.execute('UPDATE tasks SET id=? WHERE id=?', [TASK_ID, taskId]);
  await pool.execute('INSERT INTO task_checklists(id,task_id,title) VALUES (?,?,?)', [CHECKLIST_ID, TASK_ID, 'Mục kiểm']);
  await pool.execute("INSERT INTO ops_logs(id,unit_id,type,title,started_at) VALUES (?,?,'meeting','Họp',NOW())", [OPS_LOG_ID, await unitIdByCode(pool, 'TCKT')]);
}

test('route parser finds the real surface and every GET route is classified in exactly one group', () => {
  const paths = getPaths();
  assert.ok(paths.length > 30, `only ${paths.length} paths`);
  const bad = paths.map(p => [p, groupOf(p)]).filter(([, g]) => g.length !== 1 && !(g.length === 2 && g.includes('scoped') && g.includes('business')));
  assert.deepEqual(bad, [], 'thêm route vào OUTSIDER_ALLOW / PLATFORM_GET / SCOPED_GET / BUSINESS kèm lý do');
});

test('findLeaks catches extra keys and forbidden ids (self-test)', () => {
  assert.deepEqual(findLeaks([{ id: 1, title: 'a' }], { allowedKeys: ['id', 'title'] }), []);
  assert.deepEqual(findLeaks({ items: [{ id: 1, description: 'x' }] }, { allowedKeys: ['id'] }), ['$.items[0].description']);
  assert.deepEqual(findLeaks({ a: { task_id: TASK_ID } }, { forbiddenIds: { task_id: [TASK_ID] } }), [`$.a.task_id=${TASK_ID}`]);
});

test('BTV at summary never receives TCKT task/checklist/ops-log ids or keys outside the summary view', async () => {
  const { pool, teardown } = await createTestDatabase();
  const { client, close } = await startTestServer(pool);
  try {
    await seedTcktData(pool);
    const tcktId = await unitIdByCode(pool, 'TCKT');
    const btv = await createUser(pool, { units: [['BTV', 'btv_lead']] });
    await client.login(btv.email, btv.password);
    const forbiddenIds = { id: [TASK_ID, CHECKLIST_ID, OPS_LOG_ID], task_id: [TASK_ID], ops_log_id: [OPS_LOG_ID] };
    const problems = [];
    for (const p of getPaths()) {
      const g = groupOf(p);
      if (g.includes('allow')) continue;
      const r = await client.request('GET', materialize(p, tcktId));
      if (r.status >= 500) { problems.push(`${p} → ${r.status}`); continue; }
      if (!g.includes('scoped')) { if (r.status !== 403) problems.push(`${p} → ${r.status} (expected 403)`); continue; }
      if (r.status >= 400) {
        const extra = Object.keys(r.json || {}).filter(k => !['error', 'locked', 'reason'].includes(k));
        if (extra.length) problems.push(`${p} → ${r.status} leaks ${extra}`);
        continue;
      }
      problems.push(...findLeaks(r.json, { allowedKeys: SUMMARY_KEYS, forbiddenIds }).map(l => `${p} ${l}`));
    }
    assert.deepEqual(problems, []);
  } finally { await close(); await teardown(); }
});

test('DYC is never refused, and every business GET writes exactly one audit row', async () => {
  const { pool, teardown } = await createTestDatabase();
  const { client, close } = await startTestServer(pool);
  try {
    await seedTcktData(pool);
    const tcktId = await unitIdByCode(pool, 'TCKT');
    const dyc = await createUser(pool, { units: [['DYC', 'dyc_engineer']] });
    await client.login(dyc.email, dyc.password);
    const count = async () => (await pool.query('SELECT COUNT(*) c FROM audit_logs WHERE actor_id=?', [dyc.id]))[0][0].c;
    const problems = [];
    for (const p of getPaths()) {
      const before = await count();
      const r = await client.request('GET', materialize(p, tcktId));
      if (r.status === 403) problems.push(`${p} → 403`);
      const g = groupOf(p);
      if (g.includes('business') && (await count()) - before !== 1) problems.push(`${p} → ${(await count()) - before} audit rows`);
    }
    assert.deepEqual(problems, []);
  } finally { await close(); await teardown(); }
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd core && node --test tests/units.scope.test.js tests/units.visibility.test.js tests/units.leak.test.js`
Expected: FAIL — `Cannot find module '../src/units/scope'` / `'../src/units/summary-view'`.

- [ ] **Step 3: Write minimal implementation**

`core/src/units/summary-view.js`:

```js
'use strict';

// Design §6.2: mức "summary" chỉ được 9 trường này của activity.
const SUMMARY_KEYS = Object.freeze(['id', 'title', 'status', 'priority', 'start_date', 'deadline', 'progress_percent', 'event_lead', 'directive_id']);

// Trường bên kia của chỉ đạo / hồ sơ trình được thấy (không có cột nội bộ khác).
const CROSS_UNIT_KEYS = Object.freeze({
  directives: Object.freeze(['id', 'from_unit_id', 'to_unit_id', 'title', 'body', 'deadline', 'status', 'created_by', 'owner_user_id', 'acknowledged_at', 'created_at', 'updated_at', 'progress_percent']),
  submissions: Object.freeze(['id', 'from_unit_id', 'to_unit_id', 'source_type', 'source_id', 'directive_id', 'note', 'submitted_by', 'response', 'response_note', 'responded_by', 'responded_at', 'withdrawn_at', 'created_at', 'source'])
});

function toSummaryView(row) {
  const progress = row._scope_progress ?? row.progress_percent;
  return {
    id: row.id,
    title: row.title,
    status: row.status,
    priority: row.priority,
    start_date: row.start_date ?? null,
    deadline: row.deadline ?? null,
    progress_percent: progress == null ? 0 : Number(progress),
    event_lead: row._scope_event_lead ?? row.event_lead ?? null,
    directive_id: row.directive_id ?? null
  };
}

const pick = (row, keys) => Object.fromEntries(keys.filter(k => k in row).map(k => [k, row[k]]));

module.exports = { SUMMARY_KEYS, CROSS_UNIT_KEYS, toSummaryView, pick };
```

`core/src/units/scope.js`:

```js
'use strict';
const { recordAudit } = require('../services/audit');
const { toSummaryView, CROSS_UNIT_KEYS, pick } = require('./summary-view');

const LEVELS = Object.freeze(['summary', 'tasks_readonly', 'full_readonly']);
const rank = level => LEVELS.indexOf(level);

const viaActivity = col => a => `(SELECT _sa.unit_id FROM activities _sa WHERE _sa.id=${a}.${col})`;
const viaTask = a => `(SELECT _sa.unit_id FROM tasks _st JOIN activities _sa ON _sa.id=_st.activity_id WHERE _st.id=${a}.task_id)`;
const own = col => a => `${a}.${col}`;

// owner: biểu thức SQL ra đơn vị chủ; id: id dùng cho audit/Trình; min: mức tối thiểu; submitted: source_type trong submissions.
const RESOURCES = Object.freeze({
  activities: { owner: own('unit_id'), id: own('id'), min: 'summary', submitted: 'activity' },
  tasks: { owner: viaActivity('activity_id'), id: own('id'), min: 'tasks_readonly' },
  task_assignees: { owner: viaTask, id: own('task_id'), min: 'tasks_readonly' },
  task_checklists: { owner: viaTask, id: own('id'), min: 'full_readonly' },
  task_attachments: { owner: viaTask, id: own('id'), min: 'full_readonly' },
  updates: { owner: viaActivity('activity_id'), id: own('id'), min: 'full_readonly' },
  ops_logs: { owner: own('unit_id'), id: own('id'), min: 'full_readonly', submitted: 'ops_log' },
  ops_log_attendance: { owner: a => `(SELECT _so.unit_id FROM ops_logs _so WHERE _so.id=${a}.ops_log_id)`, id: own('ops_log_id'), min: 'full_readonly' },
  directives: { owner: own('from_unit_id'), id: own('id'), party: 'directive' },
  submissions: { owner: own('from_unit_id'), id: own('id'), party: 'submission' }
});

function viewerFromReq(req) {
  return {
    userId: req.session?.user?.id ?? null,
    unitId: req.unit?.id ?? null,
    unitKind: req.unit?.kind ?? null,
    role: req.unitRole ?? null,
    isDyc: req.unit?.kind === 'platform_owner'
  };
}

const marks = list => list.map(() => '?').join(',');

async function scopeFor(db, viewer, type, { alias } = {}) {
  const r = RESOURCES[type];
  if (!r) throw new Error(`Unknown scoped resource ${type}`);
  const a = alias || type;
  const owner = r.owner(a);
  let select = `, ${owner} AS _scope_owner, ${r.id(a)} AS _scope_id`;
  if (type === 'activities') {
    select += `, (SELECT ROUND(100*SUM(_st.status='done')/NULLIF(SUM(_st.status<>'cancelled'),0)) FROM tasks _st WHERE _st.activity_id=${a}.id) AS _scope_progress`;
    select += `, (SELECT _su.name FROM users _su WHERE _su.id=${a}.event_lead_id) AS _scope_event_lead`;
  }
  const levels = new Map();
  const base = { select, levels, viewer, resourceType: type };
  if (!viewer?.unitId) return { ...base, where: '1=0', params: [] };
  if (viewer.isDyc) return { ...base, where: '1=1', params: [] };

  const [rows] = await db.execute('SELECT owner_unit_id, level FROM unit_visibility_policies WHERE viewer_unit_id=?', [viewer.unitId]);
  for (const row of rows) levels.set(row.owner_unit_id, row.level);

  if (r.party === 'directive') return { ...base, where: `(${a}.from_unit_id=? OR ${a}.to_unit_id=?)`, params: [viewer.unitId, viewer.unitId] };
  if (r.party === 'submission') return { ...base, where: `(${a}.from_unit_id=? OR (${a}.to_unit_id=? AND ${a}.withdrawn_at IS NULL))`, params: [viewer.unitId, viewer.unitId] };

  const parts = [`${owner} = ?`];
  const params = [viewer.unitId];
  const allowed = [...levels].filter(([, level]) => rank(level) >= rank(r.min)).map(([o]) => o);
  if (allowed.length) { parts.push(`${owner} IN (${marks(allowed)})`); params.push(...allowed); }
  if (r.submitted && levels.size) {
    const owners = [...levels.keys()];
    parts.push(`(${r.id(a)} IN (SELECT _ss.source_id FROM submissions _ss WHERE _ss.to_unit_id=? AND _ss.source_type=? AND _ss.withdrawn_at IS NULL) AND ${owner} IN (${marks(owners)}))`);
    params.push(viewer.unitId, r.submitted, ...owners);
  }
  return { ...base, where: `(${parts.join(' OR ')})`, params };
}

const strip = row => Object.fromEntries(Object.entries(row).filter(([k]) => !k.startsWith('_scope_')));

async function readScoped(db, scope, rows) {
  const { viewer, resourceType, levels } = scope;
  const crossIds = new Map();
  const out = rows.map(row => {
    const owner = row._scope_owner == null ? null : Number(row._scope_owner);
    const cross = owner !== viewer.unitId;
    if (!cross) return strip(row);
    if (!crossIds.has(owner)) crossIds.set(owner, []);
    crossIds.get(owner).push(row._scope_id);
    if (viewer.isDyc) return strip(row);
    if (resourceType === 'activities' && rank(levels.get(owner) ?? 'summary') < rank('tasks_readonly')) return toSummaryView(row);
    if (CROSS_UNIT_KEYS[resourceType]) return pick(strip(row), CROSS_UNIT_KEYS[resourceType]);
    return strip(row);
  });
  for (const [owner, ids] of crossIds) {
    await recordAudit(db, {
      actorId: viewer.userId,
      actorUnitId: viewer.unitId,
      action: 'cross_unit_read',
      targetType: resourceType,
      targetId: ids.length === 1 ? ids[0] : null,
      ownerUnitId: owner,
      meta: { ids: ids.slice(0, 100), count: ids.length }
    });
  }
  return out;
}

module.exports = { LEVELS, RESOURCES, viewerFromReq, scopeFor, readScoped };
```

`core/src/settings/catalog.js` — thay `module.exports`:

```js
// Mức xem liên đơn vị: một key cho mỗi cặp (đơn vị chủ, đơn vị xem), để DYC khoá riêng từng cặp.
const VISIBILITY_KEY = /^visibility\.[A-Z0-9-]+\.[A-Z0-9-]+$/;
const visibilitySettingKey = (ownerCode, viewerCode) => `visibility.${ownerCode}.${viewerCode}`;
const settingEntry = key => SETTINGS[key] || (VISIBILITY_KEY.test(key) ? { managed_by: 'unit' } : null);

module.exports = { SETTINGS, settingEntry, visibilitySettingKey };
```

`core/src/routes/platform.js`: import `{ settingEntry }` thay `{ SETTINGS }`, và đổi điều kiện thành `if (settingEntry(key)?.managed_by !== 'unit')`.

`core/src/routes/visibility.js`:

```js
'use strict';
const express = require('express');
const { LEVELS } = require('../units/scope');
const { isUnitAdmin } = require('../units/catalog');
const { getUnit } = require('../units/memberships');
const { visibilitySettingKey } = require('../settings/catalog');
const { recordAudit } = require('../services/audit');

function createVisibilityRoutes(context) {
  const { db, auth, asyncRoute } = context;
  const router = express.Router();
  const isDyc = req => req.unit?.kind === 'platform_owner';
  const isOwnerAdmin = (req, owner) => req.unit?.id === owner.id && isUnitAdmin(req.unit.kind, req.unitRole);
  const lockFor = async (owner, viewer) => {
    const [rows] = await db.execute(
      'SELECT reason FROM setting_locks WHERE setting_key=? AND (unit_id IS NULL OR unit_id=?) ORDER BY id LIMIT 1',
      [visibilitySettingKey(owner.code, viewer.code), owner.id]
    );
    return rows[0] || null;
  };

  router.get('/api/units/:id/visibility', auth, asyncRoute(async (req, res) => {
    const owner = await getUnit(db, Number(req.params.id));
    if (!owner) return res.status(404).json({ error: 'Không tìm thấy đơn vị.' });
    if (req.unit?.id !== owner.id && !isDyc(req)) return res.status(403).json({ error: 'Chỉ đơn vị sở hữu hoặc DYC xem được phạm vi chia sẻ.' });
    if (req.unit?.id !== owner.id) {
      await recordAudit(db, { actorId: req.session.user.id, actorUnitId: req.unit.id, action: 'cross_unit_read', targetType: 'visibility_policy', targetId: owner.id, ownerUnitId: owner.id, meta: null });
    }
    const [rows] = await db.execute(
      `SELECT p.viewer_unit_id, u.code viewer_code, u.name viewer_name, p.level, p.updated_by, p.updated_at
       FROM unit_visibility_policies p JOIN org_units u ON u.id=p.viewer_unit_id WHERE p.owner_unit_id=? ORDER BY u.id`,
      [owner.id]
    );
    const policies = [];
    for (const row of rows) policies.push({ ...row, lock: await lockFor(owner, { code: row.viewer_code }) });
    res.json({ owner: { id: owner.id, code: owner.code, name: owner.name, kind: owner.kind }, levels: LEVELS, policies });
  }));

  async function guardWrite(req, res) {
    const owner = await getUnit(db, Number(req.params.id));
    const viewer = await getUnit(db, Number(req.params.viewerId));
    if (!owner || !viewer) { res.status(404).json({ error: 'Không tìm thấy đơn vị.' }); return null; }
    if (!isOwnerAdmin(req, owner)) { res.status(403).json({ error: 'Chỉ admin của đơn vị sở hữu được đổi phạm vi chia sẻ.' }); return null; }
    if (owner.id === viewer.id) { res.status(400).json({ error: 'Không đặt phạm vi xem cho chính đơn vị mình.' }); return null; }
    const lock = await lockFor(owner, viewer);
    if (lock) { res.status(403).json({ error: 'Phạm vi chia sẻ này đang bị DYC khoá.', locked: true, reason: lock.reason }); return null; }
    const [[current]] = await db.execute('SELECT level FROM unit_visibility_policies WHERE viewer_unit_id=? AND owner_unit_id=?', [viewer.id, owner.id]);
    return { owner, viewer, previous: current?.level ?? null };
  }

  router.put('/api/units/:id/visibility/:viewerId', auth, asyncRoute(async (req, res) => {
    const level = String(req.body?.level || '');
    const g = await guardWrite(req, res);
    if (!g) return;
    if (!LEVELS.includes(level)) return res.status(400).json({ error: `level phải là một trong ${LEVELS.join(', ')}.` });
    await db.execute(
      `INSERT INTO unit_visibility_policies(viewer_unit_id,owner_unit_id,level,updated_by) VALUES (?,?,?,?)
       ON DUPLICATE KEY UPDATE level=VALUES(level), updated_by=VALUES(updated_by)`,
      [g.viewer.id, g.owner.id, level, req.session.user.id]
    );
    await recordAudit(db, { actorId: req.session.user.id, actorUnitId: req.unit.id, action: 'visibility.update', targetType: 'visibility_policy', targetId: `${g.owner.id}:${g.viewer.id}`, ownerUnitId: g.owner.id, meta: { viewer_unit_id: g.viewer.id, level, previous_level: g.previous } });
    res.json({ owner_unit_id: g.owner.id, viewer_unit_id: g.viewer.id, level });
  }));

  router.delete('/api/units/:id/visibility/:viewerId', auth, asyncRoute(async (req, res) => {
    const g = await guardWrite(req, res);
    if (!g) return;
    if (!g.previous) return res.status(404).json({ error: 'Chưa có phạm vi chia sẻ này.' });
    await db.execute('DELETE FROM unit_visibility_policies WHERE viewer_unit_id=? AND owner_unit_id=?', [g.viewer.id, g.owner.id]);
    await recordAudit(db, { actorId: req.session.user.id, actorUnitId: req.unit.id, action: 'visibility.remove', targetType: 'visibility_policy', targetId: `${g.owner.id}:${g.viewer.id}`, ownerUnitId: g.owner.id, meta: { viewer_unit_id: g.viewer.id, previous_level: g.previous } });
    res.json({ ok: true });
  }));

  return router;
}

module.exports = { createVisibilityRoutes };
```

Lưu ý thứ tự kiểm ở PUT: 404 → 403 (quyền) → 400 (chính mình) → 403 khoá → 400 `level`. Test chỉ gửi `level` sai bằng tài khoản admin không bị khoá nên vẫn ra 400.

`core/src/routes/index.js` — thêm `const { createVisibilityRoutes } = require('./visibility');` và `app.use(createVisibilityRoutes(context));` sau `createUnitRoutes`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd core && node --test tests/units.scope.test.js tests/units.visibility.test.js tests/units.leak.test.js tests/units.settings-guard.test.js`
Expected: PASS (4 + 2 + 4 test mới, `units.settings-guard.test.js` không đổi)

- [ ] **Step 5: Run full suite**

Run: `cd core && npm test > /tmp/core.log 2>&1; grep -E "^ℹ (tests|pass|fail)" /tmp/core.log`
Expected: `fail 0`

- [ ] **Step 6: Docs**

- `docs/ai/bat-bien.md`: bất biến 1 trỏ sang `core/src/units/scope.js` (`scopeFor` + `readScoped`); thêm bất biến "route GET mới phải được xếp nhóm trong `units.leak.test.js`" và "DYC đọc route nghiệp vụ = đúng một dòng audit". Mở rộng dòng lịch sử GĐ1-A2.
- `docs/dev/phan-quyen.md`: ma trận mức × loại tài nguyên, DYC theo đơn vị đang chọn, ai được đổi mức xem, khoá. Mở rộng dòng lịch sử.
- `docs/dev/kien-truc.md`: `units/scope.js` và `units/summary-view.js` trong sơ đồ module Nền; mẫu truy vấn bắt buộc. Mở rộng dòng lịch sử.
- `docs/dev/api.md`: ba endpoint `/api/units/:id/visibility*`. Mở rộng dòng lịch sử.
- `docs/dev/email-cron.md`: `settingEntry` và mẫu key `visibility.<OWNER>.<VIEWER>` (khoá được qua `POST /api/platform/setting-locks`). Bump.
- `docs/ba/co-cau-don-vi-va-role.md`: ba mức xem bằng lời nghiệp vụ; admin đơn vị chủ quyết, DYC chỉ khoá. Bump.
- `docs/dev/test.md`: ba file test; cách lane thêm route vào `SCOPED_GET`. Mở rộng dòng lịch sử.
- `docs/dev/ranh-gioi-module.md`: hợp đồng dùng chung thêm "`scopeFor`/`readScoped`/`SUMMARY_KEYS` và nhóm route trong test chống rò rỉ". Mở rộng dòng lịch sử.

- [ ] **Step 7: Commit**

```bash
npm run docs:index && npm run docs:check -- --base origin/staging
git add core/src core/tests docs/
git commit -m "feat(core): scopeFor, summary view, visibility API and leak tests"
```

---

### Task 6: Khung `web/` ở `/app` (spec mục 7, chỉ khung)

**Files:**
- Create: `web/package.json`, `web/package-lock.json` (sinh bằng `npm install`), `web/.gitignore`, `web/tsconfig.json`, `web/vite.config.ts`, `web/index.html`, `web/src/main.tsx`, `web/src/styles.css`, `web/src/lib/api.ts`, `web/src/lib/session.ts`, `web/src/lib/menu.ts`, `web/src/lib/router.ts`, `web/src/shell/App.tsx`, `web/src/shell/Layout.tsx`, `web/src/shell/LoginPage.tsx`, `web/src/shell/UnitSwitcher.tsx`, `web/src/shell/Menu.tsx`, `web/src/modules/dieu-hanh/.gitkeep`, `web/src/modules/ctd/.gitkeep`, `web/tests/smoke.test.mjs`, `core/src/web-shell.js`, `core/Dockerfile.dockerignore`
- Modify: `core/src/app.js`, `core/Dockerfile`, `.github/workflows/deploy.yml`, `tools/tests/workflows.test.js`
- Delete: `core/.dockerignore`
- Test: `core/tests/units.web-shell.test.js`, `web/tests/smoke.test.mjs`, `tools/tests/workflows.test.js`
- Docs: `docs/dev/frontend.md` (thêm `web/**` vào `related_code`), `docs/dev/kien-truc.md`, `docs/dev/chay-local.md`, `docs/dev/ranh-gioi-module.md`, `docs/dev/test.md`, `docs/ops/deploy-va-nhanh.md`, `docs/ops/github.md`, `docs/ai/kiem-tra.md`, `docs/playbooks/them-module.md`, `docs/playbooks/hotfix-production.md`

**Interfaces:**
- Consumes: `GET /api/session` → `{ user, units: { current, memberships } }`; `POST /api/session/unit { unit_id }`; `POST /api/login { email, password }`; `POST /api/logout`; `GET /api/shell/menu` (Task 1); `/auth/microsoft`.
- Produces (cho Lane B mục 14, 15 và Lane C màn hình CTD):
  - Core phục vụ `web/dist` ở `/app`: `/app/assets/*` là file tĩnh (thiếu → 404, không rơi về `index.html`); `/app` và `/app/<bất kỳ>` trả `index.html` với `Cache-Control: no-cache`; chưa build → 503. `createApplication({ webDistDir })` đổi thư mục (test).
  - `web/src/lib/api.ts`: `class ApiError { status, body }`, `api<T>(path, { method, body })` (luôn `credentials: 'same-origin'`, JSON).
  - `web/src/lib/session.ts`: kiểu `Unit`, `Membership`, `Session`; `getSession()`, `switchUnit(unitId)`, `login(email, password)`, `logout()`.
  - `web/src/lib/menu.ts`: kiểu `MenuItem`, `MenuModule`, `ShellMenu`; `getMenu()`.
  - `web/src/lib/router.ts`: `BASE = '/app'`, `navigate(path)`, `usePath()`.
  - Màn hình module đặt ở `web/src/modules/<module id>/`; `path` trong manifest (Task 1) là đường dẫn dưới `/app`. Gọi API module qua `/m/<id>/api/v1/*`, không gọi thẳng upstream.
- **Ruling ghi trong plan:** phiên bản `web/` dùng đúng dải phiên bản CTD frontend đang dùng (`react ^18.3.1`, `vite ^5.4.11`, …), không nâng. Lý do: một bộ công cụ trong monorepo; nâng là việc của `nang-dependency.md`.
- **Ruling ghi trong plan:** router tự viết (~20 dòng, `history.pushState`) thay vì `react-router`. Lý do: khung chỉ cần đổi path và đọc path; thêm thư viện là quyết định của Lane B khi có màn hình thật.
- **Ruling ghi trong plan:** không dùng vitest; smoke test là `node --test` đọc `dist/`. Lý do: khung chưa có logic đáng unit test; `node --test` đã là chuẩn của repo.
- **Ruling ghi trong plan:** build image Core với context **gốc repo** (`context: .`, `file: core/Dockerfile`) và `core/Dockerfile.dockerignore`. Lý do: image cần cả `core/` và `web/`; context gốc cho phép multi-stage mà không chép thư mục qua lại.
- **Ruling ghi trong plan:** build + smoke test `web/` chạy **trong job `test-core`**, không thêm job mới. Lý do: `test-core` đã là required check và filter `core` đã gồm `web/**`; job mới phải sửa ruleset GitHub.
- **Ruling ghi trong plan:** chuông thông báo và bộ UI dùng chung dời sang GĐ1-D. Lý do: brief mục 7 chỉ khung.
- **Ruling ghi trong plan:** SSO từ `/app` vẫn quay về `/` (UI cũ) như hiện nay. Lý do: không sửa `/auth/microsoft/callback` trong task khung; Lane B đổi đích khi `/app` thay UI cũ.

- [ ] **Step 1: Write the failing tests**

`core/tests/units.web-shell.test.js`:

```js
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createTestDatabase } = require('./helpers/db');
const { startTestServer } = require('./helpers/server');

function fixtureDist() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'web-dist-'));
  fs.mkdirSync(path.join(dir, 'assets'));
  fs.writeFileSync(path.join(dir, 'index.html'), '<!doctype html><div id="root"></div><script type="module" src="/app/assets/app.js"></script>');
  fs.writeFileSync(path.join(dir, 'assets', 'app.js'), 'console.log("shell")');
  return dir;
}

test('/app serves the built shell: assets as files, deep links as index.html, missing assets 404', async () => {
  const { pool, teardown } = await createTestDatabase();
  const dist = fixtureDist();
  const { client, close } = await startTestServer(pool, { webDistDir: dist });
  try {
    for (const p of ['/app', '/app/', '/app/dieu-hanh/hoat-dong', '/app/ctd/ho-so/12']) {
      const r = await client.request('GET', p);
      assert.equal(r.status, 200, p);
      assert.match(r.text, /id="root"/, p);
      assert.equal(r.headers.get('cache-control'), 'no-cache', p);
    }
    const asset = await client.request('GET', '/app/assets/app.js');
    assert.equal(asset.status, 200);
    assert.equal(asset.text, 'console.log("shell")');
    assert.equal((await client.request('GET', '/app/assets/khong-co.js')).status, 404);
    const legacy = await client.request('GET', '/');
    assert.doesNotMatch(legacy.text, /\/app\/assets\/app\.js/, 'old UI at / is untouched');
  } finally { await close(); await teardown(); fs.rmSync(dist, { recursive: true, force: true }); }
});

test('/app answers 503 when web/ has not been built', async () => {
  const { pool, teardown } = await createTestDatabase();
  const { client, close } = await startTestServer(pool, { webDistDir: path.join(os.tmpdir(), 'khong-co-web-dist') });
  try {
    assert.equal((await client.request('GET', '/app/dieu-hanh')).status, 503);
  } finally { await close(); await teardown(); }
});
```

`web/tests/smoke.test.mjs`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const dist = path.join(import.meta.dirname, '..', 'dist');

test('build output lives under /app/assets and the bundle calls the shell endpoints', () => {
  const html = fs.readFileSync(path.join(dist, 'index.html'), 'utf8');
  const scripts = [...html.matchAll(/src="([^"]+\.js)"/g)].map(m => m[1]);
  assert.ok(scripts.length > 0, 'index.html has a script');
  for (const s of scripts) {
    assert.match(s, /^\/app\/assets\//);
    assert.ok(fs.existsSync(path.join(dist, s.replace(/^\/app\//, ''))), s);
  }
  const bundle = fs.readdirSync(path.join(dist, 'assets')).filter(f => f.endsWith('.js'))
    .map(f => fs.readFileSync(path.join(dist, 'assets', f), 'utf8')).join('\n');
  for (const endpoint of ['/api/session', '/api/session/unit', '/api/shell/menu', '/api/login', '/api/logout', '/auth/microsoft']) {
    assert.ok(bundle.includes(endpoint), endpoint);
  }
});
```

`tools/tests/workflows.test.js` — thêm:

```js
test('deploy.yml: core image is built from the repo root and test-core builds + smoke-tests web/', () => {
  const y = wf('deploy.yml');
  const buildCore = y.slice(y.indexOf('\n  build-core:'), y.indexOf('\n  build-ctd-api:'));
  assert.match(buildCore, /context: \.\n\s+file: core\/Dockerfile/);
  const testCore = y.slice(y.indexOf('\n  test-core:'), y.indexOf('\n  test-ctd:'));
  for (const cmd of ['npm ci', 'npm run build', 'npm test']) {
    assert.match(testCore, new RegExp(`- run: ${cmd}\\n\\s+working-directory: web`), cmd);
  }
  assert.match(testCore, /web\/package-lock\.json/);
  assert.ok(fs.existsSync(path.join(__dirname, '..', '..', 'core', 'Dockerfile.dockerignore')));
  assert.ok(!fs.existsSync(path.join(__dirname, '..', '..', 'core', '.dockerignore')), 'context is the repo root; core/.dockerignore would be ignored');
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd core && node --test tests/units.web-shell.test.js`
Expected: FAIL — `/app` trả `index.html` của UI cũ (không có `id="root"`… hoặc không có `cache-control: no-cache`).

Run: `npm run test:tools`
Expected: FAIL — `build-core` vẫn `context: core`.

- [ ] **Step 3: Write minimal implementation**

`core/src/web-shell.js`:

```js
'use strict';
const fs = require('fs');
const path = require('path');
const express = require('express');

const DEFAULT_DIST = path.join(__dirname, '..', '..', 'web', 'dist');

// Shell React (web/) ở /app. File trong /app/assets có hash trong tên nên cache lâu;
// index.html luôn no-cache để deploy mới có hiệu lực ngay.
function createWebShell(distDir = DEFAULT_DIST) {
  const router = express.Router();
  router.use('/app', express.static(distDir, {
    index: false,
    setHeaders: (res, file) => {
      if (file.includes(`${path.sep}assets${path.sep}`)) res.set('Cache-Control', 'public, max-age=31536000, immutable');
      else res.set('Cache-Control', 'no-cache');
    }
  }));
  router.get(['/app', '/app/{*rest}'], (req, res) => {
    if (req.path.startsWith('/app/assets/')) return res.status(404).type('text').send('Not found');
    const index = path.join(distDir, 'index.html');
    if (!fs.existsSync(index)) return res.status(503).type('text').send('Giao diện /app chưa được build (cd web && npm run build).');
    res.set('Cache-Control', 'no-cache');
    res.sendFile(index);
  });
  return router;
}

module.exports = { createWebShell, DEFAULT_DIST };
```

`core/src/app.js`: `const { createWebShell } = require('./web-shell');` và **ngay trước** `app.use(express.static(path.join(__dirname, '..', 'public')));` thêm `app.use(createWebShell(options.webDistDir));`.

`core/Dockerfile` (thay toàn bộ; build context là gốc repo):

```dockerfile
FROM node:22-slim AS web
WORKDIR /web
COPY web/package.json web/package-lock.json ./
RUN npm ci
COPY web/ ./
RUN npm run build

FROM node:22-slim
WORKDIR /app
COPY core/package.json core/package-lock.json ./
RUN npm ci --omit=dev
COPY core/ ./
# core/src/web-shell.js đọc ../../web/dist tính từ /app/src → /web/dist
COPY --from=web /web/dist /web/dist
RUN mkdir -p storage/task-attachments
EXPOSE 3000
CMD ["node", "app.js"]
```

`core/Dockerfile.dockerignore` (xoá `core/.dockerignore`):

```
**/node_modules
**/.env
.git
core/storage
web/dist
services
infra
docs
.kiro
.agents
.claude
tools
**/*.md
```

`.github/workflows/deploy.yml`:
- `test-core` → `setup-node` đổi thành
  ```yaml
          cache-dependency-path: |
            core/package-lock.json
            web/package-lock.json
  ```
  và sau `- run: npm test` thêm
  ```yaml
      - run: npm ci
        working-directory: web
      - run: npm run build
        working-directory: web
      - run: npm test
        working-directory: web
  ```
- `build-core` → `docker/build-push-action`: `context: core` đổi thành
  ```yaml
          context: .
          file: core/Dockerfile
  ```

`web/package.json`:

```json
{
  "name": "ultimate-tckt-web",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "test": "node --test tests/*.test.mjs"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@types/react": "^18.3.12",
    "@types/react-dom": "^18.3.1",
    "@vitejs/plugin-react": "^4.3.4",
    "typescript": "^5.6.3",
    "vite": "^5.4.11"
  },
  "allowScripts": {
    "esbuild@0.21.5": true
  }
}
```

Sinh lockfile: `cd web && npm install` (commit `web/package-lock.json`).

`web/.gitignore`:

```
node_modules
dist
```

`web/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noEmit": true,
    "isolatedModules": true,
    "skipLibCheck": true,
    "types": ["vite/client"]
  },
  "include": ["src", "vite.config.ts"]
}
```

`web/vite.config.ts`:

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const core = 'http://localhost:3000';

export default defineConfig({
  base: '/app/',
  plugins: [react()],
  build: { outDir: 'dist', emptyOutDir: true },
  server: { port: 5174, proxy: { '/api': core, '/m': core, '/auth': core } }
});
```

`web/index.html`:

```html
<!doctype html>
<html lang="vi">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Ultimate TCKT</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

`web/src/main.tsx`:

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './shell/App';
import './styles.css';

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);
```

`web/src/lib/api.ts`:

```ts
export class ApiError extends Error {
  constructor(public status: number, public body: unknown) {
    super(typeof body === 'object' && body && 'error' in body ? String((body as { error: unknown }).error) : `HTTP ${status}`);
  }
}

export async function api<T>(path: string, { method = 'GET', body }: { method?: string; body?: unknown } = {}): Promise<T> {
  const res = await fetch(path, {
    method,
    credentials: 'same-origin',
    headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) throw new ApiError(res.status, data);
  return data as T;
}
```

`web/src/lib/session.ts`:

```ts
import { api } from './api';

export type Unit = { id: number; code: string; name: string; kind: string };
export type Membership = { unit_id: number; code: string; name: string; kind: string; role: string };
export type Session = { user: { id: number; name: string; email: string } | null; units: { current: Unit | null; memberships: Membership[] } };

export const getSession = () => api<Session>('/api/session');
export const switchUnit = (unitId: number) => api<Session>('/api/session/unit', { method: 'POST', body: { unit_id: unitId } });
export const login = (email: string, password: string) => api<{ user: unknown }>('/api/login', { method: 'POST', body: { email, password } });
export const logout = () => api<{ ok: true }>('/api/logout', { method: 'POST' });
```

`web/src/lib/menu.ts`:

```ts
import { api } from './api';
import type { Unit } from './session';

export type MenuItem = { id: string; label: string; path: string; icon: string; order: number };
export type MenuModule = { id: string; name: string; items: MenuItem[] };
export type ShellMenu = { unit: Unit; role: string; modules: MenuModule[] };

export const getMenu = () => api<ShellMenu>('/api/shell/menu');
```

`web/src/lib/router.ts`:

```ts
import { useEffect, useState } from 'react';

export const BASE = '/app';
const EVENT = 'app:navigate';

export function navigate(path: string) {
  history.pushState(null, '', `${BASE}${path.startsWith('/') ? path : `/${path}`}`);
  window.dispatchEvent(new Event(EVENT));
}

export function usePath(): string {
  const read = () => location.pathname.slice(BASE.length) || '/';
  const [path, setPath] = useState(read);
  useEffect(() => {
    const on = () => setPath(read());
    window.addEventListener('popstate', on);
    window.addEventListener(EVENT, on);
    return () => { window.removeEventListener('popstate', on); window.removeEventListener(EVENT, on); };
  }, []);
  return path;
}
```

`web/src/shell/App.tsx`:

```tsx
import { useCallback, useEffect, useState } from 'react';
import { getSession, type Session } from '../lib/session';
import { Layout } from './Layout';
import { LoginPage } from './LoginPage';

export function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [error, setError] = useState('');
  const reload = useCallback(() => getSession().then(setSession).catch(e => setError(String(e.message || e))), []);
  useEffect(() => { reload(); }, [reload]);
  if (error) return <p className="error">{error}</p>;
  if (!session) return <p className="muted">Đang tải…</p>;
  if (!session.user) return <LoginPage onDone={reload} />;
  return <Layout session={session} onSessionChange={setSession} onLogout={reload} />;
}
```

`web/src/shell/Layout.tsx`:

```tsx
import { useEffect, useState } from 'react';
import { getMenu, type ShellMenu } from '../lib/menu';
import { logout, type Session } from '../lib/session';
import { usePath } from '../lib/router';
import { Menu } from './Menu';
import { UnitSwitcher } from './UnitSwitcher';

type Props = { session: Session; onSessionChange: (s: Session) => void; onLogout: () => void };

export function Layout({ session, onSessionChange, onLogout }: Props) {
  const [menu, setMenu] = useState<ShellMenu | null>(null);
  const path = usePath();
  const unitId = session.units.current?.id;
  useEffect(() => { setMenu(null); getMenu().then(setMenu).catch(() => setMenu({ unit: session.units.current!, role: '', modules: [] })); }, [unitId]);
  return (
    <div className="shell">
      <header>
        <strong>Ultimate TCKT</strong>
        <UnitSwitcher session={session} onChange={onSessionChange} />
        <span className="muted">{session.user?.name}</span>
        <button onClick={() => logout().then(onLogout)}>Đăng xuất</button>
      </header>
      <nav>{menu ? <Menu menu={menu} current={path} /> : <p className="muted">Đang tải menu…</p>}</nav>
      <main>
        {session.units.current ? <p className="muted">Trang {path} — màn hình module do Lane B/C bổ sung.</p> : <p>Tài khoản chưa thuộc đơn vị nào. Liên hệ DYC.</p>}
      </main>
    </div>
  );
}
```

`web/src/shell/LoginPage.tsx`:

```tsx
import { useState, type FormEvent } from 'react';
import { login } from '../lib/session';

export function LoginPage({ onDone }: { onDone: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const submit = (e: FormEvent) => {
    e.preventDefault();
    setError('');
    login(email, password).then(onDone).catch(err => setError(err.message));
  };
  return (
    <form className="login" onSubmit={submit}>
      <h1>Đăng nhập</h1>
      <a className="button" href="/auth/microsoft">Đăng nhập bằng tài khoản HUST</a>
      <label>Email<input type="email" value={email} onChange={e => setEmail(e.target.value)} required /></label>
      <label>Mật khẩu<input type="password" value={password} onChange={e => setPassword(e.target.value)} required /></label>
      {error && <p className="error">{error}</p>}
      <button type="submit">Đăng nhập</button>
    </form>
  );
}
```

`web/src/shell/UnitSwitcher.tsx`:

```tsx
import { switchUnit, type Session } from '../lib/session';

export function UnitSwitcher({ session, onChange }: { session: Session; onChange: (s: Session) => void }) {
  const { current, memberships } = session.units;
  if (memberships.length < 2) return <span>{current?.name ?? '—'}</span>;
  return (
    <select aria-label="Đơn vị đang làm việc" value={current?.id ?? ''} onChange={e => switchUnit(Number(e.target.value)).then(onChange)}>
      {memberships.map(m => <option key={m.unit_id} value={m.unit_id}>{m.name} ({m.role})</option>)}
    </select>
  );
}
```

`web/src/shell/Menu.tsx`:

```tsx
import type { ShellMenu } from '../lib/menu';
import { BASE, navigate } from '../lib/router';

export function Menu({ menu, current }: { menu: ShellMenu; current: string }) {
  if (!menu.modules.length) return <p className="muted">Đơn vị này chưa bật module nào.</p>;
  return (
    <>
      {menu.modules.map(m => (
        <section key={m.id}>
          <h2>{m.name}</h2>
          <ul>
            {m.items.map(i => (
              <li key={i.id}>
                <a href={`${BASE}${i.path}`} aria-current={current === i.path ? 'page' : undefined}
                  onClick={e => { e.preventDefault(); navigate(i.path); }}>{i.label}</a>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </>
  );
}
```

`web/src/styles.css`:

```css
:root { font-family: system-ui, sans-serif; color: #1f2937; background: #f9fafb; }
body { margin: 0; }
.shell { display: grid; grid-template: "h h" auto "n m" 1fr / 240px 1fr; min-height: 100vh; }
header { grid-area: h; display: flex; gap: 12px; align-items: center; padding: 8px 16px; background: #1e3a8a; color: #fff; }
header .muted { margin-left: auto; color: #dbeafe; }
nav { grid-area: n; padding: 12px; border-right: 1px solid #e5e7eb; background: #fff; }
nav h2 { font-size: 13px; text-transform: uppercase; color: #6b7280; }
nav ul { list-style: none; padding: 0; margin: 0 0 16px; }
nav a { display: block; padding: 6px 8px; border-radius: 6px; color: inherit; text-decoration: none; }
nav a[aria-current="page"] { background: #dbeafe; }
main { grid-area: m; padding: 16px; }
.muted { color: #6b7280; }
.error { color: #b91c1c; }
.login { max-width: 360px; margin: 10vh auto; display: grid; gap: 12px; }
.login label { display: grid; gap: 4px; }
@media (max-width: 720px) { .shell { grid-template: "h" auto "n" auto "m" 1fr / 1fr; } }
```

`web/src/modules/dieu-hanh/.gitkeep`, `web/src/modules/ctd/.gitkeep`: file rỗng.

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd web && npm ci && npm run build && npm test`
Expected: `tsc` không lỗi, `vite build` ra `dist/`, smoke PASS 1/1

Run: `cd core && node --test tests/units.web-shell.test.js`
Expected: PASS 2/2

Run: `npm run test:tools`
Expected: `fail 0`

Run: `docker build -f core/Dockerfile -t ultimate-tckt-core:local . && docker run --rm ultimate-tckt-core:local ls /web/dist/index.html`
Expected: in ra `/web/dist/index.html` (bỏ qua nếu máy không có Docker; CI `build-core` kiểm khi push)

- [ ] **Step 5: Run full suite**

Run: `cd core && npm test > /tmp/core.log 2>&1; grep -E "^ℹ (tests|pass|fail)" /tmp/core.log`
Expected: `fail 0`

- [ ] **Step 6: Docs**

- `docs/dev/frontend.md`: thêm `web/**` vào `related_code`; mục "Shell mới `/app`" (cấu trúc thư mục, `lib/*`, chỗ đặt màn hình module, gọi API module qua `/m/<id>/api/v1`); UI cũ `core/public` vẫn ở `/`. Bump.
- `docs/dev/kien-truc.md`: `createWebShell` đứng trước static `public`. Mở rộng dòng lịch sử GĐ1-A2.
- `docs/dev/chay-local.md`: `cd web && npm install && npm run dev` (port 5174, proxy sang Core 3000); hoặc `npm run build` rồi mở `http://localhost:3000/app`. Mở rộng dòng lịch sử.
- `docs/dev/ranh-gioi-module.md`: dòng "Web" — khung + `lib/*` là Nền; `web/src/modules/<id>/` thuộc lane của module. Mở rộng dòng lịch sử.
- `docs/dev/test.md`: `units.web-shell.test.js`, `web/tests/smoke.test.mjs`. Mở rộng dòng lịch sử.
- `docs/ops/deploy-va-nhanh.md`, `docs/playbooks/hotfix-production.md`: image Core build từ gốc repo (`docker build -f core/Dockerfile .`). Mở rộng dòng lịch sử.
- `docs/ops/github.md`, `docs/ai/kiem-tra.md`: `test-core` giờ build + smoke `web/`. Bump.
- `docs/playbooks/them-module.md`: thêm màn hình ở `web/src/modules/<id>/`. Mở rộng dòng lịch sử.

- [ ] **Step 7: Commit**

```bash
npm run docs:index && npm run docs:check -- --base origin/staging
git add web core/src core/tests core/Dockerfile core/Dockerfile.dockerignore .github/workflows/deploy.yml tools/tests docs/
git rm core/.dockerignore
git commit -m "feat(web): shell skeleton served by core at /app"
```

---

### Task 7: CI chặn merge khi test chống rò rỉ fail (spec mục 23)

**Files:**
- Modify: `tools/tests/workflows.test.js`, `.kiro/specs/nen-tang-da-don-vi/tasks.md`, `docs/specs/nen-tang-da-don-vi-tasks.md`
- Test: `tools/tests/workflows.test.js`
- Docs: `docs/ai/bat-bien.md`, `docs/ai/kiem-tra.md`, `docs/dev/test.md`, `docs/ops/github.md`

**Interfaces:**
- Consumes: `core/tests/units.leak.test.js`, `core/tests/units.scope.test.js` (Task 5); job `test-core` trong `deploy.yml`; required check `test-core`, `docs` (`docs/ops/github.md`).
- Produces: guard trong `tools/tests/workflows.test.js` (chạy ở job `docs`, bắt buộc với mọi PR) fail khi bất kỳ điều sau bị phá: `test-core` còn tồn tại, không `continue-on-error`, vẫn chạy `npm test` trong `core`; filter `core` vẫn gồm `core/**`; script `test` của `core/package.json` vẫn gom `tests/**/*.test.js` và không có `--test-skip-pattern`/`--test-name-pattern`; hai file test chống rò rỉ tồn tại và không chứa `test.skip`/`{ skip`/`.only(`; `docs/ops/github.md` vẫn ghi `test-core` là required check.
- **Ruling ghi trong plan:** không thêm job CI riêng cho test chống rò rỉ. Lý do: `units.leak.test.js` và `units.scope.test.js` đã chạy trong `npm test` của `test-core` (required check); job mới phải sửa ruleset GitHub bằng tay. Guard đặt trong tooling test vì job `docs` chạy trên **mọi** PR, kể cả PR chỉ sửa workflow — nên không ai tắt được gate mà CI không đỏ.

- [ ] **Step 1: Write the failing test**

`tools/tests/workflows.test.js` — thêm:

```js
test('leak gate (spec 23): test-core must keep running the cross-unit leak tests and stay a required check', () => {
  const root = path.join(__dirname, '..', '..');
  const y = wf('deploy.yml');
  const testCore = y.slice(y.indexOf('\n  test-core:'), y.indexOf('\n  test-ctd:'));
  assert.ok(testCore.length > 20, 'test-core job exists');
  assert.doesNotMatch(testCore, /continue-on-error/);
  assert.match(testCore, /working-directory: core\n/);
  assert.match(testCore, /\n      - run: npm test\n/);
  assert.match(y, /core:\n\s+- 'core\/\*\*'/);
  const script = JSON.parse(fs.readFileSync(path.join(root, 'core', 'package.json'), 'utf8')).scripts.test;
  assert.match(script, /tests\/\*\*\/\*\.test\.js/);
  assert.doesNotMatch(script, /--test-(skip|name)-pattern/);
  for (const f of ['units.leak.test.js', 'units.scope.test.js']) {
    const src = fs.readFileSync(path.join(root, 'core', 'tests', f), 'utf8');
    assert.doesNotMatch(src, /test\.skip|\{\s*skip\b|\.only\(|todo:/, f);
  }
  assert.match(fs.readFileSync(path.join(root, 'docs', 'ops', 'github.md'), 'utf8'), /status check[^\n]*`test-core`/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Tạm đổi `- run: npm test` của `test-core` thành `- run: npm test\n        continue-on-error: true` rồi chạy `npm run test:tools`.
Expected: FAIL — `continue-on-error` bị bắt. Hoàn nguyên thay đổi tạm.

(Nếu chạy trước Task 5: FAIL — `ENOENT … units.scope.test.js`.)

- [ ] **Step 3: Write minimal implementation**

Không cần code mới ngoài guard ở Step 1: `test-core` đã chạy `npm test` và là required check. Đánh dấu hoàn thành trong `.kiro/specs/nen-tang-da-don-vi/tasks.md` và bản sao `docs/specs/nen-tang-da-don-vi-tasks.md`: mục **5**, **6**, **7** (ghi "khung — chuông/UI dùng chung ở GĐ1-D"), **11** (ghi "backend — UI ở GĐ1-D"), **16** (ghi "tối thiểu — ánh xạ role ở mục 17"), **21**, **22**, **23**. Bản sao trong `docs/specs/` bump version + dòng lịch sử.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test:tools`
Expected: `fail 0`

- [ ] **Step 5: Run full suite**

Run: `cd core && npm test > /tmp/core.log 2>&1; grep -E "^ℹ (tests|pass|fail)" /tmp/core.log`
Expected: `fail 0`

Run: `cd services/ctd-api/backend && .venv/bin/pytest -q` và `cd web && npm run build && npm test`
Expected: tất cả pass

- [ ] **Step 6: Docs**

- `docs/ai/bat-bien.md`: mở rộng bất biến 13 (đã có) — "test chống rò rỉ chạy trong `test-core` (required); guard ở `tools/tests/workflows.test.js`; không được skip/only". Mở rộng dòng lịch sử GĐ1-A2.
- `docs/ai/kiem-tra.md`, `docs/dev/test.md`: danh sách guard. Mở rộng dòng lịch sử.
- `docs/ops/github.md`: ghi chú "đổi tên `test-core` phải sửa ruleset và guard cùng lúc". Mở rộng dòng lịch sử.

- [ ] **Step 7: Commit**

```bash
npm run docs:index && npm run docs:check -- --base origin/staging
git add tools/tests .kiro/specs/nen-tang-da-don-vi/tasks.md docs/
git commit -m "test(ci): guard the cross-unit leak gate in test-core"
```

---

## Lịch sử phiên bản

| Version | Ngày | Thay đổi | Người |
|---|---|---|---|
| 1.0 | 2026-09-24 | Bản đầu: plan GĐ1-A2 nền phần 2 (spec 5, 6, 7 khung, 11 backend, 16 tối thiểu, 21–23) | DYC |

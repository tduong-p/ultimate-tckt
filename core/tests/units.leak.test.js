'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { createTestDatabase } = require('./helpers/db');
const { startTestServer } = require('./helpers/server');
const { createUser } = require('./helpers/fixtures');

const ROUTES_DIR = path.join(__dirname, '..', 'src', 'routes');
// Route người ngoài TCKT được phép đọc (không phải dữ liệu nghiệp vụ của đơn vị khác).
// /api/platform/setting-locks: route tự scope trong handler (core/src/routes/platform.js) —
// DYC thấy mọi dòng, người khác chỉ thấy khoá toàn cục (unit_id NULL) + khoá của đơn vị mình
// (xem core/tests/units.settings-guard.test.js), nên không cần 403 ở tầng gate.
const OUTSIDER_ALLOW = [/^\/api\/session$/, /^\/api\/version$/, /^\/api\/health$/, /^\/api\/push\/config$/, /^\/api\/notifications/, /^\/api\/units$/, /^\/api\/platform\/setting-locks$/];

function getPaths() {
  const found = new Set();
  for (const file of fs.readdirSync(ROUTES_DIR).filter(f => f.endsWith('.js'))) {
    const src = fs.readFileSync(path.join(ROUTES_DIR, file), 'utf8');
    for (const m of src.matchAll(/router\.get\(\s*['"`](\/api\/[^'"`]+)['"`]/g)) found.add(m[1].replace(/:[A-Za-z_]+/g, '1'));
  }
  return [...found].sort();
}

test('route parser finds the real surface (guards against a silently empty test)', () => {
  assert.ok(getPaths().length > 30, `only ${getPaths().length} paths`);
});

test('a BTV-only user is refused on every GET except the allowlist; DYC is never refused', async () => {
  const { pool, teardown } = await createTestDatabase();
  const { client, close } = await startTestServer(pool);
  try {
    const btv = await createUser(pool, { units: [['BTV', 'btv_lead']] });
    const dyc = await createUser(pool, { units: [['DYC', 'dyc_engineer']] });
    const paths = getPaths();
    const leaks = [];
    await client.login(btv.email, btv.password);
    for (const p of paths) {
      if (OUTSIDER_ALLOW.some(rx => rx.test(p))) continue;
      const r = await client.request('GET', p);
      if (r.status !== 403) leaks.push(`${p} → ${r.status}`);
    }
    assert.deepEqual(leaks, [], 'BTV read TCKT/platform data');
    const refused = [];
    await client.login(dyc.email, dyc.password);
    for (const p of paths) {
      const r = await client.request('GET', p);
      if (r.status === 403) refused.push(p);
    }
    assert.deepEqual(refused, [], 'DYC (D4) must read everything');
  } finally { await close(); await teardown(); }
});

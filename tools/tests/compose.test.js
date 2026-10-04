'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..', '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

for (const env of ['staging', 'production']) {
  test(`${env} compose uses ultimate-tckt names and keeps host ports`, () => {
    const y = read(`infra/compose/docker-compose.${env}.yml`);
    for (const svc of ['core-db:', 'core:', 'ctd-db:', 'ctd-api:']) assert.match(y, new RegExp(`^  ${svc}`, 'm'), svc);
    assert.match(y, /ghcr\.io\/tduong-p\/ultimate-tckt-core:\$\{CORE_IMAGE_TAG:\?/);
    assert.match(y, /ghcr\.io\/tduong-p\/ultimate-tckt-ctd-api:\$\{CTD_API_IMAGE_TAG:\?/);
    for (const v of ['core_mysql', 'core_uploads', 'ctd_postgres', 'ctd_documents']) assert.match(y, new RegExp(`^  ${v}:`, 'm'), v);
    const ports = env === 'staging' ? ['3306:3306', '3000:3000', '8000:8000'] : ['3307:3306', '3001:3000', '8001:8000'];
    for (const p of ports) assert.ok(y.includes(`"127.0.0.1:${p}"`), p);
    assert.match(y, new RegExp(`APP_ENV: ${env}`));
    assert.match(y, /SETTINGS_ENCRYPTION_KEY: \$\{CORE_SETTINGS_ENCRYPTION_KEY:\?/);
    assert.doesNotMatch(y, /seee|tckt-app|ctd-app|TCKT_/i);
  });
  test(`${env} nginx has core.conf and ctd.conf`, () => {
    assert.ok(fs.existsSync(path.join(root, `infra/nginx/${env}/core.conf`)));
    assert.ok(fs.existsSync(path.join(root, `infra/nginx/${env}/ctd.conf`)));
    assert.ok(!fs.existsSync(path.join(root, `infra/nginx/${env}/tckt.conf`)));
  });
}
test('.env.example lists every variable the compose files use', () => {
  const ex = read('infra/.env.example');
  const used = new Set();
  for (const env of ['staging', 'production']) {
    for (const m of read(`infra/compose/docker-compose.${env}.yml`).matchAll(/\$\{([A-Z0-9_]+)/g)) used.add(m[1]);
  }
  for (const v of used) if (!v.endsWith('IMAGE_TAG')) assert.match(ex, new RegExp(`^${v}=`, 'm'), v);
});

test('staging compose runs noti-api + noti-worker from one image, api on 127.0.0.1:8100', () => {
  const y = read('infra/compose/docker-compose.staging.yml');
  assert.match(y, /^  noti-api:/m);
  assert.match(y, /^  noti-worker:/m);
  assert.equal((y.match(/ghcr\.io\/tduong-p\/ultimate-tckt-noti:\$\{NOTI_IMAGE_TAG:\?\}/g) || []).length, 2);
  assert.ok(y.includes('"127.0.0.1:8100:8000"'));
  assert.match(y, /command: \["python", "-m", "noti\.worker"\]/);
  assert.match(y, /NOTI_DATABASE_URL: postgresql\+psycopg:\/\/\$\{NOTI_DB_USER:\?\}:\$\{NOTI_DB_PASSWORD:\?\}@ctd-db:5432\/\$\{NOTI_DB_NAME:\?\}/);
});

test('staging core reaches noti over the compose network; a missing key only disables sending', () => {
  const core = read('infra/compose/docker-compose.staging.yml').split(/^  ctd-db:/m)[0];
  assert.match(core, /NOTI_URL: http:\/\/noti-api:8000/);
  assert.match(core, /NOTI_API_KEY: \$\{CORE_NOTI_API_KEY:-\}/);
});

test('production compose runs noti-api + noti-worker from one image, api on 127.0.0.1:8101', () => {
  const y = read('infra/compose/docker-compose.production.yml');
  assert.match(y, /^  noti-api:/m);
  assert.match(y, /^  noti-worker:/m);
  assert.equal((y.match(/ghcr\.io\/tduong-p\/ultimate-tckt-noti:\$\{NOTI_IMAGE_TAG:\?\}/g) || []).length, 2);
  assert.ok(y.includes('"127.0.0.1:8101:8000"'));
  assert.ok(!y.includes('8100'), 'cổng 8100 là của staging trên cùng VM');
  assert.match(y, /command: \["python", "-m", "noti\.worker"\]/);
  assert.match(y, /NOTI_DATABASE_URL: postgresql\+psycopg:\/\/\$\{NOTI_DB_USER:\?\}:\$\{NOTI_DB_PASSWORD:\?\}@ctd-db:5432\/\$\{NOTI_DB_NAME:\?\}/);
  assert.match(y, /NOTI_APP_BASE_URL: https:\/\/tckt-hub\.duckdns\.org/);
});

test('production noti refuses to start without a recipient allowlist (empty = mail to everyone)', () => {
  const y = read('infra/compose/docker-compose.production.yml');
  assert.match(y, /NOTI_RECIPIENT_ALLOWLIST: \$\{NOTI_RECIPIENT_ALLOWLIST:\?\}/);
});

test('noti always-cc is passed through in both stacks (empty = off)', () => {
  for (const f of ['production', 'staging']) {
    const y = read(`infra/compose/docker-compose.${f}.yml`);
    assert.match(y, /NOTI_ALWAYS_CC: \$\{NOTI_ALWAYS_CC:-\}/);
  }
});

test('production core reaches noti over the compose network; a missing key only disables sending', () => {
  const core = read('infra/compose/docker-compose.production.yml').split(/^  ctd-db:/m)[0];
  assert.match(core, /NOTI_URL: http:\/\/noti-api:8000/);
  assert.match(core, /NOTI_API_KEY: \$\{CORE_NOTI_API_KEY:-\}/);
});
